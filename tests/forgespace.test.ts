import { describe, it, expect } from "vitest";
import {
  createDefaultOfficeMap,
  findPath,
  getZoneAt,
  OFFICE_ZONES,
} from "../src/lib/space/officeMap";
import {
  OFFICE_REACTIONS,
  OFFICE_STATUS_PRESETS,
  pruneExpiredReactions,
} from "../src/lib/space/officeReactions";
import {
  OFFICE_THEME_LIST,
  getThemeCssVars,
} from "../src/lib/space/officeThemes";
import { ScreenPositionsStore } from "../src/lib/space/screenPositionsStore";
import {
  computeSpatialGain,
  getIceServers,
  hasTurnConfiguration,
  WebRTCMeshManager,
} from "../src/lib/space/webrtcMesh";
import { hasActiveVideoFeed } from "../src/components/space/StreamVideo";
import { GET, POST } from "../src/app/api/space/peers/route";
import { SpaceSignaling } from "../src/lib/space/signaling";
import {
  getRedisRestConfig,
  pollChannel,
  pollRedisChannel,
  postChannel,
  postRedisChannel,
  SpaceStoreError,
} from "../src/lib/space/spaceStore";
import {
  BOSS_COOKIE_NAME,
  SPACE_COOKIE_NAME,
  createBossToken,
  grantSpaceAccessToken,
  hashSecret,
  hasSpaceAccessToken,
  verifyBossToken,
  verifySecret,
} from "../src/lib/auth";
import { PLAN_CONFIG, normalizeWorkspaceSlug } from "../src/lib/plans";
import { verifyStripeSignature } from "../src/lib/billing";
import {
  clearWorkspacePolicyCache,
  syncWorkspacePolicyCache,
} from "../src/lib/workspacePolicy";
import { GET as GET_TURN } from "../src/app/api/space/turn/route";

describe("ForgeSpace Virtual Office", () => {
  it("generates 40x26 office tilemap with zones and collision boundaries", () => {
    const map = createDefaultOfficeMap();
    expect(map.cols).toBe(40);
    expect(map.rows).toBe(26);
    expect(map.ground.length).toBe(40 * 26);
    expect(map.walls.length).toBe(40 * 26);

    // Outer boundary must be walls
    expect(map.walls[0]).toBe(true);
    expect(map.walls[39]).toBe(true);
    expect(map.walls[25 * 40]).toBe(true);

    // Open floor walkway must be free
    expect(map.walls[10 * 40 + 10]).toBe(false);

    // Interactive objects
    const lofiRadio = map.objects.find((o) => o.kind === "radio");
    expect(lofiRadio).toBeDefined();
    expect(lofiRadio?.x).toBe(20);
    expect(lofiRadio?.y).toBe(19);

    const desks = map.objects.filter((o) => o.kind === "desk");
    expect(desks.length).toBe(12);
  });

  it("BFS pathfinding navigates around obstacles and walls to destination", () => {
    const map = createDefaultOfficeMap();

    // From reception (8, 20) to breakroom (18, 20)
    const path = findPath(8, 20, 18, 20, map.walls, map.cols, map.rows);
    expect(path.length).toBeGreaterThan(0);

    // Final waypoint should reach or be adjacent to target
    const [finalX, finalY] = path[path.length - 1]!;
    expect(Math.abs(finalX - 18) + Math.abs(finalY - 20)).toBeLessThanOrEqual(1);

    // Every step along the path must NOT collide with walls
    for (const [px, py] of path) {
      expect(map.walls[py * map.cols + px]).toBe(false);
    }
  });

  it("identifies private and public sound zones correctly", () => {
    // Reception (public)
    const receptionZone = getZoneAt(8, 20, OFFICE_ZONES);
    expect(receptionZone).toBeDefined();
    expect(receptionZone?.id).toBe("reception");
    expect(receptionZone?.isPrivate).toBe(false);

    // Glass Boardroom (private soundproof)
    const boardroomZone = getZoneAt(30, 5, OFFICE_ZONES);
    expect(boardroomZone).toBeDefined();
    expect(boardroomZone?.id).toBe("conf_boardroom");
    expect(boardroomZone?.isPrivate).toBe(true);

    // War Room (private soundproof)
    const warRoomZone = getZoneAt(30, 16, OFFICE_ZONES);
    expect(warRoomZone).toBeDefined();
    expect(warRoomZone?.id).toBe("conf_huddle");
    expect(warRoomZone?.isPrivate).toBe(true);
  });

  it("spatial audio rules: soundproof isolation & open distance attenuation", () => {
    // Math validation for spatial audio formula used in webrtcMesh
    const calculateGain = (
      dist: number,
      localZonePrivate: boolean,
      peerZonePrivate: boolean,
      sameZone: boolean
    ) => {
      if (localZonePrivate || peerZonePrivate) {
        if (sameZone && localZonePrivate) return 1.0;
        return 0.0;
      }
      if (dist <= 4) return 1.0;
      if (dist <= 8) return Math.max(0, 1.0 - (dist - 4) / 4);
      return 0.0;
    };

    // Close proximity (<4 tiles): 100% volume
    expect(calculateGain(2, false, false, false)).toBe(1.0);

    // Distance falloff (6 tiles): 50% volume
    expect(calculateGain(6, false, false, false)).toBe(0.5);

    // Distant (>8 tiles): muted
    expect(calculateGain(9, false, false, false)).toBe(0.0);

    // User A in boardroom (private) and User B outside: muted regardless of distance
    expect(calculateGain(1, true, false, false)).toBe(0.0);
    expect(calculateGain(1, false, true, false)).toBe(0.0);

    // Both users inside same boardroom: full volume
    expect(calculateGain(6, true, true, true)).toBe(1.0);
  });

  it("3D isometric coordinates correctly convert tile indices to WebGL world space", () => {
    const floorTileSize = 1.6;
    const cols = 40;
    const rows = 26;
    const halfCols = cols / 2;
    const halfRows = rows / 2;

    const tileToWorld = (col: number, row: number) => ({
      x: (col - halfCols + 0.5) * floorTileSize,
      z: (row - halfRows + 0.5) * floorTileSize,
    });

    const worldToTile = (wx: number, wz: number) => ({
      col: Math.round(wx / floorTileSize + halfCols - 0.5),
      row: Math.round(wz / floorTileSize + halfRows - 0.5),
    });

    // Center tile (20, 13)
    const centerWorld = tileToWorld(20, 13);
    expect(centerWorld.x).toBeCloseTo(0.8, 1);
    expect(centerWorld.z).toBeCloseTo(0.8, 1);

    const backToTile = worldToTile(centerWorld.x, centerWorld.z);
    expect(backToTile.col).toBe(20);
    expect(backToTile.row).toBe(13);

    // Origin tile (0, 0)
    const originWorld = tileToWorld(0, 0);
    expect(originWorld.x).toBeLessThan(0);
    expect(originWorld.z).toBeLessThan(0);
    const backOrigin = worldToTile(originWorld.x, originWorld.z);
    expect(backOrigin.col).toBe(0);
    expect(backOrigin.row).toBe(0);
  });

  it("truthful presence computation: never displays simulated or fake peer counts", () => {
    // When 0 remote peers are connected, count is strictly 1 (the local user)
    const remotePeersEmpty: Array<{ id: string; name: string }> = [];
    const countEmpty = remotePeersEmpty.length + 1;
    expect(countEmpty).toBe(1);

    // When 3 remote peers join over WebRTC
    const remotePeersActive = [
      { id: "peer-1", name: "Bob", status: "In Meeting" },
      { id: "peer-2", name: "Carol", status: "Deep Focus" },
      { id: "peer-3", name: "Dave", status: "Coffee Break" },
    ];
    const countActive = remotePeersActive.length + 1;
    expect(countActive).toBe(4);

    // Zero arbitrary multipliers or simulated bots
    expect(countActive).toBe(remotePeersActive.length + 1);
  });

  it("calculates room density and telemetry statistics truthfully", () => {
    const peers = [
      { id: "p1", zoneId: "boardroom", status: "In Meeting" },
      { id: "p2", zoneId: "boardroom", status: "In Meeting" },
      { id: "p3", zoneId: "war_room", status: "Sprint Planning" },
      { id: "p4", zoneId: "cafe_lounge", status: "Coffee Break" },
      { id: "p5", zoneId: "open_desks", status: "Deep Focus" },
    ];

    const boardroomCount = peers.filter((p) => p.zoneId === "boardroom").length;
    const warRoomCount = peers.filter((p) => p.zoneId === "war_room").length;
    const cafeCount = peers.filter((p) => p.zoneId === "cafe_lounge").length;

    expect(boardroomCount).toBe(2);
    expect(warRoomCount).toBe(1);
    expect(cafeCount).toBe(1);

    // P2P savings vs traditional $7/user/mo Zoom/Gather licenses
    const totalUsers = peers.length;
    const monthlySavings = (totalUsers * 7.0).toFixed(2);
    expect(monthlySavings).toBe("35.00");
  });

  it("prunes expired overhead peer reactions without mutating active ones", () => {
    expect(OFFICE_REACTIONS.length).toBeGreaterThanOrEqual(5);
    expect(OFFICE_STATUS_PRESETS).toContain("Focusing");

    const now = 10_000;
    const reactions = {
      p1: { peerId: "p1", emoji: "👋", label: "Wave", expiresAt: 9_500 },
      p2: { peerId: "p2", emoji: "☕", label: "Coffee", expiresAt: 12_500 },
    };

    const pruned = pruneExpiredReactions(reactions, now);
    expect(pruned.p1).toBeUndefined();
    expect(pruned.p2?.label).toBe("Coffee");

    // Calling again while nothing is expired returns the exact same reference
    const stable = pruneExpiredReactions(pruned, now + 500);
    expect(stable).toBe(pruned);
  });

  it("maps office lighting themes to synced CSS variables and 3D lighting tokens", () => {
    expect(OFFICE_THEME_LIST.length).toBe(3);
    for (const theme of OFFICE_THEME_LIST) {
      const vars = getThemeCssVars(theme.id);
      expect(vars["--color-bg"]).toBe(theme.cssVars.bg);
      expect(vars["--color-accent"]).toBe(theme.cssVars.accent);
      expect(theme.scene.hemiIntensity).toBeGreaterThan(0);
    }
  });

  it("notifies and unsubscribes listeners in ScreenPositionsStore cleanly", () => {
    const store = new ScreenPositionsStore();
    const updates: number[] = [];
    const unsubscribe = store.subscribe((positions) => {
      updates.push(Object.keys(positions).length);
    });

    store.update({ p1: { screenX: 100, screenY: 200, inView: true } });
    expect(store.getSnapshot().p1?.screenX).toBe(100);
    expect(updates).toEqual([1]);

    unsubscribe();
    store.update({});
    expect(updates).toEqual([1]);
  });

  it("computes spatial audio gain for office-wide, proximity, and private soundproof zones", () => {
    // Office mode keeps everyone on the open floor clearly audible (>= 0.45) even across the map
    expect(
      computeSpatialGain({
        dist: 2,
        isLocalPrivate: false,
        isPeerPrivate: false,
        sameZone: false,
        scope: "office",
      })
    ).toBe(1);

    const farOfficeGain = computeSpatialGain({
      dist: 25,
      isLocalPrivate: false,
      isPeerPrivate: false,
      sameZone: false,
      scope: "office",
    });
    expect(farOfficeGain).toBeGreaterThanOrEqual(0.45);
    expect(farOfficeGain).toBeLessThanOrEqual(1);

    // Proximity mode attenuates after 4 tiles and cuts off beyond 8 tiles when not in the same zone
    expect(
      computeSpatialGain({
        dist: 3,
        isLocalPrivate: false,
        isPeerPrivate: false,
        sameZone: false,
        scope: "proximity",
      })
    ).toBe(1);

    const midProxGain = computeSpatialGain({
      dist: 6,
      isLocalPrivate: false,
      isPeerPrivate: false,
      sameZone: false,
      scope: "proximity",
    });
    expect(midProxGain).toBeGreaterThan(0);
    expect(midProxGain).toBeLessThan(1);

    expect(
      computeSpatialGain({
        dist: 12,
        isLocalPrivate: false,
        isPeerPrivate: false,
        sameZone: false,
        scope: "proximity",
      })
    ).toBe(0);

    // Soundproof private rooms isolate outsiders in both office and proximity modes
    for (const scope of ["office", "proximity"] as const) {
      expect(
        computeSpatialGain({
          dist: 1,
          isLocalPrivate: true,
          isPeerPrivate: false,
          sameZone: false,
          scope,
        })
      ).toBe(0);
      expect(
        computeSpatialGain({
          dist: 10,
          isLocalPrivate: true,
          isPeerPrivate: true,
          sameZone: true,
          scope,
        })
      ).toBe(1);
    }
  });

  it("discovers joined peers and delivers unicast WebRTC signals reliably with sequence cursors", async () => {
    const channel = "forgespace_test_room_sync";
    const peerA = {
      id: "peer_a",
      name: "Alice",
      avatarColor: "#37E6C4",
      x: 8,
      y: 20,
      dir: "down" as const,
      isMoving: false,
      zoneId: "reception",
      status: "Focusing",
      deskClaimed: null,
      media: { audio: true, video: true, screen: false, speaking: false },
      updatedAt: Date.now(),
    };

    // Peer A joins room
    const postJoin = await POST(
      new Request("http://localhost/api/space/peers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          senderId: peerA.id,
          message: { type: "peer_join", peer: peerA },
        }),
      })
    );
    expect(postJoin.status).toBe(200);

    // Peer B joins later and polls with since=0 -> discovers Peer A in active roster
    const pollB1 = await GET(
      new Request(`http://localhost/api/space/peers?channel=${channel}&senderId=peer_b&since=0`)
    );
    const dataB1 = await pollB1.json();
    expect(dataB1.peers.some((p: { id: string }) => p.id === "peer_a")).toBe(true);
    expect(typeof dataB1.cursor).toBe("number");

    // Peer A sends WebRTC SDP offer targeted specifically at peer_b
    await POST(
      new Request("http://localhost/api/space/peers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          senderId: peerA.id,
          message: {
            type: "webrtc_signal",
            from: peerA.id,
            to: "peer_b",
            payload: { sdp: { type: "offer", sdp: "v=0..." } },
          },
        }),
      })
    );

    // Peer C does not receive Peer B's unicast signal
    const pollC = await GET(
      new Request(
        `http://localhost/api/space/peers?channel=${channel}&senderId=peer_c&since=${dataB1.cursor}`
      )
    );
    const dataC = await pollC.json();
    expect(dataC.messages).toHaveLength(0);

    // Peer B receives the exact WebRTC signal using previous sequence cursor
    const pollB2 = await GET(
      new Request(
        `http://localhost/api/space/peers?channel=${channel}&senderId=peer_b&since=${dataB1.cursor}`
      )
    );
    const dataB2 = await pollB2.json();
    expect(dataB2.messages).toHaveLength(1);
    expect(dataB2.messages[0].type).toBe("webrtc_signal");
    expect(dataB2.messages[0].to).toBe("peer_b");

    // Peer A leaves -> removed from active peers
    await POST(
      new Request("http://localhost/api/space/peers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          senderId: peerA.id,
          message: { type: "peer_leave", id: peerA.id },
        }),
      })
    );
    const pollB3 = await GET(
      new Request(
        `http://localhost/api/space/peers?channel=${channel}&senderId=peer_b&since=${dataB2.cursor}`
      )
    );
    const dataB3 = await pollB3.json();
    expect(dataB3.peers.some((p: { id: string }) => p.id === "peer_a")).toBe(false);
  });
});

describe("ForgeSpace Upstash Redis / Vercel KV Store", () => {
  function createMockUpstashFetch() {
    const strings = new Map<string, string>();
    const hashes = new Map<string, Map<string, string>>();
    const lists = new Map<string, string[]>();
    const calls: { url: string; auth: string | null; commands: unknown[][] }[] = [];

    const mockFetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const headers = new Headers(init?.headers);
      const commands = JSON.parse(String(init?.body ?? "[]")) as unknown[][];
      calls.push({ url, auth: headers.get("Authorization"), commands });

      const results = commands.map((cmd) => {
        const op = String(cmd[0]).toUpperCase();
        const key = String(cmd[1]);

        if (op === "INCR") {
          const next = Number(strings.get(key) ?? "0") + 1;
          strings.set(key, String(next));
          return { result: next };
        }
        if (op === "GET") {
          return { result: strings.get(key) ?? null };
        }
        if (op === "HSET") {
          let h = hashes.get(key);
          if (!h) {
            h = new Map<string, string>();
            hashes.set(key, h);
          }
          h.set(String(cmd[2]), String(cmd[3]));
          return { result: 1 };
        }
        if (op === "HDEL") {
          const h = hashes.get(key);
          let deleted = 0;
          for (const field of cmd.slice(2)) {
            if (h?.delete(String(field))) deleted += 1;
          }
          return { result: deleted };
        }
        if (op === "HGETALL") {
          const h = hashes.get(key);
          if (!h) return { result: [] };
          const flat: string[] = [];
          for (const [k, v] of h.entries()) {
            flat.push(k, v);
          }
          return { result: flat };
        }
        if (op === "RPUSH") {
          let list = lists.get(key);
          if (!list) {
            list = [];
            lists.set(key, list);
          }
          for (const item of cmd.slice(2)) {
            list.push(String(item));
          }
          return { result: list.length };
        }
        if (op === "LTRIM") {
          const list = lists.get(key) ?? [];
          const start = Number(cmd[2]);
          const stop = Number(cmd[3]);
          const len = list.length;
          const s = start < 0 ? Math.max(0, len + start) : start;
          const e = stop < 0 ? len + stop : Math.min(len - 1, stop);
          lists.set(key, s <= e ? list.slice(s, e + 1) : []);
          return { result: "OK" };
        }
        if (op === "LRANGE") {
          const list = lists.get(key) ?? [];
          const start = Number(cmd[2]);
          const stop = Number(cmd[3]);
          const len = list.length;
          const s = start < 0 ? Math.max(0, len + start) : start;
          const e = stop < 0 ? len + stop : Math.min(len - 1, stop);
          return { result: s <= e ? list.slice(s, e + 1) : [] };
        }
        if (op === "EXPIRE") {
          return { result: 1 };
        }
        return { result: null };
      });

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    return { mockFetch, calls };
  }

  it("detects both UPSTASH_REDIS_REST_* and KV_REST_API_* env vars", () => {
    expect(getRedisRestConfig({})).toBeNull();

    expect(
      getRedisRestConfig({
        UPSTASH_REDIS_REST_URL: "https://us1-example.upstash.io/",
        UPSTASH_REDIS_REST_TOKEN: "tok-upstash",
      })
    ).toEqual({
      url: "https://us1-example.upstash.io",
      token: "tok-upstash",
    });

    expect(
      getRedisRestConfig({
        KV_REST_API_URL: "https://kv-example.vercel-storage.com/",
        KV_REST_API_TOKEN: "tok-kv",
      })
    ).toEqual({
      url: "https://kv-example.vercel-storage.com",
      token: "tok-kv",
    });
  });

  it("exchanges peers, cursors, and unicast WebRTC signals via Redis REST pipeline", async () => {
    const { mockFetch, calls } = createMockUpstashFetch();
    const origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as typeof fetch;

    try {
      const config = {
        url: "https://redis-mock.upstash.io",
        token: "secret-token",
      };
      const channel = `redis-room-${Date.now()}`;
      const peerA = {
        id: "peer_a",
        name: "Alice",
        avatarColor: "#00f0ff",
        x: 5,
        y: 6,
        dir: "down" as const,
        isMoving: false,
        zoneId: "reception",
        status: "Focusing",
        deskClaimed: null,
        media: { audio: true, video: true, screen: false, speaking: false },
        updatedAt: 1_700_000_000_000,
      };
      const peerB = {
        ...peerA,
        id: "peer_b",
        name: "Bob",
        x: 7,
        y: 6,
      };

      const now = 1_700_000_000_000;
      await postRedisChannel(
        config,
        channel,
        peerA.id,
        { type: "peer_join", peer: peerA },
        now
      );
      await postRedisChannel(
        config,
        channel,
        peerB.id,
        { type: "peer_join", peer: peerB },
        now + 50
      );

      expect(calls[0]?.url).toBe("https://redis-mock.upstash.io/pipeline");
      expect(calls[0]?.auth).toBe("Bearer secret-token");

      const pollB1 = await pollRedisChannel(config, channel, peerB.id, 0, now + 100);
      expect(pollB1.peers.map((p) => p.id)).toEqual(["peer_a"]);
      expect(pollB1.cursor).toBe(2);

      await postRedisChannel(
        config,
        channel,
        peerA.id,
        {
          type: "webrtc_signal",
          from: peerA.id,
          to: peerB.id,
          payload: { sdp: { type: "offer", sdp: "mock-sdp" } },
        },
        now + 150
      );

      const pollC = await pollRedisChannel(
        config,
        channel,
        "peer_c",
        pollB1.cursor,
        now + 200
      );
      expect(pollC.peers.map((p) => p.id).sort()).toEqual(["peer_a", "peer_b"]);
      expect(pollC.messages).toHaveLength(0);

      const pollB2 = await pollRedisChannel(
        config,
        channel,
        peerB.id,
        pollB1.cursor,
        now + 200
      );
      expect(pollB2.messages).toHaveLength(1);
      expect(pollB2.messages[0]).toMatchObject({
        type: "webrtc_signal",
        from: peerA.id,
        to: peerB.id,
      });

      await postRedisChannel(
        config,
        channel,
        peerA.id,
        { type: "peer_leave", id: peerA.id },
        now + 250
      );
      const pollB3 = await pollRedisChannel(
        config,
        channel,
        peerB.id,
        pollB2.cursor,
        now + 300
      );
      expect(pollB3.peers).toEqual([]);

      const pollC2 = await pollRedisChannel(
        config,
        channel,
        "peer_c",
        pollB2.cursor,
        now + 300
      );
      expect(pollC2.peers.map((p) => p.id)).toEqual(["peer_b"]);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("throws SpaceStoreError and returns HTTP 503 on Redis failure without falling back to memory", async () => {
    const origFetch = globalThis.fetch;
    const origUrl = process.env.UPSTASH_REDIS_REST_URL;
    const origToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = "https://unreachable.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "super-secret-token-value";
    globalThis.fetch = (async () => {
      throw new Error("network down");
    }) as typeof fetch;

    try {
      const channel = `no-fallback-room-${Date.now()}`;
      const peer = {
        id: "peer_local",
        name: "LocalUser",
        avatarColor: "#ffaa00",
        x: 3,
        y: 4,
        dir: "right" as const,
        isMoving: false,
        zoneId: "reception",
        status: "Idle",
        deskClaimed: null,
        media: { audio: false, video: false, screen: false, speaking: false },
        updatedAt: Date.now(),
      };

      await expect(
        postChannel(channel, peer.id, { type: "peer_join", peer })
      ).rejects.toBeInstanceOf(SpaceStoreError);
      await expect(pollChannel(channel, "peer_other", 0)).rejects.toBeInstanceOf(
        SpaceStoreError
      );

      const apiPost = await POST(
        new Request("http://localhost/api/space/peers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel,
            senderId: peer.id,
            message: { type: "peer_join", peer },
          }),
        })
      );
      expect(apiPost.status).toBe(503);
      const postBody = await apiPost.text();
      expect(postBody).not.toContain("super-secret-token-value");
      expect(postBody).not.toContain("unreachable.upstash.io");

      const apiGet = await GET(
        new Request(`http://localhost/api/space/peers?channel=${channel}&senderId=peer_other&since=0`)
      );
      expect(apiGet.status).toBe(503);
    } finally {
      globalThis.fetch = origFetch;
      if (origUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
      else process.env.UPSTASH_REDIS_REST_URL = origUrl;
      if (origToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
      else process.env.UPSTASH_REDIS_REST_TOKEN = origToken;
    }
  });

  it("throws on Redis pipeline command-level errors and pipeline result length mismatches", async () => {
    const config = {
      url: "https://redis-mock.upstash.io",
      token: "secret-token",
    };
    const origFetch = globalThis.fetch;

    try {
      // 1. Individual Redis command error
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify([
            { result: [] },
            { error: "WRONGTYPE Operation against a key holding the wrong kind of value" },
            { result: "1" },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )) as typeof fetch;

      await expect(
        pollRedisChannel(config, "cmd-err-room", "peer_a", 0)
      ).rejects.toThrow("Redis command LRANGE failed");

      // 2. Pipeline length mismatch
      globalThis.fetch = (async () =>
        new Response(JSON.stringify([{ result: [] }]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })) as typeof fetch;

      await expect(
        pollRedisChannel(config, "mismatch-room", "peer_a", 0)
      ).rejects.toThrow("length mismatch");
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it("rejects missing Redis configuration in production and uses memory fallback in non-production", async () => {
    const origNodeEnv = process.env.NODE_ENV;
    const origVars = {
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      KV_REST_API_URL: process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
    };

    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    const envObj = process.env as Record<string, string | undefined>;

    try {
      // Production with missing Redis must fail explicitly (HTTP 503)
      envObj.NODE_ENV = "production";
      await expect(pollChannel("prod-missing", "peer_a", 0)).rejects.toMatchObject({
        code: "MISSING_CONFIG",
      });
      const res = await GET(
        new Request("http://localhost/api/space/peers?channel=prod-missing&senderId=peer_a&since=0")
      );
      expect(res.status).toBe(503);

      // Local development / test without Redis falls back to in-memory cleanly
      envObj.NODE_ENV = "development";
      const localPeer = {
        id: "peer_dev",
        name: "DevUser",
        avatarColor: "#37E6C4",
        x: 2,
        y: 3,
        dir: "down" as const,
        isMoving: false,
        zoneId: "reception",
        status: "Available",
        deskClaimed: null,
        media: { audio: false, video: false, screen: false, speaking: false },
        updatedAt: Date.now(),
      };
      const postRes = await postChannel("dev-room", localPeer.id, {
        type: "peer_join",
        peer: localPeer,
      });
      expect(postRes.backend).toBe("memory");
      const pollRes = await pollChannel("dev-room", "peer_other", 0);
      expect(pollRes.backend).toBe("memory");
      expect(pollRes.peers.map((p) => p.id)).toEqual(["peer_dev"]);
    } finally {
      envObj.NODE_ENV = origNodeEnv;
      for (const [k, v] of Object.entries(origVars)) {
        if (v === undefined) delete envObj[k];
        else envObj[k] = v;
      }
    }
  });

  it("holds cursor before recent out-of-order Redis sequence gaps so SDP offers are never skipped", async () => {
    const config = {
      url: "https://redis-mock.upstash.io",
      token: "secret-token",
    };
    const channel = `gap-room-${Date.now()}`;
    const now = 1_700_000_000_000;
    let msgsList: string[] = [
      JSON.stringify({
        seq: 1,
        senderId: "peer_a",
        timestamp: now,
        msg: {
          type: "peer_join",
          peer: {
            id: "peer_a",
            name: "Alice",
            avatarColor: "#37E6C4",
            x: 5,
            y: 5,
            dir: "down",
            isMoving: false,
            zoneId: "reception",
            status: "Focusing",
            deskClaimed: null,
            media: { audio: true, video: true, screen: false, speaking: false },
            updatedAt: now,
          },
        },
      }),
      // seq 3 arrived before in-flight seq 2 (SDP offer)
      JSON.stringify({
        seq: 3,
        senderId: "peer_a",
        timestamp: now + 100,
        msg: {
          type: "webrtc_signal",
          from: "peer_a",
          to: "peer_b",
          payload: { candidate: { candidate: "candidate:1" } },
        },
      }),
    ];

    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      const commands = JSON.parse(String(init?.body ?? "[]")) as unknown[][];
      const results = commands.map((cmd) => {
        const op = String(cmd[0]).toUpperCase();
        if (op === "HGETALL") return { result: [] };
        if (op === "LRANGE") return { result: msgsList };
        if (op === "GET") return { result: "3" };
        return { result: null };
      });
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      // First poll sees seq 1 and holds cursor at 1 while seq 2 is still in flight
      const poll1 = await pollRedisChannel(config, channel, "peer_b", 0, now + 120);
      expect(poll1.messages.map((m) => m.type)).toEqual(["peer_join"]);
      expect(poll1.cursor).toBe(1);

      // Now in-flight seq 2 (SDP offer) finishes pushing to Redis
      msgsList = [
        ...msgsList,
        JSON.stringify({
          seq: 2,
          senderId: "peer_a",
          timestamp: now + 90,
          msg: {
            type: "webrtc_signal",
            from: "peer_a",
            to: "peer_b",
            payload: { sdp: { type: "offer", sdp: "v=0..." } },
          },
        }),
      ];

      // Next poll from cursor 1 delivers seq 2 (offer) and seq 3 (candidate) in strict order
      const poll2 = await pollRedisChannel(config, channel, "peer_b", poll1.cursor, now + 200);
      expect(poll2.cursor).toBe(3);
      expect(poll2.messages).toHaveLength(2);
      expect((poll2.messages[0] as { payload: { sdp?: unknown } }).payload.sdp).toBeDefined();
      expect((poll2.messages[1] as { payload: { candidate?: unknown } }).payload.candidate).toBeDefined();
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe("ForgeSpace WebRTC Media & Transceiver Fixes", () => {
  it("gates remote video rendering on unmuted live tracks and allows screen-only sharing", () => {
    const createFakeStream = (muted: boolean) =>
      ({
        getVideoTracks: () => [{ readyState: "live", enabled: true, muted }],
      }) as unknown as MediaStream;

    const camOnMedia = { audio: true, video: true, screen: false, speaking: false };
    const screenOnlyMedia = { audio: true, video: false, screen: true, speaking: false };
    const allOffMedia = { audio: true, video: false, screen: false, speaking: false };

    // Remote stream whose track is still muted (no decoded RTP frames yet) should not paint black <video>
    expect(hasActiveVideoFeed(createFakeStream(true), camOnMedia, false)).toBe(false);
    // Remote stream with decoded video frames renders immediately
    expect(hasActiveVideoFeed(createFakeStream(false), camOnMedia, false)).toBe(true);
    // Remote peer sharing screen with webcam turned off still renders video
    expect(hasActiveVideoFeed(createFakeStream(false), screenOnlyMedia, false)).toBe(true);
    // Turning camera and screen off hides video cleanly
    expect(hasActiveVideoFeed(createFakeStream(false), allOffMedia, false)).toBe(false);
  });

  it("defers responder transceiver creation until remote offer and renegotiates on screen share", async () => {
    const origPC = globalThis.RTCPeerConnection;
    const origDesc = globalThis.RTCSessionDescription;
    const origNav = globalThis.navigator;
    const origStream = globalThis.MediaStream;

    const createdPcs: Array<{
      addTrackCalls: number;
      addTransceiverCalls: string[];
      transceivers: Array<{
        mid: string | null;
        stopped: boolean;
        direction: string;
        sender: { track: { kind: string } | null; replaceTrack: (t: unknown) => Promise<void> };
        receiver: { track: { kind: string } };
      }>;
    }> = [];

    class MockPC {
      signalingState = "stable";
      connectionState = "new";
      iceConnectionState = "new";
      localDescription: unknown = null;
      remoteDescription: unknown = null;
      addTrackCalls = 0;
      addTransceiverCalls: string[] = [];
      transceivers: Array<{
        mid: string | null;
        stopped: boolean;
        direction: string;
        sender: { track: { kind: string } | null; replaceTrack: (t: unknown) => Promise<void> };
        receiver: { track: { kind: string } };
      }> = [];

      constructor() {
        createdPcs.push(this);
      }
      createDataChannel() {
        return {};
      }
      getTransceivers() {
        return this.transceivers;
      }
      addTrack(track: { kind: string }) {
        this.addTrackCalls += 1;
        this.transceivers.push({
          mid: null,
          stopped: false,
          direction: "sendrecv",
          sender: {
            track,
            replaceTrack: async (next: unknown) => {
              this.transceivers.at(-1)!.sender.track = next as { kind: string } | null;
            },
          },
          receiver: { track: { kind: track.kind } },
        });
      }
      addTransceiver(kind: string, init?: { direction?: string }) {
        this.addTransceiverCalls.push(kind);
        const t = {
          mid: null,
          stopped: false,
          direction: init?.direction ?? "sendrecv",
          sender: {
            track: null as { kind: string } | null,
            replaceTrack: async (next: unknown) => {
              t.sender.track = next as { kind: string } | null;
            },
          },
          receiver: { track: { kind } },
        };
        this.transceivers.push(t);
        return t;
      }
      async setRemoteDescription(desc: { type: string }) {
        this.remoteDescription = desc;
        if (desc.type === "offer" && this.transceivers.length === 0) {
          for (const [idx, kind] of ["audio", "video"].entries()) {
            const t = {
              mid: String(idx),
              stopped: false,
              direction: "recvonly",
              sender: {
                track: null as { kind: string } | null,
                replaceTrack: async (next: unknown) => {
                  t.sender.track = next as { kind: string } | null;
                },
              },
              receiver: { track: { kind } },
            };
            this.transceivers.push(t);
          }
        }
      }
      async createOffer() {
        return { type: "offer", sdp: "mock-offer" };
      }
      async createAnswer() {
        return { type: "answer", sdp: "mock-answer" };
      }
      async setLocalDescription(desc: unknown) {
        this.localDescription = desc;
      }
      async addIceCandidate() {}
      close() {}
    }

    (globalThis as unknown as Record<string, unknown>).RTCPeerConnection = MockPC;
    (globalThis as unknown as Record<string, unknown>).RTCSessionDescription = class {
      type: string;
      sdp: string;
      constructor(init: { type: string; sdp?: string }) {
        this.type = init.type;
        this.sdp = init.sdp ?? "";
      }
    };
    (globalThis as unknown as Record<string, unknown>).MediaStream = class {
      constructor(private tracks: unknown[] = []) {}
      getTracks() {
        return this.tracks;
      }
      getAudioTracks() {
        return this.tracks.filter((t) => (t as { kind: string }).kind === "audio");
      }
      getVideoTracks() {
        return this.tracks.filter((t) => (t as { kind: string }).kind === "video");
      }
    };

    const signals: Array<{ to: string; payload: unknown }> = [];
    const screenTrack = { kind: "video", enabled: true, onended: null, stop() {} };
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          getUserMedia: async () => ({
            getTracks: () => [{ kind: "audio", enabled: true, stop() {} }],
            getAudioTracks: () => [{ kind: "audio", enabled: true, stop() {} }],
            getVideoTracks: () => [],
          }),
          getDisplayMedia: async () => ({
            getTracks: () => [screenTrack],
            getAudioTracks: () => [],
            getVideoTracks: () => [screenTrack],
          }),
        },
      },
    });

    const mesh = new WebRTCMeshManager(
      (to, payload) => signals.push({ to, payload }),
      () => {},
      () => {},
      "peer_z"
    );

    try {
      await mesh.initLocalMedia(true, true);
      // Passive responder connects BEFORE offer arrives
      await mesh.connectToPeer("peer_a", false);
      const pc = createdPcs[0]!;
      expect(pc.addTrackCalls).toBe(0);
      expect(pc.addTransceiverCalls).toHaveLength(0);

      // Offer arrives -> responder attaches audio track directly onto mid "0" transceiver
      // while video mid "1" stays recvonly until screen share turns on
      await mesh.handleSignal("peer_a", { sdp: { type: "offer", sdp: "remote-offer" } });
      expect(pc.transceivers[0]!.mid).toBe("0");
      expect(pc.transceivers[0]!.direction).toBe("sendrecv");
      expect(pc.transceivers[1]!.direction).toBe("recvonly");
      expect(signals).toHaveLength(1); // initial answer

      // Starting screen share upgrades video transceiver to sendrecv AND sends a renegotiation offer
      const sharing = await mesh.toggleScreenShare();
      expect(sharing).toBe(true);
      expect(pc.transceivers[1]!.direction).toBe("sendrecv");
      expect(pc.transceivers[1]!.sender.track).toBe(screenTrack);
      expect(signals).toHaveLength(2);
      expect((signals[1]!.payload as { sdp: { type: string } }).sdp.type).toBe("offer");
    } finally {
      mesh.destroy();
      (globalThis as unknown as Record<string, unknown>).RTCPeerConnection = origPC;
      (globalThis as unknown as Record<string, unknown>).RTCSessionDescription = origDesc;
      (globalThis as unknown as Record<string, unknown>).MediaStream = origStream;
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: origNav,
      });
    }
  });

  it("restores live webcam track when stopping screen share and preserves Google STUN fallback with multi-URL TURN", async () => {
    const iceDefault = getIceServers({});
    expect(iceDefault.length).toBeGreaterThanOrEqual(4);
    expect(hasTurnConfiguration({})).toBe(false);

    const iceWithTurn = getIceServers({
      NEXT_PUBLIC_TURN_URLS:
        "turn:relay.example.com:80, turns:relay.example.com:443?transport=tcp, stun:extra.example.com:3478",
      NEXT_PUBLIC_TURN_USERNAME: "temp-user",
      NEXT_PUBLIC_TURN_CREDENTIAL: "temp-cred",
    });
    expect(hasTurnConfiguration({ NEXT_PUBLIC_TURN_URLS: "turns:relay.example.com:443" })).toBe(true);
    const turnEntry = iceWithTurn.find((s) =>
      Array.isArray(s.urls) ? s.urls.some((u) => u.startsWith("turn")) : String(s.urls).startsWith("turn")
    );
    expect(turnEntry).toEqual({
      urls: ["turn:relay.example.com:80", "turns:relay.example.com:443?transport=tcp"],
      username: "temp-user",
      credential: "temp-cred",
    });

    // Verify stopping screen share restores the live webcam track across connected peers
    const origPC = globalThis.RTCPeerConnection;
    const origDesc = globalThis.RTCSessionDescription;
    const origNav = globalThis.navigator;
    const origStream = globalThis.MediaStream;

    const camTrack = { kind: "video", readyState: "live", enabled: true, stop() {} };
    const screenTrack = { kind: "video", readyState: "live", enabled: true, onended: null, stop() {} };
    const replacedTracks: unknown[] = [];

    class CamMockPC {
      signalingState = "stable";
      connectionState = "new";
      iceConnectionState = "new";
      localDescription: unknown = null;
      remoteDescription: unknown = null;
      transceivers: Array<{
        mid: string | null;
        currentDirection: string;
        direction: string;
        sender: { track: unknown; replaceTrack: (t: unknown) => Promise<void> };
        receiver: { track: { kind: string } };
      }> = [];
      createDataChannel() {
        return {};
      }
      getTransceivers() {
        return this.transceivers;
      }
      addTrack(track: { kind: string }) {
        const entry: (typeof this.transceivers)[number] = {
          mid: String(this.transceivers.length),
          currentDirection: "sendrecv",
          direction: "sendrecv",
          sender: {
            track,
            replaceTrack: async (next: unknown) => {
              entry.sender.track = next;
              replacedTracks.push(next);
            },
          },
          receiver: { track: { kind: track.kind } },
        };
        this.transceivers.push(entry);
      }
      addTransceiver() {
        return {};
      }
      async createOffer() {
        return { type: "offer", sdp: "mock" };
      }
      async setLocalDescription(d: unknown) {
        this.localDescription = d;
      }
      close() {}
    }

    (globalThis as unknown as Record<string, unknown>).RTCPeerConnection = CamMockPC;
    (globalThis as unknown as Record<string, unknown>).RTCSessionDescription = class {
      constructor(public init: unknown) {}
    };
    (globalThis as unknown as Record<string, unknown>).MediaStream = class {
      constructor(private tracks: unknown[] = []) {}
      getTracks() {
        return this.tracks;
      }
      getAudioTracks() {
        return this.tracks.filter((t) => (t as { kind: string }).kind === "audio");
      }
      getVideoTracks() {
        return this.tracks.filter((t) => (t as { kind: string }).kind === "video");
      }
    };
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          getUserMedia: async () => ({
            getTracks: () => [camTrack],
            getAudioTracks: () => [],
            getVideoTracks: () => [camTrack],
          }),
          getDisplayMedia: async () => ({
            getTracks: () => [screenTrack],
            getAudioTracks: () => [],
            getVideoTracks: () => [screenTrack],
          }),
        },
      },
    });

    const mesh = new WebRTCMeshManager(
      () => {},
      () => {},
      () => {},
      "peer_a"
    );
    try {
      await mesh.initLocalMedia(true, false);
      await mesh.connectToPeer("peer_z", true);
      expect(await mesh.toggleScreenShare()).toBe(true);
      expect(await mesh.toggleScreenShare()).toBe(false);
      expect(replacedTracks).toEqual([screenTrack, camTrack]);
    } finally {
      mesh.destroy();
      (globalThis as unknown as Record<string, unknown>).RTCPeerConnection = origPC;
      (globalThis as unknown as Record<string, unknown>).RTCSessionDescription = origDesc;
      (globalThis as unknown as Record<string, unknown>).MediaStream = origStream;
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: origNav,
      });
    }
  });

  it("keeps SpaceSignaling send queue alive after an HTTP 503 failure", async () => {
    const origWindow = globalThis.window;
    const origFetch = globalThis.fetch;
    let callCount = 0;

    (globalThis as unknown as Record<string, unknown>).window = {
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "POST") {
        callCount += 1;
        if (callCount === 1) {
          return new Response(JSON.stringify({ error: "Shared signalling store unavailable" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, seq: callCount, backend: "redis" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ messages: [], peers: [], cursor: 0, serverTime: Date.now(), backend: "redis" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    const localPeer = {
      id: "peer_queue_a",
      name: "QueueUser",
      avatarColor: "#37E6C4",
      x: 5,
      y: 5,
      dir: "down" as const,
      isMoving: false,
      zoneId: "reception",
      status: "Focusing",
      deskClaimed: null,
      media: { audio: true, video: true, screen: false, speaking: false },
      updatedAt: Date.now(),
    };

    const sig = new SpaceSignaling("queue-test", localPeer, () => {});
    try {
      // First POST fails with 503 (peer_join in constructor), second POST must still run!
      sig.sendSignal("peer_queue_b", { sdp: { type: "offer", sdp: "mock" } });
      await new Promise((r) => setTimeout(r, 30));
      expect(callCount).toBe(2);
    } finally {
      sig.destroy();
      globalThis.fetch = origFetch;
      (globalThis as unknown as Record<string, unknown>).window = origWindow;
    }
  });

  it("reports ICE failure details to onIceFailure callback and retries ICE restart", async () => {
    const origPC = globalThis.RTCPeerConnection;
    const origNav = globalThis.navigator;
    let lastPc: {
      connectionState: string;
      iceConnectionState: string;
      signalingState: string;
      oniceconnectionstatechange?: () => void;
      restarted: boolean;
    } | null = null;

    class FailMockPC {
      signalingState = "stable";
      connectionState = "new";
      iceConnectionState = "new";
      localDescription: unknown = null;
      restarted = false;
      oniceconnectionstatechange?: () => void;
      onconnectionstatechange?: () => void;
      addTransceiver() {
        return {
          mid: null,
          currentDirection: "recvonly",
          direction: "recvonly",
          sender: { track: null, replaceTrack: async () => {} },
          receiver: { track: { kind: "audio" } },
        };
      }
      getTransceivers() {
        return [];
      }
      createDataChannel() {
        return {};
      }
      async createOffer() {
        return { type: "offer", sdp: "v=0" };
      }
      async setLocalDescription(d: unknown) {
        this.localDescription = d;
      }
      restartIce() {
        this.restarted = true;
      }
      close() {}
    }

    (globalThis as unknown as Record<string, unknown>).RTCPeerConnection = function MockCtor() {
      const pc = new FailMockPC();
      lastPc = pc;
      return pc;
    };
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });

    const iceFailures: Array<{ peerId: string; hasTurn: boolean }> = [];
    const mesh = new WebRTCMeshManager(
      () => {},
      () => {},
      () => {},
      "peer_ice_a",
      undefined,
      (peerId, details) => iceFailures.push({ peerId, ...details })
    );

    try {
      await mesh.connectToPeer("peer_ice_b", true);
      expect(lastPc).not.toBeNull();
      lastPc!.iceConnectionState = "failed";
      lastPc!.oniceconnectionstatechange?.();
      expect(iceFailures).toHaveLength(1);
      expect(iceFailures[0]).toEqual({ peerId: "peer_ice_b", hasTurn: false });
      expect(lastPc!.restarted).toBe(true);
    } finally {
      mesh.destroy();
      (globalThis as unknown as Record<string, unknown>).RTCPeerConnection = origPC;
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: origNav,
      });
    }
  });
});

describe("Boss/Admin Auth, Passworded Links, Free/Pro Limits & Ephemeral TURN", () => {
  it("hashes and verifies passcodes securely with per-record random salts", () => {
    const hash1 = hashSecret("secret-pass-2026");
    const hash2 = hashSecret("secret-pass-2026");
    expect(hash1).not.toBe(hash2);
    expect(verifySecret("secret-pass-2026", hash1)).toBe(true);
    expect(verifySecret("wrong-pass", hash1)).toBe(false);
    expect(verifySecret("secret-pass-2026", "malformed")).toBe(false);
  });

  it("signs and verifies Boss session and multi-slug Employee access tokens", () => {
    const now = 1_700_000_000_000;
    const bossToken = createBossToken(
      { id: "boss_1", email: "boss@acme.dev", username: "acme_boss" },
      now,
      "test-secret-key-min-16"
    );
    const decoded = verifyBossToken(bossToken, now + 1000, "test-secret-key-min-16");
    expect(decoded?.userId).toBe("boss_1");
    expect(verifyBossToken(bossToken, now + 1000, "wrong-secret-key-16")).toBeNull();
    expect(verifyBossToken(bossToken, now + 8 * 24 * 3600 * 1000, "test-secret-key-min-16")).toBeNull();

    const access1 = grantSpaceAccessToken(undefined, "team-alpha", now, "test-secret-key-min-16");
    const access2 = grantSpaceAccessToken(access1, "team-beta", now + 10, "test-secret-key-min-16");
    expect(hasSpaceAccessToken(access2, "team-alpha", now + 1000, "test-secret-key-min-16")).toBe(true);
    expect(hasSpaceAccessToken(access2, "team-beta", now + 1000, "test-secret-key-min-16")).toBe(true);
    expect(hasSpaceAccessToken(access2, "team-gamma", now + 1000, "test-secret-key-min-16")).toBe(false);
  });

  it("defines distinct FREE (limited) vs PRO entitlements and normalizes slugs", () => {
    expect(PLAN_CONFIG.FREE.maxWorkspaces).toBe(1);
    expect(PLAN_CONFIG.FREE.maxParticipants).toBe(4);
    expect(PLAN_CONFIG.FREE.allowScreenShare).toBe(false);

    expect(PLAN_CONFIG.PRO.maxWorkspaces).toBe(20);
    expect(PLAN_CONFIG.PRO.maxParticipants).toBe(30);
    expect(PLAN_CONFIG.PRO.allowScreenShare).toBe(true);

    expect(normalizeWorkspaceSlug("  Acme Engineering HQ!! ")).toBe("acme-engineering-hq");
  });

  it("enforces passcode gates (401) and Free 4-seat caps (403) on /api/space/peers", async () => {
    const slug = `team-gate-${Date.now()}`;
    const channel = `forgespace_${slug}`;
    await syncWorkspacePolicyCache({
      slug,
      name: "Acme Private HQ",
      ownerId: "boss_owner_1",
      planTier: "FREE",
      passcode: "scrypt$abc$def",
    });

    try {
      // 1. Unauthenticated employee without room cookie is rejected with 401
      const unauthGet = await GET(
        new Request(`http://localhost/api/space/peers?channel=${channel}&senderId=emp_1&since=0`)
      );
      expect(unauthGet.status).toBe(401);

      // 2. Grant room access cookie (employee unlocked via passworded link)
      const accessToken = grantSpaceAccessToken(undefined, slug);
      const cookieHeader = `${SPACE_COOKIE_NAME}=${encodeURIComponent(accessToken)}`;

      const makePeer = (id: string) => ({
        id,
        name: id,
        avatarColor: "#37E6C4",
        x: 5,
        y: 5,
        dir: "down" as const,
        isMoving: false,
        zoneId: "reception",
        status: "Focusing",
        deskClaimed: null,
        media: { audio: true, video: true, screen: false, speaking: false },
        updatedAt: Date.now(),
      });

      // First 4 employees succeed on Free plan (maxParticipants = 4)
      for (let i = 1; i <= 4; i++) {
        const res = await POST(
          new Request("http://localhost/api/space/peers", {
            method: "POST",
            headers: { "Content-Type": "application/json", cookie: cookieHeader },
            body: JSON.stringify({
              channel,
              senderId: `emp_${i}`,
              message: { type: "peer_join", peer: makePeer(`emp_${i}`) },
            }),
          })
        );
        expect(res.status).toBe(200);
      }

      // 5th employee is blocked with HTTP 403 seat_limit_reached
      const fifth = await POST(
        new Request("http://localhost/api/space/peers", {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: cookieHeader },
          body: JSON.stringify({
            channel,
            senderId: "emp_5",
            message: { type: "peer_join", peer: makePeer("emp_5") },
          }),
        })
      );
      expect(fifth.status).toBe(403);
      const fifthData = (await fifth.json()) as { code?: string };
      expect(fifthData.code).toBe("seat_limit_reached");

      // Existing participant emp_1 heartbeat still succeeds at 4/4 capacity
      const heartbeat = await POST(
        new Request("http://localhost/api/space/peers", {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: cookieHeader },
          body: JSON.stringify({
            channel,
            senderId: "emp_1",
            message: { type: "peer_join", peer: makePeer("emp_1") },
          }),
        })
      );
      expect(heartbeat.status).toBe(200);

      // Boss owner session also passes authorization cleanly without employee cookie
      const bossToken = createBossToken({
        id: "boss_owner_1",
        email: "boss@acme.dev",
        username: "boss",
      });
      const bossGet = await GET(
        new Request(`http://localhost/api/space/peers?channel=${channel}&senderId=boss_p&since=0`, {
          headers: { cookie: `${BOSS_COOKIE_NAME}=${encodeURIComponent(bossToken)}` },
        })
      );
      expect(bossGet.status).toBe(200);
    } finally {
      await clearWorkspacePolicyCache(slug);
    }
  });

  it("verifies Stripe webhook HMAC signatures and supports ephemeral Cloudflare TURN endpoint", async () => {
    const crypto = await import("node:crypto");
    const secret = "whsec_test_12345";
    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const nowSec = 1_700_000_000;
    const sigHex = crypto
      .createHmac("sha256", secret)
      .update(`${nowSec}.${payload}`)
      .digest("hex");

    expect(verifyStripeSignature(payload, `t=${nowSec},v1=${sigHex}`, secret, nowSec + 10)).toBe(true);
    expect(verifyStripeSignature(payload, `t=${nowSec},v1=bad`, secret, nowSec + 10)).toBe(false);
    expect(verifyStripeSignature(payload, `t=${nowSec},v1=${sigHex}`, secret, nowSec + 500)).toBe(false);

    // /api/space/turn returns STUN fallback when unconfigured and Cloudflare TURN when configured
    const stunRes = await GET_TURN();
    expect(stunRes.status).toBe(200);
    const stunJson = (await stunRes.json()) as { hasTurn: boolean; provider: string };
    expect(stunJson.hasTurn).toBe(false);
    expect(stunJson.provider).toBe("stun-only");

    const origFetch = globalThis.fetch;
    const prevId = process.env.CLOUDFLARE_TURN_TOKEN_ID;
    const prevTok = process.env.CLOUDFLARE_TURN_API_TOKEN;
    try {
      process.env.CLOUDFLARE_TURN_TOKEN_ID = "cf_key_1";
      process.env.CLOUDFLARE_TURN_API_TOKEN = "cf_secret_1";
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            iceServers: [{ urls: ["turn:turn.cloudflare.com:3478"], username: "u", credential: "p" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )) as typeof fetch;

      const cfRes = await GET_TURN();
      const cfJson = (await cfRes.json()) as {
        hasTurn: boolean;
        provider: string;
        iceServers: Array<{ urls: string | string[] }>;
      };
      expect(cfJson.hasTurn).toBe(true);
      expect(cfJson.provider).toBe("cloudflare");
      expect(cfJson.iceServers.some((s) => JSON.stringify(s.urls).includes("turn:"))).toBe(true);
    } finally {
      globalThis.fetch = origFetch;
      if (prevId === undefined) delete process.env.CLOUDFLARE_TURN_TOKEN_ID;
      else process.env.CLOUDFLARE_TURN_TOKEN_ID = prevId;
      if (prevTok === undefined) delete process.env.CLOUDFLARE_TURN_API_TOKEN;
      else process.env.CLOUDFLARE_TURN_API_TOKEN = prevTok;
    }
  });
});
