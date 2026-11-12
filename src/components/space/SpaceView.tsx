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
import { SpaceControls } from "@/components/space/SpaceControls";
import { SpaceSidebar } from "@/components/space/SpaceSidebar";
import { FloatingVideoBubbles } from "@/components/space/FloatingVideoBubbles";
import { VideoDock } from "@/components/space/VideoDock";
import { ArcadeModal } from "@/components/space/ArcadeModal";
import { DeskModal } from "@/components/space/DeskModal";
import { WhiteboardModal } from "@/components/space/WhiteboardModal";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";

interface SpaceViewProps {
  spaceSlug: string;
  spaceName?: string;
  initialUserName?: string;
  initialAvatarColor?: string;
}

const WATERCOOLER_PROMPTS = [
  "Did you know ArcadeForge games run at locked 60Hz inside our breakroom?",
  "Coffee machine fact: Caffeine blocks adenosine receptors to keep you alert!",
  "Hot take: Tabs vs Spaces? Real pixel artists use 16x16 tile offsets.",
  "Quick stretch: Roll your shoulders back and take a deep breath!",
  "Fun office poll: What was the first retro arcade game you ever played?",
];

export function SpaceView({
  spaceSlug,
  spaceName = "Acme Virtual HQ",
  initialUserName = "Coworker",
  initialAvatarColor = "#37E6C4",
}: SpaceViewProps) {
  // Tilemap state
  const [map] = useState<OfficeTilemap>(() => createDefaultOfficeMap());

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

  // UI state
  const [videoLayout, setVideoLayout] = useState<"floating" | "docked">("floating");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeDesk, setActiveDesk] = useState<InteractiveObject | null>(null);

  // Modals
  const [arcadeModalOpen, setArcadeModalOpen] = useState(false);
  const [deskModalOpen, setDeskModalOpen] = useState(false);
  const [whiteboardModalOpen, setWhiteboardModalOpen] = useState(false);
  const [watercoolerModalOpen, setWatercoolerModalOpen] = useState(false);
  const [watercoolerQuote, setWatercoolerQuote] = useState("");
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [coffeeBoostNotice, setCoffeeBoostNotice] = useState(false);

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

        case "peer_status":
          setRemotePeers((prev) =>
            prev.map((p) =>
              p.id === msg.id
                ? { ...p, status: msg.status, deskClaimed: msg.deskClaimed }
                : p
            )
          );
          break;

        case "peer_media":
          setRemotePeers((prev) =>
            prev.map((p) => (p.id === msg.id ? { ...p, media: msg.media } : p))
          );
          break;

        case "peer_leave":
          setRemotePeers((prev) => prev.filter((p) => p.id !== msg.id));
          webrtcRef.current?.disconnectPeer(msg.id);
          setStreamsMap((prev) => {
            const next = { ...prev };
            delete next[msg.id];
            return next;
          });
          break;

        case "webrtc_signal":
          if (msg.to === localPeer.id) {
            webrtcRef.current?.handleSignal(msg.from, msg.payload);
          }
          break;

        case "chat":
          setChatMessages((prev) => [...prev.slice(-40), msg]);
          break;
      }
    },
    [localPeer.id, localPeer.x, localPeer.y, map.zones]
  );

  // Initialize WebRTC and Signaling
  useEffect(() => {
    // 1. WebRTC Manager
    const webrtc = new WebRTCMeshManager(
      (toPeerId, payload) => {
        signalingRef.current?.broadcast({
          type: "webrtc_signal",
          from: localPeer.id,
          to: toPeerId,
          payload,
        });
      },
      (peerId, stream, isSpeaking) => {
        setStreamsMap((prev) => ({ ...prev, [peerId]: stream }));
      },
      (peerId, speaking) => {
        setSpeakingMap((prev) => ({ ...prev, [peerId]: speaking }));
      }
    );

    webrtc.initLocalMedia().then((stream) => {
      if (stream) {
        setStreamsMap((prev) => ({ ...prev, [localPeer.id]: stream }));
      }
    });

    webrtcRef.current = webrtc;

    // 2. Signaling Engine
    const signaling = new SpaceSignaling(spaceSlug, localPeer, handleSignalMessage);
    signalingRef.current = signaling;

    return () => {
      webrtc.destroy();
      signaling.destroy();
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
        case "arcade":
          setArcadeModalOpen(true);
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
          setWhiteboardModalOpen(true);
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
    handleMove(targetX, targetY, "down", false, zone.id);
  };

  // Warp avatar to Peer
  const handleWarpToPeer = (peer: PeerState) => {
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

  // Nearby peers (distance <= 8 tiles)
  const nearbyPeers = remotePeers.filter((p) => {
    const dist = Math.hypot(p.x - localPeer.x, p.y - localPeer.y);
    return dist <= 8 || p.zoneId === localPeer.zoneId;
  });

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] flex overflow-hidden bg-bg">
      {/* Center 2D Floor Area */}
      <div className="relative flex-1 h-full flex flex-col min-w-0">
        {/* Top Header Information Bar */}
        <div className="h-12 border-b border-border bg-surface/80 backdrop-blur-sm px-4 flex items-center justify-between gap-4 z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="font-display text-sm md:text-base font-bold text-text truncate">
              {spaceName}
            </h1>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-surface-2 text-text-muted border border-border">
              P2P WebRTC Mesh ($0 Server Cost)
            </span>
          </div>

          <div className="flex items-center gap-2">
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

        {/* 2D Canvas World */}
        <div className="relative flex-1 w-full min-h-0">
          <SpaceCanvas
            map={map}
            localPeer={localPeer}
            remotePeers={remotePeers}
            speakingMap={speakingMap}
            onMove={handleMove}
            onInteract={handleInteract}
            onScreenPositionUpdate={setScreenPositions}
          />

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
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onToggleScreenShare={handleToggleScreenShare}
              onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
              onToggleVideoLayout={() =>
                setVideoLayout((l) => (l === "floating" ? "docked" : "floating"))
              }
              onOpenHelp={() => setHelpModalOpen(true)}
            />
          </div>
        </div>

        {/* Mobile & Docked Video Strip (Visible on mobile OR when layout is docked) */}
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
      <ArcadeModal
        open={arcadeModalOpen}
        onClose={() => setArcadeModalOpen(false)}
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
            <span className="font-display font-bold text-accent">Walking & Movement:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li><b className="text-text">WASD / Arrow Keys</b>: Walk in 4 directions.</li>
              <li><b className="text-text">Click / Tap Anywhere</b>: Auto-pathfinds around desks and walls.</li>
            </ul>
          </div>

          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">Proximity Audio & Video:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li>Walk near coworkers (&lt;4 tiles) to start video and hear them.</li>
              <li>Enter the <b className="text-text">Glass Boardroom</b> or <b className="text-text">War Room</b> for soundproof meeting isolation.</li>
            </ul>
          </div>

          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">Interactive Objects:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li>Press <b className="text-text">E</b> at the Arcade Cabinet to play 60Hz games.</li>
              <li>Press <b className="text-text">E</b> at an empty desk to claim your seat and set your status.</li>
              <li>Press <b className="text-text">E</b> at the Whiteboard to sketch or take notes.</li>
            </ul>
          </div>
        </div>
      </ArcadeDialog>
    </div>
  );
}
