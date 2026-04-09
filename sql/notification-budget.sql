-- =============================================================================
-- Push Notification Budget System (Gold Standard: Airship + Duolingo Research)
-- =============================================================================
-- Data: Weekly notifications = +440% retention (Airship, 63M users)
-- But: 46% opt-out at 2-5/week, 64% uninstall at 5+/week
-- Strategy: Per-channel frequency caps, social proof copy, local timezone
--
-- Sources:
-- - Airship study via MobiLoud: mobiloud.com/blog/push-notification-statistics
-- - Pushwoosh: pushwoosh.com/blog/push-notification-best-practices/
-- - Duolingo retention: ngrow.ai/blog/decoding-duolingo
-- =============================================================================

-- Notification log for tracking delivery + engagement
-- CREATE TABLE IF NOT EXISTS notification_log (
--   id BIGSERIAL PRIMARY KEY,
--   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
--   channel TEXT NOT NULL CHECK (channel IN (
--     'chat', 'social', 'spots', 'events', 'nearby', 'system', 'streak'
--   )),
--   title TEXT NOT NULL,
--   body TEXT NOT NULL,
--   sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
--   opened_at TIMESTAMPTZ,
--   dismissed_at TIMESTAMPTZ,
--   metadata JSONB DEFAULT '{}'
-- );
-- CREATE INDEX idx_notification_log_user_sent ON notification_log(user_id, sent_at DESC);

-- Per-channel weekly budget caps (based on research)
-- chat: unlimited (content-triggered, WhatsApp pattern)
-- social: 2/week max (social proof: "5 nomads saved Cafe XYZ near you")
-- spots: 2/week max (new spots in your city)
-- events: 3/week max (RSVP reminders: 24h + 2h before)
-- streak: 1/day max (Duolingo pattern: streak at risk)
-- system: 1/week max (weekly digest)
-- nearby: 1/week max (nomads near you)

CREATE OR REPLACE FUNCTION check_notification_budget(
  p_user_id UUID,
  p_channel TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_budget INT;
  v_window INTERVAL;
BEGIN
  -- Channel budgets (based on research: 3-4 total/week optimal)
  CASE p_channel
    WHEN 'chat' THEN v_budget := 999; v_window := '1 day';     -- unlimited
    WHEN 'social' THEN v_budget := 2; v_window := '7 days';
    WHEN 'spots' THEN v_budget := 2; v_window := '7 days';
    WHEN 'events' THEN v_budget := 3; v_window := '7 days';
    WHEN 'streak' THEN v_budget := 1; v_window := '1 day';
    WHEN 'system' THEN v_budget := 1; v_window := '7 days';
    WHEN 'nearby' THEN v_budget := 1; v_window := '7 days';
    ELSE v_budget := 1; v_window := '7 days';
  END CASE;

  -- Count recent notifications in this channel
  SELECT COUNT(*) INTO v_count
  FROM notification_log
  WHERE user_id = p_user_id
    AND channel = p_channel
    AND sent_at > now() - v_window;

  RETURN v_count < v_budget;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notification engagement analytics
CREATE OR REPLACE VIEW notification_engagement AS
SELECT
  channel,
  COUNT(*) AS total_sent,
  COUNT(opened_at) AS total_opened,
  COUNT(dismissed_at) AS total_dismissed,
  ROUND(100.0 * COUNT(opened_at) / NULLIF(COUNT(*), 0), 1) AS open_rate_pct,
  ROUND(100.0 * COUNT(dismissed_at) / NULLIF(COUNT(*), 0), 1) AS dismiss_rate_pct,
  -- Average time to open
  AVG(EXTRACT(EPOCH FROM (opened_at - sent_at))) FILTER (WHERE opened_at IS NOT NULL)
    AS avg_open_delay_seconds
FROM notification_log
WHERE sent_at > now() - INTERVAL '30 days'
GROUP BY channel
ORDER BY open_rate_pct DESC;

-- Quiet hours check (10pm-7am local time)
-- Requires user timezone stored in profiles
CREATE OR REPLACE FUNCTION is_quiet_hours(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tz TEXT;
  v_local_hour INT;
BEGIN
  SELECT COALESCE(timezone, 'UTC') INTO v_tz FROM profiles WHERE id = p_user_id;
  v_local_hour := EXTRACT(HOUR FROM now() AT TIME ZONE v_tz);
  RETURN v_local_hour >= 22 OR v_local_hour < 7;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
