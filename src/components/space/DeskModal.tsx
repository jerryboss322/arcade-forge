"use client";

import React, { useState } from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import { InteractiveObject } from "@/lib/space/officeMap";

interface DeskModalProps {
  open: boolean;
  onClose: () => void;
  desk: InteractiveObject | null;
  currentStatus: string;
  isClaimedByMe: boolean;
  onClaim: (deskId: string, status: string) => void;
  onRelease: (deskId: string) => void;
  onUpdateStatus: (status: string) => void;
}

const STATUS_PRESETS = [
  { label: "🎧 Deep Focus (Do Not Disturb)", status: "Deep Focus", icon: "🎧" },
  { label: "☕ Coffee Break", status: "Coffee Break", icon: "☕" },
  { label: "📅 In a Meeting", status: "In Meeting", icon: "📅" },
  { label: "🥪 Out for Lunch", status: "Out for Lunch", icon: "🥪" },
  { label: "💻 Reviewing Pull Requests", status: "Reviewing PRs", icon: "💻" },
  { label: "🎮 Breakroom Arcade", status: "Arcade", icon: "🎮" },
];

export function DeskModal({
  open,
  onClose,
  desk,
  currentStatus,
  isClaimedByMe,
  onClaim,
  onRelease,
  onUpdateStatus,
}: DeskModalProps) {
  const [customStatus, setCustomStatus] = useState(currentStatus || "");

  if (!desk) return null;

  const handleSelectPreset = (statusText: string) => {
    setCustomStatus(statusText);
    onUpdateStatus(statusText);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStatus.trim()) {
      onUpdateStatus(customStatus.trim());
      onClose();
    }
  };

  return (
    <ArcadeDialog
      open={open}
      onClose={onClose}
      title={`🖥️ ${desk.name}`}
      maxWidthClass="max-w-md"
    >
      <div className="space-y-4">
        <div className="p-3 bg-surface-2 rounded-control border border-border">
          <p className="text-xs text-text-muted mb-1">Workstation Assignment:</p>
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-semibold text-text">
              {isClaimedByMe ? "Claimed by You" : "Available Desk"}
            </span>
            {isClaimedByMe ? (
              <button
                onClick={() => {
                  onRelease(desk.id);
                  onClose();
                }}
                className="px-2.5 py-1 text-xs bg-accent-2/20 text-accent-2 border border-accent-2/40 rounded-control hover:bg-accent-2/30"
              >
                Release Desk
              </button>
            ) : (
              <button
                onClick={() => {
                  onClaim(desk.id, customStatus || "Focusing");
                  onClose();
                }}
                className="px-3 py-1 text-xs bg-accent text-bg font-display font-bold rounded-control hover:brightness-110"
              >
                Claim This Desk
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-display text-text mb-2">
            Quick Status Presets:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_PRESETS.map((p) => (
              <button
                key={p.status}
                type="button"
                onClick={() => handleSelectPreset(p.status)}
                className={`px-2.5 py-2 text-left rounded-control text-xs border transition-colors flex items-center gap-2 ${
                  customStatus === p.status
                    ? "bg-accent/15 border-accent text-accent font-semibold"
                    : "bg-surface-2 border-border text-text hover:bg-surface"
                }`}
              >
                <span>{p.icon}</span>
                <span className="truncate">{p.status}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSaveCustom} className="space-y-2 pt-2 border-t border-border">
          <label className="block text-xs font-display text-text">
            Custom Status Message:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="e.g. Shipping the v2 release..."
              maxLength={40}
              className="flex-1 px-3 py-1.5 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs bg-accent text-bg font-display font-bold rounded-control hover:brightness-110"
            >
              Set
            </button>
          </div>
        </form>
      </div>
    </ArcadeDialog>
  );
}
