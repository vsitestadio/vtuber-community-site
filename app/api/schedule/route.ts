import { getUpcomingStreams } from "../../../lib/schedule";

export async function GET() {
  return Response.json({ streams: getUpcomingStreams() });
}
