"use client";

import React from "react";
import { PeerState } from "@/lib/space/signaling";
import { PeerLinkStatus } from "@/lib/space/webrtcMesh";
import { IconMicOff, IconVideo } from "@/components/space/SpaceIcons";
import { hasAttachedVideoTrack, StreamVideo } from "@/components/space/StreamVideo";

interface VideoDockProps {
  localPeer: PeerState;
  nearbyPeers: PeerState[];
  speakingMap: Record<string, boolean>;
  streamsMap: Record<string, MediaStream>;
  peerLinkStates?: Record<string, PeerLinkStatus>;
  onSelectPeer?: (peer: PeerState) => void;
  onSwitchToCallView?: () => void;
}

const LINK_BADGE: Record<PeerLinkStatus, { label: string; dot: string }> = {
  connecting: { label: "...", dot: "bg-amber-400 animate-pulse" },
  connected: { label: "P2P", dot: "bg-emerald-400" },
  relayed: { label: "TURN", dot: "bg-sky-400" },
  disconnected: { label: "Reconn", dot: "bg-amber-500 animate-pulse" },
  failed: { label: "Retry", dot: "bg-red-500" },
};

export function VideoDock({
  localPeer,
  nearbyPeers,
  speakingMap,
  streamsMap,
  peerLinkStates = {},
  onSelectPeer,
  onSwitchToCallView,
}: VideoDockProps) {
  const allInProximity = [localPeer, ...nearbyPeers];

  return (
    <div className="max-w-[94vw] rounded-2xl bg-surface/85 backdrop-blur-xl border border-border/75 shadow-arcade px-2.5 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
      {allInProximity.map((peer) => {
        const isLocal = peer.id === localPeer.id;
        const isSpeaking = !!(speakingMap[isLocal ? "local" : peer.id] || speakingMap[peer.id]);
        const stream = streamsMap[peer.id] || (isLocal ? streamsMap["local"] : undefined);
        const hasVideoTrack = hasAttachedVideoTrack(stream, peer.media);
        const linkStatus = !isLocal ? peerLinkStates[peer.id] : undefined;
        const linkBadge = linkStatus ? LINK_BADGE[linkStatus] : undefined;

        const avatarFallback = (
          <div
            className="w-full h-full flex items-center justify-center text-xs font-display font-bold text-white"
            style={{ backgroundColor: peer.avatarColor }}
          >
            {peer.name.slice(0, 2).toUpperCase()}
          </div>
        );

        return (
          <button
            key={peer.id}
            type="button"
            onClick={() => !isLocal && onSelectPeer?.(peer)}
            title={isLocal ? "You" : `Walk to ${peer.name}`}
            className="flex-shrink-0 flex flex-col items-center gap-1 cursor-pointer group focus:outline-none"
          >
            <div
              className={`w-20 h-14 sm:w-28 sm:h-16 rounded-xl overflow-hidden border-2 bg-bg relative flex items-center justify-center transition-transform group-hover:scale-[1.03] ${
                isSpeaking
                  ? "border-[#37E6C4] ring-2 ring-[#37E6C4]/40"
                  : isLocal
                    ? "border-accent/80"
                    : "border-border/80"
              }`}
            >
              {hasVideoTrack && stream ? (
                <StreamVideo
                  stream={stream}
                  mirror={isLocal && !peer.media.screen}
                  fallback={avatarFallback}
                />
              ) : (
                avatarFallback
              )}

              {linkBadge && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-black/65 backdrop-blur-sm text-[8px] font-mono text-white flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${linkBadge.dot}`} />
                  {linkBadge.label}
                </span>
              )}

              {peer.media.screen && (
                <span className="absolute top-1 right-1 px-1 py-0.2 rounded bg-accent text-bg text-[8px] font-display font-bold">
                  LIVE
                </span>
              )}

              {!peer.media.audio && (
                <span
                  title="Muted"
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-red-500/95 text-white flex items-center justify-center shadow-sm"
                >
                  <IconMicOff className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            <span className="text-[10px] font-display text-text-muted truncate max-w-[84px] text-center leading-tight">
              {isLocal ? "You" : peer.name}
            </span>
          </button>
        );
      })}

      {onSwitchToCallView && (
        <button
          type="button"
          onClick={onSwitchToCallView}
          title="Open Full Video Call Stage"
          className="flex-shrink-0 h-14 sm:h-16 px-2.5 rounded-xl bg-accent/15 hover:bg-accent/25 border border-accent/40 text-accent flex flex-col items-center justify-center gap-1 transition-colors"
        >
          <IconVideo className="w-4 h-4" />
          <span className="text-[9px] font-display font-bold uppercase tracking-wider">Call</span>
        </button>
      )}
    </div>
  );
}
