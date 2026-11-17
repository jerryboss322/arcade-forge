import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import {
  getBossSessionFromRequest,
  hasSpaceAccessInRequest,
} from "../../../../../lib/requestAuth";
import {
  extractSpaceSlug,
  getSpacePolicy,
  SpacePolicy,
} from "../../../../../lib/workspacePolicy";
import { getLiveKitConfig } from "../../../../../lib/space/livekitConfig";

export const dynamic = "force-dynamic";

function isChannelAuthorized(request: Request, policy: SpacePolicy): boolean {
  if (!policy.isManaged || !policy.requiresPasscode) return true;
  if (hasSpaceAccessInRequest(request, policy.slug)) return true;
  const boss = getBossSessionFromRequest(request);
  return Boolean(boss && boss.userId === policy.ownerId);
}

/**
 * POST /api/space/livekit/token
 * Issues a signed LiveKit SFU room token when LIVEKIT_URL + LIVEKIT_API_KEY + LIVEKIT_API_SECRET
 * are configured, or gracefully signals `{ mode: "p2p" }` to use the Redis + WebRTC mesh fallback.
 */
export async function POST(request: Request) {
  let body: {
    channel?: unknown;
    peerId?: unknown;
    name?: unknown;
    avatarColor?: unknown;
  };

  try {
    body = (await request.json()) as {
      channel?: unknown;
      peerId?: unknown;
      name?: unknown;
      avatarColor?: unknown;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const channel = typeof body?.channel === "string" ? body.channel.trim() : "";
  const peerId = typeof body?.peerId === "string" ? body.peerId.trim() : "";
  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim().slice(0, 32)
      : "Teammate";
  const avatarColor =
    typeof body?.avatarColor === "string" && body.avatarColor.trim()
      ? body.avatarColor.trim().slice(0, 16)
      : "#37E6C4";

  if (!channel || !peerId) {
    return NextResponse.json({ error: "Missing channel or peerId" }, { status: 400 });
  }

  try {
    const policy = await getSpacePolicy(channel);
    if (!isChannelAuthorized(request, policy)) {
      return NextResponse.json(
        { error: "Workspace passcode required", code: "passcode_required" },
        { status: 401 }
      );
    }

    const lk = getLiveKitConfig();
    if (!lk) {
      return NextResponse.json({
        mode: "p2p" as const,
        allowScreenShare: policy.allowScreenShare,
        maxParticipants: policy.maxParticipants,
        planTier: policy.planTier,
      });
    }

    const roomName = `forgespace_${extractSpaceSlug(channel)}`;
    const at = new AccessToken(lk.apiKey, lk.apiSecret, {
      identity: peerId,
      name,
      metadata: JSON.stringify({ name, avatarColor }),
      ttl: "2h",
    });
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({
      mode: "livekit" as const,
      url: lk.url,
      token,
      roomName,
      allowScreenShare: policy.allowScreenShare,
      maxParticipants: policy.maxParticipants,
      planTier: policy.planTier,
    });
  } catch (err) {
    console.error("[livekit/token] Failed to issue room token:", err);
    return NextResponse.json({ error: "Failed to initialize media room" }, { status: 500 });
  }
}
