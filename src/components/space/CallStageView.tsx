"use client";

import React, { useMemo } from "react";
import { PeerState } from "@/lib/space/signaling";
import { LocalMediaStatus, PeerLinkStatus } from "@/lib/space/webrtcMesh";
import { hasAttachedVideoTrack, StreamVideo } from "@/components/space/StreamVideo";
import {
  IconCube,
  IconFlipCamera,
  IconMicOff,
  IconRefresh,
  IconVideo,
  IconVideoOff,
} from "@/components/space/SpaceIcons";

interface CallStageViewProps {
  localPeer: PeerState;
  peers: PeerState[];
  speakingMap: Record<string, boolean>;
  streamsMap: Record<string, MediaStream>;
  peerLinkStates: Record<string, PeerLinkStatus>;
  localMediaStatus?: LocalMediaStatus | null;
  onToggleVideo: () => void;
  onSwitchCamera: () => void;
  onRetryMedia: () => void;
  onBackToOffice: () => void;
  onWalkToPeer?: (peer: PeerState) => void;
}

const LINK_STATUS_PILL: Record<PeerLinkStatus, { text: string; className: string }> = {
  connecting: {
    text: "Connecting...",
    className: "bg-amber-500/20 text-amber-300 border-amber-400/40",
  },
  connected: {
    text: "HD P2P",
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
  },
  relayed: {
    text: "TURN Relay",
    className: "bg-sky-500/20 text-sky-300 border-sky-400/40",
  },
  disconnected: {
    text: "Reconnecting...",
    className: "bg-amber-500/25 text-amber-200 border-amber-400/50 animate-pulse",
  },
  failed: {
    text: "Blocked / Retry",
    className: "bg-red-500/25 text-red-300 border-red-500/50",
  },
};

export function CallStageView({
  localPeer,
  peers,
  speakingMap,
  streamsMap,
  peerLinkStates,
  localMediaStatus,
  onToggleVideo,
  onSwitchCamera,
  onRetryMedia,
  onBackToOffice,
  onWalkToPeer,
}: CallStageViewProps) {
  const sortedRemotePeers = useMemo(() => {
    return [...peers].sort((a, b) => {
      const aScreen = a.media.screen ? 1 : 0;
      const bScreen = b.media.screen ? 1 : 0;
      if (aScreen !== bScreen) return bScreen - aScreen;
      const aVideo = a.media.video ? 1 : 0;
      const bVideo = b.media.video ? 1 : 0;
      if (aVideo !== bVideo) return bVideo - aVideo;
      const aSpeak = speakingMap[a.id] ? 1 : 0;
      const bSpeak = speakingMap[b.id] ? 1 : 0;
      return bSpeak - aSpeak;
    });
  }, [peers, speakingMap]);

  const localStream = streamsMap[localPeer.id] || streamsMap["local"];
  const localHasVideo = hasAttachedVideoTrack(localStream, localPeer.media);
  const localMirror = !localPeer.media.screen && localMediaStatus?.cameraFacing !== "environment";
  const localSpeaking = !!(speakingMap["local"] || speakingMap[localPeer.id]);

  const gridColsClass =
    sortedRemotePeers.length <= 1
      ? "grid-cols-1"
      : sortedRemotePeers.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : sortedRemotePeers.length <= 4
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-2 lg:grid-cols-3";

  const localAvatarFallback = (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-1.5"
      style={{ backgroundColor: `${localPeer.avatarColor}28` }}
    >
      <span
        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-display font-bold text-white shadow"
        style={{ backgroundColor: localPeer.avatarColor }}
      >
        {localPeer.name.slice(0, 2).toUpperCase()}
      </span>
      <span className="text-[10px] font-display text-text-muted">
        {localPeer.media.video ? "Starting cam..." : "Camera off"}
      </span>
    </div>
  );

  return (
    <div className="relative w-full h-full bg-[#090d16] flex flex-col overflow-hidden">
      {/* Subtle WhatsApp Call Top Header Bar */}
      <div className="relative z-10 px-4 pt-16 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/75 backdrop-blur-md border border-border/70 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-display font-bold text-text">Video Call Stage</span>
          <span className="text-text-muted font-mono">
            · {sortedRemotePeers.length + 1} online
          </span>
        </div>

        <button
          type="button"
          onClick={onBackToOffice}
          className="px-3 py-1.5 rounded-full bg-surface/80 hover:bg-surface border border-border/70 hover:border-accent text-xs font-display font-bold text-text flex items-center gap-1.5 transition-colors"
        >
          <IconCube className="w-3.5 h-3.5 text-accent" />
          <span>Office View</span>
        </button>
      </div>

      {/* Main Call Grid */}
      <div className="flex-1 min-h-0 px-3 sm:px-6 pb-24 pt-1 flex items-center justify-center">
        {sortedRemotePeers.length === 0 ? (
          <div className="relative w-full max-w-2xl h-full max-h-[68vh] rounded-3xl overflow-hidden border border-border/70 bg-surface/60 shadow-2xl flex flex-col items-center justify-center">
            {localHasVideo && localStream ? (
              <StreamVideo
                stream={localStream}
                mirror={localMirror}
                className="w-full h-full object-cover"
                fallback={localAvatarFallback}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-display font-bold text-white shadow-lg"
                  style={{ backgroundColor: localPeer.avatarColor }}
                >
                  {localPeer.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="font-display font-bold text-base text-text">
                  Waiting for teammates to join...
                </p>
                <p className="text-xs text-text-muted">
                  Share your workspace link so colleagues can join your WhatsApp-style video call.
                </p>
                {localMediaStatus?.cameraError && (
                  <div className="mt-1 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex flex-col items-center gap-2">
                    <span>{localMediaStatus.cameraError}</span>
                    <button
                      type="button"
                      onClick={onRetryMedia}
                      className="px-3 py-1 rounded-full bg-amber-400 text-black font-display font-bold text-[11px] flex items-center gap-1"
                    >
                      <IconRefresh className="w-3 h-3" />
                      <span>Retry Camera</span>
                    </button>
                  </div>
                )}
                {!localPeer.media.video && !localMediaStatus?.cameraError && (
                  <button
                    type="button"
                    onClick={onToggleVideo}
                    className="mt-1 px-4 py-2 rounded-full bg-accent text-bg font-display font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                  >
                    <IconVideo className="w-3.5 h-3.5" />
                    <span>Turn On Camera</span>
                  </button>
                )}
              </div>
            )}

            <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-xs font-display text-white flex items-center gap-2">
              <span>You ({localPeer.name})</span>
              {!localPeer.media.audio && <IconMicOff className="w-3.5 h-3.5 text-red-400" />}
            </div>

            {localHasVideo && (
              <button
                type="button"
                onClick={onSwitchCamera}
                title="Switch Front / Back Camera"
                className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/65 hover:bg-black/80 backdrop-blur-md border border-white/15 text-xs font-display text-white flex items-center gap-1.5"
              >
                <IconFlipCamera className="w-3.5 h-3.5" />
                <span>Flip Cam</span>
              </button>
            )}
          </div>
        ) : (
          <div className={`w-full h-full max-w-6xl grid ${gridColsClass} gap-3 auto-rows-fr`}>
            {sortedRemotePeers.map((peer) => {
              const stream = streamsMap[peer.id];
              const hasVideoTrack = hasAttachedVideoTrack(stream, peer.media);
              const isSpeaking = !!speakingMap[peer.id];
              const linkStatus = peerLinkStates[peer.id] ?? "connecting";
              const pill = LINK_STATUS_PILL[linkStatus];

              const remoteAvatarFallback = (
                <div
                  className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#111827]"
                  style={{ backgroundColor: `${peer.avatarColor}20` }}
                >
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-display font-bold text-white shadow-lg transition-transform ${
                      isSpeaking ? "scale-110 ring-4 ring-[#37E6C4]/50" : ""
                    }`}
                    style={{ backgroundColor: peer.avatarColor }}
                  >
                    {peer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs font-display text-text-muted">
                    {peer.media.screen || peer.media.video
                      ? "Connecting live video..."
                      : "Camera turned off"}
                  </span>
                </div>
              );

              return (
                <div
                  key={peer.id}
                  className={`relative rounded-2xl overflow-hidden bg-[#111827] border-2 transition-colors ${
                    isSpeaking
                      ? "border-[#37E6C4] ring-2 ring-[#37E6C4]/35"
                      : "border-border/70"
                  }`}
                >
                  {hasVideoTrack && stream ? (
                    <StreamVideo
                      stream={stream}
                      className={
                        peer.media.screen
                          ? "w-full h-full object-contain bg-black"
                          : "w-full h-full object-cover"
                      }
                      fallback={remoteAvatarFallback}
                    />
                  ) : (
                    remoteAvatarFallback
                  )}

                  {/* Top status pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-mono backdrop-blur-md ${pill.className}`}
                    >
                      {pill.text}
                    </span>
                    {peer.media.screen && (
                      <span className="px-2 py-0.5 rounded-full bg-accent text-bg text-[10px] font-display font-bold">
                        SCREEN
                      </span>
                    )}
                  </div>

                  {/* Walk to peer quick button */}
                  {onWalkToPeer && (
                    <button
                      type="button"
                      onClick={() => onWalkToPeer(peer)}
                      className="hidden sm:flex absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-[10px] font-display text-white/90 border border-white/15"
                    >
                      Walk Near
                    </button>
                  )}

                  {/* Bottom Name & Mic State */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-xs font-display font-semibold text-white flex items-center gap-2">
                      <span>{peer.name}</span>
                      {peer.zoneId && (
                        <span className="text-[10px] text-white/65 font-normal">
                          · {peer.zoneId.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!peer.media.video && !peer.media.screen && (
                        <span className="w-6 h-6 rounded-full bg-black/65 text-white/80 flex items-center justify-center">
                          <IconVideoOff className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {!peer.media.audio && (
                        <span className="w-6 h-6 rounded-full bg-red-500/90 text-white flex items-center justify-center">
                          <IconMicOff className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WhatsApp Self Picture-in-Picture (PiP) when remote teammates are present */}
      {sortedRemotePeers.length > 0 && (
        <div
          className={`absolute bottom-24 right-4 z-30 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden bg-surface border-2 shadow-2xl transition-all ${
            localSpeaking ? "border-[#37E6C4]" : "border-accent/80"
          }`}
        >
          {localHasVideo && localStream ? (
            <StreamVideo
              stream={localStream}
              mirror={localMirror}
              className="w-full h-full object-cover"
              fallback={localAvatarFallback}
            />
          ) : (
            localAvatarFallback
          )}

          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1">
            <span className="px-1.5 py-0.5 rounded bg-black/65 text-[9px] font-display text-white">
              You
            </span>
            <div className="flex items-center gap-1">
              {localHasVideo ? (
                <button
                  type="button"
                  onClick={onSwitchCamera}
                  title="Flip Camera"
                  className="w-6 h-6 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center border border-white/20"
                >
                  <IconFlipCamera className="w-3 h-3" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={localMediaStatus?.cameraError ? onRetryMedia : onToggleVideo}
                  title="Turn On / Retry Camera"
                  className="w-6 h-6 rounded-full bg-accent text-bg flex items-center justify-center"
                >
                  <IconRefresh className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
