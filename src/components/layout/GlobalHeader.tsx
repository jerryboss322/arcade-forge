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
    searchQuery,
    setSearchQuery,
  } = useArcade();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathname !== "/") {
      router.push("/");
    }
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
                AF
              </span>
              <span className="font-display text-base md:text-lg tracking-wider text-text uppercase">
                Arcade<span className="text-accent">Forge</span>
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
                Arcade
              </Link>
              <Link
                href="/studio"
                className={`px-3 py-1.5 rounded-control text-sm font-semibold transition-colors ${
                  pathname.startsWith("/studio")
                    ? "bg-surface-2 text-text border-2 border-border"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Forge Studio
              </Link>
              <Link
                href="/jams"
                className={`px-3 py-1.5 rounded-control text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith("/jams")
                    ? "bg-surface-2 text-text border-2 border-border"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <span>Jams</span>
                <span className="px-1.5 py-0.5 text-[11px] font-display rounded-full bg-accent-2 text-bg font-bold">
                  LIVE
                </span>
              </Link>
              <Link
                href="/upload"
                className={`px-3 py-1.5 rounded-control text-sm font-semibold transition-colors ${
                  pathname.startsWith("/upload")
                    ? "bg-surface-2 text-text border-2 border-border"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Upload ZIP
              </Link>
            </nav>
          </div>

          {/* Center: Search Bar (max 480px wide) */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex-1 max-w-[480px] hidden sm:block"
          >
            <div className="relative flex items-center">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (pathname !== "/") router.push("/");
                }}
                placeholder="Search games, tags, or @creators (trigram fuzzy)..."
                aria-label="Search games, tags, or creators"
                className="w-full h-10 pl-3.5 pr-9 rounded-control bg-surface-2 border-2 border-border text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 text-xs text-text-muted hover:text-text px-1"
                >
                  ✕
                </button>
              )}
            </div>
          </form>

          {/* Right: Create Button + User Profile Switcher */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="h-10 px-4 rounded-control bg-accent hover:brightness-110 text-bg font-semibold text-sm border-2 border-black shadow-arcade-sm active:translate-y-0.5 transition-all flex items-center gap-1.5"
            >
              <span>+ Create</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-label="Account menu"
                className="h-10 px-2.5 rounded-control bg-surface border-2 border-border hover:border-accent flex items-center gap-2 transition-colors"
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-bg border border-black"
                  style={{ backgroundColor: currentUser.avatarColor }}
                >
                  {currentUser.username[0]?.toUpperCase()}
                </span>
                <span className="hidden lg:inline text-xs font-semibold text-text">
                  @{currentUser.username}
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-card bg-surface border-2 border-border shadow-arcade-lg p-3 z-50">
                  <div className="pb-2.5 mb-2.5 border-b border-border">
                    <p className="text-xs text-text-muted">Signed in as</p>
                    <Link
                      href={`/profile/${currentUser.username}`}
                      onClick={() => setUserMenuOpen(false)}
                      className="text-sm font-bold text-text hover:text-accent block mt-0.5"
                    >
                      {currentUser.displayName} (@{currentUser.username})
                    </Link>
                    <span className="inline-block mt-1 px-2 py-0.5 text-[11px] rounded-full bg-surface-2 border border-border text-accent-2 font-semibold">
                      {currentUser.role}
                    </span>
                  </div>

                  <div className="space-y-1 mb-3">
                    <Link
                      href={`/profile/${currentUser.username}`}
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-2.5 py-1.5 rounded-control text-xs font-semibold text-text hover:bg-surface-2"
                    >
                      My Profile, Drafts & Heatmaps
                    </Link>
                    <Link
                      href="/studio"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-2.5 py-1.5 rounded-control text-xs font-semibold text-text hover:bg-surface-2"
                    >
                      Open Forge Studio
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                      Switch Demo Account
                    </p>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          switchUser(u.id);
                          setUserMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-control text-xs flex items-center justify-between ${
                          u.id === currentUser.id
                            ? "bg-surface-2 text-accent font-bold"
                            : "text-text-muted hover:text-text hover:bg-surface-2"
                        }`}
                      >
                        <span>@{u.username}</span>
                        <span className="text-[11px] opacity-75">{u.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (Section 4 of UI Spec) */}
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
          <span>Arcade</span>
        </Link>
        <Link
          href="/jams"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-control text-xs font-semibold ${
            pathname.startsWith("/jams") ? "text-accent" : "text-text-muted"
          }`}
        >
          <span>Jams</span>
        </Link>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-3 rounded-control text-xs font-semibold text-accent"
        >
          <span>+ Create</span>
        </button>
        <Link
          href={`/profile/${currentUser.username}`}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-control text-xs font-semibold ${
            pathname.startsWith("/profile") ? "text-accent" : "text-text-muted"
          }`}
        >
          <span>Profile</span>
        </Link>
      </nav>

      {/* Create Choice Dialog (Studio vs HTML5 Upload) */}
      <ArcadeDialog
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create on ArcadeForge"
      >
        <p className="text-sm text-text-muted mb-4">
          Choose how you want to build and ship your game:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/studio"
            onClick={() => setCreateModalOpen(false)}
            className="p-4 rounded-card border-2 border-border bg-surface-2 hover:border-accent shadow-arcade transition-all flex flex-col justify-between group"
          >
            <div>
              <span className="inline-block px-2 py-0.5 text-[11px] font-display uppercase rounded-full bg-accent text-bg font-bold mb-2">
                In-Browser Maker
              </span>
              <h3 className="text-base font-bold text-text group-hover:text-accent">
                Forge Studio
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Paint 16×16 sprites, build multi-room dungeons, add enemy AI & rules, and playtest in 1 click.
              </p>
            </div>
            <span className="mt-4 text-xs font-semibold text-accent">
              Launch Studio →
            </span>
          </Link>

          <Link
            href="/upload"
            onClick={() => setCreateModalOpen(false)}
            className="p-4 rounded-card border-2 border-border bg-surface-2 hover:border-accent-2 shadow-arcade transition-all flex flex-col justify-between group"
          >
            <div>
              <span className="inline-block px-2 py-0.5 text-[11px] font-display uppercase rounded-full bg-accent-2 text-bg font-bold mb-2">
                Indie Dev Portal
              </span>
              <h3 className="text-base font-bold text-text group-hover:text-accent-2">
                Upload HTML5 ZIP
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Upload a Phaser, Godot Web, or custom Canvas bundle (up to 10 MB) to run in our isolated sandbox.
              </p>
            </div>
            <span className="mt-4 text-xs font-semibold text-accent-2">
              Upload Bundle →
            </span>
          </Link>
        </div>
      </ArcadeDialog>
    </>
  );
}
