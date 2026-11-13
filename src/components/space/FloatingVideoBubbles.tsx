"use client";

import React, { useRef, useEffect, useLayoutEffect, memo } from "react";
import { PeerState } from "@/lib/space/signaling";
import {
  ScreenPosition,
  screenPositionsStore,
} from "@/lib/space/screenPositionsStore";
import { IconMicOff } from "@/components/space/SpaceIcons";
import { hasActiveVideoFeed, StreamVideo } from "@/components/space/StreamVideo";

interface FloatingVideoBubblesProps {
  peers: PeerState[];
  localPeerId?: string;
  speakingMap: Record<string, boolean>;
  screenPositions?: Record<string, ScreenPosition>;
  streamsMap: Record<string, MediaStream>;
  onBubbleClick?: (peer: PeerState) => void;
}

const FloatingBubble = memo(function FloatingBubble({
  peer,
  isLocal,
  isSpeaking,
  stream,
  externalPos,
  onBubbleClick,
}: {
  peer: PeerState;
  isLocal: boolean;
  isSpeaking: boolean;
  stream?: MediaStream;
  externalPos?: ScreenPosition;
  onBubbleClick?: (peer: PeerState) => void;
}) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const hasLiveVideo = hasActiveVideoFeed(stream, peer.media, isLocal);

  const applyPosition = (pos?: ScreenPosition) => {
    const el = elRef.current;
    if (!el) return;
    if (!pos || !pos.inView) {
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      return;
    }
    const bubbleX = Math.round(pos.screenX - 32);
    const bubbleY = Math.round(pos.screenY - 68);
    el.style.transform = `translate3d(${bubbleX}px, ${bubbleY}px, 0)`;
    el.style.opacity = "1";
    el.style.pointerEvents = "auto";
  };

  // Re-apply snapshot before paint on any re-render so React never resets imperative position
  useLayoutEffect(() => {
    applyPosition(externalPos ?? screenPositionsStore.getSnapshot()[peer.id]);
  });

  useEffect(() => {
    if (externalPos) {
      applyPosition(externalPos);
      return;
    }
    const handleUpdate = (positions: Record<string, ScreenPosition>) => {
      applyPosition(positions[peer.id]);
    };
    handleUpdate(screenPositionsStore.getSnapshot());
    return screenPositionsStore.subscribe(handleUpdate);
  }, [peer.id, externalPos]);

  return (
    <div
      ref={elRef}
      style={{ willChange: "transform, opacity" }}
      onClick={() => onBubbleClick?.(peer)}
      className="absolute top-0 left-0 w-16 flex flex-col items-center cursor-pointer hover:scale-105 opacity-0 pointer-events-none"
    >
      <div
        className={`w-16 h-16 rounded-full overflow-hidden border-2 bg-surface shadow-arcade flex items-center justify-center relative ${
          isSpeaking
            ? "border-[#37E6C4] ring-4 ring-[#37E6C4]/30 animate-pulse"
            : isLocal
              ? "border-accent"
              : "border-border"
        }`}
      >
        {hasLiveVideo && stream ? (
          <StreamVideo stream={stream} mirror={isLocal} />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center"
            style={{ backgroundColor: `${peer.avatarColor}22` }}
          >
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: peer.avatarColor }}
            >
              {peer.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* Audio Mute Badge */}
        {!peer.media.audio && (
          <span
            title="Muted"
            className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/95 text-white flex items-center justify-center shadow-sm"
          >
            <IconMicOff className="w-2.5 h-2.5" />
          </span>
        )}
      </div>
      <span className="mt-1 px-1.5 py-0.5 rounded-full bg-surface/85 backdrop-blur-sm border border-border/60 text-[9px] font-display font-semibold text-text whitespace-nowrap shadow-sm">
        {isLocal ? "You" : peer.name}
      </span>
    </div>
  );
});

export const FloatingVideoBubbles = memo(function FloatingVideoBubbles({
  peers,
  localPeerId,
  speakingMap,
  screenPositions,
  streamsMap,
  onBubbleClick,
}: FloatingVideoBubblesProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {peers.map((peer, index) => {
        const isLocal = localPeerId ? peer.id === localPeerId : index === 0;
        const isSpeaking = !!(speakingMap[peer.id] || (isLocal && speakingMap["local"]));
        const stream = streamsMap[peer.id] || (isLocal ? streamsMap["local"] : undefined);

        return (
          <FloatingBubble
            key={peer.id}
            peer={peer}
            isLocal={isLocal}
            isSpeaking={isSpeaking}
            stream={stream}
            externalPos={screenPositions?.[peer.id]}
            onBubbleClick={onBubbleClick}
          />
        );
      })}
    </div>
  );
});
