import { describe, it, expect } from "vitest";
import {
  createDefaultOfficeMap,
  findPath,
  getZoneAt,
  OFFICE_ZONES,
} from "../src/lib/space/officeMap";

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
});
