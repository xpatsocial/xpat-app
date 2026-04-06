-- Migration: pgvector for AI-powered semantic search
-- Enables finding "quiet cafes with fast wifi" even without exact keyword match
-- Cost: ~$0.003 to embed all 431 spots (one-time), ~$0.000002/search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to spots (1536 dims = text-embedding-3-small)
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW index: approximate nearest neighbor search (sub-10ms at scale)
-- m=16, ef_construction=64 are optimal defaults for this use case
CREATE INDEX IF NOT EXISTS idx_spots_embedding_hnsw
  ON public.spots
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Hybrid search function: combines vector similarity + full-text search
-- weight_vec: 0.0-1.0, weight for semantic similarity (1 - weight_vec goes to FTS)
CREATE OR REPLACE FUNCTION public.hybrid_spot_search(
  query_text text,
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  city_filter text DEFAULT NULL,
  category_filter text DEFAULT NULL,
  weight_vec float DEFAULT 0.7
)
RETURNS TABLE (
  id bigint,
  name text,
  city text,
  country text,
  category text,
  note text,
  tags text[],
  lat float8,
  lng float8,
  votes int,
  photo_url text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  WITH
  -- Full-text search results
  fts AS (
    SELECT
      s.id,
      ts_rank(s.search_vector, plainto_tsquery('simple', query_text)) AS fts_rank
    FROM public.spots s
    WHERE s.search_vector @@ plainto_tsquery('simple', query_text)
      AND (city_filter IS NULL OR lower(s.city) = lower(city_filter))
      AND (category_filter IS NULL OR s.category::text = category_filter)
      AND s.is_flagged = false
  ),
  -- Vector similarity results
  vec AS (
    SELECT
      s.id,
      1 - (s.embedding <=> query_embedding) AS vec_sim
    FROM public.spots s
    WHERE s.embedding IS NOT NULL
      AND (city_filter IS NULL OR lower(s.city) = lower(city_filter))
      AND (category_filter IS NULL OR s.category::text = category_filter)
      AND s.is_flagged = false
    ORDER BY s.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  -- Combine with RRF (Reciprocal Rank Fusion)
  combined AS (
    SELECT
      COALESCE(fts.id, vec.id) AS spot_id,
      (weight_vec * COALESCE(vec.vec_sim, 0)) +
      ((1 - weight_vec) * COALESCE(fts.fts_rank, 0)) AS combined_score
    FROM fts
    FULL OUTER JOIN vec ON fts.id = vec.id
  )
  SELECT
    s.id,
    s.name,
    s.city,
    s.country,
    s.category::text,
    s.note,
    s.tags,
    s.lat,
    s.lng,
    s.votes,
    s.photo_url,
    c.combined_score AS similarity
  FROM combined c
  JOIN public.spots s ON s.id = c.spot_id
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.hybrid_spot_search TO anon, authenticated;
