"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCheck,
  IconClose,
  IconShieldCheck,
} from "@/components/ui/Icons";

export default function PricingPage() {
  const [teamSize, setTeamSize] = useState(15);

  const forgeMonthlyCost = teamSize <= 4 ? 0 : 9;
  const gatherMonthlyCost = teamSize * 7;
  const zoomMonthlyCost = teamSize * 13;
  const annualSavingsVsGather = Math.max(0, (gatherMonthlyCost - forgeMonthlyCost) * 12).toLocaleString();
  const annualSavingsVsZoom = Math.max(0, (zoomMonthlyCost - forgeMonthlyCost) * 12).toLocaleString();

  return (
    <div className="py-10 md:py-12 px-4 md:px-8 max-w-[1280px] mx-auto space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent font-mono text-xs">
          <IconShieldCheck className="w-3.5 h-3.5" />
          <span>Flat Admin Billing · $0 Per Employee Seat</span>
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-text tracking-[-0.03em]">
          Simple Flat Pricing.{" "}
          <span className="text-accent">Zero Per-Seat Taxes.</span>
        </h1>
        <p className="text-sm md:text-base text-text-muted leading-relaxed">
          Legacy virtual offices bill every seat you invite. With ForgeSpace, only the workspace admin holds a plan while coworkers join instantaneously via passworded links.
        </p>
      </div>

      {/* Interactive Flat-Rate Savings Calculator */}
      <div className="p-6 md:p-10 rounded-container border border-white/10 bg-surface shadow-arcade max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-text tracking-tight">
              Team Cost &amp; Savings Estimator
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Slide to match your remote engineering or product squad size.
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-2xl font-display font-extrabold text-accent">
              {teamSize} Coworkers
            </span>
          </div>
        </div>

        <input
          type="range"
          min={2}
          max={150}
          value={teamSize}
          onChange={(e) => setTeamSize(Number(e.target.value))}
          aria-label="Team size"
          className="w-full accent-accent h-2 bg-surface-2 rounded-lg cursor-pointer"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-5 bg-bg/70 border border-white/[0.08] rounded-card space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-text-muted">
              ForgeSpace Flat Cost
            </span>
            <span className="text-2xl font-display font-extrabold text-accent block">
              ${forgeMonthlyCost} / mo
            </span>
            <span className="text-xs text-text-muted block">
              {teamSize <= 4
                ? "Covered by Free Starter tier"
                : "$9/mo flat Pro admin license"}
            </span>
          </div>

          <div className="p-5 bg-bg/70 border border-white/[0.08] rounded-card space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-text-muted">
              Annual Savings vs. Gather
            </span>
            <span className="text-2xl font-display font-extrabold text-text block">
              ${annualSavingsVsGather} / yr
            </span>
            <span className="text-xs text-text-muted block">
              Compared to $7/user/mo standard rate
            </span>
          </div>

          <div className="p-5 bg-bg/70 border border-white/[0.08] rounded-card space-y-1.5">
            <span className="text-[11px] font-mono uppercase text-text-muted">
              Annual Savings vs. Zoom
            </span>
            <span className="text-2xl font-display font-extrabold text-text block">
              ${annualSavingsVsZoom} / yr
            </span>
            <span className="text-xs text-text-muted block">
              Compared to $13/user/mo Pro license
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
        {/* Tier 1: Free Starter */}
        <div className="p-8 rounded-container border border-white/10 bg-surface shadow-arcade flex flex-col justify-between space-y-6 relative">
          <div className="absolute top-5 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-surface-2 text-text-muted border border-white/10 uppercase">
            Starter
          </div>

          <div className="space-y-5">
            <div>
              <span className="text-xs font-mono text-accent uppercase font-semibold">
                Free Starter Plan
              </span>
              <h3 className="font-display text-2xl font-bold text-text mt-1 tracking-tight">
                Small Squads &amp; Trials
              </h3>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-display font-extrabold text-text">$0</span>
              <span className="text-text-muted text-xs font-mono">/ mo forever</span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              One Boss/Admin account launches 1 password-protected office for up to 4 concurrent participants. Employees join directly by link with zero account creation.
            </p>

            <ul className="space-y-3 pt-4 border-t border-white/[0.08] text-xs text-text">
              <li className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span>1 passworded Boss workspace</span>
              </li>
              <li className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span>Up to 4 concurrent participants per room</span>
              </li>
              <li className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span>LiveKit SFU webcam, spatial audio &amp; room chat</span>
              </li>
              <li className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span>Zero employee accounts or seat tracking</span>
              </li>
              <li className="flex items-center gap-2.5 text-text-muted">
                <IconClose className="w-4 h-4 text-warn shrink-0" />
                <span>HD screen sharing unlocked on Boss Pro</span>
              </li>
            </ul>
          </div>

          <Link
            href="/admin"
            className="w-full py-3 px-4 text-center bg-surface-2 border border-white/15 hover:border-accent/60 text-text font-display font-semibold text-xs rounded-control transition-all inline-flex items-center justify-center gap-1.5"
          >
            <span>Start Free Workspace</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tier 2: Boss Pro Team */}
        <div className="p-8 rounded-container border border-accent/60 bg-gradient-to-b from-surface to-surface-2/80 shadow-arcade-lg flex flex-col justify-between space-y-6 relative">
          <div className="absolute top-5 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-accent text-bg uppercase">
            Most Popular
          </div>

          <div className="space-y-5">
            <div>
              <span className="text-xs font-mono text-accent uppercase font-semibold">
                Boss / Admin Pro
              </span>
              <h3 className="font-display text-2xl font-bold text-text mt-1 tracking-tight">
                Growing Teams
              </h3>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-display font-extrabold text-accent">$9</span>
              <span className="text-text-muted text-xs font-mono">/ mo flat · $0 per employee</span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Still only one admin account needed. Run up to 20 dedicated workspaces for up to 30 concurrent employees per room with zero seat surcharges.
            </p>

            <ul className="space-y-3 pt-4 border-t border-white/[0.08] text-xs text-text">
              <li className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span>Up to 20 password-protected workspaces</span>
              </li>
              <li className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span>Up to 30 concurrent coworkers per space</span>
              </li>
              <li className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span>HD Screen Sharing &amp; Watch Theater unlocked</span>
              </li>
              <li className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span>Instant passcode rotation &amp; room revocation</span>
              </li>
              <li className="flex items-center gap-2.5">
                <IconCheck className="w-4 h-4 text-accent shrink-0" />
                <span>Priority LiveKit SFU + managed TURN relays</span>
              </li>
            </ul>
          </div>

          <Link
            href="/admin"
            className="w-full py-3 px-4 text-center bg-accent text-bg font-display font-semibold text-xs rounded-control shadow-arcade-sm hover:brightness-110 transition-all inline-flex items-center justify-center gap-1.5"
          >
            <span>Open Boss Admin Portal</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Head-to-Head Comparison Table */}
      <div className="p-6 md:p-8 rounded-container border border-white/10 bg-surface shadow-arcade space-y-6">
        <div>
          <h2 className="font-display text-xl md:text-2xl font-bold text-text tracking-tight">
            Platform Architecture Comparison
          </h2>
          <p className="text-xs md:text-sm text-text-muted mt-1">
            Side-by-side breakdown of ForgeSpace against traditional remote meeting software.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-text-muted font-display uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Capability</th>
                <th className="py-3 px-4 text-accent font-bold">ForgeSpace</th>
                <th className="py-3 px-4">Gather.town</th>
                <th className="py-3 px-4">Zoom / Google Meet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-text">
              <tr>
                <td className="py-3.5 px-4 font-medium">Team Billing</td>
                <td className="py-3.5 px-4 text-accent font-semibold">$0 Starter · $9/mo flat Pro</td>
                <td className="py-3.5 px-4 text-text-muted">$7 / user / mo</td>
                <td className="py-3.5 px-4 text-text-muted">$13.33 / user / mo</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">3D WebGL Spatial Floor</td>
                <td className="py-3.5 px-4 text-accent font-semibold">Yes (Isometric WebGL + 2D)</td>
                <td className="py-3.5 px-4 text-text-muted">2D top-down tiles only</td>
                <td className="py-3.5 px-4 text-text-muted">No</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Spatial Audio Distance Roll-off</td>
                <td className="py-3.5 px-4 text-accent font-semibold">Yes (Web Audio API + SFU)</td>
                <td className="py-3.5 px-4">Yes</td>
                <td className="py-3.5 px-4 text-text-muted">No</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Soundproof Private Rooms</td>
                <td className="py-3.5 px-4 text-accent font-semibold">Boardrooms &amp; War Rooms</td>
                <td className="py-3.5 px-4">Yes</td>
                <td className="py-3.5 px-4 text-text-muted">Manual breakout calls</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Passcode Links &amp; Knocking</td>
                <td className="py-3.5 px-4 text-accent font-semibold">Yes (Zero employee logins)</td>
                <td className="py-3.5 px-4 text-text-muted">Guest logins required</td>
                <td className="py-3.5 px-4 text-text-muted">Waiting room only</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Cloud Audio Recording</td>
                <td className="py-3.5 px-4 text-accent font-semibold">Zero Server Recording</td>
                <td className="py-3.5 px-4 text-text-muted">Optional cloud capture</td>
                <td className="py-3.5 px-4 text-text-muted">Cloud recorded</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-6 max-w-4xl mx-auto">
        <h2 className="font-display text-xl md:text-2xl font-bold text-text tracking-tight text-center">
          Frequently Asked Questions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-surface border border-white/10 rounded-card space-y-2">
            <h3 className="font-display font-semibold text-sm text-text">
              Why are there no per-employee seat fees?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Only your admin signs in to create and manage workspaces. Everyone else joins directly with a room passcode link and display name—no individual user licenses required.
            </p>
          </div>

          <div className="p-5 bg-surface border border-white/10 rounded-card space-y-2">
            <h3 className="font-display font-semibold text-sm text-text">
              Does it work behind corporate firewalls?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Yes. Audio and video stream over LiveKit Cloud SFU with automatic ICE, STUN, and managed TURN relays so calls connect reliably even behind strict corporate NATs.
            </p>
          </div>

          <div className="p-5 bg-surface border border-white/10 rounded-card space-y-2">
            <h3 className="font-display font-semibold text-sm text-text">
              Can guests or candidates join without installing anything?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Yes. Share your workspace URL and passcode—teammates or guests preview their camera in the lobby and walk onto the floor in seconds from any modern browser.
            </p>
          </div>

          <div className="p-5 bg-surface border border-white/10 rounded-card space-y-2">
            <h3 className="font-display font-semibold text-sm text-text">
              Are conversations ever recorded on the server?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Never. Media frames traverse encrypted DTLS/SRTP channels strictly for real-time delivery and are never persisted or transcribed on ForgeSpace servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
