# Global Regulatory & Compliance Research Report
## x/pat -- Digital Nomad Social Travel App
**Prepared:** April 2026 | **Author:** Regulatory & Compliance Researcher, VP Market Intelligence
**Scope:** App Store Compliance, Data Privacy (GDPR/LGPD/PDPA/LFPDPPP/CCPA), Content Moderation, Location Data, Terms of Service, Affiliate Marketing

> **App Profile:** Free social travel app (React Native/Expo SDK 55), collects email, name, location, photos, user-generated content, chat messages. Launches in Bangkok (Thailand), Lisbon (Portugal/EU), Mexico City (Mexico). US-based entity (Aych Holdings LLC). Supabase backend (US-hosted). 13+ age gate implemented. Affiliate-only revenue model (currently "Coming Soon" placeholders).

---

## Table of Contents

1. [App Store Compliance 2026](#1-app-store-compliance-2026)
2. [Data Privacy Regulations by Region](#2-data-privacy-regulations-by-region)
3. [Content Moderation Legal Requirements](#3-content-moderation-legal-requirements)
4. [Location Data Regulations](#4-location-data-regulations)
5. [Terms of Service and Privacy Policy](#5-terms-of-service-and-privacy-policy)
6. [Affiliate Marketing Compliance](#6-affiliate-marketing-compliance)
7. [Compliance Checklist](#7-compliance-checklist)
8. [Risk Assessment Matrix](#8-risk-assessment-matrix)
9. [Action Items by Priority](#9-action-items-by-priority)
10. [Sources](#10-sources)

---

# 1. App Store Compliance 2026

## 1.1 Apple App Store Review Guidelines (2025-2026 Changes)

### Age Ratings Overhaul (July 2025)
Apple introduced new age rating tiers: **13+, 16+, and 18+**. All developers were required to complete the updated age rating questionnaire by January 31, 2026. x/pat already has a 13+ age gate, but the questionnaire must reflect user-generated content, chat functionality, and location sharing. With UGC and unmoderated chat, Apple may require a **17+ rating** depending on how content moderation is described in the questionnaire.

**Action:** Re-verify the age rating questionnaire answers in App Store Connect. Apps with user-generated content and direct messaging typically land at 17+ unless robust moderation is documented.

### Creator and Social Apps (Guideline 1.2.1)
As of 2025, creator apps must provide a mechanism for users to **identify content that exceeds the app's age rating** and use an **age restriction mechanism based on verified or declared age** to limit access by underage users. This directly applies to x/pat as a social app with UGC.

**Action:** Ensure the report modal flags content that may exceed age rating. The existing 13+ age gate satisfies the "declared age" mechanism, but the app should restrict access to flagged mature content for users who declared age 13-16.

### AI Data Sharing (Guideline 5.1.2(i) -- November 2025)
Apple now requires that apps sharing personal data with **third-party AI services** must: (a) clearly disclose the AI provider by name, (b) specify data types shared, and (c) obtain explicit user consent via a modal before any data transmission. Generic privacy policy language is insufficient. On-device AI using Core ML is exempt.

**Relevance for x/pat:** If Claude API is used for any user-facing feature that processes personal data (e.g., content moderation, recommendations), this guideline applies. The consent modal must appear before the first data transmission.

### Placeholder Content Rejection (Guideline 2.1)
Apple rejects apps with placeholder text, empty websites, non-functional URLs, or "Coming Soon" features. This is classified under **Guideline 2.1 (App Completeness)**, not Guideline 4.2 as sometimes cited. Submissions must be "final versions with all necessary metadata and fully functional URLs."

**Critical for x/pat:** The "Coming Soon" affiliate placeholders are a **high-probability rejection trigger**. Apple reviewers actively flag non-functional features. These must be removed entirely or replaced with functional content before submission.

### Account Deletion (Enforced Since June 2022)
Apps supporting account creation must include an in-app option to **initiate account deletion** of the account and associated data. Apple expects deletion to be "easy and without delay." x/pat already has a `delete_user_account()` RPC with 7-day grace period -- this is acceptable as long as the in-app flow is intuitive and prominently placed in settings.

### Privacy Nutrition Labels
Apple requires developers to declare all data collection practices via the App Privacy Details section. For a social app like x/pat, the following categories must be disclosed:

- **Contact Info:** Email, name
- **Location:** Precise location (for spot discovery and check-ins)
- **User Content:** Photos, other user-generated content
- **Identifiers:** User ID
- **Usage Data:** Product interaction, crash data
- **Diagnostics:** Crash data (Sentry), performance data

Each must specify whether it is used for **tracking**, **app functionality**, **analytics**, or **developer advertising**. Third-party SDKs (PostHog, Sentry, Expo) contribute to this -- review each SDK's data practices.

### SDK Requirement (April 28, 2026)
Apps uploaded to App Store Connect must be built with **iOS & iPadOS 26 SDK** or later starting April 28, 2026. Ensure Expo SDK 55 produces builds compliant with this requirement or plan an upgrade.

## 1.2 Google Play Store Policy Updates (2025-2026)

### Data Safety Section
Every app on Google Play must declare data collection, protection, and handling practices. x/pat must complete this for: email, name, precise location, photos, user content, device identifiers, crash logs, and analytics data.

### Child Safety Standards Policy (Mandatory for Social Apps)
Google Play requires all social and dating apps to **self-certify compliance with the Child Safety Standards Policy** on Play Console before publishing. This includes:
- Self-certifying compliance with applicable child safety laws
- Having a process to **report confirmed CSAM to NCMEC**
- Providing a **designated point of contact** for Google to notify about child safety issues

**Action:** Complete the Child Safety Standards self-certification on Play Console before submission. Establish a CSAM reporting process (see Section 3).

### Age-Restricted Content Policy (October 2025)
Apps with matchmaking, dating, or social features must use **Play Console features to block minors**. Starting January 1, 2026, the **Age Signals API** data may only be used to provide age-appropriate experiences.

### AI-Generated Content Policy
Google Play requires developers to **clearly inform users when content is AI-generated** (chat responses, writing tools, AI avatars, generative media). Apps must include **reliable AI content moderation** to prevent harmful or misleading results.

**Relevance:** If x/pat uses any AI features (Claude-powered moderation, content suggestions), these must be disclosed and the AI outputs must be moderated.

### Verified Developer Requirement (2026)
Google is moving toward **mandatory developer verification** for all Android app installations. Ensure Aych Holdings LLC is fully verified on Play Console.

---

# 2. Data Privacy Regulations by Region

## 2.1 GDPR (EU/EEA -- Portugal/Lisbon)

GDPR applies to x/pat via Article 3 extraterritorial scope. As a US company offering services to EU residents, x/pat is the **data controller**; Supabase is the **data processor**.

### Key Requirements
- **Record of Processing Activities (RoPA):** Document every data category, purpose, legal basis, retention period, and recipients
- **Data Processing Agreements (DPAs):** Required with Supabase, Sentry, PostHog, Expo/EAS, and any other vendor touching personal data
- **Lawful Basis per Processing Activity:**
  - Account creation/profiles: Contract performance (Art. 6(1)(b))
  - Precise location: **Explicit consent** (Art. 6(1)(a)) -- location is sensitive
  - Push notifications: Consent
  - Crash analytics (anonymized): Legitimate interest (requires LIA)
  - Chat messages: Contract performance
- **Consent Management:** Granular, opt-in, independently toggleable, documented with timestamps. Pre-ticked boxes are prohibited
- **Data Subject Rights:** Access, rectification, erasure ("right to be forgotten"), portability (Art. 20), restriction, objection
- **Data Protection by Design and Default:** Collect only what is needed; default to privacy-preserving settings
- **EDPB 2026 Enforcement Focus:** Transparency obligations (Articles 12-14) -- privacy notices are under active regulatory scrutiny

### Risk Level: HIGH
Fines up to 20 million EUR or 4% of global annual turnover. Portugal's CNPD is an active regulator. In 2025, 530 million EUR was issued to TikTok, 290 million EUR to Uber.

### Data Transfer Mechanism
Supabase is US-hosted. Transfers of EU personal data to the US require a valid transfer mechanism. The **EU-US Data Privacy Framework** (DPF) currently provides adequacy, but verify Supabase's DPF certification status. If DPF lapses, Standard Contractual Clauses (SCCs) are the fallback.

## 2.2 LGPD (Brazil)

Brazil's ANPD became a fully independent regulatory agency in February 2026, significantly increasing enforcement capacity.

### Key Requirements
- **Consent:** Must be opt-in; users must be able to withdraw at any time
- **Legal Bases:** Similar to GDPR -- consent, legitimate interest, contract performance, legal obligation
- **Children's Data:** Brazil's **Digital Statute for Children and Adolescents** (ECA Digital, Law No. 15.211/2025, effective March 2026) creates additional rules for protecting minors on social networks, requiring age verification mechanisms and content moderation for minors
- **ANPD 2026-2027 Priorities:** Data subject rights (especially sensitive data for advertising), protection of children and adolescents (age verification, privacy by default)
- **Data Subject Rights (ARCO):** Access, rectification, cancellation (deletion), objection

### Risk Level: MEDIUM
Growing enforcement. Brazilian digital nomads using x/pat trigger LGPD obligations. The ANPD has active supervisory actions against social media networks.

## 2.3 PDPA (Thailand -- Bangkok)

Thailand's PDPA enforcement has intensified since 2025, with THB 21.5M in fines issued in August 2025 alone.

### Key Requirements
- **Consent:** Must be explicit, granular, and logged
- **Legal Bases:** Consent, legitimate interest, contract performance, vital interest, legal obligation, public interest
- **Data Protection Officer:** Required if core activities involve large-scale monitoring of individuals or large-scale processing of sensitive data
- **Cross-Border Transfer:** Adequate protection level required; recipient country must have comparable standards or binding corporate rules/contractual safeguards
- **Data Breach Notification:** Notify the Personal Data Protection Committee within 72 hours of becoming aware; notify data subjects if high risk
- **Sensitive Data:** Biometric data, health data, location data may qualify as sensitive under certain interpretations -- treat location consent as requiring explicit opt-in

### Risk Level: HIGH
Active enforcement. The November 2025 iris scanning case (THB fine + data deletion order for 1.2 million users' data) demonstrates willingness to issue severe corrective orders.

## 2.4 LFPDPPP (Mexico -- CDMX)

Mexico enacted a **completely new LFPDPPP** on March 20, 2025, replacing the 2010 framework.

### Key Requirements
- **Principles:** Data minimization, purpose limitation, proactive accountability
- **Scope Expansion:** Now expressly includes data processors (not just controllers)
- **Data Subject Rights (ARCO):** Access, rectification, cancellation, objection -- now extended to automated decision-making processes
- **Sensitive Data:** Health, biometric, racial origin, religious beliefs, political opinions require **express written consent**
- **Privacy Notice (Aviso de Privacidad):** Mandatory; must describe data collected, purposes, legal basis, rights, transfers
- **Regulatory Authority:** Enforcement transferred to the Secretariat of Anti-Corruption and Good Governance (SABG)

### Risk Level: MEDIUM
Implementing regulations not yet published as of early 2026. SABG initiated stakeholder dialogues in January 2026. Compliance requirements are clear from the statute even without implementing regulations.

## 2.5 CCPA/CPRA (California -- US Users)

As of January 1, 2026, CCPA enters a new enforcement phase with expanded obligations.

### Key Requirements
- **Sensitive Personal Information:** Precise geolocation is classified as SPI under CPRA. Businesses must disclose SPI collection and allow consumers to **limit its use**
- **New 2026 Obligations:** Risk assessments for automated decision-making technology (ADMT), cybersecurity audits for covered businesses
- **Consumer Rights:** Right to know, delete, correct, opt-out of sale/sharing, limit use of SPI
- **"Do Not Sell or Share My Personal Information"** link required
- **Notice at Collection:** Required particularly when collecting SPI or data from connected devices/mobile apps
- **Privacy Risk Assessments:** For covered processing activities beginning before January 1, 2026, assessments must be completed by December 31, 2027

### Risk Level: HIGH
California AG and CPPA are active enforcers. Location data is a top enforcement target.

### Threshold Note
CCPA applies to for-profit businesses that: (a) have gross annual revenue over $25 million, (b) buy/sell/share personal information of 100,000+ consumers/households, or (c) derive 50%+ of revenue from selling/sharing personal information. x/pat likely falls below these thresholds at launch, but should implement CCPA-ready infrastructure proactively.

## 2.6 Children's Privacy (COPPA and EU)

### COPPA (US -- Updated April 2026)
The FTC finalized major COPPA updates with a **compliance deadline of April 22, 2026**:
- **Expanded personal information definition:** Now includes persistent identifiers, biometric data, geolocation, and behavioral data
- **Stricter third-party sharing:** Third-party sharing for advertising, analytics, or AI requires **explicit parental consent** unless integral to the service
- **Separate consent for third-party disclosures:** Must be separated from consent for primary app functions
- **Data retention:** Must delete data when no longer necessary

### FTC Age Verification Policy (February 2026)
The FTC issued a policy statement confirming that operators can collect personal information **solely for age verification** without parental consent if they: do not use it for any other purpose, do not retain it longer than necessary, and disclose it only to parties capable of maintaining confidentiality.

**x/pat's 13+ age gate is compliant** as a declared-age mechanism. However, if x/pat becomes aware a user is under 13, COPPA's full parental consent requirements apply.

### COPPA 2.0 (Proposed)
Covers ages **13 to 16**, bans targeted advertising to minors entirely, and creates a dedicated FTC enforcement division. KOSA legislation (moving through Congress) would require restricting default settings on minors' accounts up to age 17.

### EU Age Verification
Australia mandates blocking users under 16 from social media (effective December 2025). The EU's Digital Services Act guidelines on protection of minors (published July 2025) apply to all online platforms accessible to minors except small/micro enterprises.

---

# 3. Content Moderation Legal Requirements

## 3.1 EU Digital Services Act (DSA)

The DSA applies to all intermediary services, with obligations scaled by size.

### Small Platform Exemptions
Micro and small enterprises (fewer than 50 employees and less than 10 million EUR annual turnover) are **exempt from**:
- Transparency reporting obligations
- Internal complaint-handling system requirements
- Reporting to the DSA Transparency Database
- DSA guidelines on protection of minors (published July 2025)

**x/pat qualifies for the small platform exemption** at launch. However, all platforms regardless of size must:
- Allow users to **report illegal content**
- **Act swiftly** once notified to remove illegal content
- Provide a **statement of reasons** when removing content
- Cooperate with authorities on removal orders

### Risk Level: LOW (at current scale)
The exemption significantly reduces compliance burden. However, implement basic reporting and removal infrastructure from day one to demonstrate good faith.

## 3.2 Section 230 (US)

Section 230 provides broad liability protection for platforms hosting user-generated content. However, the landscape is shifting:

- **Algorithmic curation liability:** The Third Circuit (August 2024) ruled that TikTok's algorithm-curated content may not be protected by Section 230 because the platform actively curates rather than passively hosts
- **Take It Down Act (2025):** Signed by President Trump, imposes liability for failure to remove intimate images after FTC notification
- **Congressional scrutiny:** Senate Commerce Committee hearing "Liability or Deniability? Platform Power as Section 230 Turns 30" held March 2026

**For x/pat:** Section 230 currently protects against liability for user-posted content, but only if x/pat does not actively curate or promote harmful content algorithmically. The existing report + block system supports good-faith moderation, which Section 230 expressly protects.

## 3.3 CSAM Detection and Reporting

### Federal Requirements (18 U.S.C. Section 2258A)
Electronic service providers have a **legal duty to report apparent CSAM** to NCMEC's CyberTipline when they obtain **actual knowledge** of it. This is mandatory, not optional.

- **REPORT Act (2025):** Expanded mandatory reporting to include child sex trafficking and enticement of a minor
- **NCMEC CyberTipline:** The **only authorized reporting channel** under federal law -- platforms may not substitute their own reporting systems
- **Detection technology:** Not universally required to scan all content, but platforms of "meaningful scale" are expected to deploy detection technology (PhotoDNA or similar)
- **California AB 1394:** Requires covered social media platforms to implement notice-and-staydown for CSAM and provide a reporting system for identifiable minors, with 30-day determination windows

### Google Play Requirement
Google Play's Child Safety Standards Policy explicitly requires social apps to have a process to **report confirmed CSAM** and a designated contact point for Google.

**Action Items:**
1. Implement NCMEC CyberTipline reporting process (register at missingkids.org/gethelpnow/cybertipline)
2. Deploy hash-matching against NCMEC's hash database for uploaded photos
3. Document the CSAM reporting workflow for both app stores
4. Designate a point of contact for child safety issues

## 3.4 Content Moderation Standards

### Existing x/pat Capabilities
- Report modal (implemented)
- Block system (implemented)
- Keyword filtering (implemented)
- Rate limiting (implemented)

### Additional Requirements
- **Photo moderation:** AI-based or manual review for uploaded photos, particularly for CSAM and nudity
- **Hate speech:** No universal global standard, but EU requires removal of illegal content; Germany's NetzDG requires removal within 24 hours for clearly illegal content (though NetzDG is being superseded by DSA)
- **Takedown timelines:** DSA requires "without undue delay" after notification; in practice, EU regulators expect 24-48 hours for clearly illegal content

---

# 4. Location Data Regulations

## 4.1 Consent Requirements by Jurisdiction

| Jurisdiction | Requirement | Notes |
|---|---|---|
| **GDPR (EU)** | Explicit opt-in consent before collection | Must not initialize location SDK before consent |
| **PDPA (Thailand)** | Explicit consent, granular, logged | Similar to GDPR standard |
| **LFPDPPP (Mexico)** | Notice + consent in privacy notice | Express written consent if classified as sensitive |
| **CCPA (California)** | Notice at collection; right to limit use of SPI | Precise geolocation is Sensitive Personal Information |
| **LGPD (Brazil)** | Opt-in consent; freely given | ANPD focused on location data in 2026-2027 |

**Critical implementation note:** Do NOT initialize location SDKs (react-native-maps, expo-location) until the user has explicitly granted consent. SDK initialization before consent is a common enforcement finding under GDPR.

## 4.2 Data Retention for Location Data

GDPR does not prescribe specific retention periods. Instead, the **storage limitation principle** (Article 5(1)(e)) requires that personal data be kept only as long as necessary for the purpose collected.

### Recommended Retention Policy for x/pat

| Data Type | Recommended Retention | Justification |
|---|---|---|
| Real-time user location | Session only (not stored) | Only needed for map display |
| Spot check-in history | 2 years from check-in date | Core app feature; user-initiated |
| Aggregate location analytics | Indefinite (anonymized) | Must be truly anonymized, not pseudonymized |
| Location data of deleted accounts | Delete within 30 days of account deletion | GDPR "without undue delay" + Apple requirement |

### Key Principles
- **Pseudonymization is NOT anonymization** -- pseudonymized data is still personal data under GDPR and requires retention limits
- **"Just in case" retention is prohibited** -- every retention period must be documented and justified in the RoPA
- **France's CNIL fined Free Mobile 27 million EUR** in early 2026 for retention failures alone -- regulators actively enforce this

## 4.3 Anonymization Requirements

Aggregate location data (e.g., "42 nomads checked into co-working spaces in Lisbon this week") is exempt from GDPR if **truly anonymized**:
- Remove all direct identifiers
- Apply k-anonymity (minimum group size of 5+ before displaying aggregate data)
- Remove temporal precision that could re-identify individuals
- Do not combine with other datasets that could enable re-identification

## 4.4 Geofencing and Notification Consent

Push notifications triggered by location (geofencing) require **dual consent**:
1. Location permission (for geofencing to function)
2. Push notification permission (for the notification itself)

Both must be independently granted and revocable. x/pat already has push notification consent flow -- ensure it covers location-triggered notifications specifically if this feature is planned.

---

# 5. Terms of Service and Privacy Policy

## 5.1 Required Elements for a Global Social App (2026)

### Privacy Policy Must Include
- Identity and contact details of the data controller (Aych Holdings LLC, alex@xpat.social)
- Categories of personal data collected (with specific descriptions, not vague terms)
- Purposes of processing and legal basis for each
- Recipients or categories of recipients (Supabase, Sentry, PostHog, Expo/EAS -- named specifically)
- International data transfers and safeguards (EU-US Data Privacy Framework, SCCs)
- Retention periods for each data category
- All data subject rights (access, rectification, erasure, portability, restriction, objection, withdraw consent)
- Right to lodge a complaint with a supervisory authority
- Whether provision of data is a statutory/contractual requirement
- Automated decision-making information (if applicable)
- Cookie and tracking technology disclosures
- Children's privacy section (COPPA compliance, 13+ age gate explanation)
- **Jurisdiction-specific sections** for: GDPR, CCPA/CPRA, LGPD, PDPA, LFPDPPP

### Terms of Service Must Include
- User eligibility (13+ age requirement, with 16+ for Australia)
- Content ownership and licensing (user retains ownership; grants x/pat a license to display/distribute)
- Prohibited content and behavior
- Content moderation policies and appeal process
- Account termination and suspension rights
- Dispute resolution mechanism
- Limitation of liability
- Indemnification clause
- Governing law and jurisdiction
- **Affiliate relationship disclosure** (when implemented)

## 5.2 Account Deletion Requirements

| Requirement Source | Timeline | Notes |
|---|---|---|
| **Apple** | Must be easy and "without delay" | In-app initiation required; 7-day grace period acceptable |
| **Google Play** | In-app path must be intuitive | Must be prominent in account settings |
| **GDPR** | "Without undue delay" (max 1 month, extendable to 3) | Must delete all personal data unless retention is legally required |
| **CCPA** | 45 days (extendable to 90 with notice) | Must verify identity before deletion |
| **LGPD** | Without excessive delay | Must confirm deletion to user |

x/pat's existing `delete_user_account()` RPC with 7-day grace period is compliant. Ensure the in-app flow is: Settings > Account > Delete Account > Confirmation > 7-day grace period with email notification > Permanent deletion.

## 5.3 Data Portability (GDPR Article 20)

Users have the right to receive their personal data in a **structured, commonly used, and machine-readable format** (e.g., JSON or CSV). This includes:
- Profile information
- Photos uploaded
- Chat messages
- Check-in history
- Spot data they created

**Action:** The Settings screen mentions a data export feature but it is **not implemented**. This must be built before launch in EU markets. Provide a "Download My Data" button that generates a ZIP file with JSON exports of all user data.

## 5.4 Third-Party Data Sharing Disclosures

The privacy policy must specifically name each third party receiving user data:

| Service | Data Shared | Purpose |
|---|---|---|
| **Supabase** | All user data (processor) | Backend infrastructure, database, auth, realtime |
| **Sentry** | Crash data, device info, user ID | Error monitoring and diagnostics |
| **PostHog** | Usage events, device info | Product analytics (with GDPR consent) |
| **Expo/EAS** | Push tokens, device info | Build service, push notifications |
| **Apple (APNS)** | Push tokens | Push notification delivery |
| **Google (FCM)** | Push tokens | Push notification delivery |

Each service's DPA status must be verified and documented.

---

# 6. Affiliate Marketing Compliance

## 6.1 FTC Disclosure Requirements (US)

The FTC requires **clear and conspicuous** disclosure of any material connection between an affiliate and a brand. For x/pat's affiliate model:

- Disclosures must be **visible on mobile** -- not hidden in settings or behind "more" links
- Must use **clear language** ("We earn a commission" or "Affiliate link") -- not vague terms like "partner" or "collaboration"
- Must appear **near the affiliate content/link**, not in a separate page
- Civil penalties per violation: up to **$51,744** in 2026, with each non-disclosed instance counting separately
- FTC filed over **150 actions** related to deceptive endorsement practices in 2025

### Implementation for x/pat
When affiliate links become active (replacing "Coming Soon" placeholders):
- Add a visible disclosure label near each affiliate link: "Affiliate -- we may earn a commission"
- Include a general affiliate disclosure in the app's About/Legal section
- Ensure the disclosure is visible without scrolling or tapping

## 6.2 EU Affiliate Marketing Regulations

The European Commission classifies anyone receiving consideration for endorsement (including affiliate link commissions) as a **"trader"** under the Unfair Commercial Practices Directive (UCPD).

- Failure to disclose affiliate relationships is a **misleading commercial practice** under EU law
- Disclosures must be visible and **not require additional steps** (no "read more" clicks)
- The 2024 EU sweep found **97% of influencers posted commercial content** but only **20% systematically disclosed** it
- The EU **Digital Fairness Act** (expected Q4 2026) will impose additional disclosure requirements

### Implementation for x/pat
- Label affiliate links with "Ad" or "Affiliate" in a way visible before clicking
- Do not disguise affiliate links as organic recommendations
- Maintain an affiliate disclosure page accessible from the app

## 6.3 Current "Coming Soon" Placeholder Risk

The "Coming Soon" affiliate placeholders create **dual risk**:
1. **Apple rejection (Guideline 2.1):** Non-functional features trigger rejection for app incompleteness
2. **User trust:** Placeholder features signal an unfinished product

**Recommendation:** Remove all "Coming Soon" placeholders before app store submission. When real affiliate partnerships are established, implement with proper FTC/EU disclosures from day one.

---

# 7. Compliance Checklist

## Pre-Launch (Must Complete Before Submission)

- [ ] **Remove "Coming Soon" affiliate placeholders** -- Apple rejection risk (Guideline 2.1)
- [ ] **Complete Apple age rating questionnaire** -- reflect UGC, chat, location (likely 17+)
- [ ] **Complete Google Play Child Safety Standards self-certification**
- [ ] **Complete Apple Privacy Nutrition Labels** -- declare all data categories
- [ ] **Complete Google Play Data Safety Section** -- declare all data categories
- [ ] **Sign Supabase DPA** -- available at supabase.com/legal/dpa
- [ ] **Verify DPAs with Sentry, PostHog, Expo/EAS**
- [ ] **Create Record of Processing Activities (RoPA)** -- all data categories, purposes, legal bases
- [ ] **Implement GDPR consent management** -- granular, opt-in, toggleable, documented
- [ ] **Do NOT initialize location SDK before consent** -- critical GDPR compliance
- [ ] **Implement data export (GDPR Article 20)** -- "Download My Data" in Settings
- [ ] **Privacy Policy** -- include all jurisdiction-specific sections (GDPR, CCPA, LGPD, PDPA, LFPDPPP)
- [ ] **Terms of Service** -- include content moderation, account deletion, age requirements
- [ ] **Register with NCMEC CyberTipline** -- mandatory CSAM reporting channel
- [ ] **Implement photo hash-matching** for CSAM detection on uploads
- [ ] **Add PrivacyInfo.xcprivacy** -- verify auto-merge or add custom manifest
- [ ] **Define data retention periods** -- document in RoPA and privacy policy
- [ ] **Verify EU-US Data Privacy Framework** status for Supabase data transfers
- [ ] **Create .env.example** -- remove hardcoded credentials

## Post-Launch (Within 90 Days)

- [ ] **Legitimate Interest Assessment (LIA)** for crash analytics
- [ ] **CCPA "Do Not Sell" mechanism** -- implement if/when reaching 100K+ users or $25M revenue
- [ ] **COPPA compliance review** -- updated rules effective April 22, 2026
- [ ] **Thailand PDPA DPO assessment** -- determine if DPO appointment is required
- [ ] **Mexico privacy notice (Aviso de Privacidad)** -- Spanish language version
- [ ] **Establish content moderation response SLA** -- 24-48 hours for reported illegal content
- [ ] **CCPA/CPRA privacy risk assessment** -- complete by December 31, 2027 for pre-2026 processing

## Ongoing

- [ ] **Monitor DSA size thresholds** -- if exceeding 50 employees or 10M EUR turnover, full DSA obligations apply
- [ ] **Monitor Section 230 legislative changes** -- active Congressional review in 2026
- [ ] **Annual DPA review** -- ensure all vendor agreements remain current
- [ ] **Consent record auditing** -- verify consent records match actual processing
- [ ] **Data retention enforcement** -- automated deletion of expired data
- [ ] **Monitor COPPA 2.0 and KOSA legislation** -- may extend requirements to ages 13-16/17

---

# 8. Risk Assessment Matrix

| Risk Area | Probability | Impact | Priority | Mitigation |
|---|---|---|---|---|
| Apple rejection for "Coming Soon" placeholders | **Very High** | High (delays launch) | **P0** | Remove before submission |
| GDPR non-compliance (location consent) | High | **Very High** (20M EUR fines) | **P0** | Implement consent management |
| Missing CSAM reporting process | Medium | **Very High** (criminal liability) | **P0** | Register with NCMEC |
| Missing DPAs (Supabase, Sentry, PostHog) | High | High (GDPR violation) | **P1** | Sign all DPAs pre-launch |
| Missing data export feature | High | Medium (GDPR Art. 20 violation) | **P1** | Build "Download My Data" |
| Incorrect age rating questionnaire | Medium | High (rejection/removal) | **P1** | Re-verify answers |
| Thailand PDPA enforcement action | Medium | High (fines + data deletion orders) | **P1** | Implement PDPA-compliant consent |
| COPPA violation (under-13 user) | Low | **Very High** (FTC action) | **P2** | Age gate + monitoring |
| CCPA non-compliance | Low (below thresholds) | Medium | **P2** | Build CCPA-ready infrastructure |
| Mexico LFPDPPP enforcement | Low (regulations pending) | Medium | **P3** | Privacy notice + ARCO rights |
| Brazil LGPD enforcement | Low (small user base) | Medium | **P3** | Privacy policy + consent |
| DSA full obligations triggered | Very Low (below threshold) | High | **P3** | Monitor scale metrics |
| Section 230 reform | Low (legislative process) | Medium | **P3** | Maintain good-faith moderation |
| Affiliate FTC enforcement | N/A (no active affiliates) | Medium | **P3** | Implement disclosures when active |

---

# 9. Action Items by Priority

## P0 -- Block Launch If Not Completed

1. **Remove all "Coming Soon" affiliate placeholders** from the app
2. **Implement GDPR-compliant consent management:** Granular consent screen on first launch for location, analytics, and notifications -- each independently toggleable. Do not initialize location SDK until consent is granted. Store consent records with timestamps in Supabase.
3. **Register with NCMEC CyberTipline** and establish a CSAM reporting workflow
4. **Complete Apple Privacy Nutrition Labels and Google Play Data Safety Section**
5. **Complete Google Play Child Safety Standards self-certification**

## P1 -- Complete Before or Immediately After Launch

6. **Sign DPAs** with Supabase, Sentry, PostHog, and Expo/EAS
7. **Build data export feature** (GDPR Article 20) -- "Download My Data" generates JSON/ZIP
8. **Create Record of Processing Activities (RoPA)** spreadsheet
9. **Re-verify Apple age rating questionnaire** -- account for UGC, chat, location
10. **Publish comprehensive Privacy Policy** with jurisdiction-specific sections
11. **Publish Terms of Service** with content moderation and deletion policies
12. **Implement photo moderation** for uploaded images (at minimum, hash-matching for CSAM)
13. **Define and document data retention periods** for all data categories
14. **Verify EU-US data transfer mechanism** (DPF status for Supabase)

## P2 -- Within 90 Days of Launch

15. **Write Legitimate Interest Assessment** for crash analytics (Sentry)
16. **Prepare CCPA infrastructure** -- "Do Not Sell" mechanism ready to activate
17. **Create Spanish-language privacy notice** for Mexico (Aviso de Privacidad)
18. **Implement content moderation SLA** -- 24-48 hour response time for reports
19. **Review COPPA compliance** against April 22, 2026 updated rules
20. **Assess Thailand DPO requirement** based on data processing scale

## P3 -- Within 6 Months

21. **Monitor affiliate marketing compliance** -- implement FTC/EU disclosures when partnerships launch
22. **Conduct CCPA/CPRA privacy risk assessment** if approaching thresholds
23. **Monitor Section 230 and DSA legislative developments**
24. **Implement automated data retention enforcement** (scheduled deletion jobs)
25. **Legal consultation** -- 1-hour GDPR specialist review of data flows and privacy policy

---

# 10. Sources

## App Store Compliance
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Updated App Review Guidelines (November 2025)](https://developer.apple.com/news/?id=ey6d8onl)
- [iOS App Store Review Guidelines 2026 -- The App Launchpad](https://theapplaunchpad.com/blog/app-store-review-guidelines)
- [App Store Review Checklist 2025 -- App Institute](https://appinstitute.com/app-store-review-checklist/)
- [2025 Mobile App Store Policy Updates -- AppsOnAir](https://www.appsonair.com/blogs/2025-mobile-app-store-policy-updates)
- [Top Reasons iOS Apps Get Rejected 2026 -- EIT BIZ](https://www.eitbiz.com/blog/top-reasons-ios-apps-get-rejected-by-the-app-store-and-fixes/)
- [Google Play Policy Announcement April 2025](https://support.google.com/googleplay/android-developer/answer/15899442?hl=en)
- [Google Play Developer Policy Changes 2026 -- OpenForge](https://openforge.io/google-play-developer-policy-changes-that-matter-in-2026/)
- [Google Play AI Content Policy -- Chatboq](https://chatboq.com/blogs/google-play-ai-content-policy)
- [Apple Guideline 5.1.2(i) AI Data Sharing -- TechCrunch](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai/)
- [App Privacy Details -- Apple Developer](https://developer.apple.com/app-store/app-privacy-details/)
- [App Store Age Verification Laws -- Median](https://median.co/blog/new-age-verification-laws-2026)

## Data Privacy
- [GDPR Data Retention -- European Commission](https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/principles-gdpr/how-long-can-data-be-kept-and-it-necessary-update-it_en)
- [CCPA in 2026 -- Pandectes](https://pandectes.io/blog/ccpa-in-2026-new-requirements-and-compliance-impacts/)
- [California 2026 CCPA Regulations -- Thompson Coburn](https://www.thompsoncoburn.com/insights/californias-2026-ccpa-regulations-summary-and-preparation-guide/)
- [Thailand PDPA Crackdown 2025 -- DLA Piper](https://privacymatters.dlapiper.com/2025/09/thailand-pdpa-crackdown-2025-are-you-next-major-fines-and-lessons-from-thailands-latest-enforcement/)
- [Thailand Data Protection 2026 -- Chambers](https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/thailand/trends-and-developments)
- [Mexico LFPDPPP 2025 Reform -- ComplianceHub](https://www.compliancehub.wiki/mexicos-new-data-protection-law-a-comprehensive-analysis-of-the-2025-lfpdppp-reform/)
- [Mexico Data Protection 2026 -- Chambers](https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/mexico/trends-and-developments)
- [Brazil LGPD 2026 -- Chambers](https://practiceguides.chambers.com/practice-guides/data-protection-privacy-2026/brazil)
- [Brazil Data Protection 2025-2026 -- ICLG](https://iclg.com/practice-areas/data-protection-laws-and-regulations/brazil)

## Content Moderation & Child Safety
- [EU Digital Services Act -- European Commission](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act)
- [DSA Explained -- AlgorithmWatch](https://algorithmwatch.org/en/dsa-explained/)
- [CSAM Reporting Obligations 2026 -- Remove Your Media](https://removeyourmedia.com/2026/03/07/csam-reporting-obligations-what-platforms-must-do-to-stay-compliant/)
- [REPORT Act -- Thorn](https://www.thorn.org/blog/the-report-act-explained/)
- [REPORT Act -- Wilson Sonsini](https://www.wsgr.com/en/insights/new-minor-safety-obligations-for-online-services-report-act-expands-child-sexual-exploitation-reporting-requirements.html)
- [Section 230 Overview -- Congress.gov](https://www.congress.gov/crs-product/R46751)
- [Section 230 Turns 30 -- Senate Commerce Committee](https://www.commerce.senate.gov/2026/3/liability-or-deniability-platform-power-as-section-230-turns-30)

## Children's Privacy
- [FTC COPPA Policy Statement February 2026](https://www.ftc.gov/news-events/news/press-releases/2026/02/ftc-issues-coppa-policy-statement-incentivize-use-age-verification-technologies-protect-children)
- [COPPA FAQs -- FTC](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- [COPPA Rule Update -- Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)
- [Kids Act and Age Verification -- Fortune](https://fortune.com/2026/03/18/kosa-kids-act-app-store-accountability-act-minors-age-verification/)

## Affiliate Marketing
- [FTC Affiliate Disclosure 2026 -- ReferralCandy](https://www.referralcandy.com/blog/ftc-affiliate-disclosure)
- [FTC Disclosure Requirements 2026 -- InfluenceFlow](https://influenceflow.io/resources/ftc-disclosure-requirements-and-best-practices-a-complete-2026-guide/)
- [Affiliate Marketing Compliance 2026 -- Tapfiliate](https://tapfiliate.com/blog/affiliate-marketing-compliance-gp/)
- [EU Influencer Marketing -- Greenberg Traurig](https://www.gtlaw.com/en/insights/2025/4/influencer-marketing-practices-under-scrutiny-in-europe)
- [Digital Fairness Act -- Osborne Clarke](https://www.osborneclarke.com/insights/digital-fairness-act-unpacked-social-media-influencers)

## Account Deletion
- [Apple Account Deletion -- Apple Developer](https://developer.apple.com/support/offering-account-deletion-in-your-app)
- [Google Play Account Deletion -- Play Console](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
