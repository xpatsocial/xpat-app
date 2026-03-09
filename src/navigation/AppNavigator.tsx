import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import GlassTabBar from '../components/GlassTabBar';

import ExploreScreen from '../screens/ExploreScreen';
import FeedScreen from '../screens/FeedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import AddSpotScreen from '../screens/AddSpotScreen';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import GDPRConsent from '../components/GDPRConsent';

import { useAuth } from '../hooks/useAuth';

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
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const [gdprAccepted, setGdprAccepted] = useState<boolean | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('gdpr_accepted').then((val) => {
      setGdprAccepted(val === 'true');
    });
    AsyncStorage.getItem('onboarding_complete').then((val) => {
      setOnboardingComplete(val === 'true');
    });
  }, []);

  if (loading || gdprAccepted === null || onboardingComplete === null) return null;

  function handleGDPRAccept() {
    AsyncStorage.setItem('gdpr_accepted', 'true');
    setGdprAccepted(true);
  }

  function handleGDPRDecline() {
    // Still allow usage but don't enable location features
    AsyncStorage.setItem('gdpr_accepted', 'declined');
    setGdprAccepted(true);
  }

  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="AddSpot"
              component={AddSpotScreen}
              options={{ presentation: 'modal' }}
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
          </>
        ) : !onboardingComplete ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>

      {/* GDPR Consent overlay on first launch */}
      <GDPRConsent
        visible={!gdprAccepted && !!session}
        onAccept={handleGDPRAccept}
        onDecline={handleGDPRDecline}
      />
    </>
  );
}
