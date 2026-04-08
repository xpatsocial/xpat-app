/**
 * CityArrivalPrompt — shows a toast when the user arrives in a new city
 *
 * Monitors city_presence changes and prompts: "You arrived in [City]! Share your arrival?"
 * with Share / Dismiss buttons. Opens ShareCardModal with a City Arrival card.
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import ShareCardModal from './ShareCardModal';
import type { ShareableCardData } from './ShareableCard';

const LAST_ARRIVAL_CITY_KEY = 'xpat_last_arrival_city';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Country flag emoji lookup (common nomad destinations)
const CITY_EMOJI: Record<string, string> = {
  Bangkok: '\uD83C\uDDF9\uD83C\uDDED',
  'Chiang Mai': '\uD83C\uDDF9\uD83C\uDDED',
  Lisbon: '\uD83C\uDDF5\uD83C\uDDF9',
  Porto: '\uD83C\uDDF5\uD83C\uDDF9',
  'Mexico City': '\uD83C\uDDF2\uD83C\uDDFD',
  Bali: '\uD83C\uDDEE\uD83C\uDDE9',
  Tokyo: '\uD83C\uDDEF\uD83C\uDDF5',
  Berlin: '\uD83C\uDDE9\uD83C\uDDEA',
  Barcelona: '\uD83C\uDDEA\uD83C\uDDF8',
  Medellin: '\uD83C\uDDE8\uD83C\uDDF4',
  'Buenos Aires': '\uD83C\uDDE6\uD83C\uDDF7',
  Tbilisi: '\uD83C\uDDEC\uD83C\uDDEA',
  Dubai: '\uD83C\uDDE6\uD83C\uDDEA',
  'Da Nang': '\uD83C\uDDFB\uD83C\uDDF3',
  'Ho Chi Minh City': '\uD83C\uDDFB\uD83C\uDDF3',
};

interface CityArrivalPromptProps {
  city: string | null;
  country: string | null;
}

export default function CityArrivalPrompt({ city, country }: CityArrivalPromptProps) {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [showToast, setShowToast] = useState(false);
  const [arrivalCity, setArrivalCity] = useState('');
  const [arrivalCountry, setArrivalCountry] = useState('');
  const [shareCardVisible, setShareCardVisible] = useState(false);
  const [shareCardData, setShareCardData] = useState<ShareableCardData | null>(null);
  const translateY = useSharedValue(-120);

  useEffect(() => {
    if (!city || !country || !user) return;

    (async () => {
      const lastCity = await AsyncStorage.getItem(LAST_ARRIVAL_CITY_KEY);
      if (lastCity === city) return; // Already shown for this city

      // New city detected
      await AsyncStorage.setItem(LAST_ARRIVAL_CITY_KEY, city);
      setArrivalCity(city);
      setArrivalCountry(country);
      setShowToast(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate in
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });

      // Auto-dismiss after 8 seconds
      setTimeout(() => {
        dismissToast();
      }, 8000);
    })();
  }, [city, country, user]);

  function dismissToast() {
    translateY.value = withSpring(-120, { damping: 20, stiffness: 200 }, () => {
      runOnJS(setShowToast)(false);
    });
  }

  function handleShareArrival() {
    dismissToast();
    if (!user || !profile) return;

    setShareCardData({
      type: 'city_arrival',
      data: {
        userName: profile.display_name || 'Nomad',
        userId: user.id,
        avatarUrl: profile.avatar_url,
        city: arrivalCity,
        country: arrivalCountry,
        cityEmoji: CITY_EMOJI[arrivalCity],
      },
    });
    // Small delay to let toast dismiss animation play
    setTimeout(() => setShareCardVisible(true), 300);
  }

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!showToast && !shareCardVisible) return null;

  return (
    <>
      {showToast && (
        <Animated.View
          style={[
            styles.toast,
            { top: insets.top + spacing.sm },
            animatedStyle,
          ]}
        >
          <View style={styles.toastContent}>
            <View style={styles.toastIcon}>
              <Text style={styles.toastEmoji}>
                {CITY_EMOJI[arrivalCity] || '\uD83C\uDF0D'}
              </Text>
            </View>
            <View style={styles.toastTextCol}>
              <Text style={styles.toastTitle}>
                You arrived in {arrivalCity}!
              </Text>
              <Text style={styles.toastSubtitle}>Share your arrival?</Text>
            </View>
          </View>
          <View style={styles.toastActions}>
            <TouchableOpacity
              style={styles.shareToastBtn}
              onPress={handleShareArrival}
              activeOpacity={0.8}
            >
              <Feather name="share" size={14} color={colors.dark.bg} />
              <Text style={styles.shareToastBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={dismissToast}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <ShareCardModal
        visible={shareCardVisible}
        card={shareCardData}
        onDismiss={() => setShareCardVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 999,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  toastIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46,196,160,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastEmoji: {
    fontSize: 20,
  },
  toastTextCol: {
    flex: 1,
  },
  toastTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.dark.text,
  },
  toastSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginTop: 1,
  },
  toastActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  shareToastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  shareToastBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.bg,
  },
  dismissBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dismissBtnText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
});
