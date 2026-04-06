# Android Privacy, Legal Compliance & Regulatory Requirements (2025-2026)

**Prepared for x/pat** | Social travel app | Location data, user content, affiliate monetization | 60+ countries
**Last updated:** April 2026

---

## Table of Contents

1. [Google Play Data Safety Section](#1-google-play-data-safety-section)
2. [Android Privacy Indicators](#2-android-privacy-indicators)
3. [Android Privacy Sandbox](#3-android-privacy-sandbox)
4. [Android Advertising ID Restrictions](#4-android-advertising-id-restrictions-2026)
5. [GDPR Compliance on Android](#5-gdpr-compliance-on-android)
6. [CCPA/CPRA Compliance on Android](#6-ccpacpra-compliance-on-android)
7. [Brazil LGPD Compliance](#7-brazil-lgpd-compliance)
8. [Thailand PDPA Compliance](#8-thailand-pdpa-compliance)
9. [Android Location Privacy](#9-android-location-privacy)
10. [Android Photo Access](#10-android-photo-access)
11. [Play Store Developer Program Policies](#11-play-store-developer-program-policies-2026)
12. [Play Store Content Moderation](#12-play-store-content-moderation-requirements)
13. [Play Store Families Policy](#13-play-store-families-policy)
14. [COPPA Compliance on Android](#14-coppa-compliance-on-android)
15. [Digital Services Act (EU)](#15-digital-services-act-eu)
16. [Android Data Deletion Requirements](#16-android-data-deletion-requirements)
17. [Android Data Export/Portability](#17-android-data-exportportability)
18. [Play Store Affiliate Disclosure](#18-play-store-affiliate-disclosure-requirements)
19. [Android App Permission Best Practices](#19-android-app-permission-best-practices)
20. [Google Play Protect](#20-google-play-protect)
21. [Android Security Metadata](#21-android-security-metadata)
22. [Play Store Intellectual Property](#22-play-store-intellectual-property-policies)
23. [Android App Transparency](#23-android-app-transparency)
24. [Terms of Service & Privacy Policy Display](#24-terms-of-service-and-privacy-policy-display)
25. [Consent Management Platforms](#25-android-consent-management-platforms)
26. [Priority Matrix & Implementation Roadmap](#26-priority-matrix--implementation-roadmap)

---

## 1. Google Play Data Safety Section

### Requirements

Google Play requires every app to complete a Data Safety declaration in Play Console describing what data the app collects, shares, and how it secures that data. This information appears on the app's store listing before users install.

**Data types x/pat must declare:**

| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Email address | Yes | No | Account authentication |
| Name / Display name | Yes | No | Profile, social features |
| User ID | Yes | No | App functionality, analytics |
| Precise location | Yes | No | Map, nearby spots |
| Approximate location | Yes | No | City-level features |
| Photos/Videos | Yes | No | Spot photos, profile avatar |
| Other user content | Yes | No | Posts, comments, reviews |
| Messages | Yes | No | Chat, DMs |
| App interactions | Yes | No | Analytics (PostHog) |
| Crash logs | Yes | No | Error tracking (Sentry) |
| Performance data | Yes | No | App stability (Sentry) |
| Device identifiers | Yes | No | Push notifications |

**Security practices to declare:**
- Data encrypted in transit (TLS) -- YES
- Data can be deleted by user request -- YES
- Independent security review -- NO (declare honestly)

### x/pat-Specific Actions

1. Complete the Data Safety form in Play Console matching the table above
2. Ensure declarations match PrivacyPolicyScreen.tsx content exactly
3. Declare Supabase, Sentry, and PostHog as service providers (not "sharing")
4. Declare affiliate click tracking as "App interactions" collected optionally
5. Mark all data collection as "not used for tracking" (no cross-app profiling)

### Compliance Priority: **CRITICAL -- Required before Play Store submission**

---

## 2. Android Privacy Indicators

### What They Are

Starting with Android 12, the OS displays privacy indicators in the status bar:
- **Green dot**: Camera or microphone is actively in use
- **Blue dot** (Android 16+): Location services are being accessed
- **Quick Settings tap**: Shows which app is using what sensor

Android 17 Beta 2 (Feb 2026) refined these indicators to smaller circles instead of pill shapes.

### x/pat Impact

x/pat uses camera (photo upload), photo library, and location. Users WILL see these indicators when:
- Opening the map (location indicator)
- Taking a spot photo (camera indicator)
- The app accesses location in background (if ever implemented)

### Implementation Approach

1. **No code changes needed** -- indicators are system-level, automatic
2. **UX awareness**: Users seeing a blue location dot may prompt questions. The existing GDPR consent dialog already explains location use
3. **Never request background location** unless absolutely necessary -- the persistent blue indicator will alarm users
4. **Test on Android 16+ devices** to verify indicators appear/disappear correctly when navigating away from map

### Compliance Priority: **LOW -- System-managed, but test UX impact**

---

## 3. Android Privacy Sandbox

### Current Status: DEPRECATED (October 2025)

Google has retired the Privacy Sandbox for Android, including:
- Topics API (interest-based ad targeting)
- Protected Audiences API (remarketing)
- Attribution Reporting API (conversion measurement)
- Protected App Signals
- SDK Runtime

### x/pat Impact: **NONE**

x/pat does not run ads, does not use ad SDKs, and does not do cross-app tracking. The Privacy Sandbox deprecation has zero impact on x/pat's architecture.

### Action Required: None

---

## 4. Android Advertising ID Restrictions 2026

### Current Status

Google announced GAID (Google Advertising ID) deprecation in 2022, but the timeline remains unclear. The Privacy Sandbox replacement has itself been deprecated. GAID continues to function but with increasing restrictions:
- Users can opt out of personalized ads (GAID returns all zeros)
- Apps targeting children cannot access GAID
- Play Store policies prohibit linking GAID to PII without consent

### x/pat Impact: **NONE**

x/pat does not:
- Collect or use the Android Advertising ID
- Run ads or use ad SDKs
- Perform cross-app tracking

PostHog uses its own anonymous identifier, not GAID. Sentry uses user ID for error correlation, not GAID.

### Action Required: None. Continue not collecting GAID.

---

## 5. GDPR Compliance on Android

### Requirements for x/pat

The GDPR applies because x/pat serves users in the EU/EEA. Key obligations:

**A. Lawful Basis for Processing**

| Data | Lawful Basis | Notes |
|------|-------------|-------|
| Profile info, spots, posts, messages | Contract performance | Necessary to provide the service |
| Location data | Consent | Explicit device permission |
| Push notifications | Consent | Explicit device permission |
| Crash logs (Sentry) | Legitimate interest | Anonymized, app stability |
| Analytics (PostHog) | Legitimate interest | Anonymized usage data |
| Affiliate click tracking | Legitimate interest | Anonymized, no PII shared |

**B. Consent Management Requirements**

- "Accept All" and "Reject All" must have equal visual prominence
- Users must be able to toggle individual categories (functional, analytics)
- Core app functionality must work with all tracking declined
- Consent records must include: timestamp, user ID, consent version, what was shown

**C. Data Processing Records (Article 30)**

Maintain internal records documenting:
- Categories of data subjects and personal data
- Purposes of processing
- Categories of recipients
- International transfer safeguards
- Retention periods
- Security measures

**D. Data Protection Impact Assessment (DPIA)**

Required for location tracking at scale. Document:
- Necessity and proportionality of processing
- Risks to data subjects
- Mitigation measures

### Current x/pat Status

- GDPRConsent.tsx exists with accept/decline -- GOOD but needs granular controls
- PrivacyPolicyScreen.tsx covers legal bases, service providers, rights -- GOOD
- Data export via Settings -- GOOD
- Account deletion via Settings -- GOOD
- Missing: granular consent toggles, consent version tracking, DPIA documentation

### Implementation Approach

1. **Upgrade GDPRConsent.tsx** to include granular toggles for analytics (PostHog) and error tracking (Sentry)
2. **Add consent version tracking** -- store consent version + timestamp in Supabase
3. **Create DPIA document** for location processing
4. **Add "Withdraw Consent" option** in Settings (currently partially covered by opt-out toggles)
5. **Implement re-consent flow** when privacy policy changes materially

### Compliance Priority: **CRITICAL -- Active enforcement, fines up to 4% global revenue**

---

## 6. CCPA/CPRA Compliance on Android

### 2026 Changes (Effective January 1, 2026)

Major new requirements went into effect:

**A. Applies to x/pat if:**
- Annual revenue exceeds $26,625,000, OR
- Processes PI of 100,000+ California consumers, OR
- Earns 50%+ revenue from selling/sharing PI

x/pat likely falls below these thresholds currently, but should prepare for growth.

**B. Key Requirements Even at Small Scale:**

1. **Privacy policy accessible within the app** -- x/pat has PrivacyPolicyScreen.tsx (COMPLIANT)
2. **Notice at collection** -- GDPRConsent.tsx covers this (COMPLIANT)
3. **"Do Not Sell or Share" option** -- x/pat doesn't sell data, but should add a toggle
4. **Right to delete** -- Account deletion exists (COMPLIANT)
5. **Right to know** -- Data export exists (COMPLIANT)

**C. New 2026 Obligations:**
- Risk assessments for processing that presents significant risk to consumers
- Cybersecurity audit requirements (2027, for qualifying businesses)
- ADMT (Automated Decision-Making Technology) disclosure (2027)
- Notice before collecting data from connected devices

### x/pat-Specific Actions

1. Add "Do Not Sell or Share My Personal Information" link in Settings (even if x/pat doesn't sell data -- affirmative declaration builds trust)
2. Ensure affiliate click tracking doesn't constitute "sharing" under CPRA -- current implementation sends user_id to affiliate_clicks table (internal only, compliant)
3. Monitor revenue/user thresholds as app grows

### Compliance Priority: **MEDIUM -- Prepare now, mandatory at scale**

---

## 7. Brazil LGPD Compliance

### Why It Matters for x/pat

Brazil is a growing digital nomad market. The LGPD applies to any app that processes data of individuals in Brazil or collects data within Brazil.

### Key Requirements

**A. Core Obligations:**
- Appoint a Data Protection Officer (DPO) -- can be the founder initially
- DPO must be able to communicate in Portuguese with ANPD
- Maintain data processing inventory
- Privacy policy must include: controller identity, DPO contact, purposes, data types, legal basis, sharing, international transfers, retention, rights, security measures

**B. Children's Data (ECA Digital, effective March 2026):**
- Age verification mechanisms required
- Privacy by default for minors
- Content moderation for minors

**C. International Data Transfers:**
- Brazil-EU mutual adequacy decision adopted January 2026
- Data transfers to US require Standard Contractual Clauses (SCCs) or equivalent
- Supabase (US), Sentry (US), PostHog (US) all need documented transfer mechanisms

**D. 2026 ANPD Enforcement Priorities:**
- Social media networks and children's data
- Consent and transparency in messaging platforms
- Biometric and high-risk processing

### x/pat-Specific Actions

1. **Add Portuguese translation** of privacy policy (or link to translated web version)
2. **Designate DPO** -- alex@xpat.social is the contact; document this formally
3. **Document SCCs** with Supabase, Sentry, PostHog for Brazil-US transfers
4. **Add age gate** -- critical given ECA Digital enforcement
5. **Update PrivacyPolicyScreen.tsx** to mention LGPD-specific rights alongside GDPR

### Compliance Priority: **HIGH -- Active enforcement in a launch market**

---

## 8. Thailand PDPA Compliance

### Why It Matters for x/pat

Bangkok is a launch city. The PDPA has been fully enforced since June 2022, with active penalties in 2026.

### Key Requirements

**A. Consent and Lawful Basis:**
- Similar to GDPR -- consent, contract, legitimate interest, legal obligation
- Consent must be freely given, specific, informed, and unambiguous
- Written or electronic consent required for sensitive data

**B. Data Protection Officer:**
- Required if core activities involve regular systematic monitoring of data subjects at scale
- Required if processing sensitive data at large scale
- x/pat likely qualifies (location = sensitive data in some interpretations)

**C. Data Subject Rights:**
- Access, rectification, erasure, portability, objection, restriction
- Must respond within 30 days

**D. 2026 Enforcement Trends:**
- PDPC issuing administrative penalties and corrective orders
- Heightened scrutiny of biometric data
- Trust Mark program being formalized
- Proactive monitoring by regulators

**E. Cross-Border Transfers:**
- Adequate protection required at destination country
- Consent or contractual necessity exceptions available
- SCCs or binding corporate rules accepted

### x/pat-Specific Actions

1. **Add Thai language privacy notice** (or link to translated web version)
2. **Ensure consent mechanism works in Thai locale** -- GDPRConsent.tsx text should be translatable
3. **Document PDPA-specific lawful bases** -- location data consent is critical
4. **Register with PDPC** if required for foreign data controllers
5. **Add PDPA reference** in privacy policy alongside GDPR

### Compliance Priority: **HIGH -- Bangkok is a launch city with active enforcement**

---

## 9. Android Location Privacy

### Android 12+ Approximate vs. Precise Location

**System behavior:**
- Apps must declare both `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION` in manifest
- Users see a toggle: "Precise" or "Approximate"
- Approximate = ~3km radius, city-block level
- Users can downgrade from precise to approximate in system settings at any time
- Downgrading triggers app process restart

**x/pat currently uses:**
- `expo-location` plugin with `requestForegroundPermissionsAsync()`
- Location for map display and "nearby spots" features
- Settings has `locationPrecision: 'city' | 'exact'` option

### Implementation Approach

1. **Request approximate location first** for most features (city-level spot discovery)
2. **Only request precise location upgrade** when user taps "Use my exact location" or adds a spot
3. **Handle approximate gracefully** -- map still works at city level, spots within ~3km shown
4. **Handle denial gracefully** -- AddSpotScreen.tsx already has fallback text: "Location permission not granted. Enter city & country above." (GOOD)
5. **Never request background location** -- no current need, and it triggers a separate permission dialog + persistent notification

### Current Status

- ExploreScreen.tsx requests foreground location -- COMPLIANT
- AddSpotScreen.tsx requests foreground location with fallback -- COMPLIANT
- Settings has location precision toggle -- GOOD UX
- No background location usage -- COMPLIANT

### Compliance Priority: **MEDIUM -- Already mostly compliant, refine approximate-first flow**

---

## 10. Android Photo Access

### Android 14+ Selected Photos Permission

**New permission model:**
- `READ_MEDIA_VISUAL_USER_SELECTED` -- lets users grant access to specific photos only
- Users see three options: "Allow all", "Select photos", "Don't allow"
- If user selects specific photos, permission auto-revokes when app goes to background
- Apps in compatibility mode: "Select photos" appears as granted, but only selected photos are accessible

**Android 15 enhancement:**
- `QUERY_ARG_LATEST_SELECTION_ONLY` flag to get only newly selected photos

**Google Play Photo/Video Permissions Policy:**
- Apps should use the system photo picker when possible
- Broad media access (`READ_MEDIA_IMAGES`) requires justification
- Apps that only need users to pick photos should use the photo picker, not request storage permissions

### x/pat Implementation

x/pat uses `expo-image-picker` which wraps the system photo picker. This is the correct approach:
- Photo picker does NOT require any storage permissions
- Users select specific photos to share
- No access to full photo library needed

### x/pat-Specific Actions

1. **Verify expo-image-picker uses system photo picker** on Android 14+ (it does by default)
2. **Do NOT request READ_MEDIA_IMAGES** -- photo picker doesn't need it
3. **Test "Select photos" flow** on Android 14+ devices
4. **Declare in Data Safety**: Photos collected = Yes, but only user-selected photos for spot uploads

### Compliance Priority: **LOW -- expo-image-picker handles this correctly**

---

## 11. Play Store Developer Program Policies 2026

### Key Policy Areas for x/pat

**A. Developer Verification (September 2026):**
- Starting September 2026, only apps from verified developers can be installed on certified Android devices in Brazil, Indonesia, Singapore, and Thailand
- x/pat must complete developer identity verification in Play Console
- Affects two launch markets: Brazil and Thailand

**B. Child Safety Standards (January 2026):**
- Social apps must prohibit CSAE content
- Must have in-app reporting mechanisms
- Must have explicit content policies viewable by users

**C. Data Safety Compliance:**
- Declarations must match actual app behavior
- Google audits and can take enforcement action for discrepancies
- Must update when app behavior changes

**D. SDK Compliance:**
- Third-party SDK behavior must fall within declared data use
- Sentry, PostHog, expo-location all need accurate disclosure

**E. Permission Justification:**
- Play Console requires justification for sensitive permissions (location, camera)
- Must explain why the permission is needed and what happens if denied

### x/pat-Specific Actions

1. **Complete developer verification** -- Aych Holdings LLC identity verification
2. **Add in-app content reporting** for user-generated spots, posts, comments
3. **Add community guidelines** visible before users post content
4. **Document SDK data practices** for Sentry, PostHog
5. **Prepare permission justification text** for Play Console submission

### Compliance Priority: **CRITICAL -- Blocks Play Store listing**

---

## 12. Play Store Content Moderation Requirements

### Requirements for Social Apps with UGC

All apps hosting UGC must implement "robust, effective, and ongoing moderation." Effective March 4, 2026:

**Required features:**
1. In-app reporting system for objectionable content AND users
2. In-app user blocking functionality
3. Community guidelines visible before users engage with UGC
4. Action on reported content (review + removal workflow)
5. For 1:1 interaction (DMs): blocking functionality
6. For public content (spots, posts): report + block functionality

**Apps will be removed if:**
- Primary purpose becomes hosting objectionable content
- Reputation develops as a place where such content thrives
- UGC lacks safeguards against threats/harassment, especially toward minors

### x/pat-Specific Actions

1. **Add "Report" button** on spots, posts, comments, and user profiles
2. **Add "Block User" functionality** for DMs and public profiles
3. **Create Community Guidelines screen** shown during onboarding or before first post
4. **Build moderation queue** (even if manual review by founder initially)
5. **Add content reporting categories**: spam, harassment, inappropriate, misinformation, other
6. **Log all reports** with timestamps for audit trail

### Compliance Priority: **CRITICAL -- Required for social apps, enforced March 2026**

---

## 13. Play Store Families Policy

### Does x/pat Need to Comply?

The Families Policy applies to apps that:
- Are designed for children (target audience includes under-13)
- Are in the "Designed for Families" program

**x/pat's situation:**
- x/pat is a social travel app for adult digital nomads
- Target audience is 18+ (or at minimum 13+)
- NOT designed for children
- Should NOT opt into the Families program

### However: Age Gate Required

Even without joining Families, Google Play requires:
- Apps must accurately declare their target age group in Play Console
- Social apps accessible to users under 18 must comply with Child Safety Standards
- Starting January 2026, some US states require age verification (Texas, Utah, Louisiana)

### x/pat-Specific Actions

1. **Declare target age group as 18+** in Play Console
2. **Add age verification at signup** -- minimum: date-of-birth entry with 18+ requirement
3. **Add to Terms of Service**: "You must be at least 18 years old to use x/pat"
4. **Do NOT opt into Families program** -- not applicable
5. **Consider Google's Age Signals API** for US state compliance if/when user base grows there

### Compliance Priority: **HIGH -- Age gate needed before launch**

---

## 14. COPPA Compliance on Android

### Requirements

COPPA (Children's Online Privacy Protection Act) applies to apps that:
- Are directed at children under 13, OR
- Have actual knowledge of collecting data from children under 13

### x/pat Impact

x/pat is NOT directed at children and should actively prevent under-13 (and under-18) usage.

**Google Play enforcement context:**
- Google paid $8.25M in January 2026 to settle a class action over children's data collection
- COPPA is actively enforced with real financial consequences

### x/pat-Specific Actions

1. **Implement age gate** at registration (date of birth, reject under 18)
2. **Do NOT collect data from known minors** -- if a user is discovered to be under 13, delete their data
3. **Declare in Play Console** that app is not directed at children
4. **PostHog/Sentry**: ensure these SDKs are not configured in a way that collects data from known children
5. **Document COPPA compliance** in privacy policy: "x/pat is not intended for children under 18"

### Compliance Priority: **HIGH -- Implement age gate before launch**

---

## 15. Digital Services Act (EU)

### Applicability to x/pat

The DSA applies to all online platforms offering services in the EU, including social apps. Since February 2024, it applies to most platforms except micro/small enterprises.

**Micro/small enterprise exemption:**
- Fewer than 50 employees AND annual turnover/balance sheet under EUR 10M
- x/pat qualifies for this exemption currently

**However, basic obligations still apply:**

### Basic DSA Obligations (All Platforms)

1. **Transparency reporting** -- publish annual reports on content moderation
2. **Illegal content mechanisms** -- provide easy ways for users to flag illegal content
3. **Clear terms of service** -- explain content moderation policies
4. **Point of contact** -- designated contact for EU authorities and users
5. **Trader information** (if applicable) -- not applicable for x/pat (not a marketplace)

### EU Trader Contact Requirements (App Stores)

Apple App Store already requires DSA trader information for EU distribution. Google Play likely follows the same requirement:
- Business address
- Phone number
- Email address

### x/pat-Specific Actions

1. **Add content flagging mechanism** -- aligns with Play Store UGC requirements
2. **Add EU contact information** to Settings or About screen
3. **Prepare annual transparency report template** (even if minimal)
4. **Update Terms of Service** to describe content moderation approach
5. **Monitor growth** -- additional obligations kick in at 45M monthly EU users (VLOP threshold)

### Compliance Priority: **MEDIUM -- Exemption applies now, but basic obligations overlap with Play Store requirements**

---

## 16. Android Data Deletion Requirements

### Google Play Policy

If an app allows account creation, it MUST:
1. Allow users to request account deletion from within the app
2. Provide a web link where users can request account deletion and data deletion
3. Delete user data associated with the account upon request
4. Deleting an account must be as easy as creating one

**Exceptions for data retention:**
- Security, fraud prevention
- Regulatory compliance (e.g., financial records)
- Must disclose any retained data clearly

### x/pat Current Status: MOSTLY COMPLIANT

- SettingsScreen.tsx has "Delete Account" with clear messaging
- Uses `supabase.rpc('delete_user_account')` for server-side deletion
- States 7-day grace period with cancellation option
- Lists what gets deleted: profile, spots, posts, messages

### Gaps to Address

1. **Web-based deletion page** -- Play Store requires a web URL for deletion, not just in-app
2. **Confirmation email** -- send deletion confirmation email
3. **Data Safety form** -- declare "Data can be deleted" = Yes
4. **Ensure cascade deletion** covers: spots, posts, comments, DMs, connections, travel plans, saved spots, check-ins, events, RSVPs, feedback, preferences, affiliate clicks, push tokens, uploaded photos (Supabase Storage)

### x/pat-Specific Actions

1. **Create web deletion page** at xpat.social/delete-account
2. **Audit delete_user_account RPC** to ensure ALL user data tables are covered
3. **Add Supabase Storage cleanup** -- delete uploaded photos on account deletion
4. **Update Data Safety form** with deletion URL

### Compliance Priority: **HIGH -- Blocks Play Store submission if web deletion URL missing**

---

## 17. Android Data Export/Portability

### GDPR Article 20 Requirements

Users have the right to receive their personal data in a "structured, commonly used, and machine-readable format."

**Acceptable formats:** JSON, CSV, XML
**Timeline:** Within 30 days of request (typically immediate for automated systems)
**Scope:** Data provided by the user + data generated from their activity (NOT inferred/derived data)
**Cost:** Free for initial request

### x/pat Current Status: COMPLIANT

SettingsScreen.tsx `handleExportData()` already exports:
- Profile data
- Spots
- Posts
- Direct messages
- Comments
- Connections
- Travel plans
- Saved spots
- Check-ins
- Event RSVPs
- Events
- Beta feedback
- User preferences

Export format: JSON (machine-readable, structured) via Share sheet.

### Improvements

1. **Add export timestamp** and x/pat version to export metadata
2. **Add data dictionary** -- brief description of each field
3. **Consider adding photo URLs** to export (or actual photo files as ZIP)
4. **Log export requests** for audit trail
5. **Add LGPD/PDPA portability reference** alongside GDPR in Settings sublabel

### Compliance Priority: **LOW -- Already implemented, minor polish needed**

---

## 18. Play Store Affiliate Disclosure Requirements

### Google Play Policy

- Apps must accurately disclose monetization methods
- In-app disclosures required when data access/collection is beyond reasonable user expectation
- Data Safety form must reflect affiliate tracking

### FTC Requirements (US)

FTC endorsement guidelines require:
- Clear disclosure when affiliate relationships exist
- Disclosure must be "unavoidable" -- near the affiliate link/recommendation
- Disclosure must be in plain language
- Penalties up to $51,744 per violation in 2026

### x/pat Current Implementation

- AffiliateCard.tsx displays affiliate partner content
- affiliateTracking.ts tracks clicks with user_id, partner_id, placement, city/country context
- PrivacyPolicyScreen.tsx mentions: "Affiliate partners may receive anonymized click data"
- Current state: affiliate links are "Coming Soon" (non-clickable)

### x/pat-Specific Actions

1. **Add disclosure label** on AffiliateCard: "Affiliate -- x/pat may earn a commission" or similar
2. **Add affiliate disclosure section** to Terms of Service
3. **Update Data Safety form** to include affiliate click tracking
4. **When links go live**: ensure each affiliate card has visible disclosure text
5. **Do NOT auto-enroll users** in affiliate tracking -- ensure it's opt-in or clearly disclosed
6. **PrivacyPolicyScreen.tsx**: expand affiliate section to specify what "anonymized click data" means

### Compliance Priority: **MEDIUM -- Required before activating affiliate links**

---

## 19. Android App Permission Best Practices

### Core Principles

1. **Request only what you need** -- minimum necessary permissions
2. **Request at time of use** (just-in-time) -- not at app launch
3. **Provide rationale** before system dialog appears
4. **Handle denial gracefully** -- app must remain functional
5. **Handle "Don't ask again"** -- guide users to Settings

### x/pat Permission Inventory

| Permission | When Requested | Rationale Shown | Denial Handled |
|-----------|---------------|-----------------|----------------|
| Location (foreground) | Map screen | Yes (GDPR dialog) | Yes (manual city entry) |
| Camera | Add spot photo | Implicit (user taps camera) | Needs testing |
| Photo library | Add spot photo | Implicit (user taps gallery) | Needs testing |
| Push notifications | After onboarding | Yes (notification consent) | Yes (works without) |

### Implementation Best Practices

1. **Never request all permissions at once** -- x/pat correctly uses just-in-time requests
2. **Show custom rationale** before system dialog: "x/pat needs your location to show nearby spots"
3. **After permanent denial**: show in-app message with "Open Settings" button
4. **Test all denial paths** on Android 12, 13, 14, 15, 16
5. **For camera/gallery**: expo-image-picker handles permission flow, but test edge cases

### x/pat-Specific Actions

1. **Add "Open Settings" flow** for permanently denied permissions
2. **Test camera permission denial** path on all target Android versions
3. **Document permission rationale strings** for Play Console submission
4. **Ensure location permission request shows rationale** (shouldShowRequestPermissionRationale check)

### Compliance Priority: **MEDIUM -- Mostly compliant, test edge cases**

---

## 20. Google Play Protect

### What Triggers Warnings

Google Play Protect scans apps for malware patterns. Common false positive triggers:

1. **Excessive permission requests** -- requesting permissions you don't use
2. **Accessibility service misuse** -- declaring `isAccessibilityTool="true"` when not an accessibility tool
3. **Unfamiliar signing keys** -- new developer accounts with no history
4. **Dynamic code loading** -- loading code at runtime from external sources
5. **Obfuscated code** -- heavy obfuscation can look suspicious
6. **Background data transmission** -- sending data when user isn't actively using app
7. **Sensitive permission patterns** -- combinations that look like spyware (SMS + location + contacts)

### x/pat Risk Assessment: LOW

x/pat:
- Uses standard Expo/React Native build (not obfuscated suspiciously)
- Requests only necessary permissions (location, camera, photos, notifications)
- Does not use accessibility services
- Does not load dynamic code
- Does not access SMS, call logs, or contacts
- Signed with Expo EAS build service (established signing infrastructure)

### x/pat-Specific Actions

1. **Remove any unused permission declarations** from AndroidManifest
2. **Ensure no unused SDK permissions** leak through dependencies
3. **Test with Google Play Protect** on real device before submission
4. **If flagged**: submit appeal through Play Console with explanation

### Compliance Priority: **LOW -- Standard Expo app, low risk**

---

## 21. Android Security Metadata

### targetSdkVersion Requirements (2026)

**Current Google Play requirements:**
- New apps and updates: Must target **Android 15 (API 35)** or higher
- Existing apps: Must target **Android 14 (API 34)** or higher to remain available to new users on devices running newer Android versions

**On-device installation:**
- Android 14+ devices: Apps targeting below API 24 fail to install
- Android 16 did NOT increment the minimum (still API 24)

### x/pat Implementation

Expo SDK manages targetSdkVersion through the build configuration. EAS Build will target the required API level.

### x/pat-Specific Actions

1. **Verify EAS build targets API 35** -- check build logs or `expo prebuild` output
2. **Update Expo SDK** if needed to support API 35 targeting
3. **Test on Android 15 device/emulator** for behavioral changes (predictive back, foreground service restrictions)
4. **Monitor Google Play deadlines** -- typically August 31 deadline for annual updates

### Compliance Priority: **HIGH -- Blocks Play Store updates if not met**

---

## 22. Play Store Intellectual Property Policies

### Core Policy (Effective March 4, 2026)

Google does not allow apps that infringe on trademarks, copyrights, patents, trade secrets, or other proprietary rights.

### x/pat Trademark Considerations

1. **App name "x/pat"** -- unique, unlikely to conflict, but verify no existing trademarks
2. **"Expat" is generic** -- cannot be trademarked by others for travel apps
3. **City names in spot data** -- factual use, not trademark concern
4. **Affiliate partner logos/names** -- must have permission to display
5. **Map data** -- Google Maps (Android) has its own attribution requirements

### x/pat-Specific Actions

1. **Search USPTO/EUIPO** for "xpat" and "x/pat" trademarks in travel/social categories
2. **File trademark application** for "x/pat" if not already done
3. **Ensure Google Maps attribution** is displayed per Google's requirements
4. **Get written permission** to use affiliate partner logos/names before displaying
5. **Add copyright notice** in app: "Copyright 2026 Aych Holdings LLC"

### Compliance Priority: **MEDIUM -- Trademark search before launch**

---

## 23. Android App Transparency

### What Google Expects

Google Play's transparency requirements encompass:

1. **Data Safety section** (covered in #1) -- accurate declaration of data practices
2. **Prominent disclosure** -- in-app notification before collecting data beyond user expectations
3. **Privacy policy** -- accessible both on Play Store listing and within app
4. **SDK transparency** -- developers responsible for SDK behavior

### Prominent Disclosure Requirements

A prominent disclosure is needed when:
- Personal/sensitive data collection is beyond reasonable user expectation
- The disclosure must be a standalone notice (not buried in ToS)
- Must use affirmative consent (not pre-checked boxes)

### x/pat Transparency Audit

| Feature | Transparent? | Notes |
|---------|-------------|-------|
| Location collection | Yes | GDPR dialog + system permission |
| Photo access | Yes | System permission dialog |
| Analytics (PostHog) | Partially | Mentioned in privacy policy but no in-app toggle |
| Error tracking (Sentry) | Partially | Mentioned in privacy policy but no in-app toggle |
| Affiliate click tracking | Partially | Mentioned in privacy policy, no prominent disclosure |
| Push notification tokens | Yes | System permission dialog |

### x/pat-Specific Actions

1. **Add analytics opt-out toggle** in Settings (PostHog opt-out exists in code: `optOutPostHog`)
2. **Add Sentry opt-out toggle** in Settings (Sentry can be configured to not send user context)
3. **Make affiliate tracking transparent** -- disclosure near affiliate cards
4. **Ensure all SDKs are declared** in Data Safety form

### Compliance Priority: **MEDIUM -- Partial compliance, needs analytics toggles**

---

## 24. Terms of Service and Privacy Policy Display

### Google Play Requirements

1. **Play Store listing**: Must link to privacy policy URL
2. **Within app**: Must provide access to privacy policy
3. **If targeting children**: Privacy policy required regardless of permissions
4. **Content**: Must cover data collection, use, sharing, third parties, user rights
5. **Active URL**: Must be accessible and not broken
6. **App-specific**: Must apply to the specific app, not a generic corporate policy

### CCPA 2026 Addition

Privacy policy must be directly accessible within the app (e.g., via settings menu link).

### x/pat Current Status: MOSTLY COMPLIANT

- PrivacyPolicyScreen.tsx -- comprehensive, in-app (GOOD)
- TermsOfServiceScreen.tsx -- exists in-app (GOOD)
- GDPRConsent.tsx links to xpat.social/privacy-policy and xpat.social/terms-of-service (GOOD)
- Settings screen has links to both (NEEDS VERIFICATION)

### Gaps

1. **Web versions** -- xpat.social/privacy-policy and xpat.social/terms-of-service must be live, accessible URLs
2. **Play Store listing** -- must add privacy policy URL in Play Console
3. **Last updated date** -- PrivacyPolicyScreen shows "March 2026" (GOOD, keep current)
4. **Version tracking** -- add version number to policy for consent tracking

### x/pat-Specific Actions

1. **Publish privacy policy** at xpat.social/privacy-policy (web page)
2. **Publish terms of service** at xpat.social/terms-of-service (web page)
3. **Add privacy policy URL** to Play Console store listing
4. **Add policy version number** (e.g., "v2.0 -- March 2026")
5. **Ensure Settings screen** links to both PrivacyPolicyScreen and TermsOfServiceScreen

### Compliance Priority: **HIGH -- Web URLs required for Play Store listing**

---

## 25. Android Consent Management Platforms

### Options Evaluated

| Platform | Price | Mobile SDK | Best For |
|----------|-------|-----------|----------|
| **OneTrust** | $10,000+/yr (2026 minimum) | Android + iOS | Enterprise, complex compliance |
| **Cookiebot** | $12-65/mo | Web-focused, limited mobile | Small websites, not ideal for native apps |
| **Usercentrics** | $50-500/mo | Android + iOS | Mid-market, good mobile support |
| **iubenda** | $29-99/yr | Android + iOS plugins | Startups, affordable |
| **Custom (recommended)** | Dev time only | Full control | Early-stage apps with simple data flows |

### Recommendation for x/pat: CUSTOM IMPLEMENTATION

x/pat's consent needs are straightforward:
- No cookies (native app)
- No ad tracking
- Simple consent categories: location, analytics, error tracking, notifications
- GDPRConsent.tsx already exists as foundation

**Why custom beats a CMP:**
- No SDK overhead or dependency
- Full control over UX (Mercury-style dark mode aesthetic)
- x/pat's data flows are simple -- 3 service providers, no ad networks
- OneTrust at $10K/yr is overkill for a startup
- Cookiebot is web-focused, poor native mobile experience

### Custom Implementation Approach

1. **Consent categories** in GDPRConsent.tsx:
   - Essential (always on): authentication, app functionality
   - Analytics (toggleable): PostHog
   - Error Tracking (toggleable): Sentry user context
   - Location (system-managed): OS permission dialog
   - Notifications (system-managed): OS permission dialog

2. **Consent storage**: Supabase table `user_consent_records`:
   - user_id, consent_version, category, granted, timestamp, policy_text_hash

3. **Consent version tracking**: increment version when privacy policy changes materially

4. **Re-consent flow**: check stored consent version vs. current; show consent dialog if outdated

### Compliance Priority: **HIGH -- GDPR requires granular consent management**

---

## 26. Priority Matrix & Implementation Roadmap

### CRITICAL (Must complete before Play Store submission)

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 1 | Data Safety form | 2 hours | Complete Play Console Data Safety section |
| 11 | Developer verification | 1 hour | Verify Aych Holdings LLC identity |
| 12 | Content reporting/blocking | 2-3 days | Add report + block on spots, posts, profiles, DMs |
| 24 | Web privacy policy + ToS | 1 day | Publish at xpat.social/privacy-policy and /terms-of-service |
| 5 | GDPR granular consent | 2 days | Upgrade GDPRConsent.tsx with category toggles |

### HIGH (Complete before or shortly after launch)

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 13 | Age gate (18+) | 0.5 day | Date-of-birth check at registration |
| 14 | COPPA declaration | 0.5 day | Declare not-for-children in Play Console + privacy policy |
| 7 | LGPD basics | 1 day | Portuguese privacy notice, DPO designation |
| 8 | PDPA basics | 1 day | Thai privacy notice, PDPA legal basis documentation |
| 16 | Web deletion page | 0.5 day | xpat.social/delete-account web page |
| 21 | targetSdkVersion | 0.5 day | Verify API 35 targeting in EAS build |
| 25 | Consent version tracking | 1 day | Supabase consent_records table + re-consent flow |

### MEDIUM (Complete within 30 days of launch)

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 6 | CCPA "Do Not Sell" toggle | 0.5 day | Add to Settings even if not selling data |
| 9 | Approximate-first location | 1 day | Refine to request approximate first, precise on demand |
| 18 | Affiliate disclosure labels | 0.5 day | Add "Affiliate" label to AffiliateCard |
| 19 | Permission denial flows | 1 day | "Open Settings" for permanent denials |
| 22 | Trademark search | 0.5 day | USPTO/EUIPO search for "x/pat" |
| 23 | Analytics opt-out toggles | 0.5 day | Wire up PostHog/Sentry toggles in Settings |

### LOW (Ongoing / Monitor)

| # | Item | Effort | Description |
|---|------|--------|-------------|
| 2 | Privacy indicators | None | System-managed, test UX |
| 3 | Privacy Sandbox | None | Deprecated, no action |
| 4 | Advertising ID | None | Not used, no action |
| 10 | Photo access | None | expo-image-picker handles correctly |
| 15 | DSA | Monitor | Micro enterprise exemption applies |
| 17 | Data export | 0.5 day | Polish existing export with metadata |
| 20 | Play Protect | None | Standard Expo app, low risk |

### Total Estimated Effort

- **Critical items**: ~6 days
- **High items**: ~5 days
- **Medium items**: ~4 days
- **Low items**: ~1 day
- **Grand total**: ~16 development days

### Key Deadlines

| Deadline | Requirement |
|----------|------------|
| Before Play Store submission | Data Safety form, developer verification, content moderation, privacy policy URL |
| January 1, 2026 (PAST) | CCPA 2026 amendments in effect |
| March 4, 2026 (PAST) | Google Play UGC moderation policy effective |
| March 2026 (PAST) | Brazil ECA Digital (children's digital statute) effective |
| September 2026 | Developer verification required for Brazil, Thailand app installs |
| January 1, 2027 | CCPA ADMT disclosure requirements |
| April 1, 2028 | CCPA risk assessment attestation |

---

## Sources

- [Google Play Data Safety Section Guide](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Privacy Sandbox Retirement](https://privacysandbox.google.com/blog/update-on-plans-for-privacy-sandbox-technologies)
- [GAID Deprecation Overview](https://www.appsflyer.com/blog/mobile-marketing/gaid-deprecation/)
- [Google Play Developer Program Policy](https://support.google.com/googleplay/android-developer/answer/16944162?hl=en)
- [Android 14 Partial Photo Access](https://developer.android.com/about/versions/14/changes/partial-photo-video-access)
- [GDPR Mobile App Compliance 2026](https://secureprivacy.ai/blog/gdpr-compliance-mobile-apps)
- [GDPR Consent Management 2026](https://secureprivacy.ai/blog/gdpr-consent-management)
- [CCPA 2026 Amendments](https://pandectes.io/blog/ccpa-in-2026-new-requirements-and-compliance-impacts/)
- [CCPA 2026 Statute](https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf)
- [Brazil LGPD Data Protection Report 2025-2026](https://iclg.com/practice-areas/data-protection-laws-and-regulations/brazil)
- [Brazil LGPD Compliance Checklist 2026](https://captaincompliance.com/education/lgpd-compliance-checklist/)
- [Thailand PDPA Compliance Guide 2026](https://www.securityscientist.net/blog/how-to-comply-with-pdpa-thailand-complete-guide-2026/)
- [Thailand PDPA Enforcement 2026](https://www.pimlegal.com/2026/02/03/pdpa-enforcement-in-thailand-what-every-business-must-know-in-2026/)
- [Android Location Permissions](https://developer.android.com/develop/sensors-and-location/location/permissions)
- [Google Play UGC Moderation Requirements](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en)
- [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
- [Age Verification Laws 2026](https://median.co/blog/new-age-verification-laws-2026)
- [Digital Services Act](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act)
- [Google Play Account Deletion Requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [GDPR Article 20 Data Portability](https://gdprinfo.eu/gdpr-article-20-explained-understanding-the-right-to-data-portability-with-5-practical-examples)
- [FTC Affiliate Disclosure Rules 2026](https://www.referralcandy.com/blog/ftc-affiliate-disclosure)
- [Android Permission Best Practices](https://developer.android.com/training/permissions/usage-notes)
- [Google Play Protect Developer Guidance](https://developers.google.com/android/play-protect/warning-dev-guidance)
- [Android targetSdkVersion Requirements](https://developer.android.com/google/play/requirements/target-sdk)
- [Google Play Intellectual Property Policy](https://support.google.com/googleplay/android-developer/answer/9888072?hl=en)
- [Google Play Privacy Policy Requirements](https://termly.io/resources/articles/android-privacy-policy/)
- [Android 16 Location Privacy Indicator](https://www.androidpolice.com/android-16-status-bar-location-ping/)
- [OneTrust Mobile App Consent](https://www.onetrust.com/products/mobile-app-consent/)
- [Google Play Developer Policy Changes 2026](https://openforge.io/google-play-developer-policy-changes-that-matter-in-2026/)
- [Google Play Publishing Requirements 2026](https://aerious.uk/blog/google-play-publishing-requirements-2026-complete-compliance-checklist)
