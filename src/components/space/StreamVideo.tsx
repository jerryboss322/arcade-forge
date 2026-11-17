"use client";

import React, { memo, useEffect, useRef, useState } from "react";
import { PeerMediaState } from "@/lib/space/signaling";

/**
 * Returns true only when `stream` contains an actively producing, non-muted live video track
 * and the peer reports either camera or screen sharing enabled.
 */
export function hasActiveVideoFeed(
  stream: MediaStream | undefined,
  media: PeerMediaState,
  isLocal = false
): boolean {
  if (!stream) return false;
  if (!(media.video || media.screen)) return false;
  return stream
    .getVideoTracks()
    .some((track) => track.readyState === "live" && track.enabled && (isLocal || !track.muted));
}

/**
 * Returns true whenever a MediaStream has a live, enabled video track attached and peer state
 * indicates camera or screen share is on — even while a remote WebRTC track is still `muted`
 * awaiting its first keyframe. Keeping `<video>` mounted lets the browser decode immediately.
 */
export function hasAttachedVideoTrack(
  stream: MediaStream | undefined,
  media: PeerMediaState
): boolean {
  if (!stream) return false;
  if (!(media.video || media.screen)) return false;
  return stream.getVideoTracks().some((track) => track.readyState !== "ended" && track.enabled);
}

interface StreamVideoProps {
  stream: MediaStream;
  mirror?: boolean;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Shared WebRTC <video> renderer that enforces muted autoplay, preserves decoder pipelines
 * across track updates, keeps `<video>` mounted before keyframe arrival, and renders an optional
 * `fallback` overlay until real video frames are decoding.
 */
export const StreamVideo = memo(function StreamVideo({
  stream,
  mirror = false,
  className = "w-full h-full object-cover",
  fallback,
}: StreamVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasFrames, setHasFrames] = useState(false);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) {
      setHasFrames(false);
      return;
    }

    let muteTimer: ReturnType<typeof setTimeout> | null = null;
    let watchInterval: ReturnType<typeof setInterval> | null = null;
    let rvfcId: number | null = null;
    let disposed = false;

    const clearMuteTimer = () => {
      if (muteTimer) {
        clearTimeout(muteTimer);
        muteTimer = null;
      }
    };
    const stopWatchers = () => {
      if (watchInterval) {
        clearInterval(watchInterval);
        watchInterval = null;
      }
      if (rvfcId !== null && "cancelVideoFrameCallback" in videoEl) {
        try {
          (videoEl as HTMLVideoElement & { cancelVideoFrameCallback: (id: number) => void }).cancelVideoFrameCallback(rvfcId);
        } catch {
          // Ignore callback cancel error
        }
        rvfcId = null;
      }
    };

    const enforceMuteAndInline = () => {
      videoEl.defaultMuted = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute("muted", "");
      videoEl.setAttribute("playsinline", "");
    };

    const syncFrameState = () => {
      if (disposed) return;
      const liveTrack = stream
        .getVideoTracks()
        .find((track) => track.readyState !== "ended" && track.enabled);
      if (!liveTrack) {
        clearMuteTimer();
        setHasFrames(false);
        return;
      }
      if (videoEl.videoWidth > 0 && videoEl.readyState >= 2) {
        clearMuteTimer();
        stopWatchers();
        setHasFrames(true);
      }
    };

    const tryPlay = () => {
      enforceMuteAndInline();
      videoEl.play().catch(() => {});
      syncFrameState();
    };

    enforceMuteAndInline();
    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    tryPlay();

    const startWatchers = () => {
      if (!watchInterval) {
        watchInterval = setInterval(syncFrameState, 200);
      }
      const rVfc = (
        videoEl as HTMLVideoElement & {
          requestVideoFrameCallback?: (cb: () => void) => number;
        }
      ).requestVideoFrameCallback;
      if (typeof rVfc === "function" && rvfcId === null) {
        try {
          rvfcId = rVfc.call(videoEl, () => {
            rvfcId = null;
            if (disposed) return;
            const hasLive = stream
              .getVideoTracks()
              .some((track) => track.readyState !== "ended" && track.enabled);
            if (hasLive) {
              clearMuteTimer();
              stopWatchers();
              setHasFrames(true);
            }
          });
        } catch {
          // Non-fatal fallback to timer/events
        }
      }
    };
    startWatchers();

    const boundTracks = new Set<MediaStreamTrack>();
    const onTrackUnmute = () => {
      clearMuteTimer();
      tryPlay();
    };
    const onTrackMute = () => {
      clearMuteTimer();
      muteTimer = setTimeout(() => {
        if (disposed) return;
        const anyUnmuted = stream
          .getVideoTracks()
          .some((t) => t.readyState !== "ended" && t.enabled && !t.muted);
        if (!anyUnmuted && videoEl.videoWidth === 0) {
          setHasFrames(false);
          startWatchers();
        }
      }, 1500);
    };
    const onTrackEnded = () => {
      syncFrameState();
    };

    const bindTracks = () => {
      for (const track of stream.getVideoTracks()) {
        if (boundTracks.has(track)) continue;
        boundTracks.add(track);
        track.addEventListener("unmute", onTrackUnmute);
        track.addEventListener("mute", onTrackMute);
        track.addEventListener("ended", onTrackEnded);
      }
    };

    const onAddTrack = () => {
      bindTracks();
      startWatchers();
      tryPlay();
    };
    const onRemoveTrack = () => {
      syncFrameState();
    };

    bindTracks();
    stream.addEventListener("addtrack", onAddTrack);
    stream.addEventListener("removetrack", onRemoveTrack);
    const mediaEvents = [
      "loadedmetadata",
      "loadeddata",
      "canplay",
      "canplaythrough",
      "playing",
      "resize",
      "timeupdate",
    ] as const;
    for (const evt of mediaEvents) {
      videoEl.addEventListener(evt, syncFrameState);
    }

    return () => {
      disposed = true;
      clearMuteTimer();
      stopWatchers();
      for (const track of boundTracks) {
        track.removeEventListener("unmute", onTrackUnmute);
        track.removeEventListener("mute", onTrackMute);
        track.removeEventListener("ended", onTrackEnded);
      }
      boundTracks.clear();
      stream.removeEventListener("addtrack", onAddTrack);
      stream.removeEventListener("removetrack", onRemoveTrack);
      for (const evt of mediaEvents) {
        videoEl.removeEventListener(evt, syncFrameState);
      }
    };
  }, [stream]);

  const videoNode = (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      onLoadedMetadata={(e) => {
        e.currentTarget.defaultMuted = true;
        e.currentTarget.muted = true;
        e.currentTarget.play().catch(() => {});
        const liveTrack = stream
          .getVideoTracks()
          .find((track) => track.readyState !== "ended" && track.enabled);
        if (liveTrack && e.currentTarget.videoWidth > 0 && e.currentTarget.readyState >= 2) {
          setHasFrames(true);
        }
      }}
      className={`${className} ${mirror ? "scale-x-[-1]" : ""}`}
    />
  );

  if (!fallback) {
    return videoNode;
  }

  return (
    <div className="relative w-full h-full">
      {videoNode}
      {!hasFrames && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {fallback}
        </div>
      )}
    </div>
  );
});
