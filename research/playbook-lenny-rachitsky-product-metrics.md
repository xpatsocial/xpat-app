# Lenny Rachitsky's Product & Growth Frameworks: Research & x/pat Application

**Date**: 2026-04-08
**Source**: Lenny's Newsletter (lennysnewsletter.com), Lenny's Podcast, Casey Winters collaboration, Jorge Mazal guest post, Elena Verna interviews, Gustaf Alstromer interviews, Andrew Chen co-publications

---

## 1. LENNY'S RETENTION BENCHMARKS

### 1.1 The Definitive "What Is Good Retention?" Study

Lenny Rachitsky's retention benchmark study is the most widely cited in the startup world. He surveyed twenty of the most experienced growth practitioners across companies like Airbnb, Pinterest, Duolingo, Spotify, and Uber, then compiled data from 50+ companies to answer a deceptively simple question: what does good retention actually look like?

His core finding: retention is the single most important metric when building or investing in a business, but also one of the least understood. Most founders either set targets too low (accepting mediocre retention and pouring money into top-of-funnel) or too high (believing anything under 80% monthly retention means failure).

### 1.2 6-Month User Retention Benchmarks (Unbounded)

These are the percentages of a cohort still returning at 6 months, measured as unbounded retention (the user came back at any point during that period):

| Business Type | GOOD | GREAT |
|---|---|---|
| Consumer Social | ~25% | ~45% |
| Consumer Transactional | ~30% | ~50% |
| Consumer Subscription | ~40% | ~70% |
| SMB / Mid-Market SaaS | ~60% | ~80% |
| Enterprise SaaS | ~70% | ~90% |

### 1.3 Short-Term Retention Benchmarks (D1/D7/D30)

For mobile apps specifically, the industry data that Lenny references and endorses shows median benchmarks across all verticals:

| Timeframe | Median (All Apps) | Top Quartile | Excellent |
|---|---|---|---|
| Day 1 (D1) | ~26% | ~35% | >40% |
| Day 7 (D7) | ~13% | ~20% | >25% |
| Day 30 (D30) | ~7% | ~12% | >15% |

For consumer social apps specifically, the benchmarks skew higher because the use case is inherently more frequent:

| Timeframe | Good | Great | Amazing |
|---|---|---|---|
| Day 1 | ~30% | ~40% | >50% |
| Day 7 | ~15% | ~25% | >35% |
| Day 30 | ~10% | ~18% | >25% |

### 1.4 When Retention Is "Good Enough" to Invest in Growth

Lenny's framework is unambiguous: **it is a huge mistake to focus on top-of-funnel growth before getting retention right.** His threshold guidance:

1. **Do not invest in growth** if your retention curve has not flattened. If the curve keeps declining toward zero, no amount of acquisition will save you — you are filling a leaky bucket.
2. **Retention must flatten** at a meaningful level. For consumer social, the curve should stabilize above ~15-20% at month 6.
3. **Activation is the bridge.** Increasing activation rate is often the single highest-leverage growth lever. Your "aha moment" — the earliest point in onboarding that predicts long-term retention — must be identified and optimized before scaling acquisition.
4. **The readiness test**: If you are retaining users at or above the "good" threshold for your category AND your retention curve has flattened, you are ready to invest in growth. If not, every dollar spent on acquisition is wasted.

### 1.5 x/pat Retention Targets

Mapping x/pat to Lenny's framework, the app sits at the intersection of **Consumer Social** (community, chat, profiles) and **Consumer Transactional** (spot discovery, affiliate bookings). The appropriate benchmarks:

| Metric | x/pat Target (Good) | x/pat Target (Great) | x/pat Stretch (Amazing) |
|---|---|---|---|
| D1 Retention | 30% | 40% | 50%+ |
| D7 Retention | 15% | 25% | 35%+ |
| D30 Retention | 10% | 18% | 25%+ |
| M6 Retention | 25% | 40% | 50%+ |

**Critical insight for x/pat**: Digital nomad apps face a unique retention challenge — users may leave a city and stop using the app until they travel again. This creates "lumpy" retention curves. Lenny's unbounded retention metric (did the user come back at any point during the period) is more appropriate than bounded retention (did the user come back on exactly day 30). x/pat should measure both, but use unbounded as the primary KPI and expect retention curves that show periodic re-engagement spikes around travel events.

---

## 2. LENNY'S GROWTH ENGINE FRAMEWORKS

### 2.1 The Three Growth Engines

Lenny's research across hundreds of successful consumer companies identified three primary growth engines. Every successful company is powered primarily by one:

**1. Virality / Word-of-Mouth**
- Users invite other users or create content that attracts new users organically
- Examples: Airbnb (host referrals), WhatsApp (network effects), Instagram (social sharing)
- Best for: Products with inherent social value, network effects, or shareable outputs
- Key metric: Viral coefficient (K-factor) — users acquired per existing user

**2. Content / SEO**
- Users or employees create content that ranks in search or goes viral on social platforms
- Examples: Pinterest (user-generated boards ranking on Google), Yelp (reviews), TripAdvisor (UGC)
- Best for: Products where users generate public, indexable content
- Key metric: Organic traffic growth, pages indexed, search ranking positions

**3. Performance Marketing / Paid**
- Spend money to acquire users through paid channels (Facebook, Google, TikTok ads)
- Examples: Booking.com (Google Ads), DoorDash (performance marketing), Calm (paid UA)
- Best for: Products with clear unit economics where LTV > CAC
- Key metric: CAC payback period, ROAS (return on ad spend)

### 2.2 Lenny's Critical Insight: Pick One Lane

From his analysis of hundreds of startups, Lenny found that **founders who try to invest in multiple growth engines simultaneously almost always fail.** The most successful companies bet big on ONE engine and only diversify after it is humming. Betting on both SEO and virality rarely works in practice because they require fundamentally different product architectures, team skills, and investment timelines.

### 2.3 The Racecar Growth Framework

Co-created with Dan Hockenmaier, the Racecar Framework is Lenny's most comprehensive growth model. It separates growth activities into four components using a racing metaphor:

```
THE RACECAR GROWTH FRAMEWORK

  [TURBO BOOSTS] -----> One-off acceleration events
        |
  [GROWTH ENGINE] ----> Self-sustaining loop (THE thing)
        |
  [LUBRICANTS] -------> Optimization of existing flows
        |
  [FUEL] -------------> Inputs the engine requires
```

**Growth Engine (The Engine)**
A self-sustaining growth loop that drives nearly all long-term growth. This is the core — virality, content/SEO, or paid acquisition. The engine is a closed loop where output feeds back as input. Example: Users create spots on x/pat --> spots appear in search --> new users discover x/pat --> they create more spots.

**Turbo Boosts (One-Off Accelerants)**
Temporary events that spike growth but don't compound. Examples: PR coverage, Product Hunt launch, a viral TikTok, being featured in the App Store, event sponsorships. Turbo boosts are valuable for kickstarting but dangerous as a primary strategy because they require constant effort and don't build on themselves.

**Lubricants (Optimization)**
Improvements that make the engine run more efficiently. Three categories:
- **Conversion optimization**: Improving signup rates, reducing friction
- **Activation optimization**: Getting users to their "aha moment" faster
- **Retention optimization**: Reducing churn, increasing engagement frequency

**Fuel (Required Inputs)**
The resources the engine needs to run: capital for paid, content for SEO, users for virality. Without fuel, even a great engine stalls.

### 2.4 Growth Loops vs. Funnels

Lenny (drawing on Reforge's framework) makes a fundamental distinction: **the fastest-growing products are better represented as a system of loops, not funnels.**

A **funnel** is linear: Awareness --> Consideration --> Conversion --> Retention. It's useful for analyzing a single step but misses how growth compounds.

A **growth loop** is circular: the output of the system becomes the input for the next cycle. Each rotation produces more than the last.

```
FUNNEL (Linear, Depleting):
Awareness -> Interest -> Signup -> Activation -> Retention
   100        50         25        15            8
   (loses users at every step, must constantly refill top)

GROWTH LOOP (Circular, Compounding):
New User -> Creates Value -> Attracts More Users -> They Create Value -> ...
   (each cycle produces more input than it consumed)
```

The practical difference is enormous. Funnels require constant feeding. Loops are self-sustaining and compound over time. Lenny's advice: design your product around loops, and use funnel analysis only to optimize individual steps within the loop.

---

## 3. INSIGHTS FROM LENNY'S GROWTH LEADER INTERVIEWS

### 3.1 Jorge Mazal (Duolingo): The CURR Framework

Jorge Mazal, former Head of Growth at Duolingo, published one of Lenny's most impactful guest posts. His key contribution: the CURR retention methodology that drove Duolingo's 4.5x DAU growth.

**The CURR/NURR/RURR Framework:**
- **CURR** (Current User Retention Rate): The probability a user returns this week if they were active each of the past two weeks. These are your best, most engaged users.
- **NURR** (New User Retention Rate): The probability a brand-new user returns after their first session.
- **RURR** (Reactivated User Retention Rate): The probability a churned user who came back will return again.

**Duolingo's adaptation**: They shifted from weekly to daily measurement, defining "current users" as those engaged today AND at least one other time in the prior 6 days.

**Results of focusing on CURR**: Over 4 years, Duolingo achieved a 21% increase in CURR, reduced daily churn of best users by over 40%, and drove a 4.5x increase in DAU. CURR had a 5x greater impact on DAU than the second-best metric.

**The insight**: Most companies focus on acquiring new users or reactivating churned ones. Duolingo proved that protecting and growing your best existing users (CURR) is dramatically more impactful. It is cheaper to retain a current user than to win back a churned one or acquire a new one.

**x/pat application**: Implement CURR tracking from day one. Define "current x/pat user" as someone who opened the app today AND at least one other day in the past 6 days. This becomes the north star retention metric. Build features that serve current users first — streak rewards for daily check-ins, new spot alerts for their city, chat activity notifications.

### 3.2 Gustaf Alstromer (Airbnb/YC): Marketplace Growth Lessons

Gustaf Alstromer, who started Airbnb's original growth team and now advises 600+ YC startups, shared these principles on Lenny's podcast:

1. **If you don't find product-market fit, nothing else matters.** Growth tactics, viral features, referral programs — all meaningless without PMF. Talk to users obsessively.
2. **The host referral program became Airbnb's single most efficient growth lever** for supply. Incentivize your best users to bring others like them.
3. **Focus provides value, spreading thin destroys it.** Avoid deploying across many tactics. Double down on what shows promise.
4. **Marketplace tip**: The supply side is usually the harder side. For x/pat, spots (content) are the supply. Seeding 431 spots is a start, but the path to self-sustaining growth requires users creating spots organically.

### 3.3 Casey Winters (Pinterest/Eventbrite): Content-Driven Growth

Casey Winters led Pinterest's growth from early stage to 200M+ users and $12B valuation. His framework, extensively covered by Lenny:

**The Pinterest Content Loop:**
1. Users create boards full of pins (content creation)
2. Boards become searchable on Google (SEO indexing)
3. Google searchers discover Pinterest content (organic acquisition)
4. New users sign up to save/create their own boards (activation)
5. They create more content (loop restarts)

**Key insight**: Pinterest's growth engine was NOT users inviting friends. It was users creating content that attracted strangers through search. The growth team optimized for content creation, SEO indexing, and search-to-signup conversion.

**Lenny's 2x2 Content Growth Framework** (inspired by Casey):

| | SEO-Optimized | Virality-Optimized |
|---|---|---|
| **User-Generated** | Pinterest boards, Yelp reviews, Stack Overflow answers | TikTok videos, Instagram posts, tweets |
| **Company-Generated** | HubSpot blog, NerdWallet guides | Spotify Wrapped, Superhuman blog posts |

### 3.4 Elena Verna: Product-Led Growth Starts with Retention

Elena Verna (CMO at Miro, SVP Growth at SurveyMonkey, interim Head of Growth at Amplitude) shared a principle that became one of Lenny's most downloaded episodes: **product-led growth always starts with retention.**

Her framework:
1. Retention is the foundation — without it, acquisition is a hamster wheel
2. Freemium beats free trials for consumer products — let users experience value without a deadline
3. The product itself must be the primary growth driver, not sales or marketing
4. Focus on the "natural frequency" of your product — how often would a healthy user return? Design around that cadence, not an aspirational one

**x/pat application**: x/pat is inherently freemium (free for life). The natural frequency for a nomad app varies: daily when actively exploring a city, weekly for community engagement, monthly/quarterly when planning moves. Design engagement loops around each frequency band.

---

## 4. LENNY'S PRODUCT-MARKET FIT FRAMEWORK

### 4.1 The Five-Step PMF Journey

Based on research into 25 top startups, Lenny mapped the PMF journey:

1. **Get one user to love your product.** Not like — love. They would be genuinely upset if it disappeared.
2. **Get that user to come back repeatedly.** Love without repeat usage is not PMF. Retention proves the love is real.
3. **Get more users like that first one to love it.** Can you find a repeatable way to reach similar users?
4. **Notice a shift from push to pull.** You stop having to drag users in. They start coming on their own. Organic growth appears.
5. **Grow consistently.** The flywheel spins without heroic effort.

**Median timeline**: ~2 years from idea to feeling PMF. From working product to feeling PMF: 9-18 months.

### 4.2 Measuring PMF: The Sean Ellis Test

Lenny strongly endorses the Sean Ellis / Rahul Vohra approach as the most actionable PMF measurement:

**The survey question**: "How would you feel if you could no longer use [product]?"
- Very disappointed
- Somewhat disappointed
- Not disappointed
- N/A (I no longer use it)

**The threshold**: If 40%+ of respondents say "very disappointed," you have PMF. Below 40%, you have work to do.

**The improvement loop** (from Rahul Vohra's Superhuman implementation):
1. Survey users regularly
2. Segment "very disappointed" users — what do they love? What's their profile?
3. Segment "somewhat disappointed" users — what's holding them back?
4. Build for the "somewhat disappointed" group while protecting what the "very disappointed" group loves
5. Re-survey and track the % moving toward 40%

### 4.3 Signals of PMF

Lenny identifies three patterns of PMF emergence:

1. **Sudden pull**: An inflection point where organic growth spikes. Users complain when the site goes down. People use the product even when it's broken.
2. **Gradual compounding pull**: Slow but steady acceleration. Each month is slightly better than the last. Word-of-mouth slowly builds.
3. **Milestone-based confirmation**: Hitting a specific metric that proves the model works (e.g., first 100 users with >50% M6 retention).

**Lenny's definition of PMF**: "You've made a product people want, can find and keep people sustainably, and make a profit delivering to people at scale."

### 4.4 x/pat PMF Strategy

x/pat is pre-launch, which means PMF measurement starts at beta:

**Phase 1 (Family Beta / Internal Testing)**: Qualitative PMF signals only. Do testers open the app without being prompted? Do they add spots unprompted? Do they check city chat? The Sean Ellis survey is premature at this stage.

**Phase 2 (TestFlight / First 50-100 Real Users)**: Run the Sean Ellis survey after users have had the app for 2+ weeks. Target: get "very disappointed" above 25% initially, with a clear path to 40%.

**Phase 3 (Public Launch / First 500 Users)**: Survey again. If below 40%, pause growth investment and focus on the gap between "somewhat" and "very" disappointed. If above 40%, begin scaling the primary growth engine.

---

## 5. LENNY'S PRIORITIZATION FRAMEWORKS

### 5.1 RICE Scoring

Lenny endorses RICE as the standard prioritization framework for product teams:

| Factor | Definition | Scoring |
|---|---|---|
| **R**each | How many users will this impact per quarter? | Absolute number |
| **I**mpact | How much will it move the target metric? | 0.25 (minimal) to 3 (massive) |
| **C**onfidence | How sure are you about reach and impact estimates? | 50%-100% |
| **E**ffort | How many person-months will this take? | Absolute number |

**Formula**: RICE Score = (Reach x Impact x Confidence) / Effort

### 5.2 DRICE (Detailed RICE)

Lenny shared the DRICE framework from Darius Contractor and Alexey Komissarouk (Facebook, Dropbox, Airtable, Opendoor), which they claim doubled their teams' impact:

1. Run standard RICE on all ideas to create a ranked shortlist
2. For the top 10-15 ideas, run "Detailed RICE" — deeper analysis with better data, user research, and technical scoping
3. Final prioritization uses the refined DRICE scores

The key insight: most teams either over-analyze everything (slow) or under-analyze everything (wasteful). DRICE concentrates deep analysis where it matters — on the ideas that survived initial screening.

### 5.3 The "When You Can Build Anything" Decision Framework

For early-stage startups (like x/pat), Lenny's advice is simpler than any scoring model:

1. **Does it improve retention?** If yes, prioritize it. Retention is the foundation.
2. **Does it improve activation?** Second priority. Getting users to the "aha moment" faster is the highest-leverage growth activity.
3. **Does it drive acquisition?** Only prioritize this AFTER retention and activation are healthy.
4. **Does it generate revenue?** Important but should not override retention work.

This maps to his principle: **fix the bucket before you fill it.**

---

## 6. x/pat GROWTH STRATEGY: APPLYING LENNY'S FRAMEWORKS

### 6.1 Which Growth Engine for x/pat?

Applying Lenny's "pick one lane" framework:

| Engine | Fit for x/pat | Reasoning |
|---|---|---|
| **Virality / WoM** | **PRIMARY** | Nomads recommend apps to each other constantly. City-specific communities create network effects. "Have you tried x/pat?" is a natural conversation in coworking spaces. The map with 431 seeded spots creates immediate shareable value. |
| **Content / SEO** | SECONDARY (future) | Spot reviews and city guides could rank on Google, similar to Pinterest/Yelp. But this requires a web presence, which x/pat doesn't have yet. Future growth engine, not launch engine. |
| **Paid** | NOT NOW | No revenue to fund it. CAC payback undefined. Free app with affiliate revenue makes paid acquisition math very difficult pre-PMF. |

**Verdict: x/pat's primary growth engine is virality/word-of-mouth**, amplified by the tight-knit nature of nomad communities. The secondary engine (content/SEO) should be planned architecturally but not invested in until the viral engine is running.

### 6.2 Designing x/pat's Growth Loop

Following Lenny's loop-not-funnel framework:

```
x/pat VIRAL GROWTH LOOP

Nomad discovers x/pat (via friend, coworking poster, city chat invite)
        |
        v
Opens app, sees seeded spots in their city (immediate value)
        |
        v
Visits a spot, votes/comments (creates value for community)
        |
        v
Joins city chat, connects with other nomads (social value)
        |
        v
Recommends x/pat to a new arrival ("you need this app")
        |
        v
New nomad discovers x/pat (LOOP RESTARTS)
```

**Each rotation adds**: more spots with votes/comments (better content), more chat activity (more social value), more recommendations (more users). The loop compounds.

**Lubricants to optimize this loop:**
- Onboarding: Get users to discover their first relevant spot within 60 seconds (activation)
- Sharing: Make it effortless to share a spot or invite to city chat (viral coefficient)
- Notifications: Alert users when someone votes on their spot or posts in their city chat (retention)
- Streaks/rewards: Encourage daily engagement patterns (CURR protection)

### 6.3 x/pat Targets Using Lenny's Framework

**Quarter 1 (Launch to Month 3): Foundation**

| Metric | Target | Lenny Category |
|---|---|---|
| Sean Ellis "very disappointed" | >25% | Pre-PMF |
| D1 Retention | >30% | "Good" for consumer social |
| D7 Retention | >15% | "Good" for consumer social |
| Activation Rate | >40% | "Good" per Lenny's benchmarks |
| CURR (weekly) | Baseline established | Duolingo framework |

Focus: Retention and activation only. Do not invest in growth. Fix every leak in the bucket.

**Quarter 2 (Months 4-6): Validation**

| Metric | Target | Lenny Category |
|---|---|---|
| Sean Ellis "very disappointed" | >35% | Approaching PMF |
| D30 Retention | >12% | Moving toward "Great" |
| M6 Retention (first cohort) | >25% | "Good" for consumer social |
| Viral coefficient | >0.3 | Each user brings 0.3 new users |
| Organic signups | >30% of total | Pull emerging |

Focus: If retention is healthy, begin investing in the viral growth loop. Implement referral mechanics, sharing features, city chat invitations.

**Quarter 3 (Months 7-9): Growth**

| Metric | Target | Lenny Category |
|---|---|---|
| Sean Ellis "very disappointed" | >40% | PMF achieved |
| M6 Retention | >35% | Between "Good" and "Great" |
| CURR improvement | +10% from baseline | Duolingo-inspired |
| Viral coefficient | >0.5 | Approaching self-sustaining |
| Week-over-week user growth | >5% | Lenny's "good growth rate" |

Focus: Scale the viral engine. Add turbo boosts (PR, Product Hunt, nomad influencer partnerships). Begin planning the content/SEO secondary engine.

### 6.4 Priority Decisions for Next 3 Months (RICE Applied)

Using Lenny's "fix the bucket first" priority order:

| Priority | Initiative | Why (Lenny Framework) |
|---|---|---|
| 1 | Instrument retention analytics (D1/D7/D30/CURR) | Cannot improve what you cannot measure |
| 2 | Define and optimize activation moment | Highest-leverage growth lever (Lenny + Elena Verna) |
| 3 | Run Sean Ellis survey with first 50 users | Quantify distance to PMF |
| 4 | Build spot sharing / city chat invite flow | Enable the viral growth loop |
| 5 | Implement streak/return incentives | Protect CURR (Duolingo framework) |
| 6 | Remove "Coming Soon" affiliate blockers | App Store approval (prerequisite to everything) |
| 7 | Seed 3-5 additional cities | Expand addressable market for viral loop |
| 8 | Plan web presence for spot pages | Architectural prep for future SEO engine |

### 6.5 What x/pat's "Aha Moment" Likely Is

Based on Lenny's activation framework and x/pat's product design, the activation moment candidates:

1. **Discovering a spot they didn't know about** — the map reveals hidden value in their city
2. **Getting a vote or comment on a spot they added** — social validation, community belonging
3. **Receiving a useful message in city chat** — connection with fellow nomads

The activation metric should be tested: which of these actions, when completed within the first session, best predicts D7 and D30 retention? Run a correlation analysis once you have 200+ users and optimize onboarding to drive users toward the winning action.

---

## 7. KEY TAKEAWAYS

### What Lenny Would Tell x/pat's CEO

1. **Do not spend a dollar on growth until retention is proven.** Your retention curve must flatten above 15-20% at month 6 before scaling acquisition.

2. **Your growth engine is word-of-mouth.** Nomad communities are tight. One enthusiastic user in a coworking space can bring ten more. Build for shareability and social proof.

3. **Design loops, not funnels.** Every feature should ask: does this create value that attracts more users who create more value? If not, it's a lubricant or a turbo boost, not an engine.

4. **Protect your best users (CURR).** The Duolingo lesson is clear — a 21% improvement in current user retention had 5x more impact than any other metric. Your most engaged nomads are your growth engine's fuel.

5. **Measure PMF with the Sean Ellis survey.** Run it early, run it often. Track the % who would be "very disappointed" without x/pat. That number is your north star until it crosses 40%.

6. **Pick one lane and go deep.** Do not try to simultaneously build a referral program, an SEO strategy, and a paid acquisition funnel. Nail virality first. Everything else is a distraction.

7. **The timeline is 9-18 months from working product to PMF.** Do not panic if month 3 feels slow. Gradual compounding pull is a valid PMF pattern — not every product gets a sudden inflection.

---

## SOURCES

- [What is good retention - Lenny Rachitsky](https://www.lennysnewsletter.com/p/what-is-good-retention-issue-29)
- [What Is Good Retention: An Exhaustive Benchmark Study - Casey Winters x Lenny](https://caseyaccidental.com/what-is-good-retention)
- [How to know if you've got product-market fit - Lenny Rachitsky](https://www.lennysnewsletter.com/p/how-to-know-if-youve-got-productmarket)
- [The Racecar Growth Framework - Lenny Rachitsky & Dan Hockenmaier](https://www.lennysnewsletter.com/p/the-racecar-growth-frameworkexpanded)
- [The Racecar Growth Framework - Reforge](https://www.reforge.com/blog/racecar-growth-framework)
- [All the ways to grow your product - Lenny Rachitsky](https://www.lennysnewsletter.com/p/all-the-ways-to-grow-your-product)
- [How Duolingo reignited user growth - Jorge Mazal via Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-duolingo-reignited-user-growth)
- [Content-driven growth - Lenny Rachitsky](https://www.lennysnewsletter.com/p/content-driven-growth-strategy)
- [28 ways to grow supply in a marketplace - Lenny Rachitsky via Andrew Chen](https://andrewchen.com/grow-marketplace-supply/)
- [Lessons from 600+ YC startups - Gustaf Alstromer via Lenny's Podcast](https://www.lennysnewsletter.com/p/lessons-from-working-with-600-yc)
- [Elena Verna on product-led growth - Lenny's Podcast](https://www.lennysnewsletter.com/p/elena-verna-on-why-every-company)
- [A guide for finding product-market fit - Lenny Rachitsky](https://www.lennysnewsletter.com/p/finding-product-market-fit)
- [Growth Loops are the New Funnels - Reforge](https://www.reforge.com/blog/growth-loops)
- [Pinterest content loops - Casey Winters via First Round Review](https://review.firstround.com/pinterest-and-grubhubs-former-growth-lead-on-building-content-loops/)
- [Lenny Rachitsky retention benchmarks tweet](https://x.com/lennysan/status/1277620704146423809)
- [DRICE prioritization framework - via Lenny](https://www.linkedin.com/posts/lennyrachitsky_introducing-drice-a-modern-prioritization-activity-7127698277549936640-VNLZ)
