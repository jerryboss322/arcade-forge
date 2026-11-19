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
    note: "Open workstation pods beside a soundproof glass boardroom and espresso bar.",
    rooms: "12 Desks · Boardroom",
  },
  {
    index: "F2",
    slug: "indie-studio",
    name: "Indie Dev Studio",
    note: "Product loft with wall whiteboards for sprints and quiet critique rooms.",
    rooms: "8 Desks · War Room",
  },
  {
    index: "F3",
    slug: "study-cafe",
    name: "Late Night Cafe",
    note: "Quiet coworking tables paired with soft ambient lo-fi beats.",
    rooms: "10 Desks · Radio",
  },
  {
    index: "F4",
    slug: "hacker-den",
    name: "Standup & Demo Floor",
    note: "Built for fast morning syncs and dropping a live screen onto the wall.",
    rooms: "14 Desks · Screen Wall",
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
  const [buzzerSlug, setBuzzerSlug] = useState("");

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

  const handleBottomBuzzer = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = buzzerSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    router.push(`/space/${clean || "acme-hq"}`);
  };

  return (
    <div className="min-w-0">
      {/* 01 · LOBBY HERO — The Isometric Office Bleeds Directly Off the Edge */}
      <section className="relative overflow-hidden border-b border-white/[0.07] bg-bg">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 md:px-8 pt-10 md:pt-16 pb-8 lg:pb-12 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8 lg:gap-0">
            <div className="lg:col-span-5 relative z-10 space-y-6 lg:pr-4">
              <RoomSign number="Lobby" room="Floor 01" />

              <h1
                className="font-display font-extrabold text-text tracking-[-0.035em] leading-[1.01]"
                style={{ fontSize: "clamp(2.5rem, 1.45rem + 4.1vw, 4.6rem)" }}
              >
                Walk up to your teammate. Talk. Walk away.
              </h1>

              <p className="text-text-muted text-base sm:text-lg leading-relaxed max-w-md">
                Open your team&apos;s floor in a browser tab. Pull up to a desk for a two-minute question, or shut the glass door when you want quiet.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
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
                  className="py-2 text-sm font-medium text-text hover:text-accent transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Walk the demo floor</span>
                  <IconArrowRight className="w-4 h-4 text-accent" />
                </Link>
              </div>

              <p className="font-mono text-xs text-text-muted pt-4 border-t border-white/[0.08] max-w-xs">
                Free for 4 people. No install.
              </p>
            </div>

            <div className="lg:col-span-7 relative lg:-mr-28 xl:-mr-40 lg:-mb-12">
              <IsometricOfficeHero />
            </div>
          </div>
        </div>
      </section>

      {/* 02 · BOARDROOM ACOUSTICS — Interactive Spatial Audio Stage */}
      <section className="max-w-[1320px] mx-auto px-4 sm:px-6 md:px-8 py-20 md:py-28 space-y-12">
        <div className="max-w-2xl space-y-3">
          <RoomSign number="Boardroom" room="Acoustic Test" />
          <h2 className="font-display text-3xl sm:text-4xl md:text-[2.6rem] font-bold text-text tracking-[-0.025em] leading-[1.08]">
            Distance sets the volume. Glass cuts it to zero.
          </h2>
          <p className="text-sm sm:text-base text-text-muted leading-relaxed">
            Move yourself across the floor below. Voices fade naturally as you step back—and vanish behind the glass boardroom wall until you walk through the door.
          </p>
        </div>

        <SpatialAudioDemo />
      </section>

      {/* 03 · BUILDING DIRECTORY & HONEST CLOSER */}
      <section className="max-w-[1320px] mx-auto px-4 sm:px-6 md:px-8 py-16 md:py-24 border-t border-white/[0.07] space-y-20">
        {/* Floor Index */}
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-3">
              <RoomSign number="Directory" room="Open Floors" />
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-[-0.02em]">
                Pick a floor and walk straight in.
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
                className="group grid grid-cols-1 md:grid-cols-12 items-baseline gap-2.5 md:gap-6 py-6 hover:bg-white/[0.02] px-2 -mx-2 transition-colors"
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
                  <span>{floor.rooms}</span>
                  <IconArrowRight className="w-4 h-4 text-accent shrink-0 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 3 Plain Architectural Facts (No Boxes) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          <div className="border-t border-accent/60 pt-5 space-y-2">
            <span className="font-mono text-[11px] text-accent">01 · Keyholder links</span>
            <h3 className="font-display text-xl font-bold text-text">
              Zero teammate accounts
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Only the team admin creates a login. Send one locked link and teammates walk straight onto the floor.
            </p>
          </div>

          <div className="border-t border-white/15 pt-5 space-y-2">
            <span className="font-mono text-[11px] text-accent">02 · Call view &amp; screen</span>
            <h3 className="font-display text-xl font-bold text-text">
              Floor or clean video grid
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Work in 3D isometric space or flip to a focused HD video stage with screen sharing in one tap.
            </p>
          </div>

          <div className="border-t border-white/15 pt-5 space-y-2">
            <span className="font-mono text-[11px] text-accent">03 · Flat rates</span>
            <h3 className="font-display text-xl font-bold text-text">
              Free for 4 · $9 flat up to 30
            </h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Never pay per seat just to sit beside coworkers.{" "}
              <Link href="/pricing" className="text-accent hover:underline font-medium">
                See rates →
              </Link>
            </p>
          </div>
        </div>

        {/* Minimal Door Buzzer Closer */}
        <div className="border-t border-white/[0.07] pt-14 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-2 max-w-lg">
            <RoomSign number="Front Door" room="Buzzer" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-text tracking-[-0.02em] pt-2">
              Your floor is one knock away.
            </h2>
          </div>

          <form
            onSubmit={handleBottomBuzzer}
            className="w-full max-w-md flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="flex-1 flex items-center bg-surface border border-[color:var(--color-border-strong)] focus-within:border-accent rounded-control px-3 h-11">
              <span className="font-mono text-xs text-accent font-semibold mr-1.5 select-none">
                Knock:
              </span>
              <span className="font-mono text-xs text-text-muted select-none">/space/</span>
              <input
                type="text"
                value={buzzerSlug}
                onChange={(e) => setBuzzerSlug(e.target.value)}
                placeholder="your-team"
                aria-label="Enter room slug to open"
                className="flex-1 min-w-0 bg-transparent text-xs font-mono text-text placeholder:text-text-muted/50 focus:outline-none ml-0.5"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 bg-accent text-bg font-display font-bold text-xs rounded-control shadow-arcade-sm hover:brightness-110 transition-all inline-flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Ring In</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
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

          <div className="p-3.5 bg-surface-2/70 border border-white/[0.08] rounded-control text-xs text-text-muted flex items-center gap-2">
            <IconLock className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              Want a locked team link?{" "}
              <Link
                href="/admin"
                onClick={() => setCreateModalOpen(false)}
                className="text-accent font-medium hover:underline"
              >
                Open Keyholder Console
              </Link>
            </span>
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
