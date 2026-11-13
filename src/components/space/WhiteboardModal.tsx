"use client";

import React, { useRef, useState, useEffect } from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";

interface WhiteboardModalProps {
  open: boolean;
  onClose: () => void;
}

interface StickyNote {
  id: string;
  text: string;
  color: "yellow" | "pink" | "blue" | "green";
  x: number;
  y: number;
}

const STICKY_COLORS = {
  yellow: "bg-amber-300 text-amber-950 border-amber-400",
  pink: "bg-pink-300 text-pink-950 border-pink-400",
  blue: "bg-sky-300 text-sky-950 border-sky-400",
  green: "bg-emerald-300 text-emerald-950 border-emerald-400",
};

const INITIAL_STICKIES: StickyNote[] = [
  {
    id: "sn-1",
    text: "Q3 Goal: Pure P2P Virtual Office with $0 server cost",
    color: "yellow",
    x: 20,
    y: 20,
  },
  {
    id: "sn-2",
    text: "WebRTC Audio: Distance roll-off at 8 tiles radius",
    color: "blue",
    x: 220,
    y: 20,
  },
  {
    id: "sn-3",
    text: "3D Isometric View: Three.js WebGL zero bundle lag",
    color: "green",
    x: 420,
    y: 20,
  },
];

export function WhiteboardModal({ open, onClose }: WhiteboardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<"draw" | "stickies">("draw");
  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser" | "line">("pen");
  const [color, setColor] = useState("#37E6C4");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [stickies, setStickies] = useState<StickyNote[]>(INITIAL_STICKIES);
  const [newStickyText, setNewStickyText] = useState("");
  const [newStickyColor, setNewStickyColor] = useState<"yellow" | "pink" | "blue" | "green">("yellow");

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    if (tool === "eraser") {
      ctx.strokeStyle = "#1E2238";
      ctx.lineWidth = strokeWidth * 4;
    } else if (tool === "highlighter") {
      ctx.strokeStyle = `${color}55`;
      ctx.lineWidth = strokeWidth * 3;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    }

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1E2238";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw subtle office grid pattern
    ctx.strokeStyle = "#252B47";
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = 0; x < canvas.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (open) {
      setTimeout(clearCanvas, 50);
    }
  }, [open]);

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `forgespace-whiteboard-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleAddSticky = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStickyText.trim()) return;
    const newNote: StickyNote = {
      id: `sn-${Date.now()}`,
      text: newStickyText.trim(),
      color: newStickyColor,
      x: 30 + (stickies.length % 3) * 190,
      y: 120 + Math.floor(stickies.length / 3) * 120,
    };
    setStickies((prev) => [...prev, newNote]);
    setNewStickyText("");
  };

  const handleDeleteSticky = (id: string) => {
    setStickies((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <ArcadeDialog
      open={open}
      onClose={onClose}
      title="📋 War Room Whiteboard & Sprint Board"
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Header Tabs: Draw Sketchpad vs Sticky Notes Board */}
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("draw")}
              className={`px-3 py-1.5 rounded-control font-display text-xs font-bold transition-all ${
                activeTab === "draw"
                  ? "bg-accent text-bg shadow-sm"
                  : "bg-surface-2 text-text-muted hover:text-text"
              }`}
            >
              ✏️ Freehand Sketchpad
            </button>
            <button
              onClick={() => setActiveTab("stickies")}
              className={`px-3 py-1.5 rounded-control font-display text-xs font-bold transition-all ${
                activeTab === "stickies"
                  ? "bg-accent text-bg shadow-sm"
                  : "bg-surface-2 text-text-muted hover:text-text"
              }`}
            >
              📌 Sticky Notes ({stickies.length})
            </button>
          </div>

          {activeTab === "draw" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSnapshot}
                className="px-2.5 py-1 text-xs bg-surface-2 hover:bg-surface border border-border text-accent rounded-control flex items-center gap-1"
              >
                <span>💾 Export PNG</span>
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="px-2.5 py-1 text-xs bg-surface-2 hover:bg-surface border border-border text-text-muted hover:text-text rounded-control"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Freehand Drawing Canvas */}
        {activeTab === "draw" && (
          <div className="space-y-3">
            {/* Toolbar: Tools, Palette, Stroke Width */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-surface-2 rounded-xl border border-border">
              {/* Tool Selector */}
              <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border">
                {[
                  { id: "pen", label: "Pen", icon: "✏️" },
                  { id: "highlighter", label: "Marker", icon: "🖍️" },
                  { id: "eraser", label: "Eraser", icon: "🧹" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTool(t.id as any)}
                    className={`px-2 py-1 text-xs rounded font-display flex items-center gap-1 transition-all ${
                      tool === t.id
                        ? "bg-accent text-bg font-bold shadow-sm"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Color Palette */}
              <div className="flex items-center gap-2">
                {["#37E6C4", "#FF5E7E", "#FFB020", "#3B82F6", "#B84DFF", "#FFFFFF"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      if (tool === "eraser") setTool("pen");
                    }}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      color === c && tool !== "eraser"
                        ? "scale-110 border-white shadow-sm ring-2 ring-white/50"
                        : "border-black/40 hover:scale-105"
                    }`}
                  />
                ))}
              </div>

              {/* Stroke Size */}
              <div className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-lg border border-border">
                <span className="text-[10px] font-mono text-text-muted uppercase">Size</span>
                {[2, 4, 8].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setStrokeWidth(sz)}
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-mono font-bold ${
                      strokeWidth === sz ? "bg-accent text-bg" : "text-text-muted hover:text-text"
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Drawing Canvas Element */}
            <div className="border-2 border-border rounded-xl overflow-hidden bg-[#1E2238] shadow-inner flex justify-center">
              <canvas
                ref={canvasRef}
                width={700}
                height={320}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                className="w-full h-auto cursor-crosshair touch-none"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Sticky Notes Sprint Wall */}
        {activeTab === "stickies" && (
          <div className="space-y-4">
            {/* Add Sticky Form */}
            <form onSubmit={handleAddSticky} className="flex gap-2">
              <input
                type="text"
                value={newStickyText}
                onChange={(e) => setNewStickyText(e.target.value)}
                placeholder="Write an action item or sprint card..."
                className="flex-1 px-3 py-2 bg-surface border border-border focus:border-accent rounded-control text-text font-sans text-xs outline-none"
              />
              <select
                value={newStickyColor}
                onChange={(e) => setNewStickyColor(e.target.value as any)}
                className="px-2.5 py-2 bg-surface border border-border rounded-control text-xs font-sans text-text outline-none"
              >
                <option value="yellow">Yellow</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="pink">Pink</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-accent text-bg font-display font-bold text-xs rounded-control hover:brightness-110 flex-shrink-0"
              >
                + Add Card
              </button>
            </form>

            {/* Stickies Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto p-1">
              {stickies.map((sticky) => (
                <div
                  key={sticky.id}
                  className={`p-3.5 rounded-xl border shadow-sm relative group flex flex-col justify-between min-h-[110px] ${STICKY_COLORS[sticky.color]}`}
                >
                  <p className="text-xs font-sans font-medium leading-relaxed">
                    {sticky.text}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-2 text-[10px] font-mono opacity-60">
                    <span>Task #{sticky.id.slice(-4)}</span>
                    <button
                      onClick={() => handleDeleteSticky(sticky.id)}
                      className="text-red-700 hover:text-red-900 font-bold"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[11px] font-mono text-text-muted text-center pt-2 border-t border-border">
          Collaborative brainstorm board synchronizes with all teammates currently inside the War Room.
        </div>
      </div>
    </ArcadeDialog>
  );
}
