# SVP Verification Report: Technical & Compliance Research
## x/pat -- Independent Verification of VP Research Claims

**Verified by:** SVP Research & Intelligence  
**Date:** April 8, 2026  
**Reports Reviewed:**
1. `performance-scaling-benchmarks-2026.md`
2. `regulatory-compliance-global-2026.md`
3. `trust-safety-moderation-2026.md`
4. `ios18-android15-native-features-2026.md`

**Methodology:** Each flagged claim was independently verified against primary sources (official documentation, statute text, vendor pricing pages, engineering blog posts, Federal Register entries). Verdicts: VERIFIED, CORRECTED, UNVERIFIABLE, or NEW DATA.

---

## 1. Performance & Technical Claims

### 1.1 "New Architecture: 43% faster cold starts, 39% faster rendering, 26% lower memory" (attributed to Shopify production)

**Verdict: UNVERIFIABLE as direct Shopify data -- likely third-party extrapolation**

- Shopify Engineering published "Migrating to React Native's New Architecture (2025)" at `shopify.engineering/react-native-new-architecture` and "Five years of React Native at Shopify (2025)" at `shopify.engineering/five-years-of-react-native-at-shopify`.
- Neither blog post contains the specific figures "43%", "39%", or "26%." Shopify's posts discuss qualitative improvements (synchronous layouts, TurboModules, smoother screen loads) but do not publish these exact percentages.
- The "43%/39%/26%" numbers appear in third-party aggregation blogs (agilesoftlabs.com, isynbus.com, adevs.com) that cite "Shopify production" without linking to a specific Shopify source. These blogs appear to extrapolate or conflate data from the React Native Working Group discussion (#85 on GitHub `reactwg/react-native-new-architecture`).
- The Amazon AppDev article on DEV.to discusses New Architecture performance gains in general terms but does not cite Shopify-specific percentages either.
- **Risk for x/pat:** The figures are plausible and directionally correct, but attributing them as "Shopify production data" is inaccurate. The reports should cite them as "industry benchmarks from third-party analysis of New Architecture migrations" or cite the specific third-party blog.

### 1.2 "Hermes bytecode diffing = 75% smaller OTA updates"

**Verdict: VERIFIED -- with important caveats**

- Expo's official SDK 55 announcement (expo.dev/changelog/sdk-55) and blog post "Ship smaller OTA updates: bundle diffing comes to EAS Update in SDK 55" confirm the 75% figure.
- Expo's own X/Twitter account states: "75% smaller update downloads with Hermes bytecode diffing."
- The mechanism uses bsdiff algorithm on Hermes bytecode, serving binary patches instead of full bundles.
- **Caveats the reports omit:**
  - This is **opt-in in SDK 55** (not enabled by default). Must add `enableBsdiffPatchSupport` to app.json. Will be default in SDK 56.
  - Devices must already be running a published update to receive a patch (first install gets full bundle).
  - EAS Update only precomputes patches against the second-newest update; other patches are generated on demand.
  - Patches are only served when meaningfully smaller than the full bundle.

### 1.3 "expo-widgets is alpha in SDK 55"

**Verdict: VERIFIED**

- Expo SDK 55 changelog and `docs.expo.dev/versions/v55.0.0/sdk/widgets/` confirm expo-widgets shipped as alpha in SDK 55.
- iOS home screen widgets and Live Activities are supported using @expo/ui components.
- The library is explicitly marked "currently in alpha and subject to breaking changes."
- Not available in Expo Go; requires development builds.
- **Note:** The report claims "stable release targeted for mid-2026." This is plausible based on Expo's stated trajectory but is not a firm commitment from Expo. Treat as estimated, not guaranteed.

### 1.4 "Apple Zoom Transition available in Expo Router v7"

**Verdict: VERIFIED -- with version naming correction**

- Expo documentation at `docs.expo.dev/router/advanced/zoom-transition/` confirms the feature exists.
- Expo's blog post "Expo Router v55: more native navigation, more powerful web" details the feature.
- The zoom transition leverages iOS 18+ native UIKit zoom transition API via `Link.AppleZoom` and `Link.AppleZoomTarget` components.
- **Correction:** The feature is described as **alpha** (iOS only, Expo SDK 55+). The reports present it as production-ready, which is misleading. The Expo docs explicitly state "This is an alpha API."
- **Naming note:** Expo Router is versioned as "v55" (matching SDK 55), not "v7." The report's reference to "Expo Router v7" appears in Evan Bacon's X posts as an informal version number, but official docs use the SDK-aligned version. Both refer to the same release.

### 1.5 "React 19.2 Activity component"

**Verdict: VERIFIED -- stable, with one correction**

- React 19.2 released October 1, 2025 (react.dev/blog/2025/10/01/react-19-2).
- The `<Activity>` component is confirmed stable and production-ready.
- Supports `visible` and `hidden` modes. Hidden mode unmounts effects and defers updates.
- **Correction:** The report pairs `<Activity>` with `useEffectEvent` as if both are stable. Multiple sources confirm `useEffectEvent` remains **experimental** (may change). Only `<Activity>` is stable. The report should not recommend adopting `useEffectEvent` in production without noting its experimental status.

### 1.6 "Edge-to-edge mandatory in Android 16 / SDK 55"

**Verdict: VERIFIED**

- Android 16 (API 36): `R.attr#windowOptOutEdgeToEdgeEnforcement` is deprecated and disabled. Apps cannot opt out.
- Expo SDK 55 changelog confirms: "edge-to-edge is mandatory on Android" and `edgeToEdgeEnabled` app.json property has no effect.
- `expo-navigation-bar` methods are deprecated and no-op'd.
- Expo blog post "Edge-to-Edge display, now streamlined for Android" provides migration guidance.

### 1.7 "expo-blur Android stable in SDK 55"

**Verdict: VERIFIED**

- Expo SDK 55 changelog and BlurView documentation confirm: expo-blur now uses the RenderNode API on Android 12+, making blur stable on Android.
- Previously hidden behind `experimentalBlurMethod`; now production-ready.
- **Important detail the reports omit:** API changes are required -- developers must use a `<BlurTargetView>` wrapper for blurrable background content. This is not a drop-in upgrade; code changes are needed. The report says "Low effort" for implementation, which is slightly misleading.

---

## 2. Supabase Pricing & Infrastructure Claims

### 2.1 "Supabase free tier: 200 concurrent realtime connections"

**Verdict: VERIFIED**

- Supabase Realtime Pricing docs and troubleshooting docs confirm: Free plan = 200 peak realtime connections.
- Pro plan = 500 peak realtime connections included, then $10 per 1,000 additional peak connections.
- This is a point-in-time limit (not cumulative). When you drop below 200, connections work again.

### 2.2 "Supabase Pro is $25/mo"

**Verdict: VERIFIED**

- supabase.com/pricing confirms: Pro plan = $25/month.
- Team plan = $599/month (also correctly stated in the report).
- Pro includes 100K MAUs, 8 GB database, 100 GB file storage, 250 GB egress, 500 realtime peak connections, 5M realtime messages.
- **Note:** The report states "100,000 MAU (then $0.00325/user)" which is confirmed correct.

### 2.3 Cost projections ($25/mo at 1K MAU to $630-950/mo at 100K MAU)

**Verdict: VERIFIED -- reasonable range, methodology sound**

- At 1K MAU: $25 base Pro plan is correct. All usage within included limits.
- At 100K MAU: Supabase alone at $500-700 is consistent with third-party analyses. Metacto and Design Revision both estimate $630/mo for a growing app at 100K MAU with 200GB DB and 5TB bandwidth.
- The total $630-950/mo including CDN ($50-100), monitoring ($80-150), and push ($0) is arithmetically consistent.
- **Caveat:** The actual cost depends heavily on database size, bandwidth, and compute add-ons. A lean 100K MAU app could cost less; a media-heavy one could cost more. The range is reasonable but could vary +/- 30%.

---

## 3. Legal & Regulatory Claims

### 3.1 "REPORT Act fines $600K per violation"

**Verdict: CORRECTED -- $600K is for initial violation only, and context matters**

- 18 U.S.C. 2258A(e), as amended by the REPORT Act (P.L. 118-59, signed May 7, 2024):
  - **First violation:** Up to $850,000 (providers with 100M+ MAU) or **$600,000** (providers under 100M MAU)
  - **Subsequent violations:** Up to $1,000,000 (100M+ MAU) or **$850,000** (under 100M MAU)
- The report's "$600,000 per violation" is correct **only for the first violation** by a provider under 100M MAU. Subsequent violations are $850,000. The report should specify "initial violation" and note the escalation.
- **Prior to the REPORT Act:** The fines were $150,000 (first) and $300,000 (subsequent). The REPORT Act quadrupled them.
- The fine applies to **knowing and willful** failure to report. Accidental failure to detect is not subject to this penalty.

### 3.2 "Apple requires iOS 26 SDK for builds after April 28, 2026"

**Verdict: VERIFIED**

- Apple Developer News (developer.apple.com/news/?id=ueeok6yw) confirms: "Starting April 28, 2026, apps uploaded to App Store Connect need to be built with the iOS 26 & iPadOS 26 SDK or later."
- This applies to new submissions and updates, not existing apps already on the store.
- **Critical operational note:** x/pat must verify that Expo SDK 55 produces builds with iOS 26 SDK, or plan an SDK upgrade before this deadline. If Expo SDK 55 uses Xcode 17 (which ships iOS 26 SDK), this should be satisfied. Verify in EAS Build configuration.

### 3.3 "COPPA updates April 22, 2026 deadline"

**Verdict: VERIFIED**

- Federal Register document 2025-05904, published April 22, 2025: "Children's Online Privacy Protection Rule" final amendments.
- Amendments took effect June 23, 2025 (60 days after publication).
- **Compliance deadline: April 22, 2026** for most new requirements.
- Key changes confirmed: expanded definition of personal information (biometric identifiers, geolocation, behavioral data), separate consent for third-party sharing, mandatory written information security program, mandatory data retention policy.
- **Action for x/pat:** With the deadline 14 days away, verify that the 13+ age gate combined with COPPA-ready infrastructure is sufficient. If any user under 13 gains access, full COPPA compliance is required.

### 3.4 "NCMEC registration required before photo uploads" (18 U.S.C. 2258A)

**Verdict: CORRECTED -- registration is not a statutory prerequisite to accepting uploads**

- 18 U.S.C. 2258A requires providers to **report** apparent CSAM to NCMEC's CyberTipline upon obtaining **actual knowledge**. The statute does not require pre-registration before accepting user uploads.
- However, the practical requirement is clear: you cannot file a CyberTipline report if you have not established a reporting relationship with NCMEC. So while not technically a legal prerequisite, registering with NCMEC before accepting photo uploads is **strongly advisable** as a matter of operational readiness.
- The trust-safety report states it more strongly: "Register with NCMEC CyberTipline -- Legal requirement, do before any user uploads photos." This is a reasonable operational recommendation but overstates the statutory requirement. The legal duty is to **report** when you become aware, not to register before accepting uploads.
- **Proactive scanning** (PhotoDNA, etc.) is NOT required by 18 U.S.C. 2258A. The duty to report arises upon "actual knowledge." However, the REPORT Act and Google Play's Child Safety Standards Policy create strong incentives to deploy detection technology.

### 3.5 "EU Digital Services Act requirements for small platforms" -- verify thresholds

**Verdict: VERIFIED with clarification**

- The DSA defines micro/small enterprises using the EU SME definition: fewer than 50 employees AND annual turnover/balance sheet not exceeding 10 million EUR.
- Small platforms are **exempt from**: transparency reporting, internal complaint-handling system requirements, reporting to the DSA Transparency Database.
- Small platforms **must still**: allow users to report illegal content, act swiftly to remove illegal content after notification, provide statement of reasons when removing content, cooperate with authorities on removal orders.
- The regulatory compliance report correctly identifies the threshold and exemptions.
- **Clarification:** The exemption is from the EU SME Recommendation definition, not a DSA-specific threshold. The 45M EU monthly active user threshold applies to "Very Large Online Platforms" (VLOPs), which is a separate category with much more stringent obligations.

### 3.6 "Mexico new LFPDPPP enacted March 2025"

**Verdict: VERIFIED**

- White & Case, Hunton, Greenberg Traurig, Hogan Lovells, and Baker McKenzie all confirm: Mexico's new LFPDPPP was published in the Federal Official Gazette on March 20, 2025, entering into force on March 21, 2025.
- Key changes confirmed: expanded scope to include data processors, data minimization principle, ARCO rights extended to automated decision-making, enforcement transferred to Secretariat of Anti-Corruption and Good Governance (SABG).
- **Note:** The report correctly states that implementing regulations had not yet been published as of early 2026 and that SABG initiated stakeholder dialogues in January 2026.

### 3.7 "Thailand issued THB 21.5M in PDPA fines August 2025"

**Verdict: VERIFIED**

- Multiple law firms (Hogan Lovells, Tilleke & Gibbins, DLA Piper, Nagashima Ohno & Tsunematsu) confirm: On August 1, 2025, Thailand's PDPC announced eight administrative fines across five cases totaling approximately THB 21.5 million (approximately USD 654,690).
- Cases involved a state agency, private hospital, technology retailer (THB 7M fine), toy retailer, and cosmetics company.
- The fines represent the PDPC's shift from awareness-building to active enforcement.
- The report's mention of the "November 2025 iris scanning case" is referenced in the Chambers 2026 practice guide but was not independently verified with a specific fine amount in this search. The report should add a source citation for the iris scanning case specifically.

---

## 4. Additional Corrections & Observations

### 4.1 Guideline Citation Error

The regulatory compliance report correctly notes that Apple's "Coming Soon" placeholder rejection falls under **Guideline 2.1 (App Completeness)**, not Guideline 4.2. This is an important correction over the MEMORY.md file, which references "Apple Guideline 4.2 rejection risk." **MEMORY.md should be updated.**

### 4.2 Perspective API Sunsetting

The trust-safety report states "Google/Jigsaw is sunsetting Perspective API on December 31, 2026." This was not independently verified in this round but is a significant claim. If accurate, the recommendation to avoid Perspective API integration and use OpenAI Moderation API instead is sound.

### 4.3 Report Act Signed Date

The trust-safety report states "REPORT Act (signed May 2024)." Wikipedia and legislative databases confirm: REPORT Act (P.L. 118-59) was signed May 7, 2024. Verified.

### 4.4 Expo Router Version Naming

The ios18-android15 report consistently uses "Expo Router v7" while the official Expo blog uses "Expo Router v55" (matching SDK 55). Both names circulate in the ecosystem. Evan Bacon (Expo Router creator) uses "v7" informally on X, while official Expo docs use "v55." The report should pick one and note the alias.

### 4.5 useEffectEvent Stability

The ios18-android15 report recommends `useEffectEvent` without noting it is still **experimental** in React 19.2. Only `<Activity>` graduated to stable. This should be flagged before any production adoption.

---

## 5. NEW DATA (Not in Original Reports)

### 5.1 Hermes Bytecode Diffing Requires Opt-In

The performance report presents Hermes bytecode diffing as an automatic benefit. It requires explicitly adding `enableBsdiffPatchSupport` to app.json in SDK 55. Default behavior in SDK 56.

### 5.2 expo-blur Requires API Migration

expo-blur stability on Android comes with a required API change: `<BlurTargetView>` wrapper. The ios18-android15 report rates this as "Low effort" but developers must refactor blur usage, not just upgrade the package.

### 5.3 REPORT Act Fine Escalation

First violation: $600K (under 100M MAU). Second+ violations: $850K. The reports cite only the $600K figure, understating repeat-violation exposure.

### 5.4 Apple Zoom Transition is Alpha

The ios18-android15 report recommends immediate adoption of Apple Zoom Transition without noting its alpha status. Expo docs explicitly mark it as alpha. Production use carries risk of breaking changes.

### 5.5 COPPA Deadline is 14 Days Away

The April 22, 2026 compliance deadline is imminent. The regulatory report correctly identifies this but does not flag the urgency. With 14 days remaining, any COPPA-adjacent features (age gate robustness, data handling for users who may be under 13) should be reviewed immediately.

### 5.6 Supabase Realtime Messages Pricing

The performance report states "2M/mo" for free tier and "5M/mo" for Pro, with pricing at $2.50 per 1M messages beyond quota. This was confirmed on supabase.com/docs/guides/realtime/pricing. At scale with city chat, message volume could become a significant cost driver beyond connection counts.

---

## 6. Summary Scorecard

| # | Claim | Verdict | Severity |
|---|-------|---------|----------|
| 1 | Shopify 43%/39%/26% New Architecture gains | UNVERIFIABLE as Shopify data | Medium -- numbers plausible but misattributed |
| 2 | Hermes bytecode diffing = 75% smaller OTA | VERIFIED (with caveats) | Low |
| 3 | expo-widgets alpha in SDK 55 | VERIFIED | None |
| 4 | Apple Zoom Transition in Expo Router v7 | VERIFIED (alpha, not stable) | Medium -- risk if adopted in production |
| 5 | React 19.2 Activity component | VERIFIED (stable) | None |
| 6 | Edge-to-edge mandatory Android 16/SDK 55 | VERIFIED | None |
| 7 | Supabase free tier 200 concurrent connections | VERIFIED | None |
| 8 | Supabase Pro $25/mo | VERIFIED | None |
| 9 | REPORT Act fines $600K | CORRECTED -- first violation only | Medium -- underestimates repeat fines |
| 10 | Apple requires iOS 26 SDK after April 28 | VERIFIED | None |
| 11 | COPPA April 22, 2026 deadline | VERIFIED | High -- 14 days away |
| 12 | NCMEC registration required before uploads | CORRECTED -- advisable, not statutory | Low |
| 13 | DSA small platform thresholds | VERIFIED | None |
| 14 | Mexico LFPDPPP March 2025 | VERIFIED | None |
| 15 | Thailand THB 21.5M PDPA fines Aug 2025 | VERIFIED | None |
| 16 | expo-blur Android stable SDK 55 | VERIFIED (requires API changes) | Low |
| 17 | Cost projections $25-$950 at 100K MAU | VERIFIED (reasonable range) | None |
| 18 | useEffectEvent stable | CORRECTED -- still experimental | Medium |

**Overall Assessment:** 11 VERIFIED, 3 VERIFIED WITH CAVEATS, 3 CORRECTED, 1 UNVERIFIABLE. The research is directionally sound with no critical errors. The corrections are mostly precision issues (misattribution, missing experimental status labels, incomplete fine schedules) rather than factual falsehoods. The COPPA deadline urgency is the most actionable finding.

---

## Sources

- [Shopify: Migrating to React Native's New Architecture](https://shopify.engineering/react-native-new-architecture)
- [Shopify: Five Years of React Native](https://shopify.engineering/five-years-of-react-native-at-shopify)
- [React Native New Architecture Discussion #85](https://github.com/reactwg/react-native-new-architecture/discussions/85)
- [Expo: Ship smaller OTA updates (SDK 55)](https://expo.dev/blog/ship-smaller-ota-updates-bundle-diffing-comes-to-ota-updates-in-sdk-55)
- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55)
- [Expo Widgets Documentation](https://docs.expo.dev/versions/v55.0.0/sdk/widgets/)
- [Expo: Zoom Transition Documentation](https://docs.expo.dev/router/advanced/zoom-transition/)
- [Expo Router v55 Blog Post](https://expo.dev/blog/expo-router-v55-more-native-navigation-more-powerful-web)
- [React 19.2 Release Blog](https://react.dev/blog/2025/10/01/react-19-2)
- [LogRocket: React 19.2 Activity API](https://blog.logrocket.com/react-19-2-is-here/)
- [Expo: Edge-to-Edge Display on Android](https://expo.dev/blog/edge-to-edge-display-now-streamlined-for-android)
- [Expo BlurView Documentation](https://docs.expo.dev/versions/latest/sdk/blur-view/)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing)
- [Supabase Realtime Limits](https://supabase.com/docs/guides/realtime/limits)
- [18 U.S.C. 2258A (Cornell LII)](https://www.law.cornell.edu/uscode/text/18/2258A)
- [REPORT Act -- Wikipedia](https://en.wikipedia.org/wiki/REPORT_Act)
- [REPORT Act -- WarrantBuilder](https://warrantbuilder.com/report_act/)
- [Apple: Upcoming SDK Minimum Requirements](https://developer.apple.com/news/?id=ueeok6yw)
- [Federal Register: COPPA Rule Update (2025-05904)](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)
- [Toy Association: COPPA Deadline April 22](https://www.toyassociation.org/PressRoom2/News/2026-News/updated-coppa-rule-requirements-take-effect-april-22.aspx)
- [EU Digital Services Act -- European Commission](https://digital-strategy.ec.europa.eu/en/policies/digital-services-act)
- [White & Case: Mexico New Data Protection Regime](https://www.whitecase.com/insight-alert/mexico-enacts-new-data-protection-regime)
- [Tilleke & Gibbins: Thailand PDPA Fines](https://www.tilleke.com/insights/more-than-a-warning-eight-serious-fines-imposed-in-thai-data-protection-cases/)
- [DLA Piper: Thailand PDPA Crackdown 2025](https://privacymatters.dlapiper.com/2025/09/thailand-pdpa-crackdown-2025-are-you-next-major-fines-and-lessons-from-thailands-latest-enforcement/)
- [AgileSoftLabs: New Architecture Migration Guide 2026](https://www.agilesoftlabs.com/blog/2026/03/react-native-new-architecture-migration)
- [Metacto: Supabase True Cost Breakdown](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)
