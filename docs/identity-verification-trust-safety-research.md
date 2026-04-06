# Identity Verification, Trust Badges & Safety Systems Research

**Date**: April 6, 2026
**Purpose**: Deep-dive research to make x/pat THE verified, trusted social layer for digital nomads
**Stack context**: React Native / Expo + Supabase + Mercury dark-mode aesthetic

---

## Table of Contents

1. [ID Verification Providers (1-5)](#1-id-verification-providers)
2. [Lightweight Verification Methods (6-10)](#2-lightweight-verification-methods)
3. [Badge System & Community Trust (11-14)](#3-badge-system--community-trust)
4. [Privacy & Legal (15)](#4-privacy--legal)
5. [Badge Display UX (16)](#5-badge-display-ux)
6. [Conversion & Cost Modeling (17-18)](#6-conversion--cost-modeling)
7. [Platform Case Studies (19-22)](#7-platform-case-studies)
8. [Trust Scoring & Verified Features (23-24)](#8-trust-scoring--verified-features)
9. [Fraud Prevention (25)](#9-fraud-prevention)
10. [Safety Features (26-30)](#10-safety-features)
11. [Implementation Roadmap](#11-implementation-roadmap)
12. [Database Schema](#12-database-schema)
13. [Cost Model Projections](#13-cost-model-projections)
14. [Badge Design Specification](#14-badge-design-specification)

---

## 1. ID Verification Providers

### 1a. Stripe Identity

**What it does**: Government ID document verification with selfie matching. Users photograph their passport/driver's license/national ID, then take a selfie. Stripe's AI matches the selfie to the ID photo and checks the document against fraud databases.

**Pricing**:
- $1.50 per verification
- First 50 verifications free
- No monthly minimums

**Coverage**: 100+ countries, supports passports, driver's licenses, national IDs

**Key capabilities**:
- Automated document authenticity detection (patterns to detect fakes)
- Biometric face matching (selfie vs. ID photo)
- Database validation against global identity databases
- SSN validation (US, UK, CA, AU)

**React Native implementation**:
- Official SDK: `@stripe/stripe-identity-react-native`
- Uses `IdentityVerificationSheet` prebuilt UI
- `useStripeIdentity` hook for screen integration
- Requires iOS 13.0+ / Android API 21+
- Server creates `VerificationSession` via Stripe API, returns ephemeral key to client
- Client opens the sheet, user completes flow, webhook fires on completion

**x/pat recommendation**: BEST CHOICE for ID verification. Already using Stripe ecosystem familiarity. Official React Native SDK means minimal integration friction. $1.50/check is mid-range but includes everything (document + selfie + database). The 50 free checks cover the beta period entirely.

**Integration architecture**:
```
Client (RN) --> Supabase Edge Function (create VerificationSession) --> Stripe API
Stripe --> Webhook --> Supabase Edge Function (update user verification_level)
```

### 1b. Persona

**What it does**: Enterprise-grade identity platform used by LinkedIn, Square, and Robinhood. Document verification + selfie + liveness detection + database checks.

**Pricing**:
- Essential: $250/month + $1.50/verification beyond 500 included
- Growth: Custom pricing (volume discounts, ~$0.80/check at scale)
- Enterprise: Custom
- Startup Program: Free tier for eligible VC-backed startups (one year)

**Key capabilities**:
- ISO/IEC 30107-3 certified liveness detection (lab-tested by iBeta)
- Handles complex document types (visa stamps, utility bills)
- Workflow builder for multi-step verification
- Case management dashboard

**React Native implementation**: Persona offers `react-native-persona` SDK with embedded inline flows. More complex integration than Stripe but more customizable.

**x/pat recommendation**: FUTURE UPGRADE candidate. The startup program is worth applying to immediately for free verifications. At scale (10K+ users), Persona's $0.80/check is nearly half Stripe's cost. The workflow builder would be valuable for the multi-tier badge system. However, the $250/month floor is premature for beta.

### 1c. Veriff

**What it does**: AI-powered identity verification with biometric matching. Covers 230+ countries with 13,500+ document specimens.

**Pricing**:
- Self-Serve Essential: $0.80/verification
- Self-Serve Plus: $1.39/verification
- Self-Serve Premium: $1.89/verification
- Enterprise: $2-6/verification (annual contracts $25K-$250K+)

**Coverage**: 230+ countries, 48 languages, 13,500+ document types

**Key capabilities**:
- Facial biometric authentication (match returning users to stored template)
- Passive liveness detection (no gesture required)
- Video verification option
- Re-verification for returning users

**React Native implementation**: Veriff offers `@veriff/react-native-sdk`. Well-documented but fewer React Native-specific resources than Stripe.

**x/pat recommendation**: STRONG ALTERNATIVE. The $0.80 Essential tier is the cheapest option with good coverage. The 230+ countries is the best coverage of any provider, important for digital nomads with non-Western documents. Consider if Stripe Identity's country coverage proves insufficient.

### 1d. Sumsub

**What it does**: All-in-one KYC/AML platform. ID verification + address verification + AML screening + transaction monitoring + fraud prevention.

**Pricing**:
- Starts at $1.35/verification
- 14-day free trial with 50 free checks
- Custom pricing for volume

**Key capabilities**:
- FATF-compliant AML screening
- Address verification
- Ongoing monitoring
- 4,000+ enterprise clients

**React Native implementation**: Sumsub offers `@sumsub/react-native-mobilesdk-module`. Comprehensive but heavily compliance-focused.

**x/pat recommendation**: OVERKILL for a social app. Sumsub is built for fintech/crypto compliance. The AML screening, transaction monitoring, and address verification are unnecessary for x/pat. The price is competitive but the integration complexity isn't justified. Skip unless x/pat adds financial features.

### 1e. Provider Comparison Matrix

| Feature | Stripe Identity | Persona | Veriff | Sumsub |
|---------|----------------|---------|--------|--------|
| Price/check | $1.50 | $0.80-1.50 | $0.80-1.89 | $1.35+ |
| Free tier | 50 checks | Startup program | None | 50 checks |
| Countries | 100+ | 200+ | 230+ | 220+ |
| RN SDK | Official, excellent | Good | Good | Good |
| Liveness | Yes | ISO certified | Passive | Yes |
| Setup complexity | Low | Medium | Medium | High |
| Best for | Startups | Scale-up | Global coverage | Fintech |

**VERDICT**: Start with Stripe Identity (simplest RN SDK, 50 free, adequate coverage). Apply for Persona Startup Program now. Migrate to Persona at 10K+ users for cost savings.

---

## 2. Lightweight Verification Methods

### 2a. Apple / Google Native Verification (Item 5)

**Sign in with Apple** (already implemented in x/pat):
- Provides verified email (Apple confirms email ownership)
- Real Name available on first sign-in (user can choose to share)
- Does NOT verify government identity
- Free, no per-check cost
- Already implemented via `expo-apple-authentication` in useAuth.tsx

**Sign in with Google**:
- Provides verified Google email
- Profile photo, display name
- Does NOT verify government identity
- Free, no per-check cost
- Not yet implemented in x/pat

**x/pat recommendation**: These are TIER 1 (Bronze) verification signals. Already having Apple Sign-In means every iOS user gets automatic Bronze. Add Google Sign-In for Android users. These confirm "this is a real email owned by a real person" but nothing more.

**Implementation**: Google Sign-In via `@react-native-google-signin/google-signin` + Supabase `signInWithIdToken({ provider: 'google' })`. Mirror the existing Apple flow.

### 2b. LinkedIn Verification Integration (Item 6)

**What's available (2025-2026)**:
LinkedIn launched "Verified on LinkedIn" API enabling third-party apps to display LinkedIn verification badges.

**API tiers**:
- Development: Testing only
- Lite: Free production tier (perfect for startups)
- Plus: Enterprise-grade with bulk validation

**What you can retrieve** (with user OAuth consent):
- Verified identity (name confirmed via government ID or CLEAR)
- Verified workplace (current employer confirmed)
- Verified education (school confirmed)
- Verification timestamp

**Early adopters**: Adobe Behance, UserTesting, TrustRadius, G2

**x/pat recommendation**: HIGH VALUE, IMPLEMENT EARLY. Digital nomads are professionals. Importing verified LinkedIn work history is the single most relevant trust signal for this audience. A "Verified Remote Worker" badge from LinkedIn data is uniquely powerful for x/pat.

**Implementation approach**:
1. Register for LinkedIn Verified API (Lite tier, free)
2. OAuth 2.0 flow: user authorizes x/pat to read verification status
3. Store verification result in Supabase `user_verifications` table
4. Display "LinkedIn Verified" badge on profile
5. No ongoing cost, one-time verification per user

### 2c. Phone Number Verification (Item 7)

**Twilio Verify**:
- $0.05/verification (API fee) + SMS delivery cost
- SMS: ~$0.0079/message (US), varies by country
- WhatsApp: ~$0.005/message
- Total cost: ~$0.05-0.10 per phone verification

**Implementation**:
```
Supabase Edge Function --> Twilio Verify API --> Send OTP
User enters code --> Edge Function --> Twilio Verify Check --> Update profile
```

**Alternative**: Supabase Auth already supports phone auth natively (uses Twilio under the hood). Could add phone as a sign-in method and get verification for free as part of auth flow.

**x/pat recommendation**: IMPLEMENT as Tier 2 (Silver) requirement. Phone verification is the cheapest verification method and dramatically reduces fake accounts. International nomads change SIM cards frequently, so allow re-verification. Use Supabase's built-in phone auth to avoid separate Twilio integration.

### 2d. Photo Verification (Item 8)

**Bumble model** (selfie pose matching):
- User shown a random pose from 100+ poses
- User takes selfie mimicking the pose
- Mix of AI + human review compares to profile photos
- In the US, photo verification is mandatory for new users
- Blue shield badge displayed on verified profiles

**Liveness detection approaches**:
- Active liveness: User performs action (blink, turn head, smile)
- Passive liveness: AI analyzes single selfie for spoofing artifacts
- 3D depth mapping: Uses device camera depth sensor

**x/pat recommendation**: IMPLEMENT as Tier 2 (Silver) component. Use a simplified version: require a selfie, run passive liveness detection via Stripe Identity's selfie check (included in the $1.50 verification) OR use a lighter-weight approach with expo-camera + server-side face comparison. For beta, a simpler "take a selfie now" with basic face detection is sufficient.

### 2e. Video Verification (Item 9)

**Hinge model**:
- 30-second video prompts paired with conversation-starter questions
- Profiles with video prompts receive 62% more likes
- Generate 3.4x more conversation starters than photo-only profiles
- Videos serve dual purpose: verification AND engagement

**x/pat recommendation**: IMPLEMENT as optional profile enhancement, NOT verification requirement. Video intros are perfect for x/pat's "meet nomads" use case but should be incentivized, not forced. Badge: "Video Intro" indicator on profile. Implementation: expo-camera recording, upload to Supabase Storage, display in profile.

### 2f. Social Proof Verification (Item 10)

**Cross-platform signals**:
- Instagram: 17% higher engagement for verified accounts
- X/Twitter: Blue checkmark now means paid subscription, less trust signal
- GitHub: Valuable for tech nomads, shows real activity/contributions
- Meta Verified: $14.99/month, government ID verified

**Implementation approach**:
- OAuth connect for Instagram, GitHub
- Store linked account handles in profile
- Display connected social icons on profile
- DO NOT auto-verify based on social accounts (can be faked)
- Use as trust SIGNAL (displayed), not verification PROOF

**x/pat recommendation**: IMPLEMENT as trust enhancement. Connected socials increase perceived trustworthiness. Show icons for connected accounts. GitHub is particularly valuable for the tech nomad audience. Instagram shows social activity. Do not count as verification tier advancement -- these are supplementary trust signals.

---

## 3. Badge System & Community Trust

### 3a. Multi-Tier Badge System Design (Item 11)

**Recommended 4-tier system for x/pat**:

#### TIER 1: EXPLORER (Bronze)
**Requirements**: Verified email (Apple/Google sign-in) + completed profile (photo, bio, current city)
**What it proves**: "This is a real person with a real email"
**Effort**: ~2 minutes, zero cost
**Expected completion**: 85-95% of users (automatic with sign-up flow)
**Badge color**: Teal outline ring (#2EC4A0) around avatar

#### TIER 2: VERIFIED (Silver)
**Requirements**: Phone verified + Photo verified (selfie liveness check)
**What it proves**: "This person has a real phone number and their photos match reality"
**Effort**: ~3 minutes, $0.05-0.10 cost (phone OTP)
**Expected completion**: 50-65% of users
**Badge color**: Solid teal ring (#2EC4A0) with checkmark icon
**Unlocks**: DMs with non-connections, event creation, city chat posting

#### TIER 3: TRUSTED (Gold)
**Requirements**: Government ID verified (Stripe Identity) + LinkedIn verified OR 3+ community vouches
**What it proves**: "This person's identity is confirmed by government documents"
**Effort**: ~5 minutes, $1.50 cost (Stripe Identity)
**Expected completion**: 25-40% of users
**Badge color**: Amber ring (#E8803A) with shield icon
**Unlocks**: Organizing meetups, premium map visibility, trusted search filter

#### TIER 4: AMBASSADOR (Platinum)
**Requirements**: Trusted (Gold) + 90-day account age + 5+ community vouches + 10+ positive interactions + video intro
**What it proves**: "This person is an established, community-validated member"
**Effort**: Organic over time
**Expected completion**: 5-10% of users
**Badge color**: Gradient ring (teal-to-amber) with star icon
**Unlocks**: Community moderator eligibility, vouch others, featured in discovery, "Ambassador" label

### 3b. Community Vouching System (Item 12)

**Couchsurfing lessons (what worked)**:
- 95% of users with 10+ friends got vouched
- Direct reciprocity between surfers/hosts: 12-18% of visits
- References after real-world meetings created strongest trust

**Couchsurfing lessons (what failed)**:
- Vouches given too freely without in-person meetings
- Only 6.8% of total users were vouched (low adoption)
- Weak-tie vouches outnumbered strong-tie vouches
- Global reputation scores poorly predicted actual trustworthiness

**x/pat design (learning from failures)**:
- Vouches require MUTUAL connection (both users connected)
- Vouches require 7+ day connection age (prevent instant vouching)
- Each vouch includes context: "Met at [coworking/event/city]"
- Users can give max 5 vouches per month (prevents cheapening)
- Vouch weight increases with voucher's own trust level
- Negative interaction reports REDUCE trust score (unlike Couchsurfing which had no negative signals)
- Display vouch count AND voucher identities (transparency)

**Implementation**:
```sql
CREATE TABLE vouches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID REFERENCES profiles(id) NOT NULL,
  vouchee_id UUID REFERENCES profiles(id) NOT NULL,
  context TEXT, -- "Met at Hubud coworking in Bali"
  met_location TEXT, -- city
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(voucher_id, vouchee_id)
);
```

### 3c. Verified Nomad Badge (Item 13)

**What it proves**: This person is genuinely living the digital nomad lifestyle

**Verification signals** (any 3 of 5 required):
1. LinkedIn verified remote work (via Verified on LinkedIn API)
2. Travel history: 3+ cities in user's travel plans within 12 months
3. Coworking check-ins: 5+ check-ins at different coworking spots
4. Community vouches: 3+ vouches from other Verified Nomads
5. Account longevity: 6+ months active with regular engagement

**Badge design**: Special "Nomad" badge with globe icon, displayed separately from trust tier

**x/pat recommendation**: This is a DIFFERENTIATOR. No other platform offers a "Verified Nomad" credential. It becomes a digital nomad's professional identity marker that they want to show off. Partner with nomad communities (WiFi Tribe, Nomad List) for cross-verification.

### 3d. Coworking Space Verification (Item 14)

**Partnership approach**:
- Spacebring API connects 500+ coworking spaces in 50+ countries
- Partner with 5-10 top nomad-focused spaces initially: Hubud (Bali), Dojo (Bali), Second Home (Lisbon), Selina (global), WeWork (global)
- Members check in at partner spaces via x/pat app
- Space confirms membership via partner dashboard or API

**Implementation**:
1. Create `coworking_partners` table with partner details
2. Partner provides member list or verification API
3. User claims coworking membership in app
4. Partner verifies (manual approval or API check)
5. "Verified at [Space Name]" badge on profile

**Cost**: Zero per verification (partnership benefit for the coworking space is user traffic). Revenue opportunity: coworking spaces pay for featured placement.

---

## 4. Privacy & Legal (Item 15)

### Government ID Verification Privacy

**Two approaches**:

#### Verify-and-Discard (RECOMMENDED for x/pat)
- Stripe Identity handles document processing
- x/pat receives ONLY the verification result (pass/fail) + metadata (name match, country)
- Raw document images and selfies stored by Stripe, NOT by x/pat
- Stripe retains data per their privacy policy (configurable retention)
- x/pat stores: `verification_status`, `verified_at`, `verification_provider`, `verified_country`

#### Store-and-Verify
- App stores document images in own storage
- Full control but MASSIVE liability
- GDPR Article 5(1)(c): data minimization principle violated
- Not recommended for a social app

**GDPR compliance requirements**:
1. **Data minimization**: Only store what's necessary (verification result, not raw documents)
2. **Purpose limitation**: Verification data used ONLY for trust/safety, never marketing
3. **Storage limitation**: Define retention periods, auto-delete when purpose fulfilled
4. **Right to erasure**: Users can request verification data deletion (reverts badge)
5. **Consent**: Explicit, informed consent before verification (not buried in ToS)
6. **Data processing agreement**: Required with Stripe Identity as data processor

**Privacy-first implementation**:
```
User consents --> Stripe processes documents -->
Stripe returns pass/fail + metadata -->
x/pat stores ONLY result -->
Stripe deletes documents per retention policy
```

**Legal notices needed**:
- Verification consent screen explaining what data Stripe processes
- Privacy policy section on identity verification
- Data retention disclosure (how long verification status is kept)
- Right to withdraw/delete verification

---

## 5. Badge Display UX (Item 16)

### Where to Show Verification Badges

**Mercury aesthetic alignment**: Badges should feel premium, subtle, and integrated -- not gamified or "sticker-like." Think fintech trust indicators, not gaming achievement badges.

#### 1. Profile Screen (Primary)
- Verification tier ring around avatar (teal outline > solid teal > amber > gradient)
- Trust tier label below name: "Verified" / "Trusted" / "Ambassador"
- Expandable verification details section: which checks passed, when verified
- Connected social icons row
- Vouch count with "See who vouched" tap-through

#### 2. Chat / DM List
- Small badge icon (6px) at bottom-right of avatar thumbnail
- Tier color coding on the ring
- "Verified" label next to name in chat header
- Trust tier visible before sending first DM (informed decision)

#### 3. Map Markers (ExploreScreen)
- Verified users get teal-bordered map pins
- Trusted (Gold) users get amber-bordered pins
- Unverified users get default gray pins
- Filter: "Show only verified" toggle on map

#### 4. SpotCards / Feed
- Small verification badge next to username in post attribution
- Spot recommendations from Trusted users get "Trusted recommendation" tag
- Event cards show organizer verification level

#### 5. People/Discovery Cards
- Verification tier prominently displayed on swipe/discovery cards
- Filter by minimum verification tier
- Sort by trust score option

#### 6. Connection Requests
- Show requester's verification tier in connection request
- Warning for unverified connection requests: "This user hasn't verified their identity"

### Badge Visual Design (Mercury Aesthetic)

**Design principles**:
- Glass morphism: badges use `rgba(255, 255, 255, 0.06)` glass background
- Subtle glow: `shadows.glow(colors.teal)` for verified, `shadows.glow(colors.amber)` for trusted
- Thin borders: 1.5px avatar ring, not thick or cartoonish
- Icon style: Feather icons (shield-check, award, star) matching existing icon set
- Animation: Gentle pulse on first view (reanimated spring), then static
- Typography: SpaceMono for labels, consistent with app theme

**Avatar ring implementation concept**:
```tsx
// Wrap existing Avatar component
<View style={[styles.ring, { borderColor: tierColor, borderWidth: 1.5 }]}>
  <Avatar uri={uri} name={name} size={size - 3} />
  {tier >= 2 && (
    <View style={styles.badgeIcon}>
      <Feather name={tierIcon} size={10} color={tierColor} />
    </View>
  )}
</View>
```

---

## 6. Conversion & Cost Modeling

### 6a. Verification Conversion Rates (Item 17)

**Industry benchmarks**:
- Email verification: 90-95% completion (automatic with social sign-in)
- Phone OTP: 70-80% completion (familiar flow, low friction)
- Photo/selfie verification: 55-65% completion (Bumble achieves near-universal via mandating)
- Government ID verification: 30-45% completion when optional, 60-75% when required
- Video intro: 15-25% completion when optional

**Friction reduction strategies**:
- Progressive disclosure: don't ask for everything at once
- Clear value proposition at each step ("Unlock DMs by verifying your phone")
- Social proof: "87% of nomads in Bangkok are Verified"
- Incentives: Verified users appear higher in discovery
- Timing: Prompt after first positive interaction, not during onboarding

**Key insight**: 60% of consumers abandon online transactions when they can't verify identity easily. The UX of the verification flow matters more than which provider you use.

### 6b. Cost Modeling (Item 18)

#### 1,000 Users (Beta)

| Verification | Adoption % | Checks | Unit Cost | Total |
|-------------|-----------|--------|-----------|-------|
| Email (Apple/Google) | 95% | 950 | $0.00 | $0 |
| Phone OTP | 60% | 600 | $0.08 | $48 |
| Photo selfie (via Stripe) | 40% | 400 | $1.50* | $600 |
| Gov ID (Stripe Identity) | 30% | 300 | $1.50* | $450 |
| LinkedIn verification | 25% | 250 | $0.00 | $0 |
| **Total** | | | | **$1,098** |

*Photo selfie and Gov ID can be combined in single Stripe Identity session = $1.50 total, not $3.00

**Optimized**: If selfie + ID done together: ~300 checks x $1.50 = $450. First 50 free = $375.
**Beta cost (1K users): ~$423**

#### 10,000 Users

| Verification | Adoption % | Checks | Unit Cost | Total |
|-------------|-----------|--------|-----------|-------|
| Email (Apple/Google) | 95% | 9,500 | $0.00 | $0 |
| Phone OTP | 65% | 6,500 | $0.08 | $520 |
| Gov ID + Selfie (Stripe) | 35% | 3,500 | $1.50 | $5,250 |
| LinkedIn verification | 30% | 3,000 | $0.00 | $0 |
| **Total** | | | | **$5,770** |

**With Persona migration (at scale)**: 3,500 x $0.80 = $2,800. Saves $2,450.
**10K users cost: ~$3,320 (with Persona)**

#### 50,000 Users

| Verification | Adoption % | Checks | Unit Cost | Total |
|-------------|-----------|--------|-----------|-------|
| Email | 95% | 47,500 | $0.00 | $0 |
| Phone OTP | 70% | 35,000 | $0.06 | $2,100 |
| Gov ID + Selfie (Persona) | 40% | 20,000 | $0.80 | $16,000 |
| LinkedIn | 35% | 17,500 | $0.00 | $0 |
| **Total** | | | | **$18,100** |

**Monthly: ~$1,508** (assuming 12-month spread of user acquisition)

#### 100,000 Users

| Verification | Adoption % | Checks | Unit Cost | Total |
|-------------|-----------|--------|-----------|-------|
| Email | 95% | 95,000 | $0.00 | $0 |
| Phone OTP | 75% | 75,000 | $0.05 | $3,750 |
| Gov ID + Selfie (Persona) | 45% | 45,000 | $0.70 | $31,500 |
| LinkedIn | 40% | 40,000 | $0.00 | $0 |
| **Total** | | | | **$35,250** |

**Monthly: ~$2,938** (assuming 12-month spread)

**Key insight**: Verification costs scale linearly but are dwarfed by infrastructure and marketing costs. At 100K users, verification is ~$0.35/user -- trivial compared to CAC.

---

## 7. Platform Case Studies

### 7a. Bumble Verification System (Item 19)

**How they achieved near-universal photo verification**:
- Made it MANDATORY for new US users (not optional)
- 100 random poses prevent deepfake circumvention
- Mix of AI + human review for accuracy
- Blue shield badge is prominently displayed, creating social pressure
- Users can REQUEST matches to verify (peer pressure mechanism)
- Verification takes under 2 minutes (low friction)
- Unverified profiles get lower visibility in algorithm

**Lessons for x/pat**:
- Don't mandate at launch -- nomads value freedom and resist friction
- DO create social pressure: "92% of nomads in your city are Verified"
- DO reduce visibility for unverified in discovery/search
- DO allow requesting verification from connections
- DO make the badge visually desirable (Mercury premium aesthetic)

### 7b. Airbnb Identity Verification (Item 20)

**System**:
- Government ID + selfie required for ALL hosts, co-hosts, and booking guests
- AI-powered fraud detection with human escalation
- Mandatory as of 2025 -- unverified users cannot book or host
- Selfie NOT displayed publicly (privacy-preserving)

**Impact on trust**:
- Unverified accounts get limited platform visibility
- Fewer booking requests from unverified guests (natural filtering)
- Hosts report higher confidence in guest quality
- Fraud rates significantly reduced

**Lessons for x/pat**:
- Airbnb proves mandatory verification works at scale (150M+ users)
- The selfie-not-shown-publicly approach is excellent for privacy
- Verification increases platform trust holistically (network effect)
- Phase in requirements: optional first, then required for key actions, then mandatory

### 7c. BlaBlaCar Verification (Item 21)

**Experience Level System**:
- Level increases through profile completion, email/phone verification, photo addition
- Two-way rating system (driver and passenger rate each other)
- 90% of ratings must be Good or above to advance
- Higher-level members fill their cars faster (direct incentive)
- 14-day mutual rating window encourages participation

**Key stat from research**: Verified members see significantly more bookings, creating natural incentive to verify.

**Lessons for x/pat**:
- Progressive leveling (not binary verified/unverified) increases engagement
- Two-way interactions (mutual vouching) are more trustworthy than one-way
- Direct benefit of verification (more visibility, faster connections) drives adoption
- Time-limited mutual rating prevents rating avoidance

### 7d. Couchsurfing References (Item 22)

**What worked**:
- References after real-world meetings created genuine trust
- 95% of active users with 10+ friends received vouches
- Reciprocity rate: 12-18% of hosting interactions
- Rich text references (not just star ratings) provided nuanced trust signals

**What failed**:
- Vouches given too freely (social pressure to vouch without conviction)
- Only 6.8% of all users participated in vouching (low adoption)
- Weak-tie vouches outnumbered strong-tie vouches (diluted signal)
- Global reputation scores didn't predict local trustworthiness
- No negative reference mechanism (toxic positivity in reviews)
- System couldn't distinguish "met once at a meetup" from "hosted for a week"

**Lessons for x/pat**:
- REQUIRE context for vouches ("How do you know this person?")
- LIMIT vouch frequency (prevents cheapening)
- WEIGHT vouches by voucher's own trust level (web of trust)
- ALLOW implicit negative signals (blocks, reports reduce score)
- DISTINGUISH interaction depth (met briefly vs. traveled together)

---

## 8. Trust Scoring & Verified Features

### 8a. Safety Score Composite (Item 23)

**Trust Score Algorithm for x/pat**:

```
trust_score = (
  verification_score * 0.35 +    -- ID/phone/photo verification tier
  community_score * 0.30 +       -- vouches, connections, interaction quality
  behavior_score * 0.25 +        -- response rate, report history, content quality
  longevity_score * 0.10         -- account age, activity consistency
)
```

**Component breakdown**:

**Verification Score (0-100, weight 35%)**:
- Email verified: 15 points
- Phone verified: 25 points
- Photo verified: 20 points
- Government ID verified: 30 points
- LinkedIn verified: 10 points (bonus)

**Community Score (0-100, weight 30%)**:
- Vouches received: 5 points each (max 50)
- Vouch quality: weighted by voucher's own score
- Connection count: 1 point per 5 connections (max 20)
- Events attended: 3 points each (max 30)

**Behavior Score (0-100, weight 25%)**:
- Base: 70 points (benefit of the doubt)
- Message response rate >50%: +10 points
- No reports received: +10 points
- Each valid report: -15 points
- Each block received: -5 points
- Quality content (spots, posts with engagement): +10 points

**Longevity Score (0-100, weight 10%)**:
- Account age: 2 points per month (max 24)
- Active months: 3 points per active month (max 36)
- Cities visited in app: 4 points each (max 40)

**Display**: Show trust score as a 5-point scale (1-5 shields), NOT a raw number. Users see "4.2 out of 5" or 4 filled shields. Never expose the algorithm.

### 8b. Verified-Only Features (Item 24)

**Feature access by verification tier**:

| Feature | Explorer | Verified | Trusted | Ambassador |
|---------|----------|----------|---------|------------|
| Browse map/feed | Yes | Yes | Yes | Yes |
| Add spots | Yes | Yes | Yes | Yes |
| City chat (read) | Yes | Yes | Yes | Yes |
| City chat (post) | Limited | Yes | Yes | Yes |
| Send connection requests | 5/day | 20/day | Unlimited | Unlimited |
| DMs to connections | Yes | Yes | Yes | Yes |
| DMs to non-connections | No | Yes | Yes | Yes |
| Create events | No | Yes | Yes | Yes |
| Organize meetups | No | No | Yes | Yes |
| Appear in "Nearby" | Blurred | Yes | Featured | Featured + badge |
| Discovery visibility | Low | Normal | Boosted | Top + Ambassador tag |
| Vouch for others | No | No | Yes | Yes (weighted 2x) |
| Request verification from others | No | Yes | Yes | Yes |
| Report users | Yes | Yes | Yes | Priority review |
| Moderate content | No | No | No | Yes |
| Share meetup location | No | Yes | Yes | Yes |

**Key design principle**: Unverified users can USE the app fully for browsing and discovery. Verification unlocks SOCIAL features where trust matters. Never paywall content behind verification.

---

## 9. Fraud Prevention (Item 25)

### Fake ID Detection

**Current threat landscape (2025-2026)**:
- Deepfake fraud attempts rose 900% from 2022-2024
- Federal Reserve: deepfake attacks increased 20x in three years
- Deloitte projects: $40 billion in AI-generated fraud by 2027
- Gartner predicts: by 2026, 30% of enterprises won't trust face biometrics alone

**Stripe Identity's built-in protections**:
- Document authenticity analysis (pattern, hologram, font, texture detection)
- Biometric face matching with anti-spoofing
- Liveness detection (rejects printed photos, screen replays)
- Database cross-referencing (detects known fraudulent documents)
- Machine learning models trained on millions of verifications

**Additional layers x/pat should implement**:
1. **Behavioral analysis**: Flag accounts that verify but never interact naturally
2. **Velocity checks**: Flag multiple verifications from same device/IP
3. **Network analysis**: Flag isolated accounts with no organic connections
4. **Report correlation**: Multiple reports from verified users trigger review
5. **Photo reverse search**: Optional check if profile photos appear on stock photo sites

**Deepfake selfie countermeasures**:
- Passive liveness detection (Stripe includes this)
- Active liveness prompts for high-risk cases (turn head, blink sequence)
- Device attestation: verify camera is real device camera, not virtual camera
- Session integrity: verification must complete in single session, no photo upload

### Spoofing Prevention

- Rate limit verification attempts: max 3 per 24 hours
- Device fingerprinting: flag same device verifying multiple accounts
- IP reputation checking: flag VPN/datacenter IPs during verification
- Require re-verification if profile photos change significantly
- Community reporting mechanism for suspected fake profiles

---

## 10. Safety Features

### 10a. Emergency Contact Integration (Item 26)

**Design**:
- Users add 1-3 emergency contacts during onboarding (optional, prompted again before first meetup)
- Contacts stored encrypted in Supabase
- NOT displayed publicly, only used for safety features
- Can be phone numbers or x/pat users

**Features**:
- "Share my meetup" sends location + event details to emergency contacts
- "Check-in timer" auto-alerts contacts if user doesn't check in
- "SOS button" in meetup mode sends immediate alert with last known location

**Implementation**: Supabase table `emergency_contacts` with encrypted phone/user references. Push notifications via existing push infrastructure.

### 10b. Background Checks for Meetups (Item 27)

**Feasibility assessment**:
- International background checks: $20-100+ per check, 3-4 business days average
- Legal complexity: every country has different criminal record systems
- Privacy issues: GDPR restricts processing criminal record data
- Cost prohibitive for a free social app

**x/pat recommendation**: DO NOT IMPLEMENT. Background checks are infeasible for an international user base, legally complex, cost-prohibitive, and culturally inappropriate for a social app. The multi-tier verification system + community vouching provides sufficient trust signals. If needed in the future, partner with a background check API (Checkr international) for optional premium feature.

### 10c. Insurance Partnerships (Item 28)

**SafetyWing opportunity**:
- Already an x/pat affiliate partner (in AFFILIATE_PARTNERS constant)
- SafetyWing offers partner discount programs (up to 30% off via communities)
- No public API for verification-based discounts
- Opportunity: negotiate custom "x/pat Verified Nomad" discount code

**Implementation approach**:
1. Contact SafetyWing partnership team
2. Propose: "Verified Nomad" badge holders get exclusive discount code
3. Display SafetyWing offer on verification completion: "You're Verified! Get 15% off SafetyWing insurance"
4. Track via existing affiliate tracking system
5. Revenue: affiliate commission on each signup

**Other insurance partnerships**:
- World Nomads: travel insurance, affiliate program available
- Genki: European digital nomad health insurance
- Insured Nomads: comprehensive expat insurance

### 10d. Real-Time Safety Features (Item 29)

**Check-in Timer for Meetups**:
```
User creates meetup --> Sets duration (1h, 2h, 4h) -->
Timer starts when user arrives (GPS confirm or manual) -->
Timer expires --> "Are you safe?" notification -->
No response in 15 min --> Alert emergency contacts with last location
```

**Share Location with Friend**:
- One-tap "Share my location" to selected x/pat connections
- Time-limited sharing (1h, 2h, until I stop)
- Real-time location visible on map for shared contacts only
- Uses existing Supabase realtime for location updates

**SOS Features**:
- Triple-tap power button or in-app SOS button
- Sends location + meetup context to emergency contacts
- Records 30-second audio clip (stored encrypted)
- Optional: integrate with Noonlight API for professional emergency dispatch

**Implementation**: Build on existing `user_availability` and `city_presence` tables. Add `safety_sessions` table for active check-ins.

**Recommended models from existing apps**:
- Google Personal Safety: timer-based auto-alert if no check-in
- Life360: real-time circle location sharing + SOS alerts
- Noonlight: silent alert with location to emergency dispatch
- My SOS Family: timer + emergency contact notification

### 10e. Trust Score Algorithm (Item 30)

See Section 8a for the detailed algorithm. Additional considerations:

**Score display best practices**:
- NEVER show raw numeric score (feels surveillance-like)
- Use 5-shield visual or tier label (Explorer/Verified/Trusted/Ambassador)
- Show positive signals ("3 community vouches, ID verified") not negative
- Allow users to see their OWN detailed score breakdown
- Other users see only the tier badge, not the numeric score
- Update score daily in background (not real-time to prevent gaming)

**Anti-gaming measures**:
- Score calculation happens server-side only (Edge Function)
- Vouch trading detection (A vouches B, B vouches A simultaneously)
- Sudden score changes trigger review
- Seasonal decay: inactive users' longevity score decays 2 points/month of inactivity
- Ban evasion: device fingerprint + phone number linked to prevent fresh-start gaming

---

## 11. Implementation Roadmap

### Phase 1: Foundation (Sprint 11 - Immediate)
**Zero cost, high impact**

1. Add `verification_level` and `trust_score` columns to `profiles` table
2. Create `user_verifications` table (tracks individual verification completions)
3. Create `vouches` table
4. Update Profile type in `types/index.ts`
5. Build `VerificationBadge` component (avatar ring + icon)
6. Display badges on ProfileScreen, UserProfileScreen, Avatar component
7. Implement automatic Bronze/Explorer for completed profiles
8. Add Google Sign-In (covers Android verification gap)

### Phase 2: Phone + Photo Verification (Sprint 12)
**~$50 cost for beta users**

1. Integrate Supabase phone auth for OTP verification
2. Build phone verification flow screen
3. Build selfie capture screen with basic face detection
4. Implement Silver/Verified tier logic
5. Gate DMs and event creation behind Verified tier
6. Add "Get Verified" CTA throughout app

### Phase 3: Government ID (Sprint 13)
**~$375 cost for beta (300 checks minus 50 free)**

1. Integrate Stripe Identity React Native SDK
2. Build Supabase Edge Function for VerificationSession creation
3. Build webhook handler for verification completion
4. Implement Gold/Trusted tier logic
5. Gate meetup organization behind Trusted tier
6. Apply for Persona Startup Program (future migration)

### Phase 4: Community Trust (Sprint 14)
**Zero cost**

1. Build vouching system UI
2. Implement vouch limits and validation
3. Build trust score calculation Edge Function
4. Implement Ambassador tier logic
5. Add "Request Verification" feature
6. Build verification stats/social proof ("87% verified in Bangkok")

### Phase 5: LinkedIn + Safety (Sprint 15)
**Zero cost**

1. Integrate LinkedIn Verified API (Lite tier)
2. Build "Verified Nomad" badge logic
3. Implement emergency contacts
4. Build check-in timer for meetups
5. Build share-location feature
6. Negotiate SafetyWing verified-user discount

---

## 12. Database Schema

### New Tables

```sql
-- Individual verification records
CREATE TABLE user_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  verification_type TEXT NOT NULL, -- 'email', 'phone', 'photo', 'government_id', 'linkedin', 'video'
  provider TEXT, -- 'apple', 'google', 'twilio', 'stripe_identity', 'linkedin', 'manual'
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'failed', 'expired'
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- some verifications expire (e.g., annual ID re-check)
  metadata JSONB DEFAULT '{}', -- provider-specific data (no PII)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, verification_type)
);

-- Community vouching
CREATE TABLE vouches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID REFERENCES profiles(id) NOT NULL,
  vouchee_id UUID REFERENCES profiles(id) NOT NULL,
  context TEXT, -- "Met at Hubud coworking in Bali"
  met_location TEXT, -- city name
  voucher_level INTEGER DEFAULT 1, -- voucher's tier at time of vouch
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(voucher_id, vouchee_id),
  CHECK(voucher_id != vouchee_id)
);

-- Emergency contacts
CREATE TABLE emergency_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT, -- encrypted
  contact_user_id UUID REFERENCES profiles(id), -- if contact is also on x/pat
  relationship TEXT, -- 'friend', 'family', 'partner'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Safety check-in sessions
CREATE TABLE safety_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  event_id UUID REFERENCES events(id),
  type TEXT NOT NULL, -- 'meetup', 'exploration', 'manual'
  status TEXT DEFAULT 'active', -- 'active', 'checked_in', 'alert_sent', 'resolved'
  started_at TIMESTAMPTZ DEFAULT now(),
  expected_end TIMESTAMPTZ NOT NULL,
  last_check_in TIMESTAMPTZ,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  shared_with UUID[], -- user IDs who can see location
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Connected social accounts (for social proof display)
CREATE TABLE connected_socials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  platform TEXT NOT NULL, -- 'instagram', 'github', 'linkedin', 'twitter'
  platform_username TEXT,
  verified BOOLEAN DEFAULT false,
  connected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);
```

### Profile Table Additions

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_level INTEGER DEFAULT 0;
-- 0=Unverified, 1=Explorer, 2=Verified, 3=Trusted, 4=Ambassador

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score NUMERIC(5,2) DEFAULT 0;
-- Computed score 0-100, updated daily by Edge Function

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
-- When highest verification was achieved

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vouch_count INTEGER DEFAULT 0;
-- Denormalized count for display
```

---

## 13. Cost Model Projections

### Summary by Growth Stage

| Stage | Users | Monthly Verif Cost | Cost/User | Notes |
|-------|-------|-------------------|-----------|-------|
| Beta | 100 | $0 | $0.00 | Within Stripe free tier |
| Early | 1,000 | ~$35 | $0.42 total | Stripe, minimal phone OTP |
| Growth | 10,000 | ~$275 | $0.33 total | Migrate to Persona |
| Scale | 50,000 | ~$1,500 | $0.36 total | Volume discounts |
| Mass | 100,000 | ~$2,900 | $0.35 total | Enterprise pricing |

**Key takeaway**: Verification costs are extremely manageable. Even at 100K users, it's under $3K/month. The trust and safety benefits far outweigh the cost. For context, a single partnership deal with SafetyWing could cover verification costs for 50K+ users.

---

## 14. Badge Design Specification

### Color System (Mercury Aesthetic)

```typescript
const VERIFICATION_COLORS = {
  explorer: {
    ring: colors.teal,           // #2EC4A0
    ringOpacity: 0.5,            // subtle outline
    icon: 'user-check',          // feather icon
    glow: 'rgba(46, 196, 160, 0.15)',
    label: 'Explorer',
  },
  verified: {
    ring: colors.teal,           // #2EC4A0
    ringOpacity: 1.0,            // solid ring
    icon: 'check-circle',        // feather icon
    glow: 'rgba(46, 196, 160, 0.25)',
    label: 'Verified',
  },
  trusted: {
    ring: colors.amber,          // #E8803A
    ringOpacity: 1.0,            // solid ring
    icon: 'shield',              // feather icon
    glow: 'rgba(232, 128, 58, 0.25)',
    label: 'Trusted',
  },
  ambassador: {
    ring: 'linear-gradient(135deg, #2EC4A0, #E8803A)', // gradient
    ringOpacity: 1.0,
    icon: 'award',               // feather icon
    glow: 'rgba(232, 128, 58, 0.3)',
    label: 'Ambassador',
  },
};
```

### Badge Sizes by Context

| Context | Avatar Size | Ring Width | Badge Icon Size | Label Shown |
|---------|------------|------------|-----------------|-------------|
| Profile header | 80px | 2.5px | 16px | Yes |
| User profile (other) | 64px | 2px | 14px | Yes |
| Chat list item | 44px | 1.5px | 8px | No |
| Map marker | 32px | 1.5px | None | No (color only) |
| Feed post | 36px | 1.5px | 8px | No |
| Discovery card | 56px | 2px | 12px | Yes |
| Connection request | 48px | 1.5px | 10px | Yes |

### Animation Spec

- **First view**: Avatar ring fades in with spring animation (damping: 15, stiffness: 150)
- **Badge earned**: Celebration micro-animation (ring expands 110% then settles, with particle burst)
- **Ambassador glow**: Continuous subtle pulse (opacity 0.2-0.35, 3-second cycle)
- **Interaction**: Ring brightens on press (opacity +0.15)

---

## Key Recommendations Summary

### Do Now (Zero Cost)
1. Add `verification_level` column to profiles
2. Build the VerificationBadge component
3. Auto-assign Explorer (Bronze) to all users with completed profiles
4. Apply for Persona Startup Program and LinkedIn Verified API (Lite)

### Do Next (Sprint 12-13, ~$400 budget)
5. Phone verification via Supabase auth
6. Stripe Identity integration for ID + selfie
7. Gate social features behind verification tiers
8. Build vouching system

### Do Later (Sprint 14-15, Zero Cost)
9. LinkedIn Verified integration
10. Trust score algorithm (Edge Function)
11. Safety features (check-in timer, emergency contacts)
12. "Verified Nomad" badge

### Do at Scale (10K+ users)
13. Migrate from Stripe Identity to Persona
14. Coworking space partnerships
15. SafetyWing verified-user discount
16. Advanced fraud detection (behavioral analysis)

---

## Sources

- [Stripe Identity Documentation](https://docs.stripe.com/identity/verify-identity-documents?platform=react-native)
- [Stripe Identity React Native SDK](https://github.com/stripe/stripe-identity-react-native)
- [Stripe Identity Pricing](https://support.stripe.com/questions/billing-for-stripe-identity)
- [Identity Verification Pricing Comparison 2026](https://trustswiftly.com/blog/identity-verification-pricing-comparison-and-alternatives/)
- [Persona Pricing](https://withpersona.com/pricing)
- [Persona Selfie Verification](https://withpersona.com/product/verifications/selfie)
- [Veriff Self-Serve Plans](https://www.veriff.com/plans/self-serve)
- [Veriff Supported Countries](https://www.veriff.com/supported-countries)
- [Sumsub Pricing](https://sumsub.com/pricing/)
- [Twilio Verify Pricing](https://www.twilio.com/en-us/verify/pricing)
- [LinkedIn Verified on LinkedIn API](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/verified-on-linkedin/overview)
- [LinkedIn ID Verification Expansion](https://news.linkedin.com/2025/Verified_on_LinkedIn)
- [Bumble Photo Verification](https://bumble.com/en-us/the-buzz/the-end-of-catfishing-introducing-photo-verification)
- [Bumble ID Verification](https://support.bumble.com/hc/en-us/articles/28785291893917-Verifying-with-your-ID)
- [Airbnb Identity Verification](https://www.airbnb.com/help/article/1237)
- [Airbnb 2025 Verification Changes](https://www.alliancevirtualoffices.com/virtual-office-blog/airbnb-2025-verification-professional-address/)
- [BlaBlaCar Experience Levels](https://m.blablacar.co.uk/experience-level)
- [BlaBlaCar Trust Blog](https://blog.blablacar.com/blog/inside-story/in-trust-we-trust)
- [Couchsurfing References](https://support.couchsurfing.org/hc/en-us/articles/212280707)
- [Couchsurfing Trust Research (Academic)](https://www.researchgate.net/publication/220775717)
- [Authentication Friction and Conversion Rates](https://mojoauth.com/blog/how-authentication-friction-affects-conversion-rates-the-data-behind-frictionless-login)
- [Deepfake Detection for Identity Verification](https://www.miteksystems.com/solutions/deepfake-attack-detection)
- [How Deepfakes Bypass Biometric Verification](https://www.signzy.com/blogs/how-deepfake-can-bypass-biometric-verification)
- [GDPR Data Retention in Identity Verification](https://didit.me/blog/data-retention-identity-verification/)
- [GDPR Compliance for Identity Verification (Jumio)](https://www.jumio.com/compliance-regulations/gdpr-compliance/)
- [Badge UI Design Best Practices](https://mobbin.com/glossary/badge)
- [Designing for Trust in UX](https://mobisoftinfotech.com/resources/blog/ui-ux-design/designing-for-trust-building-user-confidence-ux)
- [Fintech Design Guide 2026](https://www.eleken.co/blog-posts/modern-fintech-design-guide)
- [Trust Score Algorithm Research](https://www.researchgate.net/publication/315463531)
- [Hinge Video Prompts](https://hinge.co/newsroom/video-prompts-prompt-polls)
- [Google Personal Safety App](https://www.android.com/articles/personal-safety-app/)
- [Life360 Safety Features](https://play.google.com/store/apps/details?id=com.life360.android.safetymapd)
- [Noonlight Safety App](https://www.noonlight.com/noonlight-app)
- [Spacebring Coworking API](https://www.spacebring.com/partnership)
- [International Background Check Guide](https://www.deel.com/blog/the-startup-guide-to-international-background-checks/)
- [SafetyWing Nomad Insurance](https://safetywing.com/nomad-insurance)
