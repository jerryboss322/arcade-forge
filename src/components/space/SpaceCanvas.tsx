"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  OfficeTilemap,
  OFFICE_ZONES,
  TILE_COLORS,
  getZoneAt,
  findPath,
  SpaceZone,
  InteractiveObject,
} from "@/lib/space/officeMap";
import { PeerState } from "@/lib/space/signaling";
import { screenPositionsStore, ScreenPosition } from "@/lib/space/screenPositionsStore";

interface SpaceCanvasProps {
  map: OfficeTilemap;
  localPeer: PeerState;
  remotePeers: PeerState[];
  speakingMap: Record<string, boolean>; // peerId -> isSpeaking
  onMove: (x: number, y: number, dir: PeerState["dir"], isMoving: boolean, zoneId: string) => void;
  onInteract: (obj: InteractiveObject) => void;
  onAvatarClick?: (peer: PeerState) => void;
  onScreenPositionUpdate?: (positions: Record<string, ScreenPosition>) => void;
}

export function SpaceCanvas({
  map,
  localPeer,
  remotePeers,
  speakingMap,
  onMove,
  onInteract,
  onAvatarClick,
  onScreenPositionUpdate,
}: SpaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Latest-value refs so the 2D loop never tears down on peer/prop updates
  const localPeerRef = useRef(localPeer);
  const remotePeersRef = useRef(remotePeers);
  const speakingMapRef = useRef(speakingMap);
  const onMoveRef = useRef(onMove);
  const onInteractRef = useRef(onInteract);
  const onScreenPosRef = useRef(onScreenPositionUpdate);
  const nearbyObjectRef = useRef<InteractiveObject | null>(null);
  const activeZoneIdRef = useRef<string | null>(null);

  // Position state (in tile coordinates with smooth interpolation)
  const posRef = useRef({
    x: localPeer.x,
    y: localPeer.y,
    pixelX: localPeer.x * 16,
    pixelY: localPeer.y * 16,
    dir: localPeer.dir,
    isMoving: false,
    speed: 2.2, // pixels per frame
  });

  // Camera state
  const cameraRef = useRef({
    x: localPeer.x * 16 + 8,
    y: localPeer.y * 16 + 8,
    zoom: 3,
  });

  // Pathfinding waypoint queue
  const pathRef = useRef<[number, number][]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const [nearbyObject, setNearbyObject] = useState<InteractiveObject | null>(null);
  const [activeZone, setActiveZone] = useState<SpaceZone | null>(null);

  useEffect(() => {
    // Handle external warp / quick-jump button (> 2.5 tiles delta from local loop)
    const dist = Math.hypot(localPeer.x - posRef.current.x, localPeer.y - posRef.current.y);
    if (dist > 2.5) {
      posRef.current.x = localPeer.x;
      posRef.current.y = localPeer.y;
      posRef.current.pixelX = localPeer.x * 16;
      posRef.current.pixelY = localPeer.y * 16;
      posRef.current.dir = localPeer.dir;
      pathRef.current = [];
    }
    localPeerRef.current = localPeer;
  }, [localPeer]);

  useEffect(() => {
    remotePeersRef.current = remotePeers;
  }, [remotePeers]);

  useEffect(() => {
    speakingMapRef.current = speakingMap;
  }, [speakingMap]);

  useEffect(() => {
    onMoveRef.current = onMove;
    onInteractRef.current = onInteract;
    onScreenPosRef.current = onScreenPositionUpdate;
  }, [onMove, onInteract, onScreenPositionUpdate]);

  // Keyboard listeners (bound once via refs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      keysRef.current[e.code] = true;

      // Interaction trigger: E or Space or Enter
      if ((e.code === "KeyE" || e.code === "Space" || e.code === "Enter") && nearbyObjectRef.current) {
        e.preventDefault();
        onInteractRef.current(nearbyObjectRef.current);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Handle Canvas Click or Tap for BFS Pathfinding
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (!e.touches || e.touches.length === 0 || !e.touches[0]) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;

    // Convert screen coordinates to world coordinates using camera offset and zoom
    const zoom = cameraRef.current.zoom;
    const worldX = (clickX - canvas.width / 2) / zoom + cameraRef.current.x;
    const worldY = (clickY - canvas.height / 2) / zoom + cameraRef.current.y;

    const targetCol = Math.floor(worldX / 16);
    const targetRow = Math.floor(worldY / 16);

    const startCol = Math.round(posRef.current.pixelX / 16);
    const startRow = Math.round(posRef.current.pixelY / 16);

    if (
      targetCol >= 0 &&
      targetCol < map.cols &&
      targetRow >= 0 &&
      targetRow < map.rows
    ) {
      const path = findPath(
        startCol,
        startRow,
        targetCol,
        targetRow,
        map.walls,
        map.cols,
        map.rows
      );
      if (path.length > 0) {
        pathRef.current = path;
      }
    }
  };

  // Main 60Hz Render & Game Loop (mounted once per map)
  useEffect(() => {
    let animId: number;
    let tick = 0;
    let lastMoveSent = {
      x: localPeerRef.current.x,
      y: localPeerRef.current.y,
      dir: localPeerRef.current.dir,
      isMoving: false,
      zoneId: "open_desks",
      at: 0,
    };

    const loop = () => {
      animId = requestAnimationFrame(loop);
      if (document.hidden) return;

      tick++;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Responsive Canvas Sizing & Integer Zoom
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
      }

      // Compute ideal zoom level:
      // Mobile (<640): 2x
      // Tablet (<1024): 2.5x
      // Desktop: 3x or 4x
      let targetZoom = 3;
      if (displayWidth < 640) targetZoom = 2;
      else if (displayWidth < 1024) targetZoom = 2.5;
      else if (displayWidth >= 1600) targetZoom = 3.5;
      cameraRef.current.zoom = targetZoom * dpr;

      // 2. Movement Logic
      const pos = posRef.current;
      let vx = 0;
      let vy = 0;

      const keys = keysRef.current;
      if (keys["KeyW"] || keys["ArrowUp"]) vy -= 1;
      if (keys["KeyS"] || keys["ArrowDown"]) vy += 1;
      if (keys["KeyA"] || keys["ArrowLeft"]) vx -= 1;
      if (keys["KeyD"] || keys["ArrowRight"]) vx += 1;

      // If manual keys are pressed, cancel click pathfinding
      if (vx !== 0 || vy !== 0) {
        pathRef.current = [];
        if (vx < 0) pos.dir = "left";
        else if (vx > 0) pos.dir = "right";
        else if (vy < 0) pos.dir = "up";
        else if (vy > 0) pos.dir = "down";

        // Normalize diagonal
        if (vx !== 0 && vy !== 0) {
          vx *= 0.7071;
          vy *= 0.7071;
        }

        const nextPx = pos.pixelX + vx * pos.speed;
        const nextPy = pos.pixelY + vy * pos.speed;

        // Collision check with walls (bounding box 12x12 inside 16x16)
        const canMoveX = !checkCollision(nextPx, pos.pixelY, map);
        const canMoveY = !checkCollision(pos.pixelX, nextPy, map);

        if (canMoveX) pos.pixelX = nextPx;
        if (canMoveY) pos.pixelY = nextPy;

        pos.isMoving = vx !== 0 || vy !== 0;
      } else if (pathRef.current.length > 0 && pathRef.current[0]) {
        // Follow Pathfinding Waypoints
        const [nextCol, nextRow] = pathRef.current[0];
        const targetPx = nextCol * 16;
        const targetPy = nextRow * 16;

        const dx = targetPx - pos.pixelX;
        const dy = targetPy - pos.pixelY;
        const dist = Math.hypot(dx, dy);

        if (dist <= pos.speed) {
          pos.pixelX = targetPx;
          pos.pixelY = targetPy;
          pathRef.current.shift();
          if (pathRef.current.length === 0) {
            pos.isMoving = false;
          }
        } else {
          pos.isMoving = true;
          const stepX = (dx / dist) * pos.speed;
          const stepY = (dy / dist) * pos.speed;
          pos.pixelX += stepX;
          pos.pixelY += stepY;

          if (Math.abs(dx) > Math.abs(dy)) {
            pos.dir = dx > 0 ? "right" : "left";
          } else {
            pos.dir = dy > 0 ? "down" : "up";
          }
        }
      } else {
        pos.isMoving = false;
      }

      // Update tile coordinate
      const currentTileX = Math.round(pos.pixelX / 16);
      const currentTileY = Math.round(pos.pixelY / 16);
      pos.x = currentTileX;
      pos.y = currentTileY;

      // Check current zone (only update React state when zone ID actually changes)
      const curZone = getZoneAt(currentTileX, currentTileY, map.zones);
      const curZoneId = curZone?.id || "open_desks";
      if ((curZone?.id ?? null) !== activeZoneIdRef.current) {
        activeZoneIdRef.current = curZone?.id ?? null;
        setActiveZone(curZone);
      }

      // Emit movement updates only on state change, throttled (~10Hz while walking, immediate on stop)
      const now = performance.now();
      const moveChanged =
        currentTileX !== lastMoveSent.x ||
        currentTileY !== lastMoveSent.y ||
        pos.dir !== lastMoveSent.dir ||
        pos.isMoving !== lastMoveSent.isMoving ||
        curZoneId !== lastMoveSent.zoneId;

      if (moveChanged && (!pos.isMoving || now - lastMoveSent.at >= 95)) {
        lastMoveSent = {
          x: currentTileX,
          y: currentTileY,
          dir: pos.dir,
          isMoving: pos.isMoving,
          zoneId: curZoneId,
          at: now,
        };
        onMoveRef.current(currentTileX, currentTileY, pos.dir, pos.isMoving, curZoneId);
      }

      // Check proximity to interactive objects (< 1.8 tiles distance)
      let closestObj: InteractiveObject | null = null;
      for (const obj of map.objects) {
        const dist = Math.hypot(obj.x - currentTileX, obj.y - currentTileY);
        if (dist <= 1.8) {
          closestObj = obj;
          break;
        }
      }
      if ((closestObj?.id ?? null) !== (nearbyObjectRef.current?.id ?? null)) {
        nearbyObjectRef.current = closestObj;
        setNearbyObject(closestObj);
      }

      // 3. Smooth Camera Follow
      const camera = cameraRef.current;
      const targetCamX = pos.pixelX + 8;
      const targetCamY = pos.pixelY + 8;
      camera.x += (targetCamX - camera.x) * 0.12;
      camera.y += (targetCamY - camera.y) * 0.12;

      // 4. Rendering
      ctx.save();
      ctx.imageSmoothingEnabled = false;

      // Dark background
      ctx.fillStyle = "#0B0C14";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Center camera transformation
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

      // Draw Floor & Walls
      drawOfficeFloor(ctx, map, tick, curZone);

      // Draw BFS Path destination marker & dots if walking
      if (pathRef.current.length > 0) {
        drawPathTrail(ctx, pathRef.current, tick);
      }

      // Draw Interactive Objects (with glowing outlines/icons)
      drawObjects(ctx, map.objects, tick, closestObj);

      const curLocal = localPeerRef.current;
      const curRemotes = remotePeersRef.current;
      const curSpeaking = speakingMapRef.current;

      // Draw Remote Coworkers
      for (const peer of curRemotes) {
        const isSpeaking = !!curSpeaking[peer.id];
        drawAvatar(ctx, peer.x * 16, peer.y * 16, peer.avatarColor, peer.dir, peer.isMoving, tick, isSpeaking, peer.name, peer.status, false);
      }

      // Draw Local Player Avatar
      const localSpeaking = !!curSpeaking["local"];
      drawAvatar(
        ctx,
        Math.round(pos.pixelX),
        Math.round(pos.pixelY),
        curLocal.avatarColor,
        pos.dir,
        pos.isMoving,
        tick,
        localSpeaking,
        curLocal.name + " (You)",
        curLocal.status,
        true
      );

      ctx.restore();

      // 5. Push screen positions for floating video bubbles directly to zero-rerender DOM store
      const screenPositions: Record<string, ScreenPosition> = {};
      const allPeers = [curLocal, ...curRemotes];

      for (const p of allPeers) {
        const worldPx = p.id === curLocal.id ? pos.pixelX + 8 : p.x * 16 + 8;
        const worldPy = p.id === curLocal.id ? pos.pixelY + 8 : p.y * 16 + 8;

        const screenX = (worldPx - camera.x) * (camera.zoom / dpr) + displayWidth / 2;
        const screenY = (worldPy - camera.y) * (camera.zoom / dpr) + displayHeight / 2;

        const inView = screenX >= -50 && screenX <= displayWidth + 50 && screenY >= -50 && screenY <= displayHeight + 50;
        screenPositions[p.id] = { screenX, screenY, inView };
      }
      screenPositionsStore.update(screenPositions);
      onScreenPosRef.current?.(screenPositions);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [map]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none bg-[#0B0C14]">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onTouchStart={handleCanvasClick}
        className="w-full h-full cursor-pointer block"
      />

      {/* Floating Interaction Prompt */}
      {nearbyObject && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-bounce">
          <div className="px-4 py-2 bg-surface border-2 border-accent rounded-control shadow-arcade flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-accent text-bg font-display text-xs font-bold flex items-center justify-center">
              E
            </span>
            <span className="text-text font-display text-sm tracking-wide">
              {nearbyObject.kind === "radio" && "Tune Lo-Fi Radio"}
              {nearbyObject.kind === "coffee" && "Brew Boost Espresso"}
              {nearbyObject.kind === "desk" && `Claim ${nearbyObject.name}`}
              {nearbyObject.kind === "whiteboard" && "Open Team Whiteboard"}
              {nearbyObject.kind === "watercooler" && "Drink Water & Chat"}
              {nearbyObject.kind === "screen" && "View Presentation"}
            </span>
          </div>
        </div>
      )}

      {/* Current Zone Badge */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="px-3 py-1.5 bg-surface/90 backdrop-blur-sm border border-border rounded-control shadow-sm flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: activeZone?.color || "#37E6C4" }}
          />
          <div className="flex flex-col">
            <span className="text-xs font-display text-text font-semibold">
              {activeZone?.name || "Open Floor"}
            </span>
            {activeZone?.isPrivate && (
              <span className="text-[10px] text-accent font-mono">
                🔒 Soundproof Room
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Bounding box collision check
function checkCollision(pixelX: number, pixelY: number, map: OfficeTilemap): boolean {
  // Check 4 bounding box points
  const points: [number, number][] = [
    [pixelX + 2, pixelY + 4],
    [pixelX + 13, pixelY + 4],
    [pixelX + 2, pixelY + 15],
    [pixelX + 13, pixelY + 15],
  ];

  for (const [px, py] of points) {
    const col = Math.floor(px / 16);
    const row = Math.floor(py / 16);
    if (col < 0 || col >= map.cols || row < 0 || row >= map.rows) return true;
    if (map.walls[row * map.cols + col]) return true;
  }
  return false;
}

// Draw Floor Tiles & Walls
function drawOfficeFloor(
  ctx: CanvasRenderingContext2D,
  map: OfficeTilemap,
  tick: number,
  curZone: SpaceZone | null
): void {
  for (let r = 0; r < map.rows; r++) {
    for (let c = 0; c < map.cols; c++) {
      const idx = r * map.cols + c;
      const tileId = map.ground[idx] ?? 0;
      const color = TILE_COLORS[tileId] || "#1E2238";

      ctx.fillStyle = color;
      ctx.fillRect(c * 16, r * 16, 16, 16);

      // Subtle grid line / parquet lines
      if (tileId === 1) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
        ctx.fillRect(c * 16, r * 16, 16, 1);
      } else if (tileId === 5) {
        // Checkered breakroom tile
        if ((r + c) % 2 === 0) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
          ctx.fillRect(c * 16, r * 16, 16, 16);
        }
      } else if (tileId === 7) {
        // Glass wall with subtle reflection highlight
        ctx.fillStyle = "rgba(55, 230, 196, 0.25)";
        ctx.fillRect(c * 16, r * 16, 16, 16);
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(c * 16 + 2, r * 16 + 2, 2, 12);
      } else if (tileId === 6 || tileId === 8) {
        // Solid wall top highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.fillRect(c * 16, r * 16, 16, 2);
      }
    }
  }

  // Draw zone demarcation outlines
  for (const z of map.zones) {
    const isCurrent = curZone?.id === z.id;
    ctx.strokeStyle = isCurrent ? z.color : "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = isCurrent ? 1.5 : 1;
    ctx.strokeRect(z.x1 * 16, z.y1 * 16, (z.x2 - z.x1 + 1) * 16, (z.y2 - z.y1 + 1) * 16);

    // Subtle zone name label
    ctx.fillStyle = isCurrent ? z.color : "rgba(255, 255, 255, 0.2)";
    ctx.font = "8px monospace";
    ctx.fillText(z.name.toUpperCase(), z.x1 * 16 + 4, z.y1 * 16 + 10);
  }
}

// Draw Pathfinding Destination & Dots
function drawPathTrail(ctx: CanvasRenderingContext2D, path: [number, number][], tick: number) {
  if (path.length === 0) return;

  ctx.fillStyle = "rgba(55, 230, 196, 0.45)";
  for (let i = 0; i < path.length; i++) {
    const pt = path[i];
    if (!pt) continue;
    const [c, r] = pt;
    ctx.fillRect(c * 16 + 6, r * 16 + 6, 4, 4);
  }

  // Target destination ring
  const lastPt = path[path.length - 1];
  if (!lastPt) return;
  const [lastC, lastR] = lastPt;
  const pulse = Math.sin(tick * 0.15) * 2;
  ctx.strokeStyle = "#37E6C4";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(lastC * 16 + 2 - pulse / 2, lastR * 16 + 2 - pulse / 2, 12 + pulse, 12 + pulse);
}

// Draw Interactive Objects (Arcade, Desks, Coffee machine, Whiteboard)
function drawObjects(
  ctx: CanvasRenderingContext2D,
  objects: InteractiveObject[],
  tick: number,
  closest: InteractiveObject | null
) {
  for (const obj of objects) {
    const ox = obj.x * 16;
    const oy = obj.y * 16;
    const isClosest = closest?.id === obj.id;

    if (obj.kind === "radio") {
      // Vintage Lo-Fi Radio
      ctx.fillStyle = "#8B5A2B";
      ctx.fillRect(ox + 1, oy + 2, 14, 14);
      // Radio speaker grill
      ctx.fillStyle = "#5C3A1E";
      ctx.fillRect(ox + 3, oy + 5, 10, 6);
      // Dial & music wave
      ctx.fillStyle = (tick % 20 < 10) ? "#37E6C4" : "#FFC53D";
      ctx.fillRect(ox + 4, oy + 12, 3, 2);
      ctx.fillStyle = "#EDEEFF";
      ctx.fillRect(ox + 10, oy + 1, 1, 3);
    } else if (obj.kind === "coffee") {
      // Espresso machine
      ctx.fillStyle = "#FF7A00";
      ctx.fillRect(ox + 2, oy + 2, 12, 12);
      ctx.fillStyle = "#5A3825";
      ctx.fillRect(ox + 4, oy + 6, 8, 4);
      // Steam animation
      if (tick % 16 < 8) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fillRect(ox + 7, oy - 2, 2, 3);
      }
    } else if (obj.kind === "watercooler") {
      // Watercooler
      ctx.fillStyle = "#37E6C4";
      ctx.fillRect(ox + 4, oy + 1, 8, 8); // Water bottle
      ctx.fillStyle = "#EDEEFF";
      ctx.fillRect(ox + 3, oy + 8, 10, 7); // Base
    } else if (obj.kind === "whiteboard") {
      // Whiteboard
      ctx.fillStyle = "#EDEEFF";
      ctx.fillRect(ox, oy + 2, 16, 12);
      ctx.fillStyle = "#2B2F5A";
      ctx.fillRect(ox + 2, oy + 5, 8, 1);
      ctx.fillRect(ox + 2, oy + 8, 12, 1);
    } else if (obj.kind === "desk") {
      // Workstation with dual monitors
      ctx.fillStyle = "#4E5482";
      ctx.fillRect(ox, oy + 2, 16, 12); // Desk surface
      // Dual monitors
      ctx.fillStyle = "#0B0C14";
      ctx.fillRect(ox + 2, oy + 1, 5, 4);
      ctx.fillRect(ox + 9, oy + 1, 5, 4);
      ctx.fillStyle = "#37E6C4";
      ctx.fillRect(ox + 3, oy + 2, 3, 2);
      ctx.fillRect(ox + 10, oy + 2, 3, 2);
    }

    // Glow outline if closest
    if (isClosest) {
      ctx.strokeStyle = "#FFEC27";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox - 1, oy - 1, 18, 18);
    }
  }
}

// Draw Avatar Pixel Art
function drawAvatar(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
  dir: PeerState["dir"],
  isMoving: boolean,
  tick: number,
  isSpeaking: boolean,
  name: string,
  status: string,
  isLocal: boolean
) {
  // Speaking ring indicator
  if (isSpeaking) {
    const pulse = (Math.sin(tick * 0.25) + 1) * 2;
    ctx.strokeStyle = "#37E6C4";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - pulse, py - pulse, 16 + pulse * 2, 16 + pulse * 2);
  }

  // Walk bob frame (0 or 1 pixel)
  const bob = isMoving ? Math.floor(tick / 8) % 2 : 0;

  // 1. Head / Skin (peach)
  ctx.fillStyle = "#FFCCAA";
  ctx.fillRect(px + 4, py + 2 - bob, 8, 6);

  // 2. Hair / Cap (custom color)
  ctx.fillStyle = color;
  ctx.fillRect(px + 3, py + 1 - bob, 10, 3);

  // 3. Eyes (direction-aware)
  ctx.fillStyle = "#1D2B53";
  if (dir === "down") {
    ctx.fillRect(px + 5, py + 5 - bob, 2, 2);
    ctx.fillRect(px + 9, py + 5 - bob, 2, 2);
  } else if (dir === "left") {
    ctx.fillRect(px + 4, py + 5 - bob, 2, 2);
  } else if (dir === "right") {
    ctx.fillRect(px + 10, py + 5 - bob, 2, 2);
  }

  // 4. Body / Shirt (accent color)
  ctx.fillStyle = color;
  ctx.fillRect(px + 4, py + 8 - bob, 8, 5);

  // 5. Pants / Legs
  ctx.fillStyle = "#1D2B53";
  if (isMoving && Math.floor(tick / 8) % 2 === 1) {
    ctx.fillRect(px + 4, py + 13, 3, 3);
    ctx.fillRect(px + 9, py + 12, 3, 3);
  } else {
    ctx.fillRect(px + 4, py + 13, 3, 3);
    ctx.fillRect(px + 9, py + 13, 3, 3);
  }

  // Floating Name Badge
  ctx.fillStyle = isLocal ? "#37E6C4" : "#EDEEFF";
  ctx.font = "8px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name, px + 8, py - 4);

  // Floating Status icon/text (e.g. "Focusing")
  if (status) {
    ctx.fillStyle = "rgba(11, 12, 20, 0.85)";
    ctx.fillRect(px - 10, py - 16, 36, 10);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.strokeRect(px - 10, py - 16, 36, 10);
    ctx.fillStyle = "#FFC53D";
    ctx.font = "7px sans-serif";
    ctx.fillText(status.slice(0, 10), px + 8, py - 9);
  }
}
