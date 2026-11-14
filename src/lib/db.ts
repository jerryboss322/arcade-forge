import { neon } from "@neondatabase/serverless";

// Serverless Neon PostgreSQL client (HTTP-based, zero TCP connection pool issues on Vercel)
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_hXIcZ0kCn1ba@ep-damp-hill-bdsxnf8b.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require";

export const db = neon(connectionString);

const globalForSchema = globalThis as typeof globalThis & {
  __arcadeForgeSchemaPromise?: Promise<void>;
};

/**
 * Ensures lightweight Boss/Admin auth columns and Workspace table exist in Neon Postgres.
 * Cached per serverless instance so subsequent requests execute with zero DDL overhead.
 */
export async function ensureAuthSchema(): Promise<void> {
  if (globalForSchema.__arcadeForgeSchemaPromise) {
    return globalForSchema.__arcadeForgeSchemaPromise;
  }

  globalForSchema.__arcadeForgeSchemaPromise = (async () => {
    await db`
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
      ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'FREE',
      ADD COLUMN IF NOT EXISTS "planUpdatedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT,
      ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT
    `;

    await db`
      CREATE TABLE IF NOT EXISTS "Workspace" (
        "id" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "passcode" TEXT,
        "planTier" TEXT NOT NULL DEFAULT 'FREE',
        "maxParticipants" INTEGER NOT NULL DEFAULT 4,
        "allowScreenShare" BOOLEAN NOT NULL DEFAULT false,
        "officeMap" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "ownerId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `;

    await db`CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_slug_key" ON "Workspace"("slug")`;
    await db`CREATE INDEX IF NOT EXISTS "Workspace_ownerId_idx" ON "Workspace"("ownerId")`;
  })().catch((err) => {
    globalForSchema.__arcadeForgeSchemaPromise = undefined;
    throw err;
  });

  return globalForSchema.__arcadeForgeSchemaPromise;
}
