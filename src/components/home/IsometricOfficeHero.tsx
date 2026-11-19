"use client";

import React, { useEffect, useRef, useState } from "react";
import { computeSpatialGain } from "@/lib/space/webrtcMesh";

interface WalkingStep {
  x: number;
  y: number;
  pauseSec: number;
}

interface StaticTeammate {
  id: string;
  name: string;
  x: number;
  y: number;
  shirt: string;
  hair: string;
  isPrivate: boolean;
  talking: boolean;
  phase: number;
}

const AUTO_ROUTE: WalkingStep[] = [
  { x: 4.4, y: 10.6, pauseSec: 1.6 },
  { x: 8.6, y: 6.4, pauseSec: 4.0 },
  { x: 14.3, y: 5.1, pauseSec: 3.6 },
  { x: 13.8, y: 12.2, pauseSec: 2.8 },
];

const TEAMMATES: StaticTeammate[] = [
  { id: "noah", name: "Noah", x: 6.3, y: 4.3, shirt: "#6D597A", hair: "#2B2624", isPrivate: false, talking: false, phase: 0.5 },
  { id: "maya", name: "Maya", x: 10.1, y: 6.5, shirt: "#D97706", hair: "#1F1B18", isPrivate: false, talking: true, phase: 1.8 },
  { id: "priya", name: "Priya", x: 6.3, y: 8.7, shirt: "#4F7768", hair: "#241D1A", isPrivate: false, talking: false, phase: 3.1 },
  { id: "elena", name: "Elena", x: 15.6, y: 3.2, shirt: "#F59E0B", hair: "#3B281E", isPrivate: true, talking: true, phase: 0.2 },
  { id: "marcus", name: "Marcus", x: 17.8, y: 3.2, shirt: "#B45309", hair: "#1E1C1A", isPrivate: true, talking: true, phase: 2.3 },
  { id: "jules", name: "Jules", x: 16.7, y: 5.9, shirt: "#78716C", hair: "#2C241E", isPrivate: true, talking: false, phase: 4.0 },
  { id: "sam", name: "Sam", x: 15.3, y: 13.1, shirt: "#C26D3A", hair: "#231E1B", isPrivate: false, talking: true, phase: 1.2 },
];

function isInBoardroom(gx: number, gy: number): boolean {
  return gx >= 13 && gx <= 20.5 && gy >= 1.5 && gy <= 8.0;
}

export function IsometricOfficeHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  // Interactive click-to-walk target state (kept in ref for 60fps canvas loop)
  const manualModeRef = useRef(false);
  const youPosRef = useRef({ x: 8.4, y: 6.5 });
  const targetPosRef = useRef({ x: 8.4, y: 6.5 });
  const clickRippleRef = useRef<{ x: number; y: number; bornAt: number } | null>(null);
  const geomRef = useRef({ tileW: 46, tileH: 23, originX: 340, originY: 50 });

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setIsPaused(true);
      isPausedRef.current = true;
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let simTime = 3.2; // Start right next to Maya chatting for instant first-frame clarity
    let lastTs = performance.now();

    const drawScene = (nowMs: number) => {
      const dt = Math.min(0.05, Math.max(0, (nowMs - lastTs) / 1000));
      lastTs = nowMs;

      if (!isPausedRef.current) {
        simTime += dt;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(420, Math.round(rect.width));
      const height = Math.max(340, Math.round(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const tileW = Math.max(38, Math.min(54, width * 0.054));
      const tileH = tileW * 0.5;
      const originX = width * 0.37;
      const originY = height * 0.09;
      geomRef.current = { tileW, tileH, originX, originY };

      const toIso = (gx: number, gy: number): [number, number] => [
        originX + (gx - gy) * (tileW / 2),
        originY + (gx + gy) * (tileH / 2),
      ];

      const drawDiamond = (
        x: number,
        y: number,
        w: number,
        h: number,
        fill: string,
        stroke?: string
      ) => {
        const [p0x, p0y] = toIso(x, y);
        const [p1x, p1y] = toIso(x + w, y);
        const [p2x, p2y] = toIso(x + w, y + h);
        const [p3x, p3y] = toIso(x, y + h);

        ctx.beginPath();
        ctx.moveTo(p0x, p0y);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      };

      const drawBox = (
        x: number,
        y: number,
        w: number,
        h: number,
        elev: number,
        topCol: string,
        leftCol: string,
        rightCol: string,
        strokeCol?: string
      ) => {
        const [x0, y0] = toIso(x, y);
        const [x1, y1] = toIso(x + w, y);
        const [x2, y2] = toIso(x + w, y + h);
        const [x3, y3] = toIso(x, y + h);

        // Left face
        ctx.beginPath();
        ctx.moveTo(x3, y3);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, y2 - elev);
        ctx.lineTo(x3, y3 - elev);
        ctx.closePath();
        ctx.fillStyle = leftCol;
        ctx.fill();

        // Right face
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1, y1 - elev);
        ctx.lineTo(x2, y2 - elev);
        ctx.closePath();
        ctx.fillStyle = rightCol;
        ctx.fill();

        // Top face
        ctx.beginPath();
        ctx.moveTo(x0, y0 - elev);
        ctx.lineTo(x1, y1 - elev);
        ctx.lineTo(x2, y2 - elev);
        ctx.lineTo(x3, y3 - elev);
        ctx.closePath();
        ctx.fillStyle = topCol;
        ctx.fill();

        if (strokeCol) {
          ctx.strokeStyle = strokeCol;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      };

      const drawLightPool = (gx: number, gy: number, rx: number, color: string) => {
        const [cx, cy] = toIso(gx, gy);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.52);
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, rx);
        grad.addColorStop(0, color);
        grad.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      const drawPlant = (gx: number, gy: number) => {
        const [cx, cy] = toIso(gx, gy);
        // Terracotta pot
        drawBox(gx - 0.3, gy - 0.3, 0.6, 0.6, 7, "#B55D3C", "#8C4227", "#6B311B");
        // Layered foliage
        ctx.fillStyle = "#3E5C47";
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 12, 6, 0, Math.PI * 2);
        ctx.arc(cx + 4, cy - 11, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5A8266";
        ctx.beginPath();
        ctx.arc(cx, cy - 16, 6.2, 0, Math.PI * 2);
        ctx.fill();
      };

      const drawGlassWall = (
        x1g: number,
        y1g: number,
        x2g: number,
        y2g: number,
        wallH: number
      ) => {
        const [ax, ay] = toIso(x1g, y1g);
        const [bx, by] = toIso(x2g, y2g);

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx, by - wallH);
        ctx.lineTo(ax, ay - wallH);
        ctx.closePath();
        ctx.fillStyle = "rgba(246, 243, 236, 0.085)";
        ctx.fill();

        // Diagonal subtle glass reflection sheen
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ax + (bx - ax) * 0.25, ay + (by - ay) * 0.25 - wallH + 3);
        ctx.lineTo(ax + (bx - ax) * 0.45, ay + (by - ay) * 0.45 - 3);
        ctx.stroke();

        // Warm brass top rail
        ctx.strokeStyle = "rgba(245, 158, 11, 0.72)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ax, ay - wallH);
        ctx.lineTo(bx, by - wallH);
        ctx.stroke();

        // Frame mullions
        ctx.strokeStyle = "rgba(246, 243, 236, 0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax, ay - wallH);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx, by - wallH);
        ctx.stroke();
      };

      const drawAvatar = (
        gx: number,
        gy: number,
        name: string,
        shirtColor: string,
        hairColor: string,
        speaking: boolean,
        isLocal: boolean,
        bobPhase: number
      ) => {
        const [cx, cy] = toIso(gx, gy);
        const bob = isPausedRef.current ? 0 : Math.sin(simTime * 4.2 + bobPhase) * 1.3;

        // Ground shadow
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, 10, 5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fill();

        // Warm voice ripple ring
        if (speaking || isLocal) {
          const pulse = (simTime * 0.85 + bobPhase) % 1;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 12 + pulse * 16, 6 + pulse * 8, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - pulse) * (isLocal ? 0.65 : 0.55)})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(cx, cy, 12, 6, 0, 0, Math.PI * 2);
          ctx.strokeStyle = isLocal ? "#F59E0B" : "rgba(245, 158, 11, 0.85)";
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // Torso
        ctx.fillStyle = shirtColor;
        ctx.beginPath();
        ctx.roundRect(cx - 6, cy - 18 + bob, 12, 13, 4.5);
        ctx.fill();

        // Head
        ctx.fillStyle = "#F5DFC9";
        ctx.beginPath();
        ctx.arc(cx, cy - 23 + bob, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Hair cap
        ctx.fillStyle = hairColor;
        ctx.beginPath();
        ctx.arc(cx, cy - 24.5 + bob, 5.4, Math.PI, Math.PI * 2);
        ctx.fill();

        // Crisp readable name tag
        ctx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
        const tw = ctx.measureText(name).width + 12;
        ctx.fillStyle = isLocal ? "#F59E0B" : "rgba(12, 12, 14, 0.88)";
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, cy - 43 + bob, tw, 16, 4);
        ctx.fill();

        if (!isLocal) {
          ctx.strokeStyle = speaking ? "rgba(245, 158, 11, 0.7)" : "rgba(255,255,255,0.16)";
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }

        ctx.fillStyle = isLocal ? "#0C0C0E" : speaking ? "#FCD34D" : "#F6F3EC";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name, cx, cy - 35 + bob);
      };

      // 1. Extruded Architectural Diorama Floor Slab (22 x 16)
      const slabDepth = 16;
      const [s0x, s0y] = toIso(0, 16);
      const [s1x, s1y] = toIso(22, 16);
      const [s2x, s2y] = toIso(22, 0);

      // South-west slab face
      ctx.beginPath();
      ctx.moveTo(s0x, s0y);
      ctx.lineTo(s1x, s1y);
      ctx.lineTo(s1x, s1y + slabDepth);
      ctx.lineTo(s0x, s0y + slabDepth);
      ctx.closePath();
      ctx.fillStyle = "#16151B";
      ctx.fill();

      // South-east slab face
      ctx.beginPath();
      ctx.moveTo(s1x, s1y);
      ctx.lineTo(s2x, s2y);
      ctx.lineTo(s2x, s2y + slabDepth);
      ctx.lineTo(s1x, s1y + slabDepth);
      ctx.closePath();
      ctx.fillStyle = "#111015";
      ctx.fill();

      // Main floor surface
      drawDiamond(0, 0, 22, 16, "#1B1A20", "rgba(246, 243, 236, 0.12)");

      // Subtle architectural tile grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
      ctx.lineWidth = 1;
      for (let gx = 1; gx < 22; gx++) {
        const [ax, ay] = toIso(gx, 0);
        const [bx, by] = toIso(gx, 16);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }
      for (let gy = 1; gy < 16; gy++) {
        const [ax, ay] = toIso(0, gy);
        const [bx, by] = toIso(22, gy);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      // 2. Floor Rugs & Warm Overhead Studio Light Pools
      drawDiamond(4.4, 2.0, 7.6, 7.6, "#222128", "rgba(246, 243, 236, 0.15)");
      drawDiamond(13.0, 1.5, 7.5, 6.5, "rgba(245, 158, 11, 0.095)", "rgba(245, 158, 11, 0.42)");
      drawDiamond(12.5, 9.6, 7.6, 5.4, "rgba(180, 118, 66, 0.09)", "rgba(246, 243, 236, 0.12)");

      drawLightPool(8.2, 5.8, tileW * 3.8, "rgba(251, 191, 36, 0.11)");
      drawLightPool(16.8, 4.6, tileW * 3.6, "rgba(245, 158, 11, 0.16)");
      drawLightPool(15.6, 12.2, tileW * 2.8, "rgba(245, 158, 11, 0.11)");

      // Click target ripple when visitor clicks to walk
      if (clickRippleRef.current) {
        const age = (nowMs - clickRippleRef.current.bornAt) / 1000;
        if (age < 0.9) {
          const [rx, ry] = toIso(clickRippleRef.current.x, clickRippleRef.current.y);
          ctx.beginPath();
          ctx.ellipse(rx, ry, 6 + age * 26, 3 + age * 13, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - age / 0.9) * 0.9})`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else {
          clickRippleRef.current = null;
        }
      }

      // 3. Back Wall & Architectural Plants
      drawGlassWall(4.4, 2.0, 12.0, 2.0, 18);
      drawPlant(4.2, 9.7);
      drawPlant(12.3, 2.1);
      drawPlant(12.8, 14.5);

      // 4. Warm Walnut Workstations + Dual Glowing Monitors
      const deskCoords: readonly (readonly [number, number])[] = [
        [5.4, 3.2],
        [5.4, 5.4],
        [9.2, 3.2],
        [9.2, 5.4],
        [5.4, 7.6],
      ];
      for (const [dx, dy] of deskCoords) {
        drawBox(dx, dy, 1.65, 0.92, 9.5, "#9A6E47", "#6B4A2E", "#4E3520", "rgba(255,255,255,0.12)");
        // Glowing screen
        drawBox(dx + 0.38, dy + 0.18, 0.85, 0.14, 17, "#2E2C33", "#1C1B20", "#F59E0B");
        // Subtle desk lamp glow dot
        const [lx, ly] = toIso(dx + 1.35, dy + 0.3);
        ctx.fillStyle = "rgba(253, 224, 71, 0.7)";
        ctx.beginPath();
        ctx.arc(lx, ly - 11, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Glass Boardroom Back Walls, Conference Table & Presentation Display
      drawGlassWall(13.0, 1.5, 20.5, 1.5, 30);
      drawGlassWall(13.0, 1.5, 13.0, 4.1, 30); // north-west glass before doorway

      // Walnut conference table
      drawBox(14.8, 3.6, 3.8, 1.85, 9.5, "#9E724A", "#6D4C2F", "#513721", "rgba(255,255,255,0.14)");

      // Presentation wall display with glowing amber slide accent
      drawBox(15.5, 1.7, 2.4, 0.2, 23, "#25242B", "#141318", "#F59E0B");

      // 6. Espresso Lounge Counter + Animated Steam Wisps
      drawBox(14.1, 11.2, 3.1, 1.15, 12.5, "#875E3B", "#5B3E26", "#422C1A", "rgba(245, 158, 11, 0.25)");
      drawBox(14.5, 11.4, 0.72, 0.72, 20, "#F59E0B", "#B45309", "#78350F");

      // Gentle steam wisps curling from espresso bar
      const [stX, stY] = toIso(14.85, 11.75);
      for (let i = 0; i < 3; i++) {
        const p = (simTime * 0.45 + i * 0.33) % 1;
        ctx.beginPath();
        ctx.arc(
          stX + Math.sin(p * Math.PI * 2 + i) * 3,
          stY - 22 - p * 14,
          1.8 + p * 2.2,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = `rgba(246, 243, 236, ${(1 - p) * 0.22})`;
        ctx.fill();
      }

      // 7. Update "You" position (auto-stroll until visitor clicks to walk manually)
      if (!manualModeRef.current) {
        const totalCycle = AUTO_ROUTE.reduce((acc, s) => acc + 2.4 + s.pauseSec, 0);
        let t = simTime % totalCycle;
        for (let i = 0; i < AUTO_ROUTE.length; i++) {
          const cur = AUTO_ROUTE[i]!;
          const next = AUTO_ROUTE[(i + 1) % AUTO_ROUTE.length]!;
          if (t <= cur.pauseSec) {
            youPosRef.current = { x: cur.x, y: cur.y };
            break;
          }
          t -= cur.pauseSec;
          const walkDur = 2.4;
          if (t <= walkDur) {
            const p = t / walkDur;
            const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
            youPosRef.current = {
              x: cur.x + (next.x - cur.x) * ease,
              y: cur.y + (next.y - cur.y) * ease,
            };
            break;
          }
          t -= walkDur;
        }
      } else {
        // Smoothly glide toward clicked tile
        const speed = isPausedRef.current ? 1 : Math.min(1, dt * 6.5);
        youPosRef.current.x += (targetPosRef.current.x - youPosRef.current.x) * speed;
        youPosRef.current.y += (targetPosRef.current.y - youPosRef.current.y) * speed;
      }

      const you = youPosRef.current;
      const youPrivate = isInBoardroom(you.x, you.y);

      // 8. Draw live spatial acoustic beams between "You" and audible teammates
      const [youIsoX, youIsoY] = toIso(you.x, you.y);
      let audibleCount = 0;
      for (const peer of TEAMMATES) {
        const gain = computeSpatialGain({
          dist: Math.hypot(peer.x - you.x, peer.y - you.y),
          isLocalPrivate: youPrivate,
          isPeerPrivate: peer.isPrivate,
          sameZone: youPrivate === peer.isPrivate,
          scope: "proximity",
        });
        if (gain > 0.12) {
          audibleCount++;
          const [px, py] = toIso(peer.x, peer.y);
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.25 + gain * 0.65})`;
          ctx.lineWidth = 1.2 + gain * 1.1;
          ctx.beginPath();
          ctx.moveTo(youIsoX, youIsoY - 12);
          ctx.lineTo(px, py - 12);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 9. Depth-sort all avatars + draw front Glass Boardroom glass cleanly
      const allActors = [
        ...TEAMMATES.map((p) => ({ ...p, isLocal: false })),
        {
          id: "you",
          name: "You",
          x: you.x,
          y: you.y,
          shirt: "#F59E0B",
          hair: "#1F1A17",
          isPrivate: youPrivate,
          talking: audibleCount > 0,
          phase: 0,
          isLocal: true,
        },
      ].sort((a, b) => a.x + a.y - (b.x + b.y));

      for (const actor of allActors) {
        drawAvatar(
          actor.x,
          actor.y,
          actor.name,
          actor.shirt,
          actor.hair,
          actor.talking,
          actor.isLocal,
          actor.phase
        );
      }

      // Front glass partition walls of Boardroom (with doorway gap y=4.1..5.8)
      drawGlassWall(13.0, 5.8, 13.0, 8.0, 30);
      drawGlassWall(13.0, 8.0, 20.5, 8.0, 30);

      // 10. Crisp Architectural Room Signs on Floor
      const drawFloorLabel = (gx: number, gy: number, text: string, highlight = false) => {
        const [lx, ly] = toIso(gx, gy);
        ctx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = "left";
        ctx.fillStyle = highlight ? "#FBBF24" : "rgba(246, 243, 236, 0.56)";
        ctx.fillText(text, lx, ly);
      };

      drawFloorLabel(13.3, 2.25, "GLASS BOARDROOM · SOUNDPROOF", true);
      drawFloorLabel(4.9, 2.55, "OPEN DESKS");
      drawFloorLabel(13.0, 10.35, "ESPRESSO BAR");

      ctx.restore();
      rafId = requestAnimationFrame(drawScene);
    };

    rafId = requestAnimationFrame(drawScene);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const { tileW, tileH, originX, originY } = geomRef.current;
    const dx = (sx - originX) / (tileW / 2);
    const dy = (sy - originY) / (tileH / 2);
    const gx = Math.max(1.4, Math.min(20.0, (dx + dy) / 2));
    const gy = Math.max(1.8, Math.min(14.5, (dy - dx) / 2));

    manualModeRef.current = true;
    targetPosRef.current = { x: gx, y: gy };
    clickRippleRef.current = { x: gx, y: gy, bornAt: performance.now() };
    setHasInteracted(true);
    if (isPausedRef.current) {
      youPosRef.current = { x: gx, y: gy };
    }
  };

  return (
    <div className="relative w-full h-[360px] sm:h-[460px] lg:h-[620px] overflow-visible">
      {/* Masked canvas wrapper so the diorama fades smoothly off the left & bottom edges */}
      <div
        className="w-full h-full"
        style={{
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 14%, black 100%), linear-gradient(to top, transparent 0%, black 14%, black 100%)",
          WebkitMaskComposite: "source-in",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 14%, black 100%), linear-gradient(to top, transparent 0%, black 14%, black 100%)",
          maskComposite: "intersect",
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          title="Click anywhere on the floor to walk"
          className="w-[122%] lg:w-[130%] h-[112%] -ml-[6%] lg:-ml-[10%] cursor-pointer block"
        />
      </div>

      {/* Subtle studio caption + WCAG 2.2.2 Pause/Play control outside masked container */}
      <div className="absolute bottom-3 right-4 lg:right-28 xl:right-40 z-20 flex items-center gap-2.5">
        {!hasInteracted && (
          <span className="hidden sm:inline font-mono text-[11px] text-text-muted bg-bg/85 backdrop-blur-sm px-2.5 py-1 rounded-control border border-white/10">
            Click anywhere on the floor to walk
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsPaused((p) => !p)}
          className="px-2.5 py-1 rounded-control bg-bg/90 border border-white/15 hover:border-accent text-[11px] font-mono text-text-muted hover:text-text transition-colors"
        >
          {isPaused ? "Play" : "Pause"}
        </button>
      </div>
    </div>
  );
}
