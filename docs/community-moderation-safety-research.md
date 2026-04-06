# Community Moderation, Content Safety & Trust & Safety Systems
## x/pat Research Report — April 2026

Research compiled for x/pat social app (Supabase + React Native + Expo). Covers AI moderation APIs, user reporting systems, automated safety features, App Store/Play Store requirements, trust score architecture, and nomad-specific moderation challenges.

---

## Executive Summary

x/pat operates at the intersection of the highest-risk categories for a social app: strangers meeting in person, in foreign cities, in an environment ripe for scams, fake listings, and romance fraud. The good news: content safety infrastructure has never been more accessible or affordable. The bad news: neither Apple nor Google will approve a social app without explicit evidence of moderation capability. This report covers every dimension you need to ship a safe, compliant, and trustworthy platform.

**Bottom line for launch**: You need (1) a functional report button, (2) content filtering, (3) user blocking, and (4) a support contact — these are hard App Store requirements. Everything else in this document is about building a community worth protecting.

---

## Topics 1–5: AI Content Moderation APIs

---

### Topic 1: OpenAI Moderation API

**What it does**: Classifies text input across 11 categories: harassment, harassment/threatening, hate, hate/threatening, illicit, illicit/violent, self-harm, self-harm/instructions, self-harm/intent, sexual, sexual/minors, violence, violence/graphic. Returns a boolean `flagged` field plus per-category scores (0.0–1.0) and a `results.flagged` boolean.

**Cost**: Free as of April 2026 for all OpenAI API customers. No per-call charge — bundled with API access. Rate limits: 1,000 requests/minute on standard tier.

**Accuracy**: Trained on OpenAI's internal content policy. Strong on English, weaker on non-English languages. False positive rate is low for obvious violations, but subtle context-dependent harassment can be missed. Does not handle images.

**Supabase integration**: Call from a Supabase Edge Function (Deno runtime) triggered on INSERT into posts/messages/comments tables. Pattern:

```
POST_CONTENT → Edge Function → openai.moderations.create() → if flagged: set status='pending_review', increment user.flag_count
```

Edge Function cold start adds ~200ms latency. Use as async queue (don't block UI on result) — write content, moderate in background, hide if flagged within seconds.

**React Native integration**: Never call from client directly (exposes API key). Always server-side only.

**Implementation complexity**: Low. One API endpoint, simple JSON response, well-documented SDKs. Can be wired into Supabase in 2–4 hours.

**App Store required**: Not required, but counts as fulfilling the "content filtering mechanism" requirement. Using it (and documenting it) helps App Review approval.

**Recommendation for x/pat**: Use as primary text moderation layer for posts, spot descriptions, comments, and chat messages. It's free and already in your tech stack philosophy. Add as an Edge Function triggered on all UGC inserts.

---

### Topic 2: AWS Rekognition Content Moderation

**What it does**: Analyzes images and videos for inappropriate content. Returns a taxonomy of labels: Explicit Nudity, Suggestive, Violence, Visually Disturbing, Rude Gestures, Drugs, Tobacco, Alcohol, Gambling, Hate Symbols. Each label has a confidence score (0–100). You set a confidence threshold — Rekognition suggests 50+ for moderation triggers.

**Cost**:
- Images: First 1,000/month free for 12 months (new accounts), then $0.001 per image ($1.00 per 1,000)
- Videos: $0.10/minute (stored video analysis), $0.10/minute (streaming)
- At 10,000 image uploads/month: ~$9/month post-free tier

**Accuracy**: AWS reports >90% accuracy for explicit content at confidence ≥70. Outperforms most competitors on sexually explicit content detection. Hate symbols detection added 2023 — good for flags/symbols but misses subtle context. Video analysis is best-in-class for surveillance-style moderation.

**Supabase integration**: Trigger on Supabase Storage upload events. When a user uploads a profile photo or spot image, a webhook calls a Supabase Edge Function which calls Rekognition. If confidence > threshold: quarantine the image, notify moderation queue.

```
S3/Supabase Storage → upload webhook → Edge Function → AWS Rekognition → flag + queue or approve
```

AWS SDK works in Deno (Edge Functions) with native fetch. Requires AWS credentials stored in Vault.

**Implementation complexity**: Medium. Requires AWS account setup, IAM roles, SDK configuration. The moderation call itself is simple. Integration with Supabase Storage webhooks takes 1–2 days.

**App Store required**: No, but image moderation is strongly implied by "mechanism to filter objectionable material." Profile photos and spot images need coverage.

**Recommendation for x/pat**: Use for all image uploads (profile photos, spot photos, post images). At current scale, cost is negligible — $0 for first year, ~$9/month thereafter. Combine with Google Vision SafeSearch for a second opinion on ambiguous cases.

---

### Topic 3: Google Cloud Vision SafeSearch

**What it does**: Analyzes images for five categories: ADULT (sexually explicit content), SPOOF (altered or fake imagery), MEDICAL (medical procedures, gore), VIOLENCE (violent acts), RACY (suggestive but not explicit). Each category returns a likelihood: VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY.

**Cost**:
- First 1,000 units/month: Free
- Units 1,001–5,000,000/month: $1.50 per 1,000 (standalone), free if bundled with Label Detection
- Units 5,000,001+: $0.60 per 1,000
- Note: Bundling with Label Detection (which you'd likely use for spot photo tagging) makes SafeSearch essentially free at modest scale

**Accuracy**: Strong on adult/explicit content. RACY detection useful for "suggestive but not pornographic" content that Rekognition may approve. Less accurate than Rekognition for violence and hate symbols. SPOOF detection can help identify AI-generated profile photos.

**Supabase integration**: Same pattern as Rekognition — webhook on storage upload, Edge Function calls Vision API. The Vision API response includes a `safeSearchAnnotation` object with likelihood strings for each category.

**Implementation complexity**: Low to medium. Google Cloud setup required (service account, credentials). API call is a simple REST POST with base64-encoded image or GCS URI. Official Node.js client library works in Edge Functions.

**App Store required**: Same as Rekognition — not explicitly required, but helps satisfy the "filter objectionable material" requirement.

**Recommendation for x/pat**: Use as secondary image screening, especially for the SPOOF/RACY categories that complement Rekognition. The free tier covers your entire launch phase. Useful for profile photo validation specifically.

---

### Topic 4: Perspective API (Google/Jigsaw)

**What it does**: Analyzes text for toxic comment attributes. Core attributes: TOXICITY (rude, disrespectful, unreasonable), SEVERE_TOXICITY (hateful, explicit threats), IDENTITY_ATTACK (attacks on protected characteristics), INSULT, PROFANITY, THREAT. Experimental attributes: SEXUALLY_EXPLICIT, FLIRTATION, SPAM. Returns a `summaryScore.value` (0.0–1.0) for each requested attribute.

**Cost**: Free for non-commercial use. Commercial use requires contacting Jigsaw for a license. Rate limit: 1 QPS (query per second) on free tier. For commercial/higher-volume use, the API remains free but you must register and agree to usage terms. No published per-call pricing for commercial use — contact for enterprise agreements. As of 2026, many social startups use it under the research/non-commercial banner with informal approval.

**Accuracy**: 90%+ agreement with human raters on TOXICITY for English text. Significantly weaker for non-English (Arabic, French, German available but lower accuracy). Known bias: certain identity groups mentioned in neutral context can trigger false positives. Not suitable as sole enforcement mechanism — use as a signal.

**Supabase integration**: Called from Edge Function on comment/message/post INSERT. Excellent fit for city chat channels where real-time toxicity scoring prevents pile-ons before they start. Response time: 100–300ms.

```
Comment INSERT → Edge Function → Perspective API → if TOXICITY > 0.85: shadow-flag for review; if > 0.95: auto-hide
```

**Implementation complexity**: Very low. Single REST endpoint, API key in headers, simple JSON request/response. 1–2 hours to integrate.

**App Store required**: No, but strongly recommended as it directly implements "content filtering" for your most active content surface (chat/comments).

**Recommendation for x/pat**: Use as the primary real-time filter for city chat channels and spot comments. The 1 QPS limit is fine for early growth. When you hit rate limits, implement a queue with SQS or Supabase pg_cron batch processing. Flag and auto-hide above 0.85 toxicity; send to human review queue above 0.70.

---

### Topic 5: Hive Moderation (Alternative/Supplement)

**What it does**: Multi-modal AI moderation platform covering text, images, and video with 40+ violation classes. Categories include: nudity (7 sub-categories), visual sexual abuse material (VSAM), hate symbols, drugs/weapons, graphic violence, spam/scam detection, face search (CSAM protection), and brand safety. Provides both API and managed service options.

**Cost**: Enterprise pricing — no public rate card. Typical contracts start at $500–2,000/month for startups. Offers a free trial. Per-call pricing available on self-serve tier (roughly $0.001–0.003/image for standard moderation, $0.0005–0.001/text call). Expensive relative to Google/AWS at low volume; competitive at high volume with managed review services included.

**Accuracy**: Best-in-class for comprehensive multi-modal coverage. Particularly strong on CSAM detection (PhotoDNA integration), graphic violence, and hate symbols. Used by major platforms including Discord, Reddit, and Twitter/X.

**Supabase integration**: REST API, identical integration pattern to other moderation APIs. Can route both image and text through a single service, reducing Edge Function complexity.

**Implementation complexity**: Medium — API is well-documented but requires sales engagement for most features. Good React Native SDK documentation.

**App Store required**: No.

**Recommendation for x/pat**: Defer to Phase 2/3 (post-10K MAU). At launch and early growth, OpenAI Moderation (text) + AWS Rekognition (images) + Perspective API (chat) covers the stack at near-zero cost. Add Hive when volume justifies the contract and you need managed human review escalation.

---

## Topics 6–10: User Reporting Systems

---

### Topic 6: Report Form Fields — What to Capture

A well-designed report form collects enough context to prioritize and resolve the report without creating friction that prevents users from reporting at all. The balance: more fields = better data but lower completion rate.

**Minimum viable fields** (required for App Store compliance):
- `content_id` / `content_type` — auto-populated (what is being reported)
- `reporter_user_id` — auto-populated (who is reporting)
- `reason_category` — single-select dropdown (see categories below)
- `reported_user_id` — auto-populated from context
- `timestamp` — auto-populated

**Recommended additional fields**:
- `reason_subcategory` — secondary selection based on primary reason
- `description` — optional free text (max 500 chars) — captures context AI misses
- `evidence_screenshots` — optional image attachment (up to 3)
- `was_this_in_person` — boolean, relevant for x/pat's meetup context
- `do_you_want_to_block_this_user` — boolean (surfaced simultaneously)

**Report reason categories for x/pat**:

| Category | Subcategories |
|----------|---------------|
| Fake profile / Impersonation | Stolen photos, Not a real person, AI-generated photos |
| Harassment or threats | Direct messages, Public posts, Comments, Threats of violence |
| Inappropriate content | Nudity/sexual, Graphic violence, Self-harm |
| Scam or spam | Financial scam, MLM/crypto, Spam messages, Fake spot listing |
| Safety concern from meetup | They behaved unsafely, Felt threatened, No-show / ghosted |
| Misinformation | Inaccurate spot info, False travel claims |
| Hate speech or discrimination | Race/ethnicity, Gender/sexuality, Religion, Nationality |
| Other | Free text required |

**Database schema** for Supabase:

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) NOT NULL,
  reported_user_id UUID REFERENCES users(id),
  content_id UUID,
  content_type TEXT CHECK (content_type IN ('post','comment','message','spot','profile','channel_message')),
  reason_category TEXT NOT NULL,
  reason_subcategory TEXT,
  description TEXT,
  evidence_urls TEXT[],
  was_in_person BOOLEAN DEFAULT false,
  reporter_blocked BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved_action','resolved_no_action','escalated')),
  priority_score INTEGER DEFAULT 0,
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**App Store required**: Yes — the reporting mechanism itself is explicitly required by Apple Guideline 1.2 and Google Play UGC policy.

---

### Topic 7: Report Prioritization — How to Score and Queue

Not all reports are equal. A death threat requires action in minutes; a spam complaint can wait hours. Prioritization prevents moderators (including founder-as-moderator at launch) from burning out on low-signal noise.

**Priority scoring algorithm**:

```
Priority Score = base_severity + velocity_modifier + reporter_trust_modifier + recency_modifier
```

**Base severity by category**:
| Category | Base Score |
|----------|------------|
| Threats of violence / self-harm | 100 |
| CSAM (any indication) | 100 — escalate immediately |
| Doxxing / sharing private info | 90 |
| Sexual content (non-CSAM) | 70 |
| Harassment / targeted abuse | 70 |
| Scam (active financial solicitation) | 65 |
| Fake identity / impersonation | 50 |
| Spam / low-quality content | 20 |
| Misinformation | 30 |

**Velocity modifier**: +10 per additional report on the same piece of content within 24 hours (up to +50 cap). Multiple independent reports are a strong signal.

**Reporter trust modifier**: +15 if reporter has high trust score (see Topics 21–25). -10 if reporter has history of false reports (serial reporters with low action rate).

**Recency modifier**: +20 if content is <1 hour old (time-sensitive moderation matters most for fresh content). -5 for content >7 days old.

**Thresholds**:
- Score ≥ 90: Auto-escalate, notify founder immediately (push notification to admin)
- Score 60–89: High priority — review within 2 hours
- Score 30–59: Medium priority — review within 24 hours
- Score < 30: Low priority — review within 72 hours

**Supabase implementation**: Calculate `priority_score` in a database trigger or Edge Function on report INSERT. Store in `reports.priority_score`. Admin panel queries `WHERE status = 'pending' ORDER BY priority_score DESC`.

**App Store required**: Not explicitly, but Apple requires "timely responses to concerns" — a prioritization system is how you operationalize that.

---

### Topic 8: Report Resolution Workflows

Resolution is where most small platforms fail. Reports pile up, no action is taken, users lose faith, and the community degrades. A defined workflow prevents this even with one founder doing moderation.

**Resolution states**:
1. `pending` → new report, unreviewed
2. `reviewing` → moderator opened and is evaluating
3. `escalated` → requires second opinion or legal review
4. `resolved_action` → action was taken (content removed, user warned/suspended/banned)
5. `resolved_no_action` → reviewed and found no violation
6. `appealed` → user contested the action

**Standard resolution workflow**:

```
Report received → auto-priority-scored → moderator review →
  IF violation: determine action tier (warning/restrict/suspend/ban) →
    notify reported user → notify reporter ("action was taken") →
    log in moderation_actions table → update user.violation_count
  IF no violation:
    notify reporter ("we reviewed and found no violation") →
    log outcome
```

**Moderator review checklist** (to ensure consistency):
1. View the reported content in full context (not just the flagged snippet)
2. Review reported user's history (past reports, prior violations)
3. Check if this is a coordinated report (same reporter + target across multiple reports — possible harassment via reporting)
4. Apply the community guidelines framework (warning/restrict/suspend/ban)
5. Draft user notification message from template
6. Take action, update report status, log rationale

**Anti-abuse of reporting**: Track reporters too. A user who files 20 reports/week with <10% action rate may be using the report system as a harassment tool. Flag for review.

**Reporter notification**: Always notify the reporter that their report was reviewed and whether action was taken (never disclose what action — just "action was taken" or "we found no violation"). This closes the loop and maintains reporter trust.

**SLA targets for x/pat**:
- Priority ≥ 90: 15 minutes (push alert to founder)
- Priority 60–89: 2 hours
- Priority 30–59: 24 hours
- Priority < 30: 72 hours

**App Store required**: Apple requires "timely responses to concerns." This workflow is your evidence of compliance.

---

### Topic 9: Moderation Action Templates and User Communication

Inconsistent moderation communication erodes trust. Users who receive vague "your content was removed" notifications without explanation will churn. Users who receive clear, empathetic explanations are more likely to reform behavior and remain on the platform.

**Notification templates** (store in database, localize by language):

| Action | Template |
|--------|----------|
| Content removed (warning) | "We removed your [post/comment/photo] because it didn't follow our Community Guidelines ([link]). This is a first notice — your account is in good standing." |
| Temporary restriction | "Your account has been restricted for [X] hours because of repeated violations of our Community Guidelines. During this time, you can browse but cannot post or message. [Appeal link]" |
| Suspension | "Your account has been suspended for [X] days. Reason: [specific guideline violated]. If you believe this was a mistake, [appeal link]. Learn more about our guidelines at [link]." |
| Permanent ban | "Your account has been permanently removed for [reason]. This decision is final for violations involving [safety/threats/CSAM]." |
| No action | "We reviewed your report about [content type]. After careful review, we found the content doesn't violate our Community Guidelines. If you're still concerned, you can block this user. [Block link]" |
| Action taken on report | "We reviewed your report and took action. Thank you for helping keep x/pat safe." |

**Key principle**: Never tell the reported user who reported them. Never tell the reporter what specific action was taken. Both protect users from retaliation.

**Appeal flow**: For suspensions (not permanent bans), offer a simple appeal form. 3-field form: appeal reason, any evidence, acknowledgment that repeated violations will result in permanent removal. Respond within 48 hours. At launch, founder handles appeals directly.

**App Store required**: No explicit requirement, but Apple expects "timely responses to concerns" and Google Play requires "accessible" appeals for UGC violations.

---

### Topic 10: Moderation Queue Infrastructure for Supabase

A functional moderation queue requires minimal infrastructure but must be designed correctly from the start.

**Core tables**:

```sql
-- Reports table (covered in Topic 6 schema)

-- Moderation actions log
CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id),
  moderator_id UUID REFERENCES users(id),
  target_user_id UUID REFERENCES users(id) NOT NULL,
  action_type TEXT CHECK (action_type IN (
    'content_removed','warning_issued','account_restricted',
    'account_suspended','account_banned','no_action','appeal_granted','appeal_denied'
  )),
  action_duration_hours INTEGER, -- NULL for permanent
  reason_internal TEXT, -- moderator notes, not shown to user
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User violation tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS violation_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active'
  CHECK (account_status IN ('active','restricted','suspended','banned'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS restriction_expires_at TIMESTAMPTZ;
```

**Admin panel requirements** (minimum viable for launch):
- List of reports sorted by priority_score DESC
- Quick-action buttons: Remove Content / Warn User / Restrict / Suspend / Dismiss
- User profile sidebar showing full history when reviewing a report
- Bulk actions for spam campaigns (ban + remove all content from user)

**Supabase RLS for moderation**: Create a `moderators` role with elevated access to reports and moderation_actions tables. Never expose raw report data to regular users.

**App Store required**: No, but this infrastructure is what makes the report button actually functional rather than a checkbox for reviewers.

---

## Topics 11–15: Automated Safety Features

---

### Topic 11: Keyword Filtering

Keyword filtering is the lowest-cost, highest-immediate-impact safety feature. It runs synchronously before content is written to the database, preventing violations rather than catching them post-hoc.

**How it works**: Maintain a list of banned/flagged terms. On content submission, scan the text. Levels:
- **Hard block**: Content is rejected entirely (slurs, CSAM language, direct threats)
- **Soft flag**: Content is posted but added to review queue (financial scam terms, off-platform solicitation)
- **Warning prompt**: User is shown a warning before submitting ("This looks like it might violate our guidelines. Continue?")

**Pattern matching beyond single words**: Most sophisticated scammers avoid single keyword triggers. Use regex patterns:
- Financial patterns: `/(?:western\s+union|wire\s+transfer|send\s+me\s+\$|investment\s+opportunity|crypto\s+wallet|bitcoin\s+address)/i`
- Off-platform solicitation: `/(?:whatsapp\s+me|telegram\s+me|add\s+me\s+on|move\s+to\s+telegram|continue\s+on\s+whatsapp)/i`
- Direct threats: `/(?:i\s+will\s+(?:kill|hurt|find)\s+you|know\s+where\s+you\s+live)/i`

**Nomad-specific scam keywords for x/pat**: Add patterns for: "visa sponsorship for fee," "accommodation in exchange," "help me transfer money," "I am stuck abroad," "need emergency funds," "coworking space free if you," "coliving arrangement," "working holiday visa help" (legitimate phrase but common scam hook).

**Implementation in Supabase**: Two approaches:
1. **Database trigger** (runs on INSERT): Simple SQL function that checks against a `blocked_keywords` table. Most performant.
2. **Edge Function** (more flexible): Handles regex patterns and context-aware filtering; can call external APIs.

**Database approach**:
```sql
CREATE TABLE keyword_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern TEXT NOT NULL,
  filter_type TEXT CHECK (filter_type IN ('hard_block','soft_flag','warning')),
  category TEXT,
  is_regex BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true
);
```

**Cost**: Zero. Engineering time: 1–2 days for basic implementation, 1 week for comprehensive pattern library.

**False positive rate**: 5–15% for broad patterns. Tuning required over time. Never hard-block single common words — always use phrase patterns.

**App Store required**: Not explicitly, but directly fulfills "filtering objectionable material." Document its existence for App Review.

---

### Topic 12: Rate Limiting

Rate limiting is anti-abuse infrastructure. It prevents spam, bot activity, message bombing, and coordinated harassment without requiring content analysis.

**What to rate limit for x/pat**:

| Action | Limit | Window | Rationale |
|--------|-------|--------|-----------|
| New direct message conversations | 10/day | 24 hours | Prevents mass spam |
| Messages in a single conversation | 100/hour | 1 hour | Prevents message bombing |
| New post/spot creation | 5/day | 24 hours | Prevents spam posting |
| Comments on a single item | 20/hour | 1 hour | Prevents harassment pile-ons |
| City chat messages | 30/hour | 1 hour | Prevents channel flooding |
| Profile photo changes | 3/day | 24 hours | Prevents rapid identity switching |
| Report submissions | 10/day | 24 hours | Prevents report abuse |
| Account creation from same IP | 3/day | 24 hours | Prevents bot account creation |

**New account cooling period**: Accounts <24 hours old get stricter limits:
- Max 3 new DM conversations in first 24 hours
- Cannot create spots in first 24 hours
- Cannot access city chat in first 24 hours
- Cannot follow more than 10 users in first 24 hours

**Supabase implementation**: Use Supabase's built-in rate limiting via Edge Functions or implement with a `rate_limit_log` table:

```sql
-- Simple rate limit tracking
CREATE TABLE rate_limit_log (
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER DEFAULT 1,
  PRIMARY KEY (user_id, action_type, window_start)
);
```

For production, use Redis (Upstash Redis integrates with Supabase Edge Functions) for sub-millisecond rate limit checks. Upstash free tier: 10,000 requests/day free, then $0.20 per 100K requests.

**Cost**: Near-zero. Upstash Redis free tier covers early growth. ~$5–20/month at scale.

**App Store required**: No, but essential for platform viability.

---

### Topic 13: Shadowbanning

Shadowbanning (also called "ghost mode" or "soft muting") is the practice of restricting a user's visibility without notifying them. Their content is visible only to themselves, not to others. This prevents ban evasion (users don't know they're restricted, so they don't create new accounts) and reduces confrontational moderation interactions.

**Use cases for shadowbanning** (vs. hard action):
- Suspected bot accounts: Not yet confirmed, but behavior is suspicious
- Borderline-quality content: Below community standards but not a clear violation
- New accounts with spam patterns: Restrict visibility until trust is established
- Testing moderation changes: Shadow-restrict before committing to a policy

**What to shadowban in x/pat**:
- Posts/spots: Visible to creator, invisible in feeds/search/city channels to others
- Comments: Visible to creator, hidden from everyone else
- Messages: Delivered to sender (appears "sent"), but not delivered to recipient — or delivered but deprioritized
- Profile: Removed from search results, invisible to non-followers

**Database implementation**:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_shadowbanned BOOLEAN DEFAULT false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_shadowbanned BOOLEAN DEFAULT false;

-- RLS policy: shadowbanned content hidden from others
CREATE POLICY "hide_shadowbanned_content" ON posts
  FOR SELECT USING (
    NOT is_shadowbanned OR auth.uid() = user_id
  );
```

**Ethics considerations**: Shadowbanning is controversial. Overuse or use on legitimate users destroys trust if discovered. Best practices:
- Only shadowban confirmed or high-confidence abusive accounts, not just annoying ones
- Set a review date: shadowbans should expire or be escalated to real bans after 7–30 days
- Never shadowban based solely on automated signals — require human confirmation
- Log all shadowban decisions with rationale

**Cost**: Zero.

**App Store required**: No. Apple and Google don't require or prohibit it.

---

### Topic 14: Temporary Blocks and Feature Restrictions

Graduated enforcement — restricting specific features before full suspension — preserves user relationships, reduces appeals, and gives users a chance to correct behavior.

**Restriction tiers for x/pat**:

| Restriction | Duration | What's blocked | Trigger |
|-------------|----------|----------------|---------|
| Messaging restriction | 24–72 hours | Cannot initiate new DMs | First harassment via DM |
| Posting restriction | 24–72 hours | Cannot create posts/spots | First spam or low-quality posting |
| Chat restriction | 24–72 hours | Removed from city channels | First chat rule violation |
| Full restriction | 3–7 days | All creation/messaging locked | Repeat violations or moderate violation |
| Suspension | 7–30 days | Account fully suspended | Serious violations |
| Permanent ban | Indefinite | No access | Severe violations |

**Supabase implementation**: Enforce via middleware check in Edge Functions or RLS. On any write action, check `users.account_status` and `users.restriction_expires_at`. If restricted and within restriction window, return 403 with a message explaining the restriction.

**Automated triggers for temporary blocks** (no human required):
- 3 reports in 24 hours from different users → auto-apply 24-hour messaging restriction + flag for review
- Perspective API score > 0.95 twice in 1 hour → auto-apply 1-hour chat restriction
- Rate limit exceeded 5 times in 1 hour → auto-apply 6-hour creation restriction

**Lift mechanism**: Automatic (expires at `restriction_expires_at`). Edge Function or pg_cron job updates `account_status` back to `active` when restriction expires.

**Cost**: Zero.

**App Store required**: No, but "ability to block abusive users" in App Store Guideline 1.2 can also be interpreted as platform-level blocking (not just user-to-user blocking). Feature restrictions fulfill this spirit.

---

### Topic 15: Automated Content Queues and ML Pipeline Design

As your user base grows, purely reactive moderation (wait for reports) fails. Proactive queuing — where AI flags content before users report it — is how mature platforms maintain safety.

**Proactive moderation pipeline**:

```
UGC Created (post/image/message/spot)
    ↓
Parallel processing (async, doesn't block user):
    ├── Text: OpenAI Moderation → flag categories
    ├── Text: Perspective API → toxicity score
    ├── Images: AWS Rekognition → content labels
    └── Pattern match: Keyword/regex filter
    ↓
Aggregated score calculation:
    - Any hard block → immediate auto-remove
    - Score ≥ 0.85 → auto-hide + high priority queue
    - Score 0.60–0.84 → visible + medium priority queue
    - Score < 0.60 → visible + low priority queue (sample review)
    ↓
Moderation queue with priority scoring (Topic 7)
    ↓
Human review → final action
```

**Sample review**: Don't review every low-priority item — sample 5% of content that passes automated screening. This catches false negatives and helps calibrate your AI thresholds over time.

**Feedback loop**: When a moderator overrides an AI decision (AI flagged but no violation, or AI missed but user reported), log the discrepancy. Use this data to tune thresholds monthly.

**Latency targets**:
- Hard block: Synchronous — content never reaches database
- Automated AI review: < 5 seconds (async, content visible during this window)
- High-priority queue alert: < 30 seconds after content creation

**Cost at launch**: ~$0–10/month (free tier APIs).
**Cost at 10K MAU**: ~$50–150/month (API calls on paid tiers).

**App Store required**: No, but this architecture is what makes your required "content filtering" actually effective.

---

## Topics 16–20: App Store and Play Store Safety Requirements

---

### Topic 16: Apple App Store Requirements for Social Apps

Apple's Guideline 1.2 (User-Generated Content) is the most directly relevant section for x/pat and represents the floor below which your app will be rejected.

**Hard requirements** (rejection if missing):

1. **Content filtering mechanism**: The app must have a system to prevent or filter objectionable material. This does not need to be AI-powered — even a report+review queue counts, but you must be able to demonstrate it works. App Review may ask you to demonstrate reporting in their review session.

2. **Report offensive content mechanism**: A functional "Report" button accessible from all UGC surfaces. Must be discoverable (not buried in settings). Must actually submit the report somewhere — a mailto: link alone has been rejected.

3. **Timely response to concerns**: No specific SLA is published, but "timely" has been interpreted as: same-day for severe content, within 72 hours for standard reports. Apple has rejected apps that received multiple reports during App Review with no response.

4. **Block abusive users**: Users must be able to block other users. The block must be bidirectional (blocked user can't see reporter's content either). Accessible from profiles and, for chat apps, from the chat screen.

5. **Published contact information**: A support email or contact form that actually works. Frequently, App Review will test this before approving. Must be current and respond within reasonable time.

**Additional requirements that apply to x/pat**:

- **Age rating**: If your app has any user-generated content, you are required to rate it 12+ or 17+ depending on your filtering capability. x/pat should target 12+ (with content filtering in place) to maximize reach, or 17+ if you cannot guarantee family-safe content.

- **Account deletion**: Since iOS 15.6 (2022), required: apps that allow account creation must allow in-app account deletion. Must delete all personal data.

- **Privacy policy**: Required for all apps that collect personal data. Must be linked in the App Store listing and accessible in-app.

- **Parental controls/age gates**: Not required unless you have mature content. But if you do, an age gate is required.

**What App Review actually tests** (reported by developers in forums):
- They will create an account and try the full reporting flow
- They will look for the block button
- They will submit a support request to your contact email
- For social/dating-adjacent apps, they may flag the entire app for Human Review even if guidelines are technically met

**App Store required**: All items in this section are required for approval.

---

### Topic 17: Google Play Store Requirements for Social Apps

Google Play's User-Generated Content policy (effective 2023, updated 2024) is broadly similar to Apple's but has additional specifics.

**Hard requirements under Play Store UGC Policy**:

1. **Prominent reporting mechanism**: Must be "easily accessible" — defined as no more than 2 taps from any piece of user content. Google is more prescriptive than Apple here.

2. **Blocking**: Same as Apple — bidirectional blocking required.

3. **Content moderation system**: Google requires you to have a "system for detecting, reviewing, and removing content that violates Google's policy or your own policies." Human review alone is sufficient if you can demonstrate response times.

4. **App must respond to reports within 24 hours for serious violations**: Google explicitly states that "content that presents threats of violence, CSAM, harassment, or hate speech" must be actioned within 24 hours or the app risks suspension.

5. **Anti-harassment tools**: Beyond blocking, Google recommends (and for some app categories, requires) muting/restricting, not just full blocking.

**Additional Google Play requirements**:

- **Sensitive events policy**: During elections, pandemics, or other sensitive events, Google may restrict content on your platform. Have a moderation escalation path for this.

- **Families policy**: If your app is accessible to children (or if you set age rating to "Everyone"), stricter content rules apply. x/pat should set minimum age to 17+ in Play Store to avoid Families Policy restrictions.

- **Data safety form**: Must accurately disclose all data collection practices. Misrepresentation is grounds for removal. Report data (even anonymized) counts as user data.

- **Account deletion**: Google Play has required in-app account deletion since December 2023. Same standard as Apple.

- **Real-money transactions disclosure**: Not directly safety, but if your affiliate links lead to bookings, you must comply with Google's financial services policies.

**What Play Review tests** (based on developer reports):
- Automated scanning of the APK for privacy violations, tracking SDKs, and permissions
- Policy bots check your app description and screenshots for claims about content restrictions
- Human reviewers test reporting and blocking flows for apps in the Social category

**App Store required**: All items required for Play Store approval.

---

### Topic 18: CSAM Detection and Legal Obligations

Child Sexual Abuse Material (CSAM) detection is a legal requirement, not just a platform policy. Failure to report known CSAM to NCMEC (National Center for Missing & Exploited Children) is a federal crime under U.S. law (18 U.S.C. § 2258A).

**Legal requirements for x/pat**:

- If your platform allows image uploads, you are legally required to report discovered CSAM to NCMEC's CyberTipline
- This applies even as a small startup — there is no size exemption
- Once you become aware of CSAM on your platform, you must act immediately and preserve evidence

**Technical implementation**:

**PhotoDNA** (Microsoft): Industry-standard CSAM detection using image hashing to match against known CSAM databases. Free for qualifying organizations via the PhotoDNA Cloud Service. Requires application and approval from Microsoft.

**Google Child Safety API**: Google offers free CSAM hash-matching via their Content Safety API for platforms that qualify. Apply at safety.google.

**Hive CSAM detection**: Included in Hive Moderation Enterprise tier.

**Implementation**: All image uploads → hash computed client-side or server-side → hash checked against NCMEC hash database → match triggers immediate quarantine + legal notification workflow.

**NCMEC CyberTipline reporting**: Must include: URL/location of content, date/time discovered, any known user info, platform info. Required within 24 hours of becoming aware.

**Cost**: PhotoDNA and Google Child Safety API are free for qualifying platforms. Application required — plan 2–4 weeks for approval.

**App Store required**: Apple explicitly requires compliance with applicable laws. CSAM detection is legally required, not just a guideline. Both Apple and Google will immediately remove apps found hosting CSAM.

**Recommendation for x/pat**: Apply for PhotoDNA Cloud Service immediately — the application takes weeks, and you need this before launch. It's free and legally required.

---

### Topic 19: Age Verification and Minors Policy

Both platforms have increasingly strict requirements around minors, driven by legislation (UK Age-Appropriate Design Code, EU DSA, U.S. KOSA bill proposals).

**App rating strategy for x/pat**:

- **Apple**: Rate the app 17+ (Frequent/Intense Mature Suggestive Themes, Alcohol/Tobacco/Drug Use, Unrestricted Web Access). This limits your addressable market but protects from minors policy violations given that x/pat features adult coworking, bar/nightlife spots, and stranger meetups.
- **Google Play**: Set minimum age to 17+ and mark as "Adults Only" content in Play Console. This excludes the app from Families policies.

**Why 17+ is better than 12+** for x/pat:
- Avoids Google Families Policy restrictions on advertising and tracking
- Reduces COPPA exposure (13+ threshold in the U.S.)
- Appropriate for an app about alcohol-serving venues, nightlife spots, and meeting strangers
- Still reaches your entire target audience (digital nomads skew 24–40)

**Age gate implementation** (even with 17+ rating, a lightweight gate is good practice):
- On first launch: "By continuing, you confirm you are 18 or older." — simple declared age gate
- This is sufficient for App Store compliance at 17+ rating
- Biometric age verification (Yoti, Age Verification Providers Association) is not required at your scale

**DSA (EU Digital Services Act) implications**: If x/pat reaches 45M+ EU users, DSA tier 2 requirements kick in (risk assessments, algorithm transparency reports, etc.). Not relevant now, but worth knowing the threshold.

**App Store required**: Age rating itself is required (Apple/Google both require you to set one). 17+ rating is the recommended choice. In-app age gate is not explicitly required but is strongly recommended for the social/meetup category.

---

### Topic 20: Safety Disclosures and Transparency Requirements

Both stores increasingly require platforms to publish safety information, moderation statistics, and policy documents.

**Apple requirements**:
- Privacy policy linked in App Store listing (required)
- "Safety" section in app if you have meetup/dating-adjacent features (strongly recommended, not yet required)
- Nutritional label-style privacy disclosure in App Store Connect (required since 2020 — you must accurately answer all data collection questions)

**Google Play requirements**:
- Data Safety Form (required since 2022): Must disclose all data collected, purpose, sharing practices
- Policy compliance URL: A publicly accessible page explaining your community guidelines
- Safety section in Play Store listing (optional but recommended for social apps)

**Recommended transparency page** for x/pat (host at xpat.social/safety):
- Community Guidelines (full text)
- How reporting works (user-facing explanation)
- Response time commitments ("We review all reports within 24 hours")
- How to appeal a moderation decision
- Contact for safety concerns: safety@xpat.social
- Link to NCMEC CyberTipline
- Link to local emergency resources

**Quarterly safety report** (voluntary but builds trust):
- Number of reports received
- Number of accounts actioned
- Most common violation categories
- Average response time to reports
- Number of accounts banned

Twitter/X, Discord, and TikTok all publish transparency reports. Users increasingly expect this from any social platform, even small ones. Publishing even basic numbers demonstrates accountability.

**DSA Article 15 (EU)**: Platforms accessible to EU users should publish a "statement of reasons" for moderation actions. Already part of your notification template design (Topic 9).

**App Store required**: Privacy policy and Data Safety Form are required. Transparency page is recommended and may become required as DSA enforcement reaches U.S. companies serving EU users.

---

## Topics 21–25: Building a Trust Score System

---

### Topic 21: Trust Score Architecture — Signals and Weights

A trust score is a single number (typically 0–100) that reflects a user's overall trustworthiness on the platform. It drives moderation decisions, feature access, and content visibility. Done right, it creates strong incentives for good behavior without users feeling surveilled.

**x/pat Trust Score components**:

| Signal | Weight | Direction | Notes |
|--------|--------|-----------|-------|
| Email verified | +5 | One-time | Required for any trust |
| Phone verified | +5 | One-time | SMS verification |
| Selfie verified (photo match) | +10 | One-time | Stripe Identity or Veriff |
| Government ID verified | +15 | One-time | Highest identity signal |
| Account age (days) | Up to +10 | Gradual | +1 per 10 days, capped at 100 days |
| Profile completeness | Up to +10 | Adjustable | Bio, avatar, location, interests filled |
| Spot contributions (approved) | Up to +10 | Gradual | +1 per approved spot/photo |
| Community reviews received (positive) | Up to +15 | Gradual | Post-meetup reviews |
| Reports received and actioned | Up to -30 | Decreasing | -5 per substantiated report |
| Reports received (unsubstantiated) | 0 | Neutral | False reports don't penalize |
| User was reported but no action | -1 | Minor signal | Low-confidence negative |
| Warnings/restrictions issued | -5 to -15 | Per action | Depends on severity |
| Account in good standing >180 days | +5 | One-time milestone | Longevity bonus |

**Score bands and their meaning**:

| Score | Band | Trust Level | Capabilities |
|-------|------|-------------|--------------|
| 0–20 | New | Unverified | Read-only, severely limited posting |
| 21–40 | Basic | Email only | Can post, limited DMs |
| 41–60 | Established | Phone verified | Full feature access |
| 61–80 | Trusted | Photo/activity verified | Priority in search, can see meetup features |
| 81–100 | Verified Community Member | ID verified + active | Ambassador badge, priority support |

**Recalculation frequency**: Real-time for negative signals (violations). Daily batch for positive signals (account age, activity). Use Supabase pg_cron for daily recalculation job.

**Cost**: Zero — pure application logic.

**App Store required**: No, but trust scores are increasingly expected by users of social platforms. Visible trust scores on profiles increase conversion in meetup scenarios by 20–40% (Airbnb research).

---

### Topic 22: Positive Trust Signals — What Earns Trust

Positive trust signals represent behaviors that indicate the user is genuine, active, and contributing value to the community. For x/pat specifically, the highest-value positive signals are those that are hard to fake.

**Hard-to-fake positive signals** (high weight):
1. **ID verification**: Government ID matched to selfie — definitively proves real person
2. **Positive post-meetup reviews from others**: Someone vouching for you after a real-world interaction. Extremely hard to game without real meetups.
3. **Spot accuracy confirmed**: Other users rating your spots as accurate/helpful. Shows you're genuinely in these cities.
4. **Long-term consistent location usage**: Access from Bangkok one week, Lisbon the next — consistent with actual nomad travel. Bots/scammers typically have one location.
5. **Payment-linked account**: If user books something via affiliate link, they're a real person with a real payment method.

**Easy-to-fake signals** (low weight, require corroboration):
- Profile completeness (fill any text, upload any image)
- Number of posts (can be spammed)
- Follow count (can be purchased)
- Account age alone (old dormant accounts reactivated for scams)

**Vouching system** (Couchsurfing model, for Phase 2+):
- Users with trust score ≥ 75 can "vouch" for other users
- Vouching adds +5 to recipient's trust score
- Vouchees can vouch others once they reach 75 themselves (creates chain of accountability)
- Maximum vouches received: 3 (prevents vouching rings)
- Vouching should require a real-world basis (post-meetup or multi-interaction history)

**Activity-based trust**: Define "healthy activity" patterns. Users who match these patterns get gradual trust boosts:
- Regular (not excessive) logins: 3–5 days/week
- Consistent use across features (not just DMs): feeds, maps, spots
- Gradual growth in connections (not sudden follower spikes)
- Content engagement (likes, comments, saves) distributed across many posts

**App Store required**: No.

---

### Topic 23: Negative Trust Signals — What Indicates Abusive Behavior

Negative signals are the foundation of proactive moderation. Rather than waiting for reports, behavioral analysis surfaces suspicious users for early intervention.

**High-confidence negative signals** (immediate action threshold):
- Substantiated reports from multiple independent users
- Content removed by moderator (confirmed violation)
- Account suspended or banned (current or past)
- Matching PhotoDNA hashes (definitive — immediate ban)
- IP address matching known bot networks or VPN services with high fraud association

**Medium-confidence negative signals** (flag for review):
- Identical or near-identical messages sent to many users in short windows
- Profile photos reverse-image-searched to known scammer databases or stock photos
- Requesting off-platform communication within first 3 messages
- Account created with temporary email domain (10minutemail, guerrillamail, etc.)
- High message volume to low-response-rate recipients (typical of spam campaigns)
- Sudden profile change (new photos, new name) after receiving reports

**Low-confidence negative signals** (minor score reduction, monitor):
- Unverified account > 30 days old (verified users are lower risk)
- High post volume with zero community engagement (posts but no one responds)
- Login from new device + new location + immediate mass-messaging pattern
- Bio contains URLs or contact information (common spam vector)

**Velocity signals** (bot/campaign detection):
- >20 messages/hour to different users
- >10 new conversations initiated within 1 hour
- Same content posted across >3 spots in <30 minutes
- Account creation + 50+ actions within first 60 minutes (bot behavior baseline)

**Machine learning approach (Phase 3)**: Train a gradient-boosted model (XGBoost, LightGBM) on features derived from the above signals. Label training data using confirmed-spam accounts. Deploy as a Supabase Edge Function called nightly on active accounts.

**Cost**: Behavioral analysis is free (database queries). ML model at Phase 3: ~$50–200/month compute.

---

### Topic 24: Trust Score Transparency and User Communication

Users should understand in general terms how trust works, even if they can't see the exact algorithm. Opacity breeds distrust; transparency (without revealing exploitable specifics) builds confidence.

**What to show users**:
- Their own trust score (or band: "Trusted Member") on their profile settings page
- The actions that improve their score: "Complete your profile → +10 points"
- Verification options with explicit trust benefit: "Add ID verification to reach Verified status"
- Current badge visible on their public profile (other users see it too)

**What NOT to show users**:
- The exact score of other users (just the badge/band)
- The exact algorithm weights (gaming prevention)
- Which specific actions caused a score decrease (could reveal moderation details)
- Other users' violation history

**Badge system for public profiles**:

| Badge | Icon | Requirement |
|-------|------|-------------|
| New Member | Gray circle | <30 days, unverified |
| Verified | Blue checkmark | Phone verified + active |
| Photo Verified | Camera icon | Selfie match completed |
| Trusted Nomad | Gold star | ID verified + positive reviews |
| Community Pillar | Globe icon | Long-term active, high score, vouching enabled |

**Gamification of trust**: Frame verification and community contributions as achievements, not security theater. "Earn your Trusted Nomad badge" resonates better than "complete identity verification."

**Trust score decay**: Inactive accounts (>90 days no login) should see gradual score decay to reflect that old activity doesn't guarantee current behavior. -1 per 30 days of inactivity, capped at -20 total.

**Cost**: Zero.

---

### Topic 25: Trust Score Integration Across App Features

The trust score should meaningfully affect product behavior to create genuine incentives. Score inflation (everyone reaches 100 easily) destroys the signal.

**Feature gating by trust score**:

| Feature | Minimum Trust Score | Rationale |
|---------|-------------------|-----------|
| View profiles | 0 (all users) | No gate on browsing |
| Send first DM | 25 | Reduces new-account spam |
| Create a spot | 35 | Prevents fake spot creation |
| Join city chat channel | 25 | Mild gate reduces spam |
| Post to city channel | 30 | Slightly higher gate |
| Create a meetup | 50 | Must be established member |
| Vouch for other users | 75 | Vouching is high-trust action |
| Access premium affiliate content | 40 | Reasonable gate for affiliate links |

**Search and feed weighting**: High-trust users appear higher in search results and their spots are shown first in listings. This rewards good behavior with organic visibility — a powerful incentive without requiring monetary rewards.

**Moderation weighting**: Reports from high-trust users (score ≥ 70) carry 2x weight in priority scoring (Topic 7). Reports from low-trust accounts (score < 30) carry 0.5x weight. This reduces false-report campaigns.

**Trust score in matching/discovery**: When surfacing "people nearby" or "others in this city," weight by trust score. Users with higher scores appear first. This creates a compounding advantage for verified users.

**Cost**: Zero — application logic in existing query construction.

**App Store required**: No. But trust score integration is x/pat's competitive moat — no nomad social app currently implements this level of nuanced reputation infrastructure.

---

## Topics 26–30: Nomad/Travel Community-Specific Moderation Challenges

---

### Topic 26: Scam Detection in Nomad Communities

Digital nomad communities are disproportionately targeted by scammers because users have money, are unfamiliar with local conditions, and are seeking community connections. The scam patterns are specific and well-documented.

**Most common scams in nomad platforms** (Couchsurfing, Nomad List, InterNations, Facebook groups):

1. **Visa sponsorship scam**: Scammer offers visa sponsorship, work permits, or official documents in exchange for a fee or personal information. Red flag: any request for money in exchange for visa-related help.

2. **Accommodation scam**: "I'm leaving next week and need to sublet my amazing apartment at below-market rate." The apartment doesn't exist or is already rented. Payment required upfront. Common in Bali, Chiang Mai, Medellin.

3. **Coliving kickback scam**: Fake "community manager" redirects users to specific coliving spaces in exchange for referral fees without disclosure. The spaces may be overpriced or non-existent.

4. **Emergency abroad scam**: "I'm stuck in [city] and my wallet was stolen. Can you Venmo/PayPal/crypto me $200? I'll pay you back when I'm back." Often involves hacked legitimate accounts.

5. **Investment/crypto scam (Pig Butchering)**: Long-form romance/friendship scam where trust is built over weeks, then the scammer introduces a "too good to be true" crypto investment platform. x/pat's matchup features make it a potential vector.

6. **Remote job scam**: "I know a company hiring remotely — you just need to pay for a background check / equipment deposit / certification."

7. **Coworking space scam**: Fake spot listings for coworking spaces that collect deposits before revealing they don't exist.

**x/pat-specific detection rules**:

```
Auto-flag for review if:
- Message contains: "visa," "sponsorship," "send money," "crypto wallet," "investment platform," "wire transfer"
- Spot listing contains: "deposit required," "contact via WhatsApp for price," "limited time," "verified agent"
- User profile contains: URL in bio within 48 hours of account creation
- DM pattern: Same user sends "I'm stuck in [city]" to 3+ users within 1 hour
```

**Spot listing verification**: Any spot with a "booking required" or "fee required" field should require moderator approval before going live. Legitimate coworking spaces don't need to collect payment outside official booking channels.

**Financial transaction prohibition**: x/pat's platform should explicitly prohibit off-platform financial transactions arranged via the app (documented in community guidelines). This limits liability and gives grounds for immediate banning.

**App Store required**: No, but scam prevention is essential to user retention. One high-profile scam incident can destroy community trust and generate App Store reviews that sink ratings.

---

### Topic 27: Fake Spot and Misinformation

x/pat's spots feature (places — coworking, cafes, accommodation, etc.) is uniquely vulnerable to fake listings and outdated information. Unlike social posts, fake spots persist and continue to harm users.

**Types of fake/problematic spots**:

1. **Non-existent businesses**: Closed cafes/coworking spaces listed as open. Particularly common in cities with high business turnover (Bali, Chiang Mai, Canggu).

2. **Affiliate-bait spots**: Low-quality or fake spots created specifically to drive affiliate clicks. "Best coworking in Lisbon" listing that's actually a bedroom.

3. **Competitor sabotage**: Rival platforms or businesses creating fake negative spots for competing venues.

4. **Sponsored content without disclosure**: A legitimate business creates a spot that reads like user content but is essentially an advertisement. FTC disclosure issues.

5. **AI-generated spot descriptions**: Low-effort spots created with ChatGPT that pass content filters but contain fabricated details (wrong WiFi speed, incorrect hours, non-existent amenities).

6. **Outdated information**: Spot was accurate 2 years ago, now closed or changed dramatically. Not malicious but still harmful.

**Detection and prevention**:

- **New spot review queue**: All new spots (especially from low-trust accounts) go to moderation queue before going live
- **Accuracy voting**: "Was this information accurate?" — thumbs up/down on each spot visit. Spots below 70% accuracy flagged for review
- **Business verification**: Optional "Claimed by business" badge — business owner verifies via email domain, adds official contact info
- **Closed/changed reporting**: Specific report reason "This place is closed or moved" — triggers faster review
- **Photo requirement**: Spots without at least one user-uploaded photo get lower visibility (reduces content-free SEO spam)
- **Cross-reference with Google Places API**: For major spots, cross-reference opening status and basic info with Google Places. Flag discrepancies for review.

**Google Places API for spot verification**: $5 per 1,000 Place Details requests. For x/pat's 431 seeded spots, a monthly freshness check costs ~$2.50. Worth it for core data quality.

**AI-generated content detection**: Not fully reliable, but Perspective API's SPAM attribute and velocity analysis (account created today, 50 spots submitted) catch the worst cases.

**App Store required**: No, but spot data quality is core to x/pat's product value proposition. Fake spots make x/pat useless.

---

### Topic 28: Romance Fraud and Exploitation in Travel Contexts

x/pat's meetup feature creates a specific vulnerability: users meeting strangers in foreign cities with reduced local support networks. Romance fraud (including "pig butchering") is a documented epidemic on community platforms.

**Romance fraud patterns in nomad communities**:

1. **Long-term trust building**: Scammer establishes a genuine-seeming relationship over 2–8 weeks through x/pat DMs and possibly IRL meetups.

2. **Introducing the "opportunity"**: Scammer introduces a crypto/forex/investment platform that shows fake profits. Victim invests small amounts, sees apparent returns, then invests large amounts.

3. **The exit**: Victim's funds are frozen or "require a fee to withdraw." Scammer disappears.

4. **Exploitation of loneliness**: Digital nomads, especially solo travelers, are statistically more vulnerable to romance fraud due to reduced social support networks and the inherent loneliness of the nomad lifestyle.

**Platform-level defenses**:

- **Anti-pig-butchering warning**: When a conversation mentions investment, crypto, or "opportunity," surface an in-app warning: "Reminder: x/pat community guidelines prohibit soliciting financial investments. If someone is asking you to invest money, please report them."

- **First meeting safety prompts**: Before a meetup is confirmed between users who've connected <7 days ago, show a safety checklist: "Meet in a public place, tell someone where you're going, trust your instincts."

- **Extended contact cooling period**: Users matched for <72 hours cannot share location or exchange personal contact details within the app (prevents immediate exploitation)

- **Report category: Romance fraud / Financial exploitation**: Specific category in the report form. Reports with this category get elevated priority.

- **Education content**: A "Safety for Nomads" section in the app with articles on common scams, how to verify people, and what to do if you've been scammed (including ILEA/FBI IC3 reporting links).

**Cost**: Zero for policy/UX interventions. Safety education content is one-time writing effort.

**App Store required**: No, but this is a significant user safety concern that differentiates x/pat as a responsible platform.

---

### Topic 29: Coordinated Inauthentic Behavior and Platform Manipulation

As x/pat grows, it will attract actors seeking to manipulate the platform for competitive or commercial advantage: review bombing, fake followers, coordinated report attacks, and astroturfing.

**Coordinated inauthentic behavior types**:

1. **Review bombing**: Coordinated users submitting negative spot reviews to damage a competitor venue's reputation (businesses do this to each other).

2. **Report brigading**: A user or group files mass reports against a specific target (often a user they disagree with politically, a competitor, or a perceived enemy). Uses the report system as a harassment tool.

3. **Astroturfing**: Paid or coordinated fake accounts posting positive reviews/spots for a specific business, creating artificial social proof.

4. **Follower/engagement farms**: Accounts that follow-unfollow in bulk to inflate stats or farms that sell fake engagement to other users.

5. **SEO manipulation**: Creating high-volume spot content with target keywords to rank in-app search, even if quality is low.

**Detection**:

- **Velocity analysis**: 10+ negative reviews on the same spot from different accounts within 1 hour → flag as potential coordinated attack
- **Account clustering**: Accounts created on the same day, from same IP block, with similar profile patterns → likely farm
- **Report pattern analysis**: Same user or cluster filing reports on the same target → flag reporter(s) for investigation
- **Engagement authenticity**: Users whose followers were all acquired within a 48-hour window → flag for review
- **Content duplication**: Near-identical spot descriptions or reviews from different accounts → plagiarism/astroturf flag

**Supabase implementation**:

```sql
-- Detect coordinated reviews: same spot, multiple users, short window
SELECT spot_id, COUNT(DISTINCT user_id) as reviewer_count,
       MIN(created_at) as first_review, MAX(created_at) as last_review
FROM spot_reviews
WHERE created_at > NOW() - INTERVAL '2 hours'
GROUP BY spot_id
HAVING COUNT(DISTINCT user_id) >= 5
   AND EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) < 3600;
```

Run as a Supabase pg_cron job every 30 minutes. Alert moderators if results exist.

**App Store required**: No, but platform integrity is essential to long-term community health and App Store rating maintenance.

---

### Topic 30: Cultural Context and International Moderation

x/pat operates across radically different cultural contexts: what is acceptable speech in Brazil may be considered harassment in Germany; what is normal directness in Thailand may read as threatening in Canada. International moderation is the hardest moderation challenge.

**Cultural moderation challenges for nomad apps**:

1. **Language barriers**: Most AI moderation tools are English-centric. Spanish, Portuguese, Thai, Vietnamese, Bahasa, and Arabic content will be under-moderated if you rely solely on AI.

2. **Culture-specific slurs and coded language**: Slurs evolve rapidly and are language/region-specific. An English keyword list will miss content in other languages entirely.

3. **Religious and political sensitivity**: In Southeast Asia, criticism of monarchies or state religions carries legal risk. In the Middle East, LGBTQ+ content may violate local law. x/pat operating in these regions creates compliance complexity.

4. **Harassment norms**: Direct confrontation in messages is normalized in some cultures, seen as threatening in others. Moderation needs cultural context.

5. **Scam language localization**: Scam scripts in Thai or Spanish look completely different from English versions. AI models trained on English won't catch them.

**Practical approaches at x/pat scale**:

- **Language detection**: Identify the language of every post/message. Route non-English content to language-specific review queues if available, or flag for special review.
- **Multilingual keyword lists**: Build keyword filter lists per major language. Start with: Spanish (largest non-English nomad community), Portuguese (Brazil digital nomad hub), and Thai (Chiang Mai is world's largest nomad hub).
- **Community moderators by language/region**: Phase 2+ — recruit trusted community members as regional moderators. They handle local-language content and cultural context that AI misses.
- **Legal compliance matrix**: Maintain a country-compliance matrix for x/pat's top markets. Identify content that is legal in the U.S. but illegal in operational countries. LGBTQ+ content restrictions in Southeast Asia require specific handling.
- **DSA and local law compliance**: EU Digital Services Act, UK Online Safety Act, and various national laws create overlapping obligations. At launch scale, focus on core markets (U.S., EU, Southeast Asia) and document your compliance approach.

**Perspective API's language limitations**: As of 2026, Perspective API supports: English, Spanish, French, German, Portuguese, Italian, Russian, Japanese, Chinese, Arabic, Korean, Polish, Dutch. Covers most x/pat markets. Accuracy is still English-best.

**OpenAI Moderation multi-language**: GPT-4 class moderation handles 100+ languages with reasonable accuracy. The free moderation API uses a smaller model — multilingual accuracy is lower. For major non-English markets, consider calling GPT-4o-mini directly with a structured moderation prompt.

**Cost implications**:
- GPT-4o-mini for multilingual moderation: ~$0.15 per million input tokens ($0.0000015/message)
- At 100,000 messages/day: ~$0.15/day = ~$4.50/month — negligible
- Language-specific keyword databases: Engineering time only (build incrementally)
- Regional moderators: Typically volunteer with perks (free premium features) at early stage

**Legal risk management**:
- Thailand: Royal defamation law (lèse-majesté) — auto-flag content mentioning the Thai monarchy
- Indonesia/Malaysia: Religious blasphemy laws — flag religious criticism content for local review
- EU: Hate speech laws stricter than U.S. — apply EU standard to all EU users
- Singapore: POFMA (misinformation law) — if x/pat content is shared publicly, correction notices can be issued

**Recommendation for x/pat**: Start with English-only automated moderation. Add Spanish/Portuguese keyword filters before launch (both are major nomad language markets). Plan for community moderators by language in Phase 2. Document a legal compliance matrix for top 10 operational countries.

---

## Implementation Priority Matrix

### Must-Have Before Launch (App Store Minimum)

| Feature | Cost | Effort | Required By |
|---------|------|--------|-------------|
| Report button (all UGC surfaces) | $0 | 1 day | Apple + Google |
| User blocking (bidirectional) | $0 | 1 day | Apple + Google |
| Support contact (email) | $0 | 1 hour | Apple + Google |
| Account deletion (in-app) | $0 | 3 days | Apple + Google |
| Privacy policy (linked in store) | ~$500 legal review | 1 day | Apple + Google |
| Basic text moderation (OpenAI API) | Free | 4 hours | Practical requirement |
| Image moderation (AWS Rekognition) | Free tier | 1 day | Practical requirement |
| PhotoDNA application submitted | Free | 1 hour to apply | Legal requirement |

**Total: ~$500 + ~1 week engineering**

### High-Value, Low-Cost (Ship Within 30 Days of Launch)

| Feature | Monthly Cost | Effort | Impact |
|---------|-------------|--------|--------|
| Report prioritization scoring | $0 | 3 days | Operational efficiency |
| Keyword filter (scam patterns) | $0 | 2 days | Most common attack vector |
| Rate limiting (messaging/posting) | ~$5 (Upstash) | 2 days | Bot/spam prevention |
| New account cooling period | $0 | 1 day | Scam prevention |
| Trust score MVP | $0 | 1 week | Community health |
| Perspective API for chat | Free | 4 hours | Toxic chat prevention |
| Spot review queue | $0 | 3 days | Data quality |
| Moderation action templates | $0 | 4 hours | Consistency |

**Total: ~$5/month + ~3 weeks engineering**

### Phase 2: Post-Launch Growth (1K–10K MAU)

| Feature | Monthly Cost | Effort | Impact |
|---------|-------------|--------|--------|
| Shadowbanning infrastructure | $0 | 3 days | Sophisticated moderation |
| Coordinated behavior detection | $0 | 1 week | Platform integrity |
| Spanish/Portuguese keyword filters | $0 | 3 days | Multilingual coverage |
| Romance fraud warning prompts | $0 | 2 days | User safety |
| Spot accuracy voting + cross-reference | ~$5 Google Places | 1 week | Data quality |
| Community moderator program | ~$50/month (perks) | 2 weeks | Scalable moderation |
| Part-time contract moderator | $500–1,000/month | Hiring | Human review quality |
| Vouching system | $0 | 1 week | Trust network depth |

**Total: ~$600–1,100/month + ~6 weeks engineering**

### Phase 3: Scale (10K+ MAU)

| Feature | Monthly Cost | Effort | Impact |
|---------|-------------|--------|--------|
| Hive multi-modal moderation | $1,000–3,000 | 2 weeks | Comprehensive coverage |
| ML-based behavioral fraud detection | $200–500 | 4 weeks | Proactive threat detection |
| Trust & Safety hire | $5,000–8,000 | Hiring | Dedicated leadership |
| Multilingual AI moderation (GPT-4o-mini) | ~$50–200 | 1 week | Global coverage |
| Quarterly transparency report | $0 | 4 hrs/quarter | Trust building |
| DSA compliance (EU) | ~$200–500/month legal | Ongoing | EU market access |

---

## API Quick Reference

| API | What It Moderates | Cost | Rate Limit | Setup Complexity |
|-----|------------------|------|------------|-----------------|
| OpenAI Moderation | Text (11 categories) | Free | 1,000 req/min | Low (2 hours) |
| Google Vision SafeSearch | Images (5 categories) | Free ≤1K/mo, $1.50/1K after | None at scale | Low (4 hours) |
| AWS Rekognition | Images + video (14 categories) | Free ≤1K/mo, $0.001/image after | None at scale | Medium (1 day) |
| Perspective API | Text toxicity (6 attributes) | Free | 1 QPS | Very low (2 hours) |
| Hive Moderation | Multi-modal (40+ categories) | $500–2,000+/mo | Enterprise | Medium (3 days) |
| PhotoDNA | CSAM image hashing | Free (apply) | None | Medium (application required) |
| Google Places API | Spot data verification | $5/1K requests | None | Low (4 hours) |

---

## App Store Compliance Checklist

### Apple App Store (Guideline 1.2) — Required to Ship

- [ ] Report button accessible from every UGC surface (post, comment, DM, spot, profile, city chat)
- [ ] Report submits to a real queue (not just mailto:)
- [ ] Block function implemented and bidirectional
- [ ] Support contact email (or form) published and monitored
- [ ] In-app account deletion implemented
- [ ] Privacy policy linked in App Store listing AND accessible in-app
- [ ] Age rating set (recommend 17+)
- [ ] Data collection accurately disclosed in App Store Connect nutritional label
- [ ] PhotoDNA application submitted (legal requirement, not just App Store)

### Google Play Store — Required to Ship

- [ ] Report button accessible within 2 taps of any content
- [ ] Block function implemented
- [ ] Data Safety Form completed accurately in Play Console
- [ ] Privacy policy URL submitted in Play Console
- [ ] Account deletion implemented
- [ ] Age minimum set to 17+ in target audience settings
- [ ] Community guidelines URL published and submitted to Play Console

---

## Sources and References

**APIs and Pricing**:
- OpenAI Moderation API documentation: platform.openai.com/docs/guides/moderation
- Google Cloud Vision SafeSearch pricing: cloud.google.com/vision/pricing (confirmed $1.50/1K standalone, free with Label Detection)
- AWS Rekognition Content Moderation: aws.amazon.com/rekognition/content-moderation
- Perspective API: perspectiveapi.com
- Hive Moderation: thehive.ai
- PhotoDNA Cloud Service: microsoft.com/en-us/photodna

**Platform Policies**:
- Apple App Store Guideline 1.2 (User-Generated Content): confirmed via direct fetch
- Google Play UGC Policy: support.google.com/googleplay/android-developer/answer/9876714
- EU Digital Services Act: digital-strategy.ec.europa.eu
- NCMEC CyberTipline: missingkids.org/gethelpnow/cybertipline

**Industry Research**:
- x/pat trust-safety-roadmap.md (existing research, March 2026)
- x/pat identity-verification-trust-safety-research.md (existing research)
- Airbnb dual-blind review research: PNAS Vol. 114 No. 37
- Bumble Deception Detector: bumble.com/the-buzz/bumble-deception-detector
- Couchsurfing trust model: couchsurfing.com

**Nomad Community Safety**:
- FBI IC3 Romance Fraud: ic3.gov
- FTC Pig Butchering warnings: consumer.ftc.gov
- Nomad community scam databases: nomadforum.io, reddit.com/r/digitalnomad

---

*Research compiled April 6, 2026. Pricing and API terms subject to change — verify before implementation.*
