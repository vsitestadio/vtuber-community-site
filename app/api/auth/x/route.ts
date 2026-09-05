import { env } from "cloudflare:workers";
import { cookies } from "next/headers";

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function GET(request: Request) {
  const runtime = env as unknown as Record<string, string | undefined>;
  const clientId = runtime.X_CLIENT_ID;
  if (!clientId)
    return Response.redirect(
      new URL("/community?auth=setup", request.url),
      302,
    );

  const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const challenge = base64url(new Uint8Array(digest));
  const callback = `${new URL(request.url).origin}/api/auth/x/callback`;
  const store = await cookies();
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  store.set("x_oauth_state", state, options);
  store.set("x_oauth_verifier", verifier, options);

  const url = new URL("https://x.com/i/oauth2/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callback,
    scope: "tweet.read users.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return Response.redirect(url, 302);
}
