"use client";

import React, { useEffect, useRef } from "react";
import type { ForgeGameSchemaV1_1 } from "@/lib/runtime/schema";
import { renderRoomStaticPreview } from "@/lib/runtime/engine";

interface GameThumbnailCanvasProps {
  projectData?: ForgeGameSchemaV1_1;
  title: string;
  isHtml5Bundle?: boolean;
  className?: string;
}

export function GameThumbnailCanvas({
  projectData,
  title,
  isHtml5Bundle = false,
  className = "",
}: GameThumbnailCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (projectData) {
      renderRoomStaticPreview(ctx, projectData);
      return;
    }

    // Stylized 320x240 pixel preview for HTML5 Uploaded Bundles
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0B0C14";
    ctx.fillRect(0, 0, 320, 240);

    // Draw starfield grid & ship
    ctx.strokeStyle = "#1D2040";
    ctx.lineWidth = 1;
    for (let x = 0; x < 320; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 240);
      ctx.stroke();
    }
    for (let y = 0; y < 240; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(320, y);
      ctx.stroke();
    }

    // Retro arcade vectors
    ctx.fillStyle = "#37E6C4";
    ctx.fillRect(72, 64, 12, 12);
    ctx.fillRect(220, 88, 12, 12);
    ctx.fillStyle = "#FF5C5C";
    ctx.fillRect(140, 48, 16, 16);
    ctx.fillRect(190, 130, 16, 16);

    // Player ship icon
    ctx.fillStyle = "#FF4D8D";
    ctx.fillRect(154, 178, 12, 24);
    ctx.fillRect(142, 190, 36, 10);

    ctx.fillStyle = "rgba(20, 22, 42, 0.85)";
    ctx.fillRect(16, 96, 288, 44);
    ctx.strokeStyle = "#37E6C4";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 96, 288, 44);

    ctx.fillStyle = "#EDEEFF";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText(title.slice(0, 28).toUpperCase(), 160, 116);
    ctx.fillStyle = "#37E6C4";
    ctx.font = "10px monospace";
    ctx.fillText(isHtml5Bundle ? "HTML5 SANDBOX BUNDLE" : "ARCADE FORGE", 160, 132);
    ctx.textAlign = "left";
  }, [projectData, title, isHtml5Bundle]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={240}
      className={`w-full aspect-[4/3] block bg-bg pixelated ${className}`}
    />
  );
}
