# Android Device Fragmentation & OEM Compatibility Research

> Comprehensive research for x/pat travel app targeting digital nomads worldwide.
> Stack: React Native 0.83.4, Expo SDK 55, Hermes, Google Maps, Supabase, FCM
> Date: April 2026

---

## Table of Contents

1. [Samsung One UI](#1-samsung-one-ui)
2. [Samsung Foldables](#2-samsung-foldables)
3. [Xiaomi MIUI/HyperOS Battery](#3-xiaomi-miuihyperos-battery)
4. [Xiaomi Notification Handling](#4-xiaomi-notification-handling)
5. [Huawei HarmonyOS](#5-huawei-harmonyos)
6. [Huawei HMS vs GMS](#6-huawei-hms-vs-gms)
7. [Oppo/Realme ColorOS](#7-opporealme-coloros)
8. [OnePlus OxygenOS](#8-oneplus-oxygenos)
9. [Google Pixel Features](#9-google-pixel-features)
10. [Android Go Edition](#10-android-go-edition)
11. [Android Tablet Market](#11-android-tablet-market)
12. [Chrome OS / Chromebook](#12-chrome-os--chromebook)
13. [Android Auto](#13-android-auto)
14. [Android TV](#14-android-tv)
15. [Wear OS](#15-wear-os)
16. [Screen Density Buckets](#16-screen-density-buckets)
17. [Split Screen / Multi-Window](#17-split-screen--multi-window)
18. [Samsung Secure Folder](#18-samsung-secure-folder)
19. [Chinese Devices Without GMS](#19-chinese-devices-without-gms)
20. [Device Market Share in Nomad Hotspots](#20-device-market-share-in-nomad-hotspots)
21. [Budget Devices for Nomads](#21-budget-devices-for-nomads)
22. [Android Version Distribution](#22-android-version-distribution)
23. [OEM Push Notification Issues](#23-oem-push-notification-issues)
24. [Hermes Performance Across Chipsets](#24-hermes-performance-across-chipsets)
25. [Device Testing Services](#25-device-testing-services)

---

## 1. Samsung One UI

**Priority: HIGH** — Samsung holds ~20% global market share and ~18% in Southeast Asia (x/pat's primary market).

### One UI 7 / One UI 8 Changes (2025-2026)

- **DeX for PC is discontinued** in One UI 7+. Samsung replaced it with "Link to Windows" for wireless phone-to-PC connection. DeX on external displays still exists for foldables (Z Flip 7 gained DeX support). Impact on x/pat: minimal, as DeX desktop mode is not a target form factor.
- **Edge Panels are deprecated.** Samsung removed downloadable Edge Panels from the Galaxy Store in One UI 7. Third-party apps can no longer register as edge panel providers. Impact on x/pat: none directly, but users who relied on edge panels for quick app access will need to use standard shortcuts.
- **Gesture Navigation:** Samsung's gesture nav is near-stock Android. React Native's `react-native-gesture-handler` works correctly. The main risk is Samsung's side-swipe-back gesture conflicting with in-app horizontal swipes (e.g., SwipeCardDeck). Mitigation: `react-native-gesture-handler` v2.30+ handles gesture exclusion zones properly.
- **Samsung Dark Mode Force-Apply:** One UI can force dark mode on apps that don't declare support. x/pat already sets `userInterfaceStyle: "dark"`, so forced dark mode should not conflict. However, test that Samsung's "force dark" does not double-invert already-dark UI elements.
- **Samsung Font Rendering:** One UI overrides system fonts and applies its own font scaling. Custom fonts (DM Serif Display, Space Mono) should render correctly, but Samsung's aggressive font size scaling in Accessibility settings can break layouts. Test with Samsung's "Font size" set to maximum.

### x/pat Workarounds Needed

- Test SwipeCardDeck gesture conflict with Samsung's back gesture
- Verify dark mode is not double-inverted
- Test font scaling at maximum Samsung accessibility settings
- Add Samsung Galaxy A54/S24 to primary test matrix

---

## 2. Samsung Foldables (Galaxy Fold/Flip)

**Priority: MEDIUM** — Foldable market is growing but still <5% of total Android devices. Nomads are early tech adopters though.

### Key Behaviors

- **Screen Continuity:** When unfolding a Galaxy Z Fold, the app transitions from cover screen (~6.2" narrow) to inner display (~7.6" tablet-like). React Native's `useWindowDimensions()` hook detects this change and triggers re-renders. x/pat's portrait-locked orientation (`"orientation": "portrait"` in app.json) means the inner display will show a portrait layout on a wider screen.
- **Flex Mode (half-folded):** Galaxy Flip devices can be half-folded, splitting the screen into top/bottom halves. Standard React Native apps don't handle this automatically. The `react-native-foldables` library from oliverloops provides fold angle detection.
- **Android 16/17 Mandatory Resizability:** Starting with API 36 (August 2026 Google Play requirement), apps on large screens (>600dp width) will be forced to fill the display. The current "portrait lock" opt-out is available for API 36 but will be removed in API 37 (August 2027). x/pat must plan for responsive layouts by 2027.
- **State Preservation:** Folding/unfolding can trigger Activity recreation. React Navigation handles this via its state persistence, but verify that in-progress forms (AddSpot, CreateEvent) don't lose data during fold transitions.

### x/pat Impact

- **Current:** Portrait lock works fine on foldables. Inner display shows a narrower-than-tablet portrait layout.
- **By August 2027:** Must support landscape and adaptive layouts on large screens or face letterboxing. Start planning responsive breakpoints.
- **Library:** Consider `react-native-foldables` (github.com/oliverloops/react-native-foldables) if targeting Flex Mode.

### x/pat Workarounds Needed

- Test on Samsung Galaxy Z Fold (Firebase Test Lab has these)
- Verify form state preservation during fold/unfold
- Plan responsive layout strategy for API 37 (2027 deadline)

---

## 3. Xiaomi MIUI/HyperOS Battery Restrictions

**Priority: CRITICAL** — Xiaomi holds ~17% market share in Southeast Asia, #1 in Indonesia (19%).

### The Problem

Xiaomi's MIUI (now HyperOS on newer devices) is among the most aggressive OEMs for killing background processes. Key behaviors:

- **Autostart disabled by default.** After device reboot, apps cannot receive push notifications until the user manually opens the app. This is devastating for engagement/re-engagement.
- **Battery optimization kills background processes.** Even with FCM high-priority messages, MIUI can prevent the app from waking to display notifications.
- **Settings location varies by version:** Settings > Apps > [app] > App permissions > Background autostart (MIUI 14), or Settings > Apps > Autostart (HyperOS).
- **Settings reset after OTA updates.** Users who manually enable autostart may lose that setting after a system update.
- **HyperOS improvement:** HyperOS (2024+) is less aggressive than older MIUI versions. Notification handling has improved significantly. But legacy MIUI 12-14 devices remain widespread.

### x/pat Workarounds Needed

1. **In-app detection and guidance:** Detect Xiaomi devices (`Platform.constants.Brand === 'Xiaomi'` or similar) and show a one-time prompt guiding users to enable autostart and disable battery optimization. Link directly to the settings screen if possible.
2. **Integrate with dontkillmyapp.com:** The site provides device-specific instructions. Consider deep-linking to `https://dontkillmyapp.com/xiaomi` from within the app.
3. **Use high-priority FCM messages** for critical notifications (messages, connection requests).
4. **Test notification delivery** after 24h of app inactivity on a Xiaomi device.

---

## 4. Xiaomi Notification Handling

**Priority: HIGH** — Directly impacts re-engagement for nomad users.

### Notification Shade Differences

- MIUI/HyperOS has a split notification shade: swipe down on the left for notifications, swipe down on the right for quick settings. This is different from stock Android's unified shade.
- Notification grouping behavior differs from stock Android. MIUI may collapse notification groups more aggressively.
- **Notification icons:** MIUI renders notification icons differently. The monochrome notification icon requirement is stricter on MIUI — colored icons render as solid white squares more consistently than on stock Android.
- **Notification channels:** MIUI respects Android notification channels but adds its own "App notifications" management layer on top. Users can disable entire notification categories through MIUI settings even if the app's channels are enabled.

### x/pat Workarounds Needed

- Verify monochrome notification icon renders correctly on MIUI
- Create separate notification channels (messages, events, connections) as already noted in the Android testing playbook
- Test notification delivery and display on Redmi Note 12/13 (most common budget Xiaomi)

---

## 5. Huawei HarmonyOS Compatibility

**Priority: LOW for now, MONITOR** — HarmonyOS NEXT drops Android compatibility entirely.

### Current State (April 2026)

- **HarmonyOS NEXT** (launched late 2024) is a fully independent OS — no Android app layer. Over 27 million devices in China run HarmonyOS NEXT.
- **React Native support exists** via React Native Open Harmony (RNOH), built by Software Mansion in partnership with Huawei. It uses React Native's New Architecture (Fabric + TurboModules).
- **Expo support:** Not yet available. The LF Europe Open Mobile Hub has Expo support for HarmonyOS NEXT in its pipeline for 2025-2026, but it's not shipping yet.
- **Global expansion:** Huawei plans HarmonyOS NEXT global expansion by 2026, but adoption outside China is minimal. Huawei's global market share has collapsed post-sanctions.

### x/pat Impact

- **No action needed now.** HarmonyOS NEXT devices are almost exclusively in China, which is not a nomad hotspot (visa restrictions, Great Firewall blocks Supabase/Google Maps).
- **Monitor:** If Huawei regains global share or HarmonyOS expands to Southeast Asia, revisit.
- **Older Huawei devices** (pre-2021, running EMUI/Android) still work with standard Android APKs but lack GMS (see section 6).

---

## 6. Huawei HMS vs GMS

**Priority: LOW** — Affects only newer Huawei devices (post-2019 sanctions).

### Impact on x/pat Dependencies

| Dependency | GMS Required? | HMS Alternative | Impact |
|---|---|---|---|
| Google Maps | Yes | Huawei Petal Maps SDK | Map won't load on HMS-only devices |
| FCM Push | Yes | Huawei Push Kit | No push notifications |
| Google Sign-In | Yes | Huawei Account Kit | No Google auth (but x/pat uses email/Apple only) |
| Google Play Store | Yes | Huawei AppGallery | App not discoverable |

### Key Facts

- `react-native-maps` does not support HMS. Would need `react-native-huawei-map` as a separate integration.
- If HMS libraries are included in a Google Play build, Google may flag the app for removal. HMS and GMS builds must be separate (multi-flavor builds).
- **OneSignal** supports both FCM and Huawei Push Kit with a single SDK integration, which is simpler than maintaining two push paths.

### x/pat Decision

**Do not support HMS-only devices for launch.** The engineering cost of dual map SDKs, dual push services, and AppGallery distribution is not justified for the tiny number of HMS-only Huawei devices used by nomads. Revisit if Huawei regains significant global share.

---

## 7. Oppo/Realme ColorOS Battery Optimization

**Priority: HIGH** — Oppo holds ~19% market share in Thailand, Realme is strong in Indonesia and India.

### The Problem

ColorOS (Oppo) and Realme UI (based on ColorOS) aggressively kill background apps:

- **Startup Manager:** Apps are blocked from autostarting by default. Must be manually whitelisted.
- **Battery optimization** restricts background activity even for apps with valid FCM tokens.
- **"Lock" in recents:** Users can long-press an app in the recents screen to "lock" it, preventing the OS from killing it. But most users don't know this.
- **Notification delivery:** Push notifications can be silently suppressed when the app hasn't been opened in 24-48 hours.

### ColorOS-Specific Settings Path

Settings > Battery > Battery optimization > [app] > Don't optimize, plus Settings > App Management > Startup Manager > enable autostart.

### x/pat Workarounds Needed

1. Detect Oppo/Realme devices and show battery optimization guidance (same pattern as Xiaomi)
2. Use FCM high-priority messages
3. Test notification delivery on Oppo A-series devices (popular in Southeast Asia)
4. Reference dontkillmyapp.com/oppo for user-facing instructions

---

## 8. OnePlus OxygenOS

**Priority: MEDIUM** — Smaller market share than Samsung/Xiaomi/Oppo, but popular with tech-savvy nomads.

### Specific Behaviors

- **OxygenOS is now essentially ColorOS** under the hood (since OnePlus merged with Oppo). Battery optimization and background killing behaviors are nearly identical to ColorOS (section 7).
- **Gesture Navigation:** OnePlus offers both stock Android gestures and legacy OxygenOS gestures (swipe up for home, swipe from sides for back). React Native's gesture handler works with both modes.
- **Gaming Mode / Zen Mode:** OnePlus's gaming mode suppresses notifications. Not relevant for x/pat (travel app, not a game).
- **Alert Slider:** OnePlus hardware alert slider (mute/vibrate/ring) affects notification delivery mode. Not an app concern — OS handles this.

### x/pat Workarounds Needed

- Same battery optimization guidance as Oppo/Realme (section 7)
- Test on OnePlus Nord (most popular budget OnePlus in nomad markets)

---

## 9. Google Pixel Features

**Priority: MEDIUM** — Pixel has small global share (~4%) but is the reference Android device. Popular among tech-savvy nomads.

### Material You / Material 3 Expressive

- **Material You** (Android 12+) extracts accent colors from wallpaper and applies them system-wide. React Native apps are NOT affected by Material You dynamic colors unless using native Android Material Components. x/pat's custom dark theme (hardcoded colors) will remain consistent regardless of wallpaper.
- **Material 3 Expressive** (Android 16, Pixel 10+): Adds springy animations, new button shapes, and vibrant color roles. Again, does not affect React Native apps with custom themes. However, system dialogs (permission prompts, date pickers, share sheets) will use the new Material 3 Expressive style, which may look visually different from x/pat's aesthetic.

### Tensor Chip Impact

- **Tensor G5** (Pixel 10, 2025): 60% more powerful TPU, 34% faster CPU. Hermes bytecode runs efficiently on all modern chipsets. Tensor's advantage is AI inference, not raw app performance.
- **React Native performance on Pixel** is generally the best of any Android device because stock Android has the least OEM overhead.

### Pixel-Specific Features

- **Live Captions, Now Playing, Call Screening** — system features, no app impact.
- **Pixel's Adaptive Battery** is less aggressive than Xiaomi/Oppo. Push notifications work reliably on Pixel devices.

### x/pat Impact

- Pixel is the easiest Android device to support. Use it as the baseline for Android testing.
- No Pixel-specific workarounds needed.

---

## 10. Android Go Edition

**Priority: LOW** — Not the primary nomad demographic, but relevant for budget-conscious travelers.

### Constraints

- **2GB RAM or less.** Android 15 Go (March 2025) supports 16,000+ device models across 180+ countries.
- **Performance:** 30% faster app launches than standard Android on same hardware, 270MB more free memory, 900MB more storage.
- **Go versions of Google apps** (Maps Go, Gmail Go, YouTube Go) are pre-installed instead of full versions.
- **Market:** Primarily India, Africa, Latin America, Southeast Asia. Overlaps with some nomad destinations.

### React Native on Android Go

- Hermes engine helps significantly — bytecode precompilation reduces memory overhead vs. JSC.
- x/pat's 5 BlurView instances on ExploreScreen would be extremely expensive on 2GB RAM devices with Android <12 (RenderScript fallback).
- Map with 431+ markers + clustering would consume significant memory on Go devices.
- **Realistic assessment:** x/pat will be slow but functional on Go devices with Android 12+. On Android Go with SDK <31, BlurView will cause severe performance issues.

### x/pat Workarounds Needed

- Add Android fallbacks for BlurView (already noted in testing playbook)
- Set `removeClippedSubviews={true}` on all FlatLists
- Consider reducing marker load radius for low-RAM devices (detect via `totalMemory` check)
- Do not actively target Go devices, but ensure app doesn't crash on them

---

## 11. Android Tablet Market & UI Considerations

**Priority: MEDIUM** — Growing relevance due to Android 16 mandatory resizability.

### Market Context (2026)

- Android tablet market is ~35% of global tablet market (Apple iPad dominates at ~55%).
- Samsung Galaxy Tab series is the dominant Android tablet brand.
- Amazon Fire tablets run a forked Android (Fire OS) without GMS — not relevant for x/pat.
- **Android 16 mandate:** Apps targeting API 36 (required August 2026) must support landscape and multi-aspect-ratio layouts on devices >600dp. Currently opt-outable, but API 37 (August 2027) removes the opt-out.

### React Native Tablet Considerations

- `useWindowDimensions()` for responsive layouts
- Expo Router has experimental SplitView support (two-pane layouts)
- x/pat's `"orientation": "portrait"` locks tablet to portrait, which is acceptable for API 36 (opt-out available) but must change for API 37

### x/pat Impact

- **Current (API 35):** Portrait lock is fine. `supportsTablet: false` is set for iOS, and Android doesn't have an equivalent flag — tablets will just show a stretched portrait layout.
- **August 2026 (API 36):** Must target API 36 for Google Play. Can opt out of resizability.
- **August 2027 (API 37):** Must support landscape and adaptive layouts. This is a significant engineering effort.

### x/pat Workarounds Needed

- No immediate action for launch
- Plan responsive layout breakpoints for 2027 API 37 compliance
- Consider Expo Router SplitView for tablet-optimized layouts when the feature stabilizes

---

## 12. Chrome OS / Chromebook

**Priority: LOW** — Niche use case, but nomads commonly use Chromebooks as travel laptops.

### Compatibility

- All Chromebooks since 2019 support Android apps via Google Play Store
- Android apps run in a container with ARC (Android Runtime for Chrome)
- x/pat would install and run from Google Play on Chromebooks without modification

### Limitations

- No telephony, NFC, or advanced camera features (x/pat only needs camera for photo upload — this should work via the standard camera intent)
- GPS may not be available on WiFi-only Chromebooks — x/pat's location features would need fallback (IP-based location)
- Keyboard and mouse input work automatically with React Native's touchable components
- **Window resizing:** Chrome OS allows resizing Android apps. x/pat's portrait lock may force a letterboxed narrow window.

### Android 16 Large Screen Mandate

- Chromebooks have screens >600dp, so the Android 16 API 36 resizability requirement applies
- Same timeline as tablets: opt-out available for API 36, mandatory for API 37

### x/pat Workarounds Needed

- No immediate action; app will work in portrait letterbox mode
- Long-term: responsive layout strategy covers both tablets and Chromebooks
- Test location fallback when GPS is unavailable

---

## 13. Android Auto

**Priority: VERY LOW** — Minimal relevance for a travel discovery app.

### Current State

- `react-native-carplay` library (v2.4.0+) supports Android Auto in beta
- `react-native-android-auto` from Shopify provides native Android Auto integration
- Expo does not have built-in Android Auto support; requires bare workflow or custom native modules
- Android Auto uses a templated UI (lists, maps, messages) — not arbitrary React Native views

### Potential Use Cases for x/pat

- **Nearby spots notification** while driving — show a simple list of highly-rated spots near your route
- **Navigate to spot** — hand off to Google Maps/Waze for turn-by-turn
- **Voice search** — "Hey Google, find coworking spaces near me on x/pat"

### x/pat Decision

**Not worth pursuing for launch or near-term.** Android Auto requires significant native development, a separate UI paradigm, and careful compliance with Google's driver distraction guidelines. A simple deep link from Google Maps is sufficient.

---

## 14. Android TV

**Priority: NONE** — No relevance for a mobile travel app.

### Technical Feasibility

- React Native supports Android TV via `react-native-tvos` library
- Expo SDK 54+ has Android TV support
- TV apps use D-pad/remote navigation instead of touch

### x/pat Decision

**No action.** A travel spot discovery app has no use case on TV. A future "travel inspiration" viewing experience could be interesting but is far beyond current scope.

---

## 15. Wear OS Companion App

**Priority: LOW** — Nice-to-have future feature, not launch priority.

### Current State (2026)

- Wear OS holds ~27% of smartwatch OS market share (behind Apple Watch)
- Wear OS 5 (2024) and Wear OS 6 (preview) improve battery and health APIs
- React Native libraries exist: `react-native-wear-connectivity` for Wear OS communication
- Expo compatibility: works with bare workflow / EAS Build, not with Expo Go

### Potential x/pat Use Cases

- **Notification glances:** See who messaged you, new connection requests
- **Quick spot save:** "Save this spot" from a notification
- **Location-based alerts:** "You're near a top-rated cafe" wrist tap

### x/pat Decision

**Defer to post-launch.** Wear OS companion apps require native Kotlin/Compose development for the watch side with React Native only on the phone-side communication layer. Low ROI for a solo founder.

---

## 16. Screen Density Buckets

**Priority: MEDIUM** — Affects image quality and bundle size.

### Android Density Buckets

| Bucket | DPI | Scale | Example Devices |
|--------|-----|-------|----------------|
| mdpi | ~160 | 1.0x | Legacy / Android Go |
| hdpi | ~240 | 1.5x | Budget devices |
| xhdpi | ~320 | 2.0x | Pixel 4a, older mid-range |
| xxhdpi | ~480 | 3.0x | Most modern flagships (S24, Pixel 8) |
| xxxhdpi | ~640 | 4.0x | Latest flagships (S25 Ultra, Pixel 10) |

### React Native Image Handling

- React Native uses `PixelRatio.get()` to determine device density (returns 1, 1.5, 2, 3, or 4)
- For local assets: provide `image.png` (1x), `image@2x.png` (2x), `image@3x.png` (3x). React Native auto-selects.
- For remote images (Supabase Storage): serve appropriately sized images. Sending a 4x image to a 1x device wastes bandwidth.
- **x/pat's adaptive icon** assets (`android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`) are scaled by the build system automatically.

### x/pat Workarounds Needed

- Ensure Supabase image URLs support size variants (use image transforms or serve resized versions)
- Consider `expo-image` (replaces `<Image>`) which handles caching, progressive loading, and format negotiation (AVIF/WebP)
- Verify notification icon (`assets/icon.png`) is high enough resolution for xxxhdpi (192x192px minimum)

---

## 17. Split Screen / Multi-Window

**Priority: MEDIUM** — Increasingly common on Android, especially tablets and foldables.

### Current Behavior

- Android 7.0+ supports split-screen (two apps side by side)
- When entering split-screen, Android may recreate the Activity, causing Expo apps to restart
- Known Expo issue: app restarts when entering split-screen mode, rendering at previous dimensions until reload
- React Navigation state is preserved through Activity recreation if `onSaveInstanceState` works correctly

### Android 16 Changes

- Freeform windowing is coming to tablets (but not foldables initially)
- Desktop-like windowing mode for Android tablets in Android 16
- Apps must handle arbitrary window sizes without crashing

### Expo Router SplitView

- Expo Router has introduced experimental SplitView support for two-pane layouts
- This is for app-internal split views, not OS-level split-screen
- Could be useful for a future tablet layout (master-detail: spot list + spot detail)

### x/pat Workarounds Needed

- Ensure the app doesn't crash when entering split-screen mode
- Accept that layout may not be optimal in split-screen (portrait content in narrow pane)
- Use `useWindowDimensions()` to detect and adapt to window size changes
- Test on a Samsung device (long-press recents button to trigger split-screen)

---

## 18. Samsung Secure Folder

**Priority: VERY LOW** — Edge case with minimal impact.

### How It Works

- Secure Folder creates an isolated container (separate work profile) on Samsung devices
- Apps installed in Secure Folder run independently with separate data, accounts, and settings
- In One UI 8 (2025+), Secure Folder was reclassified from "work profile" to "private profile" for better security

### Impact on x/pat

- If a user installs x/pat in Secure Folder, it will be a completely separate instance with its own Supabase auth session, push token, and local storage
- The user would need to log in separately and would receive duplicate notifications (one for each instance)
- **One UI 8 bug:** Apps in Secure Folder cannot access files stored in the Secure Folder via the document picker. This could affect photo upload from Secure Folder's gallery.

### x/pat Workarounds Needed

- **None.** This is a niche Samsung power-user feature. App works normally inside Secure Folder. The duplicate-instance behavior is by design and cannot be controlled by the app.

---

## 19. Chinese Devices Without Google Play Services

**Priority: LOW** — Chinese domestic market is not a nomad hotspot.

### Market Context

- China is the world's largest app market ($217B user spending in 2025)
- Google Play has been absent from China for 15+ years
- Major alternative stores: Huawei AppGallery (400M+ active users), Tencent MyApp, Xiaomi App Store, Baidu, 360 Mobile Assistant, Oppo/Vivo app stores
- Apps cannot rely on Google Maps, FCM, Google Sign-In, or any GMS APIs

### Impact on x/pat

- x/pat depends entirely on GMS: Google Maps (Android), FCM for push, Google Play for distribution
- Supporting GMS-less Chinese devices would require: Huawei/Baidu maps, Huawei/Xiaomi/Oppo push services, AppGallery distribution, WeChat/Alipay login
- **China's Great Firewall** blocks Supabase, making the entire backend inaccessible without a VPN

### x/pat Decision

**Do not support Chinese domestic market.** The engineering cost is massive, the backend is blocked by the GFW, and China is not a digital nomad destination. Chinese nomads traveling abroad use phones with GMS (purchased outside China or sideloaded).

---

## 20. Device Market Share in Nomad Hotspots

**Priority: HIGH** — Determines which devices to test and optimize for.

### Thailand (Bangkok)

| Vendor | Market Share |
|--------|-------------|
| Samsung | 20% |
| Oppo | 19% |
| Xiaomi | 16% |
| Apple | ~15% |
| Vivo | ~12% |

Android dominates Thailand with ~70-75% market share. The market is unusually balanced — no single vendor dominates. Key devices: Samsung Galaxy A-series, Oppo A-series, Redmi Note series.

### Indonesia (Bali)

| Vendor | Market Share |
|--------|-------------|
| Xiaomi | 19% (#1) |
| Transsion | ~15% |
| Samsung | ~15% |
| Oppo | ~12% |
| Vivo | ~10% |

Android dominance: ~87%. Xiaomi leads. Budget devices are extremely common (sub-$200). Many devices have 3-4GB RAM.

### Portugal (Lisbon)

Samsung and Apple dominate the European market. Android share in Portugal is ~65-70%, with Samsung being the clear Android leader. Xiaomi has significant presence in European budget segment.

### Mexico (CDMX)

Samsung leads the Mexican market, followed by Xiaomi and Motorola. Android share is ~75-80%. Motorola is notably stronger in Latin America than in Asia.

### Colombia

Similar to Mexico — Samsung, Xiaomi, and Motorola lead. Android share ~80%+. Budget devices are common.

### Key Takeaway for x/pat

**Primary test devices should be:**
1. Samsung Galaxy A54/A55 (most common Android across all nomad markets)
2. Xiaomi Redmi Note 12/13 (dominant in Indonesia, strong in Thailand)
3. Samsung Galaxy S24/S25 (flagship users in all markets)
4. Google Pixel 8/9 (common among tech-savvy Western nomads)
5. Oppo A-series (strong in Thailand)

---

## 21. Budget Devices Popular Among Digital Nomads

**Priority: MEDIUM** — Nomads range from budget to premium device users.

### Popular Budget Android Devices (2025-2026)

| Device | Price Range | RAM | Chipset | Notes |
|--------|-----------|-----|---------|-------|
| Samsung Galaxy A25/A35 | $200-300 | 6-8GB | Exynos 1380 | Most popular Samsung budget, good for testing |
| Samsung Galaxy S25 FE | $400-500 | 8GB | Snapdragon 8s Gen 4 | "Premium budget" — best value Samsung |
| Google Pixel 9a | $350-400 | 8GB | Tensor G4a | Clean Android, great camera, AI features |
| Xiaomi Redmi Note 13 Pro | $200-280 | 8-12GB | MediaTek Dimensity | Very popular in SEA |
| OnePlus Nord CE4 | $250-300 | 8GB | Snapdragon 695 | Popular with tech-savvy budget users |
| Motorola Moto G Power | $150-200 | 4-6GB | MediaTek | Strong in Latin America |

### Nomad Device Preferences

- Tech-savvy nomads often carry flagship phones (iPhone 15/16, Pixel 9, S25)
- Budget-conscious nomads (especially from Southeast Asia, Latin America) use $200-300 Android devices
- eSIM support is increasingly important for nomads — most 2020+ Samsung, Pixel, and Motorola devices support eSIM
- **Dual SIM** is critical for nomads (home SIM + local SIM). Most Android devices support this natively.

### x/pat Workarounds Needed

- Ensure core flows (browse spots, view map, chat) run smoothly on 4GB RAM devices
- Test cold start time on Samsung Galaxy A35 (target: <3 seconds)
- BlurView fallbacks are critical for budget devices with older Android versions

---

## 22. Android Version Distribution (April 2026)

**Priority: HIGH** — Determines minSdkVersion and feature availability.

### Current Distribution

| Android Version | API Level | Market Share | Cumulative |
|----------------|-----------|-------------|------------|
| Android 16 | 36 | ~7.5% | 7.5% |
| Android 15 | 35 | ~19.5% | 27.0% |
| Android 14 | 34 | ~17.2% | 44.2% |
| Android 13 | 33 | ~13.9% | 58.1% |
| Android 12/12L | 31-32 | ~12% | 70.1% |
| Android 11 | 30 | ~13.7% | 83.8% |
| Android 10 | 29 | ~7.8% | 91.6% |
| Android 9 (Pie) | 28 | ~4.5% | 96.1% |
| Android 8.x (Oreo) | 26-27 | ~2.5% | 98.6% |
| Android 7.x (Nougat) | 24-25 | ~1.4% | 100% |

### x/pat's Current Configuration

- **minSdkVersion: 24** (Android 7.0, Expo SDK 55 default) — covers ~100% of active devices
- **targetSdkVersion: 35** (Android 15) — current Google Play requirement
- **Must target API 36** (Android 16) by August 2026 for Google Play updates

### Recommendation

- Keep minSdkVersion at 24 (Expo default). Changing this gains nothing.
- **Upgrade targetSdkVersion to 36 before August 2026.** This requires Expo SDK update (likely SDK 56 or 57) and addressing the large-screen resizability requirement.
- Key API level breakpoints:
  - API 26 (Android 8): Notification channels required
  - API 29 (Android 10): Scoped storage
  - API 31 (Android 12): Native BlurView (no RenderScript fallback needed)
  - API 33 (Android 13): Per-app language, photo picker
  - API 35 (Android 15): Predictive back gesture, 16KB page size

---

## 23. OEM Push Notification Issues

**Priority: CRITICAL** — Push notifications are x/pat's primary re-engagement tool.

### Scale of the Problem

Device and OS-level restrictions account for **20-40% of push notification failures** on Android, driven by battery optimizations that delay or block delivery until user interaction. This is the single biggest Android-specific problem for x/pat.

### OEM-Specific Issues

| OEM | Severity | Problem | Workaround |
|-----|----------|---------|------------|
| **Xiaomi** | Critical | Autostart disabled by default. After reboot, no notifications until user opens app. | Detect Xiaomi, prompt user to enable autostart. Use high-priority FCM. |
| **Samsung** | High | "Sleeping apps" and "Deep sleeping apps" lists delay/block notifications for infrequently used apps. | Prompt user to remove app from sleeping apps list. |
| **Oppo/Realme** | High | Background activity restrictions silently suppress notifications. Startup Manager blocks autostart. | Detect Oppo/Realme, guide user to Startup Manager and battery settings. |
| **Huawei** | High | Aggressive app killing. Pushes stop after period of inactivity. | Detect Huawei, guide user to protected apps list. |
| **OnePlus** | Medium | Same as Oppo (shared ColorOS base). | Same as Oppo. |
| **Vivo** | Medium | Similar aggressive battery optimization. | Similar guidance to Oppo. |
| **Google Pixel** | None | Stock Android. Notifications work reliably. | None needed. |

### Comprehensive Workaround Strategy

1. **Device detection at notification permission time:**
   ```
   Detect manufacturer → show OEM-specific guidance modal
   → deep-link to battery/autostart settings if possible
   → provide visual step-by-step instructions
   ```

2. **Reference dontkillmyapp.com:** Maintain a mapping of manufacturer → dontkillmyapp.com URL for user-facing help.

3. **FCM message priority:**
   - Use `priority: "high"` for all user-facing notifications (messages, connection requests, event reminders)
   - Use `priority: "normal"` only for non-urgent notifications (weekly digests, marketing)

4. **Server-side monitoring:**
   - Track FCM delivery receipts per device manufacturer
   - If a device hasn't acknowledged notifications in 7+ days, show an in-app banner: "You may be missing notifications. Tap to fix."

5. **Notification channel strategy:**
   - Create channels for: Messages (HIGH), Events (DEFAULT), Connections (HIGH), Community (DEFAULT), System (LOW)
   - Separate channels let users selectively disable less important notifications without losing critical ones

### Libraries to Consider

- **`react-native-push-notification`** or **`expo-notifications`** (already used) with proper channel configuration
- **`react-native-autostart`** — helper to check/request autostart permission on Chinese OEMs
- **`notifee`** by Invertase — more granular notification control than expo-notifications, but requires bare workflow

---

## 24. Hermes Performance Across Chipsets

**Priority: MEDIUM** — Hermes performs well across all modern chipsets but has variations.

### Chipset Landscape (2026)

| Chipset | Manufacturer | Devices | Market Segment |
|---------|-------------|---------|---------------|
| Snapdragon 8 Elite Gen 5 | Qualcomm | Samsung S25 Ultra, OnePlus 13 | Flagship |
| Snapdragon 7s Gen 3 | Qualcomm | Samsung A55, OnePlus Nord | Mid-range |
| Dimensity 9500 | MediaTek | Xiaomi 15, Oppo Find X8 | Flagship |
| Dimensity 7300 | MediaTek | Redmi Note 13, Realme 12 | Budget-mid |
| Exynos 2500 | Samsung | Samsung S25 (some regions) | Flagship |
| Exynos 1380 | Samsung | Samsung A35/A55 | Mid-range |
| Tensor G5 | Google | Pixel 10 | Flagship (AI-optimized) |
| Tensor G4a | Google | Pixel 9a | Mid-range |

### Hermes Performance Characteristics

- **Hermes bytecode precompilation** eliminates JavaScript parsing at runtime. This benefits ALL chipsets equally — the bottleneck shifts from CPU to I/O (loading bytecode from storage).
- **Cold start:** Hermes reduces cold start time by 30-50% vs. JSC across all chipsets. Budget MediaTek devices benefit the most (from ~5s to ~2.5s cold start).
- **Runtime execution:** Snapdragon consistently outperforms MediaTek in raw JS execution speed by 10-20%. Exynos falls between the two. Tensor prioritizes ML/AI workloads over raw CPU.
- **New Architecture (Fabric + TurboModules):** Now mandatory in RN 0.83/Expo SDK 55. Eliminates the bridge, reducing serialization overhead. Benefits are most visible on mid-range chipsets where the bridge was a bottleneck.
- **Animation performance:** 60fps animations are achievable on all modern chipsets (2022+). 120fps requires flagship-tier (Snapdragon 8 series, Dimensity 9000+). x/pat's Reanimated animations should target 60fps to ensure universal smoothness.
- **Hermes Bytecode Diffing (2026):** New feature enabling delta OTA updates — users download only changed bytecode, not the entire bundle. Critical for users on poor cellular connections in nomad destinations.

### x/pat Workarounds Needed

- Target 60fps for all animations (do not assume 120fps availability)
- Profile SwipeCardDeck animations on a Samsung A35 (Exynos 1380) as worst-case scenario
- Monitor JS bundle size — aim for <2MB JavaScript bundle for fast bytecode loading on budget devices
- Ensure Hermes is confirmed enabled in EAS build output (it should be by default)

---

## 25. Device Testing Services

**Priority: HIGH** — Essential for validating across fragmented device landscape.

### Firebase Test Lab

- **Free tier:** 15 tests/day on virtual devices, 5 tests/day on physical devices
- **Device catalog:** Includes Samsung Galaxy S-series, A-series, Pixel devices, some Xiaomi devices
- **Foldable devices:** Samsung Galaxy Z Fold and Z Flip available in the catalog
- **Integration:** Native integration with Google Play Console pre-launch reports. Every APK/AAB uploaded to Play Console gets automatic testing on ~20 devices.
- **Best for:** Quick smoke tests, crash detection, screenshot validation
- **Limitation:** Limited device selection compared to BrowserStack. No Oppo, Realme, or OnePlus devices.

### BrowserStack App Automate

- **Device catalog:** 3,000+ real devices, continuously updated with latest models
- **Automation:** Supports Appium, WebdriverIO, Detox for React Native
- **Coverage:** Samsung, Xiaomi, Oppo, OnePlus, Pixel, Huawei — all major OEMs
- **Pricing:** Starts at $199/month for App Automate
- **Best for:** Comprehensive cross-OEM testing, especially for notification and battery optimization validation

### Other Services

| Service | Strength | Pricing |
|---------|---------|---------|
| **LambdaTest** | Best value, 3000+ devices | From $99/month |
| **Sauce Labs** | Enterprise-grade, CI/CD integration | From $249/month |
| **AWS Device Farm** | Good for existing AWS customers | Pay-per-use (~$0.17/device-minute) |
| **Samsung Remote Test Lab** | Free Samsung-specific testing | Free (Samsung developer account) |

### Recommended Testing Strategy for x/pat

**Phase 1 (Pre-launch, current):**
1. Use Firebase Test Lab free tier for every EAS build (automatic via Play Console)
2. Use Samsung Remote Test Lab (free) for Samsung-specific testing
3. Manual testing on 1-2 physical devices (borrow or buy a Samsung A54)

**Phase 2 (Post-launch, scaling):**
1. BrowserStack or LambdaTest subscription for cross-OEM testing
2. Automated Detox test suite running on CI for regression detection
3. Firebase Test Lab paid tier for expanded physical device testing

**Priority Test Matrix:**

| Priority | Device | Chipset | Why |
|----------|--------|---------|-----|
| P0 | Samsung Galaxy A54/A55 | Exynos 1380 | Most common Android in nomad markets |
| P0 | Google Pixel 8/9 | Tensor G3/G4 | Reference device, common among Western nomads |
| P0 | Samsung Galaxy S24/S25 | Snapdragon 8 Gen 3/Elite | Flagship validation |
| P1 | Xiaomi Redmi Note 13 | Dimensity 7200 | Budget device, aggressive battery mgmt |
| P1 | Oppo A98/A99 | Snapdragon 695 | Tests ColorOS battery optimization |
| P1 | Samsung Galaxy Z Fold 5/6 | Snapdragon 8 Gen 2/3 | Foldable layout validation |
| P2 | OnePlus Nord CE4 | Snapdragon 695 | OxygenOS/ColorOS variant |
| P2 | Motorola Moto G Power | MediaTek | Latin America popular device |
| P2 | Samsung Galaxy A14 | MediaTek Helio | Android Go-class budget device |

---

## Summary: Priority Action Matrix

### CRITICAL (Must fix before Android launch)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 1 | **OEM notification guidance system** — detect Xiaomi/Samsung/Oppo/Huawei, show battery optimization instructions | Medium | Prevents 20-40% notification failure rate |
| 2 | **BlurView Android fallbacks** — add solid-color fallbacks for all 15+ BlurView usages, not just GlassTabBar | Medium | Prevents crashes/poor performance on Android <12 |
| 3 | **Google Sign-In for Android** — already identified in testing playbook | Medium | Android users have no social login without this |
| 4 | **BackHandler for main tabs** — prevent accidental app exit | Low | Basic Android UX requirement |

### HIGH (Should fix before public launch)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 5 | Multiple notification channels (messages, events, connections) | Low | Android 8+ best practice, user control |
| 6 | Notification icon validation (monochrome white-on-transparent) | Low | Prevents white square notification icons |
| 7 | Test on Samsung Galaxy A54 and Xiaomi Redmi Note 13 | Low | Validates 40%+ of nomad Android market |
| 8 | Replace hardcoded paddingTop with insets.top | Low | Prevents status bar overlap on various devices |
| 9 | FlatList optimization (removeClippedSubviews, windowSize) | Low | Performance on mid-range/budget devices |

### MEDIUM (Plan for post-launch)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 10 | Target API 36 (Android 16) before August 2026 | Medium | Google Play compliance |
| 11 | Responsive layout planning for API 37 (August 2027) | High | Mandatory large-screen/foldable support |
| 12 | Migrate from `<Image>` to `expo-image` | Medium | Better caching, progressive loading, AVIF |
| 13 | Supabase image size variants for different screen densities | Medium | Bandwidth savings for budget devices |
| 14 | Samsung Remote Test Lab integration | Low | Free Samsung-specific testing |

### LOW (Monitor / Future consideration)

| # | Action | Effort | Impact |
|---|--------|--------|--------|
| 15 | Huawei HarmonyOS NEXT support | Very High | Minimal nomad market relevance |
| 16 | Chinese domestic market (no GMS) | Very High | Not a nomad market |
| 17 | Android Auto integration | High | Minimal travel app relevance |
| 18 | Wear OS companion app | High | Nice-to-have, low ROI for solo founder |
| 19 | Android TV | N/A | No use case |
| 20 | Chrome OS optimization | Low | Works in letterbox mode, optimize with responsive layout (same as tablet effort) |

---

## Key Metrics to Track Post-Launch

1. **Notification delivery rate by manufacturer** — identify OEMs with low delivery
2. **Cold start time by device model** — target <3s on mid-range, <5s on budget
3. **Crash rate by Android version** — ensure no crashes on API 24-29
4. **Memory usage on devices with 3-4GB RAM** — target <200MB peak
5. **Map rendering time** — time from screen open to all markers visible
6. **BlurView-related ANRs** — monitor for Application Not Responding on older Android

---

## Sources

- [DontKillMyApp - Xiaomi](https://dontkillmyapp.com/xiaomi)
- [DontKillMyApp - Oppo](https://dontkillmyapp.com/oppo)
- [Software Mansion - React Native on HarmonyOS NEXT](https://blog.swmansion.com/huawei-x-software-mansion-bringing-react-native-support-to-harmonyos-next-82e02bd75549)
- [Expo Discussion - HarmonyOS Support](https://github.com/expo/expo/discussions/32990)
- [Android Developers - Orientation/Resizability Changes in Android 16](https://android-developers.googleblog.com/2025/01/orientation-and-resizability-changes-in-android-16.html)
- [Android Developers - Build for ChromeOS](https://developer.android.com/topic/arc)
- [Android Developers - Android Go Edition](https://developer.android.com/guide/topics/androidgo)
- [Android Developers - Screen Densities](https://developer.android.com/training/multiscreen/screendensities)
- [React Native - PixelRatio](https://reactnative.dev/docs/pixelratio)
- [React Native - Building for TV](https://reactnative.dev/docs/building-for-tv)
- [Expo - Building for TV](https://docs.expo.dev/guides/building-for-tv/)
- [react-native-carplay / Android Auto](https://birkir.dev/react-native-carplay/)
- [react-native-foldables](https://github.com/oliverloops/react-native-foldables)
- [react-native-wear-connectivity](https://github.com/fabOnReact/react-native-wear-connectivity)
- [API Levels - Android Version Cumulative Usage](https://apilevels.com/)
- [AppBrain - Android Version Distribution April 2026](https://www.appbrain.com/stats/top-android-sdk-versions)
- [TelemetryDeck - Android Device Brands 2026](https://telemetrydeck.com/survey/android/Android/deviceBrands/)
- [StatCounter - Mobile Vendor Market Share Thailand](https://gs.statcounter.com/vendor-market-share/mobile/thailand)
- [TelecomLead - Thailand Smartphone Market Share 2025](https://telecomlead.com/smart-phone/thailand-smartphone-market-share-2025-samsung-leads-as-oppo-xiaomi-apple-and-vivo-compete-on-premium-growth-pricing-124700)
- [Samsung - Secure Folder](https://www.samsungknox.com/en/solutions/personal-apps/secure-folder)
- [OneSignal - Huawei React Native SDK](https://documentation.onesignal.com/docs/en/huawei-react-native-sdk-setup)
- [Firebase Test Lab - Available Devices](https://firebase.google.com/docs/test-lab/android/available-testing-devices)
- [BrowserStack - Testing React Native Apps](https://www.browserstack.com/guide/test-react-native-apps-ios-android)
- [CleverTap - Push Notification Delivery Issues](https://clevertap.com/blog/why-push-notifications-go-undelivered-and-what-to-do-about-it/)
- [Pushwoosh - Android Push Delivery](https://www.pushwoosh.com/blog/why-are-your-android-push-campaigns-not-delivered/)
- [Samsung - DeX Discontinued in One UI 7](https://www.sammyfans.com/2024/12/05/official-samsung-is-killing-dex-for-pc-with-one-ui-7/)
- [Material 3 Expressive](https://www.androidauthority.com/google-material-3-expressive-features-changes-availability-supported-devices-3556392/)
- [Minimum Supported Android Version 2026 Guide](https://blog.thefix.it.com/minimum-supported-android-version-the-ultimate-2026-guide/)
- [Android Headlines - Android Version Distribution 2026](https://www.androidheadlines.com/2026/01/android-version-distribution-numbers-2025-2026-market-share.html)
