import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';

import ExploreScreen from './ExploreScreen';
import EventsTab from './community/EventsTab';

type PlacesTab = 'Map' | 'Events';

export default function PlacesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<PlacesTab>('Map');
  const insets = useSafeAreaInsets();

  const handleSwitchToEvents = useCallback(() => setActiveTab('Events'), []);

  if (activeTab === 'Map') {
    return (
      <View style={styles.container}>
        <ExploreScreen navigation={navigation} onSwitchToEvents={handleSwitchToEvents} />
      </View>
    );
  }

  // Events tab — matching header style with toggle
  return (
    <View style={styles.container}>
      <View style={[styles.eventsHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.segmentedToggle}>
            <TouchableOpacity
              style={styles.segment}
              onPress={() => { Haptics.selectionAsync(); setActiveTab('Map'); }}
              activeOpacity={0.7}
            >
              <Feather name="map" size={13} color={colors.dark.text2} />
              <Text style={styles.segmentText}>Map</Text>
            </TouchableOpacity>
            <View style={styles.segmentActive}>
              <Feather name="calendar" size={13} color={colors.dark.bg} />
              <Text style={styles.segmentTextActive}>Events</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.tabContent}>
        <EventsTab />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  eventsHeader: {
    backgroundColor: colors.dark.bg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentedToggle: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.12)',
    gap: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  segmentActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.teal,
  },
  segmentText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
  segmentTextActive: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.bg,
  },
  tabContent: {
    flex: 1,
  },
});
