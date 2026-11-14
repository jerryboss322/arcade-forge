"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PlanEntitlements, PlanTier } from "@/lib/plans";

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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-text-muted">
        Loading Boss Admin Portal...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <span className="text-xs font-mono text-accent uppercase tracking-wider">
            Boss & Team Admin Portal
          </span>
          <h1 className="font-display text-2xl md:text-4xl font-extrabold text-text mt-1">
            Passworded Workspaces
          </h1>
          <p className="text-xs md:text-sm text-text-muted mt-1 max-w-2xl">
            Only the Boss/Admin creates an account. Employees join free using your passworded invite link — zero employee database accounts required.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-display font-bold border ${
                user.plan === "PRO"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : "bg-amber-500/15 text-amber-300 border-amber-500/40"
              }`}
            >
              {user.plan === "PRO" ? "Boss Pro ($9/mo)" : "Free Starter (Limited)"}
            </span>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="px-3 py-1.5 text-xs bg-surface-2 border border-border rounded-control text-text-muted hover:text-text"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Unauthenticated: Sign Up / Sign In */}
      {!user ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <form
            onSubmit={handleAuthSubmit}
            className="p-6 rounded-container bg-surface border-2 border-border shadow-arcade space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setAuthError(null);
                }}
                className={`px-3 py-1.5 rounded-control text-xs font-display font-bold ${
                  authMode === "register"
                    ? "bg-accent text-bg"
                    : "bg-surface-2 text-text-muted hover:text-text"
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
                className={`px-3 py-1.5 rounded-control text-xs font-display font-bold ${
                  authMode === "login"
                    ? "bg-accent text-bg"
                    : "bg-surface-2 text-text-muted hover:text-text"
                }`}
              >
                Sign In
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-control bg-red-500/15 border border-red-500/40 text-xs text-red-300">
                {authError}
              </div>
            )}

            <div>
              <label className="block text-xs font-display text-text mb-1">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="boss@company.com"
                className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
              />
            </div>

            {authMode === "register" && (
              <div>
                <label className="block text-xs font-display text-text mb-1">
                  Admin Handle
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="acme_boss"
                  className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-display text-text mb-1">
                Account Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
              />
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-2.5 bg-accent text-bg font-display font-bold text-xs uppercase rounded-control shadow-arcade hover:brightness-110 disabled:opacity-60"
            >
              {authSubmitting
                ? "Submitting..."
                : authMode === "register"
                  ? "Start Free Boss Account →"
                  : "Sign In to Boss Portal →"}
            </button>
          </form>

          {/* Plan Summary */}
          <div className="space-y-4">
            <div className="p-5 rounded-container bg-surface border-2 border-border space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-text">
                  Free Starter (Limited Access)
                </h2>
                <span className="text-xs font-mono text-emerald-400">$0 / mo</span>
              </div>
              <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
                <li>1 passworded workspace link for your team</li>
                <li>Up to 4 simultaneous participants per room</li>
                <li>Webcam, spatial mic audio &amp; chat (P2P WebRTC)</li>
                <li>Screen sharing locked (Boss Pro only)</li>
              </ul>
            </div>

            <div className="p-5 rounded-container bg-surface-2 border-2 border-accent space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-text">
                  Boss Pro Team
                </h2>
                <span className="text-xs font-mono text-accent">$9 / mo flat</span>
              </div>
              <ul className="text-xs text-text-muted space-y-1 list-disc pl-4">
                <li>Up to 20 passworded workspaces ($0 per employee seat)</li>
                <li>Up to 30 simultaneous participants per space</li>
                <li>HD Screen Sharing &amp; Theater mode unlocked</li>
                <li>Zero Neon DB accounts needed for employees</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Authenticated Boss Dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left: Create Passworded Space + Upgrade Card */}
          <div className="space-y-6">
            <form
              onSubmit={handleCreateWorkspace}
              className="p-5 rounded-container bg-surface border-2 border-border shadow-arcade space-y-3"
            >
              <h2 className="font-display text-sm font-bold text-text uppercase">
                + Create Passworded Workspace
              </h2>
              <p className="text-[11px] text-text-muted">
                Using {workspaces.length} / {limits?.maxWorkspaces ?? 1} workspace slot(s) on{" "}
                <strong className="text-text">{user.plan}</strong>.
              </p>

              {wsError && (
                <div className="p-2.5 rounded-control bg-red-500/15 border border-red-500/40 text-xs text-red-300">
                  {wsError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-display text-text mb-1">
                  Company / Office Name
                </label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Remote HQ"
                  className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-display text-text mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  required
                  value={wsSlug}
                  onChange={(e) => setWsSlug(e.target.value)}
                  placeholder="acme-team-room"
                  className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-[11px] font-display text-text mb-1">
                  Employee Room Passcode
                </label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={wsPasscode}
                  onChange={(e) => setWsPasscode(e.target.value)}
                  placeholder="e.g. team-2026!"
                  className="w-full px-3 py-2 text-xs bg-bg border border-border rounded-control text-text font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <button
                type="submit"
                disabled={wsSubmitting || workspaces.length >= (limits?.maxWorkspaces ?? 1)}
                className="w-full py-2.5 bg-accent text-bg font-display font-bold text-xs uppercase rounded-control shadow-arcade hover:brightness-110 disabled:opacity-50"
              >
                {wsSubmitting ? "Creating..." : "Create & Generate Invite Link"}
              </button>
            </form>

            {user.plan !== "PRO" && (
              <div className="p-5 rounded-container bg-surface-2 border-2 border-accent space-y-3">
                <h3 className="font-display text-sm font-bold text-text">
                  Upgrade to Boss Pro ($9/mo)
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  Unlock 30 participants per space, up to 20 passworded offices, and HD Screen Sharing. Employees still join free.
                </p>

                {upgradeMessage && (
                  <div className="p-2.5 rounded-control bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200">
                    {upgradeMessage}
                  </div>
                )}

                <button
                  type="button"
                  disabled={upgrading}
                  onClick={() => void handleUpgrade({})}
                  className="w-full py-2 bg-accent text-bg font-display font-bold text-xs uppercase rounded-control hover:brightness-110 disabled:opacity-60"
                >
                  {upgrading ? "Processing..." : "Upgrade via Checkout →"}
                </button>

                <div className="pt-2 border-t border-border space-y-2">
                  <label className="block text-[11px] font-mono text-text-muted">
                    Have a Boss Pro Activation Key?
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      placeholder="Enter license key"
                      className="flex-1 px-2.5 py-1.5 text-xs bg-bg border border-border rounded-control text-text"
                    />
                    <button
                      type="button"
                      disabled={upgrading || !activationCode.trim()}
                      onClick={() => void handleUpgrade({ activationCode })}
                      className="px-3 py-1.5 text-xs font-display font-bold bg-surface border border-border rounded-control text-text hover:border-accent disabled:opacity-50"
                    >
                      Activate
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Owned Workspaces */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-text uppercase">
                Your Team Workspaces ({workspaces.length})
              </h2>
              <span className="text-xs font-mono text-text-muted">
                Signed in as @{user.username}
              </span>
            </div>

            {actionMessage && (
              <div className="p-3 rounded-control bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300">
                {actionMessage}
              </div>
            )}

            {workspaces.length === 0 ? (
              <div className="p-8 rounded-container bg-surface border-2 border-dashed border-border text-center space-y-2">
                <p className="font-display text-sm font-bold text-text">
                  No workspaces created yet
                </p>
                <p className="text-xs text-text-muted">
                  Create your first password-protected workspace on the left and send the generated link to your team.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {workspaces.map((ws) => {
                  const invitePath = invitePaths[ws.slug];
                  return (
                    <div
                      key={ws.id}
                      className="p-5 rounded-container bg-surface border-2 border-border space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-base font-bold text-text">
                              {ws.name}
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-surface-2 border border-border text-text-muted">
                              {ws.maxParticipants} seats max •{" "}
                              {ws.allowScreenShare ? "Screen Share ON" : "Screen Share Pro"}
                            </span>
                          </div>
                          <p className="text-xs font-mono text-text-muted">/space/{ws.slug}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/space/${ws.slug}`}
                            className="px-3 py-1.5 text-xs font-display font-bold bg-accent text-bg rounded-control hover:brightness-110"
                          >
                            Enter Office
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleCopyInvite(ws.slug)}
                            className="px-3 py-1.5 text-xs font-display font-semibold bg-surface-2 border border-border rounded-control text-text hover:border-accent"
                          >
                            {copiedSlug === ws.slug
                              ? "Copied!"
                              : invitePath
                                ? "Copy Passworded Link"
                                : "Copy Space URL"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPasscodeSlug(
                                editingPasscodeSlug === ws.slug ? null : ws.slug
                              );
                              setRotatedPasscode("");
                            }}
                            className="px-2.5 py-1.5 text-xs bg-surface-2 border border-border rounded-control text-text-muted hover:text-text"
                          >
                            Reset Passcode
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteWorkspace(ws.slug)}
                            className="px-2.5 py-1.5 text-xs bg-red-500/15 border border-red-500/40 rounded-control text-red-300 hover:bg-red-500/25"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {invitePath && (
                        <div className="p-2.5 rounded-control bg-bg border border-emerald-500/40 text-[11px] font-mono text-emerald-300 break-all">
                          Share this passworded employee link:{" "}
                          {typeof window !== "undefined"
                            ? `${window.location.origin}${invitePath}`
                            : invitePath}
                        </div>
                      )}

                      {editingPasscodeSlug === ws.slug && (
                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                          <input
                            type="text"
                            value={rotatedPasscode}
                            onChange={(e) => setRotatedPasscode(e.target.value)}
                            placeholder="New passcode (min 4 chars)"
                            className="flex-1 px-3 py-1.5 text-xs bg-bg border border-border rounded-control text-text font-mono"
                          />
                          <button
                            type="button"
                            disabled={rotatedPasscode.trim().length < 4}
                            onClick={() => void handleRotatePasscode(ws.slug)}
                            className="px-3 py-1.5 text-xs font-display font-bold bg-accent text-bg rounded-control disabled:opacity-50"
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
      )}
    </div>
  );
}
