import { env } from "cloudflare:workers";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";
import { createSession } from "@/lib/session";

export async function GET(request: Request) {
  const current = new URL(request.url);
  const code = current.searchParams.get("code");
  const state = current.searchParams.get("state");
  const store = await cookies();
  const savedState = store.get("x_oauth_state")?.value;
  const verifier = store.get("x_oauth_verifier")?.value;
  const runtime = env as unknown as Record<string, string | undefined>;
  const clientId = runtime.X_CLIENT_ID;
  if (!code || !state || state !== savedState || !verifier || !clientId) {
    return Response.redirect(
      new URL("/community?auth=failed", request.url),
      302,
    );
  }

  const callback = `${current.origin}/api/auth/x/callback`;
  const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: callback,
      code_verifier: verifier,
      client_id: clientId,
    }),
  });
  if (!tokenResponse.ok)
    return Response.redirect(
      new URL("/community?auth=failed", request.url),
      302,
    );
  const token = (await tokenResponse.json()) as { access_token: string };
  const profileResponse = await fetch(
    "https://api.x.com/2/users/me?user.fields=profile_image_url",
    {
      headers: { Authorization: `Bearer ${token.access_token}` },
    },
  );
  if (!profileResponse.ok)
    return Response.redirect(
      new URL("/community?auth=failed", request.url),
      302,
    );
  const profile = (await profileResponse.json()) as {
    data: {
      id: string;
      username: string;
      name: string;
      profile_image_url?: string;
    };
  };
  const xUser = profile.data;
  const existingUser = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.xUserId, xUser.id))
    .get();
  const userId = existingUser?.id ?? `x-${xUser.id}`;
  await getDb()
    .insert(users)
    .values({
      id: userId,
      xUserId: xUser.id,
      username: xUser.username,
      displayName: xUser.name,
      avatarUrl: xUser.profile_image_url,
    })
    .onConflictDoUpdate({
      target: users.xUserId,
      set: {
        username: xUser.username,
        displayName: xUser.name,
        avatarUrl: xUser.profile_image_url,
      },
    });
  await createSession(userId);
  store.delete("x_oauth_state");
  store.delete("x_oauth_verifier");
  return Response.redirect(new URL("/community", request.url), 302);
}
