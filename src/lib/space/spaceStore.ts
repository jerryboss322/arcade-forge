// Distributed & Local Channel Store for ForgeSpace Peer Discovery & WebRTC Signaling.
// Uses Upstash Redis / Vercel KV REST API when configured so all serverless containers share state,
// and falls back seamlessly to an in-memory store for local development & unit tests.

import type { PeerState, SignalMessage } from "./signaling";

export interface CachedMessage {
  seq: number;
  msg: SignalMessage;
  senderId: string;
  timestamp: number;
}

export interface CachedPeerEntry {
  peer: PeerState;
  updatedAt: number;
}

export interface PollResult {
  messages: SignalMessage[];
  peers: PeerState[];
  cursor: number;
  serverTime: number;
  backend: "redis" | "memory";
}

export interface PostResult {
  success: boolean;
  seq: number;
  serverTime: number;
  backend: "redis" | "memory";
}

export interface RedisRestConfig {
  url: string;
  token: string;
}

const PEER_TTL_MS = 35_000;
const MSG_TTL_MS = 30_000;
const MAX_MESSAGES = 200;
const REDIS_CHANNEL_TTL_SEC = 120;

export function getRedisRestConfig(
  env: Record<string, string | undefined> = process.env
): RedisRestConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return {
    url: url.replace(/\/+$/, ""),
    token,
  };
}

export function mergePeerUpdate(
  existing: CachedPeerEntry | undefined,
  message: SignalMessage,
  now: number
): { entry?: CachedPeerEntry; remove?: boolean } {
  switch (message.type) {
    case "peer_join":
      return {
        entry: {
          peer: { ...message.peer, updatedAt: now },
          updatedAt: now,
        },
      };
    case "peer_move":
      if (!existing) return {};
      return {
        entry: {
          peer: {
            ...existing.peer,
            x: message.x,
            y: message.y,
            dir: message.dir,
            isMoving: message.isMoving,
            zoneId: message.zoneId,
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    case "peer_status":
      if (!existing) return {};
      return {
        entry: {
          peer: {
            ...existing.peer,
            status: message.status,
            deskClaimed: message.deskClaimed ?? existing.peer.deskClaimed,
            name: message.name ?? existing.peer.name,
            avatarColor: message.avatarColor ?? existing.peer.avatarColor,
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    case "peer_media":
      if (!existing) return {};
      return {
        entry: {
          peer: {
            ...existing.peer,
            media: { ...existing.peer.media, ...message.media },
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    case "peer_leave":
      return { remove: true };
    default:
      if (!existing) return {};
      // Keep active peer fresh when chatting/reacting/signaling
      return {
        entry: {
          peer: { ...existing.peer, updatedAt: now },
          updatedAt: now,
        },
      };
  }
}

function filterUnreadMessages(
  messages: CachedMessage[],
  senderId: string | null,
  effectiveSince: number,
  now: number
): SignalMessage[] {
  return messages
    .filter((m) => {
      if (now - m.timestamp >= MSG_TTL_MS) return false;
      if (m.seq <= effectiveSince) return false;
      if (m.senderId === senderId) return false;
      if (m.msg.type === "webrtc_signal" && senderId && m.msg.to !== senderId) {
        return false;
      }
      return true;
    })
    .map((m) => m.msg);
}

// ---------------------------------------------------------------------------
// In-Memory Fallback Store (used in local dev & tests when Redis env is unset)
// ---------------------------------------------------------------------------

interface InMemoryChannel {
  nextSeq: number;
  messages: CachedMessage[];
  peers: Map<string, CachedPeerEntry>;
  lastActive: number;
}

const globalStore = globalThis as typeof globalThis & {
  __forgespaceChannels?: Map<string, InMemoryChannel>;
};
const memoryChannels: Map<string, InMemoryChannel> =
  globalStore.__forgespaceChannels ??
  (globalStore.__forgespaceChannels = new Map<string, InMemoryChannel>());

function pruneMemoryChannels(now: number): void {
  for (const [key, channel] of memoryChannels.entries()) {
    if (now - channel.lastActive > REDIS_CHANNEL_TTL_SEC * 1000) {
      memoryChannels.delete(key);
    } else {
      channel.messages = channel.messages
        .filter((m) => now - m.timestamp < MSG_TTL_MS)
        .slice(-MAX_MESSAGES);

      for (const [peerId, entry] of channel.peers.entries()) {
        if (now - entry.updatedAt > PEER_TTL_MS) {
          channel.peers.delete(peerId);
        }
      }
    }
  }
}

export function pollMemoryChannel(
  channel: string,
  senderId: string | null,
  since: number,
  now = Date.now()
): PollResult {
  pruneMemoryChannels(now);
  const ch = memoryChannels.get(channel);
  if (!ch) {
    return {
      messages: [],
      peers: [],
      cursor: 0,
      serverTime: now,
      backend: "memory",
    };
  }

  const currentSeq = ch.nextSeq - 1;
  const effectiveSince = since > currentSeq ? 0 : since;
  const unread = filterUnreadMessages(ch.messages, senderId, effectiveSince, now);

  const activePeers = Array.from(ch.peers.values())
    .filter((entry) => entry.peer.id !== senderId)
    .map((entry) => entry.peer);

  return {
    messages: unread,
    peers: activePeers,
    cursor: currentSeq,
    serverTime: now,
    backend: "memory",
  };
}

export function postMemoryChannel(
  channel: string,
  senderId: string,
  message: SignalMessage,
  now = Date.now()
): PostResult {
  if (!memoryChannels.has(channel)) {
    memoryChannels.set(channel, {
      nextSeq: 1,
      messages: [],
      peers: new Map(),
      lastActive: now,
    });
  }

  const ch = memoryChannels.get(channel)!;
  ch.lastActive = now;

  const updated = mergePeerUpdate(ch.peers.get(senderId), message, now);
  if (updated.remove) {
    ch.peers.delete(senderId);
  } else if (updated.entry) {
    ch.peers.set(senderId, updated.entry);
  }

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

  if (ch.messages.length > MAX_MESSAGES) {
    ch.messages.splice(0, ch.messages.length - MAX_MESSAGES);
  }

  return {
    success: true,
    seq,
    serverTime: now,
    backend: "memory",
  };
}

// ---------------------------------------------------------------------------
// Upstash Redis / Vercel KV REST Store (cross-container serverless state)
// ---------------------------------------------------------------------------

type RedisCommand = Array<string | number>;

async function runRedisPipeline(
  config: RedisRestConfig,
  commands: RedisCommand[]
): Promise<Array<{ result?: unknown; error?: string }>> {
  const res = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Upstash REST HTTP ${res.status}`);
  }

  const data = (await res.json()) as Array<{ result?: unknown; error?: string }>;
  if (!Array.isArray(data)) {
    throw new Error("Invalid Upstash pipeline response");
  }
  return data;
}

function parseHgetallResult(raw: unknown): Array<[string, string]> {
  if (Array.isArray(raw)) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i + 1 < raw.length; i += 2) {
      const k = raw[i];
      const v = raw[i + 1];
      if (typeof k === "string" && typeof v === "string") {
        pairs.push([k, v]);
      }
    }
    return pairs;
  }
  if (raw && typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    );
  }
  return [];
}

function channelKeys(channel: string) {
  const prefix = `fs:${channel}`;
  return {
    seqKey: `${prefix}:seq`,
    peersKey: `${prefix}:peers`,
    msgsKey: `${prefix}:msgs`,
  };
}

export async function pollRedisChannel(
  config: RedisRestConfig,
  channel: string,
  senderId: string | null,
  since: number,
  now = Date.now()
): Promise<PollResult> {
  const { seqKey, peersKey, msgsKey } = channelKeys(channel);
  const results = await runRedisPipeline(config, [
    ["HGETALL", peersKey],
    ["LRANGE", msgsKey, 0, -1],
    ["GET", seqKey],
  ]);

  const rawPeers = parseHgetallResult(results[0]?.result);
  const rawMsgs = Array.isArray(results[1]?.result)
    ? (results[1]!.result as unknown[])
    : [];
  const seqVal = results[2]?.result;
  const currentSeq = seqVal ? Number(seqVal) || 0 : 0;

  const activePeers: PeerState[] = [];
  const stalePeerIds: string[] = [];

  for (const [peerId, json] of rawPeers) {
    try {
      const parsed = JSON.parse(json) as CachedPeerEntry;
      if (now - parsed.updatedAt > PEER_TTL_MS) {
        stalePeerIds.push(peerId);
      } else if (parsed.peer.id !== senderId) {
        activePeers.push(parsed.peer);
      }
    } catch {
      stalePeerIds.push(peerId);
    }
  }

  // Opportunistically clean stale peers without blocking response
  if (stalePeerIds.length > 0) {
    void runRedisPipeline(config, [["HDEL", peersKey, ...stalePeerIds]]).catch(() => {});
  }

  const parsedMessages: CachedMessage[] = [];
  for (const item of rawMsgs) {
    if (typeof item !== "string") continue;
    try {
      parsedMessages.push(JSON.parse(item) as CachedMessage);
    } catch {
      // Skip malformed entry
    }
  }
  parsedMessages.sort((a, b) => a.seq - b.seq);

  const effectiveSince = since > currentSeq ? 0 : since;

  // Hold the cursor before any brief sequence gap (< 1.5s) so out-of-order concurrent
  // serverless POSTs cannot cause the client to skip an Offer or ICE candidate.
  let safeCursor = effectiveSince;
  const deliverable: CachedMessage[] = [];
  const gapWindowMs = 1500;

  for (const entry of parsedMessages) {
    if (entry.seq <= effectiveSince) continue;
    const isSmallInFlightGap =
      safeCursor > 0 && entry.seq > safeCursor + 1 && entry.seq - safeCursor <= 10;
    if (isSmallInFlightGap && now - entry.timestamp < gapWindowMs) {
      break;
    }
    safeCursor = entry.seq;
    deliverable.push(entry);
  }

  const unread = filterUnreadMessages(deliverable, senderId, effectiveSince, now);

  return {
    messages: unread,
    peers: activePeers,
    cursor: safeCursor,
    serverTime: now,
    backend: "redis",
  };
}

export async function postRedisChannel(
  config: RedisRestConfig,
  channel: string,
  senderId: string,
  message: SignalMessage,
  now = Date.now()
): Promise<PostResult> {
  const { seqKey, peersKey, msgsKey } = channelKeys(channel);

  // Read existing peer entry only when applying partial updates
  let existingPeer: CachedPeerEntry | undefined;
  if (message.type !== "peer_join" && message.type !== "peer_leave") {
    const pre = await runRedisPipeline(config, [["HGET", peersKey, senderId]]);
    const rawExisting = pre[0]?.result;
    if (typeof rawExisting === "string") {
      try {
        existingPeer = JSON.parse(rawExisting) as CachedPeerEntry;
      } catch {
        existingPeer = undefined;
      }
    }
  }

  // Increment sequence atomically across all serverless containers first
  const seqRes = await runRedisPipeline(config, [
    ["INCR", seqKey],
    ["EXPIRE", seqKey, REDIS_CHANNEL_TTL_SEC],
  ]);
  const seq = Number(seqRes[0]?.result) || 1;

  const updated = mergePeerUpdate(existingPeer, message, now);
  const commands: RedisCommand[] = [];

  if (updated.remove) {
    commands.push(["HDEL", peersKey, senderId]);
  } else if (updated.entry) {
    commands.push(["HSET", peersKey, senderId, JSON.stringify(updated.entry)]);
    commands.push(["EXPIRE", peersKey, REDIS_CHANNEL_TTL_SEC]);
  }

  const cachedMessage: CachedMessage = {
    seq,
    msg: message,
    senderId,
    timestamp: now,
  };

  commands.push(["RPUSH", msgsKey, JSON.stringify(cachedMessage)]);
  commands.push(["LTRIM", msgsKey, -MAX_MESSAGES, -1]);
  commands.push(["EXPIRE", msgsKey, 45]);

  await runRedisPipeline(config, commands);

  return {
    success: true,
    seq,
    serverTime: now,
    backend: "redis",
  };
}

export async function pollChannel(
  channel: string,
  senderId: string | null,
  since: number,
  now = Date.now()
): Promise<PollResult> {
  const redis = getRedisRestConfig();
  if (redis) {
    try {
      return await pollRedisChannel(redis, channel, senderId, since, now);
    } catch (err) {
      console.warn("Redis poll fallback to memory:", err);
    }
  }
  return pollMemoryChannel(channel, senderId, since, now);
}

export async function postChannel(
  channel: string,
  senderId: string,
  message: SignalMessage,
  now = Date.now()
): Promise<PostResult> {
  const redis = getRedisRestConfig();
  if (redis) {
    try {
      return await postRedisChannel(redis, channel, senderId, message, now);
    } catch (err) {
      console.warn("Redis post fallback to memory:", err);
    }
  }
  return postMemoryChannel(channel, senderId, message, now);
}
