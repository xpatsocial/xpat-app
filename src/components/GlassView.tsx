import React from 'react';
import { View, Platform, StyleProp, ViewStyle, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';

/**
 * Preset blur variants matching iOS 18 material styles.
 * Each variant maps to a blur intensity and an Android fallback opacity.
 */
const VARIANT_CONFIG = {
  subtle: { intensity: 20, androidOpacity: 0.75 },
  medium: { intensity: 60, androidOpacity: 0.85 },
  heavy: { intensity: 90, androidOpacity: 0.95 },
} as const;

/**
 * iOS blur tint intensities mapped to expo-blur's experimentalBlurMethod.
 * These correspond to UIBlurEffect.Style values in UIKit.
 */
type BlurTintIntensity =
  | 'ultraThinMaterial'
  | 'thinMaterial'
  | 'regular'
  | 'thickMaterial'
  | 'chromeMaterial';

/** Maps our named intensities to expo-blur tint + intensity overrides */
const TINT_INTENSITY_MAP: Record<BlurTintIntensity, { tint: 'light' | 'dark' | 'default'; intensityBoost: number }> = {
  ultraThinMaterial: { tint: 'default', intensityBoost: -15 },
  thinMaterial: { tint: 'default', intensityBoost: -5 },
  regular: { tint: 'default', intensityBoost: 0 },
  thickMaterial: { tint: 'default', intensityBoost: 10 },
  chromeMaterial: { tint: 'light', intensityBoost: 15 },
};

export type GlassVariant = 'subtle' | 'medium' | 'heavy';

interface GlassViewProps {
  /** Direct intensity override (takes precedence over variant) */
  intensity?: number;
  /** Blur tint — 'light', 'dark', or 'default'. Adapts to system appearance when 'default'. */
  tint?: 'light' | 'dark' | 'default';
  /** Named iOS material tint intensity */
  tintIntensity?: BlurTintIntensity;
  /** Preset variant: 'subtle' (20), 'medium' (60), 'heavy' (90) */
  variant?: GlassVariant;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Platform-aware blur wrapper.
 * - iOS: renders expo-blur BlurView (native vibrancy) that adapts to
 *   system appearance changes automatically.
 * - Android: renders a solid semi-transparent dark View that matches the
 *   app's dark theme, avoiding BlurView rendering issues on SDK < 31.
 */
export default function GlassView({
  intensity,
  tint,
  tintIntensity,
  variant,
  style,
  children,
}: GlassViewProps) {
  // System appearance for adaptive blur tint
  const colorScheme = useColorScheme();

  if (Platform.OS === 'ios') {
    // Resolve intensity: explicit prop > variant > default 40
    const variantConfig = variant ? VARIANT_CONFIG[variant] : undefined;
    let resolvedIntensity = intensity ?? variantConfig?.intensity ?? 40;

    // Resolve tint: explicit prop > tintIntensity mapping > appearance-adaptive default
    let resolvedTint = tint;
    if (!resolvedTint && tintIntensity) {
      const mapped = TINT_INTENSITY_MAP[tintIntensity];
      resolvedTint = mapped.tint;
      resolvedIntensity = Math.max(0, Math.min(100, resolvedIntensity + mapped.intensityBoost));
    }
    if (!resolvedTint) {
      // Adapt to system appearance — dark UI stays dark-tinted
      resolvedTint = colorScheme === 'light' ? 'light' : 'dark';
    }

    return (
      <BlurView intensity={resolvedIntensity} tint={resolvedTint} style={style}>
        {children}
      </BlurView>
    );
  }

  // Android fallback — semi-transparent dark view
  const androidOpacity = variant ? VARIANT_CONFIG[variant].androidOpacity : 0.92;
  return (
    <View style={[{ backgroundColor: `rgba(28,28,30,${androidOpacity})` }, style]}>
      {children}
    </View>
  );
}
