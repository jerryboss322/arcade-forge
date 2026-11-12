import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createInitialGames } from "@/lib/store/arcade-store";

// Incremental Static Regeneration (ISR): Cache feed on Vercel's global CDN for 60s.
// When 1,000 visitors land on the homepage, Vercel edge serves cached JSON.
// Neon compute remains asleep (scale-to-zero), preserving 100% of free compute hours.
export const revalidate = 60;

export async function GET() {
  try {
    const dbGames = await db`
      SELECT 
        id, slug, title, description, type, status, revision,
        "unlistedToken", "authorId", tags, "lengthBucket",
        "controlsGuide", "playCount", "completionCount", "likeCount",
        "remixCount", "trendScore", featured, "remixAllowed",
        "remixedFromId", "remixedFromTitle", "remixedFromAuthor",
        "projectData", "bundleStoragePath", "createdAt", "updatedAt"
      FROM "Game"
      WHERE status = 'PUBLISHED'
      ORDER BY "trendScore" DESC
      LIMIT 50;
    `;

    return NextResponse.json(
      { games: dbGames, source: "neon" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    // Graceful fallback to seeded high-performance templates if Neon is scaling up
    const fallback = createInitialGames();
    return NextResponse.json(
      {
        games: fallback,
        source: "seed-fallback",
        notice: "Neon compute asleep or warming up; served seed catalog",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      slug,
      description,
      type,
      authorId,
      authorUsername,
      tags,
      lengthBucket,
      controlsGuide,
      projectData,
      bundleStoragePath,
      remixedFromId,
      remixedFromTitle,
      remixedFromAuthor,
    } = body;

    // First ensure the author User record exists in Neon to satisfy foreign key constraint
    const safeAuthorId = authorId || "u_nova";
    const safeAuthorName = authorUsername || "nova_pixel";

    await db`
      INSERT INTO "User" (id, email, username, "displayName", role, "updatedAt")
      VALUES (${safeAuthorId}, ${safeAuthorName + "@arcadeforge.local"}, ${safeAuthorName}, ${safeAuthorName}, 'USER', NOW())
      ON CONFLICT (id) DO UPDATE SET "updatedAt" = NOW();
    `;

    const newId = `g_${Date.now()}`;
    const safeSlug =
      slug ||
      `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.floor(Math.random() * 900 + 100)}`;

    const inserted = await db`
      INSERT INTO "Game" (
        id, title, slug, description, type, status,
        "authorId", tags, "lengthBucket", "controlsGuide",
        "projectData", "bundleStoragePath", "remixedFromId",
        "remixedFromTitle", "remixedFromAuthor", "updatedAt"
      ) VALUES (
        ${newId},
        ${title},
        ${safeSlug},
        ${description || ""},
        ${type || "FORGE_STUDIO"},
        'PUBLISHED',
        ${safeAuthorId},
        ${tags || []},
        ${lengthBucket || "<2m"},
        ${controlsGuide || ""},
        ${projectData ? JSON.stringify(projectData) : null},
        ${bundleStoragePath || null},
        ${remixedFromId || null},
        ${remixedFromTitle || null},
        ${remixedFromAuthor || null},
        NOW()
      )
      RETURNING *;
    `;

    return NextResponse.json({ success: true, game: inserted[0] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to persist game to Neon", details: String(error) },
      { status: 500 }
    );
  }
}
