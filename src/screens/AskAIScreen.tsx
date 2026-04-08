import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { getRateLimitError } from '../lib/rateLimiter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Typing Indicator (3 animated dots)
// ---------------------------------------------------------------------------

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={styles.typingRow}>
      <View style={styles.aiBubble}>
        <Text style={styles.aiLabel}>x/pat AI</Text>
        <View style={styles.dotsContainer}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View key={i} style={[styles.dot, dotStyle(dot)]} />
          ))}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Suggested Prompts
// ---------------------------------------------------------------------------

const SUGGESTED_PROMPTS = [
  'Best coworking with fast wifi in Bangkok?',
  'Digital nomad visa for Portugal?',
  'Is Mexico City safe for solo nomads?',
  'Quiet cafes to work in Lisbon?',
  'Cost of living Bangkok vs Lisbon?',
  'eSIM options for Southeast Asia?',
];

function SuggestedPrompts({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <View style={styles.suggestedContainer}>
      <View style={styles.emptyState}>
        <Feather name="zap" size={40} color={colors.teal} style={{ marginBottom: spacing.md }} />
        <Text style={styles.emptyTitle}>Ask x/pat AI anything</Text>
        <Text style={styles.emptySubtitle}>
          Get instant answers about destinations, visas, coworking, safety, and nomad life.
        </Text>
      </View>
      <View style={styles.pillsContainer}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <TouchableOpacity
            key={prompt}
            style={styles.pill}
            onPress={() => onSelect(prompt)}
            activeOpacity={0.7}
          >
            <Text style={styles.pillText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Auth Gate
// ---------------------------------------------------------------------------

function AuthGate({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header navigation={navigation} />
      <View style={styles.authGate}>
        <Feather name="lock" size={40} color={colors.dark.text3} />
        <Text style={styles.authTitle}>Sign in to chat</Text>
        <Text style={styles.authSubtitle}>
          Create a free account to ask x/pat AI about destinations, visas, and nomad life.
        </Text>
        <TouchableOpacity
          style={styles.authButton}
          onPress={() => navigation.navigate('Auth')}
          activeOpacity={0.8}
        >
          <Text style={styles.authButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({ navigation }: { navigation: any }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Feather name="arrow-left" size={24} color={colors.dark.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>x/pat AI</Text>
      <Feather name="zap" size={20} color={colors.teal} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// AskAIScreen
// ---------------------------------------------------------------------------

export default function AskAIScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Auth gate
  if (!user) {
    return <AuthGate navigation={navigation} />;
  }

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Rate limit check
    const rateLimitErr = getRateLimitError('chat_message');
    if (rateLimitErr) {
      const errorMsg: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: 'assistant',
        content: rateLimitErr,
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    const userMsg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'user',
      content: trimmed,
    };

    let updatedMessages: Message[] = [];
    setMessages((prev) => {
      updatedMessages = [...prev, userMsg];
      return updatedMessages;
    });
    setInput('');
    Keyboard.dismiss();
    setLoading(true);

    try {
      const history = updatedMessages.map(({ role, content }) => ({ role, content }));

      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: {
          message: trimmed,
          history,
          city: (profile as any)?.current_city ?? null,
        },
      });

      if (error) throw error;

      const aiMsg: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: 'assistant',
        content: data?.reply || data?.message || "I'm having trouble connecting. Try again.",
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role: 'assistant',
        content: "I'm having trouble connecting. Try again.",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        <View style={isUser ? styles.userBubble : styles.aiBubble}>
          {!isUser && <Text style={styles.aiLabel}>x/pat AI</Text>}
          <Text style={isUser ? styles.userText : styles.aiText}>{item.content}</Text>
        </View>
      </View>
    );
  };

  const isEmpty = messages.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header navigation={navigation} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        {isEmpty && !loading ? (
          <SuggestedPrompts onSelect={sendMessage} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListFooterComponent={loading ? <TypingIndicator /> : null}
          />
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything..."
            placeholderTextColor={colors.dark.text3}
            multiline
            maxLength={1000}
            returnKeyType="default"
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            activeOpacity={0.7}
          >
            <Feather name="send" size={18} color={!input.trim() || loading ? colors.dark.text3 : colors.dark.bg} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  flex: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
  },

  // Messages
  messageList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexGrow: 1,
  },
  messageRow: {
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  aiRow: {
    alignSelf: 'flex-start',
  },
  userBubble: {
    backgroundColor: colors.teal,
    borderRadius: radius.lg,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  aiBubble: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  userText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark.bg,
    lineHeight: 22,
  },
  aiText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark.text,
    lineHeight: 22,
  },
  aiLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.teal,
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Typing indicator
  typingRow: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dark.text3,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark.text,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    maxHeight: 120,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 2 : 0,
  },
  sendButtonDisabled: {
    backgroundColor: colors.dark.bg3,
  },

  // Empty / Suggested prompts
  suggestedContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text2,
    textAlign: 'center',
    lineHeight: 20,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pill: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  pillText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },

  // Auth gate
  authGate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  authTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  authSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  authButton: {
    backgroundColor: colors.teal,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
  },
  authButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.bg,
  },
});
