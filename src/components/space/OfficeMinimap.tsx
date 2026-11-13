"use client";

import React, { useState, useRef, useEffect } from "react";
import { OfficeTilemap, SpaceZone, getZoneAt } from "@/lib/space/officeMap";
import { PeerState } from "@/lib/space/signaling";
import { IconCompass, IconLock, IconMap } from "@/components/space/SpaceIcons";

interface OfficeMinimapProps {
  map: OfficeTilemap;
  localPeer: PeerState;
  remotePeers: PeerState[];
  onWarpToRoom: (zone: SpaceZone) => void;
  onWarpToCoords?: (x: number, y: number, zoneId: string) => void;
}

export function OfficeMinimap({
  map,
  localPeer,
  remotePeers,
  onWarpToRoom,
  onWarpToCoords,
}: OfficeMinimapProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const currentZone = getZoneAt(localPeer.x, localPeer.y, map.zones);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    const targetCol = Math.max(1, Math.min(map.cols - 2, Math.round(relX * map.cols)));
    const targetRow = Math.max(1, Math.min(map.rows - 2, Math.round(relY * map.rows)));

    const clickedZone = getZoneAt(targetCol, targetRow, map.zones);
    if (onWarpToCoords && !map.walls[targetRow * map.cols + targetCol]) {
      onWarpToCoords(targetCol, targetRow, clickedZone?.id || localPeer.zoneId);
    } else if (clickedZone) {
      onWarpToRoom(clickedZone);
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Toggle interactive floor map & room jump"
        className={`h-8 px-2.5 rounded-full backdrop-blur-md border text-[11px] font-display flex items-center gap-1.5 transition-colors shadow-sm ${
          open
            ? "bg-surface/95 border-accent text-text"
            : "bg-surface/75 hover:bg-surface/95 border-border/70 hover:border-border text-text"
        }`}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: currentZone?.color || "#37E6C4" }}
        />
        <span className="truncate max-w-[7.5rem] sm:max-w-[9rem] font-semibold">
          {currentZone?.name || "Open Floor"}
        </span>
        {currentZone?.isPrivate && (
          <IconLock className="w-3 h-3 text-accent flex-shrink-0" />
        )}
        <IconMap className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 rounded-xl bg-surface/95 backdrop-blur-xl border border-border/80 shadow-arcade overflow-hidden select-none z-40">
          {/* Popover Header */}
          <div className="px-2.5 py-1.5 border-b border-border/70 flex items-center justify-between gap-1.5">
            <span className="text-[11px] font-display font-bold text-text truncate">
              Floor Radar
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono ${
                currentZone?.isPrivate
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "bg-surface-2 text-text-muted border border-border/60"
              }`}
            >
              {currentZone?.isPrivate ? (
                <>
                  <IconLock className="w-2.5 h-2.5" />
                  <span>Private</span>
                </>
              ) : (
                <>
                  <IconCompass className="w-2.5 h-2.5" />
                  <span>Open</span>
                </>
              )}
            </span>
          </div>

          {/* Interactive Floor Radar */}
          <div
            role="region"
            aria-label="Interactive office floor minimap — click to jump to a room"
            onClick={handleMapClick}
            className="relative w-full aspect-[40/26] bg-bg/95 cursor-crosshair overflow-hidden"
          >
            {map.zones.map((zone) => {
              const left = `${(zone.x1 / map.cols) * 100}%`;
              const top = `${(zone.y1 / map.rows) * 100}%`;
              const width = `${((zone.x2 - zone.x1 + 1) / map.cols) * 100}%`;
              const height = `${((zone.y2 - zone.y1 + 1) / map.rows) * 100}%`;
              const isHere = currentZone?.id === zone.id;

              return (
                <div
                  key={zone.id}
                  title={`Jump to ${zone.name}`}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    borderColor: isHere ? zone.color : `${zone.color}55`,
                    backgroundColor: isHere ? `${zone.color}24` : `${zone.color}10`,
                  }}
                  className="absolute border transition-colors flex items-end p-0.5"
                >
                  <span className="text-[7px] font-mono leading-none text-text-muted/90 truncate">
                    {zone.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}

            {remotePeers.map((peer) => (
              <span
                key={peer.id}
                title={`${peer.name}${peer.status ? ` — ${peer.status}` : ""}`}
                style={{
                  left: `${(peer.x / map.cols) * 100}%`,
                  top: `${(peer.y / map.rows) * 100}%`,
                  backgroundColor: peer.avatarColor,
                }}
                className="absolute w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-bg shadow-sm"
              />
            ))}

            <span
              title={`${localPeer.name} (You)`}
              style={{
                left: `${(localPeer.x / map.cols) * 100}%`,
                top: `${(localPeer.y / map.rows) * 100}%`,
              }}
              className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-2 ring-2 ring-accent-2/40 border border-bg"
            />
          </div>

          <div className="px-2.5 py-1.5 border-t border-border/70 flex items-center justify-between text-[10px] text-text-muted font-mono">
            <span>Click map to warp</span>
            <span>{remotePeers.length + 1} online</span>
          </div>
        </div>
      )}
    </div>
  );
}
