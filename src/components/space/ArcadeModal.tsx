"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import { OFFICIAL_TEMPLATES } from "@/lib/templates";
import { ForgeDeterministicRuntime, InputState } from "@/lib/runtime/engine";
import { ForgeAudioEngine } from "@/lib/runtime/audio";

interface ArcadeModalProps {
  open: boolean;
  onClose: () => void;
}

export function ArcadeModal({ open, onClose }: ArcadeModalProps) {
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<ForgeDeterministicRuntime | null>(null);
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
  });

  // Start game when template changes or isPlaying turns true
  useEffect(() => {
    if (!open || !isPlaying) {
      if (runtimeRef.current?.audio) {
        runtimeRef.current.audio.destroy();
      }
      runtimeRef.current = null;
      return;
    }

    const t = OFFICIAL_TEMPLATES[selectedTemplateIndex] || OFFICIAL_TEMPLATES[0]!;
    const doc = t.build();
    const runtime = new ForgeDeterministicRuntime(doc, true);

    runtimeRef.current = runtime;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "KeyW"].includes(e.code)) inputRef.current.up = true;
      if (["ArrowDown", "KeyS"].includes(e.code)) inputRef.current.down = true;
      if (["ArrowLeft", "KeyA"].includes(e.code)) inputRef.current.left = true;
      if (["ArrowRight", "KeyD"].includes(e.code)) inputRef.current.right = true;
      if (["Space", "KeyZ", "Enter"].includes(e.code)) inputRef.current.action = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["ArrowUp", "KeyW"].includes(e.code)) inputRef.current.up = false;
      if (["ArrowDown", "KeyS"].includes(e.code)) inputRef.current.down = false;
      if (["ArrowLeft", "KeyA"].includes(e.code)) inputRef.current.left = false;
      if (["ArrowRight", "KeyD"].includes(e.code)) inputRef.current.right = false;
      if (["Space", "KeyZ", "Enter"].includes(e.code)) inputRef.current.action = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    let animId: number;
    const loop = () => {
      const rt = runtimeRef.current;
      const cvs = canvasRef.current;
      if (rt && cvs) {
        rt.step(inputRef.current);
        const ctx = cvs.getContext("2d");
        if (ctx) {
          rt.render(ctx, false);
        }
        setScore(rt.variables.score || 0);
        setStatus(rt.status);
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animId);
      if (runtime.audio) {
        runtime.audio.destroy();
      }
      runtimeRef.current = null;
    };
  }, [open, isPlaying, selectedTemplateIndex]);

  const handleClose = () => {
    setIsPlaying(false);
    onClose();
  };

  const selectedTemplate = OFFICIAL_TEMPLATES[selectedTemplateIndex] || OFFICIAL_TEMPLATES[0]!;

  return (
    <ArcadeDialog
      open={open}
      onClose={handleClose}
      title="🕹️ Breakroom Arcade Cabinet"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Template selector pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {OFFICIAL_TEMPLATES.map((tpl, i) => (
            <button
              key={tpl.id}
              onClick={() => {
                setSelectedTemplateIndex(i);
                setIsPlaying(false);
              }}
              className={`px-3 py-1.5 rounded-control text-xs font-display whitespace-nowrap transition-colors border ${
                selectedTemplateIndex === i
                  ? "bg-accent text-bg border-accent font-bold"
                  : "bg-surface-2 text-text-muted border-border hover:text-text"
              }`}
            >
              {tpl.name}
            </button>
          ))}
        </div>

        {/* Arcade Cabinet Player Frame */}
        <div className="relative aspect-[4/3] w-full max-w-[480px] mx-auto bg-black rounded-container border-4 border-accent shadow-arcade overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            className="w-full h-full object-contain [image-rendering:pixelated]"
          />

          {!isPlaying && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
              <span className="text-4xl mb-2">👾</span>
              <h3 className="font-display text-lg text-text font-bold mb-1">
                {selectedTemplate.name}
              </h3>
              <p className="text-xs text-text-muted mb-4 max-w-xs">
                {selectedTemplate.subtitle}
              </p>
              <button
                onClick={() => setIsPlaying(true)}
                className="px-6 py-2.5 bg-accent text-bg font-display font-bold text-sm rounded-control shadow-arcade hover:brightness-110 active:translate-y-0.5 transition-all"
              >
                INSERT COIN / PLAY
              </button>
              <span className="text-[10px] text-text-muted font-mono mt-3">
                WASD / Arrows to move • Space / Z for action
              </span>
            </div>
          )}

          {isPlaying && status !== "playing" && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
              <span className="text-4xl mb-2">
                {status === "won" ? "🏆" : "💀"}
              </span>
              <h3 className="font-display text-xl font-bold text-text mb-1">
                {status === "won" ? "YOU WON!" : "GAME OVER"}
              </h3>
              <p className="text-sm font-mono text-accent mb-4">
                Score: {score}
              </p>
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setTimeout(() => setIsPlaying(true), 50);
                }}
                className="px-5 py-2 bg-accent text-bg font-display font-bold text-xs rounded-control shadow-arcade"
              >
                TRY AGAIN
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
          <span className="font-mono">
            Status: <span className="text-accent font-bold">{status.toUpperCase()}</span> • Score: {score}
          </span>
          <button
            onClick={handleClose}
            className="px-3 py-1 bg-surface-2 hover:bg-surface border border-border text-text rounded-control"
          >
            Leave Cabinet
          </button>
        </div>
      </div>
    </ArcadeDialog>
  );
}
