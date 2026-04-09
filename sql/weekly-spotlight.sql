-- =============================================================================
-- Serialized Content Loops — Weekly City Spotlight
-- =============================================================================
-- Recurring content formats drive binge engagement and return visits.
-- "Nomad of the Week" + "Top Spots" create a predictable rhythm.
--
-- Source: Hootsuite Social Media Trends 2026
-- =============================================================================

-- Weekly city spotlight data (top spots + most active nomads per city)
CREATE OR REPLACE VIEW weekly_city_spotlight AS
WITH top_spots AS (
  SELECT
    s.city,
    s.id AS spot_id,
    s.name AS spot_name,
    s.category,
    s.votes,
    s.photo_url,
    ROW_NUMBER() OVER (PARTITION BY s.city ORDER BY s.votes DESC, s.created_at DESC) AS rank
  FROM spots s
  WHERE s.created_at > now() - INTERVAL '7 days'
),
most_active AS (
  SELECT
    p.current_city AS city,
    p.id AS user_id,
    p.display_name,
    p.avatar_url,
    (
      SELECT COUNT(*) FROM spots WHERE created_by = p.id
        AND created_at > now() - INTERVAL '7 days'
    ) + (
      SELECT COUNT(*) FROM city_chat_messages WHERE user_id = p.id
        AND created_at > now() - INTERVAL '7 days'
    ) AS activity_score,
    ROW_NUMBER() OVER (
      PARTITION BY p.current_city
      ORDER BY (
        SELECT COUNT(*) FROM spots WHERE created_by = p.id
          AND created_at > now() - INTERVAL '7 days'
      ) + (
        SELECT COUNT(*) FROM city_chat_messages WHERE user_id = p.id
          AND created_at > now() - INTERVAL '7 days'
      ) DESC
    ) AS rank
  FROM profiles p
  WHERE p.current_city IS NOT NULL
),
city_stats AS (
  SELECT
    p.current_city AS city,
    COUNT(DISTINCT p.id) AS active_nomads,
    COUNT(DISTINCT s.id) FILTER (WHERE s.created_at > now() - INTERVAL '7 days') AS new_spots,
    COUNT(DISTINCT e.id) FILTER (WHERE e.start_time > now()) AS upcoming_events
  FROM profiles p
  LEFT JOIN spots s ON s.city = p.current_city
  LEFT JOIN events e ON e.city = p.current_city
  WHERE p.current_city IS NOT NULL
  GROUP BY p.current_city
)
SELECT
  cs.city,
  cs.active_nomads,
  cs.new_spots,
  cs.upcoming_events,
  -- Top 3 spots this week
  jsonb_agg(DISTINCT jsonb_build_object(
    'name', ts.spot_name,
    'category', ts.category,
    'votes', ts.votes,
    'photo_url', ts.photo_url
  )) FILTER (WHERE ts.rank <= 3) AS top_spots,
  -- Top 3 most active nomads
  jsonb_agg(DISTINCT jsonb_build_object(
    'display_name', ma.display_name,
    'avatar_url', ma.avatar_url,
    'activity_score', ma.activity_score
  )) FILTER (WHERE ma.rank <= 3) AS top_nomads
FROM city_stats cs
LEFT JOIN top_spots ts ON ts.city = cs.city
LEFT JOIN most_active ma ON ma.city = cs.city
GROUP BY cs.city, cs.active_nomads, cs.new_spots, cs.upcoming_events
HAVING cs.active_nomads >= 5  -- Only spotlight cities with enough activity
ORDER BY cs.active_nomads DESC;
