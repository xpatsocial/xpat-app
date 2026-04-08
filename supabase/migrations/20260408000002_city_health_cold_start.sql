-- ============================================================
-- City Health Metrics & Tipping Point Detection
-- Based on Andrew Chen's Cold Start Problem framework
-- ============================================================

-- 1. Table to store weekly city health snapshots
CREATE TABLE IF NOT EXISTS city_health_metrics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city text NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  -- Core metrics
  wau integer NOT NULL DEFAULT 0,           -- Weekly Active Users
  new_users integer NOT NULL DEFAULT 0,      -- First-time active users this week
  organic_users integer NOT NULL DEFAULT 0,  -- New users without referral code
  spots_with_activity integer NOT NULL DEFAULT 0,  -- Spots that got votes/saves/check-ins
  chat_messages integer NOT NULL DEFAULT 0,  -- City chat + DM messages
  connections_made integer NOT NULL DEFAULT 0,
  new_spots integer NOT NULL DEFAULT 0,      -- User-created spots (non-seed)
  new_posts integer NOT NULL DEFAULT 0,
  events_created integer NOT NULL DEFAULT 0,
  check_ins integer NOT NULL DEFAULT 0,
  -- Computed
  health_score numeric(5,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'dead',       -- dead, struggling, viable, thriving
  -- Metadata
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(city, week_start)
);

-- Index for fast lookups
CREATE INDEX idx_city_health_city_week ON city_health_metrics(city, week_start DESC);
CREATE INDEX idx_city_health_status ON city_health_metrics(status);

-- Enable RLS
ALTER TABLE city_health_metrics ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read city health metrics
CREATE POLICY "Authenticated users can read city health"
  ON city_health_metrics FOR SELECT
  TO authenticated
  USING (true);

-- 2. Function to compute city health for a given week
CREATE OR REPLACE FUNCTION compute_city_health_metrics(
  p_week_start date DEFAULT date_trunc('week', CURRENT_DATE)::date
)
RETURNS SETOF city_health_metrics
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_week_end date := p_week_start + 6;
  v_week_start_ts timestamptz := p_week_start::timestamptz;
  v_week_end_ts timestamptz := (v_week_end + 1)::timestamptz;
  rec record;
  v_health numeric(5,2);
  v_status text;
BEGIN
  -- Get all cities that have spots or users
  FOR rec IN
    WITH cities AS (
      SELECT DISTINCT city FROM spots WHERE city IS NOT NULL
      UNION
      SELECT DISTINCT current_city AS city FROM profiles WHERE current_city IS NOT NULL
    ),
    -- Active users per city this week
    active_users AS (
      SELECT p.current_city AS city, COUNT(DISTINCT a.user_id) AS wau
      FROM v_user_activity a
      JOIN profiles p ON p.id = a.user_id
      WHERE a.created_at >= v_week_start_ts AND a.created_at < v_week_end_ts
        AND p.current_city IS NOT NULL
      GROUP BY p.current_city
    ),
    -- New users (first activity ever falls in this week)
    new_users AS (
      SELECT p.current_city AS city, COUNT(DISTINCT p.id) AS cnt
      FROM profiles p
      WHERE p.created_at >= v_week_start_ts AND p.created_at < v_week_end_ts
        AND p.current_city IS NOT NULL
      GROUP BY p.current_city
    ),
    -- Organic users (no referral code used to sign up)
    organic AS (
      SELECT p.current_city AS city, COUNT(DISTINCT p.id) AS cnt
      FROM profiles p
      LEFT JOIN referral_completions rc ON rc.invitee_id = p.id
      WHERE p.created_at >= v_week_start_ts AND p.created_at < v_week_end_ts
        AND p.current_city IS NOT NULL
        AND rc.id IS NULL
      GROUP BY p.current_city
    ),
    -- Spots with activity (votes, saves, or check-ins this week)
    spot_activity AS (
      SELECT s.city, COUNT(DISTINCT s.id) AS cnt
      FROM spots s
      WHERE s.city IS NOT NULL AND (
        EXISTS (SELECT 1 FROM spot_votes sv WHERE sv.spot_id = s.id AND sv.created_at >= v_week_start_ts AND sv.created_at < v_week_end_ts)
        OR EXISTS (SELECT 1 FROM saved_spots ss WHERE ss.spot_id = s.id AND ss.created_at >= v_week_start_ts AND ss.created_at < v_week_end_ts)
        OR EXISTS (SELECT 1 FROM check_ins ci WHERE ci.spot_id = s.id AND ci.created_at >= v_week_start_ts AND ci.created_at < v_week_end_ts)
      )
      GROUP BY s.city
    ),
    -- Chat messages (city chat channels + DMs between users in same city)
    chat_msgs AS (
      SELECT ch.city, COUNT(*) AS cnt
      FROM chat_messages cm
      JOIN chat_channels ch ON ch.id = cm.channel_id
      WHERE cm.created_at >= v_week_start_ts AND cm.created_at < v_week_end_ts
        AND ch.city IS NOT NULL
        AND (cm.deleted IS NULL OR cm.deleted = false)
      GROUP BY ch.city
    ),
    -- Connections made
    conns AS (
      SELECT p.current_city AS city, COUNT(*) AS cnt
      FROM connections c
      JOIN profiles p ON p.id = c.requester_id
      WHERE c.created_at >= v_week_start_ts AND c.created_at < v_week_end_ts
        AND p.current_city IS NOT NULL
      GROUP BY p.current_city
    ),
    -- New spots (non-seed)
    new_spots AS (
      SELECT s.city, COUNT(*) AS cnt
      FROM spots s
      WHERE s.created_at >= v_week_start_ts AND s.created_at < v_week_end_ts
        AND s.city IS NOT NULL
        AND (s.is_seed IS NULL OR s.is_seed = false)
      GROUP BY s.city
    ),
    -- New posts
    new_posts AS (
      SELECT s.city, COUNT(*) AS cnt
      FROM posts po
      JOIN spots s ON s.id = po.spot_id
      WHERE po.created_at >= v_week_start_ts AND po.created_at < v_week_end_ts
        AND s.city IS NOT NULL
        AND (po.is_seed IS NULL OR po.is_seed = false)
      GROUP BY s.city
    ),
    -- Events created
    new_events AS (
      SELECT e.city, COUNT(*) AS cnt
      FROM events e
      WHERE e.created_at >= v_week_start_ts AND e.created_at < v_week_end_ts
        AND e.city IS NOT NULL
      GROUP BY e.city
    ),
    -- Check-ins
    checkins AS (
      SELECT s.city, COUNT(*) AS cnt
      FROM check_ins ci
      JOIN spots s ON s.id = ci.spot_id
      WHERE ci.created_at >= v_week_start_ts AND ci.created_at < v_week_end_ts
        AND s.city IS NOT NULL
      GROUP BY s.city
    )
    SELECT
      c.city,
      COALESCE(au.wau, 0) AS wau,
      COALESCE(nu.cnt, 0) AS new_users,
      COALESCE(o.cnt, 0) AS organic_users,
      COALESCE(sa.cnt, 0) AS spots_with_activity,
      COALESCE(cm.cnt, 0) AS chat_messages,
      COALESCE(co.cnt, 0) AS connections_made,
      COALESCE(ns.cnt, 0) AS new_spots,
      COALESCE(np.cnt, 0) AS new_posts,
      COALESCE(ne.cnt, 0) AS events_created,
      COALESCE(ck.cnt, 0) AS check_ins
    FROM cities c
    LEFT JOIN active_users au ON au.city = c.city
    LEFT JOIN new_users nu ON nu.city = c.city
    LEFT JOIN organic o ON o.city = c.city
    LEFT JOIN spot_activity sa ON sa.city = c.city
    LEFT JOIN chat_msgs cm ON cm.city = c.city
    LEFT JOIN conns co ON co.city = c.city
    LEFT JOIN new_spots ns ON ns.city = c.city
    LEFT JOIN new_posts np ON np.city = c.city
    LEFT JOIN new_events ne ON ne.city = c.city
    LEFT JOIN checkins ck ON ck.city = c.city
  LOOP
    -- Compute health score (0-100) based on Chen's framework weights
    v_health := ROUND((
      LEAST(rec.wau::numeric / 150.0, 1.0) * 30 +
      LEAST(rec.chat_messages::numeric / 210.0, 1.0) * 25 +
      LEAST(rec.new_spots::numeric / 10.0, 1.0) * 15 +
      LEAST(rec.connections_made::numeric / 15.0, 1.0) * 15 +
      LEAST(rec.spots_with_activity::numeric / 100.0, 1.0) * 10 +
      LEAST(rec.new_users::numeric / 25.0, 1.0) * 5
    ), 2);

    -- Determine status based on WAU thresholds
    v_status := CASE
      WHEN rec.wau < 25 THEN 'dead'
      WHEN rec.wau < 75 THEN 'struggling'
      WHEN rec.wau < 150 THEN 'viable'
      ELSE 'thriving'
    END;

    -- Upsert into table
    INSERT INTO city_health_metrics (
      city, week_start, week_end, wau, new_users, organic_users,
      spots_with_activity, chat_messages, connections_made,
      new_spots, new_posts, events_created, check_ins,
      health_score, status, computed_at
    ) VALUES (
      rec.city, p_week_start, v_week_end, rec.wau, rec.new_users, rec.organic_users,
      rec.spots_with_activity, rec.chat_messages, rec.connections_made,
      rec.new_spots, rec.new_posts, rec.events_created, rec.check_ins,
      v_health, v_status, now()
    )
    ON CONFLICT (city, week_start) DO UPDATE SET
      week_end = EXCLUDED.week_end,
      wau = EXCLUDED.wau,
      new_users = EXCLUDED.new_users,
      organic_users = EXCLUDED.organic_users,
      spots_with_activity = EXCLUDED.spots_with_activity,
      chat_messages = EXCLUDED.chat_messages,
      connections_made = EXCLUDED.connections_made,
      new_spots = EXCLUDED.new_spots,
      new_posts = EXCLUDED.new_posts,
      events_created = EXCLUDED.events_created,
      check_ins = EXCLUDED.check_ins,
      health_score = EXCLUDED.health_score,
      status = EXCLUDED.status,
      computed_at = EXCLUDED.computed_at;

    -- Return the row
    RETURN QUERY SELECT chm.* FROM city_health_metrics chm
      WHERE chm.city = rec.city AND chm.week_start = p_week_start;
  END LOOP;
END;
$$;

-- 3. Convenience function to refresh current week
CREATE OR REPLACE FUNCTION refresh_city_health_metrics()
RETURNS SETOF city_health_metrics
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM compute_city_health_metrics(date_trunc('week', CURRENT_DATE)::date);
$$;

-- 4. Tipping point detection function
CREATE OR REPLACE FUNCTION detect_city_tipping_point(p_city text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_weeks_of_growth integer := 0;
  v_organic_pct numeric;
  v_avg_daily_chat numeric;
  v_current_wau integer;
  v_prev_wau integer;
  v_status text;
  v_peak_wau integer;
  rec record;
BEGIN
  -- Get last 6 weeks of data for this city
  -- Count consecutive weeks of WAU growth (most recent first)
  v_prev_wau := NULL;
  v_weeks_of_growth := 0;

  FOR rec IN
    SELECT wau, new_users, organic_users, chat_messages, week_start
    FROM city_health_metrics
    WHERE city = p_city
    ORDER BY week_start DESC
    LIMIT 6
  LOOP
    IF v_prev_wau IS NULL THEN
      -- Most recent week
      v_current_wau := rec.wau;
      v_organic_pct := CASE WHEN rec.new_users > 0
        THEN (rec.organic_users::numeric / rec.new_users) * 100
        ELSE 0 END;
      v_avg_daily_chat := rec.chat_messages::numeric / 7.0;
      v_prev_wau := rec.wau;
    ELSE
      -- Check if prev week (more recent) was higher than this week
      IF v_prev_wau > rec.wau THEN
        v_weeks_of_growth := v_weeks_of_growth + 1;
      ELSE
        EXIT; -- Growth streak broken
      END IF;
      v_prev_wau := rec.wau;
    END IF;
  END LOOP;

  -- Get peak WAU ever for decline detection
  SELECT COALESCE(MAX(wau), 0) INTO v_peak_wau
  FROM city_health_metrics
  WHERE city = p_city;

  -- Determine tipping point status
  v_status := CASE
    -- Post-tipping: WAU > 150, stable or growing
    WHEN v_current_wau >= 150 AND v_weeks_of_growth >= 2 THEN 'post-tipping'
    -- Declining: Was above 75 but dropping for 2+ weeks
    WHEN v_peak_wau >= 75 AND v_current_wau < v_peak_wau * 0.8 AND v_weeks_of_growth = 0 THEN 'declining'
    -- Tipping: WAU growing 3+ weeks AND organic > 50% AND daily chat > 10
    WHEN v_weeks_of_growth >= 3 AND v_organic_pct > 50 AND v_avg_daily_chat > 10 THEN 'tipping'
    -- Pre-tipping: Everything else
    ELSE 'pre-tipping'
  END;

  -- Build result JSON
  v_result := jsonb_build_object(
    'city', p_city,
    'status', v_status,
    'current_wau', COALESCE(v_current_wau, 0),
    'peak_wau', v_peak_wau,
    'consecutive_growth_weeks', v_weeks_of_growth,
    'organic_signup_pct', ROUND(COALESCE(v_organic_pct, 0), 1),
    'avg_daily_chat', ROUND(COALESCE(v_avg_daily_chat, 0), 1),
    'diagnosis', CASE v_status
      WHEN 'pre-tipping' THEN 'Network has not reached critical mass. Focus on recruiting hard-side users (spot contributors, community builders). Seed city chat daily.'
      WHEN 'tipping' THEN 'Network is approaching self-sustainability! Maintain momentum. Do NOT reduce community seeding yet. Push referral programs.'
      WHEN 'post-tipping' THEN 'Network is self-sustaining. Shift focus from growth to quality and community health. Consider launching next city.'
      WHEN 'declining' THEN 'WARNING: Network is losing momentum. Investigate cause: seasonal? content quality? competitor? Launch re-engagement campaign immediately.'
    END,
    'checked_at', now()
  );

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION compute_city_health_metrics(date) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_city_health_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION detect_city_tipping_point(text) TO authenticated;
