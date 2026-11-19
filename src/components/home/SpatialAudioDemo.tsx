"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computeSpatialGain } from "@/lib/space/webrtcMesh";
import { IconVolume, IconVolumeOff } from "@/components/ui/Icons";

interface DemoPeer {
  id: string;
  name: string;
  role: string;
  x: number; // floor tiles [0..16]
  y: number; // floor tiles [0..10]
  isPrivate: boolean;
  freqHz: number;
}

const DEMO_PEERS: DemoPeer[] = [
  {
    id: "maya",
    name: "Maya",
    role: "Open Desk",
    x: 3.4,
    y: 4.3,
    isPrivate: false,
    freqHz: 220, // warm A3
  },
  {
    id: "sam",
    name: "Sam",
    role: "Espresso Bar",
    x: 7.8,
    y: 7.7,
    isPrivate: false,
    freqHz: 261.63, // warm C4
  },
  {
    id: "elena",
    name: "Elena",
    role: "Glass Boardroom",
    x: 13.5,
    y: 5.0,
    isPrivate: true,
    freqHz: 329.63, // warm E4
  },
];

// Glass Boardroom extends from x: 11..16, y: 0..10 (with doorway at y: 3.8..6.2)
const BOARDROOM_X = 11;
const FLOOR_W = 16;
const FLOOR_H = 10;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function SpatialAudioDemo() {
  const floorRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLButtonElement | null>(null);

  // Local "You" coordinates in floor tile space [0..16, 0..10]
  const [you, setYou] = useState({ x: 5.2, y: 4.5 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ dx: 0, dy: 0 });
  const [liveStatus, setLiveStatus] = useState("");

  // Optional Web Audio live synthesis preview
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioRef = useRef<{
    ctx: AudioContext;
    nodes: Record<string, { gain: GainNode; panner: StereoPannerNode }>;
  } | null>(null);

  const isYouInBoardroom = you.x >= BOARDROOM_X;

  const peerMetrics = useMemo(() => {
    return DEMO_PEERS.map((peer) => {
      const dist = Math.hypot(peer.x - you.x, peer.y - you.y);
      const sameZone = isYouInBoardroom === peer.isPrivate;
      const gain = computeSpatialGain({
        dist,
        isLocalPrivate: isYouInBoardroom,
        isPeerPrivate: peer.isPrivate,
        sameZone,
        scope: "proximity",
      });
      const pan = clamp((peer.x - you.x) / 6, -0.85, 0.85);
      const pct = Math.round(gain * 100);
      const db =
        gain <= 0.005
          ? "Muted (-∞ dB)"
          : `${(20 * Math.log10(gain)).toFixed(1)} dB`;

      let reason = "Out of range";
      if (peer.isPrivate && !isYouInBoardroom) {
        reason = "Blocked by glass wall";
      } else if (!peer.isPrivate && isYouInBoardroom) {
        reason = "Isolated outside boardroom";
      } else if (gain >= 0.99) {
        reason = "Full clarity";
      } else if (gain > 0) {
        reason = "Fading with distance";
      }

      return { peer, dist, gain, pct, pan, db, reason };
    });
  }, [isYouInBoardroom, you.x, you.y]);

  // Sync live Web Audio gains & stereo pan smoothly whenever "You" moves
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !soundEnabled) return;
    const now = audio.ctx.currentTime;
    for (const item of peerMetrics) {
      const node = audio.nodes[item.peer.id];
      if (!node) continue;
      node.gain.gain.setTargetAtTime(item.gain * 0.055, now, 0.04);
      node.panner.pan.setTargetAtTime(item.pan, now, 0.04);
    }
  }, [peerMetrics, soundEnabled]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.ctx.close().catch(() => {});
        audioRef.current = null;
      }
    };
  }, []);

  const toggleAudioPreview = async () => {
    if (soundEnabled) {
      if (audioRef.current) {
        await audioRef.current.ctx.suspend().catch(() => {});
      }
      setSoundEnabled(false);
      return;
    }

    try {
      if (!audioRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const masterFilter = ctx.createBiquadFilter();
        masterFilter.type = "lowpass";
        masterFilter.frequency.value = 820;
        masterFilter.connect(ctx.destination);

        const nodes: Record<string, { gain: GainNode; panner: StereoPannerNode }> = {};
        for (const peer of DEMO_PEERS) {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          const panner = ctx.createStereoPanner();

          osc1.type = "sine";
          osc1.frequency.value = peer.freqHz;
          osc2.type = "triangle";
          osc2.frequency.value = peer.freqHz * 1.5; // soft fifth interval

          const overtoneGain = ctx.createGain();
          overtoneGain.gain.value = 0.25;

          gain.gain.value = 0;
          osc1.connect(gain);
          osc2.connect(overtoneGain);
          overtoneGain.connect(gain);
          gain.connect(panner);
          panner.connect(masterFilter);

          osc1.start();
          osc2.start();
          nodes[peer.id] = { gain, panner };
        }
        audioRef.current = { ctx, nodes };
      } else {
        await audioRef.current.ctx.resume();
      }
      setSoundEnabled(true);
    } catch {
      setSoundEnabled(false);
    }
  };

  const announcePosition = useCallback((nx: number, ny: number) => {
    const inside = nx >= BOARDROOM_X;
    if (inside) {
      setLiveStatus("Entered Glass Boardroom. Only Elena is audible at 100 percent.");
      return;
    }
    const closest = DEMO_PEERS.filter((p) => !p.isPrivate).sort(
      (a, b) => Math.hypot(a.x - nx, a.y - ny) - Math.hypot(b.x - nx, b.y - ny)
    )[0];
    if (closest) {
      const pct = Math.round(
        computeSpatialGain({
          dist: Math.hypot(closest.x - nx, closest.y - ny),
          isLocalPrivate: false,
          isPeerPrivate: false,
          sameZone: false,
          scope: "proximity",
        }) * 100
      );
      setLiveStatus(`Open floor near ${closest.name}, volume ${pct} percent.`);
    }
  }, []);

  const moveYouTo = useCallback(
    (nx: number, ny: number) => {
      const clampedX = clamp(nx, 0.7, FLOOR_W - 0.7);
      const clampedY = clamp(ny, 0.8, FLOOR_H - 0.8);
      setYou({ x: clampedX, y: clampedY });
      announcePosition(clampedX, clampedY);
    },
    [announcePosition]
  );

  const clientToTile = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const floor = floorRef.current;
    if (!floor) return null;
    const rect = floor.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * FLOOR_W;
    const y = ((clientY - rect.top) / rect.height) * FLOOR_H;
    return { x, y };
  };

  const onFloorPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") && target.closest("button") !== handleRef.current) return;
    const coords = clientToTile(e.clientX, e.clientY);
    if (coords) moveYouTo(coords.x, coords.y);
  };

  const onHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const coords = clientToTile(e.clientX, e.clientY);
    if (!coords) return;
    dragOffsetRef.current = {
      dx: you.x - coords.x,
      dy: you.y - coords.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const onHandlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const coords = clientToTile(e.clientX, e.clientY);
    if (!coords) return;
    moveYouTo(coords.x + dragOffsetRef.current.dx, coords.y + dragOffsetRef.current.dy);
  };

  const onHandleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 1.2 : 0.55;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveYouTo(you.x - step, you.y);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      moveYouTo(you.x + step, you.y);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveYouTo(you.x, you.y - step);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveYouTo(you.x, you.y + step);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* Interactive Acoustic Blueprint Floor */}
      <div className="lg:col-span-7 space-y-3">
        <div
          ref={floorRef}
          onPointerDown={onFloorPointerDown}
          className="relative w-full aspect-[16/10] bg-surface border border-white/15 rounded-sm overflow-hidden select-none touch-none cursor-crosshair"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {/* Open Floor Zone Label */}
          <span className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-text-muted pointer-events-none">
            Open Floor<span className="hidden sm:inline"> · Distance Roll-off</span>
          </span>

          {/* Glass Boardroom Enclosure (x >= 11/16 = 68.75%) */}
          <div
            className={`absolute top-0 bottom-0 right-0 transition-colors duration-200 pointer-events-none ${
              isYouInBoardroom ? "bg-accent/[0.08]" : "bg-white/[0.025]"
            }`}
            style={{ left: `${(BOARDROOM_X / FLOOR_W) * 100}%` }}
          >
            {/* Top Glass Wall Section (with middle doorway opening y=38%..62%) */}
            <div className="absolute left-0 top-0 h-[38%] w-0.5 bg-accent/65" />
            <div className="absolute left-0 bottom-0 h-[38%] w-0.5 bg-accent/65" />
            <span className="absolute top-[48%] -left-5 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider px-1 py-0.5 bg-bg text-accent border border-accent/40">
              Door
            </span>
            <span className="absolute top-2.5 sm:top-3 right-2 sm:right-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] text-accent">
              Glass Boardroom
            </span>
          </div>

          {/* Hearing Range Rings Centered Around "You" */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-accent/35"
            style={{
              left: `${(you.x / FLOOR_W) * 100}%`,
              top: `${(you.y / FLOOR_H) * 100}%`,
              width: `${((8 * 2) / FLOOR_W) * 100}%`,
              aspectRatio: "1 / 1",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.06] border border-accent/40"
            style={{
              left: `${(you.x / FLOOR_W) * 100}%`,
              top: `${(you.y / FLOOR_H) * 100}%`,
              width: `${((4 * 2) / FLOOR_W) * 100}%`,
              aspectRatio: "1 / 1",
            }}
          />

          {/* SVG Acoustic Coupling Lines */}
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${FLOOR_W} ${FLOOR_H}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 w-full h-full"
          >
            {peerMetrics.map(({ peer, gain }) =>
              gain > 0.02 ? (
                <line
                  key={peer.id}
                  x1={you.x}
                  y1={you.y}
                  x2={peer.x}
                  y2={peer.y}
                  stroke="#F59E0B"
                  strokeWidth={0.05 + gain * 0.1}
                  strokeOpacity={0.25 + gain * 0.65}
                  strokeDasharray="0.2 0.18"
                />
              ) : null
            )}
          </svg>

          {/* Teammate Anchor Dots (also clickable shortcuts) */}
          {peerMetrics.map(({ peer, pct }) => (
            <button
              key={peer.id}
              type="button"
              onClick={() => moveYouTo(peer.x - 1.1, peer.y)}
              title={`Walk over to ${peer.name}`}
              style={{
                left: `${(peer.x / FLOOR_W) * 100}%`,
                top: `${(peer.y / FLOOR_H) * 100}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group focus:outline-none"
            >
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-bold border transition-all ${
                  pct > 0
                    ? "bg-surface-2 text-text border-accent shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                    : "bg-surface-2/80 text-text-muted border-white/20"
                }`}
              >
                {peer.name.slice(0, 1)}
              </span>
              <span className="mt-1 px-1.5 py-0.5 rounded-[3px] bg-bg/90 border border-white/10 font-mono text-[10px] text-text whitespace-nowrap">
                {peer.name} · <strong className={pct > 0 ? "text-accent" : "text-text-muted"}>{pct}%</strong>
              </span>
            </button>
          ))}

          {/* Draggable "You" Marker Handle */}
          <button
            ref={handleRef}
            type="button"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onLostPointerCapture={() => setIsDragging(false)}
            onKeyDown={onHandleKeyDown}
            aria-label="You avatar handle. Drag, tap the floor, or use arrow keys to walk near teammates."
            style={{
              left: `${(you.x / FLOOR_W) * 100}%`,
              top: `${(you.y / FLOOR_H) * 100}%`,
            }}
            className={`drag-handle ${isDragging ? "dragging scale-110" : ""} absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full`}
          >
            <span className="w-9 h-9 rounded-full bg-accent text-bg font-mono text-[11px] font-bold flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.55)] border-2 border-bg">
              YOU
            </span>
          </button>

          <div className="sr-only" aria-live="polite">
            {liveStatus}
          </div>
        </div>

        {/* Bottom Blueprint Legend & Optional Real Audio Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
          <span className="font-mono text-[11px]">
            Drag <strong className="text-accent">YOU</strong>, tap anywhere on the blueprint, or press arrow keys.
          </span>

          <button
            type="button"
            onClick={() => void toggleAudioPreview()}
            className={`px-3 py-1.5 rounded-control border text-xs font-mono inline-flex items-center gap-2 transition-colors ${
              soundEnabled
                ? "bg-accent text-bg border-accent font-semibold"
                : "bg-surface border-white/15 text-text hover:border-accent/60"
            }`}
          >
            {soundEnabled ? (
              <IconVolume className="w-3.5 h-3.5" />
            ) : (
              <IconVolumeOff className="w-3.5 h-3.5" />
            )}
            <span>{soundEnabled ? "Sound Live (Click to Mute)" : "Hear Acoustic Demo"}</span>
          </button>
        </div>
      </div>

      {/* Right Column: Editorial Live Acoustic Meter Readouts (Zero Card Grid) */}
      <div className="lg:col-span-5 space-y-6">
        <div className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
            {isYouInBoardroom ? "Inside Glass Boardroom" : "Standing on Open Floor"}
          </div>
          <p className="text-sm text-text-muted leading-relaxed">
            Walk beside someone and their voice hits 100%. Take four steps back and it fades naturally out. Step past the glass door and open-floor chatter drops to silence.
          </p>
        </div>

        {/* Hairline Meter Rows Directly on Page Canvas */}
        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {peerMetrics.map(({ peer, pct, db, reason, pan }) => {
            const panLabel =
              pan < -0.18 ? "Left ear" : pan > 0.18 ? "Right ear" : "Center";
            return (
              <div key={peer.id} className="py-4 space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className="font-display font-bold text-base text-text">
                      {peer.name}
                    </span>
                    <span className="ml-2 font-mono text-[11px] text-text-muted">
                      {peer.role}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-semibold text-accent tabular-nums">
                    {pct}%
                  </div>
                </div>

                {/* Live level bar (compositor-accelerated scaleX) */}
                <div className="h-1.5 w-full bg-surface-2 overflow-hidden rounded-full">
                  <div
                    className="h-full w-full origin-left bg-accent transition-transform duration-75"
                    style={{ transform: `scaleX(${pct / 100})` }}
                  />
                </div>

                <div className="flex items-center justify-between font-mono text-[11px] text-text-muted">
                  <span>{reason}</span>
                  <span>
                    {db}
                    {pct > 0 ? ` · ${panLabel}` : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Preset Walk Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="font-mono text-[11px] text-text-muted mr-1">Walk to:</span>
          <button
            type="button"
            onClick={() => moveYouTo(4.9, 4.4)}
            className="px-2.5 py-1 border border-white/15 hover:border-accent rounded-control text-xs font-mono text-text transition-colors"
          >
            Maya&apos;s Desk
          </button>
          <button
            type="button"
            onClick={() => moveYouTo(7.4, 7.2)}
            className="px-2.5 py-1 border border-white/15 hover:border-accent rounded-control text-xs font-mono text-text transition-colors"
          >
            Espresso Bar
          </button>
          <button
            type="button"
            onClick={() => moveYouTo(12.8, 5.0)}
            className="px-2.5 py-1 border border-white/15 hover:border-accent rounded-control text-xs font-mono text-text transition-colors"
          >
            Inside Glass Boardroom
          </button>
        </div>
      </div>
    </div>
  );
}
