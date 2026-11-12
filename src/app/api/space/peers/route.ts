// Lightweight Edge API for Real-time Peer Discovery & WebRTC Signal Exchange
// Retains active peer presence in memory for 60 seconds with zero database write load.
// Prevents Neon compute consumption.

import { NextResponse } from "next/server";
import { SignalMessage } from "@/lib/space/signaling";

interface CachedChannel {
  messages: { msg: SignalMessage; senderId: string; timestamp: number }[];
  lastActive: number;
}

// In-memory channel cache
const channels = new Map<string, CachedChannel>();

// Cleanup stale channels periodically
function pruneChannels() {
  const now = Date.now();
  for (const [key, channel] of channels.entries()) {
    if (now - channel.lastActive > 60_000) {
      channels.delete(key);
    } else {
      // Keep only last 50 messages younger than 10 seconds
      channel.messages = channel.messages.filter((m) => now - m.timestamp < 10_000).slice(-50);
    }
  }
}

export async function GET(request: Request) {
  pruneChannels();
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  const senderId = url.searchParams.get("senderId");

  if (!channel) {
    return NextResponse.json({ error: "Missing channel" }, { status: 400 });
  }

  const ch = channels.get(channel);
  if (!ch) {
    return NextResponse.json({ messages: [] });
  }

  // Filter messages not from this sender
  const unread = ch.messages
    .filter((m) => m.senderId !== senderId)
    .map((m) => m.msg);

  return NextResponse.json({ messages: unread });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel, message, senderId } = body;

    if (!channel || !message || !senderId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!channels.has(channel)) {
      channels.set(channel, { messages: [], lastActive: Date.now() });
    }

    const ch = channels.get(channel)!;
    ch.lastActive = Date.now();
    ch.messages.push({
      msg: message,
      senderId,
      timestamp: Date.now(),
    });

    if (ch.messages.length > 100) {
      ch.messages.splice(0, ch.messages.length - 100);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}
