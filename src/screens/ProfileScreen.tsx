import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Linking, Share,
  LayoutAnimation, UIManager, Platform,
} from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { colors, fonts, spacing, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Spot } from '../types';
import BrandHeader from '../components/BrandHeader';
import SwipeableRow from '../components/SwipeableRow';
import Avatar from '../components/Avatar';
import { useAvatar } from '../hooks/useAvatar';
import AnimatedPressable from '../components/AnimatedPressable';
import AvailabilityToggle from '../components/AvailabilityToggle';
import { calculateProfileCompletion } from '../lib/profilePrompts';
import CelebrationOverlay, { CelebrationOverlayRef } from '../components/CelebrationOverlay';

const PROFILE_HEADER_HEIGHT = 260;

export default function ProfileScreen() {
  const { user, session, profile, signOut, refreshProfile } = useAuth();
  const navigation = useNavigation<any>();
  const celebrationRef = useRef<CelebrationOverlayRef>(null);
  const prevXpLevel = useRef<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { pickAndUpload, uploading: avatarUploading } = useAvatar({
    userId: user?.id || '',
    onUploaded: (url) => {
      setAvatarUrl(url);
      refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });
  const [mySpots, setMySpots] = useState<Spot[]>([]);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [spotsExpanded, setSpotsExpanded] = useState(false);
  const SPOTS_PREVIEW_COUNT = 5;

  // Detect XP level increase and trigger confetti
  useEffect(() => {
    const currentLevel = (profile as any)?.xp_level ?? 0;
    if (prevXpLevel.current !== null && currentLevel > prevXpLevel.current) {
      celebrationRef.current?.confetti();
    }
    prevXpLevel.current = currentLevel;
  }, [(profile as any)?.xp_level]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setCurrentCity(profile.current_city || '');
      setAvatarUrl(profile.avatar_url || null);
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
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.authGateBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const initials = (profile?.display_name || 'User')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Affiliate partners removed pre-launch — re-add when agreements signed

  // Group spots by country for collapsible display
  const spotsByCountry = useMemo(() => {
    const groups: Record<string, Spot[]> = {};
    mySpots.forEach(s => {
      const key = s.country || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [mySpots]);

  const visibleSpots = spotsExpanded ? mySpots : mySpots.slice(0, SPOTS_PREVIEW_COUNT);
  const hasMoreSpots = mySpots.length > SPOTS_PREVIEW_COUNT;

  function toggleSpotsExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSpotsExpanded(!spotsExpanded);
  }

  // Parallax scroll tracking
  const profileScrollY = useSharedValue(0);
  const profileScrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      profileScrollY.value = event.contentOffset.y;
    },
  });

  const headerParallaxStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      profileScrollY.value,
      [-PROFILE_HEADER_HEIGHT, 0, PROFILE_HEADER_HEIGHT],
      [-PROFILE_HEADER_HEIGHT * 0.3, 0, PROFILE_HEADER_HEIGHT * 0.4],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      profileScrollY.value,
      [-PROFILE_HEADER_HEIGHT, 0],
      [1.15, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  const statsRowStickyStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      profileScrollY.value,
      [PROFILE_HEADER_HEIGHT - 80, PROFILE_HEADER_HEIGHT],
      [1, 0.95],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <View style={styles.container}>
      <BrandHeader rightAction={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity onPress={() => setEditing(!editing)} accessibilityRole="button" accessibilityLabel={editing ? 'Cancel editing' : 'Edit profile'}>
            <Feather name={editing ? 'x' : 'edit-2'} size={18} color={colors.teal} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings' as never)} accessibilityRole="button" accessibilityLabel="Settings">
            <Feather name="settings" size={18} color={colors.dark.text2} />
          </TouchableOpacity>
        </View>
      } />

      <ReAnimated.ScrollView
        contentContainerStyle={styles.content}
        onScroll={profileScrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ReAnimated.View style={[styles.avatarContainer, headerParallaxStyle]}>
          <TouchableOpacity onPress={pickAndUpload} activeOpacity={0.8} disabled={avatarUploading} accessibilityRole="button" accessibilityLabel="Change profile photo" accessibilityState={{ busy: avatarUploading }}>
            <Avatar uri={avatarUrl} name={profile?.display_name} userId={user?.id} size={80} />
            <View style={styles.avatarEditBadge}>
              {avatarUploading ? (
                <ActivityIndicator size={10} color="#fff" />
              ) : (
                <Feather name="camera" size={10} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          {editing ? (
            <>
              <TextInput
                style={styles.editInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                placeholderTextColor={colors.dark.text2}
                accessibilityLabel="Display name"
              />
              <TextInput
                style={styles.editInput}
                value={currentCity}
                onChangeText={setCurrentCity}
                placeholder="Current city"
                placeholderTextColor={colors.dark.text2}
                accessibilityLabel="Current city"
              />
              <TextInput
                style={[styles.editInput, { minHeight: 60 }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Bio"
                placeholderTextColor={colors.dark.text2}
                multiline
                accessibilityLabel="Bio"
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.dark.bg} size="small" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.name}>{profile?.display_name || 'Set your name'}</Text>
              {profile?.tagline && (
                <Text style={styles.tagline}>{profile.tagline}</Text>
              )}
              {(profile?.custom_status || profile?.custom_status_emoji) && (
                <View style={styles.customStatusRow}>
                  {profile?.custom_status_emoji && (
                    <Text style={styles.customStatusEmoji}>{profile.custom_status_emoji}</Text>
                  )}
                  {profile?.custom_status && (
                    <Text style={styles.customStatusText}>{profile.custom_status}</Text>
                  )}
                </View>
              )}
              {profile?.current_city && (
                <View style={styles.cityRow}>
                  <Feather name="map-pin" size={12} color={colors.amber} />
                  <Text style={styles.city}>{profile.current_city}</Text>
                  {profile?.next_destination && (
                    <>
                      <Feather name="arrow-right" size={10} color={colors.dark.text3} style={{ marginHorizontal: 4 }} />
                      <Feather name="navigation" size={10} color={colors.teal} />
                      <Text style={styles.nextDest}>{profile.next_destination}</Text>
                    </>
                  )}
                </View>
              )}
              {profile?.work_type && (
                <View style={styles.workRow}>
                  <Feather name="briefcase" size={11} color={colors.dark.text2} />
                  <Text style={styles.workType}>{profile.work_type}</Text>
                </View>
              )}
              {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}

              {/* Travel Style Tags */}
              {(profile?.travel_style?.length ?? 0) > 0 && (
                <View style={styles.travelStyleRow}>
                  {profile!.travel_style!.map((style) => (
                    <View key={style} style={styles.travelStylePill}>
                      <Text style={styles.travelStyleText}>{style}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ReAnimated.View>

        {/* Profile Completion Bar */}
        {profile && (() => {
          const score = calculateProfileCompletion(profile);
          return score < 100 ? (
            <View style={styles.completionContainer}>
              <View style={styles.completionHeader}>
                <Text style={styles.completionLabel}>Profile {score}% complete</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Settings' as never)}>
                  <Text style={styles.completionAction}>Complete it</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.completionBarBg}>
                <View style={[styles.completionBarFill, { width: `${score}%` }]} />
              </View>
            </View>
          ) : null;
        })()}

        {/* Profile Prompts */}
        {[
          { q: profile?.prompt_1_question, a: profile?.prompt_1_answer },
          { q: profile?.prompt_2_question, a: profile?.prompt_2_answer },
          { q: profile?.prompt_3_question, a: profile?.prompt_3_answer },
        ].filter(p => p.q && p.a).length > 0 && (
          <View style={styles.promptsSection}>
            {[
              { q: profile?.prompt_1_question, a: profile?.prompt_1_answer },
              { q: profile?.prompt_2_question, a: profile?.prompt_2_answer },
              { q: profile?.prompt_3_question, a: profile?.prompt_3_answer },
            ].filter(p => p.q && p.a).map((prompt, idx) => (
              <View key={idx} style={styles.promptCard}>
                <Text style={styles.promptCardQuestion}>{prompt.q}</Text>
                <Text style={styles.promptCardAnswer}>{prompt.a}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Countries Visited */}
        {(profile?.countries_visited?.length ?? 0) > 0 && (
          <View style={styles.countriesSection}>
            <View style={styles.countriesHeader}>
              <Feather name="globe" size={14} color={colors.teal} />
              <Text style={styles.countriesTitle}>
                {profile!.countries_visited!.length} countries visited
              </Text>
            </View>
            <View style={styles.countriesPills}>
              {profile!.countries_visited!.map((country) => (
                <View key={country} style={styles.countryVisitedPill}>
                  <Text style={styles.countryVisitedText}>{country}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity Status */}
        <AvailabilityToggle
          userId={user!.id}
          city={profile?.current_city}
          country={profile?.current_country}
        />

        <ReAnimated.View style={[styles.statsRow, styles.statsRowSticky, statsRowStickyStyle]}>
          <View style={styles.stat} accessible accessibilityLabel={`${mySpots.length} spots`}>
            <Text style={styles.statValue}>{mySpots.length}</Text>
            <Text style={styles.statLabel}>Spots</Text>
          </View>
          <View style={[styles.stat, styles.statBorder]} accessible accessibilityLabel={`${new Set(mySpots.map(s => s.country)).size} countries`}>
            <Text style={[styles.statValue, { color: colors.amber }]}>
              {new Set(mySpots.map(s => s.country)).size}
            </Text>
            <Text style={styles.statLabel}>Countries</Text>
          </View>
          <View style={styles.stat} accessible accessibilityLabel={`${new Set(mySpots.map(s => s.city)).size} cities`}>
            <Text style={styles.statValue}>
              {new Set(mySpots.map(s => s.city)).size}
            </Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
        </ReAnimated.View>

        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={hasMoreSpots ? toggleSpotsExpanded : undefined}
          activeOpacity={hasMoreSpots ? 0.7 : 1}
        >
          <Text style={styles.sectionTitle}>My Spots</Text>
          <View style={styles.sectionRight}>
            <Text style={styles.sectionCount}>{mySpots.length}</Text>
            {hasMoreSpots && (
              <Feather
                name={spotsExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.dark.text2}
              />
            )}
          </View>
        </TouchableOpacity>

        {/* Country summary pills */}
        {mySpots.length > 0 && !spotsExpanded && (
          <View style={styles.countryPills}>
            {spotsByCountry.slice(0, 5).map(([country, spots]) => (
              <View key={country} style={styles.countryPill}>
                <Text style={styles.countryPillText}>{country}</Text>
                <Text style={styles.countryPillCount}>{spots.length}</Text>
              </View>
            ))}
            {spotsByCountry.length > 5 && (
              <View style={styles.countryPill}>
                <Text style={styles.countryPillText}>+{spotsByCountry.length - 5} more</Text>
              </View>
            )}
          </View>
        )}

        {mySpots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="map-pin" size={24} color={colors.dark.text2} />
            <Text style={styles.emptyText}>Share your first spot!</Text>
          </View>
        ) : (
          <>
            {visibleSpots.map(spot => (
              <SwipeableRow
                key={spot.id}
                style={styles.spotRowWrapper}
                rightActions={[
                  {
                    icon: 'share',
                    color: colors.teal,
                    bgColor: 'rgba(46, 196, 160, 0.15)',
                    onPress: () => Share.share({
                      message: `Check out ${spot.name} in ${spot.city}, ${spot.country} on x/pat!\n\nhttps://xpat.social/spot/${spot.id}?utm_source=share&utm_medium=app${user?.id ? `&ref=${user.id}` : ''}`,
                    }),
                  },
                  {
                    icon: 'trash-2',
                    color: colors.red,
                    bgColor: 'rgba(239, 68, 68, 0.15)',
                    onPress: () => handleDeleteSpot(spot),
                  },
                ]}
              >
                <View style={styles.spotRow}>
                  <View style={[styles.spotDot, { backgroundColor: spot.category === 'cafe' || spot.category === 'experience' ? colors.amber : colors.teal }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.spotName}>{spot.name}</Text>
                    <Text style={styles.spotCity}>{spot.city}, {spot.country}</Text>
                  </View>
                  <Text style={styles.spotCat}>{spot.category}</Text>
                </View>
              </SwipeableRow>
            ))}
            {hasMoreSpots && (
              <TouchableOpacity style={styles.showMoreBtn} onPress={toggleSpotsExpanded} activeOpacity={0.7}>
                <Text style={styles.showMoreText}>
                  {spotsExpanded ? 'Show less' : `Show all ${mySpots.length} spots`}
                </Text>
                <Feather
                  name={spotsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.teal}
                />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Nomad Toolkit */}
        <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
          <Text style={styles.sectionTitle}>Nomad Toolkit</Text>
        </View>

        <AnimatedPressable
          style={styles.toolkitLink}
          onPress={() => navigation.navigate('NomadToolkit')}
        >
          <View style={styles.partnerIcon}>
            <Feather name="globe" size={18} color={colors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.partnerLabel}>Visa Explorer</Text>
            <Text style={styles.partnerSubtitle}>60 countries with nomad visas</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.dark.text2} />
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.toolkitLink}
          onPress={() => navigation.navigate('NomadDiscovery')}
        >
          <View style={styles.partnerIcon}>
            <Feather name="users" size={18} color={colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.partnerLabel}>Discover Nomads</Text>
            <Text style={styles.partnerSubtitle}>Swipe to connect with travelers</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.dark.text2} />
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.toolkitLink}
          onPress={() => navigation.navigate('AskAI')}
        >
          <View style={[styles.partnerIcon, { backgroundColor: 'rgba(232,128,58,0.15)' }]}>
            <Feather name="zap" size={18} color={colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.partnerLabel}>x/pat AI</Text>
            <Text style={styles.partnerSubtitle}>Ask about visas, cities, safety & more</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.dark.text2} />
        </AnimatedPressable>


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

        <Text style={styles.version}>x/pat v{Constants.expoConfig?.version || '1.1.0'} beta</Text>
      </ReAnimated.ScrollView>
      <CelebrationOverlay ref={celebrationRef} />
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
  avatarEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.dark.bg,
  },
  name: { fontFamily: fonts.heading, fontSize: 24, color: colors.dark.text, marginBottom: spacing.xs },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  city: { fontFamily: fonts.body, fontSize: 13, color: colors.amber },
  tagline: {
    fontFamily: fonts.body, fontSize: 12, color: colors.amber,
    textAlign: 'center', marginBottom: spacing.xs, fontStyle: 'italic',
  },
  customStatusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(46, 196, 160, 0.08)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3, marginBottom: spacing.xs,
  },
  customStatusEmoji: { fontSize: 14 },
  customStatusText: { fontFamily: fonts.body, fontSize: 11, color: colors.teal },
  nextDest: { fontFamily: fonts.body, fontSize: 12, color: colors.teal, marginLeft: 2 },
  workRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs,
  },
  workType: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2 },
  travelStyleRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    justifyContent: 'center', marginTop: spacing.sm,
  },
  travelStylePill: {
    backgroundColor: 'rgba(232, 128, 58, 0.12)', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(232, 128, 58, 0.25)',
  },
  travelStyleText: { fontFamily: fonts.body, fontSize: 11, color: colors.amber },
  // Completion bar
  completionContainer: {
    width: '100%', marginBottom: spacing.md,
    backgroundColor: colors.dark.bg2, borderRadius: radius.sm,
    padding: spacing.sm + spacing.xs, borderWidth: 1, borderColor: colors.dark.border,
  },
  completionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xs,
  },
  completionLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2 },
  completionAction: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.teal },
  completionBarBg: {
    height: 4, backgroundColor: colors.dark.bg3, borderRadius: 2, overflow: 'hidden',
  },
  completionBarFill: {
    height: 4, backgroundColor: colors.teal, borderRadius: 2,
  },
  // Prompts
  promptsSection: { width: '100%', marginBottom: spacing.md, gap: spacing.sm },
  promptCard: {
    backgroundColor: colors.dark.bg2, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.dark.border,
    borderLeftWidth: 3, borderLeftColor: colors.amber,
  },
  promptCardQuestion: {
    fontFamily: fonts.bodyBold, fontSize: 12, color: colors.amber,
    marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.3,
  },
  promptCardAnswer: {
    fontFamily: fonts.body, fontSize: 14, color: colors.dark.text, lineHeight: 21,
  },
  // Countries visited
  countriesSection: { width: '100%', marginBottom: spacing.md },
  countriesHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs,
  },
  countriesTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.text },
  countriesPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  countryVisitedPill: {
    backgroundColor: 'rgba(46, 196, 160, 0.08)', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: 'rgba(46, 196, 160, 0.2)',
  },
  countryVisitedText: { fontFamily: fonts.body, fontSize: 10, color: colors.teal },
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
  statsRowSticky: {
    backgroundColor: colors.dark.bg,
    zIndex: 10,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.dark.border },
  statValue: { fontFamily: fonts.heading, fontSize: 28, color: colors.teal },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: spacing.sm },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 18, color: colors.dark.text },
  sectionRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionCount: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2 },
  countryPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, width: '100%', marginBottom: spacing.sm },
  countryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.dark.bg2, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  countryPillText: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2 },
  countryPillCount: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.teal },
  showMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '100%', paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: 'rgba(46, 196, 160, 0.2)', borderRadius: radius.sm,
    backgroundColor: 'rgba(46, 196, 160, 0.06)', marginBottom: spacing.sm,
  },
  showMoreText: { fontFamily: fonts.body, fontSize: 13, color: colors.teal },
  emptyCard: {
    backgroundColor: colors.dark.bg2, borderRadius: radius.md, padding: spacing.lg,
    width: '100%', alignItems: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.dark.border, borderStyle: 'dashed',
  },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2 },
  spotRowWrapper: {
    width: '100%', marginBottom: spacing.sm, borderRadius: radius.sm, overflow: 'hidden',
  },
  spotRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.dark.bg2, borderRadius: radius.sm, padding: spacing.sm + spacing.xs,
    borderWidth: 1, borderColor: colors.dark.border,
  },
  spotDot: { width: 8, height: 8, borderRadius: 4 },
  spotName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.text },
  spotCity: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2, marginTop: 1 },
  spotCat: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2, textTransform: 'uppercase' },
  // Nomad Toolkit
  toolkitLink: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(46, 196, 160, 0.08)', borderRadius: radius.sm, padding: spacing.sm + spacing.xs,
    width: '100%', marginBottom: spacing.sm, borderWidth: 1, borderColor: 'rgba(46, 196, 160, 0.2)',
  },
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
