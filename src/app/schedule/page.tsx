"use client";

import React, { useState } from "react";
import Link from "next/link";

interface ScheduledMeeting {
  id: string;
  title: string;
  roomName: string;
  roomSlug: string;
  timeSlot: string;
  durationMinutes: number;
  host: string;
  attendees: string[];
  agenda: string[];
  isLocked: boolean;
}

const INITIAL_SCHEDULE: ScheduledMeeting[] = [
  {
    id: "sync-1",
    title: "Daily Engineering Standup & PR Triage",
    roomName: "Glass Boardroom",
    roomSlug: "acme-hq",
    timeSlot: "09:30 AM",
    durationMinutes: 30,
    host: "Sarah (Engineering Lead)",
    attendees: ["Sarah", "Alice", "Bob", "Frank", "Carol"],
    agenda: [
      "Review sprint burndown & milestone progress",
      "Demo Three.js 3D isometric WebGL canvas floor",
      "Review spatial audio falloff curves",
    ],
    isLocked: false,
  },
  {
    id: "sync-2",
    title: "Sprint War Room: Q3 Architecture Deep Dive",
    roomName: "Sprint War Room",
    roomSlug: "acme-hq",
    timeSlot: "11:00 AM",
    durationMinutes: 60,
    host: "Alice (Staff Architect)",
    attendees: ["Alice", "Bob", "Dave"],
    agenda: [
      "P2P WebRTC data channel mesh topology",
      "Neon zero-write scale-to-zero verification",
      "Interactive whiteboard vector serialization",
    ],
    isLocked: true,
  },
  {
    id: "sync-3",
    title: "Product Design Critique & Wireframes",
    roomName: "Indie Studio Loft",
    roomSlug: "indie-studio",
    timeSlot: "02:00 PM",
    durationMinutes: 45,
    host: "Carol (Product Lead)",
    attendees: ["Carol", "Sarah", "Eve"],
    agenda: [
      "Review avatar customizer accessories & suit palettes",
      "Figma theater mode screen share test",
    ],
    isLocked: false,
  },
  {
    id: "sync-4",
    title: "After-Hours Lo-Fi Cafe Social & Demos",
    roomName: "Lo-Fi Cafe Lounge",
    roomSlug: "study-cafe",
    timeSlot: "05:00 PM",
    durationMinutes: 45,
    host: "All Hands",
    attendees: ["Everyone Welcome"],
    agenda: [
      "Share favorite coding tunes",
      "Watercooler chit-chat and weekend plans",
    ],
    isLocked: false,
  },
];

export default function SchedulePage() {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>(INITIAL_SCHEDULE);
  const [isBooking, setIsBooking] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newRoom, setNewRoom] = useState("Glass Boardroom");
  const [newTime, setNewTime] = useState("03:30 PM");
  const [newDuration, setNewDuration] = useState(30);
  const [newHost, setNewHost] = useState("");
  const [newAgenda, setNewAgenda] = useState("");

  const handleBookRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const agendaItems = newAgenda
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const created: ScheduledMeeting = {
      id: `sync-${Date.now()}`,
      title: newTitle.trim(),
      roomName: newRoom,
      roomSlug: "acme-hq",
      timeSlot: newTime,
      durationMinutes: Number(newDuration),
      host: newHost.trim() || "Team Member",
      attendees: [newHost.trim() || "Host"],
      agenda: agendaItems.length > 0 ? agendaItems : ["General team sync"],
      isLocked: false,
    };

    setMeetings((prev) => [...prev, created]);
    setIsBooking(false);
    setNewTitle("");
    setNewHost("");
    setNewAgenda("");
  };

  return (
    <div className="py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
            Office Calendar
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text uppercase tracking-tight">
            Meeting Schedule & Room Bookings
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-1 max-w-2xl">
            View today&apos;s team syncs, reserve soundproof conference pods, and warp straight to room locations in 3D.
          </p>
        </div>

        <button
          onClick={() => setIsBooking(!isBooking)}
          className="px-5 py-2.5 bg-accent text-bg font-display font-bold text-xs md:text-sm rounded-control shadow-arcade hover:brightness-110 active:scale-95 transition-all self-start md:self-auto flex items-center gap-1.5"
        >
          <span>{isBooking ? "✕ Cancel Booking" : "+ Book Collaboration Room"}</span>
        </button>
      </div>

      {/* Booking Form (Collapsible) */}
      {isBooking && (
        <form
          onSubmit={handleBookRoom}
          className="p-6 bg-surface border-2 border-accent rounded-container shadow-arcade space-y-4 animate-fadeIn"
        >
          <div className="font-display font-bold text-sm uppercase tracking-wider text-accent">
            Reserve a Conference Space
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-display font-semibold text-text mb-1">
                Meeting Title:
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Design Architecture Review"
                className="w-full px-3 py-2 bg-surface-2 border border-border focus:border-accent rounded-control text-xs font-sans text-text outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-display font-semibold text-text mb-1">
                Host / Organizer Name:
              </label>
              <input
                type="text"
                required
                value={newHost}
                onChange={(e) => setNewHost(e.target.value)}
                placeholder="e.g. Alex (Frontend Lead)"
                className="w-full px-3 py-2 bg-surface-2 border border-border focus:border-accent rounded-control text-xs font-sans text-text outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-display font-semibold text-text mb-1">
                Room:
              </label>
              <select
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                className="w-full px-3 py-2 bg-surface-2 border border-border focus:border-accent rounded-control text-xs font-sans text-text outline-none"
              >
                <option value="Glass Boardroom">Glass Boardroom (12 Seats, Soundproof)</option>
                <option value="Sprint War Room">Sprint War Room (8 Seats, Whiteboard)</option>
                <option value="Lo-Fi Cafe Lounge">Lo-Fi Cafe Lounge (Casual)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-display font-semibold text-text mb-1">
                Start Time:
              </label>
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="e.g. 03:00 PM"
                className="w-full px-3 py-2 bg-surface-2 border border-border focus:border-accent rounded-control text-xs font-sans text-text outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-display font-semibold text-text mb-1">
                Duration (minutes):
              </label>
              <input
                type="number"
                min={10}
                max={180}
                value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-surface-2 border border-border focus:border-accent rounded-control text-xs font-sans text-text outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-display font-semibold text-text mb-1">
              Agenda Bullets (one per line):
            </label>
            <textarea
              rows={3}
              value={newAgenda}
              onChange={(e) => setNewAgenda(e.target.value)}
              placeholder="- Blocker triage&#10;- Architecture demo&#10;- Action items"
              className="w-full px-3 py-2 bg-surface-2 border border-border focus:border-accent rounded-control text-xs font-sans text-text outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setIsBooking(false)}
              className="px-4 py-2 text-xs font-display text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-display font-bold bg-accent text-bg rounded-control shadow-sm hover:brightness-110"
            >
              Confirm Room Booking
            </button>
          </div>
        </form>
      )}

      {/* Scheduled Meetings List */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-bold text-text uppercase tracking-wide">
          Today&apos;s Confirmed Sessions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="p-6 rounded-container border-2 border-border bg-surface hover:border-accent shadow-arcade transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-accent/15 text-accent border border-accent/30 font-semibold uppercase">
                      {meeting.timeSlot} • {meeting.durationMinutes} min
                    </span>
                    <h3 className="font-display text-base font-bold text-text mt-2">
                      {meeting.title}
                    </h3>
                  </div>

                  {meeting.isLocked && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                      <span>🔒</span> Private
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span>📍 {meeting.roomName}</span>
                  <span>•</span>
                  <span>Host: {meeting.host}</span>
                </div>

                {/* Agenda */}
                {meeting.agenda.length > 0 && (
                  <div className="p-3 bg-surface-2 rounded-xl border border-border/80 space-y-1.5">
                    <span className="text-[10px] font-mono uppercase text-text-muted block font-semibold">
                      Agenda:
                    </span>
                    <ul className="space-y-1">
                      {meeting.agenda.map((item, idx) => (
                        <li key={idx} className="text-xs text-text/80 flex items-start gap-1.5">
                          <span className="text-accent text-[10px] mt-0.5">▸</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="text-[11px] font-mono text-text-muted">
                  {meeting.attendees.length} Attendees
                </div>
                <Link
                  href={`/space/${meeting.roomSlug}`}
                  className="px-4 py-2 bg-accent text-bg font-display font-bold text-xs rounded-control shadow-sm hover:brightness-110 flex items-center gap-1.5"
                >
                  <span>🚀 Warp to Room</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
