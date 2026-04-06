import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification consent with an explanatory dialog BEFORE triggering
 * the OS-level permission prompt. Logs consent timestamp to user_preferences.
 *
 * Call this from Settings or a deferred prompt — NOT automatically on sign-in.
 */
export async function requestNotificationConsent(userId?: string): Promise<string | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Stay in the Loop',
      'x/pat uses notifications to let you know about new messages, nearby nomads, events, and connection requests. You can turn these off at any time in Settings.',
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => resolve(null),
        },
        {
          text: 'Allow',
          onPress: async () => {
            const token = await registerForPushNotifications(userId);
            // Log consent timestamp
            if (userId) {
              await supabase
                .from('user_preferences')
                .upsert(
                  { user_id: userId, notification_consent_at: new Date().toISOString() },
                  { onConflict: 'user_id' },
                );
            }
            resolve(token);
          },
        },
      ],
    );
  });
}

/**
 * Create Android notification channels. Must be called BEFORE requesting
 * permissions so users see granular channel controls in system settings.
 * No-op on iOS.
 */
async function createNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('chat', {
    name: 'Messages',
    description: 'Direct messages and chat notifications',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('social', {
    name: 'Social',
    description: 'Follows, likes, comments, and connections',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('spots', {
    name: 'Spots',
    description: 'New spots nearby and recommendations',
    importance: Notifications.AndroidImportance.LOW,
  });

  await Notifications.setNotificationChannelAsync('events', {
    name: 'Events',
    description: 'Event invites, RSVPs, and reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('nearby', {
    name: 'Nearby Nomads',
    description: 'Nomads near your location',
    importance: Notifications.AndroidImportance.LOW,
  });

  await Notifications.setNotificationChannelAsync('system', {
    name: 'System',
    description: 'Account updates and app announcements',
    importance: Notifications.AndroidImportance.MIN,
  });
}

/**
 * Register for push notifications. Creates Android channels, requests OS
 * permission if not already granted, and stores token in Supabase.
 *
 * NOTE: Do not call directly on sign-in — use requestNotificationConsent() instead
 * to ensure proper user consent is collected first.
 */
export async function registerForPushNotifications(userId?: string): Promise<string | null> {
  try {
    // Create Android channels before requesting permissions
    await createNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '819c461a-37f4-4362-9f54-b6302c3144bc',
    });
    const token = tokenData.data;

    // Store token in Supabase for server-side push
    if (userId && token) {
      await supabase
        .from('push_tokens')
        .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: 'user_id' });
    }

    return token;
  } catch {
    return null;
  }
}

export function addNotificationListener(
  handler: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(
  handler: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
