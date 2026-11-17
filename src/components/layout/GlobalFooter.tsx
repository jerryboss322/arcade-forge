"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForgeSpaceMark } from "@/components/ui/Icons";

export function GlobalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/space/")) {
    return null;
  }

  return (
    <footer className="border-t border-white/[0.08] bg-surface/50 text-text-muted mt-20 pb-20 md:pb-10">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <ForgeSpaceMark className="w-7 h-7" />
              <span className="font-display text-base font-bold text-text tracking-tight">
                Forge<span className="text-accent">Space</span>
              </span>
            </Link>
            <p className="text-xs text-text-muted leading-relaxed max-w-sm">
              Browser-based 3D and 2D spatial offices powered by LiveKit Cloud SFU and encrypted proximity rooms. Instant team presence with zero mandatory employee accounts.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-accent">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Real-Time SFU Presence · Zero Simulated Bots</span>
            </div>
          </div>

          {/* Col 1: Platform */}
          <div className="space-y-3">
            <div className="text-xs font-display font-semibold text-text">
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
                  Pricing &amp; Plans
                </Link>
              </li>
              <li>
                <Link href="/space/acme-hq" className="hover:text-accent transition-colors inline-flex items-center gap-1.5">
                  <span>Demo Floor</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-accent/15 text-accent border border-accent/30">
                    3D
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Office Apps */}
          <div className="space-y-3">
            <div className="text-xs font-display font-semibold text-text">
              Workspace Tools
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

          {/* Col 3: Resources */}
          <div className="space-y-3">
            <div className="text-xs font-display font-semibold text-text">
              Resources
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/admin" className="hover:text-accent transition-colors">
                  Boss Admin Portal
                </Link>
              </li>
              <li>
                <Link href="/docs" className="hover:text-accent transition-colors">
                  User Guide &amp; FAQ
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-accent transition-colors">
                  Architecture &amp; Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-text-muted">
          <div>
            &copy; {new Date().getFullYear()} ForgeSpace. All rights reserved. Privacy-first remote collaboration.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs#webrtc" className="hover:text-accent transition-colors">
              LiveKit Diagnostics
            </Link>
            <span>·</span>
            <Link href="/pricing" className="hover:text-accent transition-colors">
              Free 4-Seat Tier
            </Link>
            <span>·</span>
            <Link href="/about" className="hover:text-accent transition-colors">
              Privacy First
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
