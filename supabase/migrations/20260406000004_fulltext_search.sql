-- Migration: Full-text search for spots and profiles (trigger-based)

-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ========================
-- SPOTS FULL-TEXT SEARCH
-- ========================
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Trigger function to update spots search vector
CREATE OR REPLACE FUNCTION public.spots_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.category::text, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_spots_search_vector ON public.spots;
CREATE TRIGGER trg_spots_search_vector
  BEFORE INSERT OR UPDATE OF name, city, category, description, tags
  ON public.spots
  FOR EACH ROW EXECUTE FUNCTION public.spots_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_spots_search_vector ON public.spots USING GIN (search_vector);

-- Trigram index for ILIKE fuzzy search on spot names
CREATE INDEX IF NOT EXISTS idx_spots_name_trgm ON public.spots USING GIN (name gin_trgm_ops);

-- Backfill existing spots
UPDATE public.spots SET search_vector =
  setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(city, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(category::text, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'C');

-- ========================
-- PROFILES FULL-TEXT SEARCH
-- ========================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.profiles_search_vector_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.username, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.current_city, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.bio, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(NEW.nationality, '')), 'C');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_search_vector ON public.profiles;
CREATE TRIGGER trg_profiles_search_vector
  BEFORE INSERT OR UPDATE OF display_name, username, current_city, bio, nationality
  ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON public.profiles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING GIN (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_displayname_trgm ON public.profiles USING GIN (display_name gin_trgm_ops);

-- Backfill existing profiles
UPDATE public.profiles SET search_vector =
  setweight(to_tsvector('simple', coalesce(display_name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(username, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(current_city, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(bio, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(nationality, '')), 'C');
