import { NextResponse } from "next/server";
import { pollChannel, postChannel } from "../../../../lib/space/spaceStore";
import type { SignalMessage } from "../../../../lib/space/signaling";

export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

/**
 * GET /api/space/peers?channel=...&senderId=...&since=0
 * Returns active peers + messages newer than `since`.
 * Backed by Upstash Redis / Vercel KV REST when configured, or in-memory fallback locally.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel");
  const senderId = searchParams.get("senderId");
  const since = Number(searchParams.get("since") || "0");

  if (!channel) {
    return NextResponse.json({ error: "Missing channel" }, { status: 400 });
  }

  const result = await pollChannel(channel, senderId, since);
  return NextResponse.json(result);
}

/**
 * POST /api/space/peers
 * Body: { channel: string, message: SignalMessage, senderId: string }
 * Appends message and/or registers peer heartbeat in the channel store.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      channel?: string;
      message?: SignalMessage;
      senderId?: string;
    };
    const { channel, message, senderId } = body;

    if (!channel || !message || !senderId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await postChannel(channel, senderId, message);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to post message" },
      { status: 500 }
    );
  }
}
