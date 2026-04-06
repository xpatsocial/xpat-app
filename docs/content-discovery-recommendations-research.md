# Content Discovery, Personalization & Recommendation Systems
## Research Report — x/pat App
**Date:** April 2026
**Scope:** 30 research topics covering collaborative filtering, content-based filtering, pgvector/embeddings, feed ranking, algorithm-free discovery, and personalization UX
**Lens:** Every topic evaluated for Supabase/pgvector implementation, dataset size requirements, and pre-launch vs. post-launch viability

---

## Section 1: Collaborative Filtering with Small Datasets (Cold Start Solutions)

### Topic 1: The Cold Start Problem — What It Is and Why It Matters for x/pat

**What it is:** Collaborative filtering (CF) recommends content by finding users with similar behavior patterns and surfacing what they engaged with. The cold start problem occurs when there is insufficient data about a new user or a new item to make meaningful recommendations. There are three variants: new user cold start (no interaction history), new item cold start (no engagement data for a piece of content), and system cold start (a brand-new platform with no users or interactions at all).

**Why it matters for x/pat:** x/pat will launch with seeded spot data (431 spots across Bangkok, Lisbon, CDMX) but zero real user interaction history. Every user who signs up is a cold-start user. Every new spot submitted by a user starts as a cold-start item. This is the platform's primary recommendation challenge for at least the first 6–12 months.

**Supabase implementation approach:**
- Store all user-item interactions in a `user_interactions` table (spot_id, user_id, action_type, weight, created_at)
- Assign action weights: view=1, save=3, share=5, comment=4, check-in=6
- During cold start, fall back to popularity scores: `SELECT spot_id, SUM(weight) as score FROM user_interactions GROUP BY spot_id ORDER BY score DESC`
- Once a user has 5+ interactions, switch to similarity-based recommendations

**Dataset size requirements:** CF becomes statistically meaningful at 50+ users with 5+ interactions each. Trustworthy CF requires 500+ active users. Below that, use content-based filtering or popularity rankings as the primary signal.

**Pre-launch viability:** Not viable as a primary system. Use as a secondary fallback. Build the interaction-logging infrastructure at launch so data accumulates immediately.

---

### Topic 2: Onboarding Interest Selection to Bootstrap User Profiles

**What it is:** Rather than waiting for users to accumulate behavioral history, prompt them during signup to select interests explicitly. This creates an immediate preference signal that can drive initial recommendations before any implicit behavior is recorded. Pinterest requires users to select 5+ interest categories before entering the app. Flipboard presents a carousel of topics at first launch. Threads prompts users to add interest topics to their profile.

**Implementation approach for x/pat:**
- During onboarding, show a grid of categories: Coworking, Cafes, Nightlife, Food, Fitness, Nature, Culture, Accommodation
- Also offer city/region interests: Southeast Asia, Europe, Latin America, etc.
- Require selection of at least 3 categories to proceed
- Store selections in a `user_interests` table: (user_id, tag, source='onboarding', weight=1.0)
- Use these tags immediately to filter and rank spots: `SELECT s.* FROM spots s JOIN spot_tags st ON s.id = st.spot_id WHERE st.tag = ANY(user_interest_tags) ORDER BY match_count DESC`

**Supabase implementation:**
```sql
-- user_interests table
CREATE TABLE user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tag TEXT NOT NULL,
  source TEXT DEFAULT 'onboarding', -- 'onboarding', 'implicit', 'explicit'
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Query: spots matching user interests
SELECT s.*, COUNT(ui.tag) as interest_matches
FROM spots s
JOIN spot_tags st ON s.id = st.spot_id
JOIN user_interests ui ON ui.tag = st.tag AND ui.user_id = $1
GROUP BY s.id
ORDER BY interest_matches DESC, s.avg_rating DESC
LIMIT 20;
```

**Dataset size requirements:** Works with a single user — no minimum dataset required. This is the only recommendation approach that is fully viable from user #1.

**Pre-launch viability:** Fully viable pre-launch. Implement in the onboarding flow before launch. This is the highest-ROI recommendation investment for the first 90 days.

---

### Topic 3: Implicit Feedback Collection — Building Interaction Data Without Explicit Ratings

**What it is:** Implicit feedback infers user preferences from behavior rather than asking users to rate items. Likes, saves, shares, views (with dwell time), comments, and check-ins all signal preference strength without requiring explicit action. The seminal 2008 paper by Hu, Koren & Volinsky established that implicit feedback (purchases, plays, clicks) is more abundant and more honest than explicit ratings.

**Signal hierarchy for x/pat (strongest to weakest):**
- Check-in at a spot: weight 6 (strongest behavioral commitment)
- Save / bookmark: weight 4 (clear intent to return)
- Comment: weight 4 (engagement beyond passive viewing)
- Share: weight 5 (social endorsement)
- Photo upload at spot: weight 5 (physical presence confirmed)
- Long view (>10 seconds on spot card): weight 2
- Map tap / open detail: weight 1.5
- Short view / scroll past: weight 0.5 (mild interest signal)

**Supabase implementation:**
```sql
CREATE TABLE user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  spot_id UUID REFERENCES spots(id),
  action TEXT NOT NULL, -- 'view', 'save', 'share', 'comment', 'checkin', 'photo'
  weight FLOAT NOT NULL,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user-based lookups
CREATE INDEX idx_user_interactions_user ON user_interactions(user_id, created_at DESC);
CREATE INDEX idx_user_interactions_spot ON user_interactions(spot_id, created_at DESC);
```

**Dataset size requirements:** Every interaction logged matters. Even 10 interactions per user is enough to start content-based similarity matching. The data collection infrastructure is the asset — build it before anything else.

**Pre-launch viability:** Fully viable to implement at launch. The schema is straightforward. The key is logging every interaction from day one so the dataset grows organically.

---

### Topic 4: User-User Collaborative Filtering with k-Nearest Neighbors

**What it is:** User-based CF finds users with similar interaction histories (the "k nearest neighbors") and recommends items those similar users engaged with. Similarity is computed using cosine similarity or Pearson correlation over the user-item interaction matrix. The approach is intuitive — "users like you also saved these spots" — and produces explainable results.

**Challenge at small scale:** With fewer than 200 active users, the neighborhood is too small for reliable recommendations. Similarity scores become noisy. A user who saved 3 spots shares 1 spot with another user who saved 4 spots — is that meaningful signal or coincidence? Not until ~500 users with 10+ interactions each does the signal become reliable.

**Supabase/SQL implementation (viable at 200+ users):**
```sql
-- Compute cosine similarity between two users based on spot interactions
-- Precompute and cache in user_similarity table nightly
CREATE TABLE user_similarity (
  user_a UUID REFERENCES auth.users(id),
  user_b UUID REFERENCES auth.users(id),
  similarity FLOAT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_a, user_b)
);

-- Run nightly via pg_cron to recompute top-K neighbors per user
-- Full matrix computation moves to a Python Edge Function once users > 5k
```

**Practical threshold:** Do not surface user-based CF recommendations until the platform has 500+ users with 5+ interactions each. Before that, the recommendations will be worse than simple popularity sorting and will erode trust.

**Pre-launch viability:** Infrastructure only — log interactions, do not surface CF recommendations yet. Switch on CF at the 500-user milestone.

---

### Topic 5: Item-Item Collaborative Filtering — More Stable at Small Scale

**What it is:** Item-based CF computes similarity between items (spots) based on which users interacted with both. If users who saved Spot A also tend to save Spot B, then Spot A and Spot B are similar. Item-based CF is more stable than user-based CF at small scale because item similarity changes slowly (spots don't move or change their nature), while user behavior can be volatile.

**Why item-item is better for x/pat's early stage:** With 431 seeded spots and a small user base, you can pre-compute item-item similarities from the seeded data (common tags, same city, same category) as a proxy for behavioral similarity. As real users interact, behavioral item similarity supplements tag-based similarity.

**Supabase implementation:**
```sql
CREATE TABLE spot_similarity (
  spot_a UUID REFERENCES spots(id),
  spot_b UUID REFERENCES spots(id),
  similarity FLOAT,
  method TEXT DEFAULT 'tag_jaccard', -- evolves to 'behavioral' at scale
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (spot_a, spot_b)
);

-- Tag-based Jaccard similarity (viable from day 1):
-- similarity = |tags_A ∩ tags_B| / |tags_A ∪ tags_B|
-- Precompute for all spot pairs in the same city/category
-- "More like this" widget on spot detail page uses this immediately
```

**"More like this" — the immediate win:** Item-item similarity drives the "More spots like this" section on every spot detail page. This is the single most impactful recommendation surface and it works from launch with zero user interaction data, using tag-based Jaccard similarity.

**Dataset size requirements:** Works from day 1 with tag data. Behavioral refinement starts at 200+ interactions across the spot catalog.

**Pre-launch viability:** Fully viable pre-launch using tag-based similarity. One of the first features to build.

---

## Section 2: Content-Based Filtering Using Tags and Interests

### Topic 6: Tag Architecture — The Foundation of Content-Based Filtering

**What it is:** Content-based filtering (CBF) recommends items similar in attributes to items a user has previously engaged with. For x/pat, the primary attribute structure is tags. Tags must be carefully designed — too few and recommendations are broad and obvious; too many and the similarity signal fragments.

**Recommended tag taxonomy for x/pat:**
```
Category tags (primary): cafe, coworking, restaurant, bar, beach, gym, accommodation, park, market
Vibe tags: quiet, social, lively, artsy, hipster, local, touristy, rooftop, outdoor
Amenity tags: fast-wifi, power-outlets, coffee, alcohol, food, air-conditioning, standing-desks
City/district tags: bangkok-silom, lisbon-bairro-alto, cdmx-roma-norte (auto-applied)
Nomad-specific: 24h, day-pass, monthly-membership, visa-friendly, community
```

**Supabase schema:**
```sql
CREATE TABLE spot_tags (
  spot_id UUID REFERENCES spots(id),
  tag TEXT NOT NULL,
  source TEXT DEFAULT 'editor', -- 'editor', 'user', 'ai_generated'
  confidence FLOAT DEFAULT 1.0,
  PRIMARY KEY (spot_id, tag)
);

CREATE INDEX idx_spot_tags_tag ON spot_tags(tag);
```

**Filtering query:**
```sql
-- Find spots matching a user's interest tags, ranked by match count
SELECT s.*, COUNT(DISTINCT st.tag) as tag_matches, s.avg_rating
FROM spots s
JOIN spot_tags st ON s.id = st.spot_id
WHERE st.tag = ANY($1::text[]) -- user's interest tags array
  AND s.city = $2              -- user's current city
  AND s.id != ALL($3::uuid[])  -- exclude already seen spots
GROUP BY s.id
ORDER BY tag_matches DESC, avg_rating DESC
LIMIT 20;
```

**Dataset size requirements:** Works from spot #1 with manually applied tags. Quality of recommendations is limited by quality of tagging. Invest in thorough tag application during data seeding.

**Pre-launch viability:** Fully viable. Tag all 431 seeded spots thoroughly before launch. This is the primary recommendation mechanism for the first 90 days.

---

### Topic 7: TF-IDF Weighted Tag Scoring for Better CBF Relevance

**What it is:** Not all tags are equally informative. If 90% of spots are tagged "wifi", that tag carries almost no discriminating power. TF-IDF (Term Frequency–Inverse Document Frequency) weights tags by their discriminating power across the corpus — rare tags that uniquely describe a spot are weighted higher than common tags shared by everything.

**Applied to x/pat:** A spot tagged "tatami-seating, matcha, no-music, zen" has more specific signal than one tagged "cafe, wifi, seating". A user who saves spots with the rare tag "tatami-seating" should receive a strong recommendation for other tatami-seated spots, even if that tag only appears on 3 spots in the system.

**Implementation:**
```sql
-- Precompute IDF for all tags (run nightly via pg_cron)
CREATE TABLE tag_idf AS
SELECT
  tag,
  LN(total_spots::float / COUNT(DISTINCT spot_id)) as idf_score
FROM spot_tags
CROSS JOIN (SELECT COUNT(*) as total_spots FROM spots) t
GROUP BY tag, total_spots;

-- User interest profile with TF-IDF weighted scores
-- When user engages with spots, accumulate weighted tag scores
CREATE TABLE user_tag_scores (
  user_id UUID REFERENCES auth.users(id),
  tag TEXT NOT NULL,
  raw_score FLOAT DEFAULT 0,     -- sum of interaction weights
  tfidf_score FLOAT DEFAULT 0,   -- raw_score * idf_score
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, tag)
);
```

**Benefit:** A user who repeatedly engages with niche spots gets recommendations reflecting their specific taste, not just the most popular generic spots. This prevents the recommendation homogenization problem where everyone gets the same "popular" spots.

**Dataset size requirements:** IDF calculations require at least 50 spots for meaningful differentiation. Works well with the 431 seeded spots at launch.

**Pre-launch viability:** Implement IDF computation as part of data seeding pipeline. High ROI improvement over flat tag matching.

---

### Topic 8: User Interest Profile Evolution — Moving from Static Onboarding to Dynamic Preferences

**What it is:** Onboarding preferences are a starting point, not a permanent record. A user who selects "coworking" during onboarding might, through behavior, reveal they actually prefer third-wave cafes over formal coworking spaces. The interest profile must decay old signals and amplify recent behavior — a dynamic user taste model.

**Implementation — exponential decay of interest weights:**
```sql
-- Update user_tag_scores after each interaction
-- New score = old_score * decay_factor + new_interaction_weight
-- decay_factor = 0.95 (5% decay per interaction event)
-- This means onboarding selections fade over ~20 interactions

UPDATE user_tag_scores
SET
  raw_score = raw_score * 0.95 + $interaction_weight,
  tfidf_score = (raw_score * 0.95 + $interaction_weight) * idf.idf_score,
  updated_at = now()
FROM tag_idf idf
WHERE user_id = $user_id AND tag = $tag;
```

**Decay timeline:**
- After 10 interactions: onboarding weight is ~60% of original influence
- After 20 interactions: onboarding weight is ~36%
- After 40 interactions: onboarding weight is ~13%
- After 60 interactions: behavior fully dominates

**"Forgetting" mechanism:** Add an explicit "not interested" action that sets a tag's weight to a negative value, blocking recommendations featuring that tag for 30 days.

**Pre-launch viability:** Implement the decay logic from launch. The profile evolution system needs to run from user #1.

---

### Topic 9: Category and Geo-Context in Content-Based Filtering

**What it is:** User preferences are highly context-dependent. A nomad in Bangkok may want quiet coworking spots during the day and lively rooftop bars at night. A user exploring Lisbon for the first time may want "local favorites" over "nomad hubs". Context variables — time of day, day of week, city, length of stay, group composition — should modulate content-based recommendations.

**Contextual signals to capture:**
- Current city (from app location or profile)
- Time of day: morning (cafes, coworking), afternoon (coworking, cafes), evening (restaurants, bars), night (bars, clubs)
- Day of week: weekday vs. weekend preference shifts
- Weather (future): sunny → outdoors; rainy → indoor coworking
- Trip stage: first week (tourist-adjacent), 1+ month (local-leaning)

**Supabase implementation:**
```sql
-- Context-aware recommendation function
CREATE OR REPLACE FUNCTION get_contextual_recommendations(
  p_user_id UUID,
  p_city TEXT,
  p_hour INT,  -- 0-23
  p_limit INT DEFAULT 20
)
RETURNS TABLE (spot_id UUID, score FLOAT) AS $$
  WITH time_tags AS (
    SELECT CASE
      WHEN p_hour BETWEEN 7 AND 11 THEN 'morning'
      WHEN p_hour BETWEEN 12 AND 17 THEN 'afternoon'
      WHEN p_hour BETWEEN 18 AND 21 THEN 'evening'
      ELSE 'night'
    END as time_context
  )
  SELECT s.id, (uts.tfidf_score * 1.0) as score
  FROM spots s
  JOIN spot_tags st ON s.id = st.spot_id
  JOIN user_tag_scores uts ON uts.tag = st.tag AND uts.user_id = p_user_id
  WHERE s.city = p_city
  GROUP BY s.id, uts.tfidf_score
  ORDER BY score DESC
  LIMIT p_limit;
$$ LANGUAGE sql;
```

**Pre-launch viability:** Ship basic city-filtered CBF at launch. Add time-of-day modulation in v1.1. Weather integration is a post-launch enhancement.

---

### Topic 10: Filter Bubbles and Serendipity Injection in CBF

**What it is:** Pure content-based filtering converges on a narrow profile — a user who saves 5 coffee shops gets recommended 10 more coffee shops indefinitely. This is the "filter bubble" problem. Serendipity injection deliberately surfaces items slightly outside a user's established preference pattern to enable discovery and profile expansion.

**Serendipity strategies:**
1. **Exploration budget:** Reserve 20% of recommendation slots for items with 1-2 tag matches (adjacent interests) vs. the usual 3+ tag matches (core interests)
2. **Category rotation:** If the last 5 recommendations were all cafes, the next 2 slots show non-cafe spots matching other user interests
3. **Editorial surprise:** One "staff pick" slot per session that is not personalized — a high-quality spot the editorial team wants everyone to discover
4. **Social signal override:** If 3+ friends saved a spot the user has never seen, surface it regardless of tag match

**SQL implementation:**
```sql
-- Main recommendations: high tag match (80% of feed)
-- Serendipity recommendations: 1-2 tag matches in adjacent categories (20%)
WITH core_recs AS (
  SELECT spot_id, score, 'core' as rec_type
  FROM get_contextual_recommendations($user_id, $city, $hour, 16)
),
serendipity_recs AS (
  SELECT s.id as spot_id, 0.3 as score, 'serendipity' as rec_type
  FROM spots s
  JOIN spot_tags st ON s.id = st.spot_id
  JOIN user_tag_scores uts ON uts.tag = st.tag AND uts.user_id = $user_id
  WHERE s.city = $city
    AND s.id NOT IN (SELECT spot_id FROM core_recs)
  GROUP BY s.id
  HAVING COUNT(DISTINCT st.tag) = 1
  ORDER BY s.avg_rating DESC
  LIMIT 4
)
SELECT * FROM core_recs
UNION ALL
SELECT * FROM serendipity_recs
ORDER BY rec_type, score DESC;
```

**Pre-launch viability:** Implement the 80/20 split at launch. Staff picks slot is manually curated — editorial overhead is minimal but trust-building impact is high.

---

## Section 3: pgvector and Embeddings for Semantic Similarity

### Topic 11: pgvector Fundamentals — How Embeddings Work in Supabase

**What it is:** pgvector is a PostgreSQL extension (now included by default in Supabase) that enables storage and similarity search over high-dimensional vectors. An embedding is a numerical representation of text, generated by a language model, where semantically similar texts produce vectors that are geometrically close. This enables "find spots described similarly to this user query" — semantic search that understands meaning, not just keyword matching.

**Why it matters for x/pat:** User reviews and spot descriptions contain rich signal. "Fantastic place to grind through a deadline" and "perfect for deep work" mean the same thing but share no keywords. Embeddings capture this semantic equivalence. A user whose profile says "I love quiet spots where I can focus" can be matched to spots whose descriptions emphasize focus, silence, and productivity — even with zero tag overlap.

**pgvector setup in Supabase:**
```sql
-- Enable extension (already available in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to spots table
ALTER TABLE spots ADD COLUMN description_embedding vector(1536);
-- 1536 dimensions = OpenAI text-embedding-3-small output size

-- Create HNSW index for fast approximate nearest-neighbor search
CREATE INDEX spots_embedding_hnsw ON spots
USING hnsw (description_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Distance operators in pgvector:**
- `<=>` cosine distance (most common for text embeddings)
- `<->` L2/Euclidean distance
- `<#>` negative inner product (fastest if vectors are normalized)

**Pre-launch viability:** Infrastructure is viable pre-launch. Embedding generation for 431 spots costs approximately $0.02 using text-embedding-3-small. Run once during data seeding.

---

### Topic 12: Generating and Storing Spot Embeddings

**What it is:** Each spot needs a vector embedding generated from its textual content — name, description, category, tags, and reviews concatenated into a single document. This document is passed to an embedding model (OpenAI text-embedding-3-small, Hugging Face, or Google Gemini embeddings) which returns a 1536-dimensional vector. The vector is stored in the spots table and used for similarity search.

**Embedding document construction for x/pat spots:**
```
{spot_name}. {category}. Located in {district}, {city}.
{description}
Tags: {tags_comma_separated}
Vibe: {vibe_tags}
Recent reviews: {top_3_reviews_concatenated}
```

**Automatic embedding pipeline using Supabase (as of April 2025):**
Supabase published an official automatic embeddings system using:
- PostgreSQL triggers to detect INSERT/UPDATE on the spots table
- `pgmq` to queue embedding generation jobs
- `pg_net` to make async HTTP calls to an Edge Function
- `pg_cron` to process the queue every 5 minutes
- Edge Function calls OpenAI API, stores result back to `spots.description_embedding`

**Edge Function pseudocode:**
```typescript
// supabase/functions/generate-embedding/index.ts
const { spot_id, text } = await req.json();
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text
});
await supabase
  .from('spots')
  .update({ description_embedding: embedding.data[0].embedding })
  .eq('id', spot_id);
```

**Cost estimate:** text-embedding-3-small = $0.02 per million tokens. A 500-word spot document ≈ 375 tokens. 431 spots = ~162K tokens = $0.003 total for initial seeding. Ongoing cost is negligible.

**Pre-launch viability:** Fully viable. Implement the automatic embedding pipeline before launch so all new spots get embeddings immediately on creation.

---

### Topic 13: Semantic Spot Search Using pgvector

**What it is:** Once spots have embeddings, users can search with natural language queries and receive semantically relevant results. "Quiet place to work with good coffee" returns cafes and coworking spaces with those qualities even if those exact words don't appear in the spot description. This is a transformative improvement over keyword search for discovery.

**Implementation:**
```sql
-- Semantic search function
CREATE OR REPLACE FUNCTION semantic_spot_search(
  query_embedding vector(1536),
  p_city TEXT,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (id UUID, name TEXT, similarity FLOAT) AS $$
  SELECT
    s.id,
    s.name,
    1 - (s.description_embedding <=> query_embedding) as similarity
  FROM spots s
  WHERE s.city = p_city
    AND s.description_embedding IS NOT NULL
  ORDER BY s.description_embedding <=> query_embedding
  LIMIT p_limit;
$$ LANGUAGE sql;
```

**Client-side flow:**
1. User types search query
2. App calls Edge Function: `generate-query-embedding(query_text)`
3. Edge Function calls OpenAI, gets 1536-dim vector
4. Edge Function calls `semantic_spot_search(vector, city)` via RPC
5. Results returned sorted by semantic similarity

**Hybrid search (semantic + keyword):** Combine pgvector semantic search with PostgreSQL full-text search using Reciprocal Rank Fusion (RRF) to get the best of both approaches. Supabase docs recommend this as the production pattern.

**Pre-launch viability:** Semantic search is a launch feature — implement it. The latency (150–300ms including OpenAI API call for query embedding) is acceptable for a search interaction. Consider caching embeddings for common search terms.

---

### Topic 14: HNSW vs IVFFlat Index — Choosing the Right pgvector Index

**What it is:** pgvector offers two approximate nearest-neighbor index types. The choice matters for search performance, memory usage, and update behavior.

**Comparison:**

| Metric | HNSW | IVFFlat |
|--------|------|---------|
| Query speed (at 0.998 recall) | 40.5 QPS | 2.6 QPS |
| Build time | ~32x slower | Fast |
| Index size | ~729 MB | ~257 MB |
| Handles data updates | Excellent (graph-based) | Poor (centroids stale) |
| Minimum rows before indexing | Any (safe immediately) | ~1000 rows recommended |

**Recommendation for x/pat:** Use HNSW. The platform has fewer than 10,000 spots for the foreseeable future, so build time is irrelevant (seconds, not hours). HNSW's superiority in update handling is critical because new spots are added continuously and embedding updates from new reviews happen frequently. Supabase explicitly recommends HNSW as the default.

**HNSW parameters for x/pat's scale:**
```sql
CREATE INDEX spots_embedding_hnsw ON spots
USING hnsw (description_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
-- m=16 is the default connection count per layer
-- ef_construction=64 balances build time vs. recall quality
-- For recall > 0.99, increase ef_construction to 128
```

**Pre-launch viability:** Create the HNSW index during database setup. No minimum dataset size required — safe to create immediately.

---

### Topic 15: User Embedding Profiles for Personalized Semantic Recommendations

**What it is:** Just as spots have embeddings, users can have embedding-based preference profiles. A user's preference embedding is computed as the weighted average of the embeddings of spots they've engaged with. This creates a single vector representing "what this user is drawn to" in semantic space, enabling semantic similarity matching: find spots whose embeddings are closest to the user's preference embedding.

**How to compute a user preference embedding:**
```sql
-- User preference embedding = weighted average of engaged spot embeddings
CREATE OR REPLACE FUNCTION compute_user_preference_embedding(p_user_id UUID)
RETURNS vector(1536) AS $$
  SELECT
    -- Weighted average: higher-weight interactions contribute more to the profile vector
    (SUM(ui.weight * s.description_embedding::float[]) / SUM(ui.weight))::vector
  FROM user_interactions ui
  JOIN spots s ON ui.spot_id = s.id
  WHERE ui.user_id = p_user_id
    AND s.description_embedding IS NOT NULL
    AND ui.created_at > now() - interval '90 days'  -- recency window
$$ LANGUAGE sql;

-- Store computed embedding
ALTER TABLE user_profiles ADD COLUMN preference_embedding vector(1536);

-- Nightly recompute via pg_cron
UPDATE user_profiles
SET preference_embedding = compute_user_preference_embedding(id)
WHERE id = ANY($recently_active_users);
```

**Semantic recommendation query:**
```sql
SELECT s.id, s.name,
  1 - (s.description_embedding <=> up.preference_embedding) as semantic_score
FROM spots s, user_profiles up
WHERE up.user_id = $user_id
  AND s.city = $city
ORDER BY s.description_embedding <=> up.preference_embedding
LIMIT 20;
```

**Dataset size requirements:** Meaningful user preference embeddings require at least 5 spot interactions. Below that, fall back to tag-based CBF. Above 20 interactions, the embedding profile is stable and reliable.

**Pre-launch viability:** Build the infrastructure at launch. Preference embeddings start producing useful results once users have 5+ interactions — realistically 2–4 weeks after launch for active users.

---

## Section 4: Feed Ranking Algorithms

### Topic 16: Chronological Feed — When Pure Recency Is the Right Choice

**What it is:** A chronological feed shows content in reverse-chronological order of creation — newest first, no ranking. Twitter's original feed, early Instagram, and Bluesky's default are all chronological. The algorithm is transparent, predictable, and gives users full control over what they see.

**When chronological is optimal for x/pat:**
- Following feed (spots and posts from followed users): chronological preserves the social contract — "I follow you, I see your posts"
- Activity feed (comments, check-ins, follows): strictly chronological makes sense as an event log
- New spots in a city: chronological plus recency filter ("spots added this week")

**SQL implementation:**
```sql
-- Following feed: recent activity from followed users
SELECT si.*, u.username, u.avatar_url
FROM social_interactions si
JOIN follows f ON f.following_id = si.user_id
WHERE f.follower_id = $current_user
  AND si.created_at > now() - interval '7 days'
ORDER BY si.created_at DESC
LIMIT 50;
```

**Advantages of chronological for early-stage apps:**
- No algorithm bias to explain or defend
- New content gets visibility immediately (no engagement bootstrapping needed)
- Users trust it — they feel in control
- Zero infrastructure overhead — a simple ORDER BY created_at

**Limitation:** As volume grows (>100 posts/day in a city), chronological becomes overwhelming. The user misses quality content buried by volume. This is the trigger to introduce ranking.

**Pre-launch viability:** Ship chronological feeds for following and activity at launch. No infrastructure required beyond proper timestamp indexing.

---

### Topic 17: Engagement-Based Ranking — Scoring Content by Quality Signals

**What it is:** Engagement-based ranking scores content by signals of quality — saves, comments, shares, upvotes — and surfaces the highest-scoring content regardless of age. This is how Reddit's "hot" and "top" feeds work. The advantage is that great content stays visible even if posted at low-traffic times.

**Spot quality score formula for x/pat:**
```sql
-- Spot quality score: composite engagement metric
ALTER TABLE spots ADD COLUMN quality_score FLOAT DEFAULT 0;

-- Recompute nightly via pg_cron
UPDATE spots SET quality_score = (
  (COALESCE(save_count, 0) * 3.0) +       -- saves: strong intent signal
  (COALESCE(check_in_count, 0) * 5.0) +   -- check-ins: physical validation
  (COALESCE(comment_count, 0) * 2.0) +    -- comments: engagement
  (COALESCE(share_count, 0) * 4.0) +      -- shares: advocacy
  (COALESCE(photo_count, 0) * 2.5) +      -- photos: content richness
  (avg_rating * 10.0)                      -- verified review quality
);
```

**Explore feed using quality score:**
```sql
SELECT s.*, s.quality_score
FROM spots s
WHERE s.city = $city
  AND s.is_verified = true
ORDER BY s.quality_score DESC
LIMIT 50;
```

**Risk:** Pure engagement ranking favors the already-popular and buries new content. New spots with zero engagement never get discovered. Must be combined with recency injection (Topic 18).

**Dataset size requirements:** Works from the first engagement event. More meaningful with 500+ interactions across the catalog. The seeded spots can be pre-scored based on editorial quality ratings.

**Pre-launch viability:** Implement quality score for the Explore feed at launch. Pre-seed scores for the 431 seeded spots based on editorial ratings.

---

### Topic 18: Time-Decay Ranking — The Reddit/Hacker News Approach

**What it is:** Time-decay algorithms combine engagement score with recency, ensuring that even high-engagement old content eventually yields to newer content. This keeps the feed feeling fresh while still surfacing quality.

**Three canonical formulas:**

**Hacker News formula:**
```
score = (votes - 1) / (hours_since_posted + 2)^1.8
```

**Reddit hot formula:**
```
score = log10(max(|upvotes - downvotes|, 1)) + (sign(upvotes - downvotes) * epoch_time / 45000)
```

**Simple time-decay (recommended for x/pat):**
```sql
-- Weighted engagement score with exponential time decay
-- Half-life of 7 days: a spot loses half its recency bonus every week
SELECT
  s.id,
  s.name,
  s.quality_score * EXP(-0.693 * EXTRACT(EPOCH FROM (now() - s.last_activity_at)) / (7 * 86400)) as decayed_score
FROM spots s
WHERE s.city = $city
ORDER BY decayed_score DESC
LIMIT 50;
```

**For community posts/content (not spots):**
```sql
-- Post ranking with HN-style decay
SELECT
  p.id,
  p.title,
  (COALESCE(p.like_count, 0) + COALESCE(p.comment_count, 0) * 2) /
  POWER(EXTRACT(EPOCH FROM (now() - p.created_at)) / 3600 + 2, 1.5) as hot_score
FROM posts p
WHERE p.city = $city
ORDER BY hot_score DESC;
```

**Half-life tuning for x/pat:**
- Spots: 30-day half-life (spots don't expire quickly; a great cafe is still great next month)
- Community posts: 48-hour half-life (discussion is time-sensitive)
- Events: real-time decay; expire after the event date

**Pre-launch viability:** Implement for community posts at launch. Apply to spots in the Explore "What's Hot" tab. Very low infrastructure overhead — pure SQL computation.

---

### Topic 19: Hybrid Feed Ranking — Combining Personalization with Quality

**What it is:** A hybrid ranking score combines a content-based personalization score (how well this item matches the user's interests) with a quality/engagement score (how good this item is by absolute standards). This ensures users see both content they'll personally enjoy AND content the community endorses as high quality.

**Hybrid score formula:**
```
hybrid_score = (personalization_weight * personal_score) + (quality_weight * quality_score)
```

**Recommended weights for x/pat:**
- New users (< 10 interactions): quality_weight=0.8, personalization_weight=0.2
- Developing profile (10–50 interactions): quality_weight=0.5, personalization_weight=0.5
- Established users (50+ interactions): quality_weight=0.3, personalization_weight=0.7

**SQL implementation:**
```sql
CREATE OR REPLACE FUNCTION get_hybrid_feed(
  p_user_id UUID,
  p_city TEXT,
  p_limit INT DEFAULT 30
)
RETURNS TABLE (spot_id UUID, hybrid_score FLOAT, score_type TEXT) AS $$
  WITH interaction_count AS (
    SELECT COUNT(*) as cnt FROM user_interactions WHERE user_id = p_user_id
  ),
  weights AS (
    SELECT
      CASE WHEN cnt < 10 THEN 0.2
           WHEN cnt < 50 THEN 0.5
           ELSE 0.7 END as p_weight,
      CASE WHEN cnt < 10 THEN 0.8
           WHEN cnt < 50 THEN 0.5
           ELSE 0.3 END as q_weight
    FROM interaction_count
  ),
  personal_scores AS (
    SELECT spot_id, score FROM get_contextual_recommendations(p_user_id, p_city, EXTRACT(HOUR FROM now())::int, 100)
  )
  SELECT
    s.id,
    (w.p_weight * COALESCE(ps.score, 0) + w.q_weight * s.quality_score / 1000) as hybrid_score,
    CASE WHEN ps.spot_id IS NOT NULL THEN 'personalized' ELSE 'quality' END
  FROM spots s
  CROSS JOIN weights w
  LEFT JOIN personal_scores ps ON ps.spot_id = s.id
  WHERE s.city = p_city
  ORDER BY hybrid_score DESC
  LIMIT p_limit;
$$ LANGUAGE sql;
```

**Pre-launch viability:** Implement the hybrid feed as the primary Explore feed. Start all new users on the quality-dominant weights (0.8 quality / 0.2 personal) and let the weights shift automatically as interaction data accumulates.

---

### Topic 20: Multi-Armed Bandit for Real-Time Feed Optimization

**What it is:** A multi-armed bandit (MAB) is a reinforcement learning approach to recommendation that explores (shows new/uncertain content to gather signal) and exploits (shows high-confidence recommendations based on accumulated signal). The epsilon-greedy variant is the simplest: with probability ε (e.g., 10%), show a random item to gather new signal; with probability 1-ε (90%), show the best-known item. This is more adaptive than batch-computed recommendations.

**Why MAB matters for a growing platform:** The first 1,000 users generate the feedback needed to build reliable recommendations. A MAB approach extracts maximum learning value from limited early interactions while still delivering a good user experience.

**Thompson Sampling — the superior MAB variant for x/pat:**
For each spot, maintain a Beta distribution representing uncertainty about its quality:
- α = positive interactions (saves + check-ins + shares)
- β = negative signals (short views, skips)
- Sample from Beta(α, β) to produce a score with natural uncertainty quantification

```sql
-- Track Beta distribution parameters per spot
ALTER TABLE spots ADD COLUMN bandit_alpha FLOAT DEFAULT 1;  -- positive signal count
ALTER TABLE spots ADD COLUMN bandit_beta FLOAT DEFAULT 1;   -- negative/null signal count

-- Update after each interaction
UPDATE spots SET bandit_alpha = bandit_alpha + $weight WHERE id = $spot_id;  -- positive
UPDATE spots SET bandit_beta = bandit_beta + 1 WHERE id = $spot_id;  -- negative
```

**Note:** The actual Thompson sampling draw happens in application code (Python/JS), not SQL. SQL stores the parameters; the app samples from the distribution at request time.

**Dataset size requirements:** MAB provides value from the very first interaction. Most impactful during the 100–5,000 user growth phase when signal is sparse but accumulating.

**Pre-launch viability:** Store bandit parameters in the spots table from launch. Implement Thompson Sampling in a Supabase Edge Function. This is a medium-complexity feature — ship in v1.1 rather than launch.

---

## Section 5: Discovery Features Without Algorithms

### Topic 21: Curated Collections — Human Editorial as a Trust Signal

**What it is:** Algorithmically generated recommendations feel impersonal. Curated collections — "Best Coworking in Bangkok", "Lisbon's Hidden Cafes", "CDMX After-Hours Work Spots" — carry editorial authority. Users trust a human decision more than an algorithm, especially when the curator has credibility (local expert, verified nomad, team pick).

**Why human curation is experiencing a resurgence in 2025:** Research published in 2025 shows that consumers increasingly rely on human curation for prioritization, context, and trust in an era of AI-generated content overload. The anti-algorithm movement reflects a preference for transparent judgment over opaque engagement loops.

**x/pat collection types:**
1. **Team Picks:** Editorially curated by x/pat team — highest trust, lowest frequency (weekly)
2. **City Guides:** "Best of [City]" collections, updated monthly
3. **Occasion Collections:** "Perfect for a Zoom call", "Date night after coworking", "Cheapest day passes"
4. **Community Favorites:** Algorithmically identified but presented as community-voted ("Community's top 10 in Bangkok this month")
5. **Seasonal/Trending:** "Rooftop Season in Bangkok (Nov–Feb)"

**Supabase schema:**
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  collection_type TEXT, -- 'team_pick', 'city_guide', 'occasion', 'community', 'seasonal'
  city TEXT,
  curator_id UUID REFERENCES auth.users(id), -- null = x/pat team
  is_featured BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE collection_spots (
  collection_id UUID REFERENCES collections(id),
  spot_id UUID REFERENCES spots(id),
  position INT,  -- explicit ordering within collection
  editor_note TEXT,  -- "Why we picked this"
  PRIMARY KEY (collection_id, spot_id)
);
```

**Editorial note — the key UX differentiator:** Every spot in a curated collection should have an `editor_note` field: a 1–2 sentence explanation of why this spot was chosen. "The rooftop has a rare combination of fast WiFi (tested at 87Mbps) and a bar menu worth staying for after 6pm." This transforms a list into an editorial voice.

**Pre-launch viability:** Fully viable — ship 10–15 curated collections at launch covering each seeded city. No algorithmic infrastructure required. The highest-trust discovery surface for the first 90 days.

---

### Topic 22: Trending Spots — Community-Validated Recency

**What it is:** Trending is distinct from popular. A spot that was always popular is not trending. Trending means a spot is experiencing a notable increase in engagement relative to its baseline — a signal that the community is currently excited about it. This creates urgency ("people are going here right now") and social proof.

**Trending detection algorithm:**
```sql
-- Trending spots: engagement velocity in last 7 days vs. prior 7 days
CREATE OR REPLACE VIEW trending_spots AS
WITH recent AS (
  SELECT spot_id, SUM(weight) as recent_score
  FROM user_interactions
  WHERE created_at > now() - interval '7 days'
  GROUP BY spot_id
),
baseline AS (
  SELECT spot_id, SUM(weight) as baseline_score
  FROM user_interactions
  WHERE created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days'
  GROUP BY spot_id
)
SELECT
  s.*,
  r.recent_score,
  COALESCE(b.baseline_score, 1) as baseline_score,
  r.recent_score / COALESCE(b.baseline_score, 1) as trend_ratio
FROM spots s
JOIN recent r ON r.spot_id = s.id
LEFT JOIN baseline b ON b.spot_id = s.id
WHERE r.recent_score >= 5  -- minimum activity threshold
ORDER BY trend_ratio DESC;
```

**Pre-launch problem:** With no real interactions, there is no trending signal. Pre-launch strategy: use editorial trending labels on the 10–15 most notable seeded spots per city, with a label like "Community Favorite" rather than "Trending". Switch to algorithmic trending at 500+ interactions.

**City-specific trending:** Trending must be computed per city. A spot trending in Bangkok is irrelevant to a user currently in Lisbon.

**UI presentation:** "Trending this week in Bangkok" with a small activity indicator (number of check-ins or saves this week). Social proof language converts better than algorithmic language.

**Pre-launch viability:** Editorial trending labels at launch; algorithmic trending in v1.1 after interaction data accumulates.

---

### Topic 23: Staff Picks and Expert Voices — Building Authority

**What it is:** Staff picks are a single curated slot per screen that is not personalized — it is the same for all users in a city. The pick is selected by the x/pat team or a trusted city contributor and rotates weekly. This creates a consistent editorial voice, builds brand trust, and ensures there is always at least one high-quality discovery moment per session.

**Implementation:**
```sql
CREATE TABLE staff_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id UUID REFERENCES spots(id),
  city TEXT NOT NULL,
  headline TEXT NOT NULL,  -- "This week's top pick in Bangkok"
  editorial_note TEXT NOT NULL,  -- 1-2 sentences from the picker
  picker_name TEXT,
  picker_role TEXT,  -- "x/pat Bangkok Editor", "Local Expert"
  active_from TIMESTAMPTZ,
  active_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Query current staff pick for a city
SELECT sp.*, s.name, s.cover_image_url
FROM staff_picks sp
JOIN spots s ON s.id = sp.spot_id
WHERE sp.city = $city
  AND sp.active_from <= now()
  AND sp.active_until > now()
LIMIT 1;
```

**Content strategy for staff picks:**
- Rotate weekly (every Monday)
- Prioritize newly added spots to give them an engagement boost
- Use staff picks to highlight sponsor/affiliate partner venues (clearly labeled "Partner Pick")
- Solicit picks from local nomad community members — builds contributor relationships

**Pre-launch viability:** Fully viable at launch. Create staff picks for all 3 seeded cities before going live. Schedule 4 weeks of picks in advance.

---

### Topic 24: Category Browse and Filter-Based Discovery

**What it is:** Not all discovery needs to be algorithmic. A well-organized browse experience — filter by category, city, vibe, amenity, price range — lets users discover through intentional exploration rather than algorithmic suggestion. This is particularly important for users who distrust algorithms or want to find something specific.

**Filter taxonomy for x/pat:**
```
City: Bangkok / Lisbon / CDMX / [All]
Category: Cafe / Coworking / Restaurant / Bar / Accommodation / Gym / Outdoor
Vibe: Quiet / Lively / Social / Artsy / Local / Tourist-Friendly
Amenities: Fast WiFi / Power Outlets / Standing Desks / Coffee / Alcohol / Food / Air-Con
Price: Free / Budget ($) / Mid-Range ($$) / Premium ($$$)
Hours: Open Now / Open 24h / Open Weekends
Nomad: Day Pass / Monthly Pass / Community / Events
```

**Supabase implementation using JSONB for flexible filtering:**
```sql
-- Add amenities JSONB column to spots
ALTER TABLE spots ADD COLUMN amenities JSONB DEFAULT '{}';
-- e.g., {"wifi_speed_mbps": 87, "power_outlets": true, "standing_desks": false}

-- Flexible filter query
SELECT s.*
FROM spots s
JOIN spot_tags st ON s.id = st.spot_id
WHERE s.city = $city
  AND ($category IS NULL OR s.category = $category)
  AND ($amenity IS NULL OR s.amenities->$amenity = 'true')
  AND ($vibe IS NULL OR st.tag = $vibe)
GROUP BY s.id
ORDER BY s.quality_score DESC;
```

**Pre-launch viability:** Essential at launch. The filter/browse experience is the primary discovery mechanism for new users before algorithmic personalization has data to work with.

---

### Topic 25: New and Notable — Surfacing Fresh Content Fairly

**What it is:** New spots and posts have zero engagement and will never surface under engagement-based ranking. A "New and Notable" section gives fresh content a 7-day visibility window regardless of engagement, with editorial curation applied to ensure quality. This prevents the rich-get-richer dynamic and encourages new contributors.

**Implementation:**
```sql
-- New spots: verified and added in the last 7 days
CREATE OR REPLACE VIEW new_and_notable AS
SELECT
  s.*,
  EXTRACT(EPOCH FROM (now() - s.created_at)) / 3600 as hours_since_added,
  'new' as discovery_type
FROM spots s
WHERE s.created_at > now() - interval '7 days'
  AND s.is_verified = true
  AND s.description_embedding IS NOT NULL  -- ensure embedding is ready
ORDER BY s.created_at DESC;
```

**Curation gate:** New spots appear in "New and Notable" only after passing a minimum quality check: description length > 100 characters, at least 3 tags applied, at least 1 photo uploaded. This prevents low-quality contributions from getting the new-spot visibility boost.

**New contributor incentive:** Display a "First Review Bonus" badge on new spots — the first user to leave a review gets extra community points. Drives engagement on new content and helps new spots graduate out of the cold-start state.

**Pre-launch viability:** Fully viable. Configure the quality gate criteria before launch. All 431 seeded spots pass the quality gate at seeding time.

---

## Section 6: Personalization UX — Transparency, Control, and Trust

### Topic 26: Explaining Recommendations — "Why Are You Seeing This"

**What it is:** Transparent recommendations explain to the user why they are seeing specific content. This is both an ethical design principle and a practical engagement driver — users who understand why they see recommendations are more likely to trust and act on them. Netflix, Spotify, and LinkedIn all display recommendation rationale.

**x/pat explanation patterns:**
```
"Because you saved Workshop Cafe" → Similar spots to saved spots
"Matches your coworking + quiet + fast-wifi interests" → Tag profile match
"Popular with nomads in Bangkok this week" → Trending/social proof
"Curated by the x/pat Bangkok team" → Editorial pick
"3 people you follow saved this" → Social graph signal
"Matches your search for 'deep focus work'" → Search-based relevance
"You haven't explored this neighborhood yet" → Novelty/serendipity
"New this week in Silom" → Recency signal
```

**UI implementation in React Native:**
```tsx
// RecommendationChip component
const explanations = {
  similar_to_saved: (spotName: string) => `Because you saved ${spotName}`,
  interest_match: (tags: string[]) => `Matches your ${tags.slice(0, 2).join(' & ')} interests`,
  trending: (city: string) => `Popular in ${city} this week`,
  editorial: () => `x/pat team pick`,
  social: (count: number) => `${count} people you follow saved this`,
};

// Small chip below spot card title:
// 🏷️ "Matches your coworking interests"
// 📈 "Trending in Bangkok"
// ❤️ "3 friends saved this"
```

**Database field to store explanation type:**
```sql
-- When inserting recommendation into user feed cache
ALTER TABLE user_recommendation_cache ADD COLUMN explanation_type TEXT;
ALTER TABLE user_recommendation_cache ADD COLUMN explanation_data JSONB;
```

**Pre-launch viability:** Ship with launch. The UI component is simple. Providing context on every recommendation is a trust-building investment that pays compound returns as the user base grows.

---

### Topic 27: Interest Management UI — Letting Users Control Their Profile

**What it is:** Users should be able to view, edit, and delete their interest profile. This is both a regulatory requirement (CPRA/GDPR right to data access and deletion) and a UX best practice. Users who can tune their recommendations engage more because they feel ownership over the experience.

**Interest management screen design for x/pat:**
1. **Current Interests:** Show all tags with their weight (displayed as a bar or percentage): "Coworking (High) | Cafes (High) | Bars (Low) | Outdoor (Medium)"
2. **Edit weights:** Tap a tag to boost or reduce its influence via a slider or +/- buttons
3. **Remove interest:** Long-press or swipe to remove a tag from the profile entirely
4. **Add interests:** Search/browse available tags to add new ones manually
5. **Reset profile:** "Start fresh" option that wipes all behavioral data and returns to onboarding interest selection
6. **Explanation:** "These interests are built from spots you've saved, viewed, and checked in to."

**Supabase RLS for user data access:**
```sql
-- Users can only read and modify their own interest profiles
CREATE POLICY user_interests_own_access ON user_interests
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their interest data
-- Full GDPR deletion cascade handled by RLS + application logic
```

**Pre-launch viability:** Ship a simplified version at launch (view + reset). Full edit/weight-tuning is v1.1. The reset option is required at launch for trust.

---

### Topic 28: Opt-Out and Personalization Controls — Regulatory and Trust Compliance

**What it is:** Users must have clear, accessible opt-out mechanisms for personalization. Under CPRA (California) and GDPR (EU), the right to opt out of behavioral profiling is legally required for users in those jurisdictions. Beyond compliance, an accessible opt-out paradoxically builds trust — users who know they CAN opt out are less likely to do so.

**Required controls for x/pat:**
1. **Personalized feed toggle:** "Personalize my feed" ON/OFF in Settings → Privacy. When OFF, show quality-ranked feed (Topic 17) without any personal signals.
2. **Interaction history deletion:** "Delete my activity history" removes all `user_interactions` records, resetting the behavioral profile to onboarding state
3. **Interest data export:** Allow users to download their interest profile (GDPR Art. 20 data portability)
4. **Opting into personalization explicitly:** On first launch, brief explanation: "x/pat personalizes your feed based on spots you view and save. You can turn this off anytime in Settings."

**Settings screen structure:**
```
Settings → Privacy & Data
  ├── Personalized Feed: [Toggle ON/OFF]
  ├── View My Interest Profile → [Interests screen, Topic 27]
  ├── Delete Activity History → [Confirmation dialog]
  ├── Download My Data → [Email delivery of JSON export]
  └── Learn How Personalization Works → [Simple explainer screen]
```

**Database implementation:**
```sql
ALTER TABLE user_profiles ADD COLUMN personalization_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN personalization_disabled_at TIMESTAMPTZ;

-- When personalization is disabled, the feed function checks this flag
-- and returns quality-ranked results instead of personalized results
```

**Pre-launch viability:** Required at launch for legal compliance. The toggle and history deletion are non-negotiable for a global app with EU users (Lisbon is in scope for GDPR from day one).

---

### Topic 29: Progressive Personalization — Earning Access to User Data

**What it is:** Rather than requesting full data access upfront, progressive personalization earns user trust incrementally. Start with minimal data collection, show value, then ask for more. This approach dramatically reduces permission friction and improves the quality of data collected (willing participants provide better signal than reluctant ones).

**x/pat progressive personalization stages:**

**Stage 1 — Unregistered browsing:** No personalization. Show quality-ranked global feed. Goal: demonstrate app value before asking for anything.

**Stage 2 — After registration:** Onboarding interest selection (Topic 2). Only explicit preferences — no behavioral tracking yet. Show immediate value: "Your feed is now personalized to your interests."

**Stage 3 — After 5 interactions:** Offer to "upgrade" personalization: "We've noticed you tend to save quiet coworking spots. Want us to weight your recommendations toward those?" User affirms → behavioral tracking level increases.

**Stage 4 — Location permission request:** Don't ask for location on first open. Ask when the user taps the Map tab for the first time — contextual permission request tied to clear value. "Allow location to show spots near you."

**Stage 5 — Notification opt-in:** Ask for push notification permission only after the user has experienced a "wow moment" — typically when they receive their first recommendation that leads to a check-in. "Want to know when spots like this open near you?"

**Pre-launch viability:** This is an onboarding and app flow design decision. The philosophy can be implemented at launch with minimal infrastructure beyond the personalization toggle from Topic 28.

---

### Topic 30: Preference Feedback Loops — Teaching the Algorithm Through UI

**What it is:** Passive behavioral signals are the primary input to recommendation systems, but explicit feedback signals (thumbs up/down, "not interested," "show more like this") provide high-quality, low-ambiguity training data. The challenge is designing feedback mechanisms that users actually engage with — most users will not rate every piece of content, but a well-designed single-action feedback UI can capture significant signal.

**Feedback mechanisms for x/pat:**

**Long-press context menu on any spot card:**
```
Show more like this → boost all tags of this spot in user profile
Not interested → hide this spot + reduce weight of its primary tag
Save for later → adds to saved list + high positive signal
Report → moderation queue
```

**Swipe gestures (TikTok/Tinder paradigm):**
- Swipe right = save (strong positive signal)
- Swipe left = skip/not interested (weak negative signal)
- This captures feedback from every browse session with zero extra taps

**Post-visit feedback prompt:** 24 hours after a check-in, send a push notification: "How was [Spot Name]? ⭐⭐⭐⭐⭐" — a 1-tap star rating that generates high-quality review data and refines recommendation weights.

**SQL feedback processing:**
```sql
-- Handle "Not Interested" explicit feedback
CREATE TABLE user_negative_feedback (
  user_id UUID REFERENCES auth.users(id),
  spot_id UUID REFERENCES spots(id),
  reason TEXT, -- 'not_my_vibe', 'already_been', 'too_far', 'closed'
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + interval '30 days',
  PRIMARY KEY (user_id, spot_id)
);

-- Exclude negative feedback spots from all recommendation queries
-- AND s.id NOT IN (SELECT spot_id FROM user_negative_feedback WHERE user_id = $user_id AND expires_at > now())
```

**"Show more like this" implementation:**
```sql
-- Boost all tags of a spot in the user's interest profile
UPDATE user_tag_scores
SET raw_score = raw_score + 2.0,
    tfidf_score = (raw_score + 2.0) * idf.idf_score
FROM spot_tags st
JOIN tag_idf idf ON idf.tag = st.tag
WHERE user_id = $user_id AND st.spot_id = $spot_id AND user_tag_scores.tag = st.tag;
```

**Pre-launch viability:** Implement the long-press context menu and swipe-to-save at launch. Post-visit push feedback prompt in v1.1. Swipe gestures are a design decision — validate with family beta testers before committing.

---

## Implementation Roadmap Summary

### Pre-Launch (Launch Blockers)

| Topic | Feature | Complexity |
|-------|---------|-----------|
| 2 | Onboarding interest selection | Low |
| 3 | Interaction logging schema | Low |
| 6 | Tag architecture + filtering | Low |
| 11 | pgvector extension + spot embeddings | Low |
| 12 | Automatic embedding pipeline | Medium |
| 13 | Semantic spot search | Medium |
| 14 | HNSW index | Low |
| 16 | Chronological following feed | Low |
| 17 | Quality score for Explore feed | Low |
| 21 | Curated collections (10–15 collections) | Low (editorial) |
| 23 | Staff picks (3 cities, 4 weeks scheduled) | Low (editorial) |
| 24 | Category browse + filters | Low |
| 25 | New & Notable section | Low |
| 26 | Recommendation explanations UI | Medium |
| 28 | Personalization opt-out controls | Low |

### Post-Launch v1.1 (First 30 Days)

| Topic | Feature | Trigger |
|-------|---------|---------|
| 7 | TF-IDF weighted tag scoring | After 50 spots with tags |
| 8 | Dynamic interest profile decay | After 100 user interactions |
| 15 | User preference embeddings | After 200 users with 5+ interactions |
| 18 | Time-decay ranking (hot posts) | After first 500 community posts |
| 19 | Hybrid feed ranking | After 500+ interactions |
| 22 | Algorithmic trending | After 500+ interactions |
| 27 | Full interest management UI | After 200 registered users |
| 30 | Long-press feedback + swipe gestures | After family beta validation |

### Post-Launch v1.2+ (60–90 Days)

| Topic | Feature | Trigger |
|-------|---------|---------|
| 4 | User-user CF recommendations | 500+ users, 5+ interactions each |
| 5 | Item-item CF (behavioral) | 1,000+ interactions |
| 9 | Time-of-day contextual recommendations | After usage pattern data available |
| 10 | Serendipity injection | After personalization is stable |
| 20 | Multi-armed bandit (Thompson Sampling) | v1.2+ |
| 29 | Progressive personalization stages | After Stage 2 data validates Stage 3 |

---

## Key Architecture Decisions

**1. Everything in Supabase/Postgres first.** Do not introduce a separate recommendation engine (Elasticsearch, dedicated ML infrastructure) until the user base exceeds 10,000 monthly active users. pgvector + SQL functions cover 90% of needs below that threshold.

**2. Tag-based CBF is the workhorse for Year 1.** With 431 seeded spots, thorough tagging, and an onboarding interest selection, tag-based content filtering produces genuinely useful personalization from user #1. It requires no behavioral data, no ML infrastructure, and no minimum dataset size.

**3. Log every interaction from day one.** The interaction data is the strategic asset. The recommendation quality in Year 2 is determined by the quality of interaction logging in Year 1. Instrument every tap, save, share, view, check-in, and comment from the first deployment.

**4. Embeddings are worth the setup cost.** The automatic embedding pipeline (12 hours of setup, $0.003 per seeding run) unlocks semantic search, user preference vectors, and semantic similarity — features that are qualitatively different from keyword/tag matching and produce dramatically better discovery for users with niche interests.

**5. Human curation + algorithmic discovery, not algorithmic discovery alone.** For a platform at x/pat's stage, the highest-trust and highest-engagement discovery surfaces are curated collections and staff picks. Algorithmic recommendations supplement editorial voice; they don't replace it. The anti-algorithm sentiment in 2025–2026 creates a market opportunity for apps that lead with human judgment.

**6. Transparency is a feature, not overhead.** Every recommendation should display its rationale. Users who understand why they see content engage more deeply and churn less. Build explanation fields into every recommendation query from the start.

---

*Sources: Supabase pgvector documentation, AWS pgvector deep dive, Nature scientific reports on collaborative filtering, Google Machine Learning crash course, Nielsen Norman Group UX guidelines, Hacker News and Reddit algorithm analyses, Meegle cold start problem guide, Shaped.ai recommendation blogs, SecurePrivacy personalization compliance research, Influencers-Time anti-algorithm analysis (2025), ShadeCoder cold start guide (2025), IEEE Spectrum onboarding algorithm research.*
