/**
 * ShareCardModal — full-screen modal that renders a ShareableCard preview
 * with Share / Save / Dismiss actions.
 *
 * Used by ProfileScreen, SpotDetailScreen, and city arrival flow.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import ShareableCard, {
  ShareableCardData,
  CardAspect,
} from './ShareableCard';
import { useShareableCards } from '../hooks/useShareableCards';

interface ShareCardModalProps {
  visible: boolean;
  card: ShareableCardData | null;
  onDismiss: () => void;
}

export default function ShareCardModal({ visible, card, onDismiss }: ShareCardModalProps) {
  const insets = useSafeAreaInsets();
  const { viewShotRef, captureCard, shareCard, saveCard, trackShare } = useShareableCards();
  const [aspect, setAspect] = useState<CardAspect>('story');
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleShare = useCallback(async () => {
    if (!card) return;
    setSharing(true);
    try {
      const uri = await captureCard();
      if (uri) {
        await shareCard(uri);
        await trackShare(card.type, { aspect });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setSharing(false);
    }
  }, [card, aspect, captureCard, shareCard, trackShare]);

  const handleSave = useCallback(async () => {
    if (!card) return;
    setSaving(true);
    try {
      const uri = await captureCard();
      if (uri) {
        const success = await saveCard(uri);
        if (success) {
          setSavedSuccess(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => setSavedSuccess(false), 2000);
          await trackShare(card.type, { aspect, action: 'save' });
        }
      }
    } finally {
      setSaving(false);
    }
  }, [card, aspect, captureCard, saveCard, trackShare]);

  if (!card) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={[styles.root, { paddingTop: insets.top + spacing.md }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Share Card</Text>
          <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
            <Feather name="x" size={20} color={colors.dark.text} />
          </TouchableOpacity>
        </View>

        {/* Aspect toggle */}
        <View style={styles.aspectRow}>
          <TouchableOpacity
            style={[styles.aspectBtn, aspect === 'story' && styles.aspectBtnActive]}
            onPress={() => setAspect('story')}
          >
            <Feather name="smartphone" size={14} color={aspect === 'story' ? colors.dark.bg : colors.dark.text2} />
            <Text style={[styles.aspectText, aspect === 'story' && styles.aspectTextActive]}>
              Story
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aspectBtn, aspect === 'square' && styles.aspectBtnActive]}
            onPress={() => setAspect('square')}
          >
            <Feather name="square" size={14} color={aspect === 'square' ? colors.dark.bg : colors.dark.text2} />
            <Text style={[styles.aspectText, aspect === 'square' && styles.aspectTextActive]}>
              Square
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card preview */}
        <ScrollView
          contentContainerStyle={styles.previewContainer}
          showsVerticalScrollIndicator={false}
        >
          <ShareableCard ref={viewShotRef} card={card} aspect={aspect} />
        </ScrollView>

        {/* Action buttons */}
        <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            disabled={sharing}
            activeOpacity={0.8}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={colors.dark.bg} />
            ) : (
              <>
                <Feather name="share-2" size={18} color={colors.dark.bg} />
                <Text style={styles.shareBtnText}>Share</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.teal} />
            ) : savedSuccess ? (
              <>
                <Feather name="check" size={18} color={colors.green} />
                <Text style={[styles.saveBtnText, { color: colors.green }]}>Saved!</Text>
              </>
            ) : (
              <>
                <Feather name="download" size={18} color={colors.teal} />
                <Text style={styles.saveBtnText}>Save to Photos</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.bg0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  aspectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.dark.bg2,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  aspectBtnActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  aspectText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  aspectTextActive: {
    color: colors.dark.bg,
    fontFamily: fonts.bodyBold,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: colors.dark.border,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  shareBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.bg,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  saveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.teal,
  },
});
