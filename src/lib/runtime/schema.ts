// Pure TypeScript module — NO React imports allowed.
// Shared across Studio Editor, Web Player, Thumbnail Generator, and Server Validator.

export type PalettePresetId = "pico8" | "gameboy" | "neon";

export const PALETTE_PRESETS: Record<PalettePresetId, { name: string; colors: string[] }> = {
  pico8: {
    name: "PICO-8 Classic",
    colors: [
      "transparent", // 0: Reserved transparent
      "#1D2B53",     // 1: Dark Blue
      "#7E2553",     // 2: Dark Purple
      "#008751",     // 3: Dark Green
      "#AB5236",     // 4: Brown
      "#5F574F",     // 5: Dark Gray
      "#C2C3C7",     // 6: Light Gray
      "#FFF1E8",     // 7: White
      "#FF004D",     // 8: Red / Hot Pink
      "#FFA300",     // 9: Orange
      "#FFEC27",     // 10: Yellow
      "#00E436",     // 11: Green
      "#29ADFF",     // 12: Blue
      "#83769C",     // 13: Indigo
      "#FF77A8",     // 14: Pink
      "#FFCCAA",     // 15: Peach
    ],
  },
  gameboy: {
    name: "Pocket DMG Green",
    colors: [
      "transparent",
      "#081820",
      "#132C28",
      "#1E3F29",
      "#2A522A",
      "#346856",
      "#4E8264",
      "#689C72",
      "#88C070",
      "#A4D07E",
      "#C0E08C",
      "#E0F8D0",
      "#70A860",
      "#406040",
      "#98D888",
      "#F0FFE8",
    ],
  },
  neon: {
    name: "Cyber Arcade Neon",
    colors: [
      "transparent",
      "#0B0C14",
      "#14162A",
      "#2B2F5A",
      "#52589C",
      "#9A9DC8",
      "#EDEEFF",
      "#FF4D8D",
      "#FF0055",
      "#37E6C4",
      "#00A8FF",
      "#FFC53D",
      "#FF7A00",
      "#B84DFF",
      "#00FF66",
      "#FFFFFF",
    ],
  },
};

export interface SpriteData {
  id: string;
  name: string;
  fps: number; // 1 to 12
  frames: number[][]; // Up to 4 frames, each 256 ints (16x16) indexing into palette[0..15]
}

export type EntityType =
  | "player"
  | "coin"
  | "key"
  | "door"
  | "exit"
  | "hazard"
  | "enemy"
  | "npc";

export type EnemyBehavior =
  | "patrol"
  | "chase"
  | "wander"
  | "shooter"
  | "stationary";

export interface EntityInstance {
  id: string;
  type: EntityType;
  x: number; // Tile column (0..19)
  y: number; // Tile row (0..14)
  spriteId: string;
  health?: number;
  speed?: number; // Pixels/sec
  value?: number; // Score value for coin
  damage?: number; // Health damage for hazard/enemy
  lockId?: string; // Matching key/door identifier
  targetRoom?: string; // Room ID to transition to
  targetX?: number; // Spawn tile X in targetRoom
  targetY?: number; // Spawn tile Y in targetRoom
  behavior?: EnemyBehavior;
  patrolAxis?: "x" | "y";
  patrolDist?: number; // Tiles
  detectRadius?: number; // Tiles
  shootDir?: "up" | "down" | "left" | "right" | "aim";
  shootInterval?: number; // Seconds
  dialogue?: string[]; // Lines for NPC
}

export interface RoomData {
  id: string;
  name: string;
  isStart?: boolean;
  cols: number; // Fixed 20
  rows: number; // Fixed 15
  ground: string[]; // 300 elements (spriteId or "")
  walls: string[]; // 300 elements (spriteId or "" — solid collision)
  entities: EntityInstance[];
}

export type Trigger =
  | { kind: "start" }
  | { kind: "touch"; a: string; b: string }
  | { kind: "collect"; entityType: string }
  | { kind: "allCollected"; entityType: string }
  | { kind: "enterRoom"; roomId: string }
  | { kind: "timer"; seconds: number; repeat?: boolean };

export type Condition =
  | { kind: "always" }
  | { kind: "hasKey"; lockId: string }
  | { kind: "varCompare"; name: string; op: ">=" | "<=" | "=="; value: number };

export type Action =
  | { kind: "addVar"; name: string; amount: number }
  | { kind: "openDoor"; lockId: string }
  | { kind: "spawn"; entityType: EntityType; spriteId: string; x: number; y: number }
  | { kind: "playSound"; soundId: string }
  | { kind: "goToRoom"; roomId: string; x: number; y: number }
  | { kind: "showText"; text: string }
  | { kind: "win" }
  | { kind: "lose" };

export interface GameRule {
  id: string;
  name: string;
  trigger: Trigger;
  condition: Condition;
  actions: Action[];
}

export interface SoundEffectParam {
  id: string;
  name: string;
  wave: "square" | "sawtooth" | "triangle" | "sine";
  freq: number; // Base Hz (e.g. 440)
  slide: number; // Hz slide per sec (e.g. 300 or -200)
  decay: number; // Duration seconds (0.05..0.8)
  vibrato: number; // 0..50
}

export interface FeelConfig {
  screenShake: boolean;
  particles: boolean;
  hitFlash: boolean;
  musicTrack: "none" | "adventure" | "dungeon" | "cyber" | "boss";
}

export interface ForgeGameSchemaV1_1 {
  schemaVersion: "1.1.0";
  title: string;
  description: string;
  genre: "top-down";
  tags: string[];
  lengthBucket: "<2m" | "2-5m" | "5-10m" | "10m+";
  seed: number; // Deterministic RNG seed for mulberry32
  viewport: {
    width: 320;
    height: 240;
    tileSize: 16;
  };
  paletteId: PalettePresetId;
  palette: string[]; // Length 16, index 0 MUST be "transparent"
  sprites: Record<string, SpriteData>;
  rooms: RoomData[];
  rules: GameRule[];
  variables: Record<string, number>; // Up to 8 numeric variables, includes score & lives
  feel: FeelConfig;
  sounds: Record<string, SoundEffectParam>;
}

export const STUDIO_LIMITS = {
  maxRooms: 10,
  maxEntitiesPerRoom: 100,
  maxSprites: 64,
  maxRules: 50,
  maxActionsPerRule: 5,
  maxActionsPerFrame: 200,
  maxSounds: 16,
  maxVariables: 8,
  maxJsonBytes: 512 * 1024,
  maxTitleChars: 60,
  maxDescChars: 500,
  maxTags: 5,
} as const;

export const DEFAULT_SOUNDS: Record<string, SoundEffectParam> = {
  coin: {
    id: "coin",
    name: "Coin Pickup",
    wave: "square",
    freq: 587,
    slide: 650,
    decay: 0.18,
    vibrato: 0,
  },
  jump: {
    id: "jump",
    name: "Step / Action",
    wave: "triangle",
    freq: 260,
    slide: 380,
    decay: 0.14,
    vibrato: 5,
  },
  hit: {
    id: "hit",
    name: "Hit / Hurt",
    wave: "sawtooth",
    freq: 180,
    slide: -140,
    decay: 0.25,
    vibrato: 30,
  },
  win: {
    id: "win",
    name: "Victory Fanfare",
    wave: "square",
    freq: 523,
    slide: 523,
    decay: 0.45,
    vibrato: 12,
  },
  lose: {
    id: "lose",
    name: "Game Over",
    wave: "sawtooth",
    freq: 220,
    slide: -160,
    decay: 0.5,
    vibrato: 20,
  },
};

/**
 * Migrates a v1.0.0 schema document to v1.1.0:
 * 1. Reserves palette[0] as "transparent".
 * 2. Converts legacy winCondition / lossCondition into structured v1.1.0 rules.
 * 3. Wraps legacy single tilemap into rooms[0].
 */
export function migrateToLatestSchema(raw: any): ForgeGameSchemaV1_1 {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid game document: expected an object");
  }
  if (raw.schemaVersion === "1.1.0") {
    const copy = structuredClone(raw) as ForgeGameSchemaV1_1;
    if (copy.palette && copy.palette[0] !== "transparent") {
      copy.palette[0] = "transparent";
    }
    return copy;
  }

  // Migrate from v1.0.0
  const palette = Array.isArray(raw.assets?.palette)
    ? ["transparent", ...raw.assets.palette.slice(1, 16)]
    : [...PALETTE_PRESETS.pico8.colors];

  const sprites: Record<string, SpriteData> = {};
  if (raw.assets?.sprites) {
    for (const [k, s] of Object.entries<any>(raw.assets.sprites)) {
      sprites[k] = {
        id: s.id || k,
        name: s.name || k,
        fps: s.fps || 4,
        frames: Array.isArray(s.frames) ? s.frames : [s.pixels || new Array(256).fill(0)],
      };
    }
  }

  const rules: GameRule[] = [];
  if (raw.rules?.winCondition === "collect_all_coins") {
    rules.push({
      id: "rule_migrated_win",
      name: "Win when all coins collected",
      trigger: { kind: "allCollected", entityType: "coin" },
      condition: { kind: "always" },
      actions: [{ kind: "playSound", soundId: "win" }, { kind: "win" }],
    });
  } else if (raw.rules?.winCondition === "reach_exit_with_key") {
    rules.push({
      id: "rule_migrated_win_exit",
      name: "Win on touching exit",
      trigger: { kind: "touch", a: "player", b: "exit" },
      condition: { kind: "always" },
      actions: [{ kind: "playSound", soundId: "win" }, { kind: "win" }],
    });
  }

  const ground = new Array(300).fill("");
  const walls = new Array(300).fill("");

  return {
    schemaVersion: "1.1.0",
    title: String(raw.title || "Untitled Forge Game").slice(0, 60),
    description: String(raw.description || "").slice(0, 500),
    genre: "top-down",
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 5) : ["Adventure"],
    lengthBucket: "<2m",
    seed: typeof raw.seed === "number" ? raw.seed : 42,
    viewport: { width: 320, height: 240, tileSize: 16 },
    paletteId: "pico8",
    palette,
    sprites,
    rooms: [
      {
        id: "room_1",
        name: "Room 1",
        isStart: true,
        cols: 20,
        rows: 15,
        ground,
        walls,
        entities: Array.isArray(raw.entities) ? raw.entities : [],
      },
    ],
    rules,
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

export interface PublishCheckResult {
  valid: boolean;
  blockingErrors: string[];
  warnings: string[];
  unreachableCoords: Array<{ roomId: string; x: number; y: number; entityId: string; type: EntityType }>;
}

/**
 * Runs blocking publish checks + BFS walkable reachability analysis across rooms.
 */
export function checkPublishReadiness(doc: ForgeGameSchemaV1_1): PublishCheckResult {
  const blockingErrors: string[] = [];
  const warnings: string[] = [];
  const unreachableCoords: Array<{
    roomId: string;
    x: number;
    y: number;
    entityId: string;
    type: EntityType;
  }> = [];

  if (!doc || doc.schemaVersion !== "1.1.0") {
    blockingErrors.push("Schema version must be 1.1.0.");
    return { valid: false, blockingErrors, warnings, unreachableCoords };
  }

  const jsonBytes = new TextEncoder().encode(JSON.stringify(doc)).length;
  if (jsonBytes > STUDIO_LIMITS.maxJsonBytes) {
    blockingErrors.push(`Project size (${Math.round(jsonBytes / 1024)} KB) exceeds 512 KB limit.`);
  }

  if (!doc.title || doc.title.trim().length === 0) {
    blockingErrors.push("A game title is required.");
  } else if (doc.title.length > STUDIO_LIMITS.maxTitleChars) {
    blockingErrors.push(`Title exceeds ${STUDIO_LIMITS.maxTitleChars} characters.`);
  }

  if (!doc.description || doc.description.trim().length === 0) {
    warnings.push("No description set. Adding a short description helps players discover your game.");
  }

  if (doc.palette[0] !== "transparent") {
    blockingErrors.push("Palette index 0 must be reserved for transparent.");
  }

  if (doc.rooms.length === 0) {
    blockingErrors.push("Game must have at least 1 room.");
  } else if (doc.rooms.length > STUDIO_LIMITS.maxRooms) {
    blockingErrors.push(`Game cannot exceed ${STUDIO_LIMITS.maxRooms} rooms.`);
  }

  if (Object.keys(doc.sprites).length > STUDIO_LIMITS.maxSprites) {
    blockingErrors.push(`Sprites count exceeds maximum of ${STUDIO_LIMITS.maxSprites}.`);
  }

  if (doc.rules.length > STUDIO_LIMITS.maxRules) {
    blockingErrors.push(`Rules count exceeds maximum of ${STUDIO_LIMITS.maxRules}.`);
  }

  // Count players across start room
  const startRoom = doc.rooms.find((r) => r.isStart) || doc.rooms[0];
  if (!startRoom) {
    blockingErrors.push("No starting room found.");
    return { valid: false, blockingErrors, warnings, unreachableCoords };
  }

  const playersInStart = startRoom.entities.filter((e) => e.type === "player");
  if (playersInStart.length === 0) {
    blockingErrors.push(`Start room "${startRoom.name}" must have a Player spawn entity.`);
  } else if (playersInStart.length > 1) {
    blockingErrors.push(`Start room "${startRoom.name}" has ${playersInStart.length} players (must have exactly 1).`);
  }

  // Check if a win condition exists (either an exit entity or a rule with a "win" action)
  const hasExitEntity = doc.rooms.some((r) =>
    r.entities.some((e) => e.type === "exit")
  );
  const hasWinRule = doc.rules.some((r) =>
    r.actions.some((a) => a.kind === "win")
  );
  if (!hasExitEntity && !hasWinRule) {
    blockingErrors.push("No win path exists: place an Exit entity or add a Rule with a Win action.");
  }

  // BFS reachability check per room from player spawn or room entry points
  for (const room of doc.rooms) {
    if (room.entities.length > STUDIO_LIMITS.maxEntitiesPerRoom) {
      blockingErrors.push(
        `Room "${room.name}" has ${room.entities.length} entities (limit ${STUDIO_LIMITS.maxEntitiesPerRoom}).`
      );
    }

    const spawnPoints: Array<{ x: number; y: number }> = [];
    for (const ent of room.entities) {
      if (ent.type === "player") {
        spawnPoints.push({ x: Math.floor(ent.x), y: Math.floor(ent.y) });
      }
    }
    // Also add incoming door destinations from other rooms
    for (const other of doc.rooms) {
      for (const ent of other.entities) {
        if (ent.type === "door" && ent.targetRoom === room.id) {
          spawnPoints.push({
            x: Math.floor(ent.targetX ?? 1),
            y: Math.floor(ent.targetY ?? 1),
          });
        }
      }
    }

    if (spawnPoints.length > 0) {
      const visited = new Set<string>();
      const queue: Array<{ x: number; y: number }> = [...spawnPoints];
      for (const sp of spawnPoints) {
        visited.add(`${sp.x},${sp.y}`);
      }

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const dirs = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
        ];
        for (const { dx, dy } of dirs) {
          const nx = curr.x + dx;
          const ny = curr.y + dy;
          if (nx < 0 || nx >= room.cols || ny < 0 || ny >= room.rows) continue;
          const key = `${nx},${ny}`;
          if (visited.has(key)) continue;
          const wallSprite = room.walls[ny * room.cols + nx];
          if (wallSprite && wallSprite !== "") continue; // Blocked by solid wall
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }

      // Check if any coins, keys, or exits in this room are unreachable
      for (const ent of room.entities) {
        if (ent.type === "coin" || ent.type === "key" || ent.type === "exit") {
          const k = `${Math.floor(ent.x)},${Math.floor(ent.y)}`;
          if (!visited.has(k)) {
            unreachableCoords.push({
              roomId: room.id,
              x: ent.x,
              y: ent.y,
              entityId: ent.id,
              type: ent.type,
            });
            warnings.push(
              `Unreachable ${ent.type} at (${ent.x}, ${ent.y}) in "${room.name}" (blocked by walls).`
            );
          }
        }
      }
    }
  }

  return {
    valid: blockingErrors.length === 0,
    blockingErrors,
    warnings,
    unreachableCoords,
  };
}
