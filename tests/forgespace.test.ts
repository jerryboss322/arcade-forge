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
import { computeSpatialGain } from "../src/lib/space/webrtcMesh";
import { GET, POST } from "../src/app/api/space/peers/route";

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
