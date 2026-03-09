import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { colors, fonts, spacing, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { usePostHog } from '../lib/posthog';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const posthog = usePostHog();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    if (isSignUp) {
      const { error } = await signUp(email, password, name);
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.brand}>
          <Text style={styles.brandX}>x</Text>
          <Text style={styles.brandSlash}>/</Text>
          <Text style={styles.brandPat}>pat</Text>
        </Text>
        <Text style={styles.tagline}>your world, shared</Text>

        {isSignUp && (
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.dark.text2}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}
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
            <Text style={styles.buttonText}>
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.bg,
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
});
