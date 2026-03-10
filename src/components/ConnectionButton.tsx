import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';
import { ConnectionStatus } from '../types';

interface ConnectionButtonProps {
  status: ConnectionStatus;
  connectionId?: string;
  onConnect: () => Promise<void>;
  onAccept?: () => Promise<void>;
  onDecline?: () => Promise<void>;
  onMessage?: () => void;
  compact?: boolean;
}

export default function ConnectionButton({
  status,
  connectionId,
  onConnect,
  onAccept,
  onDecline,
  onMessage,
  compact = false,
}: ConnectionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePress = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.button, styles.loadingButton, compact && styles.compact]}>
        <ActivityIndicator size="small" color={colors.teal} />
      </View>
    );
  }

  switch (status) {
    case 'none':
      return (
        <TouchableOpacity
          style={[styles.button, styles.connectButton, compact && styles.compact]}
          onPress={() => handlePress(onConnect)}
          activeOpacity={0.7}
        >
          <Feather name="user-plus" size={compact ? 14 : 16} color={colors.dark.bg} />
          {!compact && <Text style={styles.connectText}>Connect</Text>}
        </TouchableOpacity>
      );

    case 'pending_sent':
      return (
        <View style={[styles.button, styles.pendingButton, compact && styles.compact]}>
          <Feather name="clock" size={compact ? 14 : 16} color={colors.dark.text2} />
          {!compact && <Text style={styles.pendingText}>Pending</Text>}
        </View>
      );

    case 'pending_received':
      return (
        <View style={[styles.actionRow, compact && styles.compact]}>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={() => onAccept && handlePress(onAccept)}
            activeOpacity={0.7}
          >
            <Feather name="check" size={compact ? 14 : 16} color={colors.dark.bg} />
            {!compact && <Text style={styles.connectText}>Accept</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={() => onDecline && handlePress(onDecline)}
            activeOpacity={0.7}
          >
            <Feather name="x" size={compact ? 14 : 16} color={colors.dark.text2} />
          </TouchableOpacity>
        </View>
      );

    case 'connected':
      return (
        <TouchableOpacity
          style={[styles.button, styles.messageButton, compact && styles.compact]}
          onPress={onMessage}
          activeOpacity={0.7}
        >
          <Feather
            name="message-circle"
            size={compact ? 14 : 16}
            color={colors.teal}
          />
          {!compact && <Text style={styles.messageText}>Message</Text>}
        </TouchableOpacity>
      );

    default:
      return null;
  }
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  compact: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  loadingButton: {
    backgroundColor: colors.glass.light,
    minWidth: 80,
  },
  connectButton: {
    backgroundColor: colors.teal,
  },
  pendingButton: {
    backgroundColor: colors.glass.light,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  acceptButton: {
    backgroundColor: colors.teal,
    flex: 1,
  },
  declineButton: {
    backgroundColor: colors.glass.light,
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: spacing.sm,
  },
  messageButton: {
    backgroundColor: colors.glass.light,
    borderWidth: 1,
    borderColor: colors.teal + '40',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  connectText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.bg,
  },
  pendingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
  messageText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.teal,
  },
});
