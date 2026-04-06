# x/pat Data Strategy, Business Intelligence & Analytics Architecture

Compiled April 6, 2026 for x/pat (Aych Holdings LLC)
Stack: Supabase (Postgres 17) + PostHog + BigQuery | Affiliate-only revenue model

---

## Table of Contents

1. [Data Warehouse Architecture](#1-data-warehouse-architecture)
2. [Real-Time Analytics Dashboard](#2-real-time-analytics-dashboard)
3. [Retention Analysis Frameworks](#3-retention-analysis-frameworks)
4. [Funnel Analytics (AARRR)](#4-funnel-analytics-aarrr)
5. [K-Factor & Viral Coefficient](#5-k-factor--viral-coefficient)
6. [Attribution Modeling for Organic Growth](#6-attribution-modeling-for-organic-growth)
7. [Affiliate Revenue Analytics](#7-affiliate-revenue-analytics)
8. [User Segmentation Strategies](#8-user-segmentation-strategies)
9. [A/B Testing Architecture](#9-ab-testing-architecture)
10. [Product Analytics Best Practices](#10-product-analytics-best-practices)
11. [Data Privacy & Anonymization](#11-data-privacy--anonymization)
12. [Predictive Analytics](#12-predictive-analytics)
13. [Location Intelligence](#13-location-intelligence)
14. [Community Health Metrics](#14-community-health-metrics)
15. [Content Analytics](#15-content-analytics)
16. [Search Analytics](#16-search-analytics)
17. [Map Analytics](#17-map-analytics)
18. [Notification Analytics](#18-notification-analytics)
19. [Revenue Forecasting](#19-revenue-forecasting)
20. [Cost Analytics](#20-cost-analytics)
21. [Competitive Intelligence](#21-competitive-intelligence)
22. [User Journey Mapping](#22-user-journey-mapping)
23. [Data-Driven Product Decisions](#23-data-driven-product-decisions)
24. [Executive Reporting Cadence](#24-executive-reporting-cadence)
25. [Data Team Scaling](#25-data-team-scaling)

---

## 1. Data Warehouse Architecture

**Goal**: Replicate Supabase production data into BigQuery for analytics without impacting production performance.

### Architecture: Supabase → BigQuery CDC Pipeline

```
Supabase Postgres 17
        │
        ▼ (Logical Replication / CDC)
   Supabase ETL (Rust-based)
        │
        ▼
   Google BigQuery
        │
        ├── Raw Layer (mirrors production tables)
        ├── Staging Layer (cleaned, deduplicated)
        └── Analytics Layer (aggregated, modeled)
```

### Implementation with x/pat's Stack

**Option A: Native Supabase ETL (Recommended for Phase 1)**
- Supabase ETL is a built-in Rust-based CDC pipeline using logical replication
- Supports BigQuery as a managed destination out of the box
- Setup takes minutes in the Supabase Dashboard
- Creates versioned tables in BigQuery with views for each source table
- At-least-once delivery with automatic retries
- Fast parallel initial copy with configurable batching

**Option B: Supabase BigQuery Wrapper (for bidirectional queries)**
- Enables querying BigQuery directly from Postgres via SQL
- Uses the Wrappers extension with Vault for credential storage
- Good for pulling aggregated analytics back into the app

**Option C: Third-party CDC (Estuary / Stacksync)**
- Estuary establishes a replication slot and streams changes as Flow collections
- Stacksync provides real-time two-way sync within seconds
- Better if you need to fan out to multiple destinations later

### Tables to Replicate (Priority Order)

| Priority | Tables | Reason |
|----------|--------|--------|
| P0 | `profiles`, `affiliate_clicks`, `user_presence` | Revenue + core metrics |
| P0 | `spots`, `posts`, `likes`, `comments` | Content engagement |
| P1 | `follows`, `connections`, `check_ins` | Social graph + activity |
| P1 | `chat_messages`, `chat_members` | Community health |
| P2 | `events`, `event_rsvps`, `travel_plans` | Feature adoption |
| P2 | `city_presence`, `user_availability` | Location intelligence |
| P3 | `reports`, `blocks`, `beta_feedback` | Safety + quality |

### BigQuery Schema Design

```sql
-- Raw layer: exact mirrors with _synced_at timestamp
-- dataset: xpat_raw
CREATE TABLE xpat_raw.profiles AS SELECT * FROM ...;

-- Staging layer: deduplicated, typed, joined
-- dataset: xpat_staging
CREATE TABLE xpat_staging.user_activity_daily AS
SELECT
  user_id,
  DATE(created_at) as activity_date,
  COUNT(DISTINCT CASE WHEN source = 'post' THEN id END) as posts_created,
  COUNT(DISTINCT CASE WHEN source = 'comment' THEN id END) as comments_made,
  COUNT(DISTINCT CASE WHEN source = 'like' THEN id END) as likes_given,
  COUNT(DISTINCT CASE WHEN source = 'spot' THEN id END) as spots_added
FROM xpat_staging.all_user_actions
GROUP BY 1, 2;

-- Analytics layer: business metrics
-- dataset: xpat_analytics
CREATE TABLE xpat_analytics.daily_metrics AS
SELECT
  date,
  dau,
  wau,
  mau,
  new_users,
  affiliate_clicks,
  spots_created,
  posts_created,
  messages_sent,
  events_created
FROM ...;
```

### Cost Estimate
- Supabase ETL: Included in Pro plan ($25/mo)
- BigQuery storage: ~$0.02/GB/month (x/pat will be <1GB for years)
- BigQuery queries: First 1TB/month free, then $5/TB
- **Total estimated cost: $0-5/month for first 2 years**

---

## 2. Real-Time Analytics Dashboard

**Goal**: CEO-level visibility into product health, growth, and revenue without needing to write queries.

### Dashboard Architecture

```
PostHog (Product Events)  ──┐
                             ├──▶  PostHog Dashboards (Primary)
Supabase (Database State)  ──┘
                             ├──▶  BigQuery → Looker Studio (Deep Analysis)
                             └──▶  Supabase Dashboard (Infrastructure)
```

### CEO Dashboard (PostHog — Check Daily)

| Widget | Metric | Type |
|--------|--------|------|
| Users Today | DAU (unique users with any event) | Number |
| Growth Pulse | New signups today vs. 7-day avg | Trend |
| Stickiness | DAU/MAU ratio | Percentage |
| Revenue Signal | Affiliate clicks today | Number |
| Content Velocity | Spots + posts created today | Number |
| Community Pulse | Messages sent today | Number |
| Activation Rate | % new users completing profile in first 24h | Percentage |
| Retention Curve | Day 1, Day 7, Day 30 retention | Line Chart |

### Product Metrics Dashboard (PostHog — Check Weekly)

| Widget | Metric | Type |
|--------|--------|------|
| Feature Adoption | % users using each feature this week | Bar Chart |
| Top Cities | Active users by city | Table |
| Engagement Depth | Actions per session | Distribution |
| Social Graph Growth | New follows + connections this week | Trend |
| Content Mix | Posts vs. spots vs. comments ratio | Pie Chart |
| Session Duration | Median session length | Number |
| Map Engagement | Map views, marker taps, search uses | Funnel |
| Chat Activity | Messages per active chat user | Number |

### Revenue Dashboard (BigQuery + Looker Studio — Check Weekly)

| Widget | Metric | Type |
|--------|--------|------|
| Affiliate Clicks | Total clicks, by partner, by placement | Bar Chart |
| Click-Through Rate | Clicks / impressions by partner | Table |
| Revenue Per User | Estimated affiliate revenue / MAU | Number |
| Top Performing Placements | Which UI locations drive most clicks | Ranked List |
| City Revenue | Affiliate clicks by city context | Map |
| Partner Performance | Click volume + conversion by partner_id | Table |

### Implementation Steps
1. Set up PostHog dashboards using the template builder
2. Create 3 dashboards: CEO Daily, Product Weekly, Revenue Weekly
3. Enable dashboard sharing via URL for non-PostHog users
4. Set up email alerts for anomalies (DAU drops >20%, zero affiliate clicks)

---

## 3. Retention Analysis Frameworks

**Goal**: Understand when and why users leave, and intervene before they do.

### Framework 1: Cohort Retention Matrix

Track weekly signup cohorts and measure what percentage return on Day 1, 7, 14, 30, 60, 90.

**PostHog Implementation**:
- Use built-in Retention insight type
- Cohort = week of first `app_opened` event
- Return event = any `app_opened` event
- View as retention table (triangle matrix)

**Benchmarks for Social/Travel Apps**:
| Period | Poor | Average | Good | Great |
|--------|------|---------|------|-------|
| Day 1 | <15% | 25% | 35% | 45%+ |
| Day 7 | <5% | 11% | 18% | 25%+ |
| Day 30 | <2% | 6% | 12% | 18%+ |

### Framework 2: Survival Curves

Plot the percentage of each cohort still active over time as a curve. The shape reveals:
- **Cliff drop**: Users leave immediately (onboarding problem)
- **Slow bleed**: Gradual decline (value proposition problem)
- **Flattening curve**: Users who stay past X days tend to stay (find the "magic number")

**BigQuery Query**:
```sql
WITH user_first_seen AS (
  SELECT user_id, MIN(DATE(created_at)) as signup_date
  FROM xpat_raw.profiles
  GROUP BY 1
),
daily_activity AS (
  SELECT DISTINCT user_id, DATE(created_at) as activity_date
  FROM xpat_staging.all_user_actions
)
SELECT
  DATE_DIFF(d.activity_date, u.signup_date, DAY) as days_since_signup,
  COUNT(DISTINCT d.user_id) / COUNT(DISTINCT u.user_id) as survival_rate
FROM user_first_seen u
LEFT JOIN daily_activity d ON u.user_id = d.user_id
GROUP BY 1
ORDER BY 1;
```

### Framework 3: Churn Prediction Signals

Track these behavioral indicators that predict churn:

| Signal | Weight | How to Measure |
|--------|--------|----------------|
| No app open in 3 days | High | PostHog inactive user segment |
| Zero social actions (follow/connect) by Day 3 | High | BigQuery query on follows + connections |
| No spot saved by Day 7 | Medium | BigQuery query on saved_spots |
| Only viewed feed, never created content | Medium | PostHog funnel: feed_viewed without post_created |
| Declined push notification permission | Medium | PostHog property: push_enabled = false |
| Profile completion < 40% | Low | Supabase: profile_completion_score < 40 |

### Metrics to Track
- **Resurrection rate**: % of churned users who return
- **Time to churn**: Median days between last activity and churn threshold
- **Churn by acquisition source**: Do users from referrals churn less?
- **Feature correlation with retention**: Which features predict 30-day retention?

---

## 4. Funnel Analytics (AARRR)

**Goal**: Measure conversion at every stage of the user lifecycle.

### x/pat AARRR Funnel Definition

```
AWARENESS  → App Store impression / website visit
    ↓
ACQUISITION → App download + account creation
    ↓
ACTIVATION → Completes profile + saves first spot OR follows first user
    ↓
RETENTION → Returns on Day 7+ and performs ≥1 social action
    ↓
REFERRAL → Shares app / invites friend who signs up
    ↓
REVENUE → Clicks affiliate link (current) / generates booking (future)
```

### Specific Metrics & Targets

| Stage | Metric | Target | PostHog Event |
|-------|--------|--------|---------------|
| Acquisition | Signups/week | Track growth rate | `user_signed_up` |
| Activation | % completing profile to 60%+ within 48h | >40% | `profile_updated` with score ≥ 60 |
| Activation | % saving ≥1 spot within first session | >25% | `spot_saved` |
| Activation | % following ≥1 user within 48h | >30% | `user_followed` |
| Retention | Day 7 return rate | >15% | `app_opened` on day 7+ |
| Retention | Weekly active rate (WAU/total) | >25% | `app_opened` weekly unique |
| Referral | % users who share content | >5% | `content_shared` |
| Referral | Invites sent per user | >0.3 | `invite_sent` |
| Revenue | Affiliate clicks per MAU | >0.5 | `affiliate_link_clicked` |
| Revenue | Click-through rate on affiliate placements | >2% | `affiliate_link_clicked` / `affiliate_impression` |

### PostHog Funnel Implementation

Create a PostHog Funnel insight with these steps:
1. `user_signed_up`
2. `profile_updated` (property: completion_score ≥ 40)
3. `spot_viewed` OR `feed_viewed`
4. `spot_saved` OR `user_followed`
5. `app_opened` (filter: days since signup ≥ 7)
6. `affiliate_link_clicked`

Set conversion window to 30 days. Break down by:
- Acquisition source (organic, referral, ASO)
- City (Bangkok, Lisbon, CDMX)
- Platform (iOS vs Android)

---

## 5. K-Factor & Viral Coefficient

**Goal**: Measure and optimize organic/viral growth.

### K-Factor Formula

```
K = i × c

Where:
  i = average number of invites sent per user
  c = conversion rate of invites (% that become users)
```

**K > 1 = viral growth (exponential)**
**K = 0.15-0.25 = good for consumer apps**
**K = 0.4+ = great**
**K = 0.7+ = outstanding**

### x/pat K-Factor Tracking

**Events to Instrument**:

| Event | Properties | Purpose |
|-------|-----------|---------|
| `invite_sent` | `method` (sms/whatsapp/link/qr), `city_context` | Track i (invites per user) |
| `invite_link_opened` | `referrer_id`, `method` | Track invite reach |
| `user_signed_up` | `referral_source`, `referrer_id` | Track c (conversion) |
| `content_shared` | `content_type` (spot/post/profile), `platform` | Track organic sharing |

**BigQuery K-Factor Calculation**:
```sql
WITH monthly_metrics AS (
  SELECT
    DATE_TRUNC(created_at, MONTH) as month,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as invites_sent
  FROM xpat_raw.invite_events
  GROUP BY 1
),
conversions AS (
  SELECT
    DATE_TRUNC(created_at, MONTH) as month,
    COUNT(*) as referred_signups
  FROM xpat_raw.profiles
  WHERE referral_source IS NOT NULL
  GROUP BY 1
)
SELECT
  m.month,
  m.invites_sent / m.active_users as avg_invites_per_user,  -- i
  c.referred_signups / m.invites_sent as invite_conversion_rate,  -- c
  (m.invites_sent / m.active_users) * (c.referred_signups / m.invites_sent) as k_factor
FROM monthly_metrics m
JOIN conversions c ON m.month = c.month;
```

### Optimization Levers

| Lever | Action | Expected Impact |
|-------|--------|-----------------|
| Increase i | Add share buttons to spot cards, post detail, profile | +30% invites |
| Increase i | "Invite friends in [city]" prompt after Day 3 | +20% invites |
| Increase c | Deep link to specific content (not just app store) | +50% conversion |
| Increase c | Show social proof on invite landing ("Alex saved 12 spots in Bangkok") | +25% conversion |
| Increase c | QR code for in-person sharing at coworking spaces | +40% conversion |

### Privacy Considerations (2025-2026)
- iOS ATT opt-in rates are only 20-45%, limiting attribution accuracy to 80-85%
- Use first-party referral codes rather than relying on ad network attribution
- Implement probabilistic modeling for non-trackable users
- SKAdNetwork integration for iOS App Store attribution

---

## 6. Attribution Modeling for Organic Growth

**Goal**: Understand where users come from when there is no paid marketing.

### Attribution Sources for x/pat

Since x/pat is free-for-life with no paid ads initially, attribution focuses on organic channels:

| Channel | How to Detect | PostHog Property |
|---------|--------------|-----------------|
| App Store organic search | No referrer, ASO keywords | `source: app_store_organic` |
| Word of mouth | User self-reports OR has referral code | `source: word_of_mouth` |
| Referral link | Deep link with referrer_id | `source: referral`, `referrer_id` |
| Social media share | UTM parameters from shared links | `source: social_share`, `utm_medium` |
| Website/waitlist | Came from xpat.social | `source: website` |
| Content shared | Opened a shared spot/post link | `source: shared_content`, `content_id` |
| QR code | Scanned at coworking space/event | `source: qr_code`, `location` |

### Self-Reported Attribution ("How did you hear about us?")

Add a one-question onboarding screen after signup:

```
"How did you find x/pat?"
[ ] A friend told me
[ ] Saw it on social media
[ ] Found it in the App Store
[ ] At a coworking space / event
[ ] Blog / article
[ ] Other: ________
```

Track as PostHog event: `attribution_self_reported` with `source` property.

### Word-of-Mouth Proxy Metrics

Since WOM is hardest to measure directly, use proxies:

| Proxy Metric | Calculation | What It Tells You |
|-------------|-------------|-------------------|
| Organic install velocity | New signups with no referral code per week | Baseline organic growth rate |
| NPS score | Survey question: "Would you recommend x/pat?" | Likelihood of WOM |
| Share rate | % of users who share content externally | Content-driven WOM potential |
| Same-city clusters | Multiple signups from same city within 48h | Likely WOM spread in nomad community |
| Waitlist → signup conversion | Waitlist entries that became users | Website-driven awareness |

### Multi-Touch Attribution Model (When Scaling)

For future paid marketing, implement a weighted multi-touch model:
1. **First touch** (30%): What made them aware
2. **Last touch** (40%): What made them install
3. **Assists** (30%): Touchpoints in between

Use PostHog's built-in attribution reporting for web, and first-party deep links for app.

---

## 7. Affiliate Revenue Analytics

**Goal**: Maximize affiliate revenue by understanding what drives clicks and future conversions.

### Current Schema Analysis

x/pat already has `affiliate_clicks` table with:
- `user_id`, `partner_id`, `placement`, `city_context`, `country_context`, `created_at`

This is a solid foundation. Enhancements needed:

### Enhanced Tracking Schema

```sql
-- Add to affiliate_clicks (via migration)
ALTER TABLE affiliate_clicks ADD COLUMN session_id text;
ALTER TABLE affiliate_clicks ADD COLUMN device_type text;  -- ios/android
ALTER TABLE affiliate_clicks ADD COLUMN app_version text;
ALTER TABLE affiliate_clicks ADD COLUMN spot_id bigint;     -- if click was from a spot
ALTER TABLE affiliate_clicks ADD COLUMN post_id bigint;     -- if click was from a post

-- New table for affiliate impressions
CREATE TABLE affiliate_impressions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  partner_id text NOT NULL,
  placement text NOT NULL,
  city_context text,
  country_context text,
  created_at timestamptz DEFAULT now()
);
```

### Key Affiliate Metrics

| Metric | Formula | Target | Query Source |
|--------|---------|--------|-------------|
| Click-Through Rate (CTR) | clicks / impressions per placement | >2% | BigQuery |
| Clicks Per MAU (CPMU) | total clicks / MAU | >0.5 | BigQuery |
| Revenue Per Click (RPC) | estimated revenue / clicks | Varies by partner | Manual + BigQuery |
| Revenue Per User (RPU) | monthly affiliate revenue / MAU | $0.10+ at scale | BigQuery |
| Partner Share | % of clicks by partner | Diversified | PostHog |
| Placement Effectiveness | CTR ranked by UI placement | Optimize top 3 | BigQuery |
| City Revenue Index | clicks per user by city | Identify best markets | BigQuery |
| Time-to-Click | days from signup to first affiliate click | <14 days | BigQuery |

### BigQuery Revenue Analysis Queries

```sql
-- Top performing placements
SELECT
  placement,
  COUNT(*) as clicks,
  COUNT(DISTINCT user_id) as unique_clickers,
  COUNT(*) * 1.0 / COUNT(DISTINCT user_id) as clicks_per_clicker
FROM xpat_raw.affiliate_clicks
WHERE created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY 1
ORDER BY clicks DESC;

-- Revenue by city context
SELECT
  city_context,
  country_context,
  COUNT(*) as clicks,
  COUNT(DISTINCT user_id) as unique_users
FROM xpat_raw.affiliate_clicks
WHERE city_context IS NOT NULL
GROUP BY 1, 2
ORDER BY clicks DESC;

-- User affiliate journey (time to first click)
SELECT
  PERCENTILE_CONT(days_to_first_click, 0.5) OVER() as median_days,
  AVG(days_to_first_click) as avg_days
FROM (
  SELECT
    a.user_id,
    DATE_DIFF(MIN(a.created_at), p.created_at, DAY) as days_to_first_click
  FROM xpat_raw.affiliate_clicks a
  JOIN xpat_raw.profiles p ON a.user_id = p.id
  GROUP BY 1, p.created_at
);
```

### Partner ROI Framework

When affiliate partnerships go live (beyond "Coming Soon"):

| Partner Type | Expected CPA | Tracking Method |
|-------------|-------------|-----------------|
| Accommodation (Booking.com, Hostelworld) | $2-8 per booking | Postback URL with click_id |
| Coworking (WeWork, Selina) | $5-15 per booking | Promo code attribution |
| Insurance (SafetyWing, World Nomads) | $10-30 per policy | Affiliate network dashboard |
| SIM/eSIM (Airalo, Holafly) | $3-8 per purchase | Postback URL |
| VPN (NordVPN, Surfshark) | $5-12 per subscription | Affiliate link with sub-ID |
| Flights (Skyscanner, Kiwi) | $0.40-1 per click-out | CPC model, tracked automatically |

---

## 8. User Segmentation Strategies

**Goal**: Group users meaningfully to personalize experience and target interventions.

### Behavioral Segments (PostHog)

| Segment | Definition | Size Target | Action |
|---------|-----------|-------------|--------|
| **Power Users** | ≥5 sessions/week + ≥3 actions/session | 10-15% | Feature early access, beta testing |
| **Social Butterflies** | ≥5 follows + ≥3 messages/week | 15-20% | Community features, event notifications |
| **Content Creators** | ≥2 spots or posts/week | 5-10% | UGC prompts, creator highlights |
| **Lurkers** | ≥3 sessions/week but <1 action/session | 20-30% | Activation nudges, simplified actions |
| **At Risk** | No session in 5-7 days after being active | 10-15% | Re-engagement push notification |
| **Dormant** | No session in 14+ days | 15-25% | Email re-engagement campaign |
| **New (< 7 days)** | Signed up within last 7 days | Variable | Onboarding optimization |

### Demographic Segments (Profile Data)

| Segment | Source Field | Use Case |
|---------|-------------|----------|
| By nationality | `profiles.nationality` | Localized content, language |
| By current city | `city_presence.city` | City-specific features, local events |
| By work type | `profiles.work_type` | Coworking affiliate targeting |
| By travel style | `profiles.travel_style` | Content personalization |
| By languages spoken | `profiles.languages` | Chat matching, translation priority |

### Psychographic Segments (Nomad-Specific)

Derived from behavioral patterns + profile data:

| Segment | Indicators | % of Nomads | Affiliate Alignment |
|---------|-----------|-------------|---------------------|
| **Digital Nomad Pro** | Remote work, 3+ countries visited, cowork spots saved | 25% | Coworking, insurance, eSIM |
| **Slow Traveler** | Long stays (30+ days per city), deep local spots | 20% | Long-term stays, local experiences |
| **Social Nomad** | High chat activity, event RSVPs, many connections | 20% | Events, meetups, coworking |
| **Budget Nomad** | Hostel/budget spots saved, price-sensitive searches | 15% | Budget accommodation, eSIM deals |
| **Luxury Nomad** | Premium spots, high-end restaurants saved | 10% | Premium stays, experiences |
| **Explorer** | Many cities, short stays, diverse spot categories | 10% | Flights, travel insurance, gear |

### PostHog Cohort Implementation

```
Cohort: Power Users
Rules:
  - Event "app_opened" performed ≥ 5 times in last 7 days
  AND
  - Event "any_action" performed ≥ 15 times in last 7 days

Cohort: At Risk
Rules:
  - Event "app_opened" performed ≥ 3 times between 14-7 days ago
  AND
  - Event "app_opened" performed 0 times in last 7 days
```

---

## 9. A/B Testing Architecture

**Goal**: Ship features confidently with data-driven validation.

### Architecture: PostHog Feature Flags + Experiments

```
PostHog Feature Flag
        │
        ├── Control (50%) → Existing experience
        └── Variant (50%) → New experience
        │
        ▼
   PostHog measures goal metric
        │
        ▼
   Bayesian or Frequentist analysis
        │
        ▼
   Statistical significance reached → Ship or kill
```

### Implementation with PostHog SDK

PostHog bundles feature flags, experiments, and analytics in one SDK. x/pat already has `posthog-react-native` installed. The flow:

1. Create experiment in PostHog dashboard
2. Define goal metric (e.g., `spot_saved` conversion rate)
3. Set minimum sample size (≥50 exposures per variant, ideally 500+)
4. SDK automatically assigns users to variants
5. PostHog tracks exposures and goal metrics
6. Dashboard shows statistical significance

### Experiment Ideas for x/pat

| Experiment | Hypothesis | Goal Metric | Min Sample |
|-----------|-----------|-------------|------------|
| Onboarding flow length | Shorter onboarding → higher activation | profile_completion ≥ 60% | 200/variant |
| Spot card design | Photo-first cards → more saves | spot_saved rate | 300/variant |
| Affiliate placement | Bottom of spot detail → more clicks | affiliate_link_clicked | 500/variant |
| Feed algorithm | Following-first vs. city-first | session_duration | 300/variant |
| Map default view | City view vs. neighborhood view | map_interaction rate | 200/variant |
| Push notification copy | Emoji vs. no emoji | notification_opened rate | 500/variant |
| Profile prompts | 2 prompts vs. 3 prompts | profile_completion_score | 200/variant |

### Statistical Rigor Guidelines

- **Minimum runtime**: 7 days (avoid day-of-week bias)
- **Pre-register duration**: Decide runtime BEFORE starting (avoid peeking problem)
- **One change at a time**: Isolate the variable being tested
- **Minimum 50 exposures per variant** before viewing results
- **Target 95% significance** for major decisions, 90% for minor UI tweaks
- Use **Bayesian analysis** (PostHog default) for faster convergence with small samples

---

## 10. Product Analytics Best Practices

**Goal**: Clean, consistent event data that enables reliable analysis.

### Event Taxonomy for x/pat

Use the **object_action** pattern with **snake_case**:

#### Core Events

| Category | Event Name | Properties |
|----------|-----------|-----------|
| **Auth** | `user_signed_up` | `method` (apple/google/email), `source`, `referrer_id` |
| **Auth** | `user_signed_in` | `method` |
| **Auth** | `user_signed_out` | — |
| **Profile** | `profile_viewed` | `is_own_profile`, `profile_user_id` |
| **Profile** | `profile_updated` | `fields_changed[]`, `completion_score` |
| **Spot** | `spot_viewed` | `spot_id`, `city`, `category`, `is_seed` |
| **Spot** | `spot_created` | `city`, `category`, `has_photo` |
| **Spot** | `spot_saved` | `spot_id`, `city`, `category` |
| **Spot** | `spot_voted` | `spot_id`, `city` |
| **Post** | `post_viewed` | `post_id`, `has_photo`, `has_spot` |
| **Post** | `post_created` | `has_photo`, `has_spot`, `content_length` |
| **Post** | `post_liked` | `post_id` |
| **Feed** | `feed_viewed` | `feed_type` (home/city/profile) |
| **Feed** | `feed_scrolled` | `items_seen`, `scroll_depth_pct` |
| **Map** | `map_viewed` | `city`, `zoom_level` |
| **Map** | `map_marker_tapped` | `spot_id`, `city`, `category` |
| **Map** | `map_searched` | `query`, `results_count` |
| **Chat** | `chat_opened` | `channel_type` (city/dm/group), `channel_id` |
| **Chat** | `message_sent` | `channel_type`, `has_reply`, `content_length` |
| **Social** | `user_followed` | `target_user_id` |
| **Social** | `user_unfollowed` | `target_user_id` |
| **Social** | `connection_requested` | `target_user_id`, `has_message` |
| **Social** | `connection_accepted` | `requester_id` |
| **Event** | `event_viewed` | `event_id`, `city`, `category` |
| **Event** | `event_rsvped` | `event_id`, `status` (going/interested) |
| **Search** | `search_performed` | `query`, `results_count`, `search_type` (spots/users/cities) |
| **Affiliate** | `affiliate_impression` | `partner_id`, `placement`, `city_context` |
| **Affiliate** | `affiliate_link_clicked` | `partner_id`, `placement`, `city_context`, `spot_id` |
| **Navigation** | `tab_switched` | `from_tab`, `to_tab` |
| **Navigation** | `screen_viewed` | `screen_name` |
| **Notification** | `notification_received` | `type`, `channel` (push/in_app) |
| **Notification** | `notification_opened` | `type`, `channel` |
| **Share** | `content_shared` | `content_type` (spot/post/profile), `platform` (whatsapp/copy/etc) |
| **Invite** | `invite_sent` | `method` (sms/whatsapp/link/qr) |
| **Availability** | `availability_set` | `status` (exploring/working/available/offline) |
| **Travel** | `travel_plan_created` | `city`, `duration_days` |
| **Check-in** | `check_in_created` | `spot_id`, `city` |
| **Feedback** | `feedback_submitted` | `category`, `screen_context` |
| **Report** | `content_reported` | `target_type`, `reason` |

#### Super Properties (Set Once, Sent with Every Event)

| Property | Type | Example |
|----------|------|---------|
| `user_id` | string | UUID |
| `platform` | string | `ios` / `android` |
| `app_version` | string | `1.0.2` |
| `device_model` | string | `iPhone 15` |
| `os_version` | string | `iOS 18.2` |
| `current_city` | string | `Bangkok` |
| `current_country` | string | `Thailand` |
| `signup_date` | date | `2026-04-01` |
| `profile_completion_score` | int | `75` |
| `days_since_signup` | int | `14` |

### Naming Convention Rules

1. **Always snake_case**: `spot_saved` not `SpotSaved` or `Spot Saved`
2. **Object first, then action**: `spot_viewed` not `viewed_spot`
3. **Past tense for completed actions**: `message_sent` not `message_send`
4. **Boolean properties use is_/has_ prefix**: `is_seed`, `has_photo`
5. **Counts end in _count**: `results_count`, `items_seen`
6. **Never include PII in event names**: No email, name in event strings
7. **Use properties for variants, not separate events**: `spot_viewed {category: "cafe"}` not `cafe_spot_viewed`

---

## 11. Data Privacy & Anonymization

**Goal**: GDPR/CCPA compliant analytics from day one.

### Privacy Architecture

```
User Action
    │
    ▼
Consent Check (PostHog optIn/optOut)
    │
    ├── Opted In → Full tracking with pseudonymized user_id
    └── Opted Out → Zero tracking (noopClient already implemented)
```

### What x/pat Already Has Right
- `optOutPostHog()` and `optInPostHog()` functions in `src/lib/posthog.ts`
- PostHog noopClient fallback when no API key or opt-out
- No raw PII in event properties (using UUIDs, not emails)
- RLS enabled on all Supabase tables

### What Needs to Be Added

| Requirement | Implementation | Priority |
|-------------|---------------|----------|
| Consent banner on first launch | Show before initializing PostHog | P0 |
| Record consent timestamp | Store in `user_preferences` table | P0 |
| Data deletion endpoint | Supabase Edge Function to delete user data | P0 |
| IP anonymization | PostHog config: `{ ip: false }` | P0 |
| Data retention policy | Auto-delete PostHog events after 12 months | P1 |
| Cookie-less mode for web | Use PostHog session-only mode | P1 |
| Right to access | Edge Function to export user data as JSON | P1 |
| Anonymize BigQuery exports | Hash user_ids in analytics layer | P2 |

### GDPR Implementation Checklist

```typescript
// Enhanced PostHog init with privacy controls
const client = await PostHog.PostHog.initAsync(POSTHOG_API_KEY, {
  host: POSTHOG_HOST,
  captureMode: 'form',        // Don't autocapture everything
  ip: false,                    // Don't collect IP addresses
  persistence: 'memory',       // Don't persist to disk until consent
  advancedStorage: false,       // Disable device storage
  preloadFeatureFlags: false,   // Don't call home until consent
});
```

### Data Anonymization for BigQuery Analytics

```sql
-- Anonymized user activity table (no PII, no reversible IDs)
CREATE TABLE xpat_analytics.anon_daily_activity AS
SELECT
  SHA256(CAST(user_id AS STRING)) as anon_user_id,
  activity_date,
  posts_created,
  comments_made,
  likes_given,
  spots_added,
  affiliate_clicks,
  current_city,  -- city-level is OK, not precise location
  current_country
FROM xpat_staging.user_activity_daily;
```

### Enforcement Awareness
- GDPR fines reached 5.65B EUR by March 2025 (2,245 fines, avg 2.36M EUR)
- Focus areas: consent verification at the SDK level, not just UI
- PostHog is GDPR-friendly as it can be self-hosted (keeps data in your infrastructure)
- For cloud PostHog, use US or EU hosting based on user location

---

## 12. Predictive Analytics

**Goal**: Predict user behavior to intervene proactively.

### Model 1: Churn Prediction

**When to Build**: After 1,000+ users with 90+ days of behavioral data.

**Features for Churn Model**:

| Feature | Source | Type |
|---------|--------|------|
| Days since last session | PostHog | Numeric |
| Session frequency (7-day avg) | PostHog | Numeric |
| Actions per session trend | PostHog | Numeric (slope) |
| Profile completion score | Supabase | Numeric |
| Social connections count | Supabase (follows + connections) | Numeric |
| Content creation count | Supabase (spots + posts) | Numeric |
| Push notifications enabled | Supabase (push_tokens) | Boolean |
| Days since signup | Supabase | Numeric |
| City changes in last 30 days | Supabase (city_presence) | Numeric |

**Implementation Path**:
1. Phase 1 (Now): Rule-based alerts (no session in 5 days → at-risk segment in PostHog)
2. Phase 2 (1K users): Logistic regression in BigQuery ML
3. Phase 3 (10K users): Gradient boosted model with real-time scoring

**BigQuery ML Example**:
```sql
CREATE MODEL xpat_analytics.churn_predictor
OPTIONS(model_type='logistic_reg', input_label_cols=['churned']) AS
SELECT
  session_frequency_7d,
  actions_per_session,
  profile_completion_score,
  connection_count,
  content_created_count,
  push_enabled,
  days_since_signup,
  CASE WHEN last_session_days_ago > 14 THEN 1 ELSE 0 END as churned
FROM xpat_analytics.user_features;
```

### Model 2: Next-City Prediction

Unique to x/pat's nomad audience. Predict where a user will travel next.

**Features**:
- `travel_plans` table (explicit future plans)
- `city_presence` history (past cities)
- `spots` saved in other cities (implicit interest)
- `profiles.next_destination` (self-reported)
- Seasonal patterns (Bangkok popular Nov-Mar, Lisbon May-Oct)
- Social connections in other cities (friends are there)

**Use Cases**:
- Pre-populate city content before user arrives
- Suggest connections in their next city
- Targeted affiliate offers (accommodation in destination city)
- Event recommendations at destination

### Model 3: Content Quality Prediction

Score UGC quality to prioritize in feed and recommendations:

| Signal | Weight | Source |
|--------|--------|--------|
| Photo included | +20 | `posts.photo_url IS NOT NULL` |
| Content length > 100 chars | +15 | `LENGTH(posts.content)` |
| Likes within 24h | +25 | `post_likes` count |
| Comments received | +25 | `comments` count |
| Author profile score | +10 | `profiles.profile_completion_score` |
| Report count | -50 | `reports` where target = post |
| From seed data | -5 | `posts.is_seed = true` |

---

## 13. Location Intelligence

**Goal**: Understand movement patterns and city popularity to guide product decisions.

### City Analytics Dashboard

| Metric | Query Source | Update Frequency |
|--------|-------------|-----------------|
| Active users per city | `city_presence` table | Real-time |
| Spots per city | `spots` grouped by city | Daily |
| New arrivals per city per week | `city_presence.arrived_at` | Weekly |
| Average stay duration | `city_presence` history | Weekly |
| City chat activity | `chat_messages` in city channels | Daily |
| Events per city | `events` grouped by city | Weekly |
| Top searched cities | PostHog `search_performed` with city queries | Weekly |

### BigQuery City Popularity Analysis

```sql
-- City popularity trends (rolling 30-day active users)
SELECT
  city,
  country,
  DATE_TRUNC(last_active, WEEK) as week,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(DISTINCT user_id) - LAG(COUNT(DISTINCT user_id))
    OVER (PARTITION BY city ORDER BY DATE_TRUNC(last_active, WEEK)) as wow_change
FROM xpat_raw.city_presence
GROUP BY 1, 2, 3
ORDER BY active_users DESC;

-- Movement patterns: where do users go from each city?
WITH city_transitions AS (
  SELECT
    user_id,
    city as from_city,
    LEAD(city) OVER (PARTITION BY user_id ORDER BY arrived_at) as to_city,
    LEAD(arrived_at) OVER (PARTITION BY user_id ORDER BY arrived_at) - arrived_at as stay_duration
  FROM xpat_raw.city_presence_history
)
SELECT
  from_city,
  to_city,
  COUNT(*) as transitions,
  AVG(stay_duration) as avg_stay_before_move
FROM city_transitions
WHERE to_city IS NOT NULL
GROUP BY 1, 2
ORDER BY transitions DESC;
```

### Seasonal Patterns to Track

| City | Peak Season | Off-Season | Data Source |
|------|------------|-----------|------------|
| Bangkok | Nov-Mar | Apr-Jun | city_presence by month |
| Lisbon | May-Oct | Nov-Feb | city_presence by month |
| CDMX | Oct-Apr | Jun-Aug | city_presence by month |
| Bali | Apr-Oct | Nov-Mar | city_presence by month |
| Medellin | Year-round | — | city_presence by month |

### Heatmap Data for City Intelligence

Track spot density and user activity by neighborhood:
- Aggregate `spots.lat/lng` into grid cells (0.005 degree = ~500m)
- Count user check-ins and spot saves per grid cell
- Identify "hot neighborhoods" for content curation and affiliate placement

---

## 14. Community Health Metrics

**Goal**: Measure quality of community interactions, not just quantity.

### Core Health Metrics

| Metric | Formula | Healthy Range | Alert Threshold |
|--------|---------|--------------|-----------------|
| **DAU/MAU Ratio** | Daily active / monthly active | 20-50% | <15% |
| **L7 Engagement** | Users active 5+ of last 7 days / WAU | >15% | <10% |
| **Social Reciprocity** | Mutual follows / total follows | >30% | <20% |
| **Reply Rate** | Messages that are replies / total messages | >25% | <15% |
| **Content Creation Ratio** | Users who created content / MAU | >5% | <2% |
| **Connection Accept Rate** | Accepted connections / total requests | >40% | <25% |
| **Report Rate** | Reports per 1000 interactions | <5 | >10 |
| **Block Rate** | Blocks per 1000 users | <10 | >20 |

### Engagement Quality Score (Per User)

```sql
-- Composite engagement quality score
SELECT
  user_id,
  (
    CASE WHEN posts_created > 0 THEN 20 ELSE 0 END +
    CASE WHEN spots_created > 0 THEN 25 ELSE 0 END +
    CASE WHEN comments_made > 2 THEN 15 ELSE comments_made * 5 END +
    CASE WHEN follows_count > 5 THEN 15 ELSE follows_count * 3 END +
    CASE WHEN messages_sent > 10 THEN 15 ELSE messages_sent * 1.5 END +
    CASE WHEN events_attended > 0 THEN 10 ELSE 0 END
  ) as engagement_quality_score
FROM xpat_analytics.user_monthly_activity;
```

### Toxicity Indicators

| Signal | Detection Method | Severity |
|--------|-----------------|----------|
| Reported content | `reports` table, count per user | High |
| Blocked by others | `blocks` table, count as blocked_id | High |
| Rapid-fire messaging | >20 messages in 5 minutes | Medium |
| Short message spam | Avg message length < 10 chars over 20+ messages | Medium |
| Empty profile + high messaging | profile_completion < 20% + messages > 50 | Medium (possible spam) |
| Multiple reports from different users | 3+ unique reporters in 7 days | Critical |

### Community Health Dashboard (Weekly Review)

| Widget | Source |
|--------|--------|
| DAU/MAU trend line (30 days) | PostHog |
| New content per active user | BigQuery |
| Top 10 most engaged users | BigQuery |
| Reports requiring review | Supabase `reports` where status = 'pending' |
| New connections graph | BigQuery (follows + connections accepted) |
| Chat activity by channel type | BigQuery (city vs. DM vs. group) |
| NPS trend (if surveyed) | PostHog surveys |

---

## 15. Content Analytics

**Goal**: Understand which content drives engagement and guide UGC strategy.

### Spot Performance Metrics

| Metric | Calculation | Source |
|--------|-------------|--------|
| Save rate | saves / views | PostHog (views) + Supabase (saves) |
| Vote rate | votes / views | PostHog + Supabase |
| Comment rate | comments / views | PostHog + Supabase |
| Visit rate | check_ins / saves | Supabase |
| Share rate | shares / views | PostHog |
| Category popularity | spots created by category | Supabase |

### Post Performance Metrics

| Metric | Calculation | Source |
|--------|-------------|--------|
| Like rate | likes / impressions | PostHog + Supabase |
| Comment rate | comments / impressions | PostHog + Supabase |
| Engagement rate | (likes + comments + shares) / impressions | Combined |
| Photo impact | engagement of photo posts vs. text-only | BigQuery |
| Spot-linked impact | engagement of posts with spots vs. without | BigQuery |

### UGC Quality Scoring Algorithm

```sql
-- Content quality score (0-100)
SELECT
  s.id as spot_id,
  s.name,
  s.city,
  (
    CASE WHEN s.photo_url IS NOT NULL THEN 15 ELSE 0 END +
    CASE WHEN LENGTH(s.description) > 50 THEN 10 ELSE 0 END +
    CASE WHEN LENGTH(s.note) > 20 THEN 5 ELSE 0 END +
    CASE WHEN array_length(s.tags, 1) >= 2 THEN 10 ELSE 0 END +
    LEAST(s.votes * 5, 25) +           -- Up to 25 points for votes
    LEAST(save_count * 3, 15) +         -- Up to 15 points for saves
    LEAST(comment_count * 5, 15) +      -- Up to 15 points for comments
    CASE WHEN s.google_place_id IS NOT NULL THEN 5 ELSE 0 END
  ) as quality_score
FROM xpat_raw.spots s
LEFT JOIN (SELECT spot_id, COUNT(*) as save_count FROM xpat_raw.saved_spots GROUP BY 1) sv ON s.id = sv.spot_id
LEFT JOIN (SELECT spot_id, COUNT(*) as comment_count FROM xpat_raw.comments GROUP BY 1) c ON s.id = c.spot_id
WHERE s.is_seed = false
ORDER BY quality_score DESC;
```

### Content Gap Analysis

Identify what users want but don't have:

| Analysis | Method | Action |
|----------|--------|--------|
| Searched but not found | `search_performed` with `results_count = 0` | Seed content for missing categories |
| City with users but no spots | city_presence users vs. spots per city | Prompt spot creation |
| Category imbalance | spots per category per city | Seed underrepresented categories |
| No recent content | Cities with 0 new spots in 30 days | Re-engagement for local users |

---

## 16. Search Analytics

**Goal**: Understand intent and improve search quality.

### Events to Track

| Event | Properties | Purpose |
|-------|-----------|---------|
| `search_performed` | `query`, `search_type`, `results_count`, `city_context` | Core search tracking |
| `search_result_tapped` | `query`, `result_position`, `result_type`, `result_id` | Result quality |
| `search_abandoned` | `query`, `results_count`, `time_spent_ms` | Frustration detection |
| `search_filter_applied` | `filter_type`, `filter_value` | Feature adoption |

### Key Search Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Search usage rate | % of sessions with a search | >20% |
| Zero-result rate | Searches with 0 results / total searches | <10% |
| Search-to-action rate | Searches followed by save/visit/click / total | >15% |
| Click position | Average position of clicked result | <3 |
| Search refinement rate | Searches followed by another search | <30% |
| Time to result | Median time from search to result tap | <5 sec |

### Zero-Result Query Analysis

```sql
-- Top zero-result queries (weekly)
SELECT
  query,
  COUNT(*) as occurrences,
  COUNT(DISTINCT user_id) as unique_users
FROM xpat_analytics.search_events
WHERE results_count = 0
  AND created_at >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY 1
HAVING occurrences >= 3
ORDER BY occurrences DESC
LIMIT 20;
```

This reveals:
- Missing content categories (e.g., users searching "gym" but no gym category)
- Spelling/synonym gaps (e.g., "coffee shop" vs. "cafe")
- New city demand (searches for cities not yet seeded)

### Search Intent Categories

| Intent | Query Pattern | Product Action |
|--------|--------------|----------------|
| Place discovery | "best cafe in Chiang Mai" | Show spot results |
| User discovery | "@username" or person name | Show user results |
| City discovery | City name | Show city overview |
| Category browse | "coworking", "restaurants" | Show filtered spots |
| Navigation | "my saves", "messages" | Deep link to screen |

---

## 17. Map Analytics

**Goal**: Understand how users interact with the map to optimize the map experience.

### Events to Track

| Event | Properties | Purpose |
|-------|-----------|---------|
| `map_viewed` | `city`, `initial_zoom`, `lat`, `lng` | Map usage |
| `map_panned` | `from_city`, `to_area`, `distance_km` | Exploration behavior |
| `map_zoomed` | `from_zoom`, `to_zoom`, `city` | Detail level preference |
| `map_marker_tapped` | `spot_id`, `category`, `city` | Content engagement |
| `map_cluster_tapped` | `cluster_size`, `city`, `zoom` | Cluster behavior |
| `map_searched` | `query`, `results_count` | Search-on-map |
| `map_filter_applied` | `category`, `city` | Feature adoption |
| `map_session_duration` | `duration_ms`, `markers_viewed` | Engagement depth |

### Key Map Metrics

| Metric | Purpose | Target |
|--------|---------|--------|
| Map load rate | % of sessions that open map tab | >40% |
| Avg markers tapped per session | Engagement depth | >3 |
| Map → spot detail conversion | % marker taps that open spot detail | >50% |
| Map → save conversion | % marker taps leading to save | >10% |
| Zoom level distribution | What detail level users prefer | Analyze pattern |
| Pan exploration radius | How far users explore from center | Track trend |

### Heatmap Visualization (BigQuery)

```sql
-- User interaction heatmap data (grid cells ~500m)
SELECT
  ROUND(lat, 3) as grid_lat,     -- ~111m precision
  ROUND(lng, 3) as grid_lng,
  city,
  COUNT(*) as interactions,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT spot_id) as spots_in_area
FROM xpat_analytics.map_interactions
GROUP BY 1, 2, 3
HAVING interactions >= 5
ORDER BY interactions DESC;
```

This data can:
- Identify popular neighborhoods for spot seeding
- Guide affiliate placement (coworking ads in business districts)
- Optimize default map center and zoom per city

---

## 18. Notification Analytics

**Goal**: Maximize notification effectiveness while minimizing opt-outs.

### Notification Events to Track

| Event | Properties | Purpose |
|-------|-----------|---------|
| `notification_permission_requested` | `platform` | Opt-in funnel |
| `notification_permission_granted` | `platform` | Opt-in rate |
| `notification_permission_denied` | `platform` | Opt-out at prompt |
| `notification_sent` | `type`, `channel` (push/in_app/email) | Delivery |
| `notification_delivered` | `type`, `channel` | Delivery rate |
| `notification_opened` | `type`, `channel`, `time_to_open_ms` | Engagement |
| `notification_dismissed` | `type`, `channel` | Disinterest |
| `notification_settings_changed` | `setting`, `old_value`, `new_value` | Opt-out tracking |

### Benchmarks for Travel/Social Apps

| Metric | Industry Avg | Good | Target for x/pat |
|--------|-------------|------|-------------------|
| Push opt-in rate (iOS) | 44% | 55% | 60%+ |
| Push opt-in rate (Android) | 67% | 75% | 80%+ |
| Push click-through rate (iOS) | 4.9% | 8% | 10%+ |
| Push click-through rate (Android) | 10.7% | 14% | 15%+ |
| Opt-out rate per month | 5% | <3% | <2% |

### Notification Performance by Type

Track each notification type separately:

| Notification Type | Expected CTR | Supabase Source |
|-------------------|-------------|-----------------|
| New follower | 12-18% | `follows` table |
| Connection request | 15-25% | `connections` table |
| New message/DM | 20-30% | `chat_messages` / `direct_messages` |
| Nearby x/pat user | 8-15% | `user_availability` |
| Event in your city | 10-18% | `events` table |
| New spot in your city | 6-12% | `spots` table |
| Content liked/commented | 8-14% | `likes` / `comments` |
| Re-engagement (inactive 5d) | 3-8% | PostHog cohort trigger |

### Notification Optimization Framework

```
For each notification type, track:
  Sent → Delivered → Opened → Action Taken → Opt-Out

Calculate:
  - Delivery rate = delivered / sent
  - Open rate = opened / delivered
  - Action rate = action / opened
  - Opt-out rate = opt-outs within 24h of send / sent
  - Net value = (action rate × action value) - (opt-out rate × user value)
```

### Smart Notification Rules

| Rule | Implementation | Impact |
|------|---------------|--------|
| Respect quiet hours | Check `user_preferences.quiet_hours_start/end` | Reduce opt-outs |
| Batch low-priority | Group "new spot" notifications to max 1/day | Reduce fatigue |
| Personalize by city | Include city name in notification copy | +30% CTR |
| A/B test copy | Use PostHog experiments on notification text | Continuous improvement |
| Progressive frequency | New users: max 2/day; Established: max 4/day | Balance engagement vs. fatigue |

---

## 19. Revenue Forecasting

**Goal**: Project affiliate revenue growth to plan business operations.

### Revenue Model Components

Since x/pat is affiliate-only (free for life), revenue = f(users, engagement, affiliate clicks, conversion):

```
Monthly Revenue = MAU × CPMU × Avg Revenue Per Click

Where:
  MAU = Monthly Active Users
  CPMU = Clicks Per Monthly Active User
  Avg RPC = Average Revenue Per Click (varies by partner)
```

### Revenue Forecast Scenarios

| Metric | Conservative | Base | Optimistic |
|--------|-------------|------|-----------|
| Users Month 1 | 100 | 250 | 500 |
| Monthly growth rate | 15% | 25% | 40% |
| MAU at Month 12 | 535 | 2,329 | 13,450 |
| CPMU | 0.3 | 0.5 | 0.8 |
| Avg RPC | $0.30 | $0.50 | $0.75 |
| **Monthly Rev Month 12** | **$48** | **$582** | **$8,070** |
| **Annual Rev Year 1** | **$200** | **$2,000** | **$25,000** |

### Phase-Based Revenue Expectations

| Phase | Users | Revenue/Month | Primary Driver |
|-------|-------|--------------|----------------|
| Beta (Now) | 10-50 | $0 | Affiliate links are "Coming Soon" |
| Soft Launch (Month 1-3) | 50-500 | $5-50 | First real affiliate links go live |
| Growth (Month 4-12) | 500-5,000 | $50-2,000 | SEO + referrals + ASO driving growth |
| Scale (Year 2) | 5,000-50,000 | $2,000-25,000 | Multiple partners, optimized placements |
| Maturity (Year 3+) | 50,000+ | $25,000+ | High-value partners (credit cards, insurance) |

### Revenue Per Partner Type Estimates

| Partner Category | Est. RPC | Volume Potential | Priority |
|-----------------|---------|-----------------|----------|
| Accommodation booking | $2-8/booking | High | P0 |
| Travel insurance | $10-30/policy | Medium | P0 |
| eSIM/data | $3-8/purchase | High | P0 |
| Coworking space | $5-15/booking | Medium | P1 |
| VPN | $5-12/subscription | Low-Medium | P1 |
| Flights (metasearch) | $0.40-1/click | High | P1 |
| Credit cards | $50-200/approval | Low (regulatory) | P2 |

### BigQuery Revenue Forecast Model

```sql
-- Monthly revenue projection (simple growth model)
WITH RECURSIVE months AS (
  SELECT
    1 as month_num,
    250.0 as mau,           -- Starting MAU
    0.5 as cpmu,            -- Clicks per MAU
    0.50 as avg_rpc          -- Avg revenue per click
  UNION ALL
  SELECT
    month_num + 1,
    mau * 1.25,             -- 25% monthly growth
    LEAST(cpmu * 1.05, 1.0), -- CPMU grows 5%/month, caps at 1.0
    avg_rpc                   -- RPC stays constant
  FROM months
  WHERE month_num < 24
)
SELECT
  month_num,
  ROUND(mau) as projected_mau,
  ROUND(mau * cpmu) as projected_clicks,
  ROUND(mau * cpmu * avg_rpc, 2) as projected_revenue
FROM months;
```

---

## 20. Cost Analytics

**Goal**: Track cost per user and feature to make informed infrastructure decisions.

### Current Infrastructure Cost Breakdown

| Service | Monthly Cost | Purpose |
|---------|-------------|---------|
| Supabase Pro | $25 | Database, auth, storage, realtime |
| PostHog Cloud (Free tier) | $0 | Analytics (1M events/month free) |
| EAS Build | Variable | App builds (~$0 with free tier limits) |
| Apple Developer | $8.25/month ($99/yr) | iOS distribution |
| Google Play Developer | $2.08/month ($25 one-time, amortized) | Android distribution |
| Sentry (Free tier) | $0 | Error tracking |
| Domain (xpat.social) | ~$3/month | Website |
| **Total Fixed** | **~$38/month** | — |

### Cost Per User Calculation

```
Cost Per User = Total Infrastructure Cost / MAU

At current costs ($38/month):
  100 MAU = $0.38/user/month
  1,000 MAU = $0.038/user/month
  10,000 MAU = $0.0038/user/month
```

### Scaling Cost Triggers

| Users | Supabase Trigger | PostHog Trigger | Action |
|-------|-----------------|----------------|--------|
| 0-1,000 | Pro plan sufficient | Free tier (1M events) | No action needed |
| 1,000-5,000 | Watch DB size (8GB limit) | May approach 1M events | Monitor |
| 5,000-10,000 | May need Team plan ($599/mo) | PostHog paid ($0.00031/event) | Plan budget |
| 10,000-50,000 | Team plan | ~$150-500/mo PostHog | Revenue must cover |
| 50,000+ | Enterprise consideration | Consider self-hosted PostHog | Architecture review |

### Feature Cost Allocation

| Feature | Primary Cost Driver | Est. % of Infra |
|---------|-------------------|-----------------|
| Authentication | Supabase Auth (included) | 5% |
| Real-time chat | Supabase Realtime (included in Pro, watch concurrent connections) | 20% |
| Image storage | Supabase Storage (included, 100GB Pro) | 15% |
| Map tiles | Apple Maps (free) / Google Maps (free tier) | 10% |
| Search | Supabase full-text search (included) | 5% |
| Analytics | PostHog (free tier) | 0% |
| Push notifications | Expo Push (free) | 0% |
| Database queries | Supabase compute | 45% |

### Cost Monitoring Setup

Track monthly in a simple spreadsheet or BigQuery table:

```sql
CREATE TABLE xpat_analytics.monthly_costs (
  month DATE,
  service TEXT,
  cost_usd NUMERIC,
  mau INT,
  cost_per_user NUMERIC GENERATED ALWAYS AS (cost_usd / NULLIF(mau, 0)) STORED
);
```

---

## 21. Competitive Intelligence

**Goal**: Track competitor apps' performance to benchmark and find opportunities.

### Direct Competitors to Monitor

| App | Category | Why Monitor |
|-----|----------|-------------|
| NomadList | Nomad community | Most direct competitor, city data + community |
| Couchsurfing | Social travel | Community model, events feature |
| Meetup | Events | Local community events |
| Hostelworld | Social travel | Social features in booking app |
| Worldpackers | Travel community | Community + accommodation |
| Fairytrail | Nomad dating/social | Social features for nomads |
| Wanderlog | Travel planning | Spot saving, trip planning |

### Free Competitive Intelligence Tools

| Tool | What It Tracks | Cost |
|------|---------------|------|
| App Store Connect (own app) | Downloads, ratings, keyword rankings | Free |
| Google Play Console (own app) | Downloads, ratings, device stats | Free |
| AppFollow (free tier) | Competitor reviews, ratings trends | Free (limited) |
| SimilarWeb (free tier) | Website traffic estimates | Free (limited) |
| App Store search | Keyword rankings, ASO analysis | Manual |
| Social media monitoring | Competitor mentions, sentiment | Manual |

### Metrics to Track (Monthly)

| Metric | Source | Why |
|--------|--------|-----|
| Competitor App Store rating | Manual check | Quality benchmark |
| Competitor review volume | AppFollow | Growth signal |
| Competitor keyword rankings | App Store search | ASO opportunities |
| Competitor feature updates | App Store "What's New" | Feature parity |
| Competitor social media growth | Instagram/Twitter followers | Marketing effectiveness |
| Competitor pricing changes | Manual check | Business model intelligence |

### Competitive Dashboard (BigQuery + Sheets)

Since you won't pay for Sensor Tower or Similarweb at this stage, track manually in a monthly spreadsheet:

```
| Month | App | Rating | Review Count | Est Downloads | Key Changes |
|-------|-----|--------|-------------|---------------|-------------|
| Apr 26 | NomadList | 4.2 | 1,234 | N/A (web) | Added visa tracker |
| Apr 26 | x/pat | 5.0 | 3 | 10 | Beta launch |
```

As revenue grows, invest in Sensor Tower or AppStoreSpy ($50-200/month) for automated tracking.

---

## 22. User Journey Mapping

**Goal**: Identify the critical path to value and find drop-off points.

### Critical User Journeys

**Journey 1: New User to Activated User**
```
App Store → Download → Open → Sign Up → Profile Setup → Browse Feed →
View Spot → Save Spot → Follow User → Return Day 2 → ACTIVATED
```

**Journey 2: Activated User to Revenue**
```
Browse City → View Spot → See Affiliate Partner → Tap Affiliate Link →
(External: Complete Booking) → REVENUE
```

**Journey 3: User to Community Member**
```
View Profile → Send Connection Request → Accepted → Open Chat →
Send Message → Join City Chat → RSVP Event → COMMUNITY MEMBER
```

### Drop-Off Analysis (PostHog Funnels)

| Step | Expected Drop-off | High Drop-off Action |
|------|-------------------|---------------------|
| Download → Open | 20% never open | ASO + onboarding preview |
| Open → Sign Up | 30% don't sign up | Simplify auth (Apple/Google one-tap) |
| Sign Up → Profile Setup | 40% abandon profile | Reduce required fields, add skip option |
| Profile → First Action | 30% don't engage | Better onboarding content, guided tour |
| First Action → Day 2 Return | 60-75% don't return | Push notification, email Day 1 |
| Day 2 → Day 7 Return | 50% of Day 2 returners | Value reinforcement, social hooks |
| Day 7 → Day 30 Return | 40% of Day 7 returners | Habit formation, notifications |

### PostHog Journey Visualization

Use PostHog's User Paths insight:
1. Set starting event: `user_signed_up`
2. View the most common paths users take
3. Identify unexpected exits (e.g., users viewing settings right after signup = confusion)
4. Filter by cohort (retained vs. churned) to find what retained users do differently

### "Magic Number" Analysis

Find the action that predicts retention. Common patterns in social apps:

| Hypothesis | Test | Predicted Impact |
|-----------|------|-----------------|
| Users who save ≥3 spots in first week retain | Cohort analysis: 3+ saves vs. fewer | If true, optimize for spot saving |
| Users who follow ≥2 people retain | Cohort analysis | If true, suggest follows in onboarding |
| Users who send ≥1 message retain | Cohort analysis | If true, prompt chat engagement |
| Users who create ≥1 post retain | Cohort analysis | If true, lower content creation friction |

**BigQuery "Magic Number" Query**:
```sql
-- Find the action count threshold that predicts 30-day retention
WITH user_actions_week1 AS (
  SELECT
    p.id as user_id,
    COUNT(DISTINCT ss.id) as spots_saved_week1,
    COUNT(DISTINCT f.id) as follows_week1,
    COUNT(DISTINCT cm.id) as messages_week1
  FROM xpat_raw.profiles p
  LEFT JOIN xpat_raw.saved_spots ss ON p.id = ss.user_id
    AND ss.created_at BETWEEN p.created_at AND p.created_at + INTERVAL '7 days'
  LEFT JOIN xpat_raw.follows f ON p.id = f.follower_id
    AND f.created_at BETWEEN p.created_at AND p.created_at + INTERVAL '7 days'
  LEFT JOIN xpat_raw.chat_messages cm ON p.id = cm.sender_id
    AND cm.created_at BETWEEN p.created_at AND p.created_at + INTERVAL '7 days'
  GROUP BY 1
),
retention AS (
  SELECT
    user_id,
    CASE WHEN EXISTS (
      SELECT 1 FROM xpat_staging.daily_activity da
      WHERE da.user_id = r.user_id
        AND da.activity_date >= DATE_ADD(p.created_at, INTERVAL 30 DAY)
    ) THEN 1 ELSE 0 END as retained_30d
  FROM xpat_raw.profiles p
)
SELECT
  spots_saved_week1,
  COUNT(*) as users,
  AVG(retained_30d) as retention_rate
FROM user_actions_week1 ua
JOIN retention r ON ua.user_id = r.user_id
GROUP BY 1
ORDER BY 1;
```

---

## 23. Data-Driven Product Decisions

**Goal**: Use analytics to prioritize what to build next.

### RICE Framework with x/pat Data

| Factor | Data Source | How to Measure |
|--------|-----------|----------------|
| **Reach** | PostHog MAU, feature usage | % of users affected by the feature |
| **Impact** | PostHog experiments, user feedback | Expected improvement to key metric (1-3x) |
| **Confidence** | Data quality + sample size | High/Med/Low based on data volume |
| **Effort** | Engineering estimate | Person-weeks |

```
RICE Score = (Reach × Impact × Confidence) / Effort
```

### Decision Framework for x/pat Features

| Signal | Data Source | Decision |
|--------|-----------|----------|
| High usage + low completion | PostHog funnels | Fix UX friction |
| Low usage + high retention correlation | Retention analysis | Promote/surface feature |
| High search volume + zero results | Search analytics | Build the missing feature |
| High feature flag adoption | A/B test results | Ship to 100% |
| Negative sentiment in feedback | `beta_feedback` table | Investigate + fix |
| Competitor has it, users ask for it | Competitive intel + feedback | Prioritize if aligned |

### Weekly Product Analytics Review

Every Monday, review:

1. **What broke?** — Error rates, crash logs (Sentry), support tickets
2. **What grew?** — DAU/WAU/MAU trends, new feature adoption
3. **What's stuck?** — Funnel drop-offs, low engagement features
4. **What's working?** — High retention features, popular content
5. **What do users want?** — Search queries, beta feedback, zero-result searches

### Feature Impact Tracking Template

For every feature shipped, track:

```
Feature: [Name]
Shipped: [Date]
Hypothesis: [What we expected]
Key Metric: [What we measured]
Baseline: [Metric before shipping]
Result (1 week): [Metric after 1 week]
Result (4 weeks): [Metric after 4 weeks]
Verdict: [Ship/Iterate/Revert]
```

---

## 24. Executive Reporting Cadence

**Goal**: Right information at the right frequency for CEO decision-making.

### Daily Glance (30 seconds — PostHog Dashboard)

Check once per morning on the CEO Dashboard:

| Metric | Source | Alert If |
|--------|--------|----------|
| DAU | PostHog | Drops >25% vs 7-day avg |
| New signups today | PostHog | Zero for 24h |
| Affiliate clicks today | Supabase | — |
| Crash-free rate | Sentry | <95% |
| Pending reports | Supabase | >5 unreviewed |

### Weekly Report (5 minutes — Automated)

Generate every Monday, auto-email or Slack message:

```
=== x/pat Weekly Report (Week of April 6, 2026) ===

GROWTH
  DAU avg: ___  (↑/↓ vs last week)
  WAU: ___
  New signups: ___  (↑/↓ vs last week)
  Churn (users inactive 7d+): ___

ENGAGEMENT
  Actions per user: ___
  Spots created: ___
  Posts created: ___
  Messages sent: ___
  Events created: ___

REVENUE SIGNALS
  Affiliate clicks: ___
  Clicks per MAU: ___
  Top partner: ___
  Top placement: ___

COMMUNITY HEALTH
  New follows: ___
  Connections accepted: ___
  Reports filed: ___
  DAU/MAU ratio: ___

PRODUCT
  Top feature by usage: ___
  Biggest drop-off: ___
  Beta feedback count: ___
  App Store rating: ___

TOP PRIORITY THIS WEEK: [1 sentence from data]
```

### Monthly Board Report (15 minutes — BigQuery + Slides)

| Section | Metrics | Source |
|---------|---------|--------|
| Executive Summary | MAU, MoM growth, revenue, key wins | All |
| Growth | Signups, acquisition channels, K-factor | PostHog + BigQuery |
| Engagement | DAU/MAU, retention curves, feature adoption | PostHog |
| Revenue | Affiliate performance, RPU, partner pipeline | BigQuery |
| Community | Content growth, social graph, health metrics | BigQuery |
| Product | Features shipped, A/B test results, roadmap | Manual + PostHog |
| Competitive | Market changes, competitor updates | Manual |
| Infrastructure | Costs, performance, scaling needs | Supabase + billing |
| Next Month Focus | Top 3 priorities driven by data | Analysis |

### Quarterly Strategic Review (60 minutes)

- Cohort retention analysis (full triangle)
- Revenue forecast update with actuals vs. projections
- User segmentation analysis (who is x/pat actually for?)
- Competitive positioning update
- Infrastructure cost trajectory
- Team/resource planning

---

## 25. Data Team Scaling

**Goal**: Know when to invest in data capabilities vs. DIY.

### Current State: Solo Founder (No Data Team)

Alexander can handle data needs with this stack:

| Need | Tool | Time Investment |
|------|------|----------------|
| Product analytics | PostHog dashboards | 2 hrs/week |
| Business metrics | BigQuery + Looker Studio | 2 hrs/week |
| Revenue tracking | Supabase queries + spreadsheet | 1 hr/week |
| A/B testing | PostHog experiments | 1 hr/week (when running) |
| Weekly report | Automated (BigQuery scheduled query) | 30 min/week |

### When to Get Help

| Milestone | Data Need | Recommendation | Cost |
|-----------|----------|----------------|------|
| **0-1K MAU** | Basic dashboards + event tracking | DIY with PostHog + BigQuery | $0 |
| **1K-5K MAU** | Retention analysis, funnel optimization | Freelance analyst (5-10 hrs/month) | $500-1,000/mo |
| **5K-10K MAU** | Churn prediction, segmentation | Part-time data analyst | $2,000-4,000/mo |
| **10K-50K MAU** | ML models, data pipeline maintenance | First full-time data hire | $8,000-12,000/mo |
| **50K+ MAU** | Real-time ML, personalization | Data engineer + analyst | $15,000-25,000/mo |

### First Data Hire Profile

When x/pat reaches ~5K-10K MAU, hire in this order:

1. **Analytics Engineer** (first hire)
   - Skills: SQL, BigQuery, dbt, dashboards
   - Builds data models, maintains pipelines, creates dashboards
   - Cost: $80K-120K/year (can be remote/contract)

2. **Product Analyst** (second hire, 10K+ MAU)
   - Skills: SQL, Python, statistics, A/B testing
   - Deep-dives into user behavior, designs experiments
   - Cost: $90K-130K/year

3. **Data Scientist** (third hire, 50K+ MAU)
   - Skills: ML, Python, BigQuery ML, recommendation systems
   - Builds churn prediction, content ranking, personalization
   - Cost: $130K-200K/year

### Alternatives to Hiring

| Alternative | When to Use | Cost |
|-------------|-----------|------|
| Claude/AI for SQL queries | Always | $0-20/month |
| Freelance analyst (Upwork) | One-off deep analyses | $50-150/hr |
| Analytics consultant | Quarterly strategic review | $200-400/hr |
| dbt Cloud | Data transformation automation | $100/mo |
| Fivetran/Airbyte | If CDC pipeline needs expand beyond BigQuery | $200+/mo |

---

## Implementation Roadmap

### Phase 1: Foundation (Now — Week 1-2)

- [ ] Implement PostHog event taxonomy (Section 10) in app code
- [ ] Set up 3 PostHog dashboards (CEO Daily, Product Weekly, Revenue Weekly)
- [ ] Add consent banner before PostHog initialization (Section 11)
- [ ] Create `affiliate_impressions` table (Section 7)
- [ ] Set up AARRR funnel in PostHog (Section 4)

### Phase 2: Pipeline (Week 3-4)

- [ ] Enable Supabase ETL → BigQuery replication (Section 1)
- [ ] Create BigQuery datasets: xpat_raw, xpat_staging, xpat_analytics
- [ ] Build daily metrics aggregation query (scheduled in BigQuery)
- [ ] Set up weekly automated report (Section 24)
- [ ] Implement search event tracking (Section 16)

### Phase 3: Intelligence (Month 2-3)

- [ ] Build retention cohort analysis (Section 3)
- [ ] Implement K-factor tracking (Section 5)
- [ ] Set up PostHog cohorts for user segments (Section 8)
- [ ] Run first A/B test with PostHog experiments (Section 9)
- [ ] Build UGC quality scoring query (Section 15)

### Phase 4: Prediction (Month 4-6, needs 1K+ users)

- [ ] Build rule-based churn alerts (PostHog cohort: no activity 5d)
- [ ] Create "magic number" analysis (Section 22)
- [ ] Build city popularity dashboard (Section 13)
- [ ] Implement notification performance tracking (Section 18)
- [ ] First revenue forecast with actuals (Section 19)

### Phase 5: Advanced (Month 6-12, needs 5K+ users)

- [ ] BigQuery ML churn prediction model (Section 12)
- [ ] Next-city prediction model (Section 12)
- [ ] Advanced attribution modeling (Section 6)
- [ ] Content recommendation scoring (Section 15)
- [ ] Cost per feature analysis (Section 20)

---

## Tools & Cost Summary

| Tool | Purpose | Cost | Phase |
|------|---------|------|-------|
| PostHog Cloud | Product analytics, dashboards, experiments | Free (1M events/mo) | 1 |
| Supabase Pro | Database, auth, ETL to BigQuery | $25/mo (already paying) | 1 |
| BigQuery | Data warehouse, analytics queries | Free (1TB queries/mo) | 2 |
| Looker Studio | Dashboard visualization from BigQuery | Free | 2 |
| Google Sheets | Manual competitive tracking, cost tracking | Free | 1 |
| Sentry | Error tracking (already integrated) | Free tier | 1 |
| **Total additional cost** | | **$0/month** | |

---

## Sources

### Data Warehouse & Pipeline
- [BigQuery Wrapper - Supabase Docs](https://supabase.com/docs/guides/database/extensions/wrappers/bigquery)
- [Supabase to BigQuery Real-Time Sync - Estuary](https://estuary.dev/blog/supabase-to-bigquery/)
- [Introducing Supabase ETL](https://supabase.com/blog/introducing-supabase-etl)
- [Supabase ETL GitHub](https://github.com/supabase/etl)
- [Supabase Replication Setup](https://supabase.com/docs/guides/database/replication/replication-setup)

### PostHog & Product Analytics
- [PostHog Real-Time Dashboard Template](https://posthog.com/templates/real-time-dashboard)
- [PostHog Product Analytics](https://posthog.com/product-analytics)
- [PostHog Dashboards Docs](https://posthog.com/docs/product-analytics/dashboards)
- [PostHog AARRR Pirate Funnel](https://posthog.com/product-engineers/aarrr-pirate-funnel)
- [PostHog Experiments Best Practices](https://posthog.com/docs/experiments/best-practices)
- [PostHog Feature Flags Docs](https://posthog.com/docs/feature-flags)
- [PostHog Taxonomy Plugin](https://posthog.com/docs/cdp/transformations/taxonomy-plugin)
- [PostHog Event Naming Conventions](https://posthog.com/questions/best-practices-naming-convention-for-event-names-and-properties)
- [PostHog Analytics 2026 Review - Userpilot](https://userpilot.com/blog/posthog-analytics/)

### Retention & Growth
- [Cohort Retention Analysis - Userpilot](https://userpilot.com/blog/cohort-retention-analysis/)
- [AI-Driven Churn Prediction 2025](https://www.influencers-time.com/ai-driven-churn-prediction-boosts-user-retention-in-2025/)
- [AARRR Metrics - Shopify](https://www.shopify.com/blog/aarrr-metrics)
- [K-Factor for Apps - AppSamurai](https://appsamurai.com/blog/what-is-k-factor-for-apps-and-how-to-calculate/)
- [K-Factor - Adjust](https://www.adjust.com/blog/measuring-k-factor/)
- [K-Factor Benchmarks - Saxifrage](https://www.saxifrage.xyz/post/k-factor-benchmarks)
- [Measuring K-Factor for App Growth - AppTrove](https://apptrove.com/measuring-k-factor-how-to-boost-k-factor-for-your-app/)

### Attribution & Revenue
- [Measuring Organic Growth 2025 - Omniscient Digital](https://beomniscient.com/blog/measuring-organic-growth-in-2025/)
- [Attribution Modeling 2025 - Direct Agents](https://www.directagents.com/marketing-strategy/attribution-meltdown-how-to-navigate-marketing-measurement-in-2025/)
- [Attribution for Organic Growth - Trophy](https://trophy.so/blog/the-attribution-challenge-how-to-track-organic-growth-when-users-dont-click-links)
- [Affiliate Marketing ROI Statistics - WeCanTrack](https://wecantrack.com/insights/affiliate-marketing-roi-statistics/)
- [13 Affiliate Metrics That Matter - Reditus](https://www.getreditus.com/blog/how-to-measure-affiliate-marketing-results/)
- [Revenue Forecasting - RevenueCat State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)

### Segmentation & Privacy
- [User Segmentation Types - Userpilot](https://userpilot.com/blog/types-of-user-segmentation/)
- [Behavioral Segmentation in Tourism - StudySmarter](https://www.studysmarter.co.uk/explanations/hospitality-and-tourism/tourist-behavior/behavioral-segmentation-in-tourism/)
- [Digital Nomad Statistics 2025](https://blog.savvynomad.io/digital-nomad-statistics/)
- [GDPR Compliance Mobile Apps 2026 - SecurePrivacy](https://secureprivacy.ai/blog/gdpr-compliance-mobile-apps)
- [GDPR Compliant Analytics Tools 2026 - Improvado](https://improvado.io/blog/gdpr-compliant-analytics-tools)
- [First-Party Data Collection GDPR CCPA - SecurePrivacy](https://secureprivacy.ai/blog/first-party-data-collection-compliance-gdpr-ccpa-2025)

### Predictive & Location Intelligence
- [Predictive Analytics in Travel - KodyTechnoLab](https://kodytechnolab.com/blog/predictive-analytics-in-travel/)
- [AI/ML in Travel - Django Stars](https://djangostars.com/blog/machine-learning-in-travel-industry/)
- [Location Intelligence Trends 2025 - Dista](https://dista.ai/blog/location-intelligence-trends/)
- [Location Intelligence Guide 2026 - GrowthFactor](https://www.growthfactor.ai/resources/blog/location-intelligence-ultimate-guide)

### Community & Content
- [Community Metrics Explained - Discourse](https://blog.discourse.org/2025/04/20-community-metrics-explained/)
- [DAU WAU MAU Metrics - Userpilot](https://userpilot.com/blog/dau-wau-mau/)
- [Measuring Product Health - Sequoia](https://articles.sequoiacap.com/measuring-product-health)
- [UGC Engagement Statistics 2026 - Archive](https://archive.com/blog/user-generated-content)
- [UGC Data Analytics - Doisz](https://doisz.com/en/blog/user-generated-content-ugc/)

### Notifications & Search
- [Push Notification Statistics 2025 - MobiLoud](https://www.mobiloud.com/blog/push-notification-statistics)
- [Push Notification Benchmarks 2025 - Airship](https://www.airship.com/resources/benchmark-report/mobile-app-push-notification-benchmarks-for-2025/)
- [Push Notification Metrics - CleverTap](https://clevertap.com/blog/push-notification-metrics-ctr-open-rate/)
- [Zero-Result Searches - XGEN AI](https://www.xgen.ai/posts/no-more-zero-results)

### Maps & UX
- [Mobile App Heatmaps Guide - UXCam](https://uxcam.com/blog/mobile-app-heatmaps-guide/)
- [Heatmap Analysis Tools 2026 - UXCam](https://uxcam.com/blog/best-heatmap-analysis-tool/)
- [Mobile App Heatmaps - Contentsquare](https://contentsquare.com/guides/mobile-analytics/heatmaps/)

### Infrastructure & Costs
- [Cloud Cost Optimization Metrics 2026 - SoftwareLogic](https://softwarelogic.co/en/blog/strategic-cloud-cost-optimization-7-key-metrics-in-2026)
- [Tracking Infrastructure Costs - Vantage](https://www.vantage.sh/blog/tracking-infrastructure-costs-for-startups)

### Competitive Intelligence
- [Sensor Tower - App Performance Insights](https://sensortower.com/product/mobile-app/app-performance-insights)
- [Appfigures - ASO & App Intelligence](https://appfigures.com/)
- [Real-Time Competitive Intelligence for Mobile Apps](https://dataprocorp.tech/real-time-competitive-intelligence-for-mobile-apps/)

### User Journeys & Product Decisions
- [Critical User Journey Mapping - Product School](https://productschool.com/blog/user-experience/critical-user-journey)
- [User Journey Analytics - Userpilot](https://userpilot.com/blog/user-journey-analytics/)
- [RICE Framework for Feature Prioritization - OnePM](https://onepm.app/content/rice-framework)
- [Data-Driven Product Management - Product School](https://productschool.com/blog/analytics/using-analytics-to-make-product-decisions)

### Reporting & Team
- [Reporting Cadence for Startups - Glen Coyne](https://www.glencoyne.com/topic/reporting-cadence)
- [David Sacks Operating Cadence - Capitaly](https://www.capitaly.vc/blog/david-sacks-operating-cadence-weekly-metrics-okrs-ceo-dashboard)
- [When to Hire Data Team - VisionWrights](https://visionwrights.com/blog/when-to-hire-a-data-team)
- [Growing Your Data Team - Seattle Data Guy](https://www.theseattledataguy.com/when-should-you-hire-more-data-engineers-and-analysts-how-to-grow-your-data-team/)
- [First Data Hire - Andrew Bartholomew](https://www.abartholomew.com/writing/your-first-data-hire)
- [Event Taxonomy Best Practices - Amplitude](https://amplitude.com/blog/event-taxonomy)
- [Event Naming Conventions - Wudpecker](https://www.wudpecker.io/blog/simple-event-naming-conventions-for-product-analytics)
