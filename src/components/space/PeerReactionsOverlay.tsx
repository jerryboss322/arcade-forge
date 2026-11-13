"use client";

import React, { useEffect, useRef, memo } from "react";
import { ActivePeerReaction } from "@/lib/space/officeReactions";
import { screenPositionsStore, ScreenPosition } from "@/lib/space/screenPositionsStore";

interface PeerReactionsOverlayProps {
  reactions: Record<string, ActivePeerReaction>;
}

const ReactionPin = memo(function ReactionPin({
  reaction,
}: {
  reaction: ActivePeerReaction;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const applyPos = (positions: Record<string, ScreenPosition>) => {
      const el = nodeRef.current;
      if (!el) return;
      const pos = positions[reaction.peerId];
      if (!pos || !pos.inView) {
        el.style.opacity = "0";
        return;
      }
      el.style.opacity = "1";
      el.style.transform = `translate3d(${pos.screenX}px, ${pos.screenY - 96}px, 0) translate(-50%, -100%)`;
    };

    applyPos(screenPositionsStore.getSnapshot());
    return screenPositionsStore.subscribe(applyPos);
  }, [reaction.peerId]);

  return (
    <div
      ref={nodeRef}
      style={{
        left: 0,
        top: 0,
        opacity: 0,
        willChange: "transform, opacity",
      }}
      className="absolute pointer-events-none select-none transition-opacity duration-150"
    >
      <div className="px-2.5 py-1 rounded-full bg-surface/95 backdrop-blur-md border border-accent shadow-arcade flex items-center gap-1.5 animate-bounce">
        <span className="text-base leading-none">{reaction.emoji}</span>
        <span className="text-[10px] font-display font-bold text-text whitespace-nowrap">
          {reaction.label}
        </span>
      </div>
    </div>
  );
});

export const PeerReactionsOverlay = memo(function PeerReactionsOverlay({
  reactions,
}: PeerReactionsOverlayProps) {
  const entries = Object.values(reactions);
  if (entries.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-25">
      {entries.map((reaction) => (
        <ReactionPin key={reaction.peerId} reaction={reaction} />
      ))}
    </div>
  );
});
