"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import { OFFICE_STATUS_PRESETS } from "@/lib/space/officeReactions";
import { IconMic, IconMicOff, IconVideo, IconVideoOff } from "@/components/space/SpaceIcons";

const AVATAR_COLORS = [
  "#37E6C4",
  "#FF4D8D",
  "#FFC53D",
  "#818CF8",
  "#34D399",
  "#FB923C",
];

interface PreJoinLobbyModalProps {
  open: boolean;
  spaceName: string;
  initialName: string;
  initialColor: string;
  initialStatus: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onConfirm: (config: { name: string; avatarColor: string; status: string }) => void;
  onClose: () => void;
}

export function PreJoinLobbyModal({
  open,
  spaceName,
  initialName,
  initialColor,
  initialStatus,
  isAudioEnabled,
  isVideoEnabled,
  localStream,
  onToggleAudio,
  onToggleVideo,
  onConfirm,
  onClose,
}: PreJoinLobbyModalProps) {
  const [name, setName] = useState(initialName);
  const [avatarColor, setAvatarColor] = useState(initialColor);
  const [status, setStatus] = useState(initialStatus);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setName(initialName);
    setAvatarColor(initialColor);
    setStatus(initialStatus);
  }, [initialName, initialColor, initialStatus]);

  useEffect(() => {
    const videoEl = previewVideoRef.current;
    if (!videoEl) return;
    if (localStream && isVideoEnabled) {
      videoEl.srcObject = localStream;
    } else {
      videoEl.srcObject = null;
    }
  }, [localStream, isVideoEnabled, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      name: name.trim() || initialName,
      avatarColor,
      status,
    });
  };

  return (
    <ArcadeDialog
      open={open}
      onClose={onClose}
      title={`Join ${spaceName}`}
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Live Camera / Avatar Preview */}
        <div className="relative h-44 rounded-control bg-bg border border-border overflow-hidden flex items-center justify-center">
          {localStream && isVideoEnabled ? (
            <video
              ref={previewVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-display text-lg font-bold text-bg shadow-arcade"
                style={{ backgroundColor: avatarColor }}
              >
                {(name || "CO").slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs text-text-muted">Camera off — avatar shown on floor</span>
            </div>
          )}

          {/* Device Quick Toggle Strip */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAudio}
              className={`px-3 py-1.5 rounded-full text-xs font-display font-semibold flex items-center gap-1.5 border shadow-sm transition-colors ${
                isAudioEnabled
                  ? "bg-surface/90 text-text border-border hover:border-accent"
                  : "bg-red-500/20 text-red-300 border-red-500/50"
              }`}
            >
              {isAudioEnabled ? <IconMic className="w-3.5 h-3.5" /> : <IconMicOff className="w-3.5 h-3.5" />}
              <span>{isAudioEnabled ? "Mic On" : "Muted"}</span>
            </button>

            <button
              type="button"
              onClick={onToggleVideo}
              className={`px-3 py-1.5 rounded-full text-xs font-display font-semibold flex items-center gap-1.5 border shadow-sm transition-colors ${
                isVideoEnabled
                  ? "bg-surface/90 text-text border-border hover:border-accent"
                  : "bg-red-500/20 text-red-300 border-red-500/50"
              }`}
            >
              {isVideoEnabled ? <IconVideo className="w-3.5 h-3.5" /> : <IconVideoOff className="w-3.5 h-3.5" />}
              <span>{isVideoEnabled ? "Cam On" : "Cam Off"}</span>
            </button>
          </div>
        </div>

        {/* Display Name & Suit Color */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="lobby-name" className="text-[11px] font-display text-text-muted uppercase">
              Display Name
            </label>
            <input
              id="lobby-name"
              type="text"
              maxLength={24}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
            />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-display text-text-muted uppercase block">
              Suit Color
            </span>
            <div className="flex items-center gap-2 pt-1">
              {AVATAR_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setAvatarColor(hex)}
                  aria-label={`Select color ${hex}`}
                  style={{ backgroundColor: hex }}
                  className={`w-6 h-6 rounded-full transition-transform ${
                    avatarColor === hex ? "ring-2 ring-white scale-110" : "opacity-80 hover:opacity-100"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Initial Status Preset */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-display text-text-muted uppercase block">
            Current Availability
          </span>
          <div className="flex flex-wrap gap-1.5">
            {OFFICE_STATUS_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setStatus(preset)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-display border transition-colors ${
                  status === preset
                    ? "bg-accent text-bg font-bold border-accent"
                    : "bg-surface-2 text-text-muted hover:text-text border-border"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Enter Office CTA */}
        <div className="pt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-display text-text-muted hover:text-text bg-surface-2 border border-border rounded-control"
          >
            Skip
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-display font-bold bg-accent text-bg rounded-control hover:brightness-110"
          >
            Enter Virtual Office
          </button>
        </div>
      </form>
    </ArcadeDialog>
  );
}
