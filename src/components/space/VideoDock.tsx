"use client";

import React, { useRef, useEffect } from "react";
import { PeerState } from "@/lib/space/signaling";

interface VideoDockProps {
  localPeer: PeerState;
  nearbyPeers: PeerState[];
  speakingMap: Record<string, boolean>;
  streamsMap: Record<string, MediaStream>;
  onSelectPeer?: (peer: PeerState) => void;
}

export function VideoDock({
  localPeer,
  nearbyPeers,
  speakingMap,
  streamsMap,
  onSelectPeer,
}: VideoDockProps) {
  const allInProximity = [localPeer, ...nearbyPeers];

  return (
    <div className="w-full bg-surface-2/95 backdrop-blur-md border-t border-border px-3 py-2 flex items-center gap-3 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] font-display text-text-muted uppercase tracking-wider">
          Nearby ({allInProximity.length})
        </span>
      </div>

      <div className="flex items-center gap-2">
        {allInProximity.map((peer) => {
          const isLocal = peer.id === localPeer.id;
          const isSpeaking = !!speakingMap[isLocal ? "local" : peer.id];
          const stream = streamsMap[peer.id] || (isLocal ? streamsMap["local"] : undefined);

          return (
            <div
              key={peer.id}
              onClick={() => onSelectPeer?.(peer)}
              className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group"
            >
              <div
                className={`w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 bg-black relative flex items-center justify-center transition-transform group-hover:scale-105 ${
                  isSpeaking
                    ? "border-[#37E6C4] ring-2 ring-[#37E6C4]/40"
                    : isLocal
                    ? "border-accent"
                    : "border-border"
                }`}
              >
                {stream && peer.media.video ? (
                  <DockVideoElement stream={stream} mirror={isLocal} />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xs font-display font-bold text-white"
                    style={{ backgroundColor: peer.avatarColor }}
                  >
                    {peer.name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                {/* Mute badge */}
                {!peer.media.audio && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px]">
                    🔇
                  </span>
                )}
              </div>

              <span className="text-[10px] font-display text-text-muted truncate max-w-[60px] text-center">
                {isLocal ? "You" : peer.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DockVideoElement({ stream, mirror = false }: { stream: MediaStream; mirror?: boolean }) {
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
}
