import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TextInput, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, createPersister } from './src/lib/queryClient';
import { supabase } from './src/lib/supabase';

import { AuthProvider } from './src/hooks/useAuth';
import AppNavigator from './src/navigation/AppNavigator';
import { PostHogProvider } from './src/lib/posthog';
import { initSentry, Sentry } from './src/lib/sentry';
import { trackAppOpened } from './src/lib/analytics';
import { colors } from './src/theme';
import ErrorBoundary from './src/components/ErrorBoundary';

const linking = {
  prefixes: ['xpat://', 'https://xpat.social'],
  config: {
    screens: {
      Main: {
        screens: {
          Explore: {
            path: 'spot/:id',
            parse: { id: Number },
          },
          Feed: 'feed',
          Profile: {
            path: 'profile/:id',
          },
        },
      },
      Auth: 'auth',
    },
  },
};

// Disable Android extra font padding globally
if (Platform.OS === 'android') {
  const defaultTextProps = (Text as any).defaultProps || {};
  (Text as any).defaultProps = { ...defaultTextProps, includeFontPadding: false };
  const defaultInputProps = (TextInput as any).defaultProps || {};
  (TextInput as any).defaultProps = { ...defaultInputProps, includeFontPadding: false };
}

SplashScreen.preventAutoHideAsync();

// Initialize Sentry IMMEDIATELY at module load — before any other code runs.
// This catches launch crashes that happen before React mounts. We respect
// GDPR by not setting user identity (PII) until consent is granted, but
// the SDK itself initializes early to capture all crashes.
initSentry();

// NOTE: createPersister() is intentionally NOT called at module load.
// Calling it here triggers MMKV TurboModule init before the bridge is wired,
// causing the app to abort on iOS New Architecture. It is now lazy-initialized
// inside the App() component on first render via useState initializer.

function App() {
  // Fonts are statically registered via expo-font config plugin in app.json,
  // making them available in iOS Info.plist UIAppFonts at app launch — no
  // runtime loading needed. Calling useFonts() here was triggering
  // FontLoaderModule.registerFont() which crashed in production builds on
  // iOS New Architecture (TurboModule queue panic, Apr 9 2026 incident).
  const fontsLoaded = true;

  // LAZY persister — only initialized on first render, AFTER React has mounted
  // and the TurboModule bridge is fully wired. Falls back to in-memory cache
  // if MMKV init throws (no offline persistence but app still works).
  const [persister] = useState(() => {
    try {
      return createPersister();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[xpat] Persister init failed, falling back to in-memory cache:', e);
      return null;
    }
  });

  // Track app_opened + streak on each cold start
  useEffect(() => {
    trackAppOpened();
  }, []);

  // Handle auth deep links (magic link + Google/Apple OAuth callbacks)
  // xpat://auth/callback?code=xxx  — PKCE code exchange
  useEffect(() => {
    async function handleAuthUrl(url: string) {
      if (url.includes('auth/callback')) {
        await supabase.auth.exchangeCodeForSession(url);
      }
    }

    // App opened from a cold start via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthUrl(url);
    });

    // App already open — foregrounded via deep link
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthUrl(url);
    });

    return () => subscription.remove();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.dark.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.teal} size="large" />
      </View>
    );
  }

  // Use PersistQueryClientProvider when persister initialized successfully,
  // otherwise fall back to plain QueryClientProvider (in-memory only).
  const inner = (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <StatusBar style="light" />
      <PostHogProvider>
        <AuthProvider>
          <NavigationContainer linking={linking as any}>
            <ReducedMotionConfig mode={ReduceMotion.System} />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PostHogProvider>
    </SafeAreaProvider>
  );

  const providerTree = persister ? (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {inner}
    </PersistQueryClientProvider>
  ) : (
    <QueryClientProvider client={queryClient}>
      {inner}
    </QueryClientProvider>
  );

  // TOP-LEVEL ErrorBoundary wraps EVERYTHING including providers —
  // catches errors thrown during provider init, navigation, or any screen render.
  // Previously ErrorBoundary was inside NavigationContainer, which meant provider
  // crashes would kill the entire app with no user feedback.
  return <ErrorBoundary>{providerTree}</ErrorBoundary>;
}

export default Sentry.wrap(App);
