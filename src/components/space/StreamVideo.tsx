"use client";

import React, { memo, useEffect, useRef } from "react";
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

interface StreamVideoProps {
  stream: MediaStream;
  mirror?: boolean;
  className?: string;
}

/**
 * Shared WebRTC <video> renderer that enforces muted autoplay, re-binds srcObject safely,
 * and retries playback on metadata load and video track unmute events.
 */
export const StreamVideo = memo(function StreamVideo({
  stream,
  mirror = false,
  className = "w-full h-full object-cover",
}: StreamVideoProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !stream) return;

    const tryPlay = () => {
      videoEl.muted = true;
      videoEl.play().catch(() => {});
    };

    if (videoEl.srcObject !== stream) {
      videoEl.srcObject = stream;
    }
    tryPlay();

    const videoTracks = stream.getVideoTracks();
    for (const track of videoTracks) {
      track.addEventListener("unmute", tryPlay);
    }
    stream.addEventListener("addtrack", tryPlay);

    return () => {
      for (const track of videoTracks) {
        track.removeEventListener("unmute", tryPlay);
      }
      stream.removeEventListener("addtrack", tryPlay);
    };
  }, [stream]);

  return (
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
});
