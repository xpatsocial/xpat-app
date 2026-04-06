import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, TextInput, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthProvider } from './src/hooks/useAuth';
import AppNavigator from './src/navigation/AppNavigator';
import { PostHogProvider } from './src/lib/posthog';
import { initSentry, Sentry } from './src/lib/sentry';
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
  );
}

export default Sentry.wrap(App);
