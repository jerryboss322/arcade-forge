"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCheck,
  IconClose,
} from "@/components/ui/Icons";

export default function PricingPage() {
  const [teamSize, setTeamSize] = useState(15);

  const forgeMonthlyCost = teamSize <= 4 ? 0 : 9;
  const gatherMonthlyCost = teamSize * 7;
  const zoomMonthlyCost = teamSize * 13;
  const annualSavingsVsGather = Math.max(0, (gatherMonthlyCost - forgeMonthlyCost) * 12).toLocaleString();
  const annualSavingsVsZoom = Math.max(0, (zoomMonthlyCost - forgeMonthlyCost) * 12).toLocaleString();

  return (
    <div className="py-10 md:py-14 px-4 md:px-8 max-w-[1320px] mx-auto space-y-16">
      {/* Header */}
      <div className="max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/15 bg-surface text-[11px] font-mono uppercase tracking-[0.16em] text-text">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-accent font-semibold">04</span>
          <span className="text-white/25">/</span>
          <span>Boardroom Rates</span>
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-text tracking-[-0.03em] leading-[1.06]">
          Free for 4 people. One flat $9 bill when your team grows.
        </h1>
        <p className="text-sm md:text-base text-text-muted leading-relaxed">
          We never count employee seats. Only the team Keyholder holds an account; teammates click your passworded invite link and walk onto the floor.
        </p>
      </div>

      {/* Interactive Calculator Directly on Open Surface */}
      <div className="border-y border-white/10 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold text-text">
              How many people are on your floor?
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Slide to compare flat team billing vs. per-head pricing.
            </p>
          </div>
          <div className="font-display text-3xl font-extrabold text-accent">
            {teamSize} people
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-2">
          <div className="border-t border-accent/60 pt-4 space-y-1">
            <span className="text-[11px] font-mono uppercase text-text-muted">
              ForgeSpace
            </span>
            <span className="text-3xl font-display font-extrabold text-accent block">
              ${forgeMonthlyCost} / mo
            </span>
            <span className="text-xs text-text-muted block">
              {teamSize <= 4
                ? "Free forever under 4 seats"
                : "$9/mo flat Pro Keyholder plan"}
            </span>
          </div>

          <div className="border-t border-white/15 pt-4 space-y-1">
            <span className="text-[11px] font-mono uppercase text-text-muted">
              Saved vs. Gather
            </span>
            <span className="text-3xl font-display font-extrabold text-text block">
              ${annualSavingsVsGather} / yr
            </span>
            <span className="text-xs text-text-muted block">
              Versus $7 per seat / mo
            </span>
          </div>

          <div className="border-t border-white/15 pt-4 space-y-1">
            <span className="text-[11px] font-mono uppercase text-text-muted">
              Saved vs. Zoom
            </span>
            <span className="text-3xl font-display font-extrabold text-text block">
              ${annualSavingsVsZoom} / yr
            </span>
            <span className="text-xs text-text-muted block">
              Versus $13 per seat / mo
            </span>
          </div>
        </div>
      </div>

      {/* Unboxed Side-by-Side Plan Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-start">
        <div className="border-t-2 border-white/20 pt-6 space-y-6">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs font-mono text-text-muted uppercase">
                Starter Floor
              </span>
              <h3 className="font-display text-2xl font-bold text-text mt-1">
                Free Starter
              </h3>
            </div>
            <div className="text-right">
              <span className="text-4xl font-display font-extrabold text-text">$0</span>
              <span className="text-text-muted text-xs font-mono block">/ mo</span>
            </div>
          </div>

          <p className="text-sm text-text-muted leading-relaxed">
            Run one password-protected office floor for up to 4 people together at the same time.
          </p>

          <ul className="space-y-3 pt-4 border-t border-white/[0.08] text-xs text-text">
            <li className="flex items-center gap-2.5">
              <IconCheck className="w-4 h-4 text-accent shrink-0" />
              <span>1 passworded workspace link</span>
            </li>
            <li className="flex items-center gap-2.5">
              <IconCheck className="w-4 h-4 text-accent shrink-0" />
              <span>Up to 4 simultaneous teammates in room</span>
            </li>
            <li className="flex items-center gap-2.5">
              <IconCheck className="w-4 h-4 text-accent shrink-0" />
              <span>Webcam, spatial mic audio &amp; glass conference rooms</span>
            </li>
            <li className="flex items-center gap-2.5 text-text-muted">
              <IconClose className="w-4 h-4 text-text-muted shrink-0" />
              <span>HD screen sharing unlocks on Keyholder Pro</span>
            </li>
          </ul>

          <Link
            href="/admin"
            className="w-full py-3 px-4 border border-white/20 hover:border-accent text-text font-display font-semibold text-xs rounded-control transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <span>Open Starter Floor</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="border-t-2 border-accent pt-6 space-y-6">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs font-mono text-accent uppercase font-semibold">
                Keyholder Pro
              </span>
              <h3 className="font-display text-2xl font-bold text-text mt-1">
                Full Building
              </h3>
            </div>
            <div className="text-right">
              <span className="text-4xl font-display font-extrabold text-accent">$9</span>
              <span className="text-text-muted text-xs font-mono block">/ mo flat</span>
            </div>
          </div>

          <p className="text-sm text-text-muted leading-relaxed">
            One $9 key covers up to 30 concurrent coworkers across 20 dedicated floors. Still zero per-employee charges.
          </p>

          <ul className="space-y-3 pt-4 border-t border-white/[0.08] text-xs text-text">
            <li className="flex items-center gap-2.5">
              <IconCheck className="w-4 h-4 text-accent shrink-0" />
              <span>Up to 20 passworded office suites</span>
            </li>
            <li className="flex items-center gap-2.5">
              <IconCheck className="w-4 h-4 text-accent shrink-0" />
              <span>Up to 30 concurrent teammates per floor</span>
            </li>
            <li className="flex items-center gap-2.5">
              <IconCheck className="w-4 h-4 text-accent shrink-0" />
              <span>HD screen sharing &amp; shared Watch Mode unlocked</span>
            </li>
            <li className="flex items-center gap-2.5">
              <IconCheck className="w-4 h-4 text-accent shrink-0" />
              <span>Instant passcode rotation &amp; TURN relays</span>
            </li>
          </ul>

          <Link
            href="/admin"
            className="w-full py-3 px-4 bg-accent text-bg font-display font-bold text-xs rounded-control shadow-arcade-sm hover:brightness-110 transition-all inline-flex items-center justify-center gap-1.5"
          >
            <span>Open Keyholder Console</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Open Comparison Ledger */}
      <div className="border-t border-white/[0.08] pt-10 space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-text">
            Side-by-side breakdown
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/15 text-text-muted font-mono uppercase tracking-wider text-[11px]">
                <th className="py-3 pr-4">Detail</th>
                <th className="py-3 px-4 text-accent">ForgeSpace</th>
                <th className="py-3 px-4">Gather.town</th>
                <th className="py-3 pl-4">Zoom / Google Meet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08] text-text">
              <tr>
                <td className="py-3.5 pr-4 font-medium">Billing</td>
                <td className="py-3.5 px-4 text-accent font-semibold">Free for 4 · $9 flat Pro</td>
                <td className="py-3.5 px-4 text-text-muted">$7 / user / mo</td>
                <td className="py-3.5 pl-4 text-text-muted">$13.33 / user / mo</td>
              </tr>
              <tr>
                <td className="py-3.5 pr-4 font-medium">3D Spatial Office</td>
                <td className="py-3.5 px-4 font-medium">3D Isometric + 2D + Call View</td>
                <td className="py-3.5 px-4 text-text-muted">2D sprite floor only</td>
                <td className="py-3.5 pl-4 text-text-muted">No</td>
              </tr>
              <tr>
                <td className="py-3.5 pr-4 font-medium">Spatial Distance Audio</td>
                <td className="py-3.5 px-4 font-medium">Distance roll-off + stereo pan</td>
                <td className="py-3.5 px-4">Yes</td>
                <td className="py-3.5 pl-4 text-text-muted">No</td>
              </tr>
              <tr>
                <td className="py-3.5 pr-4 font-medium">Soundproof Rooms</td>
                <td className="py-3.5 px-4 font-medium">Glass Boardroom &amp; War Room</td>
                <td className="py-3.5 px-4">Private zones</td>
                <td className="py-3.5 pl-4 text-text-muted">Breakout links</td>
              </tr>
              <tr>
                <td className="py-3.5 pr-4 font-medium">Guest Access</td>
                <td className="py-3.5 px-4 font-medium">Passcode door link (no login)</td>
                <td className="py-3.5 px-4 text-text-muted">Guest logins required</td>
                <td className="py-3.5 pl-4 text-text-muted">Waiting room</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
