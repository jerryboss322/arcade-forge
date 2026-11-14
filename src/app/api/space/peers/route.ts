import { NextResponse } from "next/server";
import {
  getActivePeerCount,
  pollChannel,
  postChannel,
  SpaceStoreError,
} from "../../../../lib/space/spaceStore";
import {
  getBossSessionFromRequest,
  hasSpaceAccessInRequest,
} from "../../../../lib/requestAuth";
import { getSpacePolicy, SpacePolicy } from "../../../../lib/workspacePolicy";
import type { SignalMessage } from "../../../../lib/space/signaling";

export const dynamic = "force-dynamic";
export const preferredRegion = "iad1";

function isChannelAuthorized(request: Request, policy: SpacePolicy): boolean {
  if (!policy.isManaged || !policy.requiresPasscode) return true;
  if (hasSpaceAccessInRequest(request, policy.slug)) return true;
  const boss = getBossSessionFromRequest(request);
  return Boolean(boss && boss.userId === policy.ownerId);
}

/**
 * GET /api/space/peers?channel=...&senderId=...&since=0
 * Returns active peers + messages newer than `since`.
 * Returns HTTP 503 when the shared Redis store is unavailable.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel")?.trim();
  const senderId = searchParams.get("senderId")?.trim() || null;
  const sinceParam = searchParams.get("since");
  const since = sinceParam !== null ? Number(sinceParam) : 0;

  if (!channel) {
    return NextResponse.json({ error: "Missing channel" }, { status: 400 });
  }

  if (!Number.isFinite(since) || since < 0) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  try {
    const policy = await getSpacePolicy(channel);
    if (!isChannelAuthorized(request, policy)) {
      return NextResponse.json(
        { error: "Workspace passcode required", code: "passcode_required" },
        { status: 401 }
      );
    }

    const result = await pollChannel(channel, senderId, since);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SpaceStoreError) {
      return NextResponse.json(
        { error: "Shared signalling store unavailable" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to poll peers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/space/peers
 * Body: { channel: string, message: SignalMessage, senderId: string }
 * Appends message and/or registers peer heartbeat in the channel store.
 * Enforces workspace passcode gates (401) and Free/Pro seat caps (403) on join.
 * Returns HTTP 503 when the shared Redis store is unavailable.
 */
export async function POST(request: Request) {
  let body: {
    channel?: unknown;
    message?: unknown;
    senderId?: unknown;
  };

  try {
    body = (await request.json()) as {
      channel?: unknown;
      message?: unknown;
      senderId?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const channel = typeof body?.channel === "string" ? body.channel.trim() : "";
  const senderId = typeof body?.senderId === "string" ? body.senderId.trim() : "";
  const rawMessage = body?.message;
  const isValidMessage =
    Boolean(rawMessage) &&
    typeof rawMessage === "object" &&
    typeof (rawMessage as { type?: unknown }).type === "string";

  if (!channel || !senderId || !isValidMessage) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const msg = rawMessage as SignalMessage;

  try {
    const policy = await getSpacePolicy(channel);
    if (!isChannelAuthorized(request, policy)) {
      return NextResponse.json(
        { error: "Workspace passcode required", code: "passcode_required" },
        { status: 401 }
      );
    }

    if (msg.type === "peer_join") {
      const activeOtherPeers = await getActivePeerCount(channel, senderId);
      if (activeOtherPeers >= policy.maxParticipants) {
        return NextResponse.json(
          {
            error: `Workspace limit reached (${policy.maxParticipants} max on ${policy.planTier} plan). Ask your admin to upgrade to Boss Pro.`,
            code: "seat_limit_reached",
            maxParticipants: policy.maxParticipants,
          },
          { status: 403 }
        );
      }
    }

    const result = await postChannel(channel, senderId, msg);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SpaceStoreError) {
      return NextResponse.json(
        { error: "Shared signalling store unavailable" },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to post message" },
      { status: 500 }
    );
  }
}
