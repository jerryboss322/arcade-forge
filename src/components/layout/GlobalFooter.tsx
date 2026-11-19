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
    <footer className="border-t border-white/[0.08] bg-bg text-text-muted mt-16 pb-20 md:pb-10">
      <div className="max-w-[1320px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="col-span-2 space-y-3">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <ForgeSpaceMark className="w-7 h-7" />
              <span className="font-display text-base font-bold text-text tracking-tight">
                ForgeSpace
              </span>
            </Link>
            <p className="text-xs text-text-muted leading-relaxed max-w-sm">
              Walk onto your remote floor in a browser tab. Talk to whoever you walk beside, shut the glass door when you need quiet, and knock to join.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span>Free for 4 people · No install · Live spatial audio</span>
            </div>
          </div>

          {/* Building Floors */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-text">
              Directory
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/spaces" className="hover:text-accent transition-colors">
                  01 Floorplans
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-accent transition-colors">
                  02 Keyholder
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-accent transition-colors">
                  03 Room Specs
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-accent transition-colors">
                  04 Rates
                </Link>
              </li>
            </ul>
          </div>

          {/* Annex */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-text">
              Annex
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/whiteboard" className="hover:text-accent transition-colors">
                  War Room Board
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="hover:text-accent transition-colors">
                  Room Calendar
                </Link>
              </li>
              <li>
                <Link href="/pulse" className="hover:text-accent transition-colors">
                  Building Pulse
                </Link>
              </li>
              <li>
                <Link href="/space/acme-hq" className="hover:text-accent transition-colors">
                  Acme HQ Demo Floor
                </Link>
              </li>
            </ul>
          </div>

          {/* Front Desk */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-text">
              Front Desk
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/docs" className="hover:text-accent transition-colors">
                  Manual &amp; Shortcuts
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-accent transition-colors">
                  Privacy &amp; Architecture
                </Link>
              </li>
              <li>
                <Link href="/space/study-cafe" className="hover:text-accent transition-colors">
                  Late Night Cafe
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono text-text-muted">
          <div>
            &copy; {new Date().getFullYear()} ForgeSpace · Quiet by default, open on knock.
          </div>
          <div className="flex items-center gap-4">
            <Link href="/docs#webrtc" className="hover:text-accent transition-colors">
              Audio Diagnostics
            </Link>
            <span>·</span>
            <Link href="/pricing" className="hover:text-accent transition-colors">
              Free for 4
            </Link>
            <span>·</span>
            <Link href="/about" className="hover:text-accent transition-colors">
              Zero Recording
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
