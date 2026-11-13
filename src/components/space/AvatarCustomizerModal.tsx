"use client";

import React, { useState } from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";

interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentColor: string;
  currentStatus: string;
  onSave: (customization: {
    name: string;
    avatarColor: string;
    status: string;
    accessory?: string;
  }) => void;
}

const PRESET_COLORS = [
  { name: "Cyan Teal", hex: "#37E6C4" },
  { name: "Cyber Purple", hex: "#B84DFF" },
  { name: "Coral Flame", hex: "#FF5E7E" },
  { name: "Amber Gold", hex: "#FFB020" },
  { name: "Emerald Mint", hex: "#10B981" },
  { name: "Cobalt Blue", hex: "#3B82F6" },
  { name: "Rose Ruby", hex: "#F43F5E" },
  { name: "Electric Indigo", hex: "#6366F1" },
  { name: "Silver Slate", hex: "#94A3B8" },
  { name: "Obsidian Onyx", hex: "#334155" },
];

const PRESET_ACCESSORIES = [
  { id: "none", name: "None", icon: "👤" },
  { id: "headphones", name: "Focus Cans", icon: "🎧" },
  { id: "glasses", name: "Dev Specs", icon: "👓" },
  { id: "coffee", name: "Espresso Mug", icon: "☕" },
  { id: "cap", name: "Baseball Cap", icon: "🧢" },
  { id: "hardhat", name: "Deploy Helmet", icon: "⛑️" },
  { id: "crown", name: "Release Crown", icon: "👑" },
  { id: "bowtie", name: "Board Bowtie", icon: "🎀" },
];

const QUICK_STATUSES = [
  { label: "Deep Focus 💻", value: "Deep Focus" },
  { label: "In Meeting 🎙️", value: "In Meeting" },
  { label: "Reviewing PRs 🔍", value: "Reviewing PRs" },
  { label: "Coffee Break ☕", value: "Coffee Break" },
  { label: "Deploying 🚀", value: "Deploying" },
  { label: "Lunch AFK 🥪", value: "Lunch AFK" },
  { label: "Available 👋", value: "Available" },
];

export function AvatarCustomizerModal({
  isOpen,
  onClose,
  currentName,
  currentColor,
  currentStatus,
  onSave,
}: AvatarCustomizerModalProps) {
  const [name, setName] = useState(currentName);
  const [color, setColor] = useState(currentColor);
  const [status, setStatus] = useState(currentStatus);
  const [accessory, setAccessory] = useState("none");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim() || "Coworker",
      avatarColor: color,
      status: status.trim() || "Available",
      accessory,
    });
    onClose();
  };

  return (
    <ArcadeDialog isOpen={isOpen} onClose={onClose} title="Customize Your Office Avatar">
      <form onSubmit={handleApply} className="space-y-6">
        {/* Live Avatar Preview Card */}
        <div className="p-4 bg-surface-2 border border-border rounded-xl flex items-center gap-6 justify-center">
          <div className="relative flex flex-col items-center">
            {/* 3D/2D Stylized Avatar Pin */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-arcade border-2 border-white/20 transition-all duration-300"
              style={{ backgroundColor: color }}
            >
              <div className="relative flex items-center justify-center">
                <span className="font-display font-black text-bg text-lg">
                  {name.charAt(0).toUpperCase() || "?"}
                </span>
                {accessory !== "none" && (
                  <span className="absolute -top-3 -right-3 text-lg drop-shadow">
                    {PRESET_ACCESSORIES.find((a) => a.id === accessory)?.icon}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 text-center">
              <div className="font-display font-bold text-sm text-text">
                {name || "Unnamed"}
              </div>
              <div className="text-[11px] font-mono text-accent">
                {status}
              </div>
            </div>
          </div>
        </div>

        {/* Display Name Input */}
        <div>
          <label className="block text-xs font-display font-semibold text-text uppercase tracking-wider mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="e.g. Alice Chen (Staff Eng)"
            className="w-full px-3 py-2 bg-surface border border-border focus:border-accent rounded-control text-text font-sans text-sm outline-none transition-colors"
          />
        </div>

        {/* Color Palette Grid */}
        <div>
          <label className="block text-xs font-display font-semibold text-text uppercase tracking-wider mb-2">
            Suit / Avatar Color
          </label>
          <div className="grid grid-cols-5 gap-2.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => setColor(c.hex)}
                title={c.name}
                className={`h-9 rounded-lg flex items-center justify-center transition-all ${
                  color.toLowerCase() === c.hex.toLowerCase()
                    ? "ring-2 ring-white ring-offset-2 ring-offset-bg scale-105"
                    : "opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.hex }}
              >
                {color.toLowerCase() === c.hex.toLowerCase() && (
                  <span className="text-bg text-xs font-bold">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Accessory Selection */}
        <div>
          <label className="block text-xs font-display font-semibold text-text uppercase tracking-wider mb-2">
            Desk & Headgear Accessory
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_ACCESSORIES.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setAccessory(acc.id)}
                className={`p-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                  accessory === acc.id
                    ? "bg-accent/15 border-accent text-accent"
                    : "bg-surface border-border text-text-muted hover:border-text-muted"
                }`}
              >
                <span className="text-base">{acc.icon}</span>
                <span className="text-[11px] font-display font-semibold truncate">
                  {acc.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Presets & Custom Input */}
        <div>
          <label className="block text-xs font-display font-semibold text-text uppercase tracking-wider mb-2">
            Office Status
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {QUICK_STATUSES.map((qs) => (
              <button
                key={qs.value}
                type="button"
                onClick={() => setStatus(qs.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-display transition-colors ${
                  status === qs.value
                    ? "bg-accent text-bg font-bold shadow-sm"
                    : "bg-surface border border-border text-text hover:bg-surface-2"
                }`}
              >
                {qs.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            maxLength={32}
            placeholder="Custom status (e.g. Syncing in War Room)"
            className="w-full px-3 py-2 bg-surface border border-border focus:border-accent rounded-control text-text font-sans text-xs outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-display font-semibold text-text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-display font-bold bg-accent text-bg rounded-control hover:brightness-110 shadow-arcade transition-all active:scale-95"
          >
            Apply to Avatar
          </button>
        </div>
      </form>
    </ArcadeDialog>
  );
}
