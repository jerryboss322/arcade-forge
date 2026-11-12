// The 5 Official Forge Studio Starter Templates + Pixel Art Sprite Library
import {
  type ForgeGameSchemaV1_1,
  type SpriteData,
  PALETTE_PRESETS,
  DEFAULT_SOUNDS,
} from "../runtime/schema";

/**
 * Helper to convert a 16-row ASCII string map into a 256-integer (16x16) palette index array.
 * '.' = 0 (transparent), '1'..'9' = 1..9, 'A'..'F' = 10..15.
 */
function asciiToPixels(rows: string[]): number[] {
  const out = new Array(256).fill(0);
  for (let r = 0; r < 16; r++) {
    const line = rows[r] || "";
    for (let c = 0; c < 16; c++) {
      const ch = line[c] || ".";
      if (ch === "." || ch === " ") {
        out[r * 16 + c] = 0;
      } else {
        const val = parseInt(ch, 16);
        out[r * 16 + c] = Number.isNaN(val) ? 0 : val;
      }
    }
  }
  return out;
}

export const STARTER_SPRITES: Record<string, SpriteData> = {
  knight: {
    id: "knight",
    name: "Hero Knight",
    fps: 4,
    frames: [
      asciiToPixels([
        "....CCCCCCCC....",
        "...CCCCCCCCCC...",
        "...C77777777C...",
        "...C71777717C...",
        "...C777FF777C...",
        "....CCCCCCCC....",
        "...88CCCCCC88...",
        "..88CCCCCCCC88..",
        "..88CC7777CC88..",
        "..88CCCCCCCC88..",
        "....CCCCCCCC....",
        "....CC....CC....",
        "....CC....CC....",
        "...666....666...",
        "...555....555...",
        "................",
      ]),
      asciiToPixels([
        "................",
        "....CCCCCCCC....",
        "...CCCCCCCCCC...",
        "...C77777777C...",
        "...C71777717C...",
        "...C777FF777C...",
        "....CCCCCCCC....",
        "...88CCCCCC88...",
        "..88CCCCCCCC88..",
        "..88CC7777CC88..",
        "....CCCCCCCC....",
        "...CC......CC...",
        "...66......66...",
        "..555......555..",
        "................",
        "................",
      ]),
    ],
  },
  wall_stone: {
    id: "wall_stone",
    name: "Stone Brick Wall",
    fps: 1,
    frames: [
      asciiToPixels([
        "5555555155555551",
        "5666665156666651",
        "5655555156555551",
        "1111111111111111",
        "5551555555515555",
        "5651566666515666",
        "5551565555515655",
        "1111111111111111",
        "5555555155555551",
        "5666665156666651",
        "5655555156555551",
        "1111111111111111",
        "5551555555515555",
        "5651566666515666",
        "5551565555515655",
        "1111111111111111",
      ]),
    ],
  },
  floor_tile: {
    id: "floor_tile",
    name: "Dungeon Floor",
    fps: 1,
    frames: [
      asciiToPixels([
        "................",
        ".1............1.",
        "................",
        ".......1........",
        "................",
        "................",
        "............1...",
        "...1............",
        "................",
        "................",
        "........1.......",
        "................",
        "..1.............",
        "..............1.",
        "................",
        "................",
      ]),
    ],
  },
  coin: {
    id: "coin",
    name: "Gold Coin",
    fps: 6,
    frames: [
      asciiToPixels([
        "................",
        ".....AAAAAA.....",
        "...AA999999AA...",
        "..AA99779999AA..",
        "..A9977999999A..",
        "..A9977999999A..",
        "..A9977999999A..",
        "..A9977999999A..",
        "..A9999999999A..",
        "..AA99999999AA..",
        "...AA999999AA...",
        ".....AAAAAA.....",
        "................",
        "................",
        "................",
        "................",
      ]),
      asciiToPixels([
        "................",
        "......AAAA......",
        ".....A9999A.....",
        "....A977999A....",
        "....A977999A....",
        "....A977999A....",
        "....A977999A....",
        "....A999999A....",
        "....A999999A....",
        ".....A9999A.....",
        "......AAAA......",
        "................",
        "................",
        "................",
        "................",
        "................",
      ]),
    ],
  },
  key_gold: {
    id: "key_gold",
    name: "Golden Key",
    fps: 2,
    frames: [
      asciiToPixels([
        "................",
        "....AAAAAA......",
        "...AA9999AA.....",
        "...A99..99A.....",
        "...AA9999AA.....",
        "....AAAAAA......",
        "......AA........",
        "......AA........",
        "......AAAA......",
        "......AA........",
        "......AAAAA.....",
        "......AA........",
        "................",
        "................",
        "................",
        "................",
      ]),
    ],
  },
  door_locked: {
    id: "door_locked",
    name: "Vault Door",
    fps: 1,
    frames: [
      asciiToPixels([
        "..444444444444..",
        ".44999999999944.",
        "4494444444444944",
        "4944444444444494",
        "494444AAAA444494",
        "49444AA99AA44494",
        "49444AA99AA44494",
        "494444AAAA444494",
        "4944444AA4444494",
        "4944444AA4444494",
        "4944444444444494",
        "4944444444444494",
        "4999999999999994",
        "4444444444444444",
        "5555555555555555",
        "1111111111111111",
      ]),
    ],
  },
  exit_portal: {
    id: "exit_portal",
    name: "Warp Portal",
    fps: 6,
    frames: [
      asciiToPixels([
        "....BBBBBBBB....",
        "..BB33333333BB..",
        ".B33BBBBBBBB33B.",
        ".B3BB777777BB3B.",
        "B3B77BBBBBB77B3B",
        "B3B7BB7777BB7B3B",
        "B3B7B77BB77B7B3B",
        "B3B7B7BBBB7B7B3B",
        "B3B7B77BB77B7B3B",
        "B3B7BB7777BB7B3B",
        "B3B77BBBBBB77B3B",
        ".B3BB777777BB3B.",
        ".B33BBBBBBBB33B.",
        "..BB33333333BB..",
        "....BBBBBBBB....",
        "................",
      ]),
      asciiToPixels([
        "....33333333....",
        "..33BBBBBBBB33..",
        ".3BB77777777BB3.",
        ".3B77BBBBBB77B3.",
        "3B77BB3333BB77B3",
        "3B7B33BBBB33B7B3",
        "3B7B3B7777B3B7B3",
        "3B7B3B7BB7B3B7B3",
        "3B7B3B7777B3B7B3",
        "3B7B33BBBB33B7B3",
        "3B77BB3333BB77B3",
        ".3B77BBBBBB77B3.",
        ".3BB77777777BB3.",
        "..33BBBBBBBB33..",
        "....33333333....",
        "................",
      ]),
    ],
  },
  slime_enemy: {
    id: "slime_enemy",
    name: "Crimson Slime",
    fps: 4,
    frames: [
      asciiToPixels([
        "................",
        "................",
        "................",
        ".....888888.....",
        "...8888888888...",
        "..888778877888..",
        "..888178817888..",
        ".88888888888888.",
        ".88882222228888.",
        ".88888888888888.",
        "..882222222288..",
        "...8888888888...",
        "................",
        "................",
        "................",
        "................",
      ]),
      asciiToPixels([
        "................",
        "................",
        "................",
        "................",
        "....88888888....",
        "..888888888888..",
        ".88877888877888.",
        ".88817888817888.",
        "8888888888888888",
        "8888222222228888",
        ".88222222222288.",
        "..888888888888..",
        "................",
        "................",
        "................",
        "................",
      ]),
    ],
  },
  spikes_hazard: {
    id: "spikes_hazard",
    name: "Floor Spikes",
    fps: 1,
    frames: [
      asciiToPixels([
        "................",
        "..7....7....7...",
        ".767..767..767..",
        ".656..656..656..",
        "655566555665556.",
        "551555515555155.",
        "................",
        "....7....7....7.",
        "...767..767..767",
        "...656..656..656",
        "..65556655566555",
        "..55155551555515",
        "................",
        "................",
        "................",
        "................",
      ]),
    ],
  },
  wizard_npc: {
    id: "wizard_npc",
    name: "Elder Sage",
    fps: 2,
    frames: [
      asciiToPixels([
        "......DDDD......",
        ".....DDDDDD.....",
        "....DDDDDDDD....",
        "..DDDDAAAAADDDD.",
        "...FFF7777FFF...",
        "...F71777717F...",
        "...F77777777F...",
        "...7777777777...",
        "....77777777....",
        "...DDDD77DDDD...",
        "..DDDDDDDDDDDD..",
        "..DDDDDDDDDDDD..",
        "...DDDDDDDDDD...",
        "...DDDD..DDDD...",
        "...555....555...",
        "................",
      ]),
    ],
  },
};

function createBorderWalls(cols = 20, rows = 15, wallSprite = "wall_stone"): { ground: string[]; walls: string[] } {
  const ground = new Array(cols * rows).fill("floor_tile");
  const walls = new Array(cols * rows).fill("");
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        walls[r * cols + c] = wallSprite;
      }
    }
  }
  return { ground, walls };
}

/**
 * Template 1: Dungeon Crawl
 */
export function buildDungeonCrawlTemplate(): ForgeGameSchemaV1_1 {
  const r1 = createBorderWalls();
  // Interior pillars & key chamber wall
  for (let r = 1; r < 10; r++) {
    r1.walls[r * 20 + 12] = "wall_stone";
  }
  r1.walls[5 * 20 + 6] = "wall_stone";
  r1.walls[6 * 20 + 6] = "wall_stone";
  r1.walls[9 * 20 + 6] = "wall_stone";

  const r2 = createBorderWalls();
  for (let c = 5; c < 15; c++) {
    if (c !== 9 && c !== 10) {
      r2.walls[7 * 20 + c] = "wall_stone";
    }
  }

  return {
    schemaVersion: "1.1.0",
    title: "Crypt of the Golden Key",
    description:
      "Venture into the dual-chamber dungeon! Speak to the Elder Sage, dodge the Crimson Slimes, grab the Golden Key, and unlock the Sanctum Vault.",
    genre: "top-down",
    tags: ["Dungeon", "Adventure", "Action"],
    lengthBucket: "<2m",
    seed: 101,
    viewport: { width: 320, height: 240, tileSize: 16 },
    paletteId: "pico8",
    palette: [...PALETTE_PRESETS.pico8.colors],
    sprites: structuredClone(STARTER_SPRITES),
    rooms: [
      {
        id: "room_1",
        name: "Outer Crypt",
        isStart: true,
        cols: 20,
        rows: 15,
        ground: r1.ground,
        walls: r1.walls,
        entities: [
          { id: "p1", type: "player", x: 2, y: 7, spriteId: "knight", health: 3, speed: 78 },
          {
            id: "npc1",
            type: "npc",
            x: 3,
            y: 3,
            spriteId: "wizard_npc",
            dialogue: ["Seek the Gold Key in the east alcove, brave knight!"],
          },
          { id: "c1", type: "coin", x: 8, y: 3, spriteId: "coin", value: 10 },
          { id: "c2", type: "coin", x: 8, y: 11, spriteId: "coin", value: 10 },
          { id: "c3", type: "coin", x: 15, y: 12, spriteId: "coin", value: 10 },
          { id: "k1", type: "key", x: 16, y: 3, spriteId: "key_gold", lockId: "sanctum" },
          {
            id: "e1",
            type: "enemy",
            x: 9,
            y: 6,
            spriteId: "slime_enemy",
            behavior: "patrol",
            patrolAxis: "y",
            patrolDist: 5,
            speed: 45,
          },
          {
            id: "e2",
            type: "enemy",
            x: 14,
            y: 8,
            spriteId: "slime_enemy",
            behavior: "patrol",
            patrolAxis: "x",
            patrolDist: 4,
            speed: 52,
          },
          {
            id: "d1",
            type: "door",
            x: 18,
            y: 7,
            spriteId: "door_locked",
            lockId: "sanctum",
            targetRoom: "room_2",
            targetX: 2,
            targetY: 7,
          },
        ],
      },
      {
        id: "room_2",
        name: "Sanctum Vault",
        isStart: false,
        cols: 20,
        rows: 15,
        ground: r2.ground,
        walls: r2.walls,
        entities: [
          { id: "c4", type: "coin", x: 6, y: 4, spriteId: "coin", value: 25 },
          { id: "c5", type: "coin", x: 13, y: 4, spriteId: "coin", value: 25 },
          { id: "c6", type: "coin", x: 10, y: 11, spriteId: "coin", value: 50 },
          {
            id: "e3",
            type: "enemy",
            x: 10,
            y: 5,
            spriteId: "slime_enemy",
            behavior: "chase",
            detectRadius: 6,
            speed: 48,
          },
          { id: "ex1", type: "exit", x: 17, y: 3, spriteId: "exit_portal" },
        ],
      },
    ],
    rules: [
      {
        id: "r_welcome",
        name: "Show welcome banner on start",
        trigger: { kind: "start" },
        condition: { kind: "always" },
        actions: [{ kind: "showText", text: "Find the Golden Key & reach the Sanctum Portal!" }],
      },
    ],
    variables: { score: 0, lives: 3 },
    feel: {
      screenShake: true,
      particles: true,
      hitFlash: true,
      musicTrack: "dungeon",
    },
    sounds: structuredClone(DEFAULT_SOUNDS),
  };
}

/**
 * Template 2: Coin Rush
 */
export function buildCoinRushTemplate(): ForgeGameSchemaV1_1 {
  const r1 = createBorderWalls();
  // Symmetric arcade obstacles
  const blocks: Array<[number, number]> = [
    [4, 4], [5, 4], [14, 4], [15, 4],
    [4, 10], [5, 10], [14, 10], [15, 10],
    [9, 7], [10, 7],
  ];
  for (const [x, y] of blocks) {
    r1.walls[y * 20 + x] = "wall_stone";
  }

  return {
    schemaVersion: "1.1.0",
    title: "Neon Coin Rush DX",
    description:
      "High-speed arcade scramble! Collect every glowing coin in the cyber arena while outrunning chasing neon slimes.",
    genre: "top-down",
    tags: ["Arcade", "Action", "Chill"],
    lengthBucket: "<2m",
    seed: 202,
    viewport: { width: 320, height: 240, tileSize: 16 },
    paletteId: "neon",
    palette: [...PALETTE_PRESETS.neon.colors],
    sprites: structuredClone(STARTER_SPRITES),
    rooms: [
      {
        id: "room_1",
        name: "Neon Grid",
        isStart: true,
        cols: 20,
        rows: 15,
        ground: r1.ground,
        walls: r1.walls,
        entities: [
          { id: "p1", type: "player", x: 2, y: 7, spriteId: "knight", health: 3, speed: 88 },
          { id: "c1", type: "coin", x: 3, y: 2, spriteId: "coin", value: 20 },
          { id: "c2", type: "coin", x: 9, y: 2, spriteId: "coin", value: 20 },
          { id: "c3", type: "coin", x: 16, y: 2, spriteId: "coin", value: 20 },
          { id: "c4", type: "coin", x: 3, y: 12, spriteId: "coin", value: 20 },
          { id: "c5", type: "coin", x: 9, y: 12, spriteId: "coin", value: 20 },
          { id: "c6", type: "coin", x: 16, y: 12, spriteId: "coin", value: 20 },
          { id: "c7", type: "coin", x: 10, y: 4, spriteId: "coin", value: 30 },
          { id: "c8", type: "coin", x: 10, y: 10, spriteId: "coin", value: 30 },
          {
            id: "e1",
            type: "enemy",
            x: 13,
            y: 6,
            spriteId: "slime_enemy",
            behavior: "chase",
            detectRadius: 6,
            speed: 46,
          },
          {
            id: "e2",
            type: "enemy",
            x: 8,
            y: 9,
            spriteId: "slime_enemy",
            behavior: "wander",
            speed: 50,
          },
        ],
      },
    ],
    rules: [
      {
        id: "r_all_coins",
        name: "Win immediately when all coins are collected",
        trigger: { kind: "allCollected", entityType: "coin" },
        condition: { kind: "always" },
        actions: [
          { kind: "addVar", name: "score", amount: 100 },
          { kind: "playSound", soundId: "win" },
          { kind: "win" },
        ],
      },
    ],
    variables: { score: 0, lives: 3 },
    feel: {
      screenShake: true,
      particles: true,
      hitFlash: true,
      musicTrack: "cyber",
    },
    sounds: structuredClone(DEFAULT_SOUNDS),
  };
}

/**
 * Template 3: Maze Escape
 */
export function buildMazeEscapeTemplate(): ForgeGameSchemaV1_1 {
  const r1 = createBorderWalls();
  // Carve maze corridors
  const wallCols = [4, 8, 12, 16];
  for (const col of wallCols) {
    const gapRow = col === 4 ? 11 : col === 8 ? 3 : col === 12 ? 11 : 4;
    for (let r = 1; r < 14; r++) {
      if (r !== gapRow && r !== gapRow + 1) {
        r1.walls[r * 20 + col] = "wall_stone";
      }
    }
  }

  return {
    schemaVersion: "1.1.0",
    title: "Pocket Labyrinth 89",
    description:
      "Classic DMG green handheld maze challenge. Navigate the winding corridors, avoid the patrol guards and floor spikes, and reach the warp gate.",
    genre: "top-down",
    tags: ["Maze", "Puzzle", "Retro"],
    lengthBucket: "<2m",
    seed: 303,
    viewport: { width: 320, height: 240, tileSize: 16 },
    paletteId: "gameboy",
    palette: [...PALETTE_PRESETS.gameboy.colors],
    sprites: structuredClone(STARTER_SPRITES),
    rooms: [
      {
        id: "room_1",
        name: "Sector DMG",
        isStart: true,
        cols: 20,
        rows: 15,
        ground: r1.ground,
        walls: r1.walls,
        entities: [
          { id: "p1", type: "player", x: 2, y: 2, spriteId: "knight", health: 3, speed: 75 },
          { id: "c1", type: "coin", x: 2, y: 12, spriteId: "coin", value: 15 },
          { id: "c2", type: "coin", x: 6, y: 3, spriteId: "coin", value: 15 },
          { id: "c3", type: "coin", x: 10, y: 12, spriteId: "coin", value: 15 },
          { id: "c4", type: "coin", x: 14, y: 4, spriteId: "coin", value: 15 },
          { id: "h1", type: "hazard", x: 6, y: 8, spriteId: "spikes_hazard", damage: 1 },
          { id: "h2", type: "hazard", x: 10, y: 6, spriteId: "spikes_hazard", damage: 1 },
          {
            id: "e1",
            type: "enemy",
            x: 6,
            y: 4,
            spriteId: "slime_enemy",
            behavior: "patrol",
            patrolAxis: "y",
            patrolDist: 6,
            speed: 42,
          },
          {
            id: "e2",
            type: "enemy",
            x: 14,
            y: 6,
            spriteId: "slime_enemy",
            behavior: "patrol",
            patrolAxis: "y",
            patrolDist: 6,
            speed: 48,
          },
          { id: "ex1", type: "exit", x: 18, y: 12, spriteId: "exit_portal" },
        ],
      },
    ],
    rules: [],
    variables: { score: 0, lives: 3 },
    feel: {
      screenShake: true,
      particles: true,
      hitFlash: true,
      musicTrack: "adventure",
    },
    sounds: structuredClone(DEFAULT_SOUNDS),
  };
}

/**
 * Template 4: Key and Door
 */
export function buildKeyAndDoorTemplate(): ForgeGameSchemaV1_1 {
  const r1 = createBorderWalls();
  // Create vault enclosure in top-right
  for (let c = 13; c < 19; c++) {
    r1.walls[6 * 20 + c] = "wall_stone";
  }
  for (let r = 1; r < 6; r++) {
    r1.walls[r * 20 + 13] = "wall_stone";
  }
  // Leave doorway at (16, 6)
  r1.walls[6 * 20 + 16] = "";

  return {
    schemaVersion: "1.1.0",
    title: "Twin Lock Fortress",
    description:
      "Tactical puzzle rooms! Retrieve the Vault Key guarded by sentry turrets, unlock the fortress gate, and claim the portal.",
    genre: "top-down",
    tags: ["Puzzle", "Dungeon"],
    lengthBucket: "<2m",
    seed: 404,
    viewport: { width: 320, height: 240, tileSize: 16 },
    paletteId: "pico8",
    palette: [...PALETTE_PRESETS.pico8.colors],
    sprites: structuredClone(STARTER_SPRITES),
    rooms: [
      {
        id: "room_1",
        name: "Vault Antechamber",
        isStart: true,
        cols: 20,
        rows: 15,
        ground: r1.ground,
        walls: r1.walls,
        entities: [
          { id: "p1", type: "player", x: 2, y: 12, spriteId: "knight", health: 3, speed: 78 },
          {
            id: "k_vault",
            type: "key",
            x: 3,
            y: 3,
            spriteId: "key_gold",
            lockId: "vault",
          },
          {
            id: "d_vault",
            type: "door",
            x: 16,
            y: 6,
            spriteId: "door_locked",
            lockId: "vault",
          },
          { id: "c1", type: "coin", x: 15, y: 3, spriteId: "coin", value: 50 },
          { id: "c2", type: "coin", x: 17, y: 3, spriteId: "coin", value: 50 },
          {
            id: "e_turret",
            type: "enemy",
            x: 9,
            y: 3,
            spriteId: "slime_enemy",
            behavior: "shooter",
            shootDir: "left",
            shootInterval: 1.8,
          },
          {
            id: "e_guard",
            type: "enemy",
            x: 8,
            y: 9,
            spriteId: "slime_enemy",
            behavior: "patrol",
            patrolAxis: "x",
            patrolDist: 5,
            speed: 45,
          },
          { id: "ex1", type: "exit", x: 16, y: 2, spriteId: "exit_portal" },
        ],
      },
    ],
    rules: [
      {
        id: "r_key_msg",
        name: "Announce when key collected",
        trigger: { kind: "collect", entityType: "key" },
        condition: { kind: "always" },
        actions: [{ kind: "showText", text: "Vault Key acquired! Unlock the northeast gate." }],
      },
    ],
    variables: { score: 0, lives: 3 },
    feel: {
      screenShake: true,
      particles: true,
      hitFlash: true,
      musicTrack: "dungeon",
    },
    sounds: structuredClone(DEFAULT_SOUNDS),
  };
}

/**
 * Template 5: Survive the Waves
 */
export function buildSurviveTheWavesTemplate(): ForgeGameSchemaV1_1 {
  const r1 = createBorderWalls();
  r1.walls[4 * 20 + 5] = "wall_stone";
  r1.walls[4 * 20 + 14] = "wall_stone";
  r1.walls[10 * 20 + 5] = "wall_stone";
  r1.walls[10 * 20 + 14] = "wall_stone";

  return {
    schemaVersion: "1.1.0",
    title: "Survive the Crimson Waves",
    description:
      "Arena survival! Dodge aimed projectiles and chasers while collecting energy orbs. Reach 60 score to trigger extraction victory!",
    genre: "top-down",
    tags: ["Survival", "Action", "Shooter"],
    lengthBucket: "2-5m",
    seed: 505,
    viewport: { width: 320, height: 240, tileSize: 16 },
    paletteId: "neon",
    palette: [...PALETTE_PRESETS.neon.colors],
    sprites: structuredClone(STARTER_SPRITES),
    rooms: [
      {
        id: "room_1",
        name: "Crimson Arena",
        isStart: true,
        cols: 20,
        rows: 15,
        ground: r1.ground,
        walls: r1.walls,
        entities: [
          { id: "p1", type: "player", x: 10, y: 7, spriteId: "knight", health: 4, speed: 84 },
          { id: "c1", type: "coin", x: 3, y: 3, spriteId: "coin", value: 15 },
          { id: "c2", type: "coin", x: 16, y: 3, spriteId: "coin", value: 15 },
          { id: "c3", type: "coin", x: 3, y: 11, spriteId: "coin", value: 15 },
          { id: "c4", type: "coin", x: 16, y: 11, spriteId: "coin", value: 15 },
          {
            id: "e1",
            type: "enemy",
            x: 10,
            y: 2,
            spriteId: "slime_enemy",
            behavior: "shooter",
            shootDir: "aim",
            shootInterval: 2.2,
          },
          {
            id: "e2",
            type: "enemy",
            x: 2,
            y: 7,
            spriteId: "slime_enemy",
            behavior: "chase",
            detectRadius: 7,
            speed: 40,
          },
        ],
      },
    ],
    rules: [
      {
        id: "r_survival_tick",
        name: "Award +5 survival score every 3 seconds",
        trigger: { kind: "timer", seconds: 3, repeat: true },
        condition: { kind: "always" },
        actions: [{ kind: "addVar", name: "score", amount: 5 }],
      },
      {
        id: "r_win_on_score",
        name: "Win when score reaches 60",
        trigger: { kind: "collect", entityType: "coin" },
        condition: { kind: "varCompare", name: "score", op: ">=", value: 60 },
        actions: [
          { kind: "playSound", soundId: "win" },
          { kind: "win" },
        ],
      },
    ],
    variables: { score: 0, lives: 4 },
    feel: {
      screenShake: true,
      particles: true,
      hitFlash: true,
      musicTrack: "boss",
    },
    sounds: structuredClone(DEFAULT_SOUNDS),
  };
}

export const OFFICIAL_TEMPLATES: Array<{
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  build: () => ForgeGameSchemaV1_1;
}> = [
  {
    id: "dungeon-crawl",
    slug: "crypt-of-the-golden-key",
    name: "Dungeon Crawl",
    subtitle: "Multi-room quest with keys, locked doors & NPC dialogue",
    build: buildDungeonCrawlTemplate,
  },
  {
    id: "coin-rush",
    slug: "neon-coin-rush-dx",
    name: "Coin Rush",
    subtitle: "Fast cyber-arcade coin dash with rule-based victory",
    build: buildCoinRushTemplate,
  },
  {
    id: "maze-escape",
    slug: "pocket-labyrinth-89",
    name: "Maze Escape",
    subtitle: "Pocket DMG green palette labyrinth with patrol guards",
    build: buildMazeEscapeTemplate,
  },
  {
    id: "key-and-door",
    slug: "twin-lock-fortress",
    name: "Key and Door",
    subtitle: "Tactical turret puzzle & locked fortress vault",
    build: buildKeyAndDoorTemplate,
  },
  {
    id: "survive-the-waves",
    slug: "survive-the-crimson-waves",
    name: "Survive the Waves",
    subtitle: "Timed arena survival with aimed turret fire",
    build: buildSurviveTheWavesTemplate,
  },
];
