# Cross-Platform Design System Research for x/pat
## React Native Design Excellence (2025-2026)
### Mercury Fintech-Inspired Dark Mode Aesthetic

*Compiled April 2026 | CTO Research Report*

---

## Table of Contents

1. [Design Tokens for Cross-Platform](#1-design-tokens-for-cross-platform)
2. [Platform-Adaptive Components](#2-platform-adaptive-components)
3. [React Native Paper v5 (Material Design 3)](#3-react-native-paper-v5)
4. [Tamagui](#4-tamagui)
5. [NativeWind v4](#5-nativewind-v4)
6. [Gluestack UI](#6-gluestack-ui)
7. [Custom Design System vs Library](#7-custom-design-system-vs-library)
8. [Typography Scale Systems](#8-typography-scale-systems)
9. [Color System Architecture](#9-color-system-architecture)
10. [Animation Design Tokens](#10-animation-design-tokens)
11. [Icon Systems](#11-icon-systems)
12. [Spacing Systems](#12-spacing-systems)
13. [Glass Morphism Implementation](#13-glass-morphism-implementation)
14. [Neumorphism and Soft UI](#14-neumorphism-and-soft-ui)
15. [Micro-Animation Library](#15-micro-animation-library)
16. [Dark Mode Design Principles](#16-dark-mode-design-principles)
17. [Premium App Aesthetics](#17-premium-app-aesthetics)
18. [Responsive Design for React Native](#18-responsive-design-for-react-native)
19. [Component Documentation](#19-component-documentation)
20. [Design Handoff Workflow](#20-design-handoff-workflow)
21. [Accessibility in Design Systems](#21-accessibility-in-design-systems)
22. [Motion Design Language](#22-motion-design-language)
23. [Loading State Design](#23-loading-state-design)
24. [Error State Design](#24-error-state-design)
25. [Empty State Design](#25-empty-state-design)
26. [Form Design Patterns](#26-form-design-patterns)
27. [Card Design Variations](#27-card-design-variations)
28. [Bottom Sheet Design System](#28-bottom-sheet-design-system)
29. [Navigation Design](#29-navigation-design)
30. [Brand Expression in UI](#30-brand-expression-in-ui)

---

## Current x/pat Design System Audit

Before diving into research, here is what x/pat already has in place:

**Theme file** (`src/theme/index.ts`): Basic tokens for colors (teal/amber accent, dark backgrounds), spacing (4-32-48 scale), radius, shadows, and animation spring configs. Uses named color values rather than fully semantic tokens.

**Existing components with design patterns:**
- `GlassView`: Platform-aware blur (expo-blur on iOS, solid fallback on Android)
- `GlassTabBar`: Spring-animated tab bar with sliding indicator and glow dot
- `AnimatedPressable`: Gesture-driven press animation with haptic feedback
- `Skeleton`: Opacity-pulsing skeleton loader
- `SpotBottomSheet`: Pan-gesture dismissible sheet with spring physics
- `SpotCard`: Category pill + metadata card
- `SearchBar`: Glass-wrapped search input
- `ErrorBoundary`: Full-screen error state with retry

**Key gaps identified:**
- No semantic color token system (uses `dark.bg`, `dark.text` instead of intent-based naming)
- No typography scale (ad-hoc font sizes throughout)
- No light theme support structure
- No formal animation token system (spring configs duplicated across components)
- No card variants (only one SpotCard style)
- No empty state components
- No form component system
- Skeleton uses opacity pulse, not shimmer gradient
- Android blur is a solid color fallback, not actual blur

---

## 1. Design Tokens for Cross-Platform

### Current Best Practice

Design tokens are the atomic values that construct a design system: spacing, color, typography, shadows, motion curves. The 2025-2026 standard is a **three-layer token architecture**:

1. **Primitive tokens** (raw values): `blue-500: #0066FF`, `space-4: 16px`
2. **Semantic tokens** (intent-based): `color.background.primary: blue-500`, `spacing.content.padding: space-4`
3. **Component tokens** (context-specific): `button.background: color.primary`, `card.padding: spacing.content.padding`

Tokens should be stored in a single source of truth (JSON/JS objects) and injected via React context for runtime theming. Tools like Style Dictionary can generate platform-specific outputs from a single token definition.

### React Native Implementation

```typescript
// Three-layer token system for x/pat
const primitives = {
  teal400: '#3DDBB5',
  teal500: '#2EC4A0',
  teal600: '#25a384',
  gray50: '#F5F5F7',
  gray100: '#E5E5EA',
  gray800: '#2C2C2E',
  gray900: '#1C1C1E',
  gray950: '#0F0F11',
};

const semanticDark = {
  background: { primary: primitives.gray950, secondary: primitives.gray900, tertiary: primitives.gray800 },
  text: { primary: primitives.gray50, secondary: '#BABABF', tertiary: '#636366' },
  accent: { primary: primitives.teal500, secondary: '#E8803A' },
  surface: { default: '#1E1E2A', elevated: '#252535', active: '#2D2D3D' },
  border: { default: '#1F1F2F', strong: '#2A2A3A' },
  status: { success: '#34C759', warning: '#FFD60A', error: '#FF453A', info: '#0A84FF' },
};

const componentTokens = {
  card: { background: semanticDark.background.secondary, border: semanticDark.border.default, radius: 12 },
  button: { primary: { bg: semanticDark.accent.primary, text: semanticDark.background.primary } },
};
```

Store tokens in a centralized theme context using `React.createContext` with `useTheme()` hook access. This enables runtime theme switching and design consistency enforcement.

### x/pat Recommendation

**Immediately refactor `src/theme/index.ts` to use the three-layer system.** The current flat structure (`colors.dark.bg`, `colors.teal`) mixes primitives and semantics. Migration path:

1. Define all raw values as primitives
2. Map to semantic tokens by intent (background, text, surface, accent, border, status)
3. Create component-level tokens that reference semantics
4. Wrap app in `ThemeProvider` context
5. Replace all hardcoded colors in components with `useTheme()` references

This sets the foundation for everything else in this report.

---

## 2. Platform-Adaptive Components

### Current Best Practice

Platform-adaptive components expose a single API but render with native feel on each platform. The pattern uses `Platform.select()` for minor differences and separate platform files (`Component.ios.tsx` / `Component.android.tsx`) for major divergences.

Key areas requiring platform adaptation:
- **Shadows**: iOS uses `shadowColor/shadowOffset/shadowOpacity/shadowRadius`; Android uses `elevation`
- **Blur**: iOS has native UIBlurEffect; Android requires RenderScript or solid fallback
- **Typography**: iOS defaults to SF Pro; Android defaults to Roboto
- **Haptics**: iOS Core Haptics engine; Android vibration API
- **Navigation**: iOS prefers slide-from-right; Android prefers fade-from-bottom
- **Date pickers**: Different native pickers
- **Status bar**: Different behavior on each platform

### React Native Implementation

```typescript
// Platform-adaptive shadow utility
export const createShadow = (elevation: number, color = '#000') => ({
  ...Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: elevation * 0.5 },
      shadowOpacity: 0.15 + elevation * 0.02,
      shadowRadius: elevation * 1.5,
    },
    android: { elevation },
  }),
});
```

### x/pat Recommendation

x/pat already does this well in key areas: `GlassView` has iOS/Android branching, `AppNavigator` uses `Platform.OS` for animations. **Formalize this into a `platform.ts` utility** that centralizes all platform-specific values (shadow generation, animation defaults, spacing adjustments, typography weights) so individual components never need to import `Platform` directly for design decisions.

---

## 3. React Native Paper v5

### Current Best Practice

React Native Paper v5 implements Material Design 3 (Material You) with full theming support. It provides 50+ components with built-in accessibility, TypeScript support, and dynamic color generation from a source color.

**Pros:**
- Complete MD3 implementation with 50+ production-ready components
- Built-in dark mode with two modes: "exact" and "adaptive" (surface uses white overlay for elevation)
- Color scheme generation tool from a single source color
- Deep customization through `PaperProvider` theme override
- React Navigation integration for consistent theming
- Active maintenance by Callstack

**Cons:**
- Material Design aesthetic may conflict with x/pat's Mercury/fintech direction
- Components look "Google-ish" without heavy customization
- Overriding Material design language requires fighting the library's opinions
- Bundle size impact of unused components
- Performance overhead from MD3's dynamic color system

**Customization depth:** You can override every aspect of the theme (colors, fonts, roundness, animation), but doing so extensively defeats the purpose of using Paper in the first place.

### x/pat Recommendation

**Do not adopt React Native Paper.** x/pat's Mercury aesthetic is the opposite of Material Design. MD3's rounded, colorful, Google-flavored components would require so much customization that building custom components is faster and produces better results. Paper is ideal for apps that want Material Design; x/pat does not.

However, **study Paper's theming architecture** (PaperProvider, useTheme, color scheme generation from source color) as a reference for how to structure x/pat's own theme provider.

---

## 4. Tamagui

### Current Best Practice

Tamagui is a universal design system with an optimizing compiler that extracts styles at build time (to CSS on web, to `StyleSheet.create` on native). It flattens component trees and generates platform-specific optimized code.

**Pros:**
- Zero-runtime on web (CSS extraction), near-zero on native
- Compile-time optimization flattens views and removes style objects from JS bundle
- Full theme system with nesting, media queries, and responsive tokens
- Universal (React Native + web) with semantic HTML on web
- Performant enough to match vanilla React Native benchmarks
- Built-in component library (optional, can use just the styling engine)
- Compatible with Expo's New Architecture (Fabric, TurboModules)

**Cons:**
- Steep learning curve for responsive tokens, theme nesting, compiler settings
- Compiler configuration adds build complexity
- Debugging compiled output can be opaque
- Smaller community than NativeWind
- Documentation can be sparse for advanced use cases
- Web focus means some native patterns feel secondary

### x/pat Recommendation

**Not recommended for x/pat at this stage.** Tamagui's power is in universal (web + native) apps. x/pat is native-only (iOS + Android) with no web target, so the compile-time CSS extraction provides no benefit. The learning curve and build complexity are not justified for a team of one. Tamagui would be reconsidered if x/pat adds a web app.

---

## 5. NativeWind v4

### Current Best Practice

NativeWind v4 brings Tailwind CSS utility classes to React Native. At build time, it compiles Tailwind classes into `StyleSheet.create` objects on native and reuses the existing Tailwind CSS stylesheet on web.

**v4/v4.1 capabilities:**
- CSS variables support (enabling theme tokens and dynamic design patterns)
- Container queries and group selectors
- Custom CSS support (write custom classes in CSS files)
- Improved Fast Refresh with styles written to disk
- Server-side rendering support on web

**Performance:** Compile-time extraction means no runtime style computation. Performance is equivalent to using `StyleSheet.create` directly.

**v5 preview:** Focuses on cleaner setup, better performance, and better Tailwind web parity.

**Limitations:** Coverage is not the same as the full Tailwind browser engine. Some complex cases still need native styling.

### x/pat Recommendation

**NativeWind is a strong option but not essential for x/pat's current architecture.** x/pat already uses `StyleSheet.create` consistently, and introducing NativeWind mid-project means rewriting every component's styles to use className strings. The benefit (faster styling via utility classes) does not outweigh the migration cost for a solo developer.

**If starting fresh or doing a major style refactor,** NativeWind v4 with CSS variables would provide a clean way to implement the semantic token system. But for x/pat today, the better move is to enhance the existing `src/theme/index.ts` approach with proper semantic tokens and a theme context.

---

## 6. Gluestack UI

### Current Best Practice

Gluestack UI v3 (launched 2025) provides modular, unbundled, accessible components styled with Tailwind CSS utility classes via NativeWind. Components are unstyled/headless by default, giving full control over appearance.

**Pros:**
- Full accessibility out of the box (ARIA attributes, keyboard navigation, focus management)
- Modular/tree-shakeable (import only what you need)
- NativeWind-based styling for consistency with Tailwind
- Compatible with Expo's New Architecture
- Semantic HTML rendering on web for SEO
- Active development with strong documentation

**Cons:**
- Requires NativeWind as a dependency
- Tailwind-centric approach may not fit all projects
- Younger ecosystem than Paper or Elements
- Component set is smaller than Paper's 50+

### x/pat Recommendation

**Gluestack is the best component library option IF x/pat adopts NativeWind.** Its headless/unstyled philosophy aligns perfectly with x/pat's custom Mercury aesthetic -- you get accessible, well-engineered component logic without fighting Material Design opinions. The accessibility primitives (focus management, ARIA roles, keyboard support) are particularly valuable.

**Practical path:** Even without adopting Gluestack wholesale, study its component patterns for accessibility implementation. x/pat's current components (`AnimatedPressable`, `SpotCard`, `SpotBottomSheet`) lack proper `accessibilityRole`, `accessibilityState`, and focus management.

---

## 7. Custom Design System vs Library

### Current Best Practice

**Choose a component library when:**
- Speed to market is critical (reduces development time by up to 70%)
- You want established design language (Material, etc.)
- Team is large and needs enforced consistency
- Accessibility is table-stakes and you lack expertise

**Build custom when:**
- Brand identity requires unique visual language (Mercury aesthetic)
- Performance control is paramount
- Component set is relatively small and focused
- Team has strong design opinions that fight library defaults

**Hybrid approach (2025 recommendation):** Build custom visual components but use headless/unstyled primitives from libraries like Gluestack, React Aria, or Radix for complex interaction patterns (bottom sheets, date pickers, modals, dropdowns). This gives you visual control with engineering reliability.

### x/pat Recommendation

**x/pat should continue with a custom design system, enhanced with selective headless primitives.** The Mercury aesthetic is too specific and opinionated for any existing library to deliver without heavy overrides. However:

1. **Use `@gorhom/bottom-sheet`** for bottom sheet interaction logic (already battle-tested, gesture physics, snap points, keyboard handling)
2. **Use expo-haptics** for haptic feedback (already in place)
3. **Use react-native-reanimated** for animation primitives (already in place)
4. **Build all visual components in-house** with the enhanced theme system
5. **Consider @shopify/restyle** as a lightweight design system framework that provides type-enforced styling with theme-driven tokens -- it sits between raw StyleSheet and a full UI library

**Shopify Restyle** deserves special attention: it provides `Box` and `Text` primitives that enforce theme tokens via TypeScript, with zero style opinions. It centralizes all tokens (colors, spacing, radii, typography) in one theme file and provides type-safe access. This maps perfectly to x/pat's needs.

---

## 8. Typography Scale Systems

### Current Best Practice

A modular typographic scale uses a base size and a ratio to generate harmonious font sizes. Common ratios: 1.2 (Minor Third), 1.25 (Major Third), 1.333 (Perfect Fourth).

**Platform typography defaults:**
- iOS: SF Pro Display (headlines), SF Pro Text (body) -- automatically selected by the system based on size
- Android: Roboto (all weights available)

**Responsive typography considerations:**
- Font scaling (Dynamic Type on iOS, system font size on Android) can scale up to 3.5x
- Width-based scaling produces more consistent results across devices
- `allowFontScaling` should remain true for accessibility but with `maxFontSizeMultiplier` caps

**Scale structure (best practice):**
```
Micro:     11px  (badges, timestamps)
Caption:   13px  (secondary info)
Body:      15-16px (readable body text)
Subhead:   17px  (section subheadings)
Headline:  20px  (card titles)
Title:     24px  (screen titles)
Display:   28-32px (hero text, onboarding)
```

### x/pat Current State

x/pat uses DM Serif Display (heading) and Space Mono (body/bold). Font sizes are ad-hoc across components (9px, 10px, 11px, 12px, 13px, 14px, 18px, 22px).

### x/pat Recommendation

**Formalize the typography scale and reconsider font choices.**

1. **DM Serif Display** is a strong brand choice for headlines -- keep it as the display typeface
2. **Space Mono** is monospaced and not ideal for body text readability. Consider replacing with **Inter**, **DM Sans**, or system fonts (SF Pro / Roboto) for body text. Monospaced fonts reduce reading speed and increase eye strain in long passages
3. Define a strict scale with named sizes:

```typescript
export const typography = {
  micro:    { size: 11, weight: '500', tracking: 0.5, lineHeight: 14, font: fonts.body },
  caption:  { size: 13, weight: '400', tracking: 0.2, lineHeight: 18, font: fonts.body },
  body:     { size: 15, weight: '400', tracking: 0.1, lineHeight: 22, font: fonts.body },
  bodyBold: { size: 15, weight: '600', tracking: 0,   lineHeight: 22, font: fonts.bodyBold },
  subhead:  { size: 17, weight: '600', tracking: 0,   lineHeight: 24, font: fonts.body },
  headline: { size: 20, weight: '600', tracking: -0.3, lineHeight: 26, font: fonts.heading },
  title:    { size: 24, weight: '700', tracking: -0.3, lineHeight: 30, font: fonts.heading },
  display:  { size: 32, weight: '700', tracking: -0.5, lineHeight: 38, font: fonts.heading },
};
```

4. Set `maxFontSizeMultiplier={1.5}` on Text components to prevent layout breakage while still respecting accessibility settings

---

## 9. Color System Architecture

### Current Best Practice

The 2025-2026 standard follows an intent-first, three-layer architecture with an 87% reduction from named colors to semantic roles:

**Layer 1 - Primitives:** Raw hex values organized by hue and shade (teal-100 through teal-900)

**Layer 2 - Semantic Tokens (by intent):**
- `ControlFill` (interactive element backgrounds)
- `TextFill` (text colors)
- `AccentFill` (brand/action colors)
- `Stroke` (borders, dividers)
- `SurfaceFill` (backgrounds, cards)

Each with tiers: Primary, Secondary, Tertiary, Disabled

**Layer 3 - Component Tokens:**
- `button.background: AccentFill.Primary`
- `card.border: Stroke.Default`

**Dark mode handling:** Semantic tokens point to different primitives based on active mode. `SurfaceFill.Primary` maps to `gray-50` in light mode and `gray-950` in dark mode.

**Surface elevation rule:** Higher surfaces are lighter in dark mode. Each elevation step adds ~4-6% white overlay:
```
Level 0: #0F0F11 (deepest background)
Level 1: #1C1C1E (cards, surfaces)
Level 2: #2C2C2E (elevated surfaces, sheets)
Level 3: #3A3A3C (interactive elements)
Level 4: #48484A (active/hover states)
```

### x/pat Current State

x/pat uses a partially semantic system (`dark.bg`, `dark.text`, `dark.border`) but mixes in named colors (`teal`, `amber`). The glass tokens are well-structured. There is no light theme support.

### x/pat Recommendation

**Full semantic refactor to intent-based naming:**

```typescript
const theme = {
  colors: {
    // Surfaces (elevation-based)
    surface: {
      base: '#0F0F11',      // App background
      raised: '#1C1C1E',    // Cards, list items
      overlay: '#2C2C2E',   // Bottom sheets, modals
      interactive: '#3A3A3C', // Buttons at rest, inputs
      active: '#48484A',    // Pressed/active states
    },
    // Text (contrast hierarchy)
    text: {
      primary: '#F5F5F7',   // Headlines, important - NOT pure white
      secondary: '#BABABF', // Body text, descriptions
      tertiary: '#636366',  // Captions, timestamps, hints
      disabled: '#404050',  // Disabled states
      inverse: '#0F0F11',   // Text on accent-colored backgrounds
    },
    // Accent (brand colors)
    accent: {
      primary: '#2EC4A0',   // Teal - primary actions, brand
      primaryMuted: '#25a384', // Hover/pressed teal
      secondary: '#E8803A', // Amber - location markers, warmth
      secondaryMuted: '#d06e2e',
    },
    // Borders
    stroke: {
      subtle: '#1F1F2F',    // Dividers, card borders
      default: '#48484A',   // Input borders
      strong: '#5A5A5E',    // Focused input borders
      accent: 'rgba(46,196,160,0.3)', // Accent-tinted borders
    },
    // Status
    status: {
      success: '#34C759',
      warning: '#FFD60A',
      error: '#FF453A',
      info: '#0A84FF',
    },
    // Glass
    glass: {
      light: 'rgba(255,255,255,0.06)',
      medium: 'rgba(255,255,255,0.10)',
      heavy: 'rgba(255,255,255,0.15)',
      border: 'rgba(255,255,255,0.08)',
    },
  },
};
```

**Critical rules for x/pat:**
- Never use pure black (#000000) -- causes OLED smearing
- Never use pure white (#FFFFFF) for text -- use #F5F5F7 (already correct)
- Accent colors are slightly muted vs their web versions (saturated colors feel neon on dark backgrounds)
- Always maintain WCAG AA contrast ratios (4.5:1 body text, 3:1 large text)

---

## 10. Animation Design Tokens

### Current Best Practice

Animation design tokens define standardized motion values that ensure consistent feel across the app. Three categories:

**1. Spring Configs** (for physical, interruptible animations):
```typescript
springs: {
  gentle:  { damping: 20, stiffness: 100, mass: 1 },    // Background transitions
  default: { damping: 15, stiffness: 150, mass: 0.8 },   // General UI movement
  bouncy:  { damping: 12, stiffness: 200, mass: 0.6 },   // Playful feedback
  snappy:  { damping: 20, stiffness: 300, mass: 0.4 },   // Quick, decisive
  sheet:   { damping: 20, stiffness: 200, mass: 0.8 },   // Bottom sheets
}
```

**2. Timing Durations** (for non-interruptible transitions):
```typescript
durations: {
  instant: 100,   // Micro-feedback (opacity, color)
  fast: 200,      // Tab switches, small transitions
  normal: 300,    // Screen transitions, reveals
  slow: 500,      // Complex choreographed animations
  glacial: 800,   // Skeleton shimmer cycle
}
```

**3. Easing Curves** (for timing animations):
```typescript
easings: {
  easeOut: Easing.out(Easing.cubic),      // Elements entering
  easeIn: Easing.in(Easing.cubic),        // Elements exiting
  easeInOut: Easing.inOut(Easing.cubic),   // State changes
  linear: Easing.linear,                   // Progress bars, shimmer
}
```

### x/pat Current State

x/pat has basic animation tokens in `theme/index.ts` but duplicates spring configs across components (`GlassTabBar`, `AnimatedPressable`, `SpotBottomSheet` all define their own `SPRING_CONFIG`).

### x/pat Recommendation

**Centralize all animation tokens in the theme and eliminate per-component configs:**

```typescript
// In src/theme/index.ts
export const motion = {
  spring: {
    gentle:  { damping: 20, stiffness: 100, mass: 1 },
    default: { damping: 15, stiffness: 150, mass: 0.8 },
    bouncy:  { damping: 12, stiffness: 200, mass: 0.6 },
    snappy:  { damping: 20, stiffness: 300, mass: 0.4 },
    sheet:   { damping: 20, stiffness: 200, mass: 0.8 },
    tabBar:  { damping: 18, stiffness: 220, mass: 0.4 },
  },
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    shimmer: 1600,
  },
  // Press feedback
  press: {
    scale: 0.96,
    opacity: 0.9,
  },
  // Reduced motion: respect OS accessibility setting
  reducedMotion: {
    duration: 0,
    spring: { damping: 100, stiffness: 500 }, // Instant, no bounce
  },
};
```

Then update all components to import from theme instead of defining their own configs.

---

## 11. Icon Systems

### Current Best Practice

**2025 recommendations by category:**

| System | Best For | Pros | Cons |
|--------|----------|------|------|
| **Feather** | Minimalist UI | Clean 24x24 grid, consistent stroke width, pairs well with dark themes | Limited set (~287 icons), no filled variants |
| **SF Symbols** | iOS-native feel | 5000+ icons, weight/scale variants, native iOS integration | iOS-only, not available on Android |
| **Material Icons** | Material Design | 5 styles (filled, outlined, rounded, two-tone, sharp), huge set | Google aesthetic, heavier bundle |
| **Ionicons** | Mobile patterns | Platform-adaptive (iOS/Android variants), good mobile defaults | Less distinctive brand feel |
| **Lucide** | Feather successor | Community fork of Feather with 1400+ icons, active development, same clean aesthetic | Newer, smaller ecosystem |

**Best practice architecture:**
1. Choose one primary icon set for consistency
2. Create a centralized `Icon` component that abstracts the library
3. Use SVG for custom/brand icons (animated, unique)
4. Font-based icons for standard UI icons (cheaper render cost)
5. Import only used icons for bundle optimization

### x/pat Current State

x/pat uses Feather icons via `@expo/vector-icons` throughout. This is a good choice for the minimalist Mercury aesthetic.

### x/pat Recommendation

**Keep Feather as the primary icon system** -- its clean stroke style is perfect for the Mercury-inspired dark UI. But make two improvements:

1. **Create a centralized Icon wrapper:**
```typescript
// src/components/Icon.tsx
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme';

type IconName = keyof typeof Feather.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: any;
}

export default function Icon({ name, size = 20, color = colors.text.secondary, style }: IconProps) {
  return <Feather name={name} size={size} color={color} style={style} />;
}
```

2. **Consider Lucide as a Feather upgrade** -- it is the actively-maintained community fork of Feather with 5x more icons and the same visual language. Migration is nearly drop-in.

3. For brand-specific icons (x/pat logo, custom category icons), use SVG via `react-native-svg` for full animation and color control.

---

## 12. Spacing Systems

### Current Best Practice

The 8pt grid is the industry standard for mobile design. Both Apple HIG and Material Design recommend it. The system works because 8 divides evenly into common screen widths and creates consistent visual rhythm.

**Standard 8pt scale with 4pt half-steps:**
```
2   (hairline gaps, icon padding)
4   (tight spacing, badge padding)
8   (small gaps, compact lists)
12  (medium-small, between related elements)
16  (standard content padding)
20  (medium gaps)
24  (section spacing)
32  (large section gaps)
40  (hero spacing)
48  (screen-level spacing)
64  (dramatic separation)
```

**Platform adjustments:**
- Android favors 4pt granularity (Material Design)
- iOS favors 8pt granularity (HIG)
- Touch targets: minimum 44pt on iOS, 48dp on Android

**Responsive scaling:** Increase or decrease spacing by one step for different screen sizes (phone vs tablet).

### x/pat Current State

x/pat uses: `xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48`. This is a clean 8pt base but is missing intermediate values (12, 20, 40, 64).

### x/pat Recommendation

**Expand the spacing scale with named semantic tokens:**

```typescript
export const spacing = {
  // Raw scale
  '0': 0,
  '0.5': 2,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
  '16': 64,

  // Semantic aliases
  hairline: 2,
  tight: 4,
  compact: 8,
  default: 16,
  relaxed: 24,
  spacious: 32,
  section: 48,

  // Component-specific
  cardPadding: 16,
  cardGap: 12,
  screenPadding: 16,
  sectionGap: 24,
  listItemGap: 12,
  inputPadding: 12,
};
```

The current `xs/sm/md/lg/xl/xxl` naming is fine but adding the numeric scale provides more flexibility. The semantic aliases make code more readable (`spacing.cardPadding` vs `spacing.md`).

---

## 13. Glass Morphism Implementation

### Current Best Practice (2025-2026)

Glassmorphism has evolved into "Liquid Glass" following Apple's WWDC 2025 announcement. The 2026 state of the art:

**Standard glassmorphism recipe:**
```
Background:   rgba(255, 255, 255, 0.05-0.10)
Backdrop blur: 20px (sweet spot for dark mode)
Border:       1px solid rgba(255, 255, 255, 0.08)
Border radius: 16-20px
Optional:     subtle gradient overlay for depth
```

**Libraries by capability:**

| Library | iOS | Android | Notes |
|---------|-----|---------|-------|
| `expo-blur` | Native UIBlurEffect | Stable from SDK 55+ | x/pat already uses this |
| `@react-native-community/blur` | Native UIBlurEffect | Static color only | No real Android blur |
| `@sbaiahmed1/react-native-blur` | Native, precise intensity | Native Android blur | New, emerging |
| `@callstack/liquid-glass` | Apple Liquid Glass API | N/A | Requires New Architecture, iOS 26+ |
| `expo-glass-effect` | SwiftUI glass modifiers | N/A | Expo SDK 54+, iOS only |

**Performance guidelines:**
- Limit blur areas to avoid GPU strain (especially on low-end Android)
- Use blur intensity 20-40 for dark mode (higher values waste GPU)
- Provide solid fallbacks for older/low-end devices
- Test on oldest supported device (not just flagship)

### x/pat Current State

`GlassView` uses `expo-blur` on iOS and falls back to solid `rgba(28,28,30,0.92)` on Android. This is the correct approach for broad compatibility.

### x/pat Recommendation

**The current approach is solid. Enhance with these improvements:**

1. **Android improvement (SDK 55+):** Since x/pat uses Expo SDK 55, expo-blur now has stable Android support. Test replacing the solid fallback with actual `BlurView` on Android:

```typescript
export default function GlassView({ intensity = 40, tint = 'dark', style, children }: GlassViewProps) {
  // expo-blur SDK 55+ supports Android
  return (
    <BlurView intensity={intensity} tint={tint} style={style}>
      {children}
    </BlurView>
  );
}
```

2. **Add noise texture overlay** for premium glass feel (subtle grain over the blur):
```typescript
// Optional: SVG noise pattern overlay
<View style={{ opacity: 0.03 }}>
  <Image source={require('../assets/noise.png')} style={StyleSheet.absoluteFill} resizeMode="repeat" />
</View>
```

3. **Create glass variants** in the theme:
```typescript
glass: {
  thin:   { intensity: 20, background: 'rgba(255,255,255,0.03)' },
  medium: { intensity: 40, background: 'rgba(255,255,255,0.06)' },
  thick:  { intensity: 80, background: 'rgba(255,255,255,0.10)' },
  tabBar: { intensity: 40, background: 'rgba(28,28,30,0.55)' },
}
```

4. **Accessibility:** Always provide fallback solid backgrounds for users with `prefers-reduced-transparency` or reduced-motion settings.

---

## 14. Neumorphism and Soft UI

### Current Best Practice (2025-2026)

Neumorphism 2.0 has evolved to address the accessibility criticisms of the original trend. Modern implementations:

- **Higher contrast:** Sharper shadow differences than original neumorphism
- **Selective use:** Applied to specific interactive elements (toggles, sliders, cards), not entire interfaces
- **Dark mode adaptation:** Uses lighter highlights and deeper shadows for visibility
- **Hybrid approach:** Combines flat design clarity with subtle neumorphic depth cues

**React Native libraries:**
- `react-native-neomorph-shadows`: Neumorphic shadows for iOS & Android
- `react-native-neu-element`: Full neumorphic component library

**Key limitation:** Neumorphism requires two shadows (highlight + shadow) per element, which is expensive on Android where `elevation` only supports a single shadow direction. iOS handles dual shadows natively via `shadowColor`.

### x/pat Recommendation

**Do not implement full neumorphism.** It conflicts with the Mercury/fintech aesthetic, which is characterized by flat surfaces with clear borders, not soft extruded shapes. The glassmorphism direction x/pat already has is the right choice.

However, **borrow one neumorphic technique**: subtle inner shadows on pressed/active states for toggle buttons and input fields. This provides tactile depth feedback without the full neumorphic look:

```typescript
// Pressed state: subtle inset shadow effect
pressedStyle: {
  backgroundColor: 'rgba(0,0,0,0.15)', // Slightly darker
  // No actual inner shadow in RN, simulate with darker bg + scale reduction
}
```

The `AnimatedPressable` component already achieves this effect through scale reduction (0.96) -- this is the correct approach for x/pat.

---

## 15. Micro-Animation Library

### Current Best Practice

Micro-animations should be reusable, consistent, and performance-optimized. The 2025-2026 approach is to build a library of animated component wrappers and hooks.

**Essential micro-animation patterns:**

| Pattern | Duration | Easing | Use Case |
|---------|----------|--------|----------|
| Press scale | 150ms | spring (snappy) | Any tappable element |
| Fade in | 200ms | easeOut | Content appearing |
| Slide up | 300ms | spring (default) | New items, notifications |
| Scale pulse | 300ms | spring (bouncy) | Save/like confirmation |
| Shimmer | 1600ms | linear loop | Loading states |
| Shake | 400ms | spring (snappy) | Error feedback |
| Color transition | 250ms | easeInOut | State changes |
| Expand/collapse | 300ms | spring (default) | Accordion, expandable cards |

**Haptic pairing (2025 standard):**
- Light impact: button taps, toggles
- Medium impact: long press, drag start
- Heavy impact: destructive actions
- Selection: scrolling through picker
- Success/Warning/Error: notification haptics for status feedback

**Libraries:**
- `react-native-reanimated` for all animations (x/pat already uses this)
- `expo-haptics` for haptic feedback (x/pat already uses this)
- `react-native-nitro-haptics` for UI-thread haptics with Reanimated worklets (lower latency)

### x/pat Current State

x/pat has `AnimatedPressable` (press scale + haptic), `Skeleton` (opacity pulse), and spring animations in `GlassTabBar` and `SpotBottomSheet`. These are well-implemented but not organized as a reusable system.

### x/pat Recommendation

**Create a `src/animations/` directory with reusable animation hooks and components:**

```typescript
// src/animations/useFadeIn.ts
export function useFadeIn(delay = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
    translateY.value = withDelay(delay, withSpring(0, motion.spring.default));
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

// src/animations/useScalePulse.ts (for save/like actions)
export function useScalePulse() {
  const scale = useSharedValue(1);

  const trigger = () => {
    scale.value = withSequence(
      withSpring(1.3, motion.spring.bouncy),
      withSpring(1, motion.spring.default)
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { trigger, style };
}

// src/animations/useShake.ts (for error feedback)
export function useShake() {
  const translateX = useSharedValue(0);

  const trigger = () => {
    translateX.value = withSequence(
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(4, { duration: 50 }),
      withSpring(0, motion.spring.snappy)
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { trigger, style };
}
```

---

## 16. Dark Mode Design Principles

### Current Best Practice (2026)

**Core principles for premium dark mode:**

1. **Never use pure black (#000000)**: Causes OLED smearing (pixels fully off create visible lag when turning back on) and halation (bright text appears to glow/bleed on pure black)

2. **Surface elevation = lighter shade**: Each z-level adds brightness. This simulates light falling from above:
   - Level 0: `#0A0A0F` to `#0F0F11` (base)
   - Level 1: `#1C1C1E` (cards)
   - Level 2: `#2C2C2E` (sheets, modals)
   - Level 3: `#3A3A3C` (interactive)

3. **Contrast hierarchy through 8-12 grayscale values**: Not just "text" and "background" but a full spectrum creating visual depth

4. **Accent color desaturation**: Colors that look vibrant on white look neon on dark. Reduce saturation 10-20% for dark mode or the interface feels "electric"

5. **Text contrast tiers**: Primary text at ~87% white, Secondary at ~60%, Disabled at ~38%. This creates hierarchy without color

6. **Preserve depth through tonal layering**: Use slightly lighter shades for elevated elements and subtle transparency for overlays

7. **Dark mode emotional design**: Premium, focused, and quiet -- not ominous, cramped, or intense

**2026 trend**: Customizable contrast levels and accent colors, letting users fine-tune their experience

### x/pat Current State

x/pat follows most of these principles well:
- Uses `#0F0F11` (not pure black) for base background
- Has elevation steps (`bg0` through `bg4`)
- Uses `#F5F5F5` (not pure white) for primary text
- Accent colors (teal, amber) are reasonably calibrated

### x/pat Recommendation

The foundation is solid. **Three improvements:**

1. **Add more elevation granularity**: Current system jumps from `bg` (#1C1C1E) to `bg2` (#2C2C2E) -- add intermediate values for elevated cards, hover states, and grouped content backgrounds

2. **Test all accent colors for dark mode contrast**: Run `#2EC4A0` (teal) and `#E8803A` (amber) through contrast checkers against all surface levels. Ensure WCAG AA compliance at every combination

3. **Add subtle color temperature**: Mercury uses slightly cool-toned grays (hint of blue). x/pat's current grays are neutral. Consider shifting base colors slightly blue-cool:
   - `#0F0F11` stays (already slightly cool)
   - `#1C1C1E` could become `#1A1A22` (slight blue tint)
   - This creates the "sophisticated tech" feel vs plain gray

---

## 17. Premium App Aesthetics

### Current Best Practice

What makes Mercury, Revolut, and Linear feel premium:

**1. Restraint in color:**
- Premium apps use 1-2 accent colors maximum on a neutral base
- Mercury: near-monochrome with subtle blue accents
- Linear: dark base with minimal purple/blue accents
- Revolut: dark with customizable but always-singular accent

**2. Typography as hierarchy:**
- Large, confident headlines with generous negative space
- Clear weight contrast between heading and body
- Tight letter-spacing on headlines, loose on small text
- No more than 2-3 font sizes visible on any single screen

**3. Spacing as luxury:**
- Premium apps use more whitespace (or "darkspace") than budget apps
- Generous padding inside cards (16-24px, not 8-12px)
- More vertical rhythm between sections
- Content density is lower -- each element has room to breathe

**4. Micro-interactions as trust signals:**
- Smooth transitions signal engineering quality
- Spring physics (not linear) for natural feel
- Haptic feedback confirms actions
- No jank, no stuttering, consistent 60fps

**5. Surface depth through subtlety:**
- Glass blur, not hard borders
- Gradient accents, not flat colors
- Shadow glow on accent elements
- Noise texture on glass surfaces

**6. Direct, linear flows:**
- Minimal choices per screen
- Clear visual hierarchy directing eye flow
- Progressive disclosure (show more only when asked)
- Tight, purposeful transitions between states

### x/pat Current State

x/pat has good bones for premium feel: glass tab bar, spring animations, haptic feedback, dark base with teal accent. Areas to improve:

- **SpotCard** feels dense/cluttered with category pill + votes + name + location + note + author + date all visible
- **Spacing is tight** -- cards use 16px padding but 12px gaps between them
- **Missing gradient accents** -- everything is flat teal or flat gray
- **No glow effects** on primary actions

### x/pat Recommendation

**Apply the Mercury premium formula:**

1. **Simplify SpotCard**: Show only essential info (name, category, location). Move votes, author, date to detail view. Premium = less visible, not more

2. **Increase breathing room**: Card gaps from 12px to 16px. Screen padding from 16px to 20px. Section spacing from 24px to 32px

3. **Add subtle gradient to primary accent**:
```typescript
// Gradient teal for primary buttons and active states
<LinearGradient colors={['#2EC4A0', '#25B394']} start={{x:0, y:0}} end={{x:1, y:1}}>
```

4. **Accent glow on key actions**: The `shadows.glow` function already exists in the theme but is underused. Apply to primary buttons, active tab indicator, save confirmation

5. **Content density audit**: Every screen should follow the rule: if removing an element does not reduce understanding, remove it

---

## 18. Responsive Design for React Native

### Current Best Practice

**Device categories and breakpoints:**
- Phone (< 600dp): Single column, full-width content
- Tablet (600-1024dp): Multi-column options, master-detail
- Foldable (variable): Responds to fold state changes
- Landscape: Wider layouts, side panels

**Key tools:**
- `useWindowDimensions()`: Auto-updates on rotation, fold, resize
- `Dimensions.get('window')`: Static measurement
- Percentage widths with `flexBasis`
- `maxWidth` constraints for readability on wide screens
- `PixelRatio.get()` for density-aware sizing

**2025-2026 recommendations:**
- Use `useWindowDimensions` hook (not Dimensions API) for reactive layouts
- Implement breakpoint logic: `const isTablet = width >= 768`
- Test split-screen mode on tablets and foldable devices
- Set `"orientation": "default"` in app.json to support both orientations
- Conditionally load device-specific components for bundle optimization

### x/pat Current State

No responsive design system detected. The app appears to be phone-only with fixed layouts.

### x/pat Recommendation

**Phase 1 (now): Create responsive utility hook:**

```typescript
// src/hooks/useLayout.ts
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isFoldable = width >= 600 && width < 768;

  return {
    width, height, isLandscape, isTablet, isFoldable,
    columns: isTablet ? 2 : 1,
    contentMaxWidth: isTablet ? 600 : width,
    screenPadding: isTablet ? 32 : 16,
  };
}
```

**Phase 2 (future): Add tablet layouts** for key screens (Explore map + list side-by-side, Profile with sidebar). Not critical for launch but shows polish.

---

## 19. Component Documentation

### Current Best Practice

Storybook 9 for React Native allows building, testing, and documenting UI components in isolation. Recent Expo integration makes setup straightforward.

**Storybook capabilities:**
- Canvas rendering of each component state
- Controls panel for modifying props dynamically
- Actions panel for logging user interactions
- Docs page auto-generated from TypeScript props
- Visual regression testing integration

**Alternative approaches:**
- Storybook embedded in the app (on-device component browser)
- Storybook for React Native Web (browser-based, uses react-native-web)
- Simple component catalog screen within the app itself

### x/pat Recommendation

**Not a priority for a solo developer.** Storybook adds configuration overhead that is not justified when one person builds and uses every component. Instead:

1. **Create a `DevScreen.tsx`** (debug-only, hidden in production) that renders every component in all its states. This is a minimal "living style guide" with zero setup cost

2. **Document the design system in the theme file** with inline comments explaining each token's purpose

3. **Add Storybook later** if/when x/pat hires designers or additional developers who need a component reference

---

## 20. Design Handoff Workflow

### Current Best Practice (2026)

Figma-to-code workflows have advanced significantly:

- **Bidirectional sync**: Components in Figma sync with React codebases; changes in Figma can auto-create PRs in code
- **Figma-to-React-Native plugins**: Transform Figma components to React Native in real-time, exporting themes, icons, and assets
- **AI-powered code generation**: Tools generate production-ready React Native code with proper styling and TypeScript types
- **Shared language**: Design system in Figma mirrors component library in React Native, using the same token names

**Best workflow:**
1. Define design tokens in Figma (using Tokens Studio plugin)
2. Export tokens as JSON
3. Transform to platform-specific values via Style Dictionary
4. Generate React Native theme file automatically
5. Components reference the same token names as Figma

### x/pat Recommendation

**Not applicable in the current solo-developer context.** There is no separate designer creating Figma files. The design system IS the code.

When x/pat hires a designer:
1. Start with Figma Tokens plugin that maps to the token names in `src/theme/index.ts`
2. Use the `figma-to-react-native` tool for asset export
3. Establish a shared vocabulary where Figma layer names match component prop names

---

## 21. Accessibility in Design Systems

### Current Best Practice

**WCAG requirements for mobile:**

| Requirement | Standard | x/pat Status |
|-------------|----------|--------------|
| Text contrast ratio | 4.5:1 (AA) for body, 3:1 for large text | Needs audit |
| Touch target size | 44x44px iOS / 48x48dp Android minimum | Partial |
| Focus indicators | 3:1 contrast against adjacent colors | Missing |
| Screen reader labels | `accessibilityLabel` on all interactive elements | Partial |
| Focus management | Move focus to new content on navigation | Missing |
| Reduced motion | Respect OS `prefers-reduced-motion` | Missing |

**React Native accessibility props:**
- `accessibilityRole`: "button", "link", "header", "image", "text"
- `accessibilityLabel`: Human-readable description
- `accessibilityHint`: Describes the result of an action
- `accessibilityState`: { disabled, selected, checked, expanded }
- `accessibilityLiveRegion`: "polite" | "assertive" for dynamic content

### x/pat Current State

`GlassTabBar` has `accessibilityRole="button"` and `accessibilityState` -- good. `ErrorBoundary` has `accessibilityLabel` and `accessibilityRole` on the retry button -- good. Most other components lack accessibility props.

### x/pat Recommendation

**Systematic accessibility pass:**

1. **Contrast audit**: Test every text/background combination against WCAG AA. Pay special attention to `text.tertiary` (#636366) on `surface.raised` (#1C1C1E) -- this is likely below 4.5:1 ratio

2. **Touch target enforcement**: Add minimum 44px hit areas to all interactive elements. The `closeBtn` in SpotBottomSheet (32x32px) is too small

3. **Add `accessibilityLabel` to all icons and buttons** that currently only have an icon (no text)

4. **Reduced motion support**:
```typescript
import { AccessibilityInfo } from 'react-native';

const [reduceMotion, setReduceMotion] = useState(false);
useEffect(() => {
  AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
  return () => sub.remove();
}, []);
```

5. **Focus management**: When navigating to a new screen, ensure screen reader focus moves to the screen title

---

## 22. Motion Design Language

### Current Best Practice

A motion design language defines **how** things move, not just what moves. It is a core part of brand identity in 2026.

**Principles for premium feel:**

1. **Spring physics for interactive elements**: Springs are interruptible and feel natural. Use for anything the user initiates (press, drag, swipe)

2. **Timing for system animations**: Use `withTiming` for opacity, color changes, progress bars -- things the system controls

3. **Choreography**: Related elements animate together but staggered:
   - List items: 50ms delay between each item
   - Card content: image first (0ms), title (50ms), metadata (100ms)
   - Screen transitions: outgoing content fades (0ms), incoming content slides (100ms)

4. **Consistent directionality**: Content enters from the direction of user action. Tapped card content rises from the card position. Dismissed content exits toward the swipe direction

5. **Proportional duration**: Larger movements take longer. A card sliding 200px takes 300ms; a toggle moving 20px takes 150ms

6. **Reduced motion fallback**: Replace all motion with instant state changes. Never remove the state change, just the animation

### x/pat Current State

x/pat has spring physics in the right places (bottom sheet, tab bar, pressable). Missing choreography and staggered entry animations.

### x/pat Recommendation

**Define x/pat's motion personality:**

- **Character**: Fluid, confident, unhurried (like Mercury -- not bouncy like Duolingo)
- **Default spring**: Slightly overdamped (damping > stiffness ratio) for smoothness without bounce
- **Entry pattern**: Fade + slight upward slide (8-12px translateY)
- **Exit pattern**: Fade out in place (no slide -- faster exits feel more responsive)
- **Stagger**: 40ms between related items (enough to see sequence, not enough to feel slow)
- **Tab switch**: Crossfade at 200ms (already implemented)
- **Never bounce**: Bouncy springs feel playful/casual, which conflicts with the fintech premium feel. Use critical or slightly overdamped springs only

---

## 23. Loading State Design

### Current Best Practice

**Skeleton screens vs spinners:**
- Users perceive skeleton-loaded content as loading **50% faster** than spinner-loaded content
- Show skeleton within 300ms of any user action
- Cross-fade from skeleton to real content (300ms fade)
- Shimmer: wave of light sweeping across elements every 1.5-2 seconds

**Progressive loading strategy:**
1. Navigation structure appears instantly (tab bar, header)
2. Skeleton shapes appear at 300ms
3. Cached/local data loads first
4. Network data replaces skeletons with cross-fade
5. Images load last with blur-up transition

**Optimistic UI:**
- Assume success and show the result immediately
- Revert only on failure
- Best for: saves, likes, follows, sends
- Critical: show a subtle "syncing" indicator so users know it is not yet confirmed

### x/pat Current State

`Skeleton` component exists but uses opacity pulse instead of shimmer gradient. No optimistic UI patterns detected.

### x/pat Recommendation

**Upgrade Skeleton to shimmer and add optimistic UI:**

1. **Replace opacity pulse with shimmer gradient:**
```typescript
// Shimmer effect using LinearGradient + translateX animation
const shimmerTranslate = useSharedValue(-width);

useEffect(() => {
  shimmerTranslate.value = withRepeat(
    withTiming(width, { duration: 1600, easing: Easing.linear }),
    -1
  );
}, []);

// Render: base gray rectangle with an animated gradient overlay
```

2. **Create skeleton presets** for common layouts:
```typescript
<SpotCardSkeleton />     // Matches SpotCard dimensions
<ProfileSkeleton />       // Avatar + name + bio
<FeedItemSkeleton />      // Feed post skeleton
<ListSkeleton count={5} /> // Generic list
```

3. **Implement optimistic UI for saves and likes:**
```typescript
// When user taps "Save":
// 1. Immediately update local state to "saved"
// 2. Show teal fill animation + haptic success
// 3. Fire API call in background
// 4. If API fails: revert state, show toast error
```

---

## 24. Error State Design

### Current Best Practice

**Error state tiers:**

| Tier | When | UI Pattern |
|------|------|------------|
| Inline | Field validation | Red text below field, red border |
| Toast | Background action failure | Brief notification bar, auto-dismiss |
| Banner | Connectivity issues | Persistent bar at top/bottom |
| Partial | Section of screen fails | Error card in place of content with retry |
| Full-screen | Critical failure | Full error screen with retry and support |

**UX principles:**
- Clear, human-readable messages (not error codes)
- Always offer a next action (retry, go back, contact support)
- Use inline errors near the source, not in distant modal
- Distinguish retryable (network, 5xx) from non-retryable (4xx, logic errors)
- Wrap every screen in an ErrorBoundary with a granular fallback

### x/pat Current State

`ErrorBoundary` provides full-screen error with retry. No inline error, toast, or partial error components.

### x/pat Recommendation

**Build a tiered error component system:**

1. **Toast component** (for background action failures):
```typescript
// Slides down from top, auto-dismisses after 3s
// Red accent border for errors, amber for warnings, teal for success
<Toast type="error" message="Couldn't save spot. Tap to retry." onRetry={...} />
```

2. **Inline error** (for forms):
```typescript
// Red text + shake animation below input
<TextInput ... />
{error && <InlineError message={error} />}
```

3. **Partial error** (for sections):
```typescript
// Replaces a card/section with compact error + retry
<SectionError message="Couldn't load nearby spots" onRetry={refetch} />
```

4. **Connectivity banner** (persistent when offline):
```typescript
// Sticky bar at top: "No internet connection. Some features may be limited."
<ConnectivityBanner />
```

---

## 25. Empty State Design

### Current Best Practice

**Three types of empty states:**

1. **First-use (onboarding empty state)**: "You haven't saved any spots yet. Explore nearby and tap the bookmark to save your favorites." Include illustration + CTA button

2. **No-results (search/filter empty state)**: "No spots match your search. Try different keywords or remove filters." Offer: clear filters, broaden search, add a spot

3. **Celebratory (all-caught-up)**: "You're all caught up! Check back later for new spots." Positive tone, fun visual, no urgency

**Design best practices:**
- Familiar layout: headline + description + illustration + CTA
- Illustration scale: add personality but don't dominate
- Balance humor with usefulness
- Maintain brand voice and visual consistency
- Never leave a screen blank -- every empty state is a chance to guide the user

### x/pat Current State

No dedicated empty state components detected. Screens likely show blank areas when data is missing.

### x/pat Recommendation

**Create a reusable `EmptyState` component with variants:**

```typescript
interface EmptyStateProps {
  icon: string;       // Feather icon name
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
  variant?: 'explore' | 'search' | 'success' | 'offline';
}

// Usage:
<EmptyState
  icon="compass"
  title="No spots here yet"
  description="Be the first to share a spot in this city."
  action={{ label: "Add a Spot", onPress: navigateToAddSpot }}
  variant="explore"
/>
```

**Brand voice for x/pat empty states:**
- Encouraging, not apologetic ("Be the first" not "Sorry, nothing found")
- Travel-themed language ("Explore", "Discover", "Chart your path")
- Subtle wanderlust emotion without being cheesy
- Always provide a clear next action

---

## 26. Form Design Patterns

### Current Best Practice

**Floating labels:** Labels that start inside the input and float above when focused. Best UX for space-constrained mobile screens.

**Validation patterns:**
- Show error only after field interaction (not on mount)
- Use `touched` state per field (React Hook Form or Formik)
- Real-time validation after first blur, not on every keystroke
- Green checkmark for valid fields (positive reinforcement)

**Multi-step forms:**
- Register all fields in a single form hook
- Validate in stages using `trigger()` per step
- Progress indicator showing current step
- Allow back navigation without losing data

**Performance:**
- Wrap custom inputs in `React.memo` to prevent re-renders
- React Hook Form is the 2025 standard (lightweight, hook-based, minimal re-renders)

### x/pat Current State

`AddSpotScreen` and `AuthScreen` likely have forms but no standardized form component system.

### x/pat Recommendation

**Create form primitives that match the Mercury aesthetic:**

```typescript
// FormInput with floating label, glass background, teal focus border
<FormInput
  label="Spot Name"
  value={name}
  onChangeText={setName}
  error={errors.name}
  icon="map-pin"
/>

// FormSelect with bottom sheet picker
<FormSelect
  label="Category"
  options={categories}
  selected={category}
  onSelect={setCategory}
/>

// FormStepper for multi-step flows (add spot, onboarding)
<FormStepper
  steps={['Details', 'Location', 'Photos']}
  currentStep={step}
/>
```

**Key design decisions:**
- Glass background on inputs (not flat gray)
- Teal accent on focus (border + label color change)
- Shake animation on validation error (use the `useShake` hook from micro-animations)
- 48dp minimum height for all inputs (accessibility)

---

## 27. Card Design Variations

### Current Best Practice

Premium apps use multiple card variants for different contexts:

| Variant | Use Case | Key Traits |
|---------|----------|------------|
| **Compact** | Lists, search results | Horizontal layout, thumbnail left, text right |
| **Standard** | Feed, browse | Vertical, hero image top, content below |
| **Featured** | Hero content, promoted | Larger, gradient overlay, prominent CTA |
| **Glass** | Map overlays | Semi-transparent, blurred background visible |
| **Interactive** | Swipeable decks | Full-screen, gesture-driven, stacked |
| **Expandable** | Details preview | Collapsed summary, tap to expand additional content |
| **Minimal** | Dense lists | Text only, subtle separator, compact spacing |

**Card animation patterns:**
- Press: scale(0.97) + subtle opacity (already in x/pat)
- Stack: translate3d + scale interpolations for deck effect
- Expand: height animation with content fade-in
- Swipe: spring physics for dismiss/return

### x/pat Current State

One card variant (`SpotCard`) with one layout. `SwipeCardDeck` exists for interactive cards. No compact, glass, or expandable variants.

### x/pat Recommendation

**Build a SpotCard component system with 4 variants:**

1. **SpotCard.Standard** (current, simplified): Hero image + name + category + location
2. **SpotCard.Compact**: Horizontal thumbnail (64x64) + name + category + distance -- for list results and search
3. **SpotCard.Glass**: Semi-transparent, used on map overlay bottom sheet -- current SpotBottomSheet content
4. **SpotCard.Featured**: Larger image, gradient overlay with text on image, used for featured/seeded spots

All variants share the same `Spot` data type and `onPress` handler. Only visual treatment differs.

---

## 28. Bottom Sheet Design System

### Current Best Practice

**@gorhom/bottom-sheet v5** is the industry standard for React Native:
- Built with Reanimated v3 + Gesture Handler v2
- Configurable snap points with spring physics
- Keyboard handling (extend, fillParent, interactive modes)
- Accessibility support
- React Navigation integration
- TypeScript-first

**Design patterns for bottom sheets:**

1. **Peek → Half → Full** (3 snap points): Show preview, expand for content, full for detail
2. **Handle bar**: 36-40px wide, 4px tall, rounded, centered -- universal grab indicator
3. **Backdrop dim**: 30-50% opacity black, tap to dismiss
4. **Content scrolling**: ScrollView inside sheet for long content, drag on handle/header to resize
5. **Route-based sheets**: Each sheet has its own route for deep linking (Expo Router integration)

**Multiple sheets management:**
- Use a sheet context/provider to manage sheet state globally
- Only one sheet visible at a time (stack or replace pattern)
- Transition animation between sheets

### x/pat Current State

`SpotBottomSheet` is custom-built with Reanimated gestures. It works but lacks snap points, keyboard handling, and the polish of `@gorhom/bottom-sheet`.

### x/pat Recommendation

**Migrate to @gorhom/bottom-sheet for the core sheet infrastructure:**

The current custom implementation is functional but missing features that the mature library provides for free: snap points, keyboard avoidance, accessibility, and scroll handling.

```typescript
// Using @gorhom/bottom-sheet
<BottomSheet
  ref={bottomSheetRef}
  snapPoints={['25%', '50%', '90%']}
  backgroundStyle={{ backgroundColor: colors.surface.overlay }}
  handleIndicatorStyle={{ backgroundColor: colors.text.tertiary, width: 36 }}
  backdropComponent={renderBackdrop}
  enablePanDownToClose
>
  <SpotCard.Glass spot={selectedSpot} />
</BottomSheet>
```

**Create a `SheetProvider` pattern** for managing sheets app-wide:
- Spot detail sheet
- Filter sheet
- Share sheet
- Add note sheet
- Report sheet

Each uses the same glass background, handle style, and animation config from the theme.

---

## 29. Navigation Design

### Current Best Practice

**Tab bar (2025-2026):**
- 3-5 tabs maximum (odd numbers create visual rhythm)
- Center tab can be elevated for primary action
- Glass/blur background for premium feel
- Active: filled icon + accent color + label
- Inactive: outline icon + muted color
- Hide on scroll down, reappear on scroll up
- Haptic feedback on tab switch
- Animated indicator (sliding dot or bar)

**Header:**
- Minimal: app logo or screen title only
- Contextual actions in top-right (search, filter, settings)
- Large title that collapses on scroll (iOS pattern)
- Transparent/glass header over content for immersive feel

**Screen transitions:**
- Push: slide from right (iOS default, now on Android too)
- Modal: slide from bottom + backdrop dim
- Form sheet: iOS partial-height sheet with grabber
- Fade: for contextual changes within same hierarchy

### x/pat Current State

3-tab setup (Home, Discover, Profile) with custom GlassTabBar. Stack navigator with platform-appropriate transitions. iOS form sheet for SpotDetail with snap points. Android uses fade-from-bottom for modals.

### x/pat Recommendation

**The navigation architecture is well-designed. Refinements:**

1. **Add tab bar hide-on-scroll**: When scrolling feed/explore, animate tab bar out to maximize content area. Reappear on scroll up or tap status bar

2. **Consider a floating action button** for "Add Spot" instead of relying on navigation to the AddSpot screen. A FAB on the Discover/Explore tab provides persistent access to the primary action:
```typescript
// Positioned 16px above tab bar, right-aligned
<FloatingActionButton
  icon="plus"
  onPress={navigateToAddSpot}
  style={{ backgroundColor: colors.accent.primary }}
/>
```

3. **Collapsing header** on scrollable screens (Profile, Explore list view). Use `Animated.ScrollView` with `onScroll` to interpolate header height and title size

4. **Transition consistency**: Ensure all modals use the same animation duration and easing across the app. Currently SpotDetail uses iOS form sheet while AddSpot uses slide-from-bottom -- this inconsistency is noticeable

---

## 30. Brand Expression in UI

### Current Best Practice

Brand expression in 2026 is about **micro-details**, not large branding elements:

1. **Microcopy**: Every label, button, error message, and placeholder carries brand voice. "Discover" vs "Browse" vs "Explore" communicates different personalities

2. **Custom illustrations**: Personalized illustrations for empty states, onboarding, and achievements differentiate from generic icon-based apps

3. **Signature interaction**: One unique interaction that is "yours" -- Tinder's swipe, Instagram's double-tap, BeReal's dual-camera. This becomes the brand's physical identity

4. **Color as identity**: Monzo's hot coral, Strava's orange, Spotify's green. One signature color used consistently becomes instant recognition

5. **Sound and haptics**: Custom haptic patterns for key actions create subconscious brand association

6. **Loading and transition personality**: Custom pull-to-refresh animation, branded skeleton shimmer color, transition choreography

7. **Contextual adaptation**: A travel app could change its UI based on trip stage or time of day

### x/pat Current State

x/pat's brand personality is partially expressed:
- **Teal accent (#2EC4A0)** is the signature color -- used consistently
- **Glass aesthetic** is a visual differentiator
- **DM Serif Display** gives headline personality
- Missing: brand voice in microcopy, custom illustrations, signature interaction, contextual adaptation

### x/pat Recommendation

**Define and implement x/pat's brand expression system:**

1. **Brand voice guide** (for all microcopy):
   - Tone: Knowledgeable insider, not tourist guidebook
   - Example: "Locals' pick" not "Popular place"; "Hidden gem" not "Attraction"
   - Error tone: Confident but empathetic ("We lost the connection. Pull down to try again.")
   - Success tone: Understated ("Saved" not "Awesome! You saved a spot!")

2. **Signature interaction**: The **spot save animation** should be x/pat's "double-tap to like" moment. When a user saves a spot, the bookmark icon fills with teal, a subtle glow emanates, and a satisfying haptic fires. This 300ms moment becomes the physical brand identity.

3. **Accent color refinement**: Teal (#2EC4A0) is a strong choice. Consider naming it formally as part of the brand: "x/pat Teal" or "Expat Green." Ensure it appears on every screen in at least one element (active tab, accent text, button, glow dot) for consistent brand presence.

4. **Contextual touches**:
   - Time-of-day greeting on home screen ("Good morning" / "Good evening")
   - City-themed subtle background tints (warm amber glow for Bangkok, cool blue for Lisbon)
   - Seasonal or event-based accent variations for delight

5. **Custom pull-to-refresh**: Replace generic spinner with a branded animation -- compass needle spinning, or x/pat logo pulse. This is the most frequently seen loading animation and a prime brand touchpoint.

---

## Summary: Priority Recommendations for x/pat

### Immediate (Before Next Build)

| Priority | Action | Impact |
|----------|--------|--------|
| 1 | Refactor `src/theme/index.ts` to semantic token system | Foundation for everything else |
| 2 | Centralize animation tokens (eliminate per-component spring configs) | Consistency, maintainability |
| 3 | Formalize typography scale (add named sizes, consider replacing Space Mono for body) | Readability, premium feel |
| 4 | Expand spacing scale with intermediate values and semantic aliases | Design consistency |
| 5 | Accessibility audit: contrast ratios, touch targets, screen reader labels | App Store requirement |

### Next Sprint

| Priority | Action | Impact |
|----------|--------|--------|
| 6 | Create reusable animation hooks (`useFadeIn`, `useScalePulse`, `useShake`) | Polish, consistency |
| 7 | Build EmptyState component with x/pat brand voice | User experience |
| 8 | Upgrade Skeleton to shimmer gradient | Perceived performance |
| 9 | Create SpotCard variants (Compact, Glass, Featured) | Visual versatility |
| 10 | Build tiered error components (Toast, InlineError, SectionError) | Error handling UX |

### Future Enhancements

| Priority | Action | Impact |
|----------|--------|--------|
| 11 | Migrate to @gorhom/bottom-sheet for sheet infrastructure | Engineering quality |
| 12 | Test expo-blur Android support (SDK 55) | Real blur on Android |
| 13 | Add collapsing headers and tab-bar-hide-on-scroll | Premium navigation feel |
| 14 | Build form component system (FormInput, FormSelect, FormStepper) | Consistent forms |
| 15 | Implement reduced motion support | Accessibility compliance |

### Do Not Adopt

| Library/Approach | Reason |
|------------------|--------|
| React Native Paper | Material Design conflicts with Mercury aesthetic |
| Tamagui | Over-engineered for native-only app, web benefits irrelevant |
| Full NativeWind migration | Too costly mid-project; enhance existing theme instead |
| Full Neumorphism | Conflicts with Mercury flat-glass aesthetic |
| Storybook | Solo developer does not need component documentation infrastructure |

---

## Sources

- [LogRocket: Best React Native UI Libraries 2026](https://blog.logrocket.com/best-react-native-ui-component-libraries/)
- [Gluestack: Best React Native Component Library](https://market.gluestack.io/blog/best-react-native-component-library)
- [React Native Paper Theming](https://callstack.github.io/react-native-paper/docs/guides/theming/)
- [Medium: Design Systems in React.js 2025](https://the-expert-developer.medium.com/design-systems-in-react-js-2025-token-driven-themed-and-cross-platform-25622a418f14)
- [iTitans: Design Tokens & Cross-Platform Consistency](https://ititans.com/blog/cross-platform-mobile-ui-with-design-tokens/)
- [UX Planet: Mercury Fintech App Design](https://uxplanet.org/captivating-design-of-the-mercury-fintech-app-d472bc0288bb)
- [Cygnis: Implementing Liquid Glass UI in React Native](https://cygnis.co/blog/implementing-liquid-glass-ui-react-native/)
- [Trifleck: Liquid Glass UI React Native 2026](https://www.trifleck.com/blog/implementing-liquid-glass-ui-in-react-native-complete-guide-2026)
- [Medium: Dark Glassmorphism 2026](https://medium.com/@developer_89726/dark-glassmorphism-the-aesthetic-that-will-define-ui-in-2026-93aa4153088f)
- [Reanimated: withSpring Documentation](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring/)
- [Reanimated: withTiming Documentation](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/)
- [NativeWind Documentation](https://www.nativewind.dev/)
- [NativeWind v5 Migration Guide](https://www.nativewind.dev/v5/guides/migrate-from-v4)
- [Shopify Restyle GitHub](https://github.com/Shopify/restyle)
- [Restyle Getting Started](https://shopify.github.io/restyle/)
- [gorhom/react-native-bottom-sheet](https://gorhom.dev/react-native-bottom-sheet/)
- [Expo: Storybook and Expo](https://expo.dev/blog/storybook-and-expo)
- [Medium: Figma 2026 Updates Design-Dev Handoff](https://medium.com/@Rythmuxdesigner/figmas-2026-updates-quietly-redefine-design-dev-handoff-and-not-everyone-s-ready-98907f2ea2a8)
- [Tech-RZ: Dark Mode Design Best Practices 2026](https://www.tech-rz.com/blog/dark-mode-design-best-practices-in-2026/)
- [Digital Silk: Dark Mode Design Guide 2026](https://www.digitalsilk.com/digital-trends/dark-mode-design-guide/)
- [LogRocket: Linear Design SaaS Trend](https://blog.logrocket.com/ux-design/linear-design/)
- [AllAccessible: WCAG Color Contrast Guide 2025](https://www.allaccessible.org/blog/color-contrast-accessibility-wcag-guide-2025)
- [React Native: Accessibility Documentation](https://reactnative.dev/docs/accessibility)
- [PrimoTech: UI/UX Evolution 2026 Micro-Interactions & Motion](https://primotech.com/ui-ux-evolution-2026-why-micro-interactions-and-motion-matter-more-than-ever/)
- [Spec.fm: 8-Point Grid](https://spec.fm/specifics/8-pt-grid)
- [Medium: Choosing 4pt 8pt Geometric Spacing](https://medium.com/design-bootcamp/design-that-breathes-choosing-between-4pt-8pt-and-geometric-spacing-30c84766f1a3)
- [DesignSystems.com: Spacing, Grids, and Layouts](https://www.designsystems.com/space-grids-and-layouts/)
- [Imperavi: Designing Semantic Colors](https://imperavi.com/blog/designing-semantic-colors-for-your-system/)
- [Medium: Color Tokens Guide Dark Light Modes](https://medium.com/design-bootcamp/color-tokens-guide-to-light-and-dark-modes-in-design-systems-146ab33023ac)
- [Big Human: Neumorphism Complete 2026 Guide](https://www.bighuman.com/blog/neumorphism)
- [Expo: Haptics Documentation](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [Expo: BlurView Documentation](https://docs.expo.dev/versions/latest/sdk/blur-view/)
- [Medium: Empty State Design](https://medium.com/@vioscott/%EF%B8%8F-empty-state-design-the-most-overlooked-ux-pattern-in-modern-frontend-5b2406255a14)
- [LogRocket: UI Best Practices Loading Error Empty State](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/)
- [OneUptime: Skeleton Loading in React Native](https://oneuptime.com/blog/post/2026-01-15-react-native-skeleton-loading/view)
- [Skeleton Screens vs Spinners: Perceived Performance](https://ui-deploy.com/blog/skeleton-screens-vs-spinners-optimizing-perceived-performance)
- [Big Human: UI/UX Design Trends 2026](https://www.bighuman.com/blog/top-ui-ux-design-trends)
- [ProductCrafters: Responsive React Native Apps 2026](https://productcrafters.io/blog/responsive-react-native-apps/)

---

*This research report covers the complete design system landscape for React Native in 2025-2026, with specific recommendations tailored to x/pat's Mercury-inspired dark mode aesthetic, current codebase, and solo-developer workflow.*
