"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useArcade } from "@/components/providers/ArcadeProvider";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";

export function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    currentUser,
    users,
    switchUser,
  } = useArcade();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickJoinCode, setQuickJoinCode] = useState("");
  const [newOfficeName, setNewOfficeName] = useState("");
  const [newOfficeSlug, setNewOfficeSlug] = useState("");

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickJoinCode.trim()) return;
    const clean = quickJoinCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
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

  return (
    <>
      <header className="sticky top-0 z-40 h-14 md:h-16 bg-bg border-b-2 border-border">
        <div className="max-w-[1280px] mx-auto h-full px-4 md:px-8 flex items-center justify-between gap-4">
          {/* Left: Logo + Nav Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <span className="w-8 h-8 rounded-control bg-accent border-2 border-black shadow-arcade-sm flex items-center justify-center font-display text-bg font-bold text-sm group-hover:-translate-y-0.5 transition-transform">
                FS
              </span>
              <span className="font-display text-base md:text-lg tracking-wider text-text uppercase">
                Forge<span className="text-accent">Space</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-control text-sm font-semibold transition-colors ${
                  pathname === "/"
                    ? "bg-surface-2 text-text border-2 border-border"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Offices
              </Link>
              <Link
                href="/space/acme-hq"
                className={`px-3 py-1.5 rounded-control text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith("/space/acme-hq")
                    ? "bg-surface-2 text-text border-2 border-border"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <span>Demo HQ</span>
                <span className="px-1.5 py-0.5 text-[10px] font-display rounded-full bg-emerald-400 text-bg font-bold">
                  LIVE
                </span>
              </Link>
              <Link
                href="/#features"
                className="px-3 py-1.5 rounded-control text-sm font-semibold text-text-muted hover:text-text transition-colors"
              >
                Features
              </Link>
              <Link
                href="/#pricing"
                className="px-3 py-1.5 rounded-control text-sm font-semibold text-text-muted hover:text-text transition-colors"
              >
                Pricing ($0 P2P)
              </Link>
            </nav>
          </div>

          {/* Center: Quick Join Space Bar (max 380px wide) */}
          <form
            onSubmit={handleQuickJoin}
            className="flex-1 max-w-[360px] hidden sm:block"
          >
            <div className="relative flex items-center">
              <span className="absolute left-3 text-xs text-text-muted font-mono select-none">
                /space/
              </span>
              <input
                type="text"
                value={quickJoinCode}
                onChange={(e) => setQuickJoinCode(e.target.value)}
                placeholder="office-slug to join..."
                aria-label="Quick join office"
                className="w-full h-10 pl-16 pr-12 rounded-control bg-surface-2 border-2 border-border text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors font-mono"
              />
              <button
                type="submit"
                className="absolute right-1.5 px-2.5 py-1 text-[11px] font-display font-bold bg-accent text-bg rounded-control hover:brightness-110"
              >
                Join
              </button>
            </div>
          </form>

          {/* Right: + Create Office + User Dropdown */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="h-10 px-4 rounded-control bg-accent hover:brightness-110 text-bg font-semibold text-sm border-2 border-black shadow-arcade-sm active:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <span>+ Create Office</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Account menu"
                className="h-10 px-2.5 rounded-control bg-surface border-2 border-border hover:border-accent flex items-center gap-2 transition-colors"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-bg border border-black"
                  style={{ backgroundColor: currentUser.avatarColor || "#37E6C4" }}
                >
                  {currentUser.username.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden lg:inline text-xs font-semibold text-text">
                  @{currentUser.username}
                </span>
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-card border-2 border-border bg-surface shadow-arcade p-2 z-50 animate-scale-up"
                  onMouseLeave={() => setUserMenuOpen(false)}
                >
                  <div className="px-2 py-1.5 border-b border-border mb-1">
                    <p className="text-xs font-bold text-text truncate">
                      {currentUser.displayName}
                    </p>
                    <p className="text-[11px] text-text-muted truncate">
                      @{currentUser.username}
                    </p>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1 px-1">
                      Switch Coworker Identity
                    </p>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          switchUser(u.id);
                          setUserMenuOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-control text-xs flex items-center justify-between ${
                          u.id === currentUser.id
                            ? "bg-surface-2 text-accent font-bold"
                            : "text-text-muted hover:text-text hover:bg-surface-2"
                        }`}
                      >
                        <span>@{u.username}</span>
                        <span className="text-[10px] opacity-75">{u.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-surface border-t-2 border-border flex items-center justify-around px-2"
      >
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-control text-xs font-semibold ${
            pathname === "/" ? "text-accent" : "text-text-muted"
          }`}
        >
          <span>Offices</span>
        </Link>
        <Link
          href="/space/acme-hq"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-control text-xs font-semibold ${
            pathname.startsWith("/space/acme-hq") ? "text-accent" : "text-text-muted"
          }`}
        >
          <span>Demo HQ</span>
        </Link>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-control text-xs font-semibold text-accent"
        >
          <span>+ Create</span>
        </button>
        <button
          type="button"
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-control text-xs font-semibold text-text-muted"
        >
          <span>@{currentUser.username}</span>
        </button>
      </nav>

      {/* Create Office Dialog */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="🏢 Create Virtual Office"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateOffice} className="space-y-4">
          <div>
            <label className="block text-xs font-display text-text mb-1">
              Office / Team Name:
            </label>
            <input
              type="text"
              required
              value={newOfficeName}
              onChange={(e) => handleOfficeNameChange(e.target.value)}
              placeholder="e.g. Apex Engineering HQ"
              maxLength={40}
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-display text-text mb-1">
              Office URL Slug:
            </label>
            <div className="flex items-center gap-1 text-xs font-mono text-text-muted">
              <span>/space/</span>
              <input
                type="text"
                required
                value={newOfficeSlug}
                onChange={(e) => setNewOfficeSlug(e.target.value)}
                placeholder="apex-engineering"
                className="flex-1 px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="p-3 bg-surface-2 rounded-control text-xs text-text-muted space-y-1">
            <span className="font-display font-semibold text-text block">
              Default Floor Plan Includes:
            </span>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>12 Claimable Workstation Desks with status badges</li>
              <li>Soundproof Glass Boardroom & War Room</li>
              <li>Lo-Fi Breakroom Lounge with Espresso Bar</li>
              <li>Collaborative Whiteboard & Screen Sharing</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs text-text-muted hover:text-text rounded-control"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs bg-accent text-bg font-display font-bold rounded-control shadow-arcade hover:brightness-110"
            >
              Launch Space →
            </button>
          </div>
        </form>
      </ArcadeDialog>
    </>
  );
}
