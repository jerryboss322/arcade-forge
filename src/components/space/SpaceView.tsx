"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  OFFICE_ZONES,
  OfficeTilemap,
  SpaceZone,
  InteractiveObject,
  createDefaultOfficeMap,
  getZoneAt,
} from "@/lib/space/officeMap";
import { PeerState } from "@/lib/space/signaling";
import { SpaceCanvas } from "@/components/space/SpaceCanvas";
import { Space3DCanvas } from "@/components/space/Space3DCanvas";
import { SpaceControls } from "@/components/space/SpaceControls";
import { SpaceSidebar, SidebarTab } from "@/components/space/SpaceSidebar";
import { OfficeMinimap } from "@/components/space/OfficeMinimap";
import { PeerReactionsOverlay } from "@/components/space/PeerReactionsOverlay";
import { OFFICE_REACTIONS, OfficeReactionPreset } from "@/lib/space/officeReactions";
import {
  OFFICE_THEMES,
  OFFICE_THEME_LIST,
  OfficeThemeId,
  getThemeCssVars,
} from "@/lib/space/officeThemes";
import {
  IconCheck,
  IconFlipCamera,
  IconLink,
  IconMic,
  IconRefresh,
  IconScreenShare,
  IconUsers,
  IconVideo,
} from "@/components/space/SpaceIcons";
import { FloatingVideoBubbles } from "@/components/space/FloatingVideoBubbles";
import { VideoDock } from "@/components/space/VideoDock";
import { CallStageView } from "@/components/space/CallStageView";
import { hasAttachedVideoTrack, StreamVideo } from "@/components/space/StreamVideo";
import { WebRTCDiagnosticsModal } from "@/components/space/WebRTCDiagnosticsModal";
import { InitialRoomMedia, useSpaceRoom } from "@/hooks/useSpaceRoom";
import { LoungeRadioModal } from "@/components/space/LoungeRadioModal";
import { DeskModal } from "@/components/space/DeskModal";
import { WhiteboardModal } from "@/components/space/WhiteboardModal";
import { TheaterModal } from "@/components/space/TheaterModal";
import { AvatarCustomizerModal } from "@/components/space/AvatarCustomizerModal";
import { MeetingScheduleModal } from "@/components/space/MeetingScheduleModal";
import { RoomLockModal } from "@/components/space/RoomLockModal";
import { OfficePulseModal } from "@/components/space/OfficePulseModal";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import { officeAudio } from "@/lib/space/officeAudio";

export interface SpaceViewProps {
  spaceSlug: string;
  spaceName?: string;
  initialUserName?: string;
  initialAvatarColor?: string;
  initialStatus?: string;
  initialViewMode?: "3d" | "2d" | "call";
  initialMedia?: InitialRoomMedia;
  allowScreenShare?: boolean;
  maxParticipants?: number;
  planTier?: string;
  isManagedWorkspace?: boolean;
  ownerPasscode?: string | null;
}

const WATERCOOLER_PROMPTS = [
  "ForgeSpace renders only one video element per active speaker so mobile devices stay smooth.",
  "Coffee machine fact: Caffeine blocks adenosine receptors to keep you focused!",
  "Hot take: Tabs vs Spaces? Real remote teams use 16x16 tile offsets.",
  "Quick stretch: Roll your shoulders back and take a deep breath!",
  "Fun office poll: What lo-fi station are you playing in the lounge today?",
];

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

export function SpaceView({
  spaceSlug,
  spaceName = "Acme Virtual HQ",
  initialUserName = "Teammate",
  initialAvatarColor = "#37E6C4",
  initialStatus = "Focusing",
  initialViewMode = "3d",
  initialMedia,
  allowScreenShare = true,
  maxParticipants,
  planTier,
  isManagedWorkspace = false,
  ownerPasscode = null,
}: SpaceViewProps) {
  const [map] = useState<OfficeTilemap>(() => createDefaultOfficeMap());
  const isDesktop = useIsDesktop();
  const [viewMode, setViewMode] = useState<"3d" | "2d" | "call">(initialViewMode);
  const [videoLayout, setVideoLayout] = useState<"floating" | "docked">("docked");
  const [ownerCodeOpen, setOwnerCodeOpen] = useState(false);
  const [ownerCodeCopied, setOwnerCodeCopied] = useState(false);

  const [initialPeer] = useState<PeerState>(() => ({
    id: `peer_${Math.random().toString(36).substring(2, 9)}`,
    name: initialUserName,
    avatarColor: initialAvatarColor,
    x: 6 + Math.floor(Math.random() * 5),
    y: 19 + Math.floor(Math.random() * 3),
    dir: "down",
    isMoving: false,
    zoneId: "reception",
    status: initialStatus,
    deskClaimed: null,
    media: {
      audio: initialMedia ? initialMedia.audioEnabled : true,
      video: initialMedia ? initialMedia.videoEnabled : true,
      screen: false,
      speaking: false,
    },
    updatedAt: Date.now(),
  }));

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("people");
  const isChatOpenRef = useRef(false);
  isChatOpenRef.current = isSidebarOpen && sidebarTab === "chat";

  const {
    transportMode,
    localPeer,
    remotePeers,
    streamsMap,
    speakingMap,
    localMediaStatus,
    peerLinkStates,
    chatMessages,
    unreadChatCount,
    clearUnreadChat,
    peerReactions,
    audioScope,
    audioUnlockNeeded,
    iceFailureNotice,
    setIceFailureNotice,
    accessBlockedReason,
    diagnostics,
    refreshDiagnostics,
    forceReconnect,
    resumeAudio,
    toggleAudio,
    toggleVideo,
    switchCamera,
    retryMedia,
    toggleScreenShare,
    toggleAudioScope,
    move,
    updateStatus,
    sendChat,
    sendReaction,
    getLocalStream,
  } = useSpaceRoom({
    spaceSlug,
    zones: map.zones,
    initialPeer,
    initialMedia,
    isChatOpenRef,
  });

  // UI state & modals
  const [lockedRooms, setLockedRooms] = useState<
    Record<string, { isLocked: boolean; passcode?: string }>
  >({});
  const [activeLockZone, setActiveLockZone] = useState<SpaceZone | null>(null);
  const [themeId, setThemeId] = useState<OfficeThemeId>("midnight");
  const [activeDesk, setActiveDesk] = useState<InteractiveObject | null>(null);
  const [radioModalOpen, setRadioModalOpen] = useState(false);
  const [deskModalOpen, setDeskModalOpen] = useState(false);
  const [whiteboardModalOpen, setWhiteboardModalOpen] = useState(false);
  const [theaterModalOpen, setTheaterModalOpen] = useState(false);
  const [watercoolerModalOpen, setWatercoolerModalOpen] = useState(false);
  const [watercoolerQuote, setWatercoolerQuote] = useState("");
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [roomLockModalOpen, setRoomLockModalOpen] = useState(false);
  const [pulseModalOpen, setPulseModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [coffeeBoostNotice, setCoffeeBoostNotice] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [copyStatusText, setCopyStatusText] = useState("");

  useEffect(() => {
    if (isSidebarOpen && sidebarTab === "chat" && unreadChatCount > 0) {
      clearUnreadChat();
    }
  }, [isSidebarOpen, sidebarTab, unreadChatCount, clearUnreadChat]);

  useEffect(() => {
    if (!diagnosticsOpen) return;
    void refreshDiagnostics();
    const timer = setInterval(() => void refreshDiagnostics(), 2000);
    return () => clearInterval(timer);
  }, [diagnosticsOpen, refreshDiagnostics]);

  // Fullscreen support
  const spaceContainerRef = useRef<HTMLDivElement | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isImmersiveFallback, setIsImmersiveFallback] = useState(false);
  const isFullscreen = isNativeFullscreen || isImmersiveFallback;

  useEffect(() => {
    const syncFullscreen = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const active = Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
      setIsNativeFullscreen(active);
      if (!active) setIsImmersiveFallback(false);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
    };
    const fsEl = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
    if (fsEl) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } catch {
        setIsNativeFullscreen(false);
      }
      setIsImmersiveFallback(false);
      return;
    }
    if (isImmersiveFallback) {
      setIsImmersiveFallback(false);
      return;
    }
    const container = spaceContainerRef.current as
      | (HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> | void })
      | null;
    if (!container) return;
    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
        return;
      }
      if (container.webkitRequestFullscreen) {
        await container.webkitRequestFullscreen();
        return;
      }
    } catch {
      // Fallback to immersive fullscreen
    }
    setIsImmersiveFallback(true);
  }, [isImmersiveFallback]);

  // Unlock browser Web Audio on user interaction
  useEffect(() => {
    const unlock = () => {
      void resumeAudio();
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchend", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchend", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [resumeAudio]);

  const handleTriggerReaction = useCallback(
    (reaction: OfficeReactionPreset) => {
      sendReaction(reaction.emoji, reaction.label);
    },
    [sendReaction]
  );

  const handleCycleTheme = useCallback(() => {
    setThemeId((prev) => {
      const idx = OFFICE_THEME_LIST.findIndex((t) => t.id === prev);
      return OFFICE_THEME_LIST[(idx + 1) % OFFICE_THEME_LIST.length]!.id;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.code === "KeyF") {
        e.preventDefault();
        void handleToggleFullscreen();
      } else if (e.code === "KeyB") {
        e.preventDefault();
        setIsSidebarOpen((v) => !v);
      } else if (e.code === "KeyM") {
        e.preventDefault();
        void toggleAudio();
      } else if (e.code === "KeyV") {
        e.preventDefault();
        void toggleVideo();
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpModalOpen((v) => !v);
      } else if (e.key >= "1" && e.key <= "5") {
        const preset = OFFICE_REACTIONS[Number(e.key) - 1];
        if (preset) {
          e.preventDefault();
          handleTriggerReaction(preset);
        }
      } else if (
        e.code === "Escape" &&
        isImmersiveFallback &&
        !document.querySelector("dialog[open]")
      ) {
        setIsImmersiveFallback(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleToggleFullscreen, toggleAudio, toggleVideo, handleTriggerReaction, isImmersiveFallback]);

  const handleMove = useCallback(
    (x: number, y: number, dir: PeerState["dir"], isMoving: boolean, zoneId: string) => {
      move(x, y, dir, isMoving, zoneId);
      if (isMoving && Math.random() < 0.25) {
        const surface =
          zoneId === "cafe_lounge" ? "tile" : zoneId === "boardroom" ? "carpet" : "wood";
        officeAudio.playFootstep(surface);
      }
    },
    [move]
  );

  const handleInteract = useCallback((obj: InteractiveObject) => {
    switch (obj.kind) {
      case "radio":
        officeAudio.playRoomEnterChime();
        setRadioModalOpen(true);
        break;
      case "desk":
        setActiveDesk(obj);
        setDeskModalOpen(true);
        break;
      case "whiteboard":
        setWhiteboardModalOpen(true);
        break;
      case "coffee":
        officeAudio.playEspressoSteam();
        setCoffeeBoostNotice(true);
        setTimeout(() => setCoffeeBoostNotice(false), 3000);
        break;
      case "watercooler": {
        const quote =
          WATERCOOLER_PROMPTS[Math.floor(Math.random() * WATERCOOLER_PROMPTS.length)] ||
          WATERCOOLER_PROMPTS[0]!;
        setWatercoolerQuote(quote);
        setWatercoolerModalOpen(true);
        break;
      }
      case "screen":
        setTheaterModalOpen(true);
        break;
    }
  }, []);

  const handleToggleScreenShare = async () => {
    if (!allowScreenShare) {
      setPlanNotice("HD Screen Sharing requires a Boss Pro workspace — upgrade at /admin.");
      setTimeout(() => setPlanNotice(null), 5000);
      return;
    }
    await toggleScreenShare();
  };

  const handleWarpToCoords = (x: number, y: number, zoneId: string) => {
    officeAudio.playRoomEnterChime();
    handleMove(x, y, "down", false, zoneId);
  };

  const handleWarpToRoom = (zone: SpaceZone) => {
    const targetX = Math.round((zone.x1 + zone.x2) / 2);
    const targetY = Math.round((zone.y1 + zone.y2) / 2);
    officeAudio.playRoomEnterChime();
    handleMove(targetX, targetY, "down", false, zone.id);
  };

  const handleWarpToPeer = (peer: PeerState) => {
    officeAudio.playRoomEnterChime();
    handleMove(peer.x + 1, peer.y, "left", false, peer.zoneId);
  };

  const handleCopyInvite = async () => {
    if (typeof window === "undefined") return;
    const shareUrl = ownerPasscode
      ? `${window.location.origin}/space/${spaceSlug}?code=${encodeURIComponent(ownerPasscode)}`
      : window.location.href;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setInviteCopied(true);
      setCopyStatusText(ownerPasscode ? "Passworded invite link copied" : "Invite link copied");
      setTimeout(() => {
        setInviteCopied(false);
        setCopyStatusText("");
      }, 2500);
    } catch {
      setCopyStatusText("Failed to copy invite link");
    }
  };

  const localZone = getZoneAt(localPeer.x, localPeer.y, map.zones);
  const nearbyPeers = remotePeers.filter((p) => {
    const peerZone = getZoneAt(p.x, p.y, map.zones);
    if (audioScope === "office") {
      if (localZone?.isPrivate || peerZone?.isPrivate) {
        return localZone?.id === peerZone?.id;
      }
      return true;
    }
    const dist = Math.hypot(p.x - localPeer.x, p.y - localPeer.y);
    return dist <= 8 || p.zoneId === localPeer.zoneId;
  });

  const activePresenter =
    remotePeers.find((p) => p.media.screen) || (localPeer.media.screen ? localPeer : null);
  const activePresenterStream = activePresenter
    ? activePresenter.id === localPeer.id
      ? getLocalStream()
      : streamsMap[activePresenter.id] || null
    : null;

  // Single <video> decoder policy: render Floating bubbles OR Dock strip OR Mobile solo PiP — never duplicate
  const showFloatingBubbles = viewMode !== "call" && isDesktop && videoLayout === "floating";
  const showVideoDock =
    viewMode !== "call" &&
    !showFloatingBubbles &&
    (videoLayout === "docked" || remotePeers.length > 0);
  const showMobileSoloPiP =
    viewMode !== "call" &&
    !isDesktop &&
    remotePeers.length === 0 &&
    !showVideoDock &&
    hasAttachedVideoTrack(streamsMap[localPeer.id] || streamsMap["local"], localPeer.media);

  return (
    <div
      ref={spaceContainerRef}
      style={getThemeCssVars(themeId) as React.CSSProperties}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 w-screen h-dvh flex overflow-hidden bg-bg text-text"
          : "fixed inset-0 z-10 w-screen h-dvh flex overflow-hidden bg-bg text-text"
      }
    >
      <div className="relative flex-1 h-full flex flex-col min-w-0">
        {/* Top-Left HUD Cluster */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 max-w-[calc(100vw-11rem)] sm:max-w-[55vw]">
          <div className="h-8 pl-1.5 pr-2.5 rounded-full bg-surface/80 backdrop-blur-xl border border-white/10 flex items-center gap-1.5 min-w-0 shadow-arcade-sm">
            <Link
              href="/spaces"
              aria-label="Back to offices"
              title="Back to Offices"
              className="w-5 h-5 rounded-full hover:bg-surface-2 flex items-center justify-center text-text-muted hover:text-text transition-colors flex-shrink-0"
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <h1 className="font-display text-xs font-bold text-text truncate">{spaceName}</h1>
          </div>

          <OfficeMinimap
            map={map}
            localPeer={localPeer}
            remotePeers={remotePeers}
            onWarpToRoom={handleWarpToRoom}
            onWarpToCoords={handleWarpToCoords}
          />
        </div>

        {/* Top-Right HUD Utility Cluster */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          {activePresenter && (
            <button
              type="button"
              onClick={() => setTheaterModalOpen(true)}
              className="h-8 px-3 text-[11px] font-display font-semibold bg-accent text-bg rounded-full hover:brightness-110 flex items-center gap-1.5 shadow-arcade-sm animate-pulse"
            >
              <IconScreenShare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Watch</span>
            </button>
          )}

          {remotePeers.length > 0 && (
            <button
              type="button"
              onClick={() => setDiagnosticsOpen(true)}
              aria-label="Connection diagnostics"
              title="Inspect live WebRTC / LiveKit telemetry"
              className="h-8 px-2.5 text-[11px] bg-surface/80 hover:bg-surface backdrop-blur-xl border border-white/10 hover:border-white/25 text-text-muted hover:text-text rounded-full font-mono transition-colors shadow-arcade-sm"
            >
              Net
            </button>
          )}

          <button
            type="button"
            onClick={() => setViewMode((m) => (m === "call" ? "3d" : "call"))}
            aria-pressed={viewMode === "call"}
            aria-label="Toggle full video call view"
            title={viewMode === "call" ? "Return to 3D Office" : "Switch to Video Call Stage"}
            className={`h-8 px-3 text-[11px] backdrop-blur-xl border rounded-full flex items-center gap-1.5 font-display font-semibold transition-colors shadow-arcade-sm ${
              viewMode === "call"
                ? "bg-accent text-bg border-accent"
                : "bg-surface/80 hover:bg-surface border-white/10 text-text hover:border-accent/60"
            }`}
          >
            <IconVideo className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{viewMode === "call" ? "Office" : "Call"}</span>
          </button>

          <button
            type="button"
            onClick={toggleAudioScope}
            aria-pressed={audioScope === "office"}
            aria-label="Office-wide audio mode"
            className={`h-8 px-3 text-[11px] backdrop-blur-xl border rounded-full flex items-center gap-1.5 font-display font-semibold transition-colors shadow-arcade-sm ${
              audioScope === "office"
                ? "bg-accent/20 border-accent/50 text-accent hover:bg-accent/30"
                : "bg-surface/80 hover:bg-surface border-white/10 text-text-muted hover:text-text"
            }`}
          >
            <IconMic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {audioScope === "office" ? "Office" : "Prox"}
            </span>
          </button>

          {ownerPasscode && (
            <button
              type="button"
              onClick={() => {
                setOwnerCodeOpen((v) => !v);
                void navigator.clipboard?.writeText(ownerPasscode);
                setOwnerCodeCopied(true);
                setTimeout(() => setOwnerCodeCopied(false), 2000);
              }}
              title="Click to reveal and copy your room passcode"
              className="h-8 px-2.5 text-[11px] bg-accent/15 hover:bg-accent/25 backdrop-blur-xl border border-accent/40 text-accent rounded-full flex items-center gap-1.5 font-mono transition-colors shadow-arcade-sm"
            >
              <span>Key:</span>
              <strong className="text-text">
                {ownerCodeOpen ? ownerPasscode : "••••"}
              </strong>
              {ownerCodeCopied && (
                <span className="hidden sm:inline text-[10px] text-accent">Copied</span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleCopyInvite()}
            aria-label="Copy invite link"
            className="h-8 px-3 text-[11px] bg-surface/80 hover:bg-surface backdrop-blur-xl border border-white/10 hover:border-white/25 text-text rounded-full flex items-center gap-1.5 transition-colors shadow-arcade-sm"
          >
            {inviteCopied ? (
              <IconCheck className="w-3.5 h-3.5 text-accent" />
            ) : (
              <IconLink className="w-3.5 h-3.5 text-accent-2" />
            )}
            <span className="hidden sm:inline">{inviteCopied ? "Copied" : "Invite"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSidebarOpen((v) => !v)}
            aria-pressed={isSidebarOpen}
            aria-label="People and chat panel"
            className={`relative h-8 px-3 text-[11px] backdrop-blur-xl border rounded-full flex items-center gap-1.5 font-display font-semibold transition-colors shadow-arcade-sm ${
              isSidebarOpen
                ? "bg-accent/20 border-accent text-accent"
                : "bg-surface/80 hover:bg-surface border-white/10 hover:border-white/25 text-text"
            }`}
          >
            <IconUsers className="w-3.5 h-3.5" />
            <span>{remotePeers.length + 1}</span>
            {unreadChatCount > 0 && (
              <span className="px-1.5 min-w-[1rem] h-4 rounded-full bg-accent text-bg text-[9px] font-bold flex items-center justify-center leading-none">
                {unreadChatCount > 99 ? "99+" : unreadChatCount}
              </span>
            )}
          </button>
        </div>

        <p role="status" className="sr-only">
          {copyStatusText}
        </p>

        {/* Main Stage: Call Stage, 3D Office, or 2D Map */}
        <div className="relative flex-1 w-full min-h-0">
          {viewMode === "call" ? (
            <CallStageView
              localPeer={localPeer}
              peers={remotePeers}
              speakingMap={speakingMap}
              streamsMap={streamsMap}
              peerLinkStates={peerLinkStates}
              localMediaStatus={localMediaStatus}
              onToggleVideo={() => void toggleVideo()}
              onSwitchCamera={() => void switchCamera()}
              onRetryMedia={() => void retryMedia()}
              onBackToOffice={() => setViewMode("3d")}
              onWalkToPeer={(peer) => {
                setViewMode("3d");
                handleWarpToPeer(peer);
              }}
            />
          ) : viewMode === "3d" ? (
            <Space3DCanvas
              map={map}
              localPeer={localPeer}
              remotePeers={remotePeers}
              speakingMap={speakingMap}
              theme={OFFICE_THEMES[themeId]}
              onMove={handleMove}
              onInteract={handleInteract}
            />
          ) : (
            <SpaceCanvas
              map={map}
              localPeer={localPeer}
              remotePeers={remotePeers}
              speakingMap={speakingMap}
              onMove={handleMove}
              onInteract={handleInteract}
            />
          )}

          {viewMode !== "call" && <PeerReactionsOverlay reactions={peerReactions} />}

          {showFloatingBubbles && (
            <FloatingVideoBubbles
              peers={[localPeer, ...remotePeers]}
              localPeerId={localPeer.id}
              speakingMap={speakingMap}
              streamsMap={streamsMap}
              onBubbleClick={handleWarpToPeer}
            />
          )}

          {showVideoDock && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
              <VideoDock
                localPeer={localPeer}
                nearbyPeers={nearbyPeers}
                speakingMap={speakingMap}
                streamsMap={streamsMap}
                peerLinkStates={peerLinkStates}
                onSelectPeer={handleWarpToPeer}
                onSwitchToCallView={() => setViewMode("call")}
              />
            </div>
          )}

          {showMobileSoloPiP && (
            <div className="absolute bottom-24 right-3 z-20 w-24 h-32 rounded-2xl overflow-hidden border-2 border-accent/80 bg-surface shadow-arcade">
              <StreamVideo
                stream={(streamsMap[localPeer.id] || streamsMap["local"])!}
                mirror={!localPeer.media.screen && localMediaStatus?.cameraFacing !== "environment"}
              />
              <button
                type="button"
                onClick={() => void switchCamera()}
                title="Flip Camera"
                className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center border border-white/20"
              >
                <IconFlipCamera className="w-3 h-3" />
              </button>
            </div>
          )}

          {coffeeBoostNotice && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 bg-amber-500/90 text-black font-display text-xs font-bold rounded-full shadow-arcade animate-bounce">
              ESPRESSO BOOST ACTIVATED (+50% Speed)
            </div>
          )}

          {(audioUnlockNeeded ||
            iceFailureNotice ||
            planNotice ||
            localMediaStatus?.cameraError ||
            localMediaStatus?.micError) && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 max-w-[92vw]">
              {audioUnlockNeeded && (
                <button
                  type="button"
                  onClick={() => void resumeAudio()}
                  className="px-3.5 py-1.5 rounded-full bg-accent text-bg font-display text-xs font-bold shadow-arcade hover:brightness-110 flex items-center gap-1.5"
                >
                  <IconMic className="w-3.5 h-3.5" />
                  <span>Tap to enable coworker audio</span>
                </button>
              )}
              {(localMediaStatus?.cameraError || localMediaStatus?.micError) && (
                <div className="px-3.5 py-1.5 rounded-full bg-amber-500/95 text-black font-display text-[11px] font-semibold shadow-arcade flex items-center gap-2">
                  <span>{localMediaStatus.cameraError || localMediaStatus.micError}</span>
                  <button
                    type="button"
                    onClick={() => void retryMedia()}
                    className="px-2 py-0.5 rounded-full bg-black text-amber-300 font-bold flex items-center gap-1"
                  >
                    <IconRefresh className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}
              {(planNotice || iceFailureNotice) && (
                <div className="px-3.5 py-1.5 rounded-full bg-amber-500/95 text-black font-display text-[11px] font-semibold shadow-arcade flex items-center gap-2">
                  <span>{planNotice || iceFailureNotice}</span>
                  {iceFailureNotice && !planNotice && (
                    <button
                      type="button"
                      onClick={() => setDiagnosticsOpen(true)}
                      className="px-2 py-0.5 rounded-full bg-black text-amber-300 font-bold"
                    >
                      Inspect
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Dismiss network notice"
                    onClick={() => {
                      setPlanNotice(null);
                      setIceFailureNotice(null);
                    }}
                    className="font-bold opacity-80 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {accessBlockedReason && (
            <div className="absolute inset-0 z-50 bg-bg/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="max-w-md w-full p-6 rounded-container bg-surface/95 backdrop-blur-2xl border border-amber-400/50 shadow-arcade-lg space-y-4 text-center">
                <span className="text-[11px] font-mono text-amber-400 uppercase">
                  {planTier
                    ? `${planTier} Workspace • ${maxParticipants ?? 4} Seats Max`
                    : "Access Restricted"}
                </span>
                <h2 className="font-display text-xl font-extrabold text-text">
                  Cannot Enter {spaceName}
                </h2>
                <p className="text-xs text-text-muted leading-relaxed">{accessBlockedReason}</p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href="/spaces"
                    className="px-4 py-2 text-xs bg-surface-2 border border-border rounded-control text-text hover:border-accent"
                  >
                    Browse Spaces
                  </Link>
                  <Link
                    href="/admin"
                    className="px-4 py-2 text-xs font-display font-bold bg-accent text-bg rounded-control shadow-arcade hover:brightness-110"
                  >
                    {isManagedWorkspace ? "Upgrade at Boss Portal →" : "Open Boss Portal →"}
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[96vw]">
            <SpaceControls
              isAudioMuted={!localPeer.media.audio}
              isVideoMuted={!localPeer.media.video}
              isScreenSharing={localPeer.media.screen}
              screenShareLocked={!allowScreenShare}
              isFullscreen={isFullscreen}
              videoLayout={videoLayout}
              viewMode={viewMode}
              themeId={themeId}
              audioScope={audioScope}
              showFlipCamera={localPeer.media.video}
              onToggleAudio={() => void toggleAudio()}
              onToggleVideo={() => void toggleVideo()}
              onSwitchCamera={() => void switchCamera()}
              onToggleScreenShare={handleToggleScreenShare}
              onToggleFullscreen={() => void handleToggleFullscreen()}
              onToggleVideoLayout={() =>
                setVideoLayout((l) => (l === "floating" ? "docked" : "floating"))
              }
              onToggleViewMode={() =>
                setViewMode((m) => (m === "3d" ? "2d" : m === "2d" ? "call" : "3d"))
              }
              onToggleAudioScope={toggleAudioScope}
              onCycleTheme={handleCycleTheme}
              onTriggerReaction={handleTriggerReaction}
              onOpenAvatarCustomizer={() => setAvatarModalOpen(true)}
              onOpenMeetingSchedule={() => setMeetingModalOpen(true)}
              onOpenPulse={() => setPulseModalOpen(true)}
              onOpenHelp={() => setHelpModalOpen(true)}
            />
          </div>
        </div>
      </div>

      <SpaceSidebar
        localPeer={localPeer}
        remotePeers={remotePeers}
        chatMessages={chatMessages}
        onSendMessage={(text) => sendChat(text, localPeer.zoneId)}
        onWarpToRoom={handleWarpToRoom}
        onWarpToPeer={handleWarpToPeer}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
        unreadChatCount={unreadChatCount}
      />

      <LoungeRadioModal open={radioModalOpen} onClose={() => setRadioModalOpen(false)} />

      <DeskModal
        open={deskModalOpen}
        onClose={() => setDeskModalOpen(false)}
        desk={activeDesk}
        currentStatus={localPeer.status}
        isClaimedByMe={localPeer.deskClaimed === activeDesk?.id}
        onClaim={(deskId, st) => updateStatus(st, deskId)}
        onRelease={() => updateStatus("Available", null)}
        onUpdateStatus={(st) => updateStatus(st, localPeer.deskClaimed)}
      />

      <WhiteboardModal
        open={whiteboardModalOpen}
        onClose={() => setWhiteboardModalOpen(false)}
      />

      <TheaterModal
        open={theaterModalOpen}
        onClose={() => setTheaterModalOpen(false)}
        presenterName={activePresenter?.name || "Main Boardroom Screen"}
        stream={activePresenterStream}
      />

      <AvatarCustomizerModal
        isOpen={avatarModalOpen}
        onClose={() => setAvatarModalOpen(false)}
        currentName={localPeer.name}
        currentColor={localPeer.avatarColor}
        currentStatus={localPeer.status}
        onSave={(c) => updateStatus(c.status, localPeer.deskClaimed, c.name, c.avatarColor)}
      />

      <MeetingScheduleModal
        isOpen={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        userName={localPeer.name}
        onWarpToZone={(zoneId) => {
          const zone = OFFICE_ZONES.find((z) => z.id === zoneId);
          if (zone) handleWarpToRoom(zone);
        }}
      />

      <OfficePulseModal
        open={pulseModalOpen}
        onClose={() => setPulseModalOpen(false)}
        spaceName={spaceName}
        localPeer={localPeer}
        remotePeers={remotePeers}
      />

      {activeLockZone && (
        <RoomLockModal
          isOpen={roomLockModalOpen}
          onClose={() => {
            setRoomLockModalOpen(false);
            setActiveLockZone(null);
          }}
          zoneName={activeLockZone.name}
          zoneId={activeLockZone.id}
          isLocked={!!lockedRooms[activeLockZone.id]?.isLocked}
          onToggleLock={(zoneId, passcode) => {
            setLockedRooms((prev) => ({
              ...prev,
              [zoneId]: { isLocked: !prev[zoneId]?.isLocked, passcode },
            }));
          }}
          onKnockDoor={(zoneId) =>
            sendChat(
              `✊ *Knock knock* on the door of ${zoneId === "boardroom" ? "Glass Boardroom" : "War Room"}!`,
              zoneId
            )
          }
          isInsideRoom={localPeer.zoneId === activeLockZone.id}
        />
      )}

      <WebRTCDiagnosticsModal
        open={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        transportMode={transportMode}
        diagnostics={diagnostics}
        onRetryMedia={retryMedia}
        onReconnect={forceReconnect}
        onRefresh={refreshDiagnostics}
      />

      <ArcadeDialog
        open={watercoolerModalOpen}
        onClose={() => setWatercoolerModalOpen(false)}
        title="💧 Water Cooler Chit-Chat"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-center py-2">
          <span className="text-4xl block">🥤</span>
          <p className="text-sm text-text font-serif italic max-w-sm mx-auto">
            &ldquo;{watercoolerQuote}&rdquo;
          </p>
          <div className="pt-2">
            <button
              onClick={() => setWatercoolerModalOpen(false)}
              className="px-4 py-2 bg-accent text-bg font-display font-bold text-xs rounded-control hover:brightness-110"
            >
              Hydrated & Back to Work!
            </button>
          </div>
        </div>
      </ArcadeDialog>

      <ArcadeDialog
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        title="Controls & Office Guide"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-3 text-xs text-text">
          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">3D &amp; 2D Virtual Floor:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li><b className="text-text">WASD / Arrow Keys</b>: Walk smoothly across all rooms.</li>
              <li><b className="text-text">Click Map or Floor</b>: Pathfind around desks or warp from the minimap.</li>
              <li><b className="text-text">F</b>: Expand into Fullscreen Mode (<b className="text-text">Esc</b> to exit).</li>
              <li><b className="text-text">B</b>: Collapse or expand the People, Rooms &amp; Chat panel.</li>
            </ul>
          </div>
          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">Audio, Video &amp; Reactions:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li><b className="text-text">M</b> / <b className="text-text">V</b>: Toggle Microphone and Camera.</li>
              <li><b className="text-text">1–5</b>: Quick reactions (Wave, Agree, Coffee, Ship it, Idea).</li>
              <li><b className="text-text">Call Mode</b>: Switch anytime to full-screen WhatsApp grid calls.</li>
            </ul>
          </div>
        </div>
      </ArcadeDialog>
    </div>
  );
}
