-- =============================================================================
-- Reforge Growth Loops Measurement
-- =============================================================================
-- Replace funnel thinking with closed-loop systems (Balfour, 2025).
-- x/pat has 3 natural loops:
--   1. Viral: User saves spot → shares card → friend joins → saves spot
--   2. Content: User adds spot → appears in city feed → attracts new users
--   3. UGC: User vouches → trust badge shown → attracts engagement
--
-- Source: reforge.com/blog/growth-loops
-- =============================================================================

-- Viral loop: track from share → install → activation
CREATE OR REPLACE VIEW growth_loop_viral AS
WITH shares AS (
  SELECT
    user_id,
    created_at AS shared_at,
    date_trunc('week', created_at) AS share_week
  FROM shareable_card_events
  WHERE event_type = 'shared'
),
referral_installs AS (
  SELECT
    referred_by AS referrer_id,
    id AS new_user_id,
    created_at AS joined_at
  FROM auth.users
  WHERE referred_by IS NOT NULL
),
loop_completions AS (
  -- A loop completes when: share → install → new user also shares
  SELECT
    s.user_id AS original_sharer,
    ri.new_user_id,
    s2.user_id AS new_sharer,
    s.shared_at,
    ri.joined_at,
    s2.shared_at AS reshared_at,
    EXTRACT(EPOCH FROM (s2.shared_at - s.shared_at)) / 3600 AS loop_hours
  FROM shares s
  JOIN referral_installs ri ON s.user_id = ri.referrer_id
    AND ri.joined_at > s.shared_at
  LEFT JOIN shares s2 ON s2.user_id = ri.new_user_id
    AND s2.shared_at > ri.joined_at
)
SELECT
  date_trunc('week', shared_at) AS week,
  COUNT(*) AS shares,
  COUNT(new_user_id) AS installs_from_shares,
  COUNT(new_sharer) AS loop_completions,
  ROUND(100.0 * COUNT(new_user_id) / NULLIF(COUNT(*), 0), 1) AS share_to_install_pct,
  ROUND(100.0 * COUNT(new_sharer) / NULLIF(COUNT(new_user_id), 0), 1) AS install_to_reshare_pct,
  ROUND(AVG(loop_hours) FILTER (WHERE loop_hours IS NOT NULL), 1) AS avg_loop_hours
FROM loop_completions
GROUP BY date_trunc('week', shared_at)
ORDER BY week DESC;

-- Content loop: spot created → viewed by others → drives new signups
CREATE OR REPLACE VIEW growth_loop_content AS
SELECT
  date_trunc('week', s.created_at) AS week,
  COUNT(DISTINCT s.id) AS spots_created,
  COUNT(DISTINCT sv.user_id) AS unique_viewers,
  ROUND(COUNT(DISTINCT sv.user_id)::numeric / NULLIF(COUNT(DISTINCT s.id), 0), 1)
    AS views_per_spot,
  COUNT(DISTINCT ss.user_id) AS users_who_saved,
  ROUND(100.0 * COUNT(DISTINCT ss.user_id) / NULLIF(COUNT(DISTINCT sv.user_id), 0), 1)
    AS view_to_save_pct
FROM spots s
LEFT JOIN spot_views sv ON sv.spot_id = s.id
  AND sv.created_at BETWEEN s.created_at AND s.created_at + INTERVAL '30 days'
LEFT JOIN saved_spots ss ON ss.spot_id = s.id
  AND ss.created_at BETWEEN s.created_at AND s.created_at + INTERVAL '30 days'
GROUP BY date_trunc('week', s.created_at)
ORDER BY week DESC;

-- UGC trust loop: vouch given → trust badge → more engagement received
CREATE OR REPLACE VIEW growth_loop_trust AS
SELECT
  date_trunc('week', v.created_at) AS week,
  COUNT(DISTINCT v.id) AS vouches_given,
  COUNT(DISTINCT v.vouched_user_id) AS users_vouched,
  -- Track if vouched users get more engagement after vouch
  AVG(post_vouch.engagement) AS avg_post_vouch_engagement
FROM vouches v
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS engagement
  FROM connections c
  WHERE c.connected_user_id = v.vouched_user_id
    AND c.created_at > v.created_at
    AND c.created_at < v.created_at + INTERVAL '14 days'
) post_vouch ON true
GROUP BY date_trunc('week', v.created_at)
ORDER BY week DESC;
