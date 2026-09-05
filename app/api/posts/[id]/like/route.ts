import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { postLikes, posts } from "@/db/schema";
import { currentUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return Response.json({ error: "ログインが必要です" }, { status: 401 });
  const postId = Number(new URL(request.url).pathname.split("/").at(-2));
  if (!Number.isInteger(postId) || postId <= 0) {
    return Response.json({ error: "投稿が見つかりません" }, { status: 404 });
  }

  const db = getDb();
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);
  if (!post)
    return Response.json({ error: "投稿が見つかりません" }, { status: 404 });

  const [existing] = await db
    .select({ postId: postLikes.postId })
    .from(postLikes)
    .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)))
    .limit(1);
  const liked = !existing;
  if (existing) {
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, user.id)));
  } else {
    await db.insert(postLikes).values({ postId, userId: user.id });
  }

  const [result] = await db
    .update(posts)
    .set({
      likes: liked ? sql`${posts.likes} + 1` : sql`MAX(0, ${posts.likes} - 1)`,
    })
    .where(eq(posts.id, postId))
    .returning({ likes: posts.likes });
  const likes = result?.likes ?? 0;
  return Response.json({ liked, likes });
}
