import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { usePostHog } from '../lib/posthog';

interface CheckInButtonProps {
  spotId: number;
  spotName: string;
  userId: string | undefined;
  onCheckIn: () => void;
}

export default function CheckInButton({
  spotId,
  spotName,
  userId,
  onCheckIn,
}: CheckInButtonProps) {
  const posthog = usePostHog();
  const [count, setCount] = useState(0);
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCheckIns = useCallback(async () => {
    const fourHoursAgo = new Date(
      Date.now() - 4 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from('check_ins')
      .select('id, user_id')
      .eq('spot_id', spotId)
      .gte('created_at', fourHoursAgo);

    if (!error && data) {
      setCount(data.length);
      if (userId) {
        setCheckedIn(data.some((row) => row.user_id === userId));
      }
    }
  }, [spotId, userId]);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  const handleCheckIn = async () => {
    if (!userId || checkedIn || loading) return;

    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { error } = await supabase.from('check_ins').insert({
        spot_id: spotId,
        user_id: userId,
      });

      if (!error) {
        posthog.capture('check_in', { spot_id: spotId, spot_name: spotName });
        setCheckedIn(true);
        setCount((prev) => prev + 1);
        onCheckIn();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, checkedIn && styles.buttonChecked]}
        onPress={handleCheckIn}
        disabled={checkedIn || loading || !userId}
        activeOpacity={0.7}
      >
        {checkedIn ? (
          <Text style={styles.checkedText}>Checked in ✓</Text>
        ) : (
          <>
            <Feather name="log-in" size={16} color={colors.dark.text} />
            <Text style={styles.buttonText}>Check in</Text>
          </>
        )}
      </TouchableOpacity>

      {count > 0 && (
        <Text style={styles.countText}>{count} here now</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  buttonChecked: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.teal,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.bg,
  },
  checkedText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.teal,
  },
  countText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
});
