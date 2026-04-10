-- =============================================================================
-- EU Digital Services Act (Regulation EU 2022/2065) Compliance
-- =============================================================================
-- Per Research #47, x/pat qualifies for the small enterprise carve-out (Art. 19)
-- which exempts us from Articles 20-28. BUT Articles 11-18 still apply.
--
-- This migration adds DSA-required fields to the reports table for Art. 16
-- (Notice and Action Mechanism) and creates the moderation_actions table for
-- Art. 17 (Statement of Reasons).
--
-- Source: https://eur-lex.europa.eu/eli/reg/2022/2065
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Article 16: Notice and Action Mechanism
-- ─────────────────────────────────────────────────────────────────────────────
-- Reports must capture sufficiently substantiated explanation, electronic
-- location of content, and good-faith confirmation from the notifier.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS good_faith_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolution_action TEXT;

COMMENT ON COLUMN reports.description IS 'DSA Art. 16(2)(a): Sufficiently substantiated explanation of why content is allegedly illegal';
COMMENT ON COLUMN reports.good_faith_confirmed IS 'DSA Art. 16(2)(d): Good-faith confirmation from the notifier';
COMMENT ON COLUMN reports.confirmation_sent_at IS 'DSA Art. 16(5): Timestamp when receipt confirmation was sent to notifier';

-- ─────────────────────────────────────────────────────────────────────────────
-- Article 17: Statement of Reasons
-- ─────────────────────────────────────────────────────────────────────────────
-- Every restriction on user content (removal, visibility limit, suspension,
-- monetization restriction) must produce a statement of reasons containing:
--   • Type of action taken
--   • Facts and circumstances relied on
--   • Whether automated means were used
--   • Specific contractual ground or legal basis
--   • Information on appeal mechanisms

CREATE TABLE IF NOT EXISTS moderation_actions (
  id BIGSERIAL PRIMARY KEY,
  report_id BIGINT REFERENCES reports(id) ON DELETE SET NULL,
  affected_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affected_content_type TEXT NOT NULL CHECK (
    affected_content_type IN ('profile', 'spot', 'post', 'comment', 'message', 'event', 'pulse')
  ),
  affected_content_id TEXT,

  -- Art. 17(1)(a): Type of restriction
  action_type TEXT NOT NULL CHECK (action_type IN (
    'content_removed',
    'content_hidden',
    'visibility_restricted',
    'account_suspended',
    'account_terminated',
    'feature_restricted',
    'monetization_restricted'
  )),

  -- Art. 17(1)(c): Facts and circumstances
  reason_summary TEXT NOT NULL,
  reason_details TEXT,

  -- Art. 17(1)(d): Whether automated means were used
  used_automated_detection BOOLEAN NOT NULL DEFAULT false,

  -- Art. 17(1)(e): Specific contractual ground violated
  violated_clause TEXT NOT NULL,
  violated_clause_url TEXT,

  -- Art. 17(1)(f): Redress information
  appeal_email TEXT NOT NULL DEFAULT 'dsa@xpat.social',
  appeal_deadline TIMESTAMPTZ,

  -- Notification tracking
  notified_at TIMESTAMPTZ,
  notification_method TEXT CHECK (notification_method IN ('in_app', 'email', 'both')),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_user ON moderation_actions(affected_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report ON moderation_actions(report_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_unnotified ON moderation_actions(notified_at) WHERE notified_at IS NULL;

COMMENT ON TABLE moderation_actions IS 'DSA Article 17 — Statement of Reasons audit log for every content restriction';

-- ─────────────────────────────────────────────────────────────────────────────
-- Article 15: Annual Transparency Reporting (data source view)
-- ─────────────────────────────────────────────────────────────────────────────
-- Public view that aggregates moderation activity for the annual DSA
-- transparency report. Refresh annually before publishing.

CREATE OR REPLACE VIEW dsa_transparency_metrics AS
SELECT
  date_trunc('year', created_at) AS reporting_year,
  COUNT(*) FILTER (WHERE good_faith_confirmed) AS notices_received,
  COUNT(*) FILTER (WHERE status = 'resolved') AS notices_acted_upon,
  COUNT(*) FILTER (WHERE status = 'resolved' AND resolution_action = 'no_action') AS notices_dismissed,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
    FILTER (WHERE resolved_at IS NOT NULL) AS avg_response_hours,
  COUNT(*) FILTER (WHERE reason = 'harassment') AS notices_harassment,
  COUNT(*) FILTER (WHERE reason = 'spam') AS notices_spam,
  COUNT(*) FILTER (WHERE reason = 'inappropriate') AS notices_inappropriate
FROM reports
GROUP BY date_trunc('year', created_at)
ORDER BY reporting_year DESC;

-- RLS on moderation_actions: only admin/moderators can read all,
-- affected users can read their own
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY moderation_actions_user_view ON moderation_actions
  FOR SELECT
  USING (affected_user_id = auth.uid());

-- Admin policy left as TODO until admin role is defined in profiles table
