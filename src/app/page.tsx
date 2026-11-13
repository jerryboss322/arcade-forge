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
  status: string;
  bgGradient: string;
  zones: string[];
}

const FEATURED_SPACES: SpaceCard[] = [
  {
    slug: "acme-hq",
    name: "Acme Tech HQ",
    tagline: "Startup open workstation pods, soundproof glass boardroom, war room, and espresso lounge.",
    tag: "Remote Engineering HQ",
    status: "Open Floor",
    bgGradient: "from-blue-900/40 via-purple-900/20 to-surface-2",
    zones: ["Boardroom", "War Room", "12 Desks", "Cafe Lounge"],
  },
  {
    slug: "indie-studio",
    name: "Indie Dev Studio",
    tagline: "Creative team floor with Lo-Fi lounge, collaborative whiteboard and sprint war room.",
    tag: "Design & Product Studio",
    status: "Open Floor",
    bgGradient: "from-pink-900/40 via-red-900/20 to-surface-2",
    zones: ["Design Pods", "Sprint Whiteboard", "Social Lounge"],
  },
  {
    slug: "study-cafe",
    name: "Late Night Study Cafe",
    tagline: "Cozy library tables, coffee espresso bar, and ambient deep focus mode.",
    tag: "Coworking & Study",
    status: "Open Floor",
    bgGradient: "from-emerald-900/40 via-teal-900/20 to-surface-2",
    zones: ["Silent Desks", "Lo-Fi Radio", "Espresso Bar"],
  },
  {
    slug: "hacker-den",
    name: "Hacker Den & Standups",
    tagline: "Fast daily sync room with dual-monitor pods and HD presentation screen.",
    tag: "Daily Standups & Demos",
    status: "Open Floor",
    bgGradient: "from-amber-900/40 via-orange-900/20 to-surface-2",
    zones: ["Demo Screen", "Standup Circle", "Focus Desks"],
  },
];

const OFFICE_FEATURE_TEASERS = [
  {
    icon: "🧊",
    title: "3D Isometric WebGL Canvas",
    description: "Walk smoothly across your company floor with procedural 3D furniture, customizable avatars, and raycasted pathfinding.",
    href: "/features",
    badge: "Interactive 3D",
  },
  {
    icon: "🎙️",
    title: "Zero-Cost Spatial Audio",
    description: "Proximity WebRTC rolls off audio naturally over distance. No zoom fatigue, no constant muting/unmuting.",
    href: "/features",
    badge: "WebRTC Mesh",
  },
  {
    icon: "🔒",
    title: "Soundproof Glass Meeting Rooms",
    description: "Step into the Boardroom or War Room for instant confidential audio isolation and coworker door-knocking.",
    href: "/features",
    badge: "Private Rooms",
  },
  {
    icon: "📋",
    title: "War Room Whiteboards & Stickies",
    description: "Brainstorm sprints, sketch architecture diagrams, and manage tasks with sticky notes and PNG snapshot exports.",
    href: "/whiteboard",
    badge: "Standalone App",
  },
  {
    icon: "📅",
    title: "Office Sync Calendar & Agendas",
    description: "Book meeting rooms, view daily team standups, and warp coworkers directly to room locations.",
    href: "/schedule",
    badge: "Team Bookings",
  },
  {
    icon: "📊",
    title: "Truthful Telemetry & Pulse",
    description: "Verify actual floor presence, peer latency, and calculate your team's cloud savings over Gather or Zoom.",
    href: "/pulse",
    badge: "Real Telemetry",
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
          <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-text tracking-tight uppercase leading-tight">
            Your Team&apos;s Virtual Office <br />
            <span className="text-accent">With $0 Server Overhead</span>
          </h1>

          <p className="text-text-muted text-base md:text-lg leading-relaxed max-w-2xl">
            Bring back the spontaneous energy of working side-by-side. 
            Features <b>3D Isometric WebGL floors</b>, <b>P2P WebRTC spatial audio</b>, soundproof glass conference rooms, 
            claimable desks with status badges, and collaborative sprint whiteboards — right in your browser.
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
              <span>Enter 3D Demo Floor</span>
              <span className="text-accent">→</span>
            </Link>
          </div>

          {/* Quick Stats Pill Highlights */}
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
                WebGL 3D & 2D Canvas
              </span>
            </div>
            <div>
              <span className="font-display font-bold text-lg md:text-xl text-accent block">
                Soundproof
              </span>
              <span className="text-xs text-text-muted font-sans">
                Private Meeting Pods
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

      {/* Featured Spaces Showcase with Link to /spaces */}
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
          <Link
            href="/spaces"
            className="text-xs font-display font-bold text-accent hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All Floorplans</span>
            <span>→</span>
          </Link>
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
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {space.status}
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

      {/* Multi-Page Feature Hub Cards */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-xl md:text-2xl font-bold text-text uppercase tracking-wide">
              Virtual Office Platform Capabilities
            </h2>
            <p className="text-xs md:text-sm text-text-muted">
              Explore dedicated features and tools built specifically for remote team cohesion.
            </p>
          </div>
          <Link
            href="/features"
            className="text-xs font-display font-bold text-accent hover:underline flex items-center gap-1 self-start sm:self-auto"
          >
            <span>Read Complete Feature Specs</span>
            <span>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {OFFICE_FEATURE_TEASERS.map((feat) => (
            <Link
              key={feat.title}
              href={feat.href}
              className="p-6 rounded-container bg-surface border-2 border-border hover:border-accent shadow-arcade hover:-translate-y-1 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{feat.icon}</span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-accent/15 text-accent border border-accent/30 font-semibold">
                    {feat.badge}
                  </span>
                </div>
                <h3 className="font-display text-base font-bold text-text group-hover:text-accent transition-colors">
                  {feat.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="pt-4 mt-2 border-t border-border/60 flex items-center justify-between text-xs font-display font-bold text-accent">
                <span>Explore Page</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Compare Gather vs ForgeSpace Teaser with Link to /pricing */}
      <section className="rounded-container border-2 border-border bg-surface p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="font-display text-xl font-bold text-text uppercase tracking-wide">
              Compare: Gather.town vs ForgeSpace
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Why remote engineering teams are switching from high-cost commercial tools to our lightweight P2P architecture.
            </p>
          </div>
          <Link
            href="/pricing"
            className="px-5 py-2.5 bg-accent text-bg font-display font-bold text-xs rounded-control hover:brightness-110 shadow-sm flex items-center gap-1.5 flex-shrink-0 self-start sm:self-auto"
          >
            <span>Full Pricing & Cost Comparison</span>
            <span>→</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-border text-text-muted font-display uppercase tracking-wider">
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4 text-accent font-bold">ForgeSpace</th>
                <th className="py-3 px-4">Gather.town</th>
                <th className="py-3 px-4">Zoom / Slack</th>
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
                <td className="py-3 px-4 font-semibold">3D & 2D Canvas Engine</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (WebGL Isometric + 2D)</td>
                <td className="py-3 px-4">2D Sprite only</td>
                <td className="py-3 px-4 text-text-muted">No (Flat Video Grid)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Spatial Audio & Stereo Panning</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Web Audio API)</td>
                <td className="py-3 px-4">Yes</td>
                <td className="py-3 px-4 text-text-muted">No</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Soundproof Private Rooms</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Glass Boardrooms)</td>
                <td className="py-3 px-4">Yes</td>
                <td className="py-3 px-4 text-text-muted">Requires Separate Call</td>
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
