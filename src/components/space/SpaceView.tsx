"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  OfficeTilemap,
  OFFICE_ZONES,
  createDefaultOfficeMap,
  InteractiveObject,
  SpaceZone,
  getZoneAt,
} from "@/lib/space/officeMap";
import {
  SpaceSignaling,
  PeerState,
  SignalMessage,
} from "@/lib/space/signaling";
import { WebRTCMeshManager } from "@/lib/space/webrtcMesh";
import { SpaceCanvas } from "@/components/space/SpaceCanvas";
import { Space3DCanvas } from "@/components/space/Space3DCanvas";
import { SpaceControls } from "@/components/space/SpaceControls";
import { SpaceSidebar } from "@/components/space/SpaceSidebar";
import { FloatingVideoBubbles } from "@/components/space/FloatingVideoBubbles";
import { VideoDock } from "@/components/space/VideoDock";
import { LoungeRadioModal } from "@/components/space/LoungeRadioModal";
import { DeskModal } from "@/components/space/DeskModal";
import { WhiteboardModal } from "@/components/space/WhiteboardModal";
import { TheaterModal } from "@/components/space/TheaterModal";
import { AvatarCustomizerModal } from "@/components/space/AvatarCustomizerModal";
import { MeetingScheduleModal } from "@/components/space/MeetingScheduleModal";
import { RoomLockModal } from "@/components/space/RoomLockModal";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import { officeAudio } from "@/lib/space/officeAudio";

interface SpaceViewProps {
  spaceSlug: string;
  spaceName?: string;
  initialUserName?: string;
  initialAvatarColor?: string;
}

const WATERCOOLER_PROMPTS = [
  "Did you know ForgeSpace uses browser P2P WebRTC so there is $0 server bandwidth bill?",
  "Coffee machine fact: Caffeine blocks adenosine receptors to keep you focused!",
  "Hot take: Tabs vs Spaces? Real remote teams use 16x16 tile offsets.",
  "Quick stretch: Roll your shoulders back and take a deep breath!",
  "Fun office poll: What lo-fi station are you playing in the lounge today?",
];

export function SpaceView({
  spaceSlug,
  spaceName = "Acme Virtual HQ",
  initialUserName = "Coworker",
  initialAvatarColor = "#37E6C4",
}: SpaceViewProps) {
  // Tilemap state
  const [map] = useState<OfficeTilemap>(() => createDefaultOfficeMap());

  // 3D / 2D View Mode (defaults to modern 3D Isometric WebGL!)
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");

  // Local Peer State
  const [localPeer, setLocalPeer] = useState<PeerState>(() => ({
    id: `peer_${Math.random().toString(36).substring(2, 9)}`,
    name: initialUserName,
    avatarColor: initialAvatarColor,
    x: 8,
    y: 20, // Spawn at reception
    dir: "down",
    isMoving: false,
    zoneId: "reception",
    status: "Focusing",
    deskClaimed: null,
    media: {
      audio: true,
      video: true,
      screen: false,
      speaking: false,
    },
    updatedAt: Date.now(),
  }));

  // Remote Peers
  const [remotePeers, setRemotePeers] = useState<PeerState[]>([]);
  const [streamsMap, setStreamsMap] = useState<Record<string, MediaStream>>({});
  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({});
  const [screenPositions, setScreenPositions] = useState<
    Record<string, { screenX: number; screenY: number; inView: boolean }>
  >({});
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string; zoneId?: string }>
  >([]);

  // Room Locks
  const [lockedRooms, setLockedRooms] = useState<Record<string, { isLocked: boolean; passcode?: string }>>({});
  const [activeLockZone, setActiveLockZone] = useState<SpaceZone | null>(null);

  // UI state
  const [videoLayout, setVideoLayout] = useState<"floating" | "docked">("floating");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeDesk, setActiveDesk] = useState<InteractiveObject | null>(null);

  // Modals
  const [radioModalOpen, setRadioModalOpen] = useState(false);
  const [deskModalOpen, setDeskModalOpen] = useState(false);
  const [whiteboardModalOpen, setWhiteboardModalOpen] = useState(false);
  const [theaterModalOpen, setTheaterModalOpen] = useState(false);
  const [watercoolerModalOpen, setWatercoolerModalOpen] = useState(false);
  const [watercoolerQuote, setWatercoolerQuote] = useState("");
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [roomLockModalOpen, setRoomLockModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [coffeeBoostNotice, setCoffeeBoostNotice] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  // References
  const signalingRef = useRef<SpaceSignaling | null>(null);
  const webrtcRef = useRef<WebRTCMeshManager | null>(null);

  // Handle Incoming Signaling Messages
  const handleSignalMessage = useCallback(
    (msg: SignalMessage) => {
      switch (msg.type) {
        case "peer_join":
          if (msg.peer.id !== localPeer.id) {
            setRemotePeers((prev) => {
              const existing = prev.filter((p) => p.id !== msg.peer.id);
              return [...existing, msg.peer];
            });
            officeAudio.playPeerJoinNotification();
            // Connect WebRTC peer as initiator
            webrtcRef.current?.connectToPeer(msg.peer.id, true);
          }
          break;

        case "peer_move":
          if (msg.id !== localPeer.id) {
            setRemotePeers((prev) =>
              prev.map((p) =>
                p.id === msg.id
                  ? {
                      ...p,
                      x: msg.x,
                      y: msg.y,
                      dir: msg.dir,
                      isMoving: msg.isMoving,
                      zoneId: msg.zoneId,
                      updatedAt: Date.now(),
                    }
                  : p
              )
            );

            // Update spatial audio attenuation
            const localZone = getZoneAt(localPeer.x, localPeer.y, map.zones);
            const peerZone = getZoneAt(msg.x, msg.y, map.zones);
            webrtcRef.current?.updateSpatialDistance(
              msg.id,
              localPeer.x,
              localPeer.y,
              msg.x,
              msg.y,
              localZone,
              peerZone
            );
          }
          break;

        case "peer_leave":
          setRemotePeers((prev) => prev.filter((p) => p.id !== msg.id));
          webrtcRef.current?.disconnectPeer(msg.id);
          break;

        case "peer_media":
          if (msg.id !== localPeer.id) {
            setRemotePeers((prev) =>
              prev.map((p) =>
                p.id === msg.id
                  ? {
                      ...p,
                      media: { ...p.media, ...msg.media },
                    }
                  : p
              )
            );
          }
          break;

        case "peer_status":
          if (msg.id !== localPeer.id) {
            setRemotePeers((prev) =>
              prev.map((p) =>
                p.id === msg.id
                  ? {
                      ...p,
                      status: msg.status,
                      deskClaimed: msg.deskClaimed,
                    }
                  : p
              )
            );
          }
          break;

        case "chat":
          setChatMessages((prev) => [
            ...prev,
            {
              id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              sender: msg.sender,
              text: msg.text,
              time: new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              zoneId: msg.zoneId,
            },
          ]);
          break;

        case "signal":
          if (msg.to === localPeer.id) {
            webrtcRef.current?.handleSignalData(msg.from, msg.data);
          }
          break;
      }
    },
    [localPeer.id, localPeer.x, localPeer.y, map.zones]
  );

  // Initialize WebRTC and Signaling
  useEffect(() => {
    // 1. Initialize WebRTC mesh manager
    const webrtc = new WebRTCMeshManager({
      localPeerId: localPeer.id,
      onRemoteStream: (peerId, stream) => {
        setStreamsMap((prev) => ({ ...prev, [peerId]: stream }));
      },
      onPeerDisconnect: (peerId) => {
        setStreamsMap((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });
      },
      onSignalData: (peerId, data) => {
        signalingRef.current?.sendSignal(peerId, data);
      },
      onSpeakingChange: (peerId, isSpeaking) => {
        setSpeakingMap((prev) => ({ ...prev, [peerId]: isSpeaking }));
        if (peerId === "local") {
          setLocalPeer((prev) => ({
            ...prev,
            media: { ...prev.media, speaking: isSpeaking },
          }));
        }
      },
    });

    webrtcRef.current = webrtc;
    webrtc.startLocalStream().catch(() => {
      // Browser camera/mic permissions denied or unavailable: graceful fallback
    });

    // 2. Initialize Signaling Channel
    const signaling = new SpaceSignaling(spaceSlug, localPeer, handleSignalMessage);
    signalingRef.current = signaling;

    return () => {
      signaling.destroy();
      webrtc.destroy();
    };
  }, [spaceSlug, localPeer.id, handleSignalMessage]);

  // Handle Local Movement
  const handleMove = useCallback(
    (x: number, y: number, dir: PeerState["dir"], isMoving: boolean, zoneId: string) => {
      setLocalPeer((prev) => ({
        ...prev,
        x,
        y,
        dir,
        isMoving,
        zoneId,
      }));

      signalingRef.current?.updatePosition(x, y, dir, isMoving, zoneId);

      // Footstep sound synthesis when moving
      if (isMoving && Math.random() < 0.25) {
        const surface = zoneId === "cafe_lounge" ? "tile" : zoneId === "boardroom" ? "carpet" : "wood";
        officeAudio.playFootstep(surface);
      }

      // Update distance attenuation for all remote peers
      const localZone = getZoneAt(x, y, map.zones);
      for (const peer of remotePeers) {
        const peerZone = getZoneAt(peer.x, peer.y, map.zones);
        webrtcRef.current?.updateSpatialDistance(
          peer.id,
          x,
          y,
          peer.x,
          peer.y,
          localZone,
          peerZone
        );
      }
    },
    [map.zones, remotePeers]
  );

  // Handle Object Interactions
  const handleInteract = useCallback(
    (obj: InteractiveObject) => {
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
          // Espresso Boost: 15s speed
          officeAudio.playEspressoSteam();
          setCoffeeBoostNotice(true);
          setTimeout(() => setCoffeeBoostNotice(false), 3000);
          break;
        case "watercooler":
          const quote =
            WATERCOOLER_PROMPTS[
              Math.floor(Math.random() * WATERCOOLER_PROMPTS.length)
            ] || WATERCOOLER_PROMPTS[0]!;
          setWatercoolerQuote(quote);
          setWatercoolerModalOpen(true);
          break;
        case "screen":
          setTheaterModalOpen(true);
          break;
      }
    },
    []
  );

  // Toggle Media Controls
  const handleToggleAudio = () => {
    const unmuted = webrtcRef.current?.toggleAudio() ?? false;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, audio: unmuted };
      signalingRef.current?.updateMedia({ audio: unmuted });
      return { ...prev, media: nextMedia };
    });
  };

  const handleToggleVideo = () => {
    const active = webrtcRef.current?.toggleVideo() ?? false;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, video: active };
      signalingRef.current?.updateMedia({ video: active });
      return { ...prev, media: nextMedia };
    });
  };

  const handleToggleScreenShare = async () => {
    const sharing = (await webrtcRef.current?.toggleScreenShare()) ?? false;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, screen: sharing };
      signalingRef.current?.updateMedia({ screen: sharing });
      return { ...prev, media: nextMedia };
    });
  };

  // Warp avatar to Room
  const handleWarpToRoom = (zone: SpaceZone) => {
    const targetX = Math.round((zone.x1 + zone.x2) / 2);
    const targetY = Math.round((zone.y1 + zone.y2) / 2);
    officeAudio.playRoomEnterChime();
    handleMove(targetX, targetY, "down", false, zone.id);
  };

  // Warp avatar to Peer
  const handleWarpToPeer = (peer: PeerState) => {
    officeAudio.playRoomEnterChime();
    handleMove(peer.x + 1, peer.y, "left", false, peer.zoneId);
  };

  // Claim / Release Desk
  const handleClaimDesk = (deskId: string, status: string) => {
    setLocalPeer((prev) => {
      const updated = { ...prev, deskClaimed: deskId, status };
      signalingRef.current?.updateStatus(status, deskId);
      return updated;
    });
  };

  const handleReleaseDesk = (deskId: string) => {
    setLocalPeer((prev) => {
      const updated = { ...prev, deskClaimed: null, status: "Available" };
      signalingRef.current?.updateStatus("Available", null);
      return updated;
    });
  };

  const handleUpdateStatus = (status: string) => {
    setLocalPeer((prev) => {
      const updated = { ...prev, status };
      signalingRef.current?.updateStatus(status, prev.deskClaimed);
      return updated;
    });
  };

  // Avatar Customization update
  const handleSaveAvatarCustomization = (customization: {
    name: string;
    avatarColor: string;
    status: string;
  }) => {
    setLocalPeer((prev) => {
      const updated = {
        ...prev,
        name: customization.name,
        avatarColor: customization.avatarColor,
        status: customization.status,
      };
      signalingRef.current?.updateStatus(customization.status, prev.deskClaimed);
      return updated;
    });
  };

  // Room Lock Toggle
  const handleToggleRoomLock = (zoneId: string, passcode?: string) => {
    setLockedRooms((prev) => {
      const isCurrentlyLocked = !!prev[zoneId]?.isLocked;
      return {
        ...prev,
        [zoneId]: {
          isLocked: !isCurrentlyLocked,
          passcode,
        },
      };
    });
  };

  const handleKnockDoor = (zoneId: string) => {
    signalingRef.current?.sendChat(
      `✊ *Knock knock* on the door of ${zoneId === "boardroom" ? "Glass Boardroom" : "War Room"}!`,
      zoneId
    );
  };

  // Nearby peers (distance <= 8 tiles)
  const nearbyPeers = remotePeers.filter((p) => {
    const dist = Math.hypot(p.x - localPeer.x, p.y - localPeer.y);
    return dist <= 8 || p.zoneId === localPeer.zoneId;
  });

  const handleCopyInvite = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2500);
    }
  };

  const activePresenter = remotePeers.find((p) => p.media.screen) || (localPeer.media.screen ? localPeer : null);
  const activePresenterStream = activePresenter ? streamsMap[activePresenter.id] || webrtcRef.current?.getLocalStream() || null : null;

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex overflow-hidden bg-bg">
      {/* Center Floor Area (3D or 2D) */}
      <div className="relative flex-1 h-full flex flex-col min-w-0">
        {/* Top Header Information Bar */}
        <div className="h-12 border-b border-border bg-surface/80 backdrop-blur-sm px-4 flex items-center justify-between gap-4 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-display text-sm md:text-base font-bold text-text truncate">
              {spaceName}
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-surface-2 text-text-muted border border-border">
              {viewMode === "3d" ? "WebGL 3D Engine" : "2D Classic View"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activePresenter && (
              <button
                onClick={() => setTheaterModalOpen(true)}
                className="px-2.5 py-1 text-xs font-display font-semibold bg-accent text-bg rounded-control hover:brightness-110 flex items-center gap-1 shadow-sm animate-pulse"
              >
                <span>🖥️ Watch Screen</span>
              </button>
            )}
            <button
              onClick={handleCopyInvite}
              className="px-2.5 py-1 text-xs bg-surface-2 hover:bg-surface border border-border text-accent rounded-control flex items-center gap-1"
            >
              <span>{inviteCopied ? "✓ Link Copied" : "🔗 Invite"}</span>
            </button>
            <span className="text-xs text-text-muted font-mono hidden sm:inline">
              {remotePeers.length + 1} online
            </span>
            <button
              onClick={() => setIsSidebarOpen((v) => !v)}
              className="md:hidden px-2.5 py-1 text-xs bg-surface-2 border border-border text-text rounded-control"
            >
              Sidebar
            </button>
          </div>
        </div>

        {/* Office Announcement & Quick Navigation Bar */}
        <div className="bg-surface-2/90 border-b border-border px-4 py-1.5 flex items-center justify-between text-xs text-text-muted z-10 flex-shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="text-accent font-semibold flex items-center gap-1 flex-shrink-0">
              <span>📢</span> Daily Sync:
            </span>
            <span className="truncate text-text font-sans text-[11px] sm:text-xs">
              Welcome to {spaceName}! Join the Glass Boardroom for team syncs or relax in the Lo-Fi Cafe Lounge.
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => handleWarpToRoom(OFFICE_ZONES[2]!)}
              className="px-2 py-0.5 rounded text-[10px] font-display font-semibold bg-surface border border-border text-accent hover:bg-surface-2"
            >
              🚪 Boardroom
            </button>
            <button
              onClick={() => handleWarpToRoom(OFFICE_ZONES[3]!)}
              className="px-2 py-0.5 rounded text-[10px] font-display font-semibold bg-surface border border-border text-[#B84DFF] hover:bg-surface-2"
            >
              📋 War Room
            </button>
            <button
              onClick={() => handleWarpToRoom(OFFICE_ZONES[4]!)}
              className="px-2 py-0.5 rounded text-[10px] font-display font-semibold bg-surface border border-border text-amber-400 hover:bg-surface-2"
            >
              ☕ Cafe
            </button>
          </div>
        </div>

        {/* Floor Canvas World: 3D Isometric WebGL or 2D Top-Down */}
        <div className="relative flex-1 w-full min-h-0">
          {viewMode === "3d" ? (
            <Space3DCanvas
              map={map}
              localPeer={localPeer}
              remotePeers={remotePeers}
              speakingMap={speakingMap}
              onMove={handleMove}
              onInteract={handleInteract}
              onScreenPositionUpdate={setScreenPositions}
            />
          ) : (
            <SpaceCanvas
              map={map}
              localPeer={localPeer}
              remotePeers={remotePeers}
              speakingMap={speakingMap}
              onMove={handleMove}
              onInteract={handleInteract}
              onScreenPositionUpdate={setScreenPositions}
            />
          )}

          {/* Desktop Floating Video Heads */}
          {videoLayout === "floating" && (
            <div className="hidden md:block">
              <FloatingVideoBubbles
                peers={[localPeer, ...remotePeers]}
                speakingMap={speakingMap}
                screenPositions={screenPositions}
                streamsMap={streamsMap}
              />
            </div>
          )}

          {/* Coffee Speed Boost Banner */}
          {coffeeBoostNotice && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 bg-amber-500/90 text-black font-display text-xs font-bold rounded-full shadow-arcade animate-bounce">
              ⚡ ESPRESSO BOOST ACTIVATED! (+50% Move Speed)
            </div>
          )}

          {/* Floating Controls Bar (Bottom Center) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
            <SpaceControls
              isAudioMuted={!localPeer.media.audio}
              isVideoMuted={!localPeer.media.video}
              isScreenSharing={localPeer.media.screen}
              isSidebarOpen={isSidebarOpen}
              videoLayout={videoLayout}
              viewMode={viewMode}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onToggleScreenShare={handleToggleScreenShare}
              onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
              onToggleVideoLayout={() =>
                setVideoLayout((l) => (l === "floating" ? "docked" : "floating"))
              }
              onToggleViewMode={() =>
                setViewMode((m) => (m === "3d" ? "2d" : "3d"))
              }
              onOpenAvatarCustomizer={() => setAvatarModalOpen(true)}
              onOpenMeetingSchedule={() => setMeetingModalOpen(true)}
              onOpenHelp={() => setHelpModalOpen(true)}
            />
          </div>
        </div>

        {/* Mobile & Docked Video Strip */}
        {(videoLayout === "docked" || typeof window !== "undefined") && (
          <div className={videoLayout === "docked" ? "block" : "md:hidden"}>
            <VideoDock
              localPeer={localPeer}
              nearbyPeers={nearbyPeers}
              speakingMap={speakingMap}
              streamsMap={streamsMap}
            />
          </div>
        )}
      </div>

      {/* Right Collapsible Sidebar (Coworkers, Rooms, Chat) */}
      <SpaceSidebar
        localPeer={localPeer}
        remotePeers={remotePeers}
        chatMessages={chatMessages}
        onSendMessage={(text) => signalingRef.current?.sendChat(text, localPeer.zoneId)}
        onWarpToRoom={handleWarpToRoom}
        onWarpToPeer={handleWarpToPeer}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Interactive Modals */}
      <LoungeRadioModal
        open={radioModalOpen}
        onClose={() => setRadioModalOpen(false)}
      />

      <DeskModal
        open={deskModalOpen}
        onClose={() => setDeskModalOpen(false)}
        desk={activeDesk}
        currentStatus={localPeer.status}
        isClaimedByMe={localPeer.deskClaimed === activeDesk?.id}
        onClaim={handleClaimDesk}
        onRelease={handleReleaseDesk}
        onUpdateStatus={handleUpdateStatus}
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
        onSave={handleSaveAvatarCustomization}
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
          onToggleLock={handleToggleRoomLock}
          onKnockDoor={handleKnockDoor}
          isInsideRoom={localPeer.zoneId === activeLockZone.id}
        />
      )}

      {/* Watercooler Icebreaker Modal */}
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

      {/* Keyboard & Controls Help Modal */}
      <ArcadeDialog
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        title="⌨️ Controls & Office Guide"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-3 text-xs text-text">
          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">3D & 2D Virtual Floor:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li>Toggle between <b className="text-text">🧊 3D WebGL</b> and <b className="text-text">🗺️ 2D Classic</b> views using the button in the bottom controls bar.</li>
              <li><b className="text-text">WASD / Arrow Keys</b>: Walk smoothly across all rooms.</li>
              <li><b className="text-text">Click / Tap Anywhere</b>: Raycasted BFS pathfinding navigates around desks and walls.</li>
            </ul>
          </div>

          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">Proximity Audio & Video:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li>Walk near coworkers (&lt;4 tiles) to start video and hear spatial audio.</li>
              <li>Enter the <b className="text-text">Glass Boardroom</b> or <b className="text-text">War Room</b> for soundproof meeting isolation.</li>
            </ul>
          </div>

          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">Interactive Objects:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li>Press <b className="text-text">E</b> at the Lo-Fi Radio to play ambient focus beats.</li>
              <li>Press <b className="text-text">E</b> at an empty desk to claim your seat and set your status.</li>
              <li>Press <b className="text-text">E</b> at the Whiteboard to sketch or take notes.</li>
              <li>Press <b className="text-text">E</b> at the Espresso Bar for an espresso speed boost.</li>
              <li>Click <b className="text-text">🎨</b> to customize your 3D avatar, suit color, and status.</li>
              <li>Click <b className="text-text">📅</b> to view and schedule office meetings and agendas.</li>
            </ul>
          </div>
        </div>
      </ArcadeDialog>
    </div>
  );
}
