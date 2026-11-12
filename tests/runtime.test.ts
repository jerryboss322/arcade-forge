import { describe, it, expect } from "vitest";
import { ForgeDeterministicRuntime, floodFill16x16, createMulberry32, type InputState } from "../src/lib/runtime/engine";
import { checkPublishReadiness, migrateToLatestSchema } from "../src/lib/runtime/schema";
import { OFFICIAL_TEMPLATES, buildCoinRushTemplate } from "../src/lib/templates";
import { computeTrendScore, computeJamBayesianScore, validateHtml5BundleEntries } from "../src/lib/discovery/algorithms";

function scriptedInputs(n: number, seed = 7): InputState[] {
  const rng = createMulberry32(seed);
  const out: InputState[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ up: rng() < 0.3, down: rng() < 0.3, left: rng() < 0.3, right: rng() < 0.4, action: rng() < 0.1 });
  }
  return out;
}

function snapshot(rt: ForgeDeterministicRuntime) {
  return JSON.stringify({
    tick: rt.tickCount,
    status: rt.status,
    room: rt.currentRoomId,
    vars: rt.variables,
    hp: rt.playerHealth,
    ents: rt.getCurrentEntities().map((e) => [e.id, e.px.toFixed(4), e.py.toFixed(4), e.collected]),
    proj: rt.projectiles.length,
  });
}

describe("runtime determinism", () => {
  for (const tpl of OFFICIAL_TEMPLATES) {
    it(`replays identically: ${tpl.name}`, () => {
      const inputs = scriptedInputs(1800);
      const a = new ForgeDeterministicRuntime(tpl.build());
      const b = new ForgeDeterministicRuntime(tpl.build());
      for (const inp of inputs) {
        a.step(inp);
        b.step(inp);
      }
      expect(snapshot(a)).toEqual(snapshot(b));
    });
  }
});

describe("templates", () => {
  it("all 5 templates pass blocking publish checks", () => {
    for (const tpl of OFFICIAL_TEMPLATES) {
      const res = checkPublishReadiness(tpl.build());
      expect(res.blockingErrors, tpl.name).toEqual([]);
    }
  });

  it("coin rush is winnable by collecting all coins (rule fires next frame)", () => {
    const doc = buildCoinRushTemplate();
    // Remove enemies so we can teleport-collect safely
    doc.rooms[0]!.entities = doc.rooms[0]!.entities.filter((e) => e.type !== "enemy");
    const rt = new ForgeDeterministicRuntime(doc);
    const player = rt.getPlayerEntity()!;
    const idle: InputState = { up: false, down: false, left: false, right: false, action: false };
    for (const coin of rt.getCurrentEntities().filter((e) => e.type === "coin")) {
      player.px = coin.px;
      player.py = coin.py;
      rt.step(idle);
    }
    for (let i = 0; i < 5; i++) rt.step(idle);
    expect(rt.status).toBe("won");
  });
});

describe("schema", () => {
  it("rejects a game with no player", () => {
    const doc = buildCoinRushTemplate();
    doc.rooms[0]!.entities = doc.rooms[0]!.entities.filter((e) => e.type !== "player");
    expect(checkPublishReadiness(doc).valid).toBe(false);
  });

  it("flags unreachable items behind walls", () => {
    const doc = buildCoinRushTemplate();
    const room = doc.rooms[0]!;
    // Wall in the coin at (3,2)
    for (const [x, y] of [[2, 2], [4, 2], [3, 1], [3, 3]] as const) room.walls[y * 20 + x] = "wall_stone";
    const res = checkPublishReadiness(doc);
    expect(res.unreachableCoords.some((u) => u.x === 3 && u.y === 2)).toBe(true);
  });

  it("migrates v1.0.0 to v1.1.0 with transparent palette[0] and rules", () => {
    const migrated = migrateToLatestSchema({
      schemaVersion: "1.0.0",
      title: "Old",
      assets: { palette: ["#000", "#111", "#222"], sprites: {} },
      entities: [],
      rules: { winCondition: "collect_all_coins" },
    });
    expect(migrated.schemaVersion).toBe("1.1.0");
    expect(migrated.palette[0]).toBe("transparent");
    expect(migrated.rules[0]?.trigger.kind).toBe("allCollected");
  });
});

describe("flood fill", () => {
  it("fills a full 16x16 canvas iteratively", () => {
    const filled = floodFill16x16(new Array(256).fill(0), 5, 5, 8);
    expect(filled.every((p) => p === 8)).toBe(true);
  });
});

describe("discovery & jams", () => {
  it("decays engagement with a 36h half-life", () => {
    const fresh = computeTrendScore([{ ageHours: 0, uniquePlays: 10, completions: 0, likes: 0, remixes: 0 }], 10, 0);
    const old = computeTrendScore([{ ageHours: 36, uniquePlays: 10, completions: 0, likes: 0, remixes: 0 }], 10, 0);
    expect(old).toBeCloseTo(fresh / 2, 1);
  });

  it("a single 5-star rating does not beat 30 ratings averaging 4.5", () => {
    const one = computeJamBayesianScore([{ fun: 5, creativity: 5, theme: 5 }], 3.8);
    const many = computeJamBayesianScore(
      Array.from({ length: 30 }, (_, i) => (i % 2 ? { fun: 5, creativity: 5, theme: 5 } : { fun: 4, creativity: 4, theme: 4 })),
      3.8
    );
    expect(many.adjustedScore).toBeGreaterThan(one.adjustedScore);
    expect(one.isRanked).toBe(false);
  });

  it("validates upload bundles", () => {
    expect(validateHtml5BundleEntries(["index.html", "game.js"], 1000).valid).toBe(true);
    expect(validateHtml5BundleEntries(["src/index.html"], 1000).errors[0]).toMatch(/root/);
    expect(validateHtml5BundleEntries(["index.html", "run.sh"], 1000).valid).toBe(false);
    expect(validateHtml5BundleEntries(["index.html"], 11 * 1024 * 1024).valid).toBe(false);
  });
});
