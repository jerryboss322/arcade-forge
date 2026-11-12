"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useArcade } from "@/components/providers/ArcadeProvider";
import { GameCard } from "@/components/ui/GameCard";
import { GameThumbnailCanvas } from "@/components/ui/GameThumbnailCanvas";
import { OFFICIAL_TEMPLATES } from "@/lib/templates";

const TAG_FILTERS = [
  "All",
  "Dungeon",
  "Arcade",
  "Action",
  "Maze",
  "Puzzle",
  "Survival",
  "Upload",
];

type SortShelf = "trending" | "new" | "liked" | "quick" | "staff";

export default function ArcadeHomePage() {
  const { games, jams, searchQuery, setSearchQuery } = useArcade();
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [sortShelf, setSortShelf] = useState<SortShelf>("trending");
  const [featuredIndex, setFeaturedIndex] = useState<number>(0);

  const publishedGames = useMemo(
    () => games.filter((g) => g.status === "PUBLISHED"),
    [games]
  );

  const featuredGames = useMemo(
    () => publishedGames.filter((g) => g.featured || g.jamWinnerBadge),
    [publishedGames]
  );

  const activeFeatured =
    featuredGames[featuredIndex % Math.max(1, featuredGames.length)] ||
    publishedGames[0];

  const activeJam = jams[0];

  // Filter + trigram-style fuzzy search + shelf sorting
  const filteredGames = useMemo(() => {
    let list = [...publishedGames];

    if (selectedTag !== "All") {
      if (selectedTag === "Upload") {
        list = list.filter((g) => g.type === "HTML5_BUNDLE");
      } else {
        list = list.filter((g) =>
          g.tags.some((t) => t.toLowerCase() === selectedTag.toLowerCase())
        );
      }
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.authorUsername.toLowerCase().includes(q) ||
          g.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sortShelf === "trending") {
      list.sort((a, b) => b.trendScore - a.trendScore);
    } else if (sortShelf === "new") {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortShelf === "liked") {
      list.sort((a, b) => b.likeCount - a.likeCount);
    } else if (sortShelf === "quick") {
      list = list.filter((g) => g.lengthBucket === "<2m");
      list.sort((a, b) => b.trendScore - a.trendScore);
    } else if (sortShelf === "staff") {
      list = list.filter((g) => g.featured);
    }

    return list;
  }, [publishedGames, selectedTag, searchQuery, sortShelf]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6 space-y-12">
      {/* 1. Featured Hero Carousel (Section 4 of UI Spec) */}
      {activeFeatured && !searchQuery && (
        <section aria-label="Featured game highlight">
          <div className="rounded-card border-2 border-border bg-surface shadow-arcade-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12">
            {/* Left 7 cols: 4:3 / 16:9 Canvas Stage Preview */}
            <div className="lg:col-span-7 relative bg-bg border-b-2 lg:border-b-0 lg:border-r-2 border-border flex items-center justify-center p-4 max-h-[420px]">
              <div className="w-full max-w-[440px] rounded-control overflow-hidden border-2 border-border shadow-arcade">
                <GameThumbnailCanvas
                  projectData={activeFeatured.projectData}
                  title={activeFeatured.title}
                  isHtml5Bundle={activeFeatured.type === "HTML5_BUNDLE"}
                />
              </div>
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-accent text-bg font-display text-xs uppercase font-bold border border-black shadow-arcade-sm">
                  Featured Staff Pick
                </span>
                {activeFeatured.jamWinnerBadge && (
                  <span className="px-2.5 py-1 rounded-full bg-warn text-bg font-display text-xs uppercase font-bold border border-black shadow-arcade-sm">
                    ★ {activeFeatured.jamWinnerBadge}
                  </span>
                )}
              </div>
            </div>

            {/* Right 5 cols: Details & CTA */}
            <div className="lg:col-span-5 p-6 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="font-mono text-accent-2 font-semibold">
                    TREND SCORE {activeFeatured.trendScore}
                  </span>
                  <span>•</span>
                  <span>By @{activeFeatured.authorUsername}</span>
                  <span>•</span>
                  <span>{activeFeatured.lengthBucket}</span>
                </div>

                <h1 className="font-display text-2xl md:text-3xl text-text leading-tight">
                  {activeFeatured.title}
                </h1>

                <p className="text-sm text-text-muted leading-relaxed max-w-prose">
                  {activeFeatured.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activeFeatured.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-2 border border-border text-text-muted"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/game/${activeFeatured.slug}`}
                    className="h-10 px-5 rounded-control bg-accent hover:brightness-110 text-bg font-semibold text-sm border-2 border-black shadow-arcade-sm flex items-center gap-2"
                  >
                    <span>▶ Play Now</span>
                  </Link>
                  {activeFeatured.remixAllowed && (
                    <Link
                      href={`/studio?remix=${activeFeatured.slug}`}
                      className="h-10 px-4 rounded-control bg-surface-2 hover:border-accent-2 text-text font-semibold text-sm border-2 border-border flex items-center gap-2 transition-colors"
                    >
                      <span>⇄ Remix in Studio</span>
                    </Link>
                  )}
                </div>

                {/* Carousel switcher pills */}
                {featuredGames.length > 1 && (
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <span className="text-xs text-text-muted">
                      Featured ({(featuredIndex % featuredGames.length) + 1} /{" "}
                      {featuredGames.length})
                    </span>
                    <div className="flex items-center gap-1.5">
                      {featuredGames.map((fg, idx) => (
                        <button
                          key={fg.id}
                          type="button"
                          onClick={() => setFeaturedIndex(idx)}
                          aria-label={`Show featured game ${fg.title}`}
                          className={`h-2.5 rounded-full transition-all ${
                            idx === featuredIndex % featuredGames.length
                              ? "w-6 bg-accent"
                              : "w-2.5 bg-border hover:bg-text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Active Game Jam Banner Shelf (Section 2 & 3.3 of Deep Dive) */}
      {activeJam && !searchQuery && (
        <section
          aria-label="Active game jam banner"
          className="rounded-card border-2 border-accent-2 bg-surface p-5 shadow-arcade flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-display uppercase bg-accent-2 text-bg font-bold">
                Active Jam • Submissions Open
              </span>
              <span className="text-xs font-mono text-warn font-semibold">
                Theme: &ldquo;{activeJam.theme}&rdquo;
              </span>
              <span className="text-xs text-text-muted">
                • {activeJam.entries.length} Frozen Entries
              </span>
            </div>
            <h2 className="font-display text-lg md:text-xl text-text">
              {activeJam.title}
            </h2>
            <p className="text-xs text-text-muted max-w-prose">
              {activeJam.description}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/jams"
              className="h-10 px-4 rounded-control bg-accent-2 hover:brightness-110 text-bg font-semibold text-sm border-2 border-black shadow-arcade-sm flex items-center"
            >
              View Jam & Rate Games →
            </Link>
          </div>
        </section>
      )}

      {/* 3. Filter Pills Row + Sort Dropdown (Section 4 of UI Spec) */}
      <section aria-label="Arcade catalog">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          {/* Category Filter Pills (40px high, horizontally scrollable) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {TAG_FILTERS.map((tag) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`h-10 px-4 rounded-full text-sm font-semibold shrink-0 border-2 transition-colors ${
                    active
                      ? "bg-accent text-bg border-black shadow-arcade-sm"
                      : "bg-surface text-text-muted border-border hover:text-text hover:border-text-muted"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          {/* Sort Shelf Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="shelf-select"
              className="text-xs font-semibold uppercase tracking-wider text-text-muted"
            >
              Shelf:
            </label>
            <select
              id="shelf-select"
              value={sortShelf}
              onChange={(e) => setSortShelf(e.target.value as SortShelf)}
              className="h-10 px-3 rounded-control bg-surface-2 border-2 border-border text-sm font-semibold text-text focus:border-accent"
            >
              <option value="trending">🔥 Trending Now (36h Decay)</option>
              <option value="new">✨ New & Fresh</option>
              <option value="quick">⚡ Quick Plays (&lt;2m)</option>
              <option value="liked">♥ Most Liked</option>
              <option value="staff">★ Staff Picks</option>
            </select>
          </div>
        </div>

        {/* Search feedback bar if active */}
        {searchQuery && (
          <div className="mb-6 flex items-center justify-between px-4 py-2.5 rounded-control bg-surface-2 border-2 border-border text-sm">
            <span>
              Showing results for{" "}
              <strong className="text-accent">&ldquo;{searchQuery}&rdquo;</strong> (
              {filteredGames.length} found)
            </span>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs font-semibold text-accent-2 hover:underline"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Game Cards Grid: 2 cols mobile, 3 tablet, 4 desktop, 24px gap */}
        {filteredGames.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        ) : (
          /* Empty State with pixel illustration & single action (Section 5 of UI Spec) */
          <div className="rounded-card border-2 border-border bg-surface p-12 text-center max-w-md mx-auto my-8 shadow-arcade">
            <div className="w-12 h-12 mx-auto mb-3 rounded-control bg-surface-2 border-2 border-border flex items-center justify-center font-display text-accent text-xl">
              ?
            </div>
            <h3 className="font-display text-base text-text mb-1">
              No matching games found
            </h3>
            <p className="text-xs text-text-muted mb-5">
              Try clearing your filter or build your own in 5 minutes using Forge Studio!
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedTag("All");
                setSearchQuery("");
                setSortShelf("trending");
              }}
              className="h-10 px-4 rounded-control bg-accent text-bg font-semibold text-sm border-2 border-black shadow-arcade-sm"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* 4. Start from a Template Shelf (Section 1.1 & 1.10 of Feature Deep Dive) */}
      <section
        aria-label="Starter templates"
        className="pt-4 border-t-2 border-border"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
          <div>
            <span className="font-display text-xs uppercase tracking-wider text-accent-2">
              5-Minute Onboarding
            </span>
            <h2 className="text-2xl font-bold text-text mt-0.5">
              Remix an Official Starter Template
            </h2>
          </div>
          <Link
            href="/studio"
            className="text-sm font-semibold text-accent hover:underline"
          >
            Open Blank Studio →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {OFFICIAL_TEMPLATES.map((tpl) => (
            <Link
              key={tpl.id}
              href={`/studio?template=${tpl.id}`}
              className="p-4 rounded-card border-2 border-border bg-surface hover:border-accent shadow-arcade hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
            >
              <div>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-surface-2 text-accent-2 border border-border mb-2">
                  Schema v1.1
                </span>
                <h3 className="font-display text-sm text-text group-hover:text-accent">
                  {tpl.name}
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {tpl.subtitle}
                </p>
              </div>
              <span className="mt-4 text-xs font-semibold text-accent flex items-center gap-1">
                <span>Remix Template</span>
                <span>→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
