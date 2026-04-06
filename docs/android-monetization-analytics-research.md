# Android Monetization, Analytics & Business Intelligence Research

Compiled April 6, 2026 for x/pat (Aych Holdings LLC)
Stack: React Native 0.83 / Expo SDK 55 / Supabase / EAS Build

---

## Table of Contents

1. [Affiliate Link Handling on Android](#1-affiliate-link-handling-on-android)
2. [In-App Browser for Affiliate Clicks](#2-in-app-browser-for-affiliate-clicks)
3. [Cookie/Session Tracking for Affiliate Attribution](#3-cookiesession-tracking-for-affiliate-attribution)
4. [Google AdMob on Android](#4-google-admob-on-android)
5. [Google Ad Manager vs AdMob](#5-google-ad-manager-vs-admob)
6. [Android Ad Mediation](#6-android-ad-mediation)
7. [Privacy Sandbox on Android](#7-privacy-sandbox-on-android)
8. [Advertising ID Deprecation](#8-advertising-id-deprecation)
9. [PostHog Android SDK](#9-posthog-android-sdk)
10. [Mixpanel vs Amplitude vs PostHog](#10-mixpanel-vs-amplitude-vs-posthog)
11. [Google Analytics 4 on Android](#11-google-analytics-4-on-android)
12. [User Property Tracking](#12-user-property-tracking)
13. [A/B Testing Frameworks](#13-ab-testing-frameworks)
14. [Funnel Analysis](#14-funnel-analysis)
15. [Cohort Analysis](#15-cohort-analysis)
16. [Heatmap & Session Recording](#16-heatmap--session-recording)
17. [Revenue Attribution](#17-revenue-attribution)
18. [Deep Link Conversion Tracking](#18-deep-link-conversion-tracking)
19. [Play Store Conversion Analytics](#19-play-store-conversion-analytics)
20. [User Segmentation for Push Targeting](#20-user-segmentation-for-push-targeting)
21. [ARPU/LTV Calculation](#21-arpultv-calculation)
22. [Subscription Analytics](#22-subscription-analytics)
23. [Google Play Billing Library](#23-google-play-billing-library)
24. [Referral Program Tracking](#24-referral-program-tracking)
25. [Data Export to BigQuery](#25-data-export-to-bigquery)

---

## 1. Affiliate Link Handling on Android

### How It Works on Android

When a user taps an affiliate link inside x/pat, Android resolves the URL through **intent resolution**. The OS checks if a default browser is set, then opens the URL. If the link is an Android App Link (verified via Digital Asset Links), it can open directly in the partner's app (e.g., Booking.com, Hostelworld).

For standard affiliate URLs (most common), the flow is:
1. User taps affiliate CTA inside x/pat
2. App opens URL via `expo-web-browser` (Chrome Custom Tabs on Android)
3. Affiliate network registers the click via redirect chain (typically 2-4 hops)
4. User lands on partner site with tracking parameters intact
5. Cookie is set in the Chrome browser context for attribution window (typically 30 days)

### Browser Redirect Behavior

Android handles redirects differently than iOS:
- **302/307 redirects**: Followed automatically within Chrome Custom Tabs
- **JavaScript redirects**: Executed within the Custom Tab context
- **Intent-based redirects**: Can bounce to partner apps if installed (e.g., `intent://` scheme)
- **Universal Links / App Links**: If the partner app is installed and verified, Android may route directly to it

### React Native / Expo Implementation

```
expo-web-browser (built into Expo SDK 55)
```

Key method: `WebBrowser.openBrowserAsync(url, options)`

On Android, this opens **Chrome Custom Tabs** by default, which:
- Shares cookie jar with the user's Chrome browser
- Preserves affiliate tracking parameters through redirect chains
- Supports back-button to return to x/pat
- Loads faster than a full browser launch (pre-warming available)

### x/pat Application

For affiliate links to Booking.com, Hostelworld, Wise, SafetyWing, etc.:
- Use `expo-web-browser` for ALL affiliate click-outs
- Append UTM parameters + x/pat internal click ID to every URL
- Log the click event to your analytics backend BEFORE opening the browser
- Store `{user_id, spot_id, partner, click_timestamp}` in Supabase for server-side attribution

### Cost

Free. `expo-web-browser` is included in Expo SDK.

---

## 2. In-App Browser for Affiliate Clicks

### Chrome Custom Tabs vs WebView

| Feature | Chrome Custom Tabs | WebView |
|---------|-------------------|---------|
| Cookie sharing with Chrome | Yes | No |
| Affiliate cookie attribution | Excellent | Poor (isolated sandbox) |
| Performance | Fast (Chrome engine, pre-warm) | Slower cold start |
| User trust | Shows Chrome URL bar | No URL bar visible |
| Auto-fill / passwords | Shared with Chrome | None |
| Back to app | Native back button | Must implement |
| Expo support | Built-in via expo-web-browser | react-native-webview |

**Verdict for x/pat: Always use Chrome Custom Tabs (expo-web-browser) for affiliate links.** WebView kills affiliate tracking because cookies are sandboxed and never reach the user's real browser.

### Implementation Details

```
import * as WebBrowser from 'expo-web-browser';

// Open affiliate link with Chrome Custom Tabs
const openAffiliateLink = async (url: string, metadata: AffiliateClickMeta) => {
  // 1. Log click to analytics FIRST
  await trackAffiliateClick(metadata);

  // 2. Open in Chrome Custom Tabs
  await WebBrowser.openBrowserAsync(url, {
    showTitle: true,            // Show page title in toolbar
    enableBarCollapsing: true,  // Collapse toolbar on scroll
    toolbarColor: '#0A0A0A',    // Match x/pat dark theme
  });
};
```

### Pre-warming for Performance

Chrome Custom Tabs supports pre-warming the browser process before the user taps:

```
// When spot card comes into view, pre-warm the browser
WebBrowser.warmUpAsync();

// When user leaves the screen
WebBrowser.coolDownAsync();
```

This reduces affiliate link open time from ~800ms to ~200ms on Android.

### x/pat Application

- Pre-warm when user views a SpotDetail screen (likely to click affiliate CTA)
- Set toolbar color to `#0A0A0A` to match dark theme
- Track time-in-browser when user returns (estimate engagement with partner site)
- Never use WebView for affiliate links -- it breaks cookie attribution

### Cost

Free. Part of Expo SDK.

---

## 3. Cookie/Session Tracking for Affiliate Attribution

### The Android Cookie Landscape (2026)

Critical changes since 2024:
- **Third-party cookies in Chrome**: Google reversed course in July 2024 and decided to KEEP third-party cookies in Chrome (no deprecation). This is good for affiliate tracking.
- **Privacy Sandbox on Chrome (web)**: Retired October 2025. Topics API, Attribution Reporting, and Protected Audience APIs all shut down.
- **Chrome Custom Tabs cookie behavior**: Shares the full Chrome cookie jar. Affiliate cookies set during a Custom Tab session persist and are readable when the user later visits the partner site in Chrome.

### How Affiliate Cookie Attribution Works

1. User taps affiliate link in x/pat
2. Chrome Custom Tab opens, follows redirect chain
3. Affiliate network (e.g., CJ, Impact, Partnerize) sets a first-party cookie on the partner domain
4. Cookie contains: affiliate ID, click ID, timestamp, attribution window
5. When user later completes a booking/purchase (even days later in Chrome), the cookie is read
6. Affiliate network attributes the conversion to x/pat and reports it

### Attribution Windows by Partner Type

| Partner Category | Typical Cookie Window | Example Partners |
|-----------------|----------------------|-----------------|
| Hotels/Accommodation | 30 days | Booking.com, Hostelworld |
| Flights | 7-30 days | Skyscanner, Kiwi.com |
| Insurance | 30-90 days | SafetyWing, World Nomads |
| Financial/Fintech | 30-45 days | Wise, Revolut |
| Coworking | 14-30 days | WeWork, Selina |
| SIM/eSIM | 30 days | Airalo, Holafly |

### Server-Side Attribution (Recommended Supplement)

Cookie-based tracking alone is fragile. Implement server-side click tracking:

1. Generate a unique `click_id` for every affiliate click in x/pat
2. Append `click_id` as a URL parameter to the affiliate URL
3. Store `{click_id, user_id, partner, spot_id, timestamp}` in Supabase
4. When the affiliate network sends a postback/webhook with the `click_id`, match it server-side
5. This works regardless of cookie state, browser changes, or device switches

### x/pat Application

- Use Chrome Custom Tabs (expo-web-browser) for cookie persistence
- Implement server-side click tracking via Supabase as primary attribution method
- Cookie tracking becomes the fallback/confirmation layer
- Track affiliate clicks as events in PostHog for funnel analysis

### Cost

- Cookie tracking: Free (browser-native)
- Server-side tracking: Included in Supabase (postback endpoint via Edge Function)
- Affiliate network integration: Free (CJ, Impact, Partnerize all provide postback APIs)

---

## 4. Google AdMob on Android

### Ad Format Overview for x/pat

| Format | Description | x/pat Use Case | Expected eCPM |
|--------|-------------|----------------|---------------|
| **Banner** | 320x50 strip at bottom/top | Feed screen footer | $0.50-$2.00 |
| **Interstitial** | Full-screen between content | After viewing 5+ spots | $4.00-$12.00 |
| **Native** | Blends with app UI | In-feed "sponsored spot" cards | $2.00-$8.00 |
| **Rewarded** | User opts in for reward | "Watch ad to unlock city guide" | $10.00-$25.00 |
| **App Open** | Shows on app launch | NOT recommended for x/pat | $8.00-$15.00 |

### React Native / Expo Implementation

**Primary library:** `react-native-google-mobile-ads` by Invertase

Installation:
```
npm install react-native-google-mobile-ads expo-build-properties
```

app.json / app.config.ts configuration:
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXXXXX~YYYYYYYY",
          "iosAppId": "ca-app-pub-XXXXXXXX~ZZZZZZZZ"
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 23
          }
        }
      ]
    ]
  }
}
```

**Important:** Requires EAS Build (dev client) -- does NOT work with Expo Go. You already use EAS builds, so this is fine.

### Ad Placement Strategy for x/pat

**Recommended placements:**
1. **Native ads in Explore feed** -- Disguise as "Promoted Spot" cards matching SpotCard design. Highest revenue potential with lowest user friction.
2. **Rewarded ads for premium content** -- "Watch a short ad to see the full city coworking guide." Feels value-exchange, not intrusive.
3. **Interstitial after deep engagement** -- Only show after user has viewed 5+ spots in a session. Never on first launch or during onboarding.

**Explicitly avoid:**
- Banner ads (low eCPM, cheap look, hurts Mercury fintech aesthetic)
- App open ads (terrible first impression)
- Ads during chat or social features (kills community feel)

### AdMob Account Requirements

- Google AdMob account (free to create)
- App must be published on Play Store (can use test ads during development)
- Tax information required for payouts
- Minimum payout: $100

### x/pat Application

Start with native ads only. They blend with the feed, respect the premium dark UI, and generate 4-8x more than banners. Add rewarded ads once you have premium content worth gating.

### Cost

- AdMob account: Free
- `react-native-google-mobile-ads`: Free (open source)
- Google takes 40% of ad revenue (you keep 60%)
- Integration effort: ~2-3 days for native ads

---

## 5. Google Ad Manager vs AdMob

### When to Use Each

| Criteria | AdMob | Google Ad Manager (GAM) |
|----------|-------|------------------------|
| Best for | Apps under 10M impressions/month | Apps with direct ad sales |
| Setup complexity | Simple (plug and play) | Complex (requires ad ops knowledge) |
| Direct deals | No | Yes -- sell premium placements |
| Mediation | Built-in waterfall + bidding | Full header bidding + waterfall |
| Reporting | Basic | Advanced (custom dimensions) |
| Price floor control | Limited | Full control |
| Revenue uplift vs AdMob alone | Baseline | +30-50% with proper setup |
| Free? | Yes | Yes (up to 150M impressions/month) |

### x/pat Recommendation

**Phase 1 (Launch - 100K MAU):** AdMob only. Simple, automated, zero ad ops needed.

**Phase 2 (100K+ MAU):** Add GAM on top of AdMob. This lets you:
- Sell direct "Promoted Spot" placements to coworking spaces, hostels, cafes
- Set price floors to prevent low-quality ads
- Run a unified auction between AdMob demand and direct-sold campaigns
- A/B test ad formats and placements with proper measurement

**Phase 3 (500K+ MAU, B2B marketplace):** GAM becomes the primary ad server. Local businesses pay directly for "Promoted" listings in specific cities. AdMob fills unsold inventory.

### React Native Implementation

Same library for both: `react-native-google-mobile-ads`. The only difference is the ad unit IDs (GAM uses `/account_id/ad_unit` format vs AdMob's `ca-app-pub-` format).

### x/pat Application

Stay on AdMob until you have enough traffic to justify direct sales. The B2B marketplace listings (coworking spaces, cafes wanting to reach nomads) are a perfect GAM use case -- that is your "contextual ads" revenue stream.

### Cost

Both are free. GAM requires more operational overhead (ad ops person or knowledge).

---

## 6. Android Ad Mediation

### What Mediation Does

Mediation lets you serve ads from multiple networks through a single integration. When AdMob can't fill an ad request (or offers a low bid), mediation routes to the next-highest bidder.

### Major Mediation Networks for Android

| Network | Integration Type | Ad Formats | Notes for x/pat |
|---------|-----------------|------------|-----------------|
| **AdMob** (Google) | Primary | All | Base demand, always-on |
| **Meta Audience Network** | Bidding | Banner, Interstitial, Rewarded, Native | Strong for social/travel apps |
| **Unity Ads** | Bidding + Waterfall | Banner, Interstitial, Rewarded | Waterfall support ends Jan 31, 2026 |
| **AppLovin MAX** | Alternative mediator | All | Competing mediation platform |
| **IronSource** (Unity) | Bidding | All | Merged with Unity |
| **Pangle (TikTok)** | Bidding | All | Growing demand in travel vertical |

### In-App Bidding vs Waterfall

- **Waterfall** (legacy): Networks are called in a fixed priority order. Slow, suboptimal.
- **In-App Bidding** (recommended): All networks bid simultaneously in real-time. Highest bidder wins. ~20-30% more revenue than waterfall.

AdMob's built-in mediation supports both. As of 2026, in-app bidding is the standard.

### React Native Implementation

Each mediation adapter requires its own native dependency. For Expo with EAS Build:

```
npm install react-native-google-mobile-ads
# Then add mediation adapters in app.json plugins or native config
```

Meta Audience Network adapter requires additional setup in `android/app/build.gradle` via config plugin.

### x/pat Application

**Phase 1:** AdMob only (no mediation needed under 1M impressions/month)
**Phase 2:** Add Meta Audience Network bidding (highest incremental value for social/travel apps, +15-25% revenue)
**Phase 3:** Add 1-2 more bidders if fill rates or eCPMs plateau

### Cost

- Mediation setup: Free (AdMob built-in)
- Each network takes its own revenue share (typically 30-40%)
- Implementation effort: ~1 day per additional network

---

## 7. Privacy Sandbox on Android

### Current Status (April 2026)

**Privacy Sandbox on Android is DEPRECATED.** As of October 2025, Google officially retired all Privacy Sandbox APIs:

- **Topics API**: Shut down. Was designed to infer interest signals on-device from app usage. Never widely adopted.
- **Attribution Reporting API**: Shut down. Was meant to replace cross-app attribution. Low adoption led to retirement.
- **Protected Audience (FLEDGE)**: Shut down. On-device remarketing auctions never gained traction.

### Why It Was Retired

Google cited "low levels of adoption" and "ecosystem feedback about expected value." The industry was not ready to abandon existing tracking methods, and Google could not force the transition without breaking the ad ecosystem.

### What This Means for x/pat

**Good news:** The status quo is maintained. Traditional tracking methods continue to work on Android:
- Google Advertising ID (GAID) remains available (with user opt-out)
- Cookie-based affiliate tracking works normally in Chrome/Custom Tabs
- Server-side attribution continues as the most reliable method
- Ad SDKs (AdMob, Meta, etc.) continue using existing signals

**No action needed.** Privacy Sandbox does not affect x/pat's monetization strategy.

### Cost

N/A -- no implementation required.

---

## 8. Advertising ID Deprecation

### Current Status (April 2026)

The Google Advertising ID (GAID) is **NOT deprecated** as of April 2026. Google's original plan to deprecate it as part of Privacy Sandbox has been shelved alongside the Privacy Sandbox retirement.

### What GAID Does

- Provides a resettable, user-specific identifier for ad targeting and attribution
- Users can opt out via Settings > Google > Ads > "Delete advertising ID"
- On Android 12+, users who opt out see a zeroed-out ID (`00000000-0000-0000-0000-000000000000`)

### Impact on Affiliate Tracking

GAID is used by:
- **Ad networks** (AdMob, Meta) for targeting and frequency capping
- **Attribution platforms** (AppsFlyer, Adjust, Branch) for install attribution
- **Not typically used** for affiliate link attribution (which uses cookies + click IDs)

For x/pat's affiliate model specifically, GAID deprecation would have minimal impact because:
1. Affiliate attribution uses cookies (Chrome Custom Tabs) + server-side click IDs
2. x/pat does not rely on cross-app tracking for core revenue
3. Ad networks handle GAID internally -- x/pat doesn't need to manage it

### React Native Access

```
// If needed (not required for affiliate model):
import { getAdvertisingId } from 'expo-tracking-transparency';
```

### x/pat Application

No immediate concern. Build attribution on server-side click tracking (Supabase) and Chrome Custom Tab cookies -- both are GAID-independent.

### Cost

N/A -- no additional tooling needed.

---

## 9. PostHog Android SDK

### Overview

PostHog is an open-source, all-in-one analytics platform. It combines product analytics, session recording, feature flags, A/B testing, and surveys in one tool.

### React Native SDK Capabilities

| Feature | Support | Notes |
|---------|---------|-------|
| Event tracking | Full | Auto-capture + custom events |
| User identification | Full | `posthog.identify(userId)` |
| Feature flags | Full | Cached in AsyncStorage, offline support |
| Session recording | Full (v4.36.0+) | Requires `posthog-react-native-session-replay >= 1.3.0` |
| Group analytics | Full | Track by city, user type, etc. |
| Surveys | Beta | In-app surveys for feedback |
| Heatmaps | Web only | Not available for React Native |

### Installation

```
npm install posthog-react-native
npm install posthog-react-native-session-replay  # For session recording
```

### Setup

```typescript
import PostHog from 'posthog-react-native';

const posthog = new PostHog('phc_YOUR_PROJECT_KEY', {
  host: 'https://us.i.posthog.com',  // or EU: https://eu.i.posthog.com
  enableSessionReplay: true,
});

// Identify user after auth
posthog.identify(user.id, {
  email: user.email,
  plan: 'free',
  home_city: user.homeCity,
  nomad_type: user.nomadType,
});

// Track affiliate click
posthog.capture('affiliate_link_clicked', {
  partner: 'booking_com',
  spot_id: spot.id,
  city: spot.city,
  category: spot.category,
  position_in_feed: index,
});
```

### Key Events to Track for x/pat

| Event | Properties | Purpose |
|-------|-----------|---------|
| `affiliate_link_clicked` | partner, spot_id, city, category | Revenue attribution |
| `spot_viewed` | spot_id, city, source (feed/search/map) | Content engagement |
| `spot_saved` | spot_id, city | Intent signal |
| `search_performed` | query, city, filters | Content discovery |
| `profile_viewed` | viewed_user_id | Social engagement |
| `chat_message_sent` | thread_id, is_first_message | Community health |
| `onboarding_step_completed` | step_number, step_name | Activation funnel |
| `push_notification_opened` | campaign_id, type | Re-engagement |
| `share_link_created` | spot_id, channel | Viral loop |

### x/pat Application

PostHog is the recommended primary analytics tool for x/pat because:
1. All-in-one: analytics + feature flags + session replay + A/B testing
2. Generous free tier (1M events/month)
3. Open source with self-host option for future cost control
4. Developer-first -- fits solo founder workflow
5. No vendor lock-in

### Cost

**Free tier (sufficient for launch through ~50K MAU):**
- 1M product analytics events/month
- 5,000 session recordings/month (2,500 mobile)
- 1M feature flag requests/month
- No user/seat limits

**Growth pricing (when you exceed free tier):**
- Analytics: $0.00031 per event after 1M
- Session replay: $0.005 per recording after 5K
- Feature flags: $0.0001 per request after 1M
- Estimated cost at 100K MAU: ~$50-150/month

---

## 10. Mixpanel vs Amplitude vs PostHog

### 2026 Comparison Matrix

| Feature | PostHog | Mixpanel | Amplitude |
|---------|---------|----------|-----------|
| **Pricing model** | Per event | Per event | Per MTU |
| **Free tier** | 1M events | 1M events | 10K MTUs |
| **Session replay** | Yes (mobile) | Yes (added late 2025) | Yes (added 2025) |
| **Feature flags** | Yes (built-in) | Yes (added late 2025) | Yes |
| **A/B testing** | Yes | Yes (relaunched 2025) | Yes |
| **Heatmaps** | Web only | Yes (added 2025) | Yes (added 2025) |
| **Open source** | Yes | No | No |
| **Self-host option** | Yes | No | No |
| **React Native SDK** | Yes | Yes | Yes |
| **Funnel analysis** | Yes | Best-in-class | Yes |
| **Cohort analysis** | Yes | Yes | Best-in-class |
| **Data warehouse** | Built-in | No | No |
| **Best for** | Engineering teams | Product managers | Enterprise teams |

### Pricing at Scale (Estimated)

| MAU | PostHog | Mixpanel | Amplitude |
|-----|---------|----------|-----------|
| 10K | Free | Free | Free |
| 50K | ~$50/mo | ~$100/mo | ~$200/mo |
| 100K | ~$150/mo | ~$300/mo | ~$500/mo |
| 500K | ~$500/mo | ~$1,500/mo | Custom |

### x/pat Recommendation

**PostHog is the clear winner for x/pat because:**
1. Solo founder = engineering-led team = PostHog's sweet spot
2. Cheapest at every scale point
3. Combines analytics + feature flags + session replay (replaces 3 tools)
4. Open source aligns with long-term cost control
5. Self-host option if costs become an issue at scale

**Mixpanel would be the alternative** if you hire a non-technical product manager who needs polished UI for funnel analysis.

### Cost

PostHog: Free at launch, ~$50-150/month at 100K MAU
(vs Mixpanel ~$300/mo or Amplitude ~$500/mo at same scale)

---

## 11. Google Analytics 4 on Android

### Overview

GA4 (via Firebase Analytics) provides free, unlimited event tracking with automatic BigQuery export on the Blaze plan. It integrates natively with the Google ecosystem (Ads, Search Console, Play Console).

### React Native / Expo Integration

**Library:** `@react-native-firebase/analytics`

Installation:
```
npm install @react-native-firebase/app @react-native-firebase/analytics
```

Requires `google-services.json` (already in x/pat project root) and Expo config plugin setup.

### Key Features

| Feature | Details |
|---------|---------|
| Auto-collected events | `first_open`, `session_start`, `screen_view`, `app_update` |
| Custom events | Up to 500 distinct event names, 25 params per event |
| User properties | Up to 25 custom properties per user |
| Audience builder | Create segments in Firebase Console |
| BigQuery export | Free streaming export on Blaze plan |
| Retention reports | Automatic cohort-based retention |
| Funnel reports | Visual funnel builder in GA4 |
| Real-time | ~30 second delay |

### Custom Events for x/pat

```typescript
import analytics from '@react-native-firebase/analytics';

// Track affiliate click
await analytics().logEvent('affiliate_click', {
  partner_name: 'booking_com',
  spot_id: 'spot_123',
  city: 'bangkok',
  category: 'accommodation',
  revenue_type: 'cpa',
});

// Track spot engagement
await analytics().logEvent('spot_engagement', {
  spot_id: 'spot_123',
  action: 'save',
  time_on_screen: 45,
});
```

### GA4 vs PostHog for x/pat

| Use Case | GA4 | PostHog |
|----------|-----|---------|
| Affiliate revenue tracking | Good | Better (custom dashboards) |
| User behavior analysis | Good | Better (session replay) |
| Feature flags | No | Yes |
| A/B testing | Via Remote Config | Built-in |
| BigQuery export | Best-in-class | Available |
| Play Store integration | Native | None |
| Cost | Free | Free (to 1M events) |

### x/pat Recommendation

**Use BOTH GA4 and PostHog:**
- GA4 for: Play Store conversion data, Google Ads integration (if future paid UA), BigQuery pipeline, free unlimited events
- PostHog for: Product analytics, feature flags, A/B testing, session replay, affiliate funnel analysis

### Cost

- Firebase Analytics: **Free** (unlimited events)
- BigQuery export: Free up to 10GB storage + 1TB queries/month (Blaze plan, pay-as-you-go)
- `@react-native-firebase/analytics`: Free (open source)

---

## 12. User Property Tracking

### What to Track

User properties are attributes attached to a user profile. They enable segmentation, targeting, and personalization.

### Recommended User Properties for x/pat

| Property | Type | Source | Use Case |
|----------|------|--------|----------|
| `nomad_type` | string | Onboarding | Content personalization |
| `home_country` | string | Profile | Localization, visa content |
| `current_city` | string | Location | Local recommendations |
| `cities_visited` | number | Activity | Engagement tier |
| `spots_saved` | number | Activity | Activation metric |
| `affiliate_clicks_total` | number | Activity | Revenue potential score |
| `last_affiliate_click_date` | date | Activity | Re-engagement targeting |
| `referral_source` | string | Install | Acquisition channel |
| `days_since_signup` | number | Computed | Lifecycle stage |
| `engagement_tier` | string | Computed | Power user identification |
| `preferred_categories` | array | Behavior | Feed personalization |

### Implementation

**PostHog:**
```typescript
posthog.identify(userId, {
  nomad_type: 'digital_nomad',
  current_city: 'Bangkok',
  engagement_tier: 'active',
});
```

**Firebase:**
```typescript
await analytics().setUserProperties({
  nomad_type: 'digital_nomad',
  current_city: 'Bangkok',
  engagement_tier: 'active',
});
```

### Behavioral Segments for x/pat

| Segment | Definition | Action |
|---------|-----------|--------|
| **High-value browsers** | 10+ spots viewed, 0 affiliate clicks | Show more prominent CTAs |
| **Affiliate converters** | 3+ affiliate clicks in 30 days | Priority for new partner deals |
| **Content creators** | 5+ spots submitted | Nurture as community leaders |
| **At-risk churners** | No opens in 7 days, were daily active | Re-engagement push notification |
| **Social butterflies** | 10+ follows, active in chat | Invite to beta features |

### Cost

Included in PostHog free tier and Firebase free tier. No additional cost.

---

## 13. A/B Testing Frameworks

### Options for React Native / Expo

| Tool | Integration | Cost | Best For |
|------|------------|------|----------|
| **PostHog Experiments** | PostHog SDK (already integrated) | Free (1M flag requests) | Product experiments |
| **Firebase Remote Config + A/B Testing** | @react-native-firebase/remote-config | Free | Config-based tests |
| **Optimizely** | Separate SDK | $50K+/year | Enterprise (overkill) |
| **Statsig** | Separate SDK | Free to 10M events | Feature gates + experiments |
| **LaunchDarkly** | Separate SDK | $10/seat/month | Feature flags only |

### x/pat Recommendation: PostHog Experiments

Since PostHog is already the recommended analytics platform, use its built-in experimentation:

1. Create experiment in PostHog dashboard
2. Define variants (control + treatment)
3. Set goal metric (e.g., affiliate_click_rate)
4. SDK automatically assigns users to variants
5. PostHog calculates statistical significance

```typescript
// Check experiment variant
const variant = posthog.getFeatureFlag('affiliate-cta-experiment');

if (variant === 'prominent') {
  return <LargeAffiliateCTA partner={partner} />;
} else {
  return <SubtleAffiliateCTA partner={partner} />;
}
```

### Key Experiments for x/pat

| Experiment | Hypothesis | Metric |
|-----------|-----------|--------|
| Affiliate CTA size/color | Larger, colored CTAs increase clicks | affiliate_click_rate |
| Spot card layout | Showing price range increases affiliate clicks | affiliate_click_rate |
| Onboarding flow length | Shorter onboarding improves activation | day_7_retention |
| Feed algorithm | Personalized feed increases engagement | spots_viewed_per_session |
| Push notification copy | Personalized pushes improve re-engagement | push_open_rate |

### Firebase Remote Config (Supplementary)

Use Firebase Remote Config for non-experimental feature toggles:
- Seasonal content themes
- City-specific feature availability
- Gradual feature rollouts
- Emergency kill switches

### Cost

- PostHog Experiments: Free (included in 1M feature flag requests)
- Firebase Remote Config: Free (up to 2,000 parameters)

---

## 14. Funnel Analysis

### Critical Funnels for x/pat

#### Funnel 1: Signup to Activation
```
Install → Open App → Complete Onboarding → View First Spot → Save First Spot → First Affiliate Click
```

#### Funnel 2: Affiliate Conversion
```
View Spot → Tap Affiliate CTA → Land on Partner Site → (Complete Booking) → Conversion Attributed
```

#### Funnel 3: Social Engagement
```
View Profile → Follow User → View Their Spots → Save/Visit Shared Spot
```

#### Funnel 4: Content Creation
```
Tap "Add Spot" → Fill Details → Upload Photo → Submit → Spot Published → Others View It
```

#### Funnel 5: Referral Loop
```
Tap Share → Generate Link → Friend Clicks Link → Friend Installs → Friend Activates
```

### Implementation in PostHog

PostHog's funnel analysis:
- Define steps as events
- See conversion rates between each step
- Break down by user properties (city, nomad_type, acquisition source)
- Compare time periods
- Filter by cohort

### Key Metrics to Monitor

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Onboarding completion rate | >70% | <50% |
| Day 1 → First spot viewed | >80% | <60% |
| Spot viewed → Affiliate click | >5% | <2% |
| Share → Friend install | >10% | <5% |
| Install → Day 7 active | >25% | <15% |

### Android-Specific Considerations

- Android funnel drop-off is typically 10-15% higher than iOS at the install step (Play Store vs App Store UX)
- Android users tend to have shorter sessions but more frequent opens
- Back-button behavior can cause false "exits" in funnel tracking -- filter by actual app close events

### Cost

Included in PostHog free tier. Also available in GA4 for free.

---

## 15. Cohort Analysis

### What to Measure

Cohort analysis groups users by a shared characteristic (usually signup week) and tracks their behavior over time. Essential for understanding retention by acquisition source.

### Key Cohorts for x/pat

| Cohort Dimension | Why It Matters |
|-----------------|---------------|
| **Signup week** | Standard retention curve baseline |
| **Acquisition source** | Which channels bring users who stick? |
| **First city** | Do users in certain cities retain better? |
| **Nomad type** | Do digital nomads retain differently than travelers? |
| **Referral vs organic** | Do referred users have higher LTV? |
| **Onboarding variant** | Which onboarding flow produces best retention? |

### Retention Benchmarks (Travel/Social Apps on Android)

| Period | Good | Average | Poor |
|--------|------|---------|------|
| Day 1 | >40% | 25-35% | <20% |
| Day 7 | >20% | 10-15% | <8% |
| Day 30 | >10% | 5-8% | <4% |
| Day 90 | >5% | 2-4% | <2% |

Key insight: 80% of Android users drop off within 3 days. Improving Day 30 retention by just 2% adds thousands in revenue per 100K installs.

### Implementation

**PostHog:** Built-in retention analysis with cohort breakdowns. Create retention tables grouped by any user property.

**Firebase/GA4:** Automatic cohort reports (daily, weekly, monthly). Less flexible than PostHog for custom cohort dimensions.

### x/pat Application

- Track weekly signup cohorts from Day 1
- Compare retention curves: referral vs organic, by city, by nomad type
- Use cohort data to identify which acquisition sources produce affiliate-clicking users (not just any users)
- Feed cohort insights into push notification strategy (target cohorts showing churn signals)

### Cost

Included in PostHog and GA4 free tiers.

---

## 16. Heatmap & Session Recording

### Options for React Native on Android

| Tool | Mobile Session Replay | Mobile Heatmaps | React Native SDK | Pricing |
|------|----------------------|-----------------|-----------------|---------|
| **PostHog** | Yes (v4.36.0+) | Web only | Yes | Free (2,500 mobile recordings/mo) |
| **UXCam** | Yes (native) | Yes (touch heatmaps) | Yes | Free to 2K sessions/mo |
| **Smartlook** | Yes | Yes | Yes | Free to 3K sessions/mo |
| **Hotjar** | Web only | Web only | No | N/A for mobile |
| **FullStory** | Yes | Yes | Yes | $199+/mo |
| **LogRocket** | Yes | No | Yes | Free to 1K sessions/mo |

### x/pat Recommendation

**PostHog session recording (primary)** -- already integrated if using PostHog for analytics. No additional SDK needed.

**UXCam (supplementary, if needed)** -- specifically built for mobile. Adds touch heatmaps that PostHog lacks on mobile. Free tier is generous enough for early stage.

### PostHog Session Recording Setup

```typescript
const posthog = new PostHog('phc_YOUR_KEY', {
  host: 'https://us.i.posthog.com',
  enableSessionReplay: true,
  sessionReplayConfig: {
    maskAllTextInputs: true,    // Privacy: mask text inputs
    maskAllImages: false,        // Show images (spot photos are content)
    captureNetworkTelemetry: true, // Track API performance
  },
});
```

### What to Watch For in x/pat Sessions

| Observation | Action |
|-------------|--------|
| Users scroll past affiliate CTAs | Redesign CTA placement/visibility |
| Users tap affiliate link then immediately return | Partner landing page may be confusing |
| Users get stuck on onboarding | Simplify the step they abandon |
| Users search but don't find results | Improve search/seed more content |
| Users view map but don't tap markers | Markers may be too small or clustered |

### Cost

- PostHog: Free (2,500 mobile recordings/month)
- UXCam: Free (2,000 sessions/month), then $200+/month
- Recommendation: Start with PostHog only, add UXCam only if mobile heatmaps prove critical

---

## 17. Revenue Attribution

### The Core Question

"Which feature, screen, or content type drives the most affiliate revenue?"

### Attribution Model for x/pat

Since x/pat is affiliate-only, revenue attribution tracks the user journey from content engagement to affiliate click to partner conversion:

```
User Journey → Content Interaction → Affiliate Click → Partner Conversion → Revenue
```

### Multi-Touch Attribution Events

| Event | Properties | Attribution Role |
|-------|-----------|-----------------|
| `spot_viewed` | spot_id, city, category, source | First/middle touch |
| `spot_saved` | spot_id | Intent signal |
| `search_performed` | query, filters | Discovery method |
| `feed_scrolled` | scroll_depth, city | Browse engagement |
| `affiliate_link_clicked` | partner, spot_id, click_id | Conversion event |
| `affiliate_conversion` | click_id, revenue, partner | Revenue event (from postback) |

### Building the Attribution Pipeline

1. **Client-side (PostHog):** Track all user interactions as events with spot_id and partner
2. **Click tracking (Supabase):** Store every affiliate click with `{click_id, user_id, spot_id, partner, timestamp}`
3. **Conversion postback (Supabase Edge Function):** Receive partner webhooks with `click_id` and revenue
4. **Attribution join:** Match conversions to the full event history for that user
5. **Analysis:** Which spots, cities, categories, and user journeys produce the most revenue?

### Key Attribution Reports

| Report | Question Answered |
|--------|------------------|
| Revenue by city | Which city guides make the most money? |
| Revenue by category | Accommodation vs coworking vs insurance? |
| Revenue by partner | Which affiliates have highest conversion rates? |
| Revenue by content source | User-generated spots vs seed data vs editorial? |
| Revenue by user segment | Which user types click and convert most? |
| Revenue by acquisition source | Which marketing channels bring revenue-generating users? |

### x/pat Application

Build a Supabase table `affiliate_conversions` with:
```sql
CREATE TABLE affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id TEXT NOT NULL REFERENCES affiliate_clicks(click_id),
  user_id UUID REFERENCES profiles(id),
  partner TEXT NOT NULL,
  revenue_amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  conversion_type TEXT, -- 'booking', 'signup', 'purchase'
  converted_at TIMESTAMPTZ DEFAULT now()
);
```

### Cost

- PostHog tracking: Free (included in free tier)
- Supabase storage/functions: Free tier sufficient for early stage
- No additional tools needed -- this is a custom pipeline

---

## 18. Deep Link Conversion Tracking

### Post-Firebase Dynamic Links Landscape (2026)

Firebase Dynamic Links shut down August 25, 2025. The replacement options:

| Solution | React Native Support | Deferred Deep Links | Cost | Best For |
|----------|---------------------|--------------------|----|----------|
| **Branch.io** | Yes (official SDK) | Yes | Free to 10K MAU, then $499+/mo | Enterprise attribution |
| **AppsFlyer OneLink** | Yes | Yes | Custom pricing | Paid UA attribution |
| **Adjust** | Yes | Yes | Custom pricing | Performance marketing |
| **ChottuLink** | Yes | Yes | Free to start | Firebase DL replacement |
| **Custom (Expo Linking)** | Yes (built-in) | Partial | Free | Basic deep links |

### x/pat Share-to-Install Flow

```
1. User A shares a spot → generates https://xpat.social/spot/abc123
2. Friend (User B) clicks link on Android
3. If app installed: opens directly to SpotDetail screen (Android App Link)
4. If app NOT installed: redirects to Play Store with deferred deep link data
5. After install: app opens and navigates to the shared spot
6. Attribution: User B credited as referred by User A
```

### Implementation with Expo

For basic deep linking (app-already-installed):
```typescript
// app.json
{
  "expo": {
    "android": {
      "intentFilters": [{
        "action": "VIEW",
        "autoVerify": true,
        "data": [{ "scheme": "https", "host": "xpat.social", "pathPrefix": "/spot" }],
        "category": ["BROWSABLE", "DEFAULT"]
      }]
    }
  }
}
```

For deferred deep linking (app-not-installed), you need either:
- **Branch.io** (most robust, but expensive)
- **Custom solution**: Store link data server-side, match on first app open via fingerprinting or clipboard

### x/pat Recommendation

**Phase 1 (Launch):** Use Expo's built-in linking for basic deep links (app-installed case). For the app-not-installed case, redirect to Play Store with a referral code in the URL, then prompt the user to enter it on signup.

**Phase 2 (Growth):** Integrate Branch.io or build custom deferred deep linking when viral loops become a growth priority. Branch free tier covers 10K MAU.

### Conversion Tracking Metrics

| Metric | How to Track |
|--------|-------------|
| Share link created → Link clicked | UTM tracking on xpat.social |
| Link clicked → App installed | Play Store referral attribution |
| App installed → Spot viewed (deferred deep link success) | Custom event matching |
| Referred user → Active user (Day 7) | Cohort analysis by referral source |
| Referred user → Affiliate clicker | Revenue attribution pipeline |

### Cost

- Expo Linking: Free
- Branch.io: Free to 10K MAU, then $499+/month
- Custom solution: Free (Supabase + Edge Functions)

---

## 19. Play Store Conversion Analytics

### Google Play Console Metrics

Google Play Console provides free conversion analytics:

| Metric | Description | x/pat Target |
|--------|-------------|-------------|
| **Store listing visitors** | Users who viewed your listing | Track growth week-over-week |
| **Store listing → Install rate** | % who install after viewing listing | >30% (travel app avg: 27%) |
| **Install → First open** | % who actually open after install | >85% |
| **First open → Day 1 retention** | % who return the next day | >35% |
| **Uninstall rate** | % who uninstall within 30 days | <40% |

### Conversion Benchmarks (2026)

| Category | Listing → Install | Day 1 Retention | Day 30 Retention |
|----------|-------------------|-----------------|------------------|
| Travel apps | 25-30% | 25-35% | 5-10% |
| Social apps | 20-28% | 30-40% | 8-15% |
| Top 10% apps | 35-45% | 45%+ | 15%+ |
| x/pat target | 30%+ | 35%+ | 10%+ |

### ASO Optimization Levers

Google's algorithm in 2025-2026 shifted from install volume to **retention and engagement** as the primary ranking signal. This means:

1. **Quality installs > quantity**: Users who engage and retain rank your app higher
2. **Custom Product Pages (CPPs)**: Since July 2025, CPPs appear in organic search. Create variants for "digital nomad app," "expat community," "travel tips" keywords.
3. **Retention is a ranking factor**: Both Apple and Google factor retention, engagement, and monetization into ranking/recommendation algorithms

### Play Store Listing Optimization for x/pat

| Element | Recommendation |
|---------|---------------|
| **Title** | "x/pat - Digital Nomad Community & City Guides" |
| **Short description** | "Discover spots, connect with nomads, explore cities like a local" |
| **Screenshots** | Dark theme UI, show map, spots, social features |
| **Video** | 30-second app walkthrough showing key flows |
| **Categories** | Primary: Travel & Local, Secondary: Social |
| **Tags** | digital nomad, expat, travel, remote work, city guide |

### Cost

Google Play Console: Free (comes with $25 one-time developer registration).

---

## 20. User Segmentation for Push Notification Targeting

### Segmentation Strategy for x/pat

| Segment | Criteria | Notification Strategy | Expected Open Rate |
|---------|----------|----------------------|-------------------|
| **New users (Day 0-3)** | Signed up in last 3 days | Onboarding tips, "Complete your profile" | 15-25% |
| **Activated but passive** | Completed onboarding, <3 opens in 7 days | "New spots in [their city]" | 10-15% |
| **Active explorers** | 5+ spots viewed, 0 affiliate clicks | "Top-rated [category] in [city]" with affiliate CTA | 12-18% |
| **Affiliate clickers** | 1+ affiliate clicks | "New deal: 15% off [partner]" | 15-20% |
| **Content creators** | 1+ spots submitted | "Your spot got 10 saves!" social proof | 20-30% |
| **At-risk churn** | Was daily active, no open in 5+ days | "Your friends shared new spots" re-engagement | 5-10% |
| **City-specific** | Current location = specific city | "Trending in Bangkok this week" | 12-18% |
| **Referral champions** | 2+ successful referrals | "Your referral [name] just joined!" | 20-25% |

### Implementation

**expo-notifications** (already installed) + **PostHog feature flags** for targeting:

1. Store user segments as PostHog user properties
2. Use Supabase Edge Functions to query segments and send targeted pushes
3. Track push_sent, push_received, push_opened, push_action_taken as PostHog events
4. Measure conversion from push → affiliate click for revenue attribution

### Push Notification Best Practices (Android-Specific)

- Android 13+ requires explicit notification permission (POST_NOTIFICATIONS)
- Use notification channels for different types (social, deals, updates)
- Implement notification grouping for multiple unread notifications
- Rich notifications with images increase open rates by 25-40% on Android
- Time notifications based on user's local timezone (not server time)

### Cost

- expo-notifications: Free
- Supabase Edge Functions: Free tier (500K invocations/month)
- PostHog segmentation: Free tier

---

## 21. ARPU/LTV Calculation

### ARPU Formula for x/pat (Affiliate-Only App)

```
ARPU = Total Affiliate Revenue / Total Active Users (in period)
```

For a monthly calculation:
```
Monthly ARPU = (Affiliate Commissions + Ad Revenue) / Monthly Active Users
```

### LTV Formula

```
LTV = ARPU × Average User Lifetime (in months)
LTV = ARPU × (1 / Monthly Churn Rate)
```

### Industry Benchmarks (Free Travel Apps on Android, 2025-2026)

| Metric | Industry Average | x/pat Target (Year 1) | x/pat Target (Year 2) |
|--------|-----------------|----------------------|----------------------|
| Monthly ARPU | $0.50-$2.00 | $0.30 | $1.50 |
| Annual ARPU | $6-$24 | $3.60 | $18.00 |
| Avg user lifetime | 3-6 months | 4 months | 8 months |
| LTV | $2-$12 | $1.20 | $12.00 |
| Monthly churn | 15-30% | 25% | 12% |

Note: Android ARPU is typically $72/year vs iOS $138/year for subscription apps, but for affiliate-only free apps, the gap is smaller because the revenue source (affiliate clicks) is less platform-dependent.

### ARPU Drivers for x/pat

| Revenue Source | Est. Revenue/Click | Click Rate | Contribution to ARPU |
|---------------|-------------------|-----------|---------------------|
| Accommodation affiliate | $0.40-$1.00 | 3-5% of spot viewers | Primary |
| Insurance affiliate | $5-$50/signup | 0.5-1% of users/year | High value, low volume |
| eSIM/SIM affiliate | $1-$3/sale | 2-4% of new-city users | Seasonal |
| Coworking affiliate | $0.50-$2.00 | 1-3% of relevant users | Growing |
| Native ads (AdMob) | $2-$8 eCPM | All feed viewers | Supplementary |
| B2B listings (future) | $50-$200/month/business | N/A | Future revenue |

### Tracking Implementation

Store all revenue events in Supabase:
```sql
CREATE TABLE revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  source TEXT NOT NULL, -- 'affiliate', 'ad', 'b2b_listing'
  partner TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  event_date DATE DEFAULT CURRENT_DATE
);

-- Monthly ARPU query
SELECT
  DATE_TRUNC('month', event_date) AS month,
  SUM(amount) / COUNT(DISTINCT user_id) AS arpu
FROM revenue_events
GROUP BY month
ORDER BY month;
```

### Cost

No additional tools needed. Calculated from data already in Supabase + PostHog.

---

## 22. Subscription Analytics (Future Consideration)

### Why This Matters for x/pat

x/pat is free for life -- no user-facing subscriptions. However, two future revenue streams may involve subscription-like billing:

1. **B2B Marketplace Listings**: Businesses pay monthly to be "Promoted" in x/pat
2. **Premium API Access**: Data licensing to coworking platforms, visa services, etc.

### Analytics Needs

If/when x/pat adds B2B subscriptions:

| Metric | Definition | Tool |
|--------|-----------|------|
| MRR (Monthly Recurring Revenue) | Sum of all active B2B subscriptions | RevenueCat or custom Supabase |
| Churn rate | % of B2B subscribers who cancel | Supabase + PostHog |
| Expansion revenue | Upsells from basic to premium listing | Custom tracking |
| Trial-to-paid conversion | % of free trial businesses that subscribe | Funnel analysis |

### RevenueCat for React Native

If subscriptions become relevant:
- `react-native-purchases` by RevenueCat
- Handles Google Play Billing complexity
- Dashboard with MRR, churn, LTV out of the box
- Free for first $2,500/month in tracked revenue

### x/pat Recommendation

**Do not implement subscription infrastructure now.** Wait until B2B marketplace is validated. When ready, RevenueCat is the path of least resistance for React Native + Expo.

### Cost (When Needed)

- RevenueCat: Free to $2,500 MTR, then 1% of tracked revenue
- Google Play Billing: No fee (Google takes 15% of first $1M, then 30%)

---

## 23. Google Play Billing Library

### Current State (2026)

Google Play Billing Library 8 is the current version, with key changes:
- Multiple purchase options for one-time products
- Non-expiring subscriptions
- Improved error handling
- Removed ability to query expired subscriptions and consumed products

### React Native Options

| Library | Play Billing Version | Expo Support | Maintenance |
|---------|---------------------|-------------|-------------|
| **RevenueCat** (`react-native-purchases`) | v8 (SDK v9.0.0) | Yes (config plugin) | Excellent |
| **react-native-iap** | v6+ (v14.7.20) | Yes | Active |
| **Custom native module** | Any | Manual | DIY |

### When x/pat Needs This

Not now. Future use cases:
1. **Tip jar**: Users tip content creators (x/pat takes %). Play Billing required for digital goods.
2. **B2B premium listings**: If sold through the app. Could also be handled server-side (Stripe) to avoid Play Store 15-30% commission.
3. **Premium content**: "City deep-dive guides" -- but this conflicts with "free for life" promise. Only if framed as "support the creator" model.

### Important Note on Play Store Commission

- First $1M/year in revenue: 15% commission
- Above $1M: 30% commission
- For subscriptions after first year: 15%
- For B2B transactions: Consider server-side billing (Stripe) to avoid commission entirely -- allowed if the service is consumed outside the app

### x/pat Recommendation

**Defer implementation.** If B2B marketplace billing is needed, use Stripe server-side (via Supabase Edge Functions) to avoid Google's 15-30% commission. Only use Play Billing if Google's policies require it for the specific transaction type.

### Cost

- RevenueCat: Free to $2,500 MTR
- react-native-iap: Free (open source)
- Google commission: 15-30% of revenue

---

## 24. Referral Program Tracking

### Viral Loop Architecture for x/pat

```
User A shares spot → generates unique link with referral_code
  → Friend B clicks link
    → If app installed: opens spot, credits referral
    → If not installed: Play Store → install → first open credits referral
      → Friend B activates (views 3+ spots)
        → User A gets recognition (badge, featured profile)
          → User A shares more → cycle repeats
```

### Implementation Components

| Component | Tool | Purpose |
|-----------|------|---------|
| Referral code generation | Supabase (custom) | Generate unique codes per user |
| Link creation | `xpat.social/r/{code}` | Shareable URL |
| Deep linking | Expo Linking + App Links | Route to content |
| Install attribution | Play Store referrer API | Match install to referral |
| Activation tracking | PostHog | Track if referred user activates |
| Reward delivery | Supabase | Grant badges/recognition |

### Referral Code System

```sql
-- Supabase table
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE referral_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id),
  referred_id UUID REFERENCES profiles(id),
  referral_code TEXT REFERENCES referral_codes(code),
  status TEXT DEFAULT 'installed', -- 'installed', 'activated', 'retained'
  installed_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);
```

### Referral Reward Ideas (Non-Monetary, Aligned with "Free for Life")

| Milestone | Reward | Why It Works |
|-----------|--------|-------------|
| 1 friend joins | "Connector" badge on profile | Social proof |
| 3 friends join | Featured in "Community Leaders" | Status/visibility |
| 5 friends join | Early access to new features | Exclusivity |
| 10 friends join | "Ambassador" title + priority support | Recognition |
| 25 friends join | Co-create a city guide | Ownership/meaning |

### Key Metrics

| Metric | Benchmark | How to Track |
|--------|----------|-------------|
| K-factor (invites sent x conversion rate) | >0.5 for growth | PostHog + Supabase |
| Referral-to-install rate | 10-16.5% | UTM tracking |
| Referred user Day 7 retention | Should be 1.5-2x organic | Cohort analysis |
| Time from share to install | <24 hours ideal | Supabase timestamps |
| Referred users' affiliate click rate | Should be higher than organic | Revenue attribution |

### Cost

- Custom implementation: Free (Supabase + Expo)
- Branch.io (if deferred deep links needed): Free to 10K MAU
- No monetary rewards needed (badge/recognition-based system)

---

## 25. Data Export to BigQuery

### Firebase to BigQuery Pipeline

Firebase Analytics offers free, automatic export to Google BigQuery. This is the most cost-effective way to build a data warehouse for x/pat.

### Setup

1. **Enable Blaze plan** on Firebase (pay-as-you-go, analytics export is free)
2. **Link BigQuery** in Firebase Console > Project Settings > Integrations
3. **Choose export type**:
   - **Daily export**: Creates `events_YYYYMMDD` tables each day (free, ~24hr delay)
   - **Streaming export**: Creates `events_intraday_YYYYMMDD` tables (~30 second delay, costs ~$0.05/GB)

### BigQuery Schema

Each row represents one event with:
- `event_name`, `event_timestamp`, `event_params` (nested)
- `user_id`, `user_pseudo_id`
- `device` (model, OS, category)
- `geo` (country, region, city)
- `app_info` (version, package)
- `traffic_source` (campaign, medium, source)

### Use Cases for x/pat

| Analysis | SQL Example | Business Value |
|----------|------------|---------------|
| Affiliate revenue by city | Join affiliate_clicks with events by user_id, group by geo.city | Prioritize content for high-revenue cities |
| Feature adoption over time | Count distinct users per feature event by week | Decide what to build next |
| User journey analysis | Sequence events by user_pseudo_id and timestamp | Optimize conversion paths |
| Cohort retention (advanced) | Pivot retention by signup week with window functions | Deep retention analysis |
| Content performance | Join spot_viewed events with affiliate_click events | Identify highest-converting spots |

### Combining Data Sources

BigQuery can ingest data from multiple sources into one warehouse:

| Source | Data | Ingestion Method |
|--------|------|-----------------|
| Firebase Analytics | App events, user properties | Automatic export |
| Supabase | Affiliate clicks, conversions, user profiles | Scheduled export via Edge Function |
| PostHog | Product analytics, experiments | PostHog BigQuery connector (paid plan) |
| Play Console | Store listing data, reviews | Manual export / API |
| Partner APIs | Affiliate conversion data | Scheduled import |

### x/pat Recommendation

**Phase 1 (Launch):** Enable Firebase daily export to BigQuery. Free, automatic, zero maintenance.

**Phase 2 (50K+ MAU):** Add Supabase data export (affiliate clicks/conversions) to BigQuery. Build revenue attribution queries.

**Phase 3 (Scale):** Full data warehouse with all sources. Consider Looker Studio (free) for dashboards, or Metabase (open source) for team access.

### Cost

- Firebase daily export: **Free**
- BigQuery storage: Free up to 10GB/month (~12 months of data for <100K MAU)
- BigQuery queries: Free up to 1TB/month (more than enough for analytics)
- Streaming export: ~$0.05/GB (only needed for real-time dashboards)
- Looker Studio dashboards: **Free**

---

## Summary: Implementation Roadmap for x/pat

### Phase 1: Launch (0-10K MAU) -- Cost: $0/month

| Priority | Tool | Purpose | Status |
|----------|------|---------|--------|
| P0 | expo-web-browser | Affiliate link handling via Chrome Custom Tabs | Ready to implement |
| P0 | PostHog (free tier) | Product analytics, feature flags, session replay | Ready to implement |
| P0 | Firebase Analytics (GA4) | Free unlimited events + BigQuery export | google-services.json exists |
| P0 | Supabase click tracking | Server-side affiliate attribution | Schema design ready |
| P1 | Expo Linking | Basic deep links for spot sharing | Built into Expo |
| P1 | expo-notifications | Push notifications with basic segmentation | Already installed |
| P2 | Firebase BigQuery export | Data warehouse foundation | Enable after launch |

### Phase 2: Growth (10K-100K MAU) -- Cost: ~$50-150/month

| Priority | Tool | Purpose |
|----------|------|---------|
| P0 | AdMob native ads | Supplementary ad revenue |
| P0 | PostHog A/B testing | Optimize affiliate CTA placement |
| P1 | Referral program | Viral growth loop |
| P1 | Advanced push segmentation | Re-engagement + monetization |
| P2 | Meta Audience Network | Ad mediation for +15-25% ad revenue |

### Phase 3: Scale (100K+ MAU) -- Cost: ~$300-1,000/month

| Priority | Tool | Purpose |
|----------|------|---------|
| P0 | Google Ad Manager | Direct B2B ad sales (Promoted listings) |
| P0 | Full BigQuery warehouse | Cross-source revenue attribution |
| P1 | Branch.io | Deferred deep linking for viral loops |
| P1 | RevenueCat | B2B subscription billing (if needed) |
| P2 | UXCam | Mobile heatmaps (if PostHog insufficient) |

### Total Cost at Each Stage

| Stage | Monthly Cost | Revenue Offset |
|-------|-------------|---------------|
| Launch (0-10K MAU) | $0 | Affiliate clicks begin |
| Growth (10K-100K MAU) | $50-150 | $500-5,000/mo affiliate + ads |
| Scale (100K+ MAU) | $300-1,000 | $5,000-50,000/mo all sources |

---

## Sources

- [Expo WebBrowser Documentation](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [Expo Linking Documentation](https://docs.expo.dev/linking/overview/)
- [React Native Google Mobile Ads](https://docs.page/invertase/react-native-google-mobile-ads)
- [AdMob vs Google Ad Manager](https://adreact.com/blog/admob-vs-gam-which-is-right-for-your-app/)
- [AdMob Mediation Setup](https://developers.google.com/admob/android/mediation)
- [Privacy Sandbox Status](https://privacysandbox.google.com/overview/status)
- [Google Privacy Sandbox Shutdown](https://usercentrics.com/knowledge-hub/what-is-google-privacy-sandbox/)
- [PostHog React Native SDK](https://posthog.com/docs/libraries/react-native)
- [PostHog Session Replay for React Native](https://posthog.com/docs/session-replay/installation/react-native)
- [PostHog Pricing](https://posthog.com/pricing)
- [PostHog vs Mixpanel](https://posthog.com/blog/posthog-vs-mixpanel)
- [Amplitude vs Mixpanel vs PostHog](https://www.brainforge.ai/resources/amplitude-vs-mixpanel-vs-posthog)
- [Firebase Analytics for React Native (2026)](https://medium.com/@ermohit2k18/implement-firebase-analytics-in-react-native-step-by-step-guide-2026-edition-a8e551c63aa5)
- [React Native Firebase Analytics](https://rnfirebase.io/analytics/usage)
- [Firebase Remote Config A/B Testing](https://firebase.google.com/docs/ab-testing/abtest-config)
- [PostHog Mobile Session Replay Tools](https://posthog.com/blog/best-mobile-app-session-replay-tools)
- [UXCam Mobile Analytics](https://uxcam.com/blog/hotjar-for-mobile-apps/)
- [Firebase BigQuery Export](https://firebase.google.com/docs/projects/bigquery-export)
- [Deep Linking in React Native 2026](https://app.smler.io/blogs/deep-linking/react-native/deep-linking-in-react-native-complete-guide-2026)
- [Deferred Deep Linking SDKs Comparison 2026](https://tolinku.com/blog/deferred-deep-linking-sdks-comparison/)
- [Branch.io React Native SDK](https://github.com/BranchMetrics/react-native-branch-deep-linking-attribution)
- [Firebase Dynamic Links Alternatives 2026](https://chottulink.com/blog/firebase-dynamic-links-shut-down-5-best-alternatives-for-2026/)
- [App Store Conversion Rate by Category 2026](https://adapty.io/blog/app-store-conversion-rate/)
- [Mobile App Conversion Rate Benchmarks 2026](https://kirro.io/mobile-app-conversion-rate)
- [ARPU vs LTV](https://appfollow.io/blog/arpu-vs-ltv-how-to-increase-the-lifetime-value-of-your-app-users)
- [2025 Mobile App Report: LTV Benchmarks](https://arpubrothers.com/blog/2025-saas-mobile-apps-trends/)
- [RevenueCat Expo Integration](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [Google Play Billing Library 8](https://www.revenuecat.com/blog/engineering/google-play-billing-v8/)
- [Play Store Conversion Analytics](https://www.easyappreports.com/report-field/store-listing-conversion-rate)
- [Push Notification Strategy](https://www.pushwoosh.com/blog/push-notification-strategy/)
- [Best Mobile App Analytics Tools 2026](https://uxcam.com/blog/top-mobile-app-analytics-tools/)
- [Integrating AdMob in React Native Expo](https://dev.to/oghenetega_adiri/integrating-admob-in-react-native-expo-a-comprehensive-developers-guide-35ij)
- [Meta Audience Network with AdMob Mediation](https://developers.google.com/admob/android/mediation/meta)
- [Unity Ads with AdMob Mediation](https://developers.google.com/admob/android/mediation/unity)
