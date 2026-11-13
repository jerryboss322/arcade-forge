// Lightweight Zero-Cost Peer Signaling & Coordination Engine
// Uses BroadcastChannel for instant local multi-tab sync + throttled Edge API polling fallback.
// Transports (x, y) coordinates, avatar status, and WebRTC SDP offers/answers with incremental cursors.

export interface PeerMediaState {
  audio: boolean;
  video: boolean;
  screen: boolean;
  speaking: boolean;
}

export interface PeerState {
  id: string;
  name: string;
  avatarColor: string;
  x: number; // Tile column (0..cols-1)
  y: number; // Tile row (0..rows-1)
  dir: "up" | "down" | "left" | "right";
  isMoving: boolean;
  zoneId: string;
  status: string; // e.g. "Focusing", "In Meeting", "Lunch"
  deskClaimed?: string | null;
  media: PeerMediaState;
  updatedAt: number;
}

export type SignalMessage =
  | { type: "peer_join"; peer: PeerState }
  | { type: "peer_move"; id: string; x: number; y: number; dir: PeerState["dir"]; isMoving: boolean; zoneId: string }
  | { type: "peer_status"; id: string; status: string; deskClaimed?: string | null; name?: string; avatarColor?: string }
  | { type: "peer_media"; id: string; media: PeerMediaState }
  | { type: "peer_reaction"; id: string; emoji: string; label: string; expiresAt: number }
  | { type: "peer_leave"; id: string }
  | { type: "webrtc_signal"; from: string; to: string; payload: any }
  | { type: "chat"; id: string; sender: string; text: string; time: string; zoneId?: string };

export class SpaceSignaling {
  private channelName: string;
  private bc: BroadcastChannel | null = null;
  private onMessageCb: (msg: SignalMessage) => void;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private moveFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private fastPollTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMoveMsg: SignalMessage | null = null;
  private lastEdgeSendAt = 0;
  private lastEdgeCursor = 0;
  private pollInFlight = false;
  private destroyed = false;
  private discoveredEdgePeers = new Set<string>();
  private dataChannels = new Map<string, RTCDataChannel>();
  private pageHideHandler: (() => void) | null = null;
  public localPeer: PeerState;

  constructor(
    spaceSlug: string,
    localPeer: PeerState,
    onMessage: (msg: SignalMessage) => void
  ) {
    this.channelName = `forgespace_${spaceSlug}`;
    this.localPeer = localPeer;
    this.onMessageCb = onMessage;

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.bc = new BroadcastChannel(this.channelName);
        this.bc.onmessage = (event) => {
          if (event.data && event.data.type) {
            this.onMessageCb(event.data as SignalMessage);
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel initialization warning:", err);
      }
    }

    // Edge API heartbeat sync fallback for separate browsers/devices
    this.startHeartbeatSync();
  }

  public broadcast(msg: SignalMessage): void {
    if (this.destroyed) return;

    // 1. Send immediately via local BroadcastChannel (zero network cost)
    if (this.bc) {
      try {
        this.bc.postMessage(msg);
      } catch {
        // Ignore cross-tab close race
      }
    }

    // 2. Forward directly over open WebRTC DataChannels for low-latency P2P sync
    if (this.dataChannels.size > 0 && msg.type !== "webrtc_signal") {
      const payload = JSON.stringify(msg);
      for (const [, dc] of this.dataChannels) {
        if (dc.readyState === "open") {
          try {
            dc.send(payload);
          } catch {
            // Channel closing
          }
        }
      }
    }

    // 3. Coalesce high-frequency peer_move messages for Edge API so multi-user HTTP stays light
    if (typeof window !== "undefined") {
      if (msg.type === "peer_move") {
        this.scheduleEdgeMoveFlush(msg);
      } else {
        this.sendToEdge(msg).catch(() => {});
      }
    }
  }

  /**
   * Registers an open peer WebRTC DataChannel to exchange real-time state P2P.
   */
  public attachDataChannel(peerId: string, channel: RTCDataChannel): void {
    this.dataChannels.set(peerId, channel);
    channel.onmessage = (event) => {
      if (this.destroyed || typeof event.data !== "string") return;
      try {
        const parsed = JSON.parse(event.data) as SignalMessage;
        if (parsed && parsed.type) {
          this.onMessageCb(parsed);
        }
      } catch {
        // Ignore malformed P2P frame
      }
    };
    channel.onclose = () => {
      if (this.dataChannels.get(peerId) === channel) {
        this.dataChannels.delete(peerId);
      }
    };
  }

  public detachDataChannel(peerId: string): void {
    this.dataChannels.delete(peerId);
  }

  private scheduleEdgeMoveFlush(msg: SignalMessage): void {
    this.pendingMoveMsg = msg;
    const now = Date.now();
    const elapsed = now - this.lastEdgeSendAt;

    if (elapsed >= 280) {
      this.flushPendingMove();
    } else if (!this.moveFlushTimer) {
      this.moveFlushTimer = setTimeout(() => {
        this.moveFlushTimer = null;
        this.flushPendingMove();
      }, 280 - elapsed);
    }
  }

  private flushPendingMove(): void {
    if (!this.pendingMoveMsg) return;
    const msg = this.pendingMoveMsg;
    this.pendingMoveMsg = null;
    this.lastEdgeSendAt = Date.now();
    this.sendToEdge(msg).catch(() => {});
  }

  private async sendToEdge(msg: SignalMessage): Promise<void> {
    try {
      await fetch("/api/space/peers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: this.channelName,
          message: msg,
          senderId: this.localPeer.id,
        }),
      });
      if (msg.type === "webrtc_signal" || msg.type === "peer_join") {
        this.scheduleFastPoll();
      }
    } catch {
      // Offline/sandbox safe
    }
  }

  private scheduleFastPoll(): void {
    if (this.destroyed || this.fastPollTimer) return;
    this.fastPollTimer = setTimeout(() => {
      this.fastPollTimer = null;
      void this.pollEdge();
    }, 120);
  }

  private async pollEdge(): Promise<void> {
    if (this.destroyed || this.pollInFlight) return;
    if (typeof document !== "undefined" && document.hidden) return;
    this.pollInFlight = true;
    try {
      const res = await fetch(
        `/api/space/peers?channel=${encodeURIComponent(this.channelName)}&senderId=${encodeURIComponent(this.localPeer.id)}&since=${this.lastEdgeCursor}`,
        { cache: "no-store" }
      );
      if (res.ok && !this.destroyed) {
        const data = await res.json();
        if (typeof data.cursor === "number") {
          this.lastEdgeCursor = data.cursor;
        }
        if (Array.isArray(data.peers)) {
          for (const peer of data.peers as PeerState[]) {
            if (peer.id !== this.localPeer.id && !this.discoveredEdgePeers.has(peer.id)) {
              this.discoveredEdgePeers.add(peer.id);
              this.onMessageCb({ type: "peer_join", peer });
            }
          }
        }
        if (Array.isArray(data.messages)) {
          for (const msg of data.messages as SignalMessage[]) {
            if (msg.type === "peer_join") {
              this.discoveredEdgePeers.add(msg.peer.id);
            } else if (msg.type === "peer_leave") {
              this.discoveredEdgePeers.delete(msg.id);
            }
            this.onMessageCb(msg);
          }
        }
      }
    } catch {
      // Fallback silently
    } finally {
      this.pollInFlight = false;
    }
  }

  private startHeartbeatSync(): void {
    if (typeof window === "undefined") return;

    // Notify room on tab/window close so ghosts don't linger
    this.pageHideHandler = () => {
      const payload = JSON.stringify({
        channel: this.channelName,
        senderId: this.localPeer.id,
        message: { type: "peer_leave", id: this.localPeer.id },
      });
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/space/peers",
          new Blob([payload], { type: "application/json" })
        );
      }
      if (this.bc) {
        try {
          this.bc.postMessage({ type: "peer_leave", id: this.localPeer.id });
        } catch {
          // Ignore close race
        }
      }
    };
    window.addEventListener("pagehide", this.pageHideHandler);

    // Send initial join and fetch active coworkers immediately
    this.broadcast({ type: "peer_join", peer: this.localPeer });
    void this.pollEdge();

    // Poll edge for remote peer messages & WebRTC signals every 1s using incremental cursor
    this.pollInterval = setInterval(() => {
      void this.pollEdge();
    }, 1000);

    // Periodic presence heartbeat (every 10s) so newly joined users discover existing peers
    this.heartbeatInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      this.localPeer.updatedAt = Date.now();
      this.broadcast({ type: "peer_join", peer: this.localPeer });
    }, 10_000);
  }

  public updatePosition(x: number, y: number, dir: PeerState["dir"], isMoving: boolean, zoneId: string): void {
    // Only broadcast if state actually changed
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
    if (deskClaimed !== undefined) {
      this.localPeer.deskClaimed = deskClaimed;
    }
    if (name !== undefined) {
      this.localPeer.name = name;
    }
    if (avatarColor !== undefined) {
      this.localPeer.avatarColor = avatarColor;
    }
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
    this.onMessageCb(msg); // echo to local
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
    this.onMessageCb(msg); // echo to local
    this.broadcast(msg);
  }

  public sendSignal(to: string, payload: any): void {
    this.broadcast({
      type: "webrtc_signal",
      from: this.localPeer.id,
      to,
      payload,
    });
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.broadcast({ type: "peer_leave", id: this.localPeer.id });
    this.destroyed = true;
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.moveFlushTimer) clearTimeout(this.moveFlushTimer);
    if (this.fastPollTimer) clearTimeout(this.fastPollTimer);
    if (this.pageHideHandler && typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.pageHideHandler);
      this.pageHideHandler = null;
    }
    this.dataChannels.clear();
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
  }
}
