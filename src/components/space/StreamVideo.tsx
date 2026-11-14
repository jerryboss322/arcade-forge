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
  return stream.getVideoTracks().some((track) => track.readyState === "live" && track.enabled);
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
    const clearMuteTimer = () => {
      if (muteTimer) {
        clearTimeout(muteTimer);
        muteTimer = null;
      }
    };

    const syncFrameState = () => {
      const liveTrack = stream
        .getVideoTracks()
        .find((track) => track.readyState === "live" && track.enabled);
      if (!liveTrack) {
        clearMuteTimer();
        setHasFrames(false);
        return;
      }
      if (videoEl.videoWidth > 0 && videoEl.readyState >= 2 && !liveTrack.muted) {
        clearMuteTimer();
        setHasFrames(true);
      }
    };

    const tryPlay = () => {
      videoEl.muted = true;
      videoEl.play().catch(() => {});
      syncFrameState();
    };

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    tryPlay();

    const boundTracks = new Set<MediaStreamTrack>();
    const onTrackUnmute = () => {
      clearMuteTimer();
      tryPlay();
    };
    const onTrackMute = () => {
      clearMuteTimer();
      muteTimer = setTimeout(() => {
        const anyUnmuted = stream
          .getVideoTracks()
          .some((t) => t.readyState === "live" && t.enabled && !t.muted);
        if (!anyUnmuted || videoEl.videoWidth === 0) {
          setHasFrames(false);
        }
      }, 1200);
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
      tryPlay();
    };
    const onRemoveTrack = () => {
      syncFrameState();
    };

    bindTracks();
    stream.addEventListener("addtrack", onAddTrack);
    stream.addEventListener("removetrack", onRemoveTrack);
    videoEl.addEventListener("playing", syncFrameState);
    videoEl.addEventListener("loadeddata", syncFrameState);
    videoEl.addEventListener("resize", syncFrameState);

    return () => {
      clearMuteTimer();
      for (const track of boundTracks) {
        track.removeEventListener("unmute", onTrackUnmute);
        track.removeEventListener("mute", onTrackMute);
        track.removeEventListener("ended", onTrackEnded);
      }
      boundTracks.clear();
      stream.removeEventListener("addtrack", onAddTrack);
      stream.removeEventListener("removetrack", onRemoveTrack);
      videoEl.removeEventListener("playing", syncFrameState);
      videoEl.removeEventListener("loadeddata", syncFrameState);
      videoEl.removeEventListener("resize", syncFrameState);
    };
  }, [stream]);

  const videoNode = (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      onLoadedMetadata={(e) => {
        e.currentTarget.muted = true;
        e.currentTarget.play().catch(() => {});
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
