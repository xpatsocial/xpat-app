-- =============================================================================
-- ICE Experiment Scoring Framework (Sean Ellis Playbook)
-- =============================================================================
-- Sean Ellis's ICE framework: rank growth experiments by:
--   Impact (1-10): How much will this move the needle?
--   Confidence (1-10): How sure are we it will work?
--   Ease (1-10): How easy is it to implement?
--   ICE Score = (Impact + Confidence + Ease) / 3
--
-- Source: GrowthHackers.com, "Hacking Growth" (Sean Ellis & Morgan Brown)
-- =============================================================================

-- Experiments table (create via migration when ready)
-- CREATE TABLE IF NOT EXISTS experiments (
--   id SERIAL PRIMARY KEY,
--   name TEXT NOT NULL,
--   hypothesis TEXT NOT NULL,
--   category TEXT NOT NULL CHECK (category IN (
--     'acquisition', 'activation', 'retention', 'referral', 'revenue'
--   )),
--   impact INT NOT NULL CHECK (impact BETWEEN 1 AND 10),
--   confidence INT NOT NULL CHECK (confidence BETWEEN 1 AND 10),
--   ease INT NOT NULL CHECK (ease BETWEEN 1 AND 10),
--   status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
--     'proposed', 'in_progress', 'completed', 'abandoned'
--   )),
--   result TEXT,
--   metric_before NUMERIC,
--   metric_after NUMERIC,
--   metric_name TEXT,
--   created_by TEXT REFERENCES auth.users(id),
--   created_at TIMESTAMPTZ DEFAULT now(),
--   started_at TIMESTAMPTZ,
--   completed_at TIMESTAMPTZ
-- );

-- ICE-scored experiment backlog (prioritized)
-- This view works once the experiments table exists
CREATE OR REPLACE VIEW experiment_backlog AS
SELECT
  id,
  name,
  hypothesis,
  category,
  impact,
  confidence,
  ease,
  ROUND((impact + confidence + ease)::numeric / 3, 1) AS ice_score,
  status,
  created_at
FROM experiments
WHERE status IN ('proposed', 'in_progress')
ORDER BY
  -- In-progress first, then by ICE score
  CASE WHEN status = 'in_progress' THEN 0 ELSE 1 END,
  (impact + confidence + ease) DESC;

-- Experiment results dashboard
CREATE OR REPLACE VIEW experiment_results AS
SELECT
  id,
  name,
  category,
  ROUND((impact + confidence + ease)::numeric / 3, 1) AS ice_score,
  status,
  metric_name,
  metric_before,
  metric_after,
  CASE
    WHEN metric_before IS NOT NULL AND metric_after IS NOT NULL AND metric_before > 0
    THEN ROUND(100.0 * (metric_after - metric_before) / metric_before, 1)
    ELSE NULL
  END AS lift_pct,
  CASE
    WHEN metric_after > metric_before THEN 'WIN'
    WHEN metric_after = metric_before THEN 'NEUTRAL'
    ELSE 'LOSS'
  END AS outcome,
  result,
  completed_at - started_at AS duration,
  completed_at
FROM experiments
WHERE status = 'completed'
ORDER BY completed_at DESC;

-- Category-level experiment velocity
CREATE OR REPLACE VIEW experiment_velocity AS
SELECT
  category,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE status = 'proposed') AS backlog,
  COUNT(*) FILTER (WHERE status = 'completed' AND metric_after > metric_before) AS wins,
  ROUND(100.0 *
    COUNT(*) FILTER (WHERE status = 'completed' AND metric_after > metric_before)::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0),
  1) AS win_rate_pct,
  ROUND(AVG(CASE WHEN status = 'completed'
    THEN (impact + confidence + ease)::numeric / 3 END), 1) AS avg_ice_completed
FROM experiments
GROUP BY category
ORDER BY completed DESC;

-- =============================================================================
-- Pre-populated experiment backlog for x/pat launch
-- Run this INSERT after creating the experiments table
-- =============================================================================
-- INSERT INTO experiments (name, hypothesis, category, impact, confidence, ease) VALUES
-- ('Map before onboarding',       'Showing map before signup will increase D1 retention by 20%',           'activation',  9, 7, 6),
-- ('48h activation countdown UI',  'Visible countdown creates urgency, increasing activation rate by 15%', 'activation',  8, 6, 7),
-- ('Travel Wrapped cards',         'Shareable recap cards will drive K-factor from 0.1 to 0.3',            'referral',    9, 5, 5),
-- ('Weekly city spotlight push',   'Monday push with city highlights will improve W1 retention by 10%',    'retention',   7, 6, 8),
-- ('Nomads you may know',          'Connection suggestions will increase messages/user by 25%',            'retention',   8, 5, 4),
-- ('Cafe/wifi keyword ASO',        'Adding cafe+wifi keywords will increase organic installs by 10%',      'acquisition', 6, 7, 9),
-- ('Referral prompt after vouch',  'Prompting share after receiving a vouch will increase referrals 20%',  'referral',    7, 6, 8),
-- ('Streak freeze notification',   'Warning before streak breaks will reduce streak-break churn by 30%',   'retention',   7, 7, 8),
-- ('City ambassador program',      'Recruiting 3 ambassadors/city will seed 50+ spots in 2 weeks',        'acquisition', 8, 6, 5),
-- ('Skeleton screens everywhere',  'Replacing spinners with skeletons will improve perceived speed 40%',   'activation',  6, 8, 7);
