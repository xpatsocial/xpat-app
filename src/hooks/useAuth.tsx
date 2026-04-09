import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '../lib/sentry';
import { usePostHog } from '../lib/posthog';
import { initActivationBot, triggerBotMessage } from '../lib/activationBot';

// Required for expo-web-browser OAuth on Android
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  sendMagicLink: (email: string, name?: string, birthdateISO?: string) => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any; user?: User | null }>;
  signInWithGoogle: () => Promise<{ error: any; user?: User | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const posthog = usePostHog();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        posthog.identify(session.user.id, { email: session.user.email });
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        setSentryUser(session.user.id, session.user.email);
        posthog.identify(session.user.id, { email: session.user.email });
      } else {
        setProfile(null);
        clearSentryUser();
        posthog.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, [posthog]);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) {
      setProfile(data);
      // Initialize activation bot with user's city context
      initActivationBot(userId, data.current_city || 'your city').then(() => {
        triggerBotMessage('signup_complete');
      });
    }
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id);
  }

  async function sendMagicLink(email: string, name?: string, birthdateISO?: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: 'xpat://auth/callback',
        data: {
          ...(name ? { full_name: name } : {}),
          ...(birthdateISO ? { birthdate: birthdateISO } : {}),
        },
      },
    });
    return { error };
  }

  async function signInWithApple() {
    if (Platform.OS !== 'ios') {
      return { error: { message: 'Apple Sign In is only available on iOS.' } };
    }
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const idToken = credential.identityToken;
      if (!idToken) {
        return { error: { message: 'No identity token returned from Apple.' } };
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
        nonce: rawNonce,
      });

      if (!error && credential.fullName) {
        const displayName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
        if (displayName) {
          await supabase.auth.updateUser({ data: { full_name: displayName } });
        }
      }

      return { error, user: data?.user ?? null };
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') return { error: null };
      return { error: { message: e.message || 'Apple sign-in failed.' } };
    }
  }

  async function signInWithGoogle() {
    try {
      const redirectUrl = 'xpat://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data.url) return { error: error ?? { message: 'No auth URL returned.' } };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type !== 'success' || !result.url) {
        // User cancelled or WebView returned no URL
        return { error: null };
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
      if (exchangeError) return { error: exchangeError };

      const { data: userData } = await supabase.auth.getUser();
      return { error: null, user: userData?.user ?? null };
    } catch (e: any) {
      return { error: { message: e.message || 'Google sign-in failed.' } };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, sendMagicLink, signInWithApple, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
