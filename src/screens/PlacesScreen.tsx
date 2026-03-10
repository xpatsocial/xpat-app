import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';
import BrandHeader from '../components/BrandHeader';

import ExploreScreen from './ExploreScreen';
import EventsTab from './community/EventsTab';
import CalendarTab from './community/CalendarTab';

export type PlacesTab = 'Map' | 'Events' | 'Calendar';

export default function PlacesScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<PlacesTab>('Map');

  const handleTabChange = useCallback((tab: PlacesTab) => setActiveTab(tab), []);

  if (activeTab === 'Map') {
    return (
      <View style={styles.container}>
        <ExploreScreen
          navigation={navigation}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </View>
    );
  }

  // Events / Calendar tabs — standard layout with BrandHeader
  return (
    <View style={styles.container}>
      <BrandHeader subtitle="Places" />
      <ExploreScreen
        navigation={navigation}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        headerOnly
      />
      <View style={styles.tabContent}>
        {activeTab === 'Events' ? <EventsTab /> : <CalendarTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  tabContent: {
    flex: 1,
  },
});
