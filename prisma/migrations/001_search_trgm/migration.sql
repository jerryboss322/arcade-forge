-- Enable pg_trgm for typo-tolerant search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tsvector column (updated via trigger because to_tsvector with default config is STABLE, not IMMUTABLE)
ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- Function to update searchVector
CREATE OR REPLACE FUNCTION update_game_search_vector() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW."tags", ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Trigger to keep searchVector fresh on insert or update
DROP TRIGGER IF EXISTS trg_game_search_vector ON "Game";
CREATE TRIGGER trg_game_search_vector
BEFORE INSERT OR UPDATE OF "title", "tags", "description" ON "Game"
FOR EACH ROW EXECUTE FUNCTION update_game_search_vector();

-- GIN index on full-text search vector
CREATE INDEX IF NOT EXISTS "Game_searchVector_idx" ON "Game" USING GIN ("searchVector");

-- GIN trigram index on title for similarity() fuzzy matching
CREATE INDEX IF NOT EXISTS "Game_title_trgm_idx" ON "Game" USING GIN ("title" gin_trgm_ops);
