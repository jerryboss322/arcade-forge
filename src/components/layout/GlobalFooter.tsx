"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ForgeSpaceMark } from "@/components/ui/Icons";

const FOOTER_LINKS = [
  { href: "/spaces", label: "Floorplans" },
  { href: "/pricing", label: "Rates" },
  { href: "/admin", label: "Keyholder" },
  { href: "/features", label: "Rooms" },
  { href: "/whiteboard", label: "Whiteboard" },
  { href: "/schedule", label: "Calendar" },
  { href: "/pulse", label: "Pulse" },
  { href: "/docs", label: "Manual" },
  { href: "/about", label: "Privacy" },
];

export function GlobalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/space/")) {
    return null;
  }

  return (
    <footer className="border-t border-white/[0.07] bg-bg text-text-muted mt-12 pb-20 md:pb-10">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 md:px-8 py-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <ForgeSpaceMark className="w-6 h-6" />
            <span className="font-display text-sm font-bold text-text tracking-tight">
              ForgeSpace
            </span>
          </Link>

          <nav aria-label="Footer directory" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-text-muted hover:text-accent transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-text-muted/80">
          <span>&copy; {new Date().getFullYear()} ForgeSpace · Quiet by default, open on knock.</span>
          <span>Free for 4 people · Zero server recording</span>
        </div>
      </div>
    </footer>
  );
}
