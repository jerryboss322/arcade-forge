import {
  ConnectionQuality,
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  createLocalScreenTracks,
  createLocalVideoTrack,
  type LocalTrack,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import type { PeerMediaState, PeerState, SignalMessage } from "./signaling";
import {
  computeSpatialGain,
  type AudioScope,
  type LocalMediaStatus,
  type PeerDiagnosticEntry,
  type PeerLinkStatus,
  type WebRTCDiagnosticsSnapshot,
} from "./webrtcMesh";

interface LiveKitRemotePeer {
  participant: RemoteParticipant;
  cameraTrack?: RemoteTrack;
  screenTrack?: RemoteTrack;
  audioTrack?: RemoteTrack;
  audioEl?: HTMLAudioElement;
  stream: MediaStream;
  isSpeaking: boolean;
  targetGain: number;
}

export interface LiveKitClientOptions {
  localPeer: PeerState;
  initialStream: MediaStream | null;
  cameraFacing?: "user" | "environment";
  onMessage: (msg: SignalMessage) => void;
  onRemoteStream: (peerId: string, stream: MediaStream, isSpeaking: boolean) => void;
  onSpeakingChange: (peerId: string, speaking: boolean) => void;
  onPeerStateChange: (peerId: string, state: PeerLinkStatus) => void;
  onLocalMediaChange: (update: { stream: MediaStream | null; status: LocalMediaStatus }) => void;
  onAudioPlaybackBlocked?: () => void;
}

export class LiveKitRoomClient {
  private room: Room;
  private localPeer: PeerState;
  private cameraFacing: "user" | "environment";
  private localStream: MediaStream | null;
  private screenStream: MediaStream | null = null;
  private publishedAudioTrack: LocalTrack | MediaStreamTrack | null = null;
  private publishedVideoTrack: LocalTrack | MediaStreamTrack | null = null;
  private publishedScreenTrack: LocalTrack | MediaStreamTrack | null = null;
  private remotePeers = new Map<string, LiveKitRemotePeer>();
  private audioScope: AudioScope = "office";
  private destroyed = false;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  public isAudioMuted: boolean;
  public isVideoMuted: boolean;
  public isScreenSharing = false;
  public cameraError: string | null = null;
  public micError: string | null = null;

  private onMessageCb: (msg: SignalMessage) => void;
  private onRemoteStreamCb: (peerId: string, stream: MediaStream, isSpeaking: boolean) => void;
  private onSpeakingChangeCb: (peerId: string, speaking: boolean) => void;
  private onPeerStateChangeCb: (peerId: string, state: PeerLinkStatus) => void;
  private onLocalMediaChangeCb: (update: {
    stream: MediaStream | null;
    status: LocalMediaStatus;
  }) => void;
  private onAudioPlaybackBlockedCb?: () => void;

  constructor(opts: LiveKitClientOptions) {
    this.localPeer = { ...opts.localPeer };
    this.localStream = opts.initialStream;
    this.cameraFacing = opts.cameraFacing ?? "user";
    this.isAudioMuted = !opts.localPeer.media.audio;
    this.isVideoMuted = !opts.localPeer.media.video;
    this.onMessageCb = opts.onMessage;
    this.onRemoteStreamCb = opts.onRemoteStream;
    this.onSpeakingChangeCb = opts.onSpeakingChange;
    this.onPeerStateChangeCb = opts.onPeerStateChange;
    this.onLocalMediaChangeCb = opts.onLocalMediaChange;
    this.onAudioPlaybackBlockedCb = opts.onAudioPlaybackBlocked;

    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    this.bindRoomEvents();
  }

  private bindRoomEvents(): void {
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      if (this.destroyed) return;
      this.onPeerStateChangeCb(participant.identity, "connected");
      const meta = this.parseMetadata(participant.metadata);
      const joinPeer: PeerState = {
        id: participant.identity,
        name: participant.name || meta.name || "Teammate",
        avatarColor: meta.avatarColor || "#00A8FF",
        x: 7,
        y: 20,
        dir: "down",
        isMoving: false,
        zoneId: "reception",
        status: "Focusing",
        deskClaimed: null,
        media: {
          audio: participant.isMicrophoneEnabled,
          video: participant.isCameraEnabled,
          screen: participant.isScreenShareEnabled,
          speaking: participant.isSpeaking,
        },
        updatedAt: Date.now(),
      };
      this.onMessageCb({ type: "peer_join", peer: joinPeer });
      // Share our authoritative coordinates/status with newcomer over DataChannel
      this.broadcast({ type: "peer_join", peer: this.localPeer });
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (this.destroyed) return;
      const entry = this.remotePeers.get(participant.identity);
      if (entry?.audioEl) {
        entry.audioEl.pause();
        entry.audioEl.remove();
      }
      this.remotePeers.delete(participant.identity);
      this.onMessageCb({ type: "peer_leave", id: participant.identity });
    });

    this.room.on(
      RoomEvent.TrackSubscribed,
      (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (this.destroyed) return;
        const peerId = participant.identity;
        const entry = this.ensureRemoteEntry(participant);

        if (track.kind === Track.Kind.Audio) {
          entry.audioTrack = track;
          if (entry.audioEl) {
            entry.audioEl.remove();
          }
          const audioEl = track.attach() as HTMLAudioElement;
          audioEl.volume = entry.targetGain;
          audioEl.style.display = "none";
          if (typeof document !== "undefined") {
            document.body.appendChild(audioEl);
          }
          audioEl.play().catch(() => {
            this.onAudioPlaybackBlockedCb?.();
          });
          entry.audioEl = audioEl;
          return;
        }

        if (track.kind === Track.Kind.Video) {
          if (pub.source === Track.Source.ScreenShare) {
            entry.screenTrack = track;
          } else {
            entry.cameraTrack = track;
          }
          this.syncRemoteVideoStream(peerId, entry);
        }
      }
    );

    this.room.on(
      RoomEvent.TrackUnsubscribed,
      (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
        if (this.destroyed) return;
        const peerId = participant.identity;
        const entry = this.remotePeers.get(peerId);
        if (!entry) return;

        if (track.kind === Track.Kind.Audio) {
          track.detach().forEach((el) => el.remove());
          entry.audioTrack = undefined;
          entry.audioEl = undefined;
          return;
        }

        if (pub.source === Track.Source.ScreenShare) {
          entry.screenTrack = undefined;
        } else {
          entry.cameraTrack = undefined;
        }
        this.syncRemoteVideoStream(peerId, entry);
      }
    );

    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      if (this.destroyed) return;
      const speakerIds = new Set(speakers.map((s) => s.identity));
      const localSpeaking = speakerIds.has(this.localPeer.id);
      this.onSpeakingChangeCb("local", localSpeaking);
      for (const [peerId, entry] of this.remotePeers) {
        const speaking = speakerIds.has(peerId) && entry.targetGain > 0.05;
        if (entry.isSpeaking !== speaking) {
          entry.isSpeaking = speaking;
          this.onSpeakingChangeCb(peerId, speaking);
        }
      }
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (this.destroyed) return;
      const mapped: PeerLinkStatus =
        state === ConnectionState.Connected
          ? "relayed"
          : state === ConnectionState.Reconnecting || state === ConnectionState.SignalReconnecting
            ? "disconnected"
            : state === ConnectionState.Disconnected
              ? "failed"
              : "connecting";
      for (const peerId of this.remotePeers.keys()) {
        this.onPeerStateChangeCb(peerId, mapped);
      }
    });

    this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      if (this.destroyed || participant.isLocal) return;
      if (quality === ConnectionQuality.Lost) {
        this.onPeerStateChangeCb(participant.identity, "disconnected");
      } else {
        this.onPeerStateChangeCb(participant.identity, "relayed");
      }
    });

    this.room.on(RoomEvent.AudioPlaybackStatusChanged, (playing) => {
      if (!playing && !this.destroyed) {
        this.onAudioPlaybackBlockedCb?.();
      }
    });

    this.room.on(RoomEvent.DataReceived, (payload) => {
      if (this.destroyed) return;
      try {
        const parsed = JSON.parse(this.decoder.decode(payload)) as SignalMessage;
        if (parsed && parsed.type) {
          this.onMessageCb(parsed);
        }
      } catch {
        // Ignore malformed data packet
      }
    });

    const emitParticipantMedia = (participant: {
      isLocal?: boolean;
      identity: string;
      isMicrophoneEnabled: boolean;
      isCameraEnabled: boolean;
      isScreenShareEnabled: boolean;
      isSpeaking: boolean;
    }) => {
      if (this.destroyed || participant.isLocal) return;
      this.onMessageCb({
        type: "peer_media",
        id: participant.identity,
        media: {
          audio: participant.isMicrophoneEnabled,
          video: participant.isCameraEnabled,
          screen: participant.isScreenShareEnabled,
          speaking: participant.isSpeaking,
        },
      });
    };

    this.room.on(RoomEvent.TrackMuted, (_pub, participant) => {
      emitParticipantMedia(participant);
    });
    this.room.on(RoomEvent.TrackUnmuted, (_pub, participant) => {
      emitParticipantMedia(participant);
    });
  }

  private parseMetadata(raw?: string): { name?: string; avatarColor?: string } {
    if (!raw) return {};
    try {
      return JSON.parse(raw) as { name?: string; avatarColor?: string };
    } catch {
      return {};
    }
  }

  private ensureRemoteEntry(participant: RemoteParticipant): LiveKitRemotePeer {
    const existing = this.remotePeers.get(participant.identity);
    if (existing) return existing;
    const created: LiveKitRemotePeer = {
      participant,
      stream: new MediaStream(),
      isSpeaking: false,
      targetGain: 1.0,
    };
    this.remotePeers.set(participant.identity, created);
    return created;
  }

  private syncRemoteVideoStream(peerId: string, entry: LiveKitRemotePeer): void {
    const preferred = entry.screenTrack ?? entry.cameraTrack;
    for (const t of [...entry.stream.getVideoTracks()]) {
      entry.stream.removeTrack(t);
    }
    if (preferred?.mediaStreamTrack) {
      entry.stream.addTrack(preferred.mediaStreamTrack);
    }
    this.onRemoteStreamCb(peerId, entry.stream, entry.isSpeaking);
    this.onPeerStateChangeCb(peerId, "relayed");
  }

  public async connect(url: string, token: string): Promise<void> {
    await this.room.connect(url, token, { autoSubscribe: true });
    if (this.destroyed) return;
    await this.room.startAudio().catch(() => {});

    // Publish initial tracks captured in PreJoinLobby cleanly without re-prompting
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        if (track.readyState !== "ended") {
          const pub = await this.room.localParticipant.publishTrack(track, {
            source: Track.Source.Microphone,
          });
          this.publishedAudioTrack = pub.track ?? track;
          if (!track.enabled) await pub.mute().catch(() => {});
        }
      }
      for (const track of this.localStream.getVideoTracks()) {
        if (track.readyState !== "ended") {
          const pub = await this.room.localParticipant.publishTrack(track, {
            source: Track.Source.Camera,
          });
          this.publishedVideoTrack = pub.track ?? track;
          if (!track.enabled) await pub.mute().catch(() => {});
        }
      }
    }

    // Seed remote peers already connected before us
    for (const participant of this.room.remoteParticipants.values()) {
      const meta = this.parseMetadata(participant.metadata);
      this.onPeerStateChangeCb(participant.identity, "relayed");
      this.onMessageCb({
        type: "peer_join",
        peer: {
          id: participant.identity,
          name: participant.name || meta.name || "Teammate",
          avatarColor: meta.avatarColor || "#00A8FF",
          x: 7,
          y: 20,
          dir: "down",
          isMoving: false,
          zoneId: "reception",
          status: "Focusing",
          deskClaimed: null,
          media: {
            audio: participant.isMicrophoneEnabled,
            video: participant.isCameraEnabled,
            screen: participant.isScreenShareEnabled,
            speaking: participant.isSpeaking,
          },
          updatedAt: Date.now(),
        },
      });
    }

    this.broadcast({ type: "peer_join", peer: this.localPeer });
    this.emitLocalMediaChange();
  }

  private emitLocalMediaChange(): void {
    const stream = this.screenStream || this.localStream;
    const hasAudio = Boolean(
      this.localStream?.getAudioTracks().some((t) => t.readyState !== "ended" && t.enabled)
    );
    const hasVideo = Boolean(
      this.localStream?.getVideoTracks().some((t) => t.readyState !== "ended" && t.enabled)
    );
    this.onLocalMediaChangeCb({
      stream,
      status: {
        hasAudio,
        hasVideo,
        cameraError: this.cameraError,
        micError: this.micError,
        cameraFacing: this.cameraFacing,
      },
    });
  }

  public broadcast(msg: SignalMessage): void {
    if (this.destroyed || this.room.state !== ConnectionState.Connected) return;
    const encoded = this.encoder.encode(JSON.stringify(msg));
    const data = new Uint8Array(encoded);
    const reliable = msg.type !== "peer_move";
    void this.room.localParticipant.publishData(data, { reliable }).catch(() => {});
  }

  public updatePosition(
    x: number,
    y: number,
    dir: PeerState["dir"],
    isMoving: boolean,
    zoneId: string
  ): void {
    if (
      this.localPeer.x === x &&
      this.localPeer.y === y &&
      this.localPeer.dir === dir &&
      this.localPeer.isMoving === isMoving &&
      this.localPeer.zoneId === zoneId
    ) {
      return;
    }
    this.localPeer.x = x;
    this.localPeer.y = y;
    this.localPeer.dir = dir;
    this.localPeer.isMoving = isMoving;
    this.localPeer.zoneId = zoneId;
    this.localPeer.updatedAt = Date.now();
    this.broadcast({
      type: "peer_move",
      id: this.localPeer.id,
      x,
      y,
      dir,
      isMoving,
      zoneId,
    });
  }

  public updateMedia(media: Partial<PeerMediaState>): void {
    this.localPeer.media = { ...this.localPeer.media, ...media };
    this.broadcast({
      type: "peer_media",
      id: this.localPeer.id,
      media: this.localPeer.media,
    });
  }

  public updateStatus(
    status: string,
    deskClaimed?: string | null,
    name?: string,
    avatarColor?: string
  ): void {
    this.localPeer.status = status;
    if (deskClaimed !== undefined) this.localPeer.deskClaimed = deskClaimed;
    if (name !== undefined) this.localPeer.name = name;
    if (avatarColor !== undefined) this.localPeer.avatarColor = avatarColor;
    this.broadcast({
      type: "peer_status",
      id: this.localPeer.id,
      status,
      deskClaimed: this.localPeer.deskClaimed,
      name: this.localPeer.name,
      avatarColor: this.localPeer.avatarColor,
    });
  }

  public sendChat(text: string, zoneId?: string): void {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const msg: SignalMessage = {
      type: "chat",
      id: Math.random().toString(36).substring(2, 9),
      sender: this.localPeer.name,
      text,
      time,
      zoneId,
    };
    this.onMessageCb(msg);
    this.broadcast(msg);
  }

  public sendReaction(emoji: string, label: string, durationMs = 3800): void {
    const msg: SignalMessage = {
      type: "peer_reaction",
      id: this.localPeer.id,
      emoji,
      label,
      expiresAt: Date.now() + durationMs,
    };
    this.onMessageCb(msg);
    this.broadcast(msg);
  }

  public setAudioScope(scope: AudioScope): void {
    this.audioScope = scope;
  }

  public updateSpatialDistance(
    peerId: string,
    localX: number,
    localY: number,
    peerX: number,
    peerY: number,
    localZone: { id: string; isPrivate: boolean } | null,
    peerZone: { id: string; isPrivate: boolean } | null
  ): void {
    const entry = this.remotePeers.get(peerId);
    if (!entry) return;
    const dx = peerX - localX;
    const dy = peerY - localY;
    const dist = Math.hypot(dx, dy);
    const gain = computeSpatialGain({
      dist,
      isLocalPrivate: Boolean(localZone?.isPrivate),
      isPeerPrivate: Boolean(peerZone?.isPrivate),
      sameZone: Boolean(localZone && peerZone && localZone.id === peerZone.id),
      scope: this.audioScope,
    });
    entry.targetGain = gain;
    if (entry.audioEl) {
      entry.audioEl.volume = gain;
    }
  }

  public async resumeAudio(): Promise<boolean> {
    try {
      await this.room.startAudio();
      for (const entry of this.remotePeers.values()) {
        entry.audioEl?.play().catch(() => {});
      }
      return this.room.canPlaybackAudio;
    } catch {
      return false;
    }
  }

  public needsAudioUnlock(): boolean {
    return !this.destroyed && !this.room.canPlaybackAudio;
  }

  public async toggleAudioSmart(): Promise<boolean> {
    const pub = this.room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (pub) {
      if (pub.isMuted) {
        await pub.unmute();
        if (pub.track?.mediaStreamTrack) pub.track.mediaStreamTrack.enabled = true;
        this.isAudioMuted = false;
      } else {
        await pub.mute();
        if (pub.track?.mediaStreamTrack) pub.track.mediaStreamTrack.enabled = false;
        this.isAudioMuted = true;
      }
      this.emitLocalMediaChange();
      return !this.isAudioMuted;
    }

    try {
      const localTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      this.micError = null;
      const newPub = await this.room.localParticipant.publishTrack(localTrack, {
        source: Track.Source.Microphone,
      });
      this.publishedAudioTrack = newPub.track ?? localTrack;
      const existingVideo =
        this.localStream?.getVideoTracks().filter((t) => t.readyState !== "ended") ?? [];
      this.localStream = new MediaStream([localTrack.mediaStreamTrack, ...existingVideo]);
      this.isAudioMuted = false;
      this.emitLocalMediaChange();
      return true;
    } catch (err) {
      this.micError = err instanceof Error ? err.message : "Microphone unavailable.";
      this.isAudioMuted = true;
      this.emitLocalMediaChange();
      return false;
    }
  }

  public async toggleVideoSmart(): Promise<boolean> {
    const pub = this.room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub) {
      if (pub.isMuted) {
        await pub.unmute();
        if (pub.track?.mediaStreamTrack) pub.track.mediaStreamTrack.enabled = true;
        this.isVideoMuted = false;
      } else {
        await pub.mute();
        if (pub.track?.mediaStreamTrack) pub.track.mediaStreamTrack.enabled = false;
        this.isVideoMuted = true;
      }
      this.emitLocalMediaChange();
      return !this.isVideoMuted;
    }

    try {
      const localTrack = await createLocalVideoTrack({ facingMode: this.cameraFacing });
      this.cameraError = null;
      const newPub = await this.room.localParticipant.publishTrack(localTrack, {
        source: Track.Source.Camera,
      });
      this.publishedVideoTrack = newPub.track ?? localTrack;
      const existingAudio =
        this.localStream?.getAudioTracks().filter((t) => t.readyState !== "ended") ?? [];
      this.localStream = new MediaStream([...existingAudio, localTrack.mediaStreamTrack]);
      this.isVideoMuted = false;
      this.emitLocalMediaChange();
      return true;
    } catch (err) {
      this.cameraError = err instanceof Error ? err.message : "Camera unavailable.";
      this.isVideoMuted = true;
      this.emitLocalMediaChange();
      return false;
    }
  }

  public async switchCamera(): Promise<boolean> {
    const nextFacing = this.cameraFacing === "user" ? "environment" : "user";
    try {
      if (this.publishedVideoTrack) {
        await this.room.localParticipant.unpublishTrack(this.publishedVideoTrack, true);
        this.publishedVideoTrack = null;
      }
      const localTrack = await createLocalVideoTrack({ facingMode: nextFacing });
      this.cameraFacing = nextFacing;
      this.cameraError = null;
      const pub = await this.room.localParticipant.publishTrack(localTrack, {
        source: Track.Source.Camera,
      });
      this.publishedVideoTrack = pub.track ?? localTrack;
      const existingAudio =
        this.localStream?.getAudioTracks().filter((t) => t.readyState !== "ended") ?? [];
      this.localStream = new MediaStream([...existingAudio, localTrack.mediaStreamTrack]);
      this.isVideoMuted = false;
      this.emitLocalMediaChange();
      return true;
    } catch (err) {
      this.cameraError = err instanceof Error ? err.message : "Could not switch camera.";
      this.emitLocalMediaChange();
      return false;
    }
  }

  public async retryMissingMedia(): Promise<{
    stream: MediaStream | null;
    hasAudio: boolean;
    hasVideo: boolean;
  }> {
    if (this.isAudioMuted || !this.publishedAudioTrack) {
      await this.toggleAudioSmart();
    }
    if (this.isVideoMuted || !this.publishedVideoTrack) {
      await this.toggleVideoSmart();
    }
    return {
      stream: this.screenStream || this.localStream,
      hasAudio: !this.isAudioMuted,
      hasVideo: !this.isVideoMuted,
    };
  }

  public async toggleScreenShare(): Promise<boolean> {
    if (this.isScreenSharing) {
      if (this.publishedScreenTrack) {
        await this.room.localParticipant.unpublishTrack(this.publishedScreenTrack, true);
        this.publishedScreenTrack = null;
      }
      this.screenStream?.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
      this.isScreenSharing = false;
      this.emitLocalMediaChange();
      return false;
    }

    try {
      const tracks = await createLocalScreenTracks({ audio: false });
      const screenTrack = tracks.find((t) => t.kind === Track.Kind.Video);
      if (!screenTrack) return false;
      const pub = await this.room.localParticipant.publishTrack(screenTrack, {
        source: Track.Source.ScreenShare,
      });
      this.publishedScreenTrack = pub.track ?? screenTrack;
      this.screenStream = new MediaStream([screenTrack.mediaStreamTrack]);
      this.isScreenSharing = true;
      screenTrack.mediaStreamTrack.onended = () => {
        if (!this.destroyed && this.isScreenSharing) {
          void this.toggleScreenShare();
        }
      };
      this.emitLocalMediaChange();
      return true;
    } catch {
      return false;
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.screenStream || this.localStream;
  }

  public async getDiagnostics(): Promise<WebRTCDiagnosticsSnapshot> {
    const peers: PeerDiagnosticEntry[] = Array.from(this.room.remoteParticipants.values()).map(
      (p) => ({
        peerId: p.identity,
        role: "responder",
        iceConnectionState: String(this.room.state),
        connectionState: String(p.connectionQuality),
        signalingState: "livekit-sfu",
        iceGatheringState: "managed-turn",
        candidateTypes: ["SFU:LiveKit"],
        videoPacketsSent: this.publishedVideoTrack ? 1 : 0,
        videoPacketsReceived: p.videoTrackPublications.size,
        audioPacketsSent: this.publishedAudioTrack ? 1 : 0,
        audioPacketsReceived: p.audioTrackPublications.size,
      })
    );
    return {
      hasTurn: true,
      localAudioTracks: this.publishedAudioTrack ? 1 : 0,
      localVideoTracks: this.publishedVideoTrack || this.publishedScreenTrack ? 1 : 0,
      cameraError: this.cameraError,
      micError: this.micError,
      peers,
    };
  }

  public async forceReconnectPendingPeers(): Promise<void> {
    await this.room.startAudio().catch(() => {});
  }

  public destroy(): void {
    this.destroyed = true;
    for (const entry of this.remotePeers.values()) {
      entry.audioEl?.pause();
      entry.audioEl?.remove();
    }
    this.remotePeers.clear();
    void this.room.disconnect(true).catch(() => {});
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.screenStream = null;
  }
}
