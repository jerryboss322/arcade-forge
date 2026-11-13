"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";

interface SpaceCard {
  slug: string;
  name: string;
  tagline: string;
  tag: string;
  activeCount: number;
  bgGradient: string;
  zones: string[];
}

const FEATURED_SPACES: SpaceCard[] = [
  {
    slug: "acme-hq",
    name: "Acme Tech HQ",
    tagline: "Startup open workstation pods, soundproof glass boardroom, war room, and espresso lounge.",
    tag: "Remote Engineering HQ",
    activeCount: 6,
    bgGradient: "from-blue-900/40 via-purple-900/20 to-surface-2",
    zones: ["Boardroom", "War Room", "12 Desks", "Cafe Lounge"],
  },
  {
    slug: "indie-forge",
    name: "Indie Dev Studio",
    tagline: "Creative team floor with Lo-Fi lounge, collaborative whiteboard and sprint war room.",
    tag: "Design & Product Studio",
    activeCount: 12,
    bgGradient: "from-pink-900/40 via-red-900/20 to-surface-2",
    zones: ["Design Pods", "Sprint Whiteboard", "Social Lounge"],
  },
  {
    slug: "study-cafe",
    name: "Late Night Study Cafe",
    tagline: "Cozy library tables, coffee espresso bar, and ambient deep focus mode.",
    tag: "Coworking & Study",
    activeCount: 4,
    bgGradient: "from-emerald-900/40 via-teal-900/20 to-surface-2",
    zones: ["Silent Desks", "Lo-Fi Radio", "Espresso Bar"],
  },
  {
    slug: "hacker-den",
    name: "Hacker Den & Standups",
    tagline: "Fast daily sync room with dual-monitor pods and HD presentation screen.",
    tag: "Daily Standups & Demos",
    activeCount: 8,
    bgGradient: "from-amber-900/40 via-orange-900/20 to-surface-2",
    zones: ["Demo Screen", "Standup Circle", "Focus Desks"],
  },
];

const OFFICE_USE_CASES = [
  {
    title: "Daily Standups & Demos",
    icon: "🚀",
    description: "Gather around the Boardroom Presentation Screen for quick 15-minute daily syncs. Share slides or code with 1-click Theater Mode.",
  },
  {
    title: "Deep Work & Focus Blocks",
    icon: "🎧",
    description: "Sit at your personal workstation and set your status to 'Deep Focus'. Coworkers see your status and know not to interrupt your flow.",
  },
  {
    title: "Soundproof 1-on-1s",
    icon: "🔒",
    description: "Walk into the Glass Boardroom and close the virtual door. Audio is 100% isolated so you can discuss confidential roadmap or review items.",
  },
  {
    title: "Spontaneous Hallway Chit-Chat",
    icon: "☕",
    description: "Bump into coworkers by the espresso bar or watercooler. Spatial proximity audio connects smoothly when you walk near each other.",
  },
  {
    title: "Real-Time Brainstorming",
    icon: "📋",
    description: "Gather around the War Room Whiteboard to sketch system architectures, map out user journeys, or draft sprint action items together.",
  },
  {
    title: "Zero Battery Drain & Runs in Browser",
    icon: "⚡",
    description: "No bulky 800 MB Electron download. Runs at a locked 60 FPS in Chrome, Safari, or Firefox with minimal CPU and battery usage.",
  },
];

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
    router.push(`/space/${newSpaceSlug.trim()}`);
  };

  return (
    <div className="min-w-0 py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-16">
      {/* Hero Header Section */}
      <section className="relative rounded-container overflow-hidden border-2 border-border bg-gradient-to-br from-surface to-surface-2 p-6 md:p-12 shadow-arcade">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/40 text-accent font-display text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            FORGESPACE • VIRTUAL OFFICE FOR REMOTE TEAMS
          </div>

          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-text tracking-tight uppercase leading-tight">
            Your Team&apos;s Virtual Office <br />
            <span className="text-accent">With $0 Server Overhead</span>
          </h1>

          <p className="text-text-muted text-base md:text-lg leading-relaxed max-w-2xl">
            Bring back the energy of working side-by-side. 
            Features <b>P2P WebRTC spatial proximity audio</b>, soundproof glass conference rooms, 
            claimable desks with status badges, and collaborative whiteboards — right in your browser.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-7 py-3.5 bg-accent text-bg font-display font-bold text-sm md:text-base rounded-control shadow-arcade hover:brightness-110 active:translate-y-0.5 transition-all"
            >
              + Create Your Team Office
            </button>
            <Link
              href="/space/acme-hq"
              className="px-7 py-3.5 bg-surface-2 hover:bg-surface border-2 border-border text-text font-display font-semibold text-sm md:text-base rounded-control shadow-sm transition-all flex items-center gap-2"
            >
              <span>Enter Demo Floor (Acme HQ)</span>
              <span className="text-accent">→</span>
            </Link>
          </div>

          {/* Quick Stat Pill Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-border/80">
            <div>
              <span className="font-display font-bold text-lg md:text-xl text-text block">
                $0 / mo
              </span>
              <span className="text-xs text-text-muted font-sans">
                100% P2P WebRTC Mesh
              </span>
            </div>
            <div>
              <span className="font-display font-bold text-lg md:text-xl text-emerald-400 block">
                60 FPS
              </span>
              <span className="text-xs text-text-muted font-sans">
                Pure Canvas & Zero Lag
              </span>
            </div>
            <div>
              <span className="font-display font-bold text-lg md:text-xl text-accent block">
                Soundproof
              </span>
              <span className="text-xs text-text-muted font-sans">
                Private Meeting Rooms
              </span>
            </div>
            <div>
              <span className="font-display font-bold text-lg md:text-xl text-text block">
                Zero Install
              </span>
              <span className="text-xs text-text-muted font-sans">
                Works in Any Browser
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Spaces Showcase */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold text-text uppercase tracking-wide">
              Featured Office Spaces
            </h2>
            <p className="text-xs md:text-sm text-text-muted">
              Choose a pre-configured floor plan or launch an instant virtual room for your team.
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="text-xs font-display font-semibold text-accent hover:underline self-start sm:self-auto"
          >
            + Create Custom Space
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURED_SPACES.map((space) => (
            <Link
              key={space.slug}
              href={`/space/${space.slug}`}
              className="group block rounded-container border-2 border-border bg-surface hover:border-accent shadow-arcade hover:-translate-y-1 transition-all overflow-hidden flex flex-col justify-between"
            >
              <div className={`p-6 bg-gradient-to-b ${space.bgGradient} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-display font-semibold bg-surface border border-border text-text">
                    {space.tag}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {space.activeCount} online
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-text group-hover:text-accent transition-colors">
                  {space.name}
                </h3>

                <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                  {space.tagline}
                </p>

                {/* Zone tags */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {space.zones.map((z) => (
                    <span
                      key={z}
                      className="px-2 py-0.5 text-[10px] font-mono rounded bg-surface/70 border border-border text-text-muted"
                    >
                      {z}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 border-t border-border bg-surface-2/60 flex items-center justify-between text-xs font-display font-bold text-text">
                <span>Enter Office Floor</span>
                <span className="text-accent group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How Teams Use ForgeSpace */}
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-xl md:text-2xl font-bold text-text uppercase tracking-wide">
            Designed for Modern Remote Culture
          </h2>
          <p className="text-xs md:text-sm text-text-muted">
            The simplicity of physical presence combined with the flexibility of remote work.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {OFFICE_USE_CASES.map((uc) => (
            <div
              key={uc.title}
              className="p-6 rounded-container bg-surface border-2 border-border space-y-2 hover:border-border/80 transition-colors"
            >
              <span className="text-3xl block mb-1">{uc.icon}</span>
              <h3 className="font-display text-base font-bold text-text">
                {uc.title}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Why ForgeSpace vs Gather.town Comparison Table */}
      <section id="pricing" className="rounded-container border-2 border-border bg-surface p-6 md:p-8 space-y-6">
        <div className="max-w-xl">
          <h2 className="font-display text-xl font-bold text-text uppercase tracking-wide">
            Compare: Gather.town vs ForgeSpace
          </h2>
          <p className="text-xs text-text-muted">
            Why high-velocity remote teams choose lightweight P2P over heavy commercial tools.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-border text-text-muted font-display uppercase tracking-wider">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-accent font-bold">ForgeSpace</th>
                <th className="py-3 px-4">Gather.town</th>
                <th className="py-3 px-4">Slack Huddles / Zoom</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-text">
              <tr>
                <td className="py-3 px-4 font-semibold">Cost per User</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">$0 (P2P WebRTC Mesh)</td>
                <td className="py-3 px-4 text-red-400">$3–$7 / user / mo</td>
                <td className="py-3 px-4 text-text-muted">Subscription</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Spatial Audio & Stereo Panning</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Web Audio API)</td>
                <td className="py-3 px-4">Yes</td>
                <td className="py-3 px-4 text-text-muted">No (Flat Audio)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Soundproof Private Rooms</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Audio Isolation)</td>
                <td className="py-3 px-4">Yes</td>
                <td className="py-3 px-4 text-text-muted">Requires Separate Calls</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Claimable Desks & Statuses</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (In-Floor Badges)</td>
                <td className="py-3 px-4">Yes</td>
                <td className="py-3 px-4 text-text-muted">Text status only</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Client Performance & Battery</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Pure Canvas 60 FPS (Ultra Light)</td>
                <td className="py-3 px-4 text-red-400">High CPU & Battery Drain</td>
                <td className="py-3 px-4 text-text-muted">Medium</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Lo-Fi Cafe Radio & Espresso</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Built-in Audio Synth)</td>
                <td className="py-3 px-4 text-text-muted">No</td>
                <td className="py-3 px-4 text-text-muted">No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Office Dialog */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="🏢 Create Virtual Office Floor"
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
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Apex Engineering HQ"
              maxLength={40}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-display text-text mb-1">
              Office URL Slug:
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

          <div>
            <label className="block text-xs font-display text-text mb-1">
              Floor Plan Template:
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
            >
              <option value="startup">Modern Tech HQ (12 Desks + Boardroom + Cafe)</option>
              <option value="studio">Creative Agency Loft (Design Pods + War Room)</option>
              <option value="cafe">Cozy Study & Coworking Cafe</option>
            </select>
          </div>

          <div className="p-3 bg-surface-2 rounded-control text-xs text-text-muted space-y-1">
            <span className="font-display font-semibold text-text block">
              Included with Your Office Floor:
            </span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>12 Claimable Workstation Desks with Role & Timezone badges</li>
              <li>Soundproof Glass Boardroom & War Room with private audio</li>
              <li>Lo-Fi Breakroom Lounge with Espresso Bar</li>
              <li>HD Presentation Screen with 1-click Theater Mode</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs text-text-muted hover:text-text rounded-control"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs bg-accent text-bg font-display font-bold rounded-control shadow-arcade hover:brightness-110"
            >
              Launch Space →
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </div>
  );
}
