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
  // Persistent search state shared across all sub-tabs
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = useCallback((tab: PlacesTab) => setActiveTab(tab), []);

  if (activeTab === 'Map') {
    return (
      <View style={styles.container}>
        <ExploreScreen
          navigation={navigation}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
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
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <View style={styles.tabContent}>
        {activeTab === 'Events' ? (
          <EventsTab searchQuery={searchQuery} />
        ) : (
          <CalendarTab searchQuery={searchQuery} />
        )}
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
