"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useArcade } from "@/components/providers/ArcadeProvider";
import {
  ForgeDeterministicRuntime,
  renderRoomStaticPreview,
  type InputState,
} from "@/lib/runtime/engine";
import { GameThumbnailCanvas } from "@/components/ui/GameThumbnailCanvas";
import { ArcadeDialog } from "@/components/ui/ArcadeDialog";
import type { ReactionKind } from "@/lib/store/arcade-store";

const REACTION_META: Array<{ kind: ReactionKind; label: string; icon: string }> = [
  { kind: "FUN", label: "Fun", icon: "🎮" },
  { kind: "HARD", label: "Hard", icon: "🔥" },
  { kind: "BEAUTIFUL", label: "Beautiful", icon: "✨" },
  { kind: "CLEVER", label: "Clever", icon: "🧠" },
];

export default function GamePlayerPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const {
    games,
    users,
    currentUser,
    toggleLike,
    toggleReaction,
    recordPlayAndTelemetry,
    submitReport,
    toggleFollow,
    pushToast,
  } = useArcade();

  const game = useMemo(
    () => games.find((g) => g.slug === params.slug) || games[0],
    [games, params.slug]
  );

  // Click-to-play state: bundle/runtime does NOT load until user clicks Play
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showTouchPad, setShowTouchPad] = useState(false);
  const [liveScore, setLiveScore] = useState(0);
  const [liveStatus, setLiveStatus] = useState<"playing" | "won" | "lost">("playing");

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("Broken or unplayable");
  const [reportDetails, setReportDetails] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const playerBoxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runtimeRef = useRef<ForgeDeterministicRuntime | null>(null);
  const inputRef = useRef<InputState>({
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
  });
  const playRecordedRef = useRef<boolean>(false);
  const winRecordedRef = useRef<boolean>(false);
  const lastScorePostRef = useRef<number>(0);

  // Auto-detect touch device
  useEffect(() => {
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      setShowTouchPad(true);
    }
  }, []);

  // Reset state when switching games
  useEffect(() => {
    setIsPlaying(false);
    setShowHeatmap(false);
    setLiveScore(0);
    setLiveStatus("playing");
    playRecordedRef.current = false;
    winRecordedRef.current = false;
    runtimeRef.current?.audio?.destroy();
    runtimeRef.current = null;
  }, [game?.id]);

  // Listen for HTML5 Bundle postMessage scores (Decision 3: rate-limited & marked unverified)
  useEffect(() => {
    if (!isPlaying || !game || game.type !== "HTML5_BUNDLE") return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      if (event.data.type === "ARCADE_SCORE") {
        const now = Date.now();
        if (now - lastScorePostRef.current < 3000) return; // Rate limit
        lastScorePostRef.current = now;

        const rawScore = Number(event.data.score);
        if (!Number.isFinite(rawScore) || rawScore <= 0) return;
        const cappedScore = Math.min(999999, Math.round(rawScore));
        setLiveScore(cappedScore);
        recordPlayAndTelemetry(game.id, {
          score: cappedScore,
          verified: false,
        });
        pushToast(
          `Sandbox score (${cappedScore}) recorded as Unverified / Community.`,
          "warn"
        );
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isPlaying, game, recordPlayAndTelemetry, pushToast]);

  // Start or restart the shared 60Hz deterministic runtime for FORGE_STUDIO games
  const initStudioRuntime = useCallback(() => {
    if (!game?.projectData) return;
    runtimeRef.current?.audio?.destroy();

    const rt = new ForgeDeterministicRuntime(game.projectData, true);
    rt.audio?.setMuted(isMuted);
    rt.audio?.startMusic(game.projectData.feel.musicTrack);
    runtimeRef.current = rt;
    winRecordedRef.current = false;
    setLiveScore(0);
    setLiveStatus("playing");
  }, [game, isMuted]);

  useEffect(() => {
    if (!isPlaying || !game) return;

    // Count play after 5 seconds of active session (Section 3.1 of Deep Dive)
    const playTimer = setTimeout(() => {
      if (!playRecordedRef.current) {
        playRecordedRef.current = true;
        recordPlayAndTelemetry(game.id, {});
      }
    }, 5000);

    if (game.type !== "FORGE_STUDIO" || !game.projectData) {
      return () => clearTimeout(playTimer);
    }

    initStudioRuntime();

    // Keyboard listeners (prevent page scroll on Arrow keys and Space while playing)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPlaying(false);
        runtimeRef.current?.audio?.destroy();
        return;
      }
      if (e.key === "r" || e.key === "R") {
        initStudioRuntime();
        return;
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") inputRef.current.up = true;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") inputRef.current.down = true;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputRef.current.left = true;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputRef.current.right = true;
      if (e.key === " " || e.key === "z" || e.key === "Z" || e.key === "Enter") {
        inputRef.current.action = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") inputRef.current.up = false;
      if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") inputRef.current.down = false;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") inputRef.current.left = false;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") inputRef.current.right = false;
      if (e.key === " " || e.key === "z" || e.key === "Z" || e.key === "Enter") {
        inputRef.current.action = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Fixed 60 Hz accumulator loop with Gamepad API polling (0.3 deadzone)
    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    const fixedDt = 1000 / 60;

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const rt = runtimeRef.current;
      if (!rt) return;

      // Pause on tab blur or huge delta
      const frameDelta = Math.min(100, now - lastTime);
      lastTime = now;
      accumulator += frameDelta;

      // Poll Gamepad API (0.3 deadzone)
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      const combinedInput: InputState = { ...inputRef.current };
      if (gp) {
        const axX = gp.axes[0] ?? 0;
        const axY = gp.axes[1] ?? 0;
        if (axY < -0.3 || gp.buttons[12]?.pressed) combinedInput.up = true;
        if (axY > 0.3 || gp.buttons[13]?.pressed) combinedInput.down = true;
        if (axX < -0.3 || gp.buttons[14]?.pressed) combinedInput.left = true;
        if (axX > 0.3 || gp.buttons[15]?.pressed) combinedInput.right = true;
        if (gp.buttons[0]?.pressed || gp.buttons[1]?.pressed) combinedInput.action = true;
      }

      while (accumulator >= fixedDt) {
        rt.step(combinedInput);
        accumulator -= fixedDt;
      }

      setLiveScore(rt.variables.score || 0);
      if (rt.status !== liveStatus) {
        setLiveStatus(rt.status);
      }

      // Record verified telemetry & death heatmap when game ends
      if (rt.status !== "playing" && !winRecordedRef.current) {
        winRecordedRef.current = true;
        const telemetry = rt.getTelemetry();
        recordPlayAndTelemetry(game.id, {
          completed: rt.status === "won",
          score: rt.status === "won" ? telemetry.score : undefined,
          verified: true,
          deathsByCell: telemetry.deathsByCell,
        });
        if (rt.status === "won") {
          pushToast(
            `Victory! Verified score (${telemetry.score}) added to Leaderboard.`,
            "teal"
          );
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          rt.render(ctx, showDebug);
        }
      }
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      clearTimeout(playTimer);
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      runtimeRef.current?.audio?.destroy();
    };
  }, [isPlaying, game, initStudioRuntime, showDebug, liveStatus, recordPlayAndTelemetry, pushToast]);

  // Draw static heatmap preview when showHeatmap is toggled
  useEffect(() => {
    if (!showHeatmap || !game?.projectData || isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderRoomStaticPreview(ctx, game.projectData, undefined, {
      showGrid: true,
      heatmapCells: game.deathsByCell,
    });
  }, [showHeatmap, game, isPlaying]);

  if (!game) return null;

  const authorProfile =
    users.find((u) => u.username === game.authorUsername) || users[0]!;
  const isFollowingAuthor = currentUser.followingIds.includes(authorProfile.id);

  // Related Games ("Play Next" - Section 3.6 of Deep Dive: tag overlap + same author + completion rate)
  const relatedGames = games
    .filter((g) => g.id !== game.id && g.status === "PUBLISHED")
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((t) => game.tags.includes(t)).length;
      const sameAuthorBoost = candidate.authorUsername === game.authorUsername ? 1.5 : 0;
      const compRate =
        candidate.playCount > 0 ? candidate.completionCount / candidate.playCount : 0.5;
      return {
        game: candidate,
        score: sharedTags * 2 + sameAuthorBoost + compRate,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.game);

  const completionRatePct =
    game.playCount > 0
      ? Math.round((game.completionCount / game.playCount) * 100)
      : 0;

  const handleFullscreen = () => {
    const el = playerBoxRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  };

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    runtimeRef.current?.audio?.setMuted(next);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6">
      {/* Desktop Two-Column Layout: Main Area + 340px Sidebar, Gap 24px (Section 4 of UI Spec) */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT MAIN COLUMN */}
        <div className="w-full lg:flex-1 min-w-0 space-y-5">
          {/* 4:3 Player Box + Toolbar */}
          <div
            ref={playerBoxRef}
            className="rounded-card border-2 border-border bg-surface shadow-arcade-lg overflow-hidden"
          >
            {/* 4:3 Viewport Stage */}
            <div className="relative w-full aspect-[4/3] bg-bg flex items-center justify-center overflow-hidden">
              {!isPlaying && !showHeatmap ? (
                /* Click-to-Play Overlay (Cuts bandwidth, focuses keyboard, unlocks audio) */
                <div className="relative w-full h-full">
                  <GameThumbnailCanvas
                    projectData={game.projectData}
                    title={game.title}
                    isHtml5Bundle={game.type === "HTML5_BUNDLE"}
                    className="w-full h-full opacity-55"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-transparent flex flex-col items-center justify-center p-6 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-display uppercase bg-surface-2 border border-border text-accent-2 mb-3">
                      {game.type === "FORGE_STUDIO"
                        ? "60Hz Deterministic Runtime • 320×240 Integer Scale"
                        : "Isolated Sandboxed HTML5 Bundle"}
                    </span>
                    <h2 className="font-display text-xl md:text-2xl text-text mb-4">
                      {game.title}
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setShowHeatmap(false);
                        setIsPlaying(true);
                      }}
                      className="h-12 px-8 rounded-control bg-accent hover:brightness-110 text-bg font-display text-base uppercase tracking-wider font-bold border-2 border-black shadow-arcade active:translate-y-0.5 transition-all flex items-center gap-2.5"
                    >
                      <span>▶ Click to Play</span>
                    </button>
                    <p className="text-xs text-text-muted mt-3">
                      Unlocks Web Audio & locks keyboard focus • Press{" "}
                      <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text font-mono">
                        Esc
                      </kbd>{" "}
                      anytime to exit
                    </p>
                  </div>
                </div>
              ) : showHeatmap && !isPlaying ? (
                /* Creator Death Heatmap Viewer */
                <div className="relative w-full h-full">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={240}
                    className="w-full h-full block pixelated"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1.5 rounded-control bg-bg/90 border-2 border-accent text-xs font-semibold text-text">
                    🔥 Death Heatmap Overlay (Cells show aggregated player deaths)
                  </div>
                </div>
              ) : game.type === "FORGE_STUDIO" ? (
                /* Active Shared Deterministic Runtime Canvas */
                <div className="relative w-full h-full flex items-center justify-center bg-bg">
                  <canvas
                    ref={canvasRef}
                    width={320}
                    height={240}
                    className="w-full h-full block pixelated"
                  />
                  {/* Visible Exit Game control so keyboard users never get trapped (Section 6 of UI Spec) */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      runtimeRef.current?.audio?.destroy();
                    }}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-control bg-bg/85 hover:bg-surface-2 border border-border text-[11px] font-mono text-text-muted hover:text-text"
                  >
                    Exit Game (Esc)
                  </button>
                </div>
              ) : (
                /* Active Sandboxed HTML5 Bundle Iframe */
                <div className="relative w-full h-full bg-bg">
                  <iframe
                    title={game.title}
                    srcDoc={game.htmlBundleSrcDoc}
                    sandbox="allow-scripts allow-pointer-lock"
                    className="w-full h-full border-0 block"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPlaying(false)}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-control bg-bg/90 hover:bg-surface-2 border border-border text-[11px] font-mono text-text-muted hover:text-text"
                  >
                    Exit Sandbox
                  </button>
                </div>
              )}
            </div>

            {/* Optional Virtual Touch Overlay (D-Pad on left, A/B buttons on right, >=48px targets) */}
            {isPlaying && showTouchPad && game.type === "FORGE_STUDIO" && (
              <div className="bg-surface-2 border-t-2 border-border p-3 flex items-center justify-between select-none">
                {/* D-Pad */}
                <div className="grid grid-cols-3 gap-1.5 w-36">
                  <div />
                  <button
                    type="button"
                    onPointerDown={() => (inputRef.current.up = true)}
                    onPointerUp={() => (inputRef.current.up = false)}
                    onPointerLeave={() => (inputRef.current.up = false)}
                    className="h-12 rounded-control bg-surface border-2 border-border active:border-accent font-bold text-sm"
                  >
                    ▲
                  </button>
                  <div />
                  <button
                    type="button"
                    onPointerDown={() => (inputRef.current.left = true)}
                    onPointerUp={() => (inputRef.current.left = false)}
                    onPointerLeave={() => (inputRef.current.left = false)}
                    className="h-12 rounded-control bg-surface border-2 border-border active:border-accent font-bold text-sm"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => (inputRef.current.down = true)}
                    onPointerUp={() => (inputRef.current.down = false)}
                    onPointerLeave={() => (inputRef.current.down = false)}
                    className="h-12 rounded-control bg-surface border-2 border-border active:border-accent font-bold text-sm"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    onPointerDown={() => (inputRef.current.right = true)}
                    onPointerUp={() => (inputRef.current.right = false)}
                    onPointerLeave={() => (inputRef.current.right = false)}
                    className="h-12 rounded-control bg-surface border-2 border-border active:border-accent font-bold text-sm"
                  >
                    ▶
                  </button>
                </div>

                <div className="text-center text-xs text-text-muted font-mono">
                  SCORE: <span className="text-warn font-bold">{liveScore}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onPointerDown={() => (inputRef.current.action = true)}
                    onPointerUp={() => (inputRef.current.action = false)}
                    onPointerLeave={() => (inputRef.current.action = false)}
                    className="w-14 h-14 rounded-full bg-accent text-bg font-display font-bold text-sm border-2 border-black shadow-arcade-sm active:translate-y-0.5"
                  >
                    ACT
                  </button>
                  <button
                    type="button"
                    onClick={initStudioRuntime}
                    className="w-12 h-12 rounded-full bg-surface border-2 border-border text-xs font-bold text-text"
                  >
                    RST
                  </button>
                </div>
              </div>
            )}

            {/* 48px Toolbar below Player Box (Section 4 of UI Spec) */}
            <div className="min-h-[48px] px-4 py-2 bg-surface border-t-2 border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {/* Like Button */}
                <button
                  type="button"
                  onClick={() => toggleLike(game.id)}
                  className={`h-9 px-3.5 rounded-control border-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    game.userLiked
                      ? "bg-accent text-bg border-black shadow-arcade-sm"
                      : "bg-surface-2 text-text border-border hover:border-accent"
                  }`}
                >
                  <span>♥</span>
                  <span>{game.likeCount}</span>
                </button>

                {/* Restart Button */}
                {isPlaying && game.type === "FORGE_STUDIO" && (
                  <button
                    type="button"
                    onClick={initStudioRuntime}
                    className="h-9 px-3 rounded-control bg-surface-2 border-2 border-border hover:border-accent-2 text-xs font-semibold text-text"
                  >
                    ↻ Restart (R)
                  </button>
                )}

                {/* Audio Mute Toggle */}
                {game.type === "FORGE_STUDIO" && (
                  <button
                    type="button"
                    onClick={handleMuteToggle}
                    className="h-9 px-3 rounded-control bg-surface-2 border-2 border-border hover:border-accent text-xs font-semibold text-text"
                  >
                    {isMuted ? "🔇 Muted" : "🔊 Audio 50%"}
                  </button>
                )}

                {/* Touch D-Pad Toggle */}
                {game.type === "FORGE_STUDIO" && (
                  <button
                    type="button"
                    onClick={() => setShowTouchPad((p) => !p)}
                    className={`h-9 px-3 rounded-control border-2 text-xs font-semibold ${
                      showTouchPad
                        ? "bg-surface-2 border-accent-2 text-accent-2"
                        : "bg-surface-2 border-border text-text-muted hover:text-text"
                    }`}
                  >
                    🕹️ Touch Pad
                  </button>
                )}

                {/* Debug Hitbox Toggle */}
                {isPlaying && game.type === "FORGE_STUDIO" && (
                  <button
                    type="button"
                    onClick={() => setShowDebug((d) => !d)}
                    className={`h-9 px-3 rounded-control border-2 text-xs font-mono ${
                      showDebug
                        ? "bg-surface-2 border-accent-2 text-accent-2"
                        : "bg-surface-2 border-border text-text-muted"
                    }`}
                  >
                    Hitboxes
                  </button>
                )}

                {/* Death Heatmap Toggle */}
                {game.type === "FORGE_STUDIO" && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setShowHeatmap((h) => !h);
                    }}
                    className={`h-9 px-3 rounded-control border-2 text-xs font-semibold ${
                      showHeatmap
                        ? "bg-accent text-bg border-black"
                        : "bg-surface-2 border-border text-text-muted hover:text-text"
                    }`}
                  >
                    🔥 Death Heatmap
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="h-9 px-3 rounded-control bg-surface-2 border-2 border-border hover:border-text-muted text-xs font-semibold text-text"
                >
                  Share / Embed
                </button>
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="h-9 px-3 rounded-control bg-surface-2 border-2 border-border hover:border-text-muted text-xs font-semibold text-text"
                >
                  ⛶ Fullscreen
                </button>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="h-9 px-3 rounded-control bg-surface-2 border-2 border-border hover:border-danger text-xs font-semibold text-danger"
                >
                  ⚑ Report
                </button>
              </div>
            </div>
          </div>

          {/* Under Toolbar: H1 Title, Attribution, Reactions, Description & Remix CTA */}
          <div className="rounded-card border-2 border-border bg-surface p-6 shadow-arcade space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-display uppercase font-bold ${
                      game.type === "FORGE_STUDIO"
                        ? "bg-accent text-bg"
                        : "bg-accent-2 text-bg"
                    }`}
                  >
                    {game.type === "FORGE_STUDIO" ? "Forge Studio v1.1" : "HTML5 Sandbox"}
                  </span>
                  <span className="text-xs text-text-muted font-mono">
                    ▶ {game.playCount} Plays • {completionRatePct}% Completion Rate
                  </span>
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-text">
                  {game.title}
                </h1>

                {game.remixedFromTitle && (
                  <p className="text-xs text-text-muted">
                    ⇄ Remixed from{" "}
                    <Link
                      href={`/game/${
                        games.find((x) => x.id === game.remixedFromId)?.slug || ""
                      }`}
                      className="text-accent-2 font-semibold hover:underline"
                    >
                      {game.remixedFromTitle}
                    </Link>{" "}
                    by @{game.remixedFromAuthor}
                  </p>
                )}
              </div>

              {/* Remix in Studio Button (Section 4.1 of Deep Dive) */}
              {game.type === "FORGE_STUDIO" && game.remixAllowed && (
                <button
                  type="button"
                  onClick={() => router.push(`/studio?remix=${game.slug}`)}
                  className="h-10 px-4 rounded-control bg-accent-2 hover:brightness-110 text-bg font-semibold text-sm border-2 border-black shadow-arcade-sm shrink-0 flex items-center gap-2"
                >
                  <span>⇄ Remix in Studio ({game.remixCount})</span>
                </button>
              )}
            </div>

            {/* Reaction Tags (Low-moderation social feedback — Section 4.3 of Deep Dive) */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Player Reactions
              </p>
              <div className="flex flex-wrap gap-2">
                {REACTION_META.map((rm) => {
                  const active = game.userReacted.includes(rm.kind);
                  const count = game.reactions[rm.kind] || 0;
                  return (
                    <button
                      key={rm.kind}
                      type="button"
                      onClick={() => toggleReaction(game.id, rm.kind)}
                      className={`h-9 px-3.5 rounded-full border-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        active
                          ? "bg-surface-2 border-accent text-text shadow-arcade-sm"
                          : "bg-bg border-border text-text-muted hover:text-text"
                      }`}
                    >
                      <span>{rm.icon}</span>
                      <span>{rm.label}</span>
                      <span className="font-mono text-accent">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description capped at max-w-prose (~65ch) */}
            <div className="pt-2 border-t border-border space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                About This Game
              </h2>
              <p className="text-base text-text leading-relaxed max-w-prose">
                {game.description}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {game.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-2 border border-border text-text-muted"
                  >
                    #{t}
                  </span>
                ))}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-bg border border-border text-accent-2">
                  Length: {game.lengthBucket}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR (340px on Desktop — Section 4 of UI Spec) */}
        <aside className="w-full lg:w-[340px] shrink-0 space-y-5">
          {/* 1. Top 10 Leaderboard (with explicit Verified / Unverified labels) */}
          <div className="rounded-card border-2 border-border bg-surface p-4 shadow-arcade">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border">
              <h2 className="font-display text-sm uppercase tracking-wider text-text">
                🏆 Top 10 Leaderboard
              </h2>
              {game.type === "FORGE_STUDIO" ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-accent-2/20 text-accent-2 border border-accent-2">
                  ✓ VERIFIED RUNTIME
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-warn/20 text-warn border border-warn">
                  ! UNVERIFIED BRIDGE
                </span>
              )}
            </div>

            {game.scores.length > 0 ? (
              <ol className="space-y-2">
                {game.scores.slice(0, 10).map((s, idx) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 rounded-control bg-surface-2 border border-border text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[11px] ${
                          idx === 0
                            ? "bg-warn text-bg"
                            : "bg-bg text-text-muted"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <Link
                        href={`/profile/${s.username}`}
                        className="font-semibold text-text hover:text-accent truncate"
                      >
                        @{s.username}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-warn">
                        {s.score} pts
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          s.verified
                            ? "border-accent-2 text-accent-2"
                            : "border-warn text-warn"
                        }`}
                      >
                        {s.verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-text-muted py-4 text-center">
                No scores posted yet. Be the first to set a record!
              </p>
            )}
          </div>

          {/* 2. Controls Guide */}
          <div className="rounded-card border-2 border-border bg-surface p-4 shadow-arcade space-y-2.5">
            <h2 className="font-display text-sm uppercase tracking-wider text-text">
              🕹️ Controls & Input
            </h2>
            <p className="text-xs text-text-muted leading-relaxed">
              {game.controlsGuide}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono text-text-muted">
              <div className="p-2 rounded bg-surface-2 border border-border">
                <span className="text-text font-bold block">Move</span>
                WASD / Arrows / D-Pad
              </div>
              <div className="p-2 rounded bg-surface-2 border border-border">
                <span className="text-text font-bold block">Action / Talk</span>
                Space / Z / Gamepad A
              </div>
            </div>
          </div>

          {/* 3. Creator Card */}
          <div className="rounded-card border-2 border-border bg-surface p-4 shadow-arcade space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/profile/${authorProfile.username}`}
                className="flex items-center gap-2.5 group"
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center font-display text-sm font-bold text-bg border-2 border-black"
                  style={{ backgroundColor: authorProfile.avatarColor }}
                >
                  {authorProfile.username[0]?.toUpperCase()}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-text group-hover:text-accent">
                    {authorProfile.displayName}
                  </h3>
                  <p className="text-xs text-text-muted">
                    @{authorProfile.username} • {authorProfile.followersCount} followers
                  </p>
                </div>
              </Link>

              {authorProfile.id !== currentUser.id && (
                <button
                  type="button"
                  onClick={() => toggleFollow(authorProfile.id)}
                  className={`h-8 px-3 rounded-control text-xs font-semibold border-2 ${
                    isFollowingAuthor
                      ? "bg-surface-2 border-accent-2 text-accent-2"
                      : "bg-accent text-bg border-black"
                  }`}
                >
                  {isFollowingAuthor ? "Following" : "+ Follow"}
                </button>
              )}
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              {authorProfile.bio}
            </p>
          </div>

          {/* 4. Play Next (Related Games — Section 3.6 of Deep Dive) */}
          <div className="rounded-card border-2 border-border bg-surface p-4 shadow-arcade space-y-3">
            <h2 className="font-display text-sm uppercase tracking-wider text-text">
              ▶ Play Next
            </h2>
            <div className="space-y-2.5">
              {relatedGames.map((rg) => (
                <Link
                  key={rg.id}
                  href={`/game/${rg.slug}`}
                  className="flex items-center gap-3 p-2 rounded-control bg-surface-2 hover:border-accent border-2 border-transparent transition-all"
                >
                  <div className="w-20 shrink-0 rounded overflow-hidden border border-border">
                    <GameThumbnailCanvas
                      projectData={rg.projectData}
                      title={rg.title}
                      isHtml5Bundle={rg.type === "HTML5_BUNDLE"}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-text truncate">
                      {rg.title}
                    </h3>
                    <p className="text-[11px] text-text-muted truncate">
                      @{rg.authorUsername}
                    </p>
                    <p className="text-[11px] font-mono text-accent mt-0.5">
                      ♥ {rg.likeCount} • ▶ {rg.playCount}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Report Game Modal (uses native <dialog closedby="any">) */}
      <ArcadeDialog
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={`Report "${game.title}"`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitReport(game.id, reportReason, reportDetails);
            setReportModalOpen(false);
            setReportDetails("");
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase text-text-muted mb-1.5">
              Reason
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full h-10 px-3 rounded-control bg-surface-2 border-2 border-border text-sm text-text"
            >
              <option value="Broken or unplayable">Broken or unplayable</option>
              <option value="Spam or misleading">Spam or misleading</option>
              <option value="Copyright / stolen assets">Copyright / stolen assets</option>
              <option value="Inappropriate content">Inappropriate content</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-text-muted mb-1.5">
              Additional Details
            </label>
            <textarea
              rows={3}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Describe what happened..."
              className="w-full p-3 rounded-control bg-surface-2 border-2 border-border text-sm text-text"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReportModalOpen(false)}
              className="h-10 px-4 rounded-control border-2 border-border text-xs font-semibold text-text-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-4 rounded-control bg-danger text-bg font-semibold text-xs border-2 border-black shadow-arcade-sm"
            >
              Submit Report
            </button>
          </div>
        </form>
      </ArcadeDialog>

      {/* Share & Private Token Modal */}
      <ArcadeDialog
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title="Share & Embed Game"
      >
        <div className="space-y-4 text-xs">
          <div>
            <p className="font-semibold text-text-muted uppercase mb-1">
              Public Arcade Link
            </p>
            <input
              type="text"
              readOnly
              value={`https://arcadeforge.com/game/${game.slug}`}
              className="w-full h-10 px-3 rounded-control bg-surface-2 border-2 border-border font-mono text-text"
            />
          </div>
          <div>
            <p className="font-semibold text-text-muted uppercase mb-1">
              Private Unlisted Preview Token (Section 1.9)
            </p>
            <input
              type="text"
              readOnly
              value={`https://arcadeforge.com/g/${game.unlistedToken}`}
              className="w-full h-10 px-3 rounded-control bg-surface-2 border-2 border-border font-mono text-accent-2"
            />
          </div>
          <div>
            <p className="font-semibold text-text-muted uppercase mb-1">
              Sandboxed Embed Snippet (Isolated Origin)
            </p>
            <textarea
              readOnly
              rows={3}
              value={`<iframe src="https://play.arcadeforge-games.com/embed/${game.slug}" width="640" height="480" sandbox="allow-scripts allow-pointer-lock allow-same-origin"></iframe>`}
              className="w-full p-3 rounded-control bg-surface-2 border-2 border-border font-mono text-text-muted"
            />
          </div>
        </div>
      </ArcadeDialog>
    </div>
  );
}
