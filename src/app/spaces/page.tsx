"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";

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
  bgGradient: string;
}

const OFFICE_BLUEPRINTS: SpaceBlueprint[] = [
  {
    slug: "acme-hq",
    name: "Acme Tech HQ",
    category: "engineering",
    tagline: "High-velocity remote software team floor with glass boardroom.",
    description: "Designed for engineering squads doing daily standups, architectural deep dives, and pair programming. Includes 12 ergonomic workstation desks, soundproof walnut boardroom, war room, and espresso lounge.",
    capacity: 24,
    desksCount: 12,
    privateRooms: ["Glass Boardroom (12 seats)", "War Room (8 seats)"],
    features: ["P2P Spatial Audio", "Lo-Fi Radio Station", "HD Presentation Screen", "Espresso Speed Boost"],
    bgGradient: "from-blue-900/40 via-purple-900/20 to-surface-2",
  },
  {
    slug: "indie-studio",
    name: "Indie Dev Studio",
    category: "design",
    tagline: "Creative team loft with sprint whiteboards and design pods.",
    description: "Tailored for product designers, animators, and game makers. Features collaborative sticky notes boards, cozy velvet lounge chairs, and dedicated sprint critique rooms.",
    capacity: 18,
    desksCount: 8,
    privateRooms: ["Design Critique Room", "Sprint Huddle Pod"],
    features: ["Collaborative Sticky Board", "Lo-Fi Lounge", "Color Swatch Desk Badges"],
    bgGradient: "from-pink-900/40 via-red-900/20 to-surface-2",
  },
  {
    slug: "study-cafe",
    name: "Late Night Study Cafe",
    category: "coworking",
    tagline: "Ambient library tables, continuous lo-fi rain beats, and deep focus.",
    description: "A calming sanctuary for deep work and solitary focus alongside coworkers. Ambient rainfall and synthesized vinyl lo-fi beats keep distractions at zero.",
    capacity: 16,
    desksCount: 10,
    privateRooms: ["Whisper Booth", "Reading Corner"],
    features: ["Continuous Lo-Fi Synthesizer", "Espresso Bar", "Do Not Disturb Desk Modes"],
    bgGradient: "from-emerald-900/40 via-teal-900/20 to-surface-2",
  },
  {
    slug: "hacker-den",
    name: "Hacker Den & Standups",
    category: "standup",
    tagline: "Fast daily sync hub with multi-screen demo theater.",
    description: "Built for agile demo days, emergency war-room triaging, and lightning standups. Includes immediate screen-sharing theater mode and fast quick-warp navigation.",
    capacity: 30,
    desksCount: 14,
    privateRooms: ["Command War Room", "Triage Pod"],
    features: ["1-Click Screen Share Theater", "Quick-Warp Bar", "Door Knock System"],
    bgGradient: "from-amber-900/40 via-orange-900/20 to-surface-2",
  },
  {
    slug: "executive-floor",
    name: "Executive Suite & Boardroom",
    category: "engineering",
    tagline: "Formal conference spaces with passcode-locked private sessions.",
    description: "Premium boardroom environment for board meetings, partner presentations, and investor pitches. Features secure door locks with admittance chimes.",
    capacity: 20,
    desksCount: 6,
    privateRooms: ["Grand Boardroom (16 seats)", "Executive Antechamber"],
    features: ["Keycode Passcode Locks", "Coworker Knock Admittance", "High-Definition Projection"],
    bgGradient: "from-purple-900/40 via-indigo-900/20 to-surface-2",
  },
  {
    slug: "wellness-retreat",
    name: "Zen Work Garden & Cafe",
    category: "coworking",
    tagline: "Open-air courtyard workstations with fountain ambient sounds.",
    description: "An airy outdoor-themed floorplan designed to lower remote fatigue. Natural daylighting materials, watercooler chat spots, and gentle tea stations.",
    capacity: 16,
    desksCount: 8,
    privateRooms: ["Mindful Meditation Pod", "Tea Room"],
    features: ["Watercooler Chit-Chat", "Ambient Soundscapes", "Walking Bob Physics"],
    bgGradient: "from-teal-900/40 via-cyan-900/20 to-surface-2",
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
    router.push(`/space/${newSpaceSlug.trim()}`);
  };

  return (
    <div className="py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
            Floorplan Catalog
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text uppercase tracking-tight">
            Virtual Office Floorplans
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-1 max-w-2xl">
            Browse pre-architected 3D & 2D workspaces designed for specific remote team workflows, or launch an instant custom office for your company.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <Link
            href="/admin"
            className="px-4 py-2.5 bg-surface-2 border border-border hover:border-accent text-text font-display font-bold text-xs md:text-sm rounded-control transition-all"
          >
            Boss Admin (Passworded Link) →
          </Link>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-5 py-2.5 bg-accent text-bg font-display font-bold text-xs md:text-sm rounded-control shadow-arcade hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span>+ Quick Demo Space</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-surface border-2 border-border rounded-xl">
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
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-control text-xs font-display transition-colors ${
                filterCategory === cat.id
                  ? "bg-accent text-bg font-bold shadow-sm"
                  : "bg-surface-2 text-text-muted hover:text-text"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or feature..."
          className="px-3 py-1.5 bg-surface-2 border border-border focus:border-accent rounded-control text-xs font-sans text-text outline-none sm:w-64"
        />
      </div>

      {/* Floorplans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSpaces.map((blueprint) => (
          <div
            key={blueprint.slug}
            className="rounded-container border-2 border-border bg-surface hover:border-accent shadow-arcade hover:-translate-y-1 transition-all flex flex-col justify-between overflow-hidden group"
          >
            <div className={`p-6 bg-gradient-to-b ${blueprint.bgGradient} space-y-4`}>
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-display font-semibold bg-surface border border-border text-text uppercase">
                  {blueprint.category}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Ready to Launch
                </span>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold text-text group-hover:text-accent transition-colors">
                  {blueprint.name}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed mt-1">
                  {blueprint.tagline}
                </p>
              </div>

              {/* Blueprints Spec Stats */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-surface/80 rounded-lg border border-border text-xs">
                <div>
                  <span className="text-[10px] text-text-muted block font-mono">DESK PODS</span>
                  <span className="font-display font-bold text-text">{blueprint.desksCount} Workstations</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block font-mono">PEER CAPACITY</span>
                  <span className="font-display font-bold text-accent">{blueprint.capacity} Occupants</span>
                </div>
              </div>

              {/* Private Rooms */}
              <div className="space-y-1">
                <div className="text-[10px] font-display font-semibold uppercase text-text-muted">
                  Soundproof Private Pods:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {blueprint.privateRooms.map((rm) => (
                    <span
                      key={rm}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-2 border border-border text-text"
                    >
                      🔒 {rm}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-surface-2 flex items-center justify-between gap-3">
              <Link
                href={`/space/${blueprint.slug}`}
                className="flex-1 py-2 text-center text-xs font-display font-bold bg-accent text-bg rounded-control hover:brightness-110 shadow-sm transition-all"
              >
                Launch Office Floor →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Office Modal */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="🏢 Create Custom Office Floor"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateSpace} className="space-y-4">
          <div>
            <label className="block text-xs font-display text-text mb-1">
              Company / Team Name:
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
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-display text-text mb-1">
              Office Slug:
            </label>
            <div className="flex items-center gap-1 text-xs font-mono text-text-muted">
              <span>/space/</span>
              <input
                type="text"
                required
                value={newSpaceSlug}
                onChange={(e) => setNewSpaceSlug(e.target.value)}
                placeholder="apex-engineering"
                className="flex-1 px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs bg-accent text-bg font-display font-bold rounded-control hover:brightness-110"
            >
              Enter Space →
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </div>
  );
}
