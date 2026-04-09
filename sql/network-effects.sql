-- =============================================================================
-- Network Effects Framework (Reid Hoffman / LinkedIn Playbook)
-- =============================================================================
-- Hoffman's thesis: network value grows with n² (Metcalfe's Law).
-- Key insight: users who connect with 5+ people in first week retain 3x better.
-- LinkedIn's "People You May Know" drives 50%+ of connection growth.
--
-- Source: Reid Hoffman "Blitzscaling" + LinkedIn Growth Team public talks
-- =============================================================================

-- "Nomads You May Know" — connection suggestions based on mutual connections + city overlap
CREATE OR REPLACE VIEW nomads_you_may_know AS
WITH user_connections AS (
  -- Bidirectional connections
  SELECT user_id, connected_user_id FROM connections WHERE status = 'accepted'
  UNION ALL
  SELECT connected_user_id, user_id FROM connections WHERE status = 'accepted'
),
mutual_counts AS (
  -- Count mutual connections between non-connected users
  SELECT
    uc1.user_id AS source_user,
    uc2.user_id AS suggested_user,
    COUNT(*) AS mutual_count
  FROM user_connections uc1
  JOIN user_connections uc2 ON uc1.connected_user_id = uc2.user_id
  WHERE uc1.user_id != uc2.user_id
    -- Exclude already-connected pairs
    AND NOT EXISTS (
      SELECT 1 FROM connections c
      WHERE (c.user_id = uc1.user_id AND c.connected_user_id = uc2.user_id)
         OR (c.user_id = uc2.user_id AND c.connected_user_id = uc1.user_id)
    )
  GROUP BY uc1.user_id, uc2.user_id
),
city_overlap AS (
  -- Users in the same city get a boost
  SELECT
    p1.id AS source_user,
    p2.id AS suggested_user,
    CASE WHEN p1.current_city = p2.current_city AND p1.current_city IS NOT NULL
      THEN 3 ELSE 0
    END AS city_bonus
  FROM profiles p1
  CROSS JOIN profiles p2
  WHERE p1.id != p2.id
)
SELECT
  mc.source_user,
  mc.suggested_user,
  mc.mutual_count,
  COALESCE(co.city_bonus, 0) AS city_bonus,
  mc.mutual_count * 2 + COALESCE(co.city_bonus, 0) AS relevance_score,
  p.display_name,
  p.avatar_url,
  p.current_city,
  p.bio
FROM mutual_counts mc
LEFT JOIN city_overlap co
  ON mc.source_user = co.source_user AND mc.suggested_user = co.suggested_user
JOIN profiles p ON mc.suggested_user = p.id
ORDER BY mc.source_user, relevance_score DESC;

-- Personal network value score (Metcalfe's Law application)
CREATE OR REPLACE VIEW user_network_value AS
WITH user_connections AS (
  SELECT user_id, COUNT(*) AS connection_count
  FROM (
    SELECT user_id FROM connections WHERE status = 'accepted'
    UNION ALL
    SELECT connected_user_id AS user_id FROM connections WHERE status = 'accepted'
  ) all_connections
  GROUP BY user_id
),
-- Second-degree reach
second_degree AS (
  SELECT
    c1.user_id,
    COUNT(DISTINCT c2.connected_user_id) AS second_degree_count
  FROM connections c1
  JOIN connections c2 ON c1.connected_user_id = c2.user_id
  WHERE c1.status = 'accepted' AND c2.status = 'accepted'
    AND c2.connected_user_id != c1.user_id
  GROUP BY c1.user_id
)
SELECT
  uc.user_id,
  uc.connection_count AS direct_connections,
  COALESCE(sd.second_degree_count, 0) AS second_degree_reach,
  -- Network value = direct² + second_degree (simplified Metcalfe)
  POWER(uc.connection_count, 2) + COALESCE(sd.second_degree_count, 0) AS network_value,
  -- Connection velocity (connections per week since signup)
  ROUND(uc.connection_count::numeric /
    GREATEST(EXTRACT(EPOCH FROM (now() - u.created_at)) / 604800, 1), 2
  ) AS connections_per_week,
  -- Hoffman threshold: 5+ connections = high-retention user
  CASE
    WHEN uc.connection_count >= 10 THEN 'POWER_USER'
    WHEN uc.connection_count >= 5 THEN 'CONNECTED'
    WHEN uc.connection_count >= 2 THEN 'GROWING'
    ELSE 'ISOLATED'
  END AS network_tier
FROM user_connections uc
LEFT JOIN second_degree sd ON uc.user_id = sd.user_id
JOIN auth.users u ON uc.user_id = u.id
ORDER BY network_value DESC;

-- City network density — are there enough connections for the network to be valuable?
CREATE OR REPLACE VIEW city_network_density AS
SELECT
  p.current_city AS city,
  COUNT(DISTINCT p.id) AS users_in_city,
  COUNT(DISTINCT c.id) AS connections_in_city,
  -- Density = actual connections / possible connections
  ROUND(
    COUNT(DISTINCT c.id)::numeric * 2 /
    NULLIF(COUNT(DISTINCT p.id) * (COUNT(DISTINCT p.id) - 1), 0),
    4
  ) AS density,
  -- Average connections per user in this city
  ROUND(COUNT(DISTINCT c.id)::numeric * 2 / NULLIF(COUNT(DISTINCT p.id), 0), 1) AS avg_connections,
  CASE
    WHEN COUNT(DISTINCT p.id) >= 50 AND
         COUNT(DISTINCT c.id)::numeric * 2 / NULLIF(COUNT(DISTINCT p.id), 0) >= 3
    THEN 'THRIVING'
    WHEN COUNT(DISTINCT p.id) >= 20 THEN 'GROWING'
    WHEN COUNT(DISTINCT p.id) >= 5 THEN 'SEEDING'
    ELSE 'PRE_SEED'
  END AS network_health
FROM profiles p
LEFT JOIN connections c
  ON (c.user_id = p.id OR c.connected_user_id = p.id)
  AND c.status = 'accepted'
WHERE p.current_city IS NOT NULL
GROUP BY p.current_city
ORDER BY users_in_city DESC;
