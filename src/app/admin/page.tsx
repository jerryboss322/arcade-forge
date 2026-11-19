"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PlanEntitlements, PlanTier } from "@/lib/plans";
import {
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconKey,
  IconLock,
  IconPlus,
  IconTrash,
} from "@/components/ui/Icons";

interface BossUser {
  id: string;
  email: string;
  username: string;
  plan: PlanTier;
  role: string;
}

interface WorkspaceItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  planTier: PlanTier;
  maxParticipants: number;
  allowScreenShare: boolean;
  hasPasscode: boolean;
  createdAt: string;
}

export default function AdminPortalPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<BossUser | null>(null);
  const [limits, setLimits] = useState<PlanEntitlements | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);

  // Auth form state
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Create workspace form
  const [wsName, setWsName] = useState("");
  const [wsSlug, setWsSlug] = useState("");
  const [wsPasscode, setWsPasscode] = useState("");
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsSubmitting, setWsSubmitting] = useState(false);

  // Latest plain invite links generated in this session (passcodes are hashed in DB)
  const [invitePaths, setInvitePaths] = useState<Record<string, string>>({});
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [editingPasscodeSlug, setEditingPasscodeSlug] = useState<string | null>(null);
  const [rotatedPasscode, setRotatedPasscode] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Upgrade state
  const [activationCode, setActivationCode] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me", { cache: "no-store" });
      const meData = (await meRes.json()) as {
        user?: BossUser | null;
        limits?: PlanEntitlements;
      };

      if (!meData.user) {
        setUser(null);
        setLimits(meData.limits ?? null);
        setWorkspaces([]);
        return;
      }

      setUser(meData.user);
      setLimits(meData.limits ?? null);

      const wsRes = await fetch("/api/workspaces", { cache: "no-store" });
      if (wsRes.ok) {
        const wsData = (await wsRes.json()) as {
          workspaces?: WorkspaceItem[];
          limits?: PlanEntitlements;
        };
        setWorkspaces(wsData.workspaces ?? []);
        if (wsData.limits) setLimits(wsData.limits);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";
      const payload =
        authMode === "register" ? { email, username, password } : { email, password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed.");
        return;
      }
      setPassword("");
      await loadDashboard();
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setWorkspaces([]);
    setInvitePaths({});
  };

  const handleNameChange = (val: string) => {
    setWsName(val);
    setWsSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setWsError(null);
    setActionMessage(null);
    setWsSubmitting(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: wsName,
          slug: wsSlug,
          passcode: wsPasscode,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        workspace?: WorkspaceItem;
        invitePath?: string;
      };
      if (!res.ok) {
        setWsError(data.error || "Failed to create workspace.");
        return;
      }
      if (data.workspace && data.invitePath) {
        setInvitePaths((prev) => ({
          ...prev,
          [data.workspace!.slug]: data.invitePath!,
        }));
        setActionMessage(
          `Workspace "${data.workspace.name}" created. Copy your passworded employee link below!`
        );
      }
      setWsName("");
      setWsSlug("");
      setWsPasscode("");
      await loadDashboard();
    } finally {
      setWsSubmitting(false);
    }
  };

  const handleRotatePasscode = async (slug: string) => {
    setActionMessage(null);
    const res = await fetch(`/api/workspaces/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: rotatedPasscode }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      invitePath?: string;
    };
    if (!res.ok) {
      setActionMessage(data.error || "Could not update passcode.");
      return;
    }
    if (data.invitePath) {
      setInvitePaths((prev) => ({ ...prev, [slug]: data.invitePath! }));
    }
    setEditingPasscodeSlug(null);
    setRotatedPasscode("");
    setActionMessage(`Updated passcode for /space/${slug}. Share the new link with employees.`);
  };

  const handleDeleteWorkspace = async (slug: string) => {
    const res = await fetch(`/api/workspaces/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setActionMessage(`Deleted workspace /space/${slug}.`);
      await loadDashboard();
    }
  };

  const handleCopyInvite = async (slug: string) => {
    const path = invitePaths[slug] || `/space/${slug}`;
    const fullUrl =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      setActionMessage(`Invite URL: ${fullUrl}`);
    }
  };

  const handleUpgrade = async (opts: { activationCode?: string; action?: string }) => {
    setUpgradeMessage(null);
    setUpgrading(true);
    try {
      const res = await fetch("/api/billing/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        checkoutUrl?: string;
        plan?: PlanTier;
      };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }
      if (!res.ok) {
        setUpgradeMessage(data.error || "Upgrade failed.");
        return;
      }
      setActivationCode("");
      setUpgradeMessage("Workspace upgraded to Boss Pro! Screen sharing & 30-seat rooms unlocked.");
      await loadDashboard();
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-sm text-text-muted">
        Loading Boss Admin Portal...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/15 bg-surface text-[11px] font-mono uppercase tracking-[0.16em] text-text mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-accent font-semibold">02</span>
            <span className="text-white/25">/</span>
            <span>Keyholder Office</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text tracking-[-0.02em]">
            Locked Floor Links
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-1.5 max-w-2xl">
            Only the Keyholder keeps an account. Share one passworded link so teammates knock and walk straight in—free for 4 people.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                user.plan === "PRO"
                  ? "bg-accent/15 text-accent border-accent/40"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/40"
              }`}
            >
              {user.plan === "PRO" ? "Boss Pro · $9/mo flat" : "Free Starter · Limited"}
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="px-3.5 py-1.5 text-xs font-medium bg-surface-2 border border-white/10 rounded-control text-text-muted hover:text-text hover:border-white/25 transition-colors"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Unauthenticated: Sign Up / Sign In */}
      {!user ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handleAuthSubmit}
            className="lg:col-span-6 p-6 md:p-7 rounded-container bg-surface border border-white/10 shadow-arcade space-y-5"
          >
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-control bg-bg/80 border border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className={`py-2 rounded-[7px] text-xs font-display font-semibold transition-colors ${
                  authMode === "register"
                    ? "bg-accent text-bg shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Create Boss Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                }}
                className={`py-2 rounded-[7px] text-xs font-display font-semibold transition-colors ${
                  authMode === "login"
                    ? "bg-accent text-bg shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                Sign In
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-control bg-danger/15 border border-danger/40 text-xs text-red-200">
                {authError}
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-text mb-1.5">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="boss@company.com"
                  className="w-full px-3.5 py-2.5 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
                />
              </div>

              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-medium text-text mb-1.5">
                    Admin Handle
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="acme_boss"
                    className="w-full px-3.5 py-2.5 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text mb-1.5">
                  Account Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-2.5 px-4 bg-accent text-bg font-display font-semibold text-xs rounded-control shadow-arcade-sm hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-1.5 transition-all"
            >
              <span>
                {authSubmitting
                  ? "Authenticating..."
                  : authMode === "register"
                    ? "Start Free Boss Account"
                    : "Sign In to Boss Portal"}
              </span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Plan Summary Cards */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 rounded-container bg-surface border border-white/10 shadow-arcade space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-text">
                  Free Starter (Limited Access)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-surface-2 text-accent border border-white/10">
                  $0 / mo
                </span>
              </div>
              <ul className="text-xs text-text-muted space-y-2 pt-1">
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>1 password-protected workspace link for your team</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Up to 4 concurrent participants per room via LiveKit SFU</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>HD camera, spatial mic audio &amp; chat (Zero guest signups)</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconLock className="w-3.5 h-3.5 text-warn shrink-0" />
                  <span>HD screen sharing unlocked on Boss Pro</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-container bg-gradient-to-br from-surface-2 to-surface border border-accent/50 shadow-arcade space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-text">
                  Boss Pro Team
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-accent/15 text-accent border border-accent/30">
                  $9 / mo flat
                </span>
              </div>
              <ul className="text-xs text-text-muted space-y-2 pt-1">
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Up to 20 passworded workspaces ($0 per employee seat)</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Up to 30 simultaneous participants per space</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>HD Screen Sharing &amp; Theater Mode unlocked</span>
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>Zero employee accounts needed · Instant passcode rotation</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated Boss Dashboard */
        <div className="space-y-6">
          {/* Boss Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-card bg-surface border border-white/10">
              <span className="text-[11px] font-mono uppercase text-text-muted block">
                Active Plan
              </span>
              <span className="font-display text-lg font-bold text-text mt-1 block">
                {user.plan === "PRO" ? "Boss Pro" : "Free Starter"}
              </span>
            </div>
            <div className="p-4 rounded-card bg-surface border border-white/10">
              <span className="text-[11px] font-mono uppercase text-text-muted block">
                Workspace Slots
              </span>
              <span className="font-display text-lg font-bold text-accent mt-1 block">
                {workspaces.length} / {limits?.maxWorkspaces ?? 1}
              </span>
            </div>
            <div className="p-4 rounded-card bg-surface border border-white/10">
              <span className="text-[11px] font-mono uppercase text-text-muted block">
                Max Concurrent Seats
              </span>
              <span className="font-display text-lg font-bold text-text mt-1 block">
                {limits?.maxParticipants ?? 4} / room
              </span>
            </div>
            <div className="p-4 rounded-card bg-surface border border-white/10">
              <span className="text-[11px] font-mono uppercase text-text-muted block">
                Screen Sharing
              </span>
              <span
                className={`font-display text-lg font-bold mt-1 block ${
                  limits?.allowScreenShare ? "text-accent" : "text-warn"
                }`}
              >
                {limits?.allowScreenShare ? "Unlocked HD" : "Pro Only"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left Sidebar: Create Workspace + Upgrade Card */}
            <div className="space-y-5">
              <form
                onSubmit={handleCreateWorkspace}
                className="p-5 rounded-container bg-surface border border-white/10 shadow-arcade space-y-4"
              >
                <div>
                  <h2 className="font-display text-sm font-bold text-text flex items-center gap-1.5">
                    <IconPlus className="w-4 h-4 text-accent" />
                    <span>Create Passworded Workspace</span>
                  </h2>
                  <p className="text-[11px] text-text-muted mt-1">
                    Using {workspaces.length} of {limits?.maxWorkspaces ?? 1} slots on{" "}
                    <strong className="text-text">{user.plan}</strong>.
                  </p>
                </div>

                {wsError && (
                  <div className="p-2.5 rounded-control bg-danger/15 border border-danger/40 text-xs text-red-200">
                    {wsError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-text mb-1">
                      Company or Office Name
                    </label>
                    <input
                      type="text"
                      required
                      value={wsName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Acme Remote HQ"
                      className="w-full px-3 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text mb-1">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      required
                      value={wsSlug}
                      onChange={(e) => setWsSlug(e.target.value)}
                      placeholder="acme-team-room"
                      className="w-full px-3 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text font-mono placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-text mb-1">
                      Employee Room Passcode
                    </label>
                    <input
                      type="text"
                      required
                      minLength={4}
                      value={wsPasscode}
                      onChange={(e) => setWsPasscode(e.target.value)}
                      placeholder="e.g. team-2026!"
                      className="w-full px-3 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text font-mono placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={wsSubmitting || workspaces.length >= (limits?.maxWorkspaces ?? 1)}
                  className="w-full py-2.5 px-4 bg-accent text-bg font-display font-semibold text-xs rounded-control shadow-arcade-sm hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {wsSubmitting ? "Creating..." : "Create & Generate Invite Link"}
                </button>
              </form>

              {user.plan !== "PRO" && (
                <div className="p-5 rounded-container bg-gradient-to-b from-surface-2 to-surface border border-accent/50 shadow-arcade space-y-3.5">
                  <div>
                    <h3 className="font-display text-sm font-bold text-text">
                      Upgrade to Boss Pro ($9/mo)
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed mt-1">
                      Unlock 30 concurrent coworkers, up to 20 passworded offices, and HD screen sharing. Employees still join free.
                    </p>
                  </div>

                  {upgradeMessage && (
                    <div className="p-2.5 rounded-control bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200">
                      {upgradeMessage}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={upgrading}
                    onClick={() => void handleUpgrade({})}
                    className="w-full py-2.5 px-4 bg-accent text-bg font-display font-semibold text-xs rounded-control hover:brightness-110 disabled:opacity-60 inline-flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>{upgrading ? "Processing..." : "Upgrade via Checkout"}</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="pt-3 border-t border-white/[0.08] space-y-2">
                    <label className="block text-[11px] font-mono text-text-muted">
                      Have a Boss Pro Activation Key?
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={activationCode}
                        onChange={(e) => setActivationCode(e.target.value)}
                        placeholder="Enter license key"
                        className="flex-1 px-2.5 py-1.5 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text placeholder:text-text-muted/60 focus:outline-none focus:border-accent"
                      />
                      <button
                        type="button"
                        disabled={upgrading || !activationCode.trim()}
                        onClick={() => void handleUpgrade({ activationCode })}
                        className="px-3 py-1.5 text-xs font-display font-semibold bg-surface-2 border border-white/15 rounded-control text-text hover:border-accent disabled:opacity-50"
                      >
                        Activate
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Main Column: Owned Workspaces */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-text">
                  Team Workspaces ({workspaces.length})
                </h2>
                <span className="text-xs font-mono text-text-muted">
                  Signed in as @{user.username}
                </span>
              </div>

              {actionMessage && (
                <div className="p-3.5 rounded-card bg-accent/10 border border-accent/30 text-xs text-accent">
                  {actionMessage}
                </div>
              )}

              {workspaces.length === 0 ? (
                <div className="p-10 rounded-container bg-surface border border-dashed border-white/15 text-center space-y-2">
                  <p className="font-display text-sm font-semibold text-text">
                    No workspaces created yet
                  </p>
                  <p className="text-xs text-text-muted max-w-md mx-auto">
                    Create your first password-protected office on the left, then share the generated invite link with your teammates.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {workspaces.map((ws) => {
                    const invitePath = invitePaths[ws.slug];
                    return (
                      <div
                        key={ws.id}
                        className="p-5 rounded-container bg-surface border border-white/10 shadow-arcade space-y-3.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-display text-base font-bold text-text">
                                {ws.name}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-2 border border-white/10 text-text-muted">
                                {ws.maxParticipants} seats ·{" "}
                                {ws.allowScreenShare ? "Screen Share ON" : "Screen Share Pro"}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-text-muted">/space/{ws.slug}</p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/space/${ws.slug}`}
                              className="px-3.5 py-1.5 text-xs font-display font-semibold bg-accent text-bg rounded-control hover:brightness-110 transition-all"
                            >
                              Enter Office
                            </Link>
                            <button
                              type="button"
                              onClick={() => void handleCopyInvite(ws.slug)}
                              className="px-3 py-1.5 text-xs font-medium bg-surface-2 border border-white/15 rounded-control text-text hover:border-accent/60 inline-flex items-center gap-1.5 transition-colors"
                            >
                              <IconCopy className="w-3.5 h-3.5 text-accent" />
                              <span>
                                {copiedSlug === ws.slug
                                  ? "Copied!"
                                  : invitePath
                                    ? "Copy Passworded Link"
                                    : "Copy Space URL"}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPasscodeSlug(
                                  editingPasscodeSlug === ws.slug ? null : ws.slug
                                );
                                setRotatedPasscode("");
                              }}
                              className="px-3 py-1.5 text-xs font-medium bg-surface-2 border border-white/10 rounded-control text-text-muted hover:text-text hover:border-white/25 inline-flex items-center gap-1.5 transition-colors"
                            >
                              <IconKey className="w-3.5 h-3.5" />
                              <span>Reset Passcode</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteWorkspace(ws.slug)}
                              aria-label={`Delete workspace ${ws.name}`}
                              className="px-2.5 py-1.5 text-xs font-medium bg-danger/10 border border-danger/35 rounded-control text-red-300 hover:bg-danger/20 inline-flex items-center gap-1 transition-colors"
                            >
                              <IconTrash className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>

                        {invitePath && (
                          <div className="p-3 rounded-control bg-bg/90 border border-accent/40 text-[11px] font-mono text-accent break-all">
                            Share this passworded employee link:{" "}
                            {typeof window !== "undefined"
                              ? `${window.location.origin}${invitePath}`
                              : invitePath}
                          </div>
                        )}

                        {editingPasscodeSlug === ws.slug && (
                          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.08]">
                            <input
                              type="text"
                              value={rotatedPasscode}
                              onChange={(e) => setRotatedPasscode(e.target.value)}
                              placeholder="New passcode (min 4 chars)"
                              className="flex-1 px-3 py-2 text-xs bg-bg border border-[color:var(--color-border-strong)] rounded-control text-text font-mono focus:outline-none focus:border-accent"
                            />
                            <button
                              type="button"
                              disabled={rotatedPasscode.trim().length < 4}
                              onClick={() => void handleRotatePasscode(ws.slug)}
                              className="px-4 py-2 text-xs font-display font-semibold bg-accent text-bg rounded-control disabled:opacity-50 hover:brightness-110"
                            >
                              Save New Link
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
