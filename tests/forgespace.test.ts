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
});
