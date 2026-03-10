import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useCityChat } from '../../hooks/useCityChat';
import { useTranslate } from '../../hooks/useTranslate';
import { usePreferences } from '../../hooks/usePreferences';
import { ChatMessage } from '../../types';

export default function ChatTab() {
  const { user, session, profile } = useAuth();
  const navigation = useNavigation<any>();

  if (!session) {
    return (
      <View style={styles.authGate}>
        <View style={styles.iconCircle}>
          <Feather name="message-circle" size={40} color={colors.teal} />
        </View>
        <Text style={styles.authTitle}>City Chat</Text>
        <Text style={styles.authSubtitle}>Sign in to chat with nomads in your city.</Text>
        <TouchableOpacity style={styles.authBtn} onPress={() => navigation.navigate('Auth')} activeOpacity={0.8}>
          <Text style={styles.authBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile?.current_city || !profile?.current_country) {
    return (
      <View style={styles.authGate}>
        <View style={styles.iconCircle}>
          <Feather name="map-pin" size={40} color={colors.amber} />
        </View>
        <Text style={styles.authTitle}>Set your city</Text>
        <Text style={styles.authSubtitle}>Update your profile with your current city to join the local chat.</Text>
        <TouchableOpacity style={styles.authBtn} onPress={() => navigation.navigate('Settings')} activeOpacity={0.8}>
          <Text style={styles.authBtnText}>Go to Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <CityChat
      city={profile.current_city}
      country={profile.current_country}
      userId={user!.id}
      displayName={profile.display_name}
    />
  );
}

interface CityChatProps {
  city: string;
  country: string;
  userId: string;
  displayName: string | null;
}

function CityChat({ city, country, userId }: CityChatProps) {
  const { messages, loading, sending, sendMessage } = useCityChat({ city, country });
  const { translate, isTranslating } = useTranslate();
  const { preferences } = usePreferences();
  const [text, setText] = useState('');
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const flatListRef = useRef<FlatList>(null);

  const targetLang = preferences.preferred_language || 'en';

  const handleSend = useCallback(() => {
    if (!text.trim()) return;
    sendMessage(text.trim());
    setText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [text, sendMessage]);

  const handleTranslate = useCallback(async (msg: ChatMessage) => {
    // Toggle off if already translated
    if (translations[msg.id]) {
      setTranslations((prev) => {
        const next = { ...prev };
        delete next[msg.id];
        return next;
      });
      return;
    }

    const result = await translate(msg.content, targetLang, msg.id);
    if (result) {
      setTranslations((prev) => ({ ...prev, [msg.id]: result.translatedText }));
    }
  }, [translations, translate, targetLang]);

  function renderMessage({ item }: { item: ChatMessage }) {
    const isMe = item.sender_id === userId;
    const senderName = item.profiles?.display_name || 'Anonymous';
    const initial = senderName.charAt(0).toUpperCase();
    const time = new Date(item.created_at).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
    const translated = translations[item.id];
    const translatingThis = isTranslating(item.id, targetLang);

    return (
      <View style={[msgStyles.row, isMe && msgStyles.rowMe]}>
        {!isMe && (
          <View style={msgStyles.avatar}>
            <Text style={msgStyles.avatarText}>{initial}</Text>
          </View>
        )}
        <View style={[msgStyles.bubble, isMe ? msgStyles.bubbleMe : msgStyles.bubbleOther]}>
          {!isMe && <Text style={msgStyles.senderName}>{senderName}</Text>}
          <Text style={[msgStyles.content, isMe && msgStyles.contentMe]}>{item.content}</Text>

          {/* Translation */}
          {translated && (
            <Text style={msgStyles.translatedText}>{translated}</Text>
          )}

          <View style={msgStyles.footer}>
            <Text style={[msgStyles.time, isMe && msgStyles.timeMe]}>{time}</Text>
            {!isMe && !item.id.startsWith('temp-') && (
              <TouchableOpacity
                onPress={() => handleTranslate(item)}
                style={msgStyles.translateBtn}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {translatingThis ? (
                  <ActivityIndicator size={10} color={colors.dark.text3} />
                ) : (
                  <Feather
                    name="globe"
                    size={10}
                    color={translated ? colors.teal : colors.dark.text3}
                  />
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.teal} size="large" />
        <Text style={styles.loadingText}>Joining {city} chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.chatRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={180}
    >
      <View style={styles.channelHeader}>
        <Feather name="map-pin" size={14} color={colors.teal} />
        <Text style={styles.channelName}>{city}, {country}</Text>
        <View style={styles.channelRight}>
          <Feather name="globe" size={12} color={colors.dark.text3} />
          <Text style={styles.channelLang}>{targetLang.toUpperCase()}</Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Feather name="message-circle" size={32} color={colors.dark.text3} />
            <Text style={styles.emptyChatText}>Be the first to say hello!</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          placeholderTextColor={colors.dark.text3}
          multiline
          maxLength={2000}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator color={colors.dark.bg} size="small" />
          ) : (
            <Feather name="send" size={18} color={text.trim() ? colors.dark.bg : colors.dark.text3} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chatRoot: { flex: 1, backgroundColor: colors.dark.bg },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  channelName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.dark.text, flex: 1 },
  channelRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  channelLang: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text3 },
  messageList: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexGrow: 1 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.dark.bg3,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  loadingText: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2 },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.sm },
  emptyChatText: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text3 },
  authGate: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: 100 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(46,196,160,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: 'rgba(46,196,160,0.2)' },
  authTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.dark.text, marginBottom: spacing.sm },
  authSubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  authBtn: { backgroundColor: colors.teal, borderRadius: radius.md, paddingVertical: spacing.sm + spacing.xs, paddingHorizontal: spacing.xl + spacing.lg },
  authBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.dark.bg },
});

const msgStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, marginBottom: spacing.sm },
  rowMe: { flexDirection: 'row-reverse' },
  avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.dark.bg },
  bubble: { maxWidth: '75%', borderRadius: radius.md, padding: spacing.sm, paddingHorizontal: spacing.md },
  bubbleOther: { backgroundColor: colors.dark.bg2, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: 'rgba(46,196,160,0.15)', borderBottomRightRadius: 4 },
  senderName: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.teal, marginBottom: 2 },
  content: { fontFamily: fonts.body, fontSize: 14, color: colors.dark.text, lineHeight: 20 },
  contentMe: { color: colors.dark.text },
  translatedText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  time: { fontFamily: fonts.body, fontSize: 9, color: colors.dark.text3 },
  timeMe: { color: colors.dark.text3 },
  translateBtn: { padding: 2 },
});
