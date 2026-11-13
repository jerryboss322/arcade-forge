"use client";

import React from "react";
import { PeerState } from "@/lib/space/signaling";
import { IconMicOff } from "@/components/space/SpaceIcons";
import { hasActiveVideoFeed, StreamVideo } from "@/components/space/StreamVideo";

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
    <div className="max-w-[92vw] rounded-2xl bg-surface/80 backdrop-blur-xl border border-border/75 shadow-arcade px-2.5 py-1.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
      {allInProximity.map((peer) => {
        const isLocal = peer.id === localPeer.id;
        const isSpeaking = !!(speakingMap[isLocal ? "local" : peer.id] || speakingMap[peer.id]);
        const stream = streamsMap[peer.id] || (isLocal ? streamsMap["local"] : undefined);
        const hasLiveVideo = hasActiveVideoFeed(stream, peer.media, isLocal);

        return (
          <button
            key={peer.id}
            type="button"
            onClick={() => !isLocal && onSelectPeer?.(peer)}
            title={isLocal ? "You" : `Walk to ${peer.name}`}
            className="flex-shrink-0 flex flex-col items-center gap-0.5 cursor-pointer group focus:outline-none"
          >
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 bg-bg relative flex items-center justify-center transition-transform group-hover:scale-105 ${
                isSpeaking
                  ? "border-[#37E6C4] ring-2 ring-[#37E6C4]/40"
                  : isLocal
                    ? "border-accent/80"
                    : "border-border/80"
              }`}
            >
              {hasLiveVideo && stream ? (
                <StreamVideo stream={stream} mirror={isLocal} />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-xs font-display font-bold text-white"
                  style={{ backgroundColor: peer.avatarColor }}
                >
                  {peer.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              {!peer.media.audio && (
                <span
                  title="Muted"
                  className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-red-500/95 text-white flex items-center justify-center shadow-sm"
                >
                  <IconMicOff className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            <span className="text-[10px] font-display text-text-muted truncate max-w-[54px] text-center leading-tight">
              {isLocal ? "You" : peer.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
