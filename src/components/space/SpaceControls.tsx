"use client";

import React, { useState, useRef, useEffect } from "react";
import { OFFICE_REACTIONS, OfficeReactionPreset } from "@/lib/space/officeReactions";
import { OfficeThemeId, OFFICE_THEMES } from "@/lib/space/officeThemes";
import { AudioScope } from "@/lib/space/webrtcMesh";
import {
  IconBubbles,
  IconCalendar,
  IconChart,
  IconCompress,
  IconCube,
  IconDock,
  IconExpand,
  IconFlipCamera,
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
  IconVideo,
  IconVideoOff,
} from "@/components/space/SpaceIcons";

interface SpaceControlsProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  screenShareLocked?: boolean;
  isFullscreen: boolean;
  videoLayout: "floating" | "docked";
  viewMode: "3d" | "2d" | "call";
  themeId: OfficeThemeId;
  audioScope: AudioScope;
  showFlipCamera?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSwitchCamera?: () => void;
  onToggleScreenShare: () => void;
  onToggleFullscreen: () => void;
  onToggleVideoLayout: () => void;
  onToggleViewMode: () => void;
  onToggleAudioScope: () => void;
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
  screenShareLocked = false,
  isFullscreen,
  videoLayout,
  viewMode,
  themeId,
  audioScope,
  showFlipCamera = false,
  onToggleAudio,
  onToggleVideo,
  onSwitchCamera,
  onToggleScreenShare,
  onToggleFullscreen,
  onToggleVideoLayout,
  onToggleViewMode,
  onToggleAudioScope,
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
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // Close open panels on outside pointerdown or Escape
  useEffect(() => {
    if (!reactionsOpen && !moreOpen) return;
    const handleOutside = (e: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setReactionsOpen(false);
        setMoreOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setReactionsOpen(false);
        setMoreOpen(false);
      }
    };
    window.addEventListener("pointerdown", handleOutside);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handleOutside);
      window.removeEventListener("keydown", handleKey);
    };
  }, [reactionsOpen, moreOpen]);

  // Roving tabindex fallback for role="toolbar" when native focusgroup is unsupported
  useEffect(() => {
    const bar = toolbarRef.current;
    if (!bar || "focusGroup" in HTMLElement.prototype) return;

    const getItems = () =>
      Array.from(bar.querySelectorAll<HTMLButtonElement>("button"));

    const items = getItems();
    items.forEach((b, i) => {
      b.tabIndex = i === 0 ? 0 : -1;
    });

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLButtonElement | null;
      const currentItems = getItems();
      if (target && currentItems.includes(target)) {
        currentItems.forEach((b) => {
          b.tabIndex = b === target ? 0 : -1;
        });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const currentItems = getItems();
      const idx = currentItems.indexOf(document.activeElement as HTMLButtonElement);
      if (idx === -1 || currentItems.length === 0) return;

      const rtl = getComputedStyle(bar).direction === "rtl";
      const delta =
        e.key === "ArrowRight"
          ? rtl
            ? -1
            : 1
          : e.key === "ArrowLeft"
            ? rtl
              ? 1
              : -1
            : 0;

      if (delta !== 0) {
        e.preventDefault();
        const nextIdx = (idx + delta + currentItems.length) % currentItems.length;
        currentItems[nextIdx]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        currentItems[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        currentItems[currentItems.length - 1]?.focus();
      }
    };

    bar.addEventListener("focusin", onFocusIn);
    bar.addEventListener("keydown", onKeyDown);
    return () => {
      bar.removeEventListener("focusin", onFocusIn);
      bar.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const activeTheme = OFFICE_THEMES[themeId];
  const ThemeIcon =
    themeId === "daylight" ? IconSun : themeId === "espresso" ? IconSparkles : IconMoon;

  return (
    <div ref={dockRef} className="relative flex flex-col items-center">
      {/* Quick Reactions Popover */}
      {reactionsOpen && (
        <div
          aria-label="Quick floor reactions"
          className="mb-2 px-1.5 py-1 bg-surface/92 backdrop-blur-xl border border-border/80 rounded-full shadow-arcade flex items-center gap-0.5"
        >
          {OFFICE_REACTIONS.map((reaction) => (
            <button
              key={reaction.id}
              type="button"
              onClick={() => {
                onTriggerReaction(reaction);
                setReactionsOpen(false);
              }}
              aria-label={`React with ${reaction.label}`}
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

      {/* Compact Unified Tools & Settings Popover */}
      {moreOpen && (
        <div
          aria-label="Office tools and settings"
          className="mb-2 p-2 w-60 bg-surface/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-arcade space-y-1.5 text-xs"
        >
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                onToggleAudioScope();
                setMoreOpen(false);
              }}
              className="px-2.5 py-2 rounded-xl bg-surface-2/80 hover:bg-surface-2 border border-border/60 hover:border-accent text-text flex items-center gap-1.5 text-left transition-colors"
            >
              <IconMic className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="truncate font-medium">
                {audioScope === "office" ? "Office Audio" : "Proximity"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleVideoLayout();
                setMoreOpen(false);
              }}
              className="px-2.5 py-2 rounded-xl bg-surface-2/80 hover:bg-surface-2 border border-border/60 hover:border-accent text-text flex items-center gap-1.5 text-left transition-colors"
            >
              {videoLayout === "floating" ? (
                <IconBubbles className="w-3.5 h-3.5 text-accent-2 flex-shrink-0" />
              ) : (
                <IconDock className="w-3.5 h-3.5 text-accent-2 flex-shrink-0" />
              )}
              <span className="truncate font-medium">
                {videoLayout === "floating" ? "Bubbles" : "Docked"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCycleTheme();
                setMoreOpen(false);
              }}
              className="px-2.5 py-2 rounded-xl bg-surface-2/80 hover:bg-surface-2 border border-border/60 hover:border-accent text-text flex items-center gap-1.5 text-left transition-colors"
            >
              <ThemeIcon className="w-3.5 h-3.5 text-accent-2 flex-shrink-0" />
              <span className="truncate font-medium">
                {activeTheme.name.split(" ")[0]}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onToggleFullscreen();
                setMoreOpen(false);
              }}
              className="px-2.5 py-2 rounded-xl bg-surface-2/80 hover:bg-surface-2 border border-border/60 hover:border-accent text-text flex items-center gap-1.5 text-left transition-colors"
            >
              {isFullscreen ? (
                <IconCompress className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              ) : (
                <IconExpand className="w-3.5 h-3.5 text-accent flex-shrink-0" />
              )}
              <span className="truncate font-medium">
                {isFullscreen ? "Exit Full" : "Fullscreen"}
              </span>
            </button>
          </div>

          <div className="border-t border-border/60 pt-1.5 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onOpenAvatarCustomizer();
                setMoreOpen(false);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-surface-2 text-text flex items-center gap-2 transition-colors"
            >
              <IconPalette className="w-3.5 h-3.5 text-accent" />
              <span>Avatar &amp; Status</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenMeetingSchedule();
                setMoreOpen(false);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-surface-2 text-text flex items-center gap-2 transition-colors"
            >
              <IconCalendar className="w-3.5 h-3.5 text-accent" />
              <span>Schedule &amp; Rooms</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenPulse();
                setMoreOpen(false);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-surface-2 text-text flex items-center gap-2 transition-colors"
            >
              <IconChart className="w-3.5 h-3.5 text-accent" />
              <span>Office Telemetry</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenHelp();
                setMoreOpen(false);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text flex items-center justify-between transition-colors"
            >
              <span>Controls &amp; Shortcuts</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-bg rounded border border-border">
                ?
              </kbd>
            </button>
          </div>
        </div>
      )}

      {/* Slim Floating Bottom Toolbar (6 core controls) */}
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Virtual office controls"
        {...({ focusgroup: "toolbar wrap" } as Record<string, string>)}
        className="flex items-center gap-1 p-1.5 bg-surface/85 backdrop-blur-xl border border-border/80 rounded-full shadow-arcade"
      >
        <div role="group" aria-label="Audio and video" className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleAudio}
            aria-pressed={!isAudioMuted}
            aria-label="Microphone"
            title={isAudioMuted ? "Unmute Microphone (M)" : "Mute Microphone (M)"}
            className={`min-w-[2.25rem] min-h-[2.25rem] sm:min-w-[2.375rem] sm:min-h-[2.375rem] rounded-full flex items-center justify-center transition-colors border ${
              isAudioMuted
                ? "bg-red-500/20 text-red-400 border-red-500/40"
                : "bg-surface-2/80 text-text border-border/70 hover:border-accent"
            }`}
          >
            {isAudioMuted ? <IconMicOff className="w-4 h-4" /> : <IconMic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleVideo}
            aria-pressed={!isVideoMuted}
            aria-label="Camera"
            title={isVideoMuted ? "Turn On Camera (V)" : "Turn Off Camera (V)"}
            className={`min-w-[2.25rem] min-h-[2.25rem] sm:min-w-[2.375rem] sm:min-h-[2.375rem] rounded-full flex items-center justify-center transition-colors border ${
              isVideoMuted
                ? "bg-red-500/20 text-red-400 border-red-500/40"
                : "bg-surface-2/80 text-text border-border/70 hover:border-accent"
            }`}
          >
            {isVideoMuted ? <IconVideoOff className="w-4 h-4" /> : <IconVideo className="w-4 h-4" />}
          </button>

          {showFlipCamera && onSwitchCamera && (
            <button
              type="button"
              onClick={onSwitchCamera}
              aria-label="Switch camera"
              title="Flip Front / Back Camera"
              className="min-w-[2.25rem] min-h-[2.25rem] sm:min-w-[2.375rem] sm:min-h-[2.375rem] rounded-full flex items-center justify-center transition-colors border bg-surface-2/80 text-text border-border/70 hover:border-accent"
            >
              <IconFlipCamera className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleScreenShare}
            aria-pressed={isScreenSharing}
            aria-label="Share screen"
            title={
              screenShareLocked
                ? "Share Screen (Boss Pro feature)"
                : isScreenSharing
                  ? "Stop Sharing Screen"
                  : "Share Screen"
            }
            className={`relative min-w-[2.25rem] min-h-[2.25rem] sm:min-w-[2.375rem] sm:min-h-[2.375rem] rounded-full flex items-center justify-center transition-colors border ${
              isScreenSharing
                ? "bg-accent text-bg border-accent shadow-sm"
                : screenShareLocked
                  ? "bg-surface-2/60 text-text-muted border-border/50 hover:border-amber-400/70"
                  : "bg-surface-2/80 text-text border-border/70 hover:border-accent"
            }`}
          >
            <IconScreenShare className="w-4 h-4" />
            {screenShareLocked && (
              <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full bg-amber-500 text-black text-[8px] font-display font-extrabold leading-tight">
                PRO
              </span>
            )}
          </button>
        </div>

        <span
          role="separator"
          aria-orientation="vertical"
          className="w-[1px] h-5 bg-border/80 mx-0.5 border-l border-transparent"
        />

        <div role="group" aria-label="Space views and actions" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setReactionsOpen((v) => !v);
              setMoreOpen(false);
            }}
            aria-expanded={reactionsOpen}
            aria-label="Reactions"
            title="Quick Reactions (1–5)"
            className={`min-w-[2.25rem] min-h-[2.25rem] sm:min-w-[2.375rem] sm:min-h-[2.375rem] rounded-full flex items-center justify-center transition-colors border ${
              reactionsOpen
                ? "bg-accent/20 text-accent border-accent"
                : "bg-surface-2/80 text-text border-border/70 hover:border-accent"
            }`}
          >
            <IconSmile className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleViewMode}
            aria-pressed={viewMode !== "2d"}
            aria-label="Switch space view"
            title={`Cycle View: 3D Office / 2D Map / Video Call (current: ${viewMode.toUpperCase()})`}
            className="min-w-[2.25rem] min-h-[2.25rem] sm:min-h-[2.375rem] px-2.5 rounded-full flex items-center gap-1 bg-surface-2/80 hover:bg-surface-2 border border-border/70 hover:border-accent text-text text-[11px] font-display font-bold transition-colors"
          >
            {viewMode === "3d" ? (
              <IconCube className="w-3.5 h-3.5 text-accent" />
            ) : viewMode === "2d" ? (
              <IconMap className="w-3.5 h-3.5 text-accent" />
            ) : (
              <IconVideo className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="uppercase tracking-wider">{viewMode.toUpperCase()}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMoreOpen((v) => !v);
              setReactionsOpen(false);
            }}
            aria-expanded={moreOpen}
            aria-label="More options"
            title="Tools, Themes & Settings"
            className={`min-w-[2.25rem] min-h-[2.25rem] sm:min-w-[2.375rem] sm:min-h-[2.375rem] rounded-full flex items-center justify-center transition-colors border ${
              moreOpen
                ? "bg-accent/20 text-accent border-accent"
                : "bg-surface-2/80 text-text-muted hover:text-text border-border/70 hover:border-accent"
            }`}
          >
            <IconMore className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
