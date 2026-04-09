-- =============================================================================
-- Growth Accounting (Schultz/Chamath Playbook)
-- =============================================================================
-- Alex Schultz's growth accounting equation:
--   MAU(t) = New + Retained + Resurrected - Churned
-- Chamath's "7 friends in 10 days" methodology: measure what drives retention.
--
-- Quick Ratio = (New + Resurrected) / Churned
--   > 1.0 = growing, > 2.0 = healthy, > 4.0 = exceptional
--
-- Source: Alex Schultz "Growth" lecture at Stanford CS183B
-- =============================================================================

-- Weekly active users by category
CREATE OR REPLACE VIEW growth_accounting_weekly AS
WITH
-- Define "active" as any meaningful action in the app
weekly_active AS (
  SELECT DISTINCT
    user_id,
    date_trunc('week', active_date) AS active_week
  FROM (
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
  ) all_activity
),
-- First active week per user
first_seen AS (
  SELECT user_id, MIN(active_week) AS first_week
  FROM weekly_active
  GROUP BY user_id
),
-- Classify each user-week
classified AS (
  SELECT
    wa.active_week,
    wa.user_id,
    CASE
      WHEN wa.active_week = fs.first_week THEN 'new'
      WHEN prev.user_id IS NOT NULL THEN 'retained'
      ELSE 'resurrected'
    END AS user_type
  FROM weekly_active wa
  JOIN first_seen fs ON wa.user_id = fs.user_id
  LEFT JOIN weekly_active prev
    ON wa.user_id = prev.user_id
    AND prev.active_week = wa.active_week - INTERVAL '1 week'
),
-- Churned = active last week but not this week
churned AS (
  SELECT
    wa.active_week + INTERVAL '1 week' AS churn_week,
    wa.user_id
  FROM weekly_active wa
  LEFT JOIN weekly_active next_wa
    ON wa.user_id = next_wa.user_id
    AND next_wa.active_week = wa.active_week + INTERVAL '1 week'
  WHERE next_wa.user_id IS NULL
)
SELECT
  c.active_week AS week,
  COUNT(DISTINCT c.user_id) AS wau,
  COUNT(DISTINCT CASE WHEN c.user_type = 'new' THEN c.user_id END) AS new_users,
  COUNT(DISTINCT CASE WHEN c.user_type = 'retained' THEN c.user_id END) AS retained_users,
  COUNT(DISTINCT CASE WHEN c.user_type = 'resurrected' THEN c.user_id END) AS resurrected_users,
  COUNT(DISTINCT ch.user_id) AS churned_users,
  -- Quick Ratio
  ROUND(
    (COUNT(DISTINCT CASE WHEN c.user_type = 'new' THEN c.user_id END) +
     COUNT(DISTINCT CASE WHEN c.user_type = 'resurrected' THEN c.user_id END))::numeric /
    NULLIF(COUNT(DISTINCT ch.user_id), 0),
    2
  ) AS quick_ratio
FROM classified c
LEFT JOIN churned ch ON ch.churn_week = c.active_week
GROUP BY c.active_week
ORDER BY c.active_week DESC;

-- Monthly growth accounting (for investor reporting)
CREATE OR REPLACE VIEW growth_accounting_monthly AS
WITH
monthly_active AS (
  SELECT DISTINCT
    user_id,
    date_trunc('month', active_date) AS active_month
  FROM (
    SELECT user_id, created_at::date AS active_date FROM spots
    UNION ALL
    SELECT user_id, created_at::date AS active_date FROM city_chat_messages
    UNION ALL
    SELECT user_id, created_at::date AS active_date FROM direct_messages
    UNION ALL
    SELECT user_id, created_at::date AS active_date FROM spot_votes
  ) all_activity
),
first_seen AS (
  SELECT user_id, MIN(active_month) AS first_month
  FROM monthly_active
  GROUP BY user_id
),
classified AS (
  SELECT
    ma.active_month,
    ma.user_id,
    CASE
      WHEN ma.active_month = fs.first_month THEN 'new'
      WHEN prev.user_id IS NOT NULL THEN 'retained'
      ELSE 'resurrected'
    END AS user_type
  FROM monthly_active ma
  JOIN first_seen fs ON ma.user_id = fs.user_id
  LEFT JOIN monthly_active prev
    ON ma.user_id = prev.user_id
    AND prev.active_month = ma.active_month - INTERVAL '1 month'
),
churned AS (
  SELECT
    ma.active_month + INTERVAL '1 month' AS churn_month,
    ma.user_id
  FROM monthly_active ma
  LEFT JOIN monthly_active next_ma
    ON ma.user_id = next_ma.user_id
    AND next_ma.active_month = ma.active_month + INTERVAL '1 month'
  WHERE next_ma.user_id IS NULL
)
SELECT
  c.active_month AS month,
  COUNT(DISTINCT c.user_id) AS mau,
  COUNT(DISTINCT CASE WHEN c.user_type = 'new' THEN c.user_id END) AS new_users,
  COUNT(DISTINCT CASE WHEN c.user_type = 'retained' THEN c.user_id END) AS retained_users,
  COUNT(DISTINCT CASE WHEN c.user_type = 'resurrected' THEN c.user_id END) AS resurrected_users,
  COUNT(DISTINCT ch.user_id) AS churned_users,
  ROUND(
    (COUNT(DISTINCT CASE WHEN c.user_type = 'new' THEN c.user_id END) +
     COUNT(DISTINCT CASE WHEN c.user_type = 'resurrected' THEN c.user_id END))::numeric /
    NULLIF(COUNT(DISTINCT ch.user_id), 0),
    2
  ) AS quick_ratio
FROM classified c
LEFT JOIN churned ch ON ch.churn_month = c.active_month
GROUP BY c.active_month
ORDER BY c.active_month DESC;

-- Growth health dashboard: quick ratio alerts
CREATE OR REPLACE VIEW growth_health AS
SELECT
  week,
  wau,
  new_users,
  retained_users,
  resurrected_users,
  churned_users,
  quick_ratio,
  CASE
    WHEN quick_ratio >= 4.0 THEN 'EXCEPTIONAL'
    WHEN quick_ratio >= 2.0 THEN 'HEALTHY'
    WHEN quick_ratio >= 1.0 THEN 'GROWING'
    WHEN quick_ratio IS NOT NULL THEN 'SHRINKING'
    ELSE 'NO_CHURN'
  END AS growth_status,
  -- Week-over-week WAU change
  wau - LAG(wau) OVER (ORDER BY week) AS wau_delta,
  ROUND(100.0 * (wau - LAG(wau) OVER (ORDER BY week))::numeric /
    NULLIF(LAG(wau) OVER (ORDER BY week), 0), 1) AS wau_growth_pct
FROM growth_accounting_weekly
ORDER BY week DESC;
