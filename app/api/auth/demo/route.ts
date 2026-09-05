import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const db = getDb();
  await db
    .insert(users)
    .values({
      id: "demo-yamada",
      username: "yamada_fan",
      displayName: "やまだ",
    })
    .onConflictDoUpdate({ target: users.id, set: { displayName: "やまだ" } });
  await createSession("demo-yamada");
  return Response.redirect(new URL("/community", request.url), 303);
}
