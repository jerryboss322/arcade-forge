"use client";

import React from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import type { WebRTCDiagnosticsSnapshot } from "@/lib/space/webrtcMesh";

interface WebRTCDiagnosticsModalProps {
  open: boolean;
  onClose: () => void;
  transportMode: "livekit" | "p2p";
  diagnostics: WebRTCDiagnosticsSnapshot | null;
  onRetryMedia: () => Promise<void>;
  onReconnect: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export function WebRTCDiagnosticsModal({
  open,
  onClose,
  transportMode,
  diagnostics,
  onRetryMedia,
  onReconnect,
  onRefresh,
}: WebRTCDiagnosticsModalProps) {
  return (
    <ArcadeDialog
      open={open}
      onClose={onClose}
      title="Realtime Video & Network Diagnostics"
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-3 text-xs text-text">
        <div className="p-2.5 bg-surface-2 rounded-control flex items-center justify-between gap-2">
          <div>
            <p className="font-display font-bold">
              Engine:{" "}
              <span className={transportMode === "livekit" || diagnostics?.hasTurn ? "text-emerald-400" : "text-amber-400"}>
                {transportMode === "livekit"
                  ? "LiveKit Cloud SFU (Managed TURN + Simulcast)"
                  : diagnostics?.hasTurn
                    ? "P2P Mesh + TURN Relay"
                    : "P2P Mesh (STUN-only — No TURN Configured)"}
              </span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Local tracks: {diagnostics?.localVideoTracks ?? 0} video, {diagnostics?.localAudioTracks ?? 0} audio
            </p>
            {(diagnostics?.cameraError || diagnostics?.micError) && (
              <p className="text-[11px] text-amber-300 mt-1">
                {diagnostics.cameraError || diagnostics.micError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => void onRetryMedia().then(() => onRefresh())}
              className="px-2.5 py-1.5 bg-surface border border-border rounded-control text-[11px] font-bold hover:border-accent"
            >
              Retry Cam
            </button>
            <button
              type="button"
              onClick={() => void onReconnect().then(() => onRefresh())}
              className="px-2.5 py-1.5 bg-accent text-bg rounded-control text-[11px] font-bold hover:brightness-110"
            >
              Reconnect
            </button>
          </div>
        </div>

        {transportMode === "p2p" && !diagnostics?.hasTurn && (
          <div className="p-2.5 rounded-control bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-200 leading-relaxed">
            Running in P2P STUN-only fallback. For reliable mobile/cross-network calls, add{" "}
            <code className="font-mono">LIVEKIT_URL</code> +{" "}
            <code className="font-mono">LIVEKIT_API_KEY</code> +{" "}
            <code className="font-mono">LIVEKIT_API_SECRET</code> (recommended SFU) or{" "}
            <code className="font-mono">CLOUDFLARE_TURN_*</code> in Vercel Environment Variables.
          </div>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {diagnostics?.peers.length ? (
            diagnostics.peers.map((p) => (
              <div
                key={p.peerId}
                className="p-2.5 bg-surface-2 rounded-control border border-border/60 font-mono text-[11px] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-text">
                    {p.peerId} ({p.role})
                  </span>
                  <span className="text-accent">
                    {p.iceConnectionState} / {p.connectionState}
                  </span>
                </div>
                <div className="text-text-muted">
                  Sig: {p.signalingState} | ICE Gather: {p.iceGatheringState}
                </div>
                <div className="text-text-muted">
                  Video TX/RX pkts: {p.videoPacketsSent} / {p.videoPacketsReceived} | Audio TX/RX pkts:{" "}
                  {p.audioPacketsSent} / {p.audioPacketsReceived}
                </div>
                <div className="text-text-muted truncate">
                  Candidates: {p.candidateTypes.length > 0 ? p.candidateTypes.join(", ") : "none yet"}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-text-muted py-2">No active peer connections yet.</p>
          )}
        </div>
      </div>
    </ArcadeDialog>
  );
}
