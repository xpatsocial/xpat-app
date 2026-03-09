import React, { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider } from './src/hooks/useAuth';
import AppNavigator from './src/navigation/AppNavigator';
import { PostHogProvider } from './src/lib/posthog';
import { initSentry, Sentry } from './src/lib/sentry';
import { colors } from './src/theme';

// Initialize Sentry as early as possible
initSentry();

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

SplashScreen.preventAutoHideAsync();

function App() {
  const [fontsLoaded] = useFonts({
    'DMSerifDisplay-Regular': require('./assets/fonts/DMSerifDisplay-Regular.ttf'),
    'SpaceMono-Regular': require('./assets/fonts/SpaceMono-Regular.ttf'),
    'SpaceMono-Bold': require('./assets/fonts/SpaceMono-Bold.ttf'),
  });

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
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </PostHogProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
