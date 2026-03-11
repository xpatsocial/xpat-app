import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import GDPRConsent from '../components/GDPRConsent';

import { useAuth } from '../hooks/useAuth';
import { initSentry } from '../lib/sentry';
import { optOutPostHog, optInPostHog } from '../lib/posthog';

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
  const { loading } = useAuth();
  const [gdprAccepted, setGdprAccepted] = useState<boolean | null>(null);

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
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.dark.bg },
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
          options={{ presentation: 'modal', gestureEnabled: true }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ presentation: 'modal', gestureEnabled: true }}
        />
        <Stack.Screen
          name="AddSpot"
          component={AddSpotScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="SpotDetail"
          component={SpotDetailScreen}
          options={{
            presentation: 'formSheet',
            gestureEnabled: true,
            sheetAllowedDetents: [0.75, 1.0],
            sheetGrabberVisible: true,
            sheetCornerRadius: 20,
          }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="PrivacyPolicy"
          component={PrivacyPolicyScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Terms"
          component={TermsOfServiceScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="NomadToolkit"
          component={NomadToolkitScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="NomadDiscovery"
          component={NomadDiscoveryScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="SpotDiscovery"
          component={SpotDiscoveryScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="EventSwipe"
          component={EventSwipeScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="BlockedUsers"
          component={BlockedUsersScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="CreateEvent"
          component={CreateEventScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="AskAI"
          component={AskAIScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen
          name="DirectMessage"
          component={DirectMessageScreen}
          options={{ presentation: 'card' }}
        />
      </Stack.Navigator>

      {/* GDPR Consent overlay on first launch */}
      <GDPRConsent
        visible={!gdprAccepted}
        onAccept={handleGDPRAccept}
        onDecline={handleGDPRDecline}
      />
    </>
  );
}
