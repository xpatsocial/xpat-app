-- Migration: Gamification system — streaks, badges, check-ins, XP
-- Based on gamification-retention-research.md findings

-- ========================
-- USER STREAKS
-- ========================
CREATE TABLE IF NOT EXISTS public.user_streaks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  streak_type text NOT NULL CHECK (streak_type IN ('daily_login', 'spot_visit', 'post_share', 'city_explorer')),
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  streak_freeze_count integer NOT NULL DEFAULT 0, -- "streak freeze" mechanic (Duolingo)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, streak_type)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON public.user_streaks (user_id);

-- ========================
-- XP & LEVELS
-- ========================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_level integer NOT NULL DEFAULT 1;

-- XP transaction log (auditable, feeds leaderboards)
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL, -- 'spot_check_in', 'post_created', 'first_review', etc.
  reference_id uuid, -- id of the spot, post, etc.
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON public.xp_transactions (user_id, created_at DESC);

-- ========================
-- BADGES / ACHIEVEMENTS
-- ========================
CREATE TABLE IF NOT EXISTS public.badges (
  id text PRIMARY KEY, -- 'first_check_in', 'city_mayor_bangkok', etc.
  name text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL, -- maps to Ionicons icon name
  category text NOT NULL CHECK (category IN ('explorer', 'social', 'contributor', 'city', 'streak', 'special')),
  xp_reward integer NOT NULL DEFAULT 0,
  is_secret boolean NOT NULL DEFAULT false -- hidden until unlocked
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id text NOT NULL REFERENCES public.badges(id),
  earned_at timestamptz DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges (user_id, earned_at DESC);

-- ========================
-- SPOT CHECK-INS
-- ========================
CREATE TABLE IF NOT EXISTS public.check_ins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  spot_id uuid NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  method text NOT NULL DEFAULT 'manual' CHECK (method IN ('manual', 'nfc', 'qr', 'geofence')),
  noise_level text CHECK (noise_level IN ('silent', 'quiet', 'moderate', 'loud')),
  wifi_speed_mbps integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON public.check_ins (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_check_ins_spot_id ON public.check_ins (spot_id, created_at DESC);

-- Check-in count on spots
ALTER TABLE public.spots ADD COLUMN IF NOT EXISTS check_in_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_spot_check_in_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.spots SET check_in_count = check_in_count + 1 WHERE id = NEW.spot_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.spots SET check_in_count = GREATEST(0, check_in_count - 1) WHERE id = OLD.spot_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_in_count ON public.check_ins;
CREATE TRIGGER trg_check_in_count
  AFTER INSERT OR DELETE ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.update_spot_check_in_count();

-- ========================
-- SEED BADGES
-- ========================
INSERT INTO public.badges (id, name, description, icon_name, category, xp_reward, is_secret)
VALUES
  ('first_check_in',     'First Check-In',         'Checked in at your first spot',             'location-sharp',       'explorer',    50,  false),
  ('city_explorer_5',    'City Explorer',           'Checked in at 5 different spots',           'map-sharp',            'explorer',    100, false),
  ('city_explorer_25',   'Seasoned Nomad',          'Checked in at 25 different spots',          'compass-sharp',        'explorer',    250, false),
  ('city_explorer_100',  'Legendary Nomad',         'Checked in at 100 different spots',         'trophy-sharp',         'explorer',    1000,false),
  ('first_post',         'Storyteller',             'Shared your first post',                    'camera-sharp',         'contributor', 50,  false),
  ('first_spot',         'Spot Creator',            'Added your first spot to the map',          'add-circle-sharp',     'contributor', 100, false),
  ('connector_5',        'Connector',               'Made 5 connections',                        'people-sharp',         'social',      75,  false),
  ('streak_7',           '7-Day Streak',            'Logged in 7 days in a row',                 'flame-sharp',          'streak',      100, false),
  ('streak_30',          '30-Day Streak',           'Logged in 30 days in a row',                'flame-sharp',          'streak',      500, false),
  ('streak_100',         'Century',                 '100-day login streak',                      'medal-sharp',          'streak',      2000,true),
  ('nfc_check_in',       'Tap In',                  'Checked in using NFC tap',                  'radio-sharp',          'special',     150, false),
  ('city_contributor',   'City Contributor',        'Added 10 spots in one city',                'business-sharp',       'city',        300, false),
  ('wifi_reporter',      'WiFi Scout',              'Reported WiFi speed at 5 spots',            'wifi-sharp',           'contributor', 75,  false),
  ('early_adopter',      'Early Adopter',           'Joined x/pat in the founding year',         'star-sharp',           'special',     500, true),
  ('verified_nomad',     'Verified Nomad',          'Identity verified — trusted community member','shield-checkmark-sharp','special',  200, false)
ON CONFLICT (id) DO NOTHING;

-- ========================
-- RLS
-- ========================
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own streaks" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own streaks" ON public.user_streaks FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own XP" ON public.xp_transactions FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are public" ON public.badges FOR SELECT USING (true);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are public" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System inserts badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own check-ins" ON public.check_ins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Check-ins are public" ON public.check_ins FOR SELECT USING (true);
