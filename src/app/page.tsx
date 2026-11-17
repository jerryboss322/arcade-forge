"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import {
  IconActivity,
  IconArrowRight,
  IconCheck,
  IconCube,
  IconLayoutGrid,
  IconLock,
  IconMic,
  IconPlus,
  IconShieldCheck,
  IconSparkles,
  IconUsers,
} from "@/components/ui/Icons";

interface SpaceCard {
  slug: string;
  name: string;
  tagline: string;
  tag: string;
  status: string;
  accentClass: string;
  zones: string[];
}

const FEATURED_SPACES: SpaceCard[] = [
  {
    slug: "acme-hq",
    name: "Acme Tech HQ",
    tagline:
      "Open workstation pods, soundproof glass boardroom, brainstorm war room, and espresso lounge.",
    tag: "Engineering HQ",
    status: "Live Floor",
    accentClass: "from-teal-500/20 via-cyan-500/5 to-transparent",
    zones: ["Boardroom", "War Room", "12 Desks", "Espresso Lounge"],
  },
  {
    slug: "indie-studio",
    name: "Indie Dev Studio",
    tagline:
      "Creative studio loft with collaborative sprint whiteboard, critique pods, and ambient lounge.",
    tag: "Product & Design",
    status: "Live Floor",
    accentClass: "from-indigo-500/20 via-violet-500/5 to-transparent",
    zones: ["Design Pods", "Whiteboard", "Social Lounge"],
  },
  {
    slug: "study-cafe",
    name: "Focus Study Cafe",
    tagline:
      "Cozy library tables, espresso speed bar, and synthesized lo-fi vinyl background music.",
    tag: "Deep Focus",
    status: "Live Floor",
    accentClass: "from-emerald-500/20 via-teal-500/5 to-transparent",
    zones: ["Silent Desks", "Lo-Fi Radio", "Espresso Bar"],
  },
  {
    slug: "hacker-den",
    name: "Hacker Den & Standups",
    tagline:
      "High-velocity sync room built for daily standups, pair debugging, and HD screen demos.",
    tag: "Standups & Demos",
    status: "Live Floor",
    accentClass: "from-sky-500/20 via-indigo-500/5 to-transparent",
    zones: ["Demo Screen", "Standup Circle", "Focus Desks"],
  },
];

const OFFICE_CAPABILITIES = [
  {
    icon: IconCube,
    title: "3D Isometric WebGL Engine",
    description:
      "Navigate across custom office floors with procedural 3D desks, glass pods, customizable avatars, and click-to-walk pathfinding.",
    href: "/features",
    badge: "3D & 2D Engine",
  },
  {
    icon: IconMic,
    title: "Spatial Proximity Audio & SFU",
    description:
      "Walk beside a teammate to start talking automatically over crisp LiveKit Cloud SFU media routing with stereo distance attenuation.",
    href: "/features",
    badge: "LiveKit SFU",
  },
  {
    icon: IconLock,
    title: "Soundproof Private Rooms",
    description:
      "Step inside the Glass Boardroom or War Room for instant acoustic isolation, occupant lock controls, and gentle door-knock chimes.",
    href: "/features",
    badge: "Encrypted Audio",
  },
  {
    icon: IconLayoutGrid,
    title: "Collaborative Whiteboards",
    description:
      "Sketch architecture diagrams, manage sticky notes, and export high-resolution PNG snapshots without leaving your workspace.",
    href: "/whiteboard",
    badge: "Built-in App",
  },
  {
    icon: IconShieldCheck,
    title: "Boss Links, Zero Seat Bloat",
    description:
      "Only the workspace admin creates an account. Share one password-protected invite link so teammates join in two seconds.",
    href: "/admin",
    badge: "Boss Admin",
  },
  {
    icon: IconActivity,
    title: "Real Telemetry & Diagnostics",
    description:
      "Inspect live WebRTC/LiveKit connection health, media tracks, and spatial proximity without synthetic bots or inflated metrics.",
    href: "/pulse",
    badge: "Live Pulse",
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
    setCreateModalOpen(false);
    router.push(`/space/${newSpaceSlug.trim()}`);
  };

  return (
    <div className="min-w-0 py-8 md:py-12 px-4 md:px-8 max-w-[1280px] mx-auto space-y-20">
      {/* Asymmetric 2-Column SaaS Hero */}
      <section className="relative rounded-container overflow-hidden border border-white/10 bg-gradient-to-br from-surface via-surface to-surface-2/90 p-6 md:p-10 lg:p-12 shadow-arcade-lg">
        {/* Subtle ambient radial glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 left-1/3 w-80 h-80 rounded-full bg-accent-2/10 blur-3xl"
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Copy Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs font-medium text-text-muted">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Powered by LiveKit Cloud SFU · Zero Employee Account Bloat</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-[54px] font-extrabold text-text tracking-[-0.03em] leading-[1.08]">
              Your Remote Office,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-teal-200 to-indigo-300">
                Built for Instant Presence.
              </span>
            </h1>

            <p className="text-text-muted text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl">
              Walk across interactive <strong className="text-text font-medium">3D Isometric WebGL</strong> floors,
              hear teammates naturally via <strong className="text-text font-medium">spatial proximity audio</strong>,
              step into soundproof glass conference rooms, and onboard coworkers with one password-protected invite link.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="px-6 py-3 bg-accent text-bg font-display font-semibold text-sm rounded-control shadow-arcade-sm hover:brightness-110 active:scale-[0.99] transition-all inline-flex items-center gap-2"
              >
                <IconPlus className="w-4 h-4" />
                <span>Create Team Office</span>
              </button>

              <Link
                href="/space/acme-hq"
                className="px-6 py-3 bg-surface-2/90 hover:bg-surface-2 border border-white/15 hover:border-accent/60 text-text font-display font-medium text-sm rounded-control transition-all inline-flex items-center gap-2"
              >
                <span>Enter Live 3D Demo</span>
                <IconArrowRight className="w-4 h-4 text-accent" />
              </Link>

              <Link
                href="/admin"
                className="px-4 py-3 text-text-muted hover:text-text font-medium text-sm transition-colors inline-flex items-center gap-1.5"
              >
                <IconLock className="w-4 h-4 text-accent-2" />
                <span>Boss Admin</span>
              </Link>
            </div>

            {/* Key Architectural Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-white/[0.08]">
              <div>
                <div className="font-display font-bold text-lg text-text">$0 / seat</div>
                <div className="text-xs text-text-muted">Free 4-seat Starter</div>
              </div>
              <div>
                <div className="font-display font-bold text-lg text-accent">HD SFU</div>
                <div className="text-xs text-text-muted">LiveKit Cloud Media</div>
              </div>
              <div>
                <div className="font-display font-bold text-lg text-text">60 FPS</div>
                <div className="text-xs text-text-muted">WebGL 3D &amp; 2D Canvas</div>
              </div>
              <div>
                <div className="font-display font-bold text-lg text-text">Zero Install</div>
                <div className="text-xs text-text-muted">Instant Browser Join</div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Architectural Office Preview Card */}
          <div className="lg:col-span-5">
            <div className="rounded-container border border-white/10 bg-bg/90 p-5 shadow-arcade space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
                  <span className="font-mono text-xs text-text whitespace-nowrap">/space/acme-hq</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-accent/15 text-accent border border-accent/30 whitespace-nowrap shrink-0">
                  Isometric 3D · Spatial Audio
                </span>
              </div>

              {/* Floor Zones Schematic */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/space/acme-hq?zone=open_desks"
                  className="p-3.5 rounded-card bg-surface border border-white/[0.08] hover:border-accent/50 transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text group-hover:text-accent transition-colors">
                      Open Workstations
                    </span>
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">
                    12 claimable dual-monitor desks with status badges.
                  </p>
                </Link>

                <Link
                  href="/space/acme-hq?zone=conf_boardroom"
                  className="p-3.5 rounded-card bg-surface border border-white/[0.08] hover:border-indigo-400/60 transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text group-hover:text-indigo-300 transition-colors">
                      Glass Boardroom
                    </span>
                    <IconLock className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">
                    Soundproof acoustic boundary &amp; screen theater.
                  </p>
                </Link>

                <Link
                  href="/space/acme-hq?zone=conf_huddle"
                  className="p-3.5 rounded-card bg-surface border border-white/[0.08] hover:border-violet-400/60 transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text group-hover:text-violet-300 transition-colors">
                      War Room
                    </span>
                    <IconLock className="w-3.5 h-3.5 text-violet-400" />
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">
                    Sprint huddle whiteboard &amp; door-knock chimes.
                  </p>
                </Link>

                <Link
                  href="/space/acme-hq?zone=lounge_breakroom"
                  className="p-3.5 rounded-card bg-surface border border-white/[0.08] hover:border-amber-400/60 transition-colors space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text group-hover:text-amber-300 transition-colors">
                      Lo-Fi Lounge
                    </span>
                    <IconSparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <p className="text-[11px] text-text-muted leading-snug">
                    Espresso boost bar &amp; continuous vinyl synthesizer.
                  </p>
                </Link>
              </div>

              <div className="p-3 rounded-control bg-surface-2/80 border border-white/[0.06] flex items-center justify-between text-[11px]">
                <span className="text-text-muted">Join lobby previews camera &amp; mic first</span>
                <Link href="/space/acme-hq" className="text-accent font-semibold hover:underline">
                  Test Lobby →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Spaces Grid with Container Queries + CSS Subgrid Row Alignment */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
              Ready-to-Launch Floors
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-text tracking-tight">
              Featured Office Spaces
            </h2>
            <p className="text-xs md:text-sm text-text-muted mt-1">
              Jump directly into a spatial floorplan or inspect every layout in the catalog.
            </p>
          </div>
          <Link
            href="/spaces"
            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Browse All Floorplans</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {FEATURED_SPACES.map((space) => (
            <Link
              key={space.slug}
              href={`/space/${space.slug}`}
              className="cq-card subgrid-card rounded-container border border-white/10 bg-surface hover:border-accent/60 shadow-arcade hover:-translate-y-0.5 transition-all overflow-hidden group"
            >
              {/* Track 1: Card Header */}
              <div className={`px-5 pt-5 pb-3 bg-gradient-to-b ${space.accentClass} space-y-2.5`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-surface-2 border border-white/10 text-text">
                    {space.tag}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-accent font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {space.status}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-text group-hover:text-accent transition-colors">
                  {space.name}
                </h3>
              </div>

              {/* Track 2: Description & Zones */}
              <div className="px-5 py-2 flex flex-col justify-between gap-3">
                <p className="text-xs text-text-muted leading-relaxed">
                  {space.tagline}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {space.zones.map((z) => (
                    <span
                      key={z}
                      className="px-2 py-0.5 text-[10px] font-mono rounded bg-surface-2/80 border border-white/[0.08] text-text-muted"
                    >
                      {z}
                    </span>
                  ))}
                </div>
              </div>

              {/* Track 3: Footer CTA */}
              <div className="px-5 py-3.5 mt-2 border-t border-white/[0.08] bg-surface-2/40 flex items-center justify-between text-xs font-semibold text-text">
                <span>Enter Floor</span>
                <IconArrowRight className="w-4 h-4 text-accent group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Capabilities Bento Grid */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
              Engine Architecture
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-text tracking-tight">
              Built for Modern Hybrid &amp; Remote Teams
            </h2>
            <p className="text-xs md:text-sm text-text-muted mt-1">
              Purpose-engineered for effortless voice/video collaboration without heavy meeting overhead.
            </p>
          </div>
          <Link
            href="/features"
            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>Explore Full Specs</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {OFFICE_CAPABILITIES.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.title}
                href={feat.href}
                className="cq-card subgrid-card p-6 rounded-container bg-surface border border-white/10 hover:border-accent/60 shadow-arcade hover:-translate-y-0.5 transition-all group"
              >
                {/* Track 1 */}
                <div className="flex items-center justify-between gap-3">
                  <span className="w-10 h-10 rounded-control bg-surface-2 border border-white/10 flex items-center justify-center text-accent group-hover:border-accent/50 transition-colors">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-accent/10 text-accent border border-accent/25 font-medium">
                    {feat.badge}
                  </span>
                </div>

                {/* Track 2 */}
                <div className="space-y-2 py-2">
                  <h3 className="font-display text-base font-bold text-text group-hover:text-accent transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                {/* Track 3 */}
                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs font-semibold text-accent">
                  <span>Open Module</span>
                  <IconArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Comparison Table Card */}
      <section className="rounded-container border border-white/10 bg-surface p-6 md:p-8 shadow-arcade space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="font-display text-xl md:text-2xl font-bold text-text tracking-tight">
              ForgeSpace vs. Traditional Virtual Offices
            </h2>
            <p className="text-xs md:text-sm text-text-muted mt-1">
              Flat admin pricing instead of runaway per-seat bills, paired with real SFU reliability.
            </p>
          </div>
          <Link
            href="/pricing"
            className="px-5 py-2.5 bg-accent text-bg font-display font-semibold text-xs rounded-control hover:brightness-110 shadow-arcade-sm inline-flex items-center gap-1.5 flex-shrink-0 self-start sm:self-auto transition-all"
          >
            <span>Compare Plans &amp; Cost</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-text-muted font-display uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Capability</th>
                <th className="py-3 px-4 text-accent font-bold">ForgeSpace</th>
                <th className="py-3 px-4">Gather.town</th>
                <th className="py-3 px-4">Zoom / Slack Huddles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-text">
              <tr>
                <td className="py-3.5 px-4 font-medium">Pricing Structure</td>
                <td className="py-3.5 px-4 text-accent font-semibold inline-flex items-center gap-1.5">
                  <IconCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Free 4-seat Starter · $9/mo flat Pro</span>
                </td>
                <td className="py-3.5 px-4 text-text-muted">$7 / seat / mo</td>
                <td className="py-3.5 px-4 text-text-muted">$13+ / seat / mo</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Employee Accounts Needed</td>
                <td className="py-3.5 px-4 text-accent font-semibold">Zero (Passcode invite links)</td>
                <td className="py-3.5 px-4 text-text-muted">Required per guest/seat</td>
                <td className="py-3.5 px-4 text-text-muted">Workspace accounts</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Media Routing &amp; NAT Traversal</td>
                <td className="py-3.5 px-4 text-accent font-semibold">LiveKit Cloud SFU + Managed TURN</td>
                <td className="py-3.5 px-4">Managed SFU</td>
                <td className="py-3.5 px-4">Cloud Video Grid</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">3D WebGL + Soundproof Pods</td>
                <td className="py-3.5 px-4 text-accent font-semibold">Isometric 3D + 2D Spatial Canvas</td>
                <td className="py-3.5 px-4 text-text-muted">2D Tilemap only</td>
                <td className="py-3.5 px-4 text-text-muted">Separate Breakout Calls</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Launch Custom Office Dialog */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Launch New Virtual Office"
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
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Apex Engineering HQ"
              maxLength={40}
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

          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Floorplan Preset
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text focus:outline-none focus:border-accent"
            >
              <option value="startup">Modern Tech HQ (12 Desks + Boardroom + Cafe)</option>
              <option value="studio">Creative Agency Loft (Design Pods + War Room)</option>
              <option value="cafe">Focus Study &amp; Coworking Cafe</option>
            </select>
          </div>

          <div className="p-3.5 bg-surface-2/80 border border-white/[0.08] rounded-card text-xs text-text-muted space-y-1.5">
            <span className="font-semibold text-text block">
              Included Spatial Capabilities:
            </span>
            <ul className="space-y-1 text-[11px] leading-relaxed">
              <li>12 claimable workstation desks with status indicators</li>
              <li>Soundproof Glass Boardroom &amp; War Room huddle zones</li>
              <li>HD screen sharing theater &amp; integrated whiteboard</li>
            </ul>
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
              className="px-5 py-2 text-xs bg-accent text-bg font-display font-semibold rounded-control shadow-arcade-sm hover:brightness-110 inline-flex items-center gap-1.5"
            >
              <span>Launch Space</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </div>
  );
}
