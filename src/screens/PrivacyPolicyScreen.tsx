import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius } from '../theme';
import BrandHeader from '../components/BrandHeader';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <BrandHeader rightAction={
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.teal} />
        </TouchableOpacity>
      } />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: March 2026</Text>

        <Text style={styles.intro}>
          x/pat is built for expats, by expats. We respect your privacy and are transparent about what data we collect and how we use it.
        </Text>

        {/* What We Collect */}
        <Text style={styles.sectionTitle}>What We Collect</Text>
        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Feather name="map-pin" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Location data when you use the map</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="user" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Profile information you provide</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="edit-3" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Spots and posts you create</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="bar-chart-2" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Neighborhood pulse ratings you submit</Text>
          </View>
        </View>

        {/* How We Use It */}
        <Text style={styles.sectionTitle}>How We Use It</Text>
        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Feather name="compass" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>Show nearby spots relevant to you</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="globe" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>Display community data on the map</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="trending-up" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>Improve recommendations over time</Text>
          </View>
        </View>

        {/* Service Providers */}
        <Text style={styles.sectionTitle}>Service Providers</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            We work with trusted third-party providers to operate and improve x/pat. Each provider only receives the minimum data necessary for their function:
          </Text>
          <View style={[styles.bulletRow, { marginTop: spacing.sm }]}>
            <Feather name="database" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Supabase</Text> — authentication, database, and file storage. Receives your email, profile data, and user-generated content.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="alert-triangle" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Sentry</Text> — error tracking and crash reporting. Receives your user ID, email, and device/OS info to help us diagnose and fix bugs.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="bar-chart" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>PostHog</Text> — product analytics. Receives anonymized usage events, feature interaction data, and session metadata to help us improve the app experience.
            </Text>
          </View>
        </View>

        {/* Analytics & Error Tracking */}
        <Text style={styles.sectionTitle}>Analytics & Error Tracking</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            To maintain app stability and improve the user experience, we use:
          </Text>
          <View style={[styles.bulletRow, { marginTop: spacing.sm }]}>
            <Feather name="activity" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>
              Sentry captures your user ID and email when errors occur so we can investigate and resolve issues quickly. Crash reports include device type, OS version, and stack traces but never include passwords or payment data.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="pie-chart" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>
              PostHog tracks feature usage (e.g. which screens you visit, spots you view) to guide product development. Events are associated with an anonymous identifier and do not include your name or profile details.
            </Text>
          </View>
        </View>

        {/* Data Retention */}
        <Text style={styles.sectionTitle}>Data Retention</Text>
        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Feather name="clock" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Account data</Text> — retained for the lifetime of your account. Deleted within 7 days of an account deletion request.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="clock" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Error logs (Sentry)</Text> — automatically purged after 90 days.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="clock" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Analytics events (PostHog)</Text> — retained for 12 months, then automatically deleted.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="clock" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Push notification tokens</Text> — removed immediately upon sign-out or account deletion.
            </Text>
          </View>
        </View>

        {/* Your Rights */}
        <Text style={styles.sectionTitle}>Your Rights</Text>
        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Feather name="eye" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Right of Access</Text> — view and export all your personal data at any time from Settings.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="trash-2" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Right to Erasure (GDPR Art. 17)</Text> — request complete deletion of your account and all associated data. Deletion is processed within 7 days, during which you can cancel by signing back in.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="download" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Right to Data Portability (GDPR Art. 20)</Text> — export your data in a structured, machine-readable JSON format via the "Export My Data" option in Settings.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="x-circle" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Right to Object</Text> — opt out of location tracking, analytics, and notifications at any time through in-app settings.
            </Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="edit" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>
              <Text style={styles.providerName}>Right to Rectification</Text> — update or correct your personal information at any time from your profile.
            </Text>
          </View>
        </View>

        {/* Data Storage */}
        <Text style={styles.sectionTitle}>Data Storage</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            Your data is stored securely on Supabase cloud infrastructure. All data is encrypted in transit using industry-standard TLS encryption.
          </Text>
        </View>

        {/* Third Parties */}
        <Text style={styles.sectionTitle}>Third Parties</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            Affiliate partners may receive anonymized click data when you interact with affiliate links. No personally identifiable information is shared with third parties.
          </Text>
        </View>

        {/* Contact */}
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            Questions about your privacy? Reach out to us at:
          </Text>
          <Text style={styles.contactEmail}>alex@xpat.social</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  content: {
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: 100,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  updated: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    marginBottom: spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  intro: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.teal,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bulletText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    flex: 1,
    lineHeight: 20,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    lineHeight: 20,
  },
  providerName: {
    fontFamily: fonts.bodyBold,
    color: colors.dark.text,
  },
  contactEmail: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.amber,
    marginTop: spacing.sm,
  },
});
