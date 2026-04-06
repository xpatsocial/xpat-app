# Internationalization & Localization Research
## x/pat — Digital Nomad App
**Date:** 2026-04-06
**Prepared by:** CTO Office
**Scope:** 30 research topics across i18n libraries, RTL support, locale formatting, App Store localization, translation workflows, and machine translation for UGC.

---

## Executive Summary

x/pat serves digital nomads across Bangkok, Lisbon, and Mexico City at launch — a population that skews toward English, Thai, Portuguese, and Spanish speakers. However, the nomad demographic is globally distributed: German, French, Dutch, Japanese, Korean, and Arabic speakers are all significant segments of the international remote work population. A credible i18n architecture from launch signals professionalism, enables organic growth in non-English markets, and unlocks ASO ranking in additional App Store territories.

**Priority tiers used throughout this document:**
- **Launch Critical** — must ship before v1.0
- **Post-Launch Quick Win** — implement within 60 days of launch
- **Roadmap** — plan for v1.5 or beyond

---

## Section 1: i18n Libraries for React Native (Topics 1–5)

---

### Topic 1: i18next — Core Framework

**What it is:** i18next is the most widely adopted JavaScript i18n framework, with 12M+ weekly npm downloads as of 2025. It is framework-agnostic and works across React, React Native, Node, and plain JS. It is the de facto standard for production-grade localization in the JavaScript ecosystem.

**Key features:**
- Pluralization (handles complex plural forms in Slavic languages, Arabic, etc.)
- Interpolation with formatting (`{{count}} spots`, `{{name, uppercase}}`)
- Namespace support — split translations into logical chunks (common, navigation, profile, spots, etc.)
- Context-based translations (different strings for logged-in vs. anonymous)
- Language detection plugins
- Backend plugins for loading translations from remote URLs (CDN, S3)
- Missing key fallback chains: `en-TH` → `en` → default string
- TypeScript-first since v22 — full type inference for translation keys

**React Native compatibility:** Full. There are no browser-specific dependencies. Works on both iOS and Android without any native module bridging.

**Bundle size:** Core i18next is ~14 KB gzipped. Plugins add 2–5 KB each.

**Installation:**
```bash
npm install i18next
```

**Configuration (bare minimum for x/pat):**
```typescript
// src/lib/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import th from './locales/th.json';

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es }, pt: { translation: pt }, th: { translation: th } },
    lng: Localization.locale.split('-')[0], // 'en', 'es', etc.
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4', // Required for React Native (no Intl.PluralRules polyfill needed)
  });

export default i18n;
```

**Cost:** Free, MIT license.

**Priority:** Launch Critical. Install and wire up before any user-facing string is hardcoded.

**Gotcha:** React Native's Hermes engine does not ship Intl.PluralRules by default. Set `compatibilityJSON: 'v4'` to use i18next's own pluralization engine, which avoids the polyfill requirement entirely.

---

### Topic 2: expo-localization — Device Locale Detection

**What it is:** Expo's official SDK module that reads the device's locale settings from the OS. It does not translate anything — it only tells you what the user's device is set to. It pairs with i18next to auto-detect and apply the correct language on first launch.

**API surface (as of Expo SDK 52):**
- `Localization.locale` — BCP 47 tag string, e.g., `"en-US"`, `"es-MX"`, `"th-TH"`, `"ar-AE"`
- `Localization.locales` — ordered array of all user-preferred locales (iOS allows multiple ranked preferences)
- `Localization.timezone` — IANA timezone string, e.g., `"Asia/Bangkok"`
- `Localization.isRTL` — boolean, true for Arabic, Hebrew, Urdu, Farsi
- `Localization.currency` — ISO 4217 currency code based on region, e.g., `"THB"`, `"EUR"`, `"MXN"`
- `Localization.region` — ISO 3166-1 alpha-2 country code, e.g., `"TH"`, `"PT"`, `"MX"`
- `Localization.getLocales()` — async version that returns full locale objects including `languageCode`, `regionCode`, `textDirection`

**Installation:**
```bash
npx expo install expo-localization
```

**Integration with i18next:** Pass `Localization.locale.split('-')[0]` as the `lng` parameter during i18next init. For multi-locale preference respecting (iOS users who set French as second language), iterate `Localization.locales` and pick the first one that matches your supported languages.

**Cost:** Free, part of Expo SDK.

**Priority:** Launch Critical. Required for language auto-detection on first app open.

**Important note:** `expo-localization` reads the device setting — it does not read a user preference stored in your database. If you want users to override their device language inside the app, you must store that preference in Supabase (user_settings table, `preferred_language` column) and load it before i18next init. This is a Post-Launch Quick Win.

---

### Topic 3: react-i18next — React Bindings & Hooks

**What it is:** The official React adapter for i18next. Provides React Context, hooks, and HOCs that make translation ergonomic in component trees. Without this, you would have to manually call `i18n.t()` everywhere and manage re-renders manually.

**Primary APIs:**
- `useTranslation(namespace?)` hook — returns `{ t, i18n }`. `t('key')` returns the translated string. Automatically re-renders the component when language changes.
- `<Trans>` component — for strings that contain embedded JSX (e.g., "Click **here** to view your spots"). Handles interpolation of React nodes.
- `<I18nextProvider>` — wraps the app root to provide i18n context (usually done once in `_layout.tsx`).
- `withTranslation()` HOC — for class components (rare in modern Expo apps).

**TypeScript support:** Generate a type declaration from your translation file to get autocomplete on all translation keys:
```typescript
// src/types/i18next.d.ts
import 'i18next';
import en from '../lib/i18n/locales/en.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
```

**Namespace strategy for x/pat:**
- `common` — shared UI strings (Save, Cancel, Loading, Error)
- `auth` — login, signup, forgot password
- `navigation` — tab names, screen titles
- `spots` — spot card labels, categories, amenities
- `profile` — profile fields, settings labels
- `feed` — feed empty states, post actions

**Lazy loading:** Translations can be loaded on demand per namespace, reducing initial bundle. For a startup with <500 string keys, this is not needed at launch — ship all translations inline.

**Cost:** Free, MIT license.

**Priority:** Launch Critical. Install alongside i18next.

---

### Topic 4: Alternative — react-native-i18n / lingui

**What it is:** This topic covers awareness of the alternative landscape so the right choice is made deliberately.

**react-native-i18n:** Deprecated as of 2023. Do not use. It required native linking and has been superseded by expo-localization + i18next.

**@lingui/react (LinguiJS):** A strong alternative to i18next with a different philosophy:
- Uses `<Trans>` JSX macros as the source of truth — no separate JSON files for the source language
- Babel/SWC macro extracts strings at build time into a catalog
- Better for teams that write UI first, translate later
- More ergonomic for strings with embedded HTML/JSX
- Slightly more complex build setup (requires Babel macro)
- Good TypeScript support
- Crowdin/Phrase both have native Lingui support

**Verdict for x/pat:** Stick with i18next + react-i18next. The JSON-file approach is simpler for a solo founder, works without Babel macros, and has the largest community of plugins, tutorials, and LLM training data (which matters for AI-assisted translation). Lingui is worth revisiting at v2.0 if you hire a frontend team.

**Cost:** Both free, MIT.

**Priority:** Post-Launch awareness. Evaluate Lingui at v2.0 if translation workflow becomes painful.

---

### Topic 5: Translation File Architecture & Namespace Strategy

**What it is:** How to structure your JSON translation files for scalability, avoiding the "one giant en.json" antipattern.

**Recommended folder structure for x/pat:**
```
src/lib/i18n/
  index.ts              ← i18next init
  locales/
    en/
      common.json
      auth.json
      navigation.json
      spots.json
      profile.json
      feed.json
    es/
      (same files)
    pt/
      (same files)
    th/
      (same files)
```

**Flat vs. nested keys:**
- Nested: `{ "spots": { "card": { "distance": "{{km}} km away" } } }` — accessed as `t('spots.card.distance', { km: 1.2 })`
- Flat: `{ "spots_card_distance": "{{km}} km away" }` — harder to find in a large file
- Recommendation: Use 2-level nesting max. Deeper nesting increases key name length and makes the TypeScript types harder to navigate.

**Pluralization example (handles English, Spanish, Thai correctly):**
```json
{
  "spots_count": "{{count}} spot",
  "spots_count_plural": "{{count}} spots"
}
```
For Arabic (6 plural forms), i18next `compatibilityJSON: 'v4'` handles this automatically with suffixes `_zero`, `_one`, `_two`, `_few`, `_many`, `_other`.

**String interpolation best practices:**
- Always use named parameters: `"welcome": "Welcome back, {{name}}"` not `"welcome": "Welcome back, %s"`
- Never concatenate translated strings — word order differs across languages: German often places verbs at the end, Japanese has no spaces between words.
- For dates/numbers inside strings, pass pre-formatted values as parameters.

**Launch language priority for x/pat:**
1. English (en) — primary, launch-ready
2. Spanish (es) — Mexico City market
3. Portuguese (pt) — Lisbon market (note: pt-PT, not pt-BR)
4. Thai (th) — Bangkok market

**Post-launch additions:**
- German (de) — large nomad segment
- French (fr) — European nomads
- Japanese (ja) — significant nomad + expat segment
- Arabic (ar) — Gulf-based nomads (triggers RTL architecture)

**Cost:** $0 for file structure. Translation cost addressed in Section 5.

**Priority:** Launch Critical for en/es/pt/th structure. German/French/Japanese/Arabic are Post-Launch Quick Wins.

---

## Section 2: Right-to-Left (RTL) Support (Topics 6–10)

---

### Topic 6: RTL Fundamentals in React Native

**What it is:** Right-to-left text direction support for Arabic, Hebrew, Urdu, Farsi, and Pashto — all written from right to left. This is not just text alignment; it requires full layout mirroring, icon direction reversal, and navigation direction reversal.

**Affected languages with nomad relevance:** Arabic (~400M speakers, significant Gulf expat + remote worker population), Hebrew (~10M native speakers, many Israeli nomads in Berlin, Lisbon, Bangkok). Urdu/Farsi are smaller nomad segments.

**The I18nManager API:**
React Native exposes `I18nManager` for RTL control:
```typescript
import { I18nManager } from 'react-native';

// Read current direction
const isRTL = I18nManager.isRTL; // boolean

// Force RTL layout (requires app restart to take effect)
I18nManager.forceRTL(true);

// Allow RTL layout mirroring
I18nManager.allowRTL(true);
```

**Critical fact:** Calling `forceRTL()` does not immediately apply — the app must restart. This means language switching to Arabic/Hebrew requires a full app reload or a prompt to restart. Use `RNRestart` (react-native-restart) to trigger a JS bundle reload after forcing RTL.

**Cost:** Free — built into React Native.

**Priority:** Roadmap (Arabic/Hebrew are not launch markets). Build RTL-awareness into your component library from day one to avoid a full refactor later.

---

### Topic 7: Flex Layout Mirroring for RTL

**What it is:** React Native's flexbox layout automatically mirrors when `I18nManager.isRTL` is true — but only if you follow the correct conventions. Many developers write layout that appears to work LTR but breaks in RTL.

**Rules for RTL-safe layout:**

1. **Never use `alignItems: 'flex-start'` for "left alignment"** — use `alignItems: 'flex-start'` knowing that in RTL, flex-start IS the right side. This is actually correct behavior — let it mirror.

2. **Avoid `marginLeft`/`marginRight`, `paddingLeft`/`paddingRight`** for directional spacing. Use `marginStart`/`marginEnd` and `paddingStart`/`paddingEnd` instead — these automatically mirror in RTL.

3. **`position: absolute` elements with `left`/`right` do NOT automatically mirror.** You must calculate them manually:
   ```typescript
   const { isRTL } = I18nManager;
   const backButtonStyle = isRTL ? { right: 16 } : { left: 16 };
   ```

4. **Icons that convey direction** (back arrow, forward chevron, send button) must be flipped in RTL:
   ```typescript
   const chevronStyle = {
     transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }]
   };
   ```

5. **`StyleSheet.absoluteFill` and `StyleSheet.absoluteFillObject`** do not mirror — check any absolute overlays.

6. **`FlatList` and `ScrollView`** horizontal scrolling mirrors automatically when `isRTL` is true. No action needed.

**Component audit checklist for RTL readiness:**
- [ ] All horizontal margins/paddings use `Start`/`End` variants
- [ ] Navigation back button position is dynamic
- [ ] All directional icons are conditionally flipped
- [ ] Text alignment uses `textAlign: 'auto'` (inherits direction) or explicit `'left'`/`'right'` only when intentional
- [ ] TabBar icons that point left/right are flipped

**Priority:** Build `Start`/`End` margin/padding conventions into x/pat's design system now (Launch Critical convention, Roadmap activation).

---

### Topic 8: RTL Text Rendering & Typography

**What it is:** Text rendering in Arabic/Hebrew involves complex script shaping, bidirectional text (a sentence can mix Arabic and English numbers), and different font considerations.

**Bidirectional text (BiDi):** A string like "Connect at WeWork 15 رياض" mixes LTR (English, numbers) and RTL (Arabic) within a single line. The Unicode BiDi algorithm handles this automatically in React Native's `Text` component. No special handling needed for mixed strings.

**Font considerations:**
- Arabic requires a font that supports the full Arabic Unicode block (U+0600–U+06FF) plus Arabic Presentation Forms.
- iOS ships with "Geeza Pro" and "Helvetica Neue" Arabic — both adequate.
- Android ships with "Noto Naskh Arabic" — adequate for body text.
- Custom fonts: If x/pat ever adds a custom typeface, verify it includes Arabic glyphs before shipping Arabic support.

**Text alignment:** Set `textAlign: 'auto'` on all `Text` components. In LTR, this renders left-aligned. In RTL, right-aligned. Only use explicit `'left'` or `'right'` for truly directional-independent content (like currency amounts that should always be LTR).

**Line height and character spacing:** Arabic script is taller per line than Latin — design card heights with enough vertical padding to accommodate. A minimum line height of 1.5× font size is recommended for Arabic body text.

**Cost:** Free — OS-provided fonts are sufficient for launch.

**Priority:** Roadmap. Flag for the design system when Arabic/Hebrew is activated.

---

### Topic 9: RTL Navigation with Expo Router

**What it is:** Expo Router (file-based routing) and React Navigation both have built-in RTL support for navigation animations — but it requires knowing what to configure.

**React Navigation RTL behavior:**
- Stack navigator: slide animation mirrors in RTL (screen slides in from left, back button appears on right) automatically when `I18nManager.isRTL` is true.
- Tab navigator: tabs appear in reversed order in RTL — this may or may not be desired (some apps keep tab order consistent, others mirror it).
- Drawer navigator: drawer opens from right side in RTL automatically.

**Expo Router specifics:**
- Expo Router v3+ respects `I18nManager.isRTL` for its built-in animations.
- `useRouter().back()` works correctly in both directions.
- The `<Stack.Screen options={{ headerLeft }}` and `headerRight` positions do NOT auto-mirror — you must swap them manually for RTL.

**Example: RTL-aware header button:**
```typescript
const isRTL = I18nManager.isRTL;

<Stack.Screen
  options={{
    headerLeft: isRTL ? undefined : () => <BackButton />,
    headerRight: isRTL ? () => <BackButton /> : undefined,
  }}
/>
```

**Gesture handling:** React Native Gesture Handler's swipe-to-go-back gesture automatically reverses in RTL. No action needed.

**Cost:** Free.

**Priority:** Roadmap. Document the pattern now so it is implemented correctly when Arabic goes live.

---

### Topic 10: RTL Testing Strategy

**What it is:** How to test RTL layouts without having an Arabic-speaking device or team member.

**Method 1 — Force RTL in development:**
```typescript
// In your dev menu or a hidden debug screen
if (__DEV__) {
  I18nManager.forceRTL(true);
  // then trigger RNRestart
}
```
This forces RTL layout even with English text, letting you visually inspect all screens for layout issues.

**Method 2 — Use pseudo-localization:**
Replace all English strings with a mirrored/expanded version during testing to catch truncation (Arabic is often longer than English) and BiDi issues. Tools: `pseudolocalization` npm package.

**Method 3 — iOS Simulator:**
In Simulator, go to Settings > General > Language & Region > iPhone Language > Arabic. The simulator applies RTL without needing a physical device.

**Method 4 — Android Emulator:**
Developer Options > Force RTL layout direction. Instant toggle, no app restart needed on emulator.

**Automated testing:** Use Detox or CAVY to run a smoke test in forced-RTL mode as part of CI before any Arabic release.

**Key screens to audit:** SpotCard, FeedScreen, ProfileScreen, ChatScreen, SearchScreen, TabBar, all modals.

**Cost:** Free tools.

**Priority:** Roadmap. Set up the force-RTL dev flag when Arabic translation begins.

---

## Section 3: Date, Time & Currency Formatting (Topics 11–15)

---

### Topic 11: Date & Time Formatting with Intl.DateTimeFormat

**What it is:** JavaScript's built-in `Intl.DateTimeFormat` API formats dates according to locale conventions without any external library. This is the correct approach — avoid moment.js (deprecated, 67 KB) and date-fns locale bundles (adds ~30 KB per locale) when the platform provides this natively.

**Hermes engine Intl support:** As of React Native 0.73+ with Hermes, full `Intl` support is available by default. Older RN versions required a polyfill (`@formatjs/intl-datetimeformat`). Expo SDK 50+ uses RN 0.73+, so x/pat is covered.

**Examples of locale-aware formatting:**
```typescript
const formatDate = (date: Date, locale: string) => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'long', day: 'numeric'
  }).format(date);
};

formatDate(new Date(), 'en-US')  // "April 6, 2026"
formatDate(new Date(), 'es-MX')  // "6 de abril de 2026"
formatDate(new Date(), 'pt-PT')  // "6 de abril de 2026"
formatDate(new Date(), 'th-TH')  // "6 เมษายน 2569" (Thai Buddhist calendar year)
formatDate(new Date(), 'de-DE')  // "6. April 2026"
```

**Thai Buddhist Era (BE) calendar:** Thai locale uses BE year — 2026 CE = 2569 BE. `Intl.DateTimeFormat` with `th-TH` handles this automatically. No special logic needed.

**Relative time (e.g., "2 hours ago"):** Use `Intl.RelativeTimeFormat`:
```typescript
const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
rtf.format(-2, 'hour');  // "hace 2 horas"
rtf.format(-1, 'day');   // "ayer"
```

**Time zones:** Use `expo-localization`'s `Localization.timezone` to get the user's IANA timezone. Pass it to `Intl.DateTimeFormat` with `timeZone` option for all displayed times. This is critical for event times, check-in hours, and "last seen" timestamps in chat.

**Cost:** Free — built into the JavaScript runtime.

**Priority:** Launch Critical. All date/time displays in spots (hours, check-in times), feed (post timestamps), and chat (message times) must use locale-aware formatting.

---

### Topic 12: Currency Formatting by Locale

**What it is:** Currency display conventions vary significantly by locale — symbol position, decimal separator, thousands separator, and number of decimal places all differ.

**Examples:**
```typescript
const formatCurrency = (amount: number, currency: string, locale: string) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

formatCurrency(1500, 'THB', 'th-TH')  // "฿1,500"
formatCurrency(1500, 'EUR', 'pt-PT')  // "1 500 €" (note: space as thousands separator)
formatCurrency(1500, 'MXN', 'es-MX')  // "$1,500.00"
formatCurrency(1500, 'USD', 'en-US')  // "$1,500.00"
formatCurrency(1500, 'EUR', 'de-DE')  // "1.500 €" (period as thousands separator)
```

**x/pat relevance:** Coworking spot prices, amenity costs (day passes, meeting room rates), affiliate product prices. Since affiliate links are "Coming Soon" at launch, full currency formatting can be Post-Launch — but build the utility function now so it's ready.

**Currency detection:** Use `Localization.currency` from expo-localization to get the user's device currency code. Offer a manual override in Settings (users in Thailand may prefer to see prices in USD).

**Price display strategy:** For user-generated spot data, store prices in the original currency in Supabase (a `price_amount` float and `price_currency` ISO 4217 code column on the `spots` table). Display in the user's preferred currency using live FX rates (Post-Launch — free tier available from Open Exchange Rates or ExchangeRate-API).

**Cost:** `Intl.NumberFormat` is free. Live FX rates: Open Exchange Rates free tier gives 1,000 requests/month. Sufficient for early launch.

**Priority:** Launch Critical for display formatting. Live FX conversion is Post-Launch Quick Win.

---

### Topic 13: Number Formatting by Locale

**What it is:** Numbers (distances, ratings, counts) also vary by locale in decimal and thousands separator usage.

**Key differences:**
- English: `1,234.56` (comma thousands, period decimal)
- German/Portuguese/Spanish: `1.234,56` (period thousands, comma decimal)
- Thai: `1,234.56` (same as English for numbers, though Thai numerals ๑๒๓๔ exist)
- Arabic: `١٬٢٣٤٫٥٦` (Eastern Arabic numerals, optional)

**Implementation:**
```typescript
const formatNumber = (value: number, locale: string, options?: Intl.NumberFormatOptions) => {
  return new Intl.NumberFormat(locale, options).format(value);
};

// Distance
formatNumber(1.2, 'de-DE')  // "1,2"
formatNumber(1.2, 'en-US')  // "1.2"

// Ratings
formatNumber(4.7, 'pt-PT')  // "4,7"
```

**Distance units:** Thailand, Portugal, and Mexico all use kilometers. The US is the main exception (miles). Since x/pat targets international nomads, use km exclusively. Label it explicitly: "1.2 km" — don't localize the unit itself at launch.

**Cost:** Free.

**Priority:** Launch Critical for distances and ratings displayed in SpotCard.

---

### Topic 14: Timezone Handling Across Launch Cities

**What it is:** x/pat spans three timezones at launch: Asia/Bangkok (UTC+7), Europe/Lisbon (UTC+0/UTC+1 DST), America/Mexico_City (UTC-6/UTC-5 DST). This affects spot hours, events, and chat timestamps.

**Architecture decisions:**

1. **Store all timestamps in UTC in Supabase.** Never store local time. Supabase/PostgreSQL uses `TIMESTAMPTZ` — always use this type, never `TIMESTAMP`.

2. **Display in user's local timezone.** Use `Localization.timezone` from expo-localization for the display timezone. Wrap in a utility:
   ```typescript
   const toLocalTime = (utcDate: string, timezone: string) => {
     return new Intl.DateTimeFormat('en', {
       timeZone: timezone,
       hour: '2-digit', minute: '2-digit'
     }).format(new Date(utcDate));
   };
   ```

3. **Spot operating hours:** Store as local time strings + timezone identifier in Supabase (e.g., `opens_at: "09:00"`, `timezone: "Asia/Bangkok"`). When displaying, check if current UTC time falls within operating hours by converting both to UTC for comparison.

4. **DST awareness:** Lisbon observes DST (CET/CEST). Mexico City observes DST (CST/CDT). Bangkok does not. The `Intl` API handles DST automatically via the IANA timezone database embedded in the platform. No manual DST offset handling required.

**Library option:** `date-fns-tz` adds ~8 KB and provides `zonedTimeToUtc` / `utcToZonedTime` helpers if the Intl approach feels verbose. Acceptable dependency for a startup.

**Cost:** Free.

**Priority:** Launch Critical. UTC storage is non-negotiable. Display formatting can be done progressively — timestamps showing UTC at launch is acceptable as a temporary state, but aim for localized display by launch.

---

### Topic 15: Locale-Aware Sorting & Collation

**What it is:** Alphabetical sorting differs by language. Swedish treats "ä" as coming after "z". French ignores accents for primary sort but uses them for secondary sort. Thai has its own alphabetical order.

**`Intl.Collator` API:**
```typescript
const sortedSpots = spots.sort((a, b) =>
  new Intl.Collator(userLocale, { sensitivity: 'base' }).compare(a.name, b.name)
);
```

**x/pat relevance:**
- Spot name sorting in search results
- User list sorting in follows/followers
- Category label sorting in filters

**For search:** Full-text search in Supabase uses PostgreSQL's `pg_trgm` extension, which is locale-agnostic (trigram matching). For Thai, trigrams work but the search experience is weaker because Thai has no spaces between words. A dedicated Thai search solution (e.g., word segmentation) is a Roadmap item.

**Cost:** Free — `Intl.Collator` is built-in.

**Priority:** Post-Launch Quick Win. Sorting errors are cosmetic, not functional. Fix within 30 days of launch.

---

## Section 4: App Store Localization (Topics 16–20)

---

### Topic 16: App Store Connect — Metadata Localization

**What it is:** Apple's App Store supports metadata (app name, subtitle, description, keywords, what's new) in 40 languages. Localizing metadata increases ASO discoverability in non-English-speaking territories without any code changes.

**What can be localized per language:**
- App Name (30 characters) — the most valuable field for ASO
- Subtitle (30 characters) — appears below the name on the product page
- Description (4,000 characters) — long-form description
- Keywords (100 characters, comma-separated, no spaces after commas) — not visible to users, used by Apple's search index
- Promotional Text (170 characters) — can be updated without a new app version
- What's New text — per-version release notes

**Multiplier effect:** If you localize to 5 languages (en, es, pt, th, de), you get 5× keyword sets — each 100 characters. That is 500 effective keyword characters in Apple's index. This is the single highest-ROI ASO action for international apps.

**Implementation steps:**
1. Log in to App Store Connect → select x/pat → App Information
2. Scroll to "Localizations" section → click "+" to add a language
3. Add: Spanish (Mexico), Portuguese (Portugal), Thai, German (optional at launch)
4. For each localization, provide: Name, Subtitle, Description, Keywords
5. Screenshots: Ideally provide localized screenshots (showing the UI in that language), but English screenshots are acceptable for launch. Localized screenshots significantly increase conversion — target for v1.1.

**Keyword strategy by language:**
- English: "digital nomad", "coworking", "remote work", "expat community", "work abroad"
- Spanish: "nómada digital", "coworking", "trabajo remoto", "expatriado", "trabajo desde México"
- Portuguese: "nómada digital", "coworking", "trabalho remoto", "expatriado", "trabalho Lisboa"
- Thai: "โนแมดดิจิตัล", "โคเวิร์กกิ้ง", "ทำงานออนไลน์", "ชาวต่างชาติ", "coworking กรุงเทพ"

**Cost:** Free — App Store Connect is part of the $99/year Apple Developer Program you already pay for.

**Priority:** Launch Critical. Submit localized metadata simultaneously with the English app submission. No code required.

---

### Topic 17: Google Play Store — Listing Localization

**What it is:** Google Play supports 77 languages for store listing metadata. The localization approach is similar to Apple but with some differences.

**Google Play fields:**
- App Name (50 characters — 20 more than Apple)
- Short Description (80 characters) — appears in search results
- Full Description (4,000 characters)
- Feature Graphic (1,024×500 px — can be localized)
- Screenshots (per device type, can be localized)

**Key difference from Apple:** Google Play does not have a separate Keywords field — keywords are derived from your app name, short description, and full description. Keyword stuffing in the description is penalized. Write naturally but include target terms in the first 167 characters of the short description (Google's index weight is front-loaded).

**Implementation steps:**
1. Google Play Console → x/pat → Store presence → Store listing
2. Manage translations → Add language
3. Provide translated name, short description, full description
4. Optionally: localized screenshots (higher conversion)

**Google's free translation tool:** Play Console offers a built-in translation service powered by Google Translate. It provides a rough draft — use it as a starting point, then review with a native speaker or DeepL re-translation. Do not publish machine-translated descriptions without review; they often contain unnatural phrasing that reduces conversion.

**Cost:** Free within Play Console. Professional translation per language: $15–50 for short/full description (see Section 5).

**Priority:** Launch Critical. Localize Play listing for Spanish, Portuguese, Thai on day one.

---

### Topic 18: Screenshot Localization for ASO

**What it is:** Localized App Store screenshots (showing UI in the local language) increase conversion rates by 20–35% compared to English screenshots for non-English store listings, according to multiple ASO studies. This is the second-highest-ROI localization action after keyword metadata.

**What's required:**
- iOS: Screenshots at required resolutions for each device size (6.5", 6.7", 12.9" iPad)
- Android: Screenshots at various densities

**Production approach (bootstrapped):**
1. Build the app in each target language (use i18next language switching in dev)
2. Take simulator/emulator screenshots in each language
3. Add marketing overlay text in the target language using Figma or Canva
4. Export at required resolutions

**Tools for automated screenshot generation:**
- **Fastlane Snapshot:** Automatically captures screenshots in all simulators across all locales. Free, open-source. Requires Xcode. Significant one-time setup cost (~4 hours), then fully automated for future releases.
- **Shotbot / AppFollow Screenshot Generator:** Web-based, $0–$49/month depending on tier. Faster setup than Fastlane.
- **Canva App Store Screenshot templates:** Manual but fast for 3–4 languages. Free tier sufficient.

**Priority for x/pat:** For launch, English screenshots with localized metadata is acceptable. Localized screenshots for Spanish (CDMX market) and Thai (Bangkok market) within 60 days. Portuguese (Lisbon) can follow.

**Cost:** Fastlane is free. Canva free tier is sufficient. Budget 4–8 hours of design time per language set.

**Priority:** Post-Launch Quick Win (within 60 days).

---

### Topic 19: App Store Ratings & Reviews Localization

**What it is:** Users leave reviews in their native language. Responding to reviews in the user's language significantly improves perceived quality and can recover a negative review. Apple and Google both show developer responses publicly.

**Apple App Store:** Reply to reviews in App Store Connect → Ratings and Reviews. No character limit on responses. Apple notifies the reviewer when you reply.

**Google Play:** Reply via Play Console → Ratings and Reviews. Google offers auto-translated review display in the console so you can read Thai/Spanish reviews in English.

**Strategy for x/pat:**
1. Enable review response notifications in both consoles
2. Use DeepL API (covered in Section 6) to auto-translate incoming reviews for triage
3. Write responses in the reviewer's language using DeepL for translation
4. For critical 1-star reviews, invest 15 minutes in a well-crafted, human-reviewed response
5. Target a 48-hour response time — faster response time correlates with improved star ratings

**App Store review prompts:** Use `expo-store-review` (`StoreReview.requestReview()`) to trigger the native review prompt. Best timing: after a user successfully saves their third spot to their list, or after their fifth session. Never prompt on first session.

**Cost:** DeepL API free tier: 500,000 characters/month — more than sufficient for review responses. Zero cost until you have thousands of reviews.

**Priority:** Post-Launch Quick Win. Set up response workflow before the first reviews come in.

---

### Topic 20: App Store Feature Promotions by Territory

**What it is:** Apple's Editorial team features apps by territory — an app featured in "Apps We Love" in Thailand gets a separate featuring from one featured in Mexico. Localizing your app genuinely for each market increases the chance of territory-specific editorial featuring.

**Apple Search Ads (ASA) localization:** Apple Search Ads (available in 91 countries) lets you bid on keywords in any supported language. Running localized ad campaigns in Thai and Spanish with localized keywords and app store listings yields significantly better CPIs than running English ads in those markets.

**Google UAC (Universal App Campaigns):** Google automatically localizes UAC ads based on your store listing translations. If you have a localized Play listing, Google's ML selects the right language creative for each user — you don't need to create separate campaigns.

**Apple Small Business Program:** At <$1M annual revenue, Apple takes 15% commission instead of 30%. x/pat qualifies. Ensure enrollment is active — this does not affect localization but is worth noting alongside App Store strategy.

**Priority:** Post-Launch Quick Win for ASA localized campaigns in Bangkok/CDMX. Roadmap for editorial featuring strategy.

---

## Section 5: Translation Workflow (Topics 21–25)

---

### Topic 21: Crowdin — Professional Translation Platform

**What it is:** Crowdin is the leading translation management system (TMS) for software. It integrates directly with GitHub, automatically pulls new strings from your codebase when you push commits, sends them to translators, and opens a PR back into your repo with the completed translations.

**Key features:**
- GitHub/GitLab/Bitbucket integration (automatic sync)
- In-context editor — translators see your actual app UI as they translate
- Translation memory — reuses approved translations for repeated strings, reducing cost
- Glossary — enforces consistent terminology (e.g., "spot" should never be translated as "lugar" in Spanish — keep it as "spot" to maintain brand voice)
- Machine translation pre-fill (Google Translate, DeepL, Microsoft Translator) with human post-edit
- Crowdsourcing mode — invite community volunteers to translate for free
- QA checks — flags missing interpolation variables, wrong placeholders
- Over-the-Air (OTA) delivery — push translation updates without App Store review (see Topic 25)

**Pricing:**
- Free tier: 1 project, 50,000 strings, GitHub integration. Sufficient for x/pat at launch.
- Basic: $50/month — multiple projects, 150,000 strings.
- For a bootstrapped startup: Start on free tier, upgrade when string count exceeds limit.

**Workflow with x/pat:**
1. Connect Crowdin to `xpatsocial/xpat-app-expo` GitHub repo
2. Configure `crowdin.yml` to sync `src/lib/i18n/locales/en/*.json` as source
3. Configure output paths for `es/`, `pt/`, `th/` locales
4. Add professional translators for initial translation (see Topic 24)
5. Set up GitHub Action to pull translations before each release build

**Priority:** Post-Launch Quick Win. Manual JSON files at launch; migrate to Crowdin at first update when string count grows.

---

### Topic 22: Phrase (formerly Phrase Strings) — Enterprise-Grade TMS

**What it is:** Phrase (previously Transifex acquiree, rebranded) is Crowdin's main competitor. It targets larger teams and enterprise clients.

**Key features:**
- All Crowdin features plus: more advanced workflow automation, branch-based translation (each feature branch has its own translation job), better Figma plugin (translate designs before code)
- Figma plugin: extract strings from design files and send to translators before dev starts — useful for design-first workflows
- ICU message format support (more powerful than i18next's default format)
- Advanced TM (translation memory) across projects

**Pricing:**
- No free tier. Starter: $27/month (billed annually).
- Not recommended for bootstrapped v1.0. Use Crowdin free tier instead.

**When to consider Phrase:** If x/pat raises a seed round and hires a design team that works in Figma-first workflows, Phrase's Figma plugin provides significant efficiency gains.

**Priority:** Roadmap (post-seed).

---

### Topic 23: Lokalise — TMS with Strong Mobile Focus

**What it is:** Lokalise is a TMS with notably strong React Native and mobile-first tooling. Often cited as the best TMS for mobile-only apps.

**Key features:**
- Native support for i18next JSON format (no configuration needed)
- React Native SDK for OTA translation updates (push new strings without App Store review)
- Figma plugin (similar to Phrase)
- Translation orders: request professional translations directly from within Lokalise, powered by a marketplace of professional translators
- Screenshots: upload screenshots from the simulator; translators see the UI context automatically
- API for programmatic string management

**Pricing:**
- Free trial: 14 days.
- Essential: $120/month (billed annually) for 1 project, unlimited strings.
- Trial/free is not sustainable. Too expensive for bootstrapped solo founder at launch.

**Recommendation:** Lokalise is worth the cost at >$5K MRR when translation velocity matters and you want OTA updates without App Store review cycles.

**Priority:** Roadmap (post-revenue). Use Crowdin free tier until Lokalise is cost-justified.

---

### Topic 24: Manual Translation — Google Sheets + Professional Translators

**What it is:** The lowest-cost translation approach: maintain a Google Sheet with one row per string key, columns for each language. Export to JSON for each release. Use Upwork or Gengo for professional translation at low per-word rates.

**Google Sheets structure:**
```
| key              | en                     | es                    | pt                    | th                    |
|------------------|------------------------|-----------------------|-----------------------|-----------------------|
| common.save      | Save                   | Guardar               | Guardar               | บันทึก                |
| common.cancel    | Cancel                 | Cancelar              | Cancelar              | ยกเลิก                |
| spots.distance   | {{km}} km away        | A {{km}} km           | A {{km}} km           | ห่างออกไป {{km}} กม. |
```

**Export to JSON:** Use Google Apps Script or a simple Node.js script to export each language column as a JSON file. This takes ~1 hour to set up.

**Professional translation rates (2025–2026):**
- Spanish: $0.05–$0.12/word (Upwork, experienced translators)
- Portuguese (Portugal): $0.07–$0.14/word (pt-PT is a smaller market than pt-BR; fewer available translators)
- Thai: $0.08–$0.15/word
- Average app UI has 500–2,000 translatable words at launch
- Total cost for es + pt + th at 1,500 words average: $225–$615 one-time

**DeepL pre-translation + human review:** Use DeepL API to generate first drafts (near-free), have a professional reviewer check and correct them for $0.02–$0.04/word. Total cost for 1,500 words in 3 languages reviewed: $90–$180. Recommended approach for a bootstrapped launch.

**Glossary management in Google Sheets:** Add a "Glossary" tab — list brand terms (spot, x/pat, nomad) and their approved translations (or "keep in English"). Share this with translators before they begin.

**Priority:** Launch Critical. This IS the translation workflow for v1.0. Migrate to Crowdin post-launch as string count grows.

---

### Topic 25: Over-the-Air (OTA) Translation Updates

**What it is:** Normally, updating translation strings requires submitting a new app version to the App Store and waiting for review (24–72 hours for expedited review). OTA translation updates allow you to push updated translation JSON files to devices without going through the review process.

**How it works:**
1. Store translation JSON files in Supabase Storage or an S3-compatible CDN (Cloudflare R2 is free for 10 GB/month)
2. On app launch, fetch the latest translations version number from your API
3. If a newer version exists, download the updated JSON and cache it with AsyncStorage
4. On next app launch, i18next loads from the cached file instead of the bundled file

**i18next backend plugin for remote loading:**
```bash
npm install i18next-http-backend
```
```typescript
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: 'https://cdn.xpat.social/i18n/{{lng}}/{{ns}}.json',
    },
    fallbackLng: 'en',
    // bundled translations as fallback if network fails:
    resources: bundledTranslations,
  });
```

**Fallback strategy:** Always ship translations bundled in the app binary as a fallback. The OTA fetch is an enhancement, not a replacement.

**Apple App Store rules:** Downloading and executing new code is prohibited. Downloading new JSON data (translations) is explicitly permitted — it is content, not code. This is the same mechanism used by apps like Duolingo for content updates.

**Cost:** Cloudflare R2 free tier: 10 GB storage, 1 million requests/month. Zero cost for translation file delivery at x/pat's scale.

**Priority:** Post-Launch Quick Win. Implement within 30 days to enable fast translation corrections without App Store review delays.

---

## Section 6: Machine Translation for User-Generated Content (Topics 26–30)

---

### Topic 26: DeepL API — Best Quality Machine Translation

**What it is:** DeepL is widely regarded as the highest-quality neural machine translation service, consistently outperforming Google Translate and Microsoft Translator in blind evaluations, particularly for European languages. It was founded in Germany and has exceptionally strong German, French, Spanish, Portuguese, Italian, Dutch, and Polish translation quality.

**Supported languages (as of 2026):** 33 languages including all x/pat launch market languages: English, Spanish, Portuguese (both pt-PT and pt-BR), Thai (added 2024), German, French, Japanese, Korean, Arabic (added 2025).

**API tiers:**
- **DeepL API Free:** 500,000 characters/month. Zero cost. Requires credit card for verification but is not charged unless you upgrade. Rate-limited to 2 requests/second.
- **DeepL API Pro Starter:** $7.49/month + $0.025/1,000 characters (after 500K free). First 500K characters/month always free. Scales to millions of characters.
- **DeepL API Pro Advanced:** $57/month flat — unlimited characters. Cost-effective at >2.3M characters/month.

**Cost calculation for x/pat UGC:**
- Average spot description: 200 characters → translating to 3 languages = 600 characters
- 500 spots (current seed data) × 3 translations = 300,000 characters
- 100 new spots/month × 3 translations = 30,000 characters/month
- Monthly new UGC (posts, comments, reviews): estimated 500 posts × 150 chars × 3 langs = 225,000 characters/month
- Total estimated monthly: ~255,000 characters/month
- DeepL free tier covers this entirely until ~1,600 active content creators/month. Zero cost for the first 12+ months.

**Integration:**
```bash
npm install deepl-node
```
```typescript
import * as deepl from 'deepl-node';

const translator = new deepl.Translator(process.env.DEEPL_API_KEY);

const translateSpotDescription = async (text: string, targetLang: deepl.TargetLanguageCode) => {
  const result = await translator.translateText(text, null, targetLang);
  return result.text;
};

// Usage in Supabase Edge Function:
const translated = await translateSpotDescription(
  "Great coworking space with fast WiFi and good coffee",
  'ES'
);
// → "Gran espacio de coworking con WiFi rápido y buen café"
```

**Glossary feature:** DeepL allows uploading custom glossaries — brand terms that should never be translated. Create a glossary with entries like "spot" → "spot" (keep in English), "x/pat" → "x/pat". Free to create, used automatically in all translations.

**Priority:** Post-Launch Quick Win (60-day target). Free tier covers all early-stage usage.

---

### Topic 27: Google Cloud Translation API — Breadth Over Precision

**What it is:** Google Cloud Translation API v3 (powered by Google NMT) supports 133+ languages — far more than DeepL. This is its primary advantage: if x/pat expands to markets in Southeast Asia (Vietnamese, Indonesian, Tagalog), Africa, or Central Asia, Google has those languages; DeepL does not.

**Quality comparison:** DeepL wins on European language pairs (en↔es, en↔pt, en↔de, en↔fr) by a measurable margin in most evaluations. Google wins on Asian and less common languages. Thai quality is comparable between the two. For Arabic, Google is slightly better as of 2025.

**Pricing:**
- **Free tier:** 500,000 characters/month (same as DeepL)
- **Standard NMT:** $20 per 1 million characters after free tier
- **Advanced NMT (with glossary, formality, document translation):** $80 per 1 million characters

**Comparison with DeepL at scale:**
- At 1M characters/month: Google Standard = $20/month. DeepL Pro Starter ≈ $7.49 + $12.50 = $19.99/month. Effectively the same cost.
- At 5M characters/month: Google = $100/month. DeepL Advanced = $57/month flat. DeepL wins.

**Integration:**
```bash
npm install @google-cloud/translate
```

**Recommendation for x/pat:** Use DeepL as the primary MT provider (better quality for Spanish/Portuguese, same cost, dedicated Thai support). Use Google Cloud Translation as a fallback for unsupported languages. This is the professional dual-provider approach used by Airbnb and similar global platforms.

**Cost:** Both have 500K free characters/month. Combined free tier: 1M characters/month — effectively free for all of year 1.

**Priority:** Post-Launch Quick Win. Set up DeepL first; Google as fallback for expanded language support.

---

### Topic 28: Translation Architecture for Supabase + UGC

**What it is:** How to architect the database and API layer to store and serve translated UGC efficiently.

**Database schema (recommended):**
```sql
-- Spot descriptions with translations
CREATE TABLE spot_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  language_code text NOT NULL,  -- ISO 639-1: 'en', 'es', 'pt', 'th'
  description text NOT NULL,
  is_machine_translated boolean DEFAULT true,
  translated_at timestamptz DEFAULT now(),
  UNIQUE(spot_id, language_code)
);

-- Post/comment translations
CREATE TABLE post_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  content text NOT NULL,
  is_machine_translated boolean DEFAULT true,
  translated_at timestamptz DEFAULT now(),
  UNIQUE(post_id, language_code)
);
```

**Translation trigger strategy:**
Option A — **On-write (eager):** Translate immediately when content is created. Adds latency to post creation (200–500ms for MT API call). Use Supabase Edge Function triggered by database webhook.
Option B — **On-read (lazy):** Translate the first time a user of a different language requests the content. Cache result. Better for cold storage, slightly worse UX on first view.
Option C — **Background job:** Queue translations via pg_cron every 15 minutes for untranslated content. Best for cost optimization and avoiding rate limits. Recommended for x/pat.

**Translation indicator:** Always show users when content is machine-translated. UI convention: small "Translated" label with a globe icon. Instagram, Facebook, and Twitter all do this. Build this into SpotCard and FeedPost components. Users trust the app more when translation provenance is transparent.

**User preference:** Allow users to toggle "Show original language" per post. Store this preference in user settings. Implement as a simple boolean in user_settings table.

**Cost:** Supabase Edge Functions: 500K invocations/month on free tier. No additional cost.

**Priority:** Roadmap (v1.5). Design the schema at launch; implement the translation pipeline post-launch when content volume justifies it.

---

### Topic 29: Content Moderation Across Languages

**What it is:** Machine-translated content introduces a moderation challenge — offensive content in Thai can slip past English-language moderation systems. Proactive i18n-aware moderation is required before enabling UGC translation at scale.

**Approaches:**

**1. Language-agnostic moderation (recommended for launch):**
Supabase's `pgvector` extension allows semantic similarity checks — flag content that is semantically similar to known violations regardless of language. Combine with OpenAI Moderation API (supports 100+ languages, free tier at $0/request for the basic endpoint).

**2. Google Cloud Natural Language API:**
Detects sentiment, entity, and content safety in 30+ languages. Includes explicit content detection. $1/1,000 characters for the Safety endpoint.

**3. Perspective API (Google/Jigsaw):**
Free API for toxicity detection. Supports Spanish, Portuguese, English, German, French, and several others. No Thai support as of 2026 — use Google NL API for Thai.

**4. Human moderation escalation:**
Machine moderation should flag; humans should review. For a bootstrapped startup, set up a simple moderation queue in Supabase where flagged content is held for review before publication. Build a simple admin screen in the app (or a web admin panel) for review.

**GDPR/content moderation compliance:** If x/pat processes EU user content (Lisbon market), content moderation AI must be disclosed in the Privacy Policy and ToS. You already have these documents from Sprint 10 — add a clause about automated content moderation.

**Cost:** OpenAI Moderation API is free for the basic endpoint. Perspective API is free. Total: $0 at launch scale.

**Priority:** Post-Launch Quick Win. Implement before enabling public spot creation without approval flow.

---

### Topic 30: Real-Time Chat Translation

**What it is:** Translating chat messages in real-time as they are sent — so a Spanish speaker and a Thai speaker can communicate in x/pat chat without a shared language.

**Implementation options:**

**Option A — Translate on send:** When user A sends a message, the API immediately translates it into user B's preferred language and stores the translation. User B always sees messages in their language. User A's original language is preserved and viewable on tap.

**Option B — Translate on read (client-side):** User B's client calls the translation API when a message in a foreign language is received. More private (messages not stored translated), but adds latency and client-side API key exposure risk.

**Option C — "Translate" button per message:** Show messages in original language; user taps a "Translate" button to see the translation. This is how WhatsApp, Telegram, and iMessage implement it. Lowest complexity, lowest cost, still valuable.

**Recommendation for x/pat:** Option C first. It requires zero architecture changes (just add a per-message translate button that calls DeepL), has zero ongoing cost (only called when user taps), and is the UX pattern users already know from WhatsApp.

**Technical implementation for Option C:**
```typescript
// In ChatMessage component
const [translation, setTranslation] = useState<string | null>(null);
const [isTranslating, setIsTranslating] = useState(false);

const handleTranslate = async () => {
  if (translation) { setTranslation(null); return; } // toggle
  setIsTranslating(true);
  const result = await supabase.functions.invoke('translate-message', {
    body: { text: message.content, targetLanguage: userLocale.split('-')[0] }
  });
  setTranslation(result.data.translation);
  setIsTranslating(false);
};
```

**Cost for chat translation:**
- Average chat message: 80 characters
- Conservative estimate: 10,000 translate-button taps/month at 80 chars = 800,000 characters/month
- Combined DeepL + Google free tiers: 1,000,000 characters/month
- Net cost: $0 for first 12,500 translated messages/month. Scales to $20/month at 50,000 translated messages.

**Language detection for incoming messages:** Use DeepL's `translateText(text, null, targetLang)` (source language = null) — DeepL auto-detects source language with >98% accuracy for messages over 20 characters. No separate language detection API needed.

**Supabase Edge Function for translation (avoids client-side API key exposure):**
```typescript
// supabase/functions/translate-message/index.ts
import * as deepl from 'npm:deepl-node';

Deno.serve(async (req) => {
  const { text, targetLanguage } = await req.json();
  const translator = new deepl.Translator(Deno.env.get('DEEPL_API_KEY'));
  const result = await translator.translateText(text, null, targetLanguage.toUpperCase());
  return new Response(JSON.stringify({ translation: result.text }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**Priority:** Post-Launch Quick Win. The translate button is a single-sprint feature that dramatically increases utility for multi-lingual user communities. Target v1.1 (30–45 days post-launch).

---

## Implementation Roadmap

### Launch Critical (Before v1.0 Submission)
| Item | Action | Cost | Effort |
|------|--------|------|--------|
| i18next + react-i18next setup | Install, configure, wrap app | $0 | 4 hours |
| expo-localization integration | Auto-detect device locale | $0 | 1 hour |
| Translation file architecture | Create en/es/pt/th JSON structure | $0 | 2 hours |
| Translate UI strings (en→es/pt/th) | DeepL draft + professional review | ~$150–300 | 1 week |
| App Store metadata localization | 4 languages in App Store Connect | $0 | 3 hours |
| Google Play listing localization | 4 languages in Play Console | $0 | 3 hours |
| Intl date/time/number formatting | Replace hardcoded formats | $0 | 4 hours |
| UTC storage in Supabase | Audit all TIMESTAMP columns → TIMESTAMPTZ | $0 | 2 hours |
| Start/End margin conventions | Code style guide + lint rule | $0 | 1 hour |

**Total launch i18n effort:** ~3–4 days of focused work. Total cost: $150–$300 for professional translation review.

---

### Post-Launch Quick Wins (Days 1–60)
| Item | Action | Cost | Effort |
|------|--------|------|--------|
| OTA translation updates | CDN-hosted JSON via i18next-http-backend | $0 | 1 day |
| DeepL API integration | Supabase Edge Function for MT | $0 | 4 hours |
| Chat translate button | Per-message translation trigger | $0 | 1 sprint |
| Localized App Store screenshots | Spanish + Thai priority | $0 | 2 days |
| App review response workflow | DeepL-assisted review replies | $0 | 2 hours setup |
| Crowdin free tier setup | GitHub sync for translation management | $0 | 4 hours |
| Live FX rates for currency | Open Exchange Rates free tier | $0 | 4 hours |
| German/French/Japanese translations | 3 additional languages | ~$200–400 | 1 week |

---

### Roadmap (v1.5+)
| Item | Action | Cost | Estimate |
|------|--------|------|----------|
| Arabic + RTL architecture | Full RTL audit, force-RTL testing | $0 | 1 sprint |
| Hebrew support | Add he locale, RTL already built | ~$100 | 2 days |
| Spot description auto-translation | Background MT pipeline | $0–$20/mo | 1 sprint |
| UGC translation schema | spot_translations, post_translations tables | $0 | 1 day |
| Thai full-text search | Word segmentation for search quality | TBD | 1 sprint |
| Lokalise upgrade | OTA translations without App Store | $120/mo | At $5K MRR |
| Phrase + Figma integration | Design-to-translation pipeline | $27/mo | Post-seed |
| Real-time chat translation (Option A) | Auto-translate on send | $20–50/mo | v2.0 |

---

## Cost Summary

| Category | Launch | Monthly Post-Launch | At Scale |
|----------|--------|---------------------|----------|
| i18next/react-i18next | $0 | $0 | $0 |
| expo-localization | $0 | $0 | $0 |
| Professional translations (4 langs) | $150–$300 one-time | ~$50/release | $200/release |
| App Store metadata localization | $0 | $0 | $0 |
| DeepL API (MT) | $0 | $0 | $0–$57/mo |
| Google Translate API (fallback) | $0 | $0 | $0–$20/mo |
| Crowdin | $0 | $0 | $0–$50/mo |
| OTA translation CDN (Cloudflare R2) | $0 | $0 | $0 |
| **Total** | **$150–$300** | **~$50** | **<$150/mo** |

---

## Key Decisions for CTO

1. **Ship with 4 languages at v1.0** (en, es, pt, th) using DeepL-assisted + professionally reviewed translations. Budget $150–$300.

2. **i18next is the right choice** — do not switch to Lingui or other alternatives. Wire it up with expo-localization for auto-detection.

3. **Build RTL conventions into the design system now** (use `marginStart`/`marginEnd`) even though Arabic/Hebrew won't be active until v1.5. The refactor cost rises exponentially with codebase size.

4. **All timestamps in Supabase must be `TIMESTAMPTZ` (UTC)** — audit this before launch. Thai Buddhist calendar and DST handling both depend on correct UTC storage.

5. **DeepL + Google combined free tiers cover all translation needs for the first 12+ months at zero cost.** No budget required for machine translation until significant content scale.

6. **Localize App Store metadata on day one.** It requires zero code changes, costs nothing, and multiplies keyword index surface area by 4×.

7. **Chat translate button is a v1.1 priority** — it is the highest-visibility, lowest-effort feature that differentiates x/pat as a genuinely global app rather than an English-first product with cosmetic translations.

---

*Research compiled by CTO Office — x/pat / Aych Holdings LLC*
*Sources: i18next documentation, Expo SDK docs, React Native core docs, Apple App Store Connect guidelines, Google Play Console documentation, DeepL API documentation, Google Cloud Translation API pricing, Crowdin/Lokalise/Phrase pricing pages, Apple WWDC localization sessions, multiple ASO research studies (2024–2026).*
