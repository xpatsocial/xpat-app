import React, { useState, useEffect } from 'react';
import { Platform, Alert, BackHandler } from 'react-native';
import { enableFreeze } from 'react-native-screens';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigationState } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import GlassTabBar from '../components/GlassTabBar';
import ErrorBoundary from '../components/ErrorBoundary';

import PlacesScreen from '../screens/PlacesScreen';
import PeopleScreen from '../screens/PeopleScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateEventScreen from '../screens/CreateEventScreen';
import AddSpotScreen from '../screens/AddSpotScreen';
import SpotDetailScreen from '../screens/SpotDetailScreen';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import NomadToolkitScreen from '../screens/NomadToolkitScreen';
import NomadDiscoveryScreen from '../screens/NomadDiscoveryScreen';
import SpotDiscoveryScreen from '../screens/SpotDiscoveryScreen';
import EventSwipeScreen from '../screens/EventSwipeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import AskAIScreen from '../screens/AskAIScreen';
import DirectMessageScreen from '../screens/DirectMessageScreen';
import InviteNomadsScreen from '../screens/InviteNomadsScreen';
import TravelWrappedScreen from '../screens/TravelWrappedScreen';
import GDPRConsent from '../components/GDPRConsent';
import OfflineBanner from '../components/OfflineBanner';
import ToastNotification from '../components/ToastNotification';

import { useAuth } from '../hooks/useAuth';
import { useStreaks } from '../hooks/useStreaks';
import { initSentry } from '../lib/sentry';
import { optOutPostHog, optInPostHog } from '../lib/posthog';

enableFreeze(true);

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home">{(props: any) => <ErrorBoundary><PeopleScreen {...props} /></ErrorBoundary>}</Tab.Screen>
      <Tab.Screen name="Discover">{(props: any) => <ErrorBoundary><PlacesScreen {...props} /></ErrorBoundary>}</Tab.Screen>
      <Tab.Screen name="Profile">{(props: any) => <ErrorBoundary><ProfileScreen {...props} /></ErrorBoundary>}</Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loading, user } = useAuth();

  // Track daily login streak — fires once per calendar day
  useStreaks(user?.id);
  const [gdprAccepted, setGdprAccepted] = useState<boolean | null>(null);
  const navigationState = useNavigationState((state) => state);

  // Android hardware back button: confirm exit on main tab, normal back elsewhere
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      // Check if we're at the root (Main tabs) with no stack screens above
      const routes = navigationState?.routes ?? [];
      const currentIndex = navigationState?.index ?? 0;
      const currentRoute = routes[currentIndex];

      if (currentRoute?.name === 'Main') {
        Alert.alert('Exit x/pat?', '', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Exit', onPress: () => BackHandler.exitApp() },
        ]);
        return true; // Prevent default back behavior
      }

      return false; // Allow normal back navigation
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigationState]);

  useEffect(() => {
    AsyncStorage.getItem('gdpr_accepted').then((val) => {
      setGdprAccepted(val === 'true' || val === 'declined');
    }).catch(() => {
      setGdprAccepted(false); // Show GDPR consent if storage fails
    });
  }, []);

  if (loading || gdprAccepted === null) return null;

  function handleGDPRAccept() {
    AsyncStorage.setItem('gdpr_accepted', 'true');
    initSentry();
    optInPostHog();
    setGdprAccepted(true);
  }

  function handleGDPRDecline() {
    // Still allow usage but disable all analytics
    AsyncStorage.setItem('gdpr_accepted', 'declined');
    optOutPostHog();
    setGdprAccepted(true);
  }

  return (
    <>
      <ErrorBoundary>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.dark.bg },
          animation: 'slide_from_right',
          animationDuration: 250,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ presentation: 'modal', gestureEnabled: true, animation: 'fade_from_bottom', animationDuration: 300 }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ presentation: 'modal', gestureEnabled: true, animation: 'fade_from_bottom', animationDuration: 300 }}
        />
        <Stack.Screen
          name="AddSpot"
          component={AddSpotScreen}
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            gestureEnabled: true,
            animation: 'fade_from_bottom',
            animationDuration: 300,
            ...(Platform.OS === 'ios' && {
              sheetAllowedDetents: [0.75, 1.0],
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
            }),
          }}
        />
        <Stack.Screen
          name="SpotDetail"
          component={SpotDetailScreen}
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            gestureEnabled: true,
            animation: 'fade_from_bottom',
            animationDuration: 280,
            ...(Platform.OS === 'ios' && {
              sheetAllowedDetents: [0.5, 0.75, 1.0],
              sheetLargestUndimmedDetentIndex: 0,
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
            }),
          }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
            animationDuration: 200,
          }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ presentation: 'modal', animation: 'fade_from_bottom', animationDuration: 300 }}
        />
        <Stack.Screen
          name="Terms"
          component={TermsOfServiceScreen}
          options={{ presentation: 'modal', animation: 'fade_from_bottom', animationDuration: 300 }}
        />
        <Stack.Screen
          name="NomadToolkit"
          component={NomadToolkitScreen}
          options={{ presentation: 'card', animation: 'slide_from_right', animationDuration: 250 }}
        />
        <Stack.Screen
          name="NomadDiscovery"
          component={NomadDiscoveryScreen}
          options={{ presentation: 'card', animation: 'slide_from_right', animationDuration: 250 }}
        />
        <Stack.Screen
          name="SpotDiscovery"
          component={SpotDiscoveryScreen}
          options={{ presentation: 'card', animation: 'slide_from_right', animationDuration: 250 }}
        />
        <Stack.Screen
          name="EventSwipe"
          component={EventSwipeScreen}
          options={{ presentation: 'card', animation: 'slide_from_right', animationDuration: 250 }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'card',
            animation: Platform.OS === 'ios' ? 'fade_from_bottom' : 'slide_from_right',
            animationDuration: 250,
            ...(Platform.OS === 'ios' && {
              sheetAllowedDetents: [0.75, 1.0],
              sheetGrabberVisible: true,
              sheetCornerRadius: 24,
            }),
          }}
        />
        <Stack.Screen
          name="BlockedUsers"
          component={BlockedUsersScreen}
          options={{ presentation: 'card', animation: 'slide_from_right', animationDuration: 250 }}
        />
        <Stack.Screen
          name="CreateEvent"
          component={CreateEventScreen}
          options={{ presentation: 'modal', animation: 'fade_from_bottom', animationDuration: 300 }}
        />
        <Stack.Screen
          name="AskAI"
          component={AskAIScreen}
          options={{ presentation: 'card', animation: 'slide_from_right', animationDuration: 250 }}
        />
        <Stack.Screen
          name="DirectMessage"
          component={DirectMessageScreen}
          options={{ presentation: 'card', animation: 'slide_from_right', animationDuration: 250 }}
        />
        <Stack.Screen
          name="InviteNomads"
          component={InviteNomadsScreen}
          options={{ presentation: 'card', animation: 'slide_from_right', animationDuration: 250 }}
        />
        <Stack.Screen
          name="TravelWrapped"
          component={TravelWrappedScreen}
          options={{ presentation: 'modal', animation: 'fade_from_bottom', animationDuration: 300 }}
        />
      </Stack.Navigator>
      </ErrorBoundary>

      {/* GDPR Consent overlay on first launch */}
      <GDPRConsent
        visible={!gdprAccepted}
        onAccept={handleGDPRAccept}
        onDecline={handleGDPRDecline}
      />

      {/* Global offline indicator */}
      <OfflineBanner />

      {/* Global toast notification system */}
      <ToastNotification />
    </>
  );
}
