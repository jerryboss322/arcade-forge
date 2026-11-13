"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function PricingPage() {
  const [teamSize, setTeamSize] = useState(15);

  const gatherMonthlyCost = teamSize * 7.0;
  const zoomMonthlyCost = teamSize * 13.0;
  const annualSavingsVsGather = (gatherMonthlyCost * 12).toLocaleString();
  const annualSavingsVsZoom = (zoomMonthlyCost * 12).toLocaleString();

  return (
    <div className="py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-display text-xs font-semibold uppercase tracking-wider">
          Transparent $0 Server Cost Architecture
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-text uppercase tracking-tight">
          P2P WebRTC Means <span className="text-emerald-400">$0 Server Bills</span>
        </h1>
        <p className="text-sm md:text-base text-text-muted leading-relaxed">
          Traditional virtual offices charge $7 per seat every month to relay audio through expensive cloud data centers. ForgeSpace routes audio and video directly browser-to-browser.
        </p>
      </div>

      {/* Interactive Savings Calculator */}
      <div className="p-6 md:p-10 rounded-container border-2 border-border bg-surface shadow-arcade max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-text uppercase">
              Calculate Your Team&apos;s Annual Savings
            </h2>
            <p className="text-xs text-text-muted">
              Slide to match your remote engineering or product team size.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-display font-black text-accent">
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
          className="w-full accent-accent h-2 bg-surface-2 rounded-lg cursor-pointer"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="p-4 bg-surface-2 border border-border rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-muted">
              ForgeSpace Cost
            </span>
            <span className="text-2xl font-display font-black text-emerald-400 block">
              $0 / mo
            </span>
            <span className="text-xs text-text-muted font-sans">
              Free forever on browser P2P WebRTC
            </span>
          </div>

          <div className="p-4 bg-surface-2 border border-border rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-muted">
              Annual Savings vs Gather
            </span>
            <span className="text-2xl font-display font-black text-accent block">
              ${annualSavingsVsGather} / yr
            </span>
            <span className="text-xs text-text-muted font-sans">
              Based on $7/user/mo standard license
            </span>
          </div>

          <div className="p-4 bg-surface-2 border border-border rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-muted">
              Annual Savings vs Zoom
            </span>
            <span className="text-2xl font-display font-black text-text block">
              ${annualSavingsVsZoom} / yr
            </span>
            <span className="text-xs text-text-muted font-sans">
              Based on $13/user/mo Pro license
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {/* Tier 1: Open P2P Mesh */}
        <div className="p-8 rounded-container border-2 border-accent bg-surface shadow-arcade flex flex-col justify-between space-y-6 relative">
          <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold bg-accent text-bg uppercase">
            Most Popular
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-mono text-accent uppercase font-semibold">
                Open P2P Edition
              </span>
              <h3 className="font-display text-2xl font-extrabold text-text mt-1">
                Community & Teams
              </h3>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-display font-black text-emerald-400">$0</span>
              <span className="text-text-muted text-xs font-mono">/ user / forever</span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Full access to all 3D & 2D virtual office rooms, WebRTC proximity audio, soundproof meeting rooms, and collaborative whiteboards.
            </p>

            <ul className="space-y-2.5 pt-4 border-t border-border text-xs text-text">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Unlimited rooms & floorplans</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>P2P WebRTC spatial proximity audio</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>3D Isometric WebGL & 2D Top-Down canvas</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Soundproof glass boardrooms & door knocks</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Interactive whiteboard & sprint sticky notes</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Built-in Lo-Fi Radio & focus audio synth</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Zero server telemetry tracking or audio recording</span>
              </li>
            </ul>
          </div>

          <Link
            href="/spaces"
            className="w-full py-3 text-center bg-accent text-bg font-display font-bold text-xs uppercase rounded-control shadow-arcade hover:brightness-110 transition-all block"
          >
            Launch Your Office Now →
          </Link>
        </div>

        {/* Tier 2: Enterprise Self-Hosted */}
        <div className="p-8 rounded-container border-2 border-border bg-surface-2 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <span className="text-xs font-mono text-text-muted uppercase font-semibold">
                Self-Hosted & Dedicated
              </span>
              <h3 className="font-display text-2xl font-extrabold text-text mt-1">
                Enterprise Private
              </h3>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-display font-black text-text">Custom</span>
              <span className="text-text-muted text-xs font-mono">/ dedicated cluster</span>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              For security-conscious enterprises requiring bespoke architectural floorplans, SAML/Okta SSO single sign-on, and private on-premise TURN relay clusters.
            </p>

            <ul className="space-y-2.5 pt-4 border-t border-border text-xs text-text">
              <li className="flex items-center gap-2">
                <span className="text-accent font-bold">✓</span>
                <span>Everything in Open P2P Edition</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent font-bold">✓</span>
                <span>SAML / Okta / Google Workspace SSO</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent font-bold">✓</span>
                <span>Custom corporate headquarters 3D floorplan design</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent font-bold">✓</span>
                <span>Dedicated enterprise TURN servers for strict firewalls</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent font-bold">✓</span>
                <span>SOC2 Type II compliance audit reports</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-accent font-bold">✓</span>
                <span>24/7 dedicated engineering support & SLA</span>
              </li>
            </ul>
          </div>

          <Link
            href="/about"
            className="w-full py-3 text-center bg-surface border-2 border-border hover:border-accent text-text font-display font-bold text-xs uppercase rounded-control transition-all block"
          >
            Contact Enterprise Team →
          </Link>
        </div>
      </div>

      {/* Comprehensive Architectural Feature Comparison Table */}
      <div className="p-6 md:p-8 rounded-container border-2 border-border bg-surface space-y-6">
        <div>
          <h2 className="font-display text-xl md:text-2xl font-bold text-text uppercase">
            Head-to-Head Comparison
          </h2>
          <p className="text-xs md:text-sm text-text-muted mt-1">
            Detailed technical breakdown comparing ForgeSpace to legacy communication suites.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-border text-text-muted font-display uppercase tracking-wider">
                <th className="py-3 px-4">Capability</th>
                <th className="py-3 px-4 text-accent font-bold">ForgeSpace</th>
                <th className="py-3 px-4">Gather.town</th>
                <th className="py-3 px-4">Zoom / Google Meet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-text">
              <tr>
                <td className="py-3 px-4 font-semibold">User Pricing</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">$0 (Free P2P Mesh)</td>
                <td className="py-3 px-4 text-red-400">$7 / user / mo</td>
                <td className="py-3 px-4 text-red-400">$13.33 / user / mo</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">3D WebGL Spatial Floor</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Isometric WebGL)</td>
                <td className="py-3 px-4 text-text-muted">No (2D Top-down tile only)</td>
                <td className="py-3 px-4 text-text-muted">No</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Spatial Audio Distance Roll-off</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Web Audio API)</td>
                <td className="py-3 px-4">Yes</td>
                <td className="py-3 px-4 text-text-muted">No</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Soundproof Private Rooms</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Boardrooms & War Rooms)</td>
                <td className="py-3 px-4">Yes</td>
                <td className="py-3 px-4 text-text-muted">Requires Breakout Rooms</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Door Knocking & Passcode Access</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Synthesized Knock Chime)</td>
                <td className="py-3 px-4 text-text-muted">No</td>
                <td className="py-3 px-4 text-text-muted">Waiting room only</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Integrated Collaborative Whiteboard</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Vector + Sticky Notes)</td>
                <td className="py-3 px-4 text-text-muted">External iframe</td>
                <td className="py-3 px-4 text-text-muted">Limited</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Lo-Fi Focus Radio Synthesizer</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Yes (Built-in Web Audio)</td>
                <td className="py-3 px-4 text-text-muted">No</td>
                <td className="py-3 px-4 text-text-muted">No</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold">Server-Side Audio Recording</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">Zero (Never Recorded)</td>
                <td className="py-3 px-4 text-text-muted">Cloud Recorded</td>
                <td className="py-3 px-4 text-text-muted">Cloud Recorded</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="space-y-6 max-w-4xl mx-auto">
        <h2 className="font-display text-xl md:text-2xl font-bold text-text uppercase text-center">
          Frequently Asked Questions
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 bg-surface border border-border rounded-xl space-y-2">
            <h3 className="font-display font-bold text-sm text-text">
              How can ForgeSpace genuinely be $0 per user?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Traditional platforms route all video through expensive central cloud media servers (SFUs) that cost thousands of dollars in bandwidth. ForgeSpace routes audio directly between teammate browsers using peer-to-peer WebRTC, meaning our server bandwidth costs are virtually zero.
            </p>
          </div>

          <div className="p-5 bg-surface border border-border rounded-xl space-y-2">
            <h3 className="font-display font-bold text-sm text-text">
              Does this work through corporate firewalls?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Yes! WebRTC utilizes standard STUN protocol negotiation to establish direct UDP peer connections across NAT routers. For restrictive enterprise proxy environments, enterprise TURN relay clusters ensure 100% connection reliability.
            </p>
          </div>

          <div className="p-5 bg-surface border border-border rounded-xl space-y-2">
            <h3 className="font-display font-bold text-sm text-text">
              Can outside visitors join without an account?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Absolutely. Simply copy your office room link and share it. Coworkers or interview candidates click the link and walk right onto the floor with zero mandatory account registration or software downloads.
            </p>
          </div>

          <div className="p-5 bg-surface border border-border rounded-xl space-y-2">
            <h3 className="font-display font-bold text-sm text-text">
              Is my audio or video ever recorded?
            </h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Never. Because all WebRTC streams flow end-to-end encrypted directly between peer browsers, ForgeSpace servers never have access to raw audio/video frames or private conversations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
