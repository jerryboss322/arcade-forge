"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useArcade } from "@/components/providers/ArcadeProvider";

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { users, currentUser } = useArcade();

  const profile = users.find((u) => u.username === params.username);
  if (!profile) {
    return (
      <div className="max-w-md mx-auto mt-16 p-8 rounded-card border-2 border-border bg-surface text-center shadow-arcade">
        <h1 className="font-display text-lg text-text">Coworker not found</h1>
        <Link href="/" className="text-sm text-accent hover:underline mt-3 inline-block">
          Back to offices
        </Link>
      </div>
    );
  }

  const isOwner = profile.id === currentUser.id;

  return (
    <div className="max-w-[1000px] mx-auto px-4 md:px-8 pt-6 space-y-8">
      {/* 160px banner + 96px overlapping avatar */}
      <section className="rounded-card border-2 border-border bg-surface shadow-arcade overflow-hidden">
        <div
          className="h-36"
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
                @{profile.username} • {profile.role} • Active in ForgeSpace
              </p>
            </div>
          </div>
          <Link
            href="/space/acme-hq"
            className="h-10 px-4 rounded-control text-sm font-semibold border-2 bg-accent text-bg border-black shadow-arcade-sm hover:brightness-110 flex items-center justify-center"
          >
            Meet in Office Floor →
          </Link>
        </div>
        <div className="px-6 pb-6 space-y-3">
          <p className="text-sm text-text-muted max-w-prose">
            {profile.bio || "Remote team collaborator on ForgeSpace."}
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.badges.map((b) => (
              <span
                key={b}
                className="px-2.5 py-0.5 rounded-full text-[11px] font-display uppercase bg-surface-2 border border-accent text-accent"
              >
                ★ {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Workspaces & Team Info */}
      <section className="rounded-container border-2 border-border bg-surface p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-text uppercase tracking-wide">
          Active Spaces & Teams
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-control bg-surface-2 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-text text-sm">
                Acme Tech HQ
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Member</span>
            </div>
            <p className="text-xs text-text-muted">
              Startup open workstation pods, soundproof glass boardroom & reception lounge.
            </p>
            <Link
              href="/space/acme-hq"
              className="text-xs text-accent font-semibold hover:underline block pt-1"
            >
              Enter Office Floor →
            </Link>
          </div>

          <div className="p-4 rounded-control bg-surface-2 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-text text-sm">
                Indie Dev Studio
              </span>
              <span className="text-[10px] text-accent font-mono">Contributor</span>
            </div>
            <p className="text-xs text-text-muted">
              Creative team floor with Lo-Fi lounge, collaborative whiteboard and sprint war room.
            </p>
            <Link
              href="/space/indie-forge"
              className="text-xs text-accent font-semibold hover:underline block pt-1"
            >
              Enter Office Floor →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
