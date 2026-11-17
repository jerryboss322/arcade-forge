"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import {
  ForgeSpaceMark,
  IconChevronDown,
  IconPlus,
  IconArrowRight,
  IconLock,
} from "@/components/ui/Icons";

interface BossHeaderUser {
  id: string;
  username: string;
  email: string;
  plan: string;
}

const PRIMARY_LINKS = [
  { href: "/spaces", label: "Offices" },
  { href: "/admin", label: "Boss Admin" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Guide" },
];

const WORKSPACE_TOOLS = [
  { href: "/whiteboard", label: "Whiteboard", desc: "Shared sketchpad & diagramming" },
  { href: "/schedule", label: "Schedule", desc: "Team sync & huddle bookings" },
  { href: "/pulse", label: "Pulse", desc: "Live platform & latency status" },
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
      <header className="sticky top-0 z-40 h-16 bg-bg/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-[1280px] mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-4">
          {/* Left: Brand + Consolidated Navigation */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none flex-shrink-0"
            >
              <ForgeSpaceMark className="w-8 h-8 group-hover:scale-105 transition-transform" />
              <span className="font-display text-base md:text-lg font-bold tracking-tight text-text">
                Forge<span className="text-accent">Space</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Primary navigation">
              {PRIMARY_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-control text-xs font-medium transition-colors ${
                      active
                        ? "bg-white/[0.08] text-text border border-white/10"
                        : "text-text-muted hover:text-text hover:bg-white/[0.04]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {/* Tools Dropdown */}
              <div className="relative" onMouseLeave={() => setToolsMenuOpen(false)}>
                <button
                  type="button"
                  onClick={() => setToolsMenuOpen((v) => !v)}
                  aria-expanded={toolsMenuOpen}
                  className={`px-3 py-1.5 rounded-control text-xs font-medium inline-flex items-center gap-1 transition-colors ${
                    WORKSPACE_TOOLS.some((t) => t.href === pathname)
                      ? "bg-white/[0.08] text-text border border-white/10"
                      : "text-text-muted hover:text-text hover:bg-white/[0.04]"
                  }`}
                >
                  <span>Tools</span>
                  <IconChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>

                {toolsMenuOpen && (
                  <div className="absolute left-0 mt-1.5 w-60 rounded-card border border-white/10 bg-surface/95 backdrop-blur-xl shadow-arcade p-1.5 z-50">
                    {WORKSPACE_TOOLS.map((tool) => (
                      <Link
                        key={tool.href}
                        href={tool.href}
                        onClick={() => setToolsMenuOpen(false)}
                        className="block px-3 py-2 rounded-control hover:bg-white/[0.05] transition-colors"
                      >
                        <div className="text-xs font-semibold text-text">{tool.label}</div>
                        <div className="text-[11px] text-text-muted mt-0.5">{tool.desc}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Center: Quick Join Slug Bar */}
          <form
            onSubmit={handleQuickJoin}
            className="flex-1 max-w-[270px] hidden md:block"
          >
            <div className="relative flex items-center">
              <span className="absolute left-3 text-[11px] text-text-muted font-mono select-none pointer-events-none">
                /space/
              </span>
              <input
                type="text"
                value={quickJoinCode}
                onChange={(e) => setQuickJoinCode(e.target.value)}
                placeholder="room-slug"
                aria-label="Quick join office"
                className="w-full h-9 pl-16 pr-14 rounded-control bg-surface-2/80 border border-[color:var(--color-border-strong)]/70 text-xs text-text placeholder:text-text-muted/70 focus:outline-none focus:border-accent transition-colors font-mono"
              />
              <button
                type="submit"
                className="absolute right-1 px-2.5 py-1 text-[11px] font-semibold bg-white/[0.08] hover:bg-accent text-text hover:text-bg rounded-[7px] transition-colors"
              >
                Join
              </button>
            </div>
          </form>

          {/* Right: Demo + Create Space + Boss Auth */}
          <div className="flex items-center gap-2">
            <Link
              href="/space/acme-hq"
              className="hidden sm:inline-flex h-9 px-3 rounded-control text-xs font-medium bg-surface-2/80 border border-white/10 text-text hover:border-accent/60 items-center gap-2 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>Live Demo</span>
            </Link>

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 px-3.5 rounded-control bg-accent hover:brightness-110 text-bg font-display font-semibold text-xs shadow-arcade-sm active:scale-[0.98] transition-all inline-flex items-center gap-1.5"
            >
              <IconPlus className="w-3.5 h-3.5" />
              <span>New Space</span>
            </button>

            {bossUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Boss account menu"
                  aria-expanded={userMenuOpen}
                  className="h-9 px-2.5 rounded-control bg-surface border border-white/10 hover:border-accent/60 flex items-center gap-2 transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold border border-accent/40">
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
                    className="absolute right-0 mt-2 w-56 rounded-card border border-white/10 bg-surface/95 backdrop-blur-xl shadow-arcade-lg p-2 z-50"
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
                        className="flex items-center justify-between w-full px-2.5 py-1.5 rounded-control text-xs font-medium text-text hover:bg-white/[0.06] hover:text-accent transition-colors"
                      >
                        <span>Boss Admin Portal</span>
                        <IconArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleBossSignOut()}
                        className="w-full text-left px-2.5 py-1.5 rounded-control text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
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
                className="h-9 px-3 rounded-control bg-surface border border-white/10 hover:border-white/25 inline-flex items-center text-xs font-medium text-text transition-colors"
              >
                Boss Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 min-h-14 pb-[env(safe-area-inset-bottom)] bg-bg/90 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-2"
      >
        {PRIMARY_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center py-2 px-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-accent" : "text-text-muted hover:text-text"
              }`}
            >
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Create Demo Office Dialog */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Launch New Virtual Office"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateOffice} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Workspace Name
            </label>
            <input
              type="text"
              required
              value={newOfficeName}
              onChange={(e) => handleOfficeNameChange(e.target.value)}
              placeholder="e.g. Apex Engineering HQ"
              maxLength={40}
              className="w-full px-3.5 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text mb-1.5">
              Workspace URL Slug
            </label>
            <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
              <span className="select-none">/space/</span>
              <input
                type="text"
                required
                value={newOfficeSlug}
                onChange={(e) => setNewOfficeSlug(e.target.value)}
                placeholder="apex-engineering"
                className="flex-1 px-3 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="p-3.5 bg-surface-2/80 border border-white/[0.08] rounded-card text-xs text-text-muted space-y-2">
            <span className="font-semibold text-text block">
              Included Spatial Floorplan
            </span>
            <ul className="space-y-1 text-[11px] leading-relaxed">
              <li>12 claimable workstation desks with live status badges</li>
              <li>Soundproof Glass Boardroom &amp; War Room huddle zones</li>
              <li>Lo-Fi lounge with radio synthesizer &amp; collaborative whiteboard</li>
            </ul>
            <div className="pt-2 border-t border-white/[0.08] flex items-center gap-1.5 text-[11px]">
              <IconLock className="w-3.5 h-3.5 text-accent shrink-0" />
              <span>
                Need a password-protected team room?{" "}
                <Link
                  href="/admin"
                  onClick={() => setCreateModalOpen(false)}
                  className="text-accent font-medium hover:underline"
                >
                  Create in Boss Admin
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
              className="px-5 py-2 text-xs bg-accent text-bg font-display font-semibold rounded-control shadow-arcade-sm hover:brightness-110 inline-flex items-center gap-1.5 transition-all"
            >
              <span>Launch Space</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </>
  );
}
