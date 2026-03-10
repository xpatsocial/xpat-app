import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { fonts } from '../theme';

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
}

export default function Avatar({ uri, name, userId, size = 40 }: AvatarProps) {
  const borderRadius = size / 2;
  const fontSize = size * 0.38;
  const bgColor = userId ? getAvatarColor(userId) : AVATAR_COLORS[0];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius, backgroundColor: bgColor }]}>
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#2C2C2E',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.bodyBold,
    color: '#1C1C1E',
  },
});
