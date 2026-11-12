"use client";

import React, { useRef, useState, useEffect } from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";

interface WhiteboardModalProps {
  open: boolean;
  onClose: () => void;
}

export function WhiteboardModal({ open, onClose }: WhiteboardModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState("#37E6C4");
  const [isDrawing, setIsDrawing] = useState(false);
  const [notes, setNotes] = useState(
    "📝 Team Brainstorm Sprint:\n- Launch ForgeSpace P2P Virtual Office\n- Add Spatial WebRTC Proximity\n- Embed 60Hz Retro Arcade in Breakroom\n- 100% Zero Database Cost on Neon Free Tier!"
  );

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
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
  };

  useEffect(() => {
    if (open) {
      setTimeout(clearCanvas, 50);
    }
  }, [open]);

  return (
    <ArcadeDialog
      open={open}
      onClose={onClose}
      title="📋 War Room Whiteboard & Brainstorm"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Color Palette & Clear Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {["#37E6C4", "#FF0055", "#FFC53D", "#00A8FF", "#EDEEFF"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  color === c ? "scale-110 border-white shadow-sm" : "border-black/40"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={clearCanvas}
            className="px-2.5 py-1 text-xs bg-surface-2 hover:bg-surface border border-border text-text-muted hover:text-text rounded-control"
          >
            Clear Sketchpad
          </button>
        </div>

        {/* Drawing Canvas */}
        <div className="border-2 border-border rounded-control overflow-hidden bg-[#1E2238]">
          <canvas
            ref={canvasRef}
            width={580}
            height={240}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            className="w-full h-[240px] cursor-crosshair block"
          />
        </div>

        {/* Shared Team Notes */}
        <div>
          <label className="block text-xs font-display text-text mb-1">
            Shared Team Notes & Action Items:
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full p-2.5 text-xs font-mono bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
          />
        </div>
      </div>
    </ArcadeDialog>
  );
}
