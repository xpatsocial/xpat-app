# Alex Schultz Growth Masterclass: Frameworks, Methodology, and Application to x/pat

**Source Material**: Alex Schultz's primary lectures and published talks
**Date Compiled**: April 8, 2026

---

## Background: Who Is Alex Schultz

Alex Schultz joined Facebook in 2007 as one of the earliest members of the Growth team, working under Chamath Palihapitiya. When Chamath left, Schultz took over and led the Growth organization that scaled Facebook from ~100 million regional users to over 2 billion globally. He holds a master's in physics from Cambridge. Before Facebook, he was a marketing manager at eBay where he learned performance marketing. He became Meta's Chief Marketing Officer and VP of Analytics. Named one of the world's most influential CMOs by Forbes in 2024, he authored "Click Here: The Art and Science of Digital Marketing and Advertising" (October 2024). He is one of perhaps five people in the world who has directly managed growth at true planetary scale.

---

## 1. The Y Combinator Lecture: "How to Start a Startup" — Lecture 6, Growth (October 2014)

**Primary Source**: Stanford CS183B / Y Combinator "How to Start a Startup" course, Lecture 6
**Video**: YouTube (search "Lecture 6 - Growth Alex Schultz")
**Official page**: https://startupclass.samaltman.com/courses/lec06/

### 1.1 The Core Framework: Retention Is Everything

Schultz opens with what he considers the single most important concept in growth:

> "Retention is the single most important thing for growth."

This is not a throwaway line. He means it as an absolute ordering principle: if you do not have retention, nothing else matters. No amount of viral mechanics, growth hacking, paid acquisition, or press coverage will save you.

> "If you look at this curve — percent monthly active versus number of days from acquisition — if you end up with a retention curve that is asymptotic to a line parallel to the x-axis, you have a viable business and you have product/market fit for some subset of market."

The inverse is equally important: if your retention curve slopes down to the x-axis (zero), you do not have product/market fit, and you should not be doing growth work at all.

### 1.2 The Retention Curve Methodology

Schultz's retention curve is constructed as follows:

- **Y-axis**: Percent of monthly active users (of a given cohort)
- **X-axis**: Number of days from acquisition
- **Method**: Take a cohort of users who signed up in the same time period. Plot what percentage are still active at Day 1, Day 7, Day 14, Day 30, Day 60, Day 90, etc.

**Good retention (flattening curve)**: The curve drops initially but then flattens out, becoming asymptotic to a horizontal line. This means some percentage of users stick around permanently. You have a viable business.

**Bad retention (curve goes to zero)**: The curve keeps declining and approaches zero. Every user eventually leaves. You do not have product/market fit. Stop doing growth work and fix the product.

### 1.3 What Retention Rates Are "Good"

Schultz is explicit that the required retention rate varies dramatically by category:

> "If you're producing a social network and you have 5% retention, you're not going to long term have a tremendous social network. Or a messaging app — what use would WhatsApp be if only 5% of your friends who signed up for it actually used it?"
>
> "On the other hand, if you have a marketplace that is selling fashion and you have 5 or 10% retention but those people spend a lot of money, you have a totally viable business."

The key benchmarks he implies:

| Category | Minimum Viable Retention (D30+) | What "Great" Looks Like |
|---|---|---|
| Social Network | Must be significantly above 5% | 60-70%+ |
| Messaging App | Very high (network effect dependent) | 70%+ |
| E-commerce/Marketplace | 5-10% can work if LTV is high | eBay/Amazon: ~90% |
| SaaS | Depends on contract structure | High single-digit monthly churn or less |

His core point: **context matters**. Do not compare your social app's retention to an e-commerce benchmark. Compare to the best-in-class in your specific category.

### 1.4 Magic Moments

Schultz introduces the concept of the "magic moment" — the instant when a user first experiences the core value of your product. Once you identify it, your entire growth strategy becomes about getting users to that moment as fast as possible.

> "The magic moment for Facebook is when you first see that picture of one of your friends on Facebook and you realize — oh my god, this is what this site is about!"

For Facebook, the operational metric derived from this insight was:

> Getting users to **10 friends in 14 days**.

This was the activation threshold that Zuckerberg identified. Users who hit 10 friends within their first two weeks had dramatically higher long-term retention than those who did not. This became the single most important operational goal for the growth team.

Schultz extends the concept to other products:

- **eBay**: The magic moment is winning your first auction or successfully buying/selling something
- **WhatsApp**: The magic moment is sending your first message and getting a reply
- **Facebook**: Seeing a friend's photo for the first time

> "If you can connect people with what draws them to your site, then you can go from 60% retention to 70% retention easily."

The implication: identify your magic moment, measure who reaches it and who does not, then ruthlessly optimize the new user experience to get people there faster.

### 1.5 The Marginal User Principle

This is one of Schultz's most counterintuitive insights, and it directly contradicts what most founders do instinctively:

> "Building an incredible product is definitely about optimizing it for the people who use your product the most. But when it comes to driving growth, people who are already using your product are not the ones you have to worry about."
>
> "When you want to drive growth, you need to focus on the marginal user — the one person who doesn't get a notification in a given day, month, or year."
>
> "Think about the marginal user, don't think about yourself."

Power users are already retained. They are not churning. The marginal user — the one who signed up but is barely using the product, the one who is about to leave — that is where growth happens. Every improvement to the marginal user's experience compounds into the retention curve.

### 1.6 Virality Framework

Schultz breaks virality into three components:

1. **Payload**: How many people can you share with in a single action?
2. **Frequency**: How often can you take that sharing action?
3. **Conversion Rate**: What percentage of people who receive the share actually convert?

If all three are high, your product is "super viral." The viral coefficient (K factor) must be above 1.0 for true viral growth — meaning each user brings in more than one additional user. If K < 1, you will not achieve viral growth.

Schultz is notably skeptical about most companies achieving true virality. He treats it as a bonus, not a strategy. Retention comes first.

### 1.7 Startups Should Not Have Growth Teams

> "Startups should not have growth teams. The whole company should be the growth team. The CEO should be the head of growth."

Facebook did not create a dedicated growth team until 2007, when they already had tens of millions of users. Schultz identifies the #1 mistake he sees in startups he advises:

> "The number one problem I've seen inside Facebook for new products and for startups I've advised has been that they don't actually have product/market fit when they think they do."

His advice sequence for startups:
1. Build a product people love (retention curve flattens)
2. The CEO owns growth — the whole company is the growth team
3. Only after scale should you create a dedicated growth function

### 1.8 Choosing What to Measure: The North Star Metric

> "What's the one metric that everyone in the company needs to base their actions off? Their actions should correlate with moving that metric up."

At Facebook, Zuckerberg chose **Monthly Active Users (MAU)** as the North Star metric — the single number he made the world hold Facebook accountable to.

Airbnb chose **Nights Booked** and benchmarked themselves against the largest hotel chains in the world.

Schultz's guidance for choosing a North Star:
- Pick one metric, not many
- It should align with your values, not just your revenue
- You must be able to stick with it for a long time
- The leader sets the North Star; all goals cascade from it
- Other metrics track execution — do not confuse them for the goal

> "Just because something is measurable doesn't mean it matters, and not everything that matters can be measured."

---

## 2. Stanford CS183F Lecture: "How to Get Users and Grow" (2017)

**Primary Source**: Stanford CS183F Startup School
**Duration**: ~49 minutes
**Transcript**: https://jotengine.com/transcriptions/gYOFFeB8Mv7WNoD6rjiG1w

This lecture reinforces and extends the 2014 material with three years of additional scaling experience. Key additions:

### 2.1 Dimensional Reasoning for Growth

Schultz applies his physics background to growth. He encourages founders to think dimensionally about their metrics — break down a high-level number into its component parts and understand which lever moves which outcome. This is the core of what later became "growth accounting."

### 2.2 Targeting, Creative, and Conversion

The 2017 lecture expands into tactical execution:
- **Targeting**: Who exactly are you trying to reach? Not everyone — the specific marginal users most likely to convert.
- **Creative**: What message resonates with that specific audience? Not what resonates with you.
- **Conversion**: Optimize every step of the funnel. Small percentage improvements compound dramatically at scale.

### 2.3 Notification Strategy

Schultz challenges the default assumption that you should minimize notifications:

> Power users are not leaving because they get too many notifications. "They're probably grown-ups and they can use filters."

The real opportunity is notifications for marginal users — the person who is about to churn. For them, a well-timed notification can be the difference between staying and leaving.

Key principles for notifications:
1. **Deliverability**: Get the notification delivered (email, push, SMS — each has deliverability challenges)
2. **Open Rate**: Compelling subject lines / notification text
3. **Click Rate**: The content behind the notification must deliver on the promise
4. Notification emails outperform newsletters
5. Email is not the best channel for users under 25
6. Personalize based on user behavior and engagement level
7. Optimize for marginal users, not power users

### 2.4 International Growth and Localization

One of Schultz's signature achievements was Facebook's internationalization strategy. Rather than hiring professional translators, the growth team built a crowdsourcing system that let Facebook users themselves translate the product:

> The volunteer translators produced translations that were "really good, better than when professionals are used, because the community understood the product really well and could handle concepts like tagging someone."

This allowed Facebook to launch in 80+ languages far faster and more accurately than traditional localization. It was a growth lever disguised as a localization feature.

---

## 3. Growth Accounting: The Decomposition Framework

### 3.1 The Core Equation

Growth accounting decomposes total active users into actionable components:

```
Active Users(today) = Retained + New + Resurrected
```

The change over time:

```
ΔActive Users = New Users + Resurrected Users − Churned Users
```

Where:
- **New**: First-time users (never used the product before)
- **Retained**: Active in the prior period AND active in the current period
- **Churned**: Active in the prior period but NOT active in the current period
- **Resurrected**: NOT active in the prior period but active in the current period
- **Stale**: Not active in either period (invisible but important for total addressable resurrection pool)

### 3.2 The Critical Insight: Churn and Resurrection Dominate

Schultz revealed a counterintuitive finding from Facebook's data:

> At Facebook, the resurrected and churned numbers for pretty much every product he's seen **dominate the new user count** once you reach a sensible point of growth a couple years in.

More specifically:

> At Facebook, churn and resurrections were each **double the size** of new acquisitions. A 1% improvement in either churn or resurrection had **twice the impact** of a 1% improvement in acquisition.

This means:
- **Early stage**: New users dominate growth (acquisition matters most)
- **Growth stage**: Churn prevention and resurrection become 2x more impactful than acquisition
- **At scale**: The battle is almost entirely about retention and re-engagement

### 3.3 What Each Component Tells You

| Component | Signal | Action |
|---|---|---|
| New users declining | Acquisition channels saturating | Find new channels or improve conversion |
| Churn increasing | Product quality issue or competition | Investigate marginal user experience |
| Resurrection increasing | Re-engagement working (notifications, email) | Double down on re-engagement campaigns |
| Resurrection declining | Churned users giving up permanently | Urgently fix the churn cause |
| Retained stable | Core product is healthy | Safe to invest in acquisition |

### 3.4 The Prioritization Framework

Based on Schultz's data, the priority order is:

1. **Reduce churn** (highest ROI at scale — directly prevents loss)
2. **Increase resurrection** (second highest — brings back users you already acquired)
3. **Increase acquisition** (lowest marginal ROI at scale — but essential early on)

The common mistake: startups pour resources into acquisition while hemorrhaging users through churn. Schultz calls this "filling a leaky bucket."

---

## 4. Additional Published Insights

### 4.1 When to Invest in Growth

Schultz's sequence is absolute:

1. Build a product with a retention curve that flattens
2. Identify the magic moment
3. Optimize the path to the magic moment
4. Only THEN invest in acquisition and growth tactics

> "Don't go and do growth tactics, don't go and do virality, don't hire a growth hacker. Focus on getting product/market fit."

### 4.2 Hiring for Growth Roles

From interviews, Schultz values:
- **Tenure and resilience**: The best hires have stayed 3+ years at previous companies
- **Senior hires**: Look for at least one long stint (close to 10 years), signaling they thrived on high-caliber teams
- **Longevity signals**: They built for the long run, not job-hopped

### 4.3 SEO and Performance Marketing Origins

Before Facebook, Schultz learned SEO in the 1990s building a paper airplane website. He became serious about performance marketing when Google AdWords launched, buying clicks from Google and reselling them to eBay through the affiliate program. This gave him a quantitative, arbitrage-oriented mindset about acquisition that influenced how Facebook's growth team operated.

---

## 5. Application to x/pat

### 5.1 Identifying x/pat's Magic Moment

Following Schultz's framework, x/pat needs to identify the moment a new user "gets it." Based on the product (expat community, spot discovery, connections):

**Candidate magic moments** (test each against retention data):
1. User saves their first spot in their city
2. User makes their first connection with another expat
3. User sends their first chat message and gets a reply
4. User discovers a spot they physically visit

The analytics module already tracks these as milestone events (`first_spot_saved`, `first_connection_made`, `first_chat_message`, `first_spot_added`). The task is correlating which milestone best predicts D30+ retention.

### 5.2 PostHog Dashboard Design: The Schultz Dashboard

Create a single PostHog dashboard called **"Schultz Growth Board"** with these panels:

**Panel 1 — Retention Curve (The Most Important Graph)**
- Cohort retention chart: % of users active on Day 1, 3, 7, 14, 30, 60, 90
- Cohorted by signup week
- Goal: See flattening. If curve goes to zero, stop all growth work and fix the product.

**Panel 2 — Growth Accounting**
- Stacked area chart showing: New, Retained, Resurrected, Churned (negative)
- Weekly cadence
- Net growth line overlaid

**Panel 3 — Magic Moment Funnel**
- Funnel: Signup → Onboarding Complete → First Spot Saved → First Connection → First Chat
- Conversion rates at each step
- Compare D30 retention of users who completed each step vs. those who did not

**Panel 4 — North Star Metric**
- Weekly Active Users (WAU) as the primary number
- Trend line with week-over-week change

**Panel 5 — Marginal User Health**
- Distribution of sessions per user per week
- Segment: users with 1 session/week (marginal) vs. 3+ sessions/week (power)
- Track whether marginal user count is growing or shrinking

**Panel 6 — Notification Effectiveness**
- Push notification sent → opened → app session within 1 hour
- Segmented by notification type
- Focus metric: did the notification prevent a churn event?

### 5.3 SQL Queries for Supabase Growth Accounting

These queries run directly against the Supabase `auth.users` table and any activity tracking tables.

**Query 1: Daily Active Users with Growth Accounting States**

```sql
-- Growth accounting: classify each user's state each day
-- Requires an activity log table (e.g., user sessions or events)
WITH daily_activity AS (
  SELECT DISTINCT
    user_id,
    date_trunc('day', created_at)::date AS active_date
  FROM public.activity_log  -- or your event table
),
user_states AS (
  SELECT
    d.active_date,
    d.user_id,
    CASE
      WHEN first_seen.first_date = d.active_date THEN 'new'
      WHEN prev.user_id IS NOT NULL THEN 'retained'
      ELSE 'resurrected'
    END AS user_state
  FROM daily_activity d
  LEFT JOIN daily_activity prev
    ON d.user_id = prev.user_id
    AND prev.active_date = d.active_date - INTERVAL '1 day'
  LEFT JOIN (
    SELECT user_id, MIN(active_date) AS first_date
    FROM daily_activity
    GROUP BY user_id
  ) first_seen ON d.user_id = first_seen.user_id
),
churned AS (
  SELECT
    (prev.active_date + INTERVAL '1 day')::date AS churn_date,
    prev.user_id,
    'churned' AS user_state
  FROM daily_activity prev
  LEFT JOIN daily_activity curr
    ON prev.user_id = curr.user_id
    AND curr.active_date = prev.active_date + INTERVAL '1 day'
  WHERE curr.user_id IS NULL
)
SELECT
  active_date,
  user_state,
  COUNT(DISTINCT user_id) AS user_count
FROM (
  SELECT active_date, user_id, user_state FROM user_states
  UNION ALL
  SELECT churn_date, user_id, user_state FROM churned
) combined
GROUP BY active_date, user_state
ORDER BY active_date DESC, user_state;
```

**Query 2: Cohort Retention Curve**

```sql
-- Cohort retention: what % of each signup week's users return on day N
WITH user_cohorts AS (
  SELECT
    id AS user_id,
    date_trunc('week', created_at)::date AS cohort_week
  FROM auth.users
),
user_activity AS (
  SELECT DISTINCT
    user_id,
    date_trunc('day', created_at)::date AS active_date
  FROM public.activity_log
)
SELECT
  c.cohort_week,
  (a.active_date - c.cohort_week) AS days_since_signup,
  COUNT(DISTINCT a.user_id) AS active_users,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  ROUND(
    100.0 * COUNT(DISTINCT a.user_id) / NULLIF(COUNT(DISTINCT c.user_id), 0),
    1
  ) AS retention_pct
FROM user_cohorts c
LEFT JOIN user_activity a
  ON c.user_id = a.user_id
  AND a.active_date >= c.cohort_week
WHERE (a.active_date - c.cohort_week) IN (0, 1, 3, 7, 14, 30, 60, 90)
GROUP BY c.cohort_week, days_since_signup
ORDER BY c.cohort_week, days_since_signup;
```

**Query 3: Magic Moment Correlation**

```sql
-- Which activation milestone best predicts D30 retention?
WITH user_milestones AS (
  SELECT
    u.id AS user_id,
    u.created_at AS signup_date,
    EXISTS (
      SELECT 1 FROM public.saved_spots ss
      WHERE ss.user_id = u.id
      AND ss.created_at <= u.created_at + INTERVAL '7 days'
    ) AS saved_spot_week1,
    EXISTS (
      SELECT 1 FROM public.connections c
      WHERE (c.requester_id = u.id OR c.addressee_id = u.id)
      AND c.created_at <= u.created_at + INTERVAL '7 days'
    ) AS made_connection_week1,
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.user_id = u.id
      AND m.created_at <= u.created_at + INTERVAL '7 days'
    ) AS sent_message_week1
  FROM auth.users u
),
d30_retention AS (
  SELECT DISTINCT user_id
  FROM public.activity_log
  WHERE created_at >= (SELECT created_at FROM auth.users WHERE id = activity_log.user_id)
    + INTERVAL '28 days'
  AND created_at < (SELECT created_at FROM auth.users WHERE id = activity_log.user_id)
    + INTERVAL '35 days'
)
SELECT
  'saved_spot_week1' AS milestone,
  saved_spot_week1 AS completed,
  COUNT(*) AS users,
  SUM(CASE WHEN d30.user_id IS NOT NULL THEN 1 ELSE 0 END) AS retained_d30,
  ROUND(100.0 * SUM(CASE WHEN d30.user_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1) AS retention_pct
FROM user_milestones um
LEFT JOIN d30_retention d30 ON um.user_id = d30.user_id
GROUP BY saved_spot_week1

UNION ALL

SELECT
  'made_connection_week1',
  made_connection_week1,
  COUNT(*),
  SUM(CASE WHEN d30.user_id IS NOT NULL THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN d30.user_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1)
FROM user_milestones um
LEFT JOIN d30_retention d30 ON um.user_id = d30.user_id
GROUP BY made_connection_week1

UNION ALL

SELECT
  'sent_message_week1',
  sent_message_week1,
  COUNT(*),
  SUM(CASE WHEN d30.user_id IS NOT NULL THEN 1 ELSE 0 END),
  ROUND(100.0 * SUM(CASE WHEN d30.user_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 1)
FROM user_milestones um
LEFT JOIN d30_retention d30 ON um.user_id = d30.user_id
GROUP BY sent_message_week1
ORDER BY milestone, completed;
```

### 5.4 Solo Founder Daily Check Dashboard

For a solo founder, Schultz's framework simplifies to checking five numbers daily:

| Metric | Source | Alert Threshold |
|---|---|---|
| **WAU** (North Star) | PostHog | Week-over-week decline > 10% |
| **D1 Retention** (latest cohort) | PostHog cohort | Below 30% for social app |
| **D7 Retention** (latest cohort) | PostHog cohort | Below 15% |
| **Net Growth** (New + Resurrected - Churned) | Supabase SQL | Negative for 3+ consecutive days |
| **Magic Moment Conversion** (% reaching first save/connection in 7 days) | PostHog funnel | Below 25% |

**Alert Thresholds That Signal Problems:**

- **Retention curve not flattening by D30**: Stop all acquisition spend. Product needs work.
- **D7 retention below 10%**: Product/market fit crisis. Talk to users.
- **Churn exceeding new + resurrected for a week**: Net negative growth. Drop everything.
- **Magic moment conversion below 20%**: Onboarding is broken. Fix the path to first value.
- **Resurrection rate declining month-over-month**: Re-engagement channels (push, email) are failing or users are permanently lost.

### 5.5 x/pat's North Star Metric

Following Schultz's framework — pick one metric, stick with it, make it align with values:

**Recommended North Star**: **Weekly Active Users (WAU)** in launched cities.

Why WAU over MAU for x/pat:
- Social/community products need weekly engagement to build habit
- MAU is too forgiving for a small user base — a user who checks in once per month is not getting value from an expat community
- WAU creates urgency without the impossibility of DAU at early scale

### 5.6 x/pat's Marginal User

The marginal user for x/pat is likely:
- Signed up because they moved to a new city
- Saved 1-2 spots but never connected with anyone
- Opened the app 2-3 times total
- Has not sent a single message

Following Schultz's principle, the entire growth focus should be on this person — not on the power user who saves 50 spots and chats daily. What makes the marginal user leave? What notification, feature, or experience would make them come back?

### 5.7 Implementing the Virality Equation

Schultz's three components applied to x/pat:

| Component | x/pat Implementation | Current State |
|---|---|---|
| **Payload** | Share a spot card to WhatsApp/Instagram — reaches entire friend group | Shareable cards built |
| **Frequency** | Every spot save, check-in, or city discovery is a sharing opportunity | Events tracked |
| **Conversion** | Deep link from shared card → app install → onboarding | Deep linking implemented |

The referral tracking in `analytics.ts` already captures `referral_link_shared`, `referral_link_clicked`, and `referral_completed`. These map directly to Schultz's payload, frequency, and conversion pipeline.

---

## 6. Key Quotes Reference

For quick reference, the most important Schultz quotes in priority order:

1. "Retention is the single most important thing for growth."
2. "If you end up with a retention curve that is asymptotic to a line parallel to the x-axis, you have a viable business and you have product/market fit for some subset of market."
3. "The number one problem I've seen inside Facebook for new products and for startups I've advised has been that they don't actually have product/market fit when they think they do."
4. "Startups should not have growth teams. The whole company should be the growth team. The CEO should be the head of growth."
5. "When you want to drive growth, you need to focus on the marginal user."
6. "Think about the marginal user, don't think about yourself."
7. "Don't go and do growth tactics, don't go and do virality, don't hire a growth hacker. Focus on getting product/market fit."
8. "Just because something is measurable doesn't mean it matters, and not everything that matters can be measured."
9. "If you can connect people with what draws them to your site, then you can go from 60% retention to 70% retention easily."

---

## Sources

### Primary Lecture Sources
- [Lecture 6: Growth — How to Start a Startup (Sam Altman / YC, 2014)](https://startupclass.samaltman.com/courses/lec06/)
- [How to Get Users and Grow — Stanford CS183F Startup School (2017) Transcription](https://jotengine.com/transcriptions/gYOFFeB8Mv7WNoD6rjiG1w)
- [CS183F Lecture on Class Central](https://www.classcentral.com/course/youtube-how-to-get-users-and-grow-alex-schultz-vp-of-growth-at-facebook-stanford-cs183f-startup-school-191995)
- [YTScribe Full Transcript — Lecture 6](https://ytscribe.com/v/n_yHZ_vKjno)

### Verified Quote Sources
- [Startup Archive: Retention is the single most important thing](https://www.startuparchive.org/p/facebook-vp-of-growth-alex-schultz-retention-is-the-single-most-important-thing-for-growth)
- [Startup Archive: Startups should not have growth teams](https://www.startuparchive.org/p/facebook-vp-of-growtchultz-startups-should-not-have-gh-alex-srowth-teams)
- [24 Quotes from Alex Schultz on Startup Growth — Medium](https://medium.com/how-to-start-a-startup/24-quotes-from-alex-schultz-on-startup-growth-d3a846544937)
- [Xiaolai.co Full Transcript — How To Start A Startup Lecture 6](https://xiaolai.co/books/79d51c0829dc130ac335479915e9b6c2/Lecture06.html)

### Additional Sources
- [Facebook's Growth Playbook — Predictable Revenue](https://predictablerevenue.com/blog/8-replicable-steps-you-can-copy-straight-out-of-facebooks-growth-playbook/)
- [How Facebook Used Science and Empathy to Reach Two Billion Users — Fast Company](https://www.fastcompany.com/40432085/how-facebooks-growth-team-used-science-and-empathy-to-reach-two-billion-users)
- [Analytics and Product-Market Fit — Analytics at Meta (Medium)](https://medium.com/@AnalyticsAtMeta/analytics-and-product-market-fit-11efaea403cd)
- [Alex Schultz on North Star Metrics — Social Samosa](https://www.socialsamosa.com/marketing-shorts/meta-cmo-finding-north-star-metric-data-rich-world-10619129)
- [Click Here: The Art and Science of Digital Marketing — Amazon](https://www.amazon.com/Click-Here-Science-Marketing-Advertising/dp/0316597597)
- [How to Get Users and Grow — Y Combinator Blog](https://blog.ycombinator.com/how-to-get-users-and-grow-with-alex-schultz/)
- [Lessons from Alex Schultz of Meta — Antoine Buteau](https://www.antoinebuteau.com/lessons-from-alex-schultz-of-meta/)
