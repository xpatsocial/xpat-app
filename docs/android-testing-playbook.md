# x/pat Android Testing Playbook

> Comprehensive guide to catch every Android-specific issue before burning EAS builds.
> Based on: React Native 0.83.4, Expo SDK 55, react-native-maps 1.27.2, react-native-reanimated 4.2.1

---

## 1. CRITICAL ISSUES (Will Definitely Break)

### 1.1 FormSheet Presentation on Android

**Problem:** The `SpotDetail` screen uses `presentation: 'formSheet'` with `sheetAllowedDetents`, `sheetGrabberVisible`, and `sheetCornerRadius`. These are iOS-native sheet APIs. On Android with react-native-screens ~4.23.0, formSheet is supported but has significant differences:

- **Keyboard overlap**: When inputs exist inside a formSheet with `sheetAllowedDetents`, the keyboard opens OVER the input on Android (the sheet does not resize to accommodate)
- **Dynamic height**: `fitToContents` does not update dynamically when content changes on Android
- **No native header**: Headers do not render when using `formSheet` on Android
- **Navigation blocking**: Navigating between stacks nested inside a formSheet can silently fail on Android

**Current code (AppNavigator.tsx line 109-115):**
```tsx
name="SpotDetail"
options={{
  presentation: 'formSheet',
  sheetAllowedDetents: [0.75, 1.0],
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
}}
```

**Fix:** Test on Android and consider using `presentation: 'modal'` with a custom bottom-sheet-like UI for Android, or wrap in a Platform.select for the options.

### 1.2 BlurView Without Android Fallbacks

**Problem:** The app uses `BlurView` from `expo-blur` in 15+ components, but ONLY GlassTabBar has an Android fallback. All other BlurView usages render directly on both platforms. On Android SDK < 31 (Android 12), BlurView uses the slower RenderScript API, causing severe performance degradation. On very old devices, it may render as fully transparent or opaque.

**Affected components (no Android fallback):**
- AffiliateCard
- CityWelcomeCard
- CityPresenceBadge
- NeighborhoodPulseSheet
- NeighborhoodPulseCard
- GDPRConsent (critical -- first screen users see)
- PresenceCard
- SearchBar
- ReportModal
- SpotBottomSheet
- OnboardingScreen (3 BlurView instances)
- ExploreScreen (5 BlurView instances -- header, count badge, hint, location)

**Fix options:**
1. Add `Platform.OS` checks with solid-color fallback (like GlassTabBar already does)
2. Use `blurMethod: 'dimezisBlurViewSdk31Plus'` to gracefully degrade on older Android
3. Test on a real Android 9-10 device to see actual rendering

### 1.3 Apple Sign-In on Android

**Problem:** AuthScreen.tsx line 244 gates Apple Sign-In with `Platform.OS === 'ios'`. On Android, users only see email/password fields. There is no Google Sign-In alternative.

**Current behavior on Android:** Users land on AuthScreen and see only:
- Email field
- Password field
- Sign In / Sign Up toggle

No social login option exists for Android users.

**Fix:** Add Google Sign-In for Android using `@react-native-google-signin/google-signin` + Supabase `signInWithIdToken`. Requires:
1. Google Cloud Console OAuth client IDs (web + Android)
2. SHA-1 fingerprint from your EAS keystore
3. Supabase Dashboard: enable Google provider with web client ID
4. The `useAuth` hook needs a `signInWithGoogle` method

---

## 2. HIGH-PRIORITY ISSUES

### 2.1 Navigation & Back Button

**Hardware back button behavior:**
- Android hardware back button triggers `navigation.goBack()` automatically via react-navigation
- On modal screens (Auth, Onboarding, AddSpot, CreateEvent, Privacy, Terms), back button should dismiss
- On tab screens, back button should NOT exit the app -- needs `BackHandler` logic to either go to first tab or show exit confirmation
- On formSheet (SpotDetail), hardware back should dismiss the sheet

**Current risk:** No `BackHandler` customization detected in the codebase. Default behavior:
- From Home tab: back button will exit the app (bad UX)
- From Discover/Profile tab: back button navigates to Home (correct via tab history)

**Fix:** Add `BackHandler` in main tabs to either double-press-to-exit or prevent exit from Home tab.

### 2.2 Google Maps Dark Mode

**Status:** Already handled. ExploreScreen.tsx and AddSpotScreen.tsx use `customMapStyle` with `mapDarkStyle` on Android, using Google Maps Styling API JSON. iOS uses `userInterfaceStyle="dark"` which works with Apple Maps natively.

**Known issue:** Google Maps on Android can override the custom style and match the system dark/light mode setting, especially on newer Google Maps SDK versions. This means users with light system theme might see a flash of light map before the custom style loads.

**Fix:** Test with both system-wide dark mode on and off on Android. If the system override is happening, consider using `googleMapId` with a cloud-based map style instead of `customMapStyle`.

### 2.3 Reanimated 4.2.1 Performance on Android

**Known issues with Reanimated 4.x on Android:**
- Performance degradation after New Architecture migration -- animations stutter
- FPS drops scale with number of mounted screens (more tabs open = slower animations)
- Upgrading from v3 to v4 has caused complete UI freezes for some apps
- Occasional crashes when entering/exiting animations

**x/pat components using Reanimated:**
- GlassTabBar (indicator + tab scale/opacity animations)
- SwipeCardDeck (gesture-driven card swiping with spring physics)
- AnimatedPressable (press feedback)
- SwipeableRow (swipe-to-delete)

**Mitigation:**
1. Ensure React Native 0.83.4 includes the `preventShadowTreeCommitExhaustion` fix
2. Test SwipeCardDeck specifically on a mid-range Android device -- gesture + spring + rotation is the heaviest animation pattern
3. Monitor FPS with React DevTools profiler on Android
4. If janky, consider reducing `stackSize` on SwipeCardDeck and simplifying animation interpolations

### 2.4 Notification Channels

**Status:** Partially handled. `notifications.ts` creates a single `default` channel with HIGH importance.

**Missing:**
- Only one channel (`default`) is created -- Android 8+ best practice is to create separate channels for different notification types (messages, events, nearby nomads, connection requests) so users can individually control them
- No notification icon specified as monochrome in app.json plugins -- the current config uses `"icon": "./assets/icon.png"` which must be a white silhouette on transparent background. If the icon has colors, it will render as a solid white square on Android
- No color tint specified for the notification icon (though `"color": "#2EC4A0"` is set, which is correct)

**Fix:**
1. Verify `assets/icon.png` is a monochrome white-on-transparent PNG for notification use, or create a separate `notification-icon.png`
2. Add multiple notification channels:
```ts
await Notifications.setNotificationChannelAsync('messages', {
  name: 'Messages',
  importance: Notifications.AndroidImportance.HIGH,
});
await Notifications.setNotificationChannelAsync('events', {
  name: 'Events & Community',
  importance: Notifications.AndroidImportance.DEFAULT,
});
await Notifications.setNotificationChannelAsync('connections', {
  name: 'Connection Requests',
  importance: Notifications.AndroidImportance.HIGH,
});
```

### 2.5 KeyboardAvoidingView Behavior

**Problem:** The app uses `KeyboardAvoidingView` in 7 screens with different `behavior` settings:

| Screen | iOS behavior | Android behavior |
|--------|-------------|-----------------|
| AuthScreen | `'padding'` | `'height'` |
| AddSpotScreen | `'padding'` | `'height'` |
| CreateEventScreen | `'padding'` | `'height'` |
| OnboardingScreen | `'padding'` | `'height'` |
| AskAIScreen | `'padding'` | `undefined` |
| DirectMessageScreen | `'padding'` | `undefined` |
| SpotDetailScreen | `'padding'` | `undefined` |
| FeedbackSheet | `'padding'` | `undefined` |
| ChatTab | `'padding'` | `undefined` |

**Known issue:** On Android 15 (targetSdk 35), `KeyboardAvoidingView` can fail entirely, causing inputs to hide behind the keyboard. Additionally, `behavior='height'` on Android sometimes leaves extra bottom padding after the keyboard closes.

**Fix:** Test every text input on Android. Consider using `react-native-keyboard-controller` as a more reliable alternative, or set `android:windowSoftInputMode="adjustResize"` in AndroidManifest.xml (Expo handles this via plugins).

---

## 3. MEDIUM-PRIORITY ISSUES

### 3.1 Font Rendering

**Fonts used:** DM Serif Display (heading), Space Mono Regular & Bold (body)

**Android-specific risks:**
- Custom fonts on nested `<Text>` elements may not apply on Android -- the inner text falls back to Roboto
- DM Serif Display has been reported as unreliable with expo-font config plugin
- Font loading via `useFonts` (runtime loading) is used -- this works but is slower than build-time embedding via config plugin
- Android uses font file name (without extension) as the font family name, while iOS reads the internal font name

**Current font loading (App.tsx line 41-45):** Uses `useFonts` hook -- runtime loading approach, which works but adds to cold start time.

**Fix:** Test all text rendering on Android, especially:
- Brand text on AuthScreen (nested `<Text>` with different colors/fonts)
- Tab labels in GlassTabBar
- Any bold text in body copy
- Consider switching to expo-font config plugin for build-time embedding

### 3.2 Shadow Rendering

**Problem:** iOS uses `shadow*` properties. Android uses `elevation`. The theme file (theme/index.ts) includes `elevation` values alongside shadow properties, which is good. However:

- Shadow color is not supported on Android (elevation produces a standard gray shadow)
- The `glow` effect (`shadowColor: color, shadowRadius: 12, elevation: 6`) will NOT produce a colored glow on Android -- it will be a standard gray elevation shadow
- The teal glow dot on GlassTabBar will not glow on Android

**Affected components:**
- GlassTabBar glow dot (colored shadow effect)
- Any component using `shadows.glow(color)`
- SpotCard, EventCard, etc. if they use colored shadows

**Fix:** Accept that elevation shadows are gray on Android, or add Android-specific alternatives (e.g., a colored border or gradient overlay to simulate glow).

### 3.3 Haptics

**Status:** expo-haptics is used in 23 files across the app. On Android, haptics work but:
- Feedback patterns differ from iOS (Android vibration motor vs iOS Taptic Engine)
- Some Android devices have weak or no haptic motors
- `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` may feel identical to `Medium` on some devices

**Fix:** No code change needed, but be aware that the haptic experience will feel different on Android. Consider reducing haptic frequency if it feels jarring on Android.

### 3.4 Status Bar & Notch/Cutout Handling

**Current setup:** `<StatusBar style="light" />` from expo-status-bar in App.tsx. Safe areas handled via `react-native-safe-area-context`.

**Android-specific concerns:**
- Punch-hole cameras (Samsung S series, Pixel) create asymmetric safe areas
- Some Android devices have bottom navigation bars that overlap with the GlassTabBar's `paddingBottom: Math.max(insets.bottom, 12)`
- Android 3-button navigation vs gesture navigation gives different bottom insets
- The ExploreScreen header uses `paddingTop: Platform.OS === 'ios' ? 54 : 40` -- this hardcoded 40px may not be enough on some Android devices with tall status bars

**Fix:** Replace hardcoded `paddingTop: 40` values with `insets.top + offset` everywhere. The ExploreScreen header already does this in some places (`paddingTop: insets.top + 8`) but inconsistently.

### 3.5 Image Loading & Caching

**Status:** The app uses React Native's `<Image>` component (no expo-image or FastImage).

**Android differences:**
- Default image caching on Android is less aggressive than iOS
- Large images in FlatList/ScrollView can cause OutOfMemoryError on low-RAM Android devices
- No progressive loading (images pop in rather than fade)

**Fix:** Consider migrating to `expo-image` for better caching and performance, especially for spot photos and user avatars.

### 3.6 ScrollView/FlatList Performance

**Optimization checklist for Android:**
- Use `removeClippedSubviews={true}` on large lists (FeedScreen, community tabs)
- Set `windowSize` to 5-10 instead of default 21
- Use stable `keyExtractor` with database IDs, not array indices
- Set `initialNumToRender` to match visible items count
- Enable `nestedScrollEnabled` for any FlatList inside ScrollView

### 3.7 LayoutAnimation on Android

**Status:** ProfileScreen and NomadToolkitScreen use `UIManager.setLayoutAnimationEnabledExperimental(true)` which is correct for Android. However, LayoutAnimation on Android is experimental and can cause crashes or visual glitches with complex layouts.

**Fix:** Test expand/collapse animations in NomadToolkitScreen on Android. If issues arise, replace with Reanimated-based height animations.

---

## 4. LOWER-PRIORITY ISSUES

### 4.1 Gesture Handling

- iOS swipe-to-go-back gesture works natively; Android does not have this gesture (uses hardware back button instead)
- `gestureEnabled: true` on stack screens affects iOS only
- SwipeCardDeck uses `react-native-gesture-handler` which works on both platforms, but test gesture responsiveness on Android

### 4.2 DateTimePicker

**SettingsScreen** uses `@react-native-community/datetimepicker` with `display` set to `'spinner'` on iOS and `'default'` on Android. The Android default shows a calendar dialog. This is acceptable but the UX is very different from iOS.

### 4.3 Deep Linking / Intent Filters

**Status:** app.json has `intentFilters` configured for Android with autoVerify for xpat.social links. Ensure the `.well-known/assetlinks.json` file is deployed to xpat.social for Android App Links verification. Without it, links will show a disambiguation dialog instead of opening directly.

### 4.4 Splash Screen

**Status:** Same splash config for both platforms. Android may show a brief white flash before the dark splash on some devices. Consider adding `android.splash` config in app.json with explicit dark background.

### 4.5 Google Maps API Key Exposure

**Note:** The Google Maps API key is hardcoded in app.json (`AIzaSyD-c7Zkn2AffwCtFOu9UW8covVAumM-h1c`). Restrict this key in Google Cloud Console to:
- Android apps with your package name (`com.aycholdings.xpat`) and SHA-1
- Maps SDK for Android only

---

## 5. PERMISSIONS CHECKLIST

### Photo/Media Permissions (Android 13+)

**Google Play Policy (enforced 2025):** Apps with one-time or infrequent photo access should use the system photo picker instead of requesting `READ_MEDIA_IMAGES`. Since x/pat only needs photos for:
- Profile picture upload
- Spot photo upload

These are infrequent uses. `expo-image-picker` should use the system picker approach automatically on newer SDK versions, but verify it does not request `READ_MEDIA_IMAGES` in the manifest.

**Action:** After building for Android, check `AndroidManifest.xml` for `READ_MEDIA_IMAGES` -- if present, may cause Google Play rejection.

### Location Permissions

**Current setup:** `expo-location` with `NSLocationWhenInUseUsageDescription` (iOS). Android equivalent permissions are auto-added.

**Android flow:**
1. `ACCESS_FINE_LOCATION` -- foreground only (sufficient for x/pat)
2. `ACCESS_BACKGROUND_LOCATION` -- NOT needed (x/pat only uses location while open)
3. On Android 11+, background location opens system settings instead of a dialog

**Action:** Verify the app does NOT request `ACCESS_BACKGROUND_LOCATION` as it would trigger Google Play review.

### Camera Permission

**Status:** Camera permission description set for iOS. Android auto-adds `CAMERA` permission via expo-image-picker.

---

## 6. PERFORMANCE OPTIMIZATION

### 6.1 Hermes Engine

**Status:** Hermes is enabled by default in Expo SDK 55 / RN 0.83.4. Benefits:
- 30-50% faster cold start on Android
- Bytecode precompilation (no JS parsing at runtime)
- Lower memory usage

**Action:** Confirm Hermes is enabled in the EAS build output. No code changes needed.

### 6.2 Bundle Size

**Impact:** Android APK/AAB includes Google Maps SDK which adds ~5-8MB. Total bundle should be checked after first Android build.

**Optimization:**
- Enable Proguard/R8 minification (Expo handles this for production builds)
- Remove any unused dependencies
- Monitor JS bundle size with `npx expo export --dump-sourcemap`

### 6.3 Cold Start Time

**Target:** < 3 seconds on a mid-range Android device (e.g., Samsung Galaxy A54).

**Current potential bottlenecks:**
- Font loading via `useFonts` (runtime) adds 200-500ms
- AsyncStorage reads for GDPR consent on startup
- Supabase client initialization

**Optimization:** Consider switching to expo-font config plugin for build-time font embedding.

### 6.4 Memory on Low-End Devices

**Risk areas:**
- Map with 431+ spot markers (clustering mitigates this)
- BlurView on Android SDK < 31 (uses expensive RenderScript)
- Multiple BlurView instances stacked (ExploreScreen has 5)
- SwipeCardDeck holding 3-5 card views with images

**Target:** Keep memory under 200MB on a 3GB RAM device.

---

## 7. DEVICE FRAGMENTATION

### Minimum Support

- **Target SDK:** 35 (Android 15) -- EAS default for Expo SDK 55
- **Min SDK:** 24 (Android 7.0) -- Expo SDK 55 minimum
- **Most common:** Android 12-14 on Samsung/Pixel/Xiaomi

### Test Matrix (Priority Order)

| Device Category | Example | Priority | Key Tests |
|----------------|---------|----------|-----------|
| Modern flagship | Pixel 8/Samsung S24 | P0 | Full flow, gesture nav |
| Mid-range 2023+ | Samsung A54, Pixel 7a | P0 | Performance, memory |
| Budget phone | Samsung A14, Redmi Note 12 | P1 | Cold start, blur, maps |
| Older flagship | Samsung S21, Pixel 6 | P1 | Compatibility |
| Foldable | Samsung Fold/Flip | P2 | Layout, screen transition |
| Tablet | Samsung Tab | P2 | Layout (orientation locked to portrait) |

### OEM UI Layer Differences

- **Samsung One UI:** Overrides font rendering, has its own dark mode force-apply, notification shade differs
- **Pixel (stock Android):** Closest to AOSP, Material You dynamic colors
- **Xiaomi MIUI:** Aggressive battery optimization kills background processes, may block notifications
- **OnePlus OxygenOS:** Custom gesture navigation can conflict with swipe gestures

---

## 8. SCREEN-BY-SCREEN TESTING CHECKLIST

### Authentication Flow
- [ ] AuthScreen loads without Apple Sign-In button on Android
- [ ] Email/password sign-in works
- [ ] Email/password sign-up with age verification works
- [ ] DOB input fields accept numbers only (number-pad keyboard appears)
- [ ] KeyboardAvoidingView (behavior='height') keeps inputs visible
- [ ] Brand text renders with correct custom fonts (DM Serif Display)
- [ ] Close button dismisses modal (hardware back button too)
- [ ] Password field shows/hides correctly with secureTextEntry

### Onboarding
- [ ] All 3 onboarding steps render correctly
- [ ] BlurView backgrounds render (may be transparent on old Android)
- [ ] KeyboardAvoidingView works for city input
- [ ] Image picker launches correctly for avatar
- [ ] Photo permission dialog appears correctly

### Main Tabs (GlassTabBar)
- [ ] Tab bar renders with solid dark background (not BlurView on Android)
- [ ] Sliding indicator animation is smooth
- [ ] Tab icon scale animation works (Reanimated)
- [ ] Tab label opacity animation works
- [ ] Glow dot is visible (may not glow on Android -- just a teal dot)
- [ ] Bottom padding accounts for navigation bar (3-button and gesture)

### Discover Tab (ExploreScreen / Map)
- [ ] Google Maps renders in dark mode (customMapStyle applied)
- [ ] Map does NOT flash light mode before dark style loads
- [ ] All 431 seeded spots load as clustered markers
- [ ] Marker tap opens SpotBottomSheet
- [ ] SpotBottomSheet BlurView renders or has fallback
- [ ] Category filter chips scroll horizontally
- [ ] Search bar BlurView renders
- [ ] Location button requests permission correctly
- [ ] My location dot appears on map
- [ ] Neighborhood pulse badge renders
- [ ] City presence counter renders
- [ ] Pinch-to-zoom is smooth with 431 markers

### SpotDetail (FormSheet)
- [ ] FormSheet presentation works on Android (may render as full-screen modal instead)
- [ ] Sheet grabber is visible
- [ ] Sheet detents (75% and 100%) work
- [ ] Swipe-down dismisses the sheet
- [ ] Hardware back button dismisses the sheet
- [ ] Content scrolls within the sheet
- [ ] Comment input keyboard does not cover the input
- [ ] Haptic feedback on interactions

### Home Tab (PeopleScreen / CommunityScreen)
- [ ] FeedTab loads and scrolls smoothly
- [ ] ChatTab real-time messages work (Supabase WebSocket)
- [ ] ChatTab keyboard handling works
- [ ] DiscoverTab/NearbyTab renders user cards
- [ ] MessagesTab direct message list loads
- [ ] EventsTab event cards render
- [ ] CalendarTab renders correctly
- [ ] Tab swiping (material-top-tabs) works

### Profile Tab
- [ ] Profile data loads from Supabase
- [ ] Avatar image loads
- [ ] Edit profile flow works
- [ ] LayoutAnimation expand/collapse works (experimental on Android)
- [ ] Settings navigation works
- [ ] Logout flow works

### AddSpot (Modal)
- [ ] Modal opens from FAB or navigation
- [ ] Map shows for location picker (Google Maps, dark style)
- [ ] Photo picker works (camera + gallery)
- [ ] All form fields keyboard navigable
- [ ] KeyboardAvoidingView keeps fields visible
- [ ] Category selector works
- [ ] Submit creates spot in Supabase
- [ ] Hardware back button dismisses modal

### DirectMessage
- [ ] Message list scrolls correctly
- [ ] KeyboardAvoidingView keeps input visible (behavior=undefined on Android)
- [ ] Real-time message delivery works
- [ ] Send button works

### Settings
- [ ] All toggle switches work
- [ ] DateTimePicker shows Android calendar dialog
- [ ] Navigation to sub-screens (Privacy, Terms, Blocked Users) works
- [ ] Notification consent flow works
- [ ] Data deletion flow works

### AskAI
- [ ] Chat interface loads
- [ ] KeyboardAvoidingView works (behavior=undefined on Android)
- [ ] Message sending works
- [ ] Response rendering works

### NomadToolkit / NomadDiscovery
- [ ] LayoutAnimation accordion expand works on Android
- [ ] Visa information renders
- [ ] Links are tappable

### SpotDiscovery / EventSwipe (SwipeCardDeck)
- [ ] Card rendering works
- [ ] Swipe gesture is responsive
- [ ] Spring physics animation is smooth (Reanimated)
- [ ] Swipe left/right/up all register correctly
- [ ] Haptic feedback on swipe commit
- [ ] Undo works

### Legal Screens (Privacy, Terms)
- [ ] ScrollView renders all content
- [ ] Hardware back button works

### GDPR Consent
- [ ] Overlay appears on first launch
- [ ] BlurView background renders (or has fallback)
- [ ] Accept/Decline buttons work
- [ ] Consent persists via AsyncStorage

---

## 9. CRITICAL PATHS (Test These First)

1. **Cold start -> GDPR -> Auth -> Onboarding -> Home tab** (first-time user flow)
2. **Open map -> browse spots -> tap marker -> view detail -> comment** (core loop)
3. **Swipe spots/events -> save -> view saved** (engagement loop)
4. **Open chat -> send message -> receive reply** (real-time)
5. **Add a spot -> pick photo -> set location -> submit** (UGC flow)
6. **Receive push notification -> tap -> open correct screen** (re-engagement)

---

## 10. PRE-BUILD CHECKLIST

Before queueing an Android EAS build:

- [ ] Verify `google-services.json` is in project root (exists)
- [ ] Verify Google Maps API key is restricted in Google Cloud Console
- [ ] Verify `assets/icon.png` is monochrome white-on-transparent for notification icon (or create separate notification icon)
- [ ] Verify `assets/android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png` exist (they do)
- [ ] Check if `.well-known/assetlinks.json` is deployed to xpat.social for App Links
- [ ] Run `npx expo-doctor` to check for config issues
- [ ] Run `eas build --platform android --profile preview` for internal testing first
- [ ] DO NOT run concurrent builds (free tier charges per build)

---

## 11. KNOWN EXPO SDK 55 ANDROID BUGS

1. **Dev menu crash on shake gesture** -- only affects development builds, not production
2. **STATUS_BAR_PLUGIN deprecation warning** -- cosmetic, no functional impact
3. **react-native-maps compatibility** -- SDK 55 had issues with react-native-maps 1.23.0+; version 1.27.2 should be past this, but test
4. **BlurView V3** -- SDK 55 added V3 BlurView support for Android, but requires specific API usage for best results

---

## 12. ANDROID-SPECIFIC CODE CHANGES NEEDED (Summary)

### Must Fix Before First Build
1. **Add Google Sign-In for Android** -- otherwise Android users have no social login
2. **Add BackHandler for main tabs** -- prevent accidental app exit
3. **Add Android fallbacks for BlurView** in critical components (at minimum: GDPRConsent, SpotBottomSheet, ExploreScreen header)
4. **Create monochrome notification icon** -- verify or create `notification-icon.png`

### Should Fix Before Public Launch
5. Add multiple notification channels (messages, events, connections)
6. Replace hardcoded `paddingTop: 40` with `insets.top` throughout
7. Test and potentially replace formSheet with modal + custom bottom sheet on Android
8. Add `removeClippedSubviews` and `windowSize` to FlatLists
9. Verify `.well-known/assetlinks.json` for App Links

### Nice to Have
10. Switch to expo-font config plugin for build-time font embedding
11. Migrate from `<Image>` to `expo-image` for better caching
12. Add colored border/gradient as glow alternative on Android
13. Consider `react-native-keyboard-controller` for more reliable keyboard handling
