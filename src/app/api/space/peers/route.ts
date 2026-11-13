// Lightweight Edge API for Real-time Peer Discovery & WebRTC Signal Exchange
// Retains active peer presence in memory for 60 seconds with zero database write load.
// Uses per-sender movement deduplication and incremental timestamps for multi-user scalability.

import { NextResponse } from "next/server";
import { SignalMessage } from "@/lib/space/signaling";

interface CachedMessage {
  msg: SignalMessage;
  senderId: string;
  timestamp: number;
}

interface CachedChannel {
  messages: CachedMessage[];
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
      // Keep only messages younger than 15 seconds, capped at 120 items
      channel.messages = channel.messages
        .filter((m) => now - m.timestamp < 15_000)
        .slice(-120);
    }
  }
}

export async function GET(request: Request) {
  pruneChannels();
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel");
  const senderId = url.searchParams.get("senderId");
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? Number(sinceParam) : 0;
  const serverTime = Date.now();

  if (!channel) {
    return NextResponse.json({ error: "Missing channel" }, { status: 400 });
  }

  const ch = channels.get(channel);
  if (!ch) {
    return NextResponse.json({ messages: [], serverTime });
  }

  // Filter out messages from requester and older than incremental cursor
  const unread = ch.messages
    .filter((m) => m.senderId !== senderId && m.timestamp > since)
    .map((m) => m.msg);

  return NextResponse.json({ messages: unread, serverTime });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { channel, message, senderId } = body as {
      channel?: string;
      message?: SignalMessage;
      senderId?: string;
    };

    if (!channel || !message || !senderId) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!channels.has(channel)) {
      channels.set(channel, { messages: [], lastActive: Date.now() });
    }

    const ch = channels.get(channel)!;
    const now = Date.now();
    ch.lastActive = now;

    // Deduplicate high-frequency peer_move and peer_status updates per sender
    // so multiple moving peers never overflow the message queue with stale coordinates.
    if (message.type === "peer_move" || message.type === "peer_status") {
      ch.messages = ch.messages.filter(
        (m) => !(m.senderId === senderId && m.msg.type === message.type)
      );
    }

    ch.messages.push({
      msg: message,
      senderId,
      timestamp: now,
    });

    if (ch.messages.length > 150) {
      ch.messages.splice(0, ch.messages.length - 150);
    }

    return NextResponse.json({ success: true, serverTime: now });
  } catch {
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}
