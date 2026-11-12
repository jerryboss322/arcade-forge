import { neon } from "@neondatabase/serverless";

// Serverless Neon PostgreSQL client (HTTP-based, zero TCP connection pool issues on Vercel)
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_hXIcZ0kCn1ba@ep-damp-hill-bdsxnf8b.c-8.us-east-2.aws.neon.tech/neondb?sslmode=require";

export const db = neon(connectionString);
