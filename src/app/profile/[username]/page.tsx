"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useArcade } from "@/components/providers/ArcadeProvider";
import { GameCard } from "@/components/ui/GameCard";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { users, games, currentUser, toggleFollow, reports } = useArcade();
  const [tab, setTab] = useState<"games" | "liked" | "drafts" | "analytics" | "moderation">("games");

  const profile = users.find((u) => u.username === params.username);
  if (!profile) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 rounded-card border-2 border-border bg-surface text-center shadow-arcade">
        <h1 className="font-display text-lg text-text">Creator not found</h1>
        <Link href="/" className="text-sm text-accent hover:underline mt-3 inline-block">
          Back to the arcade
        </Link>
      </div>
    );
  }

  const isOwner = profile.id === currentUser.id;
  const isMod = currentUser.role === "ADMIN" || currentUser.role === "MODERATOR";
  const isFollowing = currentUser.followingIds.includes(profile.id);

  const published = games.filter((g) => g.authorId === profile.id && g.status === "PUBLISHED");
  const drafts = games.filter((g) => g.authorId === profile.id && g.status !== "PUBLISHED");
  const liked = games.filter((g) => g.userLiked);

  const tabs: Array<[typeof tab, string]> = [
    ["games", `Games (${published.length})`],
    ["liked", "Liked"],
  ];
  if (isOwner) {
    tabs.push(["drafts", `Drafts & Unlisted (${drafts.length})`], ["analytics", "Creator Analytics"]);
  }
  if (isOwner && isMod) tabs.push(["moderation", `Reports (${reports.length})`]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6 space-y-8">
      {/* 160px banner + 96px overlapping avatar */}
      <section className="rounded-card border-2 border-border bg-surface shadow-arcade overflow-hidden">
        <div
          className="h-40"
          style={{
            background: `repeating-linear-gradient(45deg, ${profile.avatarColor}33 0 12px, transparent 12px 24px), #14162A`,
          }}
        />
        <div className="px-6 pb-6 -mt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <span
              className="w-24 h-24 rounded-card border-4 border-bg flex items-center justify-center font-display text-3xl text-bg shadow-arcade"
              style={{ backgroundColor: profile.avatarColor }}
            >
              {profile.username[0]?.toUpperCase()}
            </span>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-text">{profile.displayName}</h1>
              <p className="text-xs text-text-muted">
                @{profile.username} • {profile.followersCount} followers • {profile.role}
              </p>
            </div>
          </div>
          {!isOwner && (
            <button
              type="button"
              onClick={() => toggleFollow(profile.id)}
              className={`h-10 px-4 rounded-control text-sm font-semibold border-2 ${
                isFollowing ? "bg-surface-2 border-accent-2 text-accent-2" : "bg-accent text-bg border-black shadow-arcade-sm"
              }`}
            >
              {isFollowing ? "Following" : "+ Follow"}
            </button>
          )}
        </div>
        <div className="px-6 pb-6 space-y-3">
          <p className="text-sm text-text-muted max-w-prose">{profile.bio}</p>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <span
                key={b}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-display uppercase bg-surface-2 border border-warn text-warn"
              >
                ★ {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div role="tablist" className="flex flex-wrap gap-2 border-b-2 border-border">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-[2px] ${
              tab === id ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(tab === "games" || tab === "liked" || tab === "drafts") && (() => {
        const list = tab === "games" ? published : tab === "liked" ? liked : drafts;
        return list.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {list.map((g) => (
              <div key={g.id} className="relative">
                {g.status !== "PUBLISHED" && (
                  <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-mono bg-warn text-bg font-bold">
                    {g.status}
                  </span>
                )}
                <GameCard game={g} />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card border-2 border-border bg-surface p-10 text-center max-w-md mx-auto shadow-arcade">
            <p className="font-display text-sm text-text mb-2">Nothing here yet</p>
            <Link
              href="/studio?template=coin-rush"
              className="inline-flex h-10 px-4 items-center rounded-control bg-accent text-bg text-sm font-semibold border-2 border-black shadow-arcade-sm"
            >
              Remix a starter in 2 minutes
            </Link>
          </div>
        );
      })()}

      {tab === "analytics" && (
        <div className="rounded-card border-2 border-border bg-surface shadow-arcade overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-2 text-text-muted uppercase">
              <tr>
                <th className="text-left p-3">Game</th>
                <th className="text-right p-3">Plays</th>
                <th className="text-right p-3">Completion</th>
                <th className="text-right p-3">Likes</th>
                <th className="text-right p-3">Remixes</th>
                <th className="text-right p-3">Trend</th>
                <th className="text-right p-3">Deadliest cell</th>
              </tr>
            </thead>
            <tbody>
              {[...published, ...drafts].map((g) => {
                const worst = Object.entries(g.deathsByCell).sort((a, b) => b[1] - a[1])[0];
                const rate = g.playCount ? Math.round((g.completionCount / g.playCount) * 100) : 0;
                return (
                  <tr key={g.id} className="border-t border-border">
                    <td className="p-3">
                      <Link href={`/game/${g.slug}`} className="font-semibold text-text hover:text-accent">
                        {g.title}
                      </Link>
                    </td>
                    <td className="p-3 text-right font-mono">{g.playCount}</td>
                    <td className="p-3 text-right font-mono">{rate}%</td>
                    <td className="p-3 text-right font-mono text-accent">{g.likeCount}</td>
                    <td className="p-3 text-right font-mono">{g.remixCount}</td>
                    <td className="p-3 text-right font-mono text-accent-2">{g.trendScore}</td>
                    <td className="p-3 text-right font-mono text-warn">
                      {worst ? `${worst[0]} (${worst[1]})` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="p-3 text-[11px] text-text-muted border-t border-border">
            Open a game and toggle &ldquo;Death Heatmap&rdquo; to see where players die on the map.
          </p>
        </div>
      )}

      {tab === "moderation" && (
        <div className="space-y-3">
          {reports.length === 0 && <p className="text-sm text-text-muted">The report queue is empty.</p>}
          {reports.map((r) => (
            <div key={r.id} className="rounded-card border-2 border-border bg-surface p-4 text-xs space-y-1">
              <p className="font-bold text-text">
                {r.gameTitle} — <span className="text-danger">{r.reason}</span>
              </p>
              <p className="text-text-muted">
                Reported by @{r.reporterUsername} • {new Date(r.createdAt).toLocaleString()} • {r.status}
              </p>
              {r.details && <p className="text-text">{r.details}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
