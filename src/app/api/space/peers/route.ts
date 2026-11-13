// Lightweight Edge API for Real-time Peer Discovery & WebRTC Signal Exchange
// Retains active peer presence & signals in memory with zero database write load.
// Maintains active peer roster for instant discovery plus incremental message cursors.

import { NextResponse } from "next/server";
import { PeerState, SignalMessage } from "@/lib/space/signaling";

interface CachedMessage {
  msg: SignalMessage;
  senderId: string;
  timestamp: number;
}

interface CachedPeerEntry {
  peer: PeerState;
  updatedAt: number;
}

interface CachedChannel {
  messages: CachedMessage[];
  peers: Map<string, CachedPeerEntry>;
  lastActive: number;
}

// In-memory channel cache
const channels = new Map<string, CachedChannel>();

function applyPeerUpdate(channel: CachedChannel, message: SignalMessage, now: number): void {
  switch (message.type) {
    case "peer_join":
      channel.peers.set(message.peer.id, {
        peer: { ...message.peer, updatedAt: now },
        updatedAt: now,
      });
      break;
    case "peer_move": {
      const existing = channel.peers.get(message.id);
      if (existing) {
        existing.peer = {
          ...existing.peer,
          x: message.x,
          y: message.y,
          dir: message.dir,
          isMoving: message.isMoving,
          zoneId: message.zoneId,
          updatedAt: now,
        };
        existing.updatedAt = now;
      }
      break;
    }
    case "peer_status": {
      const existing = channel.peers.get(message.id);
      if (existing) {
        existing.peer = {
          ...existing.peer,
          status: message.status,
          deskClaimed: message.deskClaimed ?? existing.peer.deskClaimed,
          name: message.name ?? existing.peer.name,
          avatarColor: message.avatarColor ?? existing.peer.avatarColor,
          updatedAt: now,
        };
        existing.updatedAt = now;
      }
      break;
    }
    case "peer_media": {
      const existing = channel.peers.get(message.id);
      if (existing) {
        existing.peer = {
          ...existing.peer,
          media: { ...existing.peer.media, ...message.media },
          updatedAt: now,
        };
        existing.updatedAt = now;
      }
      break;
    }
    case "peer_leave":
      channel.peers.delete(message.id);
      break;
    default:
      break;
  }
}

// Cleanup stale channels, old messages, and inactive peers periodically
function pruneChannels() {
  const now = Date.now();
  for (const [key, channel] of channels.entries()) {
    if (now - channel.lastActive > 60_000) {
      channels.delete(key);
    } else {
      channel.messages = channel.messages
        .filter((m) => now - m.timestamp < 20_000)
        .slice(-150);

      for (const [peerId, entry] of channel.peers.entries()) {
        if (now - entry.updatedAt > 35_000) {
          channel.peers.delete(peerId);
        }
      }
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
    return NextResponse.json({ messages: [], peers: [], serverTime });
  }

  // Filter out messages from requester and older than incremental cursor
  const unread = ch.messages
    .filter((m) => m.senderId !== senderId && m.timestamp > since)
    .map((m) => m.msg);

  // Active coworkers currently in the same office channel for instant discovery
  const activePeers = Array.from(ch.peers.values())
    .filter((entry) => entry.peer.id !== senderId)
    .map((entry) => entry.peer);

  return NextResponse.json({ messages: unread, peers: activePeers, serverTime });
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
      channels.set(channel, {
        messages: [],
        peers: new Map(),
        lastActive: Date.now(),
      });
    }

    const ch = channels.get(channel)!;
    const now = Date.now();
    ch.lastActive = now;

    applyPeerUpdate(ch, message, now);

    // Deduplicate high-frequency peer_move and peer_status updates per sender
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
