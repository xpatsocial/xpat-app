# x/pat Comprehensive Accessibility Research

**Date**: April 2026
**Scope**: Full accessibility audit, legal compliance, and implementation roadmap for x/pat social travel app
**Current State**: 5 accessibility labels across 82 source files (GlassTabBar: 3, ErrorBoundary: 2)

---

## Table of Contents

1. [WCAG 2.2 Level AA Mobile Checklist](#1-wcag-22-level-aa-mobile-checklist)
2. [European Accessibility Act (EAA)](#2-european-accessibility-act-eaa)
3. [ADA Compliance for Mobile Apps](#3-ada-compliance-for-mobile-apps)
4. [VoiceOver Best Practices for React Native](#4-voiceover-best-practices)
5. [TalkBack Best Practices for React Native](#5-talkback-best-practices)
6. [Dynamic Type / Font Scaling](#6-dynamic-type--font-scaling)
7. [Reduce Motion Support](#7-reduce-motion-support)
8. [Color Contrast Requirements](#8-color-contrast-requirements)
9. [Touch Target Sizing](#9-touch-target-sizing)
10. [Screen Reader Navigation Patterns](#10-screen-reader-navigation-patterns)
11. [Accessible Maps](#11-accessible-maps)
12. [Accessible Forms](#12-accessible-forms)
13. [Accessible Modals and Bottom Sheets](#13-accessible-modals-and-bottom-sheets)
14. [Accessible Images](#14-accessible-images)
15. [Accessible Chat](#15-accessible-chat)
16. [Accessible Navigation](#16-accessible-navigation)
17. [Accessible Onboarding](#17-accessible-onboarding)
18. [Accessible Search](#18-accessible-search)
19. [Accessible Notifications](#19-accessible-notifications)
20. [Accessible Gestures](#20-accessible-gestures)
21. [Accessible Dark Mode](#21-accessible-dark-mode)
22. [Testing with Assistive Technology](#22-testing-with-assistive-technology)
23. [Automated Accessibility Testing Tools](#23-automated-accessibility-testing-tools)
24. [Accessibility Statement and Documentation](#24-accessibility-statement-and-documentation)
25. [Accessibility Roadmap](#25-accessibility-roadmap)
26. [react-native-ama Library](#26-react-native-ama-library)
27. [Inclusive Design for Travel](#27-inclusive-design-for-travel)
28. [Cognitive Accessibility](#28-cognitive-accessibility)
29. [Multilingual Accessibility](#29-multilingual-accessibility)
30. [Accessibility as Competitive Advantage](#30-accessibility-as-competitive-advantage)

---

## 1. WCAG 2.2 Level AA Mobile Checklist

WCAG 2.2 (W3C Recommendation, October 2023) is the global standard. It contains 87 total success criteria; Level AA requires meeting all 50 A + AA criteria. The W3C published "Guidance on Applying WCAG 2.2 to Mobile Applications (WCAG2Mobile)" specifically mapping criteria to native apps.

### Principle 1: Perceivable

| Criterion | Level | x/pat Relevance | Status |
|-----------|-------|------------------|--------|
| 1.1.1 Non-text Content | A | All images, icons, map markers need alt text | FAIL - No alt text on any images |
| 1.2.1 Audio-only / Video-only | A | Future video content in spots | N/A currently |
| 1.2.2 Captions | A | Future video content | N/A currently |
| 1.2.3 Audio Description | A | Future video content | N/A currently |
| 1.2.4 Captions (Live) | AA | Live streaming features | N/A currently |
| 1.2.5 Audio Description (Prerecorded) | AA | Future video content | N/A currently |
| 1.3.1 Info and Relationships | A | Form labels, headings, lists need semantic structure | FAIL - No semantic roles on most components |
| 1.3.2 Meaningful Sequence | A | Reading order must match visual order | PARTIAL - Tab bar is correct, most screens untested |
| 1.3.3 Sensory Characteristics | A | Don't rely solely on color/shape/position | FAIL - Category pills use color only for selection |
| 1.3.4 Orientation | AA | Must support portrait and landscape | UNKNOWN - needs testing |
| 1.3.5 Identify Input Purpose | AA | Autocomplete on form fields | FAIL - No textContentType props |
| 1.4.1 Use of Color | A | Color cannot be the only indicator | FAIL - Selected state in onboarding uses only border color |
| 1.4.2 Audio Control | A | Auto-playing audio must be controllable | N/A currently |
| 1.4.3 Contrast (Minimum) | AA | 4.5:1 for text, 3:1 for large text | FAIL - Multiple violations (see Section 8) |
| 1.4.4 Resize Text | AA | Text must be resizable to 200% | FAIL - Fixed font sizes, no scaling support |
| 1.4.5 Images of Text | AA | Don't use images of text | PASS - App uses system fonts |
| 1.4.10 Reflow | AA | Content must reflow without horizontal scroll | PARTIAL - Untested at large text sizes |
| 1.4.11 Non-text Contrast | AA | 3:1 for UI components and graphics | FAIL - Glass borders at 0.08 opacity fail badly |
| 1.4.12 Text Spacing | AA | Must tolerate increased spacing | UNTESTED |
| 1.4.13 Content on Hover/Focus | AA | Tooltips must be dismissible/persistent/hoverable | N/A - No tooltips currently |

### Principle 2: Operable

| Criterion | Level | x/pat Relevance | Status |
|-----------|-------|------------------|--------|
| 2.1.1 Keyboard | A | All features via external keyboard | UNTESTED |
| 2.1.2 No Keyboard Trap | A | Focus must not get trapped | UNTESTED |
| 2.1.4 Character Key Shortcuts | A | Single-key shortcuts need alternatives | N/A currently |
| 2.2.1 Timing Adjustable | A | No time limits on interactions | PASS |
| 2.2.2 Pause, Stop, Hide | A | Animated content must be pausable | FAIL - Gradient animation in onboarding runs forever |
| 2.3.1 Three Flashes | A | No content flashes more than 3 times/sec | PASS - Animations are subtle |
| 2.4.1 Bypass Blocks | A | Skip repeated content | N/A for native apps |
| 2.4.2 Page Titled | A | Screens need descriptive titles | FAIL - headerShown: false on all screens |
| 2.4.3 Focus Order | A | Logical focus sequence | FAIL - No focus management implemented |
| 2.4.4 Link Purpose | A | Link text describes destination | PARTIAL - Some buttons say "Continue" without context |
| 2.4.5 Multiple Ways | AA | Multiple ways to find content | PASS - Tab bar + search + map |
| 2.4.6 Headings and Labels | AA | Descriptive headings/labels | FAIL - No accessibilityRole="header" on any headings |
| 2.4.7 Focus Visible | AA | Visible focus indicator | FAIL - No focus indicators anywhere |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Focused items not fully hidden | UNTESTED |
| 2.5.1 Pointer Gestures | A | Single-pointer alternatives for multipoint | FAIL - Pinch zoom on map has no alternative |
| 2.5.2 Pointer Cancellation | A | Down event doesn't trigger action | PASS - TouchableOpacity uses press-up |
| 2.5.3 Label in Name | A | Visible label matches accessible name | FAIL - Most elements have no accessible name |
| 2.5.4 Motion Actuation | A | Alternatives for device motion | PASS - No motion-activated features |
| 2.5.7 Dragging Movements | AA | Single-pointer alternatives to drag | FAIL - SwipeCardDeck has no button alternatives |
| 2.5.8 Target Size (Minimum) | AA | 24x24 CSS pixels minimum | FAIL - Many targets under minimum (see Section 9) |

### Principle 3: Understandable

| Criterion | Level | x/pat Relevance | Status |
|-----------|-------|------------------|--------|
| 3.1.1 Language of Page | A | Programmatic language set | UNTESTED - needs verification |
| 3.1.2 Language of Parts | AA | Language changes identified | N/A currently (single language) |
| 3.2.1 On Focus | A | No context change on focus | PASS |
| 3.2.2 On Input | A | No unexpected context change | PASS |
| 3.2.3 Consistent Navigation | AA | Navigation consistent across screens | PASS - Tab bar is consistent |
| 3.2.4 Consistent Identification | AA | Same function = same label | PARTIAL - Needs audit |
| 3.3.1 Error Identification | A | Errors described to user | PARTIAL - Alert.alert used but not announced to SR |
| 3.3.2 Labels or Instructions | A | Labels for user input | FAIL - Placeholder-only labels on all inputs |
| 3.3.3 Error Suggestion | AA | Provide correction suggestions | FAIL - Generic error messages |
| 3.3.4 Error Prevention | AA | Confirm/review before submission | PARTIAL - Some confirmations exist |
| 3.3.7 Redundant Entry | A | Don't re-ask for same info | PASS |
| 3.3.8 Accessible Authentication (Minimum) | AA | No cognitive function tests for auth | PASS - Email/password + Apple Sign In |

### Principle 4: Robust

| Criterion | Level | x/pat Relevance | Status |
|-----------|-------|------------------|--------|
| 4.1.2 Name, Role, Value | A | Programmatic name/role/value on all components | FAIL - Only 5 labels in entire app |
| 4.1.3 Status Messages | AA | Status communicated without focus change | FAIL - No live region announcements |

### WCAG 2.2 New Criteria (All relevant to x/pat)

| Criterion | Level | x/pat Impact |
|-----------|-------|-------------|
| 2.4.11 Focus Not Obscured | AA | Bottom sheet could obscure focused items |
| 2.4.12 Focus Not Obscured (Enhanced) | AAA | Not required but good practice |
| 2.4.13 Focus Appearance | AAA | Not required at AA |
| 2.5.7 Dragging Movements | AA | SwipeCardDeck, SwipeableRow, bottom sheet pan gesture |
| 2.5.8 Target Size (Minimum) | AA | 24x24 CSS px minimum, many violations |
| 3.2.6 Consistent Help | A | Help mechanisms in same location |
| 3.3.7 Redundant Entry | A | No re-entry of same data |
| 3.3.8 Accessible Authentication | AA | No cognitive tests for login |
| 3.3.9 Accessible Authentication (Enhanced) | AAA | Not required at AA |

### x/pat Priority: CRITICAL
This is the foundation everything else builds on. Estimated 35+ failures out of 50 AA criteria.

---

## 2. European Accessibility Act (EAA)

### Enforcement Timeline
- **June 28, 2025**: EAA became enforceable. New digital products and services must comply immediately.
- **June 28, 2028**: Existing services have a transition period, UNLESS they undergo major updates after June 2025 (then immediate compliance is required).
- x/pat is still pre-launch, so any App Store release in the EU triggers immediate compliance requirements.

### What the EAA Requires for Social Apps
The EAA references **EN 301 549** as the technical standard, which incorporates WCAG 2.1 Level AA plus additional mobile-specific requirements:

1. **Perceivable**: All information must be presentable to users in ways they can perceive
2. **Operable**: All UI components and navigation must be operable
3. **Understandable**: Information and operation of UI must be understandable
4. **Robust**: Content must be interpretable by assistive technologies
5. **Compatible with assistive technologies**: VoiceOver, TalkBack, Switch Control, Braille displays
6. **Documentation**: Accessibility features must be documented

### Who Must Comply
- Any company providing digital services available in EU app stores
- x/pat will be on the App Store in EU countries, so compliance is mandatory
- No exemption for US-headquartered companies selling to EU users
- Microenterprise exemption (<10 employees, <EUR 2M revenue) -- x/pat may currently qualify but this is unreliable long-term

### Penalties
- Member states define penalties independently
- Can include fines, injunctions, and app store removal
- Complaint mechanisms will be established in each member state

### x/pat-Specific Requirements
- All screen reader compatibility (VoiceOver + TalkBack)
- Text alternatives for all non-text content
- Captions for any future audio/video content
- Color contrast meeting WCAG 2.1 AA minimums
- Operable with assistive technologies
- Accessibility statement published and accessible

### x/pat Priority: HIGH
EU launch is a stated goal. Non-compliance blocks EU distribution.

---

## 3. ADA Compliance for Mobile Apps

### Current Legal Landscape (2026)
- **8,667+ ADA Title III federal lawsuits** filed in 2025 (3x the 2013 baseline)
- **5,000+ digital accessibility lawsuits** by end of 2025
- Mobile app lawsuits expected to represent **15-20% of all digital ADA claims** by end of 2026
- **April 24, 2026 deadline**: ADA Title II requires WCAG 2.1 AA for government entities, establishing the de facto standard for all apps
- **1,427 lawsuits** targeted companies that had already been sued (repeat defendants)
- AI-driven filings increased 40% in 2025 vs 2024 (ChatGPT/Copilot helping individuals draft complaints)

### Key Lawsuit Trends Relevant to x/pat
1. **Travel apps are high-target**: Travel and hospitality are among the most-sued industries for digital accessibility
2. **Social platforms**: Increasing scrutiny on social features (chat, profiles, content sharing)
3. **Widget overlays don't work**: FTC fined AccessiBe $1M in 2025 for misrepresenting widgets as guaranteed compliance
4. **Mobile-specific issues**: Touch targets, gesture complexity, and screen reader compatibility are the top cited violations

### What x/pat Must Do
- Meet WCAG 2.1 Level AA minimum (WCAG 2.2 AA recommended)
- Ensure full VoiceOver and TalkBack compatibility
- Provide text alternatives for all non-text content
- Maintain sufficient color contrast
- Support keyboard/switch control navigation
- Document accessibility features
- Publish an accessibility statement
- Establish a feedback mechanism for accessibility issues

### Risk Assessment for x/pat
- **Low risk currently**: Pre-launch, small user base
- **Medium risk at launch**: Travel category is heavily targeted
- **High risk if EU expansion**: EAA + ADA combined exposure
- **Mitigation**: Proactive accessibility is far cheaper than reactive lawsuit defense ($10K-$150K per lawsuit)

### x/pat Priority: HIGH
Travel is a lawsuit-heavy category. Proactive compliance is essential.

---

## 4. VoiceOver Best Practices

VoiceOver is the iOS screen reader. It reads elements based on position, role, and accessibility properties. Users navigate using swipe gestures (left/right to move between elements, up/down to adjust values).

### Component-by-Component Guide for x/pat

#### TouchableOpacity / Pressable Buttons
```tsx
// CURRENT (most buttons in x/pat):
<TouchableOpacity onPress={handleSubmit}>
  <Text>Sign In</Text>
</TouchableOpacity>

// CORRECT:
<TouchableOpacity
  onPress={handleSubmit}
  accessibilityRole="button"
  accessibilityLabel="Sign in to your account"
  accessibilityState={{ disabled: loading }}
  accessibilityHint="Double tap to sign in"
>
  <Text>Sign In</Text>
  {loading && <ActivityIndicator accessibilityLabel="Signing in" />}
</TouchableOpacity>
```

#### Text Headings
```tsx
// CURRENT:
<Text style={styles.stepTitle}>What are you looking for?</Text>

// CORRECT:
<Text
  style={styles.stepTitle}
  accessibilityRole="header"
>
  What are you looking for?
</Text>
```

#### TextInput Fields
```tsx
// CURRENT (AuthScreen):
<TextInput placeholder="Email" />

// CORRECT:
<TextInput
  placeholder="Email"
  accessibilityLabel="Email address"
  accessibilityHint="Enter your email to sign in"
  textContentType="emailAddress"       // iOS autofill
  autoComplete="email"                  // Android autofill
  accessibilityRole="none"             // TextInput has implicit role
/>
```

#### Toggle / Selection Components (OnboardingScreen vibe pills)
```tsx
// CURRENT:
<TouchableOpacity onPress={() => toggleVibe(vibe)}>
  <Text>{vibe}</Text>
</TouchableOpacity>

// CORRECT:
<TouchableOpacity
  onPress={() => toggleVibe(vibe)}
  accessibilityRole="checkbox"
  accessibilityState={{ checked: isSelected }}
  accessibilityLabel={vibe}
  accessibilityHint={isSelected ? 'Double tap to deselect' : 'Double tap to select'}
>
  <Text>{vibe}</Text>
</TouchableOpacity>
```

#### Images (Avatar, SpotCard)
```tsx
// CORRECT for informative images:
<Image
  source={{ uri: avatarUrl }}
  accessibilityLabel={`Profile photo of ${displayName}`}
  accessibilityRole="image"
/>

// CORRECT for decorative images:
<Image
  source={{ uri: backgroundUrl }}
  accessibilityElementsHidden={true}
  importantForAccessibility="no-hide-descendants"
/>
```

#### Lists (FlatList)
```tsx
<FlatList
  data={spots}
  accessibilityRole="list"
  accessibilityLabel={`${spots.length} spots found`}
  renderItem={({ item, index }) => (
    <View accessibilityRole="listitem">
      <SpotCard spot={item} />
    </View>
  )}
/>
```

#### Status / Live Regions
```tsx
// For dynamic content updates:
<View
  accessibilityLiveRegion="polite"
  accessibilityRole="status"
>
  <Text>{connectionCount} people nearby</Text>
</View>
```

### VoiceOver-Specific iOS Behaviors
- **Swipe right**: Move to next element
- **Swipe left**: Move to previous element
- **Double-tap**: Activate selected element
- **Three-finger swipe**: Scroll
- **Magic Tap (two-finger double-tap)**: Context-specific action (pause/play, answer call)
- **Escape (two-finger Z)**: Go back / dismiss

### VoiceOver Rotor Support
Announce headings properly so users can jump between sections using the rotor:
```tsx
<Text accessibilityRole="header">Nearby Spots</Text>
```

### Testing Methodology
1. Enable VoiceOver: Settings > Accessibility > VoiceOver
2. Navigate every screen with swipe-only navigation
3. Verify every interactive element is reachable and has a meaningful label
4. Verify focus order matches visual layout
5. Verify state changes are announced
6. Test with VoiceOver + Braille display if possible

### x/pat Priority: CRITICAL
Zero VoiceOver support currently. Every interactive element needs labels.

---

## 5. TalkBack Best Practices

TalkBack is Android's screen reader. It follows platform-specific rules that differ from VoiceOver in important ways.

### Key Differences from VoiceOver

| Feature | VoiceOver (iOS) | TalkBack (Android) |
|---------|----------------|-------------------|
| Navigation | Swipe left/right | Swipe left/right |
| Activation | Double-tap | Double-tap |
| Back gesture | Two-finger Z | Two-finger swipe down-then-right |
| Focus indicator | Dark outline | Green rectangle |
| Role announcement | Reads role after label | Reads role before label |
| List semantics | Reads "X of Y" | Reads "in list" |
| accessibilityLiveRegion | Supported | `polite` or `assertive` |

### Android-Specific Patterns

#### importantForAccessibility
```tsx
// Hide decorative elements from TalkBack:
<View importantForAccessibility="no-hide-descendants">
  <AnimatedGradient />
</View>

// Force inclusion:
<View importantForAccessibility="yes">
  <Text>Important status</Text>
</View>
```

#### accessibilityLiveRegion (Android-specific priority)
```tsx
// Announce new messages in chat:
<View accessibilityLiveRegion="polite">
  <Text>{`${unreadCount} new messages`}</Text>
</View>

// Urgent announcements:
<View accessibilityLiveRegion="assertive">
  <Text>Connection request accepted!</Text>
</View>
```

#### accessibilityActions (Custom Actions)
```tsx
<View
  accessible={true}
  accessibilityActions={[
    { name: 'save', label: 'Save this spot' },
    { name: 'share', label: 'Share this spot' },
    { name: 'directions', label: 'Get directions' },
  ]}
  onAccessibilityAction={(event) => {
    switch (event.nativeEvent.actionName) {
      case 'save': handleSave(); break;
      case 'share': handleShare(); break;
      case 'directions': handleDirections(); break;
    }
  }}
>
  <SpotCard spot={spot} />
</View>
```

### TalkBack Navigation Patterns
- **Explore by touch**: Drag finger across screen to hear elements
- **Linear navigation**: Swipe right to move forward
- **Reading controls**: Swipe up/down to change granularity (characters, words, headings, links)
- **Context menu**: Swipe up-then-right for local actions

### Android Accessibility Scanner
Google's free Accessibility Scanner app can audit screens directly on-device:
- Touch target size violations
- Color contrast issues
- Missing content labels
- Text scaling issues

### x/pat Priority: CRITICAL
Android has zero accessibility support currently. All the same work as VoiceOver plus Android-specific additions.

---

## 6. Dynamic Type / Font Scaling

### Current State in x/pat
All font sizes are hardcoded in the theme (`fontSize: 14`, `fontSize: 48`, etc.) and in component styles. No Dynamic Type support exists.

### How Font Scaling Works

**iOS Dynamic Type**: Users set preferred text size in Settings > Accessibility > Display & Text Size > Larger Text. Scale range: 0.823x to 3.0x+.

**Android Font Scaling**: Settings > Display > Display size and text > Font size. Scale range: 0.85x to 1.3x (some OEMs support up to 2.0x).

### React Native Implementation

#### Allow Font Scaling (Default Behavior)
React Native's `<Text>` component scales by default with `allowFontScaling={true}`. However, x/pat likely uses fixed layout heights that will break.

#### Cap Maximum Scaling
```tsx
// Prevent extreme scaling that breaks layout:
<Text
  allowFontScaling={true}
  maxFontSizeMultiplier={1.5}  // Cap at 150% of base size
>
  {label}
</Text>
```

#### Global Default via Custom Text Component
```tsx
// src/components/A11yText.tsx
import { Text as RNText, TextProps } from 'react-native';

export default function A11yText(props: TextProps) {
  return (
    <RNText
      allowFontScaling={true}
      maxFontSizeMultiplier={2.0}
      {...props}
    />
  );
}
```

#### Detect Current Scale
```tsx
import { PixelRatio } from 'react-native';

const fontScale = PixelRatio.getFontScale();
// Use to adjust layout when scale > 1.5
```

#### iOS textContentType for Smart Input
```tsx
<TextInput
  textContentType="emailAddress"   // iOS
  autoComplete="email"             // Android
/>
<TextInput
  textContentType="password"       // iOS
  autoComplete="password"          // Android
/>
<TextInput
  textContentType="name"           // iOS
  autoComplete="name"              // Android
/>
```

### Layout Considerations
- Replace fixed-height containers with `minHeight` + `flexShrink`
- Use `numberOfLines` + `ellipsizeMode` as fallback for constrained spaces
- Test at 200% font scale minimum (WCAG requirement)
- SpotCard, EventCard, tab bar labels need flexible height
- Tab bar label fontSize: 9 is dangerously small -- at 200% that's still only 18, but layouts may break

### Testing Methodology
1. iOS: Settings > Accessibility > Display & Text Size > Larger Text > drag slider to maximum
2. Android: Settings > Display > Font size > drag to maximum
3. Verify all text remains readable and layouts don't overflow
4. Verify no text is clipped or hidden
5. Run through every screen at both extremes

### x/pat Priority: HIGH
Fixed font sizes throughout the app. The tab bar label at fontSize 9 is nearly illegible even at default size. All text needs `allowFontScaling={true}` (which is the default but untested), and layouts need flexibility.

---

## 7. Reduce Motion Support

### Current State in x/pat
The app uses extensive animations:
- **OnboardingScreen**: `withRepeat` gradient animation that loops indefinitely
- **OnboardingScreen**: `SlideInRight`, `SlideOutLeft`, `FadeIn`, `FadeOut` transitions
- **GlassTabBar**: `withSpring` scale and indicator animations
- **AnimatedPressable**: Spring-based scale animations on every press
- **SpotBottomSheet**: Spring-based slide and opacity animations
- **SwipeCardDeck**: Complex gesture-driven animations
- **SearchBar**: Slide-in animation on mount
- **All screens**: react-navigation `slide_from_right` transitions

None of these respect the Reduce Motion setting.

### React Native Reanimated Integration

#### useReducedMotion Hook
```tsx
import { useReducedMotion } from 'react-native-reanimated';

function AnimatedPressable({ children, onPress, ...props }) {
  const reduceMotion = useReducedMotion();

  const scale = useSharedValue(1);

  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      if (!reduceMotion) {
        scale.value = withSpring(0.96, SPRING_CONFIG);
      }
    })
    .onFinalize((_, success) => {
      if (!reduceMotion) {
        scale.value = withSpring(1, SPRING_CONFIG);
      }
      if (success && onPress) onPress();
    });

  // ...
}
```

#### ReducedMotionConfig (Global)
```tsx
// App.tsx - wrap the entire app:
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

export default function App() {
  return (
    <ReducedMotionConfig mode={ReduceMotion.System}>
      <AppNavigator />
    </ReducedMotionConfig>
  );
}
```

With `ReduceMotion.System`, Reanimated automatically:
- Skips `withSpring`, `withTiming` animations (jumps to final value)
- Disables layout animations (`entering`/`exiting`)
- Disables `withRepeat` animations

#### AccessibilityInfo API (for non-Reanimated animations)
```tsx
import { AccessibilityInfo } from 'react-native';

const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
  return () => sub.remove();
}, []);
```

#### SearchBar Fix (uses Animated from react-native, not Reanimated)
```tsx
// Current: Always animates
Animated.spring(slideAnim, {
  toValue: 0,
  useNativeDriver: true,
}).start();

// Fixed: Check reduce motion
const [reduceMotion, setReduceMotion] = useState(false);
useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
}, []);

useEffect(() => {
  if (reduceMotion) {
    slideAnim.setValue(0); // Jump to final position
  } else {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }
}, [reduceMotion]);
```

#### Navigation Transitions
```tsx
// In AppNavigator, respect reduce motion:
import { useReducedMotion } from 'react-native-reanimated';

function AppNavigator() {
  const reduceMotion = useReducedMotion();

  return (
    <Stack.Navigator
      screenOptions={{
        animation: reduceMotion ? 'none' : 'slide_from_right',
        // ...
      }}
    >
```

### WCAG Requirements
- **2.2.2 Pause, Stop, Hide** (A): The looping gradient animation in OnboardingScreen violates this. It must stop after 5 seconds or provide a pause mechanism.
- **2.3.1 Three Flashes** (A): No violations found (animations are subtle).

### Testing Methodology
1. iOS: Settings > Accessibility > Motion > Reduce Motion = ON
2. Android: Settings > Accessibility > Remove animations = ON
3. Verify all animations stop or use cross-fade alternatives
4. Verify app remains fully functional without animations
5. Verify no content is hidden that was animated into view

### x/pat Priority: CRITICAL
Easiest quick win. Adding `<ReducedMotionConfig mode={ReduceMotion.System}>` at the root handles most Reanimated animations in one line. SearchBar and any `Animated` (from react-native) need manual fixes.

---

## 8. Color Contrast Requirements

### WCAG 2.2 Requirements
- **1.4.3 Contrast (Minimum)** AA: 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)
- **1.4.11 Non-text Contrast** AA: 3:1 for UI components and graphical objects
- Large text in x/pat context: 18pt = 24px at 1x scale, or 14pt bold = ~19px bold

### x/pat Theme Color Contrast Audit

Background: `#1C1C1E` (dark.bg) and `#0F0F11` (dark.bg0)

| Element | Foreground | Background | Ratio | Required | Result |
|---------|-----------|------------|-------|----------|--------|
| Primary text | `#F5F5F5` (dark.text) | `#1C1C1E` (dark.bg) | **14.7:1** | 4.5:1 | PASS |
| Secondary text | `#BABABF` (dark.text2) | `#1C1C1E` (dark.bg) | **8.2:1** | 4.5:1 | PASS |
| Tertiary text | `#636366` (dark.text3) | `#1C1C1E` (dark.bg) | **2.8:1** | 4.5:1 | **FAIL** |
| Teal on dark bg | `#2EC4A0` (teal) | `#1C1C1E` (dark.bg) | **7.2:1** | 4.5:1 | PASS |
| Amber on dark bg | `#E8803A` (amber) | `#1C1C1E` (dark.bg) | **5.4:1** | 4.5:1 | PASS |
| Red on dark bg | `#FF6B6B` (red) | `#1C1C1E` (dark.bg) | **5.8:1** | 4.5:1 | PASS |
| Tab label (text2) | `#BABABF` | `#1C1C1E` | **8.2:1** | 4.5:1 | PASS |
| Button text on teal | `#1C1C1E` (dark.bg) | `#2EC4A0` (teal) | **7.2:1** | 4.5:1 | PASS |
| Placeholder text | `#BABABF` | `rgba(44,44,46,0.6)` on `#1C1C1E` | ~**5.5:1** | 4.5:1 | PASS (marginal) |
| Glass border | `rgba(255,255,255,0.08)` | `#1C1C1E` | ~**1.1:1** | 3:1 | **FAIL** |
| Glass light bg | `rgba(255,255,255,0.06)` | `#1C1C1E` | ~**1.1:1** | 3:1 | **FAIL** |
| Teal border on glass | `rgba(46,196,160,0.12)` | `#1C1C1E` | ~**1.2:1** | 3:1 | **FAIL** |
| Spot card border | `#48484A` (dark.border) | `#2C2C2E` (dark.bg2) | **1.3:1** | 3:1 | **FAIL** |
| Subtitle opacity 0.7 | `#BABABF` at 0.7 opacity | `#1C1C1E` | ~**5.0:1** | 4.5:1 | PASS (marginal) |
| Text3 as label | `#636366` | `#2C2C2E` (dark.bg2) | ~**1.8:1** | 4.5:1 | **FAIL** |

### Critical Failures

1. **`dark.text3` (#636366)**: Used for inactive/tertiary content. Fails against both bg and bg2. Must be brightened to at least `#8E8E93` (4.5:1 on dark.bg).

2. **Glass borders**: All glass borders at 0.06-0.15 opacity are invisible to low-vision users. The entire glass aesthetic creates non-text contrast failures. Options:
   - Increase glass border opacity to minimum 0.3 for bordered containers
   - Add a solid fallback border for accessibility mode
   - The borders serve as UI component boundaries (WCAG 1.4.11 requires 3:1)

3. **Input borders**: `rgba(46, 196, 160, 0.12)` teal borders on inputs are essentially invisible. Must be increased to at least `rgba(46, 196, 160, 0.4)` or use a solid alternative.

4. **Card borders**: `#48484A` on `#2C2C2E` is only 1.3:1. Needs brightening to at least `#6C6C70`.

### Recommended Theme Additions
```tsx
export const colors = {
  // ... existing colors

  // Accessible alternatives
  a11y: {
    text3: '#8E8E93',           // Was #636366 (2.8:1 -> 4.5:1)
    border: '#6C6C70',          // Was #48484A (1.3:1 -> 3:1)
    glassBorder: 'rgba(255, 255, 255, 0.25)', // Was 0.08 (1.1:1 -> 3:1)
    inputBorder: 'rgba(46, 196, 160, 0.4)',   // Was 0.12 (1.2:1 -> 3:1)
  },
};
```

### OLED-Specific Considerations
- Current `dark.bg0: '#0F0F11'` is appropriately dark gray (not pure black) -- avoids OLED smearing
- Current `dark.bg: '#1C1C1E'` follows Apple's dark mode guidelines exactly -- good
- No pure `#000000` usage found -- correct for OLED

### Testing Tools
- **Colour Contrast Analyser (CCA)**: Desktop app, pick colors from screenshots
- **Stark (Figma plugin)**: For design-time contrast checking
- **Deque Color Contrast Checker**: Specifically for mobile app colors
- **colorcontrast.app**: Free online checker with WCAG 2.2 support
- **Xcode Accessibility Inspector**: Real-time contrast checking on iOS simulator
- **Android Accessibility Scanner**: On-device audit tool

### x/pat Priority: CRITICAL
The glass aesthetic creates systemic contrast failures. The text3 color and all glass borders must be fixed. The good news: primary text and teal/amber accent colors all pass.

---

## 9. Touch Target Sizing

### Requirements
- **iOS Human Interface Guidelines**: 44x44 points minimum
- **Android Material Design**: 48x48 dp minimum (with 8dp spacing between targets)
- **WCAG 2.5.8 Target Size (Minimum)** AA: 24x24 CSS pixels (cross-platform minimum)
- **WCAG 2.5.5 Target Size (Enhanced)** AAA: 44x44 CSS pixels

### x/pat Audit

| Component | Current Size | Required | Status |
|-----------|-------------|----------|--------|
| Tab bar buttons | flex:1, h:64 (full tab area) | 44x44 | PASS |
| SearchBar clear button | padding: 4px (effective ~24x24) | 44x44 | **FAIL** |
| Close button (AuthScreen) | 36x36 with hitSlop 12 | 44x44 | PASS (with hitSlop) |
| Vibe pills (Onboarding) | padding: 20x12 (varies with text) | 44x44 | **PARTIAL** - short pills may fail |
| City cards (Onboarding) | padding: 16, full width | 44x44 | PASS |
| SpotCard | full width, padding: 16 | 44x44 | PASS |
| Category filter pills (Explore) | Varies | 44x44 | **NEEDS AUDIT** |
| Map markers | Default ~20x20 | 44x44 | **FAIL** |
| Bottom sheet drag handle | ~40x4 visible, gesture area unknown | 44x44 | **FAIL** |
| Spot action buttons | Varies | 44x44 | **NEEDS AUDIT** |
| Chat send button | Varies | 44x44 | **NEEDS AUDIT** |
| Connection request buttons | Varies | 44x44 | **NEEDS AUDIT** |
| Settings row items | Varies | 44x44 | **NEEDS AUDIT** |
| CheckInButton | Varies | 44x44 | **NEEDS AUDIT** |
| SwipeableRow action buttons | Varies | 44x44 | **NEEDS AUDIT** |

### Implementation Strategy

#### Use hitSlop for Small Visual Elements
```tsx
// For visually small buttons, expand touch area:
<TouchableOpacity
  onPress={handleClear}
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  style={styles.clearButton}
>
  <Feather name="x" size={16} color={colors.dark.text2} />
</TouchableOpacity>
```

#### Minimum Touch Target Wrapper
```tsx
// src/components/A11yTouchable.tsx
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, Platform } from 'react-native';

const MIN_SIZE = Platform.OS === 'ios' ? 44 : 48;

export default function A11yTouchable(props: TouchableOpacityProps) {
  return (
    <TouchableOpacity
      {...props}
      style={[{ minWidth: MIN_SIZE, minHeight: MIN_SIZE }, props.style]}
      hitSlop={props.hitSlop || { top: 8, bottom: 8, left: 8, right: 8 }}
    />
  );
}
```

#### Map Marker Fix
```tsx
// Use custom markers with larger touch areas:
<Marker
  coordinate={spot.coordinate}
  tracksViewChanges={false}
>
  <View style={{
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <View style={{
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: MARKER_COLORS[spot.category],
    }} />
  </View>
</Marker>
```

### Testing Methodology
1. Enable "Show Taps" in developer options (Android) to verify touch areas
2. Use Accessibility Inspector (Xcode) to measure element frames
3. Audit every interactive element systematically
4. Test with thick-fingered users (elderly, motor impairment simulation)

### x/pat Priority: HIGH
Multiple small touch targets exist. Map markers and clear buttons are the worst offenders. hitSlop can fix most issues quickly.

---

## 10. Screen Reader Navigation Patterns

### Focus Order
Focus order must match the visual reading order (top to bottom, left to right for LTR languages). Currently, x/pat has no explicit focus management.

### Grouping Related Elements
```tsx
// CURRENT SpotCard - screen reader reads each text separately:
<View>
  <Text>Cafe Name</Text>
  <Text>Bangkok, Thailand</Text>
  <Text>Great wifi and coffee</Text>
</View>

// CORRECT - group as single accessible element:
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel={`${spot.name}, ${spot.category} in ${spot.city}, ${spot.country}. ${spot.note || 'No description'}. ${spot.votes} votes. By ${spot.profiles?.display_name || 'Anonymous'}`}
  onPress={onPress}
>
  {/* Visual content unchanged */}
</TouchableOpacity>
```

### Landmark Regions
React Native doesn't have direct landmark support, but you can create conceptual regions:
```tsx
// Group content areas with headers:
<View accessibilityRole="summary">
  <Text accessibilityRole="header">Nearby Spots</Text>
  <FlatList ... />
</View>
```

### Focus Management on Screen Transitions
```tsx
import { AccessibilityInfo, findNodeHandle } from 'react-native';

// When navigating to a new screen:
const headerRef = useRef(null);
useEffect(() => {
  const node = findNodeHandle(headerRef.current);
  if (node) {
    AccessibilityInfo.setAccessibilityFocus(node);
  }
}, []);

// Usage:
<Text ref={headerRef} accessibilityRole="header">
  Spot Details
</Text>
```

### Hiding Decorative Elements
```tsx
// Hide from screen reader:
<View
  accessibilityElementsHidden={true}           // iOS
  importantForAccessibility="no-hide-descendants" // Android
>
  <AnimatedGradientBackground />
  <GlassOverlay />
  <GlowDot />
</View>
```

### Custom Accessibility Actions
```tsx
// For SpotCard with multiple actions:
<View
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel={`${spot.name} in ${spot.city}`}
  accessibilityActions={[
    { name: 'activate', label: 'View details' },
    { name: 'save', label: 'Save spot' },
    { name: 'share', label: 'Share' },
    { name: 'directions', label: 'Get directions' },
  ]}
  onAccessibilityAction={(event) => {
    switch (event.nativeEvent.actionName) {
      case 'activate': onPress?.(); break;
      case 'save': onSave?.(spot); break;
      case 'share': handleShare(); break;
      case 'directions': handleDirections(); break;
    }
  }}
>
```

### x/pat Priority: CRITICAL
No focus management exists. Every card, list, and interactive element needs grouping and labeling.

---

## 11. Accessible Maps

### The Problem
Maps are inherently visual. react-native-maps has known accessibility issues:
- Android: Marker accessibility properties are ignored by TalkBack (react-native-maps issue #3500)
- iOS: VoiceOver can focus map but struggles with individual markers
- Pinch-to-zoom is a multi-pointer gesture with no single-pointer alternative

### Required Implementation: Alternative List View

```tsx
// ExploreScreen - add a toggle between map and list views:
const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

// Toggle button:
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel={viewMode === 'map' ? 'Switch to list view' : 'Switch to map view'}
  onPress={() => setViewMode(v => v === 'map' ? 'list' : 'map')}
>
  <Feather name={viewMode === 'map' ? 'list' : 'map'} size={20} />
</TouchableOpacity>

// List view alternative:
{viewMode === 'list' && (
  <FlatList
    data={filteredSpots}
    accessibilityRole="list"
    accessibilityLabel={`${filteredSpots.length} spots in ${activeCategory === 'all' ? 'all categories' : activeCategory}`}
    renderItem={({ item }) => (
      <SpotCard spot={item} onPress={() => openSpotDetail(item)} />
    )}
  />
)}
```

### Accessible Map Markers
```tsx
<Marker
  coordinate={spot.coordinate}
  accessibilityLabel={`${spot.name}, ${spot.category}, ${formatDistance(distance)}`}
  accessibilityHint="Double tap to view details"
>
  <View accessible={true} accessibilityRole="button">
    {/* Custom marker visual */}
  </View>
</Marker>
```

### Zoom Controls (Single-Pointer Alternative to Pinch)
```tsx
// Add + and - buttons for zoom:
<View style={styles.zoomControls}>
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel="Zoom in"
    onPress={() => {
      const newRegion = { ...region, latitudeDelta: region.latitudeDelta * 0.5, longitudeDelta: region.longitudeDelta * 0.5 };
      mapRef.current?.animateToRegion(newRegion, 300);
    }}
    style={styles.zoomButton}
  >
    <Feather name="plus" size={20} color={colors.dark.text} />
  </TouchableOpacity>
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel="Zoom out"
    onPress={() => {
      const newRegion = { ...region, latitudeDelta: region.latitudeDelta * 2, longitudeDelta: region.longitudeDelta * 2 };
      mapRef.current?.animateToRegion(newRegion, 300);
    }}
    style={styles.zoomButton}
  >
    <Feather name="minus" size={20} color={colors.dark.text} />
  </TouchableOpacity>
</View>
```

### Map Summary for Screen Readers
```tsx
// Announce map content for screen reader users:
<View
  accessible={true}
  accessibilityRole="summary"
  accessibilityLabel={`Map showing ${visibleSpots.length} spots in ${currentCity}. ${categories.join(', ')} categories visible. Use list view for full accessibility.`}
>
  <MapView ... />
</View>
```

### Cluster Accessibility
```tsx
// When a cluster is focused, announce count:
<Marker
  coordinate={cluster.coordinate}
  accessibilityLabel={`Cluster of ${cluster.count} spots. Double tap to zoom in.`}
>
```

### x/pat Priority: CRITICAL
ExploreScreen is the primary screen. An alternative list view is mandatory for accessibility. Map markers need labels. Zoom controls need buttons.

---

## 12. Accessible Forms

### Current State
AuthScreen and AddSpotScreen have form inputs with placeholder-only labels. This is a WCAG 3.3.2 failure because placeholders disappear when the user types.

### Implementation Patterns

#### Persistent Labels
```tsx
// Option 1: Visible label above input
<View>
  <Text
    nativeID="emailLabel"
    accessibilityRole="text"
    style={styles.label}
  >
    Email address
  </Text>
  <TextInput
    accessibilityLabelledBy="emailLabel"  // Android
    accessibilityLabel="Email address"    // iOS fallback
    placeholder="you@example.com"
    textContentType="emailAddress"
    autoComplete="email"
    keyboardType="email-address"
  />
</View>

// Option 2: Floating label (animation respects reduce motion)
// More complex but maintains the premium aesthetic
```

#### Error Announcements
```tsx
// CURRENT: Alert.alert('Sign Up Error', error.message)
// This works for sighted users but Alert is accessible by default on both platforms.
// For inline errors:

const [emailError, setEmailError] = useState('');

<View>
  <TextInput
    accessibilityLabel="Email address"
    accessibilityState={{ invalid: !!emailError }}
  />
  {emailError && (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={styles.errorText}
    >
      {emailError}
    </Text>
  )}
</View>
```

#### Form Group Accessibility
```tsx
// Group related inputs (DOB fields in AuthScreen):
<View
  accessible={true}
  accessibilityLabel="Date of birth"
  accessibilityHint="Enter month, day, and year"
>
  <TextInput accessibilityLabel="Month" placeholder="MM" />
  <TextInput accessibilityLabel="Day" placeholder="DD" />
  <TextInput accessibilityLabel="Year" placeholder="YYYY" />
</View>

// Actually, for DOB it's better to NOT group so users can navigate between fields:
<View>
  <Text accessibilityRole="header">Date of Birth</Text>
  <TextInput accessibilityLabel="Birth month" placeholder="MM" />
  <TextInput accessibilityLabel="Birth day" placeholder="DD" />
  <TextInput accessibilityLabel="Birth year, four digits" placeholder="YYYY" />
</View>
```

#### Focus Management on Error
```tsx
// Move focus to first error field:
const emailRef = useRef<TextInput>(null);

function handleSubmit() {
  if (!email) {
    setEmailError('Email is required');
    const node = findNodeHandle(emailRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
    return;
  }
}
```

#### AutoComplete / textContentType
```tsx
// AuthScreen inputs need these:
<TextInput textContentType="name" autoComplete="name" />           // Name
<TextInput textContentType="emailAddress" autoComplete="email" />  // Email
<TextInput textContentType="password" autoComplete="password" />   // Password (new)
<TextInput textContentType="password" autoComplete="current-password" /> // Password (existing)
```

### x/pat Priority: HIGH
AuthScreen and AddSpotScreen are critical flows. DOB fields especially need individual labels for screen reader users.

---

## 13. Accessible Modals and Bottom Sheets

### Current State
- **SpotBottomSheet**: Custom gesture-driven bottom sheet with no focus management
- **Auth/Onboarding**: Presented as modals via react-navigation
- **ReportModal**: Modal overlay
- **NomadListSheet, NeighborhoodPulseSheet**: Custom bottom sheets
- **GDPRConsent**: Overlay component

### Issues
1. No focus trapping -- screen reader can access content behind the sheet
2. No announcement when sheet opens/closes
3. Pan-to-dismiss has no button alternative
4. Background content not hidden from screen reader

### Implementation Patterns

#### Focus Trapping
```tsx
// When bottom sheet opens, hide background content:
<View
  accessibilityElementsHidden={isSheetOpen}      // iOS
  importantForAccessibility={isSheetOpen ? 'no-hide-descendants' : 'auto'}  // Android
>
  {/* Main screen content */}
</View>

// Bottom sheet:
<View
  accessible={false}
  accessibilityViewIsModal={true}  // iOS: treats this as modal, hides everything else
>
  {/* Sheet content */}
</View>
```

#### Announce Sheet State
```tsx
useEffect(() => {
  if (spot) {
    AccessibilityInfo.announceForAccessibility(`Showing details for ${spot.name}`);
    // Set focus to sheet title:
    const node = findNodeHandle(sheetTitleRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }
}, [spot]);
```

#### Dismiss Button (Alternative to Swipe-Down)
```tsx
// SpotBottomSheet needs a visible close button:
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Close spot details"
  onPress={onClose}
  style={styles.closeButton}
>
  <Feather name="x" size={20} color={colors.dark.text2} />
</TouchableOpacity>
```

#### Drag Handle Accessibility
```tsx
// The drag handle needs to be accessible:
<View
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Drag handle. Double tap to close."
  accessibilityHint="Or swipe down to dismiss"
  onAccessibilityTap={onClose}
>
  <View style={styles.dragHandle} />
</View>
```

#### GDPRConsent Overlay
```tsx
// Must trap focus when visible:
<View
  accessibilityViewIsModal={true}
  accessibilityRole="alert"
>
  <Text accessibilityRole="header">Privacy Consent</Text>
  {/* content */}
</View>
```

### x/pat Priority: HIGH
SpotBottomSheet is the primary interaction on ExploreScreen. It must be fully accessible.

---

## 14. Accessible Images

### Current State
x/pat uses images in:
- Avatar component (user profile photos)
- Spot photos (if/when added)
- Category emoji (text-based, screen reader compatible)
- Map markers (custom views)

### Implementation Patterns

#### Avatar Component
```tsx
// src/components/Avatar.tsx
<Image
  source={{ uri }}
  accessibilityRole="image"
  accessibilityLabel={`Profile photo of ${name}`}
/>

// Fallback initial:
<View
  accessibilityRole="image"
  accessibilityLabel={`${name}'s avatar`}
>
  <Text accessibilityElementsHidden={true}>{initial}</Text>
</View>
```

#### Decorative Images
```tsx
// Background images, decorative patterns:
<Image
  source={backgroundImage}
  accessibilityElementsHidden={true}
  importantForAccessibility="no-hide-descendants"
/>
```

#### Spot Photos (Future)
```tsx
// When spot images are added:
<Image
  source={{ uri: spot.imageUrl }}
  accessibilityRole="image"
  accessibilityLabel={`Photo of ${spot.name}, a ${spot.category} in ${spot.city}`}
  // OR if user-generated, require alt text at upload:
  accessibilityLabel={spot.imageAltText || `Photo of ${spot.name}`}
/>
```

#### Emoji as Information
```tsx
// Category emojis carry meaning:
<Text
  accessibilityLabel={CATEGORY_LABELS[spot.category]}
  accessibilityRole="text"
>
  {CATEGORY_EMOJI[spot.category]}
</Text>

// OR hide emoji and let the text label carry meaning:
<Text accessibilityElementsHidden={true}>{CATEGORY_EMOJI[spot.category]}</Text>
<Text accessibilityLabel={spot.category}>{spot.category}</Text>
```

### Alt Text Generation Strategy
For user-uploaded images, options:
1. Require alt text at upload time (AddSpotScreen)
2. Auto-generate alt text from spot metadata (name + category + city)
3. Future: AI-generated alt text using Vision APIs

### x/pat Priority: MEDIUM
Currently minimal image use. Priority increases when spot photos are added.

---

## 15. Accessible Chat

### Current State
DirectMessageScreen and ChatTab have no accessibility support. Messages are displayed in a FlatList with no screen reader optimization.

### Implementation Patterns

#### Message Announcements
```tsx
// Announce new incoming messages:
function renderMessage({ item }: { item: DirectMessage }) {
  const isMe = item.sender_id === user?.id;
  const senderName = isMe ? 'You' : item.profiles?.display_name;
  const time = formatTime(item.created_at);

  return (
    <View
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${senderName} said: ${item.content}. ${time}${isMe && item.read_at ? '. Read' : ''}`}
    >
      {/* Visual layout unchanged */}
    </View>
  );
}
```

#### Live Region for New Messages
```tsx
// At the bottom of the message list:
const [lastMessage, setLastMessage] = useState('');

useEffect(() => {
  if (messages.length > 0) {
    const newest = messages[messages.length - 1];
    if (newest.sender_id !== user?.id) {
      setLastMessage(`New message from ${newest.profiles?.display_name}: ${newest.content}`);
    }
  }
}, [messages]);

<View
  accessibilityLiveRegion="polite"
  accessibilityRole="status"
>
  <Text style={{ position: 'absolute', opacity: 0 }}>{lastMessage}</Text>
</View>
```

#### Read Receipts
```tsx
// The check-circle icon needs a label:
{isMe && item.read_at && (
  <View accessibilityLabel="Read">
    <Feather name="check-circle" size={10} color={colors.teal} />
  </View>
)}
```

#### Typing Indicators (Future)
```tsx
<View
  accessibilityLiveRegion="polite"
  accessibilityLabel={isTyping ? `${partnerName} is typing` : ''}
>
  {isTyping && <TypingDots />}
</View>
```

#### Send Button
```tsx
<TouchableOpacity
  onPress={handleSend}
  accessibilityRole="button"
  accessibilityLabel="Send message"
  accessibilityState={{ disabled: !text.trim() }}
  disabled={!text.trim()}
>
  <Feather name="send" size={20} />
</TouchableOpacity>
```

#### Message Input
```tsx
<TextInput
  accessibilityLabel={`Message to ${partnerName}`}
  accessibilityHint="Type your message and tap send"
  placeholder={`Message ${partnerName}...`}
/>
```

### x/pat Priority: HIGH
Chat is a core social feature. Screen reader users must be able to send/receive messages effectively.

---

## 16. Accessible Navigation

### Current State
- Tab bar (GlassTabBar): Has accessibilityRole, accessibilityState, and accessibilityLabel -- best component in the app
- Stack navigator: headerShown: false on all screens, so no back button announcements
- No screen titles announced on navigation

### Implementation Patterns

#### Tab Bar (Already Partial -- Enhance)
```tsx
// Current GlassTabBar is already the best component. Enhance:
<TouchableOpacity
  accessibilityRole="tab"                        // Changed from "button" to "tab"
  accessibilityState={{
    selected: isFocused,
  }}
  accessibilityLabel={`${label} tab, ${isFocused ? 'selected' : 'not selected'}`}
  accessibilityHint={`Double tap to switch to ${label}`}
>
```

#### Tab Bar Container
```tsx
<View
  accessibilityRole="tablist"
  accessibilityLabel="Main navigation"
  style={styles.tabRow}
>
  {/* tab buttons */}
</View>
```

#### Screen Titles for Screen Readers
Even with headerShown: false, you should announce screen transitions:
```tsx
// In each screen:
useEffect(() => {
  AccessibilityInfo.announceForAccessibility('Explore screen');
}, []);

// Or use navigation listener:
useFocusEffect(
  useCallback(() => {
    AccessibilityInfo.announceForAccessibility('Explore screen');
  }, [])
);
```

#### Back Navigation
```tsx
// For screens without a header, add an accessible back button:
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Go back"
  onPress={() => navigation.goBack()}
  style={styles.backButton}
>
  <Feather name="arrow-left" size={22} />
</TouchableOpacity>
```

#### Stack Screen Options
```tsx
// Even with custom headers, provide screen titles for screen readers:
<Stack.Screen
  name="SpotDetail"
  component={SpotDetailScreen}
  options={{
    title: 'Spot Details', // Announced by screen reader even if header hidden
  }}
/>
```

### x/pat Priority: HIGH
GlassTabBar is a strong foundation. Stack navigation needs screen title announcements.

---

## 17. Accessible Onboarding

### Current State
OnboardingScreen has 3 steps with animations, interactive pills, and city cards. No accessibility support.

### Implementation Patterns

#### Step Progress Announcements
```tsx
// Announce step changes:
useEffect(() => {
  const stepLabels = ['Welcome to x/pat', 'Select your interests', 'Choose your city'];
  AccessibilityInfo.announceForAccessibility(
    `Step ${step + 1} of 3: ${stepLabels[step]}`
  );
}, [step]);
```

#### Step Indicators (Dots)
```tsx
// Current dots are visual-only:
<View style={styles.dots}>
  {[0, 1, 2].map((i) => (
    <View
      key={i}
      style={[styles.dot, step === i && styles.dotActive]}
    />
  ))}
</View>

// Accessible version:
<View
  accessible={true}
  accessibilityRole="progressbar"
  accessibilityLabel={`Step ${step + 1} of 3`}
  accessibilityValue={{ min: 1, max: 3, now: step + 1 }}
  style={styles.dots}
>
  {/* Visual dots unchanged */}
</View>
```

#### Skip Option
```tsx
// WCAG best practice: allow skipping onboarding:
<TouchableOpacity
  accessibilityRole="button"
  accessibilityLabel="Skip onboarding"
  onPress={async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    navigation.replace('Auth');
  }}
>
  <Text>Skip</Text>
</TouchableOpacity>
```

#### Vibe Pills as Accessible Checkboxes
```tsx
<TouchableOpacity
  accessibilityRole="checkbox"
  accessibilityState={{ checked: isSelected }}
  accessibilityLabel={`${vibe} interest`}
>
```

#### City Cards as Radio Buttons
```tsx
<TouchableOpacity
  accessibilityRole="radio"
  accessibilityState={{ selected: isSelected }}
  accessibilityLabel={`${city.name}, ${city.spots} spots available`}
>
```

### x/pat Priority: HIGH
Onboarding is the first experience. If it's inaccessible, users with disabilities cannot even start using the app.

---

## 18. Accessible Search

### Current State
SearchBar has no accessibility labels. Clear button has a tiny touch target. No voice input support.

### Implementation Patterns

#### Search Input
```tsx
<TextInput
  accessibilityRole="search"
  accessibilityLabel="Search spots"
  accessibilityHint="Type to search for spots, then press return to search"
  placeholder="Search spots..."
/>
```

#### Clear Button
```tsx
<TouchableOpacity
  onPress={handleClear}
  accessibilityRole="button"
  accessibilityLabel="Clear search"
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  style={styles.clearButton}
>
```

#### Search Results Announcement
```tsx
// After search completes:
useEffect(() => {
  if (searchResults !== null) {
    AccessibilityInfo.announceForAccessibility(
      searchResults.length === 0
        ? 'No spots found'
        : `${searchResults.length} spots found`
    );
  }
}, [searchResults]);
```

#### Voice Input
React Native supports voice input via the system keyboard (iOS dictation, Android voice typing). Ensure:
- `returnKeyType="search"` is set (already done)
- Search works with voice-typed input (special characters, etc.)

#### Search Suggestions
```tsx
// If implementing search suggestions:
<FlatList
  data={suggestions}
  accessibilityRole="list"
  accessibilityLabel="Search suggestions"
  renderItem={({ item }) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Search for ${item}`}
    >
      <Text>{item}</Text>
    </TouchableOpacity>
  )}
/>
```

### x/pat Priority: MEDIUM
Search is important but not the primary interaction pattern currently.

---

## 19. Accessible Notifications

### Current State
expo-notifications is configured. No accessibility integration for notification content.

### Implementation Patterns

#### Badge Count Announcements
```tsx
// When tab bar shows badge:
<View
  accessible={true}
  accessibilityRole="tab"
  accessibilityLabel={`Home tab${unreadCount > 0 ? `, ${unreadCount} new notifications` : ''}`}
>
```

#### In-App Notification Banners
```tsx
// Toast/banner notifications must be announced:
<Animated.View
  accessibilityRole="alert"
  accessibilityLiveRegion="assertive"
  accessibilityLabel={`Notification: ${notificationText}`}
>
  <Text>{notificationText}</Text>
</Animated.View>
```

#### Push Notification Content
```tsx
// Ensure notification body contains full context:
// BAD: "New message"
// GOOD: "New message from Alex: Hey, are you at the coworking space?"
```

### x/pat Priority: MEDIUM
Notifications aren't the primary flow but are important for social features.

---

## 20. Accessible Gestures

### Current State
x/pat uses several gesture-only interactions with no alternatives:
- **SwipeCardDeck**: Swipe left/right/up to interact with cards
- **SpotBottomSheet**: Pan down to dismiss
- **SwipeableRow**: Swipe to reveal actions
- **AnimatedPressable**: Long press for secondary action
- **Map**: Pinch to zoom, pan to move

### WCAG Requirements
- **2.5.1 Pointer Gestures** (A): All multi-point and path-based gestures must have single-pointer alternatives
- **2.5.7 Dragging Movements** (AA): All dragging must have single-pointer alternatives

### Implementation Patterns

#### SwipeCardDeck Button Alternatives
```tsx
// Add explicit buttons below the card deck:
<View style={styles.actionButtons}>
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel="Skip"
    onPress={() => deckRef.current?.swipeLeft()}
    style={styles.skipButton}
  >
    <Feather name="x" size={24} color={colors.red} />
  </TouchableOpacity>

  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel="Interested"
    onPress={() => deckRef.current?.swipeRight()}
    style={styles.likeButton}
  >
    <Feather name="heart" size={24} color={colors.green} />
  </TouchableOpacity>

  <TouchableOpacity
    accessibilityRole="button"
    accessibilityLabel="Super interested"
    onPress={() => deckRef.current?.swipeUp()}
    style={styles.superButton}
  >
    <Feather name="star" size={24} color={colors.teal} />
  </TouchableOpacity>
</View>
```

#### SwipeableRow Accessible Actions
```tsx
// Instead of swipe-only actions, provide via custom accessibility actions:
<View
  accessible={true}
  accessibilityActions={[
    { name: 'delete', label: 'Delete' },
    { name: 'archive', label: 'Archive' },
  ]}
  onAccessibilityAction={(event) => {
    switch (event.nativeEvent.actionName) {
      case 'delete': handleDelete(); break;
      case 'archive': handleArchive(); break;
    }
  }}
>
```

#### Long Press Alternatives
```tsx
// AnimatedPressable uses long press for secondary actions.
// Provide the same action via accessibility custom actions:
<AnimatedPressable
  onPress={handlePrimary}
  onLongPress={handleSecondary}
  accessible={true}
  accessibilityActions={[
    { name: 'activate', label: 'Open' },
    { name: 'longpress', label: 'Show options' },
  ]}
  onAccessibilityAction={(event) => {
    if (event.nativeEvent.actionName === 'longpress') handleSecondary();
    else handlePrimary();
  }}
>
```

#### Map Gesture Alternatives
See Section 11 for zoom buttons and list view alternatives.

### x/pat Priority: CRITICAL
SwipeCardDeck is completely inaccessible without button alternatives. This is a hard blocker.

---

## 21. Accessible Dark Mode

### Current State
x/pat is dark-mode-only. This simplifies some concerns but creates others.

### Issues and Solutions

#### 1. Pure Dark Mode with No Light Alternative
- Some users with certain visual conditions (cataracts, astigmatism) find dark text on light backgrounds easier to read
- Consider adding a light mode or high-contrast mode in Settings as a future enhancement
- Not a legal requirement at AA level, but good practice

#### 2. OLED Considerations (Already Good)
- `dark.bg0: '#0F0F11'` -- not pure black, avoids OLED smearing
- `dark.bg: '#1C1C1E'` -- follows Apple's recommended dark gray
- No pure `#000000` found in the theme

#### 3. Contrast in Glass Elements
The glass aesthetic (`rgba(255,255,255,0.06-0.15)`) creates surfaces that are:
- Nearly invisible against the dark background
- Fail WCAG 1.4.11 non-text contrast requirements
- Require strengthening borders or using solid fallbacks

#### 4. System Dark Mode Respect
Even though x/pat is always dark, it should use `useColorScheme()` to detect system preference and potentially offer:
```tsx
import { useColorScheme } from 'react-native';

// In settings, allow override:
// "Theme: Dark (default) | Light | System"
```

#### 5. High Contrast Mode
```tsx
// Detect iOS high contrast preference:
import { AccessibilityInfo } from 'react-native';

const [highContrast, setHighContrast] = useState(false);
useEffect(() => {
  // iOS only:
  AccessibilityInfo.isHighContrastEnabled?.()?.then(setHighContrast);
}, []);

// Apply stronger borders when high contrast is active:
const borderColor = highContrast ? colors.a11y.glassBorder : colors.glass.border;
```

### x/pat Priority: MEDIUM
Dark mode execution is decent. Glass contrast is the main issue (covered in Section 8). Light mode would be a future enhancement.

---

## 22. Testing with Assistive Technology

### VoiceOver Testing (iOS)

#### Setup
1. Settings > Accessibility > VoiceOver > ON
2. Practice Zone: Settings > Accessibility > VoiceOver > VoiceOver Practice

#### Test Script for x/pat
1. **Onboarding flow**: Navigate all 3 steps using only VoiceOver gestures
2. **Auth flow**: Complete sign-up using VoiceOver (all form fields)
3. **Explore/Map screen**: Can you find spots? Can you access spot details?
4. **Tab navigation**: Switch between all 3 tabs
5. **Profile screen**: Read profile info, access settings
6. **Chat**: Send and receive a message
7. **Search**: Perform a search, review results
8. **Bottom sheet**: Open and close a spot detail sheet

#### VoiceOver Gestures
| Gesture | Action |
|---------|--------|
| Swipe right | Next element |
| Swipe left | Previous element |
| Double-tap | Activate |
| Three-finger swipe up | Scroll down |
| Two-finger double-tap | Magic tap (context action) |
| Two-finger Z | Escape / go back |
| Swipe up then down | Use custom action |

### TalkBack Testing (Android)

#### Setup
1. Settings > Accessibility > TalkBack > ON
2. Tutorial: Settings > Accessibility > TalkBack > Settings > Tutorial

#### Additional TalkBack Gestures
| Gesture | Action |
|---------|--------|
| Swipe right | Next element |
| Swipe left | Previous element |
| Double-tap | Activate |
| Swipe down then right | Global context menu |
| Swipe up then right | Local context menu |
| Two-finger swipe down | Scroll down |

### Switch Control Testing (iOS)

#### Setup
1. Settings > Accessibility > Switch Control > ON
2. Add a switch: Settings > Accessibility > Switch Control > Switches
3. Test with "Move To Next Item" switch

#### Key Tests
- Can every interactive element be reached via single-switch scanning?
- Are groups properly defined to reduce switch presses?
- Can modals and sheets be dismissed?

### Keyboard Testing

#### External Bluetooth Keyboard
1. Tab key: Move focus forward
2. Shift+Tab: Move focus backward
3. Return/Enter: Activate focused element
4. Escape: Dismiss/go back
5. Arrow keys: Navigate within lists and menus

### Testing Frequency
- **Every PR**: Quick VoiceOver swipe-through of changed screens
- **Every release**: Full test script on iOS and Android
- **Quarterly**: Switch Control and keyboard testing
- **Annually**: Professional accessibility audit

### x/pat Priority: HIGH
Must establish testing process before implementing fixes, to verify each fix works.

---

## 23. Automated Accessibility Testing Tools

### Static Analysis (During Development)

#### axe Accessibility Linter (VSCode Extension)
- Free extension from Deque
- Catches missing accessibilityLabel, accessibilityRole issues
- Now includes React Native-specific rules (added 2025)
- Install: `ext install deque-systems.vscode-axe-linter`

#### ESLint Plugin: eslint-plugin-react-native-a11y
```bash
npm install --save-dev eslint-plugin-react-native-a11y
```
```json
// .eslintrc.json
{
  "plugins": ["react-native-a11y"],
  "extends": ["plugin:react-native-a11y/all"]
}
```
Rules include:
- `has-accessibility-props`: Touchables must have accessibility props
- `no-nested-touchables`: Prevents nested touchable elements
- `has-valid-accessibility-role`: Valid roles only

### Runtime Testing

#### React Native Accessibility Engine
```bash
npm install --save-dev react-native-accessibility-engine
```
```tsx
// In test files:
import { check } from 'react-native-accessibility-engine';
import { render } from '@testing-library/react-native';

test('SpotCard is accessible', () => {
  const { container } = render(<SpotCard spot={mockSpot} />);
  const failures = check(container);
  expect(failures).toEqual([]);
});
```

### On-Device Testing

#### iOS: Accessibility Inspector (Xcode)
- Built into Xcode, free
- Audit tab: Automated scan of current screen
- Inspection: Click any element to see accessibility properties
- Run on simulator or real device

#### Android: Accessibility Scanner
- Free app from Google Play
- Tap the floating button on any screen
- Reports: touch target size, contrast, labels
- Exportable results

#### Deque axe DevTools Mobile
- Professional tool, subscription-based
- Supports React Native apps directly
- Tests WCAG 2.2 criteria including touch target spacing
- Integrates with CI/CD via Appium

### CI/CD Integration

#### Jest Accessibility Tests
```tsx
// __tests__/accessibility/AuthScreen.test.tsx
import { render } from '@testing-library/react-native';
import AuthScreen from '../../src/screens/AuthScreen';

describe('AuthScreen Accessibility', () => {
  it('all inputs have labels', () => {
    const { getAllByRole } = render(<AuthScreen />);
    const inputs = getAllByRole('textbox');
    inputs.forEach(input => {
      expect(
        input.props.accessibilityLabel || input.props['aria-label']
      ).toBeTruthy();
    });
  });

  it('all buttons have labels', () => {
    const { getAllByRole } = render(<AuthScreen />);
    const buttons = getAllByRole('button');
    buttons.forEach(button => {
      expect(
        button.props.accessibilityLabel || button.props['aria-label']
      ).toBeTruthy();
    });
  });
});
```

### Recommended Tool Stack for x/pat
1. **axe Linter** (VSCode) -- free, immediate feedback while coding
2. **eslint-plugin-react-native-a11y** -- catches issues in CI
3. **react-native-accessibility-engine** -- unit test assertions
4. **Accessibility Inspector** (Xcode) -- iOS audit each release
5. **Accessibility Scanner** (Google) -- Android audit each release

### x/pat Priority: HIGH
Install ESLint plugin and axe Linter immediately. These catch issues before they ship.

---

## 24. Accessibility Statement and Documentation

### Legal Requirements
- **EAA**: Requires an accessibility statement for all digital services
- **ADA**: No explicit requirement but strongly recommended as evidence of good faith
- **EN 301 549**: Section 12.2 requires accessibility documentation

### What to Publish

#### Accessibility Statement (Required for EAA)
Create a screen accessible from Settings:

```
ACCESSIBILITY STATEMENT

x/pat is committed to making our app accessible to everyone, including people
with disabilities.

STANDARDS
We aim to conform to WCAG 2.2 Level AA and EN 301 549.

CURRENT STATUS
[List known accessibility features]
- VoiceOver and TalkBack screen reader support
- Dynamic text sizing support
- Reduced motion support
- High contrast color scheme
- Alternative list view for map content

KNOWN LIMITATIONS
[Honest disclosure of known issues]
- Map markers may not be fully accessible on Android TalkBack
- [Other known issues]

FEEDBACK
If you encounter accessibility barriers, please contact us:
Email: accessibility@xpat.social
Response time: Within 5 business days

ENFORCEMENT
EU residents may file complaints with their national enforcement body
under the European Accessibility Act.

Last updated: [date]
```

#### Where to Publish
1. In-app: Settings > Accessibility Statement
2. App Store / Play Store listing: Mention accessibility features
3. Website (xpat.social): Dedicated /accessibility page
4. App Store metadata: Use Apple's new Accessibility Nutrition Labels

### Apple Accessibility Nutrition Labels (2025-2026)
Apple is introducing "Accessibility Nutrition Labels" in the App Store:
- VoiceOver support
- Larger Text support
- Sufficient Contrast
- Captions
- Voice Control
- Reduced Motion

x/pat should aim to check ALL of these boxes before launch.

### x/pat Priority: MEDIUM
Write and publish the statement after implementing core accessibility features. The statement itself is quick work; the features it describes are the real effort.

---

## 25. Accessibility Roadmap

### Phase 1: Foundation (Week 1-2) -- CRITICAL
*Estimated effort: 3-4 days of focused work*

1. **Install react-native-ama/core** for accessibility context and enforcement
2. **Add ReducedMotionConfig** at app root (1 line, fixes all Reanimated animations)
3. **Install eslint-plugin-react-native-a11y** to catch future issues
4. **Fix color contrast**: Update dark.text3, glass borders, input borders in theme
5. **Add accessibilityRole="header"** to all heading Text elements (30+ instances)
6. **Add accessibilityLabel to all TouchableOpacity/Pressable** components (100+ instances)
7. **Add accessibilityRole="button"** to all interactive elements
8. **Fix touch target sizes**: Add hitSlop to small buttons (SearchBar clear, etc.)

### Phase 2: Core Screens (Week 3-4) -- HIGH
*Estimated effort: 5-6 days*

9. **ExploreScreen**: Add list view alternative to map, zoom buttons, marker labels
10. **AuthScreen**: Add persistent form labels, textContentType, error announcements
11. **OnboardingScreen**: Step announcements, skip option, checkbox/radio roles
12. **SpotBottomSheet**: Focus trapping, close button, accessibilityViewIsModal
13. **GlassTabBar**: Change role to "tab", add tablist container
14. **ChatScreen/DirectMessageScreen**: Message labels, new message announcements, send button label
15. **SearchBar**: Labels, clear button hitSlop, result count announcements
16. **SwipeCardDeck**: Add button alternatives for swipe actions

### Phase 3: Complete Coverage (Week 5-6) -- HIGH
*Estimated effort: 5-6 days*

17. **All remaining screens**: ProfileScreen, SettingsScreen, SpotDetailScreen, etc.
18. **Dynamic Type support**: Verify layouts at 200% font scale, add maxFontSizeMultiplier
19. **Navigation announcements**: Screen title announcements on every transition
20. **Focus management**: Set focus on screen entry and modal open/close
21. **Custom accessibility actions**: SpotCard, EventCard, connection buttons
22. **Hide decorative elements**: Glass overlays, glow dots, gradient backgrounds

### Phase 4: Polish and Testing (Week 7-8) -- MEDIUM
*Estimated effort: 3-4 days*

23. **Full VoiceOver test pass**: Every screen, every flow
24. **Full TalkBack test pass**: Every screen, every flow
25. **External keyboard testing**: Tab navigation through entire app
26. **Accessibility statement**: Write and add to Settings screen
27. **Apple Accessibility Nutrition Labels**: Configure for App Store
28. **Fix any issues found** during testing

### Phase 5: Continuous (Ongoing) -- STANDARD
29. **Automated testing in CI**: eslint a11y rules + unit tests
30. **Manual testing each release**: VoiceOver + TalkBack
31. **Accessibility feedback channel**: In-app + email
32. **Quarterly audits**: Professional or semi-professional
33. **Feature parity**: Every new feature ships with accessibility

### Total Estimated Effort
- **Phase 1-2**: 8-10 days (critical path to basic compliance)
- **Phase 3-4**: 8-10 days (full compliance)
- **Phase 5**: Ongoing process

---

## 26. react-native-ama Library

### Overview
React Native AMA (Accessible Mobile App) is an open-source library from NearForm (formerly Formidable). Version 1.0 (January 2025) is modular and fully Expo-compatible.

### Packages

| Package | Purpose | Priority for x/pat |
|---------|---------|-------------------|
| `@react-native-ama/core` | Context provider, hooks, utilities | INSTALL FIRST |
| `@react-native-ama/react-native` | Accessible replacements for RN components | HIGH |
| `@react-native-ama/forms` | Accessible form components | HIGH |
| `@react-native-ama/animations` | Motion-safe animation wrappers | MEDIUM |
| `@react-native-ama/extras` | Carousel, expandable, bottom sheet | MEDIUM |
| `@react-native-ama/lists` | Accessible FlatList/SectionList | HIGH |
| `@react-native-ama/internal` | Shared internal utilities | Auto-installed |

### Installation
```bash
npx expo install @react-native-ama/core @react-native-ama/react-native @react-native-ama/forms @react-native-ama/lists
```

### Setup
```tsx
// App.tsx
import { AMAProvider } from '@react-native-ama/core';

export default function App() {
  return (
    <AMAProvider>
      <AppNavigator />
    </AMAProvider>
  );
}
```

### Key Features

#### Development-Time Accessibility Enforcement
In development mode, AMA shows a banner when accessibility violations are detected:
- Missing accessibility labels
- Missing accessibility roles
- Incorrect component usage
- Form fields without labels

#### Accessible Pressable
```tsx
import { Pressable } from '@react-native-ama/react-native';

// This Pressable enforces accessibilityRole and accessibilityLabel:
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Save spot"
  onPress={handleSave}
>
  <Text>Save</Text>
</Pressable>
```

#### Accessible TextInput
```tsx
import { TextInput } from '@react-native-ama/forms';

// Automatically associates label, handles error states:
<TextInput
  labelComponent={<Text>Email</Text>}
  accessibilityLabel="Email address"
  errorText={emailError}
  // Error is automatically announced via live region
/>
```

#### Accessible Carousel (for Onboarding)
```tsx
import { Carousel } from '@react-native-ama/extras';

// Replacement for manual onboarding steps:
<Carousel
  data={onboardingSteps}
  accessibilityLabel="Onboarding"
  renderItem={({ item }) => <OnboardingStep {...item} />}
/>
```

### Why Use AMA vs. Manual Implementation
- **Enforcement at development time**: Catches issues before they ship
- **Consistent patterns**: Team-wide accessibility standards
- **Less boilerplate**: Common patterns built-in
- **Expo compatible**: No native module linking required
- **Maintained by NearForm**: Active development, regular updates

### x/pat Priority: HIGH
Install `@react-native-ama/core` as the first step. It provides immediate feedback on accessibility violations during development without changing any existing code.

---

## 27. Inclusive Design for Travel

### Market Opportunity
- **$58.2 billion** spent annually by travelers with mobility disabilities in the US alone
- Travelers with disabilities take approximately the same number of trips as those without
- **15-20% of the global population** lives with some form of disability
- Aging digital nomad population creates growing need

### Travel Accessibility Data

#### Existing Platforms to Learn From
- **Wheel the World**: 200+ accessibility criteria for evaluating locations
- **AccessNow**: Crowdsourced accessibility ratings for places
- **iAccessLife**: 10,000+ locations rated for accessibility in 50 states, 30+ countries
- **Google Maps**: Wheelchair accessible places filter

#### Spot Accessibility Metadata
```tsx
// Future schema addition for spots:
interface SpotAccessibility {
  wheelchair_accessible: 'yes' | 'no' | 'partial' | 'unknown';
  accessible_restroom: boolean | null;
  step_free_entrance: boolean | null;
  elevator: boolean | null;
  braille_signage: boolean | null;
  hearing_loop: boolean | null;
  service_animal_friendly: boolean | null;
  quiet_space: boolean | null;  // For sensory needs
  accessible_parking: boolean | null;
  notes: string;  // Free-text accessibility notes
}
```

#### Displaying Accessibility Info
```tsx
// On SpotCard and SpotDetail:
{spot.wheelchair_accessible === 'yes' && (
  <View accessibilityLabel="Wheelchair accessible">
    <Text>♿ Wheelchair Accessible</Text>
  </View>
)}
```

#### Crowdsourced Accessibility Reviews
Allow users to add accessibility information about spots:
- "Was this place wheelchair accessible?" (yes/no/partial)
- "Step-free entrance?" (yes/no)
- Free-text accessibility notes

### Digital Nomads with Disabilities
- **Coworking accessibility**: Elevator access, adjustable desks, quiet rooms
- **Coliving accessibility**: Accessible bedrooms, bathrooms
- **Visa accessibility**: Some nomad visas don't accommodate medical equipment
- **Transport**: Accessible public transit info per city

### x/pat Priority: MEDIUM (future feature)
This is a significant product differentiator. No competitor provides crowdsourced accessibility data for digital nomad destinations. Implement after core accessibility is in place.

---

## 28. Cognitive Accessibility

### WCAG Guidelines
- **3.1.5 Reading Level** (AAA): Write for lower secondary education level
- **3.2.3 Consistent Navigation** (AA): Same order across screens
- **3.3.2 Labels or Instructions** (A): Clear labels on inputs
- **3.3.7 Redundant Entry** (A): Don't ask for same info twice

### Implementation for x/pat

#### Plain Language
```
// BAD:
"Authenticate your credentials to proceed"
"Toggle geospatial data visualization"

// GOOD:
"Sign in to your account"
"Switch to list view"
```

x/pat's current copy is already mostly plain language. The onboarding uses "What are you looking for?" and "Where are you now?" which are excellent.

#### Consistent Navigation Patterns
- Tab bar is consistent across all screens (PASS)
- Back navigation should always be in the same position
- Action buttons (save, share, etc.) should follow consistent placement

#### Memory Aids
```tsx
// Show recently viewed spots:
<Section title="Recently Viewed">
  <FlatList data={recentSpots} />
</Section>

// Save search preferences:
// Already done via AsyncStorage in onboarding
```

#### Reduce Cognitive Load
- Limit choices: Show 3 cities in onboarding, not 50 (already done)
- Progressive disclosure: Bottom sheet shows key info, "View Details" for more (already done)
- Clear error messages: "Email is required" not "Error 422: Validation failed"

#### Reading Order
- Ensure content flows logically when read top-to-bottom
- Group related information (spot name + location + description)
- Separate distinct sections with clear headings

### x/pat Priority: MEDIUM
x/pat's UI is already fairly clean and simple. Main work is adding form labels and consistent patterns.

---

## 29. Multilingual Accessibility

### Current State
x/pat is English-only. However, the user base is digital nomads worldwide.

### Screen Reader Language
- VoiceOver uses the device language to pronounce text
- If app content is in English but device is set to Japanese, VoiceOver will mispronounce English text
- Set the language attribute:
```tsx
// On the root view:
<View accessibilityLanguage="en">
  {/* App content */}
</View>
```

### RTL (Right-to-Left) Support
For future Arabic, Hebrew, Farsi support:
```tsx
import { I18nManager } from 'react-native';

// Enable RTL:
I18nManager.forceRTL(true);
// Requires app restart in most cases

// In Expo, configure in app.json:
{
  "expo": {
    "extra": {
      "supportsRTL": true
    }
  }
}
```

#### RTL Layout Considerations
- `flexDirection: 'row'` automatically reverses in RTL
- `marginLeft` and `marginRight` need `marginStart` and `marginEnd` equivalents
- Icons may need mirroring (back arrow, etc.)
- Tab bar order reverses automatically

### Internationalization (i18n) Setup
```bash
npx expo install i18next react-i18next expo-localization
```
```tsx
import * as Localization from 'expo-localization';
import i18n from 'i18next';

i18n.init({
  lng: Localization.locale,
  fallbackLng: 'en',
  resources: {
    en: { translation: { /* ... */ } },
    es: { translation: { /* ... */ } },
  },
});
```

### Accessibility Labels in Multiple Languages
```tsx
// Labels must be translated:
<TouchableOpacity
  accessibilityLabel={t('navigation.home_tab')}
  accessibilityRole="tab"
>
```

### x/pat Priority: LOW (future)
English-only for MVP. Set `accessibilityLanguage="en"` now. Full i18n is a future feature.

---

## 30. Accessibility as Competitive Advantage

### App Store Featuring

#### Apple App Store
- Apple's new **Accessibility Nutrition Labels** will surface accessible apps in search
- Apps supporting VoiceOver, Dynamic Type, Reduce Motion, and Sufficient Contrast get labeled
- Apple actively features accessible apps during Global Accessibility Awareness Day (third Thursday of May) and regularly throughout the year
- Apps in the "Accessibility" category have lower competition

#### Google Play
- Play Store accessibility badges for apps meeting accessibility standards
- Featured in "Made for Everyone" and accessibility collections
- Google rates apps on accessibility in vitals reports

### Competitive Analysis
No major travel social app currently excels at accessibility:
- **Nomad List**: Web-only, limited accessibility
- **Couchsurfing**: Basic accessibility, no standout features
- **Hostelworld**: Improving but not comprehensive
- **Google Maps**: Good accessibility but not a social platform
- **Wheel the World**: Accessible AND focused on accessibility data -- different market

x/pat has an opportunity to be **the most accessible social travel app** in any app store.

### Business Benefits
1. **Legal protection**: Proactive compliance prevents lawsuits ($10K-$150K each)
2. **EU market access**: EAA compliance required for App Store listing in EU
3. **User loyalty**: 71% of disabled users leave websites with accessibility barriers; accessible apps earn fierce loyalty
4. **Market expansion**: 15-20% of global population has a disability
5. **SEO/ASO**: Accessibility features improve app store ranking signals
6. **Brand reputation**: "Free for life AND accessible to everyone" is a powerful brand message
7. **Investor appeal**: ESG-conscious investors value accessibility
8. **Press coverage**: Accessible travel apps regularly get media coverage

### Marketing Angles
- "Your world, shared -- with everyone"
- Accessibility as a core value, not an afterthought
- Partner with disability travel organizations for launch PR
- Submit for Apple's accessibility featuring program
- Blog series on building an accessible travel app (developer PR)

### Cost of Inaction vs Action
| | Proactive Accessibility | Reactive (Post-Lawsuit) |
|---|---|---|
| Implementation cost | 8-10 weeks of work | Same work + legal fees |
| Legal cost | $0 | $10,000 - $150,000 per lawsuit |
| Time to market | +2-4 weeks | +6-12 months (legal delays) |
| Brand impact | Positive | Negative |
| EU launch | Enabled | Blocked |

### x/pat Priority: This IS the priority
Accessibility is not a feature. It is a fundamental quality of the product. Every section of this document serves x/pat's mission, legal compliance, and competitive position.

---

## Summary of Critical Findings

### Immediate Actions (This Week)
1. Install `@react-native-ama/core` and wrap app in `<AMAProvider>`
2. Add `<ReducedMotionConfig mode={ReduceMotion.System}>` at app root
3. Fix `dark.text3` color from `#636366` to `#8E8E93`
4. Install `eslint-plugin-react-native-a11y`

### Before Next TestFlight Build
5. Add `accessibilityLabel` and `accessibilityRole` to every interactive element
6. Add `accessibilityRole="header"` to all heading text
7. Add list view alternative to ExploreScreen map
8. Add button alternatives to SwipeCardDeck
9. Fix form labels in AuthScreen (persistent labels, not placeholder-only)
10. Add `accessibilityViewIsModal` to SpotBottomSheet
11. Add hitSlop to all small touch targets
12. Increase glass border opacity for non-text contrast compliance

### Files Requiring the Most Work
| File | Issues | Priority |
|------|--------|----------|
| ExploreScreen.tsx | Map accessibility, markers, list view | CRITICAL |
| AuthScreen.tsx | Form labels, error handling, DOB fields | CRITICAL |
| OnboardingScreen.tsx | Step announcements, roles, skip option | CRITICAL |
| SpotBottomSheet.tsx | Focus trap, dismiss button, modal role | CRITICAL |
| SwipeCardDeck.tsx | Button alternatives for gestures | CRITICAL |
| SpotCard.tsx | Grouped labels, custom actions | HIGH |
| DirectMessageScreen.tsx | Message labels, send button, live region | HIGH |
| ChatScreen.tsx | Connection actions, profile labels | HIGH |
| SearchBar.tsx | Input label, clear button, result count | HIGH |
| AnimatedPressable.tsx | Accessibility role forwarding, actions | HIGH |
| GlassTabBar.tsx | Change to tab role, add tablist | MEDIUM (already partial) |
| All remaining screens | Labels, headings, focus management | HIGH |

### Legal Compliance Status
| Regulation | Current Status | Required By |
|-----------|---------------|-------------|
| WCAG 2.2 AA | ~35 failures out of 50 criteria | Industry standard |
| EAA (EN 301 549) | Non-compliant | June 28, 2025 (already past) |
| ADA Title III | Non-compliant | Now (no deadline, civil law) |
| ADA Title II | N/A (not government) | April 24, 2026 |
| Apple A11y Labels | Cannot qualify | App Store feature |

---

## Sources

- [WCAG 2.2 Checklist: Complete 2026 Compliance Guide - Level Access](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/)
- [Guidance on Applying WCAG 2.2 to Mobile Applications (WCAG2Mobile) - W3C](https://www.w3.org/TR/wcag2mobile-22/)
- [WCAG 2.2 Checklist 2026: All 87 Criteria Explained - Web Accessibility Checker](https://web-accessibility-checker.com/en/blog/wcag-2-2-checklist-2026)
- [Mobile Accessibility Checklist - MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Mobile_accessibility_checklist)
- [European Accessibility Act (EAA) - European Commission](https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/european-accessibility-act-eaa_en)
- [European Accessibility Act 2026: EAA Compliance Guide - Level Access](https://www.levelaccess.com/compliance-overview/european-accessibility-act-eaa/)
- [European Accessibility Act: Ensuring Mobile App Compliance - Scanbot](https://scanbot.io/blog/european-accessibility-act-2025/)
- [2026 ADA Website Compliance Predictions - Accessible.org](https://accessible.org/2026-ada-website-compliance-lawsuits-ai/)
- [ADA Web Lawsuit Trends for 2026 - UsableNet](https://blog.usablenet.com/ada-web-lawsuit-trends-2026)
- [ADA Lawsuit Statistics 2025-2026 - WCAGSafe](https://wcagsafe.com/blog/ada-lawsuit-statistics)
- [Accessibility - React Native Documentation](https://reactnative.dev/docs/accessibility)
- [React Native Accessibility Best Practices: 2025 Guide](https://www.accessibilitychecker.org/blog/react-native-accessibility/)
- [How to Support Screen Readers in React Native](https://oneuptime.com/blog/post/2026-01-15-react-native-screen-reader-support/view)
- [React Native AMA - NearForm](https://nearform.com/open-source/react-native-ama/)
- [Introducing NearForm's Modular Expo-Ready React Native AMA](https://nearform.com/digital-community/introducing-nearforms-new-modular-expo-ready-react-native-ama/)
- [Accessibility - React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)
- [useReducedMotion - React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/)
- [ReducedMotionConfig - React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/device/ReducedMotionConfig/)
- [AccessibilityInfo - React Native](https://reactnative.dev/docs/accessibilityinfo)
- [Text Component - React Native](https://reactnative.dev/docs/text)
- [Color Contrast Accessibility: WCAG 2025 Guide - AllAccessible](https://www.allaccessible.org/blog/color-contrast-accessibility-wcag-guide-2025)
- [Testing Color Contrast in Mobile Apps - Deque](https://www.deque.com/blog/testing-color-contrast-in-mobile-apps/)
- [Dark Mode Done Right: Best Practices for 2026](https://medium.com/@social_7132/dark-mode-done-right-best-practices-for-2026-c223a4b92417)
- [react-native-maps Issue #3500: Android Marker Accessibility](https://github.com/react-native-maps/react-native-maps/issues/3500)
- [Accessibility Announcement on React Native - Appt](https://appt.org/en/docs/react-native/samples/accessibility-announcement)
- [BottomSheetModal Accessibility Issues - gorhom/react-native-bottom-sheet](https://github.com/gorhom/react-native-bottom-sheet/issues/687)
- [axe DevTools for React Native - Deque](https://docs.deque.com/devtools-mobile/2025.7.2/en/react-native/)
- [React Native Accessibility Engine - GitHub](https://github.com/aryella-lacerda/react-native-accessibility-engine)
- [Accessible Travel - Wheel the World](https://wheeltheworld.com/accessible-travel)
- [Accessible Travel with Technology - Southeast ADA Center](https://adasoutheast.org/these-apps-help-people-with-disabilities-travel-more-easily/)
- [Implementing RTL Support in Expo - GeekyAnts](https://geekyants.com/blog/implementing-right-to-left-rtl-support-in-expo-without-restarting-the-app)
- [Apple Accessibility Nutrition Labels - Engadget](https://www.engadget.com/apps/apple-is-bringing-accessibility-labels-to-the-app-store-later-this-year-120020185.html)
- [Mobile Accessibility and ASO - Corpowid](https://corpowid.ai/blog/mobile-accessibility-aso-how-inclusive-design-now-directly-improves-app-discoverability-app-store-and-google-play)
- [Apple Accessibility Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [3 Big Accessibility Takeaways from Apple WWDC 2025 - Ally](https://www.ally.me/blog/accessibility-apple-2025)
