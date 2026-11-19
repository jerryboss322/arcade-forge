"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import {
  IconArrowRight,
  IconLock,
  IconPlus,
  IconSearch,
} from "@/components/ui/Icons";

interface SpaceBlueprint {
  slug: string;
  name: string;
  category: "engineering" | "design" | "coworking" | "standup";
  tagline: string;
  description: string;
  capacity: number;
  desksCount: number;
  privateRooms: string[];
}

const OFFICE_BLUEPRINTS: SpaceBlueprint[] = [
  {
    slug: "acme-hq",
    name: "Acme Tech HQ",
    category: "engineering",
    tagline: "Open workstation pods beside a glass boardroom and war room.",
    description:
      "Built for engineering teams doing daily standups and pair debugging. Includes 12 ergonomic desks, walnut boardroom, war room, and espresso bar.",
    capacity: 30,
    desksCount: 12,
    privateRooms: ["Glass Boardroom (12)", "War Room (8)"],
  },
  {
    slug: "indie-studio",
    name: "Indie Dev Studio",
    category: "design",
    tagline: "Product studio loft with sprint whiteboards and critique rooms.",
    description:
      "Tailored for designers and small product squads. Features shared sticky walls, lounge tables, and quiet critique booths.",
    capacity: 18,
    desksCount: 8,
    privateRooms: ["Design Critique Room", "Sprint Huddle Pod"],
  },
  {
    slug: "study-cafe",
    name: "Late Night Study Cafe",
    category: "coworking",
    tagline: "Quiet desks, synthesized lo-fi vinyl beats, and ambient focus.",
    description:
      "Calm coworking tables for quiet deep work beside coworkers without forced video calls.",
    capacity: 16,
    desksCount: 10,
    privateRooms: ["Whisper Booth", "Reading Corner"],
  },
  {
    slug: "hacker-den",
    name: "Standup & Demo Floor",
    category: "standup",
    tagline: "Fast daily sync room with full-wall presentation screen.",
    description:
      "Built for demo days, incident triage rooms, and fast standups with one-tap screen sharing.",
    capacity: 30,
    desksCount: 14,
    privateRooms: ["Command War Room", "Triage Pod"],
  },
  {
    slug: "executive-floor",
    name: "Boardroom Suite",
    category: "engineering",
    tagline: "Conference wing wired with passcode doors and knock chimes.",
    description:
      "Formal wing for partner reviews and external demos where room admittance stays manual.",
    capacity: 20,
    desksCount: 6,
    privateRooms: ["Grand Boardroom (16)", "Antechamber"],
  },
  {
    slug: "wellness-retreat",
    name: "Courtyard Garden",
    category: "coworking",
    tagline: "Airy open courtyard for relaxed afternoon coworking.",
    description:
      "Laid-back layout around a central fountain and tea table to unwind between sprints.",
    capacity: 16,
    desksCount: 8,
    privateRooms: ["Quiet Focus Pod", "Tea Room"],
  },
];

export default function SpacesPage() {
  const router = useRouter();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceSlug, setNewSpaceSlug] = useState("");

  const filteredSpaces = OFFICE_BLUEPRINTS.filter((space) => {
    const matchesCat = filterCategory === "all" || space.category === filterCategory;
    const matchesSearch =
      space.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      space.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceSlug.trim()) return;
    setCreateModalOpen(false);
    router.push(`/space/${newSpaceSlug.trim()}`);
  };

  return (
    <div className="py-10 md:py-14 px-4 md:px-8 max-w-[1320px] mx-auto space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 pb-6 border-b border-white/[0.08]">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/15 bg-surface text-[11px] font-mono uppercase tracking-[0.16em] text-text">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-accent font-semibold">01</span>
            <span className="text-white/25">/</span>
            <span>Floorplans</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold text-text tracking-[-0.02em]">
            Walk straight onto a floor.
          </h1>
          <p className="text-sm text-text-muted max-w-xl">
            Every floor includes a 3D isometric map, spatial voice roll-off, claimable desks, and soundproof glass conference rooms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <Link
            href="/admin"
            className="px-4 py-2.5 border border-white/15 hover:border-accent text-text font-medium text-xs rounded-control transition-colors inline-flex items-center gap-1.5"
          >
            <IconLock className="w-3.5 h-3.5 text-accent" />
            <span>Lock a Team Link</span>
          </Link>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 bg-accent text-bg font-display font-bold text-xs rounded-control shadow-arcade-sm hover:brightness-110 active:scale-[0.98] transition-all inline-flex items-center gap-1.5"
          >
            <IconPlus className="w-4 h-4" />
            <span>Open Blank Floor</span>
          </button>
        </div>
      </div>

      {/* Filter Strip Directly on Page */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "all", label: "All Floors" },
            { id: "engineering", label: "Engineering" },
            { id: "design", label: "Studios" },
            { id: "coworking", label: "Coworking" },
            { id: "standup", label: "Standups" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-control text-xs font-mono transition-colors border ${
                filterCategory === cat.id
                  ? "bg-accent text-bg border-accent font-semibold"
                  : "bg-surface text-text-muted border-white/10 hover:text-text hover:border-white/25"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <IconSearch className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter blueprints..."
            aria-label="Filter floorplans"
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-[color:var(--color-border-strong)] focus:border-accent rounded-control text-xs font-sans text-text placeholder:text-text-muted/60 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Unboxed Architectural Floorplan Blueprints */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 pt-2">
        {filteredSpaces.map((blueprint, i) => (
          <div
            key={blueprint.slug}
            className="border-t border-white/15 pt-5 flex flex-col justify-between space-y-6 group hover:border-accent/60 transition-colors"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                <span className="text-accent uppercase">
                  F{i + 1} · {blueprint.category}
                </span>
                <span>
                  {blueprint.desksCount} desks · up to {blueprint.capacity} seats
                </span>
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-text group-hover:text-accent transition-colors">
                  {blueprint.name}
                </h2>
                <p className="text-sm text-text-muted leading-relaxed mt-1.5">
                  {blueprint.tagline}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {blueprint.privateRooms.map((rm) => (
                  <span
                    key={rm}
                    className="px-2 py-0.5 border border-white/10 text-[11px] font-mono text-text inline-flex items-center gap-1.5"
                  >
                    <IconLock className="w-3 h-3 text-accent shrink-0" />
                    <span>{rm}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Link
                href={`/space/${blueprint.slug}`}
                className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-accent hover:underline"
              >
                <span>Walk onto /space/{blueprint.slug}</span>
                <IconArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Open Custom Office Dialog */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Open a Blank Office Floor"
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
              onChange={(e) => {
                setNewSpaceName(e.target.value);
                setNewSpaceSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-|-$/g, "")
                );
              }}
              placeholder="e.g. Studio Fourth Floor"
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

          <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs bg-accent text-bg font-display font-bold rounded-control hover:brightness-110 inline-flex items-center gap-1.5"
            >
              <span>Enter Floor</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </div>
  );
}
