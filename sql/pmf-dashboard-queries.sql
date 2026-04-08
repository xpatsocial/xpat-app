-- =============================================================================
-- PMF Dashboard Queries — Rahul Vohra / Sean Ellis Methodology
-- =============================================================================
-- Run these against Supabase SQL editor or connect via PostHog / Metabase.
-- All queries use the pmf_surveys table created by the migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. OVERALL PMF SCORE
-- The magic number: % of respondents who said "very_disappointed"
-- Target: 40%+ means you have product-market fit
-- ---------------------------------------------------------------------------

SELECT
  COUNT(*) AS total_responses,
  COUNT(*) FILTER (WHERE disappointment_level = 'very_disappointed') AS very_disappointed,
  COUNT(*) FILTER (WHERE disappointment_level = 'somewhat_disappointed') AS somewhat_disappointed,
  COUNT(*) FILTER (WHERE disappointment_level = 'not_disappointed') AS not_disappointed,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE disappointment_level = 'very_disappointed') / NULLIF(COUNT(*), 0),
    1
  ) AS pmf_score_pct
FROM pmf_surveys;


-- ---------------------------------------------------------------------------
-- 2. PMF SCORE SEGMENTED BY CITY
-- Vohra's key insight: segment to find PMF in a subset
-- ---------------------------------------------------------------------------

SELECT
  p.current_city AS city,
  COUNT(*) AS total_responses,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE s.disappointment_level = 'very_disappointed') / NULLIF(COUNT(*), 0),
    1
  ) AS pmf_score_pct,
  COUNT(*) FILTER (WHERE s.disappointment_level = 'very_disappointed') AS very_disappointed,
  COUNT(*) FILTER (WHERE s.disappointment_level = 'somewhat_disappointed') AS somewhat_disappointed,
  COUNT(*) FILTER (WHERE s.disappointment_level = 'not_disappointed') AS not_disappointed
FROM pmf_surveys s
JOIN profiles p ON p.id = s.user_id
WHERE p.current_city IS NOT NULL AND p.current_city != ''
GROUP BY p.current_city
ORDER BY pmf_score_pct DESC;


-- ---------------------------------------------------------------------------
-- 3. PMF SCORE SEGMENTED BY USER TENURE
-- New users (<30 days) vs. Established (30-90) vs. Veterans (90+)
-- ---------------------------------------------------------------------------

SELECT
  CASE
    WHEN EXTRACT(DAY FROM (s.created_at - u.created_at)) < 30 THEN 'new (< 30d)'
    WHEN EXTRACT(DAY FROM (s.created_at - u.created_at)) < 90 THEN 'established (30-90d)'
    ELSE 'veteran (90d+)'
  END AS user_tenure,
  COUNT(*) AS total_responses,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE s.disappointment_level = 'very_disappointed') / NULLIF(COUNT(*), 0),
    1
  ) AS pmf_score_pct
FROM pmf_surveys s
JOIN auth.users u ON u.id = s.user_id
GROUP BY user_tenure
ORDER BY pmf_score_pct DESC;


-- ---------------------------------------------------------------------------
-- 4. PMF SCORE: POWER USERS VS. CASUAL
-- Power users: 10+ spots saved OR 5+ connections
-- ---------------------------------------------------------------------------

SELECT
  CASE
    WHEN (
      (SELECT COUNT(*) FROM saved_spots ss WHERE ss.user_id = s.user_id) >= 10
      OR (SELECT COUNT(*) FROM connections c WHERE c.requester_id = s.user_id OR c.addressee_id = s.user_id) >= 5
    ) THEN 'power_user'
    ELSE 'casual_user'
  END AS user_type,
  COUNT(*) AS total_responses,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE s.disappointment_level = 'very_disappointed') / NULLIF(COUNT(*), 0),
    1
  ) AS pmf_score_pct
FROM pmf_surveys s
GROUP BY user_type
ORDER BY pmf_score_pct DESC;


-- ---------------------------------------------------------------------------
-- 5. PMF SCORE TRENDING OVER TIME (MONTHLY COHORTS)
-- Track improvement quarter-over-quarter as you iterate
-- ---------------------------------------------------------------------------

SELECT
  TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
  COUNT(*) AS total_responses,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE disappointment_level = 'very_disappointed') / NULLIF(COUNT(*), 0),
    1
  ) AS pmf_score_pct,
  COUNT(*) FILTER (WHERE disappointment_level = 'very_disappointed') AS very_disappointed,
  COUNT(*) FILTER (WHERE disappointment_level = 'somewhat_disappointed') AS somewhat_disappointed,
  COUNT(*) FILTER (WHERE disappointment_level = 'not_disappointed') AS not_disappointed
FROM pmf_surveys
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;


-- ---------------------------------------------------------------------------
-- 6. WORD FREQUENCY FROM MAIN BENEFIT RESPONSES
-- Proxy for word cloud — extract most common words from Q3
-- Used to refine positioning language (Vohra's "main benefit" insight)
-- ---------------------------------------------------------------------------

SELECT
  word,
  COUNT(*) AS frequency
FROM (
  SELECT UNNEST(
    STRING_TO_ARRAY(
      LOWER(REGEXP_REPLACE(main_benefit, '[^a-zA-Z\s]', '', 'g')),
      ' '
    )
  ) AS word
  FROM pmf_surveys
  WHERE main_benefit IS NOT NULL AND main_benefit != ''
) words
WHERE LENGTH(word) > 3
  AND word NOT IN ('that', 'this', 'with', 'from', 'have', 'been', 'they', 'their', 'there', 'what', 'when', 'will', 'more', 'about', 'also', 'just', 'like', 'some', 'than', 'very', 'would', 'could', 'really', 'other')
GROUP BY word
ORDER BY frequency DESC
LIMIT 50;


-- ---------------------------------------------------------------------------
-- 7. IDEAL USER PERSONAS (Q2 responses from VD users only)
-- These describe your High-Expectation Customer in their own words
-- ---------------------------------------------------------------------------

SELECT
  ideal_user_description,
  created_at
FROM pmf_surveys
WHERE disappointment_level = 'very_disappointed'
  AND ideal_user_description IS NOT NULL
  AND ideal_user_description != ''
ORDER BY created_at DESC;


-- ---------------------------------------------------------------------------
-- 8. IMPROVEMENT SUGGESTIONS FROM SOMEWHAT DISAPPOINTED USERS
-- Vohra's key: these are the blockers to fix (50% of roadmap)
-- Only from SD users who share the same core benefit as VD users
-- ---------------------------------------------------------------------------

SELECT
  improvement_suggestion,
  main_benefit,
  created_at
FROM pmf_surveys
WHERE disappointment_level = 'somewhat_disappointed'
  AND improvement_suggestion IS NOT NULL
  AND improvement_suggestion != ''
ORDER BY created_at DESC;
