import { Linking } from 'react-native';
import { supabase } from './supabase';
import { AFFILIATE_PARTNERS } from '../types';

/**
 * Returns the affiliate partner URL for a given partner key.
 */
export function getPartnerUrl(partnerId: string): string {
  const partner = AFFILIATE_PARTNERS[partnerId];
  return partner?.url ?? '';
}

/**
 * Tracks an affiliate click in the database and opens the partner URL.
 * Silently catches errors so tracking failures never block the user.
 */
export async function trackAffiliateClick(
  partnerId: string,
  placement: string,
  cityContext?: string,
  countryContext?: string,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    // Fire-and-forget insert — don't block on result
    supabase
      .from('affiliate_clicks')
      .insert({
        user_id: userId,
        partner_id: partnerId,
        placement,
        city_context: cityContext ?? null,
        country_context: countryContext ?? null,
      })
      .then(({ error }) => {
        if (error) {
          console.warn('[affiliate] tracking insert failed:', error.message);
        }
      });

    // Open the partner URL
    const url = getPartnerUrl(partnerId);
    if (url) {
      await Linking.openURL(url);
    }
  } catch (err) {
    console.warn('[affiliate] trackAffiliateClick error:', err);
  }
}
