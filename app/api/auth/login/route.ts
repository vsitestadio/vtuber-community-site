import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const user = await getDb()
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (
    !user?.passwordHash ||
    !(await verifyPassword(password, user.passwordHash))
  )
    return Response.json(
      { error: "メールアドレスまたはパスワードが違います" },
      { status: 401 },
    );
  await createSession(user.id);
  return Response.json({ ok: true });
}
