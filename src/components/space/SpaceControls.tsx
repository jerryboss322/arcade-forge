"use client";

import React from "react";

interface SpaceControlsProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  isSidebarOpen: boolean;
  unreadChatCount?: number;
  isFullscreen: boolean;
  videoLayout: "floating" | "docked";
  viewMode: "3d" | "2d";
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleSidebar: () => void;
  onToggleFullscreen: () => void;
  onToggleVideoLayout: () => void;
  onToggleViewMode: () => void;
  onOpenAvatarCustomizer: () => void;
  onOpenMeetingSchedule: () => void;
  onOpenPulse: () => void;
  onOpenHelp: () => void;
}

export function SpaceControls({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  isSidebarOpen,
  unreadChatCount = 0,
  isFullscreen,
  videoLayout,
  viewMode,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleSidebar,
  onToggleFullscreen,
  onToggleVideoLayout,
  onToggleViewMode,
  onOpenAvatarCustomizer,
  onOpenMeetingSchedule,
  onOpenPulse,
  onOpenHelp,
}: SpaceControlsProps) {
  return (
    <div className="flex items-center gap-1.5 md:gap-2 p-1.5 bg-surface/90 backdrop-blur-md border-2 border-border rounded-full shadow-arcade">
      {/* 3D vs 2D View Switcher */}
      <button
        onClick={onToggleViewMode}
        title={`Switch to ${viewMode === "3d" ? "2D Top-Down" : "3D Isometric"} View`}
        className="px-3 h-10 rounded-full flex items-center gap-1.5 bg-surface-2 hover:bg-surface border border-border hover:border-accent text-text text-xs font-display font-bold transition-all active:scale-95"
      >
        <span className="text-base">{viewMode === "3d" ? "🧊" : "🗺️"}</span>
        <span className="hidden sm:inline uppercase text-[10px] tracking-wider text-accent">
          {viewMode.toUpperCase()}
        </span>
      </button>

      <div className="w-[1px] h-6 bg-border mx-0.5" />

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

      {/* Avatar Customizer */}
      <button
        onClick={onOpenAvatarCustomizer}
        title="Customize Avatar & Status"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
      >
        <span className="text-sm">🎨</span>
      </button>

      {/* Meeting Calendar Schedule */}
      <button
        onClick={onOpenMeetingSchedule}
        title="Office Schedule & Room Bookings"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
      >
        <span className="text-sm">📅</span>
      </button>

      {/* Office Pulse & Live Telemetry */}
      <button
        onClick={onOpenPulse}
        title="Live Office Pulse & WebRTC Telemetry"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
      >
        <span className="text-sm">📊</span>
      </button>

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
        type="button"
        onClick={onToggleSidebar}
        aria-pressed={isSidebarOpen}
        aria-label={
          unreadChatCount > 0
            ? `${isSidebarOpen ? "Hide" : "Show"} sidebar (${unreadChatCount} unread messages)`
            : isSidebarOpen
              ? "Hide sidebar"
              : "Show sidebar"
        }
        title={
          unreadChatCount > 0
            ? `${isSidebarOpen ? "Hide" : "Show"} Sidebar (B) — ${unreadChatCount} unread`
            : `${isSidebarOpen ? "Hide" : "Show"} Sidebar (B)`
        }
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isSidebarOpen
            ? "bg-accent/20 text-accent border border-accent"
            : "bg-surface-2 text-text border border-border hover:border-accent"
        }`}
      >
        <span className="text-sm">👥</span>
        {unreadChatCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-accent text-bg text-[9px] font-bold flex items-center justify-center shadow-sm border border-surface">
            {unreadChatCount > 99 ? "99+" : unreadChatCount}
          </span>
        )}
      </button>

      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-pressed={isFullscreen}
        aria-label={isFullscreen ? "Exit fullscreen mode" : "Enter fullscreen mode"}
        title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen Mode (F)"}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isFullscreen
            ? "bg-accent/20 text-accent border border-accent"
            : "bg-surface-2 text-text border border-border hover:border-accent"
        }`}
      >
        {isFullscreen ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 8V5a2 2 0 0 1 2-2h3" />
            <path d="M16 3h3a2 2 0 0 1 2 2v3" />
            <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
            <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
          </svg>
        )}
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
