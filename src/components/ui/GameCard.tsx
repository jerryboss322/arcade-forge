"use client";

import React from "react";
import Link from "next/link";
import type { ArcadeGameRecord } from "@/lib/store/arcade-store";
import { GameThumbnailCanvas } from "./GameThumbnailCanvas";

interface GameCardProps {
  game: ArcadeGameRecord;
}

export function GameCard({ game }: GameCardProps) {
  const isStudio = game.type === "FORGE_STUDIO";

  return (
    <article className="group rounded-card border-2 border-border bg-surface shadow-arcade hover:shadow-arcade-lg hover:-translate-y-1 transition-all duration-150 overflow-hidden flex flex-col">
      <Link href={`/game/${game.slug}`} className="block relative overflow-hidden">
        {/* 4:3 Thumbnail at 320x240 so maker viewports are never cropped */}
        <GameThumbnailCanvas
          projectData={game.projectData}
          title={game.title}
          isHtml5Bundle={!isStudio}
        />

        {/* Top-left badge: Studio or Upload */}
        <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-display uppercase tracking-wider font-bold border border-black shadow-arcade-sm ${
              isStudio
                ? "bg-accent text-bg"
                : "bg-accent-2 text-bg"
            }`}
          >
            {isStudio ? "Studio" : "Upload"}
          </span>

          {game.jamWinnerBadge && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-display uppercase tracking-wider font-bold bg-warn text-bg border border-black shadow-arcade-sm">
              ★ {game.jamWinnerBadge}
            </span>
          )}
        </div>

        {/* Bottom-right length bucket pill */}
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-bg/90 text-text border border-border">
          {game.lengthBucket}
        </span>
      </Link>

      {/* Card Body: 12-16px padding, 2-line title clamp, author + stats row */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
        <div>
          <Link
            href={`/game/${game.slug}`}
            className="text-base font-semibold text-text group-hover:text-accent transition-colors line-clamp-2 leading-snug"
          >
            {game.title}
          </Link>

          {game.remixedFromTitle && (
            <p className="text-[12px] text-text-muted mt-0.5 truncate">
              ⇄ Remixed from <span className="text-accent-2">{game.remixedFromTitle}</span>
            </p>
          )}
        </div>

        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
          <Link
            href={`/profile/${game.authorUsername}`}
            className="flex items-center gap-1.5 hover:text-text truncate"
          >
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-bg shrink-0 border border-black"
              style={{ backgroundColor: game.authorAvatarColor }}
            >
              {game.authorUsername[0]?.toUpperCase()}
            </span>
            <span className="truncate font-medium">@{game.authorUsername}</span>
          </Link>

          <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
            <span title="Likes" className="flex items-center gap-1 text-accent">
              ♥ {game.likeCount}
            </span>
            <span title="Plays" className="flex items-center gap-1 text-text-muted">
              ▶ {game.playCount}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
