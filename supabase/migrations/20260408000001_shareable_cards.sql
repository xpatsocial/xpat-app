-- Shareable cards tracking table
-- Records when users generate and share branded cards
CREATE TABLE IF NOT EXISTS shareable_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('city_arrival', 'milestone', 'spot_discovery', 'streak')),
  metadata jsonb DEFAULT '{}'::jsonb,
  shared_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE shareable_cards ENABLE ROW LEVEL SECURITY;

-- Users can insert their own share records
CREATE POLICY "Users can insert own shares"
  ON shareable_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own share history
CREATE POLICY "Users can read own shares"
  ON shareable_cards FOR SELECT
  USING (auth.uid() = user_id);

-- Index for analytics queries
CREATE INDEX idx_shareable_cards_user ON shareable_cards(user_id);
CREATE INDEX idx_shareable_cards_type ON shareable_cards(card_type);
