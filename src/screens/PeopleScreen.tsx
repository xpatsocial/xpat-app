import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Feather } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../theme';

import FeedScreen from './FeedScreen';
import ChatTab from './community/ChatTab';
import MessagesTab from './community/MessagesTab';

const TopTab = createMaterialTopTabNavigator();

const TAB_CONFIG = [
  { name: 'Feed', icon: 'grid' },
  { name: 'Chat', icon: 'message-circle' },
  { name: 'Messages', icon: 'mail' },
];

function PeopleTabBar({ state, navigation }: any) {
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
                if (!isFocused) navigation.navigate(route.name);
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

export default function PeopleScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.wordmark}>
          <Text style={{ color: colors.amber }}>x</Text>
          <Text style={{ color: colors.teal }}>/</Text>
          <Text style={{ color: colors.dark.text }}>pat</Text>
        </Text>
        <TouchableOpacity
          style={styles.searchUserBtn}
          onPress={() => navigation.navigate('NomadDiscovery')}
        >
          <Feather name="search" size={20} color={colors.dark.text2} />
        </TouchableOpacity>
      </View>
      <TopTab.Navigator
        tabBar={(props) => <PeopleTabBar {...props} />}
        screenOptions={{
          lazy: true,
          swipeEnabled: true,
          animationEnabled: true,
        }}
      >
        <TopTab.Screen name="Feed">
          {() => <FeedScreen navigation={navigation} hideHeader />}
        </TopTab.Screen>
        <TopTab.Screen name="Chat" component={ChatTab} />
        <TopTab.Screen name="Messages" component={MessagesTab} />
      </TopTab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  wordmark: {
    fontFamily: fonts.heading,
    fontSize: 28,
  },
  searchUserBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center',
    justifyContent: 'center',
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
