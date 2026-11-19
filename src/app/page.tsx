"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import { IsometricOfficeHero } from "@/components/home/IsometricOfficeHero";
import { SpatialAudioDemo } from "@/components/home/SpatialAudioDemo";
import { IconArrowRight, IconLock, IconPlus } from "@/components/ui/Icons";

interface FloorEntry {
  index: string;
  slug: string;
  name: string;
  note: string;
  rooms: string;
}

const FLOOR_DIRECTORY: FloorEntry[] = [
  {
    index: "F1",
    slug: "acme-hq",
    name: "Acme Tech HQ",
    note: "Open workstation pods beside a soundproof glass boardroom, brainstorm war room, and espresso bar.",
    rooms: "Boardroom · War Room · 12 Desks",
  },
  {
    index: "F2",
    slug: "indie-studio",
    name: "Indie Dev Studio",
    note: "Product loft with wall whiteboards for sprints, critique tables, and a quiet corner lounge.",
    rooms: "Design Pods · Sticky Wall · Lounge",
  },
  {
    index: "F3",
    slug: "study-cafe",
    name: "Late Night Cafe",
    note: "Heads-down study tables paired with soft synthesized ambient vinyl beats.",
    rooms: "Focus Tables · Whisper Booth · Radio",
  },
  {
    index: "F4",
    slug: "hacker-den",
    name: "Standup & Demo Floor",
    note: "Built for fast morning syncs, pair debugging, and dropping a live screen onto the main wall.",
    rooms: "Presentation Wall · Standup Circle",
  },
];

function RoomSign({ number, room }: { number: string; room: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 px-3 py-1 border border-white/15 bg-surface text-[11px] font-mono uppercase tracking-[0.16em] text-text">
      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
      <span className="text-accent font-semibold">{number}</span>
      <span className="text-white/25">/</span>
      <span>{room}</span>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceSlug, setNewSpaceSlug] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("startup");

  const handleNameChange = (val: string) => {
    setNewSpaceName(val);
    setNewSpaceSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceSlug.trim()) return;
    setCreateModalOpen(false);
    router.push(`/space/${newSpaceSlug.trim()}`);
  };

  return (
    <div className="min-w-0">
      {/* ROOM 01 · LOBBY HERO — The Isometric Office Itself Bleeds Off-Canvas */}
      <section className="relative overflow-hidden border-b border-white/[0.08] bg-bg">
        <div className="max-w-[1320px] mx-auto px-4 md:px-8 pt-10 md:pt-16 pb-10 lg:pb-16 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-6 lg:gap-0">
            {/* Left Copy Directly on Page */}
            <div className="lg:col-span-6 relative z-10 space-y-6 lg:pr-6">
              <RoomSign number="Lobby" room="Check-In Desk" />

              <h1
                className="font-display font-extrabold text-text tracking-[-0.03em] leading-[1.03]"
                style={{ fontSize: "clamp(2.4rem, 1.4rem + 4.1vw, 4.5rem)" }}
              >
                Walk up to your teammate. Talk. Walk away.
              </h1>

              <p className="text-text-muted text-base sm:text-lg leading-relaxed max-w-lg">
                No calendar links. No waiting rooms. Open your team&apos;s office in a browser tab, pull up to a desk for a two-minute question, or shut the glass door when you want quiet.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(true)}
                  className="px-6 py-3 bg-accent text-bg font-display font-bold text-sm rounded-control shadow-arcade-sm hover:brightness-110 active:scale-[0.99] transition-all inline-flex items-center gap-2"
                >
                  <IconPlus className="w-4 h-4" />
                  <span>Open Your Office</span>
                </button>

                <Link
                  href="/space/acme-hq"
                  className="px-5 py-3 border border-white/15 hover:border-accent text-text font-medium text-sm rounded-control transition-colors inline-flex items-center gap-2"
                >
                  <span>Walk Demo Floor</span>
                  <IconArrowRight className="w-4 h-4 text-accent" />
                </Link>
              </div>

              <p className="font-mono text-xs sm:text-sm text-text pt-3 border-t border-white/[0.08] max-w-md">
                Free for 4 people. No install.
              </p>
            </div>

            {/* Right: Oversized Isometric Office Scene Bleeding Off Right & Bottom Edge */}
            <div className="lg:col-span-6 relative lg:-mr-28 xl:-mr-40 lg:-mb-16">
              <IsometricOfficeHero />
            </div>
          </div>
        </div>
      </section>

      {/* ROOM 02 · SPATIAL AUDIO DEMO — Unboxed Editorial Soundstage */}
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-16 md:py-24 space-y-10">
        <div className="max-w-2xl space-y-3">
          <RoomSign number="Boardroom" room="Acoustic Test" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-[-0.02em]">
            Distance sets the volume. Glass cuts it to zero.
          </h2>
          <p className="text-sm sm:text-base text-text-muted leading-relaxed">
            In a video call, everyone talks over everyone at one volume. Here, walking two steps closer fades your coworker up naturally—and crossing into a glass conference room seals the audio automatically.
          </p>
        </div>

        <SpatialAudioDemo />
      </section>

      {/* ROOM 03 · OPEN FLOORS — Broken Out of Cards Into an Architectural Floor Index */}
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-14 md:py-20 border-t border-white/[0.08] space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-3">
            <RoomSign number="Directory" room="Ready Floors" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-[-0.02em]">
              Step onto any floor right now.
            </h2>
          </div>
          <Link
            href="/spaces"
            className="text-xs font-mono text-accent hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>All 6 blueprints</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FLOOR_DIRECTORY.map((floor) => (
            <Link
              key={floor.slug}
              href={`/space/${floor.slug}`}
              className="group grid grid-cols-1 md:grid-cols-12 items-baseline gap-3 md:gap-6 py-6 hover:bg-white/[0.02] px-2 -mx-2 transition-colors"
            >
              <div className="md:col-span-1 font-mono text-xs text-accent">
                {floor.index}
              </div>
              <div className="md:col-span-3 font-display text-xl font-bold text-text group-hover:text-accent transition-colors">
                {floor.name}
              </div>
              <div className="md:col-span-5 text-sm text-text-muted leading-relaxed">
                {floor.note}
              </div>
              <div className="md:col-span-3 flex items-center md:justify-end gap-3 text-xs font-mono text-text-muted">
                <span className="truncate">{floor.rooms}</span>
                <IconArrowRight className="w-4 h-4 text-accent shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ROOM 04 · WAR ROOM — Uneven Staggered Split Directly on Canvas */}
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-16 md:py-24 border-t border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-5 space-y-5">
            <RoomSign number="War Room" room="How Teams Work Here" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-[-0.02em] leading-[1.08]">
              Quiet when you are coding. Ready the second someone walks over.
            </h2>
            <p className="text-sm sm:text-base text-text-muted leading-relaxed">
              Every detail exists so quick teammate questions don&apos;t turn into another 30-minute video invite.
            </p>
            <div className="pt-2 flex flex-wrap gap-5 text-xs font-mono">
              <Link href="/features" className="text-accent hover:underline">
                Room controls →
              </Link>
              <Link href="/whiteboard" className="text-text hover:text-accent">
                War Room Whiteboard →
              </Link>
              <Link href="/admin" className="text-text hover:text-accent">
                Keyholder Console →
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-12">
            <div className="border-t border-accent/50 pt-4 space-y-2">
              <span className="font-mono text-[11px] text-accent">01 · Desks</span>
              <h3 className="font-display text-lg font-bold text-text">
                Claim your own workstation
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Leave your status visible—Heads Down, Pair Ready, or Away—so teammates see your context before they walk over.
              </p>
            </div>

            <div className="border-t border-white/15 pt-4 space-y-2 sm:mt-10">
              <span className="font-mono text-[11px] text-accent">02 · Glass Doors</span>
              <h3 className="font-display text-lg font-bold text-text">
                Soundproof meeting rooms
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Walk into the Glass Boardroom or War Room to keep private reviews inside four walls. Lock the room or listen for a knock chime.
              </p>
            </div>

            <div className="border-t border-white/15 pt-4 space-y-2">
              <span className="font-mono text-[11px] text-accent">03 · Buzzer Links</span>
              <h3 className="font-display text-lg font-bold text-text">
                Zero employee accounts
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Only the team admin creates a Keyholder login. Teammates open the passcode link you share and land straight onto the floor.
              </p>
            </div>

            <div className="border-t border-white/15 pt-4 space-y-2 sm:mt-10">
              <span className="font-mono text-[11px] text-accent">04 · Screen &amp; Call</span>
              <h3 className="font-display text-lg font-bold text-text">
                Flip to a clean call grid anytime
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Stay walking in 3D isometric space or expand into a focused video stage with live screen sharing and camera flip in one tap.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ROOM 05 · BOARDROOM LEDGER — Plain Comparison + Direct CTA */}
      <section className="max-w-[1320px] mx-auto px-4 md:px-8 py-14 md:py-20 border-t border-white/[0.08] space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-3">
            <RoomSign number="Boardroom" room="Simple Math" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-text tracking-[-0.02em]">
              Stop paying per head just to sit near coworkers.
            </h2>
          </div>
          <Link
            href="/pricing"
            className="text-xs font-mono text-accent hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>See full rate breakdown</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-text-muted font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 pr-4">Detail</th>
                <th className="py-3 px-4 text-accent">ForgeSpace</th>
                <th className="py-3 px-4">Gather.town</th>
                <th className="py-3 pl-4">Zoom / Slack Huddles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08] text-text">
              <tr>
                <td className="py-4 pr-4 font-medium">Team cost</td>
                <td className="py-4 px-4 text-accent font-semibold">
                  Free for 4 people · $9/mo flat Pro
                </td>
                <td className="py-4 px-4 text-text-muted">$7 per user / mo</td>
                <td className="py-4 pl-4 text-text-muted">$13+ per user / mo</td>
              </tr>
              <tr>
                <td className="py-4 pr-4 font-medium">Teammate signups</td>
                <td className="py-4 px-4 font-medium">None — passcode link only</td>
                <td className="py-4 px-4 text-text-muted">Per-user login required</td>
                <td className="py-4 pl-4 text-text-muted">Workspace account needed</td>
              </tr>
              <tr>
                <td className="py-4 pr-4 font-medium">Audio &amp; walls</td>
                <td className="py-4 px-4 font-medium">Distance fade + glass rooms</td>
                <td className="py-4 px-4 text-text-muted">Distance fade + rooms</td>
                <td className="py-4 pl-4 text-text-muted">Separate breakout rooms</td>
              </tr>
              <tr>
                <td className="py-4 pr-4 font-medium">3D Isometric Space</td>
                <td className="py-4 px-4 font-medium">WebGL 3D + 2D + Call view</td>
                <td className="py-4 px-4 text-text-muted">2D sprite map only</td>
                <td className="py-4 pl-4 text-text-muted">Flat camera grid</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Open Floor Modal */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Open a New Office Floor"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateSpace} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Team or Studio Name
            </label>
            <input
              type="text"
              required
              value={newSpaceName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Studio Fourth Floor"
              maxLength={40}
              className="w-full px-3.5 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Door Buzzer Address
            </label>
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <span className="select-none">Knock: /space/</span>
              <input
                type="text"
                required
                value={newSpaceSlug}
                onChange={(e) => setNewSpaceSlug(e.target.value)}
                placeholder="studio-fourth-floor"
                className="flex-1 px-3 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text focus:outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Floor Layout
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text focus:outline-none focus:border-accent"
            >
              <option value="startup">Main Tech Floor (12 Desks + Glass Boardroom)</option>
              <option value="studio">Creative Loft (Whiteboard + War Room)</option>
              <option value="cafe">Late Night Study Cafe</option>
            </select>
          </div>

          <div className="p-3.5 bg-surface-2/70 border border-white/[0.08] rounded-control text-xs text-text-muted space-y-1.5">
            <span className="font-semibold text-text flex items-center gap-1.5">
              <IconLock className="w-3.5 h-3.5 text-accent" />
              <span>Want a passcode-locked link for your team?</span>
            </span>
            <p className="text-[11px] leading-relaxed">
              Generate persistent passworded office links in the{" "}
              <Link
                href="/admin"
                onClick={() => setCreateModalOpen(false)}
                className="text-accent font-medium hover:underline"
              >
                Keyholder Console →
              </Link>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text rounded-control transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs bg-accent text-bg font-display font-bold rounded-control shadow-arcade-sm hover:brightness-110 inline-flex items-center gap-1.5"
            >
              <span>Step Inside</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </div>
  );
}
