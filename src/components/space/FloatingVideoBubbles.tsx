"use client";

import React, { useRef, useEffect } from "react";
import { PeerState } from "@/lib/space/signaling";

interface FloatingVideoBubblesProps {
  peers: PeerState[];
  speakingMap: Record<string, boolean>;
  screenPositions: Record<string, { screenX: number; screenY: number; inView: boolean }>;
  streamsMap: Record<string, MediaStream>;
  onBubbleClick?: (peer: PeerState) => void;
}

export function FloatingVideoBubbles({
  peers,
  speakingMap,
  screenPositions,
  streamsMap,
  onBubbleClick,
}: FloatingVideoBubblesProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {peers.map((peer) => {
        const pos = screenPositions[peer.id];
        if (!pos || !pos.inView) return null;

        const isSpeaking = !!speakingMap[peer.id];
        const stream = streamsMap[peer.id];

        // Anchor 45px above avatar's center
        const bubbleX = pos.screenX - 32;
        const bubbleY = pos.screenY - 68;

        return (
          <div
            key={peer.id}
            style={{
              transform: `translate3d(${Math.round(bubbleX)}px, ${Math.round(bubbleY)}px, 0)`,
            }}
            onClick={() => onBubbleClick?.(peer)}
            className="absolute top-0 left-0 w-16 h-16 rounded-full pointer-events-auto cursor-pointer transition-transform duration-75 hover:scale-110 flex items-center justify-center"
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
}

function PeerVideoElement({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
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
}
