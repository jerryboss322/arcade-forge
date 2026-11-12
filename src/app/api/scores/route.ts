import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Rate-limited and validated endpoint for recording final game scores & sessions
// Called only when a game ends (1 write per 5-10 minute session), saving database writes.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, score, verified, userId, username, deathsByCell } = body;

    if (!gameId || typeof score !== "number") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const safeScore = Math.max(0, Math.min(999999, Math.round(score)));
    const safeUserId = userId || "u_guest";
    const safeUsername = username || "guest";

    // 1. Ensure user exists
    await db`
      INSERT INTO "User" (id, email, username, "displayName", role, "updatedAt")
      VALUES (${safeUserId}, ${safeUsername + "@arcadeforge.local"}, ${safeUsername}, ${safeUsername}, 'USER', NOW())
      ON CONFLICT (id) DO UPDATE SET "updatedAt" = NOW();
    `;

    // 2. Insert verified/unverified score entry
    const scoreId = `sc_${Date.now()}`;
    await db`
      INSERT INTO "Score" (id, score, verified, "userId", "gameId", "createdAt")
      VALUES (${scoreId}, ${safeScore}, ${Boolean(verified)}, ${safeUserId}, ${gameId}, NOW());
    `;

    // 3. Atomically increment playCount, and update deathsByCell if supplied
    await db`
      UPDATE "Game"
      SET 
        "playCount" = "playCount" + 1,
        "completionCount" = "completionCount" + 1,
        "updatedAt" = NOW()
      WHERE id = ${gameId};
    `;

    // 4. Record deathsByCell aggregations if provided (bounded per room coordinate)
    if (deathsByCell && typeof deathsByCell === "object") {
      for (const [cellKey, count] of Object.entries(deathsByCell)) {
        if (typeof count === "number" && count > 0) {
          const parts = cellKey.split(":");
          const room = parts[0] || "room_1";
          const coords = (parts[1] || "0,0").split(",");
          const cx = Math.max(0, Math.min(19, Number(coords[0]) || 0));
          const cy = Math.max(0, Math.min(14, Number(coords[1]) || 0));

          await db`
            INSERT INTO "GameCellStat" ("gameId", version, room, cx, cy, deaths)
            VALUES (${gameId}, 1, ${room}, ${cx}, ${cy}, ${count})
            ON CONFLICT ("gameId", version, room, cx, cy)
            DO UPDATE SET deaths = "GameCellStat".deaths + ${count};
          `;
        }
      }
    }

    return NextResponse.json({ success: true, recordedScore: safeScore });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to record score in database", details: String(error) },
      { status: 500 }
    );
  }
}
