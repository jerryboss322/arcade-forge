"use client";

import React, { useState } from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import { officeAudio } from "@/lib/space/officeAudio";

interface RoomLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  zoneId: string;
  isLocked: boolean;
  onToggleLock: (zoneId: string, passcode?: string) => void;
  onKnockDoor: (zoneId: string) => void;
  isInsideRoom: boolean;
}

export function RoomLockModal({
  isOpen,
  onClose,
  zoneName,
  zoneId,
  isLocked,
  onToggleLock,
  onKnockDoor,
  isInsideRoom,
}: RoomLockModalProps) {
  const [passcode, setPasscode] = useState("");
  const [knockSent, setKnockSent] = useState(false);
  const [enteredCode, setEnteredCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleKnock = () => {
    officeAudio.playDoorKnock();
    onKnockDoor(zoneId);
    setKnockSent(true);
    setTimeout(() => setKnockSent(false), 4000);
  };

  const handleLockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onToggleLock(zoneId, passcode.trim() || undefined);
    officeAudio.playRoomEnterChime();
    onClose();
  };

  return (
    <ArcadeDialog open={isOpen} onClose={onClose} title={`${zoneName} Security & Access`}>
      <div className="space-y-6">
        {/* Status Indicator */}
        <div className="p-4 bg-surface-2 border border-border rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                isLocked
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
              }`}
            >
              {isLocked ? "🔒" : "🔓"}
            </div>
            <div>
              <div className="font-display font-bold text-sm text-text">
                {zoneName} is currently {isLocked ? "LOCKED (Private Session)" : "OPEN to Team"}
              </div>
              <div className="text-[11px] font-mono text-text-muted">
                {isLocked
                  ? "Only invited teammates with code or admitted knocks can enter"
                  : "Anyone on the office floor can walk in and join WebRTC audio"}
              </div>
            </div>
          </div>
        </div>

        {/* Action Section based on position (inside vs outside) */}
        {isInsideRoom ? (
          // Controls for occupant inside room
          <form onSubmit={handleLockSubmit} className="space-y-4">
            <div className="font-display font-semibold text-xs text-text uppercase tracking-wider">
              {isLocked ? "Unlock or Change Room Passcode" : "Lock Room for Confidential Meeting"}
            </div>

            <div>
              <label className="block text-xs font-display text-text-muted mb-1">
                Optional Room Passcode
              </label>
              <input
                type="text"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Leave blank for knock-only admittance"
                className="w-full px-3 py-2 bg-surface border border-border focus:border-accent rounded-control text-text font-mono text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-display text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 text-xs font-display font-bold rounded-control shadow-sm transition-all ${
                  isLocked
                    ? "bg-emerald-500 hover:bg-emerald-400 text-bg"
                    : "bg-red-500 hover:bg-red-400 text-white"
                }`}
              >
                {isLocked ? "🔓 Unlock Room" : "🔒 Lock Room"}
              </button>
            </div>
          </form>
        ) : (
          // Controls for outside coworker approaching locked room
          <div className="space-y-4">
            <div className="text-xs text-text-muted">
              Teammates inside are currently holding a private meeting. You can knock on the glass door to request entry, or enter the room passcode if you have one.
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleKnock}
                disabled={knockSent}
                className="flex-1 py-3 bg-surface border-2 border-accent text-accent hover:bg-accent hover:text-bg font-display font-bold text-xs rounded-control transition-all shadow-arcade flex items-center justify-center gap-2"
              >
                <span>✊</span>
                <span>{knockSent ? "Door Knock Sent!" : "Knock on Door"}</span>
              </button>
            </div>

            {knockSent && (
              <div className="text-xs text-emerald-400 text-center font-mono animate-pulse">
                ✓ Teammates inside heard your knock chime. Please wait for admittance.
              </div>
            )}

            {/* Passcode Unlock */}
            <div className="pt-3 border-t border-border">
              <label className="block text-xs font-display text-text-muted mb-1">
                Have the room keycode?
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={enteredCode}
                  onChange={(e) => {
                    setEnteredCode(e.target.value);
                    setErrorMsg("");
                  }}
                  placeholder="Enter passcode"
                  className="flex-1 px-3 py-2 bg-surface border border-border focus:border-accent rounded-control text-text font-mono text-xs outline-none"
                />
                <button
                  onClick={() => {
                    if (enteredCode === passcode || enteredCode.length > 0) {
                      officeAudio.playRoomEnterChime();
                      onClose();
                    } else {
                      setErrorMsg("Incorrect passcode");
                    }
                  }}
                  className="px-4 py-2 bg-accent text-bg font-display font-bold text-xs rounded-control hover:brightness-110"
                >
                  Enter
                </button>
              </div>
              {errorMsg && (
                <div className="text-xs text-red-400 mt-1">{errorMsg}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </ArcadeDialog>
  );
}
