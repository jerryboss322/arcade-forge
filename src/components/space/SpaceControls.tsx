"use client";

import React from "react";
import {
  IconBubbles,
  IconCalendar,
  IconChart,
  IconCompress,
  IconCube,
  IconDock,
  IconExpand,
  IconMap,
  IconMic,
  IconMicOff,
  IconPalette,
  IconScreenShare,
  IconUsers,
  IconVideo,
  IconVideoOff,
} from "@/components/space/SpaceIcons";

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
    <div
      role="toolbar"
      aria-label="Virtual office controls"
      className="flex items-center gap-1.5 md:gap-2 p-1.5 bg-surface/90 backdrop-blur-md border-2 border-border rounded-full shadow-arcade"
    >
      {/* 3D vs 2D View Switcher */}
      <button
        type="button"
        onClick={onToggleViewMode}
        title={`Switch to ${viewMode === "3d" ? "2D Top-Down" : "3D Isometric"} View`}
        className="px-3 h-10 rounded-full flex items-center gap-1.5 bg-surface-2 hover:bg-surface border border-border hover:border-accent text-text text-xs font-display font-bold transition-all active:scale-95"
      >
        {viewMode === "3d" ? (
          <IconCube className="w-4 h-4 text-accent" />
        ) : (
          <IconMap className="w-4 h-4 text-accent" />
        )}
        <span className="hidden sm:inline uppercase text-[10px] tracking-wider text-accent">
          {viewMode.toUpperCase()}
        </span>
      </button>

      <div className="w-[1px] h-6 bg-border mx-0.5" />

      {/* Mic toggle */}
      <button
        type="button"
        onClick={onToggleAudio}
        aria-pressed={!isAudioMuted}
        aria-label={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
        title={isAudioMuted ? "Unmute Microphone (M)" : "Mute Microphone (M)"}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isAudioMuted
            ? "bg-red-500/20 text-red-400 border border-red-500/40"
            : "bg-surface-2 text-text border border-border hover:border-accent"
        }`}
      >
        {isAudioMuted ? <IconMicOff /> : <IconMic />}
      </button>

      {/* Cam toggle */}
      <button
        type="button"
        onClick={onToggleVideo}
        aria-pressed={!isVideoMuted}
        aria-label={isVideoMuted ? "Turn on camera" : "Turn off camera"}
        title={isVideoMuted ? "Turn On Camera (V)" : "Turn Off Camera (V)"}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isVideoMuted
            ? "bg-red-500/20 text-red-400 border border-red-500/40"
            : "bg-surface-2 text-text border border-border hover:border-accent"
        }`}
      >
        {isVideoMuted ? <IconVideoOff /> : <IconVideo />}
      </button>

      {/* Screen Share toggle */}
      <button
        type="button"
        onClick={onToggleScreenShare}
        aria-pressed={isScreenSharing}
        aria-label={isScreenSharing ? "Stop sharing screen" : "Share screen"}
        title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
          isScreenSharing
            ? "bg-accent text-bg border border-accent shadow-sm"
            : "bg-surface-2 text-text border border-border hover:border-accent"
        }`}
      >
        <IconScreenShare />
      </button>

      <div className="w-[1px] h-6 bg-border mx-0.5" />

      {/* Avatar Customizer */}
      <button
        type="button"
        onClick={onOpenAvatarCustomizer}
        aria-label="Customize avatar and status"
        title="Customize Avatar & Status"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
      >
        <IconPalette />
      </button>

      {/* Meeting Calendar Schedule */}
      <button
        type="button"
        onClick={onOpenMeetingSchedule}
        aria-label="Office schedule and room bookings"
        title="Office Schedule & Room Bookings"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
      >
        <IconCalendar />
      </button>

      {/* Office Pulse & Live Telemetry */}
      <button
        type="button"
        onClick={onOpenPulse}
        aria-label="Live office pulse and telemetry"
        title="Live Office Pulse & WebRTC Telemetry"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
      >
        <IconChart />
      </button>

      {/* Floating vs Docked Video Layout toggle (Desktop) */}
      <button
        type="button"
        onClick={onToggleVideoLayout}
        aria-label={`Switch to ${videoLayout === "floating" ? "docked" : "floating"} video layout`}
        title={`Switch to ${videoLayout === "floating" ? "Docked" : "Floating"} Video`}
        className="hidden md:flex w-10 h-10 rounded-full items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
      >
        {videoLayout === "floating" ? <IconBubbles /> : <IconDock />}
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
        <IconUsers />
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
        {isFullscreen ? <IconCompress /> : <IconExpand />}
      </button>

      {/* Help / Guide button */}
      <button
        type="button"
        onClick={onOpenHelp}
        aria-label="Controls and keyboard guide"
        title="Controls & Keyboard Guide (?)"
        className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-2 text-text-muted hover:text-text border border-border hover:border-accent transition-transform active:scale-95"
      >
        <span className="text-xs font-display font-bold">?</span>
      </button>
    </div>
  );
}
