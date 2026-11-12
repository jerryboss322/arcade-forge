import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const games = await db`
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
    return NextResponse.json({ games });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch games from database", details: String(error) },
      { status: 500 }
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
      tags,
      lengthBucket,
      controlsGuide,
      projectData,
      bundleStoragePath,
      remixedFromId,
      remixedFromTitle,
      remixedFromAuthor,
    } = body;

    const inserted = await db`
      INSERT INTO "Game" (
        id, title, slug, description, type, status,
        "authorId", tags, "lengthBucket", "controlsGuide",
        "projectData", "bundleStoragePath", "remixedFromId",
        "remixedFromTitle", "remixedFromAuthor", "updatedAt"
      ) VALUES (
        ${'g_' + Date.now()},
        ${title},
        ${slug},
        ${description || ''},
        ${type || 'FORGE_STUDIO'},
        'PUBLISHED',
        ${authorId},
        ${tags || []},
        ${lengthBucket || '<2m'},
        ${controlsGuide || ''},
        ${projectData ? JSON.stringify(projectData) : null},
        ${bundleStoragePath || null},
        ${remixedFromId || null},
        ${remixedFromTitle || null},
        ${remixedFromAuthor || null},
        NOW()
      )
      RETURNING *;
    `;

    return NextResponse.json({ game: inserted[0] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create game in database", details: String(error) },
      { status: 500 }
    );
  }
}
