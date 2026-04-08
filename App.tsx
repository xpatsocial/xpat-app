import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TextInput, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Create persister once at module level (stable reference)
const persister = createPersister();

function App() {
  const [fontsLoaded] = useFonts({
    'DMSerifDisplay-Regular': require('./assets/fonts/DMSerifDisplay-Regular.ttf'),
    'SpaceMono-Regular': require('./assets/fonts/SpaceMono-Regular.ttf'),
    'SpaceMono-Bold': require('./assets/fonts/SpaceMono-Bold.ttf'),
  });

  // Only initialize Sentry after GDPR consent is accepted
  useEffect(() => {
    AsyncStorage.getItem('gdpr_accepted').then((val) => {
      if (val === 'true') {
        initSentry();
      }
    }).catch(() => {
      // Storage unavailable — skip Sentry init
    });
  }, []);

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

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <StatusBar style="light" />
        <PostHogProvider>
          <AuthProvider>
            <NavigationContainer linking={linking as any}>
              <ReducedMotionConfig mode={ReduceMotion.System} />
              <ErrorBoundary>
                <AppNavigator />
              </ErrorBoundary>
            </NavigationContainer>
          </AuthProvider>
        </PostHogProvider>
      </SafeAreaProvider>
    </PersistQueryClientProvider>
  );
}

export default Sentry.wrap(App);
