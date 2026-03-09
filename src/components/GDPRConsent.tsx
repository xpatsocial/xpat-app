import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius } from '../theme';

interface GDPRConsentProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function GDPRConsent({
  visible,
  onAccept,
  onDecline,
}: GDPRConsentProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.spring(opacityAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  return (
    <Modal transparent visible={visible} animationType="none">
      <BlurView intensity={80} tint="dark" style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={styles.logoX}>x</Text>
            <Text style={styles.logoSlash}>/</Text>
            <Text style={styles.logoPat}>pat</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>Welcome to x/pat</Text>

          {/* Body */}
          <Text style={styles.body}>
            We use your location to show nearby spots and enable neighborhood
            ratings. Your data is stored securely and never sold.
          </Text>

          {/* Bullets */}
          <View style={styles.bulletList}>
            <View style={styles.bulletRow}>
              <Feather name="map-pin" size={16} color={colors.teal} />
              <Text style={styles.bulletText}>
                Location used to find spots near you
              </Text>
            </View>
            <View style={styles.bulletRow}>
              <Feather name="shield" size={16} color={colors.teal} />
              <Text style={styles.bulletText}>
                Your data is encrypted and private
              </Text>
            </View>
          </View>

          {/* Links */}
          <View style={styles.linksRow}>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://xpat.social/privacy-policy')
              }
            >
              <Text style={styles.linkText}>Read our Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.linkSeparator}>·</Text>
            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://xpat.social/terms-of-service')
              }
            >
              <Text style={styles.linkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={onAccept}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptText}>Accept & Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            activeOpacity={0.7}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.dark.bg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  logoX: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.amber,
  },
  logoSlash: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.teal,
  },
  logoPat: {
    fontFamily: fonts.heading,
    fontSize: 32,
    color: colors.dark.text,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.dark.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  bulletList: {
    alignSelf: 'stretch',
    gap: spacing.sm + spacing.xs,
    marginBottom: spacing.lg,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
  },
  bulletText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    flexShrink: 1,
  },
  linksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.teal,
  },
  linkSeparator: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  acceptButton: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: radius.md,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  acceptText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.dark.bg,
  },
  declineButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  declineText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
});
