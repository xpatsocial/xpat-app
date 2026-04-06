# Privacy, Legal Compliance & Security Research
## x/pat — International Social App for Digital Nomads & Expats
**Prepared:** April 2026 | **Scope:** GDPR, CCPA, Thailand PDPA, Mexico LFPDPPP, App Store/Play Store, Security Audit

> **Context:** x/pat is a US-based startup (Aych Holdings LLC) with Supabase hosted in the US (us-east-1). Users are distributed globally with concentrations in Bangkok (Thailand), Lisbon (Portugal/EU), and Mexico City (Mexico). This creates a multi-jurisdictional compliance picture that must be addressed before public launch.

---

## How to Read This Document

Each topic covers:
- **What's Required** — the legal or technical obligation
- **Risk if Ignored** — fine amounts, enforcement history, app store consequences
- **Implementation Steps** — specific actions for x/pat
- **Lawyer Needed?** — self-serve vs. legal counsel judgment

---

# SECTION 1: GDPR Compliance (EU Users — Lisbon / Portugal)

## Topic 1: Data Controller Obligations and Scope of GDPR

### What's Required
GDPR applies to x/pat because the app is offered to EU residents in Portugal (Lisbon). This triggers full Article 3 extraterritorial scope — the fact that x/pat is a US company and Supabase is US-hosted does not exempt you. As the entity determining the purposes and means of processing, x/pat is the **data controller**. Supabase is a **data processor** acting on x/pat's documented instructions.

As data controller, x/pat must:
- Maintain a **Record of Processing Activities (RoPA)** — a documented internal register of every category of personal data collected, why it's collected, legal basis, retention period, and recipients
- Have a signed **Data Processing Agreement (DPA)** with every vendor that touches personal data (Supabase, Expo/EAS, push notification services, analytics tools)
- Implement **data protection by design and default** — collect only what's needed, default to privacy-preserving settings
- The EDPB's 2026 coordinated enforcement focuses on **transparency obligations (Articles 12–14)** — meaning privacy notices, not just consent banners, are under active regulatory scrutiny this year

### Risk if Ignored
- Fines up to €20 million or 4% of global annual turnover (whichever is higher)
- In 2025, €530 million was issued to TikTok, €290 million to Uber — enforcement is active and expanding to smaller companies
- EU supervisory authorities (Portugal's CNPD) can issue corrective orders, require data deletion, and suspend processing

### Implementation Steps for x/pat
1. **Sign Supabase DPA** — available at supabase.com/legal/dpa; sign via dashboard or email support@supabase.io. Download the current PDF (dated 250314)
2. **Create a RoPA spreadsheet** covering: user profiles, location data, chat messages, spot check-ins, push notification tokens, analytics events — document legal basis for each
3. **Audit every SDK and third-party service** — Expo, Sentry, any analytics provider. Each needs either a DPA or must be replaced with a compliant alternative
4. **Implement data minimization** — do not collect fields not actively used in the current feature set
5. **Designate a contact point** for GDPR matters (as a solo founder this is you — list alex@xpat.social in the privacy policy as the controller contact)

### Lawyer Needed?
**Partially self-serve.** The RoPA, DPA signing, and privacy policy can be drafted using templates (iubenda, TermsFeed). However, consult a GDPR-specialized attorney before launch if you expect significant EU user growth — even a 1-hour consultation on your specific data flows is worth it. Portugal's CNPD is an active regulator.

---

## Topic 2: Lawful Basis for Processing Personal Data

### What's Required
Under GDPR Article 6, every processing activity must have one of six lawful bases. For x/pat, the applicable bases are:

| Data / Activity | Lawful Basis |
|---|---|
| Account creation and authentication | **Contract performance** (Art. 6(1)(b)) |
| User profile (name, photo, bio) | **Contract performance** |
| Precise location for spot discovery | **Consent** (Art. 6(1)(a)) — location is sensitive |
| Push notifications | **Consent** |
| Basic crash analytics (anonymized) | **Legitimate interest** (Art. 6(1)(f)) — LIA required |
| Behavioral profiling / personalization | **Consent** — regulators are skeptical of LI for this |
| Legal obligations (fraud, court orders) | **Legal obligation** (Art. 6(1)(c)) |

Consent must be: freely given, specific, informed, unambiguous, documented, and withdrawable at any time. Pre-ticked boxes are prohibited. Equal prominence must be given to accept and reject options.

For **Legitimate Interest (LI)**, a formal Legitimate Interest Assessment (LIA) document is required. In 2026, regulators reject LI claims for behavioral profiling — do not use LI for location tracking or social graph analysis.

**EDPB 2026 focus:** Regulators are verifying at runtime whether consent declared in the UI is actually honored in back-end data flows. A "technical truth gap" (consent given but processing continues) is an enforcement priority.

### Risk if Ignored
- Processing without lawful basis is a core GDPR violation — fines start in the millions for systemic issues
- Location data processed without explicit consent is a top enforcement target in 2025–2026 (California AG ran a parallel enforcement sweep on location data)

### Implementation Steps for x/pat
1. **Map every data point to a lawful basis** in the RoPA (created in Topic 1)
2. **Build a consent management system** — on first app launch, display a granular consent screen: location (on/off), analytics (on/off), marketing notifications (on/off). Each must be independently toggleable
3. **Do not initialize location SDKs until consent is granted** — SDK initialization before consent is a common enforcement finding
4. **Document and store consent records** — timestamp, user ID, what was consented to, app version. Store in a Supabase `consent_records` table
5. **Write a Legitimate Interest Assessment** for crash analytics — document: the interest (app stability), necessity (can't improve without it), and balancing test (users reasonably expect this)

### Lawyer Needed?
**Self-serve for basics.** The LIA template is publicly available via ICO.org.uk. Legal review recommended if you add any ML-based profiling or behavioral ad targeting.

---

## Topic 3: Data Subject Rights — Right to Erasure, Portability, and Access

### What's Required
GDPR grants EU users eight rights. The ones most operationally demanding for x/pat:

**Right to Erasure (Art. 17 — "Right to Be Forgotten"):**
Users can request deletion of their data when: the data is no longer needed for its original purpose, consent is withdrawn, or they object to processing. Erasure must cover live systems, backups, and data shared with processors.

**Right to Data Portability (Art. 20):**
Users can request their personal data in a **structured, machine-readable format** (JSON, CSV). Applies to data processed by automated means on the basis of consent or contract. x/pat must be able to export: profile, spot check-ins, chat history, follows/followers.

**Right of Access (Art. 15):**
Users can request confirmation of whether their data is processed, and if so, receive a copy plus metadata (purposes, recipients, retention periods).

**Response deadline:** 30 days (extendable to 3 months for complex requests). Requests must be free of charge.

### Risk if Ignored
- The EDPB's 2025 coordinated enforcement action focused specifically on the **right to erasure** — it is an active enforcement priority
- Failure to honor erasure requests carries fines and reputational damage
- App stores may delist apps that do not provide account deletion

### Implementation Steps for x/pat
1. **Add "Delete My Account" in app settings** — this must trigger deletion of all user-generated content, profile data, auth records, and push tokens. Hard-delete from Supabase tables (do not just soft-delete)
2. **Handle Supabase cascades** — set up proper `ON DELETE CASCADE` rules so that deleting a user record in `auth.users` also deletes all related rows in `profiles`, `spots`, `messages`, `follows`, etc.
3. **Create a Data Export function** — build a Supabase Edge Function that compiles a user's data into a downloadable JSON/CSV and emails it to them. Link from Settings > Privacy > Download My Data
4. **Create a data request intake form** — a simple web form at xpat.social/privacy-request that logs requests to a Supabase table and sends an email to alex@xpat.social
5. **Establish a backup deletion policy** — document that Supabase automated backups are rotated on [X-day] schedule; upon erasure request, note that backup data will be purged in the next rotation cycle
6. **Export format:** JSON is acceptable; include profile fields, spot history, chat messages (with partner user IDs anonymized if they haven't requested export), and follower/following lists

### Lawyer Needed?
**Self-serve.** This is engineering work. No legal review required for implementation. A lawyer only needed if a user disputes whether erasure was complete.

---

## Topic 4: Privacy Policy Requirements for GDPR

### What's Required
GDPR Articles 13 and 14 require a privacy notice that discloses, at minimum:
- Identity and contact details of the controller (x/pat / Aych Holdings LLC, alex@xpat.social)
- Contact details of any DPO (not required for companies of x/pat's size, but must state who to contact)
- Purposes and legal bases for each processing activity
- Legitimate interests pursued (where LI is the basis)
- Recipients or categories of recipients of personal data
- Transfers to third countries and safeguards (Supabase US + SCCs)
- Retention periods for each category
- All eight data subject rights and how to exercise them
- Right to withdraw consent
- Right to lodge a complaint with a supervisory authority (Portugal's CNPD: cnpd.pt)
- Whether data provision is a statutory/contractual requirement
- Existence of automated decision-making and profiling logic

**2026 enforcement focus:** The EDPB's 2026 coordinated enforcement action targets transparency obligations specifically. Notices that are vague, buried, or don't match actual data flows will be scrutinized.

**Accessibility:** Privacy policy must be reachable from the App Store listing page, the Play Store listing page, and from within the app (Settings > Privacy Policy). A public URL is required.

### Risk if Ignored
- Incomplete privacy notices are the #1 GDPR enforcement target in 2026
- App Store and Play Store both require a functioning privacy policy URL before app approval

### Implementation Steps for x/pat
1. **Generate a GDPR-compliant privacy policy** using iubenda.com or Termly — both have templates tuned to mobile apps and Supabase. Cost: ~$29–99/year
2. **Host it at a stable URL** — e.g., xpat.social/privacy or within-app webview
3. **Include all required disclosures** per the list above, mapped to x/pat's actual data flows
4. **Add "Third-Party Services" section** listing Supabase (US, with SCCs), Expo/EAS, any analytics or push providers
5. **Link it in:** App Store Connect metadata, Play Console metadata, app Settings screen, app onboarding flow
6. **Add a "Last Updated" date** — update it whenever data practices change
7. **Translate to Portuguese** if expecting significant Lisbon user base — not legally required in GDPR but strongly recommended; Portuguese DPA CNPD can enforce in Portuguese

### Lawyer Needed?
**Self-serve with tools.** Iubenda's generator is attorney-reviewed. A lawyer review of the final policy is recommended before launch — budget ~$300–500 for a 1-hour review from a privacy attorney.

---

## Topic 5: International Data Transfers — US-Hosted Supabase Serving EU Users

### What's Required
x/pat's Supabase instance is in the US. EU users' personal data flows from Portugal → US servers. Under GDPR Chapter V, transferring personal data to a third country (US) requires a valid transfer mechanism.

**Available mechanisms (2026):**
1. **EU-US Data Privacy Framework (DPF):** The US has adequacy status for DPF-certified organizations. Supabase is **not** listed as a DPF-certified organization as of early 2026, meaning DPF alone does not cover x/pat's transfers
2. **Standard Contractual Clauses (SCCs):** The Supabase DPA incorporates the EU Commission's 2021 SCCs, which are the primary mechanism for Supabase-hosted apps. This is x/pat's mechanism
3. **Migrate to EU region:** Supabase allows project deployment in `eu-west-1` (Ireland) — this eliminates the transfer problem entirely for EU users

**Supabase's DPA and Transfer Impact Assessment (TIA)** are available at:
- DPA: supabase.com/legal/dpa
- TIA: supabase.com/downloads/docs/Supabase+TIA+250314.pdf

By signing Supabase's DPA, x/pat receives the benefit of Supabase's SCCs for the processor relationship.

**Enforcement context:** In January 2025, the Dutch DPA fined Uber €290 million for unlawful US transfers. In 2025, transfer-related fines exceeded €1 billion across Europe. This is not a theoretical risk.

### Risk if Ignored
- Fine up to 4% global turnover
- Portuguese CNPD can investigate and impose corrective orders requiring data localization

### Implementation Steps for x/pat
1. **Option A (Recommended long-term):** Create a new Supabase project in `eu-west-1` region for EU users — eliminates transfer risk entirely. This requires a regional routing strategy (detect user region on first launch, assign to regional project)
2. **Option B (Immediate/launch):** Sign Supabase's DPA, download and retain the TIA document. Disclose the transfer in the privacy policy with: "Your data is processed in the United States by Supabase Inc. This transfer is protected by Standard Contractual Clauses approved by the European Commission."
3. **Audit all other vendors** — confirm each has an SCC-based DPA available
4. **Do not route EU data through non-SCC-covered third parties** (some analytics SDKs transfer data to countries with no SCC coverage)

### Lawyer Needed?
**Legal review recommended** for the transfer assessment. A privacy attorney can review whether the Supabase SCCs are sufficient for x/pat's specific processing or whether additional measures (encryption, pseudonymization) are needed. Budget ~$500 for this review.

---

# SECTION 2: CCPA/CPRA Compliance (California Users, US)

## Topic 6: Does CCPA Apply to x/pat?

### What's Required
The CCPA/CPRA applies to for-profit businesses that do business in California and meet **at least one** of three thresholds (2026 adjusted figures):
1. Annual gross revenue exceeds **$26,625,000**, OR
2. Buys, sells, or shares the personal information of **100,000+ California consumers or households** per year, OR
3. Derives **50%+ of annual revenue** from selling/sharing personal data

**Current assessment for x/pat:**
- Revenue is sub-$26M (early-stage startup)
- Does not sell personal data
- User count at launch will be well below 100,000 California users

**Conclusion: x/pat likely does not meet CCPA thresholds at launch.** However:
- If the app scales rapidly and California users exceed 100,000, CCPA triggers automatically
- CCPA compliance is increasingly expected as a best practice even below thresholds
- Having compliance infrastructure now costs less than retrofitting later
- App store privacy requirements (covered in Topics 21–25) overlap heavily with CCPA

### Risk if Ignored
- Below-threshold: No direct legal exposure
- Above-threshold: Fines up to $7,500 per intentional violation, $2,500 per unintentional violation. Private right of action for data breaches
- Reputational risk if a California user complains and you have no privacy controls

### Implementation Steps for x/pat
1. **Monitor user growth** — set a threshold alert: when California users approach 75,000, initiate CCPA compliance buildout
2. **Implement as best practice now:** "Do Not Sell or Share My Personal Information" acknowledgment (x/pat does not sell data — state this explicitly in privacy policy)
3. **Track consumer count** — Supabase analytics or a simple query on registered users by region can approximate California user count
4. **Prepare CCPA-ready privacy policy section** — even if not required now, include a California-specific section in the privacy policy stating x/pat does not sell or share personal data

### Lawyer Needed?
**Self-serve at current scale.** Consult a privacy attorney when approaching the 100,000-user threshold or if introducing any data monetization features.

---

## Topic 7: CCPA Consumer Rights — Access, Deletion, Correction

### What's Required
When CCPA applies, California consumers have six rights:
1. **Right to Know** — what data is collected, from which sources, for what purposes, with whom it's shared
2. **Right to Delete** — request deletion of collected personal information (with exceptions for security, legal, operational purposes)
3. **Right to Correct** — request correction of inaccurate personal information (added by CPRA)
4. **Right to Opt-Out** — of sale or sharing of personal information
5. **Right to Limit Sensitive Data Use** — restrict use of sensitive PI beyond core service delivery
6. **Right of Non-Discrimination** — cannot be penalized for exercising rights

**Response timelines:**
- Acknowledge request: **10 days**
- Complete response: **45 days** (extendable once to 90 days with notice)
- Historical access requests: Data back to January 1, 2022 (2026 rule)

**Data format for access requests:** Portable, consumer-friendly format — CSV or PDF with clear category labeling. Raw database dumps do not satisfy this requirement.

### Risk if Ignored
- $7,500 per intentional violation
- California Privacy Protection Agency (CPPA) can audit and fine without a consumer complaint

### Implementation Steps for x/pat
1. **Leverage the GDPR infrastructure** (Topics 3–4) — CCPA rights largely overlap. If you build GDPR-compliant access/deletion, CCPA is mostly covered
2. **Add a "California Privacy Rights" section** to the privacy policy linking to a request form
3. **Build or use a Data Subject Access Request (DSAR) intake system** — a web form at xpat.social/privacy-request that captures: requester name, email, type of request, verification info
4. **Identity verification:** Under CCPA, verification must not be so burdensome it effectively denies rights. For account holders, matching request email to account email is sufficient
5. **Log all requests** with timestamps — required for compliance records

### Lawyer Needed?
**Self-serve.** The rights mirror GDPR closely. Legal review recommended when CCPA thresholds are crossed.

---

## Topic 8: CCPA Sensitive Personal Information — Location Data and Social Interactions

### What's Required
CPRA created a new category: **Sensitive Personal Information (SPI)**, which requires special handling. For x/pat, the relevant SPI categories are:
- **Precise geolocation data** (location within 1,850 feet / ~560 meters) — x/pat collects location for spot discovery, which qualifies as precise geolocation
- **Contents of messages** — private chat between users
- **Personal information of consumers under 16** (opt-in required for sale/sharing if users are 13–16)

**Consumer right to limit SPI:** Users can instruct x/pat to use SPI only for the core service (not for profiling, advertising, or sharing with third parties). x/pat must provide a "Limit the Use of My Sensitive Personal Information" link or in-app control.

**Location enforcement:** The California AG launched a dedicated enforcement sweep targeting apps that collect precise geolocation and share it with advertising networks. x/pat does not share location with ad networks, but must be able to demonstrate this.

### Risk if Ignored
- AG enforcement sweep is active in 2026 specifically targeting location data
- Private right of action for unauthorized disclosure of precise geolocation

### Implementation Steps for x/pat
1. **State explicitly in privacy policy** that precise geolocation is not sold or shared with third parties
2. **No geolocation data in ad SDKs** — if any advertising or analytics SDK is added, audit whether it receives location data
3. **In-app control:** Add a "Limit Sensitive Data Use" toggle in Settings > Privacy (can initially read "x/pat does not share your location with third parties" — provide the toggle as a CCPA-compliant acknowledgment mechanism)
4. **Age gate:** Add minimum age verification (18+) in onboarding. x/pat is a social app for adults; excluding under-16 users removes SPI opt-in obligations for that category
5. **Chat message privacy:** Store private messages with encryption at rest; do not index message content for analytics or profiling

### Lawyer Needed?
**Self-serve for implementation.** Legal review recommended if any analytics or monetization feature is added that touches location or message data.

---

## Topic 9: CCPA Opt-Out Requirements — Do Not Sell or Share

### What's Required
Even if x/pat doesn't meet CCPA thresholds today, the opt-out infrastructure is required once thresholds are crossed, and builds trust now.

**2026 mandatory changes:**
- Businesses must provide **confirmation** that an opt-out request was processed — including in response to **Global Privacy Control (GPC)** signals. GPC is a browser/device signal; in mobile apps, this maps to OS-level privacy settings
- The opt-out must remain honored for **at least 12 months** before re-soliciting consent
- Opt-out link must be: "Do Not Sell or Share My Personal Information" — exact label required, accessible without account creation

**x/pat's position:** x/pat's affiliate model does not involve selling or sharing personal data with advertisers. This simplifies compliance: x/pat can truthfully state "We do not sell or share your personal information" and provide a confirmation link.

### Risk if Ignored
- 2026 CPPA enforcement added mandatory opt-out confirmation as a bright-line requirement
- Apps that offer targeted advertising without proper opt-out face escalated fines

### Implementation Steps for x/pat
1. **Add to privacy policy:** Clear statement — "x/pat does not sell or share your personal information with third parties for advertising purposes"
2. **Add in-app Privacy Settings screen:** "Do Not Sell or Share My Personal Information" — can be a toggle defaulted to OFF (meaning no selling/sharing), with confirmation message: "Your preference has been recorded. x/pat does not sell or share your data"
3. **Maintain a record** of the "no sell/share" status per user if implementing a toggle
4. **Respond to GPC signals** — when iOS/Android OS-level ad tracking is disabled, treat as an opt-out signal in your data processing logic

### Lawyer Needed?
**Self-serve.** The "we don't sell data" position is the simplest possible CCPA opt-out implementation.

---

## Topic 10: CCPA Privacy Policy Requirements and Annual Updates

### What's Required
When CCPA applies, the privacy policy must include:
- Categories of personal information collected in the past 12 months
- Categories of sources from which PI is collected
- Business or commercial purpose for collecting, selling, or sharing PI
- Categories of PI disclosed for business purposes
- Categories of PI sold or shared (or statement that none is sold)
- Specific pieces of PI collected about consumers upon request
- Consumer rights and how to submit requests
- Contact information for submitting requests
- Date of last policy update (annually required)

**2026 additions:**
- ADMT (Automated Decision-Making Technology) disclosures — if AI/ML is used to make significant decisions about users, must disclose the logic and allow opt-out
- Risk assessment requirements for processing activities involving sensitive data (phased in 2026–2028)

### Risk if Ignored
- Incomplete privacy policy = CCPA violation; CPPA can audit annually
- App stores require functioning, comprehensive privacy policies

### Implementation Steps for x/pat
1. **Combine GDPR + CCPA requirements into a single privacy policy** — most generators (iubenda, Termly) offer combined GDPR/CCPA policies
2. **Add a "California Consumer Rights" section** with the specific CCPA disclosures
3. **Disclose AI/ML use** — if x/pat uses any recommendation algorithm to surface spots or users, disclose this in the ADMT section
4. **Annual review calendar** — schedule a policy review every January; update "last modified" date
5. **Version-control the policy** — maintain a changelog of what changed and when; regulators can request historical versions

### Lawyer Needed?
**Self-serve with generator tools.** Legal review when CCPA thresholds are met or if ML-based decision-making is added.

---

# SECTION 3: Thailand PDPA (Bangkok Users)

## Topic 11: Thailand PDPA Scope and Applicability to x/pat

### What's Required
Thailand's Personal Data Protection Act (PDPA), fully effective since June 2022, applies extraterritorially to organizations that:
- Collect, use, or disclose personal data **in Thailand**, or
- Offer goods/services to individuals **in Thailand** (including free services), or
- Monitor the behavior of individuals where that behavior takes place in Thailand

x/pat explicitly targets Bangkok as a core market. Thai users signing up and using the app means the PDPA applies to x/pat regardless of Aych Holdings LLC being a US entity.

The PDPA is enforced by the **Personal Data Protection Committee (PDPC)**, which in 2025 issued its first major administrative fines (over THB 21.5 million total), signaling the end of any grace period.

**Penalties:**
- Administrative fines: up to **THB 5 million (~$145,000)** per violation
- Criminal fines: up to **THB 1 million** with possible imprisonment for officers
- An e-commerce platform was fined THB 7 million in 2024 for unlawful processing

### Risk if Ignored
- Active PDPC enforcement with 20+ parallel matters running in 2025
- Bangkok is a top-3 x/pat market — Thai users are a core audience, not an incidental one
- Enforcement increasingly targets foreign apps serving Thai users

### Implementation Steps for x/pat
1. **Treat Thai users as PDPA-protected** — same consent and rights infrastructure built for GDPR largely satisfies PDPA
2. **Designate a data controller contact** accessible to Thai users — an email address in the app/privacy policy will suffice (a Thai DPO representative is not legally required for private companies of x/pat's size yet, though recommended)
3. **Register with PDPC if required** — PDPC may require certain data controllers to register; monitor PDPC announcements for thresholds
4. **Implement Thai-language privacy notice** — not strictly required but strongly recommended for Thai user base in Bangkok

### Lawyer Needed?
**Yes — Thai local counsel recommended** before significant Bangkok launch activity. Budget for a 2-hour consultation (~$200–400 USD equivalent) with a Bangkok-based data privacy firm (e.g., Baker McKenzie Bangkok, DLA Piper Thailand). The PDPA has nuances not captured in English-language summaries.

---

## Topic 12: Thailand PDPA Consent Requirements

### What's Required
Under Thailand's PDPA, consent must be:
- **Explicit and affirmative** — opt-in required; implied or bundled consent is invalid
- **Purpose-specific** — separate consent for each distinct processing purpose
- **Freely given** — consent cannot be a condition of service for data beyond what's necessary
- **Withdrawable** — users must be able to withdraw consent easily at any time
- **Documented** — the 2022 PDPC Consent Guideline requires logging of each consent grant/withdrawal

The PDPC Consent Guideline specifically requires:
- A clear "Reject all" option with equal prominence to "Accept all"
- Purpose-based granular choices
- Written or electronic consent in a verifiable form

**Sensitive data** (health, biometric, religious, financial) requires **explicit written consent** — these categories cannot use implied or soft consent mechanisms.

### Risk if Ignored
- Processing without valid consent is the primary enforcement trigger in Thailand
- The 2025 enforcement sweep specifically cited deficient consent mechanisms

### Implementation Steps for x/pat
1. **Reuse GDPR consent screen architecture** — the GDPR consent modal (built in Topic 2) satisfies PDPA consent requirements with minor additions
2. **Add Thai language option** to the consent screen
3. **Store consent records in Supabase** `consent_records` table with: user_id, timestamp, consent_version, purposes_accepted (JSON array), ip_region (TH), app_version
4. **Do not initialize location or analytics SDKs** until after consent is obtained — this is an active enforcement finding in Thailand
5. **Provide "Withdraw Consent" in app Settings** — must be as easy to use as the initial consent grant

### Lawyer Needed?
**Thai counsel to review consent screen** — the PDPC consent guideline has specific Thai-language requirements that need local expertise to verify.

---

## Topic 13: Thailand PDPA Data Subject Rights

### What's Required
The Thai PDPA grants data subjects rights closely mirroring GDPR:
1. **Right to be informed** — privacy notice at or before point of collection
2. **Right of access** — obtain confirmation and a copy of personal data held
3. **Right to rectification** — correct inaccurate or incomplete data
4. **Right to erasure** — request deletion/de-identification
5. **Right to restrict processing** — pause processing during a dispute
6. **Right to data portability** — receive data in structured electronic form
7. **Right to object** — object to processing based on legitimate interest
8. **Right to withdraw consent** — at any time, without detriment

**Response deadline:** The PDPA does not specify a fixed period but requires "prompt" handling; best practice is 30 days (aligning with GDPR).

### Risk if Ignored
- Failure to respond to data subject requests is an independent violation
- Users can file complaints directly with the PDPC

### Implementation Steps for x/pat
1. **GDPR infrastructure covers this** — the data request form (xpat.social/privacy-request), in-app Delete Account, and Data Export functions built for GDPR satisfy PDPA rights requirements
2. **Add Thai-language instructions** for submitting requests
3. **Respond within 30 days** — establish a calendar/task system so alex@xpat.social processes requests within deadline
4. **Maintain a request log** — required for demonstrating compliance if PDPC audits

### Lawyer Needed?
**Self-serve for implementation.** Thai counsel for any disputed request or PDPC complaint response.

---

## Topic 14: Thailand PDPA Cross-Border Data Transfer Requirements

### What's Required
Under PDPA Section 28, cross-border transfers of personal data from Thailand require that the destination country has an "adequate level of protection." The PDPC has **not yet published a formal adequacy list** as of 2025.

Until an adequacy list is published, transfers to non-adequate countries (including the US) must use **"appropriate safeguards"** under Section 29:
- Binding Corporate Rules (BCRs)
- Standard Contractual Clauses (SCCs) — the most practical option for x/pat
- Certification schemes
- Consent of the data subject (must be fully informed, including of risks)

**x/pat's situation:** Thai user data flows to Supabase in US. x/pat must rely on SCCs or user consent for this transfer.

**Supabase's DPA includes SCCs** — this is the mechanism. The same DPA signed for GDPR compliance covers the Thai data transfer requirement.

### Risk if Ignored
- Unauthorized cross-border transfer is a standalone PDPA violation
- PDPC has specifically scrutinized cloud service providers' cross-border transfer practices

### Implementation Steps for x/pat
1. **Sign Supabase's DPA** (same action as GDPR Topic 1) — the included SCCs cover the Thai transfer
2. **Disclose the cross-border transfer** in the Thai section of the privacy policy: "Your data is processed in the United States by Supabase Inc. This transfer is protected by contractual safeguards equivalent to international data protection standards"
3. **Long-term:** Consider Supabase `ap-southeast-1` (Singapore) region for Thai users — Singapore has a robust data protection framework (PDPA Singapore) and is geographically closer, reducing latency and transfer complexity

### Lawyer Needed?
**Thai counsel to confirm SCC adequacy for PDPA purposes** — the PDPC's view on whether EU-standard SCCs satisfy Thai requirements has not been tested in enforcement yet. This is a genuine legal gray area.

---

## Topic 15: Thailand PDPA Enforcement History and Practical Compliance Priority

### What's Required
Understanding the enforcement landscape informs where to focus compliance effort:

**2024–2025 Enforcement Actions:**
- August 2025: PDPC issued first major administrative fines totaling THB 21.5 million across multiple organizations
- An e-commerce platform fined THB 7 million for unlawful processing and deficient privacy notices
- By 2025, PDPC was running 20+ parallel enforcement matters
- PDPC enforcement focus: consent mechanisms, privacy notices, and cross-border transfers

**Key compliance priorities for x/pat (Bangkok):**
1. Valid consent mechanism (highest enforcement risk)
2. Privacy notice in Thai language
3. Cross-border transfer disclosure
4. Data subject rights response capability
5. Data security measures

**DPO Requirement:** Royal Gazette notification (October 9, 2025) made DPOs mandatory for state agencies. Broader private sector DPO requirements are expected but not yet mandated for companies of x/pat's size. Monitor PDPC announcements.

### Risk if Ignored
- THB 5 million maximum administrative fine per violation
- Criminal penalties for officers of offending organizations
- PDPC has demonstrated willingness to fine foreign apps serving Thai users

### Implementation Steps for x/pat
1. **Compliance priority order for Thai users:** (1) Valid consent screen → (2) Thai-language privacy notice → (3) Signed Supabase DPA → (4) Delete Account feature → (5) Privacy request intake form
2. **Subscribe to PDPC notifications** at pdpc.or.th for regulatory updates
3. **Budget for Thai counsel** — ~$400–800 USD for a compliance review before Bangkok-targeted marketing launch

### Lawyer Needed?
**Yes — Thai local counsel before any significant Thailand-targeted launch or marketing.** This is the jurisdiction with the most enforcement uncertainty and the highest practical risk given Bangkok is a primary market.

---

# SECTION 4: Mexico Privacy Laws (Mexico City Users)

## Topic 16: Mexico LFPDPPP Scope and 2025 Legal Reforms

### What's Required
Mexico's primary privacy law for private-sector entities is the **Federal Law on Protection of Personal Data Held by Private Parties (LFPDPPP)**. A substantially revised version was enacted on March 20–21, 2025, and entered into force immediately.

**Key 2025 changes:**
- **INAI dissolved** — the National Institute for Transparency and Data Protection (INAI) was abolished. Its enforcement function transferred to the **Secretariat of Anti-Corruption and Good Governance (SACBG)** / **Transparencia para el Pueblo**
- Core rights (ARCO rights) and data controller obligations remain substantively unchanged
- Implementing regulations as of early 2026 have not yet been published; the SACBG initiated stakeholder dialogues in January 2026
- A new comprehensive data protection law may emerge in 2026 — monitor closely

**Applicability to x/pat:** The LFPDPPP applies to private entities processing personal data of individuals in Mexico. x/pat targets Mexico City — Mexican users are covered.

**Penalties:** Up to approximately $1.5 million for major violations (converted from peso amounts).

### Risk if Ignored
- SACBG has enforcement authority and can impose fines and order data processing suspension
- The transition period (INAI → SACBG) creates regulatory uncertainty, but obligations for data controllers remain in force

### Implementation Steps for x/pat
1. **Treat Mexican users under LFPDPPP** — consent, privacy notice, ARCO rights all apply
2. **Monitor SACBG publications** at sacbg.gob.mx for implementing regulations expected in 2026
3. **Existing GDPR/PDPA compliance infrastructure largely covers LFPDPPP** — the requirements are structurally similar

### Lawyer Needed?
**Yes — Mexican privacy counsel recommended** before significant CDMX launch activity. The 2025 reform created regulatory uncertainty and a Mexico-based attorney can advise on current enforcement posture. Budget ~$300–600 USD for a consultation.

---

## Topic 17: Mexico Privacy Notice (Aviso de Privacidad) Requirements

### What's Required
The LFPDPPP requires a **Privacy Notice (Aviso de Privacidad)** that must be provided to users at or before the point of data collection. The notice must include:
- Identity and domicile of the data controller (Aych Holdings LLC, address)
- Purposes for which personal data will be processed
- Transfer options (whether data is shared with third parties and why)
- Mechanisms for exercising ARCO rights
- Whether the privacy notice may be modified and how users will be notified

**Two-tier notice system:**
1. **Simplified notice** — short, at point of collection (e.g., app registration screen). Must link to the full notice
2. **Full (Integral) notice** — comprehensive document covering all required elements

The notice must be provided in Spanish. English-only notices do not satisfy LFPDPPP requirements for Mexican users.

**Sensitive data notice:** If processing sensitive data (health, biometric, financial, racial origin), the notice must explicitly identify this and obtain express consent via written or electronic means.

### Risk if Ignored
- Processing without a valid privacy notice is an independent violation
- SACBG can require correction and impose fines for deficient notices

### Implementation Steps for x/pat
1. **Create a Spanish-language Aviso de Privacidad** — separate from or as a dedicated section of the main privacy policy. Link from the app's Settings and onboarding
2. **Simplified notice in onboarding:** One screen with: "Aych Holdings LLC procesa tus datos personales para [purposes]. Puedes ejercer tus derechos ARCO en [email/link]"
3. **Full notice accessible at:** xpat.social/aviso-de-privacidad
4. **List Supabase as a third-party recipient** in the notice, with the nature of the transfer
5. **Update notice when practices change** and notify existing users (push notification or email)

### Lawyer Needed?
**Mexican counsel to review the Aviso** — Spanish-language legal drafting has specific requirements under LFPDPPP that require a bilingual attorney to verify. This is not expensive (~$200–400 USD).

---

## Topic 18: Mexico ARCO Rights — Access, Rectification, Cancellation, Opposition

### What's Required
The LFPDPPP's ARCO rights give Mexican users control over their personal data:

**A — Acceso (Access):** Request details about what personal data is held and how it's being used. Provide within **20 business days** of receiving request; implement within **15 additional business days**.

**R — Rectificación (Rectification):** Request correction of inaccurate or incomplete data. Same timeline as Access.

**C — Cancelación (Cancellation):** Request deletion of personal data. Involves a "blocking period" during which data is suspended from processing (but stored for potential liability assessment), followed by permanent deletion. This mirrors GDPR's right to erasure with a blocking phase.

**O — Oposición (Opposition):** Object to data processing for specific legitimate reasons, potentially leading to a complete processing block.

**Response timeline:** Decision communicated within **20 business days**; action implemented within **15 additional business days** from decision.

**Filing complaints:** Users who feel ARCO rights were violated can file with the SACBG (formerly INAI).

### Risk if Ignored
- Failure to respond to ARCO requests within statutory timelines is an independent violation
- Users may escalate to SACBG with administrative complaint

### Implementation Steps for x/pat
1. **Leverage shared DSAR infrastructure** — the privacy request form at xpat.social/privacy-request covers ARCO requests. Add a field for Mexican users to select ARCO right type (A/R/C/O)
2. **Create a response workflow**: Request received → alex@xpat.social → 20-business-day decision → 15-business-day implementation
3. **For Cancellation requests:** Implement a "blocking" phase by flagging the user account as `cancellation_requested=true` in Supabase, then permanently delete after 30-day assessment window
4. **Acknowledge requests immediately** with an automated email confirmation including the 20-business-day response timeline
5. **Maintain a request log** (spreadsheet or Supabase table) for SACBG audit purposes

### Lawyer Needed?
**Self-serve for implementation.** Mexican counsel for any disputed ARCO request or SACBG complaint response.

---

## Topic 19: Mexico Data Security and Accountability Obligations

### What's Required
The LFPDPPP requires data controllers to:
- Implement **administrative, technical, and physical security measures** appropriate to the risk and sensitivity of the data processed
- Conduct **privacy impact assessments** (PIAs) for high-risk processing
- **Appoint a Data Privacy Officer (DPO)** or designated internal privacy contact (practically, this is the founder for a startup)
- Maintain **documentation** of data protection policies and practices
- Ensure employees with data access are trained on privacy obligations
- Report **data breaches** to the SACBG and affected users within a "reasonable time" (no specific hour clock unlike GDPR)

**Security measures required:**
- Encryption of personal data in transit (HTTPS/TLS) and at rest
- Access controls and role-based permissions (Supabase RLS)
- Audit logs for data access
- Periodic security reviews

### Risk if Ignored
- SACBG can audit security practices and impose fines for deficient controls
- Data breach without notification triggers additional sanctions

### Implementation Steps for x/pat
1. **Document security measures** — a brief security policy document noting: Supabase encryption at rest and in transit, RLS policies, JWT-based auth, no plaintext password storage
2. **Enable Supabase audit logging** for sensitive tables (profiles, messages)
3. **Supabase RLS review** (detailed in Topic 28) serves as the technical accountability measure
4. **Data breach response plan** — document the procedure: detect breach → notify alex@xpat.social within 24 hours → notify SACBG within reasonable time → notify affected users
5. **Privacy impact assessment** — for location data collection, document the PIA: what data, why, risk level, mitigation measures

### Lawyer Needed?
**Self-serve for implementation.** Mexican counsel for a data breach notification situation.

---

## Topic 20: Mexico Cross-Border Data Transfer Requirements

### What's Required
The LFPDPPP permits international data transfers but requires disclosure in the privacy notice. Unlike GDPR, the LFPDPPP **does not establish a specific adequacy framework or list of adequate countries** — it focuses on contractual protections.

**Requirements for international transfers:**
- Disclose transfers in the Privacy Notice
- The third-party recipient assumes the same level of data protection obligations as the original controller (contractual clause required)
- Transfers to third parties that will process data for their own purposes require a separate agreement

**x/pat situation:** Mexican user data flows to Supabase (US). This requires:
1. Disclosure in the Aviso de Privacidad
2. Supabase's DPA — which already includes contractual obligations

**2026 status:** The LFPDPPP 2025 reform did not add a formal cross-border adequacy mechanism. The SACBG has indicated this may be addressed in forthcoming implementing regulations. For now, contractual safeguards (Supabase DPA) and privacy notice disclosure are sufficient.

### Risk if Ignored
- Undisclosed international transfer is an independent violation
- Post-reform SACBG has all INAI's enforcement powers; may be more aggressive given the political context of the reform

### Implementation Steps for x/pat
1. **Disclose in Aviso de Privacidad:** "Sus datos personales son procesados en los Estados Unidos de América por Supabase Inc., bajo acuerdos contractuales que garantizan niveles de protección equivalentes a los de esta Ley"
2. **Sign Supabase DPA** (same DPA as GDPR/PDPA — one signing covers all three jurisdictions)
3. **Audit other data recipients** — push notification providers, analytics SDKs. Each must have contractual protections or be disclosed

### Lawyer Needed?
**Self-serve disclosure.** Mexican counsel to review the contractual adequacy approach when implementing regulations are published.

---

# SECTION 5: App Store and Play Store Requirements

## Topic 21: Apple App Store — Privacy Nutrition Labels

### What's Required
Apple requires all apps to submit **Privacy Nutrition Labels** via App Store Connect before listing. These appear on the app's product page and must accurately reflect what data is collected, why, and whether it's linked to the user's identity.

**Three data categories:**
1. **Data Used to Track You** — data linked to the user for cross-app tracking (requires ATT consent)
2. **Data Linked to You** — collected data associated with user identity in Apple's records
3. **Data Not Linked to You** — collected but not associated with user identity

**For x/pat, data to disclose includes:**
- Name, email, user ID, phone number → Linked to You
- Location (approximate/precise) → Linked to You (for spot discovery)
- Messages (private chat) → Linked to You
- Photos/media → Linked to You (profile photos, spot photos)
- User-generated content → Linked to You
- Device identifiers → depends on usage
- Crash data → may qualify as Not Linked to You if anonymized

**2025 enforcement:**
- Apple rejected 12% of App Store submissions in Q1 2025 for Privacy Manifest violations
- Labels must match actual app behavior — reviewers test with network monitoring tools

### Risk if Ignored
- App Store rejection
- Post-listing investigation if labels don't match behavior — app can be delisted
- Apple added rules in late 2025 restricting apps from sharing personal data with third-party AI without explicit disclosure and consent modal

### Implementation Steps for x/pat
1. **Audit all data collection** in the app — every Supabase write, every analytics event, every SDK initialization
2. **Complete Privacy Nutrition Labels in App Store Connect** under "App Privacy" before any build submission
3. **Update labels when adding new data collection** — any new SDK or feature that touches personal data requires a label update
4. **Review current labels for build #15** — confirm the existing labels accurately reflect Supabase auth (email, user ID), location, photos, and chat data
5. **Do not add any AI SDK** (even for moderation) without adding the third-party AI consent disclosure Apple now requires

### Lawyer Needed?
**Self-serve.** This is a technical disclosure exercise. Follow Apple Developer documentation at developer.apple.com/app-store/app-privacy-details.

---

## Topic 22: Apple App Store — Privacy Manifests and Required Reasons APIs

### What's Required
Apple requires **Privacy Manifest files** (`PrivacyInfo.xcprivacy`) for all apps and SDKs. This is enforced since May 1, 2024. The manifest must declare:

1. **NSPrivacyTracking** — true/false: does the app use data for tracking?
2. **NSPrivacyTrackingDomains** — list of tracking network domains
3. **NSPrivacyCollectedDataTypes** — categories of data collected
4. **NSPrivacyAccessedAPITypes** — "Required Reasons" APIs used, with approved reason codes

**Required Reasons APIs** are specific device APIs that Apple considers privacy-sensitive. If your app or any third-party SDK uses these APIs (file timestamps, system boot time, active keyboard list, disk space, user defaults), you must declare the approved business reason.

**Third-party SDK requirements:** All SDKs in your app must also have their own Privacy Manifests and valid code signatures (for binary dependencies). Expo/EAS, Supabase's client library, and any analytics SDK must have compliant manifests.

**2025–2026 updates:** Apple now requires specific third-party data recipient disclosure in ATT prompts — generic "tracking for ads" is insufficient; must name actual partners.

### Risk if Ignored
- App submission rejection — this is a hard technical check, not a review judgment call
- 12% rejection rate in Q1 2025 for Privacy Manifest violations

### Implementation Steps for x/pat
1. **Verify PrivacyInfo.xcprivacy exists** in the Expo/React Native project root — Expo SDK 50+ generates this file; confirm it's present and populated
2. **Audit third-party SDKs** — run `npx expo-doctor` and review the list of native SDKs; verify each has a Privacy Manifest
3. **Declare all Required Reasons APIs** — check which system APIs the app accesses and add corresponding reason codes to the manifest
4. **Sign binary SDKs** — ensure all binary framework dependencies have Apple-valid signatures (Expo manages most of this, but custom native modules need review)
5. **Test with Xcode's Privacy Report** — run a Privacy Report from Xcode to auto-detect undeclared API usage before submission

### Lawyer Needed?
**Engineering task only.** No legal review needed.

---

## Topic 23: Apple App Store — App Tracking Transparency (ATT)

### What's Required
ATT framework (iOS 14.5+) requires apps to request user permission before **tracking** them — i.e., linking user or device data from x/pat with user or device data from other companies' apps for targeted advertising.

**If x/pat does NOT use third-party advertising networks:** ATT is not required. x/pat's affiliate model does not involve tracking users across apps for ad targeting, so ATT should not apply.

**If x/pat uses any SDK that accesses IDFA (Identifier for Advertisers):** That SDK triggers ATT requirement regardless of whether x/pat itself does tracking.

**Practical check:** Any analytics or attribution SDK (Mixpanel, Amplitude, Adjust, Branch, AppsFlyer, Firebase Analytics) may access device identifiers in ways that require ATT.

**2025 ATT enforcement:** Specific data recipient names required in ATT prompt — "Share with [Partner Name] for [Purpose]" rather than generic text.

### Risk if Ignored
- App rejection if tracking occurs without ATT prompt
- Apple can audit post-submission and require updates

### Implementation Steps for x/pat
1. **Audit all third-party SDKs** for IDFA access — check SDK documentation for "advertising identifier" usage
2. **If no IDFA access:** Document this decision and include `NSUserTrackingUsageDescription` in Info.plist only if needed
3. **If any SDK accesses IDFA:** Add ATT prompt in app startup flow with specific, descriptive text naming the purpose and recipient
4. **Default configuration:** Set `trackingAuthorizationStatus` to check permission before any tracking-capable SDK initializes
5. **Affiliate links only:** x/pat's current architecture (affiliate links, no ad network integration) should require no ATT prompt — verify this before next TestFlight build

### Lawyer Needed?
**Engineering task only.**

---

## Topic 24: Google Play Store — Data Safety Section

### What's Required
Google Play requires all apps to complete a **Data Safety form** in Play Console, which generates a standardized "Data Safety" section on the app listing. This became mandatory and enforced starting 2022.

**Effective January 28, 2026,** Google's Developer Program Policies require:
- Comprehensive disclosure of access, collection, use, and sharing of personal/sensitive user data
- The privacy policy (externally hosted) must cover everything — the Data Safety section summarizes it

**What to disclose in the Data Safety form:**
- **Data collected:** Each type (location, personal info, messages, photos, app activity, device IDs, etc.)
- **Data shared:** Each type shared with third parties (not: processors acting on your behalf)
- **Security practices:** Whether data is encrypted in transit, whether users can request deletion
- **Is data collection required or optional?** For each type

**For x/pat:**
- Location: Collected, required for core feature (spot discovery), not shared with third parties for ads
- Personal info (name, email): Collected, required for account
- Messages: Collected, required for chat feature, not shared
- Photos: Collected, optional (profile photo), not shared
- Device or other identifiers: Depends on analytics SDK choice

### Risk if Ignored
- Inaccurate Data Safety disclosures trigger policy violations and potential removal
- Google cross-references declared practices against app behavior using automated testing

### Implementation Steps for x/pat
1. **Complete the Data Safety form** in Google Play Console — do this before the app goes live/public
2. **Map x/pat data flows to Google's data type categories** — use Google's interactive guide at developers.google.com/android/guides/play-data-disclosure
3. **Mark "User can request data deletion" = YES** — link to the in-app Delete Account flow or the web form
4. **Encrypt in transit = YES** (Supabase uses TLS; verify all API calls use HTTPS)
5. **Revisit form** whenever a new SDK or feature is added that changes data collection

### Lawyer Needed?
**Self-serve.** Technical disclosure exercise.

---

## Topic 25: Google Play Store — Sensitive Permissions and User-Generated Content Policy

### What's Required
Google Play's Developer Program Policy (effective January 1, 2026) introduces a new sensitive permissions requirement:

**Permissions must be necessary for core functionality** as described in the Play Store listing. You cannot request permissions for features not promoted or implemented in the current app version. Dangerous permissions (location, camera, contacts, storage, microphone) require:
- Prominent disclosure before or at the time of permission request
- Explanation of why the permission is needed
- User consent for the specific purpose

**User-Generated Content (UGC) policy:** Apps allowing users to post content (reviews, photos, comments, chat) must:
- Have a functioning content reporting/flagging mechanism
- Have a mechanism to block abusive users
- Remove content that violates guidelines when reported
- Have a moderation approach (human or automated)

**Sensitive data requirements (January 2026):**
- Apps processing sensitive user data must justify the need
- Personal or sensitive data may never be sold
- Data collected via sensitive permissions may not be used for undisclosed purposes

### Risk if Ignored
- Play Store policy violation = app suspension (immediate in some cases)
- Google has automated policy scanners that detect undisclosed permission usage
- UGC policy violations involving illegal content can result in permanent developer account termination

### Implementation Steps for x/pat
1. **Audit requested permissions vs. features:** Location (spot discovery ✓), Camera (spot photos ✓), Notification permission (push ✓). Remove any permissions not tied to active features
2. **Implement permission explanation screens** before each runtime permission request: "x/pat needs your location to show nearby spots. Your location is never shared with advertisers"
3. **Implement content reporting:** Add a "Report" button on user profiles, spots, and comments. Route to a moderation queue (even if manually reviewed by alex@xpat.social at launch)
4. **Block abusive users:** Add "Block User" functionality in the user profile screen
5. **Content moderation policy:** Document a basic moderation policy; at launch, manual review is acceptable. Automate when volume warrants

### Lawyer Needed?
**Self-serve for implementation.** Legal review of Terms of Service (covering UGC policies) is recommended — budget ~$500 for a startup-focused attorney to review the ToS.

---

# SECTION 6: Security Audit Checklist for Launch

## Topic 26: OWASP Mobile Top 10 — M1 Through M4

### What's Required
The OWASP Mobile Top 10 (2024 release) defines the most critical mobile security risks. The first four:

**M1: Improper Credential Usage**
- Hardcoded API keys, secrets, or credentials in app code
- Insecure transmission of credentials
- Storing credentials (passwords, tokens) in plaintext

*x/pat risk:* Supabase `ANON_KEY` is embedded in the client app — this is expected and safe only if RLS is properly configured. The `SERVICE_ROLE_KEY` must never appear in client code.

**M2: Inadequate Supply Chain Security**
- Unvetted third-party SDKs or libraries with hidden vulnerabilities
- Malicious code in npm packages or native dependencies
- Outdated dependencies with known CVEs

*x/pat risk:* React Native / Expo ecosystem has a broad dependency tree. Supply chain attacks via npm are an active threat.

**M3: Insecure Authentication/Authorization**
- Weak password policies
- Missing MFA for sensitive operations
- Improper session management
- Backend endpoints that don't verify auth token before executing

*x/pat risk:* Supabase auth is solid; the risk is custom backend logic (Edge Functions) that might skip auth checks.

**M4: Insufficient Input/Output Validation**
- SQL injection via unsanitized inputs
- Cross-site scripting in webviews
- Injection attacks through user-generated content fields

*x/pat risk:* Spot names, bios, and chat messages are user inputs that must be sanitized before storage and rendering.

### Risk if Ignored
- M1: Complete backend compromise via leaked service key
- M2: App store removal and reputation damage from malicious SDK
- M3: Unauthorized data access, account takeover
- M4: Data corruption, injection attacks

### Implementation Steps for x/pat
1. **M1 — Secrets audit:** Run `npx expo-env-info` and scan for any hardcoded secrets. Verify `.env` is in `.gitignore`. Confirm `SERVICE_ROLE_KEY` is server-only. Use `EXPO_PUBLIC_` prefix only for values safe to be public
2. **M2 — Dependency audit:** Run `npm audit` and `npx expo-doctor`. Review all packages with `npm outdated`. Pin dependency versions and set up Dependabot or Renovate for automated updates
3. **M3 — Auth verification:** Review every Supabase Edge Function — confirm each begins with `const { user } = await supabase.auth.getUser(token)` before any data operation. Test with an expired/invalid JWT
4. **M4 — Input sanitization:** Add server-side validation in Edge Functions for all user-provided fields. Sanitize before Supabase `insert`/`update` operations. Use parameterized queries (Supabase client does this by default — verify no raw SQL strings are used)

### Lawyer Needed?
**Engineering task only.**

---

## Topic 27: OWASP Mobile Top 10 — M5 Through M8

### What's Required

**M5: Insecure Communication**
- Data transmitted without TLS/HTTPS
- Certificate pinning absent, enabling MITM attacks
- Accepting invalid SSL certificates

*x/pat risk:* All Supabase API calls use HTTPS by default. Risk area: any custom API endpoints, webhooks, or third-party SDKs using HTTP.

**M6: Inadequate Privacy Controls**
- PII stored in app logs
- Sensitive data in crash reports
- User data accessible to developers or third parties beyond what's necessary

*x/pat risk:* Crash reporting tools (Sentry, etc.) may capture location data, user IDs, or message content in error logs.

**M7: Insufficient Binary Protections**
- App code easily reverse-engineered
- No code obfuscation
- Business logic or secrets extractable from the binary

*x/pat risk:* React Native bundles are relatively easy to inspect. The risk is that API endpoints or business logic are exposed.

**M8: Security Misconfiguration**
- Default or insecure configuration of servers, SDKs, or frameworks
- `NSAllowsArbitraryLoads = true` in iOS (disables ATS)
- Debug mode enabled in production builds
- Overly permissive CORS settings

*x/pat risk:* Expo builds may include development flags in production. Supabase project settings may have permissive CORS or anon access beyond what's needed.

### Risk if Ignored
- M5: Man-in-the-middle attacks intercepting auth tokens
- M6: Privacy violation from PII in error reports — can trigger GDPR breach notification
- M7: Competitors or bad actors extracting business logic from the app binary
- M8: Security misconfiguration is often the entry point for larger breaches

### Implementation Steps for x/pat
1. **M5 — TLS audit:** Verify all API calls in network logs use `https://`. Set `NSAllowsArbitraryLoads = false` in iOS configuration (check `app.json` / `app.config.js`). Add Android Network Security Config to disallow cleartext traffic
2. **M6 — PII in logs:** Configure Sentry (or any crash tool) to scrub location coordinates, user IDs, and message content from error payloads. Never log personal data with `console.log` in production builds — use `__DEV__` guard
3. **M7 — Obfuscation:** Enable Hermes engine (already default in Expo) — it provides some bytecode obfuscation. For the Supabase `anon` key, understand it is publicly visible by design; RLS is the protection, not key secrecy
4. **M8 — Production config review:** In Expo `eas.json`, confirm `production` profile builds use `release` mode. Review Supabase dashboard: disable any unused extensions, review CORS allowed origins (should be the app's bundle ID, not `*`), review which tables/functions are accessible to the `anon` role

### Lawyer Needed?
**Engineering task only.**

---

## Topic 28: Supabase Row Level Security (RLS) Audit

### What's Required
Supabase exposes your database directly via PostgREST API. Without proper RLS policies, the `anon` key can read or write any table. RLS is the primary security boundary for a Supabase-backed app.

**Critical RLS rules for x/pat:**

| Table | Required Policy |
|---|---|
| `profiles` | Read: anyone (public profiles) or authenticated only; Write: `auth.uid() = id` only |
| `spots` | Read: anyone; Create: authenticated only; Update/Delete: `auth.uid() = creator_id` |
| `messages` | Read: `auth.uid() = sender_id OR auth.uid() = recipient_id`; Write: `auth.uid() = sender_id` |
| `follows` | Read: authenticated; Write: `auth.uid() = follower_id` |
| `notifications` | Read/Write: `auth.uid() = user_id` only |
| `user_settings` | Read/Write: `auth.uid() = user_id` only |

**Common RLS anti-patterns to avoid:**
- Policy condition `true` (allows all) — never use in production
- Using `user_metadata` from JWT in RLS policies (users can modify their own metadata)
- Missing `WITH CHECK` clause on INSERT/UPDATE policies (allows writing to other users' rows)
- No explicit role restriction (should specify `TO authenticated` not just a `USING` clause)

**Service key:** `SERVICE_ROLE_KEY` bypasses all RLS. Must never be in client code. Store only in server-side Edge Functions via Supabase secrets.

### Risk if Ignored
- Missing or weak RLS = complete data exposure. Any user can read or write any other user's data
- This is both a security failure and a GDPR/PDPA violation (unauthorized data access = breach)

### Implementation Steps for x/pat
1. **Run RLS audit query** in Supabase SQL editor:
   ```sql
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```
   Any table with `rowsecurity = false` that contains personal data is a critical vulnerability
2. **Verify all policies have both `USING` and `WITH CHECK`** clauses where applicable
3. **Test as a non-owner user:** Create a test user in Supabase, get their JWT, and manually call the PostgREST API attempting to read another user's messages, private settings, and notifications — should return empty or 403
4. **Check Storage bucket policies** — profile photos and spot images in Supabase Storage also need access policies. Ensure buckets are not `public` unless the content is genuinely public
5. **Do not use `auth.jwt() -> user_metadata`** in RLS policies — use `auth.uid()` only
6. **Index `user_id` columns** used in RLS policies — RLS on large tables without indexes causes severe performance degradation (can see 100x improvement with index)
7. **Review anon role access** — which tables are accessible without authentication? This should be limited to: public spot listings, public profiles (if profiles are public), and nothing else

### Lawyer Needed?
**Engineering task only.** However, a discovered RLS gap that exposed user data retroactively may require legal assessment for breach notification obligations.

---

## Topic 29: JWT Security and Authentication Best Practices

### What's Required
Supabase uses JWT for authentication. x/pat is a React Native / Expo app — JWTs must be stored and managed securely on mobile devices.

**Token storage:**
- iOS: **Keychain** — the only acceptable location for refresh tokens and sensitive auth state
- Android: **EncryptedSharedPreferences** or **Android Keystore** — never plain SharedPreferences
- Expo: `expo-secure-store` wraps Keychain/Keystore — this is the correct module to use
- **Never store tokens in:** AsyncStorage (unencrypted), Redux state persisted to disk, or console logs

**Token lifecycle (Supabase defaults):**
- Access tokens: 1 hour expiry (configurable)
- Refresh tokens: 30 days (configurable)
- Supabase's `@supabase/supabase-js` v2 handles refresh automatically when using `expo-secure-store` as the storage adapter

**Token validation:**
- All API calls must send the JWT in the `Authorization: Bearer <token>` header
- Edge Functions must validate the JWT before processing: use `supabase.auth.getUser(token)` not `supabase.auth.getSession()` for server-side validation (sessions are client-side and can be manipulated)
- Algorithm: Supabase uses RS256 by default — do not downgrade to `none` algorithm

**Refresh token rotation:**
- Enable **refresh token rotation** in Supabase Auth settings — each refresh generates a new refresh token, preventing replay attacks with stolen old tokens

**2025 best practices:**
- Access token expiry: 15 minutes is ideal; Supabase default of 1 hour is acceptable for mobile
- Use EdDSA or ES256 if customizing signing algorithms (more quantum-resistant)
- Implement rate limiting on auth endpoints (Supabase has built-in protections; verify they're enabled)

### Risk if Ignored
- Stolen JWT stored in AsyncStorage = persistent account compromise
- No refresh token rotation = stolen refresh token = indefinite access without reauthentication
- Server-side session validation bypass = auth bypass in Edge Functions

### Implementation Steps for x/pat
1. **Verify `expo-secure-store` is used** as the Supabase client storage adapter in the Supabase client initialization file
2. **Enable refresh token rotation** in Supabase Dashboard → Authentication → Settings → JWT Settings
3. **Audit Edge Functions** — every function that performs data operations must call `supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))` and validate the returned user before proceeding
4. **Set appropriate token expiry** — confirm the Supabase project's JWT expiry is set (Dashboard → Authentication → Settings). Recommended: 3600 seconds (1 hour) for access tokens
5. **Implement token refresh handling** in the React Native app — Supabase JS client handles this automatically when `expo-secure-store` is the storage adapter; verify `onAuthStateChange` listener is active
6. **Rate limiting:** Supabase has built-in auth rate limiting — review Dashboard → Authentication → Rate Limits and set appropriate values for OTP, signup, and login attempts
7. **Test expired token behavior** — manually expire a token and verify the app gracefully re-authenticates rather than crashing or exposing data

### Lawyer Needed?
**Engineering task only.** Legal review required only if a token compromise incident leads to a data breach.

---

## Topic 30: Comprehensive Security Launch Checklist

### What's Required
A final pre-launch security and compliance audit covering all critical systems:

**Authentication & Access Control**
- [ ] All Supabase tables have RLS enabled
- [ ] All RLS policies tested with non-owner user tokens
- [ ] `SERVICE_ROLE_KEY` absent from all client-side code and git history
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` confirmed to be the anon key only (not service key)
- [ ] Refresh token rotation enabled in Supabase
- [ ] `expo-secure-store` confirmed as JWT storage adapter
- [ ] Edge Functions validate JWT before data operations
- [ ] Rate limiting enabled on Supabase auth endpoints

**Data Protection & Privacy**
- [ ] Supabase DPA signed
- [ ] Privacy policy published at stable URL (xpat.social/privacy)
- [ ] Aviso de Privacidad published in Spanish (xpat.social/aviso-de-privacidad)
- [ ] Privacy policy linked from: App Store listing, Play Store listing, app Settings screen
- [ ] Consent records table in Supabase storing user consent decisions
- [ ] "Delete My Account" feature implemented with full cascade deletion
- [ ] Data export (portability) function implemented
- [ ] Data request intake form live at xpat.social/privacy-request
- [ ] No PII logged in production crash reporting

**Mobile App Store Compliance**
- [ ] Apple Privacy Nutrition Labels completed in App Store Connect
- [ ] `PrivacyInfo.xcprivacy` manifest present and complete
- [ ] Required Reasons APIs declared with approved reason codes
- [ ] ATT prompt absent (if no cross-app tracking) or implemented (if any IDFA access)
- [ ] Google Play Data Safety form completed
- [ ] All runtime permission requests have explanation screens

**Network & Transport Security**
- [ ] All API calls use HTTPS — no HTTP fallback in production
- [ ] `NSAllowsArbitraryLoads = false` in iOS config
- [ ] Android Network Security Config disallows cleartext
- [ ] CORS restricted to app bundle ID in Supabase (not `*`)

**Dependency & Supply Chain**
- [ ] `npm audit` run — no critical/high vulnerabilities unaddressed
- [ ] All dependencies pinned to specific versions
- [ ] No direct usage of packages with known active CVEs
- [ ] Third-party SDKs reviewed for Privacy Manifests (iOS)

**Content Safety**
- [ ] Report button on user profiles, spots, and comments
- [ ] Block user functionality implemented
- [ ] Content moderation process documented (even if manual at launch)
- [ ] Terms of Service includes acceptable use policy and content guidelines

**Incident Response**
- [ ] Data breach response procedure documented
- [ ] GDPR: 72-hour supervisory authority notification process defined
- [ ] Thailand PDPA: PDPC notification process defined
- [ ] Contact established with privacy attorney for breach response
- [ ] Supabase project monitoring alerts enabled (Dashboard → Reports)

**Compliance Documentation**
- [ ] Record of Processing Activities (RoPA) completed
- [ ] Legitimate Interest Assessments (LIA) written for crash analytics
- [ ] Privacy Impact Assessment (PIA) for location data
- [ ] Supabase DPA signed and stored
- [ ] Consent records table populated and queryable

### Risk if Ignored
A single unchecked item — particularly an RLS misconfiguration, exposed service key, or missing DPA — can trigger a multi-jurisdictional data breach with notification obligations across EU (72 hours), Thailand, and Mexico simultaneously.

### Lawyer Needed?
**Legal review before launch strongly recommended:** A 2-hour review with a privacy attorney covering GDPR and one of the other jurisdictions will cost ~$400–800 and will identify any gaps in the policy documents. This is one of the highest-ROI legal investments available at pre-launch stage.

---

# Summary: Compliance Priorities by Urgency

## Must Complete Before Launch (Blocking)

| # | Action | Effort | Cost |
|---|---|---|---|
| 1 | Sign Supabase DPA | 10 min | Free |
| 2 | Publish English privacy policy | 2 hrs | $29–99/yr (generator) |
| 3 | Complete Apple Privacy Nutrition Labels | 1 hr | Free |
| 4 | Complete Google Play Data Safety form | 1 hr | Free |
| 5 | RLS audit — run audit query, test with non-owner JWT | 4 hrs | Free |
| 6 | Verify `expo-secure-store` is JWT storage adapter | 30 min | Free |
| 7 | Add "Delete My Account" with cascade deletion | 4–8 hrs | Dev time |
| 8 | Verify `SERVICE_ROLE_KEY` absent from client code | 1 hr | Free |
| 9 | Add content reporting/blocking (Play Store UGC policy) | 8 hrs | Dev time |
| 10 | Publish Terms of Service | 2 hrs | $29–99/yr or free template |

## Complete Within 30 Days of Launch

| # | Action | Effort | Cost |
|---|---|---|---|
| 11 | Spanish Aviso de Privacidad | 2 hrs + legal review | $200–400 |
| 12 | Consent management screen (granular, per-purpose) | 8 hrs | Dev time |
| 13 | Consent records table in Supabase | 2 hrs | Free |
| 14 | Data export (portability) function | 4 hrs | Dev time |
| 15 | Privacy request intake form | 2 hrs | Free |
| 16 | Thai-language privacy notice section | 2 hrs + translation | $100–200 |
| 17 | GDPR/PDPA/LFPDPPP privacy attorney review | 2 hrs | $400–800 |

## Strategic / Scale Considerations

| # | Action | When |
|---|---|---|
| 18 | Migrate EU users to Supabase `eu-west-1` region | When EU users reach 1,000+ |
| 19 | Migrate Thai users to Supabase `ap-southeast-1` | When Thai users reach 1,000+ |
| 20 | Full CCPA compliance buildout | When California users approach 75,000 |
| 21 | Appoint formal DPO or privacy counsel retainer | At Series A or 50,000+ users |
| 22 | SOC 2 Type II audit | At enterprise/B2B ambitions |

---

# Jurisdiction Quick Reference

| Jurisdiction | Regulator | Max Fine | Lawyer Required? | Key Requirement for x/pat |
|---|---|---|---|---|
| EU/Portugal (GDPR) | CNPD (Portugal) | €20M / 4% revenue | Yes (pre-launch review) | Supabase DPA + SCC, consent screen, privacy policy, erasure |
| USA/California (CCPA) | CPPA | $7,500/violation | No (below threshold now) | Monitor user count; no sell/share statement |
| Thailand (PDPA) | PDPC | THB 5M (~$145K) | Yes (Thai local counsel) | Consent screen, Thai notice, cross-border transfer disclosure |
| Mexico (LFPDPPP) | SACBG | ~$1.5M | Yes (Mexican counsel) | Spanish Aviso de Privacidad, ARCO rights response |

---

*Sources used in this research:*
- [GDPR Compliance for Mobile Apps (2026 Guide) — SecurePrivacy](https://secureprivacy.ai/blog/gdpr-compliance-mobile-apps)
- [GDPR.eu — Official GDPR Text and Guidance](https://gdpr.eu/)
- [GDPR Article 17 — Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [GDPR Article 20 — Right to Data Portability](https://gdpr-info.eu/art-20-gdpr/)
- [EDPB — Respect Individuals' Rights](https://www.edpb.europa.eu/sme-data-protection-guide/respect-individuals-rights_en)
- [EDPB — International Data Transfers](https://www.edpb.europa.eu/sme-data-protection-guide/international-data-transfers_en)
- [Supabase DPA](https://supabase.com/legal/dpa)
- [Supabase Transfer Impact Assessment](https://supabase.com/downloads/docs/Supabase+TIA+250314.pdf)
- [CCPA — California AG Official Page](https://oag.ca.gov/privacy/ccpa)
- [CCPA Regulations Effective January 1, 2026](https://cppa.ca.gov/regulations/pdf/ccpa_statute_eff_20260101.pdf)
- [CCPA in 2026: New Requirements — OneTrust](https://www.onetrust.com/blog/ccpa-in-2026-whats-changing-in-consent-consumer-rights-and-ai-governance/)
- [Revised CCPA Regulations Effective Jan 1 2026 — Greenberg Traurig](https://www.gtlaw.com/en/insights/2025/9/revised-and-new-ccpa-regulations-set-to-take-effect-on-jan-1-2026-summary-of-near-term-action-items)
- [CCPA for Mobile Apps — Feroot Security](https://www.feroot.com/blog/ccpa-mobile-apps-sdk-compliance/)
- [Thailand PDPA 2025 Guide — Cookie Information](https://cookieinformation.com/what-is-the-thailand-pdpa/)
- [Thailand PDPA Crackdown 2025 — DLA Piper](https://privacymatters.dlapiper.com/2025/09/thailand-pdpa-crackdown-2025-are-you-next-major-fines-and-lessons-from-thailands-latest-enforcement/)
- [Thailand PDPA — Data Protection Laws of the World](https://www.dlapiperdataprotection.com/index.html?t=law&c=TH)
- [Thailand Cross-Border Transfer — Baker McKenzie](https://insightplus.bakermckenzie.com/bm/data-technology/thailand-new-cross-border-data-transfer-rules-officially-published-as-law)
- [Mexico LFPDPPP 2025 — White & Case](https://www.whitecase.com/insight-alert/mexico-enacts-new-data-protection-regime)
- [Mexico New Data Protection Regime 2025 — Greenberg Traurig](https://www.gtlaw.com/en/insights/2025/3/nueva-ley-general-proteccion-de-datos)
- [Mexico LFPDPPP — CookieYes](https://www.cookieyes.com/blog/mexico-data-privacy-law-lfpdppp/)
- [Mexico ARCO Rights — DSN Group](https://www.dsn-group.com/special-markets/mexico/understanding-data-subject-rights-in-mexico)
- [Mexico Data Protection 2025–2026 — ICLG](https://iclg.com/practice-areas/data-protection-laws-and-regulations/mexico)
- [Apple App Privacy Details — Apple Developer](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple Privacy Manifest Files — Apple Developer Documentation](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Apple ATT Framework — Apple Developer Documentation](https://developer.apple.com/documentation/apptrackingtransparency)
- [Apple App Store Review Guidelines 2026 — The App Launchpad](https://theapplaunchpad.com/blog/app-store-review-guidelines)
- [Apple New Rules on Third-Party AI Data Sharing — TechCrunch](https://techcrunch.com/2025/11/13/apples-new-app-review-guidelines-clamp-down-on-apps-sharing-personal-data-with-third-party-ai/)
- [Google Play Data Safety Section — Play Console Help](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play Developer Program Policy — January 28, 2026](https://support.google.com/googleplay/android-developer/answer/16810878)
- [Google Play Sensitive Permissions — Play Console Help](https://support.google.com/googleplay/android-developer/answer/16558241)
- [OWASP Mobile Top 10 2024 — OWASP Foundation](https://owasp.org/www-project-mobile-top-10/2023-risks/)
- [OWASP Mobile Top 10 2024 Guide — Indusface](https://www.indusface.com/blog/owasp-mobile-top-10-2024/)
- [OWASP Mobile Security Checklist](https://mas.owasp.org/checklists/)
- [Supabase Row Level Security — Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Security Checklist — CyberChecker](https://www.cyber-checker.com/blog/supabase-security-checklist)
- [JWT Best Practices 2025 — JWT.app](https://jwt.app/blog/jwt-best-practices/)
- [Secure Token Storage for Mobile — Capgo](https://capgo.app/blog/secure-token-storage-best-practices-for-mobile-developers/)
- [EU-US Data Transfers 2025 — Coblentz Law](https://www.coblentzlaw.com/eu-u-s-data-transfers-in-2025/)
- [EU Adequacy Decisions 2026 — Recording Law](https://www.recordinglaw.com/world-laws/world-data-privacy-laws/eu-adequacy-decisions/)
