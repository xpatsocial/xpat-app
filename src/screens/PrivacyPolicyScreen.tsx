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

        {/* Your Rights */}
        <Text style={styles.sectionTitle}>Your Rights</Text>
        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Feather name="eye" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Access your data at any time</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="trash-2" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Delete your account and all associated data</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="download" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Export your data</Text>
          </View>
          <View style={styles.bulletRow}>
            <Feather name="x-circle" size={14} color={colors.amber} />
            <Text style={styles.bulletText}>Opt out of location tracking</Text>
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
  contactEmail: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.amber,
    marginTop: spacing.sm,
  },
});
