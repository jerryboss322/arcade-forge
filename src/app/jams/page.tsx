"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useArcade } from "@/components/providers/ArcadeProvider";
import { computeJamBayesianScore } from "@/lib/store/arcade-store";
import { GameThumbnailCanvas } from "@/components/ui/GameThumbnailCanvas";

function useCountdown(targetIso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(targetIso).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { diff, label: `${d}d ${h}h ${m}m ${s}s` };
}

export default function JamsPage() {
  const { jams, games, currentUser, submitJamEntry, rateJamEntry } = useArcade();
  const jam = jams[0];
  const [tab, setTab] = useState<"entries" | "rate" | "results">("entries");
  const [ratingDraft, setRatingDraft] = useState<Record<string, { fun: number; creativity: number; theme: number }>>({});
  const [submitGameId, setSubmitGameId] = useState("");

  const countdown = useCountdown(jam?.submissionsEndAt || new Date().toISOString());

  const myStudioGames = games.filter(
    (g) => g.authorId === currentUser.id && g.type === "FORGE_STUDIO"
  );

  // Global mean across all ratings (for Bayesian prior)
  const globalMean = useMemo(() => {
    if (!jam) return 3.8;
    const all = jam.entries.flatMap((e) => e.ratings);
    if (all.length === 0) return 3.8;
    return all.reduce((s, r) => s + (r.fun + r.creativity + r.theme) / 3, 0) / all.length;
  }, [jam]);

  const ranked = useMemo(() => {
    if (!jam) return [];
    const smallJam = jam.entries.length < 5;
    return jam.entries
      .map((e) => ({ entry: e, result: computeJamBayesianScore(e.ratings, globalMean) }))
      .sort((a, b) => {
        if (b.result.adjustedScore !== a.result.adjustedScore)
          return b.result.adjustedScore - a.result.adjustedScore;
        if (b.result.rawFun !== a.result.rawFun) return b.result.rawFun - a.result.rawFun;
        if (b.result.ratingCount !== a.result.ratingCount)
          return b.result.ratingCount - a.result.ratingCount;
        return new Date(a.entry.submittedAt).getTime() - new Date(b.entry.submittedAt).getTime();
      })
      .map((x) => ({ ...x, smallJam }));
  }, [jam, globalMean]);

  // Fair queue: fewest ratings first, excluding own entries
  const rateQueue = useMemo(() => {
    if (!jam) return [];
    return [...jam.entries]
      .filter((e) => e.authorUsername !== currentUser.username)
      .sort((a, b) => a.ratings.length - b.ratings.length);
  }, [jam, currentUser.username]);

  if (!jam) {
    return <div className="p-12 text-center text-text-muted">No jams scheduled yet.</div>;
  }

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6 space-y-8">
      {/* Hero */}
      <section className="rounded-card border-2 border-accent-2 bg-surface p-6 shadow-arcade-lg grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <span className="px-2 py-0.5 rounded-full text-[11px] font-display uppercase bg-accent-2 text-bg font-bold">
            {jam.status}
          </span>
          <h1 className="font-display text-2xl md:text-3xl text-text">{jam.title}</h1>
          <p className="text-sm text-text-muted max-w-prose">{jam.description}</p>
          <p className="text-xs font-mono text-warn">Theme: &ldquo;{jam.theme}&rdquo;</p>
        </div>
        <div className="rounded-control border-2 border-border bg-bg p-4 space-y-3">
          <p className="text-xs uppercase font-semibold text-text-muted">Submissions close in</p>
          <p className="font-display text-xl text-accent">{countdown.label}</p>
          <p className="text-[11px] text-text-muted">
            {new Date(jam.submissionsEndAt).toLocaleString()} (your local time)
          </p>
          {jam.status === "ACTIVE" && (
            <div className="pt-2 border-t border-border space-y-2">
              <label htmlFor="jam-submit" className="block text-xs font-semibold text-text-muted">
                Submit one of your Studio games
              </label>
              {myStudioGames.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    id="jam-submit"
                    value={submitGameId}
                    onChange={(e) => setSubmitGameId(e.target.value)}
                    className="flex-1 h-9 px-2 rounded-control bg-surface-2 border-2 border-border text-xs text-text"
                  >
                    <option value="">Choose a game…</option>
                    {myStudioGames.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!submitGameId}
                    onClick={() => submitJamEntry(jam.id, submitGameId)}
                    className="h-9 px-3 rounded-control bg-accent disabled:opacity-40 text-bg text-xs font-semibold border-2 border-black"
                  >
                    Submit
                  </button>
                </div>
              ) : (
                <Link href="/studio" className="text-xs font-semibold text-accent hover:underline">
                  Build a Studio game first →
                </Link>
              )}
              <p className="text-[11px] text-text-muted">One entry per creator. Entries freeze the current version.</p>
            </div>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div role="tablist" className="flex gap-2 border-b-2 border-border">
        {(
          [
            ["entries", `Entries (${jam.entries.length})`],
            ["rate", "Rate Games"],
            ["results", "Live Rankings"],
          ] as const
        ).map(([id, label]) => (
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

      {tab === "entries" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {jam.entries.map((e) => {
            const g = games.find((x) => x.id === e.gameId);
            return (
              <Link
                key={e.id}
                href={`/game/${e.gameSlug}`}
                className="rounded-card border-2 border-border bg-surface shadow-arcade hover:-translate-y-1 transition-transform overflow-hidden"
              >
                <GameThumbnailCanvas projectData={g?.projectData} title={e.gameTitle} />
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-semibold text-text line-clamp-2">{e.gameTitle}</h3>
                  <p className="text-xs text-text-muted">
                    @{e.authorUsername} • Frozen v{e.frozenVersionNumber} • {e.ratings.length} ratings
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {tab === "rate" && (
        <div className="space-y-4">
          <p className="text-xs text-text-muted max-w-prose">
            Entries with the fewest ratings appear first so everyone gets feedback. You can&apos;t rate your own entry.
          </p>
          {rateQueue.map((e) => {
            const existing = e.ratings.find((r) => r.raterUsername === currentUser.username);
            const draft = ratingDraft[e.id] || existing || { fun: 3, creativity: 3, theme: 3 };
            return (
              <div
                key={e.id}
                className="rounded-card border-2 border-border bg-surface p-4 shadow-arcade flex flex-col md:flex-row md:items-center gap-4"
              >
                <div className="md:w-64">
                  <Link href={`/game/${e.gameSlug}`} className="text-sm font-bold text-text hover:text-accent">
                    {e.gameTitle}
                  </Link>
                  <p className="text-xs text-text-muted">
                    @{e.authorUsername} • {e.ratings.length} ratings so far
                  </p>
                </div>
                <div className="flex-1 grid grid-cols-3 gap-3">
                  {(["fun", "creativity", "theme"] as const).map((crit) => (
                    <label key={crit} className="text-xs">
                      <span className="block uppercase font-semibold text-text-muted mb-1">
                        {crit === "theme" ? "Theme use" : crit}: <span className="text-warn">{draft[crit]}</span>
                      </span>
                      <input
                        type="range"
                        min={1}
                        max={5}
                        value={draft[crit]}
                        onChange={(ev) =>
                          setRatingDraft((p) => ({
                            ...p,
                            [e.id]: { ...draft, [crit]: Number(ev.target.value) },
                          }))
                        }
                        className="w-full accent-[#FF4D8D]"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => rateJamEntry(jam.id, e.id, draft)}
                  className="h-10 px-4 rounded-control bg-accent text-bg text-xs font-semibold border-2 border-black shadow-arcade-sm shrink-0"
                >
                  {existing ? "Update Rating" : "Submit Rating"}
                </button>
              </div>
            );
          })}
          {rateQueue.length === 0 && (
            <p className="text-sm text-text-muted">No other entries to rate yet.</p>
          )}
        </div>
      )}

      {tab === "results" && (
        <div className="rounded-card border-2 border-border bg-surface shadow-arcade overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-surface-2 text-text-muted uppercase">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Entry</th>
                <th className="text-right p-3">Fun</th>
                <th className="text-right p-3">Creativity</th>
                <th className="text-right p-3">Theme</th>
                <th className="text-right p-3">Ratings</th>
                <th className="text-right p-3">Bayesian Score</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ entry, result, smallJam }, idx) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="p-3 font-display text-warn">
                    {result.isRanked || smallJam ? idx + 1 : "—"}
                  </td>
                  <td className="p-3">
                    <Link href={`/game/${entry.gameSlug}`} className="font-semibold text-text hover:text-accent">
                      {entry.gameTitle}
                    </Link>
                    <span className="block text-text-muted">@{entry.authorUsername}</span>
                  </td>
                  <td className="p-3 text-right font-mono">{result.rawFun}</td>
                  <td className="p-3 text-right font-mono">{result.rawCreativity}</td>
                  <td className="p-3 text-right font-mono">{result.rawTheme}</td>
                  <td className="p-3 text-right font-mono">{result.ratingCount}</td>
                  <td className="p-3 text-right">
                    <span className="font-mono font-bold text-accent-2">{result.adjustedScore}</span>
                    {!result.isRanked && !smallJam && (
                      <span className="block text-[10px] text-warn">Needs 5 ratings</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-3 text-[11px] text-text-muted border-t border-border">
            adjusted = (Σ ratings + 5 × global mean {globalMean.toFixed(2)}) / (count + 5). Ties break by Fun,
            then rating count, then earlier submission.
          </p>
        </div>
      )}
    </div>
  );
}
