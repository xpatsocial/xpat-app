# Android Performance Optimization for React Native / Expo
## x/pat Social Travel App — Comprehensive Research (April 2026)

---

## Table of Contents
1. [Hermes Engine Optimization](#1-hermes-engine-optimization)
2. [New Architecture (Fabric + TurboModules)](#2-new-architecture-fabric--turbomodules)
3. [FlatList vs FlashList vs LegendList](#3-flatlist-vs-flashlist-vs-legendlist)
4. [Image Loading/Caching Libraries](#4-image-loadingcaching-libraries)
5. [Memory Leak Patterns](#5-memory-leak-patterns)
6. [Cold Start Optimization](#6-cold-start-optimization)
7. [Reanimated 4.x Performance](#7-reanimated-4x-performance)
8. [React Native Maps Performance](#8-react-native-maps-performance)
9. [WebSocket/Supabase Realtime](#9-websocketsupabase-realtime)
10. [AsyncStorage vs MMKV](#10-asyncstorage-vs-mmkv)
11. [Battery Optimization](#11-battery-optimization)
12. [App Size Optimization](#12-app-size-optimization)
13. [React Navigation Performance](#13-react-navigation-performance)
14. [Keyboard Handling](#14-keyboard-handling)
15. [ScrollView/FlatList Momentum Scrolling](#15-scrollviewflatlist-momentum-scrolling)
16. [Touch/Gesture Response Time](#16-touchgesture-response-time)
17. [Network Request Performance](#17-network-request-performance)
18. [SQLite/Local Database Options](#18-sqlitelocal-database-options)
19. [Garbage Collection Impact on Animations](#19-garbage-collection-impact-on-animations)
20. [Bridge vs JSI Performance](#20-bridge-vs-jsi-performance)
21. [Expo SDK 55 Android Issues](#21-expo-sdk-55-android-issues)
22. [Android 14/15/16 Optimizations](#22-android-141516-optimizations)
23. [Low-End Device Optimization](#23-low-end-device-optimization)
24. [Thermal Throttling](#24-thermal-throttling)
25. [ProGuard/R8 Rules](#25-proguardr8-rules)

---

## 1. Hermes Engine Optimization

### Current State (April 2026)
React Native 0.84 (Feb 2026) makes **Hermes V1 the default JS engine** on both iOS and Android. Expo SDK 55 (RN 0.83) uses Hermes by default.

### Key Benchmarks
| Metric | Without Hermes | With Hermes V1 | Improvement |
|--------|---------------|-----------------|-------------|
| Cold start (TTI) | Baseline | -25% to -40% | Significant |
| Memory usage | Baseline | -30MB average | Major |
| JS bundle size | Baseline | -1-2MB | Moderate |
| TTI for complex views | Baseline | 10-15% faster | Measurable |

### How It Works
- **Ahead-of-Time (AOT) compilation**: JS is compiled to optimized bytecode at build time, not parsed at runtime
- **Generational garbage collector**: Fewer GC pauses, better long-session stability
- Bytecode is executed directly by the Hermes runtime on-device

### Best Practices for x/pat
```javascript
// Verify Hermes is enabled (should be by default)
// In app.json or app.config.js:
{
  "expo": {
    "jsEngine": "hermes"  // default in SDK 55
  }
}
```

**DO:**
- Keep Hermes enabled (default) -- never switch to JSC
- Use `react-native-bundle-visualizer` to audit bundle size
- Enable `inlineRequires` in Metro config for deferred module loading

**DON'T:**
- Use `eval()` or dynamic code generation (Hermes has limited support)
- Rely on JSC-specific features

### Measurement Tools
- **Hermes Debugger** via Chrome DevTools
- **React Native DevTools** (replaced Flipper as of RN 0.76)
- `PerformanceObserver` API for TTI measurement
- Android Studio Profiler for native-layer memory

---

## 2. New Architecture (Fabric + TurboModules)

### Current State
- Enabled by default since React Native 0.76 (Dec 2024)
- Expo SDK 53+ enables New Architecture by default
- The old bridge is officially deprecated -- "the bridge is burnt"

### Performance Benchmarks
| Metric | Old Architecture | New Architecture | Improvement |
|--------|-----------------|------------------|-------------|
| Frame rates | 30-45 fps | 55-60 fps | +50% |
| Startup time | Baseline | -40% | Major |
| Memory usage | Baseline | -20-30% | Significant |
| JS-Native call speed | Serialized (async) | Near-instant (sync) | 30-50% faster |

### Key Components

**JSI (JavaScript Interface):**
- Replaces the async bridge with synchronous C++ bindings
- JS can hold direct references to C++ objects
- No serialization/deserialization overhead

**Fabric Renderer:**
- Concurrent rendering eliminates jank during API calls
- Async rendering with direct JS-Native thread communication
- Eliminates "white screen flash" during fast scrolling

**TurboModules:**
- Lazy loading: modules load only when first accessed (not all at startup)
- Cut startup time by up to 50%
- Direct native code communication bypassing the bridge

### Best Practices for x/pat
```javascript
// app.json -- New Arch is enabled by default in SDK 55
{
  "expo": {
    "newArchEnabled": true  // default
  }
}
```

**DO:**
- Ensure all third-party libraries support New Architecture
- Use JSI-based libraries when available (MMKV, op-sqlite, etc.)
- Test on Android with New Architecture explicitly

**DON'T:**
- Mix old bridge-based modules with New Architecture if possible
- Disable New Architecture unless a critical library is incompatible

---

## 3. FlatList vs FlashList vs LegendList

### Performance Benchmarks

| Metric | FlatList | FlashList | LegendList |
|--------|----------|-----------|------------|
| Scroll speed (500+ items) | Baseline | 5-10x faster | 3-5x faster |
| JS thread usage | >90% | <10% | ~15% |
| Low-end Android | Laggy, crashes | Smooth at 60fps | Good |
| Dynamic heights | Basic | Limited | Excellent |
| Memory strategy | Virtualization | Cell recycling | JS-based recycling |
| Native dependencies | No | Yes | No |

### When to Use Each

**FlatList:** Lists under 100 items, simple layouts, no performance issues observed.

**FlashList (Recommended for x/pat):**
- Feed screens with 100+ items
- Explore screen spot cards
- Any scrollable list on Android that shows jank
- Best choice for low-end Android devices

**LegendList:**
- Lists with dynamic/variable item heights
- Built on Fabric architecture + Reanimated
- Eliminates blank flashes during fast scroll
- FlashList 2.0 is now JS-only (rebuilt), closing the architecture gap

### Best Practices
```javascript
// FlashList usage
import { FlashList } from "@shopify/flash-list";

<FlashList
  data={spots}
  renderItem={renderSpotCard}
  estimatedItemSize={200}  // REQUIRED: provide accurate estimate
  keyExtractor={(item) => item.id}
/>
```

**DO:**
- Always provide `estimatedItemSize` for FlashList
- Use `keyExtractor` consistently
- Memoize `renderItem` with `useCallback`
- Set `removeClippedSubviews={true}` for FlatList

**DON'T:**
- Use FlatList for lists >100 items on Android
- Create new objects/functions inside `renderItem`
- Nest FlatLists without `nestedScrollEnabled`

### Measurement
- Use FlashList's built-in performance metrics
- Monitor JS thread frame rate with React DevTools Profiler

---

## 4. Image Loading/Caching Libraries

### Comparison for Expo/Android

| Feature | RN Image | FastImage | expo-image |
|---------|----------|-----------|------------|
| Caching | Basic | Glide (Android) | Glide (Android) |
| Priority loading | No | Yes | No |
| Preloading API | No | Yes | Yes |
| Transition animations | No | No | Built-in |
| Flickering on source change | Yes | Possible | Eliminated |
| Expo managed workflow | Yes | Requires config plugin | Native support |
| Maintenance (2026) | Active | Forks only | Active |
| Bundle size impact | None | ~50KB | Included in SDK |

### Recommendation for x/pat: expo-image

expo-image is the clear winner for Expo-managed projects:
- Zero-config setup
- Uses Glide under the hood on Android (same as FastImage)
- Built-in transition animations eliminate flickering
- Actively maintained as part of Expo SDK

```javascript
import { Image } from 'expo-image';

// Optimal configuration for spot images
<Image
  source={{ uri: spotImageUrl }}
  style={styles.spotImage}
  contentFit="cover"
  transition={200}           // smooth fade-in
  placeholder={blurhash}      // blurhash placeholder
  cachePolicy="memory-disk"   // aggressive caching
  recyclingKey={spotId}        // helps with list recycling
/>
```

**DO:**
- Use `cachePolicy="memory-disk"` for feed images
- Provide `blurhash` or `thumbhash` placeholders
- Set `recyclingKey` when used inside FlashList
- Preload hero images during splash screen

**DON'T:**
- Load full-resolution images in lists (resize on server/CDN)
- Skip placeholder -- causes layout shifts
- Use React Native's built-in `<Image>` for performance-critical screens

---

## 5. Memory Leak Patterns

### Common Leak Patterns in React Native Android

**1. Uncleared Subscriptions/Listeners**
```javascript
// BAD: Leaks on unmount
useEffect(() => {
  const sub = supabase.channel('chat').subscribe();
  // Missing cleanup!
}, []);

// GOOD: Proper cleanup
useEffect(() => {
  const channel = supabase.channel('chat');
  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

**2. Timer Leaks**
```javascript
// BAD
useEffect(() => {
  setInterval(fetchData, 5000);
}, []);

// GOOD
useEffect(() => {
  const id = setInterval(fetchData, 5000);
  return () => clearInterval(id);
}, []);
```

**3. Closure References**
```javascript
// BAD: Holds stale references
const [data, setData] = useState(null);
useEffect(() => {
  fetchData().then(result => {
    setData(result); // Component may be unmounted
  });
}, []);

// GOOD: AbortController pattern
useEffect(() => {
  const controller = new AbortController();
  fetchData({ signal: controller.signal }).then(setData);
  return () => controller.abort();
}, []);
```

**4. BridgeReactContext Leaks (Expo Go specific)**
- Multiple BridgeReactContext objects accumulate in heap dumps after app reloads
- Less relevant in production builds

**5. Image Memory Accumulation**
- Large images not released from memory cache
- Fix: Use expo-image with proper `cachePolicy` and `recyclingKey`

### Detection Tools
| Tool | What It Detects | Platform |
|------|----------------|----------|
| Android Studio Memory Profiler | Java/Kotlin heap, native memory | Android |
| Hermes Debugger (Chrome) | JS heap snapshots | Cross-platform |
| LeakCanary | Activity/Fragment leaks | Android native |
| React DevTools Profiler | Component re-render cycles | Cross-platform |
| Rozenite | Performance metrics, memory | Cross-platform |

### Detection Strategy
1. Take heap snapshot before navigation flow
2. Navigate through screens, return to start
3. Take second snapshot
4. Compare -- memory should return to baseline (within 5-10%)
5. Growing memory = leak

---

## 6. Cold Start Optimization

### Android Cold Start Timeline
```
App Launch → Native Init → JS Engine Init → JS Bundle Parse → React Render → TTI
            ~100ms         ~50ms (Hermes)   ~200-500ms        ~100-300ms
```

### Optimization Strategies (Priority Order)

**1. Hermes AOT Compilation (Already enabled)**
- 20-40% startup improvement vs JSC
- Bytecode loads directly instead of parsing JS

**2. Metro `inlineRequires`**
```javascript
// metro.config.js
module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,  // Defer module loading
      },
    }),
  },
};
```

**3. Lazy Screen Loading**
```javascript
// Defer non-critical screens
const ExploreScreen = React.lazy(() => import('./screens/ExploreScreen'));
const ProfileScreen = React.lazy(() => import('./screens/ProfileScreen'));
```

**4. Splash Screen Strategy**
```javascript
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

// In root component:
useEffect(() => {
  async function prepare() {
    // Preload critical fonts, images
    await Font.loadAsync(fonts);
    await Image.prefetch(heroImages);
    // Hide splash when ready
    await SplashScreen.hideAsync();
  }
  prepare();
}, []);
```

**5. Bundle Size Reduction**
- Run `npx react-native-bundle-visualizer` to find large dependencies
- Tree-shake unused exports
- Dynamic import heavy libraries (e.g., map libraries)

### Benchmark Targets
| Metric | Target (Mid-range) | Target (Low-end) |
|--------|-------------------|-------------------|
| Cold start to splash | <500ms | <800ms |
| TTI (Time to Interactive) | <2s | <3s |
| First Meaningful Paint | <1.5s | <2.5s |

### Measurement
- `react-native-performance` library
- Android Studio CPU Profiler with app startup trace
- `adb shell am start -W` for cold start timing

---

## 7. Reanimated 4.x Performance

### Current State (April 2026)
- Reanimated 4 requires New Architecture (Fabric)
- CSS animations and transitions are now stable
- Known performance regressions exist when migrating from Legacy to New Architecture

### Known Android Issues

**Issue 1: Animation Stuttering After New Arch Migration**
- Animations that ran smoothly on Legacy Architecture may stutter on New Architecture
- Affects Reanimated 3.16.0 through 4.0.0

**Fix:**
- Upgrade to React Native 0.81+
- Upgrade to Reanimated 4.2.0+
- Enable these feature flags:
```javascript
// In native config or gradle
preventShadowTreeCommitExhaustion: true
DISABLE_COMMIT_PAUSING_MECHANISM: true
USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS: true
```

**Issue 2: FPS Drops with Many Animated Components During Scroll**
- Particularly with FlashList/LegendList containing animated items
- Reanimated views in lists cause performance degradation

### Performance Rules of Thumb

| Scenario | Max Animated Components | Expected FPS |
|----------|------------------------|--------------|
| High-end Android | 100+ | 60fps |
| Mid-range Android | 50-80 | 55-60fps |
| Low-end Android (2GB) | <30 | 45-55fps |

### Best Practices
```javascript
// FAST: Non-layout properties
useAnimatedStyle(() => ({
  transform: [{ translateY: offset.value }],
  opacity: opacity.value,
}));

// SLOW: Layout-affecting properties (avoid)
useAnimatedStyle(() => ({
  height: height.value,     // Forces layout recalculation
  marginTop: margin.value,  // Triggers re-layout
}));
```

**DO:**
- Animate `transform`, `opacity`, `backgroundColor` (non-layout)
- Use worklets for UI-thread execution
- Limit concurrent animated components on Android
- Use `cancelAnimation()` on unmount

**DON'T:**
- Animate `width`, `height`, `margin`, `padding` (layout properties)
- Run >100 simultaneous animations on low-end devices
- Mix JS-driven and UI-thread animations on same component

---

## 8. React Native Maps Performance

### Android-Specific Challenges

**Marker Limits:**
| Marker Count | Performance Impact |
|-------------|-------------------|
| <50 | Smooth |
| 50-100 | Minor jank on low-end |
| 100-500 | Significant lag, needs clustering |
| 500+ | Unusable without clustering |

**Custom markers are especially expensive on Android** because each React component triggers React's declarative rendering pipeline when the map is touched/moved.

### Clustering Solutions for x/pat (431+ spots)

**Recommended: react-native-clusterer**
- Uses C++ supercluster implementation with JSI bindings
- Up to 10x faster initial point loading vs JS-based clustering
- Best performance for x/pat's 431+ spot markers

```javascript
import { Clusterer } from 'react-native-clusterer';

// Cluster configuration
<Clusterer
  data={spots}
  region={mapRegion}
  options={{
    radius: 40,
    maxZoom: 16,
    minPoints: 2,
  }}
  renderItem={(item) => <SpotMarker spot={item} />}
  renderCluster={(cluster) => <ClusterMarker count={cluster.count} />}
/>
```

**Alternatives:**
- `react-native-map-clustering` -- simpler API, less performant
- `react-native-map-supercluster` -- modern, lightweight, actively maintained

### Android-Specific Optimizations
- Set `tracksViewChanges={false}` on markers (critical for performance)
- Use static images for cluster markers instead of custom React components
- Avoid rapid zoom changes (causes Android crashes with clustering)
- x/pat uses Google Maps on Android -- configure tile caching

**DO:**
- Cluster markers when count >50
- Set `tracksViewChanges={false}` on all markers
- Use `moveOnMarkerPress={false}` if not needed
- Debounce `onRegionChangeComplete` (300ms minimum)

**DON'T:**
- Render >100 custom React component markers simultaneously
- Allow rapid zoom in/out with clustering (causes OOM crashes)
- Use `callout` components on every marker (expensive)

---

## 9. WebSocket/Supabase Realtime

### Battery and Performance Impact

**Connection Lifecycle Management:**
```javascript
import { AppState } from 'react-native';

useEffect(() => {
  const channel = supabase.channel('chat-room');

  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      channel.subscribe();  // Reconnect on foreground
    } else if (state === 'background') {
      channel.unsubscribe(); // Disconnect on background
    }
  });

  channel.subscribe();

  return () => {
    subscription.remove();
    supabase.removeChannel(channel);
  };
}, []);
```

### Reconnection Strategy
Supabase client uses exponential backoff automatically: 1s, 2s, 5s, 10s.

**Heartbeat Monitoring (Critical for Android):**
```javascript
const channel = supabase.channel('chat', {
  config: {
    broadcast: { self: true },
  },
  // Monitor connection health
  heartbeatCallback: (isConnected) => {
    if (!isConnected) {
      // Force reconnect
      channel.subscribe();
    }
  },
});
```

### Battery Optimization Rules
| Practice | Battery Impact |
|----------|---------------|
| WebSocket open in foreground only | Minimal |
| WebSocket open in background | Heavy drain |
| Exponential backoff reconnect | Good |
| Immediate retry loop | Very bad |
| Silent push for updates | Best for background |

**DO:**
- Disconnect WebSocket when app goes to background
- Use exponential backoff (Supabase does this by default)
- Use silent push notifications for background data sync
- Limit channel subscriptions to active screens only

**DON'T:**
- Keep WebSocket connections alive in background
- Retry connection immediately on failure
- Subscribe to channels the user isn't viewing
- Poll for updates when WebSocket is available

---

## 10. AsyncStorage vs MMKV

### Performance Benchmarks

| Operation | AsyncStorage | MMKV | Improvement |
|-----------|-------------|------|-------------|
| Read | 2.548ms | 0.520ms | ~5x faster |
| Write | 2.871ms | 0.570ms | ~5x faster |
| Overall | Baseline | 20-30x faster | Massive |
| API style | Async (Promise) | Synchronous | No await needed |
| Encryption | No | Built-in | Security win |
| Bundle size | ~15KB | ~50KB | Slightly larger |

### Recommendation: Switch to MMKV

```javascript
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV();

// Synchronous reads -- no async/await needed
const token = storage.getString('auth.token');
const onboarded = storage.getBoolean('user.onboarded');

// Synchronous writes
storage.set('auth.token', newToken);
storage.set('user.onboarded', true);

// Use with Zustand persist
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const mmkvStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.delete(name),
};

const useStore = create(
  persist(
    (set) => ({ /* state */ }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => mmkvStorage),
    }
  )
);
```

**Key Advantages for x/pat:**
- Auth tokens read synchronously (no flash of unauthenticated state)
- User preferences load instantly
- Built-in encryption for sensitive data
- Works with Zustand/Redux persist middleware

---

## 11. Battery Optimization

### Android Battery Enforcement (2026)

**Critical**: As of March 2026, Google Play enforces "Excessive Partial Wake Lock" thresholds. Apps exceeding limits may get:
- Warnings on store listing
- Exclusion from discovery/recommendations surfaces

### Best Practices

**Background Task Architecture:**
```javascript
// Use expo-task-manager with WorkManager (Android)
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

TaskManager.defineTask('SYNC_DATA', async () => {
  // Minimal work only
  const changes = await fetchOnlyChanges();
  if (changes.length > 0) {
    await applyChanges(changes);
  }
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// Register with appropriate interval
BackgroundFetch.registerTaskAsync('SYNC_DATA', {
  minimumInterval: 15 * 60,  // 15 min minimum
  stopOnTerminate: false,
  startOnBoot: true,
});
```

**Battery-Friendly Patterns:**
| Pattern | Impact |
|---------|--------|
| Silent push notifications | Best for triggering background sync |
| WorkManager for deferred tasks | Battery-friendly batching |
| Defer network to Wi-Fi | Reduces radio wake-ups |
| Exponential backoff on failures | Prevents drain loops |
| Location updates at low frequency | Major battery saver |

**DON'T:**
- Use wake locks unless absolutely necessary
- Keep GPS at high accuracy continuously
- Run background sync more than every 15 minutes
- Use `setInterval` for background polling

---

## 12. App Size Optimization

### Current Android APK/AAB Strategies

**Enable R8 (Default in RN projects):**
```groovy
// android/app/build.gradle
android {
  buildTypes {
    release {
      minifyEnabled true      // Enable R8
      shrinkResources true    // Remove unused resources
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                    'proguard-rules.pro'
    }
  }
}
```

**Use Android App Bundle (AAB):**
- Device-targeted splits: users download only their architecture's native code
- Typically 20-30% smaller than universal APK
- EAS Build generates AAB by default for Play Store

### Size Reduction Techniques

| Technique | Typical Savings |
|-----------|----------------|
| R8/ProGuard code shrinking | 20-30% of Java/Kotlin |
| Resource shrinking | 5-15% |
| AAB device splits | 20-30% vs universal APK |
| Image compression (WebP) | 25-34% vs PNG |
| Tree-shaking JS bundle | 10-30% |
| Dynamic imports | 30%+ initial load |
| Hermes bytecode | 1-2MB smaller |

**Overall: 40-70% total size reduction possible.**

### Action Items for x/pat
```bash
# Analyze bundle size
npx react-native-bundle-visualizer

# Check APK contents
# Build APK and use Android Studio > Build > Analyze APK
```

**DO:**
- Convert PNG images to WebP
- Use `expo-image` with CDN resizing (don't bundle full-res)
- Remove unused dependencies (`npx depcheck`)
- Enable Hermes (bytecode is smaller than raw JS)

**DON'T:**
- Bundle large assets (maps tiles, city images) in the APK
- Include debug-only dependencies in release
- Skip `shrinkResources` -- it finds unused drawables/layouts

---

## 13. React Navigation Performance

### Screen Transition Optimization

**Use Native Stack Navigator:**
```javascript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Native stack uses Android Fragment transitions (faster)
// vs JS-based stack that animates via Animated API
const Stack = createNativeStackNavigator();
```

**Enable Screen Freezing:**
```javascript
import { enableFreeze } from 'react-native-screens';

// Call at app initialization
enableFreeze(true);

// Freezes inactive screens -- prevents re-renders
// Saves CPU and memory on background screens
```

**Detach Inactive Screens:**
```javascript
<Stack.Navigator
  screenOptions={{
    detachInactiveScreens: true,  // Free memory for off-screen screens
  }}
>
```

### Memory Optimization
| Technique | Memory Savings | Tradeoff |
|-----------|---------------|----------|
| `enableFreeze(true)` | 15-30% CPU reduction | None (state preserved) |
| `detachInactiveScreens` | Significant memory reduction | Slight re-mount delay |
| Native Stack Navigator | Lower overhead than JS stack | Less customizable transitions |
| Minimize nested navigators | Reduces RAM accumulation | Architecture simplification needed |

### Android-Specific Issues
- Slow back animation with many views on the previous screen
- Fix: Use `enableFreeze(true)` to prevent rendering of hidden screens
- Heavy FlatList screens cause transition jank -- prefetch data before navigation

**DO:**
- Use `createNativeStackNavigator` everywhere possible
- Enable `enableFreeze(true)` at app startup
- Lazy-load screen components with `React.lazy()`
- Minimize navigator nesting depth

**DON'T:**
- Use JS-based `createStackNavigator` (much slower on Android)
- Keep all screens mounted with deep nested navigators
- Load heavy data in `useEffect` without screen focus check

---

## 14. Keyboard Handling

### The Problem on Android
Android's `windowSoftInputMode` and React Native's `KeyboardAvoidingView` often conflict, producing inconsistent behavior across devices.

### Recommended Solution: react-native-keyboard-controller

```javascript
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

// Drop-in replacement with consistent behavior
<KeyboardAvoidingView
  behavior="padding"  // Works identically on iOS and Android
  style={{ flex: 1 }}
>
  <ChatMessages />
  <ChatInput />
</KeyboardAvoidingView>
```

**Why Not Built-in KeyboardAvoidingView:**
- `behavior="padding"` works on iOS but inconsistently on Android
- `behavior="height"` works with `adjustResize` on Android but not iOS
- Platform-specific code is fragile and device-dependent

### Android Configuration
```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<activity
  android:windowSoftInputMode="adjustResize"
  ...
/>
```

### react-native-keyboard-controller Advantages
- Consistent behavior on both platforms
- Smooth animations that match native keyboard timing
- `KeyboardAwareScrollView` for chat-like interfaces
- `KeyboardChatScrollView` (new in v1.21.0) specifically for chat UIs
- Fixes layout thrashing during keyboard animations

**For x/pat chat feature:** Use `KeyboardChatScrollView` from react-native-keyboard-controller v1.21.0+ -- built specifically for chat interfaces.

---

## 15. ScrollView/FlatList Momentum Scrolling

### iOS vs Android Differences

| Behavior | iOS | Android |
|----------|-----|---------|
| `onMomentumScrollEnd` trigger | Only on flick-release | Flick-release AND scroll-hold-release |
| Nested ScrollView | Automatic | Requires `nestedScrollEnabled={true}` |
| Bounce effect | Native elastic | No bounce (use `overScrollMode`) |
| Scroll indicator | Native | Native (different style) |
| Deceleration | Configurable | Different default feel |

### Fixing Cross-Platform Inconsistencies

```javascript
// Handle momentum scroll end consistently
const handleScrollEnd = useCallback((event) => {
  // On Android, this fires more liberally than iOS
  // Add debounce or check velocity
  const { velocity } = event.nativeEvent;
  if (Platform.OS === 'android' && (!velocity || velocity.y === 0)) {
    return; // Skip non-momentum scroll ends on Android
  }
  // Handle actual momentum end
  onScrollComplete();
}, []);

<FlatList
  onMomentumScrollEnd={handleScrollEnd}
  nestedScrollEnabled={Platform.OS === 'android'}  // Required for Android
  overScrollMode="never"  // Disable Android overscroll glow
/>
```

**DO:**
- Always set `nestedScrollEnabled={true}` for nested scrolls on Android
- Test scroll behavior on both platforms
- Use `decelerationRate` to match feel between platforms

**DON'T:**
- Rely on `onMomentumScrollEnd` for critical logic without platform checks
- Nest multiple FlatLists without configuration
- Assume identical scroll physics between platforms

---

## 16. Touch/Gesture Response Time

### Performance Architecture

**react-native-gesture-handler** processes touch recognition natively:
- Immediate ripple effects on Android (no JS roundtrip)
- Up to 120fps gesture tracking with Reanimated integration
- Worklets execute on UI thread, eliminating bridge delays

### Best Practices
```javascript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';

// UI-thread gesture handling (no JS thread involvement)
const panGesture = Gesture.Pan()
  .onUpdate((event) => {
    // Runs on UI thread via worklet
    translateX.value = event.translationX;
  })
  .onEnd(() => {
    translateX.value = withSpring(0);
  });

<GestureDetector gesture={panGesture}>
  <Animated.View style={animatedStyle} />
</GestureDetector>
```

**DO:**
- Use Gesture Handler v2 API (`Gesture.Pan()`, etc.)
- Process gestures in worklets (UI thread)
- Use `Gesture.Simultaneous()` for complex multi-touch
- Prefer `Pressable` over `TouchableOpacity` for simple taps

**DON'T:**
- Use the old `PanGestureHandler` component API
- Process gesture logic on JS thread
- Use `TouchableNativeFeedback` directly (slower than Gesture Handler)
- Chain multiple gesture recognizers without composition

---

## 17. Network Request Performance

### fetch vs axios on Android

| Feature | fetch | axios |
|---------|-------|-------|
| Bundle size | 0KB (built-in) | 25-30KB |
| JSON parsing | Manual | Automatic |
| Interceptors | No | Yes |
| Request cancellation | AbortController | CancelToken / AbortController |
| Timeout | Manual | Built-in |
| Connection pooling | Via OkHttp | Via OkHttp |

**Both use OkHttp on Android** -- the networking performance is identical at the transport layer.

### OkHttp Connection Pooling
React Native Android uses a single OkHttpClient with default connection pooling:
- 5 idle connections
- 5-minute keepalive
- HTTP/2 multiplexing for same-host requests

**Custom Pool Configuration:**
```java
// android/app/src/main/java/com/xpat/OkHttpClientFactory.java
// For advanced tuning (not usually needed)
OkHttpClient client = new OkHttpClient.Builder()
    .connectionPool(new ConnectionPool(10, 5, TimeUnit.MINUTES))
    .build();
```

### Recommendation for x/pat
```javascript
// Use fetch for Supabase (already built-in to supabase-js)
// Use axios only if you need interceptors for non-Supabase APIs

// Optimal request pattern
const fetchSpots = async (signal) => {
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .abortSignal(signal);  // Cancellable
  return data;
};
```

**DO:**
- Use `AbortController` for cancellable requests
- Batch API calls when possible
- Cache responses locally (MMKV for small data, SQLite for large)
- Use Supabase's built-in fetch (already optimized)

**DON'T:**
- Add axios just for simple GET/POST (fetch is sufficient)
- Make redundant API calls on every screen focus
- Skip error handling and retry logic

---

## 18. SQLite/Local Database Options

### Performance Comparison on Android

| Library | Architecture | Read Speed | Write Speed | Expo Support |
|---------|-------------|------------|-------------|--------------|
| expo-sqlite | Bridge/JSI hybrid | Good | Good | Native |
| op-sqlite | JSI (C++) | Fastest | Fastest | Config plugin |
| react-native-quick-sqlite | JSI (C++) | Fast | Fast | Bare RN only |
| WatermelonDB | JSI + SQLite | Fast | Fast | Config plugin |
| RxDB (expo-opfs) | OPFS bypass | Very fast | Very fast | Native |

### Recommendation for x/pat: expo-sqlite

For Expo-managed projects, expo-sqlite is the pragmatic choice:
```javascript
import * as SQLite from 'expo-sqlite';

const db = await SQLite.openDatabaseAsync('xpat.db');

// Create offline cache table
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS spots_cache (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at INTEGER
  )
`);

// Batch insert for seed data
await db.withTransactionAsync(async () => {
  for (const spot of spots) {
    await db.runAsync(
      'INSERT OR REPLACE INTO spots_cache (id, data, updated_at) VALUES (?, ?, ?)',
      [spot.id, JSON.stringify(spot), Date.now()]
    );
  }
});
```

### When to Upgrade to op-sqlite
- If offline-first caching becomes performance-critical
- If handling 10,000+ records locally
- If doing complex joins/aggregations on device
- JSI acceleration: 1.1x to 6x faster for large datasets

---

## 19. Garbage Collection Impact on Animations

### How GC Causes Jank
1. Hermes GC runs on the JS thread
2. During GC, JS thread pauses (typically 5-50ms)
3. If animation logic runs on JS thread, frames are dropped
4. On Android, GC is more aggressive with lower RAM

### Hermes V1 GC Improvements
- Generational GC: short-lived objects collected cheaply
- 25% reduction in memory footprint in long sessions
- 50-70% reduction in GC frequency with proper patterns

### How to Avoid GC-Induced Jank

**1. Run Animations on UI Thread (Reanimated Worklets)**
```javascript
// GC-proof: runs on UI thread, not JS thread
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: withSpring(offset.value) }],
}));
```

**2. Reduce Object Allocation**
```javascript
// BAD: Creates new object every render
const style = { transform: [{ translateY: offset }] };

// GOOD: Memoize or use SharedValue
const style = useMemo(() => ({
  transform: [{ translateY: offset }],
}), [offset]);
```

**3. Object Pooling for Frequent Allocations**
```javascript
// Reuse objects instead of creating new ones
const pool = [];
function getObject() {
  return pool.pop() || {};
}
function returnObject(obj) {
  Object.keys(obj).forEach(k => delete obj[k]);
  pool.push(obj);
}
```

**4. Use WeakMap for Temporary References**
```javascript
const cache = new WeakMap();
// Objects are GC'd when no longer referenced elsewhere
```

### Fabric Renderer Impact
- Concurrent rendering: 55-60fps vs legacy 30-45fps
- Eliminates jank during API calls and scrolling
- GC pauses on JS thread don't block UI thread rendering

---

## 20. Bridge vs JSI Performance

### The Transition (Complete as of 2026)

**Old Bridge (Deprecated):**
- Async, batched, serialized JSON messages
- Every JS-Native call: serialize -> queue -> deserialize
- ~2GB/s data throughput limit (VisionCamera example)

**JSI (Current Default):**
- Synchronous C++ bindings
- Direct memory references (no serialization)
- 30-50% faster execution across the board
- Handles 2GB/s+ data throughput easily

### Impact on x/pat Features

| Feature | Bridge Impact | JSI Impact |
|---------|--------------|------------|
| Map marker updates | Delayed, batched | Instant |
| Chat message rendering | Async lag | Synchronous |
| Image list scrolling | White flash | Smooth |
| Gesture animations | Frame drops | 60fps |
| Storage reads (MMKV) | Async/await | Synchronous |

### Ensuring JSI Usage
```javascript
// Libraries that use JSI (prefer these):
// - react-native-mmkv (storage)
// - react-native-reanimated (animations)
// - react-native-gesture-handler (touch)
// - op-sqlite / expo-sqlite (database)
// - react-native-skia (graphics)

// Libraries still on bridge (acceptable, less critical):
// - Most Expo SDK modules (gradually migrating)
// - Some community libraries (check their docs)
```

---

## 21. Expo SDK 55 Android Issues

### Release Info
- **Released**: February 25, 2026
- **React Native**: 0.83
- **Hermes**: V1 (via RN 0.83, default in RN 0.84)
- **New Architecture**: Enabled by default

### Known Android Issues

**1. Edge-to-Edge Deprecation Warning**
- Default template shows `STATUS_BAR_PLUGIN` deprecation warning on prebuild
- Related to Android 15+ edge-to-edge enforcement
- Fix: Update expo-status-bar configuration

**2. expo-dev-client Navigation Freeze**
- Installing expo-dev-client can cause freezes on `fullScreenModal` goBack
- Affects development only, not production builds

**3. Jetpack Compose API (Beta)**
- Expo promoted Jetpack Compose API from alpha to beta
- Enables modern Android UI components within Expo

### Performance Features
- **EAS Build Caching**: Up to 30% faster subsequent builds
- **React Native 0.83**: Includes JSI improvements, Fabric stability fixes
- **New Architecture by default**: All SDK 55 apps use Fabric + TurboModules

### Migration Notes for x/pat
- Review all native modules for New Architecture compatibility
- Test edge-to-edge rendering on Android 15+ devices
- Update ProGuard rules if upgrading from SDK 53/54

---

## 22. Android 14/15/16 Optimizations

### Critical: 16KB Page Size (Android 15+)

**Timeline:**
- Nov 1, 2025: Apps targeting API 35 must support 16KB pages
- May 1, 2026: Non-compliant updates blocked on Play Store

**React Native Core is compliant**, but verify third-party native libraries:
```bash
# Check native library alignment
# Use APK Analyzer in Android Studio
# Look for .so files not aligned to 16KB
```

### Android 15 (API 35): Edge-to-Edge Enforcement
- Apps can no longer opt out of edge-to-edge display
- Content renders behind system bars by default

```javascript
// Handle edge-to-edge in Expo
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const insets = useSafeAreaInsets();
// Apply insets to your layout
```

### Android 16 (API 36): Additional Changes
- Edge-to-edge opt-out completely removed
- Gradle property: `edgeToEdgeEnabled` (React Native 0.81+)

### React Native Version Alignment
| Android Version | Minimum RN Version | Key Change |
|----------------|-------------------|------------|
| Android 14 (API 34) | RN 0.73+ | Foreground service types required |
| Android 15 (API 35) | RN 0.76+ | 16KB page size, edge-to-edge |
| Android 16 (API 36) | RN 0.81+ | Edge-to-edge mandatory |

---

## 23. Low-End Device Optimization

### Target Benchmarks (Moto G-class, 2-3GB RAM)
| Metric | SLO Target |
|--------|-----------|
| Time to Interactive | <2 seconds |
| Frame rate on critical screens | >55 fps |
| Steady-state memory | <150 MB |
| APK size | <30 MB |

### Optimization Checklist

**1. Reduce Memory Footprint**
```javascript
// FlatList optimization for low-end devices
<FlashList
  data={spots}
  renderItem={renderSpot}
  estimatedItemSize={200}
  initialNumToRender={5}        // Fewer initial items
  maxToRenderPerBatch={3}       // Smaller batches
  windowSize={5}                // Smaller window
  removeClippedSubviews={true}  // Remove off-screen views
/>
```

**2. Image Optimization**
```javascript
// Load smaller images on low-end devices
const imageSize = isLowEnd ? 'thumbnail' : 'medium';
const imageUrl = `${baseUrl}/${spotId}/${imageSize}.webp`;
```

**3. Animation Reduction**
```javascript
// Detect low-end device
import { Platform } from 'react-native';

const isLowEnd = Platform.OS === 'android' &&
  // Check available RAM or use device detection
  totalMemory < 3 * 1024 * 1024 * 1024; // 3GB

// Reduce animations
const animationDuration = isLowEnd ? 150 : 300;
const enableParallax = !isLowEnd;
```

**4. Navigation**
- Minimize nested navigator depth
- Use `enableFreeze(true)` (critical on low RAM)
- `detachInactiveScreens={true}` frees memory aggressively

**5. ProGuard/R8**
- 20-30% APK reduction improves install rate
- Smaller code = less memory at runtime

### Device Detection
```javascript
// expo-device for basic info
import * as Device from 'expo-device';

const totalMemory = Device.totalMemory; // bytes
const isLowEnd = totalMemory && totalMemory < 3 * 1024 * 1024 * 1024;
```

---

## 24. Thermal Throttling

### Impact on React Native
When Android devices overheat:
1. CPU frequency is reduced (by OS)
2. JS thread execution slows down
3. Animations drop frames
4. Network requests timeout more frequently

### Detection via Thermal API
```java
// Android native -- PowerManager thermal listener
// Can be exposed to RN via native module
PowerManager pm = getSystemService(PowerManager.class);
pm.addThermalStatusListener(status -> {
  // THERMAL_STATUS_NONE, LIGHT, MODERATE, SEVERE, CRITICAL, EMERGENCY
  // Send to JS layer to adjust behavior
});
```

### Mitigation Strategies

| Thermal Level | Action |
|--------------|--------|
| None/Light | Full performance |
| Moderate | Reduce animation complexity, lower image quality |
| Severe | Disable non-essential animations, defer background work |
| Critical | Minimal UI only, stop all background processing |

### Common Heat Sources in x/pat
- **Maps rendering** with many markers (GPU intensive)
- **Continuous location tracking** (GPS radio)
- **Real-time chat** with frequent WebSocket activity
- **Image processing** (decoding large images)
- **Complex animations** (parallax, transitions)

**DO:**
- Monitor thermal status and adjust accordingly
- Batch operations instead of continuous processing
- Use efficient image formats (WebP) and sizes
- Limit map marker updates during thermal stress

**DON'T:**
- Run ML models continuously
- Process full-resolution images on-device
- Keep GPS at high accuracy when not needed
- Ignore thermal warnings from the OS

---

## 25. ProGuard/R8 Rules

### R8 is the Default (ProGuard is Deprecated)
Setting `enableProguardInReleaseBuilds = true` in `build.gradle` actually enables R8.

### Essential Rules for React Native

```proguard
# android/app/proguard-rules.pro

# React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# TurboModules (New Architecture)
-keep class com.facebook.react.turbomodule.** { *; }

# Reanimated
-keep class com.swmansion.reanimated.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# Expo modules
-keep class expo.modules.** { *; }

# OkHttp (networking)
-dontwarn okhttp3.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Supabase/WebSocket
-keep class io.crossbar.** { *; }
-keep class org.java_websocket.** { *; }

# react-native-maps
-keep class com.google.android.gms.maps.** { *; }
-keep class com.airbnb.android.react.maps.** { *; }

# MMKV
-keep class com.tencent.mmkv.** { *; }

# Keep annotation-based classes
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# Hermes bytecode
-keep class com.facebook.hermes.unicode.** { *; }
```

### Build Configuration
```groovy
// android/app/build.gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                          'proguard-rules.pro'
        }
    }
}
```

### What R8 Does
| Operation | Effect | Size Impact |
|-----------|--------|-------------|
| Code shrinking | Removes unused classes/methods | 20-30% reduction |
| Obfuscation | Renames classes to short names | Minor reduction |
| Optimization | Inlines methods, removes dead code | 5-10% reduction |
| Resource shrinking | Removes unused resources | 5-15% reduction |

### Debugging R8 Issues
```bash
# If app crashes after R8, check for missing keep rules
# Run with mapping file to decode stack traces
adb logcat | grep -i "classnotfound\|nosuchmethod"

# Keep mapping file for crash reporting
# Upload to Firebase Crashlytics / Sentry
```

**DO:**
- Keep rules as narrow as possible (don't `-keep class ** { *; }`)
- Test release builds thoroughly (R8 can break reflection)
- Upload mapping files to crash reporting service
- Review rules when adding new native libraries

**DON'T:**
- Disable R8 entirely (massive size savings lost)
- Use overly broad keep rules
- Forget to test release builds before submission
- Skip mapping file upload for crash reporting

---

## Performance Profiling Tools Summary (2026)

| Tool | Purpose | Replaces |
|------|---------|----------|
| React Native DevTools | JS debugging, component profiling | Flipper |
| Chrome DevTools (CDP) | Performance tab, JS/UI thread analysis | Chrome debugger |
| Android Studio Profiler | Memory, CPU, network, energy | Standalone Android tools |
| Rozenite | Performance metrics dashboard | Flipper plugins |
| Reactotron | Network inspection, state debugging | Flipper |
| `react-native-performance` | TTI, custom marks/measures | Custom timing |
| LeakCanary | Android memory leak detection | Manual heap analysis |
| `react-native-bundle-visualizer` | Bundle size analysis | Manual inspection |

---

## Priority Action Items for x/pat

### High Priority (Do Now)
1. **Switch to MMKV** for auth tokens and preferences (5x faster reads)
2. **Switch FlatList to FlashList** on feed/explore screens
3. **Add marker clustering** for 431+ spot markers (react-native-clusterer)
4. **Enable `enableFreeze(true)`** at app startup
5. **Add `inlineRequires: true`** to Metro config

### Medium Priority (Next Sprint)
6. **Add react-native-keyboard-controller** for chat screen
7. **Implement AppState-based WebSocket management** (disconnect on background)
8. **Optimize images**: expo-image with blurhash placeholders
9. **Audit bundle size** with react-native-bundle-visualizer
10. **Test on low-end Android** (Moto G-class, set SLO targets)

### Low Priority (Ongoing)
11. Review ProGuard/R8 rules for all native modules
12. Monitor Reanimated 4 feature flag fixes as they release
13. Prepare for Android 16 edge-to-edge enforcement
14. Set up Rozenite for continuous performance monitoring
15. Implement thermal throttling detection for map/animation-heavy screens
