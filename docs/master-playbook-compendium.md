# x/pat Master Playbook Compendium
## 18 Gold-Standard Frameworks — Production Code Reference

*Generated: April 8, 2026 | CTO: Claude | CEO: Alexander Yanez*
*All frameworks implemented as production code in the x/pat codebase.*

---

## SECTION 1: ORIGINAL 15 MASTER PLAYBOOKS

### 1. Chamath Palihapitiya — Growth Team Architecture
**Source:** Facebook Growth Team, "7 friends in 10 days"
**Code:** `sql/growth-accounting.sql`
**Implementation:**
- `growth_accounting_weekly` — MAU = New + Retained + Resurrected - Churned
- `growth_accounting_monthly` — Investor-grade monthly accounting
- `growth_health` — Quick Ratio with status labels (EXCEPTIONAL/HEALTHY/GROWING/SHRINKING)
**Key Metric:** Quick Ratio > 2.0 = healthy growth

### 2. Alex Schultz — Retention & Growth Accounting
**Source:** Stanford CS183B Growth lecture
**Code:** `sql/growth-accounting.sql` (shared with Chamath)
**Implementation:**
- Classic growth equation with week-over-week delta tracking
- Quick Ratio = (New + Resurrected) / Churned
**Key Metric:** WAU growth % week-over-week

### 3. Rahul Vohra — PMF Engine
**Source:** Superhuman, "How Superhuman Built an Engine to Find PMF"
**Code:** `src/components/PMFSurvey.tsx` + `sql/pmf-dashboard-queries.sql`
**Implementation:**
- "Very disappointed" survey with 40% threshold
- City-segmented PMF scores
- Supabase table for response storage
**Key Metric:** >40% "very disappointed" = PMF achieved

### 4. Brian Chesky — Trust Between Strangers
**Source:** Airbnb trust framework
**Code:** `supabase/migrations/20260408000002_chesky_trust_framework.sql` + `src/hooks/useTrust.ts` + `src/components/TrustBadge.tsx` + `src/components/VouchButton.tsx`
**Implementation:**
- Identity verification tiers
- Peer vouch system with dual-blind reviews
- Community Trust Score (0-100)
**Key Metric:** % verified users, avg trust score per city

### 5. Stewart Butterfield — Activation Threshold
**Source:** Slack's "2,000 messages" methodology (93% retention above threshold)
**Code:** `src/hooks/useActivationFunnel.ts` + `src/components/ActivationProgress.tsx` + `src/lib/activationBot.ts`
**Implementation:**
- x/pat threshold: 3 saved spots + 1 chat message
- 48-hour activation window with countdown (Butterfield urgency)
- Bot messages at milestones
- PostHog events at each step
**Key Metric:** Activation rate (target >60% in 48h)

### 6. April Dunford — Positioning
**Source:** "Obviously Awesome" 5-step methodology
**Code:** Consistent branding across all screens + referral system
**Implementation:**
- Position: "The free social app for digital nomads"
- Tagline: "Find spots. Find your people." (29 chars)
- Big Fish, Small Pond strategy (nomads, not all travelers)
**Key Metric:** Unaided recall in user interviews

### 7. Andrew Chen — Cold Start Problem
**Source:** "The Cold Start Problem" + a16z blog
**Code:** `supabase/migrations/20260408000002_city_health_cold_start.sql`
**Implementation:**
- City health scoring with tipping point detection
- Weekly snapshots for trend analysis
- Minimum viable network: 50 users/city
**Key Metric:** Cities above tipping point (50+ active users)

### 8. Nir Eyal — Hook Model
**Source:** "Hooked: How to Build Habit-Forming Products"
**Code:** `src/hooks/useHookCycle.ts` + `src/lib/triggers.ts` + `src/lib/investmentTracker.ts`
**Implementation:**
- All 4 phases: Trigger → Action → Variable Reward → Investment
- Investment tier scoring (switching cost measurement)
- PostHog reporting on hook cycle completion
**Key Metric:** Hook cycle completion rate, investment tier distribution

### 9. Reid Hoffman — Network Effects
**Source:** "Blitzscaling" + LinkedIn Growth Team
**Code:** `sql/network-effects.sql`
**Implementation:**
- "Nomads You May Know" — mutual connections + city overlap scoring
- Personal network value (Metcalfe's Law: n² growth)
- City network density health scoring
- User tiers: ISOLATED → GROWING → CONNECTED → POWER_USER
**Key Metric:** Avg connections/user (target: 5+ in first week for 3x retention)

### 10. Julie Zhuo — Design Excellence
**Source:** "The Making of a Manager" + Facebook Design Team
**Code:** `src/hooks/useDesignMetrics.ts`
**Implementation:**
- 8 core flow trackers (save_spot, send_message, etc.)
- Task completion rate, tap efficiency, error rate
- Quality score per flow (0-100)
- PostHog integration for dashboarding
**Key Metric:** Avg quality score >70, core flows <5 taps

### 11. Sean Ellis — Growth Hacking & ICE Scoring
**Source:** "Hacking Growth" + GrowthHackers.com
**Code:** `sql/experiment-tracking.sql`
**Implementation:**
- ICE scoring: Impact/Confidence/Ease (1-10 each)
- Experiment backlog with prioritization views
- Results dashboard with lift % and win rate
- Category velocity tracking (acquisition, activation, retention, referral, revenue)
- Pre-populated with 10 x/pat experiments
**Key Metric:** Experiment velocity (target: 2-3/week), win rate >30%

### 12. Daniel Ek — Wrapped Viral Mechanics
**Source:** Spotify Wrapped (60M+ social shares/year)
**Code:** `src/screens/TravelWrappedScreen.tsx`
**Implementation:**
- Quarterly recap: cities, spots, connections, messages
- Top category + top city analysis
- Shareable via image export (ShareableCard integration)
- Registered in navigator as modal
**Key Metric:** Share rate (target >20% of active users), K-factor lift

### 13. Whitney Wolfe Herd — Safety-as-Trust Flywheel
**Source:** Bumble's Deception Detector + safety features
**Code:** `src/hooks/useModeration.ts` + `src/components/ReportModal.tsx` + `src/lib/contentModeration.ts`
**Implementation:**
- Report modal with 7 reason types
- Content moderation pipeline
- Blocked users management
- Trust signals in profiles
**Key Metric:** Report rate <2%, resolution time <4h

### 14. Kevin Systrom — Visual Social Design
**Source:** Instagram's visual-first approach
**Code:** `src/components/ShareableCard.tsx` + `src/components/ShareCardModal.tsx`
**Implementation:**
- 4 card types: CityArrival, Milestone, SpotDiscovery, Streak
- Story (1080x1920) + Square (1080x1080) formats
- x/pat watermark on every card
- Native share + save-to-photos
**Key Metric:** Cards generated/user, share-to-install conversion

### 15. Lenny Rachitsky — Retention Benchmarks
**Source:** lennysnewsletter.com retention benchmarks
**Code:** `sql/cohort-retention.sql`
**Implementation:**
- Weekly cohort retention views (D1/D7/D14/D30)
- Rolling retention (any activity within window)
- Auto-alerts when cohorts drop below benchmarks
- Benchmarks: D1 >25%, D7 >15%, D30 >8%
**Key Metric:** D30 retention (target >8%, stretch >15%)

---

## SECTION 2: NEW GOLD-STANDARD PLAYBOOKS

### 16. Onboarding Optimization (Duolingo/TikTok Pattern)
**Source:** Appcues, UserGuiding (92% confidence)
**Code:** `src/hooks/useOnboardingFunnel.ts`
**Key Finding:** Duolingo: delayed signup = +20% DAU. Pre-permission priming = 65% opt-in vs 25%.
**Implementation:**
- Full funnel tracking (11 steps from app_opened to first_spot_saved)
- Anonymous ID for pre-signup analytics
- Step completion timestamps with elapsed time
- Signup conversion attribution (saw map first? tapped spot?)
**Key Metric:** Onboarding completion >85%, time-to-first-value <60s

### 17. Push Notification Strategy (Airship/Duolingo Model)
**Source:** Airship (63M users), Pushwoosh, nGrow (90% confidence)
**Code:** `sql/notification-budget.sql`
**Key Finding:** Weekly notifications = +440% retention. But 46% opt-out at 2-5/week.
**Implementation:**
- Per-channel frequency budget caps (SQL function)
- Quiet hours enforcement (10pm-7am local time)
- Engagement analytics (open rate, dismiss rate by channel)
- Content rules: <10 words, social proof format, content-triggered only
**Key Metric:** Opt-in >55%, open rate >15%, opt-out <5%/month

### 18. Community Management at Scale (InterNations/Airbnb Model)
**Source:** InterNations Handbook, Airbnb Superhost, ISR research (88% confidence)
**Code:** `sql/ambassador-program.sql`
**Key Finding:** InterNations scales with 6,000 unpaid volunteers. Intrinsic motivation (recognition + authority) > cash.
**Implementation:**
- 3-tier system: Scout (10+ spots) → Guide (50+ spots, 3+ events) → Ambassador (100+ spots, 10+ events)
- Auto-evaluation SQL function (weekly via pg_cron)
- City community health dashboard (0-100 score)
- Status labels: PRE_LAUNCH → SEEDING → GROWING → THRIVING
**Key Metric:** 3-5 ambassadors/city, ambassador retention >70%

---

## SECTION 3: UPDATED GROWTH ASSUMPTIONS

### Conversion Funnel (Updated with Playbook Data)

| Stage | Metric | Pre-Playbook | Post-Playbook | Source |
|-------|--------|-------------|---------------|--------|
| Install → Open | — | 100% | 100% | — |
| Open → Map View | Time-to-value | ~45s | <15s | Duolingo delayed signup |
| Map View → Signup | Conversion | ~30% | ~45% | TikTok content-first (+50%) |
| Signup → Activated | 3 spots + 1 msg in 48h | ~40% | ~55% | Butterfield 48h window |
| Activated → D7 | Retention | ~20% | ~30% | Push notifications (+440%) |
| D7 → D30 | Retention | ~10% | ~15% | Hook cycle + streaks |
| D30 → 5+ connections | Network effect | ~15% | ~25% | Hoffman "people you may know" |
| Active → Share | Viral | ~5% | ~15% | Travel Wrapped + shareable cards |

### K-Factor Projection

| Metric | Conservative | Moderate | Optimistic |
|--------|-------------|----------|-----------|
| Invites/user/month | 1.5 | 3.0 | 5.0 |
| Invite → Install | 15% | 25% | 35% |
| K-factor | 0.23 | 0.75 | 1.75 |
| Viral coefficient | Sub-viral | Near-viral | Viral |

### Revenue Timeline (Unchanged — Free App)

| MAU | Monthly Revenue | Source |
|-----|----------------|--------|
| 10K | ~$2,500 | Affiliate clicks |
| 50K | ~$12,500 | Affiliate + data licensing |
| 100K | ~$25,000 | Full hybrid model |
| 300K | ~$83,000 | $1M ARR threshold |

### Break-Even Analysis

| Scenario | MAU Required | Timeline |
|----------|-------------|----------|
| Pre-playbook | ~750 MAU | 6-8 months |
| Post-playbook (conservative) | ~500 MAU | 4-6 months |
| Post-playbook (moderate) | ~350 MAU | 3-4 months |

---

## SECTION 4: CODE LOCATIONS

| Playbook | File(s) | Type |
|----------|---------|------|
| Growth Accounting | `sql/growth-accounting.sql` | SQL views |
| Cohort Retention | `sql/cohort-retention.sql` | SQL views |
| Network Effects | `sql/network-effects.sql` | SQL views |
| Experiment Scoring | `sql/experiment-tracking.sql` | SQL views |
| Notification Budget | `sql/notification-budget.sql` | SQL functions |
| Ambassador Program | `sql/ambassador-program.sql` | SQL functions |
| PMF Dashboard | `sql/pmf-dashboard-queries.sql` | SQL views |
| Hook Cycle | `src/hooks/useHookCycle.ts` | React hook |
| Activation Funnel | `src/hooks/useActivationFunnel.ts` | React hook |
| Design Metrics | `src/hooks/useDesignMetrics.ts` | React hook |
| Onboarding Funnel | `src/hooks/useOnboardingFunnel.ts` | React hook |
| Trust System | `src/hooks/useTrust.ts` | React hook |
| PMF Survey | `src/components/PMFSurvey.tsx` | Component |
| Travel Wrapped | `src/screens/TravelWrappedScreen.tsx` | Screen |
| Shareable Cards | `src/components/ShareableCard.tsx` | Component |
| Moderation | `src/hooks/useModeration.ts` | React hook |
| City Health | `supabase/migrations/20260408000002_city_health_cold_start.sql` | Migration |
| Trust Framework | `supabase/migrations/20260408000002_chesky_trust_framework.sql` | Migration |

---

*This document is the single source of truth for all gold-standard frameworks implemented in x/pat. Updated as new playbooks ship.*
