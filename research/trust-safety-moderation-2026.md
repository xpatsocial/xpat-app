# Trust & Safety Framework for x/pat

**Research Date:** April 2026
**Scope:** Content moderation, user safety, harassment prevention, legal compliance, mental health
**Current State:** v1.3.5 — client-side keyword filter, block/report system, rate limiting

---

## 1. Current State Assessment

x/pat already has foundational trust and safety infrastructure:

- **Keyword filtering** (`contentModeration.ts`): 30+ blocked keywords covering crypto scams, MLM, explicit content, violence, and substance abuse. Blocked link patterns for Telegram, WhatsApp, and URL shorteners.
- **Block system** (`useModeration.ts`): Bilateral blocking with immediate UI filtering. Blocked users cannot see profiles or send messages.
- **Report system**: Category-based reporting (Spam, Harassment, Inappropriate, Fake Profile, Scam, Felt Unsafe at Meetup, Other) with "reviewed within 24 hours" promise.
- **Rate limiting** (`rateLimiter.ts`): Client-side sliding window — 10 messages/min, 3 posts/min, 20 connection requests/5 min.

### Gaps Identified

1. **No server-side moderation** — keyword filtering runs client-side only, trivially bypassed
2. **No image moderation** — user-uploaded photos for spots, profiles, and posts are unscanned
3. **No automated escalation** — reports sit in a table with no alerting or auto-action
4. **Perspective API placeholder** — code comments reference it but it is not integrated, and Google/Jigsaw is sunsetting Perspective API on December 31, 2026
5. **No CSAM detection** — legal obligation under 18 U.S.C. 2258A (REPORT Act)
6. **No community guidelines** — Terms of Service exists but no standalone, plain-language community standards
7. **No appeal process** — banned users have no recourse
8. **No location-privacy controls** — no ability to hide exact location or go "invisible"
9. **No wellbeing features** — no crisis resources, content warnings, or loneliness mitigation

---

## 2. Content Moderation at Scale

### 2.1 Text Moderation Stack (Recommended)

**Phase 1 (Pre-Launch / 0-1K MAU): Enhanced Client + Supabase Edge Functions**

Move keyword filtering server-side via a Supabase Edge Function that intercepts inserts on `messages`, `posts`, and `spots`. This closes the client-bypass gap at zero incremental cost.

```
User submits text → Supabase Edge Function → keyword check + regex patterns → 
  PASS: insert row
  FAIL: insert with status='flagged', notify admin
```

**Phase 2 (1K-10K MAU): Add AI Text Classification**

Replace Perspective API (sunsetting Dec 2026) with one of:

| Service | Pricing | Languages | Notes |
|---------|---------|-----------|-------|
| **OpenAI Moderation** | Free | 12+ | Best free option, text-only, fast |
| **Hive Text Moderation** | ~$0.001/request | 30+ | Enterprise-grade, NCMEC integration |
| **Azure AI Content Safety** | $1.50/1K requests | 14+ | Severity scoring, customizable categories |

**Recommendation:** Start with OpenAI Moderation (free, good accuracy) via Edge Function. Migrate to Hive when image moderation is needed (bundle discount).

**Phase 3 (10K+ MAU): Human-in-the-Loop**

Outsourced moderation services start at $500-2,000/month for small platforms. Options:
- **WebPurify**: Pay-per-review, starts at $0.03/review
- **TaskUs / Teleperformance**: Contract-based, minimum $2K/month
- **Community moderators**: Recruit trusted power users as volunteer mods for city-level chat

### 2.2 Image Moderation Stack

User-uploaded photos (spot images, profile photos, post attachments) require scanning before display.

| Service | Pricing | Accuracy | CSAM Detection |
|---------|---------|----------|----------------|
| **Amazon Rekognition** | $1.00/1K images | 95%+ | Yes (via PhotoDNA) |
| **Hive Visual Moderation** | Custom (~$0.001/image) | 98%+ | Yes, NCMEC integration |
| **Google Cloud Vision** | $1.00/1K images | 95%+ | SafeSearch only |
| **Sightengine** | $0.60/1K images | 97%+ | Yes |

**Recommendation:** Sightengine for launch (cheapest with CSAM support, REST API, no minimum). At 431 seeded spots with ~3 images each, cost is approximately $0.78/month initially.

### 2.3 False Positive Management

Industry data shows keyword-only filtering produces 15-25% false positive rates. To mitigate:

- **Contextual scoring**: Use AI classification confidence thresholds (e.g., auto-remove at 0.95+, flag for review at 0.7-0.95, pass below 0.7)
- **Category-specific thresholds**: Travel content mentioning "drugs" in a visa/customs context should not be blocked — maintain an allowlist of travel-contextual phrases
- **User reputation scoring**: New accounts (< 7 days, < 3 connections) get stricter thresholds; established users get more lenient scoring
- **Appeals pipeline**: Incorrectly flagged content should be restorable within minutes

---

## 3. User Safety in Travel/Social Context

### 3.1 Lessons from Couchsurfing's Failures

Couchsurfing's trust and safety model failed in several documented ways that are directly relevant to x/pat:

1. **Pay-to-verify created false trust signals** — Anyone could pay to appear "verified," which gave predatory users a veneer of legitimacy. x/pat should never gate trust badges behind payment alone.
2. **Reference system discouraged negative reviews** — Social pressure to leave positive references meant everyone looked equally trustworthy. x/pat's connection/vouching system must allow honest signals.
3. **Self-moderation ideology** — Couchsurfing refused to remove hosts with negative references, claiming community self-governance. This is inadequate for a platform with IRL meetup risk. x/pat must actively remove dangerous users.
4. **No safety net for in-person meetings** — When users met through the platform and something went wrong, Couchsurfing had no response protocol.

### 3.2 Airbnb's Trust Framework (What Works)

Airbnb's Trust & Safety Advisory Coalition (TSAC) model is the gold standard:

- **100% identity verification** mandate (government ID + selfie match) since 2023
- **External advisory board** of 20+ experts in fraud, human trafficking, law enforcement
- **AI-powered behavioral screening** filters bookings before they happen
- **24/7 safety hotline** for active incidents
- **$1M host guarantee** creates skin-in-the-game accountability

**What x/pat can adopt at startup scale:**

1. **Progressive identity verification**: Start with email + phone verification (already have email + Apple Sign-In). Add optional selfie verification badge later (use Sumsub or Veriff, ~$1-2/verification).
2. **Community vouching**: After meeting IRL, users can "vouch" for each other. Display vouch count on profiles. This creates earned trust signals that cannot be purchased.
3. **Meetup safety features**: "Share my plans" — let users share their meetup details with a trusted contact. Include a check-in timer that alerts the contact if not dismissed.

### 3.3 Location Privacy Controls

For a travel app where users share their city and check into spots, location privacy is critical:

- **Fuzzy location**: Show city/neighborhood only, never exact coordinates on public profiles
- **Invisible mode**: Allow users to hide from "Nearby" and city presence lists temporarily
- **Check-in privacy**: Let users mark check-ins as "private" (visible only to connections)
- **Block = full location hide**: Blocked users should see zero location data, not even city

---

## 4. Harassment and Abuse Prevention

### 4.1 DM Abuse Prevention

Direct messages are the highest-risk channel for harassment. Implement:

- **Message requests**: Non-connected users' first DM goes to a "requests" inbox, not main inbox
- **Conversation-level reporting**: Report an entire conversation thread, not just individual messages
- **Auto-detect patterns**: Flag accounts that send the same message to 10+ users in an hour (mass-messaging/spam pattern)
- **Read receipt control**: Let users disable read receipts to reduce pressure dynamics
- **Media restrictions**: New connections cannot send images in DMs for first 48 hours

### 4.2 Anti-Stalking Measures

Digital nomads face unique stalking risks because their location changes are publicly visible:

- **Travel plan privacy**: Travel plans (future cities) should be shareable only with connections, never public
- **Check-in delay**: Offer option to post check-ins with a 1-hour or 24-hour delay
- **Profile view tracking**: Show users a count of profile views (not who viewed) so they notice unusual attention
- **Connection pruning**: Suggest reviewing connections after a block/report — "Do you want to review your connections?"

### 4.3 Pattern Detection for Bad Actors

Server-side signals to monitor:

| Signal | Threshold | Action |
|--------|-----------|--------|
| Reports received | 3+ unique reporters | Auto-restrict account, notify admin |
| Blocked by others | 5+ unique blockers | Flag for review |
| Mass DMs | Same text to 10+ users/hour | Auto-restrict DMs |
| Rapid connection requests | 50+/day to new users | Restrict requests, flag |
| Account age + report ratio | < 7 days old + 2+ reports | Auto-suspend pending review |
| Message rejection rate | 80%+ of DM requests declined | Restrict DM access |

---

## 5. Community Guidelines Framework

### 5.1 Guidelines Structure

Plain-language community guidelines should cover:

**The Core Promise:**
"x/pat exists to help nomads find their people and their places. We protect that by keeping the community respectful, honest, and safe."

**Five Pillars:**

1. **Be Real** — Use your real identity. No fake profiles, impersonation, or misleading bios. Your spots and reviews should reflect honest experiences.
2. **Be Respectful** — No harassment, hate speech, discrimination, or bullying. Disagreement is fine; personal attacks are not. Respect cultural differences — this is a global community.
3. **Be Safe** — Do not share others' locations without consent. Do not pressure anyone into meeting. Report concerning behavior immediately.
4. **Be Honest** — No scams, spam, MLM recruitment, or misleading spot listings. No fake reviews or paid promotions disguised as organic content.
5. **Be Mindful** — Content warnings on sensitive topics. No graphic violence, NSFW content, or illegal activity. Consider that your audience spans dozens of countries and cultures.

### 5.2 Escalation Framework

Adopt a graduated enforcement model aligned with industry standards (Discord/Reddit):

| Level | Trigger | Action | Duration |
|-------|---------|--------|----------|
| **0 — Education** | First minor violation | In-app notice explaining the rule, content removed | Immediate |
| **1 — Warning** | Second violation or moderate severity | Formal warning on account record, content removed | Permanent record |
| **2 — Restriction** | Third violation or serious offense | DMs disabled, posting restricted, visible to connections only | 7 days |
| **3 — Temporary Suspension** | Continued violations or severe offense | Account suspended, cannot log in | 7-30 days |
| **4 — Permanent Ban** | Repeated serious violations, CSAM, credible threats | Account permanently disabled, data preserved for law enforcement | Permanent |

**Immediate Level 4 offenses** (no escalation required):
- CSAM or child exploitation content
- Credible threats of violence
- Doxxing (sharing someone's real-world location/identity to harm them)
- Human trafficking or exploitation

### 5.3 Appeal Process

1. User receives suspension notification with reason and evidence summary
2. User can submit appeal within 30 days via in-app form or email (trust@xpat.social)
3. Appeal reviewed by different moderator than original decision-maker within 72 hours
4. Decision communicated with explanation; second appeal allowed for permanent bans only
5. Publish quarterly transparency numbers (reports received, actions taken, appeals resolved)

---

## 6. Scam and Fraud Prevention

### 6.1 Common Scams in Travel Communities

Scams most likely to appear on x/pat:

- **Fake spot listings**: Scammers post attractive spots (cafes, coliving spaces) with affiliate-style links to booking scams
- **Romance/befriend scams**: Build trust through DMs, then request money for "emergency" while traveling
- **Recruitment scams**: MLM, crypto schemes, fake remote job offers targeting nomads
- **Impersonation**: Copying popular nomads' profiles to gain trust
- **Visa/service scams**: Fake visa agents or relocation services advertised through spots or posts

### 6.2 Detection and Prevention

**Account Quality Signals:**
- Email verification age (disposable email domains flagged)
- Profile completeness score (photo, bio, first check-in)
- Device fingerprinting via Expo's `Application.androidId` / `Constants.deviceId` for ban evasion detection
- Behavioral velocity (how fast the account performs actions after creation)

**Spot Listing Integrity:**
- New spots from accounts < 30 days old require manual approval
- Spots with external URLs auto-flagged for review
- Duplicate image detection (same photo across multiple spots = likely fake)
- Community verification: spots with 3+ independent check-ins get a "verified" badge

**Ban Evasion Detection:**
- Store device fingerprint hash on ban; check new registrations against banned fingerprints
- IP correlation (same IP creating new account after ban)
- Behavioral similarity scoring (same posting patterns, same city, similar bio text)

---

## 7. Legal Obligations

### 7.1 CSAM Detection and NCMEC Reporting

**This is non-negotiable and legally required.**

Under 18 U.S.C. 2258A and the REPORT Act (signed May 2024):

- Any "electronic communication service provider" or "remote computing service" with **actual knowledge** of CSAM must report to NCMEC within defined timeframes
- Reports must be preserved for **at least 1 year** (increased from 90 days by REPORT Act)
- Fines for failure to report: **$600,000 per initial violation** for platforms under 100M MAU
- You are NOT required to proactively scan, but you MUST report if you become aware

**Implementation:**
1. Integrate PhotoDNA (Microsoft, free for qualifying platforms) or Hive CSAM detection on all user-uploaded images
2. Register with NCMEC's CyberTipline (https://www.missingkids.org/theissues/csam)
3. Create internal escalation procedure: detection → preserve evidence → file CyberTipline report → cooperate with law enforcement
4. Designate a CSAM response officer (can be the founder initially)
5. Never notify the user that a report was filed — this can interfere with investigations

### 7.2 EU Digital Services Act (DSA) Compliance

The DSA applies to all platforms serving EU users, regardless of size. x/pat serves nomads in EU cities (Lisbon is a seeded city). Baseline requirements for small platforms:

1. **Single point of contact** for authorities and users — publish an email address (e.g., dsa@xpat.social)
2. **Transparency reporting** — annual report on content moderation activities (reports received, actions taken)
3. **Terms of service** — clearly explain content moderation policies, including algorithmic decision-making
4. **Notice and action mechanism** — allow anyone (not just users) to report illegal content
5. **Statement of reasons** — when removing content, explain why with reference to specific rule/law
6. **Out-of-court dispute resolution** — inform users of their right to use certified dispute resolution bodies

Small platforms (under 45M EU monthly active users) are exempt from the most burdensome requirements (risk assessments, data access for researchers, crisis response protocols).

### 7.3 Law Enforcement Data Requests

Prepare a law enforcement response protocol before you need one:

1. **Preservation requests**: Honor valid US law enforcement preservation requests; preserve specified account data for 90 days (extendable to 180 days)
2. **Subpoenas**: Basic subscriber info (name, email, IP logs) — comply with valid subpoena
3. **Court orders**: Content data (messages, posts) — require court order under Stored Communications Act
4. **Search warrants**: Full account content — require valid warrant
5. **Emergency requests**: Imminent danger to life — expedite without normal legal process, document thoroughly
6. **GDPR intersection**: For EU users, verify that US legal process is recognized under mutual legal assistance treaties before disclosing

**Publish law enforcement guidelines** on your website (even a simple page). This signals maturity and helps law enforcement reach you efficiently.

### 7.4 When You Need a Dedicated Trust & Safety Team

| MAU | Staffing | Estimated Cost |
|-----|----------|----------------|
| 0-5K | Founder handles T&S, automated tools do heavy lifting | $0 (time cost only) |
| 5K-25K | Part-time contractor or community manager with T&S duties | $2-4K/month |
| 25K-100K | 1 full-time T&S specialist + community moderators | $6-10K/month |
| 100K+ | Dedicated T&S team (manager + 2-3 specialists) + outsourced queue | $20K+/month |

---

## 8. Mental Health and Loneliness

### 8.1 The Nomad Loneliness Crisis

Peer-reviewed research (Miguel et al., 2025, "Alone on the Road," published in Sage journals) confirms:

- Loneliness is the **number one reason digital nomads return home**
- The nomad lifestyle creates a "heightened propensity for experiencing loneliness" despite flexibility benefits
- Being distant from family/friends is exacerbated in countries with few other nomads or significant language/culture barriers
- Nomads report needing to work in shared spaces **at least once per week** for social and mental health

This is both a risk factor (x/pat could worsen loneliness through social comparison) and an opportunity (x/pat can be the tool that solves it).

### 8.2 How x/pat Can Help (Not Harm)

**Features that reduce loneliness:**
- City chat connects nomads who are currently in the same place — this directly addresses isolation
- Spot discovery encourages getting out of the apartment/hotel
- Events and meetups create IRL connection opportunities
- "Nearby" feature shows who is around, reducing the "am I the only one here?" feeling

**Risks to mitigate:**
- **Social comparison**: Seeing others' exciting travel posts while feeling stuck or lonely. Mitigation: de-emphasize vanity metrics (no public like counts), focus on utility (spots, tips) over performance (curated posts).
- **FOMO amplification**: Events and check-ins showing how much fun others are having. Mitigation: frame features around planning ("want to go") not performance ("look where I went").
- **Ghosting/rejection**: Connection requests that go unanswered create rejection anxiety. Mitigation: requests expire silently after 14 days with no notification to sender.

### 8.3 Wellbeing Features to Implement

**Phase 1 (Launch):**
- **Crisis resources in settings**: Link to international crisis lines (988 Suicide & Crisis Lifeline for US, Crisis Text Line, IASP directory for international)
- **Sensitive content warnings**: User-applied content warnings on posts discussing difficult topics
- **"Take a break" nudge**: After 60+ minutes of continuous use, gentle suggestion to step away

**Phase 2 (Post-Launch):**
- **Loneliness-aware recommendations**: If a user has not checked in or posted in 14+ days, surface a "People near you" prompt or local event suggestion
- **Wellness check-in**: Optional weekly mood pulse (1-5 scale), kept private, used to personalize recommendations
- **Community support channels**: Dedicated spaces for nomads dealing with homesickness, travel burnout, or culture shock
- **Professional resource directory**: Curated list of therapists offering remote/telehealth sessions popular with nomads (BetterHelp, Talkspace, local English-speaking therapists in nomad hubs)

---

## 9. Recommended Moderation Stack

### Launch Configuration (0-5K MAU)

| Layer | Tool | Cost |
|-------|------|------|
| **Text moderation** | Supabase Edge Function + keyword filter (server-side) | Free (Supabase plan) |
| **AI text classification** | OpenAI Moderation API | Free |
| **Image moderation** | Sightengine (NSFW + CSAM) | ~$5-15/month |
| **Rate limiting** | Server-side (Supabase RLS + Edge Functions) | Free |
| **Report queue** | Supabase table + daily email digest to founder | Free |
| **Block system** | Already implemented | Free |
| **NCMEC reporting** | Manual process via CyberTipline | Free |

**Estimated monthly cost: $5-15/month**

### Growth Configuration (5K-50K MAU)

| Layer | Tool | Cost |
|-------|------|------|
| **Text moderation** | Hive Text Moderation API | ~$50-200/month |
| **Image moderation** | Hive Visual Moderation (bundled) | ~$50-200/month |
| **Behavioral detection** | Custom Supabase functions (pattern matching) | Free |
| **Report queue** | Admin dashboard with Supabase Realtime | Dev time only |
| **Human review** | Part-time contractor (20 hrs/week) | ~$2-3K/month |
| **CSAM** | Hive CSAM detection + NCMEC auto-report | Included in Hive |

**Estimated monthly cost: $2,500-3,500/month**

### Scale Configuration (50K+ MAU)

| Layer | Tool | Cost |
|-------|------|------|
| **Full-stack moderation** | Hive or Amazon Rekognition (text + image + video) | $500-2K/month |
| **Behavioral AI** | Custom ML model for pattern detection | Dev time |
| **Human review** | Outsourced moderation team (WebPurify or TaskUs) | $5-10K/month |
| **Identity verification** | Sumsub or Veriff | $1-2/verification |
| **T&S team** | 1-2 FTE specialists | $10-15K/month |
| **Legal** | Outside counsel on retainer for T&S matters | $2-5K/month |

**Estimated monthly cost: $18,000-32,000/month**

---

## 10. Policy Templates

### 10.1 Community Guidelines Summary (For In-App Display)

```
x/pat Community Standards

We built x/pat to help nomads find real connections and real places. 
These standards keep the community safe for everyone.

DO:
- Use your real identity and share honest experiences
- Treat everyone with respect, regardless of background
- Report content or behavior that makes you uncomfortable
- Protect others' privacy — never share someone's location without consent

DON'T:
- Harass, threaten, or bully other members
- Post spam, scams, MLM recruitment, or misleading content
- Share explicit, violent, or illegal content
- Create fake profiles or impersonate others
- Use x/pat to sell products or services without disclosure

WHAT HAPPENS IF YOU BREAK THE RULES:
1. First offense: Warning + content removed
2. Second offense: Temporary restrictions (7 days)
3. Third offense: Account suspension (7-30 days)
4. Severe/repeated: Permanent ban

You can appeal any action within 30 days at trust@xpat.social.

Certain offenses (threats of violence, child exploitation, doxxing) 
result in immediate permanent ban with no prior warning.
```

### 10.2 Law Enforcement Request Template

```
To request user data from x/pat (operated by Aych Holdings LLC):

Email: legal@xpat.social

We accept:
- Preservation requests (90-day hold, extendable)
- Subpoenas (basic subscriber information)
- Court orders (stored content)
- Search warrants (full account data)
- Emergency requests (imminent danger to life)

All requests must include:
1. Requesting agency and officer identification
2. Valid legal process documentation
3. Specific account identifiers (user ID, email, or username)
4. Description of information sought
5. Case number and jurisdiction

We will respond to emergency requests within 4 hours.
Non-emergency requests are processed within 10 business days.

We notify affected users of law enforcement requests unless 
legally prohibited from doing so (e.g., court order with gag provision).
```

### 10.3 Incident Response Checklist

```
SEVERITY 1 — Imminent Safety Threat (credible violence, active CSAM)
[ ] Preserve all evidence (screenshots, database records)
[ ] Report to law enforcement / NCMEC within 1 hour
[ ] Suspend offending account immediately
[ ] Do NOT notify the offending user of the report
[ ] Document all actions with timestamps
[ ] Notify legal counsel within 24 hours

SEVERITY 2 — Serious Violation (harassment campaign, doxxing, fraud)
[ ] Preserve evidence
[ ] Suspend offending account within 4 hours
[ ] Notify victim with safety resources
[ ] Review connected accounts for coordinated behavior
[ ] Document and log in incident tracker

SEVERITY 3 — Standard Violation (spam, minor policy breach)
[ ] Remove content
[ ] Issue warning or restriction per escalation framework
[ ] Log in moderation queue
[ ] Review within 24 hours
```

---

## 11. Immediate Action Items (Priority Order)

1. **Register with NCMEC CyberTipline** — Legal requirement, do before any user uploads photos
2. **Move keyword filtering server-side** — Supabase Edge Function, closes the biggest security gap
3. **Integrate image scanning** — Sightengine API on photo uploads (spots, profiles, posts)
4. **Publish community guidelines** — In-app screen + link in Terms of Service
5. **Add OpenAI Moderation API** — Free AI text classification in Edge Function pipeline
6. **Create admin report dashboard** — View and action pending reports (even a basic Supabase query/table view)
7. **Implement message requests for non-connections** — Reduces DM abuse vector
8. **Add crisis resources** — Link to 988/Crisis Text Line in Settings
9. **Set up DSA compliance email** — dsa@xpat.social as single point of contact
10. **Draft law enforcement guidelines page** — Publish on xpat.social

---

## Sources

- [Best Automated Content Moderation Tools 2026 — CometChat](https://www.cometchat.com/blog/automated-content-moderation-tools)
- [AI Comment Moderation Tools Comparison — FeedGuardians](https://feedguardians.com/blog/ai-comment-moderation-tools-2025)
- [State of AI Content Moderation 2026 — Foiwe](https://www.foiwe.com/state-of-ai-content-moderation-2026/)
- [What Couchsurfing Got Wrong — Couchers.org](https://couchers.org/issues)
- [Airbnb Trust & Safety Advisory Coalition](https://news.airbnb.com/marking-three-years-of-airbnbs-trust-and-safety-advisory-coalition/)
- [Airbnb Trust System — ArthNova](https://arthnova.com/airbnb-trust-system-11-billion-business-strangers/)
- [Discord Warning System](https://support.discord.com/hc/en-us/articles/18210965981847-Discord-Warning-System)
- [Reddit Ban Policy 2026 — AuditSocials](https://www.auditsocials.com/blog/reddit-ban-suspension-policy-2026-shadowban-appeal-guide)
- [REPORT Act 2024 — WarrantBuilder](https://warrantbuilder.com/report_act/)
- [18 U.S.C. 2258A — NCMEC Reporting Requirements](https://www.law.cornell.edu/uscode/text/18/2258A)
- [REPORT Act Expanded Obligations — Wilson Sonsini](https://www.wsgr.com/en/insights/new-minor-safety-obligations-for-online-services-report-act-expands-child-sexual-exploitation-reporting-requirements.html)
- [EU Digital Services Act — European Commission](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act)
- [DSA Impact on Platforms — European Commission](https://digital-strategy.ec.europa.eu/en/policies/dsa-impact-platforms)
- [DSA FAQ — European Commission](https://digital-strategy.ec.europa.eu/en/faqs/digital-services-act-questions-and-answers)
- ["Alone on the Road" — Miguel et al. 2025, Sage Journals](https://journals.sagepub.com/doi/10.1177/01634437241290087)
- [Digital Nomad Statistics 2025 — ABrotherAbroad](https://abrotherabroad.com/digital-nomad-statistics/)
- [Best Image Moderation APIs 2026 — Eden AI](https://www.edenai.co/post/best-image-moderation-apis)
- [NSFW Detection APIs Compared 2026 — AI Engine](https://ai-engine.net/blog/best-nsfw-detection-apis-compared)
- [Hive Moderation Pricing](https://thehive.ai/pricing)
- [Sightengine Pricing](https://sightengine.com/pricing)
- [Perspective API Sunsetting — Lasso](https://www.lassomoderation.com/blog/what-is-perspective-api/)
- [Perspective API — Google/Jigsaw](https://perspectiveapi.com/how-it-works/)
- [Digital Nomad Scams — AIContentFy](https://aicontentfy.com/en/blog/staying-safe-how-to-recognize-and-avoid-common-digital-nomad-scams)
- [Travel Fraud Prevention — DataDome](https://datadome.co/bot-management-protection/travel-fraud/)
- [Mental Health Content Moderation on Social Media — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12163353/)
- [Stalking Prevention — Security.org](https://www.security.org/data-removal/stalking/)
- [CLOUD Act — AWS](https://aws.amazon.com/compliance/cloud-act/)
- [Law Enforcement Data Requests — Front](https://front.com/legal/law-enforcement-guidelines)
