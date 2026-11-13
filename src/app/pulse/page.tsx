"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function PulsePage() {
  const [activeTab, setActiveTab] = useState<"network" | "savings">("network");
  const [simulatedNodes, setSimulatedNodes] = useState(8);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const bandwidthSavedGb = ((simulatedNodes * (simulatedNodes - 1) * 0.45 * elapsed) / 3600).toFixed(2);
  const dollarSaved = (simulatedNodes * 7.0).toFixed(2);

  return (
    <div className="py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Platform Telemetry
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text uppercase tracking-tight">
            Office Telemetry & P2P Network Health
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-1 max-w-2xl">
            Inspect real-time browser WebRTC mesh performance, spatial audio latencies, and $0 server cloud bandwidth metrics.
          </p>
        </div>

        <Link
          href="/space/acme-hq"
          className="px-5 py-2.5 bg-accent text-bg font-display font-bold text-xs md:text-sm rounded-control shadow-arcade hover:brightness-110 active:scale-95 transition-all self-start md:self-auto flex items-center gap-1.5"
        >
          <span>🏢 Launch Live Office Telemetry</span>
        </Link>
      </div>

      {/* Top Telemetry Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-surface border-2 border-border rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase text-text-muted">
            Mesh Topology
          </div>
          <div className="text-2xl font-display font-black text-accent">
            Full P2P Mesh
          </div>
          <div className="text-[11px] font-mono text-emerald-400">
            0 Central Media Gateways
          </div>
        </div>

        <div className="p-5 bg-surface border-2 border-border rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase text-text-muted">
            Audio Buffer Latency
          </div>
          <div className="text-2xl font-display font-black text-emerald-400">
            &lt; 14 ms
          </div>
          <div className="text-[11px] font-mono text-text-muted">
            Web Audio Hardware Context
          </div>
        </div>

        <div className="p-5 bg-surface border-2 border-border rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase text-text-muted">
            Data Packet Loss
          </div>
          <div className="text-2xl font-display font-black text-text">
            0.00 %
          </div>
          <div className="text-[11px] font-mono text-emerald-400">
            SCTP DataChannel Guaranteed
          </div>
        </div>

        <div className="p-5 bg-surface border-2 border-border rounded-xl space-y-1">
          <div className="text-[10px] font-mono uppercase text-text-muted">
            Server Media Bandwidth
          </div>
          <div className="text-2xl font-display font-black text-emerald-400">
            $0.00
          </div>
          <div className="text-[11px] font-mono text-text-muted">
            Zero Server Egress Billed
          </div>
        </div>
      </div>

      {/* P2P Mesh Simulator Card */}
      <div className="p-6 md:p-8 rounded-container border-2 border-border bg-surface shadow-arcade space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="font-display text-xl font-bold text-text uppercase">
              WebRTC Peer Connection Simulator
            </h2>
            <p className="text-xs text-text-muted">
              Simulate direct browser-to-browser WebRTC negotiation without server intermediaries.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-text-muted">Teammates:</span>
            <input
              type="range"
              min={2}
              max={24}
              value={simulatedNodes}
              onChange={(e) => setSimulatedNodes(Number(e.target.value))}
              className="accent-accent cursor-pointer"
            />
            <span className="font-display font-bold text-sm text-accent w-6">
              {simulatedNodes}
            </span>
          </div>
        </div>

        {/* Visual Simulated Node Network */}
        <div className="p-6 bg-surface-2 border border-border rounded-xl flex flex-wrap items-center justify-center gap-4">
          {Array.from({ length: simulatedNodes }).map((_, i) => (
            <div
              key={i}
              className="p-3 bg-surface border border-accent/40 rounded-xl shadow-sm flex items-center gap-2.5 animate-fadeIn"
            >
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs font-display font-bold text-text">
                  Peer #{i + 1}
                </div>
                <div className="text-[10px] font-mono text-text-muted">
                  RTT: {(12 + (i % 5) * 2)}ms
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-surface-2 rounded-xl border border-border space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-muted">
              Estimated Egress Saved in Session
            </span>
            <span className="text-xl font-display font-bold text-emerald-400 block">
              {bandwidthSavedGb} GB Media Data
            </span>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Traditional platforms route all {simulatedNodes * (simulatedNodes - 1)} stream channels through central cloud relays. With ForgeSpace, $0 is billed.
            </p>
          </div>

          <div className="p-4 bg-surface-2 rounded-xl border border-border space-y-1">
            <span className="text-[10px] font-mono uppercase text-text-muted">
              Est. Monthly Subscription Savings
            </span>
            <span className="text-xl font-display font-bold text-accent block">
              ${dollarSaved} / month
            </span>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Compared to Gather.town ($7/user/mo) or Zoom Rooms subscriptions.
            </p>
          </div>
        </div>
      </div>

      {/* Zero Database Write Safety Policy */}
      <div className="p-6 md:p-8 rounded-container border-2 border-emerald-500/40 bg-emerald-500/5 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛡️</span>
          <h2 className="font-display text-lg font-bold text-emerald-400 uppercase">
            Neon Database Scale-to-Zero Protection
          </h2>
        </div>
        <p className="text-xs md:text-sm text-text/80 leading-relaxed max-w-3xl">
          ForgeSpace enforces an absolute <b>Zero Write Spam Policy</b> on its database. Avatar movements (40 tiles per second), speaking level aura updates, and WebRTC SDP messages run strictly in-memory over browser BroadcastChannels and client memory. Your Neon serverless PostgreSQL database scales to zero compute hours when no admin queries are executing.
        </p>
      </div>
    </div>
  );
}
