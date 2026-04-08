# Sean Ellis Growth Hacking Playbook: Frameworks, Methodology, and Application to x/pat

**Source Material**: Sean Ellis's published works, talks, and frameworks
**Primary Sources**: "Hacking Growth" (2017, co-authored with Morgan Brown), growthhackers.com blog, the original "Startup Pyramid" blog post (2009), GrowthHackers Conference talks, Startup Marketing blog
**Date Compiled**: April 8, 2026

---

## Background: Who Is Sean Ellis

Sean Ellis is the person who literally coined the term "growth hacker" in a 2010 blog post titled "Find a Growth Hacker for Your Startup." Before that, he had already built the operational playbook that the term describes. He was the first head of marketing at Dropbox, where he engineered the legendary referral program that took the company from 100,000 to 4 million users in 15 months. Before Dropbox, he held the same role at LogMeIn (IPO 2009), Eventbrite, and Lookout — in each case joining early, engineering explosive growth, then handing off to a full marketing team. He founded GrowthHackers.com, the largest community of growth practitioners, and Qualaroo, a user-survey SaaS. His book "Hacking Growth" (2017), co-authored with Morgan Brown, is the definitive operational manual for systematic growth and has been translated into 18 languages.

What separates Ellis from growth commentators is that he is an operator. Every framework he published emerged from direct experience scaling real companies, and every framework is designed to be immediately executable by a small team.

---

## 1. The Startup Pyramid: Product-Market Fit Before Everything

### 1.1 The Original Framework (2009)

In his 2009 blog post "The Startup Pyramid," Ellis laid out a hierarchy that has become foundational to startup strategy:

```
        /\
       /  \     SCALE GROWTH
      /    \    (optimize channels, build virality)
     /------\
    /        \   TRANSITION TO GROWTH
   /          \  (set up analytics, A/B testing, experiment process)
  /------------\
 /              \  PRODUCT-MARKET FIT
/________________\ (validate the product is a must-have)
```

The hierarchy is strict and sequential. You cannot — and must not — attempt to scale growth before validating product-market fit. Ellis saw this violated constantly: startups burning cash on paid acquisition for a product that nobody actually needed. He called this "pouring water into a leaky bucket."

His central argument: **if you scale growth before product-market fit, you amplify failure.** Every dollar spent on acquisition brings in users who churn, trains your team on vanity metrics, and gives you false confidence that you have a channel problem when you actually have a product problem.

### 1.2 The "Very Disappointed" Survey — Ellis's PMF Test

Ellis invented the most widely used product-market fit test in the startup world. It is a single survey question:

> **"How would you feel if you could no longer use [product]?"**
> - Very disappointed
> - Somewhat disappointed
> - Not disappointed (it isn't really that useful)
> - N/A — I no longer use [product]

The benchmark: **if 40% or more of your users say "very disappointed," you have product-market fit.** Below 40%, you do not.

This was not an arbitrary number. Ellis arrived at it empirically by benchmarking companies he had worked with and observed. Companies that broke through to sustainable growth consistently scored above 40%. Companies that struggled to grow despite heavy marketing effort consistently scored below.

Key details on how to administer the survey correctly:

- **Who to survey**: Users who have experienced the core value of the product. Not signups. Not free trial users who never activated. People who have used the product at least twice in the last two weeks (or equivalent frequency for your product category). Ellis was specific about this: surveying people who never experienced the "aha moment" will always give you artificially low scores.
- **Sample size**: At least 30-40 responses to be statistically meaningful. Ideally 100+.
- **Follow-up questions**: Ellis recommends three follow-ups:
  1. "What type of person do you think would most benefit from [product]?" — This reveals your ideal customer profile in the users' own words.
  2. "What is the main benefit you receive from [product]?" — This reveals your actual value proposition (which is often different from what you think it is).
  3. "How can we improve [product] for you?" — This reveals the gap between current experience and must-have experience.

### 1.3 The "Must-Have Experience" Concept

Ellis's central insight is that growth is not about acquiring users. It is about delivering a "must-have experience" — the moment a user realizes the product solves a real problem they have, in a way that nothing else does.

The must-have experience is not the same as the "aha moment" (though they are related). The aha moment is when a user first understands the value. The must-have experience is when the product becomes woven into their life and losing it would create a real gap.

Ellis argues that the entire job of a growth team, prior to achieving PMF, is to figure out what the must-have experience is, identify who is having it (and who is not), and then systematically remove friction so more users reach it. After PMF is confirmed, the growth team's job shifts to scaling the number of people who reach that experience as quickly as possible.

### 1.4 Application to x/pat

For x/pat, the "very disappointed" survey should be deployed to active users during the beta period — specifically those who have opened the app at least 3 times and interacted with at least one spot or one chat. The must-have experience hypothesis for x/pat is: **discovering a spot in a new city that you would not have found through Google or TripAdvisor, recommended by someone whose taste you trust.** If the survey comes back below 40%, the priority is not growth — it is improving the spot discovery experience until we cross the threshold.

---

## 2. The Growth Hacking Process: High-Tempo Testing

### 2.1 Definition of Growth Hacking

Ellis defines growth hacking precisely:

> "Growth hacking is a process of rapid experimentation across marketing channels and product development to identify the most efficient ways to grow a business."

Two words are critical in this definition: **process** and **experimentation**. Growth hacking is not a bag of tricks. It is not "going viral." It is a systematic, repeatable process built on the scientific method: hypothesis, test, measure, learn, iterate.

### 2.2 The Growth Hacking Cycle

Ellis's process follows a four-step loop, run on a weekly cadence:

1. **Analyze** — Study data to identify opportunities and bottlenecks. Where are users dropping off? What do the best-performing cohorts have in common? What features correlate with retention?

2. **Ideate** — Generate experiment ideas from the entire cross-functional team. Ellis is emphatic that ideas must come from engineering, design, customer support, data, and marketing — not just a "growth person." The best experiment ideas often come from engineers who see technical possibilities, or support reps who hear user pain points daily.

3. **Prioritize** — Score every idea using the ICE framework (see below) and rank them. Pick the top experiments for the upcoming week.

4. **Test** — Run the experiments. Measure results rigorously. Feed learnings back into the Analyze step. Repeat.

### 2.3 The ICE Scoring Framework

Every experiment idea is scored on three dimensions, each rated 1 to 10:

- **Impact**: If this experiment succeeds, how big will the effect be on the target metric? A homepage redesign that could double conversion gets a 10. A button color change gets a 2.
- **Confidence**: How sure are we that this experiment will produce the predicted impact? Based on data, prior experiments, industry benchmarks, or gut feeling? Data-backed confidence gets 8-10. Pure gut gets 1-3.
- **Ease**: How quickly and cheaply can we run this experiment? A copy change that takes 1 hour gets a 10. A feature rebuild that takes 3 weeks gets a 2.

The ICE score is the average: (Impact + Confidence + Ease) / 3.

Ellis's guidance on using ICE:

- ICE is a **prioritization** tool, not a **decision** tool. It creates a ranked list. The team should still discuss the top items and use judgment.
- Scoring should be done by the person who proposed the idea, then calibrated during the growth meeting. Over time, the team develops a shared calibration.
- The point is velocity: ICE prevents the team from endlessly debating which experiment to run. Score, rank, run.
- Re-score periodically. Confidence changes as you learn. Ease changes as you build infrastructure.

### 2.4 High-Tempo Testing: The Experiment Velocity Target

Ellis's signature operational metric is **experiment velocity** — the number of experiments launched per week. In "Hacking Growth," he advocates for:

- **Early-stage startups (pre-scale)**: 2-3 experiments per week minimum
- **Growth-stage companies**: 20-30 experiments per week
- **At scale (Facebook, Uber, etc.)**: 100+ experiments running simultaneously

The core insight: **growth is a numbers game at the experiment level.** Most experiments fail. The winning experiments are unpredictable. The only way to find winners consistently is to increase the volume of experiments. A team running 3 experiments per week will find 3x more winners than a team running 1 per week.

Ellis observed that the highest-growth companies he worked with all shared one trait: they tested more things, faster, than their competitors. Dropbox, at scale, was running dozens of experiments concurrently. The marginal cost of each experiment was low because they built the testing infrastructure to support it.

For x/pat at launch: target 2-3 experiments per week. This is achievable with a solo founder + Claude CTO setup if experiments are kept small and focused. A "copy change on the onboarding screen" is an experiment. A "new push notification timing" is an experiment. Not every experiment requires code.

### 2.5 The Weekly Growth Meeting

Ellis prescribes a specific meeting structure, held weekly, with the following agenda:

1. **Metrics review** (15 minutes) — Review the North Star Metric and supporting metrics. Is the trend up, down, or flat? Any anomalies?

2. **Review last week's experiments** (15 minutes) — For each experiment that completed: what was the hypothesis, what happened, what did we learn? Categorize as Win, Loss, or Inconclusive. Wins get documented and scaled. Losses get documented with learnings. Inconclusives get redesigned or killed.

3. **Review experiment pipeline** (15 minutes) — Look at the backlog sorted by ICE score. Discuss the top candidates for next week. Assign owners.

4. **Select next week's experiments** (15 minutes) — Commit to 2-3 (or more, at scale) experiments for the coming week. Each experiment must have: a clear hypothesis, a target metric, a success threshold, and an owner.

Ellis insists on **who attends**: this is a cross-functional meeting. Engineering, product, marketing, design, data/analytics. Growth is not a marketing function. The best experiment ideas cross traditional departmental boundaries (e.g., an engineer suggests a product change that improves a marketing metric).

For x/pat: the "growth meeting" is a weekly CTO debrief item. The experiment backlog lives in the `growth_experiments` table. The weekly meeting structure becomes a checklist in the CEO briefing.

---

## 3. The Bullseye Framework: Channel Identification

### 3.1 Overview

The Bullseye Framework (popularized by Gabriel Weinberg in "Traction" but deeply influenced by and compatible with Ellis's work) is the systematic process for finding your best acquisition channel. Ellis endorses and uses a similar approach: instead of guessing which channel will work, you systematically test multiple channels cheaply and let data decide.

Ellis's version of channel identification follows these principles:

### 3.2 The Three Rings

- **Outer Ring (What's Possible)**: Brainstorm every conceivable channel. Ellis lists 19 traction channels (from "Traction" by Weinberg/Mares, which Ellis has publicly endorsed): viral marketing, PR, unconventional PR, SEM, social/display ads, offline ads, SEO, content marketing, email marketing, engineering as marketing, targeting blogs, business development, sales, affiliate programs, existing platforms, trade shows, offline events, speaking engagements, community building.

- **Middle Ring (What's Probable)**: Based on your product, audience, and competitive landscape, narrow to 6-8 channels that seem most promising. Use lightweight research: what channels do competitors use? Where does your target audience spend time? What channels have natural fit with your product type?

- **Inner Ring (What Works)**: Test 3 channels simultaneously with small, cheap experiments. The goal is not to scale — it is to determine which channel has the best fundamental economics (cost per acquisition, quality of acquired users, scalability potential).

### 3.3 Traction Testing Methodology

Ellis's approach to testing a channel:

1. **Define a cheap test**: Spend the minimum to get signal. For content marketing, write 5 blog posts and measure traffic. For paid ads, spend $500 and measure CPA. For partnerships, do 3 manual outreach attempts and measure conversion.

2. **Measure three things**:
   - **Cost to acquire a user through this channel** (CPA)
   - **Volume available in this channel** (is it big enough to matter?)
   - **Quality of users from this channel** (do they retain? do they activate?)

3. **Time-box the test**: 2-4 weeks maximum. If you cannot get signal in a month, the channel is either wrong for you or your test design is wrong.

4. **Decision framework**: After testing 3 channels:
   - If one channel clearly outperforms: **double down**. Allocate 80%+ of growth effort to this channel. Optimize relentlessly.
   - If channels are similar: pick the one with the most untapped volume and optimize.
   - If all channels fail: your problem is likely product, not distribution. Go back to PMF.

### 3.4 When to Double Down vs. Move On

Ellis's rule: **double down when a channel shows "traction" — defined as the ability to acquire users at a cost below your LTV with room to scale.** If a channel works but is small, it is a "nice to have" but not your growth engine. If a channel is large but expensive, you need to optimize the funnel before scaling spend.

Move on when: you have optimized the channel for 4+ weeks and CPA is still above LTV, OR the channel has a hard ceiling on volume that is too low to matter.

### 3.5 Application to x/pat

Given x/pat's characteristics (location-based social, digital nomad audience, free product, affiliate revenue model), the initial 3-channel test should be:

1. **Community/existing platforms** — Digital nomad Facebook groups, Reddit r/digitalnomad, Nomad List forum. Manual seeding with genuine value posts. Cost: time only. Measures: signup rate from referral links, activation rate of these users.

2. **Content/SEO** — City guides ("Best coworking cafes in Lisbon that locals actually use") that funnel to app download. Cost: content creation time. Measures: organic traffic, app store click-through, download-to-activation rate.

3. **Ambassador/referral** — In-app referral mechanism where existing users invite friends arriving in their city. Cost: development time for referral flow. Measures: viral coefficient, quality of referred users (retention).

---

## 4. Activation and Retention Hacking

### 4.1 The Aha Moment Mapping Process

Ellis's framework for finding and optimizing the "aha moment":

**Step 1: Identify what power users do differently.** Pull behavioral data on your best-retained users (top 20% by engagement or retention). What actions did they take in their first session? First day? First week? Compare this to churned users. The behavioral difference reveals the aha moment.

Famous examples Ellis cites:
- **Facebook**: "7 friends in 10 days" — users who connected with 7 friends within their first 10 days retained at dramatically higher rates.
- **Dropbox**: "Put at least one file in one folder on one device" — the moment a user experienced the sync, they understood the value.
- **Slack**: "2,000 messages sent by a team" — once a team hit this threshold, retention was near-guaranteed.

**Step 2: Map the path to the aha moment.** What are all the steps a new user must take to reach this behavior? Sign up, verify email, complete profile, find a friend, send a message, etc. Each step is a potential drop-off point.

**Step 3: Measure the funnel.** What percentage of new signups complete each step? Where is the biggest drop-off? The biggest drop-off is your biggest growth opportunity — because fixing it moves every user downstream.

**Step 4: Experiment to reduce friction at the biggest drop-off.** This is where ICE-scored experiments come in. If 60% of users drop off between "sign up" and "complete profile," your top experiments should all target that transition.

### 4.2 Onboarding Optimization Methodology

Ellis's onboarding principles:

1. **Reduce time to value**: The aha moment should happen as fast as possible. Every screen, every form field, every confirmation email between signup and aha moment is friction. Measure "time to aha" and relentlessly compress it.

2. **Show, don't tell**: Instead of explaining what the product does, get the user doing it. Dropbox's genius was showing the sync working with a real file, not explaining syncing in a tutorial.

3. **Progressive profiling**: Do not ask for information upfront that you do not need immediately. Collect profile data over time as the user engages, not in a 5-step signup form.

4. **Trigger-based nudging**: If a user has not completed the aha moment action within a time window, send a targeted nudge (push notification, email, in-app prompt) that specifically guides them to that action.

5. **Remove negative friction, add positive friction**: Not all friction is bad. Friction that increases investment (customizing a profile, choosing interests) can increase retention through the IKEA effect. Remove friction that provides no value to the user (unnecessary form fields, confirmation screens).

### 4.3 Retention Curve Analysis

Ellis uses retention curve analysis to decide when to invest in growth vs. retention:

- **Plot cohort retention curves**: For each signup cohort (weekly or monthly), plot the percentage still active at Day 1, Day 7, Day 14, Day 30, Day 60, Day 90.
- **Look for the "smile"**: A healthy product shows a retention curve that drops, then flattens (forming an L-shape or a slight smile as re-engagement campaigns kick in).
- **The flattening point matters**: If the curve flattens at 30% monthly retention, you have a strong product. If it flattens at 5%, you have product-market fit for a niche but may struggle to build a large business.
- **When to invest in growth**: Only when the retention curve has clearly flattened. If it is still declining at Day 90, invest in retention first. Acquiring users into a leaky bucket is waste.
- **When to invest in retention**: Always, but especially when: (a) the curve has not yet flattened, or (b) the flattening point is below your business model's requirements.

Ellis's retention framework distinguishes three types:
1. **New user retention** (Day 0-7): The onboarding experience. Optimized via aha moment acceleration.
2. **Medium-term retention** (Day 7-30): The habit formation period. Optimized via engagement loops, notifications, content freshness.
3. **Long-term retention** (Day 30+): The "core product value" period. If users are still here at Day 30, they have formed a habit. Optimized via feature depth, community, and network effects.

### 4.4 Application to x/pat

**Hypothesized aha moment for x/pat**: A user opens the map in a city they are visiting, finds a spot they did not know about, and either saves it or visits it. The "save a spot" action is likely the aha moment — it is the moment the user realizes x/pat has value that Google Maps does not.

**Onboarding optimization priorities**:
1. Get users to the map with seeded spots visible within 30 seconds of first open
2. Show spots immediately (the 431 seeded spots ensure the map is never empty)
3. Prompt the user to save their first spot or tap into one for details
4. Send a push notification the next time they are near a saved spot (location-triggered re-engagement)

**Retention strategy by phase**:
- **Day 0-7**: Ensure the user has saved at least 3 spots and opened one city chat
- **Day 7-30**: Weekly "new spots in your city" push notification; prompt to add their own spot
- **Day 30+**: Community-driven retention — friends on the platform, regular chat activity, reputation from contributing spots

---

## 5. The North Star Metric

### 5.1 Ellis's Framework

Ellis advocates that every company should have a single "North Star Metric" (NSM) that captures the core value delivered to users. This is not a vanity metric (total signups, page views). It is a metric that, when it goes up, means users are getting more value.

Characteristics of a good North Star Metric:
- It reflects **value delivered to users**, not just company activity
- It is a **leading indicator** of revenue (not revenue itself)
- It is **actionable** — the team can run experiments that move it
- It is **understandable** by everyone on the team

Examples Ellis cites:
- **Airbnb**: Nights booked
- **Facebook**: Daily active users
- **WhatsApp**: Messages sent
- **Spotify**: Time spent listening

### 5.2 Application to x/pat

Candidate North Star Metrics for x/pat:
- **Weekly active spot viewers** — users who viewed at least one spot detail in the past 7 days
- **Spots saved per active user per week** — directly measures the core value (discovering places)
- **Weekly active contributors** — users who added a spot, review, or chat message

Recommended NSM: **Weekly Active Spot Interactions** (views + saves + adds). This captures both consumers and contributors, reflects genuine value delivery, and is directly movable through experiments.

---

## 6. The Growth Equation

Ellis breaks growth into a simple equation that makes the growth system legible:

**Growth = (New Users) x (Activation Rate) x (Retention Rate) x (Referral Rate) x (Revenue per User)**

Each variable is a lever. Experiments should target the lever with the most room for improvement. At launch, the typical priority order is:

1. **Retention** — Fix the bucket first
2. **Activation** — Get more people to the aha moment
3. **Acquisition** — Bring more people in (only after 1 and 2 are healthy)
4. **Referral** — Turn happy users into acquisition channel
5. **Revenue** — Monetize the value (for x/pat: affiliate integration)

This ordering is not arbitrary. Improving retention makes every subsequent user more valuable. Improving activation makes every acquired user more likely to retain. Fixing these first means your acquisition spend goes further and your referral loops work better.

---

## 7. Experiment Documentation and Learning System

### 7.1 Ellis's Experiment Card

Every experiment should be documented with:

- **Experiment name**: Short, descriptive
- **Hypothesis**: "We believe [action] will [outcome] because [reasoning]"
- **Metric**: The specific metric this experiment targets
- **Success threshold**: "We will consider this a win if [metric] improves by [X%]"
- **Owner**: Who is responsible for execution and measurement
- **ICE Score**: Impact / Confidence / Ease
- **Status**: Proposed / Running / Completed / Killed
- **Duration**: Start and end dates
- **Result**: What actually happened
- **Learning**: What we learned, regardless of outcome

### 7.2 The Learning Repository

Ellis stresses that failed experiments are valuable if the learning is captured. He advocates for a shared, searchable repository of all experiments and their outcomes. Over time, this becomes the company's institutional knowledge about what works and what does not. It prevents the team from re-running experiments that already failed and helps new team members understand the growth landscape.

For x/pat, this repository is the `growth_experiments` Supabase table, queryable via the dashboard and weekly growth meeting SQL views.

---

## 8. Implementation: Growth Experiments Table and Dashboard Queries

### 8.1 Database Schema

The `growth_experiments` table captures Ellis's experiment card format in a structured, queryable way. See the Supabase migration `20260408000002_growth_experiments` for the full schema. Key columns:

- `hypothesis` — The "we believe X will cause Y because Z" statement
- `metric_target` — Which metric this experiment aims to move
- `ice_impact`, `ice_confidence`, `ice_ease` — The three ICE dimensions (1-10 each)
- `ice_score` — Computed average, auto-calculated
- `status` — Lifecycle tracking: proposed, running, completed, killed
- `start_date`, `end_date` — Experiment duration
- `result_summary` — What happened
- `impact_measured` — Quantitative result
- `learning` — Key takeaway regardless of outcome
- `owner` — Who ran this experiment
- `category` — Which growth lever: acquisition, activation, retention, referral, revenue

### 8.2 Weekly Growth Report Query

```sql
-- Weekly Growth Meeting Dashboard
-- Run at the start of each growth meeting

-- 1. This week's completed experiments
SELECT name, hypothesis, status, result_summary, impact_measured, ice_score
FROM growth_experiments
WHERE status IN ('completed', 'killed')
  AND end_date >= now() - interval '7 days'
ORDER BY end_date DESC;

-- 2. Currently running experiments
SELECT name, hypothesis, metric_target, ice_score, start_date,
       (now()::date - start_date::date) AS days_running
FROM growth_experiments
WHERE status = 'running'
ORDER BY start_date;

-- 3. Next week's experiment queue (top candidates by ICE score)
SELECT name, hypothesis, metric_target, ice_score, category, owner
FROM growth_experiments
WHERE status = 'proposed'
ORDER BY ice_score DESC
LIMIT 10;

-- 4. Experiment velocity (experiments completed per week, last 8 weeks)
SELECT date_trunc('week', end_date) AS week,
       COUNT(*) AS experiments_completed,
       COUNT(*) FILTER (WHERE result_summary ILIKE '%win%') AS wins
FROM growth_experiments
WHERE status = 'completed'
  AND end_date >= now() - interval '8 weeks'
GROUP BY 1
ORDER BY 1 DESC;

-- 5. Category breakdown (where are we investing effort?)
SELECT category,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       ROUND(AVG(ice_score), 1) AS avg_ice_score
FROM growth_experiments
GROUP BY category
ORDER BY total DESC;
```

### 8.3 First Experiments for x/pat (Pre-Populated)

Based on Ellis's frameworks, here are the initial experiments to seed the backlog:

| Name | Category | Hypothesis | ICE |
|------|----------|-----------|-----|
| Onboarding map-first | Activation | Showing the map with spots immediately (skipping tutorial) will increase Day 1 retention by 15% | 8/7/9 = 8.0 |
| Push notification timing | Retention | Sending "new spots near you" at 9am local time will increase weekly opens by 10% | 6/5/8 = 6.3 |
| City chat welcome message | Activation | Auto-posting a welcome message when a user joins city chat will increase first-message rate by 20% | 7/6/9 = 7.3 |
| Referral invite flow | Referral | Adding "invite a friend to this city" share sheet after saving 3 spots will generate 0.3 viral coefficient | 9/4/5 = 6.0 |
| Spot photo prominence | Activation | Making spot photos 2x larger in list view will increase spot tap-through by 25% | 7/6/8 = 7.0 |

---

## 9. Key Takeaways for x/pat

1. **Do not scale growth before PMF is confirmed.** Deploy the "very disappointed" survey to beta users. Target 40%+. If below, fix the product first.

2. **Set experiment velocity target at 2-3 per week.** Use the `growth_experiments` table to track. Review in the weekly CEO debrief.

3. **Find the aha moment empirically.** Instrument "spot viewed," "spot saved," and "chat message sent" events. Analyze which actions correlate with Day 30 retention. That action is the aha moment.

4. **Test 3 acquisition channels simultaneously for 4 weeks each.** Recommended first three: community seeding, content/SEO, and in-app referral. Measure CPA, user quality (retention), and volume.

5. **Optimize in this order: retention, activation, acquisition, referral, revenue.** Do not invest in paid acquisition until Day 30 retention is stable.

6. **Run the weekly growth meeting.** Even as a solo founder, the discipline of reviewing experiments, documenting learnings, and prioritizing the next batch creates compounding knowledge.

7. **The North Star Metric is Weekly Active Spot Interactions.** Every experiment should ultimately connect to moving this number.

---

## Sources and Further Reading

- Ellis, Sean & Brown, Morgan. "Hacking Growth." Currency/Crown Business, 2017.
- Ellis, Sean. "The Startup Pyramid." Startup-Marketing.com, 2009.
- Ellis, Sean. "Find a Growth Hacker for Your Startup." Startup-Marketing.com, 2010.
- GrowthHackers.com — Community experiments database and case studies.
- Ellis, Sean. "Using Survey.io." GrowthHackers.com, 2012. (The "very disappointed" survey methodology.)
- Weinberg, Gabriel & Mares, Justin. "Traction." S-Curve Publishing, 2015. (Bullseye framework, endorsed by Ellis.)
- Alex Schultz, "How to Start a Startup: Lecture 6 — Growth," Stanford CS183B, 2014. (Complementary retention frameworks — see companion research document in this repo.)
