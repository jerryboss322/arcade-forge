// ForgeSpace Virtual Office Floor Map Specification & Presets
// 40 x 26 tilemap (16x16px per tile = 640x416 world space)
// Designed for responsive dynamic camera tracking and zero-cost WebRTC proximity mesh.

export interface SpaceZone {
  id: string;
  name: string;
  description: string;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isPrivate: boolean; // Soundproof audio isolation
}

export interface InteractiveObject {
  id: string;
  kind: "radio" | "desk" | "coffee" | "whiteboard" | "watercooler" | "screen";
  name: string;
  x: number;
  y: number;
  data?: Record<string, any>;
}

export interface OfficeTilemap {
  cols: number;
  rows: number;
  ground: number[]; // Tile ID per cell (0 = empty, 1..N)
  walls: boolean[]; // Collision mask (true = impassable wall/furniture)
  zones: SpaceZone[];
  objects: InteractiveObject[];
}

export const OFFICE_ZONES: SpaceZone[] = [
  {
    id: "reception",
    name: "Lobby & Reception",
    description: "Welcome area with visitor lounge and guest check-in.",
    color: "#37E6C4",
    x1: 2,
    y1: 18,
    x2: 14,
    y2: 24,
    isPrivate: false,
  },
  {
    id: "open_desks",
    name: "Open Workstation Hub",
    description: "Main team area with dual-monitor pods and quiet focus desks.",
    color: "#00A8FF",
    x1: 2,
    y1: 2,
    x2: 23,
    y2: 16,
    isPrivate: false,
  },
  {
    id: "conf_boardroom",
    name: "Glass Boardroom",
    description: "Soundproof glass conference room. Only people inside can hear.",
    color: "#FF4D8D",
    x1: 25,
    y1: 2,
    x2: 38,
    y2: 12,
    isPrivate: true,
  },
  {
    id: "conf_huddle",
    name: "War Room & Brainstorm",
    description: "Private huddle room with collaborative whiteboard.",
    color: "#B84DFF",
    x1: 25,
    y1: 14,
    x2: 38,
    y2: 20,
    isPrivate: true,
  },
  {
    id: "lounge_breakroom",
    name: "Lo-Fi Lounge & Cafe",
    description: "Grab espresso, relax to lo-fi beats, or have casual conversations.",
    color: "#FFC53D",
    x1: 16,
    y1: 18,
    x2: 24,
    y2: 24,
    isPrivate: false,
  },
];

export const OFFICE_OBJECTS: InteractiveObject[] = [
  // Lo-Fi Lounge Radio
  {
    id: "obj_radio",
    kind: "radio",
    name: "Lo-Fi Focus Radio",
    x: 20,
    y: 19,
    data: { currentTrack: "chill-study", title: "Lo-Fi Focus Radio" },
  },
  // Espresso machine
  {
    id: "obj_coffee",
    kind: "coffee",
    name: "Espresso Bar",
    x: 17,
    y: 19,
    data: { boostDurationSec: 20 },
  },
  // Watercooler
  {
    id: "obj_watercooler",
    kind: "watercooler",
    name: "Water Cooler",
    x: 13,
    y: 19,
  },
  // Whiteboard in War Room
  {
    id: "obj_whiteboard",
    kind: "whiteboard",
    name: "Team Whiteboard",
    x: 32,
    y: 14,
  },
  // Boardroom presentation screen
  {
    id: "obj_screen",
    kind: "screen",
    name: "Main Presentation Screen",
    x: 31,
    y: 3,
  },
  // Workstation Desks
  { id: "desk_1", kind: "desk", name: "Pod 1 - Desk A", x: 5, y: 5, data: { claimedBy: null } },
  { id: "desk_2", kind: "desk", name: "Pod 1 - Desk B", x: 7, y: 5, data: { claimedBy: null } },
  { id: "desk_3", kind: "desk", name: "Pod 1 - Desk C", x: 5, y: 8, data: { claimedBy: null } },
  { id: "desk_4", kind: "desk", name: "Pod 1 - Desk D", x: 7, y: 8, data: { claimedBy: null } },
  { id: "desk_5", kind: "desk", name: "Pod 2 - Desk E", x: 13, y: 5, data: { claimedBy: null } },
  { id: "desk_6", kind: "desk", name: "Pod 2 - Desk F", x: 15, y: 5, data: { claimedBy: null } },
  { id: "desk_7", kind: "desk", name: "Pod 2 - Desk G", x: 13, y: 8, data: { claimedBy: null } },
  { id: "desk_8", kind: "desk", name: "Pod 2 - Desk H", x: 15, y: 8, data: { claimedBy: null } },
  { id: "desk_9", kind: "desk", name: "Pod 3 - Desk I", x: 5, y: 13, data: { claimedBy: null } },
  { id: "desk_10", kind: "desk", name: "Pod 3 - Desk J", x: 7, y: 13, data: { claimedBy: null } },
  { id: "desk_11", kind: "desk", name: "Pod 3 - Desk K", x: 13, y: 13, data: { claimedBy: null } },
  { id: "desk_12", kind: "desk", name: "Pod 3 - Desk L", x: 15, y: 13, data: { claimedBy: null } },
];

/**
 * Tile Types:
 * 0: Exterior dark border
 * 1: Open office light hardwood
 * 2: Office carpet tile
 * 3: Boardroom dark walnut floor
 * 4: War room industrial teal carpet
 * 5: Breakroom checkered tile
 * 6: Outer wall drywall
 * 7: Glass partition wall
 * 8: Interior dividing wall
 * 9: Desk surface
 * 10: Swivel chair
 * 11: Boardroom table
 * 12: Plant / Fiddle Leaf Fig
 * 13: Arcade Cabinet
 * 14: Espresso Bar
 * 15: Water Cooler
 * 16: Whiteboard
 */
export const TILE_COLORS: Record<number, string> = {
  0: "#080910", // Exterior
  1: "#1E2238", // Light hardwood / office slate
  2: "#16192E", // Carpet
  3: "#261A2E", // Boardroom luxury floor
  4: "#122A30", // War room teal carpet
  5: "#20283A", // Breakroom tile A
  6: "#3A3F66", // Outer wall
  7: "#37E6C488", // Glass wall
  8: "#2A2E4D", // Interior partition
  9: "#4E5482", // Desk surface
  10: "#00A8FF", // Chair
  11: "#5A3825", // Boardroom table
  12: "#27AE60", // Plant
  13: "#FF0055", // Arcade Cabinet
  14: "#FF7A00", // Espresso Bar
  15: "#37E6C4", // Watercooler
  16: "#EDEEFF", // Whiteboard
};

export function createDefaultOfficeMap(): OfficeTilemap {
  const cols = 40;
  const rows = 26;
  const total = cols * rows;
  const ground = new Array<number>(total).fill(0);
  const walls = new Array<boolean>(total).fill(false);

  // Helper to index
  const idx = (c: number, r: number) => r * cols + c;

  // 1. Build Outer Walls
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (c <= 1 || c >= cols - 2 || r <= 1 || r >= rows - 2) {
        ground[idx(c, r)] = 6;
        walls[idx(c, r)] = true;
      } else {
        // Default open office floor
        ground[idx(c, r)] = 1;
      }
    }
  }

  // 2. Zone Floor Styling
  for (const zone of OFFICE_ZONES) {
    let tileId = 1;
    if (zone.id === "conf_boardroom") tileId = 3;
    else if (zone.id === "conf_huddle") tileId = 4;
    else if (zone.id === "lounge_breakroom") tileId = 5;
    else if (zone.id === "reception") tileId = 2;

    for (let r = zone.y1; r <= zone.y2; r++) {
      for (let c = zone.x1; c <= zone.x2; c++) {
        if (c > 1 && c < cols - 2 && r > 1 && r < rows - 2) {
          ground[idx(c, r)] = tileId;
        }
      }
    }
  }

  // 3. Partition Walls
  // Vertical glass wall separating open office from meeting wing (col 24)
  for (let r = 2; r <= 20; r++) {
    // Doorway openings at r=7 and r=17
    if (r !== 7 && r !== 17) {
      ground[idx(24, r)] = 7; // Glass wall
      walls[idx(24, r)] = true;
    }
  }

  // Horizontal wall separating Boardroom and War Room (row 13, cols 24..cols-2)
  for (let c = 24; c < cols - 2; c++) {
    ground[idx(c, 13)] = 8;
    walls[idx(c, 13)] = true;
  }

  // Wall separating open desks from reception / breakroom (row 17, cols 2..24)
  for (let c = 2; c <= 24; c++) {
    // Walkway gaps at c=9 and c=19
    if (c !== 9 && c !== 10 && c !== 19 && c !== 20) {
      ground[idx(c, 17)] = 8;
      walls[idx(c, 17)] = true;
    }
  }

  // 4. Boardroom Large Table (cols 29..34, rows 6..8)
  for (let r = 6; r <= 8; r++) {
    for (let c = 29; c <= 34; c++) {
      ground[idx(c, r)] = 11;
      walls[idx(c, r)] = true;
    }
  }

  // 5. Place Interactive Objects & Furniture into Collision Map
  for (const obj of OFFICE_OBJECTS) {
    let t = 9;
    if (obj.kind === "radio") t = 13;
    else if (obj.kind === "coffee") t = 14;
    else if (obj.kind === "watercooler") t = 15;
    else if (obj.kind === "whiteboard") t = 16;
    else if (obj.kind === "desk") t = 9;
    else if (obj.kind === "screen") t = 16;

    ground[idx(obj.x, obj.y)] = t;
    walls[idx(obj.x, obj.y)] = true;

    // Desks have adjacent chairs
    if (obj.kind === "desk") {
      ground[idx(obj.x, obj.y + 1)] = 10; // chair
    }
  }

  // Plants in corners
  const plantCoords = [
    [3, 3],
    [22, 3],
    [3, 15],
    [22, 15],
    [26, 3],
    [37, 3],
    [26, 15],
    [37, 15],
    [3, 19],
    [14, 19],
    [23, 23],
  ];
  for (const coord of plantCoords) {
    const pc = coord[0]!;
    const pr = coord[1]!;
    ground[idx(pc, pr)] = 12;
    walls[idx(pc, pr)] = true;
  }

  return { cols, rows, ground, walls, zones: OFFICE_ZONES, objects: OFFICE_OBJECTS };
}

/**
 * Resolves which named Zone a given coordinate is located in.
 */
export function getZoneAt(x: number, y: number, zones: SpaceZone[] = OFFICE_ZONES): SpaceZone | null {
  for (const z of zones) {
    if (x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2) {
      return z;
    }
  }
  return null;
}

/**
 * Breadth-First-Search (BFS) Pathfinding for Tap-to-Move on Mobile and Desktop.
 * Returns array of [col, row] points to step through.
 */
export function findPath(
  startCol: number,
  startRow: number,
  targetCol: number,
  targetRow: number,
  walls: boolean[],
  cols: number,
  rows: number
): [number, number][] {
  // If clicked directly on a wall or same spot, target nearest neighbor
  const startIdx = startRow * cols + startCol;
  const targetIdx = targetRow * cols + targetCol;

  if (startCol === targetCol && startRow === targetRow) return [];

  // If destination is a wall, look for adjacent free tile
  let actualTargetCol = targetCol;
  let actualTargetRow = targetRow;
  if (walls[targetIdx]) {
    const candidates: [number, number][] = [
      [targetCol, targetRow + 1],
      [targetCol, targetRow - 1],
      [targetCol + 1, targetRow],
      [targetCol - 1, targetRow],
    ];
    let found = false;
    for (const [cx, cy] of candidates) {
      if (cx >= 0 && cx < cols && cy >= 0 && cy < rows && !walls[cy * cols + cx]) {
        actualTargetCol = cx;
        actualTargetRow = cy;
        found = true;
        break;
      }
    }
    if (!found) return [];
  }

  const queue: [number, number][] = [[startCol, startRow]];
  const visited = new Uint8Array(cols * rows);
  const parent = new Int32Array(cols * rows).fill(-1);

  visited[startIdx] = 1;

  let reached = false;
  const dirs: [number, number][] = [
    [0, -1], // up
    [0, 1],  // down
    [-1, 0], // left
    [1, 0],  // right
  ];

  while (queue.length > 0) {
    const head = queue.shift();
    if (!head) break;
    const [c, r] = head;
    if (c === actualTargetCol && r === actualTargetRow) {
      reached = true;
      break;
    }

    for (const [dc, dr] of dirs) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
        const nIdx = nr * cols + nc;
        if (!visited[nIdx] && !walls[nIdx]) {
          visited[nIdx] = 1;
          parent[nIdx] = r * cols + c;
          queue.push([nc, nr]);
        }
      }
    }
  }

  if (!reached) return [];

  // Reconstruct path
  const path: [number, number][] = [];
  let curr = actualTargetRow * cols + actualTargetCol;
  while (curr !== startIdx && curr !== -1) {
    const pc = curr % cols;
    const pr = Math.floor(curr / cols);
    path.unshift([pc, pr]);
    const nextParent = parent[curr];
    if (nextParent === undefined || nextParent === -1) break;
    curr = nextParent;
  }

  return path;
}
