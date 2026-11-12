import {
  type ForgeGameSchemaV1_1,
} from "../runtime/schema";
import {
  buildDungeonCrawlTemplate,
  buildCoinRushTemplate,
  buildMazeEscapeTemplate,
  buildKeyAndDoorTemplate,
  buildSurviveTheWavesTemplate,
} from "../templates";
import {
  computeTrendScore,
  computeJamBayesianScore,
  type JamCriterionRating,
} from "../discovery/algorithms";

export type GameType = "FORGE_STUDIO" | "HTML5_BUNDLE";
export type PublishStatus = "DRAFT" | "PUBLISHED" | "UNLISTED" | "SUSPENDED";
export type ReactionKind = "FUN" | "HARD" | "BEAUTIFUL" | "CLEVER";

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  badges: string[];
  followersCount: number;
  followingIds: string[];
  createdAt: string;
}

export interface ScoreEntry {
  id: string;
  userId: string;
  username: string;
  score: number;
  verified: boolean; // True for Studio deterministic runtime wins, False for postMessage HTML5 bundles
  createdAt: string;
}

export interface GameVersionRecord {
  id: string;
  number: number;
  label: string;
  createdAt: string;
  projectData?: ForgeGameSchemaV1_1;
}

export interface ArcadeGameRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: GameType;
  status: PublishStatus;
  revision: number;
  unlistedToken: string;
  authorId: string;
  authorUsername: string;
  authorAvatarColor: string;
  tags: string[];
  lengthBucket: "<2m" | "2-5m" | "5-10m" | "10m+";
  controlsGuide: string;
  playCount: number;
  completionCount: number;
  likeCount: number;
  remixCount: number;
  trendScore: number;
  featured: boolean;
  jamWinnerBadge?: string;
  remixAllowed: boolean;
  remixedFromId?: string;
  remixedFromTitle?: string;
  remixedFromAuthor?: string;
  projectData?: ForgeGameSchemaV1_1;
  htmlBundleSrcDoc?: string;
  bundleFileList?: string[];
  reactions: Record<ReactionKind, number>;
  userReacted: ReactionKind[];
  userLiked: boolean;
  scores: ScoreEntry[];
  versions: GameVersionRecord[];
  deathsByCell: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface JamEntryRecord {
  id: string;
  jamId: string;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  authorUsername: string;
  frozenVersionNumber: number;
  ratings: Array<JamCriterionRating & { raterUsername: string }>;
  submittedAt: string;
}

export interface JamRecord {
  id: string;
  slug: string;
  title: string;
  theme: string;
  description: string;
  status: "UPCOMING" | "ACTIVE" | "VOTING" | "CLOSED";
  startsAt: string;
  submissionsEndAt: string;
  votingEndsAt: string;
  entries: JamEntryRecord[];
}

export interface ReportRecord {
  id: string;
  gameId: string;
  gameTitle: string;
  reporterUsername: string;
  reason: string;
  details: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}

/**
 * Self-contained HTML5 Canvas bundle #1: Starfield Hyperdrive
 * Posts unverified scores via window.parent.postMessage({ type: 'ARCADE_SCORE', score }, '*')
 */
export const STARFIELD_HTML5_BUNDLE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body { margin: 0; padding: 0; background: #0B0C14; overflow: hidden; font-family: monospace; color: #EDEEFF; user-select: none; }
  canvas { display: block; width: 100vw; height: 100vh; image-rendering: pixelated; }
</style>
</head>
<body>
<canvas id="c" width="320" height="240"></canvas>
<script>
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let ship = { x: 152, y: 200, vx: 0 };
let keys = {};
let stars = Array.from({ length: 45 }, () => ({ x: Math.random() * 320, y: Math.random() * 240, s: 1 + Math.random() * 2 }));
let meteors = [];
let crystals = [];
let score = 0;
let alive = true;
let tick = 0;

window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (!alive && e.code === 'KeyR') reset();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function reset() {
  ship = { x: 152, y: 200 };
  meteors = [];
  crystals = [];
  score = 0;
  alive = true;
  tick = 0;
}

function loop() {
  requestAnimationFrame(loop);
  tick++;
  ctx.fillStyle = '#0B0C14';
  ctx.fillRect(0, 0, 320, 240);

  // Stars
  ctx.fillStyle = '#9A9DC8';
  for (const st of stars) {
    if (alive) st.y = (st.y + st.s) % 240;
    ctx.fillRect(st.x, st.y, 2, 2);
  }

  if (alive) {
    if (keys['ArrowLeft'] || keys['KeyA']) ship.x = Math.max(8, ship.x - 3.2);
    if (keys['ArrowRight'] || keys['KeyD']) ship.x = Math.min(296, ship.x + 3.2);
    if (keys['ArrowUp'] || keys['KeyW']) ship.y = Math.max(24, ship.y - 2.5);
    if (keys['ArrowDown'] || keys['KeyS']) ship.y = Math.min(216, ship.y + 2.5);

    if (tick % 24 === 0) {
      meteors.push({ x: Math.random() * 296, y: -16, vy: 1.8 + Math.random() * 1.8 });
    }
    if (tick % 45 === 0) {
      crystals.push({ x: 16 + Math.random() * 280, y: -12, vy: 1.6 });
    }
    if (tick % 30 === 0) {
      score += 5;
    }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.y += m.vy;
      ctx.fillStyle = '#FF5C5C';
      ctx.fillRect(m.x, m.y, 14, 14);
      ctx.fillStyle = '#14162A';
      ctx.fillRect(m.x + 3, m.y + 3, 4, 4);
      if (Math.abs(ship.x - m.x) < 12 && Math.abs(ship.y - m.y) < 12) {
        alive = false;
        window.parent.postMessage({ type: 'ARCADE_SCORE', score }, '*');
      }
      if (m.y > 250) meteors.splice(i, 1);
    }

    for (let i = crystals.length - 1; i >= 0; i--) {
      const cr = crystals[i];
      cr.y += cr.vy;
      ctx.fillStyle = '#37E6C4';
      ctx.fillRect(cr.x, cr.y, 10, 10);
      if (Math.abs(ship.x - cr.x) < 12 && Math.abs(ship.y - cr.y) < 12) {
        score += 25;
        crystals.splice(i, 1);
        continue;
      }
      if (cr.y > 250) crystals.splice(i, 1);
    }
  }

  // Draw Ship
  ctx.fillStyle = '#FF4D8D';
  ctx.fillRect(ship.x + 6, ship.y, 4, 14);
  ctx.fillRect(ship.x, ship.y + 6, 16, 6);
  ctx.fillStyle = '#37E6C4';
  ctx.fillRect(ship.x + 6, ship.y + 4, 4, 4);

  // HUD
  ctx.fillStyle = 'rgba(20, 22, 42, 0.85)';
  ctx.fillRect(0, 0, 320, 18);
  ctx.fillStyle = '#EDEEFF';
  ctx.font = 'bold 10px monospace';
  ctx.fillText('STARFIELD HYPERDRIVE (HTML5 SANDBOX)', 8, 12);
  ctx.fillStyle = '#FFC53D';
  ctx.fillText('SCORE: ' + score, 245, 12);

  if (!alive) {
    ctx.fillStyle = 'rgba(11, 12, 20, 0.85)';
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = '#FF4D8D';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('HULL BREACHED!', 92, 100);
    ctx.fillStyle = '#37E6C4';
    ctx.font = '11px monospace';
    ctx.fillText('Score Posted via postMessage: ' + score, 64, 124);
    ctx.fillStyle = '#EDEEFF';
    ctx.fillText('Press R to Re-launch', 96, 150);
  }
}
loop();
</script>
</body>
</html>`;

export const INITIAL_USERS: UserProfile[] = [
  {
    id: "u_nova",
    username: "nova_pixel",
    displayName: "Nova Pixel",
    avatarColor: "#FF4D8D",
    bio: "Retro dungeon architect & chiptune tinkerer. Building tiny worlds in 16x16.",
    role: "ADMIN",
    badges: ["Jam #0 Winner", "Staff Pick Creator", "Founding Forger"],
    followersCount: 148,
    followingIds: ["u_kazu", "u_byte"],
    createdAt: "2026-09-15T10:00:00Z",
  },
  {
    id: "u_kazu",
    username: "kazu_dev",
    displayName: "Kazuo Tanaka",
    avatarColor: "#37E6C4",
    bio: "Speedrun level designer & HTML5 shader experimenter.",
    role: "USER",
    badges: ["Jam Participant", "Verified Creator"],
    followersCount: 92,
    followingIds: ["u_nova"],
    createdAt: "2026-10-01T14:20:00Z",
  },
  {
    id: "u_byte",
    username: "byte_witch",
    displayName: "ByteWitch",
    avatarColor: "#FFC53D",
    bio: "Minimalist puzzle maker. DMG green palette enthusiast.",
    role: "MODERATOR",
    badges: ["Jam #0 Best Creativity", "Puzzle Master"],
    followersCount: 114,
    followingIds: ["u_nova"],
    createdAt: "2026-10-10T08:00:00Z",
  },
];

export function createInitialGames(): ArcadeGameRecord[] {
  const dungeonDoc = buildDungeonCrawlTemplate();
  const coinRushDoc = buildCoinRushTemplate();
  const mazeDoc = buildMazeEscapeTemplate();
  const keyDoorDoc = buildKeyAndDoorTemplate();
  const wavesDoc = buildSurviveTheWavesTemplate();

  return [
    {
      id: "g_dungeon",
      slug: "crypt-of-the-golden-key",
      title: dungeonDoc.title,
      description: dungeonDoc.description,
      type: "FORGE_STUDIO",
      status: "PUBLISHED",
      revision: 4,
      unlistedToken: "tok_crypt_991",
      authorId: "u_nova",
      authorUsername: "nova_pixel",
      authorAvatarColor: "#FF4D8D",
      tags: dungeonDoc.tags,
      lengthBucket: "<2m",
      controlsGuide: "WASD / Arrow Keys to move • Space / Z to talk to Elder Sage",
      playCount: 412,
      completionCount: 268,
      likeCount: 129,
      remixCount: 19,
      trendScore: computeTrendScore(
        [
          { ageHours: 2, uniquePlays: 34, completions: 22, likes: 14, remixes: 3 },
          { ageHours: 12, uniquePlays: 60, completions: 41, likes: 21, remixes: 4 },
        ],
        412,
        129
      ),
      featured: true,
      jamWinnerBadge: "Jam #0 Winner",
      remixAllowed: true,
      projectData: dungeonDoc,
      reactions: { FUN: 84, HARD: 22, BEAUTIFUL: 51, CLEVER: 39 },
      userReacted: ["FUN"],
      userLiked: false,
      scores: [
        { id: "s1", userId: "u_kazu", username: "kazu_dev", score: 130, verified: true, createdAt: "2h ago" },
        { id: "s2", userId: "u_byte", username: "byte_witch", score: 120, verified: true, createdAt: "5h ago" },
        { id: "s3", userId: "u_nova", username: "nova_pixel", score: 110, verified: true, createdAt: "1d ago" },
      ],
      versions: [
        { id: "v1", number: 1, label: "Initial Outer Crypt", createdAt: "2d ago", projectData: dungeonDoc },
        { id: "v2", number: 2, label: "Added Sanctum Vault Room 2", createdAt: "1d ago", projectData: dungeonDoc },
      ],
      deathsByCell: {
        "room_1:9,6": 14,
        "room_1:14,8": 23,
        "room_2:10,5": 31,
      },
      createdAt: "2026-11-08T12:00:00Z",
      updatedAt: "2026-11-11T09:30:00Z",
    },
    {
      id: "g_coinrush",
      slug: "neon-coin-rush-dx",
      title: coinRushDoc.title,
      description: coinRushDoc.description,
      type: "FORGE_STUDIO",
      status: "PUBLISHED",
      revision: 3,
      unlistedToken: "tok_neon_202",
      authorId: "u_kazu",
      authorUsername: "kazu_dev",
      authorAvatarColor: "#37E6C4",
      tags: coinRushDoc.tags,
      lengthBucket: "<2m",
      controlsGuide: "WASD / Arrow Keys to dash • Collect all 8 coins to trigger rule victory",
      playCount: 318,
      completionCount: 215,
      likeCount: 98,
      remixCount: 14,
      trendScore: computeTrendScore(
        [
          { ageHours: 4, uniquePlays: 29, completions: 20, likes: 11, remixes: 2 },
          { ageHours: 18, uniquePlays: 48, completions: 35, likes: 16, remixes: 3 },
        ],
        318,
        98
      ),
      featured: true,
      remixAllowed: true,
      projectData: coinRushDoc,
      reactions: { FUN: 72, HARD: 18, BEAUTIFUL: 64, CLEVER: 21 },
      userReacted: [],
      userLiked: false,
      scores: [
        { id: "s4", userId: "u_nova", username: "nova_pixel", score: 280, verified: true, createdAt: "1h ago" },
        { id: "s5", userId: "u_kazu", username: "kazu_dev", score: 260, verified: true, createdAt: "4h ago" },
      ],
      versions: [
        { id: "v3", number: 1, label: "v1.0 Launch", createdAt: "3d ago", projectData: coinRushDoc },
      ],
      deathsByCell: {
        "room_1:13,6": 19,
        "room_1:8,9": 12,
      },
      createdAt: "2026-11-09T15:00:00Z",
      updatedAt: "2026-11-11T11:00:00Z",
    },
    {
      id: "g_maze",
      slug: "pocket-labyrinth-89",
      title: mazeDoc.title,
      description: mazeDoc.description,
      type: "FORGE_STUDIO",
      status: "PUBLISHED",
      revision: 2,
      unlistedToken: "tok_maze_303",
      authorId: "u_byte",
      authorUsername: "byte_witch",
      authorAvatarColor: "#FFC53D",
      tags: mazeDoc.tags,
      lengthBucket: "<2m",
      controlsGuide: "WASD / Arrows • Dodge floor spikes & patrol guards to reach the bottom-right exit",
      playCount: 245,
      completionCount: 134,
      likeCount: 87,
      remixCount: 9,
      trendScore: computeTrendScore(
        [{ ageHours: 6, uniquePlays: 26, completions: 16, likes: 10, remixes: 2 }],
        245,
        87
      ),
      featured: false,
      remixAllowed: true,
      projectData: mazeDoc,
      reactions: { FUN: 41, HARD: 53, BEAUTIFUL: 49, CLEVER: 62 },
      userReacted: [],
      userLiked: false,
      scores: [
        { id: "s6", userId: "u_byte", username: "byte_witch", score: 60, verified: true, createdAt: "3h ago" },
      ],
      versions: [
        { id: "v4", number: 1, label: "DMG Green Release", createdAt: "2d ago", projectData: mazeDoc },
      ],
      deathsByCell: {
        "room_1:6,8": 27,
        "room_1:10,6": 21,
      },
      createdAt: "2026-11-09T19:00:00Z",
      updatedAt: "2026-11-10T20:00:00Z",
    },
    {
      id: "g_keydoor",
      slug: "twin-lock-fortress",
      title: keyDoorDoc.title,
      description: keyDoorDoc.description,
      type: "FORGE_STUDIO",
      status: "PUBLISHED",
      revision: 2,
      unlistedToken: "tok_fort_404",
      authorId: "u_byte",
      authorUsername: "byte_witch",
      authorAvatarColor: "#FFC53D",
      tags: keyDoorDoc.tags,
      lengthBucket: "<2m",
      controlsGuide: "WASD / Arrows • Grab the northwest key while dodging turret fire, then unlock the northeast vault",
      playCount: 189,
      completionCount: 98,
      likeCount: 64,
      remixCount: 7,
      trendScore: computeTrendScore(
        [{ ageHours: 9, uniquePlays: 22, completions: 12, likes: 9, remixes: 1 }],
        189,
        64
      ),
      featured: false,
      remixAllowed: true,
      remixedFromId: "g_dungeon",
      remixedFromTitle: "Crypt of the Golden Key",
      remixedFromAuthor: "nova_pixel",
      projectData: keyDoorDoc,
      reactions: { FUN: 33, HARD: 44, BEAUTIFUL: 27, CLEVER: 58 },
      userReacted: [],
      userLiked: false,
      scores: [
        { id: "s7", userId: "u_nova", username: "nova_pixel", score: 100, verified: true, createdAt: "6h ago" },
      ],
      versions: [
        { id: "v5", number: 1, label: "Turret Fortress v1", createdAt: "1d ago", projectData: keyDoorDoc },
      ],
      deathsByCell: {
        "room_1:9,3": 18,
      },
      createdAt: "2026-11-10T10:00:00Z",
      updatedAt: "2026-11-11T08:00:00Z",
    },
    {
      id: "g_waves",
      slug: "survive-the-crimson-waves",
      title: wavesDoc.title,
      description: wavesDoc.description,
      type: "FORGE_STUDIO",
      status: "PUBLISHED",
      revision: 1,
      unlistedToken: "tok_wave_505",
      authorId: "u_nova",
      authorUsername: "nova_pixel",
      authorAvatarColor: "#FF4D8D",
      tags: wavesDoc.tags,
      lengthBucket: "2-5m",
      controlsGuide: "WASD / Arrows • Survive aimed projectiles & chasers until your score reaches 60!",
      playCount: 276,
      completionCount: 112,
      likeCount: 91,
      remixCount: 11,
      trendScore: computeTrendScore(
        [{ ageHours: 3, uniquePlays: 31, completions: 14, likes: 13, remixes: 2 }],
        276,
        91
      ),
      featured: false,
      remixAllowed: true,
      projectData: wavesDoc,
      reactions: { FUN: 67, HARD: 79, BEAUTIFUL: 38, CLEVER: 29 },
      userReacted: [],
      userLiked: false,
      scores: [
        { id: "s8", userId: "u_kazu", username: "kazu_dev", score: 85, verified: true, createdAt: "30m ago" },
        { id: "s9", userId: "u_nova", username: "nova_pixel", score: 70, verified: true, createdAt: "2h ago" },
      ],
      versions: [
        { id: "v6", number: 1, label: "Crimson Arena v1", createdAt: "1d ago", projectData: wavesDoc },
      ],
      deathsByCell: {
        "room_1:10,7": 25,
        "room_1:10,4": 19,
      },
      createdAt: "2026-11-10T16:00:00Z",
      updatedAt: "2026-11-11T12:00:00Z",
    },
    {
      id: "g_starfield_html5",
      slug: "starfield-hyperdrive-html5",
      title: "Starfield Hyperdrive (HTML5 Bundle)",
      description:
        "Uploaded HTML5 Canvas space dodger running inside an isolated sandboxed iframe with postMessage score bridge.",
      type: "HTML5_BUNDLE",
      status: "PUBLISHED",
      revision: 1,
      unlistedToken: "tok_star_606",
      authorId: "u_kazu",
      authorUsername: "kazu_dev",
      authorAvatarColor: "#37E6C4",
      tags: ["Arcade", "Shooter", "Upload"],
      lengthBucket: "<2m",
      controlsGuide: "WASD / Arrow Keys to steer ship • Collect teal crystals, dodge red meteors • R to restart",
      playCount: 198,
      completionCount: 64,
      likeCount: 57,
      remixCount: 0,
      trendScore: computeTrendScore(
        [{ ageHours: 5, uniquePlays: 21, completions: 8, likes: 7, remixes: 0 }],
        198,
        57
      ),
      featured: false,
      remixAllowed: false,
      htmlBundleSrcDoc: STARFIELD_HTML5_BUNDLE,
      bundleFileList: ["index.html", "game.js", "styles.css", "sprites/ship.png"],
      reactions: { FUN: 48, HARD: 31, BEAUTIFUL: 29, CLEVER: 19 },
      userReacted: [],
      userLiked: false,
      scores: [
        { id: "s10", userId: "u_kazu", username: "kazu_dev", score: 245, verified: false, createdAt: "1h ago" },
        { id: "s11", userId: "u_nova", username: "nova_pixel", score: 190, verified: false, createdAt: "4h ago" },
      ],
      versions: [],
      deathsByCell: {},
      createdAt: "2026-11-10T21:00:00Z",
      updatedAt: "2026-11-11T14:00:00Z",
    },
  ];
}

export const INITIAL_JAMS: JamRecord[] = [
  {
    id: "jam_1",
    slug: "forge-jam-1-beneath-the-surface",
    title: "Forge Jam #1: Beneath the Surface",
    theme: "Beneath the Surface",
    description:
      "Build a top-down dungeon, cavern, or deep-sea exploration game using Forge Studio! Entries are frozen at submission time and ranked via Bayesian shrinkage across Fun, Creativity, and Theme Use.",
    status: "ACTIVE",
    startsAt: "2026-11-08T18:00:00Z",
    submissionsEndAt: "2026-11-15T18:00:00Z",
    votingEndsAt: "2026-11-19T18:00:00Z",
    entries: [
      {
        id: "je_1",
        jamId: "jam_1",
        gameId: "g_dungeon",
        gameSlug: "crypt-of-the-golden-key",
        gameTitle: "Crypt of the Golden Key",
        authorUsername: "nova_pixel",
        frozenVersionNumber: 2,
        submittedAt: "2026-11-09T14:00:00Z",
        ratings: [
          { raterUsername: "kazu_dev", fun: 5, creativity: 5, theme: 5 },
          { raterUsername: "byte_witch", fun: 5, creativity: 4, theme: 5 },
          { raterUsername: "pixel_fan", fun: 4, creativity: 5, theme: 5 },
          { raterUsername: "retro_max", fun: 5, creativity: 5, theme: 4 },
          { raterUsername: "chip_hero", fun: 5, creativity: 4, theme: 5 },
        ],
      },
      {
        id: "je_2",
        jamId: "jam_1",
        gameId: "g_maze",
        gameSlug: "pocket-labyrinth-89",
        gameTitle: "Pocket Labyrinth 89",
        authorUsername: "byte_witch",
        frozenVersionNumber: 1,
        submittedAt: "2026-11-10T11:30:00Z",
        ratings: [
          { raterUsername: "nova_pixel", fun: 4, creativity: 5, theme: 4 },
          { raterUsername: "kazu_dev", fun: 5, creativity: 4, theme: 4 },
          { raterUsername: "retro_max", fun: 4, creativity: 5, theme: 5 },
          { raterUsername: "chip_hero", fun: 4, creativity: 4, theme: 4 },
          { raterUsername: "arcade_ace", fun: 5, creativity: 4, theme: 4 },
        ],
      },
      {
        id: "je_3",
        jamId: "jam_1",
        gameId: "g_keydoor",
        gameSlug: "twin-lock-fortress",
        gameTitle: "Twin Lock Fortress",
        authorUsername: "byte_witch",
        frozenVersionNumber: 1,
        submittedAt: "2026-11-11T08:15:00Z",
        ratings: [
          { raterUsername: "nova_pixel", fun: 5, creativity: 5, theme: 4 },
          { raterUsername: "kazu_dev", fun: 4, creativity: 4, theme: 4 },
        ],
      },
    ],
  },
];

export { computeJamBayesianScore };
