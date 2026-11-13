// WebRTC P2P Proximity Mesh with Spatial Audio and Soundproof Meeting Rooms
// $0 Infrastructure Overhead: Direct peer-to-peer media over free Google STUN.
// Spatial audio with Web Audio API GainNode and StereoPannerNode.

import { SpaceZone } from "./officeMap";

export interface RemotePeerMedia {
  peerId: string;
  stream: MediaStream;
  audioGain: GainNode | null;
  panner: StereoPannerNode | null;
  analyser: AnalyserNode | null;
  isSpeaking: boolean;
  distance: number;
  inSameZone: boolean;
}

export class WebRTCMeshManager {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private peers: Map<string, { pc: RTCPeerConnection; remoteMedia?: RemotePeerMedia }> = new Map();
  private sendSignalCb: (to: string, payload: any) => void;
  private onRemoteStreamCb: (peerId: string, stream: MediaStream, isSpeaking: boolean) => void;
  private onSpeakingChangeCb: (peerId: string, speaking: boolean) => void;
  private localPeerId: string;
  private vadInterval: any = null;

  public isAudioMuted: boolean = false;
  public isVideoMuted: boolean = false;
  public isScreenSharing: boolean = false;

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
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
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
          await this.audioCtx.resume();
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
      // Create silent / blank dummy stream fallback so P2P mesh still functions
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
   * Connect to a newly detected peer in proximity.
   */
  public async connectToPeer(peerId: string, initiator: boolean): Promise<void> {
    if (this.peers.has(peerId)) return;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    const activeStream = this.screenStream || this.localStream;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalCb(peerId, { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0] || new MediaStream([event.track]);
      this.setupSpatialAudio(peerId, remoteStream);
      this.onRemoteStreamCb(peerId, remoteStream, false);
    };

    this.peers.set(peerId, { pc });

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
        if (signal.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this.sendSignalCb(fromPeerId, { sdp: pc.localDescription });
        }
      } else if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.warn("Signal error:", err);
    }
  }

  /**
   * Builds Web Audio routing for spatial attenuation and stereo panning.
   */
  private setupSpatialAudio(peerId: string, remoteStream: MediaStream): void {
    if (!this.audioCtx || remoteStream.getAudioTracks().length === 0) return;

    try {
      const source = this.audioCtx.createMediaStreamSource(remoteStream);
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.value = 1.0;

      let panner: StereoPannerNode | null = null;
      if (this.audioCtx.createStereoPanner) {
        panner = this.audioCtx.createStereoPanner();
        panner.pan.value = 0;
      }

      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;

      // Audio route: Source -> Analyser -> Gain -> Panner -> Destination
      source.connect(analyser);
      analyser.connect(gainNode);

      if (panner) {
        gainNode.connect(panner);
        panner.connect(this.audioCtx.destination);
      } else {
        gainNode.connect(this.audioCtx.destination);
      }

      const peerObj = this.peers.get(peerId);
      if (peerObj) {
        peerObj.remoteMedia = {
          peerId,
          stream: remoteStream,
          audioGain: gainNode,
          panner,
          analyser,
          isSpeaking: false,
          distance: 0,
          inSameZone: false,
        };
      }
    } catch (err) {
      console.warn("Spatial audio setup failed:", err);
    }
  }

  /**
   * Recalculates audio attenuation and stereo panning based on avatar distance.
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

    // Check private zone audio isolation
    const isLocalPrivate = localZone?.isPrivate ?? false;
    const isPeerPrivate = peerZone?.isPrivate ?? false;
    const sameZone = localZone?.id === peerZone?.id;
    media.inSameZone = sameZone;

    if (media.audioGain) {
      if (isLocalPrivate || isPeerPrivate) {
        // Soundproof meeting room: Only hear if in the exact same room
        if (sameZone && isLocalPrivate) {
          media.audioGain.gain.setTargetAtTime(1.0, this.audioCtx?.currentTime || 0, 0.05);
        } else {
          // Soundproof wall: completely muted
          media.audioGain.gain.setTargetAtTime(0.0, this.audioCtx?.currentTime || 0, 0.05);
        }
      } else {
        // Open floor spatial attenuation:
        // <= 4 tiles: 100% volume
        // 4..8 tiles: linear fade to 0%
        // > 8 tiles: 0% volume
        if (dist <= 4) {
          media.audioGain.gain.setTargetAtTime(1.0, this.audioCtx?.currentTime || 0, 0.05);
        } else if (dist <= 8) {
          const vol = Math.max(0, 1.0 - (dist - 4) / 4);
          media.audioGain.gain.setTargetAtTime(vol, this.audioCtx?.currentTime || 0, 0.05);
        } else {
          media.audioGain.gain.setTargetAtTime(0.0, this.audioCtx?.currentTime || 0, 0.05);
        }
      }
    }

    // Stereo Panning
    if (media.panner && this.audioCtx) {
      const pan = Math.max(-1, Math.min(1, dx / 6));
      media.panner.pan.setTargetAtTime(pan, this.audioCtx.currentTime, 0.05);
    }
  }

  /**
   * Voice Activity Detection (VAD) loop.
   */
  private startVoiceActivityDetection(): void {
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
      }

      // 2. Check remote peers
      for (const [peerId, peerObj] of this.peers) {
        if (peerObj.remoteMedia?.analyser) {
          peerObj.remoteMedia.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] ?? 0;
          const avg = sum / dataArray.length;
          const speaking = avg > 18 && (peerObj.remoteMedia.audioGain?.gain.value || 0) > 0.05;

          if (peerObj.remoteMedia.isSpeaking !== speaking) {
            peerObj.remoteMedia.isSpeaking = speaking;
            this.onSpeakingChangeCb(peerId, speaking);
          }
        }
      }
    }, 120);
  }

  public disconnectPeer(peerId: string): void {
    const peerObj = this.peers.get(peerId);
    if (peerObj) {
      peerObj.pc.close();
      this.peers.delete(peerId);
    }
  }

  public destroy(): void {
    if (this.vadInterval) clearInterval(this.vadInterval);
    for (const [, { pc }] of this.peers) {
      pc.close();
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
