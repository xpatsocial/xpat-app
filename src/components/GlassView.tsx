import React from 'react';
import { View, Platform, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * Platform-aware blur wrapper.
 * - iOS: renders expo-blur BlurView (native vibrancy).
 * - Android: renders a solid semi-transparent dark View that matches the
 *   app's dark theme, avoiding BlurView rendering issues on SDK < 31.
 */
export default function GlassView({ intensity, tint, style, children }: GlassViewProps) {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint={tint} style={style}>
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[{ backgroundColor: 'rgba(28,28,30,0.92)' }, style]}>
      {children}
    </View>
  );
}
