"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import {
  ForgeSpaceMark,
  IconArrowRight,
  IconLock,
  IconPlus,
} from "@/components/ui/Icons";

interface BossHeaderUser {
  id: string;
  username: string;
  email: string;
  plan: string;
}

const DIRECTORY_LINKS = [
  { href: "/spaces", label: "Floorplans" },
  { href: "/pricing", label: "Rates" },
  { href: "/admin", label: "Keyholder" },
];

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [bossUser, setBossUser] = useState<BossHeaderUser | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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
      <header className="sticky top-0 z-40 h-16 bg-bg/92 backdrop-blur-xl border-b border-white/[0.07]">
        <div className="max-w-[1320px] mx-auto h-full px-4 sm:px-6 md:px-8 flex items-center justify-between gap-4">
          {/* Left: Brand + 3 Minimal Directory Links */}
          <div className="flex items-center gap-6 min-w-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none flex-shrink-0"
            >
              <ForgeSpaceMark className="w-7 h-7 transition-transform group-hover:scale-105" />
              <span className="font-display text-base font-bold tracking-tight text-text">
                ForgeSpace
              </span>
            </Link>

            <span aria-hidden="true" className="hidden md:block h-4 w-px bg-white/10" />

            <nav
              className="hidden md:flex items-center gap-5"
              aria-label="Building directory"
            >
              {DIRECTORY_LINKS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-xs transition-colors py-1 border-b ${
                      active
                        ? "border-accent text-text font-medium"
                        : "border-transparent text-text-muted hover:text-text"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center: Door Buzzer ("Knock: /space/ acme-hq") */}
          <form
            onSubmit={handleQuickJoin}
            className="flex-1 max-w-[320px] hidden lg:block"
          >
            <div className="flex items-center bg-surface/90 border border-[color:var(--color-border-strong)]/70 focus-within:border-accent rounded-control transition-colors pr-1">
              <label
                htmlFor="door-buzzer-input"
                className="pl-3 pr-1 text-[11px] font-mono select-none whitespace-nowrap flex items-center gap-1 shrink-0"
              >
                <span className="text-accent font-semibold">Knock:</span>
                <span className="text-text-muted">/space/</span>
              </label>
              <input
                id="door-buzzer-input"
                type="text"
                value={quickJoinCode}
                onChange={(e) => setQuickJoinCode(e.target.value)}
                placeholder="acme-hq"
                aria-label="Door buzzer room slug"
                className="flex-1 min-w-0 h-8 pr-2 bg-transparent text-xs text-text placeholder:text-text-muted/50 focus:outline-none font-mono"
              />
              <button
                type="submit"
                className="shrink-0 px-2.5 py-1 text-[11px] font-mono font-semibold bg-surface-2 hover:bg-accent text-text hover:text-bg rounded-[6px] border border-white/10 transition-colors"
              >
                Ring
              </button>
            </div>
          </form>

          {/* Right: Single Primary Action + Signed-in Account Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {bossUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Keyholder account menu"
                  aria-expanded={userMenuOpen}
                  className="h-9 px-2.5 rounded-control bg-surface border border-white/10 hover:border-accent/60 flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold border border-accent/40 shrink-0">
                    {bossUser.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline text-xs font-medium text-text">
                    @{bossUser.username}
                  </span>
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 rounded-control border border-white/10 bg-surface shadow-arcade-lg p-1.5 z-50"
                    onMouseLeave={() => setUserMenuOpen(false)}
                  >
                    <div className="px-2.5 py-2 border-b border-white/[0.08] mb-1">
                      <p className="text-xs font-semibold text-text truncate">
                        @{bossUser.username}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">{bossUser.email}</p>
                    </div>
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
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="h-9 px-3.5 rounded-control bg-accent hover:brightness-110 text-bg font-display font-bold text-xs shadow-arcade-sm active:scale-[0.98] transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <IconPlus className="w-3.5 h-3.5 shrink-0" />
              <span>Open Floor</span>
            </button>
          </div>
        </div>
      </header>

      {/* Clean Mobile Bottom Bar */}
      <nav
        aria-label="Mobile directory"
        style={{
          paddingBottom: "max(0.35rem, env(safe-area-inset-bottom, 0px))",
          paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
          paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
        }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 min-h-14 bg-bg/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around"
      >
        <Link
          href="/"
          className={`min-h-[44px] inline-flex items-center py-2 px-3 text-xs font-medium transition-colors ${
            pathname === "/" ? "text-accent" : "text-text-muted hover:text-text"
          }`}
        >
          Lobby
        </Link>
        {DIRECTORY_LINKS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-h-[44px] inline-flex items-center py-2 px-3 text-xs font-medium transition-colors ${
                active ? "text-accent" : "text-text-muted hover:text-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Open New Floor Modal */}
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

          <div className="p-3.5 bg-surface-2/70 border border-white/[0.08] rounded-control text-xs text-text-muted flex items-center gap-2">
            <IconLock className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              Want a password-locked link?{" "}
              <Link
                href="/admin"
                onClick={() => setCreateModalOpen(false)}
                className="text-accent font-medium hover:underline"
              >
                Open Keyholder Console
              </Link>
            </span>
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
              <span>Step Inside</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </>
  );
}
