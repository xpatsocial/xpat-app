import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { useDirectMessages } from '../../hooks/useDirectMessages';
import { DMConversation } from '../../types';
import Avatar from '../../components/Avatar';
import { formatTimeAgo } from '../../utils/formatTime';

export default function MessagesTab() {
  const { session } = useAuth();
  const navigation = useNavigation<any>();

  if (!session) {
    return (
      <View style={styles.authGate}>
        <View style={styles.iconCircle}>
          <Feather name="mail" size={40} color={colors.teal} />
        </View>
        <Text style={styles.authTitle}>Direct Messages</Text>
        <Text style={styles.authSubtitle}>
          Sign in to message your connections privately.
        </Text>
        <TouchableOpacity
          style={styles.authBtn}
          onPress={() => navigation.navigate('Auth')}
          activeOpacity={0.8}
        >
          <Text style={styles.authBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <ConversationList />;
}

function ConversationList() {
  const navigation = useNavigation<any>();
  const { conversations, loading, refresh } = useDirectMessages();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  function renderConversation({ item }: { item: DMConversation }) {
    const name = item.profile.display_name || 'Anonymous';
    const preview = item.last_message.content;
    const time = formatTimeAgo(item.last_message.created_at);
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={styles.convRow}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('DirectMessage', {
            partnerId: item.user_id,
            partnerName: name,
          })
        }
      >
        <View style={styles.avatarContainer}>
          <Avatar
            uri={item.profile.avatar_url}
            name={name}
            userId={item.user_id}
            size={48}
          />
          {hasUnread && <View style={styles.unreadDot} />}
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convTopRow}>
            <Text
              style={[styles.convName, hasUnread && styles.convNameUnread]}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text style={[styles.convTime, hasUnread && styles.convTimeUnread]}>
              {time}
            </Text>
          </View>
          <Text
            style={[styles.convPreview, hasUnread && styles.convPreviewUnread]}
            numberOfLines={1}
          >
            {preview}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="message-circle" size={48} color={colors.dark.text3} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySubtitle}>
            Connect with other nomads to start a conversation.
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.user_id}
          renderItem={renderConversation}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refresh}
          refreshing={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.bg,
  },
  list: {
    paddingVertical: spacing.sm,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.teal,
    borderWidth: 2,
    borderColor: colors.dark.bg,
  },
  convInfo: {
    flex: 1,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.dark.border,
    paddingBottom: spacing.md,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  convNameUnread: {
    fontFamily: fonts.bodyBold,
  },
  convTime: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
  },
  convTimeUnread: {
    color: colors.teal,
  },
  convPreview: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text3,
  },
  convPreviewUnread: {
    color: colors.dark.text2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    lineHeight: 20,
  },
  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
    backgroundColor: colors.dark.bg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46,196,160,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(46,196,160,0.2)',
  },
  authTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  authSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  authBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.xl + spacing.lg,
  },
  authBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.bg,
  },
});
