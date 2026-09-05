import { currentUser } from "@/lib/session";

export async function GET() {
  return Response.json({ user: await currentUser() });
}
