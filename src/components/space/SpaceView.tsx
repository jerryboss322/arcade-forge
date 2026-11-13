"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
import { AudioScope, WebRTCMeshManager } from "@/lib/space/webrtcMesh";
import { SpaceCanvas } from "@/components/space/SpaceCanvas";
import { Space3DCanvas } from "@/components/space/Space3DCanvas";
import { SpaceControls } from "@/components/space/SpaceControls";
import { SpaceSidebar, SidebarTab } from "@/components/space/SpaceSidebar";
import { OfficeMinimap } from "@/components/space/OfficeMinimap";
import { PeerReactionsOverlay } from "@/components/space/PeerReactionsOverlay";
import {
  ActivePeerReaction,
  OFFICE_REACTIONS,
  OfficeReactionPreset,
  pruneExpiredReactions,
} from "@/lib/space/officeReactions";
import {
  OFFICE_THEMES,
  OFFICE_THEME_LIST,
  OfficeThemeId,
  getThemeCssVars,
} from "@/lib/space/officeThemes";
import {
  IconCheck,
  IconLink,
  IconMic,
  IconScreenShare,
  IconUsers,
} from "@/components/space/SpaceIcons";
import { FloatingVideoBubbles } from "@/components/space/FloatingVideoBubbles";
import { VideoDock } from "@/components/space/VideoDock";
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

  // Local Peer State (spread reception spawn slightly so joining coworkers don't overlap)
  const [localPeer, setLocalPeer] = useState<PeerState>(() => ({
    id: `peer_${Math.random().toString(36).substring(2, 9)}`,
    name: initialUserName,
    avatarColor: initialAvatarColor,
    x: 6 + Math.floor(Math.random() * 5),
    y: 19 + Math.floor(Math.random() * 3),
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
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string; zoneId?: string }>
  >([]);

  // Room Locks
  const [lockedRooms, setLockedRooms] = useState<Record<string, { isLocked: boolean; passcode?: string }>>({});
  const [activeLockZone, setActiveLockZone] = useState<SpaceZone | null>(null);

  // UI state
  const [videoLayout, setVideoLayout] = useState<"floating" | "docked">("floating");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("people");
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [themeId, setThemeId] = useState<OfficeThemeId>("midnight");
  const [audioScope, setAudioScope] = useState<AudioScope>("office");
  const [peerReactions, setPeerReactions] = useState<Record<string, ActivePeerReaction>>({});
  const [activeDesk, setActiveDesk] = useState<InteractiveObject | null>(null);

  // Periodically clear expired overhead reactions
  useEffect(() => {
    if (Object.keys(peerReactions).length === 0) return;
    const timer = setInterval(() => {
      setPeerReactions((prev) => pruneExpiredReactions(prev));
    }, 500);
    return () => clearInterval(timer);
  }, [peerReactions]);

  // Clear unread chat badge whenever the chat tab is actively visible
  useEffect(() => {
    if (isSidebarOpen && sidebarTab === "chat" && unreadChatCount > 0) {
      setUnreadChatCount(0);
    }
  }, [isSidebarOpen, sidebarTab, unreadChatCount]);

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
  const [pulseModalOpen, setPulseModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [coffeeBoostNotice, setCoffeeBoostNotice] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [copyStatusText, setCopyStatusText] = useState("");

  // Fullscreen state (supports native Fullscreen API with CSS immersive fallback)
  const spaceContainerRef = useRef<HTMLDivElement | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [isImmersiveFallback, setIsImmersiveFallback] = useState(false);
  const isFullscreen = isNativeFullscreen || isImmersiveFallback;

  useEffect(() => {
    const syncFullscreenState = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const fsEl = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      const active = Boolean(fsEl);
      setIsNativeFullscreen(active);
      if (!active) {
        // Keep fallback off once native fullscreen ends via Esc or browser UI
        setIsImmersiveFallback(false);
      }
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      document.removeEventListener("webkitfullscreenchange", syncFullscreenState);
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
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
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
      // Fallback to viewport-locked immersive mode when browser blocks native fullscreen
    }
    setIsImmersiveFallback(true);
  }, [isImmersiveFallback]);

  // Toggle Media Controls & Floor Reactions
  const handleToggleAudio = useCallback(() => {
    void webrtcRef.current?.resumeAudio();
    const unmuted = webrtcRef.current?.toggleAudio() ?? false;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, audio: unmuted };
      signalingRef.current?.updateMedia({ audio: unmuted });
      return { ...prev, media: nextMedia };
    });
  }, []);

  const handleToggleVideo = useCallback(() => {
    const active = webrtcRef.current?.toggleVideo() ?? false;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, video: active };
      signalingRef.current?.updateMedia({ video: active });
      return { ...prev, media: nextMedia };
    });
  }, []);

  const handleTriggerReaction = useCallback((reaction: OfficeReactionPreset) => {
    signalingRef.current?.sendReaction(reaction.emoji, reaction.label);
  }, []);

  const handleCycleTheme = useCallback(() => {
    setThemeId((prev) => {
      const idx = OFFICE_THEME_LIST.findIndex((t) => t.id === prev);
      const next = OFFICE_THEME_LIST[(idx + 1) % OFFICE_THEME_LIST.length]!;
      return next.id;
    });
  }, []);

  // Global keyboard shortcuts: F fullscreen, B sidebar, M mic, V cam, ? help, 1-5 reactions
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
        handleToggleAudio();
      } else if (e.code === "KeyV") {
        e.preventDefault();
        handleToggleVideo();
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpModalOpen((v) => !v);
      } else if (e.key >= "1" && e.key <= "5") {
        const preset = OFFICE_REACTIONS[Number(e.key) - 1];
        if (preset) {
          e.preventDefault();
          handleTriggerReaction(preset);
        }
      } else if (e.code === "Escape" && isImmersiveFallback && !document.querySelector("dialog[open]")) {
        setIsImmersiveFallback(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleToggleFullscreen,
    handleToggleAudio,
    handleToggleVideo,
    handleTriggerReaction,
    isImmersiveFallback,
  ]);

  // Stable refs to prevent tearing down WebRTC/Signaling on avatar movement
  const signalingRef = useRef<SpaceSignaling | null>(null);
  const webrtcRef = useRef<WebRTCMeshManager | null>(null);
  const localPeerRef = useRef<PeerState>(localPeer);
  localPeerRef.current = localPeer;
  const remotePeersRef = useRef<PeerState[]>(remotePeers);
  remotePeersRef.current = remotePeers;
  const isSidebarOpenRef = useRef(isSidebarOpen);
  isSidebarOpenRef.current = isSidebarOpen;
  const sidebarTabRef = useRef(sidebarTab);
  sidebarTabRef.current = sidebarTab;
  const audioScopeRef = useRef<AudioScope>(audioScope);
  audioScopeRef.current = audioScope;

  // Keep spatial gain and zone isolation synchronized across all active peers
  const syncAllSpatialDistances = useCallback(
    (
      lx = localPeerRef.current.x,
      ly = localPeerRef.current.y,
      peers = remotePeersRef.current
    ) => {
      const webrtc = webrtcRef.current;
      if (!webrtc) return;
      const localZone = getZoneAt(lx, ly, map.zones);
      for (let i = 0; i < peers.length; i++) {
        const peer = peers[i]!;
        const peerZone = getZoneAt(peer.x, peer.y, map.zones);
        webrtc.updateSpatialDistance(
          peer.id,
          lx,
          ly,
          peer.x,
          peer.y,
          localZone,
          peerZone
        );
      }
    },
    [map.zones]
  );

  // Switch between office-wide audio (all open-floor coworkers audible) and proximity (<= 8 tiles)
  const handleToggleAudioScope = useCallback(() => {
    void webrtcRef.current?.resumeAudio();
    setAudioScope((prev) => {
      const next: AudioScope = prev === "office" ? "proximity" : "office";
      webrtcRef.current?.setAudioScope(next);
      syncAllSpatialDistances();
      return next;
    });
  }, [syncAllSpatialDistances]);

  // Unlock browser Web Audio / media playback on first user pointer or keyboard interaction
  useEffect(() => {
    const unlockAudio = () => {
      void webrtcRef.current?.resumeAudio();
    };
    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  // Handle Incoming Signaling Messages (stable callback)
  const handleSignalMessage = useCallback(
    (msg: SignalMessage) => {
      const myPeer = localPeerRef.current;

      switch (msg.type) {
        case "peer_join":
          if (msg.peer.id !== myPeer.id) {
            const alreadyKnown = remotePeersRef.current.some((p) => p.id === msg.peer.id);
            setRemotePeers((prev) => {
              const idx = prev.findIndex((p) => p.id === msg.peer.id);
              if (idx === -1) {
                return [...prev, { ...msg.peer, updatedAt: Date.now() }];
              }
              const next = [...prev];
              next[idx] = { ...msg.peer, updatedAt: Date.now() };
              return next;
            });

            if (!alreadyKnown) {
              officeAudio.playPeerJoinNotification();
              // Compute initial spatial gain & initiate WebRTC connection on first discovery
              const localZone = getZoneAt(myPeer.x, myPeer.y, map.zones);
              const peerZone = getZoneAt(msg.peer.x, msg.peer.y, map.zones);
              webrtcRef.current?.updateSpatialDistance(
                msg.peer.id,
                myPeer.x,
                myPeer.y,
                msg.peer.x,
                msg.peer.y,
                localZone,
                peerZone
              );
              // Deterministic initiator avoids simultaneous double-offer glare
              const shouldInitiate = myPeer.id < msg.peer.id;
              void webrtcRef.current?.connectToPeer(msg.peer.id, shouldInitiate);
            }
          }
          break;

        case "peer_move":
          if (msg.id !== myPeer.id) {
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
            const localZone = getZoneAt(myPeer.x, myPeer.y, map.zones);
            const peerZone = getZoneAt(msg.x, msg.y, map.zones);
            webrtcRef.current?.updateSpatialDistance(
              msg.id,
              myPeer.x,
              myPeer.y,
              msg.x,
              msg.y,
              localZone,
              peerZone
            );
          }
          break;

        case "peer_leave":
          setRemotePeers((prev) => prev.filter((p) => p.id !== msg.id));
          setStreamsMap((prev) => {
            if (!(msg.id in prev)) return prev;
            const next = { ...prev };
            delete next[msg.id];
            return next;
          });
          setSpeakingMap((prev) => {
            if (!(msg.id in prev)) return prev;
            const next = { ...prev };
            delete next[msg.id];
            return next;
          });
          signalingRef.current?.detachDataChannel(msg.id);
          webrtcRef.current?.disconnectPeer(msg.id);
          break;

        case "peer_media":
          if (msg.id !== myPeer.id) {
            setRemotePeers((prev) =>
              prev.map((p) =>
                p.id === msg.id
                  ? {
                      ...p,
                      media: { ...p.media, ...msg.media },
                      updatedAt: Date.now(),
                    }
                  : p
              )
            );
          }
          break;

        case "peer_status":
          if (msg.id !== myPeer.id) {
            setRemotePeers((prev) =>
              prev.map((p) =>
                p.id === msg.id
                  ? {
                      ...p,
                      status: msg.status,
                      deskClaimed: msg.deskClaimed,
                      name: msg.name ?? p.name,
                      avatarColor: msg.avatarColor ?? p.avatarColor,
                      updatedAt: Date.now(),
                    }
                  : p
              )
            );
          }
          break;

        case "peer_reaction":
          setPeerReactions((prev) => ({
            ...prev,
            [msg.id]: {
              peerId: msg.id,
              emoji: msg.emoji,
              label: msg.label,
              expiresAt: msg.expiresAt,
            },
          }));
          break;

        case "chat":
          setChatMessages((prev) => [
            ...prev.slice(-99),
            {
              id: msg.id,
              sender: msg.sender,
              text: msg.text,
              time: msg.time,
              zoneId: msg.zoneId,
            },
          ]);
          if (
            msg.sender !== myPeer.name &&
            (!isSidebarOpenRef.current || sidebarTabRef.current !== "chat")
          ) {
            setUnreadChatCount((c) => Math.min(999, c + 1));
          }
          break;

        case "webrtc_signal":
          if (msg.to === myPeer.id) {
            webrtcRef.current?.handleSignal(msg.from, msg.payload);
          }
          break;
      }
    },
    [map.zones]
  );

  // Initialize WebRTC and Signaling ONCE per spaceSlug & localPeer.id
  useEffect(() => {
    // 1. Initialize WebRTC mesh manager
    const webrtc = new WebRTCMeshManager(
      (toPeerId: string, payload: any) => {
        signalingRef.current?.sendSignal(toPeerId, payload);
      },
      (peerId: string, stream: MediaStream, isSpeaking: boolean) => {
        setStreamsMap((prev) => ({ ...prev, [peerId]: stream }));
        if (isSpeaking !== undefined) {
          setSpeakingMap((prev) => ({ ...prev, [peerId]: isSpeaking }));
        }
        const matchedPeer = remotePeersRef.current.find((p) => p.id === peerId);
        if (matchedPeer) {
          const lp = localPeerRef.current;
          webrtc.updateSpatialDistance(
            peerId,
            lp.x,
            lp.y,
            matchedPeer.x,
            matchedPeer.y,
            getZoneAt(lp.x, lp.y, map.zones),
            getZoneAt(matchedPeer.x, matchedPeer.y, map.zones)
          );
        }
      },
      (peerId: string, isSpeaking: boolean) => {
        setSpeakingMap((prev) => {
          if (prev[peerId] === isSpeaking) return prev;
          return { ...prev, [peerId]: isSpeaking };
        });
        if (peerId === "local") {
          setLocalPeer((prev) => {
            if (prev.media.speaking === isSpeaking) return prev;
            return {
              ...prev,
              media: { ...prev.media, speaking: isSpeaking },
            };
          });
        }
      },
      localPeerRef.current.id,
      (peerId: string, channel: RTCDataChannel) => {
        signalingRef.current?.attachDataChannel(peerId, channel);
      }
    );

    let cancelled = false;
    webrtc.setAudioScope(audioScopeRef.current);
    webrtcRef.current = webrtc;
    webrtc
      .initLocalMedia(true, true)
      .then(({ stream, hasAudio, hasVideo }) => {
        if (cancelled) return;
        setLocalPeer((prev) => ({
          ...prev,
          media: { ...prev.media, audio: hasAudio, video: hasVideo },
        }));
        signalingRef.current?.updateMedia({ audio: hasAudio, video: hasVideo });
        if (stream) {
          setStreamsMap((prev) => ({
            ...prev,
            local: stream,
            [localPeerRef.current.id]: stream,
          }));
        }
      })
      .catch(() => {
        // Browser camera/mic permissions denied or unavailable: graceful fallback
      });

    // 2. Initialize Signaling Channel
    const signaling = new SpaceSignaling(spaceSlug, localPeerRef.current, handleSignalMessage);
    signalingRef.current = signaling;

    // 3. Periodically prune disconnected peers that missed peer_leave (> 30s without heartbeat)
    const pruneTimer = setInterval(() => {
      const cutoff = Date.now() - 30_000;
      const expired = remotePeersRef.current.filter((p) => p.updatedAt < cutoff);
      if (expired.length === 0) return;

      const expiredIds = new Set(expired.map((p) => p.id));
      for (const peer of expired) {
        signalingRef.current?.detachDataChannel(peer.id);
        webrtcRef.current?.disconnectPeer(peer.id);
      }

      setRemotePeers((prev) => prev.filter((p) => !expiredIds.has(p.id)));
      setStreamsMap((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const id of expiredIds) {
          if (id in next) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      setSpeakingMap((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const id of expiredIds) {
          if (id in next) {
            delete next[id];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 10_000);

    return () => {
      cancelled = true;
      clearInterval(pruneTimer);
      signaling.destroy();
      webrtc.destroy();
    };
  }, [spaceSlug, localPeer.id, handleSignalMessage]);

  // Handle Local Movement (stable callback using remotePeersRef)
  const handleMove = useCallback(
    (x: number, y: number, dir: PeerState["dir"], isMoving: boolean, zoneId: string) => {
      setLocalPeer((prev) => {
        if (
          prev.x === x &&
          prev.y === y &&
          prev.dir === dir &&
          prev.isMoving === isMoving &&
          prev.zoneId === zoneId
        ) {
          return prev;
        }
        return {
          ...prev,
          x,
          y,
          dir,
          isMoving,
          zoneId,
        };
      });

      signalingRef.current?.updatePosition(x, y, dir, isMoving, zoneId);

      // Footstep sound synthesis when moving
      if (isMoving && Math.random() < 0.25) {
        const surface = zoneId === "cafe_lounge" ? "tile" : zoneId === "boardroom" ? "carpet" : "wood";
        officeAudio.playFootstep(surface);
      }

      // Update distance attenuation for all remote peers
      syncAllSpatialDistances(x, y);
    },
    [syncAllSpatialDistances]
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

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    const sharing = (await webrtcRef.current?.toggleScreenShare()) ?? false;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, screen: sharing };
      signalingRef.current?.updateMedia({ screen: sharing });
      return { ...prev, media: nextMedia };
    });
  };

  // Warp avatar directly to coordinates (e.g. clicking OfficeMinimap)
  const handleWarpToCoords = (x: number, y: number, zoneId: string) => {
    officeAudio.playRoomEnterChime();
    handleMove(x, y, "down", false, zoneId);
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
      signalingRef.current?.updateStatus(
        customization.status,
        prev.deskClaimed,
        customization.name,
        customization.avatarColor
      );
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

  // Peers visible in VideoDock: everyone on open floor/same zone in office mode, or within 8 tiles in proximity mode
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

  const handleCopyInvite = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setInviteCopied(true);
      setCopyStatusText("Invite link copied");
      setTimeout(() => {
        setInviteCopied(false);
        setCopyStatusText("");
      }, 2500);
    } catch {
      setCopyStatusText("Failed to copy invite link");
    }
  };

  const activePresenter = remotePeers.find((p) => p.media.screen) || (localPeer.media.screen ? localPeer : null);
  const activePresenterStream = activePresenter
    ? activePresenter.id === localPeer.id
      ? webrtcRef.current?.getLocalStream() || streamsMap[localPeer.id] || streamsMap["local"] || null
      : streamsMap[activePresenter.id] || null
    : null;

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
      {/* Full-Viewport Floor Area (3D or 2D) */}
      <div className="relative flex-1 h-full flex flex-col min-w-0">
        {/* Minimalist Floating Top-Left HUD Cluster */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 max-w-[calc(100vw-11rem)] sm:max-w-[55vw]">
          <div className="h-8 pl-1.5 pr-2.5 rounded-full bg-surface/75 backdrop-blur-md border border-border/70 flex items-center gap-1.5 min-w-0 shadow-sm">
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
            <h1 className="font-display text-xs font-bold text-text truncate">
              {spaceName}
            </h1>
          </div>

          <OfficeMinimap
            map={map}
            localPeer={localPeer}
            remotePeers={remotePeers}
            onWarpToRoom={handleWarpToRoom}
            onWarpToCoords={handleWarpToCoords}
          />
        </div>

        {/* Minimalist Floating Top-Right Utility Cluster */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
          {activePresenter && (
            <button
              type="button"
              onClick={() => setTheaterModalOpen(true)}
              className="h-8 px-2.5 text-[11px] font-display font-semibold bg-accent text-bg rounded-full hover:brightness-110 flex items-center gap-1 shadow-sm animate-pulse"
            >
              <IconScreenShare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Watch</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleAudioScope}
            aria-pressed={audioScope === "office"}
            aria-label="Office-wide audio mode"
            title={
              audioScope === "office"
                ? "Office Audio: hear everyone on open floor (click for Proximity)"
                : "Proximity Audio: hear coworkers within 8 tiles (click for Office)"
            }
            className={`h-8 px-2.5 text-[11px] backdrop-blur-md border rounded-full flex items-center gap-1.5 font-display font-semibold transition-colors shadow-sm ${
              audioScope === "office"
                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-surface/75 hover:bg-surface/95 border-border/70 text-text-muted hover:text-text"
            }`}
          >
            <IconMic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {audioScope === "office" ? "Office" : "Prox"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopyInvite()}
            aria-label="Copy invite link"
            title="Copy room invite link"
            className="h-8 px-2.5 text-[11px] bg-surface/75 hover:bg-surface/95 backdrop-blur-md border border-border/70 hover:border-border text-text rounded-full flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {inviteCopied ? (
              <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
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
            title={isSidebarOpen ? "Close Panel (B)" : "People, Rooms & Chat (B)"}
            className={`relative h-8 px-2.5 text-[11px] backdrop-blur-md border rounded-full flex items-center gap-1.5 font-display font-semibold transition-colors shadow-sm ${
              isSidebarOpen
                ? "bg-accent/20 border-accent text-accent"
                : "bg-surface/75 hover:bg-surface/95 border-border/70 hover:border-border text-text"
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

        {/* Floor Canvas World: 3D Isometric WebGL or 2D Top-Down */}
        <div className="relative flex-1 w-full min-h-0">
          {viewMode === "3d" ? (
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

          {/* Floating Overhead Avatar Reactions (0 React loop churn) */}
          <PeerReactionsOverlay reactions={peerReactions} />

          {/* Desktop Floating Video Heads */}
          {videoLayout === "floating" && (
            <div className="hidden md:block">
              <FloatingVideoBubbles
                peers={[localPeer, ...remotePeers]}
                localPeerId={localPeer.id}
                speakingMap={speakingMap}
                streamsMap={streamsMap}
                onBubbleClick={handleWarpToPeer}
              />
            </div>
          )}

          {/* Top-Center Active Office Video Strip (auto-appears when coworkers join or Docked mode is set) */}
          {(videoLayout === "docked" || remotePeers.length > 0) && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
              <VideoDock
                localPeer={localPeer}
                nearbyPeers={nearbyPeers}
                speakingMap={speakingMap}
                streamsMap={streamsMap}
                onSelectPeer={handleWarpToPeer}
              />
            </div>
          )}

          {/* Coffee Speed Boost Banner */}
          {coffeeBoostNotice && (
            <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 bg-amber-500/90 text-black font-display text-xs font-bold rounded-full shadow-arcade animate-bounce">
              ESPRESSO BOOST ACTIVATED (+50% Speed)
            </div>
          )}

          {/* Floating Controls Dock (Bottom Center) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[96vw]">
            <SpaceControls
              isAudioMuted={!localPeer.media.audio}
              isVideoMuted={!localPeer.media.video}
              isScreenSharing={localPeer.media.screen}
              isFullscreen={isFullscreen}
              videoLayout={videoLayout}
              viewMode={viewMode}
              themeId={themeId}
              audioScope={audioScope}
              onToggleAudio={handleToggleAudio}
              onToggleVideo={handleToggleVideo}
              onToggleScreenShare={handleToggleScreenShare}
              onToggleFullscreen={() => void handleToggleFullscreen()}
              onToggleVideoLayout={() =>
                setVideoLayout((l) => (l === "floating" ? "docked" : "floating"))
              }
              onToggleViewMode={() =>
                setViewMode((m) => (m === "3d" ? "2d" : "3d"))
              }
              onToggleAudioScope={handleToggleAudioScope}
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
        activeTab={sidebarTab}
        onTabChange={setSidebarTab}
        unreadChatCount={unreadChatCount}
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
        title="Controls & Office Guide"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-3 text-xs text-text">
          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">3D &amp; 2D Virtual Floor:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li><b className="text-text">WASD / Arrow Keys</b>: Walk smoothly across all rooms.</li>
              <li><b className="text-text">Click Map or Floor</b>: Pathfind around desks or warp from the top-left minimap.</li>
              <li><b className="text-text">Scroll Wheel</b> or top-right HUD: Zoom &amp; orbit the 3D camera.</li>
              <li><b className="text-text">F</b>: Expand into Fullscreen Mode (<b className="text-text">Esc</b> to exit).</li>
              <li><b className="text-text">B</b>: Collapse or expand the People, Rooms &amp; Chat panel.</li>
            </ul>
          </div>

          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">Audio, Video &amp; Reactions:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li><b className="text-text">M</b> / <b className="text-text">V</b>: Toggle Microphone and Camera.</li>
              <li><b className="text-text">1–5</b>: Pop quick overhead reactions (Wave, Agree, Coffee, Ship it, Idea).</li>
              <li>Walk near coworkers (&lt;4 tiles) for proximity audio/video, or enter soundproof rooms.</li>
            </ul>
          </div>

          <div className="p-2.5 bg-surface-2 rounded-control space-y-1">
            <span className="font-display font-bold text-accent">Interactive Objects:</span>
            <ul className="list-disc pl-4 space-y-0.5 text-text-muted">
              <li>Press <b className="text-text">E</b> near desks, whiteboards, Lo-Fi Radio, or the Espresso Bar.</li>
              <li>Switch office lighting themes (<b className="text-text">Midnight Studio</b>, <b className="text-text">Daylight Glass</b>, <b className="text-text">Warm Lounge</b>) from the dock.</li>
            </ul>
          </div>
        </div>
      </ArcadeDialog>
    </div>
  );
}
