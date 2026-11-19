"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import {
  ForgeSpaceMark,
  IconArrowRight,
  IconChevronDown,
  IconLock,
  IconPlus,
} from "@/components/ui/Icons";

interface BossHeaderUser {
  id: string;
  username: string;
  email: string;
  plan: string;
}

const DIRECTORY_SUITES = [
  { href: "/spaces", floor: "01", label: "Floorplans" },
  { href: "/admin", floor: "02", label: "Keyholder" },
  { href: "/features", floor: "03", label: "Rooms" },
  { href: "/pricing", floor: "04", label: "Rates" },
  { href: "/docs", floor: "05", label: "Manual" },
];

const ANNEX_ROOMS = [
  { href: "/whiteboard", label: "War Room Board", desc: "Shared diagram sketchpad" },
  { href: "/schedule", label: "Room Calendar", desc: "Sync bookings & times" },
  { href: "/pulse", label: "Building Pulse", desc: "Live audio & latency telemetry" },
];

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [bossUser, setBossUser] = useState<BossHeaderUser | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [quickJoinCode, setQuickJoinCode] = useState("");
  const [newOfficeName, setNewOfficeName] = useState("");
  const [newOfficeSlug, setNewOfficeSlug] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: BossHeaderUser | null } | null) => {
        if (!cancelled) setBossUser(data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setBossUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const handleBossSignOut = async () => {
    setUserMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setBossUser(null);
    router.refresh();
  };

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickJoinCode.trim()) return;
    const clean = quickJoinCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!clean) return;
    router.push(`/space/${clean}`);
    setQuickJoinCode("");
  };

  const handleCreateOffice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficeSlug.trim()) return;
    setCreateModalOpen(false);
    router.push(`/space/${newOfficeSlug.trim()}`);
  };

  const handleOfficeNameChange = (val: string) => {
    setNewOfficeName(val);
    setNewOfficeSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  if (pathname?.startsWith("/space/")) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-40 h-16 bg-bg/90 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-[1320px] mx-auto h-full px-3 sm:px-6 md:px-8 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Lobby Emblem + Building Directory Index */}
          <div className="flex items-center gap-4 lg:gap-5 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none flex-shrink-0"
            >
              <ForgeSpaceMark className="w-8 h-8 group-hover:scale-105 transition-transform" />
              <div className="flex flex-col">
                <span className="font-display text-base md:text-lg font-bold tracking-tight text-text leading-none">
                  ForgeSpace
                </span>
                <span className="hidden sm:block text-[9px] font-mono uppercase tracking-[0.18em] text-text-muted mt-0.5">
                  Lobby · HQ
                </span>
              </div>
            </Link>

            <span
              aria-hidden="true"
              className="hidden lg:block h-5 w-px bg-white/10"
            />

            <nav
              className="hidden lg:flex items-center gap-0.5"
              aria-label="Building directory"
            >
              {DIRECTORY_SUITES.map((suite) => {
                const active = pathname === suite.href;
                return (
                  <Link
                    key={suite.href}
                    href={suite.href}
                    className={`px-2.5 py-1.5 rounded-sm text-xs transition-colors flex items-center gap-1.5 border-b-2 ${
                      active
                        ? "border-accent text-text font-medium"
                        : "border-transparent text-text-muted hover:text-text"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-accent/80">
                      {suite.floor}
                    </span>
                    <span>{suite.label}</span>
                  </Link>
                );
              })}

              {/* Annex Dropdown */}
              <div className="relative" onMouseLeave={() => setToolsMenuOpen(false)}>
                <button
                  type="button"
                  onClick={() => setToolsMenuOpen((v) => !v)}
                  aria-expanded={toolsMenuOpen}
                  className={`px-2.5 py-1.5 rounded-sm text-xs inline-flex items-center gap-1 border-b-2 transition-colors ${
                    ANNEX_ROOMS.some((t) => t.href === pathname)
                      ? "border-accent text-text font-medium"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                >
                  <span>Annex</span>
                  <IconChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>

                {toolsMenuOpen && (
                  <div className="absolute left-0 mt-2 w-60 rounded-control border border-white/10 bg-surface shadow-arcade-lg p-1.5 z-50">
                    <div className="px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted border-b border-white/[0.06] mb-1">
                      Shared Annex Rooms
                    </div>
                    {ANNEX_ROOMS.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={() => setToolsMenuOpen(false)}
                        className="block px-2.5 py-2 rounded-[6px] hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="text-xs font-medium text-text">{tool.label}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">{tool.desc}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Center: Door Buzzer ("Knock: /space/room-slug") */}
          <form
            onSubmit={handleQuickJoin}
            className="flex-1 max-w-[300px] hidden md:block"
          >
            <div className="relative flex items-center bg-surface border border-[color:var(--color-border-strong)]/80 focus-within:border-accent rounded-control transition-colors">
              <label
                htmlFor="door-buzzer-input"
                className="pl-2.5 pr-1 text-[11px] font-mono select-none whitespace-nowrap flex items-center gap-1"
              >
                <span className="text-accent font-semibold">Knock:</span>
                <span className="text-text-muted">/space/</span>
              </label>
              <input
                id="door-buzzer-input"
                type="text"
                value={quickJoinCode}
                onChange={(e) => setQuickJoinCode(e.target.value)}
                placeholder="room-slug"
                aria-label="Door buzzer room slug"
                className="w-full h-9 pr-14 bg-transparent text-xs text-text placeholder:text-text-muted/50 focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="absolute right-1 px-2.5 py-1 text-[11px] font-mono font-semibold bg-surface-2 hover:bg-accent text-text hover:text-bg rounded-[6px] border border-white/10 transition-colors"
              >
                Ring
              </button>
            </div>
          </form>

          {/* Right: Open Floor + Keyholder Account */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href="/space/acme-hq"
              className="hidden sm:inline-flex h-9 px-3 rounded-control text-xs font-medium bg-surface border border-white/10 text-text hover:border-accent/60 items-center gap-2 transition-colors whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>Walk Demo</span>
            </Link>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 px-2.5 sm:px-3.5 rounded-control bg-accent hover:brightness-110 text-bg font-display font-bold text-xs shadow-arcade-sm active:scale-[0.98] transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <IconPlus className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">New</span>
              <span className="hidden sm:inline">Open Floor</span>
            </button>

            {bossUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Boss account menu"
                  aria-expanded={userMenuOpen}
                  className="h-9 px-2.5 rounded-control bg-surface border border-white/10 hover:border-accent/60 flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold border border-accent/40 shrink-0">
                    {bossUser.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline text-xs font-medium text-text">
                    @{bossUser.username}
                  </span>
                  <span className="hidden md:inline px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-accent uppercase">
                    {bossUser.plan}
                  </span>
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-control border border-white/10 bg-surface shadow-arcade-lg p-2 z-50"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-2.5 py-2 border-b border-white/[0.08] mb-1.5">
                      <p className="text-xs font-semibold text-text truncate">
                        @{bossUser.username}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">{bossUser.email}</p>
                    </div>

                    <div className="space-y-1">
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-[6px] text-xs font-medium text-text hover:bg-white/[0.06] hover:text-accent transition-colors"
                      >
                        <span>Keyholder Console</span>
                        <IconArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleBossSignOut()}
                        className="w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/admin"
                className="h-9 px-2.5 sm:px-3 rounded-control bg-surface border border-white/10 hover:border-white/25 inline-flex items-center text-xs font-medium text-text transition-colors whitespace-nowrap"
              >
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">Keyholder</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Directory Bar */}
      <nav
        aria-label="Mobile directory"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 min-h-14 pb-[env(safe-area-inset-bottom)] bg-bg/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-2"
      >
        {DIRECTORY_SUITES.map((suite) => {
          const active = pathname === suite.href;
          return (
            <Link
              key={suite.href}
              href={suite.href}
              className={`flex flex-col items-center justify-center py-2 px-2 text-[11px] font-medium transition-colors ${
                active ? "text-accent" : "text-text-muted hover:text-text"
              }`}
            >
              <span>{suite.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Launch Custom Office Floor Dialog */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Open a New Office Floor"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateOffice} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Office Name
            </label>
            <input
              type="text"
              required
              value={newOfficeName}
              onChange={(e) => handleOfficeNameChange(e.target.value)}
              placeholder="e.g. Studio Fourth Floor"
              maxLength={40}
              className="w-full px-3.5 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Door Buzzer Slug
            </label>
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <span className="select-none">Knock: /space/</span>
              <input
                type="text"
                required
                value={newOfficeSlug}
                onChange={(e) => setNewOfficeSlug(e.target.value)}
                placeholder="studio-fourth-floor"
                className="flex-1 px-3 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="p-3.5 bg-surface-2/70 border border-white/[0.08] rounded-control text-xs text-text-muted space-y-2">
            <span className="font-semibold text-text block">
              Waiting on this floor:
            </span>
            <ul className="space-y-1 text-[11px] leading-relaxed">
              <li>12 claimable desks with focus status lights</li>
              <li>Soundproof Glass Boardroom &amp; War Room whiteboard</li>
              <li>Lo-Fi lounge &amp; drop-in espresso bar</li>
            </ul>
            <div className="pt-2 border-t border-white/[0.08] flex items-center gap-1.5 text-[11px]">
              <IconLock className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                Need a locked team link?{" "}
                <Link
                  href="/admin"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-accent font-medium hover:underline"
                >
                  Open Keyholder Console
                </Link>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-text-muted hover:text-text rounded-control transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs bg-accent text-bg font-display font-bold rounded-control shadow-arcade-sm hover:brightness-110 inline-flex items-center gap-1.5 transition-all"
            >
              <span>Unlock &amp; Enter</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </>
  );
}
