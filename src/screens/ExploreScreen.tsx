import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, Alert, TextInput, Keyboard,
} from 'react-native';
import MapView, { Marker, Region, Circle } from 'react-native-maps';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Spot, SpotCategory, NeighborhoodTag, SAFETY_TAGS } from '../types';
import SpotBottomSheet from '../components/SpotBottomSheet';
import NeighborhoodPulseSheet from '../components/NeighborhoodPulseSheet';
import NeighborhoodPulseCard from '../components/NeighborhoodPulseCard';
import CityPresenceBadge from '../components/CityPresenceBadge';
import NomadListSheet from '../components/NomadListSheet';
import { useCityPresence } from '../hooks/useCityPresence';
import { usePostHog } from '../lib/posthog';
import { clusterSpots, Cluster } from '../utils/mapClustering';

// City -> coords lookup for launch cities (auto-zoom)
const CITY_COORDS: Record<string, { latitude: number; longitude: number }> = {
  bangkok: { latitude: 13.7563, longitude: 100.5018 },
  lisbon: { latitude: 38.7223, longitude: -9.1393 },
  'mexico city': { latitude: 19.4326, longitude: -99.1332 },
  cdmx: { latitude: 19.4326, longitude: -99.1332 },
  'ciudad de mexico': { latitude: 19.4326, longitude: -99.1332 },
};

const CATEGORIES: Array<SpotCategory | 'all'> = ['all', 'cafe', 'eat', 'cowork', 'colive', 'experience', 'stay'];

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  cafe: 'Cafe',
  eat: 'Eat',
  cowork: 'Cowork',
  colive: 'Colive',
  experience: 'Experiences',
  stay: 'Stay',
};

const MARKER_COLORS: Record<string, string> = {
  cafe: colors.amber,
  eat: colors.red,
  cowork: colors.teal,
  colive: colors.teal,
  experience: colors.amber,
  stay: colors.teal,
  other: colors.dark.text2,
};

// Zoom threshold: latitudeDelta below this = neighborhood level
const NEIGHBORHOOD_ZOOM_THRESHOLD = 0.05;

// Safety sentiment: safe tags vs alert tags (derived from exported SAFETY_TAGS)
const SAFE_TAG_SET: Set<string> = new Set(['feels safe', 'well-lit', 'tourist-friendly']);
const ALERT_TAG_SET: Set<string> = new Set(['stay alert', 'avoid at night']);

interface TagCount {
  tag: NeighborhoodTag;
  count: number;
}

interface PulseZone {
  latitude: number;
  longitude: number;
  sentiment: 'safe' | 'alert' | 'mixed';
  count: number;
}

// Haversine distance in km
function haversineKm(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ZONE_COLORS: Record<string, { fill: string; stroke: string }> = {
  safe: { fill: 'rgba(76,217,100,0.15)', stroke: 'rgba(76,217,100,0.4)' },
  alert: { fill: 'rgba(232,128,58,0.15)', stroke: 'rgba(232,128,58,0.4)' },
  mixed: { fill: 'rgba(46,196,160,0.15)', stroke: 'rgba(46,196,160,0.4)' },
};

import type { PlacesTab } from './PlacesScreen';

const TABS: Array<{ name: PlacesTab; icon: string }> = [
  { name: 'Map', icon: 'map' },
  { name: 'Events', icon: 'calendar' },
  { name: 'Calendar', icon: 'grid' },
];

interface ExploreScreenProps {
  navigation: any;
  activeTab?: PlacesTab;
  onTabChange?: (tab: PlacesTab) => void;
  /** When true, render only the header (tab toggle + search) — no map */
  headerOnly?: boolean;
}

export default function ExploreScreen({ navigation, activeTab = 'Map', onTabChange, headerOnly }: ExploreScreenProps) {
  const { user, profile } = useAuth();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [category, setCategory] = useState<SpotCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  // GPS location state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Search state
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Neighborhood Pulse state
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [isNeighborhoodZoom, setIsNeighborhoodZoom] = useState(false);
  const [pulseSheetVisible, setPulseSheetVisible] = useState(false);
  const [longPressCoord, setLongPressCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pulseData, setPulseData] = useState<{ tagCounts: TagCount[]; totalResponses: number }>({
    tagCounts: [],
    totalResponses: 0,
  });

  // Neighborhood zone circles
  const [pulseZones, setPulseZones] = useState<PulseZone[]>([]);

  // City presence state
  const [nomadListVisible, setNomadListVisible] = useState(false);
  const currentCity = profile?.current_city ?? null;
  const currentCountry = profile?.current_country ?? null;
  const {
    nomadsInCity,
    nearbyNomads,
    isJustArrived,
  } = useCityPresence(currentCity, currentCountry);

  // Onboarding tooltip state
  const [showPulseTooltip, setShowPulseTooltip] = useState(false);

  // Fall back to profile city if GPS unavailable
  function animateToCityFallback() {
    if (!currentCity) return;
    const coords = CITY_COORDS[currentCity.toLowerCase()];
    if (coords) {
      mapRef.current?.animateToRegion(
        { ...coords, latitudeDelta: 0.08, longitudeDelta: 0.08 },
        1000,
      );
    }
  }

  // Detect user location on mount and center map
  useEffect(() => {
    (async () => {
      try {
        const gdprStatus = await AsyncStorage.getItem('gdpr_accepted');
        if (gdprStatus === 'declined') {
          animateToCityFallback();
          return;
        }

        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          animateToCityFallback();
          return;
        }

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setUserLocation(coord);
        mapRef.current?.animateToRegion(
          { ...coord, latitudeDelta: 0.08, longitudeDelta: 0.08 },
          1000,
        );
      } catch {
        animateToCityFallback();
      }
    })();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      const shown = await AsyncStorage.getItem('pulse_tooltip_shown');
      if (!shown) {
        setShowPulseTooltip(true);
        timer = setTimeout(() => {
          setShowPulseTooltip(false);
          AsyncStorage.setItem('pulse_tooltip_shown', 'true');
        }, 5000);
      }
    })();
    return () => clearTimeout(timer);
  }, []);

  const fetchSpots = useCallback(async (region?: Region | null) => {
    let query = supabase
      .from('spots')
      .select('*, profiles(display_name, avatar_url)')
      .order('created_at', { ascending: false });

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    // Region-based loading: fetch spots within visible map bounds + buffer
    if (region && region.latitudeDelta < 60) {
      const latBuffer = region.latitudeDelta * 0.5;
      const lngBuffer = region.longitudeDelta * 0.5;
      query = query
        .gte('lat', region.latitude - region.latitudeDelta / 2 - latBuffer)
        .lte('lat', region.latitude + region.latitudeDelta / 2 + latBuffer)
        .gte('lng', region.longitude - region.longitudeDelta / 2 - lngBuffer)
        .lte('lng', region.longitude + region.longitudeDelta / 2 + lngBuffer)
        .limit(500);
    } else {
      query = query.limit(200);
    }

    const { data, error } = await query;
    if (!error && data) setSpots(data);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    setLoading(true);
    fetchSpots(currentRegion);
  }, [fetchSpots]);

  // Refresh spots when screen regains focus (e.g. after AddSpot)
  useFocusEffect(
    useCallback(() => {
      fetchSpots(currentRegion);
    }, [fetchSpots, currentRegion])
  );

  // ---------- GPS Location ----------

  async function handleLocationPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Check if user declined GDPR consent (location disabled)
    const gdprStatus = await AsyncStorage.getItem('gdpr_accepted');
    if (gdprStatus === 'declined') {
      Alert.alert('Location Disabled', 'You declined location consent. Update your preferences in your profile to enable location features.');
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Enable location to find spots near you.');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setUserLocation(coord);

    mapRef.current?.animateToRegion(
      {
        ...coord,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      1000,
    );
  }

  // ---------- Distance helper ----------

  const distanceToSelectedSpot = useMemo(() => {
    if (!userLocation || !selectedSpot || !selectedSpot.lat || !selectedSpot.lng) return null;
    return haversineKm(
      userLocation.latitude,
      userLocation.longitude,
      selectedSpot.lat,
      selectedSpot.lng,
    );
  }, [userLocation, selectedSpot]);

  // ---------- Search filtering ----------

  const filteredSpots = useMemo(() => {
    if (!searchQuery.trim()) return spots;
    const q = searchQuery.toLowerCase();
    return spots.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q),
    );
  }, [spots, searchQuery]);

  // ---------- Neighborhood Pulse ----------

  function determineSentiment(tags: NeighborhoodTag[]): 'safe' | 'alert' | 'mixed' {
    let safeCount = 0;
    let alertCount = 0;
    tags.forEach((t) => {
      if (SAFE_TAG_SET.has(t)) safeCount++;
      if (ALERT_TAG_SET.has(t)) alertCount++;
    });
    if (safeCount > 0 && alertCount === 0) return 'safe';
    if (alertCount > 0 && safeCount === 0) return 'alert';
    return 'mixed';
  }

  const fetchPulseData = useCallback(async (region: Region) => {
    const latRange = region.latitudeDelta / 2;
    const lngRange = region.longitudeDelta / 2;

    const { data, error } = await supabase
      .from('neighborhood_vibes')
      .select('tags, lat, lng')
      .gte('lat', region.latitude - latRange)
      .lte('lat', region.latitude + latRange)
      .gte('lng', region.longitude - lngRange)
      .lte('lng', region.longitude + lngRange);

    if (error || !data || data.length === 0) {
      setPulseData({ tagCounts: [], totalResponses: 0 });
      setPulseZones([]);
      return;
    }

    // Aggregate tags
    const counts: Record<string, number> = {};
    data.forEach((row) => {
      ((row.tags || []) as NeighborhoodTag[]).forEach((tag) => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });

    const tagCounts: TagCount[] = Object.entries(counts)
      .map(([tag, count]) => ({ tag: tag as NeighborhoodTag, count }))
      .sort((a, b) => b.count - a.count);

    setPulseData({ tagCounts, totalResponses: data.length });

    // Build zone circles by clustering nearby points (~200m grid)
    const GRID = 0.002; // ~200m in degrees at mid-latitudes
    const clusters: Record<string, { lats: number[]; lngs: number[]; tags: NeighborhoodTag[] }> = {};

    data.forEach((row) => {
      if (row.lat == null || row.lng == null) return;
      const key = `${Math.round(row.lat / GRID)}_${Math.round(row.lng / GRID)}`;
      if (!clusters[key]) clusters[key] = { lats: [], lngs: [], tags: [] };
      clusters[key].lats.push(row.lat);
      clusters[key].lngs.push(row.lng);
      clusters[key].tags.push(...((row.tags || []) as NeighborhoodTag[]));
    });

    const zones: PulseZone[] = Object.values(clusters)
      .filter((c) => c.lats.length >= 1)
      .map((c) => ({
        latitude: c.lats.reduce((a, b) => a + b, 0) / c.lats.length,
        longitude: c.lngs.reduce((a, b) => a + b, 0) / c.lngs.length,
        sentiment: determineSentiment(c.tags),
        count: c.lats.length,
      }));

    setPulseZones(zones);
  }, []);

  const pulseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spotsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up debounce timers on unmount
  useEffect(() => {
    return () => {
      if (pulseDebounceRef.current) clearTimeout(pulseDebounceRef.current);
      if (spotsDebounceRef.current) clearTimeout(spotsDebounceRef.current);
    };
  }, []);

  function handleRegionChange(region: Region) {
    setCurrentRegion(region);
    const zoomed = region.latitudeDelta < NEIGHBORHOOD_ZOOM_THRESHOLD;
    setIsNeighborhoodZoom(zoomed);

    // Debounced spot refetch on pan/zoom
    if (spotsDebounceRef.current) clearTimeout(spotsDebounceRef.current);
    spotsDebounceRef.current = setTimeout(() => fetchSpots(region), 400);

    if (pulseDebounceRef.current) clearTimeout(pulseDebounceRef.current);

    if (zoomed) {
      pulseDebounceRef.current = setTimeout(() => fetchPulseData(region), 500);
    } else {
      setPulseData({ tagCounts: [], totalResponses: 0 });
      setPulseZones([]);
    }
  }

  function handleLongPress(e: any) {
    // Dismiss onboarding tooltip on first long-press
    if (showPulseTooltip) {
      setShowPulseTooltip(false);
      AsyncStorage.setItem('pulse_tooltip_shown', 'true');
    }

    if (!user) {
      Alert.alert(
        'Sign in required',
        'Sign in to share neighborhood vibes.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
        ],
      );
      return;
    }
    const coord = e.nativeEvent.coordinate;
    setLongPressCoord(coord);
    setSelectedSpot(null);
    setPulseSheetVisible(true);
  }

  async function handlePulseSubmit(tags: NeighborhoodTag[], neighborhoodName: string) {
    if (!user || !longPressCoord) return;

    const { error } = await supabase.from('neighborhood_vibes').insert({
      user_id: user.id,
      lat: longPressCoord.latitude,
      lng: longPressCoord.longitude,
      neighborhood_name: neighborhoodName || null,
      tags,
    });

    setPulseSheetVisible(false);
    setLongPressCoord(null);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      posthog.capture('pulse_shared', { tag_count: tags.length });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Pulse shared!', 'Your neighborhood feedback helps the community.');
      // Refresh pulse data
      if (currentRegion && isNeighborhoodZoom) {
        fetchPulseData(currentRegion);
      }
    }
  }

  async function handleSave(spot: Spot) {
    if (!user) {
      Alert.alert(
        'Sign in required',
        'Sign in to save spots to your collection.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
        ],
      );
      return;
    }
    const { error } = await supabase.from('saved_spots').insert({
      user_id: user.id,
      spot_id: spot.id,
    });
    if (error?.code === '23505') {
      Alert.alert('Already saved', 'This spot is in your saved list.');
    } else if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Saved!', `${spot.name} added to your saved spots.`);
    }
  }

  const spotsWithCoords = filteredSpots.filter(s => s.lat != null && s.lng != null && s.lat !== 0 && s.lng !== 0);

  // Cluster markers for performance
  const clusters = useMemo(() => {
    if (!currentRegion) return [];
    return clusterSpots(spotsWithCoords, currentRegion);
  }, [spotsWithCoords, currentRegion]);

  const showPulseCard = isNeighborhoodZoom && pulseData.tagCounts.length > 0
    && !selectedSpot && !pulseSheetVisible;

  // headerOnly mode: render just the tab toggle (for Events/Calendar tabs in PlacesScreen)
  if (headerOnly) {
    return (
      <View style={styles.headerOnlyContainer}>
        {onTabChange && (
          <View style={styles.tabToggleRow}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.name;
              return (
                <TouchableOpacity
                  key={tab.name}
                  style={[styles.tabToggle, isActive && styles.tabToggleActive]}
                  onPress={() => { Haptics.selectionAsync(); onTabChange(tab.name); }}
                  activeOpacity={0.7}
                >
                  <Feather
                    name={tab.icon as any}
                    size={13}
                    color={isActive ? colors.dark.bg : colors.dark.text2}
                  />
                  <Text style={[styles.tabToggleText, isActive && styles.tabToggleTextActive]}>
                    {tab.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? 'google' : undefined}
        style={styles.map}
        initialRegion={{
          latitude: 20,
          longitude: 0,
          latitudeDelta: 120,
          longitudeDelta: 120,
        }}
        customMapStyle={Platform.OS === 'android' ? mapDarkStyle : undefined}
        userInterfaceStyle="dark"
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={handleRegionChange}
        onLongPress={handleLongPress}
        onPress={() => {
          if (searchVisible) Keyboard.dismiss();
        }}
      >
        {clusters.map((cluster) =>
          cluster.spots.length === 1 ? (
            <Marker
              key={`spot-${cluster.spots[0].id}`}
              coordinate={cluster.coordinate}
              pinColor={MARKER_COLORS[cluster.spots[0].category] || colors.teal}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPulseSheetVisible(false);
                setSelectedSpot(cluster.spots[0]);
              }}
            />
          ) : (
            <Marker
              key={cluster.id}
              coordinate={cluster.coordinate}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Zoom into the cluster
                mapRef.current?.animateToRegion(
                  {
                    ...cluster.coordinate,
                    latitudeDelta: (currentRegion?.latitudeDelta || 60) / 3,
                    longitudeDelta: (currentRegion?.longitudeDelta || 60) / 3,
                  },
                  500,
                );
              }}
            >
              <View style={styles.clusterMarker}>
                <Text style={styles.clusterText}>{cluster.spots.length}</Text>
              </View>
            </Marker>
          ),
        )}

        {/* Neighborhood zone circles */}
        {isNeighborhoodZoom &&
          pulseZones.map((zone, i) => (
            <Circle
              key={`zone-${i}`}
              center={{ latitude: zone.latitude, longitude: zone.longitude }}
              radius={200}
              fillColor={ZONE_COLORS[zone.sentiment].fill}
              strokeColor={ZONE_COLORS[zone.sentiment].stroke}
              strokeWidth={1}
            />
          ))}
      </MapView>

      {/* Floating header — tab toggle + search + categories */}
      <View style={styles.floatingHeader}>
        <BlurView tint="dark" intensity={70} style={[styles.headerBlur, { paddingTop: insets.top + 8 }]}>
          {/* Row 1: Map / Events / Calendar toggle */}
          {onTabChange && (
            <View style={styles.tabToggleRow}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab.name;
                return (
                  <TouchableOpacity
                    key={tab.name}
                    style={[styles.tabToggle, isActive && styles.tabToggleActive]}
                    onPress={() => { Haptics.selectionAsync(); onTabChange(tab.name); }}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={tab.icon as any}
                      size={13}
                      color={isActive ? colors.dark.bg : colors.dark.text2}
                    />
                    <Text style={[styles.tabToggleText, isActive && styles.tabToggleTextActive]}>
                      {tab.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Row 2: Search bar + Add button */}
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.searchPill}
              onPress={() => {
                Haptics.selectionAsync();
                setSearchVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Feather name="search" size={15} color={colors.dark.text2} />
              {searchVisible ? (
                <TextInput
                  style={styles.searchPillInput}
                  placeholder="Search cities, spots..."
                  placeholderTextColor={colors.dark.text3}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              ) : (
                <Text style={styles.searchPillPlaceholder}>Search cities, spots...</Text>
              )}
              {searchVisible && searchQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x-circle" size={14} color={colors.dark.text3} />
                </TouchableOpacity>
              ) : searchVisible ? (
                <TouchableOpacity
                  onPress={() => {
                    setSearchVisible(false);
                    setSearchQuery('');
                    Keyboard.dismiss();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="x" size={14} color={colors.dark.text2} />
                </TouchableOpacity>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                if (!user) {
                  Alert.alert(
                    'Sign in required',
                    'Sign in to add spots to the map.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Sign In', onPress: () => navigation.navigate('Auth') },
                    ],
                  );
                  return;
                }
                navigation.navigate('AddSpot');
              }}
            >
              <Feather name="plus" size={18} color={colors.dark.bg} />
            </TouchableOpacity>
          </View>

          {/* Row 3: Category filters — shown when search is active */}
          {searchVisible && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContent}
              style={styles.filterRow}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterPill,
                    category === cat && {
                      backgroundColor: cat === 'all' ? colors.teal : (MARKER_COLORS[cat] || colors.teal),
                      borderColor: cat === 'all' ? colors.teal : (MARKER_COLORS[cat] || colors.teal),
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setCategory(cat);
                    setSelectedSpot(null);
                  }}
                >
                  <Text style={[styles.filterText, category === cat && styles.filterTextActive]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Active filter indicator when search is closed but filter is active */}
          {!searchVisible && category !== 'all' && (
            <TouchableOpacity
              style={styles.activeFilterBadge}
              onPress={() => setSearchVisible(true)}
            >
              <Feather name="filter" size={12} color={colors.teal} />
              <Text style={styles.activeFilterText}>{CATEGORY_LABELS[category]}</Text>
              <TouchableOpacity
                onPress={() => { Haptics.selectionAsync(); setCategory('all'); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={12} color={colors.dark.text3} />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </BlurView>
      </View>

      {/* Neighborhood Pulse card (shows at neighborhood zoom) */}
      {showPulseCard && (
        <NeighborhoodPulseCard
          tagCounts={pulseData.tagCounts}
          totalResponses={pulseData.totalResponses}
        />
      )}

      {/* City presence badge — "23 nomads in Bangkok" */}
      {nomadsInCity > 0 && currentCity && !selectedSpot && !pulseSheetVisible && !nomadListVisible && (
        <CityPresenceBadge
          city={currentCity}
          count={nomadsInCity}
          onPress={() => setNomadListVisible(true)}
        />
      )}

      {/* Spot count badge (hidden when presence badge is shown) */}
      {!loading && filteredSpots.length > 0 && !selectedSpot && !showPulseCard && !pulseSheetVisible && nomadsInCity === 0 && (
        <View style={styles.countBadge}>
          <BlurView tint="dark" intensity={80} style={styles.countBlur}>
            <Feather name="map-pin" size={12} color={colors.teal} />
            <Text style={styles.countText}>
              {filteredSpots.length} spot{filteredSpots.length !== 1 ? 's' : ''}
              {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ''}
            </Text>
          </BlurView>
        </View>
      )}

      {/* Long-press hint at neighborhood zoom */}
      {isNeighborhoodZoom && !selectedSpot && !pulseSheetVisible && (
        <View style={styles.hintContainer}>
          <BlurView tint="dark" intensity={60} style={styles.hintBlur}>
            <Feather name="zap" size={10} color={colors.amber} />
            <Text style={styles.hintText}>Long-press to rate this neighborhood</Text>
          </BlurView>
        </View>
      )}

      {/* Empty state floating card */}
      {spots.length === 0 && !loading && (
        <View style={styles.emptyCard}>
          <Feather name="map-pin" size={32} color={colors.amber} />
          <Text style={styles.emptyCardTitle}>No spots yet</Text>
          <Text style={styles.emptyCardSubtitle}>Be the first to share a spot in your city!</Text>
          <TouchableOpacity
            style={styles.emptyCardBtn}
            onPress={() => navigation.navigate('AddSpot')}
          >
            <Text style={styles.emptyCardBtnText}>Add Spot</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Onboarding tooltip for long-press */}
      {showPulseTooltip && (
        <View style={styles.pulseTooltip}>
          <Text style={styles.pulseTooltipText}>
            Tip: Long-press the map to rate your neighborhood
          </Text>
        </View>
      )}

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.teal} size="large" />
        </View>
      )}

      {/* My location button */}
      <TouchableOpacity
        style={styles.locationBtn}
        onPress={handleLocationPress}
      >
        <BlurView tint="dark" intensity={70} style={styles.locationBlur}>
          <Feather
            name="crosshair"
            size={18}
            color={userLocation ? colors.teal : colors.dark.text2}
          />
        </BlurView>
      </TouchableOpacity>

      {/* Spot bottom sheet */}
      <SpotBottomSheet
        spot={selectedSpot}
        onClose={() => setSelectedSpot(null)}
        onSave={handleSave}
        onAddNote={(spot) => {
          setSelectedSpot(null);
          navigation.navigate('AddSpot');
        }}
        distanceKm={distanceToSelectedSpot}
        userId={user?.id}
      />

      {/* Neighborhood Pulse sheet (long-press) */}
      <NeighborhoodPulseSheet
        visible={pulseSheetVisible}
        coordinate={longPressCoord}
        onClose={() => {
          setPulseSheetVisible(false);
          setLongPressCoord(null);
        }}
        onSubmit={handlePulseSubmit}
      />

      {/* Nomad list sheet */}
      <NomadListSheet
        visible={nomadListVisible}
        city={currentCity || ''}
        nomads={nearbyNomads}
        isJustArrived={isJustArrived}
        onClose={() => setNomadListVisible(false)}
        onProfilePress={(userId) => {
          setNomadListVisible(false);
          navigation.navigate('UserProfile', { userId });
        }}
      />
    </View>
  );
}

const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1C1C1E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1C1C1E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a5a5e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#2C2C2E' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3A3A3C' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2C2C2E' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1C1C1E' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3A3A3C' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#2C2C2E' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#2C2C2E' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#3A3A3C' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  map: { ...StyleSheet.absoluteFillObject },

  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerBlur: {
    paddingTop: Platform.OS === 'ios' ? 54 : 40,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  headerOnlyContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dark.bg,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.12)',
    gap: 3,
  },
  tabToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  tabToggleActive: {
    backgroundColor: colors.teal,
  },
  tabToggleText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    letterSpacing: 0.2,
  },
  tabToggleTextActive: {
    color: colors.dark.bg,
    fontFamily: fonts.bodyBold,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    backgroundColor: 'rgba(44,44,46,0.9)',
    borderRadius: 21,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  searchPillPlaceholder: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text3,
  },
  searchPillInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    paddingVertical: 0,
  },
  addBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center',
  },
  filterRow: {
    marginHorizontal: -spacing.md,
  },
  filterContent: { paddingHorizontal: spacing.md, gap: spacing.sm },
  filterPill: {
    backgroundColor: 'rgba(44,44,46,0.85)',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(72,72,74,0.5)',
  },
  filterText: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2 },
  filterTextActive: { color: colors.dark.bg, fontFamily: fonts.bodyBold },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: 'rgba(46,196,160,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(46,196,160,0.25)',
  },
  activeFilterText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.teal,
  },

  countBadge: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
  },
  countBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  countText: { fontFamily: fonts.body, fontSize: 12, color: colors.teal },

  hintContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 150 : 135,
    alignSelf: 'center',
  },
  hintBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(232,128,58,0.3)',
  },
  hintText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.amber,
  },

  emptyCard: {
    position: 'absolute',
    top: '40%',
    width: '80%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  emptyCardTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.dark.text,
  },
  emptyCardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
  },
  emptyCardBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyCardBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.bg,
  },

  pulseTooltip: {
    position: 'absolute',
    bottom: 200,
    alignSelf: 'center',
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  pulseTooltipText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },

  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
  },

  locationBtn: {
    position: 'absolute',
    right: spacing.lg,
    bottom: 170,
  },
  locationBlur: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },

  // Map cluster markers
  clusterMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(46, 196, 160, 0.35)',
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  clusterText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.bg,
  },
});
