// WebRTC P2P Office Mesh with Office-Wide & Spatial Proximity Audio + Soundproof Meeting Rooms
// Direct peer-to-peer media over STUN with ICE candidate buffering, late track attachment,
// Chromium RTP audio sink unlock, and Web Audio stereo spatial attenuation.

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
}

export class WebRTCMeshManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private peers: Map<string, PeerConnectionEntry> = new Map();
  private sendSignalCb: (to: string, payload: any) => void;
  private onRemoteStreamCb: (peerId: string, stream: MediaStream, isSpeaking: boolean) => void;
  private onSpeakingChangeCb: (peerId: string, speaking: boolean) => void;
  private localPeerId: string;
  private vadInterval: ReturnType<typeof setInterval> | null = null;
  private audioScope: AudioScope = "office";

  public isAudioMuted = false;
  public isVideoMuted = false;
  public isScreenSharing = false;

  constructor(
    sendSignal: (to: string, payload: any) => void,
    onRemoteStream: (peerId: string, stream: MediaStream, isSpeaking: boolean) => void,
    onSpeakingChange: (peerId: string, speaking: boolean) => void,
    localPeerId = ""
  ) {
    this.sendSignalCb = sendSignal;
    this.onRemoteStreamCb = onRemoteStream;
    this.onSpeakingChangeCb = onSpeakingChange;
    this.localPeerId = localPeerId;

    if (typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  public setAudioScope(scope: AudioScope): void {
    this.audioScope = scope;
  }

  public getAudioScope(): AudioScope {
    return this.audioScope;
  }

  /**
   * Unlocks browser AudioContext on user interaction and switches active sinks cleanly.
   */
  public async resumeAudio(): Promise<boolean> {
    if (!this.audioCtx) return false;
    if (this.audioCtx.state === "suspended") {
      try {
        await this.audioCtx.resume();
      } catch {
        return false;
      }
    }

    const ctxRunning = this.audioCtx.state === "running";
    for (const entry of this.peers.values()) {
      const media = entry.remoteMedia;
      if (!media?.sinkAudio) continue;
      // Keep muted sink element playing so Chromium continues decoding WebRTC RTP audio
      media.sinkAudio.muted = ctxRunning;
      media.sinkAudio.volume = ctxRunning ? 0 : media.targetGain;
      media.sinkAudio.play().catch(() => {});
    }
    return ctxRunning;
  }

  /**
   * Initializes local microphone and webcam.
   */
  public async initLocalMedia(video = true, audio = true): Promise<MediaStream | null> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) {
      return null;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { max: 15 } } : false,
        audio: audio,
      });

      if (this.audioCtx && this.localStream.getAudioTracks().length > 0) {
        if (this.audioCtx.state === "suspended") {
          this.audioCtx.resume().catch(() => {});
        }
        const source = this.audioCtx.createMediaStreamSource(this.localStream);
        this.localAnalyser = this.audioCtx.createAnalyser();
        this.localAnalyser.fftSize = 256;
        source.connect(this.localAnalyser);
      }

      this.startVoiceActivityDetection();
      await this.attachLocalStreamToPeers();
      return this.localStream;
    } catch (err) {
      console.warn("Could not capture webcam/microphone:", err);
      const fallback = this.createDummyStream();
      await this.attachLocalStreamToPeers();
      return fallback;
    }
  }

  /**
   * Attaches local media tracks to peers that connected before getUserMedia resolved.
   */
  private async attachLocalStreamToPeers(): Promise<void> {
    const activeStream = this.screenStream || this.localStream;
    if (!activeStream) return;

    for (const [peerId, { pc }] of this.peers) {
      if (pc.getSenders().length === 0) {
        activeStream.getTracks().forEach((track) => {
          pc.addTrack(track, activeStream);
        });
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          this.sendSignalCb(peerId, { sdp: pc.localDescription });
        } catch (err) {
          console.warn("Error renegotiating local tracks:", err);
        }
      }
    }
  }

  private createDummyStream(): MediaStream | null {
    if (typeof document === "undefined") return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#1E2238";
        ctx.fillRect(0, 0, 16, 16);
      }
      this.localStream = canvas.captureStream(1);
      return this.localStream;
    } catch {
      return null;
    }
  }

  public getLocalStream(): MediaStream | null {
    return this.screenStream || this.localStream;
  }

  public toggleAudio(): boolean {
    void this.resumeAudio();
    if (!this.localStream) return false;
    const track = this.localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      this.isAudioMuted = !track.enabled;
    } else {
      this.isAudioMuted = !this.isAudioMuted;
    }
    return !this.isAudioMuted;
  }

  public toggleVideo(): boolean {
    void this.resumeAudio();
    if (!this.localStream) return false;
    const track = this.localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      this.isVideoMuted = !track.enabled;
    } else {
      this.isVideoMuted = !this.isVideoMuted;
    }
    return !this.isVideoMuted;
  }

  public async toggleScreenShare(): Promise<boolean> {
    void this.resumeAudio();
    if (this.isScreenSharing) {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach((t) => t.stop());
        this.screenStream = null;
      }
      this.isScreenSharing = false;
      this.replaceTracksInAllPeers(this.localStream);
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
          this.replaceTracksInAllPeers(this.localStream);
        };
      }

      this.replaceTracksInAllPeers(this.screenStream);
      return true;
    } catch {
      return false;
    }
  }

  private replaceTracksInAllPeers(newStream: MediaStream | null): void {
    if (!newStream) return;
    const newVideoTrack = newStream.getVideoTracks()[0];
    if (!newVideoTrack) return;

    for (const [, { pc }] of this.peers) {
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === "video");
      if (videoSender) {
        videoSender.replaceTrack(newVideoTrack).catch(() => {});
      }
    }
  }

  /**
   * Connect to a coworker in the same office.
   */
  public async connectToPeer(peerId: string, initiator: boolean): Promise<void> {
    if (this.peers.has(peerId)) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    const entry: PeerConnectionEntry = {
      pc,
      pendingCandidates: [],
      remoteStream: null,
    };
    this.peers.set(peerId, entry);

    const activeStream = this.screenStream || this.localStream;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalCb(peerId, { candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" && !entry.restartedIce) {
        entry.restartedIce = true;
        pc.restartIce?.();
      }
    };

    pc.ontrack = (event) => {
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

      // Emit a fresh MediaStream clone reference so React video elements always bind new tracks
      this.onRemoteStreamCb(peerId, new MediaStream(combinedStream.getTracks()), false);
    };

    if (initiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.sendSignalCb(peerId, { sdp: pc.localDescription });
      } catch (err) {
        console.warn("Error creating WebRTC offer:", err);
      }
    }
  }

  public async handleSignal(fromPeerId: string, signal: any): Promise<void> {
    if (!this.peers.has(fromPeerId)) {
      await this.connectToPeer(fromPeerId, false);
    }

    const peerObj = this.peers.get(fromPeerId);
    if (!peerObj) return;
    const { pc } = peerObj;

    try {
      if (signal.sdp) {
        // Polite peer rollback when both peers initiate WebRTC offers simultaneously
        if (signal.sdp.type === "offer" && pc.signalingState !== "stable") {
          const isPolite = this.localPeerId > fromPeerId;
          if (!isPolite) {
            return;
          }
          await pc.setLocalDescription({ type: "rollback" });
        }

        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

        // Flush any ICE candidates that arrived before remote description was set
        if (peerObj.pendingCandidates.length > 0) {
          const buffered = peerObj.pendingCandidates.splice(0);
          for (const candidateInit of buffered) {
            await pc.addIceCandidate(new RTCIceCandidate(candidateInit)).catch(() => {});
          }
        }

        if (signal.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendSignalCb(fromPeerId, { sdp: pc.localDescription });
        }
      } else if (signal.candidate) {
        if (!pc.remoteDescription) {
          peerObj.pendingCandidates.push(signal.candidate);
        } else {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    } catch (err) {
      console.warn("Signal error:", err);
    }
  }

  /**
   * Builds Web Audio routing plus a hidden audio element so Chrome/Safari always play RTP audio.
   */
  private setupSpatialAudio(peerId: string, remoteStream: MediaStream): void {
    if (remoteStream.getAudioTracks().length === 0) return;
    const peerObj = this.peers.get(peerId);
    if (!peerObj) return;

    const ctxRunning = this.audioCtx?.state === "running";
    let sinkAudio: HTMLAudioElement | null = null;

    if (typeof Audio !== "undefined") {
      sinkAudio = new Audio();
      sinkAudio.srcObject = remoteStream;
      sinkAudio.autoplay = true;
      sinkAudio.muted = ctxRunning;
      sinkAudio.volume = ctxRunning ? 0 : 1.0;
      sinkAudio.play().catch(() => {});
    }

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
      const ctxRunning = this.audioCtx?.state === "running";
      media.sinkAudio.muted = ctxRunning;
      media.sinkAudio.volume = ctxRunning ? 0 : targetGain;
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
      // 1. Check local microphone
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

      // 2. Check remote peers
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
      this.teardownPeerMedia(peerObj.remoteMedia);
      peerObj.pc.close();
      this.peers.delete(peerId);
    }
  }

  public destroy(): void {
    if (this.vadInterval) clearInterval(this.vadInterval);
    for (const [, peerObj] of this.peers) {
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
