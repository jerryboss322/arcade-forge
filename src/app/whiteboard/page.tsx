"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";

interface StickyCard {
  id: string;
  title: string;
  author: string;
  category: "todo" | "in_progress" | "done";
  color: "yellow" | "pink" | "blue" | "green";
  votes: number;
}

const INITIAL_CARDS: StickyCard[] = [
  {
    id: "card-1",
    title: "Implement Three.js 3D WebGL isometric floor engine",
    author: "Alice (Staff Eng)",
    category: "done",
    color: "green",
    votes: 8,
  },
  {
    id: "card-2",
    title: "Verify zero server bandwidth overhead with P2P WebRTC mesh",
    author: "Bob (Infra)",
    category: "done",
    color: "blue",
    votes: 12,
  },
  {
    id: "card-3",
    title: "Soundproof glass boardroom audio boundary verification",
    author: "Carol (Product)",
    category: "in_progress",
    color: "yellow",
    votes: 5,
  },
  {
    id: "card-4",
    title: "Lo-Fi focus radio continuous Web Audio synthesizer stations",
    author: "Dave (Audio)",
    category: "in_progress",
    color: "pink",
    votes: 7,
  },
  {
    id: "card-5",
    title: "Passcode-locked meeting rooms and door knock admittance",
    author: "Eve (Security)",
    category: "todo",
    color: "yellow",
    votes: 4,
  },
  {
    id: "card-6",
    title: "Office Pulse real-time telemetry and cloud savings tracker",
    author: "Frank (Lead)",
    category: "todo",
    color: "blue",
    votes: 9,
  },
];

const STICKY_STYLES = {
  yellow: "bg-amber-300 text-amber-950 border-amber-400 shadow-md",
  pink: "bg-pink-300 text-pink-950 border-pink-400 shadow-md",
  blue: "bg-sky-300 text-sky-950 border-sky-400 shadow-md",
  green: "bg-emerald-300 text-emerald-950 border-emerald-400 shadow-md",
};

export default function WhiteboardPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<"canvas" | "sprint">("canvas");
  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [color, setColor] = useState("#37E6C4");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Sprint Cards State
  const [cards, setCards] = useState<StickyCard[]>(INITIAL_CARDS);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState<"yellow" | "pink" | "blue" | "green">("yellow");
  const [newCategory, setNewCategory] = useState<"todo" | "in_progress" | "done">("todo");

  // Freehand Canvas Drawing Logic
  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    if (tool === "eraser") {
      ctx.strokeStyle = "#121626";
      ctx.lineWidth = strokeWidth * 5;
    } else if (tool === "highlighter") {
      ctx.strokeStyle = `${color}40`;
      ctx.lineWidth = strokeWidth * 4;
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
    ctx.fillStyle = "#121626";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (showGrid) {
      ctx.strokeStyle = "#1c223b";
      ctx.lineWidth = 1;
      const step = 24;
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
    }
  };

  useEffect(() => {
    clearCanvas();
  }, [showGrid]);

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `forgespace-architecture-whiteboard-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const card: StickyCard = {
      id: `card-${Date.now()}`,
      title: newTitle.trim(),
      author: "Current User",
      category: newCategory,
      color: newColor,
      votes: 1,
    };
    setCards((prev) => [...prev, card]);
    setNewTitle("");
  };

  const handleVoteCard = (id: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, votes: c.votes + 1 } : c))
    );
  };

  const handleDeleteCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
            War Room Tools
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text uppercase tracking-tight">
            Collaborative Whiteboard & Sprint Board
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-1 max-w-2xl">
            Sketch system architectures, whiteboard remote brainstorms, and manage agile sprint sticky cards with your team.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/space/acme-hq"
            className="px-4 py-2 bg-surface-2 hover:bg-surface border-2 border-border text-text font-display font-semibold text-xs rounded-control transition-all flex items-center gap-1.5"
          >
            <span>🏢 Open Inside Acme HQ Floor</span>
          </Link>
          <button
            onClick={handleExportPNG}
            className="px-4 py-2 bg-accent text-bg font-display font-bold text-xs rounded-control shadow-arcade hover:brightness-110 active:scale-95 transition-all"
          >
            💾 Export PNG
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("canvas")}
          className={`px-4 py-2 rounded-control font-display text-xs font-bold transition-all ${
            activeTab === "canvas"
              ? "bg-accent text-bg shadow-sm"
              : "bg-surface-2 text-text-muted hover:text-text"
          }`}
        >
          ✏️ Architecture Sketchpad
        </button>
        <button
          onClick={() => setActiveTab("sprint")}
          className={`px-4 py-2 rounded-control font-display text-xs font-bold transition-all ${
            activeTab === "sprint"
              ? "bg-accent text-bg shadow-sm"
              : "bg-surface-2 text-text-muted hover:text-text"
          }`}
        >
          📌 Agile Sprint Wall ({cards.length} Cards)
        </button>
      </div>

      {/* View 1: Architecture Canvas */}
      {activeTab === "canvas" && (
        <div className="space-y-4">
          {/* Canvas Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border-2 border-border rounded-xl">
            {/* Tool Mode */}
            <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-lg border border-border">
              {[
                { id: "pen", label: "Pen", icon: "✏️" },
                { id: "highlighter", label: "Marker", icon: "🖍️" },
                { id: "eraser", label: "Eraser", icon: "🧹" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id as any)}
                  className={`px-2.5 py-1 text-xs rounded font-display flex items-center gap-1 transition-all ${
                    tool === t.id
                      ? "bg-accent text-bg font-bold shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Colors */}
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
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c && tool !== "eraser"
                      ? "scale-110 border-white shadow-sm ring-2 ring-white/50"
                      : "border-black/40 hover:scale-105"
                  }`}
                />
              ))}
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-1.5 bg-surface-2 px-3 py-1 rounded-lg border border-border">
              <span className="text-[10px] font-mono text-text-muted uppercase">Stroke</span>
              {[2, 4, 8, 14].map((sz) => (
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

            {/* Grid & Clear Options */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2.5 py-1 text-xs font-display rounded-control border border-border ${
                  showGrid ? "bg-accent/20 text-accent border-accent" : "bg-surface-2 text-text-muted"
                }`}
              >
                {showGrid ? "✓ Grid On" : "Grid Off"}
              </button>
              <button
                onClick={clearCanvas}
                className="px-2.5 py-1 text-xs bg-surface-2 hover:bg-surface border border-border text-text-muted hover:text-text rounded-control"
              >
                Clear Sketchpad
              </button>
            </div>
          </div>

          {/* Canvas Box */}
          <div className="border-2 border-border rounded-xl overflow-hidden bg-[#121626] shadow-arcade flex justify-center">
            <canvas
              ref={canvasRef}
              width={1200}
              height={620}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              className="w-full h-auto cursor-crosshair touch-none"
            />
          </div>
        </div>
      )}

      {/* View 2: Agile Sprint Kanban Wall */}
      {activeTab === "sprint" && (
        <div className="space-y-6">
          {/* Add Card Form */}
          <form
            onSubmit={handleAddCard}
            className="p-4 bg-surface border-2 border-border rounded-xl flex flex-col sm:flex-row gap-3 items-stretch sm:items-center"
          >
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Card task or brainstorm item (e.g. Design 3D Boardroom lighting)..."
              className="flex-1 px-3 py-2 bg-surface-2 border border-border focus:border-accent rounded-control text-xs font-sans text-text outline-none"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="px-3 py-2 bg-surface-2 border border-border rounded-control text-xs font-sans text-text outline-none"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <select
              value={newColor}
              onChange={(e) => setNewColor(e.target.value as any)}
              className="px-3 py-2 bg-surface-2 border border-border rounded-control text-xs font-sans text-text outline-none"
            >
              <option value="yellow">Yellow Sticky</option>
              <option value="blue">Blue Sticky</option>
              <option value="green">Green Sticky</option>
              <option value="pink">Pink Sticky</option>
            </select>
            <button
              type="submit"
              className="px-5 py-2 bg-accent text-bg font-display font-bold text-xs rounded-control hover:brightness-110 shadow-sm"
            >
              + Add Sprint Card
            </button>
          </form>

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Backlog / To Do */}
            <div className="p-4 rounded-xl bg-surface border-2 border-border space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-display font-bold text-sm text-text uppercase">
                  📋 To Do
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-2 text-text-muted">
                  {cards.filter((c) => c.category === "todo").length}
                </span>
              </div>
              <div className="space-y-3 min-h-[300px]">
                {cards
                  .filter((c) => c.category === "todo")
                  .map((card) => (
                    <div
                      key={card.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] ${STICKY_STYLES[card.color]}`}
                    >
                      <p className="text-xs font-sans font-medium leading-relaxed">
                        {card.title}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-2 text-[10px] font-mono">
                        <span>{card.author}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVoteCard(card.id)}
                            className="font-bold hover:scale-110 transition-transform"
                          >
                            👍 {card.votes}
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-red-700 hover:text-red-900 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="p-4 rounded-xl bg-surface border-2 border-border space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-display font-bold text-sm text-accent uppercase">
                  ⚡ In Progress
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-2 text-accent">
                  {cards.filter((c) => c.category === "in_progress").length}
                </span>
              </div>
              <div className="space-y-3 min-h-[300px]">
                {cards
                  .filter((c) => c.category === "in_progress")
                  .map((card) => (
                    <div
                      key={card.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] ${STICKY_STYLES[card.color]}`}
                    >
                      <p className="text-xs font-sans font-medium leading-relaxed">
                        {card.title}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-2 text-[10px] font-mono">
                        <span>{card.author}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVoteCard(card.id)}
                            className="font-bold hover:scale-110 transition-transform"
                          >
                            👍 {card.votes}
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-red-700 hover:text-red-900 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 3: Done */}
            <div className="p-4 rounded-xl bg-surface border-2 border-border space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="font-display font-bold text-sm text-emerald-400 uppercase">
                  ✓ Shipped & Done
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-2 text-emerald-400">
                  {cards.filter((c) => c.category === "done").length}
                </span>
              </div>
              <div className="space-y-3 min-h-[300px]">
                {cards
                  .filter((c) => c.category === "done")
                  .map((card) => (
                    <div
                      key={card.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between min-h-[120px] ${STICKY_STYLES[card.color]}`}
                    >
                      <p className="text-xs font-sans font-medium leading-relaxed line-through opacity-85">
                        {card.title}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-2 text-[10px] font-mono">
                        <span>{card.author}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleVoteCard(card.id)}
                            className="font-bold hover:scale-110 transition-transform"
                          >
                            👍 {card.votes}
                          </button>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-red-700 hover:text-red-900 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
