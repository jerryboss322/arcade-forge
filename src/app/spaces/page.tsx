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
}

const FEATURED_SPACES: SpaceCard[] = [
  {
    slug: "acme-hq",
    name: "Acme Tech HQ",
    tagline: "Startup open workstation pods, soundproof glass boardroom & reception lounge.",
    tag: "Remote Team Office",
    activeCount: 6,
    bgGradient: "from-blue-900/40 via-purple-900/20 to-surface-2",
  },
  {
    slug: "indie-forge",
    name: "Indie Dev Studio",
    tagline: "Pixel-art workshop with breakroom arcade cabinet and brainstorm war room whiteboard.",
    tag: "Game Jam & Hackathon",
    activeCount: 12,
    bgGradient: "from-pink-900/40 via-red-900/20 to-surface-2",
  },
  {
    slug: "study-cafe",
    name: "Late Night Study Cafe",
    tagline: "Cozy library tables, coffee espresso machine, and ambient focus mode.",
    tag: "Study & Coworking",
    activeCount: 4,
    bgGradient: "from-emerald-900/40 via-teal-900/20 to-surface-2",
  },
];

export default function SpacesIndexPage() {
  const router = useRouter();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceSlug, setNewSpaceSlug] = useState("");

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
    <div className="min-w-0 py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-12">
      {/* Hero Header */}
      <section className="relative rounded-container overflow-hidden border-2 border-border bg-gradient-to-br from-surface to-surface-2 p-6 md:p-12 shadow-arcade">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/40 text-accent font-display text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
            NEW PRODUCT • FORGESPACE
          </div>

          <h1 className="font-display text-3xl md:text-5xl font-extrabold text-text tracking-tight uppercase">
            Virtual Office & Hangouts <br />
            <span className="text-accent">With $0 Server Cost</span>
          </h1>

          <p className="text-text-muted text-sm md:text-base leading-relaxed">
            Lightweight, battery-friendly 2D pixel offices for remote teams and study clubs.
            Features <b>P2P WebRTC spatial proximity audio</b>, soundproof meeting rooms,
            and an interactive <b>60Hz retro arcade machine</b> right in the breakroom!
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-3 bg-accent text-bg font-display font-bold text-sm rounded-control shadow-arcade hover:brightness-110 active:translate-y-0.5 transition-all"
            >
              + Create Your Virtual Office
            </button>
            <Link
              href="/space/acme-hq"
              className="px-6 py-3 bg-surface-2 hover:bg-surface border-2 border-border text-text font-display font-semibold text-sm rounded-control shadow-sm transition-all"
            >
              Enter Demo Space (Acme HQ) →
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Spaces Showcase */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-text uppercase tracking-wide">
              Explore Active Spaces
            </h2>
            <p className="text-xs text-text-muted">
              Jump straight into a 2D floor from your browser with zero installs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_SPACES.map((space) => (
            <Link
              key={space.slug}
              href={`/space/${space.slug}`}
              className="group block rounded-container border-2 border-border bg-surface hover:border-accent shadow-arcade hover:-translate-y-1 transition-all overflow-hidden flex flex-col justify-between"
            >
              <div className={`p-6 bg-gradient-to-b ${space.bgGradient} space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-display font-semibold bg-surface border border-border text-text">
                    {space.tag}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {space.activeCount} active
                  </span>
                </div>

                <h3 className="font-display text-lg font-bold text-text group-hover:text-accent transition-colors">
                  {space.name}
                </h3>

                <p className="text-xs text-text-muted leading-relaxed">
                  {space.tagline}
                </p>
              </div>

              <div className="p-4 border-t border-border bg-surface-2/60 flex items-center justify-between text-xs font-display font-bold text-text">
                <span>Enter Space</span>
                <span className="text-accent group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why ForgeSpace vs Gather.town Comparison Table */}
      <section className="rounded-container border-2 border-border bg-surface p-6 md:p-8 space-y-6">
        <div className="max-w-xl">
          <h2 className="font-display text-xl font-bold text-text uppercase tracking-wide">
            Why Teams Choose ForgeSpace
          </h2>
          <p className="text-xs text-text-muted">
            Designed from the ground up to eliminate expensive media servers and bloated Electron downloads.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-border text-text-muted font-display uppercase tracking-wider">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-accent font-bold">ForgeSpace</th>
                <th className="py-3 px-4">Gather.town</th>
                <th className="py-3 px-4">Discord / Slack Huddle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-text">
              <tr>
                <td className="py-3 px-4 font-semibold">Hosting & Bandwidth Cost</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">$0 (P2P WebRTC Mesh)</td>
                <td className="py-3 px-4 text-red-400">$3–$7 / user / mo</td>
                <td className="py-3 px-4 text-text-muted">Subscription</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Spatial Audio & Distance Fade</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Web Audio GainNode)</td>
                <td className="py-3 px-4">Yes</td>
                <td className="py-3 px-4 text-text-muted">No (Flat Audio)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Soundproof Private Rooms</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Meeting Isolation)</td>
                <td className="py-3 px-4">Yes</td>
                <td className="py-3 px-4 text-text-muted">Separate Channels</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">In-Office Retro Mini-Games</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (ArcadeForge 60Hz Engine)</td>
                <td className="py-3 px-4 text-text-muted">Limited / Third-party</td>
                <td className="py-3 px-4 text-text-muted">Activities</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Client Performance & Battery</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Pure Canvas 60 FPS (Ultra Light)</td>
                <td className="py-3 px-4 text-red-400">High CPU & Battery Drain</td>
                <td className="py-3 px-4 text-text-muted">Medium</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Space Dialog */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="✨ Create Your Virtual Office"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateSpace} className="space-y-4">
          <div>
            <label className="block text-xs font-display text-text mb-1">
              Office / Team Name:
            </label>
            <input
              type="text"
              required
              value={newSpaceName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Apex Design Studio"
              maxLength={40}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-display text-text mb-1">
              Custom Space Slug:
            </label>
            <div className="flex items-center gap-1 text-xs font-mono text-text-muted">
              <span>/space/</span>
              <input
                type="text"
                required
                value={newSpaceSlug}
                onChange={(e) => setNewSpaceSlug(e.target.value)}
                placeholder="apex-design"
                className="flex-1 px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="p-3 bg-surface-2 rounded-control text-xs text-text-muted space-y-1">
            <span className="font-display font-semibold text-text block">
              Default Floor Plan Includes:
            </span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>12 Claimable Workstation Desks</li>
              <li>Soundproof Glass Boardroom & War Room</li>
              <li>Breakroom with Arcade Machine & Espresso Bar</li>
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
