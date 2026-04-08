import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius, shadows } from '../theme';
import { CityPresence, PresenceStatus } from '../types';
import { formatTimeAgo } from '../utils/formatTime';

type FilterOption = 'all' | 'available' | 'just_arrived';

const STATUS_CONFIG: Record<PresenceStatus, { label: string; color: string; icon: string }> = {
  here: { label: 'Here', color: colors.teal, icon: 'map-pin' },
  exploring: { label: 'Exploring', color: colors.amber, icon: 'compass' },
  working: { label: 'Working', color: '#8B8BF5', icon: 'monitor' },
  available: { label: 'Available', color: colors.green, icon: 'smile' },
};

interface NomadListSheetProps {
  visible: boolean;
  city: string;
  nomads: CityPresence[];
  isJustArrived: (arrivedAt: string) => boolean;
  onClose: () => void;
  onProfilePress: (userId: string) => void;
}

export default function NomadListSheet({
  visible,
  city,
  nomads,
  isJustArrived,
  onClose,
  onProfilePress,
}: NomadListSheetProps) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterOption>('all');

  const filteredNomads = useMemo(() => {
    switch (filter) {
      case 'available':
        return nomads.filter((n) => n.status === 'available');
      case 'just_arrived':
        return nomads.filter((n) => isJustArrived(n.arrived_at));
      default:
        return nomads;
    }
  }, [nomads, filter, isJustArrived]);

  const justArrivedCount = useMemo(
    () => nomads.filter((n) => isJustArrived(n.arrived_at)).length,
    [nomads, isJustArrived],
  );

  function formatArrival(arrivedAt: string): string {
    const diffMs = Date.now() - new Date(arrivedAt).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just arrived';
    if (diffHours < 24) return `Arrived ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Arrived yesterday';
    if (diffDays < 7) return `Arrived ${diffDays}d ago`;
    return `Here since ${new Date(arrivedAt).toLocaleDateString()}`;
  }

  function renderNomad({ item }: { item: CityPresence }) {
    const statusCfg = STATUS_CONFIG[item.status as PresenceStatus] || STATUS_CONFIG.here;
    const justArrived = isJustArrived(item.arrived_at);
    const displayName =
      item.profiles?.display_name || item.profiles?.username || 'Nomad';

    return (
      <TouchableOpacity
        style={styles.nomadRow}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onProfilePress(item.user_id);
        }}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, ${statusCfg.label}. ${formatArrival(item.arrived_at)}`}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          {item.profiles?.avatar_url ? (
            <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatar} transition={200} cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Feather name="user" size={18} color={colors.dark.text3} />
            </View>
          )}
          <View style={[styles.statusIndicator, { backgroundColor: statusCfg.color }]} />
        </View>

        {/* Info */}
        <View style={styles.nomadInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.nomadName} numberOfLines={1}>
              {displayName}
            </Text>
            {justArrived && (
              <View style={styles.justArrivedBadge}>
                <Text style={styles.justArrivedText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={styles.arrivalText}>{formatArrival(item.arrived_at)}</Text>
        </View>

        {/* Status pill */}
        <View style={[styles.statusPill, { borderColor: statusCfg.color + '40' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusCfg.color }]} />
          <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
            {statusCfg.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        {/* Handle */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>
              {nomads.length} nomad{nomads.length !== 1 ? 's' : ''} in {city}
            </Text>
            {justArrivedCount > 0 && (
              <Text style={styles.subtitle}>
                {justArrivedCount} arrived in the last 48h
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close nomad list">
            <Feather name="x" size={20} color={colors.dark.text} />
          </TouchableOpacity>
        </View>

        {/* Filter pills */}
        <View style={styles.filters}>
          {([
            { key: 'all' as FilterOption, label: 'All' },
            { key: 'available' as FilterOption, label: 'Available' },
            { key: 'just_arrived' as FilterOption, label: 'Just Arrived' },
          ]).map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => {
                Haptics.selectionAsync();
                setFilter(f.key);
              }}
              accessibilityRole="tab"
              accessibilityLabel={f.label}
              accessibilityState={{ selected: filter === f.key }}
            >
              <Text
                style={[styles.filterText, filter === f.key && styles.filterTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Nomad list */}
        <FlatList
          data={filteredNomads}
          keyExtractor={(item) => item.id}
          renderItem={renderNomad}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Feather name="users" size={32} color={colors.dark.text3} />
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'No nomads active in this city right now'
                  : filter === 'available'
                  ? 'No nomads available right now'
                  : 'No recent arrivals'}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.bg3,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.teal,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.dark.bg2,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  filterPillActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  filterText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  filterTextActive: {
    color: colors.dark.bg,
    fontFamily: fonts.bodyBold,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  nomadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.dark.border,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.dark.bg,
  },
  nomadInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nomadName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.text,
    flexShrink: 1,
  },
  justArrivedBadge: {
    backgroundColor: colors.amber + '20',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  justArrivedText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.amber,
    letterSpacing: 0.5,
  },
  arrivalText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.dark.bg2,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text3,
    textAlign: 'center',
  },
});
