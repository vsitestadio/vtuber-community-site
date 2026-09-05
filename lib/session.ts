import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "luna_session";

export async function currentUser() {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, sessionId),
        gt(sessions.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createSession(userId: string) {
  const db = getDb();
  const id = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  await db.insert(sessions).values({ id, userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
