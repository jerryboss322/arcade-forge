"use client";

import React, { useRef, useEffect, memo } from "react";
import { PeerState } from "@/lib/space/signaling";
import {
  ScreenPosition,
  screenPositionsStore,
} from "@/lib/space/screenPositionsStore";

interface FloatingVideoBubblesProps {
  peers: PeerState[];
  speakingMap: Record<string, boolean>;
  screenPositions?: Record<string, ScreenPosition>;
  streamsMap: Record<string, MediaStream>;
  onBubbleClick?: (peer: PeerState) => void;
}

export const FloatingVideoBubbles = memo(function FloatingVideoBubbles({
  peers,
  speakingMap,
  screenPositions,
  streamsMap,
  onBubbleClick,
}: FloatingVideoBubblesProps) {
  const bubbleRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Subscribe directly to 60Hz DOM transform updates without triggering React re-renders
  useEffect(() => {
    const applyPositions = (positions: Record<string, ScreenPosition>) => {
      for (const [peerId, el] of Object.entries(bubbleRefs.current)) {
        if (!el) continue;
        const pos = positions[peerId];
        if (!pos || !pos.inView) {
          el.style.opacity = "0";
          el.style.pointerEvents = "none";
          continue;
        }
        const bubbleX = Math.round(pos.screenX - 32);
        const bubbleY = Math.round(pos.screenY - 68);
        el.style.transform = `translate3d(${bubbleX}px, ${bubbleY}px, 0)`;
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
      }
    };

    // Apply current snapshot immediately
    applyPositions(screenPositions || screenPositionsStore.getSnapshot());

    return screenPositionsStore.subscribe(applyPositions);
  }, [screenPositions, peers]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {peers.map((peer) => {
        const isSpeaking = !!speakingMap[peer.id];
        const stream = streamsMap[peer.id];

        return (
          <div
            key={peer.id}
            ref={(el) => {
              bubbleRefs.current[peer.id] = el;
            }}
            style={{
              transform: "translate3d(-9999px, -9999px, 0)",
              opacity: 0,
              willChange: "transform",
            }}
            onClick={() => onBubbleClick?.(peer)}
            className="absolute top-0 left-0 w-16 h-16 rounded-full cursor-pointer hover:scale-110 flex items-center justify-center"
          >
            <div
              className={`w-full h-full rounded-full overflow-hidden border-2 bg-surface shadow-arcade flex items-center justify-center relative ${
                isSpeaking
                  ? "border-[#37E6C4] ring-4 ring-[#37E6C4]/30 animate-pulse"
                  : "border-border"
              }`}
            >
              {stream && peer.media.video ? (
                <PeerVideoElement stream={stream} />
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

              {/* Status or Mute Icon */}
              {!peer.media.audio && (
                <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500/90 text-white flex items-center justify-center text-[9px] shadow-sm">
                  🔇
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

const PeerVideoElement = memo(function PeerVideoElement({
  stream,
}: {
  stream: MediaStream;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="w-full h-full object-cover"
    />
  );
});
