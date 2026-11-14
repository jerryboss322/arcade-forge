// WebRTC P2P Office Mesh with Office-Wide & Spatial Proximity Audio + Soundproof Meeting Rooms
// Coordinates media capture fallbacks, deterministic initiator/perfect negotiation,
// ICE candidate buffering, WebRTC DataChannel bridge, Chromium RTP audio sink unlock, and stereo attenuation.

import { SpaceZone } from "./officeMap";

export type AudioScope = "office" | "proximity";

export interface SpatialGainInput {
  dist: number;
  isLocalPrivate: boolean;
  isPeerPrivate: boolean;
  sameZone: boolean;
  scope: AudioScope;
}

/**
 * Computes gain [0..1] for remote peer audio honoring soundproof rooms and open-office scope.
 */
export function computeSpatialGain({
  dist,
  isLocalPrivate,
  isPeerPrivate,
  sameZone,
  scope,
}: SpatialGainInput): number {
  if (isLocalPrivate || isPeerPrivate) {
    return sameZone && isLocalPrivate ? 1.0 : 0.0;
  }

  if (scope === "office") {
    // Everyone on the open office floor can clearly hear each other with gentle depth fade
    if (dist <= 8) return 1.0;
    return Math.max(0.45, Number((1.0 - (dist - 8) / 22).toFixed(3)));
  }

  // Strict proximity whisper mode
  if (dist <= 4) return 1.0;
  if (dist <= 8) return Math.max(0, 1.0 - (dist - 4) / 4);
  return 0.0;
}

export interface LocalMediaInitResult {
  stream: MediaStream | null;
  hasAudio: boolean;
  hasVideo: boolean;
}

export interface RemotePeerMedia {
  peerId: string;
  stream: MediaStream;
  audioGain: GainNode | null;
  panner: StereoPannerNode | null;
  analyser: AnalyserNode | null;
  sourceNode: MediaStreamAudioSourceNode | null;
  sinkAudio: HTMLAudioElement | null;
  targetGain: number;
  isSpeaking: boolean;
  distance: number;
  inSameZone: boolean;
}

interface PeerConnectionEntry {
  pc: RTCPeerConnection;
  pendingCandidates: RTCIceCandidateInit[];
  remoteStream: MediaStream | null;
  remoteMedia?: RemotePeerMedia;
  restartedIce?: boolean;
  makingOffer: boolean;
  initialSyncDone: boolean;
  role: "initiator" | "responder";
  readyPromise: Promise<void>;
  fallbackTimer?: ReturnType<typeof setTimeout>;
}

export function getIceServers(
  env: Record<string, string | undefined> = process.env
): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
  ];

  // Supports comma-separated TURN/STUN URLs. Use ONLY short-lived / temporary TURN credentials
  // in client-visible NEXT_PUBLIC_* variables; never expose permanent TURN API secrets here.
  const rawTurn = env.NEXT_PUBLIC_TURN_URLS || env.NEXT_PUBLIC_TURN_URL;
  if (!rawTurn) return servers;

  const parsedUrls = rawTurn
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  if (parsedUrls.length === 0) return servers;

  const turnUrls = parsedUrls.filter((u) => /^turns?:/i.test(u));
  const extraStunUrls = parsedUrls.filter((u) => /^stuns?:/i.test(u));

  if (extraStunUrls.length > 0) {
    servers.push({ urls: extraStunUrls.length === 1 ? extraStunUrls[0]! : extraStunUrls });
  }

  if (turnUrls.length > 0) {
    const turnServer: RTCIceServer = {
      urls: turnUrls.length === 1 ? turnUrls[0]! : turnUrls,
    };
    if (env.NEXT_PUBLIC_TURN_USERNAME) {
      turnServer.username = env.NEXT_PUBLIC_TURN_USERNAME;
    }
    if (env.NEXT_PUBLIC_TURN_CREDENTIAL) {
      turnServer.credential = env.NEXT_PUBLIC_TURN_CREDENTIAL;
    }
    servers.push(turnServer);
  }

  return servers;
}

export function hasTurnConfiguration(
  env: Record<string, string | undefined> = process.env
): boolean {
  const rawTurn = env.NEXT_PUBLIC_TURN_URLS || env.NEXT_PUBLIC_TURN_URL;
  if (!rawTurn) return false;
  return rawTurn
    .split(",")
    .some((u) => /^turns?:/i.test(u.trim()));
}

export class WebRTCMeshManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private localMediaPromise: Promise<LocalMediaInitResult> | null = null;
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private peers: Map<string, PeerConnectionEntry> = new Map();
  private sendSignalCb: (to: string, payload: any) => void;
  private onRemoteStreamCb: (peerId: string, stream: MediaStream, isSpeaking: boolean) => void;
  private onSpeakingChangeCb: (peerId: string, speaking: boolean) => void;
  private onDataChannelCb?: (peerId: string, channel: RTCDataChannel) => void;
  private localPeerId: string;
  private vadInterval: ReturnType<typeof setInterval> | null = null;
  private audioScope: AudioScope = "office";
  private destroyed = false;

  public isAudioMuted = true;
  public isVideoMuted = true;
  public isScreenSharing = false;

  constructor(
    sendSignal: (to: string, payload: any) => void,
    onRemoteStream: (peerId: string, stream: MediaStream, isSpeaking: boolean) => void,
    onSpeakingChange: (peerId: string, speaking: boolean) => void,
    localPeerId = "",
    onDataChannel?: (peerId: string, channel: RTCDataChannel) => void
  ) {
    this.sendSignalCb = sendSignal;
    this.onRemoteStreamCb = onRemoteStream;
    this.onSpeakingChangeCb = onSpeakingChange;
    this.localPeerId = localPeerId;
    this.onDataChannelCb = onDataChannel;

    if (typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  private devLog(event: string, detail?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[WebRTC]", event, detail ?? {});
    }
  }

  private warnLog(event: string, detail?: Record<string, unknown>): void {
    console.warn("[WebRTC]", event, detail ?? {});
  }

  public setAudioScope(scope: AudioScope): void {
    this.audioScope = scope;
  }

  public getAudioScope(): AudioScope {
    return this.audioScope;
  }

  /**
   * Unlocks browser AudioContext on user interaction and retries active HTMLAudioElement sinks.
   */
  public async resumeAudio(): Promise<boolean> {
    if (this.destroyed) return false;

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      try {
        await this.audioCtx.resume();
      } catch {
        return false;
      }
    }

    const ctxRunning = this.audioCtx?.state === "running";
    for (const entry of this.peers.values()) {
      const media = entry.remoteMedia;
      if (!media?.sinkAudio) continue;
      const useWebAudio = Boolean(ctxRunning && media.audioGain && media.sourceNode);
      media.sinkAudio.muted = useWebAudio;
      media.sinkAudio.volume = useWebAudio ? 0 : media.targetGain;
      media.sinkAudio.play().catch(() => {});
    }

    return ctxRunning;
  }

  /**
   * Captures microphone and webcam with independent fallbacks so a busy/missing webcam
   * never kills microphone audio or breaks receive-only participation.
   */
  public initLocalMedia(video = true, audio = true): Promise<LocalMediaInitResult> {
    this.localMediaPromise = this.acquireLocalMedia(video, audio);
    return this.localMediaPromise;
  }

  private async acquireLocalMedia(video: boolean, audio: boolean): Promise<LocalMediaInitResult> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      this.startVoiceActivityDetection();
      return { stream: null, hasAudio: false, hasVideo: false };
    }

    const videoConstraint = {
      width: { ideal: 320 },
      height: { ideal: 240 },
      frameRate: { max: 15 },
    };

    let combined: MediaStream | null = null;

    if (video && audio) {
      try {
        combined = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: true,
        });
      } catch {
        // Fall through to independent device probes
      }
    }

    if (!combined) {
      const tracks: MediaStreamTrack[] = [];
      if (audio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          tracks.push(...audioStream.getAudioTracks());
        } catch {
          // Mic blocked or absent
        }
      }
      if (video) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: false,
          });
          tracks.push(...videoStream.getVideoTracks());
        } catch {
          // Webcam locked by another tab or absent
        }
      }
      if (tracks.length > 0) {
        combined = new MediaStream(tracks);
      }
    }

    if (this.destroyed) {
      combined?.getTracks().forEach((t) => t.stop());
      return { stream: null, hasAudio: false, hasVideo: false };
    }

    this.localStream = combined;
    const hasAudio = Boolean(combined && combined.getAudioTracks().length > 0);
    const hasVideo = Boolean(combined && combined.getVideoTracks().length > 0);
    this.isAudioMuted = !hasAudio;
    this.isVideoMuted = !hasVideo;

    if (this.audioCtx && hasAudio && combined) {
      try {
        const source = this.audioCtx.createMediaStreamSource(combined);
        this.localAnalyser = this.audioCtx.createAnalyser();
        this.localAnalyser.fftSize = 256;
        source.connect(this.localAnalyser);
      } catch {
        // Safe fallback if AudioContext source fails
      }
    }

    this.startVoiceActivityDetection();
    await this.syncExistingPeersMedia();
    return { stream: combined, hasAudio, hasVideo };
  }

  private async syncExistingPeersMedia(): Promise<void> {
    if (!this.localStream && !this.screenStream) return;
    for (const [peerId, entry] of this.peers) {
      // Wait for connectToPeer's initial setup; responders must wait for the initiator's offer
      // before binding tracks so transceivers match negotiated mids cleanly.
      if (!entry.initialSyncDone) continue;
      if (entry.role === "responder" && !entry.pc.remoteDescription) continue;
      const changed = await this.syncTracksOnConnection(entry.pc);
      if (changed && entry.pc.signalingState === "stable") {
        await this.sendOffer(peerId, entry);
      }
    }
  }

  /**
   * Ensures both audio and video transceivers exist on pc, attaching real tracks when available
   * or recvonly transceivers otherwise so receive-only peers still receive remote feeds.
   */
  private async syncTracksOnConnection(pc: RTCPeerConnection): Promise<boolean> {
    const outboundStream = this.localStream || this.screenStream;
    let changed = false;

    for (const kind of ["audio", "video"] as const) {
      const track =
        kind === "video"
          ? this.screenStream?.getVideoTracks()[0] ?? this.localStream?.getVideoTracks()[0] ?? null
          : this.localStream?.getAudioTracks()[0] ?? null;

      const matchingTransceivers = pc
        .getTransceivers()
        .filter(
          (t) =>
            t.currentDirection !== "stopped" &&
            (t.sender.track?.kind === kind || t.receiver.track?.kind === kind)
        );
      // Prefer a transceiver already bound to a negotiated m-line mid over an unassociated one
      const existing =
        matchingTransceivers.find((t) => t.mid !== null) ?? matchingTransceivers[0];

      if (track) {
        if (existing) {
          if (existing.sender.track !== track) {
            await existing.sender.replaceTrack(track).catch(() => {});
          }
          if (existing.direction === "recvonly" || existing.direction === "inactive") {
            existing.direction = "sendrecv";
            changed = true;
          }
        } else if (outboundStream) {
          pc.addTrack(track, outboundStream);
          changed = true;
        }
      } else if (!existing) {
        pc.addTransceiver(kind, { direction: "recvonly" });
        changed = true;
      }
    }

    return changed;
  }

  public getLocalStream(): MediaStream | null {
    return this.screenStream || this.localStream;
  }

  public toggleAudio(): boolean {
    void this.resumeAudio();
    const track = this.localStream?.getAudioTracks()[0];
    if (!track) {
      this.isAudioMuted = true;
      return false;
    }
    track.enabled = !track.enabled;
    this.isAudioMuted = !track.enabled;
    return !this.isAudioMuted;
  }

  public toggleVideo(): boolean {
    void this.resumeAudio();
    const track = this.localStream?.getVideoTracks()[0];
    if (!track) {
      this.isVideoMuted = true;
      return false;
    }
    track.enabled = !track.enabled;
    this.isVideoMuted = !track.enabled;
    return !this.isVideoMuted;
  }

  public async toggleScreenShare(): Promise<boolean> {
    void this.resumeAudio();
    const getLiveCameraTrack = () =>
      this.localStream?.getVideoTracks().find((t) => t.readyState === "live") ?? null;

    if (this.isScreenSharing) {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach((t) => t.stop());
        this.screenStream = null;
      }
      this.isScreenSharing = false;
      await this.replaceVideoTrackInAllPeers(getLiveCameraTrack());
      return false;
    }

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) return false;
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { max: 15 } },
        audio: false,
      });

      this.isScreenSharing = true;
      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (screenTrack) {
        screenTrack.onended = () => {
          this.isScreenSharing = false;
          this.screenStream = null;
          void this.replaceVideoTrackInAllPeers(getLiveCameraTrack());
        };
      }

      await this.replaceVideoTrackInAllPeers(screenTrack ?? null);
      return true;
    } catch (err) {
      this.warnLog("screen_share_failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  private async replaceVideoTrackInAllPeers(newVideoTrack: MediaStreamTrack | null): Promise<void> {
    const outboundStream = this.localStream || this.screenStream;
    for (const [peerId, entry] of this.peers) {
      await entry.readyPromise;
      if (this.destroyed || this.peers.get(peerId) !== entry) continue;

      const { pc } = entry;
      // Wait for remote description on passive responders before adding/modifying negotiated transceivers
      if (entry.role === "responder" && !pc.remoteDescription) continue;

      const matching = pc
        .getTransceivers()
        .filter(
          (t) =>
            t.currentDirection !== "stopped" &&
            (t.sender.track?.kind === "video" || t.receiver.track?.kind === "video")
        );
      const videoTransceiver = matching.find((t) => t.mid !== null) ?? matching[0];

      let needsOffer = false;
      if (videoTransceiver) {
        await videoTransceiver.sender.replaceTrack(newVideoTrack).catch((err) => {
          this.warnLog("replace_video_track_failed", {
            peerId,
            error: err instanceof Error ? err.message : String(err),
          });
        });
        if (
          newVideoTrack &&
          (videoTransceiver.direction === "recvonly" || videoTransceiver.direction === "inactive")
        ) {
          videoTransceiver.direction = "sendrecv";
          needsOffer = true;
        }
      } else if (newVideoTrack && outboundStream) {
        pc.addTrack(newVideoTrack, outboundStream);
        needsOffer = true;
      }

      if (needsOffer && pc.signalingState === "stable") {
        await this.sendOffer(peerId, entry);
      }
    }
  }

  private async sendOffer(peerId: string, entry: PeerConnectionEntry): Promise<void> {
    if (this.destroyed || this.peers.get(peerId) !== entry) return;
    if (entry.makingOffer) return;
    entry.makingOffer = true;
    try {
      const offer = await entry.pc.createOffer();
      if (entry.pc.signalingState !== "stable") return;
      await entry.pc.setLocalDescription(offer);
      this.sendSignalCb(peerId, { sdp: entry.pc.localDescription });
    } catch (err) {
      this.warnLog("sdp_offer_failed", {
        peerId,
        signalingState: entry.pc.signalingState,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      entry.makingOffer = false;
    }
  }

  /**
   * Connects to a coworker in the same office. Registers pc synchronously so concurrent
   * incoming offers/candidates reuse the same PeerConnection after local media is ready.
   */
  public async connectToPeer(peerId: string, initiator: boolean): Promise<void> {
    if (this.destroyed || this.peers.has(peerId)) return;

    const iceServers = getIceServers();
    const hasTurn = hasTurnConfiguration();
    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 2,
    });

    this.devLog("peer_connection_created", {
      peerId,
      role: initiator ? "initiator" : "responder",
      iceServersCount: iceServers.length,
      hasTurn,
    });

    let resolveReady!: () => void;
    const readyPromise = new Promise<void>((res) => {
      resolveReady = res;
    });

    const entry: PeerConnectionEntry = {
      pc,
      pendingCandidates: [],
      remoteStream: null,
      makingOffer: false,
      initialSyncDone: false,
      role: initiator ? "initiator" : "responder",
      readyPromise,
    };
    this.peers.set(peerId, entry);

    if (initiator) {
      try {
        const dc = pc.createDataChannel("forgespace", { ordered: true });
        this.onDataChannelCb?.(peerId, dc);
      } catch {
        // Non-fatal if DataChannel creation unavailable
      }
    } else {
      pc.ondatachannel = (event) => {
        if (event.channel) {
          this.onDataChannelCb?.(peerId, event.channel);
        }
      };
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalCb(peerId, { candidate: event.candidate.toJSON() });
      }
    };

    pc.onicegatheringstatechange = () => {
      this.devLog("ice_gathering_state", {
        peerId,
        state: pc.iceGatheringState,
      });
    };

    const triggerIceRecovery = (source: "connection" | "ice") => {
      if (this.destroyed || this.peers.get(peerId) !== entry) return;
      const state = source === "connection" ? pc.connectionState : pc.iceConnectionState;
      this.devLog(
        source === "connection" ? "connection_state" : "ice_connection_state",
        { peerId, state }
      );

      if (pc.connectionState === "failed" || pc.iceConnectionState === "failed") {
        this.warnLog("ice_connection_failed", {
          peerId,
          connectionState: pc.connectionState,
          iceConnectionState: pc.iceConnectionState,
          hasTurn,
        });
        if (!entry.restartedIce) {
          entry.restartedIce = true;
          pc.restartIce?.();
          if (pc.signalingState === "stable") {
            void this.sendOffer(peerId, entry);
          }
        }
      }
    };
    pc.onconnectionstatechange = () => triggerIceRecovery("connection");
    pc.oniceconnectionstatechange = () => triggerIceRecovery("ice");

    pc.ontrack = (event) => {
      this.devLog(
        event.track.kind === "audio" ? "remote_audio_track" : "remote_video_track",
        {
          peerId,
          kind: event.track.kind,
          readyState: event.track.readyState,
          muted: event.track.muted,
        }
      );

      let combinedStream = entry.remoteStream;
      if (!combinedStream) {
        combinedStream = event.streams[0] || new MediaStream();
        entry.remoteStream = combinedStream;
      }
      if (!combinedStream.getTracks().some((t) => t.id === event.track.id)) {
        combinedStream.addTrack(event.track);
      }

      if (event.track.kind === "audio" && !entry.remoteMedia) {
        this.setupSpatialAudio(peerId, combinedStream);
      }

      const emitStream = () => {
        if (this.destroyed || this.peers.get(peerId) !== entry || !entry.remoteStream) return;
        this.onRemoteStreamCb(
          peerId,
          new MediaStream(entry.remoteStream.getTracks()),
          Boolean(entry.remoteMedia?.isSpeaking)
        );
      };

      // Re-emit whenever track unmutes, mutes, or ends so UI switches live video cleanly
      event.track.onunmute = emitStream;
      event.track.onmute = emitStream;
      event.track.onended = emitStream;
      emitStream();
    };

    try {
      if (this.localMediaPromise) {
        await this.localMediaPromise.catch(() => null);
      }
      if (this.destroyed || this.peers.get(peerId) !== entry) {
        return;
      }
      entry.initialSyncDone = true;
      // Only attach pre-offer transceivers when initiating; responders bind tracks
      // directly onto the offer's negotiated m-lines inside handleSignal().
      if (initiator) {
        await this.syncTracksOnConnection(pc);
      }
    } finally {
      resolveReady();
    }

    if (initiator) {
      await this.sendOffer(peerId, entry);
    } else {
      // Passive peer backup timer in case initiator's join/offer crossed paths
      entry.fallbackTimer = setTimeout(() => {
        if (
          !this.destroyed &&
          this.peers.get(peerId) === entry &&
          !pc.remoteDescription &&
          pc.signalingState === "stable"
        ) {
          entry.role = "initiator";
          void this.syncTracksOnConnection(pc).then(() => this.sendOffer(peerId, entry));
        }
      }, 2800);
    }
  }

  public async handleSignal(fromPeerId: string, signal: any): Promise<void> {
    if (this.destroyed) return;
    if (!this.peers.has(fromPeerId)) {
      await this.connectToPeer(fromPeerId, false);
    }

    const peerObj = this.peers.get(fromPeerId);
    if (!peerObj) return;

    await peerObj.readyPromise;
    if (this.destroyed || this.peers.get(fromPeerId) !== peerObj) return;

    const { pc } = peerObj;

    try {
      if (signal.sdp) {
        if (peerObj.fallbackTimer) {
          clearTimeout(peerObj.fallbackTimer);
          peerObj.fallbackTimer = undefined;
        }

        const isOffer = signal.sdp.type === "offer";
        const polite = this.localPeerId > fromPeerId;
        const offerCollision =
          isOffer && (peerObj.makingOffer || pc.signalingState !== "stable");

        if (offerCollision && !polite) {
          return;
        }

        if (offerCollision && polite) {
          await pc.setLocalDescription({ type: "rollback" });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        if (peerObj.pendingCandidates.length > 0) {
          const buffered = peerObj.pendingCandidates.splice(0);
          for (const candidateInit of buffered) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateInit)).catch((err) => {
              this.warnLog("ice_candidate_buffered_failed", {
                peerId: fromPeerId,
                error: err instanceof Error ? err.message : String(err),
              });
            });
          }
        }

        if (isOffer) {
          await this.syncTracksOnConnection(pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendSignalCb(fromPeerId, { sdp: pc.localDescription });
        }
      } else if (signal.candidate) {
        if (!pc.remoteDescription) {
          peerObj.pendingCandidates.push(signal.candidate);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch((err) => {
            this.warnLog("ice_candidate_failed", {
              peerId: fromPeerId,
              error: err instanceof Error ? err.message : String(err),
            });
          });
        }
      }
    } catch (err) {
      this.warnLog("sdp_signal_failed", {
        peerId: fromPeerId,
        signalType: signal?.sdp?.type ?? (signal?.candidate ? "candidate" : "unknown"),
        signalingState: pc.signalingState,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Builds Web Audio routing plus an HTMLAudioElement sink so Chrome/Safari/Firefox play RTP audio.
   */
  private setupSpatialAudio(peerId: string, remoteStream: MediaStream): void {
    if (remoteStream.getAudioTracks().length === 0) return;
    const peerObj = this.peers.get(peerId);
    if (!peerObj) return;

    let sourceNode: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    let gainNode: GainNode | null = null;
    let panner: StereoPannerNode | null = null;

    if (this.audioCtx) {
      try {
        sourceNode = this.audioCtx.createMediaStreamSource(remoteStream);
        gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 1.0;

        if (this.audioCtx.createStereoPanner) {
          panner = this.audioCtx.createStereoPanner();
          panner.pan.value = 0;
        }

        analyser = this.audioCtx.createAnalyser();
        analyser.fftSize = 256;

        // Audio route: Source -> Analyser -> Gain -> Panner -> Destination
        sourceNode.connect(analyser);
        analyser.connect(gainNode);

        if (panner) {
          gainNode.connect(panner);
          panner.connect(this.audioCtx.destination);
        } else {
          gainNode.connect(this.audioCtx.destination);
        }
      } catch (err) {
        console.warn("Spatial audio setup warning:", err);
      }
    }

    const useWebAudio = Boolean(this.audioCtx?.state === "running" && gainNode && sourceNode);
    let sinkAudio: HTMLAudioElement | null = null;

    if (typeof Audio !== "undefined") {
      sinkAudio = new Audio();
      sinkAudio.srcObject = remoteStream;
      sinkAudio.autoplay = true;
      sinkAudio.setAttribute("playsinline", "true");
      sinkAudio.muted = useWebAudio;
      sinkAudio.volume = useWebAudio ? 0 : 1.0;
      sinkAudio.play().catch(() => {});
    }

    peerObj.remoteMedia = {
      peerId,
      stream: remoteStream,
      audioGain: gainNode,
      panner,
      analyser,
      sourceNode,
      sinkAudio,
      targetGain: 1.0,
      isSpeaking: false,
      distance: 0,
      inSameZone: false,
    };
  }

  /**
   * Recalculates audio attenuation and stereo panning based on avatar distance & soundproof rooms.
   */
  public updateSpatialDistance(
    peerId: string,
    localX: number,
    localY: number,
    peerX: number,
    peerY: number,
    localZone: SpaceZone | null,
    peerZone: SpaceZone | null
  ): void {
    const peerObj = this.peers.get(peerId);
    if (!peerObj || !peerObj.remoteMedia) return;

    const media = peerObj.remoteMedia;
    const dx = peerX - localX;
    const dy = peerY - localY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    media.distance = dist;

    const isLocalPrivate = localZone?.isPrivate ?? false;
    const isPeerPrivate = peerZone?.isPrivate ?? false;
    const sameZone = localZone?.id === peerZone?.id;
    media.inSameZone = sameZone;

    const targetGain = computeSpatialGain({
      dist,
      isLocalPrivate,
      isPeerPrivate,
      sameZone,
      scope: this.audioScope,
    });
    media.targetGain = targetGain;

    if (media.audioGain && this.audioCtx) {
      media.audioGain.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.05);
    }

    if (media.sinkAudio) {
      const useWebAudio = Boolean(this.audioCtx?.state === "running" && media.audioGain && media.sourceNode);
      media.sinkAudio.muted = useWebAudio;
      media.sinkAudio.volume = useWebAudio ? 0 : targetGain;
    }

    // Stereo Panning
    if (media.panner && this.audioCtx) {
      const pan = Math.max(-1, Math.min(1, dx / 8));
      media.panner.pan.setTargetAtTime(pan, this.audioCtx.currentTime, 0.05);
    }
  }

  /**
   * Voice Activity Detection (VAD) loop.
   */
  private startVoiceActivityDetection(): void {
    if (this.vadInterval) clearInterval(this.vadInterval);
    const dataArray = new Uint8Array(128);

    this.vadInterval = setInterval(() => {
      if (this.localAnalyser && !this.isAudioMuted) {
        this.localAnalyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] ?? 0;
        const avg = sum / dataArray.length;
        const speaking = avg > 18;
        this.onSpeakingChangeCb("local", speaking);
      } else {
        this.onSpeakingChangeCb("local", false);
      }

      for (const [peerId, peerObj] of this.peers) {
        if (peerObj.remoteMedia?.analyser) {
          peerObj.remoteMedia.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] ?? 0;
          const avg = sum / dataArray.length;
          const audible = (peerObj.remoteMedia.targetGain || 0) > 0.05;
          const speaking = avg > 18 && audible;

          if (peerObj.remoteMedia.isSpeaking !== speaking) {
            peerObj.remoteMedia.isSpeaking = speaking;
            this.onSpeakingChangeCb(peerId, speaking);
          }
        }
      }
    }, 120);
  }

  private teardownPeerMedia(media?: RemotePeerMedia): void {
    if (!media) return;
    if (media.sinkAudio) {
      media.sinkAudio.pause();
      media.sinkAudio.srcObject = null;
    }
    try {
      media.sourceNode?.disconnect();
      media.analyser?.disconnect();
      media.audioGain?.disconnect();
      media.panner?.disconnect();
    } catch {
      // Safe disconnect
    }
  }

  public disconnectPeer(peerId: string): void {
    const peerObj = this.peers.get(peerId);
    if (peerObj) {
      if (peerObj.fallbackTimer) clearTimeout(peerObj.fallbackTimer);
      this.teardownPeerMedia(peerObj.remoteMedia);
      peerObj.pc.close();
      this.peers.delete(peerId);
    }
  }

  public destroy(): void {
    this.destroyed = true;
    if (this.vadInterval) clearInterval(this.vadInterval);
    for (const [, peerObj] of this.peers) {
      if (peerObj.fallbackTimer) clearTimeout(peerObj.fallbackTimer);
      this.teardownPeerMedia(peerObj.remoteMedia);
      peerObj.pc.close();
    }
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((t) => t.stop());
      this.screenStream = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
