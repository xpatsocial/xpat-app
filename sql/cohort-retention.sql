-- =============================================================================
-- Cohort Retention Analysis (Rachitsky Playbook)
-- =============================================================================
-- Lenny Rachitsky's retention benchmarks for social apps:
--   D1 > 25%, D7 > 15%, D30 > 8%
-- Source: lennysnewsletter.com/p/what-is-good-retention-issue-29
-- =============================================================================

-- Weekly signup cohorts with D1/D7/D14/D30 retention
CREATE OR REPLACE VIEW retention_cohorts AS
WITH cohorts AS (
  SELECT
    id AS user_id,
    date_trunc('week', created_at) AS cohort_week,
    created_at::date AS signup_date
  FROM auth.users
),
activity AS (
  -- Union all meaningful user actions as "active" signals
  SELECT user_id, created_at::date AS active_date FROM spots
  UNION ALL
  SELECT user_id, created_at::date AS active_date FROM city_chat_messages
  UNION ALL
  SELECT user_id, created_at::date AS active_date FROM direct_messages
  UNION ALL
  SELECT user_id, created_at::date AS active_date FROM spot_votes
  UNION ALL
  SELECT created_by AS user_id, created_at::date AS active_date FROM events
  WHERE created_by IS NOT NULL
),
retention AS (
  SELECT
    c.cohort_week,
    c.user_id,
    c.signup_date,
    a.active_date,
    (a.active_date - c.signup_date) AS days_since_signup
  FROM cohorts c
  INNER JOIN activity a ON c.user_id = a.user_id
)
SELECT
  cohort_week,
  COUNT(DISTINCT user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN days_since_signup = 1 THEN user_id END) AS d1_retained,
  COUNT(DISTINCT CASE WHEN days_since_signup = 7 THEN user_id END) AS d7_retained,
  COUNT(DISTINCT CASE WHEN days_since_signup = 14 THEN user_id END) AS d14_retained,
  COUNT(DISTINCT CASE WHEN days_since_signup = 30 THEN user_id END) AS d30_retained,
  -- Retention rates
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN days_since_signup = 1 THEN user_id END) /
    NULLIF(COUNT(DISTINCT user_id), 0), 1) AS d1_pct,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN days_since_signup = 7 THEN user_id END) /
    NULLIF(COUNT(DISTINCT user_id), 0), 1) AS d7_pct,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN days_since_signup = 14 THEN user_id END) /
    NULLIF(COUNT(DISTINCT user_id), 0), 1) AS d14_pct,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN days_since_signup = 30 THEN user_id END) /
    NULLIF(COUNT(DISTINCT user_id), 0), 1) AS d30_pct
FROM retention
GROUP BY cohort_week
ORDER BY cohort_week DESC;

-- Rolling retention curve (any activity within the window, not just exact day)
CREATE OR REPLACE VIEW retention_rolling AS
WITH cohorts AS (
  SELECT
    id AS user_id,
    date_trunc('week', created_at) AS cohort_week,
    created_at::date AS signup_date
  FROM auth.users
),
activity AS (
  SELECT user_id, created_at::date AS active_date FROM spots
  UNION ALL
  SELECT user_id, created_at::date AS active_date FROM city_chat_messages
  UNION ALL
  SELECT user_id, created_at::date AS active_date FROM direct_messages
  UNION ALL
  SELECT user_id, created_at::date AS active_date FROM spot_votes
),
user_windows AS (
  SELECT
    c.cohort_week,
    c.user_id,
    -- Was user active in each window?
    BOOL_OR(a.active_date BETWEEN c.signup_date + 1 AND c.signup_date + 1) AS active_d1,
    BOOL_OR(a.active_date BETWEEN c.signup_date + 2 AND c.signup_date + 7) AS active_w1,
    BOOL_OR(a.active_date BETWEEN c.signup_date + 8 AND c.signup_date + 14) AS active_w2,
    BOOL_OR(a.active_date BETWEEN c.signup_date + 15 AND c.signup_date + 30) AS active_m1
  FROM cohorts c
  LEFT JOIN activity a ON c.user_id = a.user_id
  GROUP BY c.cohort_week, c.user_id
)
SELECT
  cohort_week,
  COUNT(*) AS cohort_size,
  ROUND(100.0 * COUNT(*) FILTER (WHERE active_d1) / COUNT(*), 1) AS d1_rolling_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE active_w1) / COUNT(*), 1) AS w1_rolling_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE active_w2) / COUNT(*), 1) AS w2_rolling_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE active_m1) / COUNT(*), 1) AS m1_rolling_pct
FROM user_windows
GROUP BY cohort_week
ORDER BY cohort_week DESC;

-- Rachitsky benchmark alerts: flag cohorts below thresholds
CREATE OR REPLACE VIEW retention_alerts AS
SELECT
  cohort_week,
  cohort_size,
  d1_pct,
  d7_pct,
  d30_pct,
  CASE WHEN d1_pct < 25 THEN 'BELOW_BENCHMARK' ELSE 'OK' END AS d1_status,
  CASE WHEN d7_pct < 15 THEN 'BELOW_BENCHMARK' ELSE 'OK' END AS d7_status,
  CASE WHEN d30_pct < 8 THEN 'BELOW_BENCHMARK' ELSE 'OK' END AS d30_status,
  -- Overall health
  CASE
    WHEN d1_pct >= 25 AND d7_pct >= 15 AND d30_pct >= 8 THEN 'HEALTHY'
    WHEN d1_pct < 25 AND d7_pct < 15 THEN 'CRITICAL'
    ELSE 'WARNING'
  END AS retention_health
FROM retention_cohorts
WHERE cohort_size >= 10  -- Only alert on statistically meaningful cohorts
ORDER BY cohort_week DESC;
