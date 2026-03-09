import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withRepeat,
  withSequence, interpolateColor, FadeIn, FadeOut, SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fonts, spacing, radius } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VIBES = [
  'Cafes', 'Coworking', 'Coliving', 'Food',
  'Experiences', 'Stays', 'Community', 'Events',
];

const CITIES = [
  { name: 'Bangkok', flag: '🇹🇭', spots: 342 },
  { name: 'Lisbon', flag: '🇵🇹', spots: 218 },
  { name: 'Mexico City', flag: '🇲🇽', spots: 176 },
];

interface OnboardingScreenProps {
  navigation: any;
}

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [otherCity, setOtherCity] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  // Animated gradient shift
  const gradientProgress = useSharedValue(0);

  useEffect(() => {
    gradientProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000 }),
        withTiming(0, { duration: 4000 }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedBg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      gradientProgress.value,
      [0, 1],
      [colors.dark.bg, '#162A25'],
    ),
  }));

  const toggleVibe = useCallback((vibe: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedVibes((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe],
    );
  }, []);

  const selectCity = useCallback((city: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCity(city);
    setShowOtherInput(false);
    setOtherCity('');
  }, []);

  const handleOtherCity = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCity(null);
    setShowOtherInput(true);
  }, []);

  async function handleFinish() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const city = selectedCity || otherCity || 'Unknown';
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await AsyncStorage.setItem('onboarding_vibes', JSON.stringify(selectedVibes));
    await AsyncStorage.setItem('onboarding_city', city);
    navigation.replace('Auth');
  }

  function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => s + 1);
  }

  return (
    <Animated.View style={[styles.container, animatedBg]}>
      {/* Step 1: Welcome */}
      {step === 0 && (
        <Animated.View
          entering={FadeIn.duration(600)}
          exiting={SlideOutLeft.duration(300)}
          style={styles.stepContainer}
        >
          <View style={styles.centerContent}>
            <Text style={styles.brand}>
              <Text style={styles.brandX}>x</Text>
              <Text style={styles.brandSlash}>/</Text>
              <Text style={styles.brandPat}>pat</Text>
            </Text>

            <Text style={styles.tagline}>your world, shared</Text>

            <Text style={styles.subtitle}>
              The free social travel app for digital nomads
            </Text>
          </View>

          <View style={styles.bottomAction}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Step 2: Vibes */}
      {step === 1 && (
        <Animated.View
          entering={SlideInRight.duration(300)}
          exiting={SlideOutLeft.duration(300)}
          style={styles.stepContainer}
        >
          <View style={styles.topContent}>
            <Text style={styles.stepTitle}>What are you looking for?</Text>
            <Text style={styles.stepSubtitle}>Select all that match your vibe</Text>

            <View style={styles.pillGrid}>
              {VIBES.map((vibe) => {
                const isSelected = selectedVibes.includes(vibe);
                return (
                  <TouchableOpacity
                    key={vibe}
                    onPress={() => toggleVibe(vibe)}
                    activeOpacity={0.7}
                  >
                    <BlurView
                      intensity={isSelected ? 40 : 20}
                      tint="dark"
                      style={[
                        styles.pill,
                        isSelected && styles.pillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          isSelected && styles.pillTextSelected,
                        ]}
                      >
                        {vibe}
                      </Text>
                    </BlurView>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.bottomAction}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                selectedVibes.length === 0 && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={selectedVibes.length === 0}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Step 3: City */}
      {step === 2 && (
        <Animated.View
          entering={SlideInRight.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.stepContainer}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.topContent}>
                <Text style={styles.stepTitle}>Where are you now?</Text>
                <Text style={styles.stepSubtitle}>
                  We'll show you spots nearby
                </Text>

                <View style={styles.cityList}>
                  {CITIES.map((city) => {
                    const isSelected = selectedCity === city.name;
                    return (
                      <TouchableOpacity
                        key={city.name}
                        onPress={() => selectCity(city.name)}
                        activeOpacity={0.7}
                      >
                        <BlurView
                          intensity={isSelected ? 40 : 20}
                          tint="dark"
                          style={[
                            styles.cityCard,
                            isSelected && styles.cityCardSelected,
                          ]}
                        >
                          <Text style={styles.cityFlag}>{city.flag}</Text>
                          <View style={styles.cityInfo}>
                            <Text
                              style={[
                                styles.cityName,
                                isSelected && styles.cityNameSelected,
                              ]}
                            >
                              {city.name}
                            </Text>
                            <Text style={styles.citySpots}>
                              {city.spots} spots
                            </Text>
                          </View>
                          {isSelected && (
                            <View style={styles.checkmark}>
                              <Text style={styles.checkmarkText}>✓</Text>
                            </View>
                          )}
                        </BlurView>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Other city option */}
                  <TouchableOpacity
                    onPress={handleOtherCity}
                    activeOpacity={0.7}
                  >
                    <BlurView
                      intensity={showOtherInput ? 40 : 20}
                      tint="dark"
                      style={[
                        styles.cityCard,
                        showOtherInput && styles.cityCardSelected,
                      ]}
                    >
                      <Text style={styles.cityFlag}>🌍</Text>
                      <View style={styles.cityInfo}>
                        <Text
                          style={[
                            styles.cityName,
                            showOtherInput && styles.cityNameSelected,
                          ]}
                        >
                          Other city
                        </Text>
                        <Text style={styles.citySpots}>Tell us where</Text>
                      </View>
                    </BlurView>
                  </TouchableOpacity>

                  {showOtherInput && (
                    <Animated.View entering={FadeIn.duration(200)}>
                      <TextInput
                        style={styles.cityInput}
                        placeholder="Enter your city..."
                        placeholderTextColor={colors.dark.text2}
                        value={otherCity}
                        onChangeText={setOtherCity}
                        autoFocus
                        autoCapitalize="words"
                      />
                    </Animated.View>
                  )}
                </View>
              </View>
            </ScrollView>

            <View style={styles.bottomAction}>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !selectedCity && !otherCity.trim() && styles.buttonDisabled,
                ]}
                onPress={handleFinish}
                disabled={!selectedCity && !otherCity.trim()}
              >
                <Text style={styles.primaryButtonText}>Let's go!</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      )}

      {/* Step indicators */}
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.dot, step === i && styles.dotActive]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 80,
    paddingBottom: 100,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topContent: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Brand
  brand: {
    fontFamily: fonts.heading,
    fontSize: 64,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  brandX: { color: colors.amber },
  brandSlash: { color: colors.teal },
  brandPat: { color: colors.dark.text },

  tagline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text2,
    textAlign: 'center',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark.text2,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },

  // Step titles
  stepTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  stepSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    marginBottom: spacing.xl,
  },

  // Vibe pills
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md + spacing.xs,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  pillSelected: {
    borderColor: colors.teal,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  pillText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text2,
  },
  pillTextSelected: {
    color: colors.teal,
    fontFamily: fonts.bodyBold,
  },

  // City cards
  cityList: {
    gap: spacing.sm + spacing.xs,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cityCardSelected: {
    borderColor: colors.teal,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  cityFlag: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.text,
    marginBottom: 2,
  },
  cityNameSelected: {
    color: colors.teal,
  },
  citySpots: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: colors.dark.bg,
    fontSize: 14,
    fontWeight: '700',
  },
  cityInput: {
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.12)',
  },

  // Buttons
  bottomAction: {
    paddingTop: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.bg,
  },

  // Step dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.bg3,
  },
  dotActive: {
    backgroundColor: colors.teal,
    width: 24,
  },
});
