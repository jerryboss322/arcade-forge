"use client";

import React from "react";

interface SpaceControlsProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isSidebarOpen: boolean;
  videoLayout: "floating" | "docked";
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleSidebar: () => void;
  onToggleVideoLayout: () => void;
  onOpenHelp: () => void;
}

export function SpaceControls({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  isSidebarOpen,
  videoLayout,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleSidebar,
  onToggleVideoLayout,
  onOpenHelp,
}: SpaceControlsProps) {
  return (
    <div className="flex items-center gap-2 p-1.5 bg-surface/90 backdrop-blur-md border-2 border-border rounded-full shadow-arcade">
      {/* Mic toggle */}
      <button
        onClick={onToggleAudio}
        title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isAudioMuted
            ? "bg-red-500/20 text-red-400 border border-red-500/40"
            : "bg-surface-2 text-text border border-border hover:border-accent"
        }`}
      >
        <span className="text-sm">{isAudioMuted ? "🔇" : "🎙️"}</span>
      </button>

      {/* Cam toggle */}
      <button
        onClick={onToggleVideo}
        title={isVideoMuted ? "Turn On Camera" : "Turn Off Camera"}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isVideoMuted
            ? "bg-red-500/20 text-red-400 border border-red-500/40"
            : "bg-surface-2 text-text border border-border hover:border-accent"
        }`}
      >
        <span className="text-sm">{isVideoMuted ? "🚫" : "📹"}</span>
      </button>

      {/* Screen Share toggle */}
      <button
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isScreenSharing
            ? "bg-accent text-bg border border-accent shadow-sm"
            : "bg-surface-2 text-text border border-border hover:border-accent"
        }`}
      >
        <span className="text-sm">🖥️</span>
      </button>

      <div className="w-[1px] h-6 bg-border mx-0.5" />

      {/* Floating vs Docked Video Layout toggle (Desktop) */}
      <button
        onClick={onToggleVideoLayout}
        title={`Switch to ${videoLayout === "floating" ? "Docked" : "Floating"} Video`}
        className="hidden md:flex w-10 h-10 rounded-full items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
      >
        <span className="text-xs font-display font-bold">
          {videoLayout === "floating" ? "🫧" : "📌"}
        </span>
      </button>

      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isSidebarOpen
            ? "bg-accent/20 text-accent border border-accent"
            : "bg-surface-2 text-text border border-border hover:border-accent"
        }`}
      >
        <span className="text-sm">👥</span>
      </button>

      {/* Help / Guide button */}
      <button
        onClick={onOpenHelp}
        title="Controls & Keyboard Guide"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-text-muted hover:text-text border border-border transition-transform active:scale-95"
      >
        <span className="text-xs font-display font-bold">?</span>
      </button>
    </div>
  );
}
