// Lightweight Zero-Cost Peer Signaling & Coordination Engine
// Uses BroadcastChannel for instant local multi-tab sync + Edge API polling fallback.
// Transports (x, y) coordinates, avatar status, and WebRTC SDP offers/answers.

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
  | { type: "peer_status"; id: string; status: string; deskClaimed?: string | null }
  | { type: "peer_media"; id: string; media: PeerMediaState }
  | { type: "peer_leave"; id: string }
  | { type: "webrtc_signal"; from: string; to: string; payload: any }
  | { type: "chat"; id: string; sender: string; text: string; time: string; zoneId?: string };

export class SpaceSignaling {
  private channelName: string;
  private bc: BroadcastChannel | null = null;
  private onMessageCb: (msg: SignalMessage) => void;
  private pollInterval: any = null;
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

    // Edge API heartbeat sync fallback for separate browsers
    this.startHeartbeatSync(spaceSlug);
  }

  public broadcast(msg: SignalMessage): void {
    // 1. Send via local BroadcastChannel
    if (this.bc) {
      try {
        this.bc.postMessage(msg);
      } catch (e) {
        // ignore
      }
    }

    // 2. Also send to Edge API if it's a movement or join/leave or signal
    if (typeof window !== "undefined") {
      this.sendToEdge(msg).catch(() => {});
    }
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
    } catch {
      // Offline/sandbox safe
    }
  }

  private startHeartbeatSync(spaceSlug: string): void {
    if (typeof window === "undefined") return;

    // Send initial join
    this.broadcast({ type: "peer_join", peer: this.localPeer });

    // Poll edge for other machine peers every 2.5 seconds
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/space/peers?channel=${encodeURIComponent(this.channelName)}&senderId=${this.localPeer.id}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages)) {
            for (const msg of data.messages) {
              this.onMessageCb(msg);
            }
          }
        }
      } catch {
        // Fallback silently
      }
    }, 2500);
  }

  public updatePosition(x: number, y: number, dir: PeerState["dir"], isMoving: boolean, zoneId: string): void {
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

  public updateStatus(status: string, deskClaimed?: string | null): void {
    this.localPeer.status = status;
    if (deskClaimed !== undefined) {
      this.localPeer.deskClaimed = deskClaimed;
    }
    this.broadcast({
      type: "peer_status",
      id: this.localPeer.id,
      status,
      deskClaimed: this.localPeer.deskClaimed,
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

  public destroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.broadcast({ type: "peer_leave", id: this.localPeer.id });
    if (this.bc) {
      this.bc.close();
      this.bc = null;
    }
  }
}
