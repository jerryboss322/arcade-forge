import { NextResponse } from "next/server";
import { getIceServers, hasTurnConfiguration } from "../../../../lib/space/webrtcMesh";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfTokenId = process.env.CLOUDFLARE_TURN_TOKEN_ID?.trim();
  const cfApiToken = process.env.CLOUDFLARE_TURN_API_TOKEN?.trim();

  if (cfTokenId && cfApiToken) {
    try {
      const cfRes = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(cfTokenId)}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: 86400 }),
        }
      );
      if (cfRes.ok) {
        const data = (await cfRes.json()) as { iceServers?: RTCIceServer[] };
        if (Array.isArray(data.iceServers) && data.iceServers.length > 0) {
          const baseStun = getIceServers().filter(
            (s) => typeof s.urls === "string" && s.urls.startsWith("stun:")
          );
          return NextResponse.json({
            iceServers: [...data.iceServers, ...baseStun],
            hasTurn: true,
            provider: "cloudflare",
          });
        }
      } else {
        console.warn("[space/turn] Cloudflare TURN returned", cfRes.status);
      }
    } catch (err) {
      console.warn("[space/turn] Cloudflare TURN request failed:", err);
    }
  }

  const meteredDomain = process.env.METERED_TURN_DOMAIN?.trim();
  const meteredSecret = process.env.METERED_TURN_SECRET_KEY?.trim();
  if (meteredDomain && meteredSecret) {
    try {
      const res = await fetch(
        `https://${encodeURIComponent(meteredDomain)}/api/v1/turn/credentials?apiKey=${encodeURIComponent(meteredSecret)}`
      );
      if (res.ok) {
        const servers = (await res.json()) as RTCIceServer[];
        if (Array.isArray(servers) && servers.length > 0) {
          const baseStun = getIceServers().filter(
            (s) => typeof s.urls === "string" && s.urls.startsWith("stun:")
          );
          return NextResponse.json({
            iceServers: [...servers, ...baseStun],
            hasTurn: true,
            provider: "metered",
          });
        }
      }
    } catch (err) {
      console.warn("[space/turn] Metered TURN request failed:", err);
    }
  }

  return NextResponse.json({
    iceServers: getIceServers(),
    hasTurn: hasTurnConfiguration(),
    provider: hasTurnConfiguration() ? "env" : "stun-only",
  });
}
