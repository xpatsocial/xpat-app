# Rahul Vohra's Product-Market Fit Engine — Research & Implementation Playbook

## Source: First Round Review (2018)
**"How Superhuman Built an Engine to Find Product-Market Fit"**
https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/

---

## 1. The Sean Ellis PMF Survey — Origin

Sean Ellis (growth lead behind Dropbox, LogMeIn, Eventbrite) developed the PMF survey around 2009-2010. He benchmarked nearly 100 startups and found **one question** that predicted which products would scale:

> "How would you feel if you could no longer use [product]?"

**Answer options:**
- a) Very disappointed
- b) Somewhat disappointed
- c) Not disappointed

**The 40% threshold:** Companies where **40%+ of users answered "very disappointed"** almost always found sustainable growth. Companies significantly below 40% almost always struggled to scale. This was validated across hundreds of startups. The survey was originally hosted at Survey.io, later recreated at PMFSurvey.com.

**Minimum sample:** 30 responses for directional signal, 100+ for statistical confidence.

**Who to survey:** Users who have experienced the "real" product — at minimum used it twice, ideally active within the last 2 weeks. Superhuman sends the survey ~21 days into a user's journey.

Sources:
- https://medium.com/growthhackers/using-product-market-fit-to-drive-sustainable-growth-58e9124ee8db
- https://pmfsurvey.com/
- https://learningloop.io/glossary/sean-ellis-score

---

## 2. Vohra's 4-Question Survey (Exact Questions)

Vohra extended the Ellis single-question test into a **4-question survey** that both measures PMF and generates actionable product insight:

### Q1 — The PMF Score Question
> "How would you feel if you could no longer use [product]?"
- Very disappointed
- Somewhat disappointed
- Not disappointed

### Q2 — Ideal User (Segmentation + Positioning)
> "What type of people do you think would most benefit from [product]?"

*Insight: Happy users almost always describe themselves. This reveals your High-Expectation Customer persona in the user's own language — invaluable for marketing copy and positioning.*

### Q3 — Main Benefit (Value Proposition)
> "What is the main benefit you receive from [product]?"

*Insight: Reveals what to double down on. The words users choose become your positioning language.*

### Q4 — Improvement (Roadmap)
> "How can we improve [product] for you?"

*Insight: From "somewhat disappointed" users only — these are the blockers preventing them from becoming "very disappointed" advocates.*

---

## 3. Superhuman's Starting Position

When Vohra first ran the survey, **only 22% of users answered "very disappointed"** — well below the 40% threshold. Superhuman did not have PMF.

---

## 4. The 4-Step PMF Engine

### Step 1: Segment to Find Your Supporters

Rather than looking at the aggregate 22%, Vohra **segmented** by user type. He used Q2 responses ("What type of people would benefit most?") to identify distinct user personas.

When he filtered to only include responses from users who fit the "high-expectation customer" profile (in Superhuman's case: founders, managers, executives, and BDs who have lots of email), the PMF score **jumped from 22% to 32%**.

**The High-Expectation Customer (HXC):** A concept from Julie Supan. The HXC is the most discerning person within your target demographic — they will enjoy your product for its greatest benefit and become your most passionate evangelists. By narrowing your focus to this persona, you can optimize for the users who will actually drive your growth.

**Key move:** Discard the users who don't fit your HXC profile from your analysis. They dilute your signal.

### Step 2: Analyze Feedback to Build the Roadmap

Vohra created a **2x2 matrix**:
- **Rows:** "Very disappointed" users vs. "Somewhat disappointed" users
- **Columns:** What they love (Q3) vs. What's missing (Q4)

**Critical insight:** Ignore "Not disappointed" users entirely. They are lost causes — their feedback will pull you in the wrong direction.

Focus on "Somewhat disappointed" users who **share the same main benefit** (Q3) as your "Very disappointed" users. These people already see the core value but have specific blockers. Fixing those blockers converts them to advocates.

### Step 3: Build the Roadmap 50/50

Split engineering effort:
- **50% doubling down** on what "very disappointed" users already love
- **50% addressing blockers** that "somewhat disappointed" users identify

This ensures you don't lose what's working while systematically removing barriers to love.

### Step 4: Repeat and Track the Score

Re-survey every quarter (or on a rolling basis). Make the PMF score a **primary company OKR**. Track it like revenue.

---

## 5. Superhuman's Results Over Time

| Quarter | PMF Score | Notes |
|---------|-----------|-------|
| Initial (aggregate) | 22% | Below threshold, no PMF |
| After HXC segmentation | 32% | Same data, filtered to target persona |
| After ~3 quarters of execution | 58% | Sustained execution on the 4-step engine |

The jump from 22% to 58% happened by:
1. Narrowing the target market to the HXC
2. Doubling down on speed (what VD users loved)
3. Fixing specific blockers (mobile, calendar integration, etc.)
4. Re-surveying quarterly to confirm movement

---

## 6. Competitive Insight

While not always listed as a formal survey question, Vohra also tracked **"What would you use as an alternative?"** to understand the competitive landscape. Users who said "Gmail" vs. "Outlook" vs. "nothing" represented different segments with different needs.

---

## 7. Application to x/pat

### Our Survey (adapted)
1. "How would you feel if you could no longer use x/pat?" (VD / SD / ND)
2. "What type of people do you think would benefit most from x/pat?" (free text)
3. "What is the main benefit you get from x/pat?" (free text)
4. "How can we improve x/pat for you?" (free text)

### Segmentation Strategy
Segment by:
- **City** (Bangkok vs. Lisbon vs. CDMX users may have different PMF)
- **User tenure** (new vs. veteran)
- **Power users vs. casual** (based on session count, spots saved, connections made)
- **Travel style** (from profile data)

### Target: 40%+ "Very Disappointed" in Our HXC Segment
Before launch, our HXC is likely: *remote workers who recently relocated to a new city and need both local intel (spots) and social connection (other nomads nearby).*

### Measurement Cadence
- First survey: 14+ days after signup, 5+ sessions completed
- Re-survey: every 90 days
- Track PMF score as a primary metric alongside retention

---

## 8. Implementation

- **Component:** `src/components/PMFSurvey.tsx` — glassmorphism dark theme, one question per screen, spring animations, progress dots
- **Trigger logic:** Built into SettingsScreen + automatic trigger based on tenure/sessions
- **Backend:** `pmf_surveys` table in Supabase with RLS
- **Analytics:** PostHog events for `pmf_survey_shown`, `pmf_survey_completed`, `pmf_score`
- **Dashboard:** SQL queries for segmented PMF scoring and trending

Sources:
- [First Round Review — Superhuman PMF](https://review.firstround.com/how-superhuman-built-an-engine-to-find-product-market-fit/)
- [Coda — Superhuman PMF Engine](https://coda.io/@rahulvohra/superhuman-product-market-fit-engine)
- [Sean Ellis — PMF Survey](https://medium.com/growthhackers/using-product-market-fit-to-drive-sustainable-growth-58e9124ee8db)
- [PMF Survey Tool](https://pmfsurvey.com/)
- [Learning Loop — Sean Ellis Score](https://learningloop.io/glossary/sean-ellis-score)
