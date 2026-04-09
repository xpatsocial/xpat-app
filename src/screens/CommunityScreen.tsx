import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import BrandHeader from '../components/BrandHeader';

import ChatTab from './community/ChatTab';
import NearbyTab from './community/NearbyTab';
import FeedTab from './community/FeedTab';
import EventsTab from './community/EventsTab';
import DiscoverTab from './community/DiscoverTab';

const TopTab = createMaterialTopTabNavigator();

const TAB_CONFIG = [
  { name: 'Chat', icon: 'message-circle' },
  { name: 'Nearby', icon: 'map-pin' },
  { name: 'Feed', icon: 'rss' },
  { name: 'Events', icon: 'calendar' },
  { name: 'Discover', icon: 'compass' },
];

function CommunityTabBar({ state, navigation }: any) {
  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.pillRow}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[index];

          return (
            <TouchableOpacity
              key={route.key}
              style={[tabStyles.pill, isFocused && tabStyles.pillActive]}
              onPress={() => {
                if (!isFocused) {
                  Haptics.selectionAsync();
                  navigation.navigate(route.name);
                }
              }}
              activeOpacity={0.7}
            >
              <Feather
                name={config.icon as any}
                size={13}
                color={isFocused ? colors.dark.bg : colors.dark.text2}
              />
              <Animated.Text
                style={[
                  tabStyles.pillText,
                  isFocused && tabStyles.pillTextActive,
                ]}
              >
                {config.name}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function CommunityScreen() {
  return (
    <View style={styles.container}>
      <BrandHeader subtitle="Community" />
      <TopTab.Navigator
        tabBar={(props) => <CommunityTabBar {...props} />}
        screenOptions={{
          lazy: true,
          swipeEnabled: true,
          animationEnabled: true,
        }}
      >
        <TopTab.Screen name="Chat" component={ChatTab} />
        <TopTab.Screen name="Nearby" component={NearbyTab} />
        <TopTab.Screen name="Feed" component={FeedTab} />
        <TopTab.Screen name="Events" component={EventsTab} />
        <TopTab.Screen name="Discover" component={DiscoverTab} />
      </TopTab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
});

const tabStyles = StyleSheet.create({
  container: {
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
