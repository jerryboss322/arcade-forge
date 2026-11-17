"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SpaceZone, getZoneAt } from "@/lib/space/officeMap";
import { ActivePeerReaction, pruneExpiredReactions } from "@/lib/space/officeReactions";
import {
  PeerState,
  SignalMessage,
  SpaceSignaling,
} from "@/lib/space/signaling";
import { officeAudio } from "@/lib/space/officeAudio";
import {
  AudioScope,
  LocalMediaStatus,
  PeerLinkStatus,
  WebRTCDiagnosticsSnapshot,
  WebRTCMeshManager,
} from "@/lib/space/webrtcMesh";
import { LiveKitRoomClient } from "@/lib/space/livekitRoomClient";

export interface InitialRoomMedia {
  audioEnabled: boolean;
  videoEnabled: boolean;
  cameraFacing: "user" | "environment";
  stream: MediaStream | null;
}

interface UseSpaceRoomOptions {
  spaceSlug: string;
  zones: SpaceZone[];
  initialPeer: PeerState;
  initialMedia?: InitialRoomMedia;
  isChatOpenRef: React.MutableRefObject<boolean>;
}

export function useSpaceRoom({
  spaceSlug,
  zones,
  initialPeer,
  initialMedia,
  isChatOpenRef,
}: UseSpaceRoomOptions) {
  const [transportMode, setTransportMode] = useState<"livekit" | "p2p">("p2p");
  const [localPeer, setLocalPeer] = useState<PeerState>(initialPeer);
  const [remotePeers, setRemotePeers] = useState<PeerState[]>([]);
  const [streamsMap, setStreamsMap] = useState<Record<string, MediaStream>>(() => {
    const initial: Record<string, MediaStream> = {};
    if (initialMedia?.stream) {
      initial.local = initialMedia.stream;
      initial[initialPeer.id] = initialMedia.stream;
    }
    return initial;
  });
  const [speakingMap, setSpeakingMap] = useState<Record<string, boolean>>({});
  const [localMediaStatus, setLocalMediaStatus] = useState<LocalMediaStatus | null>(null);
  const [peerLinkStates, setPeerLinkStates] = useState<Record<string, PeerLinkStatus>>({});
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: string; text: string; time: string; zoneId?: string }>
  >([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [peerReactions, setPeerReactions] = useState<Record<string, ActivePeerReaction>>({});
  const [audioScope, setAudioScope] = useState<AudioScope>("office");
  const [audioUnlockNeeded, setAudioUnlockNeeded] = useState(false);
  const [iceFailureNotice, setIceFailureNotice] = useState<string | null>(null);
  const [accessBlockedReason, setAccessBlockedReason] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<WebRTCDiagnosticsSnapshot | null>(null);

  const localPeerRef = useRef(localPeer);
  localPeerRef.current = localPeer;
  const remotePeersRef = useRef(remotePeers);
  remotePeersRef.current = remotePeers;
  const audioScopeRef = useRef(audioScope);
  audioScopeRef.current = audioScope;
  const initialMediaRef = useRef(initialMedia);

  const signalingRef = useRef<SpaceSignaling | null>(null);
  const webrtcRef = useRef<WebRTCMeshManager | null>(null);
  const livekitRef = useRef<LiveKitRoomClient | null>(null);

  const updateSpatialForPeer = useCallback(
    (peerId: string, lx: number, ly: number, px: number, py: number) => {
      const localZone = getZoneAt(lx, ly, zones);
      const peerZone = getZoneAt(px, py, zones);
      webrtcRef.current?.updateSpatialDistance(peerId, lx, ly, px, py, localZone, peerZone);
      livekitRef.current?.updateSpatialDistance(peerId, lx, ly, px, py, localZone, peerZone);
    },
    [zones]
  );

  const syncAllSpatialDistances = useCallback(() => {
    const { x: lx, y: ly } = localPeerRef.current;
    for (const peer of remotePeersRef.current) {
      updateSpatialForPeer(peer.id, lx, ly, peer.x, peer.y);
    }
  }, [updateSpatialForPeer]);

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
              updateSpatialForPeer(msg.peer.id, myPeer.x, myPeer.y, msg.peer.x, msg.peer.y);
              if (webrtcRef.current) {
                const shouldInitiate = myPeer.id < msg.peer.id;
                void webrtcRef.current.connectToPeer(msg.peer.id, shouldInitiate);
              }
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
            updateSpatialForPeer(msg.id, myPeer.x, myPeer.y, msg.x, msg.y);
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
          setPeerLinkStates((prev) => {
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
          if (msg.sender !== myPeer.name && !isChatOpenRef.current) {
            setUnreadChatCount((c) => Math.min(999, c + 1));
          }
          break;

        case "webrtc_signal":
          if (msg.to === myPeer.id) {
            void webrtcRef.current?.handleSignal(msg.from, msg.payload);
          }
          break;
      }
    },
    [isChatOpenRef, updateSpatialForPeer]
  );

  // Prune expired reactions periodically
  useEffect(() => {
    if (Object.keys(peerReactions).length === 0) return;
    const timer = setInterval(() => {
      setPeerReactions((prev) => pruneExpiredReactions(prev));
    }, 500);
    return () => clearInterval(timer);
  }, [peerReactions]);

  // Connect either LiveKit SFU (when LIVEKIT_* configured) or P2P + Redis fallback
  useEffect(() => {
    let cancelled = false;
    let pruneTimer: ReturnType<typeof setInterval> | null = null;

    const handleLocalMediaUpdate = ({
      stream,
      status,
    }: {
      stream: MediaStream | null;
      status: LocalMediaStatus;
    }) => {
      if (cancelled) return;
      setLocalMediaStatus(status);
      if (stream) {
        setStreamsMap((prev) => ({
          ...prev,
          local: stream,
          [localPeerRef.current.id]: stream,
        }));
      }
      setLocalPeer((prev) => {
        if (prev.media.audio === status.hasAudio && prev.media.video === status.hasVideo) {
          return prev;
        }
        signalingRef.current?.updateMedia({
          audio: status.hasAudio,
          video: status.hasVideo,
        });
        livekitRef.current?.updateMedia({
          audio: status.hasAudio,
          video: status.hasVideo,
        });
        return {
          ...prev,
          media: {
            ...prev.media,
            audio: status.hasAudio,
            video: status.hasVideo,
          },
        };
      });
    };

    const handleSpeakingUpdate = (peerId: string, isSpeaking: boolean) => {
      setSpeakingMap((prev) => {
        if (prev[peerId] === isSpeaking) return prev;
        return { ...prev, [peerId]: isSpeaking };
      });
      if (peerId === "local") {
        setLocalPeer((prev) => {
          if (prev.media.speaking === isSpeaking) return prev;
          return { ...prev, media: { ...prev.media, speaking: isSpeaking } };
        });
      }
    };

    const startP2P = () => {
      setTransportMode("p2p");
      const webrtc = new WebRTCMeshManager(
        (toPeerId: string, payload: unknown) => {
          signalingRef.current?.sendSignal(toPeerId, payload);
        },
        (peerId: string, stream: MediaStream, isSpeaking: boolean) => {
          setStreamsMap((prev) => ({ ...prev, [peerId]: stream }));
          if (isSpeaking !== undefined) {
            setSpeakingMap((prev) => ({ ...prev, [peerId]: isSpeaking }));
          }
          if (stream.getAudioTracks().length > 0 && webrtc.needsAudioUnlock()) {
            setAudioUnlockNeeded(true);
          }
          const matched = remotePeersRef.current.find((p) => p.id === peerId);
          if (matched) {
            const lp = localPeerRef.current;
            updateSpatialForPeer(peerId, lp.x, lp.y, matched.x, matched.y);
          }
        },
        handleSpeakingUpdate,
        localPeerRef.current.id,
        (peerId: string, channel: RTCDataChannel) => {
          signalingRef.current?.attachDataChannel(peerId, channel);
        },
        (_peerId: string, { hasTurn }) => {
          setIceFailureNotice(
            hasTurn
              ? "Peer media connection blocked by a strict firewall. Try Inspect / Reconnect."
              : "Cross-network video blocked by NAT/firewall: configure LiveKit or TURN in Vercel."
          );
        },
        {
          onLocalMediaChange: handleLocalMediaUpdate,
          onPeerStateChange: (peerId, state) => {
            if (cancelled) return;
            setPeerLinkStates((prev) => {
              if (prev[peerId] === state) return prev;
              return { ...prev, [peerId]: state };
            });
            if (state === "connected" || state === "relayed") {
              setIceFailureNotice(null);
            }
          },
          onSlowConnection: (_peerId, { hasTurn }) => {
            if (cancelled) return;
            setIceFailureNotice((prev) =>
              prev ||
              (hasTurn
                ? "Peer media is still negotiating — tap Inspect to view WebRTC telemetry."
                : "Cross-network video needs LiveKit or a TURN relay configured in Vercel.")
            );
          },
        }
      );

      webrtc.setAudioScope(audioScopeRef.current);
      webrtcRef.current = webrtc;

      const preJoined = initialMediaRef.current;
      if (preJoined) {
        const adopted = webrtc.adoptPreJoinedStream(preJoined.stream, {
          audioEnabled: preJoined.audioEnabled,
          videoEnabled: preJoined.videoEnabled,
          cameraFacing: preJoined.cameraFacing,
        });
        setLocalPeer((prev) => ({
          ...prev,
          media: { ...prev.media, audio: adopted.hasAudio, video: adopted.hasVideo },
        }));
      } else {
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
          .catch(() => {});
      }

      const signaling = new SpaceSignaling(
        spaceSlug,
        localPeerRef.current,
        handleSignalMessage,
        (accessErr) => {
          setAccessBlockedReason(accessErr.message);
          signaling.destroy();
          webrtc.destroy();
        }
      );
      signalingRef.current = signaling;

      pruneTimer = setInterval(() => {
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
          const next = { ...prev };
          let changed = false;
          for (const id of expiredIds) {
            if (id in next) {
              delete next[id];
              changed = true;
            }
          }
          return changed ? next : prev;
        });
        setSpeakingMap((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const id of expiredIds) {
            if (id in next) {
              delete next[id];
              changed = true;
            }
          }
          return changed ? next : prev;
        });
        setPeerLinkStates((prev) => {
          const next = { ...prev };
          let changed = false;
          for (const id of expiredIds) {
            if (id in next) {
              delete next[id];
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }, 10_000);
    };

    const boot = async () => {
      try {
        const res = await fetch("/api/space/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel: spaceSlug,
            peerId: localPeerRef.current.id,
            name: localPeerRef.current.name,
            avatarColor: localPeerRef.current.avatarColor,
          }),
        });

        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string };
          setAccessBlockedReason(errData.error || "Access denied for this workspace.");
          return;
        }

        if (res.ok) {
          const tokenData = (await res.json()) as {
            mode?: "livekit" | "p2p";
            url?: string;
            token?: string;
          };
          if (tokenData.mode === "livekit" && tokenData.url && tokenData.token) {
            setTransportMode("livekit");
            const lkClient = new LiveKitRoomClient({
              localPeer: localPeerRef.current,
              initialStream: initialMediaRef.current?.stream ?? null,
              cameraFacing: initialMediaRef.current?.cameraFacing ?? "user",
              onMessage: handleSignalMessage,
              onRemoteStream: (peerId, stream, isSpeaking) => {
                setStreamsMap((prev) => ({ ...prev, [peerId]: stream }));
                setSpeakingMap((prev) => ({ ...prev, [peerId]: isSpeaking }));
                const matched = remotePeersRef.current.find((p) => p.id === peerId);
                if (matched) {
                  const lp = localPeerRef.current;
                  updateSpatialForPeer(peerId, lp.x, lp.y, matched.x, matched.y);
                }
              },
              onSpeakingChange: handleSpeakingUpdate,
              onPeerStateChange: (peerId, state) => {
                if (cancelled) return;
                setPeerLinkStates((prev) => {
                  if (prev[peerId] === state) return prev;
                  return { ...prev, [peerId]: state };
                });
              },
              onLocalMediaChange: handleLocalMediaUpdate,
              onAudioPlaybackBlocked: () => {
                if (!cancelled) setAudioUnlockNeeded(true);
              },
            });
            lkClient.setAudioScope(audioScopeRef.current);
            livekitRef.current = lkClient;
            await lkClient.connect(tokenData.url, tokenData.token);
            return;
          }
        }
      } catch {
        // Fallback to Redis + P2P WebRTC cleanly
      }

      if (!cancelled) {
        startP2P();
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (pruneTimer) clearInterval(pruneTimer);
      livekitRef.current?.destroy();
      livekitRef.current = null;
      signalingRef.current?.destroy();
      signalingRef.current = null;
      webrtcRef.current?.destroy();
      webrtcRef.current = null;
    };
  }, [spaceSlug, initialPeer.id, handleSignalMessage, updateSpatialForPeer]);

  // Actions exposed to UI components
  const resumeAudio = useCallback(async () => {
    const lkOk = await livekitRef.current?.resumeAudio();
    const rtcOk = await webrtcRef.current?.resumeAudio();
    const unlocked = Boolean(lkOk || rtcOk);
    if (unlocked) setAudioUnlockNeeded(false);
    return unlocked;
  }, []);

  const toggleAudio = useCallback(async () => {
    void resumeAudio();
    const unmuted = livekitRef.current
      ? await livekitRef.current.toggleAudioSmart()
      : await webrtcRef.current?.toggleAudioSmart();
    if (unmuted === undefined) return;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, audio: unmuted };
      signalingRef.current?.updateMedia({ audio: unmuted });
      livekitRef.current?.updateMedia({ audio: unmuted });
      return { ...prev, media: nextMedia };
    });
  }, [resumeAudio]);

  const toggleVideo = useCallback(async () => {
    const active = livekitRef.current
      ? await livekitRef.current.toggleVideoSmart()
      : await webrtcRef.current?.toggleVideoSmart();
    if (active === undefined) return;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, video: active };
      signalingRef.current?.updateMedia({ video: active });
      livekitRef.current?.updateMedia({ video: active });
      return { ...prev, media: nextMedia };
    });
  }, []);

  const switchCamera = useCallback(async () => {
    if (livekitRef.current) {
      await livekitRef.current.switchCamera();
    } else {
      await webrtcRef.current?.switchCamera();
    }
  }, []);

  const retryMedia = useCallback(async () => {
    const result = livekitRef.current
      ? await livekitRef.current.retryMissingMedia()
      : await webrtcRef.current?.retryMissingMedia();
    if (!result) return;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, audio: result.hasAudio, video: result.hasVideo };
      signalingRef.current?.updateMedia({ audio: result.hasAudio, video: result.hasVideo });
      livekitRef.current?.updateMedia({ audio: result.hasAudio, video: result.hasVideo });
      return { ...prev, media: nextMedia };
    });
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const sharing = livekitRef.current
      ? await livekitRef.current.toggleScreenShare()
      : (await webrtcRef.current?.toggleScreenShare()) ?? false;
    setLocalPeer((prev) => {
      const nextMedia = { ...prev.media, screen: sharing };
      signalingRef.current?.updateMedia({ screen: sharing });
      livekitRef.current?.updateMedia({ screen: sharing });
      return { ...prev, media: nextMedia };
    });
    return sharing;
  }, []);

  const toggleAudioScope = useCallback(() => {
    void resumeAudio();
    setAudioScope((prev) => {
      const next: AudioScope = prev === "office" ? "proximity" : "office";
      webrtcRef.current?.setAudioScope(next);
      livekitRef.current?.setAudioScope(next);
      syncAllSpatialDistances();
      return next;
    });
  }, [resumeAudio, syncAllSpatialDistances]);

  const move = useCallback(
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
        return { ...prev, x, y, dir, isMoving, zoneId };
      });
      signalingRef.current?.updatePosition(x, y, dir, isMoving, zoneId);
      livekitRef.current?.updatePosition(x, y, dir, isMoving, zoneId);
      for (const peer of remotePeersRef.current) {
        updateSpatialForPeer(peer.id, x, y, peer.x, peer.y);
      }
    },
    [updateSpatialForPeer]
  );

  const updateStatus = useCallback(
    (status: string, deskClaimed?: string | null, name?: string, avatarColor?: string) => {
      setLocalPeer((prev) => ({
        ...prev,
        status,
        deskClaimed: deskClaimed !== undefined ? deskClaimed : prev.deskClaimed,
        name: name ?? prev.name,
        avatarColor: avatarColor ?? prev.avatarColor,
      }));
      signalingRef.current?.updateStatus(status, deskClaimed, name, avatarColor);
      livekitRef.current?.updateStatus(status, deskClaimed, name, avatarColor);
    },
    []
  );

  const sendChat = useCallback((text: string, zoneId?: string) => {
    signalingRef.current?.sendChat(text, zoneId);
    livekitRef.current?.sendChat(text, zoneId);
  }, []);

  const sendReaction = useCallback((emoji: string, label: string) => {
    signalingRef.current?.sendReaction(emoji, label);
    livekitRef.current?.sendReaction(emoji, label);
  }, []);

  const refreshDiagnostics = useCallback(async () => {
    const snap = livekitRef.current
      ? await livekitRef.current.getDiagnostics()
      : await webrtcRef.current?.getDiagnostics();
    if (snap) setDiagnostics(snap);
  }, []);

  const forceReconnect = useCallback(async () => {
    if (livekitRef.current) {
      await livekitRef.current.forceReconnectPendingPeers();
    } else {
      await webrtcRef.current?.forceReconnectPendingPeers();
    }
  }, []);

  const clearUnreadChat = useCallback(() => {
    setUnreadChatCount(0);
  }, []);

  const getLocalStream = useCallback(() => {
    return (
      livekitRef.current?.getLocalStream() ||
      webrtcRef.current?.getLocalStream() ||
      streamsMap[localPeer.id] ||
      streamsMap["local"] ||
      null
    );
  }, [streamsMap, localPeer.id]);

  return {
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
  };
}
