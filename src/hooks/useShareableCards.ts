/**
 * useShareableCards — generate, share, and save branded card images
 *
 * - generateCard: renders a ShareableCard off-screen via ViewShot, returns URI
 * - shareCard: native Share sheet with the image
 * - saveCard: save to camera roll via expo-media-library
 * - trackShare: logs the share event to Supabase
 */
import { useRef, useCallback } from 'react';
import { Share, Platform, Alert } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { usePostHog } from '../lib/posthog';
import type { ShareableCardType } from '../components/ShareableCard';

export function useShareableCards() {
  const viewShotRef = useRef<ViewShot>(null);
  const { user } = useAuth();
  const posthog = usePostHog();

  /**
   * Capture the current ViewShot ref as a PNG image URI.
   * The caller must render a <ShareableCard ref={viewShotRef}> for this to work.
   */
  const captureCard = useCallback(async (): Promise<string | null> => {
    try {
      if (!viewShotRef.current?.capture) return null;
      const uri = await viewShotRef.current.capture();
      return uri;
    } catch {
      return null;
    }
  }, []);

  /**
   * Share a card image via native Share sheet.
   */
  const shareCard = useCallback(async (imageUri: string) => {
    try {
      if (Platform.OS === 'ios') {
        await Share.share({ url: imageUri });
      } else {
        // Android: share as file URI
        await Share.share({
          message: 'Check out my journey on x/pat!',
          title: 'x/pat Card',
          url: imageUri,
        } as any);
      }
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        Alert.alert('Share failed', 'Could not share the card. Try again.');
      }
    }
  }, []);

  /**
   * Save card image to camera roll.
   */
  const saveCard = useCallback(async (imageUri: string): Promise<boolean> => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Allow photo library access to save cards.',
        );
        return false;
      }

      await MediaLibrary.saveToLibraryAsync(imageUri);
      return true;
    } catch {
      Alert.alert('Save failed', 'Could not save to your photo library.');
      return false;
    }
  }, []);

  /**
   * Track share event in Supabase + PostHog analytics.
   */
  const trackShare = useCallback(
    async (cardType: ShareableCardType, metadata?: Record<string, unknown>) => {
      if (!user) return;

      posthog.capture('shareable_card_shared', {
        card_type: cardType,
        ...metadata,
      });

      try {
        await supabase.from('shareable_cards').insert({
          user_id: user.id,
          card_type: cardType,
          metadata: metadata ?? {},
          shared_at: new Date().toISOString(),
        });
      } catch {
        // Non-critical — don't crash the app for analytics
      }
    },
    [user, posthog],
  );

  return {
    viewShotRef,
    captureCard,
    shareCard,
    saveCard,
    trackShare,
  };
}
