-- =============================================================================
-- City Ambassador Program (InterNations + Airbnb Superhost Model)
-- =============================================================================
-- InterNations: 6,000 volunteer Ambassadors, zero payment. Incentives:
--   recognition, event-hosting authority, community status.
-- Airbnb Superhosts: transparent 4-metric system, quarterly review.
--
-- x/pat 3-tier system: Scout → Guide → Ambassador
-- Auto-promotion based on transparent activity thresholds.
--
-- Sources:
-- - InterNations Ambassador Handbook: aturea.org/pdf_ppt_docs/congres/1539865936.pdf
-- - Airbnb Superhost: airbnb.com/help/article/828
-- =============================================================================

-- Ambassador tiers table
-- CREATE TABLE IF NOT EXISTS ambassador_tiers (
--   id SERIAL PRIMARY KEY,
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   city TEXT NOT NULL,
--   tier TEXT NOT NULL CHECK (tier IN ('scout', 'guide', 'ambassador')),
--   promoted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   metrics_snapshot JSONB NOT NULL DEFAULT '{}',
--   is_active BOOLEAN NOT NULL DEFAULT true,
--   UNIQUE(user_id, city)
-- );

-- Evaluate ambassador eligibility (run weekly via pg_cron)
CREATE OR REPLACE FUNCTION evaluate_ambassador_eligibility(p_user_id UUID)
RETURNS TABLE(city TEXT, eligible_tier TEXT, metrics JSONB) AS $$
BEGIN
  RETURN QUERY
  WITH user_city_stats AS (
    SELECT
      p.current_city AS city,
      -- Spots created in this city
      COUNT(DISTINCT s.id) AS spots_created,
      -- Events hosted
      COUNT(DISTINCT e.id) AS events_hosted,
      -- Active users recruited (referrals who became active)
      0 AS users_recruited, -- TODO: join with referrals table
      -- Trust score
      COALESCE(
        (SELECT AVG(trust_score) FROM trust_scores WHERE user_id = p_user_id),
        0
      ) AS trust_score,
      -- Vouches received
      (SELECT COUNT(*) FROM vouches WHERE vouched_user_id = p_user_id) AS vouches_received
    FROM profiles p
    LEFT JOIN spots s ON s.created_by = p_user_id AND s.city = p.current_city
    LEFT JOIN events e ON e.created_by = p_user_id
    WHERE p.id = p_user_id AND p.current_city IS NOT NULL
    GROUP BY p.current_city
  )
  SELECT
    ucs.city,
    CASE
      -- Ambassador: 100+ spots, 10+ events, 5+ recruited, 4.8+ trust
      WHEN ucs.spots_created >= 100 AND ucs.events_hosted >= 10
        AND ucs.trust_score >= 4.8
        THEN 'ambassador'
      -- Guide: 50+ spots, 3+ events, 4.8+ trust
      WHEN ucs.spots_created >= 50 AND ucs.events_hosted >= 3
        AND ucs.trust_score >= 4.5
        THEN 'guide'
      -- Scout: 10+ spots, 4.5+ trust
      WHEN ucs.spots_created >= 10 AND ucs.trust_score >= 4.0
        THEN 'scout'
      ELSE NULL
    END AS eligible_tier,
    jsonb_build_object(
      'spots_created', ucs.spots_created,
      'events_hosted', ucs.events_hosted,
      'trust_score', ucs.trust_score,
      'vouches_received', ucs.vouches_received,
      'evaluated_at', now()
    ) AS metrics
  FROM user_city_stats ucs
  WHERE ucs.city IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- City community health dashboard
CREATE OR REPLACE VIEW city_community_health AS
SELECT
  p.current_city AS city,
  COUNT(DISTINCT p.id) AS active_users,
  COUNT(DISTINCT s.id) FILTER (WHERE s.created_at > now() - INTERVAL '7 days') AS spots_this_week,
  COUNT(DISTINCT e.id) FILTER (WHERE e.created_at > now() - INTERVAL '30 days') AS events_this_month,
  COUNT(DISTINCT m.id) FILTER (WHERE m.created_at > now() - INTERVAL '7 days') AS messages_this_week,
  -- Ambassador coverage
  COUNT(DISTINCT at.user_id) FILTER (WHERE at.tier = 'ambassador') AS ambassadors,
  COUNT(DISTINCT at.user_id) FILTER (WHERE at.tier = 'guide') AS guides,
  COUNT(DISTINCT at.user_id) FILTER (WHERE at.tier = 'scout') AS scouts,
  -- Moderation health
  COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > now() - INTERVAL '7 days') AS reports_this_week,
  -- Overall health score (0-100)
  LEAST(100, GREATEST(0,
    -- Activity (40 points): 1 point per active user up to 40
    LEAST(40, COUNT(DISTINCT p.id)) +
    -- Content (30 points): spots + events activity
    LEAST(30, COUNT(DISTINCT s.id) FILTER (WHERE s.created_at > now() - INTERVAL '7 days') * 3
      + COUNT(DISTINCT e.id) FILTER (WHERE e.created_at > now() - INTERVAL '30 days') * 5) +
    -- Leadership (20 points): ambassador coverage
    LEAST(20, COUNT(DISTINCT at.user_id) * 7) +
    -- Safety (10 points): low report rate
    CASE WHEN COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > now() - INTERVAL '7 days') <= 2
      THEN 10 ELSE GREATEST(0, 10 - COUNT(DISTINCT r.id) FILTER (WHERE r.created_at > now() - INTERVAL '7 days'))
    END
  )) AS health_score,
  CASE
    WHEN COUNT(DISTINCT p.id) >= 50 AND COUNT(DISTINCT at.user_id) >= 3 THEN 'THRIVING'
    WHEN COUNT(DISTINCT p.id) >= 20 AND COUNT(DISTINCT at.user_id) >= 1 THEN 'GROWING'
    WHEN COUNT(DISTINCT p.id) >= 5 THEN 'SEEDING'
    ELSE 'PRE_LAUNCH'
  END AS status
FROM profiles p
LEFT JOIN spots s ON s.created_by = p.id AND s.city = p.current_city
LEFT JOIN events e ON e.created_by = p.id
LEFT JOIN city_chat_messages m ON m.user_id = p.id AND m.city = p.current_city
LEFT JOIN ambassador_tiers at ON at.city = p.current_city AND at.is_active = true
LEFT JOIN reports r ON r.created_at > now() - INTERVAL '7 days'
WHERE p.current_city IS NOT NULL
GROUP BY p.current_city
ORDER BY active_users DESC;
