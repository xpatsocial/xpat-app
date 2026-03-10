import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing, radius } from '../theme';
import BrandHeader from '../components/BrandHeader';

export default function TermsOfServiceScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <BrandHeader rightAction={
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color={colors.teal} />
        </TouchableOpacity>
      } />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.updated}>Last updated: March 2026</Text>

        {/* Acceptance */}
        <Text style={styles.sectionTitle}>Acceptance</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            By using x/pat, you agree to these Terms of Service. If you do not agree, please do not use the app.
          </Text>
        </View>

        {/* Your Account */}
        <Text style={styles.sectionTitle}>Your Account</Text>
        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Feather name="shield" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>You are responsible for maintaining the security of your account</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="user-check" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>You must be at least 13 years old to use x/pat</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="alert-circle" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>You are responsible for all activity that occurs under your account</Text>
          </View>
        </View>

        {/* Community Guidelines */}
        <Text style={styles.sectionTitle}>Community Guidelines</Text>
        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Feather name="x" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>No spam or unsolicited advertising</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="x" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>No harassment, hate speech, or bullying</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="x" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>No child sexual abuse material (CSAM) — reported to authorities immediately</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="x" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>No intellectual property infringement</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="x" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>No scams, fraud, or misleading content</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="heart" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>Respect other cultures and communities</Text>
          </View>
          <Text style={[styles.bodyText, { marginTop: spacing.sm }]}>
            Reports are reviewed within 24 hours. If your content is removed, you may appeal the decision by emailing alex@xpat.social.
          </Text>
        </View>

        {/* User Content */}
        <Text style={styles.sectionTitle}>User Content</Text>
        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Feather name="check" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>You own the content you create on x/pat</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="check" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>You grant x/pat a license to display your content within the app</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="check" size={14} color={colors.teal} />
            <Text style={styles.bulletText}>We may remove content that violates our community guidelines</Text>
          </View>
        </View>

        {/* Affiliate Relationships */}
        <Text style={styles.sectionTitle}>Affiliate Relationships</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            x/pat partners with travel and lifestyle companies to recommend services we believe are valuable to digital nomads. When you interact with partner links, x/pat may earn a commission at no additional cost to you. All affiliate links are clearly marked as "Sponsored." Partner terms and conditions apply separately — please review them before completing any transaction. x/pat does not control partner pricing, availability, or service quality.
          </Text>
        </View>

        {/* Content Takedown (DMCA) */}
        <Text style={styles.sectionTitle}>Content Takedown (DMCA)</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            If you believe content on x/pat infringes your copyright or intellectual property rights, please submit a takedown request to alex@xpat.social with the following details: a description of the copyrighted work, the location of the infringing content within the app, your contact information, and a statement that you have a good-faith belief the use is unauthorized. We will review and respond to valid claims within 10 business days.
          </Text>
        </View>

        {/* Age Requirements */}
        <Text style={styles.sectionTitle}>Age Requirements</Text>
        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Feather name="alert-circle" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>You must be at least 13 years old to create an account and use x/pat</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="alert-circle" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Users aged 13–16 in the European Union require verifiable parental or guardian consent</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="alert-circle" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Accounts found to violate age requirements may be terminated without notice</Text>
          </View>
        </View>

        {/* Disclaimers */}
        <Text style={styles.sectionTitle}>Disclaimers</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            Neighborhood safety data and pulse ratings are community-sourced and are not independently verified by x/pat. Always use your own judgment when visiting new areas. x/pat does not guarantee the accuracy of user-submitted information.
          </Text>
        </View>

        {/* Limitation of Liability */}
        <Text style={styles.sectionTitle}>Limitation of Liability</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            To the maximum extent permitted by law, x/pat and Aych Holdings LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the app. Our total liability shall not exceed the amount you paid to use the service, which is zero — x/pat is free for life.
          </Text>
        </View>

        {/* Changes */}
        <Text style={styles.sectionTitle}>Changes</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            We may update these terms from time to time. Continued use of x/pat after changes are posted constitutes acceptance of the revised terms. We will notify users of significant changes.
          </Text>
        </View>

        {/* Contact */}
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.card}>
          <Text style={styles.bodyText}>
            Questions about these terms? Reach out to us at:
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
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    color: colors.amber,
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
  contactEmail: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.amber,
    marginTop: spacing.sm,
  },
});
