"use client";

import React from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import { StreamVideo } from "@/components/space/StreamVideo";

interface TheaterModalProps {
  open: boolean;
  onClose: () => void;
  presenterName: string;
  stream: MediaStream | null;
}

export function TheaterModal({
  open,
  onClose,
  presenterName,
  stream,
}: TheaterModalProps) {
  const videoTracks = stream?.getVideoTracks() ?? [];
  const hasLiveVideoTrack = videoTracks.some((t) => t.readyState === "live" && t.enabled);
  const hasActiveFrames = videoTracks.some((t) => t.readyState === "live" && !t.muted);

  return (
    <ArcadeDialog
      open={open}
      onClose={onClose}
      title={`🖥️ Boardroom Presentation • ${presenterName}`}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-4">
        {/* HD Theater Presentation Screen */}
        <div className="relative aspect-video w-full bg-black rounded-container border-2 border-border overflow-hidden flex items-center justify-center">
          {stream && hasLiveVideoTrack ? (
            <>
              <StreamVideo stream={stream} className="w-full h-full object-contain" />
              {!hasActiveFrames && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
                  <span className="px-3 py-1.5 rounded-full bg-surface/90 border border-border text-xs font-display text-text animate-pulse">
                    Connecting live presentation stream...
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center p-8 space-y-2">
              <span className="text-4xl block">📊</span>
              <p className="text-sm font-display text-text font-semibold">
                {stream
                  ? "Connecting presentation video..."
                  : "No active screen share in the Boardroom"}
              </p>
              <p className="text-xs text-text-muted max-w-xs mx-auto">
                Click the screen share button on your control bar to broadcast your slides or code to the room.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted pt-1">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>HD Presentation Feed (Direct P2P WebRTC)</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-surface-2 hover:bg-surface border border-border text-text rounded-control font-display text-xs"
          >
            Exit Theater Mode
          </button>
        </div>
      </div>
    </ArcadeDialog>
  );
}
