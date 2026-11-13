"use client";

import React, { useRef, useEffect, useLayoutEffect, memo } from "react";
import { PeerState } from "@/lib/space/signaling";
import {
  ScreenPosition,
  screenPositionsStore,
} from "@/lib/space/screenPositionsStore";
import { IconMicOff } from "@/components/space/SpaceIcons";

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
      className="absolute top-0 left-0 w-16 h-16 rounded-full cursor-pointer hover:scale-110 flex items-center justify-center opacity-0 pointer-events-none"
    >
      <div
        className={`w-full h-full rounded-full overflow-hidden border-2 bg-surface shadow-arcade flex items-center justify-center relative ${
          isSpeaking
            ? "border-[#37E6C4] ring-4 ring-[#37E6C4]/30 animate-pulse"
            : isLocal
              ? "border-accent"
              : "border-border"
        }`}
      >
        {stream && peer.media.video ? (
          <PeerVideoElement stream={stream} mirror={isLocal} />
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

const PeerVideoElement = memo(function PeerVideoElement({
  stream,
  mirror = false,
}: {
  stream: MediaStream;
  mirror?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) return;
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    videoEl.play().catch(() => {});
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`w-full h-full object-cover ${mirror ? "scale-x-[-1]" : ""}`}
    />
  );
});
