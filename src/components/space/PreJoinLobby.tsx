"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { OFFICE_STATUS_PRESETS } from "@/lib/space/officeReactions";
import { StreamVideo } from "@/components/space/StreamVideo";
import {
  IconCube,
  IconFlipCamera,
  IconMic,
  IconMicOff,
  IconRefresh,
  IconVideo,
  IconVideoOff,
} from "@/components/space/SpaceIcons";

const AVATAR_COLORS = [
  "#F59E0B",
  "#E5D9B6",
  "#EA580C",
  "#84CC16",
  "#38BDF8",
  "#A78BFA",
];

export interface PreJoinConfig {
  name: string;
  avatarColor: string;
  status: string;
  initialViewMode: "3d" | "call";
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioDeviceId?: string;
  videoDeviceId?: string;
  cameraFacing: "user" | "environment";
  stream: MediaStream | null;
}

interface PreJoinLobbyProps {
  spaceSlug?: string;
  spaceName: string;
  planTier?: string;
  maxParticipants?: number;
  isManagedWorkspace?: boolean;
  ownerPasscode?: string | null;
  initialName: string;
  initialColor: string;
  onJoin: (config: PreJoinConfig) => void;
}

function describeLobbyError(err: unknown, kind: "camera" | "microphone"): string {
  const name = err instanceof Error ? err.name : "";
  const label = kind === "camera" ? "Camera" : "Microphone";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return `${label} permission denied — allow in browser site settings and tap Retry.`;
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return `${label} is locked by another app/tab — close it to use ${kind}, or join without it.`;
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return `No ${kind} hardware detected on this device.`;
  }
  return `${label} unavailable on this device.`;
}

export function PreJoinLobby({
  spaceSlug,
  spaceName,
  planTier,
  maxParticipants,
  isManagedWorkspace = false,
  ownerPasscode = null,
  initialName,
  initialColor,
  onJoin,
}: PreJoinLobbyProps) {
  const [name, setName] = useState(initialName);
  const [avatarColor, setAvatarColor] = useState(initialColor);
  const [status, setStatus] = useState<string>(OFFICE_STATUS_PRESETS[0] ?? "Focusing");
  const [initialViewMode, setInitialViewMode] = useState<"3d" | "call">("3d");
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeCopied, setPasscodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handedOffRef = useRef(false);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [probing, setProbing] = useState(true);

  const refreshDevices = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
      setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
    } catch {
      // Ignore device enumeration restrictions
    }
  }, []);

  const stopPreviewStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // Ignore track stop errors
        }
      });
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const acquirePreview = useCallback(
    async (opts?: {
      audioId?: string;
      videoId?: string;
      facing?: "user" | "environment";
      wantAudio?: boolean;
      wantVideo?: boolean;
    }) => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setProbing(false);
        setCameraError("Browser media API unavailable here (join as Viewer).");
        return;
      }

      setProbing(true);
      const targetAudioId = opts?.audioId ?? selectedAudioId;
      const targetVideoId = opts?.videoId ?? selectedVideoId;
      const targetFacing = opts?.facing ?? cameraFacing;
      const wantAudio = opts?.wantAudio ?? true;
      const wantVideo = opts?.wantVideo ?? true;

      stopPreviewStream();

      const capturedTracks: MediaStreamTrack[] = [];
      let nextCamErr: string | null = null;
      let nextMicErr: string | null = null;

      if (wantVideo) {
        const videoAttempts: Array<MediaTrackConstraints | boolean> = targetVideoId
          ? [{ deviceId: { exact: targetVideoId } }, true]
          : [
              {
                facingMode: { ideal: targetFacing },
                width: { ideal: 640 },
                height: { ideal: 480 },
                frameRate: { ideal: 24, max: 30 },
              },
              { facingMode: { ideal: targetFacing } },
              true,
            ];

        let videoTrack: MediaStreamTrack | null = null;
        let lastErr: unknown = null;
        for (const constraint of videoAttempts) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ video: constraint, audio: false });
            videoTrack = s.getVideoTracks()[0] ?? null;
            if (videoTrack) break;
          } catch (err) {
            lastErr = err;
            const errName = err instanceof Error ? err.name : "";
            if (errName === "NotAllowedError" || errName === "NotFoundError") break;
          }
        }
        if (videoTrack) {
          capturedTracks.push(videoTrack);
          setVideoEnabled(true);
          const settingsId = videoTrack.getSettings?.().deviceId;
          if (settingsId && !selectedVideoId) setSelectedVideoId(settingsId);
        } else {
          setVideoEnabled(false);
          nextCamErr = describeLobbyError(lastErr, "camera");
        }
      } else {
        setVideoEnabled(false);
      }

      if (wantAudio) {
        const audioAttempts: Array<MediaTrackConstraints | boolean> = targetAudioId
          ? [
              {
                deviceId: { exact: targetAudioId },
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              true,
            ]
          : [{ echoCancellation: true, noiseSuppression: true, autoGainControl: true }, true];

        let audioTrack: MediaStreamTrack | null = null;
        let lastErr: unknown = null;
        for (const constraint of audioAttempts) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: constraint, video: false });
            audioTrack = s.getAudioTracks()[0] ?? null;
            if (audioTrack) break;
          } catch (err) {
            lastErr = err;
            const errName = err instanceof Error ? err.name : "";
            if (errName === "NotAllowedError" || errName === "NotFoundError") break;
          }
        }
        if (audioTrack) {
          capturedTracks.push(audioTrack);
          setAudioEnabled(true);
          const settingsId = audioTrack.getSettings?.().deviceId;
          if (settingsId && !selectedAudioId) setSelectedAudioId(settingsId);
        } else {
          setAudioEnabled(false);
          nextMicErr = describeLobbyError(lastErr, "microphone");
        }
      } else {
        setAudioEnabled(false);
      }

      setCameraError(nextCamErr);
      setMicError(nextMicErr);

      if (capturedTracks.length > 0) {
        const nextStream = new MediaStream(capturedTracks);
        streamRef.current = nextStream;
        setStream(nextStream);
      } else {
        streamRef.current = null;
        setStream(null);
      }

      await refreshDevices();
      setProbing(false);
    },
    [cameraFacing, refreshDevices, selectedAudioId, selectedVideoId, stopPreviewStream]
  );

  // Initial device capture on mount
  useEffect(() => {
    void acquirePreview();
    return () => {
      if (!handedOffRef.current && streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // Only acquire once on lobby mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate microphone level meter safely
  useEffect(() => {
    const audioTracks = stream?.getAudioTracks() ?? [];
    if (!stream || audioTracks.length === 0 || !audioEnabled || typeof window === "undefined") {
      setMicLevel(0);
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    let ctx: AudioContext | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    try {
      ctx = new AudioCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      timer = setInterval(() => {
        analyser.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] ?? 0;
        const avg = sum / Math.max(1, data.length);
        setMicLevel(Math.min(100, Math.round(avg * 2.2)));
      }, 90);
    } catch {
      setMicLevel(0);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (ctx) ctx.close().catch(() => {});
    };
  }, [stream, audioEnabled]);

  const handleToggleAudio = async () => {
    const track = streamRef.current?.getAudioTracks().find((t) => t.readyState !== "ended");
    if (track) {
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
      return;
    }
    await acquirePreview({ wantAudio: true, wantVideo: videoEnabled });
  };

  const handleToggleVideo = async () => {
    const track = streamRef.current?.getVideoTracks().find((t) => t.readyState !== "ended");
    if (track) {
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
      return;
    }
    await acquirePreview({ wantAudio: audioEnabled, wantVideo: true });
  };

  const handleFlipCamera = async () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    await acquirePreview({
      facing: nextFacing,
      videoId: "",
      wantAudio: audioEnabled,
      wantVideo: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handedOffRef.current = true;
    const cleanName = name.trim().slice(0, 24) || initialName || "Teammate";
    onJoin({
      name: cleanName,
      avatarColor,
      status,
      initialViewMode,
      audioEnabled: Boolean(
        streamRef.current?.getAudioTracks().some((t) => t.readyState !== "ended" && t.enabled)
      ),
      videoEnabled: Boolean(
        streamRef.current?.getVideoTracks().some((t) => t.readyState !== "ended" && t.enabled)
      ),
      audioDeviceId: selectedAudioId || undefined,
      videoDeviceId: selectedVideoId || undefined,
      cameraFacing,
      stream: streamRef.current,
    });
  };

  const hasLivePreviewVideo = Boolean(
    stream && videoEnabled && stream.getVideoTracks().some((t) => t.readyState !== "ended" && t.enabled)
  );

  const previewAvatar = (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#0d1321]"
      style={{ backgroundColor: `${avatarColor}18` }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center font-display text-2xl font-bold text-white shadow-arcade"
        style={{ backgroundColor: avatarColor }}
      >
        {(name.trim() || "TM").slice(0, 2).toUpperCase()}
      </div>
      <span className="text-xs font-display text-text-muted">
        {probing ? "Checking camera & mic..." : "Camera off — avatar shown on office floor"}
      </span>
    </div>
  );

  return (
    <div className="min-h-dvh w-full bg-bg flex items-center justify-center p-3 sm:p-4 relative overflow-x-hidden overflow-y-auto">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full bg-accent/10 blur-3xl"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-2xl rounded-container border border-white/10 bg-surface/95 backdrop-blur-2xl shadow-arcade-lg overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] bg-surface-2/50 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-mono text-accent uppercase tracking-wider">
              {isManagedWorkspace
                ? `Workspace · ${planTier ?? "FREE"} (${maxParticipants ?? 4} seats max)`
                : "Pre-Join Device Check"}
            </span>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-text mt-0.5">
              Join {spaceName}
            </h1>
          </div>

          <div className="flex items-center gap-1 bg-bg/90 p-1 rounded-full border border-white/10">
            <button
              type="button"
              onClick={() => setInitialViewMode("3d")}
              className={`px-3 py-1 rounded-full text-[11px] font-display font-semibold flex items-center gap-1.5 transition-colors ${
                initialViewMode === "3d"
                  ? "bg-accent text-bg"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <IconCube className="w-3.5 h-3.5" />
              <span>3D Office</span>
            </button>
            <button
              type="button"
              onClick={() => setInitialViewMode("call")}
              className={`px-3 py-1 rounded-full text-[11px] font-display font-semibold flex items-center gap-1.5 transition-colors ${
                initialViewMode === "call"
                  ? "bg-accent text-bg"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <IconVideo className="w-3.5 h-3.5" />
              <span>Call Stage</span>
            </button>
          </div>
        </div>

        {/* Keyholder Room Passcode Bar (shown only to authenticated workspace owner) */}
        {ownerPasscode && (
          <div className="px-4 sm:px-6 py-2.5 bg-accent/10 border-b border-accent/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 font-mono">
              <span className="text-text-muted text-[11px] uppercase tracking-wider">
                Keyholder Room Passcode:
              </span>
              <code className="px-2 py-0.5 rounded bg-bg/80 border border-white/15 text-accent font-semibold">
                {showPasscode ? ownerPasscode : "•".repeat(Math.max(6, ownerPasscode.length))}
              </code>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setShowPasscode((v) => !v)}
                className="px-2 py-0.5 rounded bg-surface-2 hover:bg-white/10 text-text border border-white/15"
              >
                {showPasscode ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(ownerPasscode);
                  setPasscodeCopied(true);
                  setTimeout(() => setPasscodeCopied(false), 2000);
                }}
                className="px-2 py-0.5 rounded bg-surface-2 hover:bg-white/10 text-accent border border-accent/35"
              >
                {passcodeCopied ? "Copied!" : "Copy Code"}
              </button>
              {spaceSlug && (
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/space/${spaceSlug}?code=${encodeURIComponent(ownerPasscode)}`;
                    void navigator.clipboard?.writeText(url);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                  className="px-2 py-0.5 rounded bg-accent text-bg font-semibold"
                >
                  {linkCopied ? "Link Copied!" : "Copy Locked Link"}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Left: Live Camera Preview + Audio Meter + Device Pickers */}
          <div className="space-y-3">
            <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full rounded-card overflow-hidden border border-white/10 bg-black">
              {hasLivePreviewVideo && stream ? (
                <StreamVideo
                  stream={stream}
                  mirror={cameraFacing !== "environment"}
                  fallback={previewAvatar}
                />
              ) : (
                previewAvatar
              )}

              {/* Live mic level badge */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md flex items-center gap-2 text-[10px] font-mono text-white">
                <span
                  className={`w-2 h-2 rounded-full ${
                    audioEnabled ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <span>{audioEnabled ? "Mic live" : "Mic muted"}</span>
                {audioEnabled && (
                  <span className="w-10 h-1.5 rounded-full bg-white/20 overflow-hidden inline-block">
                    <span
                      className="block h-full bg-emerald-400 transition-all duration-75"
                      style={{ width: `${Math.max(8, micLevel)}%` }}
                    />
                  </span>
                )}
              </div>

              {/* Quick Media Controls Overlay */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => void handleToggleAudio()}
                  className={`px-3 py-1.5 rounded-full text-xs font-display font-bold whitespace-nowrap flex items-center gap-1.5 border shadow-sm backdrop-blur-md ${
                    audioEnabled
                      ? "bg-black/75 text-white border-white/20 hover:border-accent"
                      : "bg-red-500/90 text-white border-red-400"
                  }`}
                >
                  {audioEnabled ? <IconMic className="w-3.5 h-3.5 shrink-0" /> : <IconMicOff className="w-3.5 h-3.5 shrink-0" />}
                  <span>{audioEnabled ? "Mic On" : "Muted"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleToggleVideo()}
                  className={`px-3 py-1.5 rounded-full text-xs font-display font-bold whitespace-nowrap flex items-center gap-1.5 border shadow-sm backdrop-blur-md ${
                    videoEnabled
                      ? "bg-black/75 text-white border-white/20 hover:border-accent"
                      : "bg-red-500/90 text-white border-red-400"
                  }`}
                >
                  {videoEnabled ? <IconVideo className="w-3.5 h-3.5 shrink-0" /> : <IconVideoOff className="w-3.5 h-3.5 shrink-0" />}
                  <span>{videoEnabled ? "Cam On" : "Cam Off"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleFlipCamera()}
                  title="Flip Front / Back Camera"
                  className="p-1.5 rounded-full bg-black/75 text-white border border-white/20 hover:border-accent backdrop-blur-md"
                >
                  <IconFlipCamera className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {(cameraError || micError) && (
              <div className="p-2.5 rounded-control bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-200 flex items-start justify-between gap-2">
                <span className="leading-snug">{cameraError || micError}</span>
                <button
                  type="button"
                  onClick={() => void acquirePreview({ wantAudio: true, wantVideo: true })}
                  className="px-2 py-1 rounded bg-amber-400 text-black font-bold flex items-center gap-1 flex-shrink-0"
                >
                  <IconRefresh className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Hardware Device Pickers */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <label className="space-y-1">
                <span className="font-display text-text-muted uppercase block">Camera</span>
                <select
                  value={selectedVideoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedVideoId(id);
                    void acquirePreview({ videoId: id, wantAudio: audioEnabled, wantVideo: true });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-control bg-bg border border-[color:var(--color-border-strong)] text-text truncate focus:outline-none focus:border-accent"
                >
                  {videoDevices.length === 0 ? (
                    <option value="">Default Camera</option>
                  ) : (
                    videoDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <label className="space-y-1">
                <span className="font-display text-text-muted uppercase block">Microphone</span>
                <select
                  value={selectedAudioId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedAudioId(id);
                    void acquirePreview({ audioId: id, wantAudio: true, wantVideo: videoEnabled });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-control bg-bg border border-[color:var(--color-border-strong)] text-text truncate focus:outline-none focus:border-accent"
                >
                  {audioDevices.length === 0 ? (
                    <option value="">Default Mic</option>
                  ) : (
                    audioDevices.map((d, i) => (
                      <option key={d.deviceId || i} value={d.deviceId}>
                        {d.label || `Mic ${i + 1}`}
                      </option>
                    ))
                  )}
                </select>
              </label>
            </div>
          </div>

          {/* Right: Name, Avatar, Status, Explicit Join CTA */}
          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div>
                <label htmlFor="prejoin-name" className="block text-xs font-medium text-text mb-1.5">
                  Display Name
                </label>
                <input
                  id="prejoin-name"
                  type="text"
                  required
                  maxLength={24}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-3.5 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <span className="block text-xs font-display text-text mb-1.5">Avatar Color</span>
                <div className="flex items-center gap-2">
                  {AVATAR_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setAvatarColor(hex)}
                      aria-label={`Select color ${hex}`}
                      style={{ backgroundColor: hex }}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        avatarColor === hex ? "ring-2 ring-white scale-110" : "opacity-80 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-display text-text mb-1.5">Status</span>
                <div className="flex flex-wrap gap-1.5">
                  {OFFICE_STATUS_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setStatus(preset)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-display border transition-colors ${
                        status === preset
                          ? "bg-accent text-bg font-bold border-accent"
                          : "bg-surface-2 text-text-muted hover:text-text border-border"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-white/[0.08]">
              <button
                type="submit"
                className="w-full py-3 px-4 bg-accent text-bg font-display font-semibold text-sm rounded-control shadow-arcade-sm hover:brightness-110 transition-all"
              >
                {videoEnabled
                  ? "Enter Call & Office →"
                  : audioEnabled
                    ? "Join Audio-Only →"
                    : "Join as Viewer →"}
              </button>
              <p className="text-[11px] text-center text-text-muted">
                Devices are tested locally before joining so you never freeze on entry.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
