import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../theme';
import BrandHeader from '../components/BrandHeader';

import ExploreScreen from './ExploreScreen';
import EventsTab from './community/EventsTab';

type PlacesTab = 'Map' | 'Events';

const TAB_CONFIG: Array<{ name: PlacesTab; icon: string }> = [
  { name: 'Map', icon: 'map' },
  { name: 'Events', icon: 'calendar' },
];

export default function PlacesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<PlacesTab>('Map');
  const insets = useSafeAreaInsets();

  if (activeTab === 'Map') {
    return (
      <View style={styles.container}>
        {/* ExploreScreen renders full-screen with its own floating header */}
        <ExploreScreen navigation={navigation} />

        {/* Floating sub-tab pills over the map */}
        <View style={[styles.floatingPills, { top: insets.top + 52 }]}>
          <View style={tabStyles.pillRow}>
            {TAB_CONFIG.map((tab) => {
              const isFocused = activeTab === tab.name;
              return (
                <TouchableOpacity
                  key={tab.name}
                  style={[tabStyles.pill, isFocused && tabStyles.pillActive]}
                  onPress={() => setActiveTab(tab.name)}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={tab.icon as any}
                    size={13}
                    color={isFocused ? colors.dark.bg : colors.dark.text2}
                  />
                  <Animated.Text
                    style={[
                      tabStyles.pillText,
                      isFocused && tabStyles.pillTextActive,
                    ]}
                  >
                    {tab.name}
                  </Animated.Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  // Events tab - uses standard layout with BrandHeader
  return (
    <View style={styles.container}>
      <BrandHeader subtitle="Places" />
      <View style={tabStyles.outerContainer}>
        <View style={tabStyles.pillRow}>
          {TAB_CONFIG.map((tab) => {
            const isFocused = activeTab === tab.name;
            return (
              <TouchableOpacity
                key={tab.name}
                style={[tabStyles.pill, isFocused && tabStyles.pillActive]}
                onPress={() => setActiveTab(tab.name)}
                activeOpacity={0.7}
              >
                <Feather
                  name={tab.icon as any}
                  size={13}
                  color={isFocused ? colors.dark.bg : colors.dark.text2}
                />
                <Animated.Text
                  style={[
                    tabStyles.pillText,
                    isFocused && tabStyles.pillTextActive,
                  ]}
                >
                  {tab.name}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
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
  floatingPills: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  tabContent: {
    flex: 1,
  },
});

const tabStyles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dark.bg,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.12)',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  pillActive: {
    backgroundColor: colors.teal,
  },
  pillText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    letterSpacing: 0.2,
  },
  pillTextActive: {
    color: colors.dark.bg,
    fontFamily: fonts.bodyBold,
  },
});
