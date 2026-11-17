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
  features: string[];
  accentClass: string;
}

const OFFICE_BLUEPRINTS: SpaceBlueprint[] = [
  {
    slug: "acme-hq",
    name: "Acme Tech HQ",
    category: "engineering",
    tagline: "High-velocity remote software team floor with glass boardroom.",
    description:
      "Designed for engineering squads doing daily standups, architecture deep dives, and pair programming. Includes 12 ergonomic desks, soundproof boardroom, war room, and espresso lounge.",
    capacity: 30,
    desksCount: 12,
    privateRooms: ["Glass Boardroom (12 seats)", "War Room (8 seats)"],
    features: [
      "LiveKit Spatial Audio",
      "Lo-Fi Radio Station",
      "HD Presentation Screen",
      "Espresso Speed Boost",
    ],
    accentClass: "from-teal-500/20 via-cyan-500/5 to-transparent",
  },
  {
    slug: "indie-studio",
    name: "Indie Dev Studio",
    category: "design",
    tagline: "Creative studio loft with sprint whiteboards and critique pods.",
    description:
      "Tailored for product designers, engineers, and studios. Features collaborative sticky boards, cozy lounge areas, and dedicated critique rooms.",
    capacity: 18,
    desksCount: 8,
    privateRooms: ["Design Critique Room", "Sprint Huddle Pod"],
    features: ["Collaborative Whiteboard", "Lo-Fi Lounge", "Custom Desk Badges"],
    accentClass: "from-indigo-500/20 via-violet-500/5 to-transparent",
  },
  {
    slug: "study-cafe",
    name: "Late Night Study Cafe",
    category: "coworking",
    tagline: "Ambient library tables, continuous lo-fi rain beats, and deep focus.",
    description:
      "A calming sanctuary for deep work alongside teammates. Ambient lo-fi synthesis and focus status modes keep distractions low.",
    capacity: 16,
    desksCount: 10,
    privateRooms: ["Whisper Booth", "Reading Corner"],
    features: ["Lo-Fi Focus Radio", "Espresso Bar", "Do Not Disturb Modes"],
    accentClass: "from-emerald-500/20 via-teal-500/5 to-transparent",
  },
  {
    slug: "hacker-den",
    name: "Hacker Den & Standups",
    category: "standup",
    tagline: "Fast daily sync hub with multi-screen demo theater.",
    description:
      "Built for agile demo days, emergency war-room triaging, and rapid standups. Includes HD screen-sharing theater mode and zone warp navigation.",
    capacity: 30,
    desksCount: 14,
    privateRooms: ["Command War Room", "Triage Pod"],
    features: ["1-Click Screen Theater", "Zone Warp Bar", "Door Knock Chimes"],
    accentClass: "from-sky-500/20 via-indigo-500/5 to-transparent",
  },
  {
    slug: "executive-floor",
    name: "Executive Suite & Boardroom",
    category: "engineering",
    tagline: "Conference floor with passcode-locked private rooms.",
    description:
      "Structured conference environment for stakeholder reviews and presentations. Includes passcode protection and admittance chimes.",
    capacity: 20,
    desksCount: 6,
    privateRooms: ["Grand Boardroom (16 seats)", "Executive Antechamber"],
    features: ["Passcode Gate", "Door Knock Admittance", "HD Projection Screen"],
    accentClass: "from-violet-500/20 via-purple-500/5 to-transparent",
  },
  {
    slug: "wellness-retreat",
    name: "Zen Work Garden & Cafe",
    category: "coworking",
    tagline: "Open-air courtyard workstations built for calm daily rhythm.",
    description:
      "An airy spatial floorplan designed to reduce video fatigue with quiet pods, watercooler hangout spots, and gentle ambient zones.",
    capacity: 16,
    desksCount: 8,
    privateRooms: ["Mindful Focus Pod", "Tea Room"],
    features: ["Watercooler Hangouts", "Ambient Radio", "Calm Spatial Palette"],
    accentClass: "from-amber-500/15 via-teal-500/5 to-transparent",
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
    <div className="py-8 md:py-10 px-4 md:px-8 max-w-[1280px] mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
            Floorplan Catalog
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text tracking-tight">
            Virtual Office Floorplans
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-1.5 max-w-2xl">
            Every workspace ships with 3D WebGL &amp; 2D rendering, spatial LiveKit audio, claimable desks, and soundproof conference pods.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <Link
            href="/admin"
            className="px-4 py-2.5 bg-surface-2 border border-white/15 hover:border-accent/60 text-text font-medium text-xs md:text-sm rounded-control transition-all inline-flex items-center gap-1.5"
          >
            <IconLock className="w-3.5 h-3.5 text-accent" />
            <span>Create Passworded Team Link</span>
          </Link>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 bg-accent text-bg font-display font-semibold text-xs md:text-sm rounded-control shadow-arcade-sm hover:brightness-110 active:scale-[0.98] transition-all inline-flex items-center gap-1.5"
          >
            <IconPlus className="w-4 h-4" />
            <span>Quick Demo Space</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface/90 border border-white/10 rounded-card">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "All Floorplans" },
            { id: "engineering", label: "Engineering HQs" },
            { id: "design", label: "Design Studios" },
            { id: "coworking", label: "Coworking & Study" },
            { id: "standup", label: "Standups & Demos" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-control text-xs font-medium transition-colors ${
                filterCategory === cat.id
                  ? "bg-accent text-bg font-semibold shadow-sm"
                  : "bg-surface-2/80 text-text-muted hover:text-text hover:bg-surface-2"
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
            placeholder="Search floorplans..."
            aria-label="Search floorplans"
            className="w-full pl-9 pr-3 py-1.5 bg-bg/90 border border-[color:var(--color-border-strong)] focus:border-accent rounded-control text-xs font-sans text-text placeholder:text-text-muted/60 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Floorplans Grid with Container Query + Subgrid Row Alignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {filteredSpaces.map((blueprint) => (
          <div
            key={blueprint.slug}
            className="cq-card subgrid-card rounded-container border border-white/10 bg-surface hover:border-accent/60 shadow-arcade hover:-translate-y-0.5 transition-all overflow-hidden group"
          >
            {/* Track 1: Card Header */}
            <div className={`px-6 pt-6 pb-4 bg-gradient-to-b ${blueprint.accentClass} space-y-3`}>
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-2 border border-white/10 text-text capitalize">
                  {blueprint.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-accent/15 text-accent border border-accent/30">
                  Ready to Launch
                </span>
              </div>

              <div>
                <h2 className="font-display text-lg font-bold text-text group-hover:text-accent transition-colors">
                  {blueprint.name}
                </h2>
                <p className="text-xs text-text-muted leading-relaxed mt-1">
                  {blueprint.tagline}
                </p>
              </div>
            </div>

            {/* Track 2: Specs & Soundproof Rooms */}
            <div className="px-6 py-2 space-y-4">
              <div className="grid grid-cols-2 gap-2.5 p-3 bg-bg/60 rounded-card border border-white/[0.08] text-xs">
                <div>
                  <span className="text-[10px] text-text-muted block font-mono uppercase">
                    Workstations
                  </span>
                  <span className="font-display font-bold text-text mt-0.5 block">
                    {blueprint.desksCount} Desks
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block font-mono uppercase">
                    Pro Capacity
                  </span>
                  <span className="font-display font-bold text-accent mt-0.5 block">
                    Up to {blueprint.capacity} Seats
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Soundproof Private Pods
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {blueprint.privateRooms.map((rm) => (
                    <span
                      key={rm}
                      className="px-2.5 py-1 rounded-control text-[11px] font-mono bg-surface-2/80 border border-white/[0.08] text-text inline-flex items-center gap-1.5"
                    >
                      <IconLock className="w-3 h-3 text-accent shrink-0" />
                      <span>{rm}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Track 3: Footer Launch CTA */}
            <div className="p-4 mt-2 border-t border-white/[0.08] bg-surface-2/40 flex items-center justify-between gap-3">
              <Link
                href={`/space/${blueprint.slug}`}
                className="flex-1 py-2.5 px-4 text-center text-xs font-display font-semibold bg-accent text-bg rounded-control hover:brightness-110 shadow-arcade-sm transition-all inline-flex items-center justify-center gap-1.5"
              >
                <span>Launch Office Floor</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Demo Space Dialog */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Launch Quick Demo Office"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateSpace} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Company or Team Name
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
              placeholder="e.g. Apex Engineering HQ"
              className="w-full px-3.5 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Office URL Slug
            </label>
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <span className="select-none">/space/</span>
              <input
                type="text"
                required
                value={newSpaceSlug}
                onChange={(e) => setNewSpaceSlug(e.target.value)}
                placeholder="apex-engineering"
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
              className="px-5 py-2 text-xs bg-accent text-bg font-display font-semibold rounded-control hover:brightness-110 inline-flex items-center gap-1.5"
            >
              <span>Enter Space</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </div>
  );
}
