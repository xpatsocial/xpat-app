import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../theme';

// 10 premium dark-mode palette colors for initials backgrounds
const AVATAR_COLORS = [
  '#2EC4A0', '#E8803A', '#6C63FF', '#FF6B6B', '#4ECDC4',
  '#FFD93D', '#C77DFF', '#48CAE4', '#F07167', '#80B918',
];

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
}

export function getAvatarColor(userId: string): string {
  return AVATAR_COLORS[hashUserId(userId) % AVATAR_COLORS.length];
}

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  userId?: string;
  size?: number;
  /** Show identity-verified shield badge */
  verified?: boolean;
  /** Show community-vouched badge (lighter than full ID verification) */
  trusted?: boolean;
}

export default function Avatar({ uri, name, userId, size = 40, verified, trusted }: AvatarProps) {
  const borderRadius = size / 2;
  const fontSize = size * 0.38;
  const bgColor = userId ? getAvatarColor(userId) : AVATAR_COLORS[0];

  const badgeSize = Math.max(14, size * 0.36);
  const badgeOffset = size * 0.04;

  const avatarNode = uri ? (
    <Image
      source={{ uri }}
      style={[styles.image, { width: size, height: size, borderRadius }]}
      transition={200}
      cachePolicy="memory-disk"
      accessibilityLabel={name ? `${name}'s avatar` : 'User avatar'}
    />
  ) : (
    <View style={[styles.fallback, { width: size, height: size, borderRadius, backgroundColor: bgColor }]} accessible accessibilityRole="image" accessibilityLabel={name ? `${name}'s avatar` : 'User avatar'}>
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );

  if (!verified && !trusted) return avatarNode;

  return (
    <View style={{ width: size, height: size }}>
      {avatarNode}
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            bottom: -badgeOffset,
            right: -badgeOffset,
            backgroundColor: verified ? colors.teal : colors.dark.bg3,
          },
        ]}
      >
        <Ionicons
          name={verified ? 'shield-checkmark' : 'checkmark-circle'}
          size={badgeSize - 2}
          color={verified ? colors.dark.bg : colors.teal}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.dark.bg2,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.bodyBold,
    color: colors.dark.bg,
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.dark.bg,
  },
});
