"use client";

import React from "react";
import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="py-8 px-4 md:px-8 max-w-[1280px] mx-auto space-y-12">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <div className="text-xs font-mono text-accent uppercase tracking-wider mb-1">
          Documentation & Help
        </div>
        <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text uppercase tracking-tight">
          ForgeSpace User Guide & Controls
        </h1>
        <p className="text-xs md:text-sm text-text-muted mt-1 max-w-2xl">
          Everything you need to know about navigating the 3D office floor, spatial audio zones, interactive furniture, and WebRTC network settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2 text-xs font-display font-semibold">
          <div className="text-[10px] font-mono text-text-muted uppercase tracking-wider mb-2">
            Table of Contents
          </div>
          <a
            href="#movement"
            className="block px-3 py-2 rounded-control bg-surface-2 text-accent border border-border"
          >
            1. Avatar Movement & Controls
          </a>
          <a
            href="#audio-zones"
            className="block px-3 py-2 rounded-control text-text-muted hover:text-text hover:bg-surface transition-colors"
          >
            2. Spatial Audio & Soundproof Zones
          </a>
          <a
            href="#interactive"
            className="block px-3 py-2 rounded-control text-text-muted hover:text-text hover:bg-surface transition-colors"
          >
            3. Interactive Objects & Furniture
          </a>
          <a
            href="#webrtc"
            className="block px-3 py-2 rounded-control text-text-muted hover:text-text hover:bg-surface transition-colors"
          >
            4. WebRTC Network Troubleshooting
          </a>
        </div>

        {/* Content Body */}
        <div className="lg:col-span-3 space-y-10">
          {/* Section 1: Movement */}
          <section id="movement" className="p-6 md:p-8 rounded-container bg-surface border-2 border-border shadow-arcade space-y-4">
            <h2 className="font-display text-xl font-bold text-text uppercase">
              1. Avatar Movement & Navigation
            </h2>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              ForgeSpace supports smooth 60 FPS movement in both <b>3D Isometric WebGL</b> and <b>2D Top-Down</b> views.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-surface-2 rounded-xl border border-border space-y-1.5">
                <span className="font-display font-bold text-accent text-xs">
                  Keyboard Controls:
                </span>
                <ul className="text-xs text-text-muted space-y-1 list-disc pl-4 font-sans">
                  <li><b className="text-text">WASD</b> or <b className="text-text">Arrow Keys</b>: Walk in 4 directions.</li>
                  <li>Avatar rotates towards your walking direction with dynamic walking bob physics.</li>
                </ul>
              </div>

              <div className="p-4 bg-surface-2 rounded-xl border border-border space-y-1.5">
                <span className="font-display font-bold text-accent text-xs">
                  Click / Tap to Move:
                </span>
                <ul className="text-xs text-text-muted space-y-1 list-disc pl-4 font-sans">
                  <li>Click or tap anywhere on the 3D floor.</li>
                  <li>A raycasted Breadth-First-Search (BFS) pathfinder computes waypoints around desks and walls automatically.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Spatial Audio */}
          <section id="audio-zones" className="p-6 md:p-8 rounded-container bg-surface border-2 border-border shadow-arcade space-y-4">
            <h2 className="font-display text-xl font-bold text-text uppercase">
              2. Spatial Audio & Soundproof Zones
            </h2>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Audio volume is calculated dynamically using the Euclidean distance between avatars on the 40x26 floor grid.
            </p>

            <div className="p-4 bg-surface-2 rounded-xl border border-border font-mono text-xs space-y-2">
              <div className="text-text font-bold">Proximity Attenuation Rules:</div>
              <div className="text-emerald-400">Distance &le; 4 tiles: 100% Volume (Crystal clear conversation)</div>
              <div className="text-amber-400">Distance 4 to 8 tiles: Smooth linear volume roll-off</div>
              <div className="text-red-400">Distance &gt; 8 tiles: 0% Volume (Complete silence)</div>
            </div>

            <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl text-xs space-y-1">
              <span className="font-display font-bold text-accent">🔒 Soundproof Glass Boundary:</span>
              <p className="text-text-muted font-sans leading-relaxed">
                When you step into the <b>Glass Boardroom</b> or <b>Sprint War Room</b>, sound is automatically isolated. Coworkers standing right outside the glass wall cannot hear internal conversation.
              </p>
            </div>
          </section>

          {/* Section 3: Interactive Furniture */}
          <section id="interactive" className="p-6 md:p-8 rounded-container bg-surface border-2 border-border shadow-arcade space-y-4">
            <h2 className="font-display text-xl font-bold text-text uppercase">
              3. Interactive Objects & Furniture
            </h2>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              Walk up to any object on the floor and press <b className="text-accent">E</b> or click the interaction prompt:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-surface-2 rounded-lg border border-border space-y-1">
                <span className="font-display font-bold text-text">📻 Lo-Fi Focus Radio:</span>
                <p className="text-text-muted font-sans">Tune between Midnight Coding, Rainy Cafe, and Deep Space synth stations.</p>
              </div>
              <div className="p-3 bg-surface-2 rounded-lg border border-border space-y-1">
                <span className="font-display font-bold text-text">☕ Espresso Machine:</span>
                <p className="text-text-muted font-sans">Brews espresso with steam audio and activates +50% movement speed for 20s.</p>
              </div>
              <div className="p-3 bg-surface-2 rounded-lg border border-border space-y-1">
                <span className="font-display font-bold text-text">💻 Workstation Desk:</span>
                <p className="text-text-muted font-sans">Claim your personal desk, set status (Deep Focus, Lunch, In Meeting), and title.</p>
              </div>
              <div className="p-3 bg-surface-2 rounded-lg border border-border space-y-1">
                <span className="font-display font-bold text-text">📋 Sprint Whiteboard:</span>
                <p className="text-text-muted font-sans">Draw architecture diagrams or manage yellow/pink/blue sticky notes.</p>
              </div>
            </div>
          </section>

          {/* Section 4: Network Troubleshooting */}
          <section id="webrtc" className="p-6 md:p-8 rounded-container bg-surface border-2 border-border shadow-arcade space-y-4">
            <h2 className="font-display text-xl font-bold text-text uppercase">
              4. WebRTC Network Troubleshooting
            </h2>
            <p className="text-xs text-text-muted leading-relaxed font-sans">
              ForgeSpace requires camera/microphone browser permissions and WebRTC UDP peer connections.
            </p>

            <ul className="text-xs text-text-muted space-y-2 list-disc pl-4 font-sans">
              <li><b>Permissions:</b> If camera or microphone fails to start, click the lock icon in your browser URL bar and set Camera/Microphone to &quot;Allow&quot;.</li>
              <li><b>Browser Support:</b> Chrome, Edge, Firefox, Brave, and Safari all support standard WebRTC and WebGL 3D acceleration natively.</li>
              <li><b>Corporate VPNs:</b> If peer video does not connect, ensure your VPN does not block UDP ports or STUN traffic (stun:stun.l.google.com:19302).</li>
            </ul>

            <div className="pt-2">
              <Link
                href="/pulse"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-bg font-display font-bold text-xs rounded-control hover:brightness-110"
              >
                <span>Check Live Network Telemetry</span>
                <span>→</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
