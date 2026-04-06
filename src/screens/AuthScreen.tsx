import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { usePostHog } from '../lib/posthog';
import { supabase } from '../lib/supabase';

// EU country codes for GDPR parental consent notice (13-16)
const EU_TIMEZONES = [
  'Europe/Berlin', 'Europe/Paris', 'Europe/Rome', 'Europe/Madrid',
  'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna', 'Europe/Warsaw',
  'Europe/Lisbon', 'Europe/Dublin', 'Europe/Athens', 'Europe/Bucharest',
  'Europe/Helsinki', 'Europe/Stockholm', 'Europe/Copenhagen', 'Europe/Prague',
  'Europe/Budapest',
];

function isLikelyEU(): boolean {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return EU_TIMEZONES.some((euTz) => tz.startsWith(euTz.split('/')[0] + '/'));
  } catch {
    return false;
  }
}

function calculateAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  return age;
}

function parseBirthdate(month: string, day: string, year: string): Date | null {
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > new Date().getFullYear()) return null;
  const date = new Date(y, m - 1, d);
  // Validate the date is real (e.g. Feb 30 would roll over)
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export default function AuthScreen() {
  const { signIn, signUp, signInWithApple, signOut } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Age verification state
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [showParentalNotice, setShowParentalNotice] = useState(false);

  // Apple Sign-In age gate — blocks access until DOB is verified
  const [appleAgeGatePending, setAppleAgeGatePending] = useState(false);

  function handleVerifyAge() {
    const birthdate = parseBirthdate(birthMonth, birthDay, birthYear);
    if (!birthdate) {
      Alert.alert('Invalid Date', 'Please enter a valid date of birth (MM / DD / YYYY).');
      return;
    }
    const age = calculateAge(birthdate);
    if (age < 13) {
      Alert.alert(
        'Age Requirement',
        'You must be at least 13 years old to create an x/pat account.',
      );
      return;
    }
    if (age >= 13 && age < 16 && isLikelyEU()) {
      setShowParentalNotice(true);
    }
    setAgeVerified(true);
  }

  async function handleAppleAgeVerify() {
    const birthdate = parseBirthdate(birthMonth, birthDay, birthYear);
    if (!birthdate) {
      Alert.alert('Invalid Date', 'Please enter a valid date of birth (MM / DD / YYYY).');
      return;
    }
    const age = calculateAge(birthdate);
    if (age < 13) {
      Alert.alert(
        'Age Requirement',
        'You must be at least 13 years old to use x/pat.',
      );
      await signOut();
      setAppleAgeGatePending(false);
      setBirthMonth('');
      setBirthDay('');
      setBirthYear('');
      return;
    }
    if (age >= 13 && age < 16 && isLikelyEU()) {
      setShowParentalNotice(true);
    }
    // Store birthdate in Supabase user metadata
    const birthdateISO = birthdate.toISOString().split('T')[0];
    setLoading(true);
    await supabase.auth.updateUser({ data: { birthdate: birthdateISO } });
    setLoading(false);
    setAppleAgeGatePending(false);
    posthog.capture('sign_in', { method: 'apple' });
  }

  function getBirthdateISO(): string | undefined {
    const birthdate = parseBirthdate(birthMonth, birthDay, birthYear);
    return birthdate ? birthdate.toISOString().split('T')[0] : undefined;
  }

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    if (isSignUp) {
      const { error } = await signUp(email, password, name, getBirthdateISO());
      if (error) {
        Alert.alert('Sign Up Error', error.message);
      } else {
        posthog.capture('sign_up', { method: 'email' });
        Alert.alert('Check your email', 'We sent you a confirmation link.');
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) Alert.alert('Sign In Error', error.message);
    }
    setLoading(false);
  }

  // Reset age verification when switching between sign-in and sign-up
  function handleToggleMode() {
    setIsSignUp(!isSignUp);
    setAgeVerified(false);
    setShowParentalNotice(false);
    setBirthMonth('');
    setBirthDay('');
    setBirthYear('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Close button for modal dismissal */}
      {navigation.canGoBack() && (
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={22} color={colors.dark.text2} />
        </TouchableOpacity>
      )}
      <View style={styles.inner}>
        <Text style={styles.brand}>
          <Text style={styles.brandX}>x</Text>
          <Text style={styles.brandSlash}>/</Text>
          <Text style={styles.brandPat}>pat</Text>
        </Text>
        <Text style={styles.tagline}>your world, shared</Text>

        {/* Apple Sign-In age verification gate */}
        {appleAgeGatePending && (
          <>
            <Text style={styles.ageLabel}>Date of Birth</Text>
            <Text style={styles.ageSublabel}>You must be 13 or older to use x/pat</Text>
            {showParentalNotice && (
              <View style={styles.parentalNotice}>
                <Feather name="info" size={14} color={colors.amber} />
                <Text style={styles.parentalNoticeText}>
                  Under EU regulations, users aged 13-15 may need parental consent. By continuing, you confirm you have parental or guardian consent to use this service.
                </Text>
              </View>
            )}
            <View style={styles.dobRow}>
              <TextInput
                style={[styles.input, styles.dobInput]}
                placeholder="MM"
                placeholderTextColor={colors.dark.text2}
                value={birthMonth}
                onChangeText={(v) => setBirthMonth(v.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.dobSeparator}>/</Text>
              <TextInput
                style={[styles.input, styles.dobInput]}
                placeholder="DD"
                placeholderTextColor={colors.dark.text2}
                value={birthDay}
                onChangeText={(v) => setBirthDay(v.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.dobSeparator}>/</Text>
              <TextInput
                style={[styles.input, styles.dobInputYear]}
                placeholder="YYYY"
                placeholderTextColor={colors.dark.text2}
                value={birthYear}
                onChangeText={(v) => setBirthYear(v.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAppleAgeVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.dark.bg} />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {!appleAgeGatePending && Platform.OS === 'ios' && (
          <>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={radius.md}
              style={styles.appleButton}
              onPress={async () => {
                setLoading(true);
                const { error, user: appleUser } = await signInWithApple();
                if (error) {
                  Alert.alert('Apple Sign In Error', error.message);
                  setLoading(false);
                  return;
                }
                // Check if user already has a birthdate in metadata
                const hasBirthdate = appleUser?.user_metadata?.birthdate;
                if (!hasBirthdate) {
                  // First-time Apple sign-in — require age verification
                  setAppleAgeGatePending(true);
                  setLoading(false);
                  return;
                }
                posthog.capture('sign_in', { method: 'apple' });
                setLoading(false);
              }}
            />
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        {/* TODO: Install @react-native-google-signin/google-signin and wire to Supabase signInWithIdToken */}
        {!appleAgeGatePending && Platform.OS === 'android' && (
          <>
            <TouchableOpacity style={styles.googleButton} disabled>
              <Feather name="chrome" size={20} color={colors.dark.text2} style={{ marginRight: spacing.sm }} />
              <Text style={styles.googleButtonText}>Google Sign-In — coming soon</Text>
            </TouchableOpacity>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        {/* Age verification gate — shown before signup form */}
        {!appleAgeGatePending && isSignUp && !ageVerified && (
          <>
            <Text style={styles.ageLabel}>Date of Birth</Text>
            <Text style={styles.ageSublabel}>You must be 13 or older to join x/pat</Text>
            <View style={styles.dobRow}>
              <TextInput
                style={[styles.input, styles.dobInput]}
                placeholder="MM"
                placeholderTextColor={colors.dark.text2}
                value={birthMonth}
                onChangeText={(v) => setBirthMonth(v.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.dobSeparator}>/</Text>
              <TextInput
                style={[styles.input, styles.dobInput]}
                placeholder="DD"
                placeholderTextColor={colors.dark.text2}
                value={birthDay}
                onChangeText={(v) => setBirthDay(v.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.dobSeparator}>/</Text>
              <TextInput
                style={[styles.input, styles.dobInputYear]}
                placeholder="YYYY"
                placeholderTextColor={colors.dark.text2}
                value={birthYear}
                onChangeText={(v) => setBirthYear(v.replace(/[^0-9]/g, '').slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
            <TouchableOpacity style={styles.button} onPress={handleVerifyAge}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Signup form — shown after age is verified */}
        {!appleAgeGatePending && isSignUp && ageVerified && (
          <>
            {showParentalNotice && (
              <View style={styles.parentalNotice}>
                <Feather name="info" size={14} color={colors.amber} />
                <Text style={styles.parentalNoticeText}>
                  Under EU regulations, users aged 13-15 may need parental consent. By continuing, you confirm you have parental or guardian consent to use this service.
                </Text>
              </View>
            )}
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.dark.text2}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.dark.text2}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.dark.text2}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.dark.bg} />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Sign-in form — no age gate needed */}
        {!appleAgeGatePending && !isSignUp && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.dark.text2}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.dark.text2}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.dark.bg} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {!appleAgeGatePending && (
          <TouchableOpacity onPress={handleToggleMode}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  closeBtn: {
    position: 'absolute',
    right: spacing.lg,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  brand: {
    fontFamily: fonts.heading,
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  brandX: { color: colors.amber },
  brandSlash: { color: colors.teal },
  brandPat: { color: colors.dark.text },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: spacing.xl + spacing.md,
  },
  input: {
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.12)',
  },
  button: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.bg,
  },
  switchText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.teal,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  appleButton: {
    height: 50,
    width: '100%',
    marginBottom: spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: '100%',
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.12)',
    opacity: 0.5,
  },
  googleButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.text2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dark.border,
  },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginHorizontal: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Age verification styles
  ageLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  ageSublabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginBottom: spacing.md,
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dobInput: {
    flex: 1,
    textAlign: 'center',
    marginBottom: 0,
  },
  dobInputYear: {
    flex: 1.5,
    textAlign: 'center',
    backgroundColor: 'rgba(44, 44, 46, 0.6)',
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.12)',
    marginBottom: 0,
  },
  dobSeparator: {
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.dark.text2,
    marginHorizontal: spacing.xs,
  },
  parentalNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(232, 128, 58, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(232, 128, 58, 0.2)',
    marginBottom: spacing.md,
  },
  parentalNoticeText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.amber,
    flex: 1,
    lineHeight: 16,
  },
});
