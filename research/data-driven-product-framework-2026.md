# Data-Driven Product Decision Framework for x/pat

**Research Report** | April 2026 | CTO Office

---

## Executive Summary

This report establishes a complete data-driven product decision framework for x/pat, covering North Star Metric selection, analytics infrastructure, cohort analysis methodology, experimentation strategy, leading/lagging indicators, feature development prioritization, privacy-preserving analytics, and dashboard design. The framework is built on x/pat's existing PostHog + Sentry + Supabase stack and accounts for the realities of a pre-launch/early-launch product with a small but growing user base. Every recommendation maps to x/pat's current analytics implementation (40+ tracked events, MMKV persistence, feature flags, GDPR consent) and provides a clear path from day-1 launch through the first 10,000 MAU.

---

## 1. North Star Metric Selection

### Why a North Star Metric Matters

The North Star Metric (NSM) is the single measurement that best captures the core value your product delivers to users. Sean Ellis popularized the concept to force alignment: if the NSM goes up, the business is healthy. If it drops, something is broken. For a solo founder, this focus is critical -- you cannot track 30 dashboards. You need one number that tells you whether x/pat is winning.

### Candidate NSMs for x/pat

| Candidate | What It Measures | Pros | Cons |
|-----------|-----------------|------|------|
| **Weekly Active Explorers (WAE)** | Unique users who viewed 3+ spots or checked in at least once in a 7-day window | Captures core product value (discovery); weekly cadence matches nomad lifestyle; actionable | Doesn't capture social value; may plateau if spot content stagnates |
| **Spots Saved per Week** | Total spots saved across all users per week | Direct measure of content engagement; correlates with return visits | Can be gamed by power users; doesn't capture social connections |
| **Connections Made per Week** | New user-to-user connections per week | Captures social graph growth; network effect driver | Low early on; depends on user density per city |
| **Weekly Active Connected Explorers** | Users who both explored spots AND engaged socially (chat/connection) in a 7-day window | Combines both value pillars; highest signal for retention | Complex to compute; may exclude valid single-mode users |

### Recommended NSM: Weekly Active Explorers (WAE)

**Definition**: A user who, in any rolling 7-day period, performed at least ONE of: viewed 2+ spot details, saved 1+ spot, checked in at 1+ spot, or sent 1+ chat message.

**Why this wins**: x/pat's core promise is "discover your city like a local." The WAE metric captures whether users are actively using the product for its intended purpose. It is broad enough to include multiple engagement modes (browsing, saving, chatting) without being so narrow that it misses legitimate usage patterns. The weekly cadence matches the natural rhythm of digital nomads -- they may not use a city discovery app daily, but weekly engagement indicates the product has a place in their routine.

**Validation method**: Backtest against your earliest cohorts. If WAE trends up and D30 retention also trends up, you have the right metric. If WAE increases but retention stays flat, the metric is measuring noise, not value.

### Input Metrics (Levers That Drive WAE)

These are the 4-5 metrics your product decisions should target:

1. **Onboarding Completion Rate** -- % of signups who complete city selection + view their first spot. Target: >70%.
2. **Spots Viewed per Session** -- Average spot detail views per session. Indicates content quality and discovery UX. Target: 3+.
3. **D1 Retention** -- % of new users who return the day after signup. The strongest early predictor. Target: >50%.
4. **Social Actions per WAE** -- Average connections sent + chat messages per active explorer per week. Indicates social value layer is working.
5. **Content Freshness** -- % of spots in active cities with activity (view/save/check-in) in the last 7 days. Prevents content stagnation.

---

## 2. Analytics Infrastructure

### Current State Assessment

x/pat already has a strong analytics foundation:

- **PostHog SDK** (`posthog-react-native`): Event capture, user identification, feature flags, opt-in/opt-out GDPR controls
- **40+ tracked events**: Covering auth, onboarding, spot engagement, social actions, referrals, streaks, screen time, push notifications, and share cards
- **MMKV persistence**: Session count, install date, streak tracking, one-time activation milestones
- **Sentry**: Error monitoring and performance tracking
- **Feature flags**: `referral_prompt_timing`, `onboarding_flow`, `streak_notifications` already stubbed

### PostHog Capabilities to Activate

PostHog in 2026 has evolved into a full "Product OS" with five pillars. Here is what to activate and when:

**Day 1 (Launch)**:
- **Product Analytics**: Funnels (signup-to-activation), retention charts (D1/D7/D30), trend lines for WAE
- **Session Replay**: PostHog offers React Native session replay via the `posthog-react-native` SDK with a session replay plugin. The free tier includes 5,000 monthly recordings -- more than enough pre-scale. Watch 5-10 replays per week to understand friction points
- **Autocapture**: Supplement your 40+ custom events with autocapture for tap interactions you haven't explicitly instrumented

**Month 1-3**:
- **Feature Flags**: Use existing stubs to run your first experiments (onboarding flow variants, referral prompt timing)
- **Funnels**: Build the core activation funnel (signup -> city select -> first spot viewed -> first spot saved -> first connection)
- **Dashboards**: Set up the three dashboards defined in Section 8

**Month 3-6**:
- **A/B Testing**: Formal experiments using PostHog's experimentation suite
- **Surveys**: In-app microsurveys for qualitative signal (NPS, feature requests)
- **Cohort Exports**: Push cohort data to Supabase for custom analysis

### What to Track vs. What Creates Noise

**Track** (high signal):
- Every step in the activation funnel
- Core value actions: spot_viewed, spot_saved, check_in_completed, connection_sent, chat_message_sent
- Retention signals: app_opened (with session_number, days_since_install), streak events
- One-time milestones: first_spot_saved, first_connection_made, first_chat_message
- Feature flag exposures (automatic with PostHog)

**Do NOT track** (noise at this stage):
- Every UI tap or scroll position (autocapture handles this passively)
- Sub-second timing on animations or transitions
- Individual API response times (Sentry covers this)
- Marketing attribution parameters (premature until paid acquisition starts)
- Detailed device/OS telemetry beyond what PostHog collects automatically

### Data Warehouse Strategy by Stage

| Stage | Users | Storage | Approach |
|-------|-------|---------|----------|
| 0-1K MAU | Pre-scale | PostHog cloud + Supabase Postgres | All analytics in PostHog. Use Supabase for operational queries only |
| 1K-10K MAU | Early growth | Same + PostHog data export | Begin exporting raw events to Supabase or a staging table for custom cohort analysis |
| 10K-100K MAU | Scaling | PostHog + dedicated warehouse | Consider BigQuery or ClickHouse for heavy analytical queries. PostHog's CDP can sync data |

---

## 3. Cohort Analysis Methodology

### Retention Cohorts (D1/D7/D30)

**Setup in PostHog**: Create a retention insight with:
- **Cohort entry event**: `sign_up` (or `app_opened` with `session_number = 1`)
- **Return event**: `app_opened`
- **Granularity**: Daily for D1-D14, weekly for W1-W8, monthly for M1-M6

**A16Z Social App Benchmarks** (your target):

| Metric | OK | Good | Great |
|--------|-----|------|-------|
| D1 Retention | 50% | 60% | 70% |
| D7 Retention | 35% | 40% | 50% |
| D30 Retention | 20% | 25% | 30% |

For x/pat, hitting "Good" benchmarks in the first 3 months would signal strong product-market fit. The retention curve typically starts flattening between D7-D14 and should plateau by D20. If the curve never flattens and keeps declining linearly, the product has not found a retention hook.

### Activation Cohort Analysis

This is the most valuable early analysis. Compare users who performed a key action versus those who didn't:

| Cohort Comparison | Hypothesis |
|-------------------|-----------|
| Users who saved 1+ spot in first session vs. didn't | Spot saving is the "aha moment" |
| Users who opened city chat in first 48 hours vs. didn't | Social engagement drives retention |
| Users who completed onboarding vs. dropped off | Onboarding friction kills retention |
| Users who arrived via referral vs. organic | Referred users retain better (social proof) |
| Users who enabled push notifications vs. didn't | Push is a critical re-engagement lever |

**How to run this**: In PostHog, create two cohorts (e.g., "saved spot in first session" and "did not save spot in first session"), then compare their D7 and D30 retention curves. If the "saved spot" cohort retains at 2x or higher, you have identified your activation event. Every product decision should then aim to increase the percentage of new users who reach that activation event.

### Geographic Cohorts

x/pat's city-based model creates a natural geographic segmentation:

- **Bangkok cohort**: 431 seeded spots, likely the densest content. Expect highest engagement and retention from users in this city.
- **Lisbon cohort**: Strong nomad community, different usage patterns (European timezone, walkable city).
- **CDMX cohort**: Growing nomad hub, may show different category preferences (food-heavy vs. coworking-heavy).

Track per-city: spots viewed per session, save rate, chat activity, and D7 retention. If one city dramatically outperforms others, investigate why -- it may reveal what "good" content density looks like, informing your city launch playbook.

### Feature Adoption Cohorts

For each major feature, track:
- **Discovery rate**: % of WAE who used the feature in a given week
- **Adoption rate**: % of users who tried the feature and used it again in the next 7 days
- **Impact on retention**: Does using this feature correlate with higher D30 retention?

Priority features to measure: Map exploration, spot saving, check-ins, city chat, DMs, referral sharing, streak tracking.

---

## 4. Experimentation Framework

### When to A/B Test vs. Just Ship

At x/pat's current stage (pre-launch to early launch), most decisions should be "just ship" with post-launch measurement. Formal A/B testing requires sample sizes that early-stage products rarely have.

**Just Ship When**:
- The change is obviously better (fixing a bug, reducing friction, adding missing info)
- You have fewer than 500 WAU (weekly active users) -- statistical power is too low for A/B tests
- The change is easily reversible
- You have strong qualitative signal (session replays show users struggling)

**A/B Test When**:
- You have 1,000+ WAU and the test can run for 2+ weeks
- The change involves a meaningful tradeoff (e.g., simpler onboarding vs. more personalized onboarding)
- You are testing a hypothesis that could go either way
- The decision is hard to reverse (e.g., removing a feature entirely)

### Sample Size Reality Check

For a two-variant A/B test detecting a 10% relative improvement in a 25% baseline conversion rate (to 27.5%), you need approximately 10,000 users per variant at 80% power and 95% confidence. This is unrealistic for early x/pat.

**Workarounds for small user bases**:

1. **Sequential testing**: Monitor results as they come in using sequential analysis methods. PostHog supports this -- you can end tests early if results are clearly significant, reducing required sample sizes by 30-50%.

2. **Multi-armed bandit**: Instead of fixed 50/50 splits, use PostHog's dynamic allocation to shift traffic toward the winning variant as data accumulates. This reduces regret (fewer users see the worse variant) and works better with small traffic. Best for optimization decisions rather than learning decisions.

3. **Larger effect sizes**: Test bold changes, not subtle tweaks. A completely different onboarding flow (expecting 30%+ improvement) needs far fewer users than a button color change (expecting 2% improvement).

4. **Pre/post analysis**: Ship the change to everyone and compare the before-period cohort to the after-period cohort. Less rigorous than A/B testing but works with any user base size.

### Experimentation Roadmap

| Priority | Experiment | Method | When | Success Metric |
|----------|-----------|--------|------|---------------|
| 1 | Onboarding flow (standard vs. streamlined) | Feature flag, pre/post | Launch week | Onboarding completion rate, D1 retention |
| 2 | Referral prompt timing (after 1st save vs. 3rd save) | Feature flag A/B | Month 1 | Referral link shared rate |
| 3 | Push notification content (spot recommendations vs. social activity) | A/B test | Month 2 (need 500+ users with push enabled) | Push open rate, D7 retention |
| 4 | Feed algorithm (chronological vs. popularity-weighted) | Feature flag | Month 3 | Spots viewed per session, save rate |
| 5 | Streak notification aggressiveness (daily vs. at-risk only) | Multi-armed bandit | Month 3 | Streak continuation rate, opt-out rate |

---

## 5. Leading vs. Lagging Indicators

### Indicator Classification

| Indicator | Type | Why It Matters | Alert Threshold |
|-----------|------|---------------|----------------|
| D1 retention | Leading | Predicts D30 retention and LTV. If D1 drops, something broke in onboarding or first experience | Drop below 40% for 3 consecutive days |
| Session frequency (sessions/user/week) | Leading | Declining frequency precedes churn by 1-2 weeks | 20% drop week-over-week |
| Spots viewed per session | Leading | Content engagement quality. Dropping means content or discovery UX degraded | Drop below 2.0 average |
| Push notification opt-in rate | Leading | Re-engagement capability. Low opt-in limits your retention toolkit | Below 50% of new signups |
| WAE (North Star) | Current | Overall product health | Any week-over-week decline lasting 2+ weeks |
| D30 retention | Lagging | True product-market fit signal. Takes 30 days to measure | Below 20% for any monthly cohort |
| MAU | Lagging | Growth indicator, but a trailing signal | Useful for trends, not alerts |
| Churn rate | Lagging | Confirms problems that leading indicators should have caught earlier | Monthly churn above 15% |

### User Health Score

Create a composite health score for each user (computed weekly in a Supabase function or edge function):

```
Health Score = (
  0.30 * recency_score +      -- days since last open (0-10 scale, 10 = today)
  0.25 * frequency_score +    -- sessions in last 14 days (0-10 scale)
  0.25 * depth_score +        -- value actions in last 14 days: saves + check-ins + chats (0-10)
  0.20 * social_score          -- connections + chat messages in last 14 days (0-10)
)
```

**Scoring tiers**:
- **8-10 (Thriving)**: Power user. Nurture with exclusive content, ambassador program consideration.
- **5-7 (Healthy)**: Regular user. Standard engagement. Monitor for decline.
- **3-4 (At Risk)**: Engagement declining. Trigger re-engagement push notification or email.
- **0-2 (Churning)**: Likely gone. Last-resort win-back campaign (new spots in your city, friend activity).

**Automated actions**:
- When a user drops from Healthy to At Risk: trigger a personalized push ("New spots added in [city] this week")
- When a user has been At Risk for 7+ days: trigger a social proof push ("[Friend name] just checked in at [spot]")
- Weekly: compute health score distribution. If % of At Risk users increases by >5 percentage points, investigate immediately.

### Churn Prediction Signals

Research shows these signals predict churn 1-2 weeks before it happens:
- **Login frequency drops 40%+ over 2 weeks** (3x more likely to churn)
- **No value action (save/check-in/chat) for 5+ days** in a previously active user
- **Streak broken** after a long streak (loss aversion triggers disengagement)
- **Push notifications disabled** after previously being enabled

---

## 6. Data-Informed Feature Development

### Impact Estimation Framework (ICE)

Before building any feature, score it on three dimensions:

- **Impact** (1-10): How much will this move the North Star Metric? Use existing data to estimate. A feature that increases activation rate by 10% has higher impact than one that adds a nice-to-have for power users.
- **Confidence** (1-10): How sure are you about the impact estimate? Have you seen session replays showing the problem? Do users request this? Is there competitive evidence?
- **Ease** (1-10): How quickly can you build and ship it? A 2-day feature scores higher than a 2-week feature.

**ICE Score = Impact x Confidence x Ease**. Prioritize the highest scores.

### Post-Launch Feature Evaluation

Every feature ships with a pre-defined "success contract":

1. **Before building**: Document the hypothesis ("Adding spot categories to the map filter will increase spots viewed per session by 20%")
2. **Define the metric**: Specify the exact PostHog event/insight that will measure success
3. **Set a timeframe**: "We will evaluate after 2 weeks and 500+ users exposed"
4. **Define success/failure thresholds**:
   - **Ship and iterate**: Metric improved by 10%+ (or directionally positive with qualitative signal)
   - **Hold and investigate**: Metric flat or unclear. Watch session replays, gather qualitative feedback
   - **Kill it**: Metric declined, or after 4 weeks the improvement is <5% with no qualitative signal

### When to Kill a Feature

Use the OKR-based red/yellow/green framework:

- **Red Zone (0-40% of goal)**: The feature is not working. Incremental iteration will not save it. Remove it to reduce complexity. Example: if city chat was expected to get 30% of users chatting weekly but only 8% engage, the feature needs a fundamental rethink, not UI polish.
- **Yellow Zone (40-70% of goal)**: The feature shows promise but needs iteration. Invest one more cycle. Example: check-ins are used by 15% of WAE vs. a 25% goal -- try adding a prompt after spot detail views.
- **Green Zone (70%+ of goal)**: The feature is working. Maintain and optimize.

Reducing scope by removing underperforming features has been shown to improve D1 retention by 20%+ -- a simpler product is often a better product.

### Ship-Measure-Iterate Cadence

For a solo founder, the optimal cadence is:

- **Monday**: Review last week's metrics (30 min). Identify the one thing most likely to move WAE.
- **Tuesday-Thursday**: Build and ship.
- **Friday**: Deploy, watch 5 session replays of users encountering the new feature.
- **Following Monday**: Evaluate early signal. Decide: iterate, hold, or revert.

---

## 7. Privacy-Preserving Analytics

### x/pat's Current Privacy Posture

x/pat already has strong privacy foundations:
- GDPR consent overlay with opt-in/opt-out controls
- `optOutPostHog()` / `optInPostHog()` functions for user-controlled tracking
- PostHog user identification only after authentication
- Privacy policy screen in settings

### Consent Tiers

Implement a three-tier consent model:

| Tier | What's Collected | When Applied |
|------|-----------------|--------------|
| **Essential Only** (no consent needed) | Crash reports (Sentry), anonymized error counts, app version/OS for compatibility | All users, always. Legal basis: legitimate interest |
| **Analytics** (opt-in required in EU) | PostHog events (anonymized), session replays, feature flag assignments, retention metrics | After user accepts analytics consent. PostHog's opt-in/opt-out handles this |
| **Personalization** (explicit opt-in) | User properties for recommendations, geographic behavior patterns, social graph analysis | Future tier for recommendation engine. Separate consent prompt |

### Anonymization Techniques

- **Aggregate over individual**: When analyzing geographic behavior, report city-level patterns ("Bangkok users save 40% more spots than Lisbon users") rather than individual user journeys
- **Pseudonymization**: PostHog's `distinct_id` is already pseudonymous. Never store email or real name in event properties
- **Data minimization**: Only capture properties you will actually analyze. x/pat's current events are well-designed -- they capture `spot_id`, `category`, `city`, `source` but not unnecessary PII
- **Retention limits**: Configure PostHog's data retention to auto-delete raw events after 12 months. Aggregated insights persist indefinitely
- **Session replay privacy**: PostHog's React Native session replay automatically masks text inputs. Verify that sensitive screens (settings, DMs) are excluded from replay capture

### GDPR Compliance Checklist

- [x] Consent collection before tracking (existing GDPR overlay)
- [x] Opt-out mechanism (existing optOutPostHog)
- [ ] Document data flows in privacy policy (verify PostHog is mentioned by name as a processor)
- [ ] Data export endpoint (mentioned in Settings but not yet implemented -- required for GDPR Article 20)
- [ ] Data deletion propagation (when `delete_user_account()` RPC fires, ensure PostHog receives a delete request via API)
- [ ] Annual review of tracked events against stated purposes

---

## 8. Dashboard Design for Solo Founders

### Dashboard 1: Daily Pulse (check every morning, 2 minutes)

**Purpose**: "Is anything on fire? Is the trend directionally correct?"

| Metric | Visualization | Alert |
|--------|--------------|-------|
| New signups (today vs. 7-day average) | Number + sparkline | Drop >50% from 7-day avg |
| DAU | Number + 7-day trend | 3 consecutive days of decline |
| D1 retention (yesterday's cohort) | Number | Below 40% |
| Crash-free rate (Sentry) | Number | Below 98% |
| Active errors (Sentry) | Count of new unresolved | Any P0/P1 error |

**PostHog implementation**: Create a single dashboard called "Daily Pulse" with these 5 insights. Set it as the project homepage. Configure Slack subscription for daily delivery at 9 AM.

### Dashboard 2: Weekly Strategy (review every Monday, 15 minutes)

**Purpose**: "Are we moving the North Star? What should I build this week?"

| Metric | Visualization | Target |
|--------|--------------|--------|
| WAE (North Star) | Trend line, 8-week view | Week-over-week growth |
| D1 / D7 retention | Retention matrix (cohort heatmap) | D1 >50%, D7 >35% |
| Activation funnel | Funnel: signup -> onboard -> first spot view -> first save | >60% completion |
| Top 10 spots by views/saves | Table | Content health indicator |
| Feature adoption rates | Bar chart (map / save / chat / check-in / referral) | Identify underused features |
| Session replays to watch | 5 random replays from new users this week | Qualitative signal |
| Health score distribution | Pie chart (Thriving / Healthy / At Risk / Churning) | At Risk <20% of total |

### Dashboard 3: Monthly Deep Dive (review on the 1st, 30 minutes)

**Purpose**: "Are we finding product-market fit? What's the big picture?"

| Metric | Visualization |
|--------|--------------|
| D30 retention by monthly cohort | Line chart overlay (each month's cohort as a separate line) |
| MAU trend | Bar chart, 6-month view |
| Geographic breakdown | Table: WAE, D7 retention, spots viewed per session by city |
| Referral funnel | Funnel: link shared -> link clicked -> signup -> activated |
| Feature experiment results | Summary table of active and completed experiments |
| Health score trend | Stacked area chart showing tier distribution over time |
| User feedback themes | Manual notes from session replays and support messages |

### Alert Configuration

Set up these PostHog/Sentry alerts (delivered via Slack or email):

| Alert | Condition | Channel | Priority |
|-------|-----------|---------|----------|
| Crash spike | Crash-free rate <95% | Slack + email | P0 |
| Signup drop | <50% of 7-day average signups | Slack | P1 |
| Retention cliff | D1 retention <35% for 2 consecutive days | Slack | P1 |
| Feature flag error | Any flag returning unexpected values | Sentry alert | P1 |
| WAE decline | 2 consecutive weeks of decline | Monday email | P2 |

---

## 9. Implementation Roadmap

### Phase 1: Launch Week (Days 1-7)

- [ ] Create "Daily Pulse" dashboard in PostHog with 5 core metrics
- [ ] Enable session replay (install PostHog session replay plugin for React Native)
- [ ] Set up activation funnel: sign_up -> onboarding_completed -> first_spot_saved
- [ ] Configure D1/D7/D30 retention insight with `sign_up` as entry event
- [ ] Set Slack subscription for daily dashboard delivery
- [ ] Create Sentry alert for crash-free rate <98%

### Phase 2: First Month (Days 8-30)

- [ ] Build "Weekly Strategy" dashboard
- [ ] Run activation cohort analysis: compare retention of users who saved a spot in first session vs. those who didn't
- [ ] Implement first experiment: onboarding flow variant via `onboarding_flow` feature flag
- [ ] Start watching 5 session replays every Friday
- [ ] Create geographic cohort comparison (Bangkok vs. Lisbon vs. CDMX)
- [ ] Validate NSM: does WAE trend correlate with D7/D30 retention trends?

### Phase 3: Months 2-3

- [ ] Build "Monthly Deep Dive" dashboard
- [ ] Implement user health score (Supabase edge function, weekly computation)
- [ ] Set up automated re-engagement triggers based on health score drops
- [ ] Run referral prompt timing experiment via `referral_prompt_timing` flag
- [ ] Begin post-launch feature evaluation for each major feature
- [ ] Create ICE scoring sheet for feature prioritization

### Phase 4: Months 3-6

- [ ] Formal A/B testing program (requires 1,000+ WAU)
- [ ] Push notification content experiments
- [ ] Feed algorithm experimentation
- [ ] Consider data export to BigQuery if PostHog query performance degrades
- [ ] Annual privacy review: audit tracked events against stated purposes
- [ ] Implement data export endpoint for GDPR Article 20 compliance

---

## 10. Key Principles

1. **Measure what matters, ignore the rest.** At early stage, you need answers to three questions: Are users signing up? Are they reaching core value? Are they coming back? Everything else is noise until you have product-market fit.

2. **Session replays are more valuable than dashboards.** Watching 5 real users struggle with your app teaches you more than any chart. PostHog's 5,000 free monthly recordings are the highest-ROI analytics feature for a pre-scale product.

3. **Bold experiments, not micro-optimizations.** With a small user base, test big changes that could produce 30%+ improvements. Button color tests are for companies with millions of users.

4. **Weekly cadence, not daily obsession.** Check the Daily Pulse for fires. Do real analysis on Mondays. Ship Tuesday through Thursday. Evaluate Fridays. This rhythm prevents analysis paralysis while maintaining data discipline.

5. **Privacy is a feature, not a constraint.** Digital nomads are privacy-conscious. x/pat's three-tier consent model and data minimization approach are competitive advantages, not just compliance checkboxes.

6. **Kill features that don't work.** A simpler product with higher retention beats a feature-rich product with low engagement. If a feature isn't hitting 40% of its success target after a month, remove it and reclaim the complexity budget.

7. **The North Star Metric is not permanent.** Re-evaluate WAE quarterly. As x/pat evolves -- especially as the social graph and affiliate revenue model mature -- the NSM may shift toward a metric that better captures the intersection of user value and business value.

---

## Sources

- [North Star Metric Framework - UXCam](https://uxcam.com/blog/north-star-metric-framework/)
- [North Star Metric (2026): Your NSM in 9 Steps - Gust de Backer](https://gustdebacker.com/north-star-metric/)
- [How to Choose & Measure North Star Metrics - Reforge](https://www.reforge.com/blog/north-star-metrics)
- [Finding your North Star metric and why it matters - PostHog](https://posthog.com/founders/north-star-metrics)
- [The 80/20 of early-stage startup analytics - PostHog](https://posthog.com/founders/early-stage-analytics)
- [React Native session replay installation - PostHog](https://posthog.com/docs/session-replay/installation/react-native)
- [How to set up React Native (Expo) analytics - PostHog](https://posthog.com/tutorials/react-native-analytics)
- [Do You Have Lightning In a Bottle? - Andreessen Horowitz](https://a16z.com/do-you-have-lightning-in-a-bottle-how-to-benchmark-your-social-app/)
- [Increase app retention 2026 - Pushwoosh](https://www.pushwoosh.com/blog/increase-user-retention-rate/)
- [Best 6 Mobile App Cohort Analysis Techniques - Linkrunner](https://linkrunner.io/blog/best-6-mobile-app-cohort-analysis-techniques-for-growth-teams)
- [Sequential A/B Testing vs Multi-Armed Bandit Testing - SplitMetrics](https://splitmetrics.com/blog/sequential-ab-testing-vs-multi-armed-bandit/)
- [Multi-Armed Bandit vs AB Testing - Braze](https://www.braze.com/resources/articles/multi-armed-bandit-vs-ab-testing)
- [Building a Health Score That Predicts Churn - Supportbench](https://www.supportbench.com/building-health-score-predicts-churn/)
- [How to Kill Underperforming Features - Taboola](https://www.taboola.com/engineering/how-to-kill-underperforming-features/)
- [GDPR Compliance for Mobile Apps (2026 Guide) - SecurePrivacy](https://secureprivacy.ai/blog/gdpr-compliance-mobile-apps)
- [Dashboard metrics - PostHog](https://posthog.com/docs/customer-analytics/dashboard-metrics)
- [PostHog for Startups](https://archive.posthog.com/startups)
