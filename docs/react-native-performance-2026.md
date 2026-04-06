# React Native Performance Optimization 2026
**Stack: Expo SDK 55 | React Native 0.83.4 | React 19.2 | Hermes V1**
*Research Date: April 2026 — CTO Research Report*

---

## Executive Summary

x/pat runs on the most capable React Native stack ever shipped. Expo SDK 55 forces New Architecture (no opt-out), Hermes V1 is the default JS engine, and Reanimated 4 is stable. The majority of the "big wins" documented below are either already active by default or require one-line config changes. This report identifies what is live, what needs a sprint task, and what to defer post-launch.

**Priority Key:**
- `[PRE-LAUNCH]` — Implement before TestFlight / Play Store submission
- `[POST-LAUNCH]` — Schedule for v1.1 or later
- `[ALREADY ACTIVE]` — Default behavior in current stack; no action needed

---

## Section 1: New Architecture — Fabric + JSI (Topics 1–5)

### Topic 1: New Architecture Status in Expo SDK 55

**Status: ALREADY ACTIVE — mandatory, cannot be disabled.**

Expo SDK 55 ships with React Native 0.83 and runs exclusively on the New Architecture. SDK 54 was the last release to support the legacy Bridge architecture. As of our current stack, every screen, component, and native module in x/pat already operates under Fabric + JSI + TurboModules.

**What this means in practice:**
- No JSON serialization on native calls: bridge overhead drops from ~200ms to ~2ms per call
- Synchronous native module access via JSI — no async round-trips for things like SecureStore, Haptics, or Notifications
- UI thread updates via Fabric are synchronous with the host platform, which eliminates the one-frame rendering lag that plagued the legacy renderer

**Measured production impact (Shopify data, 2026):**
- 43% faster cold startup
- 39% improved rendering performance
- 25% reduction in memory across app lifecycle
- 95% reduction in bridge overhead per call

**x/pat action:** None. Running by default. Confirm no legacy `NativeModules` calls remain in codebase — TurboModules are the correct pattern now.

---

### Topic 2: JSI (JavaScript Interface) — Direct Native Bindings

**Status: ALREADY ACTIVE.**

JSI replaced the asynchronous Bridge in all SDK 55 apps. Rather than serializing JS values to JSON, passing across a thread boundary, deserializing on the native side, and reversing the process for callbacks, JSI gives JavaScript direct C++ object references.

**Practical implications for x/pat:**
- `expo-secure-store` reads and writes are synchronous and near-zero overhead
- `expo-haptics` triggers fire with no perceptible delay versus touch events
- `expo-location` callbacks arrive on the JS thread without serialization loss
- `@supabase/supabase-js` network calls are the bottleneck, not the bridge

**Implementation check:** Scan for any legacy `NativeModules.SomeName.someMethod()` patterns — these should be migrated to TurboModule equivalents. In practice, all `expo-*` packages have been New Architecture-compatible since SDK 53.

**x/pat action:** `[ALREADY ACTIVE]` — audit for any third-party packages still using legacy NativeModules bridge pattern.

---

### Topic 3: Fabric Renderer — Synchronous UI Updates

**Status: ALREADY ACTIVE.**

Fabric replaces the asynchronous shadow tree (Yoga layout + async commit) with a synchronous host platform renderer. Layout is still computed via Yoga, but commits to the native view tree happen synchronously, meaning gesture responses and animation frames no longer lag by one commit cycle.

**Implications for x/pat:**
- SpotCard swipe gestures and map cluster animations render at native frame rate
- Tab bar transitions no longer show the one-frame white flash common in legacy architecture
- `react-native-reanimated` 4.2.1 (already installed) runs animation worklets on the UI thread with zero JS thread dependency

**Key config to verify in `app.json`:**
```json
{
  "expo": {
    "jsEngine": "hermes"
  }
}
```
This is the default in SDK 55 but should be explicit.

**x/pat action:** `[ALREADY ACTIVE]` — verify `jsEngine: "hermes"` is explicit in app.json.

---

### Topic 4: TurboModules — Lazy Native Module Loading

**Status: ALREADY ACTIVE.**

TurboModules replace legacy NativeModules with lazy-loaded, type-safe native modules. In the legacy architecture, all native modules initialized at app startup regardless of whether they were used. TurboModules load only when first accessed.

**Cold start impact:**
- 60% less memory consumed by module loading at launch
- Modules like `expo-camera`, `expo-image-picker`, and `expo-notifications` now load on first use, not at app boot
- Startup time improvement: 10–15% on mid-range Android devices

**x/pat implementation:** No code changes required. All `expo-*` packages in SDK 55 are TurboModule-compatible. The benefit is automatic.

**x/pat action:** `[ALREADY ACTIVE]`

---

### Topic 5: Migration Path — For Future Reference

**Context:** x/pat is already fully migrated. This section documents the migration pattern for any new native packages added post-launch.

**Checklist when adding new native packages:**
1. Verify New Architecture compatibility on the package's GitHub — look for `fabricEnabled: true` or `"codegenConfig"` in package.json
2. Avoid packages still using `UIManager.dispatchViewManagerCommand` (legacy Fabric workaround)
3. For packages without New Architecture support, use the `expo-modules-core` compatibility layer or find an Expo SDK alternative
4. Test on both iOS and Android simulator with New Architecture explicitly — some packages silently fall back to bridge mode on one platform

**Tools:**
- `npx expo install --check` flags New Architecture incompatible packages
- React Native Directory (reactnative.directory) shows New Architecture support status per package

**x/pat action:** `[ALREADY ACTIVE]` — document this checklist in onboarding for any future dev hires.

---

## Section 2: Hermes Engine Optimization (Topics 6–10)

### Topic 6: Hermes V1 — What Changed in 0.83/0.84

**Status: ALREADY ACTIVE — Hermes V1 is the default in React Native 0.83.**

React Native 0.84 (released February 2026) made Hermes V1 the official default, replacing JavaScriptCore (JSC) entirely. Our stack (RN 0.83.4) ships with Hermes enabled; 0.84 simply formalized it. Hermes V1 brings:

- Improved execution speed (10–15% TTI improvement on complex views vs prior Hermes)
- Multi-generational garbage collection (Gen 0/Young, Gen 1/Intermediate, Gen 2/Old)
- WebAssembly support (not relevant to x/pat yet)
- Closer alignment with modern JS standards (important for React 19 concurrent features)

**x/pat action:** `[ALREADY ACTIVE]` — confirm `hermes-engine` is in `node_modules` and not overridden.

---

### Topic 7: Bytecode Pre-Compilation — How It Works

**Status: AUTOMATICALLY APPLIED in EAS production builds.**

Hermes performs AOT (ahead-of-time) compilation during the build process. Metro bundles JavaScript → Hermes compiles to `.hbc` bytecode → the `.hbc` file ships in the app binary instead of raw JS.

**Why this matters:**
- Raw JS requires parsing + JIT compilation on every cold start
- Hermes bytecode is memory-mapped — the OS loads only pages it needs, not the entire file
- Result: dramatically lower Time to Interactive (TTI) on slow Android flash storage
- Critical for low-end devices common in Bangkok, Lisbon, CDMX markets (x/pat's seed cities)

**Verification:** EAS production builds apply this automatically. Dev builds do NOT use bytecode (intentional — hot reload requires source).

**x/pat action:** `[ALREADY ACTIVE]` — no manual `hermesc` invocation needed with EAS. Verify build logs show "Hermes bytecode" in EAS build output.

---

### Topic 8: Hermes Garbage Collection Tuning

**Status: `[PRE-LAUNCH]` — one configuration worth applying.**

Hermes V1's multi-generational GC significantly reduces GC pause jank compared to JSC's mark-and-sweep. However, the default GC settings are conservative. For a social app with heavy image lists and real-time Supabase subscriptions, you can tune the GC to be more aggressive about reclaiming Gen 0 (short-lived objects).

**What to monitor:**
- GC pause events > 16ms cause visible frame drops (jank)
- x/pat risk areas: FeedScreen (many SpotCard renders), ChatScreen (message list), and map clustering

**Profiling approach in Android Studio:**
1. Profile → Memory Profiler → Record native allocations
2. Look for GC events during FlatList/FlashList scroll
3. Any GC pause > 16ms that coincides with a frame drop is a GC jank event

**Mitigation patterns:**
```javascript
// Avoid creating new objects inside render hot paths
// BAD — creates new style object on every render
const style = { padding: listItem.featured ? 16 : 8 };

// GOOD — memoize derived values
const style = useMemo(() => ({
  padding: listItem.featured ? 16 : 8
}), [listItem.featured]);
```

**x/pat action:** `[PRE-LAUNCH]` — audit SpotCard, FeedScreen render functions for inline object/array creation.

---

### Topic 9: Hermes Memory Profiling Workflow

**Status: `[PRE-LAUNCH]` — run once before TestFlight submission.**

**Toolchain:** React Native DevTools (accessible via `j` in Expo CLI) + Hermes profiler + Android Studio Memory Profiler.

**Step-by-step profiling for x/pat:**

1. **Start profiling session:**
   ```bash
   npx expo start --dev-client
   # Press 'j' to open React Native DevTools
   # Navigate to Profiler tab
   ```

2. **Record a scroll session on FeedScreen** — scroll through 50+ spots rapidly

3. **Analyze flame graph** — look for:
   - Components taking > 16ms to render (one frame budget)
   - Unnecessary re-renders of SpotCard when parent state changes
   - Memory growth without corresponding GC (potential leak)

4. **Android-specific:** Use Android Studio → Profile → Memory Profiler
   - Capture heap dump after 5 minutes of app use
   - Look for `ReactContext` instances that aren't being released
   - Common leak: `useEffect` cleanup not removing Supabase subscriptions

**x/pat action:** `[PRE-LAUNCH]` — run full profile session, fix any leak before App Store submission.

---

### Topic 10: Hermes + Inline Requires for Faster Startup

**Status: `[PRE-LAUNCH]` — 1 config change, measurable startup gain.**

Inline requires defer module execution until the module is first accessed. Combined with Hermes bytecode, this can shave 200–400ms from cold start on mid-range Android.

**Implementation in `metro.config.js`:**
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable inline requires for production (pairs with Hermes bytecode)
config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

module.exports = config;
```

**Important caveat:** Inline requires change module execution order, which can break modules that rely on side-effect initialization order. Test thoroughly on both platforms after enabling.

**Known safe patterns with x/pat's stack:**
- `expo-*` packages: safe
- `@supabase/supabase-js`: safe (pure functional)
- `react-native-reanimated`: requires `babel-plugin-reanimated` (already in babel.config.js)
- `react-native-maps`: test carefully — map initialization may be order-sensitive

**Measured impact:** ~200–400ms faster cold start on Android mid-range devices.

**x/pat action:** `[PRE-LAUNCH]` — add inline requires config, test on Android emulator API 28 (low-end target).

---

## Section 3: React Native DevTools Profiling — Finding and Fixing Jank (Topics 11–15)

### Topic 11: The Frame Budget and Jank Defined

**Understanding the baseline before profiling:**

A 60fps app has 16.67ms per frame. A 120fps ProMotion (iPhone 15 Pro) app has 8.33ms. Any work that blocks the JS thread or UI thread past this budget causes a dropped frame — visible as a stutter or "jank."

**React Native thread model (New Architecture):**
- **JS Thread:** React rendering, state updates, business logic, `useEffect` callbacks
- **UI Thread (Main):** Native view commits, Fabric layout, gesture recognition
- **Background Thread:** Network I/O, image decoding, Hermes GC (partially)

**Common jank sources in x/pat:**
1. FeedScreen FlashList rendering SpotCards with complex BlurView + LinearGradient
2. Map clustering recalculation on zoom/pan
3. Search debounce triggering Supabase query + re-render of results list
4. Chat message list receiving real-time updates while user is scrolling

---

### Topic 12: React Native DevTools — Profiler Tab Workflow

**Status: `[PRE-LAUNCH]` — standard pre-ship profiling.**

**Opening DevTools in SDK 55:**
```bash
npx expo start --dev-client
# Press 'j' in terminal → opens React Native DevTools in browser
# Navigate to: Profiler tab → click record → interact → stop
```

**What to look for in the flame graph:**
- **Wide horizontal bars** = long render time (bad)
- **Tall stacks** = deep component tree (investigate)
- **Yellow/red components** = exceeded frame budget
- **"Why did this render?"** toggle shows which prop/state change triggered each render

**x/pat profiling sessions to run:**

| Session | Screen | Action | Look For |
|---------|--------|--------|----------|
| 1 | FeedScreen | Scroll 50 spots rapidly | SpotCard re-render count |
| 2 | MapScreen | Zoom in/out 5x | Cluster recalculation time |
| 3 | SearchScreen | Type 5 characters | Debounce + list re-render |
| 4 | ChatScreen | Receive 10 messages | Message row render time |
| 5 | ProfileScreen | Navigate to/from | Screen mount cost |

---

### Topic 13: ScrollView Jank — The Core Problem and Fix

**Status: `[PRE-LAUNCH]` — verify FlashList is used everywhere.**

**Why ScrollView causes jank:**
- Renders ALL children at mount — 200 spots = 200 SpotCards instantiated simultaneously
- Generates hundreds of scroll events per second, each triggering JS callbacks
- No virtualization — memory grows linearly with content

**x/pat already uses `@shopify/flash-list` (v2.0.2)** — this is the correct choice. FlashList uses cell recycling (not virtualization) — it keeps a fixed pool of component instances and reuses them with new data. Up to 10x faster than FlatList on complex rows.

**FlashList optimization checklist:**
```javascript
<FlashList
  data={spots}
  renderItem={({ item }) => <SpotCard spot={item} />}
  estimatedItemSize={220}        // CRITICAL — must be accurate
  keyExtractor={(item) => item.id}
  getItemType={(item) => item.featured ? 'featured' : 'standard'}  // enables recycling pools
  removeClippedSubviews={true}   // remove off-screen native views
  maxToRenderPerBatch={5}        // reduce initial render batch
  windowSize={3}                 // render 3 screens worth of content
  onEndReachedThreshold={0.5}    // fetch next page at 50% scroll depth
/>
```

**Common FlashList mistake — verify in x/pat codebase:**
```javascript
// BAD — inline component defeats cell recycling
renderItem={({ item }) => <View style={{ padding: 8 }}><SpotCard spot={item} /></View>}

// GOOD — stable component reference
const renderSpotCard = useCallback(({ item }) => <SpotCard spot={item} />, []);
renderItem={renderSpotCard}
```

**x/pat action:** `[PRE-LAUNCH]` — audit all FlashList/FlatList usages, verify `estimatedItemSize` is accurate, verify no inline component creation in `renderItem`.

---

### Topic 14: ScrollView Event Throttling and Reanimated Integration

**Status: `[PRE-LAUNCH]` — applies to map and feed scroll animations.**

Scroll events fire at the native frame rate (60–120/sec). Each event that crosses to JS triggers a deserialization + handler + potential state update cycle. This is the primary source of scroll jank in animated headers and parallax effects.

**The solution — Reanimated `useAnimatedScrollHandler`:**
```javascript
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

const scrollY = useSharedValue(0);

const scrollHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    'worklet';  // runs on UI thread — zero JS thread cost
    scrollY.value = event.contentOffset.y;
  },
});

// Use Animated.FlashList (not regular FlashList) when scroll drives animations
<Animated.FlatList onScroll={scrollHandler} scrollEventThrottle={16} />
```

**This pattern is critical for:**
- FeedScreen sticky header (collapses on scroll)
- ProfileScreen header parallax
- SpotDetail hero image parallax

**x/pat action:** `[PRE-LAUNCH]` — confirm all scroll-driven animations use `useAnimatedScrollHandler` not `onScroll` with `setState`.

---

### Topic 15: React.memo and useMemo — Preventing Unnecessary Re-renders

**Status: `[PRE-LAUNCH]` — high-impact, low-effort.**

In the New Architecture with Fabric, re-renders are cheaper than in the legacy bridge architecture — but they still consume JS thread time and GC pressure. Memoization prevents renders when props haven't changed.

**x/pat SpotCard pattern:**
```javascript
// Wrap SpotCard in React.memo with custom equality check
export const SpotCard = React.memo(({ spot, onPress, isSaved }) => {
  // ... component
}, (prevProps, nextProps) => {
  // Only re-render if these specific props changed
  return prevProps.spot.id === nextProps.spot.id &&
    prevProps.isSaved === nextProps.isSaved;
});
```

**useMemo for expensive derivations:**
```javascript
// Expensive: filtering/sorting spots on every render
const sortedSpots = useMemo(() =>
  spots
    .filter(s => s.category === activeCategory)
    .sort((a, b) => b.rating - a.rating),
  [spots, activeCategory]  // only recalculate when these change
);
```

**Measurable impact:** In a 50-item feed, proper memoization reduces renders from O(n) per parent update to O(changed items). On a real-time Supabase feed with 1 update/sec, this is the difference between constantly burning JS thread vs. near-zero idle cost.

**x/pat action:** `[PRE-LAUNCH]` — wrap SpotCard, ChatMessage, and NotificationRow in React.memo.

---

## Section 4: Image Performance (Topics 16–20)

### Topic 16: expo-image vs react-native-fast-image — The Decision

**Status: ALREADY ACTIVE — expo-image (v55.0.8) is installed and correct.**

**Why expo-image wins for x/pat:**
- Uses SDWebImage (iOS) and Glide (Android) under the hood — same native engines as react-native-fast-image
- Full New Architecture support with no compatibility shims needed
- BlurHash placeholder support built-in (critical for x/pat's spot photo UX)
- `contentFit` / `contentPosition` CSS properties (superior to `resizeMode`)
- `priority` prop for preloading above-the-fold images
- Automatic WebP/AVIF format selection where supported
- `cachePolicy` control: `'disk'`, `'memory'`, `'memory-disk'`, `'none'`

**react-native-fast-image** is not New Architecture-compatible without a fork, is not maintained by Expo, and provides no meaningful performance advantage over expo-image in an Expo managed workflow.

**x/pat action:** `[ALREADY ACTIVE]` — continue using expo-image exclusively.

---

### Topic 17: expo-image BlurHash Placeholder Pattern

**Status: `[PRE-LAUNCH]` — implement across all spot photos.**

BlurHash generates a compact (20–30 character) string that encodes a blurred preview of an image. It renders instantly from CPU — no network request — giving a polished progressive loading experience.

**Implementation pattern:**
```javascript
import { Image } from 'expo-image';

// In Supabase spots table: add blurhash column (VARCHAR 40)
// Generate on upload: use expo-image's generateBlurhashAsync or server-side

export function SpotPhoto({ uri, blurhash, style }) {
  return (
    <Image
      source={{ uri }}
      placeholder={{ blurhash }}          // instant on render
      contentFit="cover"
      transition={200}                     // fade from blurhash to loaded image
      cachePolicy="memory-disk"           // L1: memory, L2: disk
      priority={uri ? "normal" : "low"}
      style={style}
      recyclingKey={uri}                  // critical for FlashList cell recycling
    />
  );
}
```

**The `recyclingKey` prop** is critical when using expo-image inside FlashList. Without it, recycled cells show the previous item's image while the new image loads, causing a flash. Setting `recyclingKey={uri}` forces expo-image to clear the cell when the source changes.

**x/pat action:** `[PRE-LAUNCH]` — add `blurhash` column to spots table, generate on upload, implement `recyclingKey` on all SpotPhoto usages in FlashList cells.

---

### Topic 18: Image Caching Strategy and Memory Management

**Status: `[PRE-LAUNCH]` — tune cache policy per use case.**

expo-image caches aggressively by default. For x/pat's use cases:

| Context | Recommended cachePolicy | Reason |
|---------|------------------------|--------|
| SpotCard thumbnail (feed) | `'memory-disk'` | Frequently revisited in session |
| SpotDetail hero image | `'disk'` | Large, not frequently re-visited |
| Avatar images | `'memory-disk'` | Small, frequently seen |
| Map marker thumbnails | `'memory'` | Many small images, session-only |
| User-uploaded photos | `'disk'` | User expects persistence |

**Memory pressure handling:**
```javascript
import { Image } from 'expo-image';

// Call on memory warning (AppState change to 'background' or system low-memory)
await Image.clearMemoryCache();

// Full cache clear (use sparingly — forces re-download)
await Image.clearDiskCache();
```

**x/pat action:** `[PRE-LAUNCH]` — implement `AppState` listener that calls `Image.clearMemoryCache()` when app goes to background.

---

### Topic 19: Image Preloading for SpotDetail Navigation

**Status: `[PRE-LAUNCH]` — eliminates hero image flash on navigation.**

When a user taps a SpotCard, the SpotDetail screen mounts and the hero image fetches from network — causing a visible blank or blurhash state for 200–500ms. Preloading during FeedScreen render eliminates this.

**Implementation:**
```javascript
import { Image } from 'expo-image';

// In FeedScreen — preload visible spot hero images
useEffect(() => {
  const visibleSpotUris = visibleSpots
    .slice(0, 5)  // preload top 5 visible spots
    .map(spot => ({ uri: spot.hero_image_url }));

  Image.prefetch(visibleSpotUris);
}, [visibleSpots]);
```

**Additional pattern — priority on first visible image:**
```javascript
// First SpotCard in feed gets high priority
<Image
  source={{ uri: spot.hero_image_url }}
  priority={index === 0 ? "high" : "normal"}
  // ...
/>
```

**Measured impact:** Eliminates 200–500ms hero image blank on navigation. Perceived performance improvement is significant — users notice blank images more than slow renders.

**x/pat action:** `[PRE-LAUNCH]` — add prefetch call in FeedScreen for top 5 visible spots.

---

### Topic 20: WebP/AVIF Format Adoption for Bundle + CDN Performance

**Status: `[PRE-LAUNCH]` — Supabase Storage + expo-image support this.**

expo-image automatically selects the best format the device supports. However, the server must serve the correct format. Supabase Storage serves whatever format was uploaded.

**Strategy:**
1. On image upload (expo-image-manipulator already installed), convert to WebP before upload:
```javascript
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

async function uploadSpotImage(uri) {
  // Resize + convert to WebP
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],  // max 1200px wide
    { compress: 0.85, format: SaveFormat.WEBP }
  );

  // Upload result.uri to Supabase Storage
  const fileName = `${Date.now()}.webp`;
  // ... supabase upload
}
```

2. Thumbnail variants: generate a 400px wide WebP for SpotCard thumbs, 1200px for SpotDetail hero

**Impact:** WebP averages 30% smaller than JPEG at equivalent quality. For a feed of 20 spots: ~6MB JPEG → ~4.2MB WebP. On 4G/LTE this saves ~0.3s per feed load. On 3G/slow connections (common in Bangkok cafes): saves 1–2s.

**x/pat action:** `[PRE-LAUNCH]` — implement WebP conversion in upload flow, generate thumbnail + hero variants.

---

## Section 5: Bundle Size Optimization (Topics 21–25)

### Topic 21: Current Metro Configuration and Tree Shaking Status

**Status: `[PRE-LAUNCH]` — Expo's tree shaking is an opt-in experiment.**

Metro (React Native's bundler) has historically had limited tree shaking compared to webpack/Rollup. In Expo SDK 53+, an experimental tree shaking feature was introduced. In SDK 55, it is available but not enabled by default.

**Enable Expo tree shaking:**
```javascript
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable experimental tree shaking (SDK 55)
// Automatically expands star exports and removes unused exports
process.env.EXPO_UNSTABLE_TREE_SHAKING = '1';

config.resolver.unstable_enablePackageExports = true;  // already default in SDK 55

module.exports = config;
```

**What it does:**
- Expands star exports (`export * from './utils'`) and removes unused exports
- Removes dead code branches from production bundle
- Works best on pure ESM packages; CJS packages have limited benefit

**Known issue:** Some packages (react-native-maps, certain animation libraries) have compatibility issues with aggressive tree shaking. Test on both platforms before enabling.

**Estimated impact:** 10–20% bundle size reduction for typical social apps, depending on which packages have side-effect-free exports.

**x/pat action:** `[PRE-LAUNCH]` — enable and test, measure bundle size before/after with `npx expo export --dump-sourcemap`.

---

### Topic 22: Inline Requires — Lazy Module Loading

**Status: `[PRE-LAUNCH]` — pairs with Topic 10.**

Inline requires transform `import` statements into lazy `require()` calls that execute when the module is first accessed rather than at startup. This is separate from tree shaking — it reduces startup cost without removing code.

**Full metro.config.js with both optimizations:**
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

config.resolver.unstable_enablePackageExports = true;

module.exports = config;
```

**Impact:** Modules that are imported at the top of many files but only used on specific screens (expo-image-picker, expo-location, expo-camera) will not execute until the user navigates to a screen that needs them.

**Cold start improvement:** 150–300ms on Android, less dramatic on iOS (which uses more aggressive native caching).

**x/pat action:** `[PRE-LAUNCH]` — implement after verifying no module initialization order bugs.

---

### Topic 23: Dynamic Imports and React.lazy for Screen-Level Code Splitting

**Status: `[PRE-LAUNCH]` — most impactful for rarely-visited screens.**

React.lazy + Suspense allows screens to be excluded from the initial JS bundle and loaded only when first navigated to. This is the highest-impact bundle optimization for apps with many screens.

**Implementation pattern for x/pat:**
```javascript
import React, { Suspense, lazy } from 'react';
import { ActivityIndicator, View } from 'react-native';

// Lazily load screens that are NOT in the initial navigation path
const EditProfileScreen = lazy(() => import('./screens/EditProfileScreen'));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen'));
const NotificationSettingsScreen = lazy(() => import('./screens/NotificationSettingsScreen'));
const SpotEditScreen = lazy(() => import('./screens/SpotEditScreen'));

// Wrap in Suspense wherever screen is rendered
function ScreenWithFallback({ Screen, ...props }) {
  return (
    <Suspense fallback={
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#ffffff" />
      </View>
    }>
      <Screen {...props} />
    </Suspense>
  );
}
```

**Screens to lazy-load vs eager-load for x/pat:**

| Screen | Load Strategy | Reason |
|--------|--------------|--------|
| FeedScreen | Eager | First screen after auth |
| MapScreen | Eager | Core navigation tab |
| ExploreScreen | Eager | Core navigation tab |
| ProfileScreen | Eager | Core navigation tab |
| SpotDetailScreen | Eager | Frequently accessed from feed |
| EditProfileScreen | Lazy | Rare — only on first setup or edits |
| SettingsScreen | Lazy | Rare — accessed < once per session |
| NotificationSettingsScreen | Lazy | Very rare |
| SpotEditScreen | Lazy | Power-user feature |
| OnboardingScreen | Lazy (after first launch) | Not shown to returning users |

**Measured impact:** Klarna reduced initial bundle parse time by ~15% using this pattern. For x/pat with ~15 screens, lazy-loading 6 rare screens should achieve similar results.

**x/pat action:** `[PRE-LAUNCH]` — implement lazy loading for EditProfile, Settings, SpotEdit screens.

---

### Topic 24: Analyzing Bundle Size with Metro Source Maps

**Status: `[PRE-LAUNCH]` — run once to find biggest bundle contributors.**

Before optimizing, measure. Metro can dump source maps that reveal exactly which packages consume the most bundle space.

**Workflow:**
```bash
# Generate production bundle with source map
npx expo export --platform ios --dump-sourcemap

# The output includes bundle.js and bundle.js.map
# Analyze with bundle analyzer
npx source-map-explorer dist/ios/bundle.js dist/ios/bundle.js.map
```

**Alternatively, use Metro's built-in visualizer:**
```bash
npx react-native bundle --platform ios --dev false --entry-file index.ts \
  --bundle-output /tmp/bundle.js --sourcemap-output /tmp/bundle.js.map

npx source-map-explorer /tmp/bundle.js /tmp/bundle.js.map
```

**What to look for in x/pat's bundle:**
- `react-native-map-clustering` — may include unused clustering algorithms
- `@expo/vector-icons` — includes all icon sets; only the used set should be in bundle
- `@react-navigation/*` — should be tree-shaken; verify no unused navigators
- `react-native-svg` — large; verify only used in active screens

**x/pat action:** `[PRE-LAUNCH]` — run bundle analysis, identify top 5 size contributors, file post-launch tasks for any > 200KB surprises.

---

### Topic 25: Icon Bundle Optimization

**Status: `[PRE-LAUNCH]` — quick win, often overlooked.**

`@expo/vector-icons` includes multiple full icon font sets (Ionicons, MaterialIcons, FontAwesome, etc.) even if only one is used. Each font file is ~200–400KB.

**Optimization:**
```javascript
// In app.json — only load fonts actually used
{
  "expo": {
    "fonts": [
      "./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf"
      // Remove MaterialIcons.ttf, FontAwesome.ttf etc. if unused
    ]
  }
}
```

**Alternatively**, replace icon font with SVG icons using `react-native-svg` (already in dependencies). SVGs are tree-shaken per icon; fonts load the entire glyph set.

**x/pat action:** `[POST-LAUNCH]` — audit icon font usage, remove unused font sets from app.json fonts array.

---

## Section 6: JS Thread Unblocking Patterns (Topics 26–30)

### Topic 26: useTransition — Marking State Updates as Non-Urgent

**Status: `[PRE-LAUNCH]` — high-impact for search and filter interactions.**

React 19 (which x/pat runs on) makes Concurrent Mode the default. `useTransition` marks a state update as low-priority (interruptible), allowing React to keep the UI responsive while the update is computed.

**x/pat SearchScreen pattern:**
```javascript
import { useState, useTransition } from 'react';

function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (text) => {
    setQuery(text);  // urgent: update input immediately

    startTransition(() => {
      // non-urgent: filter/fetch results can be interrupted
      // if user types another character before this completes,
      // React will abort this transition and start a new one
      fetchSpotsByQuery(text).then(setResults);
    });
  };

  return (
    <>
      <SearchInput value={query} onChangeText={handleSearch} />
      {isPending && <SearchingIndicator />}
      <FlashList data={results} renderItem={renderSpot} />
    </>
  );
}
```

**What this prevents:** Without useTransition, every keystroke triggers a synchronous state update that blocks the input field from updating until the results list re-renders. With useTransition, the input updates instantly and results update asynchronously.

**x/pat action:** `[PRE-LAUNCH]` — implement in SearchScreen and ExploreScreen category filter.

---

### Topic 27: useDeferredValue — Deferring Expensive Derived Values

**Status: `[PRE-LAUNCH]` — use when you don't own the state-updating code.**

`useDeferredValue` is to values what `useTransition` is to updates. It lets you keep showing stale content while fresh content is being computed. Use it when you receive a prop or context value that you can't control.

**x/pat pattern — MapScreen cluster rendering:**
```javascript
import { useDeferredValue, useMemo } from 'react';

function MapScreen({ spots }) {
  // spots may update frequently from Supabase realtime subscription
  const deferredSpots = useDeferredValue(spots);

  // Cluster calculation is expensive — runs with deferred (potentially stale) spots
  // while the map stays interactive with live spots
  const clusters = useMemo(() =>
    calculateClusters(deferredSpots, mapRegion),
    [deferredSpots, mapRegion]
  );

  const isStale = spots !== deferredSpots;

  return (
    <MapView style={isStale ? styles.mapStale : styles.map}>
      {clusters.map(cluster => <ClusterMarker key={cluster.id} cluster={cluster} />)}
    </MapView>
  );
}
```

**Key difference from useTransition:**
- `useTransition` — you control the state update, wrap it in `startTransition`
- `useDeferredValue` — you don't control when the value changes (Supabase subscription, prop from parent)

**x/pat action:** `[PRE-LAUNCH]` — implement in MapScreen for cluster recalculation on realtime spot updates.

---

### Topic 28: InteractionManager — Deferring Work Past Navigation Transitions

**Status: `[PRE-LAUNCH]` — critical for navigation performance.**

React Navigation fires screen mount before the navigation transition animation completes. Any heavy initialization (Supabase queries, image preloading, location fetch) that runs immediately on mount competes with the transition animation for JS thread time, causing visible jank.

**The pattern — defer until after animation:**
```javascript
import { InteractionManager } from 'react-native';
import { useEffect, useState } from 'react';

function SpotDetailScreen({ route }) {
  const { spotId } = route.params;
  const [isReady, setIsReady] = useState(false);
  const [spotData, setSpotData] = useState(null);

  useEffect(() => {
    // Don't fetch until navigation transition completes (~300ms)
    const task = InteractionManager.runAfterInteractions(async () => {
      const data = await fetchSpotDetail(spotId);
      setSpotData(data);
      setIsReady(true);
    });

    return () => task.cancel();  // cancel if user navigates back
  }, [spotId]);

  if (!isReady) return <SpotDetailSkeleton />;
  return <SpotDetailContent spot={spotData} />;
}
```

**x/pat screens that benefit most:**
- SpotDetailScreen — fetch reviews, check-ins, related spots
- ProfileScreen — fetch user's spots, follower stats
- ChatScreen — fetch message history
- ExploreScreen — initial spot grid load

**Measured impact:** Eliminates "animation jank on navigation" — one of the most common complaints in React Native app reviews.

**x/pat action:** `[PRE-LAUNCH]` — implement InteractionManager pattern in SpotDetailScreen and ProfileScreen.

---

### Topic 29: Reanimated Worklets — Moving Animation Logic Off JS Thread

**Status: ALREADY ACTIVE — Reanimated 4.2.1 is installed.**

x/pat already has `react-native-reanimated` (4.2.1) and `react-native-worklets` (0.7.2) installed. Worklets are JavaScript functions that run on the UI thread's separate JS runtime, completely bypassing the main JS thread.

**Why this matters:**
- The JS thread can be blocked by React rendering, Supabase callbacks, or any synchronous JS work
- Animations driven by the JS thread drop frames whenever JS is busy
- Worklets run in a separate V8/Hermes runtime on the UI thread — they are immune to JS thread blockage

**Correct pattern for x/pat animated components:**
```javascript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,           // for calling JS thread functions FROM worklets
  runOnUI,           // for calling worklet functions FROM JS thread
} from 'react-native-reanimated';

function SpotCard({ spot, onPress }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';  // this function runs on UI thread
    return { transform: [{ scale: scale.value }] };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.96);  // runs on UI thread — not JS thread
  };

  const handlePressOut = () => {
    scale.value = withSpring(1.0);
  };

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        {/* ... */}
      </Pressable>
    </Animated.View>
  );
}
```

**Anti-pattern to avoid:**
```javascript
// WRONG — Animated.Value is legacy API, runs on JS thread
const scale = new Animated.Value(1);
Animated.spring(scale, { toValue: 0.96 }).start();
```

**x/pat action:** `[ALREADY ACTIVE]` — audit that all animations use Reanimated `useSharedValue` / `useAnimatedStyle`, not legacy `Animated.Value`.

---

### Topic 30: requestAnimationFrame and the JS Event Loop — Correct Mental Model

**Status: Reference knowledge — use to debug remaining jank after above fixes.**

`requestAnimationFrame` (rAF) and `InteractionManager` are complementary tools for different scenarios.

**When to use each:**

| Tool | Use Case | When It Fires |
|------|----------|--------------|
| `requestAnimationFrame` | Visual updates tied to the next frame | Before the next paint |
| `InteractionManager.runAfterInteractions` | Heavy work after animation/gesture | After all active interactions complete |
| `useTransition` | React state updates that can be interrupted | During React's render scheduling |
| `useDeferredValue` | Derived values from uncontrolled inputs | After urgent renders complete |
| `setTimeout(fn, 0)` | Yield to event loop (last resort) | As soon as event loop is empty |

**x/pat practical pattern — screen with both animation and data load:**
```javascript
function ExploreScreen() {
  const [spots, setSpots] = useState([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Phase 1: After navigation transition animation completes
    InteractionManager.runAfterInteractions(() => {
      // Phase 2: Fetch data, but mark state update as non-urgent
      fetchFeaturedSpots().then(data => {
        startTransition(() => {
          setSpots(data);  // won't block if user is scrolling
        });
      });
    });
  }, []);
}
```

**The layered approach:** InteractionManager waits for navigation → useTransition makes the state update non-blocking → Reanimated worklets ensure animations never touch JS thread. This three-layer pattern eliminates virtually all jank sources.

**x/pat action:** `[PRE-LAUNCH]` — implement the three-layer pattern (InteractionManager + useTransition + Reanimated) in ExploreScreen and FeedScreen initial load.

---

## Implementation Priority Matrix

### Ship Before TestFlight (PRE-LAUNCH)

| # | Task | Effort | Impact | File(s) |
|---|------|--------|--------|---------|
| 1 | Add `jsEngine: "hermes"` to app.json explicitly | 5 min | Low (already active, makes intent clear) | `app.json` |
| 2 | Add `inlineRequires: true` to metro.config.js | 15 min | High (+200–400ms startup on Android) | `metro.config.js` |
| 3 | Enable EXPO_UNSTABLE_TREE_SHAKING, test both platforms | 2 hrs | Medium (10–20% bundle) | `metro.config.js` |
| 4 | Audit FlashList: `estimatedItemSize`, no inline renderItem | 1 hr | High (scroll jank eliminated) | FeedScreen, SearchScreen |
| 5 | Wrap SpotCard in React.memo with custom equality | 30 min | High (O(n) → O(1) re-renders) | `SpotCard.tsx` |
| 6 | Add `recyclingKey` to all expo-image in FlashList cells | 30 min | High (eliminates image flash) | SpotCard, ChatMessage |
| 7 | Add `AppState` listener for `Image.clearMemoryCache()` | 30 min | Medium (prevents memory warnings) | `App.tsx` |
| 8 | Prefetch top 5 spot hero images in FeedScreen | 45 min | High (eliminates nav blank flash) | `FeedScreen.tsx` |
| 9 | Add `blurhash` to spots table, generate on upload | 2 hrs | High (polish/perceived perf) | Supabase + upload flow |
| 10 | Implement WebP conversion in image upload | 1 hr | Medium (30% smaller images) | upload utility |
| 11 | Implement `useTransition` in SearchScreen | 1 hr | High (input responsiveness) | `SearchScreen.tsx` |
| 12 | Implement `useDeferredValue` in MapScreen clustering | 1 hr | High (map interaction) | `MapScreen.tsx` |
| 13 | Implement `InteractionManager` in SpotDetail, Profile | 2 hrs | High (navigation jank) | `SpotDetailScreen.tsx`, `ProfileScreen.tsx` |
| 14 | Lazy load EditProfile, Settings, SpotEdit screens | 2 hrs | Medium (startup bundle) | `navigation/` |
| 15 | Confirm all animations use Reanimated worklets, not Animated.Value | 1 hr | High (animation smoothness) | All animated components |
| 16 | Run Hermes memory profile session, fix any leaks | 3 hrs | High (stability) | DevTools + Android Studio |
| 17 | Run bundle analysis, document top contributors | 1 hr | Low (planning) | Terminal |

**Total estimated effort: ~19 hours (2–3 engineer days)**

### Post-Launch (v1.1)

| Task | Reason to Defer |
|------|----------------|
| Remove unused vector icon font sets | Low user impact, requires audit |
| Upgrade to React Native 0.84 (Hermes V1 default) | Breaking change risk, SDK upgrade required |
| Investigate react-native-worklets multithreading for map clustering | Advanced, currently not a bottleneck |
| Bundle splitting via metro-serializer-esbuild | Experimental, high risk pre-launch |

---

## Already Active Summary (No Action Needed)

The following performance optimizations are live by default in Expo SDK 55 + React Native 0.83:

1. New Architecture (Fabric + JSI + TurboModules) — mandatory in SDK 55
2. Hermes bytecode pre-compilation — applied automatically in EAS production builds
3. TurboModule lazy loading — automatic for all `expo-*` packages
4. Fabric synchronous UI commits — automatic
5. JSI direct native bindings — automatic (no Bridge serialization)
6. `unstable_enablePackageExports` — default in SDK 53+
7. Reanimated 4 worklet engine — already installed (4.2.1)
8. expo-image with SDWebImage/Glide — already installed (55.0.8)
9. FlashList cell recycling — already installed (2.0.2)

---

## Sources

- [React Native's New Architecture — Expo Documentation](https://docs.expo.dev/guides/new-architecture/)
- [Expo SDK 55 Changelog](https://expo.dev/changelog/sdk-55)
- [Upgrading to Expo SDK 55](https://expo.dev/blog/upgrading-to-sdk-55)
- [React Native 0.84 — Hermes V1 by Default](https://reactnative.dev/blog/2026/02/11/react-native-0.84)
- [React Native 0.84 + Hermes V1 Complete Guide — Rork Lab](https://rorklab.net/en/articles/rork-dev/react-native-084-hermes-v1-guide)
- [Using Hermes Engine — Expo Documentation](https://docs.expo.dev/guides/using-hermes/)
- [React Native New Architecture Migration Guide 2026 — Agilesoftlabs](https://www.agilesoftlabs.com/blog/2026/03/react-native-new-architecture-migration)
- [React Native Performance Optimization 2026 Guide — Agilesoftlabs](https://www.agilesoftlabs.com/blog/2026/03/react-native-performance-optimization)
- [Fabric Renderer — React Native](https://reactnative.dev/architecture/fabric-renderer)
- [About the New Architecture — React Native](https://reactnative.dev/architecture/landing-page)
- [Profiling with Hermes — React Native](https://archive.reactnative.dev/docs/next/profile-hermes)
- [React Native Memory Leak Fixes — Instamobile](https://instamobile.io/blog/react-native-memory-leak-fixes/)
- [React Native Performance Monitoring Guide 2026 — UXCam](https://uxcam.com/blog/react-native-performance-monitoring/)
- [React Native performance tactics — Sentry Blog](https://blog.sentry.io/react-native-performance-strategies-tools/)
- [Image — Expo Documentation](https://docs.expo.dev/versions/latest/sdk/image/)
- [expo-image npm](https://www.npmjs.com/package/expo-image)
- [FlashList vs. FlatList — Whitespectre](https://www.whitespectre.com/ideas/better-lists-with-react-native-flashlist/)
- [Optimizing FlatList Configuration — React Native](https://reactnative.dev/docs/optimizing-flatlist-configuration)
- [Tree shaking and code removal — Expo Documentation](https://docs.expo.dev/guides/tree-shaking/)
- [Metro Configuration — Expo Documentation](https://docs.expo.dev/versions/latest/config/metro/)
- [Optimizing JavaScript loading — React Native](https://reactnative.dev/docs/optimizing-javascript-loading)
- [Reanimated 4 Stable Release — Software Mansion](https://swmansion.com/blog/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713)
- [Worklets — React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/)
- [useTransition — React](https://react.dev/reference/react/useTransition)
- [useTransition and useDeferredValue in React Native — Medium](https://pradeep-sharma.medium.com/usetransition-and-usedeferredvalue-in-react-native-f58f8e65181c)
- [InteractionManager — React Native](https://reactnative.dev/docs/interactionmanager)
- [React Native in 2026: The New Architecture — Guilherme Albert](https://guilhermealbert.com/blog/react-native-new-architecture/)
- [Deep Dive into React Native's New Architecture — Medium](https://medium.com/@DhruvHarsora/deep-dive-into-react-natives-new-architecture-jsi-turbomodules-fabric-yoga-234bbdf853b4)
- [React Native Performance Optimization Tools, Tips & Benchmarks 2026 — Quokka Labs](https://quokkalabs.com/blog/react-native-performance/)
