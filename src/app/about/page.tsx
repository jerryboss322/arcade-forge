"use client";

import React from "react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/40 text-accent font-display text-xs font-semibold uppercase tracking-wider">
          Our Mission & Philosophy
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-text uppercase tracking-tight">
          Bringing Human Connection Back to Remote Teams
        </h1>
        <p className="text-sm md:text-base text-text-muted leading-relaxed">
          We believe remote work should feel like sitting across from your favorite teammate—without Zoom fatigue, invasive surveillance software, or expensive monthly seat licenses.
        </p>
      </div>

      {/* Core Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-container bg-surface border-2 border-border shadow-arcade space-y-3">
          <span className="text-3xl">🕊️</span>
          <h2 className="font-display text-lg font-bold text-text">
            Zero Surveillance Culture
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            We reject employee tracking, keystroke logging, and mandatory webcam policies. ForgeSpace is built on trust: step into the office when you want spontaneous camaraderie, and mute or leave when you need deep solitary focus.
          </p>
        </div>

        <div className="p-6 rounded-container bg-surface border-2 border-border shadow-arcade space-y-3">
          <span className="text-3xl">🌐</span>
          <h2 className="font-display text-lg font-bold text-text">
            100% Open Web Standards
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            No proprietary electron wrappers that consume 8GB of RAM. ForgeSpace is built entirely on native WebGL canvas rendering, browser Web Audio API synthesis, and peer-to-peer WebRTC data channels.
          </p>
        </div>

        <div className="p-6 rounded-container bg-surface border-2 border-border shadow-arcade space-y-3">
          <span className="text-3xl">💚</span>
          <h2 className="font-display text-lg font-bold text-text">
            Truthful Presence
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            We never display fake online counts or simulated avatars. If a room shows 4 teammates, those are 4 verified human coworkers connected over WebRTC right now.
          </p>
        </div>
      </div>

      {/* Technical Architecture Story */}
      <div className="p-8 rounded-container bg-surface border-2 border-border shadow-arcade space-y-6">
        <h2 className="font-display text-2xl font-bold text-text uppercase">
          Why We Built ForgeSpace
        </h2>
        <div className="space-y-4 text-xs md:text-sm text-text-muted leading-relaxed font-sans">
          <p>
            In 2020, remote work promised freedom from commutes and endless open-plan office distractions. But in its place came a different exhaustion: 8 consecutive hours of flat grid video calls where everyone is looking directly into a camera, fighting over a single microphone channel, and terrified of speaking up.
          </p>
          <p>
            Physical offices had a superpower that Zoom never understood: <b>spatial proximity</b>. You didn&apos;t schedule a 30-minute calendar invite to ask a 10-second question; you rolled your swivel chair over, asked, laughed, and went back to coding.
          </p>
          <p>
            Commercial virtual offices attempted to solve this, but charged $7 to $15 per seat every month by routing video through bloated cloud servers. We designed ForgeSpace with direct peer-to-peer WebRTC mesh routing and WebGL 3D rendering to make high-fidelity spatial remote work accessible to every team for $0.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center space-y-4 pt-4">
        <h2 className="font-display text-xl font-bold text-text uppercase">
          Experience the Difference Today
        </h2>
        <div className="flex justify-center gap-3">
          <Link
            href="/spaces"
            className="px-6 py-3 bg-accent text-bg font-display font-bold text-xs rounded-control shadow-arcade hover:brightness-110 transition-all"
          >
            Launch Your Virtual Floor →
          </Link>
          <Link
            href="/features"
            className="px-6 py-3 bg-surface-2 border border-border text-text font-display font-semibold text-xs rounded-control hover:bg-surface transition-all"
          >
            Explore Features
          </Link>
        </div>
      </div>
    </div>
  );
}
