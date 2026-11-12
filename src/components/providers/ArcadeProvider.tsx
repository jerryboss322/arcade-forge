"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  type ArcadeGameRecord,
  type UserProfile,
  type JamRecord,
  type ReportRecord,
  type ReactionKind,
  INITIAL_USERS,
  INITIAL_JAMS,
  createInitialGames,
} from "@/lib/store/arcade-store";
import type { ForgeGameSchemaV1_1 } from "@/lib/runtime/schema";

export interface ToastMessage {
  id: string;
  text: string;
  tone?: "accent" | "teal" | "warn" | "danger";
}

interface ArcadeContextValue {
  games: ArcadeGameRecord[];
  users: UserProfile[];
  currentUser: UserProfile;
  jams: JamRecord[];
  reports: ReportRecord[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  switchUser: (userId: string) => void;
  toggleLike: (gameId: string) => void;
  toggleReaction: (gameId: string, kind: ReactionKind) => void;
  recordPlayAndTelemetry: (
    gameId: string,
    payload: {
      completed?: boolean;
      score?: number;
      verified?: boolean;
      deathsByCell?: Record<string, number>;
    }
  ) => void;
  publishOrUpdateStudioGame: (params: {
    existingGameId?: string;
    doc: ForgeGameSchemaV1_1;
    status: "DRAFT" | "PUBLISHED" | "UNLISTED";
    remixedFromId?: string;
    versionLabel?: string;
  }) => ArcadeGameRecord;
  publishHtml5Bundle: (params: {
    title: string;
    description: string;
    tags: string[];
    controlsGuide: string;
    htmlBundleSrcDoc: string;
    bundleFileList: string[];
  }) => ArcadeGameRecord;
  submitJamEntry: (jamId: string, gameId: string) => void;
  rateJamEntry: (
    jamId: string,
    entryId: string,
    scores: { fun: number; creativity: number; theme: number }
  ) => void;
  submitReport: (gameId: string, reason: string, details: string) => void;
  toggleFollow: (targetUserId: string) => void;
  pushToast: (text: string, tone?: ToastMessage["tone"]) => void;
}

const ArcadeContext = createContext<ArcadeContextValue | null>(null);

const STORAGE_KEY_GAMES = "arcadeforge_games_v1_1";
const STORAGE_KEY_JAMS = "arcadeforge_jams_v1_1";
const STORAGE_KEY_USER = "arcadeforge_current_user_v1_1";

export function ArcadeProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<ArcadeGameRecord[]>(() => createInitialGames());
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState<string>("u_nova");
  const [jams, setJams] = useState<JamRecord[]>(INITIAL_JAMS);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const savedGames = localStorage.getItem(STORAGE_KEY_GAMES);
      if (savedGames) {
        const parsed = JSON.parse(savedGames);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGames(parsed);
        }
      }
      const savedJams = localStorage.getItem(STORAGE_KEY_JAMS);
      if (savedJams) {
        const parsedJams = JSON.parse(savedJams);
        if (Array.isArray(parsedJams) && parsedJams.length > 0) {
          setJams(parsedJams);
        }
      }
      const savedUser = localStorage.getItem(STORAGE_KEY_USER);
      if (savedUser) {
        setCurrentUserId(savedUser);
      }
    } catch {
      // Ignore storage errors
    }
    setHydrated(true);
  }, []);

  // Persist changes
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY_GAMES, JSON.stringify(games));
      localStorage.setItem(STORAGE_KEY_JAMS, JSON.stringify(jams));
      localStorage.setItem(STORAGE_KEY_USER, currentUserId);
    } catch {
      // Ignore quota errors
    }
  }, [games, jams, currentUserId, hydrated]);

  const currentUser =
    users.find((u) => u.id === currentUserId) || users[0]!;

  // Cap toasts at 3, auto-dismiss after 4s (Section 5 of UI Spec)
  const pushToast = useCallback(
    (text: string, tone: ToastMessage["tone"] = "teal") => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const switchUser = useCallback(
    (userId: string) => {
      setCurrentUserId(userId);
      const u = users.find((x) => x.id === userId);
      if (u) {
        pushToast(`Switched active creator account to @${u.username}`, "teal");
      }
    },
    [users, pushToast]
  );

  const toggleLike = useCallback(
    (gameId: string) => {
      setGames((prev) =>
        prev.map((g) => {
          if (g.id !== gameId) return g;
          const liked = !g.userLiked;
          const likeCount = Math.max(0, g.likeCount + (liked ? 1 : -1));
          return { ...g, userLiked: liked, likeCount };
        })
      );
    },
    []
  );

  const toggleReaction = useCallback(
    (gameId: string, kind: ReactionKind) => {
      setGames((prev) =>
        prev.map((g) => {
          if (g.id !== gameId) return g;
          const has = g.userReacted.includes(kind);
          const nextReacted = has
            ? g.userReacted.filter((k) => k !== kind)
            : [...g.userReacted, kind];
          const nextCounts = {
            ...g.reactions,
            [kind]: Math.max(0, (g.reactions[kind] || 0) + (has ? -1 : 1)),
          };
          return {
            ...g,
            userReacted: nextReacted,
            reactions: nextCounts,
          };
        })
      );
    },
    []
  );

  const recordPlayAndTelemetry = useCallback(
    (
      gameId: string,
      payload: {
        completed?: boolean;
        score?: number;
        verified?: boolean;
        deathsByCell?: Record<string, number>;
      }
    ) => {
      setGames((prev) =>
        prev.map((g) => {
          if (g.id !== gameId) return g;
          const nextPlays = g.playCount + 1;
          const nextCompletions =
            g.completionCount + (payload.completed ? 1 : 0);

          const nextDeaths = { ...g.deathsByCell };
          if (payload.deathsByCell) {
            for (const [cell, count] of Object.entries(payload.deathsByCell)) {
              nextDeaths[cell] = (nextDeaths[cell] || 0) + count;
            }
          }

          let nextScores = [...g.scores];
          if (typeof payload.score === "number" && payload.score > 0) {
            const safeScore = Math.min(999999, Math.max(0, Math.round(payload.score)));
            nextScores.push({
              id: `sc_${Date.now()}`,
              userId: currentUser.id,
              username: currentUser.username,
              score: safeScore,
              verified: Boolean(payload.verified),
              createdAt: "Just now",
            });
            nextScores.sort((a, b) => b.score - a.score);
            nextScores = nextScores.slice(0, 10);
          }

          return {
            ...g,
            playCount: nextPlays,
            completionCount: nextCompletions,
            deathsByCell: nextDeaths,
            scores: nextScores,
          };
        })
      );
    },
    [currentUser]
  );

  const publishOrUpdateStudioGame = useCallback(
    (params: {
      existingGameId?: string;
      doc: ForgeGameSchemaV1_1;
      status: "DRAFT" | "PUBLISHED" | "UNLISTED";
      remixedFromId?: string;
      versionLabel?: string;
    }): ArcadeGameRecord => {
      const slugBase = params.doc.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "forge-game";

      let createdOrUpdated: ArcadeGameRecord | null = null;

      setGames((prev) => {
        const existing = params.existingGameId
          ? prev.find((g) => g.id === params.existingGameId)
          : undefined;

        if (existing) {
          const nextVerNum = (existing.versions[existing.versions.length - 1]?.number || existing.versions.length) + 1;
          const nextVersions = [
            ...existing.versions,
            {
              id: `ver_${Date.now()}`,
              number: nextVerNum,
              label: params.versionLabel || `Revision #${existing.revision + 1}`,
              createdAt: "Just now",
              projectData: structuredClone(params.doc),
            },
          ].slice(-20);

          const updated: ArcadeGameRecord = {
            ...existing,
            title: params.doc.title,
            description: params.doc.description,
            tags: params.doc.tags,
            lengthBucket: params.doc.lengthBucket,
            status: params.status,
            revision: existing.revision + 1,
            projectData: structuredClone(params.doc),
            versions: nextVersions,
            updatedAt: new Date().toISOString(),
          };
          createdOrUpdated = updated;
          return prev.map((g) => (g.id === existing.id ? updated : g));
        }

        const remixedOrig = params.remixedFromId
          ? prev.find((g) => g.id === params.remixedFromId)
          : undefined;

        const newId = `g_studio_${Date.now()}`;
        const uniqueSlug = prev.some((g) => g.slug === slugBase)
          ? `${slugBase}-${Math.floor(Math.random() * 900 + 100)}`
          : slugBase;

        const newGame: ArcadeGameRecord = {
          id: newId,
          slug: uniqueSlug,
          title: params.doc.title,
          description: params.doc.description,
          type: "FORGE_STUDIO",
          status: params.status,
          revision: 1,
          unlistedToken: `tok_${Math.random().toString(36).slice(2, 10)}`,
          authorId: currentUser.id,
          authorUsername: currentUser.username,
          authorAvatarColor: currentUser.avatarColor,
          tags: params.doc.tags.length > 0 ? params.doc.tags : ["Adventure"],
          lengthBucket: params.doc.lengthBucket || "<2m",
          controlsGuide: "WASD / Arrow Keys to move • Space / Z to interact",
          playCount: 1,
          completionCount: 0,
          likeCount: 1,
          remixCount: 0,
          trendScore: 18.5,
          featured: false,
          remixAllowed: true,
          remixedFromId: remixedOrig?.id,
          remixedFromTitle: remixedOrig?.title,
          remixedFromAuthor: remixedOrig?.authorUsername,
          projectData: structuredClone(params.doc),
          reactions: { FUN: 1, HARD: 0, BEAUTIFUL: 0, CLEVER: 0 },
          userReacted: ["FUN"],
          userLiked: true,
          scores: [],
          versions: [
            {
              id: `ver_${Date.now()}`,
              number: 1,
              label: params.versionLabel || "Initial Version",
              createdAt: "Just now",
              projectData: structuredClone(params.doc),
            },
          ],
          deathsByCell: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        createdOrUpdated = newGame;
        return [
          newGame,
          ...prev.map((g) =>
            remixedOrig && g.id === remixedOrig.id
              ? { ...g, remixCount: g.remixCount + 1 }
              : g
          ),
        ];
      });

      return createdOrUpdated!;
    },
    [currentUser]
  );

  const publishHtml5Bundle = useCallback(
    (params: {
      title: string;
      description: string;
      tags: string[];
      controlsGuide: string;
      htmlBundleSrcDoc: string;
      bundleFileList: string[];
    }): ArcadeGameRecord => {
      const slugBase =
        params.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || "html5-bundle";

      const newGame: ArcadeGameRecord = {
        id: `g_bundle_${Date.now()}`,
        slug: `${slugBase}-${Math.floor(Math.random() * 900 + 100)}`,
        title: params.title,
        description: params.description,
        type: "HTML5_BUNDLE",
        status: "PUBLISHED",
        revision: 1,
        unlistedToken: `tok_${Math.random().toString(36).slice(2, 10)}`,
        authorId: currentUser.id,
        authorUsername: currentUser.username,
        authorAvatarColor: currentUser.avatarColor,
        tags: params.tags.length > 0 ? params.tags : ["Arcade", "Upload"],
        lengthBucket: "<2m",
        controlsGuide: params.controlsGuide || "WASD / Arrow keys & Mouse inside sandbox",
        playCount: 1,
        completionCount: 0,
        likeCount: 1,
        remixCount: 0,
        trendScore: 15.0,
        featured: false,
        remixAllowed: false,
        htmlBundleSrcDoc: params.htmlBundleSrcDoc,
        bundleFileList: params.bundleFileList,
        reactions: { FUN: 1, HARD: 0, BEAUTIFUL: 0, CLEVER: 0 },
        userReacted: ["FUN"],
        userLiked: true,
        scores: [],
        versions: [],
        deathsByCell: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setGames((prev) => [newGame, ...prev]);
      return newGame;
    },
    [currentUser]
  );

  const submitJamEntry = useCallback(
    (jamId: string, gameId: string) => {
      const targetGame = games.find((g) => g.id === gameId);
      if (!targetGame) return;

      const latestVer =
        targetGame.versions[targetGame.versions.length - 1]?.number || 1;

      setJams((prev) =>
        prev.map((j) => {
          if (j.id !== jamId) return j;
          const exists = j.entries.find(
            (e) => e.authorUsername === currentUser.username
          );
          if (exists) {
            return {
              ...j,
              entries: j.entries.map((e) =>
                e.id === exists.id
                  ? {
                      ...e,
                      gameId: targetGame.id,
                      gameSlug: targetGame.slug,
                      gameTitle: targetGame.title,
                      frozenVersionNumber: latestVer,
                    }
                  : e
              ),
            };
          }
          return {
            ...j,
            entries: [
              ...j.entries,
              {
                id: `je_${Date.now()}`,
                jamId: j.id,
                gameId: targetGame.id,
                gameSlug: targetGame.slug,
                gameTitle: targetGame.title,
                authorUsername: currentUser.username,
                frozenVersionNumber: latestVer,
                ratings: [],
                submittedAt: new Date().toISOString(),
              },
            ],
          };
        })
      );
      pushToast(
        `Submitted "${targetGame.title}" (Frozen v${latestVer}) to Jam!`,
        "teal"
      );
    },
    [games, currentUser, pushToast]
  );

  const rateJamEntry = useCallback(
    (
      jamId: string,
      entryId: string,
      scores: { fun: number; creativity: number; theme: number }
    ) => {
      setJams((prev) =>
        prev.map((j) => {
          if (j.id !== jamId) return j;
          return {
            ...j,
            entries: j.entries.map((e) => {
              if (e.id !== entryId) return e;
              const filtered = e.ratings.filter(
                (r) => r.raterUsername !== currentUser.username
              );
              return {
                ...e,
                ratings: [
                  ...filtered,
                  {
                    raterUsername: currentUser.username,
                    fun: scores.fun,
                    creativity: scores.creativity,
                    theme: scores.theme,
                  },
                ],
              };
            }),
          };
        })
      );
      pushToast("Jam rating recorded! Bayesian score updated.", "teal");
    },
    [currentUser, pushToast]
  );

  const submitReport = useCallback(
    (gameId: string, reason: string, details: string) => {
      const g = games.find((x) => x.id === gameId);
      setReports((prev) => [
        {
          id: `rep_${Date.now()}`,
          gameId,
          gameTitle: g?.title || gameId,
          reporterUsername: currentUser.username,
          reason,
          details,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      pushToast("Report submitted to moderation queue.", "warn");
    },
    [games, currentUser, pushToast]
  );

  const toggleFollow = useCallback(
    (targetUserId: string) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === currentUser.id) {
            const isFollowing = u.followingIds.includes(targetUserId);
            return {
              ...u,
              followingIds: isFollowing
                ? u.followingIds.filter((id) => id !== targetUserId)
                : [...u.followingIds, targetUserId],
            };
          }
          if (u.id === targetUserId) {
            const isFollowing = currentUser.followingIds.includes(targetUserId);
            return {
              ...u,
              followersCount: Math.max(
                0,
                u.followersCount + (isFollowing ? -1 : 1)
              ),
            };
          }
          return u;
        })
      );
    },
    [currentUser]
  );

  return (
    <ArcadeContext.Provider
      value={{
        games,
        users,
        currentUser,
        jams,
        reports,
        searchQuery,
        setSearchQuery,
        switchUser,
        toggleLike,
        toggleReaction,
        recordPlayAndTelemetry,
        publishOrUpdateStudioGame,
        publishHtml5Bundle,
        submitJamEntry,
        rateJamEntry,
        submitReport,
        toggleFollow,
        pushToast,
      }}
    >
      {children}

      {/* Bottom-center toast stack (Section 5 of UI Spec: max 3, 4s duration) */}
      <div
        aria-live="polite"
        className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-md px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between px-4 py-2.5 rounded-control border-2 bg-surface shadow-arcade text-sm font-medium text-text ${
              t.tone === "accent"
                ? "border-accent"
                : t.tone === "warn"
                ? "border-warn"
                : t.tone === "danger"
                ? "border-danger"
                : "border-accent-2"
            }`}
          >
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ArcadeContext.Provider>
  );
}

export function useArcade() {
  const ctx = useContext(ArcadeContext);
  if (!ctx) {
    throw new Error("useArcade must be used inside ArcadeProvider");
  }
  return ctx;
}
