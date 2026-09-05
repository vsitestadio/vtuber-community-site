import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    displayName?: string;
    email?: string;
    password?: string;
  };
  const displayName = body.displayName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (displayName.length < 1 || displayName.length > 30)
    return Response.json(
      { error: "表示名は1〜30文字で入力してください" },
      { status: 400 },
    );
  if (!emailPattern.test(email))
    return Response.json(
      { error: "メールアドレスを確認してください" },
      { status: 400 },
    );
  if (password.length < 8 || password.length > 72)
    return Response.json(
      { error: "パスワードは8〜72文字で入力してください" },
      { status: 400 },
    );

  const db = getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .get();
  if (existing)
    return Response.json(
      { error: "このメールアドレスは登録済みです" },
      { status: 409 },
    );
  const userId = crypto.randomUUID();
  await db
    .insert(users)
    .values({
      id: userId,
      email,
      passwordHash: await hashPassword(password),
      username: email.split("@")[0].slice(0, 24),
      displayName,
    });
  await createSession(userId);
  return Response.json({ ok: true }, { status: 201 });
}
