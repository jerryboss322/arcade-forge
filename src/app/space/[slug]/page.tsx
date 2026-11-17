"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RESERVED_SPACE_SLUGS } from "@/lib/plans";
import { PreJoinConfig, PreJoinLobby } from "@/components/space/PreJoinLobby";
import { SpaceView } from "@/components/space/SpaceView";

function isPublicDemoSlug(slug: string): boolean {
  return RESERVED_SPACE_SLUGS.has(slug) || slug.startsWith("diag-room-");
}

const SPACE_PRESETS: Record<string, { name: string; description: string }> = {
  "acme-hq": {
    name: "Acme Tech HQ",
    description: "Modern startup headquarters with dual-monitor pods and glass boardroom.",
  },
  "indie-forge": {
    name: "Indie Dev Studio",
    description: "Creative pixel-art studio with breakroom arcade cabinet and brainstorm war room.",
  },
  "study-cafe": {
    name: "Late Night Study Cafe",
    description: "Cozy library atmosphere with quiet focus desks and espresso bar.",
  },
};

interface AccessInfo {
  isManaged: boolean;
  unlocked: boolean;
  name?: string;
  planTier: string;
  maxParticipants: number;
  allowScreenShare: boolean;
  isOwner: boolean;
}

function pickAvatarColor(seed: string): string {
  const palette = ["#37E6C4", "#FF0055", "#FFC53D", "#00A8FF", "#B84DFF", "#FF7A00"];
  const hash = Math.abs(seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return palette[hash % palette.length] || "#37E6C4";
}

export default function SpaceSlugPage() {
  const params = useParams<{ slug: string }>();
  const slug = (params?.slug || "acme-hq").toLowerCase();

  const [access, setAccess] = useState<AccessInfo | null>(() =>
    isPublicDemoSlug(slug)
      ? {
          isManaged: false,
          unlocked: true,
          planTier: "DEMO",
          maxParticipants: 4,
          allowScreenShare: true,
          isOwner: false,
        }
      : null
  );
  const [suggestedName, setSuggestedName] = useState<string>("Teammate");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [preJoin, setPreJoin] = useState<PreJoinConfig | null>(null);

  const preset = SPACE_PRESETS[slug] || {
    name: slug
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" "),
    description: "Custom virtual office powered by ForgeSpace.",
  };

  useEffect(() => {
    let cancelled = false;

    const savedName =
      typeof window !== "undefined"
        ? sessionStorage.getItem(`forgespace_guest_name_${slug}`)
        : null;
    if (savedName) {
      setSuggestedName(savedName);
    }

    async function hydrateAccessAndBoss() {
      // Check optional signed-in Boss account cleanly (never mock users)
      if (!savedName) {
        try {
          const authRes = await fetch("/api/auth/me", { cache: "no-store" });
          if (authRes.ok) {
            const authData = (await authRes.json()) as {
              user?: { username?: string } | null;
            };
            if (!cancelled && authData?.user?.username) {
              setSuggestedName(authData.user.username);
            }
          }
        } catch {
          // Guest user continues cleanly
        }
      }

      if (isPublicDemoSlug(slug)) return;

      try {
        const res = await fetch(`/api/workspaces/${encodeURIComponent(slug)}/access`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let info = (await res.json()) as AccessInfo;

        const queryCode =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("code")?.trim() || ""
            : "";

        if (info.isManaged && !info.unlocked && queryCode) {
          const unlockRes = await fetch(`/api/workspaces/${encodeURIComponent(slug)}/unlock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ passcode: queryCode }),
          });
          if (unlockRes.ok) {
            const unlockData = (await unlockRes.json()) as {
              name?: string;
              planTier: string;
              maxParticipants: number;
              allowScreenShare: boolean;
            };
            info = {
              ...info,
              unlocked: true,
              name: unlockData.name ?? info.name,
              planTier: unlockData.planTier,
              maxParticipants: unlockData.maxParticipants,
              allowScreenShare: unlockData.allowScreenShare,
            };
            if (typeof window !== "undefined") {
              window.history.replaceState({}, "", `/space/${slug}`);
            }
          } else if (!cancelled) {
            setUnlockError("This invite link passcode is invalid or expired.");
          }
        }

        if (!cancelled) {
          setAccess(info);
        }
      } catch {
        if (!cancelled) {
          setAccess({
            isManaged: false,
            unlocked: true,
            planTier: "DEMO",
            maxParticipants: 4,
            allowScreenShare: true,
            isOwner: false,
          });
        }
      }
    }

    void hydrateAccessAndBoss();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handlePasscodeUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!access) return;
    setUnlockError(null);
    setVerifying(true);
    try {
      const res = await fetch(`/api/workspaces/${encodeURIComponent(slug)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        name?: string;
        planTier?: string;
        maxParticipants?: number;
        allowScreenShare?: boolean;
      };
      if (!res.ok) {
        setUnlockError(data.error || "Incorrect workspace passcode.");
        return;
      }
      setAccess((prev) =>
        prev
          ? {
              ...prev,
              unlocked: true,
              name: data.name ?? prev.name,
              planTier: data.planTier ?? prev.planTier,
              maxParticipants: data.maxParticipants ?? prev.maxParticipants,
              allowScreenShare: data.allowScreenShare ?? prev.allowScreenShare,
            }
          : prev
      );
    } finally {
      setVerifying(false);
    }
  };

  if (!access) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-text font-display text-sm">
        Checking workspace access...
      </div>
    );
  }

  // Step 1: Passcode Gate for protected team workspaces
  if (access.isManaged && !access.unlocked) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <form
          onSubmit={handlePasscodeUnlock}
          className="w-full max-w-md p-6 rounded-container bg-surface border-2 border-border shadow-arcade space-y-4"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-accent uppercase">
              Password-Protected Workspace • {access.planTier} ({access.maxParticipants} seats max)
            </span>
            <h1 className="font-display text-2xl font-extrabold text-text">
              {access.name || preset.name}
            </h1>
            <p className="text-xs text-text-muted">
              Enter the workspace passcode shared by your admin to unlock this office.
            </p>
          </div>

          {unlockError && (
            <div className="p-2.5 rounded-control bg-red-500/15 border border-red-500/40 text-xs text-red-300">
              {unlockError}
            </div>
          )}

          <div>
            <label className="block text-xs font-display text-text mb-1">
              Workspace Passcode
            </label>
            <input
              type="password"
              required
              value={passcodeInput}
              onChange={(e) => setPasscodeInput(e.target.value)}
              placeholder="Enter room passcode"
              className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="w-full py-2.5 bg-accent text-bg font-display font-bold text-xs uppercase rounded-control shadow-arcade hover:brightness-110 disabled:opacity-60"
          >
            {verifying ? "Verifying..." : "Unlock Office →"}
          </button>

          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
            <span>Zero employee DB accounts</span>
            <Link href="/admin" className="text-accent hover:underline">
              Boss Portal →
            </Link>
          </div>
        </form>
      </div>
    );
  }

  // Step 2: Mandatory Pre-Join Hardware Device Lobby (camera, mic meter, device selector, audio unlock)
  if (!preJoin) {
    return (
      <PreJoinLobby
        spaceName={access.name || preset.name}
        planTier={access.planTier}
        maxParticipants={access.maxParticipants}
        isManagedWorkspace={access.isManaged}
        initialName={suggestedName}
        initialColor={pickAvatarColor(suggestedName)}
        onJoin={(config) => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem(`forgespace_guest_name_${slug}`, config.name);
          }
          setPreJoin(config);
        }}
      />
    );
  }

  // Step 3: Live Connected Room (LiveKit SFU or Redis + P2P Mesh)
  return (
    <SpaceView
      spaceSlug={slug}
      spaceName={access.name || preset.name}
      initialUserName={preJoin.name}
      initialAvatarColor={preJoin.avatarColor}
      initialStatus={preJoin.status}
      initialViewMode={preJoin.initialViewMode}
      initialMedia={{
        audioEnabled: preJoin.audioEnabled,
        videoEnabled: preJoin.videoEnabled,
        cameraFacing: preJoin.cameraFacing,
        stream: preJoin.stream,
      }}
      allowScreenShare={access.allowScreenShare}
      maxParticipants={access.maxParticipants}
      planTier={access.planTier}
      isManagedWorkspace={access.isManaged}
    />
  );
}
