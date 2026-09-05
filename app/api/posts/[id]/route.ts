import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { postImages, posts } from "@/db/schema";
import { currentUser } from "@/lib/session";

const categories = ["#配信感想", "#ファンアート", "#切り抜き", "#推し語り"];

function postIdFrom(request: Request) {
  const value = Number(new URL(request.url).pathname.split("/").pop());
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user)
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const postId = postIdFrom(request);
  if (!postId)
    return Response.json({ error: "投稿が見つかりません" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as {
    content?: string;
    category?: string;
  } | null;
  const content = String(body?.content ?? "").trim();
  const category = String(body?.category ?? "");
  const db = getDb();
  const [existingImage] = await db
    .select({ id: postImages.id })
    .from(postImages)
    .where(eq(postImages.postId, postId))
    .limit(1);
  if (
    (!content && !existingImage) ||
    content.length > 240 ||
    !categories.includes(category)
  ) {
    return Response.json(
      { error: "投稿内容を確認してください" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(posts)
    .set({ content, category })
    .where(and(eq(posts.id, postId), eq(posts.userId, user.id)))
    .returning();
  if (!updated)
    return Response.json(
      { error: "自分の投稿だけ編集できます" },
      { status: 403 },
    );
  return Response.json({ post: updated });
}

export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user)
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const postId = postIdFrom(request);
  if (!postId)
    return Response.json({ error: "投稿が見つかりません" }, { status: 404 });

  const db = getDb();
  const [ownedPost] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.id, postId), eq(posts.userId, user.id)))
    .limit(1);
  if (!ownedPost)
    return Response.json(
      { error: "自分の投稿だけ削除できます" },
      { status: 403 },
    );

  const images = await db
    .select({ objectKey: postImages.objectKey })
    .from(postImages)
    .where(eq(postImages.postId, postId));
  await db.delete(posts).where(eq(posts.id, postId));

  const runtime = env as unknown as { BUCKET?: R2Bucket };
  if (runtime.BUCKET && images.length) {
    await Promise.all(
      images.map((image) => runtime.BUCKET!.delete(image.objectKey)),
    );
  }
  return Response.json({ ok: true });
}
