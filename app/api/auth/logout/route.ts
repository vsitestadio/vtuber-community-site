import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId)
    await getDb().delete(sessions).where(eq(sessions.id, sessionId));
  store.delete(SESSION_COOKIE);
  return Response.redirect(new URL("/community", request.url), 303);
}
