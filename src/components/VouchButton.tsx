/**
 * VouchButton — "I met [Name] at [Spot] -- they're legit"
 *
 * Implements Chesky's friend-of-a-friend trust signal.
 * After mutual check-in at a spot, enables vouching with IRL context.
 * Glass morphism card with voucher avatar, spot name, date.
 *
 * Usage:
 *   <VouchButton
 *     recipientId={userId}
 *     recipientName="Sarah"
 *     mutualSpot={{ id: 42, name: "Punspace", city: "Chiang Mai" }}
 *   />
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import { useTrust } from '../hooks/useTrust';
import GlassView from './GlassView';

interface MutualSpot {
  id: number;
  name: string;
  city: string;
}

interface VouchButtonProps {
  recipientId: string;
  recipientName: string;
  /** If provided, pre-fills the vouch with spot context */
  mutualSpot?: MutualSpot;
  /** Compact mode for inline use */
  compact?: boolean;
  /** Callback after successful vouch */
  onVouched?: () => void;
}

export default function VouchButton({
  recipientId,
  recipientName,
  mutualSpot,
  compact = false,
  onVouched,
}: VouchButtonProps) {
  const { hasVouched, submitVouch, removeVouch } = useTrust();
  const [alreadyVouched, setAlreadyVouched] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    hasVouched(recipientId).then((v) => {
      if (mounted) {
        setAlreadyVouched(v);
        setChecking(false);
      }
    });
    return () => { mounted = false; };
  }, [recipientId, hasVouched]);

  const handleVouch = useCallback(async () => {
    setLoading(true);
    const result = await submitVouch(
      recipientId,
      note || `Met ${recipientName}${mutualSpot ? ` at ${mutualSpot.name}` : ''} -- they're legit`,
      mutualSpot?.id,
      mutualSpot?.name,
      mutualSpot?.city,
    );

    if (result.success) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAlreadyVouched(true);
      setShowSheet(false);
      setNote('');
      onVouched?.();
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setLoading(false);
  }, [recipientId, recipientName, mutualSpot, note, submitVouch, onVouched]);

  const handleUnvouch = useCallback(async () => {
    const success = await removeVouch(recipientId);
    if (success) {
      setAlreadyVouched(false);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [recipientId, removeVouch]);

  if (checking) return null;

  // Already vouched — show confirmation state
  if (alreadyVouched) {
    return (
      <TouchableOpacity
        style={[styles.vouchedBtn, compact && styles.compact]}
        onLongPress={handleUnvouch}
        delayLongPress={1000}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`You vouched for ${recipientName}. Long press to remove.`}
      >
        <Feather name="check-circle" size={compact ? 12 : 14} color={colors.teal} />
        {!compact && <Text style={styles.vouchedText}>Vouched</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.vouchBtn, compact && styles.compact]}
        onPress={() => setShowSheet(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Vouch for ${recipientName}`}
        accessibilityHint="Opens vouch form to confirm you met this person"
      >
        <Feather name="heart" size={compact ? 12 : 14} color={colors.amber} />
        {!compact && <Text style={styles.vouchText}>Vouch</Text>}
      </TouchableOpacity>

      {/* Vouch sheet */}
      <Modal
        visible={showSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSheet(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowSheet(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>
              Vouch for {recipientName}
            </Text>
            <Text style={styles.sheetSubtitle}>
              Let the community know {recipientName} is legit
            </Text>

            {mutualSpot && (
              <GlassView variant="subtle" style={styles.spotContext}>
                <Feather name="map-pin" size={14} color={colors.teal} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.spotName}>{mutualSpot.name}</Text>
                  <Text style={styles.spotCity}>{mutualSpot.city}</Text>
                </View>
              </GlassView>
            )}

            <TextInput
              style={styles.noteInput}
              placeholder={`What was it like meeting ${recipientName}?`}
              placeholderTextColor={colors.dark.text3}
              value={note}
              onChangeText={setNote}
              maxLength={140}
              multiline
              numberOfLines={2}
              accessibilityLabel="Vouch note"
            />
            <Text style={styles.charCount}>{note.length}/140</Text>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleVouch}
              disabled={loading}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Submitting vouch' : 'Submit vouch'}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.dark.bg} />
              ) : (
                <>
                  <Feather name="heart" size={16} color={colors.dark.bg} />
                  <Text style={styles.submitText}>
                    {mutualSpot
                      ? `Vouch -- met at ${mutualSpot.name}`
                      : `Vouch for ${recipientName}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  vouchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(232,128,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(232,128,58,0.25)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  vouchedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(46,196,160,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,196,160,0.2)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  compact: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  vouchText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.amber,
  },
  vouchedText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.teal,
  },
  // Sheet
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.dark.bg2,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.xl,
    ...shadows.sheet,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.bg4,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  spotContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  spotName: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.text,
  },
  spotCity: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  noteInput: {
    backgroundColor: colors.dark.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text3,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.amber,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.bg,
  },
});
