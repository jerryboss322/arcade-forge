// Lightweight Serverless API for Real-time Peer Discovery & WebRTC Signal Exchange
// Retains active peer presence & signals in memory with monotonic sequence cursors.

import { NextResponse } from "next/server";
import { PeerState, SignalMessage } from "../../../../lib/space/signaling";

export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

interface CachedMessage {
  seq: number;
  msg: SignalMessage;
  senderId: string;
  timestamp: number;
}

interface CachedPeerEntry {
  peer: PeerState;
  updatedAt: number;
}

interface CachedChannel {
  nextSeq: number;
  messages: CachedMessage[];
  peers: Map<string, CachedPeerEntry>;
  lastActive: number;
}

// Share channel map across Next.js route reloads within the same Node runtime
const globalStore = globalThis as typeof globalThis & {
  __forgespaceChannels?: Map<string, CachedChannel>;
};
const channels: Map<string, CachedChannel> =
  globalStore.__forgespaceChannels ??
  (globalStore.__forgespaceChannels = new Map<string, CachedChannel>());

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

function pruneChannels(): void {
  const now = Date.now();
  for (const [key, channel] of channels.entries()) {
    if (now - channel.lastActive > 120_000) {
      channels.delete(key);
    } else {
      channel.messages = channel.messages
        .filter((m) => now - m.timestamp < 30_000)
        .slice(-200);

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
  const rawSince = sinceParam ? Number(sinceParam) : 0;
  const since = Number.isFinite(rawSince) ? rawSince : 0;
  const serverTime = Date.now();

  if (!channel) {
    return NextResponse.json({ error: "Missing channel" }, { status: 400 });
  }

  const ch = channels.get(channel);
  if (!ch) {
    return NextResponse.json({
      messages: [],
      peers: [],
      cursor: 0,
      serverTime,
    });
  }

  // Reset cursor if requester's sequence is ahead of a fresh/restarted channel
  const currentSeq = ch.nextSeq - 1;
  const effectiveSince = since > currentSeq ? 0 : since;

  // Return strictly newer sequence messages (excluding self & other peers' unicast signals)
  const unread = ch.messages
    .filter((m) => {
      if (m.seq <= effectiveSince) return false;
      if (m.senderId === senderId) return false;
      if (m.msg.type === "webrtc_signal" && senderId && m.msg.to !== senderId) {
        return false;
      }
      return true;
    })
    .map((m) => m.msg);

  const activePeers = Array.from(ch.peers.values())
    .filter((entry) => entry.peer.id !== senderId)
    .map((entry) => entry.peer);

  return NextResponse.json({
    messages: unread,
    peers: activePeers,
    cursor: currentSeq,
    serverTime,
  });
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
        nextSeq: 1,
        messages: [],
        peers: new Map(),
        lastActive: Date.now(),
      });
    }

    const ch = channels.get(channel)!;
    const now = Date.now();
    ch.lastActive = now;

    applyPeerUpdate(ch, message, now);

    // Keep latest peer_move / peer_status per sender while advancing monotonic seq
    if (message.type === "peer_move" || message.type === "peer_status") {
      ch.messages = ch.messages.filter(
        (m) => !(m.senderId === senderId && m.msg.type === message.type)
      );
    }

    const seq = ch.nextSeq++;
    ch.messages.push({
      seq,
      msg: message,
      senderId,
      timestamp: now,
    });

    if (ch.messages.length > 200) {
      ch.messages.splice(0, ch.messages.length - 200);
    }

    return NextResponse.json({ success: true, seq, serverTime: now });
  } catch {
    return NextResponse.json({ error: "Failed to post message" }, { status: 500 });
  }
}
