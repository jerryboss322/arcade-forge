"use client";

import React, { useState } from "react";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import { officeAudio } from "@/lib/space/officeAudio";

export interface ScheduledMeeting {
  id: string;
  title: string;
  roomName: string;
  zoneId: string;
  startTime: string; // e.g. "10:00 AM"
  durationMinutes: number;
  host: string;
  agenda: string[];
  attendeeCount: number;
}

interface MeetingScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWarpToZone: (zoneId: string) => void;
  userName: string;
}

const INITIAL_MEETINGS: ScheduledMeeting[] = [
  {
    id: "meet-1",
    title: "Daily Engineering Sync & PR Review",
    roomName: "Glass Boardroom",
    zoneId: "boardroom",
    startTime: "09:30 AM",
    durationMinutes: 30,
    host: "Sarah (Engineering Lead)",
    agenda: [
      "Review sprint burndown & blocker triage",
      "Demo Three.js 3D isometric office floor",
      "P2P WebRTC zero-bandwidth cost architecture review",
    ],
    attendeeCount: 6,
  },
  {
    id: "meet-2",
    title: "Sprint War Room: Milestone Planning",
    roomName: "War Room",
    zoneId: "war_room",
    startTime: "02:00 PM",
    durationMinutes: 45,
    host: "Alex (Product Manager)",
    agenda: [
      "Q3 Remote work features roadmap",
      "Gather.town vs ForgeSpace cost comparison",
      "Audio spatial synthesis fine-tuning",
    ],
    attendeeCount: 4,
  },
  {
    id: "meet-3",
    title: "Casual Coffee & Lo-Fi Lounge Chat",
    roomName: "Lo-Fi Cafe Lounge",
    zoneId: "cafe_lounge",
    startTime: "04:30 PM",
    durationMinutes: 20,
    host: "Office Team",
    agenda: ["Catchup on side projects", "Share favorite coding tracks"],
    attendeeCount: 3,
  },
];

export function MeetingScheduleModal({
  isOpen,
  onClose,
  onWarpToZone,
  userName,
}: MeetingScheduleModalProps) {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>(INITIAL_MEETINGS);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRoom, setNewRoom] = useState<"boardroom" | "war_room" | "cafe_lounge">("boardroom");
  const [newTime, setNewTime] = useState("11:00 AM");
  const [newDuration, setNewDuration] = useState(30);
  const [newAgenda, setNewAgenda] = useState("");

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const roomName =
      newRoom === "boardroom"
        ? "Glass Boardroom"
        : newRoom === "war_room"
        ? "War Room"
        : "Lo-Fi Cafe Lounge";

    const agendaItems = newAgenda
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const created: ScheduledMeeting = {
      id: `meet_${Date.now()}`,
      title: newTitle.trim(),
      roomName,
      zoneId: newRoom,
      startTime: newTime,
      durationMinutes: Number(newDuration),
      host: userName,
      agenda: agendaItems.length > 0 ? agendaItems : ["General team discussion"],
      attendeeCount: 1,
    };

    setMeetings((prev) => [...prev, created]);
    officeAudio.playRoomEnterChime();
    setIsCreating(false);
    setNewTitle("");
    setNewAgenda("");
  };

  return (
    <ArcadeDialog open={isOpen} onClose={onClose} title="Office Schedule & Meeting Rooms">
      <div className="space-y-6">
        {/* Header Tabs & Actions */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📅</span>
            <div>
              <div className="font-display font-bold text-sm text-text">
                Today's Office Syncs
              </div>
              <div className="text-[11px] font-mono text-text-muted">
                Schedule and warp directly to private collaboration rooms
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1.5 text-xs font-display font-semibold bg-accent text-bg rounded-control hover:brightness-110 flex items-center gap-1 shadow-sm"
          >
            <span>{isCreating ? "✕ Cancel" : "+ Book Room"}</span>
          </button>
        </div>

        {/* Room Booking Form (Collapsible) */}
        {isCreating && (
          <form
            onSubmit={handleCreateMeeting}
            className="p-4 bg-surface-2 border-2 border-accent/40 rounded-xl space-y-4 animate-fadeIn"
          >
            <div className="font-display font-bold text-xs uppercase tracking-wider text-accent">
              Book a Collaboration Space
            </div>

            <div>
              <label className="block text-xs font-display font-semibold text-text mb-1">
                Meeting Title
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Design Architecture Review"
                className="w-full px-3 py-1.5 bg-surface border border-border focus:border-accent rounded-control text-text font-sans text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-display font-semibold text-text mb-1">
                  Room
                </label>
                <select
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value as typeof newRoom)}
                  className="w-full px-3 py-1.5 bg-surface border border-border focus:border-accent rounded-control text-text font-sans text-xs outline-none"
                >
                  <option value="boardroom">Glass Boardroom (12 Seats)</option>
                  <option value="war_room">War Room (8 Seats)</option>
                  <option value="cafe_lounge">Lo-Fi Cafe (Open)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-text mb-1">
                  Start Time
                </label>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  placeholder="e.g. 11:30 AM"
                  className="w-full px-3 py-1.5 bg-surface border border-border focus:border-accent rounded-control text-text font-sans text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-semibold text-text mb-1">
                  Duration (min)
                </label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-surface border border-border focus:border-accent rounded-control text-text font-sans text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-display font-semibold text-text mb-1">
                Agenda Bullets (one per line)
              </label>
              <textarea
                rows={3}
                value={newAgenda}
                onChange={(e) => setNewAgenda(e.target.value)}
                placeholder="- Topic 1&#10;- Topic 2&#10;- Action items"
                className="w-full px-3 py-1.5 bg-surface border border-border focus:border-accent rounded-control text-text font-sans text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 text-xs font-display text-text-muted hover:text-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-display font-bold bg-accent text-bg rounded-control hover:brightness-110 shadow-sm"
              >
                Confirm Room Booking
              </button>
            </div>
          </form>
        )}

        {/* Scheduled Meetings List */}
        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="p-3.5 bg-surface border border-border hover:border-accent/60 rounded-xl transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-text">
                      {meeting.title}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-accent/15 text-accent border border-accent/30 font-semibold">
                      {meeting.startTime} ({meeting.durationMinutes}m)
                    </span>
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2">
                    <span>📍 {meeting.roomName}</span>
                    <span>•</span>
                    <span>Host: {meeting.host}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onWarpToZone(meeting.zoneId);
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-display font-bold bg-surface-2 hover:bg-accent hover:text-bg border border-border text-text rounded-control transition-all flex items-center gap-1 flex-shrink-0"
                >
                  <span>🚀 Warp Here</span>
                </button>
              </div>

              {/* Agenda items */}
              {meeting.agenda.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-border/60">
                  <div className="text-[10px] font-display font-semibold uppercase text-text-muted mb-1">
                    Agenda:
                  </div>
                  <ul className="space-y-1">
                    {meeting.agenda.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-text/80 flex items-start gap-1.5"
                      >
                        <span className="text-accent text-[10px] mt-0.5">▸</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="text-[11px] font-mono text-text-muted text-center pt-2 border-t border-border">
          Soundproof partitions isolate room audio automatically when entering.
        </div>
      </div>
    </ArcadeDialog>
  );
}
