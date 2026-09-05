import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { videoVotes } from "@/db/schema";
import { rankingVideoIds, rankingVideos } from "@/lib/ranking";
import { currentUser } from "@/lib/session";

export async function GET() {
  const db = getDb();
  const user = await currentUser();
  const counts = await db
    .select({ videoId: videoVotes.videoId, votes: count() })
    .from(videoVotes)
    .groupBy(videoVotes.videoId);
  const voted = user
    ? await db
        .select({ videoId: videoVotes.videoId })
        .from(videoVotes)
        .where(eq(videoVotes.userId, user.id))
    : [];
  const countMap = new Map(counts.map((item) => [item.videoId, item.votes]));
  const votedIds = new Set(voted.map((item) => item.videoId));

  return Response.json({
    loggedIn: Boolean(user),
    videos: rankingVideos
      .map((video) => ({
        ...video,
        votes: countMap.get(video.id) ?? 0,
        votedByMe: votedIds.has(video.id),
      }))
      .sort((a, b) => b.votes - a.votes),
  });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return Response.json(
      { error: "投票にはログインが必要です" },
      { status: 401 },
    );
  const body = (await request.json().catch(() => null)) as {
    videoId?: string;
  } | null;
  const videoId = String(body?.videoId ?? "");
  if (!rankingVideoIds.includes(videoId as (typeof rankingVideoIds)[number])) {
    return Response.json({ error: "配信が見つかりません" }, { status: 404 });
  }

  const db = getDb();
  const [existing] = await db
    .select({ videoId: videoVotes.videoId })
    .from(videoVotes)
    .where(and(eq(videoVotes.videoId, videoId), eq(videoVotes.userId, user.id)))
    .limit(1);
  if (existing) {
    await db
      .delete(videoVotes)
      .where(
        and(eq(videoVotes.videoId, videoId), eq(videoVotes.userId, user.id)),
      );
  } else {
    await db.insert(videoVotes).values({ videoId, userId: user.id });
  }
  const [result] = await db
    .select({ votes: count() })
    .from(videoVotes)
    .where(eq(videoVotes.videoId, videoId));
  return Response.json({ voted: !existing, votes: result?.votes ?? 0 });
}
