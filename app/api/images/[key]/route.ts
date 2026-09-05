import { env } from "cloudflare:workers";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params;
  const runtime = env as unknown as { BUCKET?: R2Bucket };
  const object = await runtime.BUCKET?.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType ?? "application/octet-stream",
  );
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
