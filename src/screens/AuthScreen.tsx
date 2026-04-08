import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  ScrollView,
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
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

type View = 'options' | 'email_form' | 'link_sent';

export default function AuthScreen() {
  const { sendMagicLink, signInWithApple, signInWithGoogle, signOut } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();

  const [view, setView] = useState<View>('options');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Age verification
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [showParentalNotice, setShowParentalNotice] = useState(false);

  // SSO age gates (Apple / Google — shown after sign-in if no birthdate on record)
  const [appleAgeGatePending, setAppleAgeGatePending] = useState(false);
  const [googleAgeGatePending, setGoogleAgeGatePending] = useState(false);

  function getBirthdateISO(): string | undefined {
    const birthdate = parseBirthdate(birthMonth, birthDay, birthYear);
    return birthdate ? birthdate.toISOString().split('T')[0] : undefined;
  }

  function validateAge(): Date | null {
    const birthdate = parseBirthdate(birthMonth, birthDay, birthYear);
    if (!birthdate) {
      Alert.alert('Invalid Date', 'Please enter a valid date of birth (MM / DD / YYYY).');
      return null;
    }
    if (calculateAge(birthdate) < 13) {
      Alert.alert('Age Requirement', 'You must be at least 13 years old to create an x/pat account.');
      return null;
    }
    return birthdate;
  }

  // ── Email flow ──────────────────────────────────────────────

  function handleContinueWithEmail() {
    setView('email_form');
    setAgeVerified(false);
    setBirthMonth(''); setBirthDay(''); setBirthYear('');
  }

  function handleVerifyAge() {
    const birthdate = validateAge();
    if (!birthdate) return;
    const age = calculateAge(birthdate);
    if (age >= 13 && age < 16 && isLikelyEU()) setShowParentalNotice(true);
    setAgeVerified(true);
  }

  async function handleSendMagicLink() {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    const birthdateISO = isSignUp ? getBirthdateISO() : undefined;
    const { error } = await sendMagicLink(
      email.trim().toLowerCase(),
      isSignUp ? name.trim() || undefined : undefined,
      birthdateISO,
    );
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    posthog.capture(isSignUp ? 'sign_up' : 'sign_in', { method: 'magic_link' });
    setView('link_sent');
  }

  // ── Apple Sign-In ────────────────────────────────────────────

  async function handleAppleSignIn() {
    setLoading(true);
    const { error, user: appleUser } = await signInWithApple();
    setLoading(false);
    if (error) {
      Alert.alert('Apple Sign In Error', error.message);
      return;
    }
    if (!appleUser) return; // cancelled
    if (!appleUser.user_metadata?.birthdate) {
      setAppleAgeGatePending(true);
      return;
    }
    posthog.capture('sign_in', { method: 'apple' });
  }

  async function handleAppleAgeVerify() {
    const birthdate = validateAge();
    if (!birthdate) return;
    const age = calculateAge(birthdate);
    if (age < 13) {
      await signOut();
      setAppleAgeGatePending(false);
      setBirthMonth(''); setBirthDay(''); setBirthYear('');
      return;
    }
    if (age >= 13 && age < 16 && isLikelyEU()) setShowParentalNotice(true);
    setLoading(true);
    await supabase.auth.updateUser({ data: { birthdate: birthdate.toISOString().split('T')[0] } });
    setLoading(false);
    setAppleAgeGatePending(false);
    posthog.capture('sign_in', { method: 'apple' });
  }

  // ── Google Sign-In ────────────────────────────────────────────

  async function handleGoogleSignIn() {
    setLoading(true);
    const { error, user: googleUser } = await signInWithGoogle();
    setLoading(false);
    if (error) {
      Alert.alert('Google Sign In Error', error.message);
      return;
    }
    if (!googleUser) return; // cancelled
    if (!googleUser.user_metadata?.birthdate) {
      setGoogleAgeGatePending(true);
      return;
    }
    posthog.capture('sign_in', { method: 'google' });
  }

  async function handleGoogleAgeVerify() {
    const birthdate = validateAge();
    if (!birthdate) return;
    const age = calculateAge(birthdate);
    if (age < 13) {
      await signOut();
      setGoogleAgeGatePending(false);
      setBirthMonth(''); setBirthDay(''); setBirthYear('');
      return;
    }
    if (age >= 13 && age < 16 && isLikelyEU()) setShowParentalNotice(true);
    setLoading(true);
    await supabase.auth.updateUser({ data: { birthdate: birthdate.toISOString().split('T')[0] } });
    setLoading(false);
    setGoogleAgeGatePending(false);
    posthog.capture('sign_in', { method: 'google' });
  }

  // ── Age gate UI (shared for Apple + Google) ───────────────────

  function renderAgeGate(onVerify: () => void) {
    return (
      <>
        <Text style={styles.ageLabel}>Date of Birth</Text>
        <Text style={styles.ageSublabel}>You must be 13 or older to use x/pat</Text>
        {showParentalNotice && (
          <View style={styles.parentalNotice}>
            <Feather name="info" size={14} color={colors.amber} />
            <Text style={styles.parentalNoticeText}>
              Under EU regulations, users aged 13–15 may need parental consent. By continuing, you confirm you have consent to use this service.
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
          onPress={onVerify}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.dark.bg} /> : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {navigation.canGoBack() && (
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 12 }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={22} color={colors.dark.text2} />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 60 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>
          <Text style={styles.brandX}>x</Text>
          <Text style={styles.brandSlash}>/</Text>
          <Text style={styles.brandPat}>pat</Text>
        </Text>
        <Text style={styles.tagline}>your world, shared</Text>

        {/* ── Apple age gate ── */}
        {appleAgeGatePending && renderAgeGate(handleAppleAgeVerify)}

        {/* ── Google age gate ── */}
        {googleAgeGatePending && renderAgeGate(handleGoogleAgeVerify)}

        {/* ── Main views ── */}
        {!appleAgeGatePending && !googleAgeGatePending && (
          <>
            {/* ── Options view ── */}
            {view === 'options' && (
              <>
                {Platform.OS === 'ios' && (
                  <>
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                      cornerRadius={radius.md}
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                    />
                  </>
                )}

                <TouchableOpacity
                  style={[styles.socialButton, loading && styles.buttonDisabled]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.dark.text} size="small" />
                  ) : (
                    <>
                      <Feather name="chrome" size={18} color={colors.dark.text} style={{ marginRight: spacing.sm }} />
                      <Text style={styles.socialButtonText}>Continue with Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity style={styles.emailOption} onPress={handleContinueWithEmail}>
                  <Feather name="mail" size={16} color={colors.teal} style={{ marginRight: spacing.sm }} />
                  <Text style={styles.emailOptionText}>Continue with email</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); }}>
                  <Text style={styles.switchText}>
                    {isSignUp ? 'Already have an account? Sign in' : "New to x/pat? Create account"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Email form view ── */}
            {view === 'email_form' && (
              <>
                <TouchableOpacity style={styles.backRow} onPress={() => setView('options')}>
                  <Feather name="arrow-left" size={16} color={colors.teal} />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.formTitle}>
                  {isSignUp ? 'Create your account' : 'Sign in to x/pat'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {isSignUp
                    ? "We'll send a magic link to your email — no password needed."
                    : "Enter your email and we'll send you a sign-in link."}
                </Text>

                {/* Sign-up only: name + age gate */}
                {isSignUp && !ageVerified && (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Your name"
                      placeholderTextColor={colors.dark.text2}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                    <Text style={styles.ageLabel}>Date of Birth</Text>
                    <Text style={styles.ageSublabel}>You must be 13 or older to join</Text>
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
                    {showParentalNotice && (
                      <View style={styles.parentalNotice}>
                        <Feather name="info" size={14} color={colors.amber} />
                        <Text style={styles.parentalNoticeText}>
                          Under EU regulations, users aged 13–15 may need parental consent.
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity style={styles.button} onPress={handleVerifyAge}>
                      <Text style={styles.buttonText}>Continue</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsSignUp(false)}>
                      <Text style={styles.switchText}>Already have an account? Sign in</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Email + send link */}
                {(!isSignUp || ageVerified) && (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Email address"
                      placeholderTextColor={colors.dark.text2}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                    />
                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={handleSendMagicLink}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color={colors.dark.bg} />
                      ) : (
                        <Text style={styles.buttonText}>Send magic link</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                      <Text style={styles.switchText}>
                        {isSignUp ? 'Already have an account? Sign in' : "New to x/pat? Create account"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            {/* ── Link sent confirmation ── */}
            {view === 'link_sent' && (
              <>
                <View style={styles.sentIcon}>
                  <Feather name="mail" size={32} color={colors.teal} />
                </View>
                <Text style={styles.sentTitle}>Check your email</Text>
                <Text style={styles.sentSubtitle}>
                  We sent a sign-in link to{'\n'}
                  <Text style={styles.sentEmail}>{email}</Text>
                </Text>
                <Text style={styles.sentHint}>
                  Tap the link in the email to sign in. It expires in 1 hour.
                </Text>
                <TouchableOpacity
                  style={styles.tryAgain}
                  onPress={() => {
                    setView('email_form');
                    setEmail('');
                  }}
                >
                  <Text style={styles.tryAgainText}>Try a different email</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
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

  // Social buttons
  appleButton: {
    height: 50,
    width: '100%',
    marginBottom: spacing.md,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: '100%',
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  socialButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.text,
  },

  // Email option
  emailOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    width: '100%',
    marginBottom: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.3)',
    backgroundColor: 'rgba(46, 196, 160, 0.06)',
  },
  emailOptionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.teal,
  },

  // Divider
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

  // Email form
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.lg,
  },
  backText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.teal,
  },
  formTitle: {
    fontFamily: fonts.heading,
    fontSize: 26,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },

  // Inputs
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

  // Age gate
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

  // Link sent
  sentIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(46, 196, 160, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  sentTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  sentSubtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.dark.text2,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  sentEmail: {
    color: colors.teal,
    fontFamily: fonts.bodyBold,
  },
  sentHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  tryAgain: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  tryAgainText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
});
