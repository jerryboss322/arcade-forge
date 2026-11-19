"use client";

import React, { useEffect, useRef } from "react";

interface WalkingStep {
  x: number;
  y: number;
  pauseSec: number;
  label?: string;
}

const ALEX_ROUTE: WalkingStep[] = [
  { x: 5.5, y: 11.2, pauseSec: 1.5, label: "Lobby" },
  { x: 9.2, y: 6.4, pauseSec: 4.5, label: "Chatting w/ Maya" },
  { x: 14.5, y: 12.6, pauseSec: 2.5, label: "Espresso Bar" },
  { x: 9.8, y: 12.6, pauseSec: 1.5 },
];

export function IsometricOfficeHero() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let rafId = 0;
    const startTime = performance.now();

    const drawScene = (nowMs: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(400, Math.round(rect.width));
      const height = Math.max(320, Math.round(rect.height));

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const elapsed = reduceMotion ? 2.8 : (nowMs - startTime) / 1000;

      // Isometric scale tuned so avatars remain framed while floor slab bleeds off right & bottom edges
      const tileW = Math.max(36, Math.min(48, width * 0.048));
      const tileH = tileW * 0.5;
      const originX = width * 0.36;
      const originY = height * 0.08;

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
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      };

      const drawGlassWallSegment = (
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
        ctx.fillStyle = "rgba(229, 217, 182, 0.08)";
        ctx.fill();

        ctx.strokeStyle = "rgba(245, 158, 11, 0.42)";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(ax, ay - wallH);
        ctx.lineTo(bx, by - wallH);
        ctx.stroke();

        ctx.strokeStyle = "rgba(246, 243, 236, 0.16)";
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
        speaking: boolean,
        bobPhase: number,
        zElev = 0
      ) => {
        const [cx, cy] = toIso(gx, gy);
        const baseY = cy - zElev;
        const bob = reduceMotion ? 0 : Math.sin(elapsed * 4.5 + bobPhase) * 1.4;

        // Ground shadow
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fill();

        // Speaking proximity ring on floor
        if (speaking) {
          const pulse = (elapsed * 0.9 + bobPhase) % 1;
          ctx.beginPath();
          ctx.ellipse(cx, cy, 12 + pulse * 14, 6 + pulse * 7, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - pulse) * 0.7})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(cx, cy, 12, 6, 0, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(245, 158, 11, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Body pill
        ctx.fillStyle = shirtColor;
        ctx.beginPath();
        ctx.roundRect(cx - 5.5, baseY - 17 + bob, 11, 12, 4);
        ctx.fill();

        // Head
        ctx.fillStyle = "#F6E7D7";
        ctx.beginPath();
        ctx.arc(cx, baseY - 22 + bob, 5.2, 0, Math.PI * 2);
        ctx.fill();

        // Headset / Hair crown accent
        ctx.strokeStyle = speaking ? "#F59E0B" : "#2A292E";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, baseY - 22.5 + bob, 5.4, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();

        // Minimal tag
        ctx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
        const tw = ctx.measureText(name).width + 10;
        ctx.fillStyle = "rgba(12, 12, 14, 0.85)";
        ctx.beginPath();
        ctx.roundRect(cx - tw / 2, baseY - 41 + bob, tw, 15, 4);
        ctx.fill();
        ctx.strokeStyle = speaking ? "rgba(245, 158, 11, 0.7)" : "rgba(255,255,255,0.14)";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.fillStyle = speaking ? "#FCD34D" : "#E5DFD3";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name, cx, baseY - 33.5 + bob);
      };

      // 1. Main Building Floor Slab (22 x 16)
      drawDiamond(0, 0, 22, 16, "#131317", "rgba(255,255,255,0.06)");

      // Architectural isometric grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
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

      // 2. Floor Zones (Warm Stone Carpet Mats)
      // Open Workstations Rug
      drawDiamond(4.5, 2, 7.5, 7.5, "rgba(229, 217, 182, 0.035)", "rgba(229, 217, 182, 0.12)");
      // Glass Boardroom Soundproof Floor
      drawDiamond(13, 1.5, 7.5, 6.5, "rgba(245, 158, 11, 0.055)", "rgba(245, 158, 11, 0.25)");
      // War Room / Lounge Floor
      drawDiamond(12.5, 9.5, 7.5, 5.5, "rgba(255, 255, 255, 0.025)", "rgba(255, 255, 255, 0.08)");

      // Back solid concrete structural walls along north edge
      drawGlassWallSegment(4.5, 2, 12, 2, 16);

      // 3. Open Workstation Walnut Desks + Monitors
      const deskCoords: readonly (readonly [number, number])[] = [
        [5.5, 3.2],
        [5.5, 5.4],
        [9.2, 3.2],
        [9.2, 5.4],
        [5.5, 7.6],
      ];
      for (const [dx, dy] of deskCoords) {
        drawBox(dx, dy, 1.6, 0.9, 9, "#735338", "#503926", "#3E2C1D", "rgba(255,255,255,0.08)");
        // Monitor standing on desk
        drawBox(dx + 0.45, dy + 0.2, 0.7, 0.12, 16, "#2A292E", "#19191D", "#F59E0B");
      }

      // Workstation Teammates
      drawAvatar(6.4, 4.3, "Noah", "#6D597A", false, 0.5);
      drawAvatar(10.1, 6.5, "Maya", "#D97706", true, 1.8);
      drawAvatar(6.4, 8.7, "Priya", "#52796F", false, 3.1);

      // 4. Glass Boardroom Conference Table + Presentation Wall
      drawGlassWallSegment(13, 1.5, 20.5, 1.5, 28);
      drawGlassWallSegment(13, 1.5, 13, 4.1, 28); // Back-left glass panel before doorway
      drawBox(14.8, 3.6, 3.8, 1.8, 9, "#7A593C", "#543D29", "#422F1F", "rgba(255,255,255,0.12)");

      // Boardroom Presentation Screen
      drawBox(15.6, 1.7, 2.2, 0.18, 22, "#1F1E24", "#121216", "#F59E0B");

      // Boardroom Participants (talking behind glass)
      drawAvatar(15.6, 3.2, "Elena", "#F59E0B", true, 0.2);
      drawAvatar(17.7, 3.2, "Marcus", "#B45309", true, 2.4);
      drawAvatar(16.7, 5.9, "Jules", "#78716C", false, 4.1);

      // Front glass partition walls of Boardroom (with doorway gap at y = 4.1..5.6)
      drawGlassWallSegment(13, 5.6, 13, 8, 28);
      drawGlassWallSegment(13, 8, 20.5, 8, 28);

      // 5. Espresso Bar + War Room Whiteboard (Lower Wing)
      drawBox(14.2, 11.4, 3.0, 1.1, 12, "#59412D", "#3D2B1D", "#2E2016", "rgba(245, 158, 11, 0.2)");
      // Espresso machine brass detail
      drawBox(14.6, 11.6, 0.65, 0.65, 19, "#D97706", "#92400E", "#78350F");
      drawAvatar(15.3, 13.3, "Sam", "#B45309", false, 1.1);

      // 6. Walking Local Teammate ("Alex") looping along office path
      const totalCycle = ALEX_ROUTE.reduce((acc, s) => acc + 2.4 + s.pauseSec, 0);
      let t = elapsed % totalCycle;
      let alexX = ALEX_ROUTE[0]!.x;
      let alexY = ALEX_ROUTE[0]!.y;
      let alexSpeaking = false;

      for (let i = 0; i < ALEX_ROUTE.length; i++) {
        const cur = ALEX_ROUTE[i]!;
        const next = ALEX_ROUTE[(i + 1) % ALEX_ROUTE.length]!;
        if (t <= cur.pauseSec) {
          alexX = cur.x;
          alexY = cur.y;
          alexSpeaking = cur.label === "Chatting w/ Maya";
          break;
        }
        t -= cur.pauseSec;
        const walkDur = 2.4;
        if (t <= walkDur) {
          const p = t / walkDur;
          const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          alexX = cur.x + (next.x - cur.x) * ease;
          alexY = cur.y + (next.y - cur.y) * ease;
          break;
        }
        t -= walkDur;
      }

      // Draw proximity wave arc when Alex pauses next to Maya
      if (alexSpeaking) {
        const [axp, ayp] = toIso(alexX, alexY);
        const [mxp, myp] = toIso(10.1, 6.5);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = "rgba(245, 158, 11, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(axp, ayp - 14);
        ctx.lineTo(mxp, myp - 14);
        ctx.stroke();
        ctx.restore();
      }

      drawAvatar(alexX, alexY, "You (Alex)", "#F59E0B", alexSpeaking, 0);

      // 7. Subtle Architectural Room Labels directly on the floorplan
      const drawFloorLabel = (gx: number, gy: number, text: string, highlight = false) => {
        const [lx, ly] = toIso(gx, gy);
        ctx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = "left";
        ctx.fillStyle = highlight ? "rgba(245, 158, 11, 0.9)" : "rgba(168, 162, 152, 0.72)";
        ctx.fillText(text, lx, ly);
      };

      drawFloorLabel(13.4, 2.3, "GLASS BOARDROOM · SOUNDPROOF", true);
      drawFloorLabel(5.0, 2.5, "OPEN WORKSTATIONS");
      drawFloorLabel(13.0, 10.2, "LOUNGE & ESPRESSO");

      ctx.restore();

      if (!reduceMotion) {
        rafId = requestAnimationFrame(drawScene);
      }
    };

    drawScene(performance.now());
    const onResize = () => drawScene(performance.now());
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none relative w-full h-[340px] sm:h-[440px] lg:h-[600px] overflow-visible"
    >
      <canvas
        ref={canvasRef}
        className="w-[122%] sm:w-[118%] lg:w-[128%] h-[112%] -ml-[6%] lg:-ml-[10%]"
      />
      {/* Soft edge fade into Warm Charcoal page canvas on left & bottom */}
      <div
        className="absolute inset-y-0 left-0 w-24 lg:w-36 pointer-events-none"
        style={{
          background: "linear-gradient(to right, #0C0C0E 0%, rgba(12, 12, 14, 0) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
        style={{
          background: "linear-gradient(to top, #0C0C0E 0%, rgba(12, 12, 14, 0) 100%)",
        }}
      />
    </div>
  );
}
