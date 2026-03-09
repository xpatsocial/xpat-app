import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Linking, Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Spot, AFFILIATE_PARTNERS } from '../types';
import BrandHeader from '../components/BrandHeader';

export default function ProfileScreen() {
  const { user, session, profile, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [mySpots, setMySpots] = useState<Spot[]>([]);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [saving, setSaving] = useState(false);

  // ---------- Auth gate ----------
  if (!session) {
    return (
      <View style={styles.container}>
        <BrandHeader />
        <View style={styles.authGate}>
          <View style={styles.authGateIconCircle}>
            <Feather name="user" size={40} color={colors.teal} />
          </View>
          <Text style={styles.authGateBrand}>
            <Text style={styles.authGateX}>x</Text>
            <Text style={styles.authGateSlash}>/</Text>
            <Text style={styles.authGatePat}>pat</Text>
          </Text>
          <Text style={styles.authGateTitle}>Your nomad profile</Text>
          <Text style={styles.authGateSubtitle}>
            Sign in to create your profile, track your spots, and access the nomad toolkit.
          </Text>
          <TouchableOpacity
            style={styles.authGateBtn}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.8}
          >
            <Text style={styles.authGateBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setCurrentCity(profile.current_city || '');
    }
    if (user) {
      supabase
        .from('spots')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setMySpots(data); });
    }
  }, [user, profile]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        current_city: currentCity.trim() || null,
      })
      .eq('id', user?.id);

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditing(false);
      Alert.alert('Saved!', 'Profile updated.');
    }
  }

  async function handleSignOut() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    signOut();
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            Alert.alert(
              'Account Deletion Requested',
              'You have been signed out. Please email alex@xpat.social to complete your account deletion.',
            );
          },
        },
      ],
    );
  }

  function handleDeleteSpot(spot: Spot) {
    Alert.alert(
      'Delete Spot',
      'Are you sure you want to delete this spot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('spots').delete().eq('id', spot.id);
            setMySpots(prev => prev.filter(s => s.id !== spot.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }

  async function handleExportData() {
    try {
      const exportData: Record<string, unknown> = {
        profile: profile || null,
        spots: mySpots,
        posts: [],
      };

      if (user) {
        const { data: posts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (posts) exportData.posts = posts;
      }

      const jsonString = JSON.stringify(exportData, null, 2);

      await Share.share({
        message: jsonString,
        title: 'x/pat Data Export',
      });
    } catch (err: any) {
      if (err?.message !== 'User did not share') {
        Alert.alert('Export Error', 'Could not export your data. Please try again.');
      }
    }
  }

  const initials = (profile?.display_name || 'User')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const partners = Object.values(AFFILIATE_PARTNERS);

  return (
    <View style={styles.container}>
      <BrandHeader rightAction={
        <TouchableOpacity onPress={() => setEditing(!editing)}>
          <Feather name={editing ? 'x' : 'edit-2'} size={18} color={colors.teal} />
        </TouchableOpacity>
      } />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          {editing ? (
            <>
              <TextInput
                style={styles.editInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                placeholderTextColor={colors.dark.text2}
              />
              <TextInput
                style={styles.editInput}
                value={currentCity}
                onChangeText={setCurrentCity}
                placeholder="Current city"
                placeholderTextColor={colors.dark.text2}
              />
              <TextInput
                style={[styles.editInput, { minHeight: 60 }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Bio"
                placeholderTextColor={colors.dark.text2}
                multiline
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.dark.bg} size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.name}>{profile?.display_name || 'Set your name'}</Text>
              {profile?.current_city && (
                <View style={styles.cityRow}>
                  <Feather name="map-pin" size={12} color={colors.amber} />
                  <Text style={styles.city}>{profile.current_city}</Text>
                </View>
              )}
              {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
            </>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{mySpots.length}</Text>
            <Text style={styles.statLabel}>Spots</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]}>
            <Text style={[styles.statValue, { color: colors.amber }]}>
              {new Set(mySpots.map(s => s.country)).size}
            </Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {new Set(mySpots.map(s => s.city)).size}
            </Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Spots</Text>
          <Text style={styles.sectionCount}>{mySpots.length}</Text>
        </View>

        {mySpots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="map-pin" size={24} color={colors.dark.text2} />
            <Text style={styles.emptyText}>Share your first spot!</Text>
          </View>
        ) : (
          mySpots.map(spot => (
            <View key={spot.id} style={styles.spotRow}>
              <View style={[styles.spotDot, { backgroundColor: spot.category === 'cafe' || spot.category === 'experience' ? colors.amber : colors.teal }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.spotName}>{spot.name}</Text>
                <Text style={styles.spotCity}>{spot.city}, {spot.country}</Text>
              </View>
              <Text style={styles.spotCat}>{spot.category}</Text>
              <TouchableOpacity onPress={() => handleDeleteSpot(spot)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="trash-2" size={14} color={colors.red} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Nomad Toolkit */}
        <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Nomad Toolkit</Text>
        </View>

        {partners.map((partner) => (
          <View
            key={partner.name}
            style={styles.partnerRow}
          >
            <View style={styles.partnerIcon}>
              <Feather name={partner.icon as any} size={18} color={colors.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.partnerTitleRow}>
                <Text style={styles.partnerLabel}>{partner.label}</Text>
                <View style={styles.partnerBadge}>
                  <Text style={styles.partnerBadgeText}>Coming Soon</Text>
                </View>
              </View>
              <Text style={styles.partnerSubtitle}>{partner.subtitle}</Text>
            </View>
            <Feather name="lock" size={14} color={colors.dark.text2} />
          </View>
        ))}

        <Text style={styles.affiliateDisclosure}>
          Partner integrations coming soon
        </Text>

        {/* Legal Links */}
        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>|</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
            <Text style={styles.legalLink}>Terms of Service</Text>
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Feather name="log-out" size={14} color={colors.red} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.exportBtn} onPress={handleExportData}>
          <Feather name="download" size={14} color={colors.teal} />
          <Text style={styles.exportBtnText}>Export My Data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount}>
          <Feather name="trash-2" size={14} color={colors.red} />
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>

        <Text style={styles.version}>x/pat v1.0.2 beta</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  content: { padding: spacing.lg, paddingBottom: 120, alignItems: 'center' },
  avatarContainer: { alignItems: 'center', marginBottom: spacing.lg },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3, borderColor: colors.teal,
  },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 28, color: colors.dark.bg },
  name: { fontFamily: fonts.heading, fontSize: 24, color: colors.dark.text, marginBottom: spacing.xs },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  city: { fontFamily: fonts.body, fontSize: 13, color: colors.amber },
  bio: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2, textAlign: 'center' },
  editInput: {
    backgroundColor: colors.dark.bg2, borderRadius: radius.md, padding: spacing.sm + spacing.xs,
    fontFamily: fonts.body, fontSize: 14, color: colors.dark.text,
    borderWidth: 1, borderColor: colors.dark.border, width: '100%', marginBottom: spacing.sm,
  },
  saveBtn: { backgroundColor: colors.teal, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 32 },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.dark.bg },
  statsRow: {
    flexDirection: 'row', width: '100%',
    backgroundColor: colors.dark.bg2, borderRadius: radius.md,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.dark.border,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.dark.border },
  statValue: { fontFamily: fonts.heading, fontSize: 28, color: colors.teal },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: spacing.sm },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.dark.text },
  sectionCount: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2 },
  emptyCard: {
    backgroundColor: colors.dark.bg2, borderRadius: radius.md, padding: spacing.lg,
    width: '100%', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.dark.border, borderStyle: 'dashed',
  },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2 },
  spotRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.dark.bg2, borderRadius: radius.sm, padding: spacing.sm + spacing.xs,
    width: '100%', marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.dark.border,
  },
  spotDot: { width: 8, height: 8, borderRadius: 4 },
  spotName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.text },
  spotCity: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2, marginTop: 1 },
  spotCat: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2, textTransform: 'uppercase' },
  // Nomad Toolkit
  partnerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.dark.bg2, borderRadius: radius.sm, padding: spacing.sm + spacing.xs,
    width: '100%', marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.dark.border,
  },
  partnerIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.dark.bg3, alignItems: 'center', justifyContent: 'center',
  },
  partnerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  partnerLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.text },
  partnerBadge: {
    backgroundColor: colors.dark.bg3, borderRadius: radius.sm,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  partnerBadgeText: { fontFamily: fonts.body, fontSize: 8, color: colors.dark.text2, textTransform: 'uppercase', letterSpacing: 0.5 },
  partnerSubtitle: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2, marginTop: 1 },
  affiliateDisclosure: {
    fontFamily: fonts.body, fontSize: 9, color: colors.dark.text2,
    textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.sm,
  },
  // Legal
  legalRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.md, marginBottom: spacing.sm,
  },
  legalLink: { fontFamily: fonts.body, fontSize: 12, color: colors.teal },
  legalDivider: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2 },
  // Account actions
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.xl, borderWidth: 1, borderColor: colors.red,
    borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 24,
  },
  signOutText: { fontFamily: fonts.body, fontSize: 13, color: colors.red },
  exportBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.teal,
    borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 24,
  },
  exportBtnText: { fontFamily: fonts.body, fontSize: 13, color: colors.teal },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginTop: spacing.sm, borderWidth: 1, borderColor: colors.red,
    borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 24,
  },
  deleteBtnText: { fontFamily: fonts.body, fontSize: 13, color: colors.red },
  version: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2, marginTop: spacing.lg },

  // Auth gate
  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
  },
  authGateIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46, 196, 160, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(46, 196, 160, 0.2)',
  },
  authGateBrand: {
    fontFamily: fonts.heading,
    fontSize: 36,
    marginBottom: spacing.md,
  },
  authGateX: { color: colors.amber },
  authGateSlash: { color: colors.teal },
  authGatePat: { color: colors.dark.text },
  authGateTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  authGateSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  authGateBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.xl + spacing.lg,
  },
  authGateBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.bg,
  },
});
