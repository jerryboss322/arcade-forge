"use client";

import React from "react";
import Link from "next/link";

export function GlobalFooter() {
  return (
    <footer className="border-t-2 border-border bg-surface text-text-muted mt-20 pb-20 md:pb-8">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-7 h-7 rounded-control bg-accent border-2 border-black shadow-arcade-sm flex items-center justify-center font-display text-bg font-bold text-xs">
                FS
              </span>
              <span className="font-display text-base font-bold text-text uppercase tracking-wider">
                Forge<span className="text-accent">Space</span>
              </span>
            </Link>
            <p className="text-xs text-text-muted leading-relaxed max-w-sm font-sans">
              Pure 3D & 2D virtual office platform for remote engineering and creative teams. Built with P2P WebRTC mesh technology for $0 server bandwidth overhead.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>100% Truthful Presence • Zero Simulated Bots</span>
            </div>
          </div>

          {/* Col 1: Platform */}
          <div className="space-y-3">
            <div className="text-xs font-display font-bold uppercase tracking-wider text-text">
              Platform
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/spaces" className="hover:text-accent transition-colors">
                  Floorplan Catalog
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-accent transition-colors">
                  Feature Specifications
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-accent transition-colors">
                  Pricing & Comparison
                </Link>
              </li>
              <li>
                <Link href="/space/acme-hq" className="hover:text-accent transition-colors flex items-center gap-1.5">
                  <span>Demo Floor</span>
                  <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-accent/20 text-accent">3D</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: War Room Tools */}
          <div className="space-y-3">
            <div className="text-xs font-display font-bold uppercase tracking-wider text-text">
              Office Apps
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/whiteboard" className="hover:text-accent transition-colors">
                  Interactive Whiteboard
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="hover:text-accent transition-colors">
                  Meeting Scheduler
                </Link>
              </li>
              <li>
                <Link href="/pulse" className="hover:text-accent transition-colors">
                  Live Telemetry
                </Link>
              </li>
              <li>
                <Link href="/space/study-cafe" className="hover:text-accent transition-colors">
                  Lo-Fi Study Cafe
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Company & Resources */}
          <div className="space-y-3">
            <div className="text-xs font-display font-bold uppercase tracking-wider text-text">
              Resources
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/about" className="hover:text-accent transition-colors">
                  Mission & Story
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-accent transition-colors">
                  User Guide & FAQ
                </Link>
              </li>
              <li>
                <Link href="/pulse" className="hover:text-accent transition-colors">
                  P2P Savings Calculator
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-text-muted">
          <div>
            &copy; {new Date().getFullYear()} ForgeSpace. All rights reserved. Zero surveillance remote work.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs#webrtc" className="hover:text-accent">
              WebRTC Diagnostics
            </Link>
            <span>•</span>
            <Link href="/pricing" className="hover:text-accent">
              $0 Free Tier
            </Link>
            <span>•</span>
            <Link href="/about" className="hover:text-accent">
              Privacy First
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
