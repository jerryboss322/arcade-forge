"use client";

import React, { useState, useRef, useEffect } from "react";
import { OFFICE_REACTIONS, OfficeReactionPreset } from "@/lib/space/officeReactions";
import { OfficeThemeId, OFFICE_THEMES } from "@/lib/space/officeThemes";
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
  IconMoon,
  IconMore,
  IconPalette,
  IconScreenShare,
  IconSmile,
  IconSparkles,
  IconSun,
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
  themeId: OfficeThemeId;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleSidebar: () => void;
  onToggleFullscreen: () => void;
  onToggleVideoLayout: () => void;
  onToggleViewMode: () => void;
  onCycleTheme: () => void;
  onTriggerReaction: (reaction: OfficeReactionPreset) => void;
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
  themeId,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleSidebar,
  onToggleFullscreen,
  onToggleVideoLayout,
  onToggleViewMode,
  onCycleTheme,
  onTriggerReaction,
  onOpenAvatarCustomizer,
  onOpenMeetingSchedule,
  onOpenPulse,
  onOpenHelp,
}: SpaceControlsProps) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!reactionsOpen && !moreOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setReactionsOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [reactionsOpen, moreOpen]);

  const activeTheme = OFFICE_THEMES[themeId];
  const ThemeIcon =
    themeId === "daylight" ? IconSun : themeId === "espresso" ? IconSparkles : IconMoon;

  return (
    <div ref={dockRef} className="relative flex flex-col items-center">
      {/* Reactions Floating Popover */}
      {reactionsOpen && (
        <div
          role="menu"
          aria-label="Quick floor reactions"
          className="mb-2 px-2 py-1.5 bg-surface/95 backdrop-blur-md border border-border rounded-full shadow-arcade flex items-center gap-1"
        >
          {OFFICE_REACTIONS.map((reaction) => (
            <button
              key={reaction.id}
              type="button"
              onClick={() => {
                onTriggerReaction(reaction);
                setReactionsOpen(false);
              }}
              title={`${reaction.label} (${reaction.shortcut})`}
              className="px-2 py-1 rounded-full hover:bg-surface-2 flex items-center gap-1 text-xs transition-transform active:scale-95"
            >
              <span className="text-base leading-none">{reaction.emoji}</span>
              <span className="hidden sm:inline text-[10px] font-mono text-text-muted">
                {reaction.shortcut}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Mobile Overflow Menu Popover */}
      {moreOpen && (
        <div
          role="menu"
          aria-label="More office tools"
          className="md:hidden mb-2 p-2 bg-surface/95 backdrop-blur-md border border-border rounded-card shadow-arcade grid grid-cols-2 gap-1.5 min-w-[13rem]"
        >
          <button
            type="button"
            onClick={() => {
              onOpenAvatarCustomizer();
              setMoreOpen(false);
            }}
            className="px-2.5 py-2 rounded-control bg-surface-2 hover:border-accent border border-border text-xs text-text flex items-center gap-2"
          >
            <IconPalette className="w-3.5 h-3.5 text-accent" />
            <span>Avatar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenMeetingSchedule();
              setMoreOpen(false);
            }}
            className="px-2.5 py-2 rounded-control bg-surface-2 hover:border-accent border border-border text-xs text-text flex items-center gap-2"
          >
            <IconCalendar className="w-3.5 h-3.5 text-accent" />
            <span>Schedule</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenPulse();
              setMoreOpen(false);
            }}
            className="px-2.5 py-2 rounded-control bg-surface-2 hover:border-accent border border-border text-xs text-text flex items-center gap-2"
          >
            <IconChart className="w-3.5 h-3.5 text-accent" />
            <span>Pulse</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onCycleTheme();
              setMoreOpen(false);
            }}
            className="px-2.5 py-2 rounded-control bg-surface-2 hover:border-accent border border-border text-xs text-text flex items-center gap-2"
          >
            <ThemeIcon className="w-3.5 h-3.5 text-accent-2" />
            <span className="truncate">{activeTheme.name.split(" ")[0]}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenHelp();
              setMoreOpen(false);
            }}
            className="col-span-2 px-2.5 py-2 rounded-control bg-surface-2 hover:border-accent border border-border text-xs text-text flex items-center justify-center gap-2"
          >
            <span className="font-display font-bold text-accent">?</span>
            <span>Controls &amp; Shortcuts</span>
          </button>
        </div>
      )}

      {/* Main Floating Toolbar */}
      <div
        role="toolbar"
        aria-label="Virtual office controls"
        className="flex items-center gap-1 md:gap-1.5 p-1.5 bg-surface/90 backdrop-blur-md border-2 border-border rounded-full shadow-arcade"
      >
        {/* 3D vs 2D View Switcher */}
        <button
          type="button"
          onClick={onToggleViewMode}
          title={`Switch to ${viewMode === "3d" ? "2D Top-Down" : "3D Isometric"} View`}
          className="px-2.5 sm:px-3 h-9 sm:h-10 rounded-full flex items-center gap-1.5 bg-surface-2 hover:bg-surface border border-border hover:border-accent text-text text-xs font-display font-bold transition-all active:scale-95"
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

        <div className="w-[1px] h-5 bg-border mx-0.5" />

        {/* Mic toggle */}
        <button
          type="button"
          onClick={onToggleAudio}
          aria-pressed={!isAudioMuted}
          aria-label={isAudioMuted ? "Unmute microphone" : "Mute microphone"}
          title={isAudioMuted ? "Unmute Microphone (M)" : "Mute Microphone (M)"}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
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
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
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
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
            isScreenSharing
              ? "bg-accent text-bg border border-accent shadow-sm"
              : "bg-surface-2 text-text border border-border hover:border-accent"
          }`}
        >
          <IconScreenShare />
        </button>

        {/* Quick Reactions Popover Trigger */}
        <button
          type="button"
          onClick={() => {
            setReactionsOpen((v) => !v);
            setMoreOpen(false);
          }}
          aria-expanded={reactionsOpen}
          aria-label="Send quick reaction"
          title="Quick Reactions (Keys 1–5)"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
            reactionsOpen
              ? "bg-accent/20 text-accent border border-accent"
              : "bg-surface-2 text-text border border-border hover:border-accent"
          }`}
        >
          <IconSmile />
        </button>

        <div className="hidden md:block w-[1px] h-5 bg-border mx-0.5" />

        {/* Desktop Secondary Tools */}
        <button
          type="button"
          onClick={onOpenAvatarCustomizer}
          aria-label="Customize avatar and status"
          title="Customize Avatar & Status"
          className="hidden md:flex w-10 h-10 rounded-full items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
        >
          <IconPalette />
        </button>

        <button
          type="button"
          onClick={onOpenMeetingSchedule}
          aria-label="Office schedule and room bookings"
          title="Office Schedule & Room Bookings"
          className="hidden md:flex w-10 h-10 rounded-full items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
        >
          <IconCalendar />
        </button>

        <button
          type="button"
          onClick={onOpenPulse}
          aria-label="Live office pulse and telemetry"
          title="Live Office Pulse & WebRTC Telemetry"
          className="hidden md:flex w-10 h-10 rounded-full items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
        >
          <IconChart />
        </button>

        <button
          type="button"
          onClick={onToggleVideoLayout}
          aria-label={`Switch to ${videoLayout === "floating" ? "docked" : "floating"} video layout`}
          title={`Switch to ${videoLayout === "floating" ? "Docked" : "Floating"} Video`}
          className="hidden md:flex w-10 h-10 rounded-full items-center justify-center bg-surface-2 text-text border border-border hover:border-accent transition-transform active:scale-95"
        >
          {videoLayout === "floating" ? <IconBubbles /> : <IconDock />}
        </button>

        {/* Lighting & UI Theme Switcher (Desktop) */}
        <button
          type="button"
          onClick={onCycleTheme}
          aria-label={`Switch office lighting theme (current: ${activeTheme.name})`}
          title={`Theme: ${activeTheme.name} (click to switch)`}
          className="hidden md:flex w-10 h-10 rounded-full items-center justify-center bg-surface-2 text-accent-2 border border-border hover:border-accent transition-transform active:scale-95"
        >
          <ThemeIcon />
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
          className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
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
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
            isFullscreen
              ? "bg-accent/20 text-accent border border-accent"
              : "bg-surface-2 text-text border border-border hover:border-accent"
          }`}
        >
          {isFullscreen ? <IconCompress /> : <IconExpand />}
        </button>

        {/* Help / Guide button (Desktop) */}
        <button
          type="button"
          onClick={onOpenHelp}
          aria-label="Controls and keyboard guide"
          title="Controls & Keyboard Guide (?)"
          className="hidden md:flex w-10 h-10 rounded-full items-center justify-center bg-surface-2 text-text-muted hover:text-text border border-border hover:border-accent transition-transform active:scale-95"
        >
          <span className="text-xs font-display font-bold">?</span>
        </button>

        {/* Mobile Overflow Menu Trigger */}
        <button
          type="button"
          onClick={() => {
            setMoreOpen((v) => !v);
            setReactionsOpen(false);
          }}
          aria-expanded={moreOpen}
          aria-label="More office tools"
          title="More Tools"
          className={`md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 ${
            moreOpen
              ? "bg-accent/20 text-accent border border-accent"
              : "bg-surface-2 text-text-muted border border-border hover:border-accent"
          }`}
        >
          <IconMore />
        </button>
      </div>
    </div>
  );
}
