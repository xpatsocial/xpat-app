import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const CATEGORIES = [
  { id: 'bug', label: 'Bug', icon: 'alert-circle' as const },
  { id: 'feature', label: 'Feature Idea', icon: 'zap' as const },
  { id: 'ux', label: 'UX / Design', icon: 'layout' as const },
  { id: 'general', label: 'General', icon: 'message-circle' as const },
];

interface FeedbackSheetProps {
  visible: boolean;
  onClose: () => void;
  screenContext?: string;
}

export default function FeedbackSheet({ visible, onClose, screenContext }: FeedbackSheetProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit() {
    if (!message.trim() || !user) return;
    setSending(true);

    const { error } = await supabase.from('beta_feedback').insert({
      user_id: user.id,
      category,
      message: message.trim(),
      screen_context: screenContext || null,
      app_version: Constants.expoConfig?.version || null,
    });

    setSending(false);

    if (error) {
      Alert.alert('Error', 'Failed to send feedback. Please try again.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Thanks!', 'Your feedback has been received. We read every submission.');
    setMessage('');
    setCategory('general');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Send Feedback</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Feather name="x" size={20} color={colors.dark.text2} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryPill, category === cat.id && styles.categoryActive]}
                onPress={() => { setCategory(cat.id); Haptics.selectionAsync(); }}
                activeOpacity={0.7}
              >
                <Feather name={cat.icon} size={12} color={category === cat.id ? colors.teal : colors.dark.text3} />
                <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Your feedback</Text>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="What's on your mind? Bugs, ideas, anything..."
            placeholderTextColor={colors.dark.text3}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            autoFocus
          />

          <TouchableOpacity
            style={[styles.submitBtn, !message.trim() && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!message.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator color={colors.dark.bg} size="small" />
            ) : (
              <Text style={styles.submitText}>Send Feedback</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.dark.bg2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.dark.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.dark.text },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.dark.text2, textTransform: 'uppercase', marginBottom: spacing.xs, letterSpacing: 0.5 },
  categoryRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md, flexWrap: 'wrap' },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.dark.bg3,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  categoryActive: { backgroundColor: 'rgba(46,196,160,0.12)', borderColor: colors.teal },
  categoryText: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text3 },
  categoryTextActive: { color: colors.teal },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    backgroundColor: colors.dark.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 120,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: colors.dark.bg3 },
  submitText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.dark.bg },
});
