import { env } from "cloudflare:workers";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { postImages, postLikes, posts, users } from "@/db/schema";
import { currentUser } from "@/lib/session";

const categories = ["#配信感想", "#ファンアート", "#切り抜き", "#推し語り"];
const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const maxImageBytes = 5 * 1024 * 1024;

export async function GET() {
  const db = getDb();
  const viewer = await currentUser();
  const rows = await db
    .select({
      id: posts.id,
      content: posts.content,
      category: posts.category,
      likes: posts.likes,
      createdAt: posts.createdAt,
      userId: posts.userId,
      user: {
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(posts)
    .innerJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(50);
  const imageRows = rows.length
    ? await db
        .select({ postId: postImages.postId, objectKey: postImages.objectKey })
        .from(postImages)
        .where(
          inArray(
            postImages.postId,
            rows.map((post) => post.id),
          ),
        )
        .orderBy(postImages.position)
    : [];
  const imagesByPost = new Map<number, string[]>();
  for (const image of imageRows) {
    const images = imagesByPost.get(image.postId) ?? [];
    images.push(`/api/images/${encodeURIComponent(image.objectKey)}`);
    imagesByPost.set(image.postId, images);
  }
  const likedPostIds = new Set(
    viewer && rows.length
      ? (
          await db
            .select({ postId: postLikes.postId })
            .from(postLikes)
            .where(
              and(
                eq(postLikes.userId, viewer.id),
                inArray(
                  postLikes.postId,
                  rows.map((post) => post.id),
                ),
              ),
            )
        ).map((like) => like.postId)
      : [],
  );
  return Response.json({
    posts: rows.map((post) => ({
      ...post,
      isOwner: viewer?.id === post.userId,
      likedByMe: likedPostIds.has(post.id),
      userId: undefined,
      images: imagesByPost.get(post.id) ?? [],
    })),
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const form = await request.formData();
  const content = String(form.get("content") ?? "").trim();
  const category = String(form.get("category") ?? "");
  const images = form
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (
    (!content && images.length === 0) ||
    content.length > 240 ||
    !categories.includes(category)
  ) {
    return Response.json(
      { error: "投稿内容を確認してください" },
      { status: 400 },
    );
  }
  if (images.length > 4)
    return Response.json(
      { error: "画像は4枚まで投稿できます" },
      { status: 400 },
    );
  if (
    images.some(
      (image) => !allowedTypes.has(image.type) || image.size > maxImageBytes,
    )
  ) {
    return Response.json(
      { error: "画像はJPG・PNG・WebP・GIF、1枚5MBまでです" },
      { status: 400 },
    );
  }
  const runtime = env as unknown as { BUCKET?: R2Bucket };
  if (images.length && !runtime.BUCKET)
    return Response.json({ error: "画像保存の準備中です" }, { status: 503 });
  const uploaded: Array<{ key: string; type: string }> = [];
  try {
    for (const image of images) {
      const extension =
        image.type === "image/jpeg" ? "jpg" : image.type.split("/")[1];
      const key = `${crypto.randomUUID()}.${extension}`;
      await runtime.BUCKET!.put(key, image.stream(), {
        httpMetadata: { contentType: image.type },
      });
      uploaded.push({ key, type: image.type });
    }
    const db = getDb();
    const [post] = await db
      .insert(posts)
      .values({ userId: user.id, content, category })
      .returning();
    if (uploaded.length) {
      await db.insert(postImages).values(
        uploaded.map((image, position) => ({
          postId: post.id,
          objectKey: image.key,
          contentType: image.type,
          position,
        })),
      );
    }
    return Response.json(
      {
        post: {
          ...post,
          user,
          isOwner: true,
          likedByMe: false,
          images: uploaded.map(
            (image) => `/api/images/${encodeURIComponent(image.key)}`,
          ),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    await Promise.all(
      uploaded.map((image) => runtime.BUCKET?.delete(image.key)),
    );
    console.error("Post creation failed", error);
    return Response.json(
      { error: "投稿に失敗しました。もう一度お試しください" },
      { status: 500 },
    );
  }
}
