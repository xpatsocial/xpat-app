import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Switch, ActivityIndicator, Share, Modal,
  FlatList, Pressable, Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, fonts, spacing, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { usePreferences } from '../hooks/usePreferences';
import { useTravelPlans } from '../hooks/useTravelPlans';
import { LANGUAGES } from '../hooks/useTranslate';
import { requestNotificationConsent } from '../lib/notifications';
import {
  PROFILE_PROMPTS, TRAVEL_STYLE_OPTIONS, STATUS_EMOJIS,
  calculateProfileCompletion,
} from '../lib/profilePrompts';
import FeedbackSheet from '../components/FeedbackSheet';
import { initSentry } from '../lib/sentry';
import { optOutPostHog, optInPostHog } from '../lib/posthog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProfileVisibility = 'public' | 'connections' | 'hidden';
type DistanceUnit = 'km' | 'mi';

interface SettingsState {
  displayName: string;
  username: string;
  bio: string;
  currentCity: string;
  homeCity: string;
  nationality: string;
  languages: string[];
  skills: string[];
  openTo: string[];
  tagline: string;
  travelStyle: string[];
  workType: string;
  prompt1Question: string;
  prompt1Answer: string;
  prompt2Question: string;
  prompt2Answer: string;
  prompt3Question: string;
  prompt3Answer: string;
  countriesVisited: string[];
  nextDestination: string;
  customStatus: string;
  customStatusEmoji: string;
  profileVisibility: ProfileVisibility;
  showLocationOnMap: boolean;
  locationPrecision: 'city' | 'exact';
  notifyConnections: boolean;
  notifyMessages: boolean;
  notifyNearbyNomads: boolean;
  notifyEvents: boolean;
  quietHoursEnabled: boolean;
  emailNotifications: boolean;
  distanceUnit: DistanceUnit;
  autoLoadImages: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  displayName: '',
  username: '',
  bio: '',
  currentCity: '',
  homeCity: '',
  nationality: '',
  languages: [],
  skills: [],
  openTo: [],
  tagline: '',
  travelStyle: [],
  workType: '',
  prompt1Question: '',
  prompt1Answer: '',
  prompt2Question: '',
  prompt2Answer: '',
  prompt3Question: '',
  prompt3Answer: '',
  countriesVisited: [],
  nextDestination: '',
  customStatus: '',
  customStatusEmoji: '',
  profileVisibility: 'public',
  showLocationOnMap: false,
  locationPrecision: 'city',
  notifyConnections: true,
  notifyMessages: true,
  notifyNearbyNomads: true,
  notifyEvents: true,
  quietHoursEnabled: false,
  emailNotifications: true,
  distanceUnit: 'km',
  autoLoadImages: true,
};

const SKILL_OPTIONS = [
  'Developer', 'Designer', 'Writer', 'Marketer', 'Product',
  'Photographer', 'Video', 'Music', 'Teaching', 'Consulting',
  'Founder', 'Freelancer', 'Artist', 'Data', 'Finance',
];

const OPEN_TO_OPTIONS = [
  'Coffee chats', 'Coworking', 'Travel buddy', 'Collaboration',
  'Language exchange', 'Mentoring', 'Networking', 'Sports/fitness',
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, profile, signOut } = useAuth();
  const { preferences, updatePreference, updatePreferences } = usePreferences();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [promptPickerSlot, setPromptPickerSlot] = useState<1 | 2 | 3 | null>(null);
  const [countryInput, setCountryInput] = useState('');

  // Travel plans (Agent 2 - Product)
  const { myPlans, addPlan, removePlan } = useTravelPlans();
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [planCity, setPlanCity] = useState('');
  const [planCountry, setPlanCountry] = useState('');
  const [planArrival, setPlanArrival] = useState(new Date());
  const [planDeparture, setPlanDeparture] = useState<Date | null>(null);
  const [hasDeparture, setHasDeparture] = useState(false);
  const [addingPlan, setAddingPlan] = useState(false);
  const [showArrivalPicker, setShowArrivalPicker] = useState(false);
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  // Load analytics consent state
  useEffect(() => {
    AsyncStorage.getItem('gdpr_accepted').then((val) => {
      setAnalyticsEnabled(val === 'true');
    });
  }, []);

  useEffect(() => {
    if (profile) {
      setSettings((prev) => ({
        ...prev,
        displayName: profile.display_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        currentCity: profile.current_city || '',
        homeCity: profile.home_city || '',
        nationality: profile.nationality || '',
        languages: profile.languages || [],
        skills: profile.skills || [],
        openTo: profile.open_to || [],
        tagline: profile.tagline || '',
        travelStyle: profile.travel_style || [],
        workType: profile.work_type || '',
        prompt1Question: profile.prompt_1_question || '',
        prompt1Answer: profile.prompt_1_answer || '',
        prompt2Question: profile.prompt_2_question || '',
        prompt2Answer: profile.prompt_2_answer || '',
        prompt3Question: profile.prompt_3_question || '',
        prompt3Answer: profile.prompt_3_answer || '',
        countriesVisited: profile.countries_visited || [],
        nextDestination: profile.next_destination || '',
        customStatus: profile.custom_status || '',
        customStatusEmoji: profile.custom_status_emoji || '',
      }));
    }
  }, [profile]);

  // Sync preferences from Supabase hook into local settings state
  useEffect(() => {
    setSettings((prev) => ({
      ...prev,
      distanceUnit: preferences.distance_unit,
      autoLoadImages: preferences.auto_load_images,
      profileVisibility: preferences.profile_visibility === 'private' ? 'hidden' as ProfileVisibility : preferences.profile_visibility as ProfileVisibility,
      showLocationOnMap: preferences.show_on_map,
      locationPrecision: preferences.location_precision,
      notifyConnections: preferences.notify_connections,
      notifyMessages: preferences.notify_messages,
      notifyNearbyNomads: preferences.notify_nearby,
      notifyEvents: preferences.notify_events,
      quietHoursEnabled: !!preferences.quiet_hours_start,
      emailNotifications: preferences.notify_email,
    }));
  }, [preferences]);

  const updateField = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setHasChanges(true);
    },
    [],
  );

  // Map from local setting key to Supabase preference key
  const PREF_KEY_MAP: Record<string, string> = {
    showLocationOnMap: 'show_on_map',
    notifyConnections: 'notify_connections',
    notifyMessages: 'notify_messages',
    notifyNearbyNomads: 'notify_nearby',
    notifyEvents: 'notify_events',
    quietHoursEnabled: 'quiet_hours_start',
    emailNotifications: 'notify_email',
    autoLoadImages: 'auto_load_images',
  };

  const toggleSwitch = useCallback((key: keyof SettingsState, _storageKey: string) => {
    setSettings((prev) => {
      const newVal = !prev[key];
      // Sync to Supabase via preferences hook
      const prefKey = PREF_KEY_MAP[key];
      if (prefKey) {
        if (key === 'quietHoursEnabled') {
          updatePreference('quiet_hours_start', newVal ? '22:00' : null);
          updatePreference('quiet_hours_end', newVal ? '08:00' : null);
        } else {
          updatePreference(prefKey as any, newVal);
        }
      }
      return { ...prev, [key]: newVal };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [updatePreference]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    const profileData = {
      display_name: settings.displayName.trim(),
      username: settings.username.trim() || null,
      bio: settings.bio.trim() || null,
      current_city: settings.currentCity.trim() || null,
      home_city: settings.homeCity.trim() || null,
      nationality: settings.nationality.trim() || null,
      languages: settings.languages,
      skills: settings.skills,
      open_to: settings.openTo,
      tagline: settings.tagline.trim() || null,
      travel_style: settings.travelStyle,
      work_type: settings.workType.trim() || null,
      prompt_1_question: settings.prompt1Question || null,
      prompt_1_answer: settings.prompt1Answer.trim() || null,
      prompt_2_question: settings.prompt2Question || null,
      prompt_2_answer: settings.prompt2Answer.trim() || null,
      prompt_3_question: settings.prompt3Question || null,
      prompt_3_answer: settings.prompt3Answer.trim() || null,
      countries_visited: settings.countriesVisited,
      next_destination: settings.nextDestination.trim() || null,
      custom_status: settings.customStatus.trim() || null,
      custom_status_emoji: settings.customStatusEmoji || null,
      profile_completion_score: calculateProfileCompletion({
        display_name: settings.displayName.trim(),
        bio: settings.bio.trim(),
        avatar_url: profile?.avatar_url,
        current_city: settings.currentCity.trim(),
        home_city: settings.homeCity.trim(),
        nationality: settings.nationality.trim(),
        tagline: settings.tagline.trim(),
        travel_style: settings.travelStyle,
        work_type: settings.workType.trim(),
        prompt_1_answer: settings.prompt1Answer.trim(),
        prompt_2_answer: settings.prompt2Answer.trim(),
        prompt_3_answer: settings.prompt3Answer.trim(),
        countries_visited: settings.countriesVisited,
        languages: settings.languages,
        skills: settings.skills,
        open_to: settings.openTo,
      }),
    };

    const { error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id);

    // Batch sync all preferences to Supabase in single call
    await updatePreferences({
      distance_unit: settings.distanceUnit,
      profile_visibility: settings.profileVisibility === 'hidden' ? 'private' : settings.profileVisibility,
      show_on_map: settings.showLocationOnMap,
      location_precision: settings.locationPrecision,
      notify_connections: settings.notifyConnections,
      notify_messages: settings.notifyMessages,
      notify_nearby: settings.notifyNearbyNomads,
      notify_events: settings.notifyEvents,
      notify_email: settings.emailNotifications,
      auto_load_images: settings.autoLoadImages,
    });

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setHasChanges(false);
    }
  }

  async function handleExportData() {
    try {
      const exportData: Record<string, unknown> = { profile: profile || null };
      if (user) {
        const safeQuery = async (
          table: string,
          filter: { column: string; value: string } | { or: string },
        ) => {
          try {
            let query = supabase.from(table).select('*');
            if ('or' in filter) {
              query = query.or(filter.or);
            } else {
              query = query.eq(filter.column, filter.value);
            }
            const { data } = await query;
            return data ?? [];
          } catch {
            return [];
          }
        };

        const [
          spots,
          posts,
          directMessages,
          comments,
          connections,
          travelPlans,
          savedSpots,
          checkIns,
          eventRsvps,
          events,
          betaFeedback,
          userPreferences,
        ] = await Promise.all([
          safeQuery('spots', { column: 'created_by', value: user.id }),
          safeQuery('posts', { column: 'user_id', value: user.id }),
          safeQuery('direct_messages', { column: 'sender_id', value: user.id }),
          safeQuery('comments', { column: 'user_id', value: user.id }),
          safeQuery('connections', { or: `requester_id.eq.${user.id},addressee_id.eq.${user.id}` }),
          safeQuery('travel_plans', { column: 'user_id', value: user.id }),
          safeQuery('saved_spots', { column: 'user_id', value: user.id }),
          safeQuery('check_ins', { column: 'user_id', value: user.id }),
          safeQuery('event_rsvps', { column: 'user_id', value: user.id }),
          safeQuery('events', { column: 'created_by', value: user.id }),
          safeQuery('beta_feedback', { column: 'user_id', value: user.id }),
          safeQuery('user_preferences', { column: 'user_id', value: user.id }),
        ]);

        exportData.spots = spots;
        exportData.posts = posts;
        exportData.direct_messages = directMessages;
        exportData.comments = comments;
        exportData.connections = connections;
        exportData.travel_plans = travelPlans;
        exportData.saved_spots = savedSpots;
        exportData.check_ins = checkIns;
        exportData.event_rsvps = eventRsvps;
        exportData.events = events;
        exportData.beta_feedback = betaFeedback;
        exportData.user_preferences = userPreferences;
      }
      await Share.share({
        message: JSON.stringify(exportData, null, 2),
        title: 'x/pat Data Export',
      });
    } catch {
      // User cancelled share
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Your account and all associated data (profile, spots, posts, messages) will be permanently deleted within 7 days. You can cancel the deletion by signing back in during that period.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation to prevent accidental deletion
            Alert.alert(
              'Are you sure?',
              'This action schedules your account for permanent deletion in 7 days.',
              [
                { text: 'Go Back', style: 'cancel' },
                {
                  text: 'Yes, Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { error } = await supabase.rpc('delete_user_account');
                      if (error) {
                        Alert.alert('Error', error.message || 'Could not process deletion request. Please try again.');
                        return;
                      }
                      await signOut();
                      Alert.alert(
                        'Deletion Scheduled',
                        'Your account will be deleted within 7 days. You can cancel by signing in again.',
                      );
                    } catch {
                      Alert.alert('Error', 'Something went wrong. Please try again later.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  function handleChangePassword() {
    if (!user?.email) return;
    Alert.alert('Reset Password', `We'll send a reset link to ${user.email}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Link',
        onPress: async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(user.email!);
          if (error) Alert.alert('Error', error.message);
          else Alert.alert('Sent', 'Check your email for the reset link.');
        },
      },
    ]);
  }

  const appVersion = Constants.expoConfig?.version || '1.0.3';

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  function SectionHeader({ icon, title, tint = colors.teal }: { icon: string; title: string; tint?: string }) {
    return (
      <View style={styles.sectionHeader}>
        <Feather name={icon as any} size={16} color={tint} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    );
  }

  function SettingRow({
    icon, label, sublabel, right, onPress, destructive,
  }: {
    icon: string; label: string; sublabel?: string;
    right?: React.ReactNode; onPress?: () => void; destructive?: boolean;
  }) {
    const Wrapper = onPress ? TouchableOpacity : View;
    return (
      <Wrapper style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.settingIcon, destructive && { backgroundColor: 'rgba(255,107,107,0.12)' }]}>
          <Feather name={icon as any} size={16} color={destructive ? colors.red : colors.teal} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingLabel, destructive && { color: colors.red }]}>{label}</Text>
          {sublabel && <Text style={styles.settingSublabel}>{sublabel}</Text>}
        </View>
        {right || (onPress && <Feather name="chevron-right" size={16} color={colors.dark.text3} />)}
      </Wrapper>
    );
  }

  function ToggleRow({
    icon, label, sublabel, value, storageKey, settingKey,
  }: {
    icon: string; label: string; sublabel?: string;
    value: boolean; storageKey: string; settingKey: keyof SettingsState;
  }) {
    return (
      <SettingRow
        icon={icon}
        label={label}
        sublabel={sublabel}
        right={
          <Switch
            value={value}
            onValueChange={() => toggleSwitch(settingKey, storageKey)}
            trackColor={{ false: colors.dark.bg3, true: 'rgba(46,196,160,0.4)' }}
            thumbColor={value ? colors.teal : colors.dark.text2}
            ios_backgroundColor={colors.dark.bg3}
          />
        }
      />
    );
  }

  function SegmentedControl({
    options, value, onSelect,
  }: {
    options: { label: string; value: string }[]; value: string;
    onSelect: (val: string) => void;
  }) {
    return (
      <View style={styles.segmented}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.segment, value === opt.value && styles.segmentActive]}
            onPress={() => {
              onSelect(opt.value);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        {hasChanges ? (
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.teal} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* PROFILE */}
        <SectionHeader icon="user" title="Profile" />
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.displayName}
              onChangeText={(v) => updateField('displayName', v)}
              placeholder="Your name"
              placeholderTextColor={colors.dark.text3}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.username}
              onChangeText={(v) => updateField('username', v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="@username"
              placeholderTextColor={colors.dark.text3}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, { minHeight: 60 }]}
              value={settings.bio}
              onChangeText={(v) => updateField('bio', v)}
              placeholder="Tell nomads about yourself"
              placeholderTextColor={colors.dark.text3}
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{settings.bio.length}/200</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Current City</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.currentCity}
              onChangeText={(v) => updateField('currentCity', v)}
              placeholder="Where are you now?"
              placeholderTextColor={colors.dark.text3}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Home City</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.homeCity}
              onChangeText={(v) => updateField('homeCity', v)}
              placeholder="Where are you from?"
              placeholderTextColor={colors.dark.text3}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nationality</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.nationality}
              onChangeText={(v) => updateField('nationality', v)}
              placeholder="e.g. American, Brazilian, German"
              placeholderTextColor={colors.dark.text3}
            />
          </View>
        </View>

        {/* SKILLS & INTERESTS */}
        <SectionHeader icon="briefcase" title="Skills & Interests" />
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>What I Do</Text>
            <View style={styles.chipGrid}>
              {SKILL_OPTIONS.map((skill) => {
                const active = settings.skills.includes(skill);
                return (
                  <TouchableOpacity
                    key={skill}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      const next = active
                        ? settings.skills.filter((s) => s !== skill)
                        : [...settings.skills, skill];
                      updateField('skills', next);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{skill}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Open To</Text>
            <View style={styles.chipGrid}>
              {OPEN_TO_OPTIONS.map((item) => {
                const active = settings.openTo.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      const next = active
                        ? settings.openTo.filter((o) => o !== item)
                        : [...settings.openTo, item];
                      updateField('openTo', next);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Languages I Speak</Text>
            <View style={styles.chipGrid}>
              {LANGUAGES.map((lang) => {
                const active = settings.languages.includes(lang.code);
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      const next = active
                        ? settings.languages.filter((l) => l !== lang.code)
                        : [...settings.languages, lang.code];
                      updateField('languages', next);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{lang.flag} {lang.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* TAGLINE & IDENTITY */}
        <SectionHeader icon="zap" title="Identity" tint={colors.amber} />
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Tagline</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.tagline}
              onChangeText={(v) => updateField('tagline', v)}
              placeholder="Frontend dev slow-traveling Southeast Asia"
              placeholderTextColor={colors.dark.text3}
              maxLength={80}
            />
            <Text style={styles.charCount}>{settings.tagline.length}/80</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>What I Do</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.workType}
              onChangeText={(v) => updateField('workType', v)}
              placeholder="Freelance designer, startup founder, teacher..."
              placeholderTextColor={colors.dark.text3}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Next Destination</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.nextDestination}
              onChangeText={(v) => updateField('nextDestination', v)}
              placeholder="Where are you headed next?"
              placeholderTextColor={colors.dark.text3}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Custom Status</Text>
            <View style={styles.statusRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiScroll}>
                {STATUS_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiBtn,
                      settings.customStatusEmoji === emoji && styles.emojiBtnActive,
                    ]}
                    onPress={() => {
                      updateField('customStatusEmoji', settings.customStatusEmoji === emoji ? '' : emoji);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TextInput
              style={[styles.fieldInput, { marginTop: spacing.xs }]}
              value={settings.customStatus}
              onChangeText={(v) => updateField('customStatus', v)}
              placeholder="Exploring Chiang Mai old city..."
              placeholderTextColor={colors.dark.text3}
              maxLength={60}
            />
            <Text style={styles.charCount}>{settings.customStatus.length}/60</Text>
          </View>
        </View>

        {/* TRAVEL STYLE */}
        <SectionHeader icon="compass" title="Travel Style" tint={colors.amber} />
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Pick up to 3</Text>
            <View style={styles.chipGrid}>
              {TRAVEL_STYLE_OPTIONS.map((style) => {
                const active = settings.travelStyle.includes(style);
                const atMax = settings.travelStyle.length >= 3 && !active;
                return (
                  <TouchableOpacity
                    key={style}
                    style={[
                      styles.chip,
                      active && styles.chipActiveAmber,
                      atMax && { opacity: 0.4 },
                    ]}
                    onPress={() => {
                      if (atMax) return;
                      const next = active
                        ? settings.travelStyle.filter((s) => s !== style)
                        : [...settings.travelStyle, style];
                      updateField('travelStyle', next);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                    disabled={atMax}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActiveAmber]}>{style}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* PROFILE PROMPTS */}
        <SectionHeader icon="message-circle" title="Profile Prompts" tint={colors.amber} />
        <Text style={styles.promptHint}>
          Pick up to 3 prompts and write your answers. Profiles with prompts get 3x more engagement.
        </Text>
        <View style={styles.card}>
          {([1, 2, 3] as const).map((slot) => {
            const qKey = `prompt${slot}Question` as keyof SettingsState;
            const aKey = `prompt${slot}Answer` as keyof SettingsState;
            const question = settings[qKey] as string;
            const answer = settings[aKey] as string;
            return (
              <React.Fragment key={slot}>
                {slot > 1 && <View style={styles.divider} />}
                <View style={styles.fieldGroup}>
                  <TouchableOpacity
                    style={styles.promptSelector}
                    onPress={() => {
                      setPromptPickerSlot(slot);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.promptQuestion, !question && { color: colors.dark.text3 }]}>
                      {question || `Tap to pick prompt ${slot}`}
                    </Text>
                    <Feather name="chevron-down" size={14} color={colors.dark.text3} />
                  </TouchableOpacity>
                  {question ? (
                    <>
                      <TextInput
                        style={[styles.fieldInput, { minHeight: 60, marginTop: spacing.xs }]}
                        value={answer}
                        onChangeText={(v) => updateField(aKey as any, v)}
                        placeholder="Write your answer..."
                        placeholderTextColor={colors.dark.text3}
                        multiline
                        maxLength={300}
                      />
                      <Text style={styles.charCount}>{answer.length}/300</Text>
                    </>
                  ) : null}
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* COUNTRIES VISITED */}
        <SectionHeader icon="globe" title="Countries Visited" />
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <View style={styles.countryInputRow}>
              <TextInput
                style={[styles.fieldInput, { flex: 1 }]}
                value={countryInput}
                onChangeText={setCountryInput}
                placeholder="Add a country..."
                placeholderTextColor={colors.dark.text3}
                onSubmitEditing={() => {
                  const trimmed = countryInput.trim();
                  if (trimmed && !settings.countriesVisited.includes(trimmed)) {
                    updateField('countriesVisited', [...settings.countriesVisited, trimmed]);
                    setCountryInput('');
                  }
                }}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addCountryBtn}
                onPress={() => {
                  const trimmed = countryInput.trim();
                  if (trimmed && !settings.countriesVisited.includes(trimmed)) {
                    updateField('countriesVisited', [...settings.countriesVisited, trimmed]);
                    setCountryInput('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={16} color={colors.teal} />
              </TouchableOpacity>
            </View>
            {settings.countriesVisited.length > 0 && (
              <View style={[styles.chipGrid, { marginTop: spacing.sm }]}>
                {settings.countriesVisited.map((country) => (
                  <TouchableOpacity
                    key={country}
                    style={[styles.chip, styles.chipActive]}
                    onPress={() => {
                      updateField('countriesVisited', settings.countriesVisited.filter((c) => c !== country));
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipTextActive}>{country}</Text>
                    <Feather name="x" size={10} color={colors.teal} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* TRAVEL PLANS */}
        <SectionHeader icon="navigation" title="Where are you going next?" tint={colors.amber} />
        <View style={styles.card}>
          {myPlans.length === 0 ? (
            <View style={styles.fieldGroup}>
              <Text style={styles.settingSublabel}>No travel plans yet. Add your next destination to find overlapping nomads!</Text>
            </View>
          ) : (
            myPlans.map((plan, idx) => (
              <React.Fragment key={plan.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.settingRow}>
                  <View style={[styles.settingIcon, { backgroundColor: 'rgba(232,128,58,0.12)' }]}>
                    <Feather name="map-pin" size={16} color={colors.amber} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingLabel}>{plan.city}, {plan.country}</Text>
                    <Text style={styles.settingSublabel}>
                      {new Date(plan.arrives_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {plan.departs_at
                        ? ` - ${new Date(plan.departs_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : ' onwards'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Alert.alert('Remove Plan', `Remove ${plan.city} from your travel plans?`, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () => removePlan(plan.id),
                        },
                      ]);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={16} color={colors.dark.text3} />
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            ))
          )}
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setPlanCity('');
              setPlanCountry('');
              setPlanArrival(new Date());
              setPlanDeparture(null);
              setHasDeparture(false);
              setShowAddPlan(true);
            }}
          >
            <View style={[styles.settingIcon, { backgroundColor: 'rgba(46,196,160,0.1)' }]}>
              <Feather name="plus" size={16} color={colors.teal} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.teal }]}>Add destination</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* PRIVACY & SAFETY */}
        <SectionHeader icon="shield" title="Privacy & Safety" />
        <View style={styles.card}>
          <SettingRow
            icon="eye"
            label="Profile Visibility"
            right={
              <SegmentedControl
                options={[
                  { label: 'Public', value: 'public' },
                  { label: 'Friends', value: 'connections' },
                  { label: 'Hidden', value: 'hidden' },
                ]}
                value={settings.profileVisibility}
                onSelect={(v) => {
                  updateField('profileVisibility', v as ProfileVisibility);
                  updatePreference('profile_visibility', v === 'hidden' ? 'private' : v as any);
                }}
              />
            }
          />
          <View style={styles.divider} />
          <ToggleRow
            icon="map-pin"
            label="Show on Map"
            sublabel="Let nearby nomads find you"
            value={settings.showLocationOnMap}
            storageKey="pref_show_location"
            settingKey="showLocationOnMap"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="crosshair"
            label="Location Precision"
            sublabel="How precisely your location is shared"
            right={
              <SegmentedControl
                options={[
                  { label: 'City only', value: 'city' },
                  { label: 'Exact', value: 'exact' },
                ]}
                value={settings.locationPrecision}
                onSelect={(v) => {
                  updateField('locationPrecision', v as 'city' | 'exact');
                  updatePreference('location_precision', v as any);
                }}
              />
            }
          />
          <View style={styles.divider} />
          <SettingRow
            icon="slash"
            label="Blocked Users"
            sublabel="Manage your block list"
            onPress={() => navigation.navigate('BlockedUsers' as never)}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="bar-chart-2"
            label="Analytics & Crash Reports"
            sublabel="Help improve x/pat with anonymous data"
            right={
              <Switch
                value={analyticsEnabled}
                onValueChange={(val) => {
                  setAnalyticsEnabled(val);
                  AsyncStorage.setItem('gdpr_accepted', val ? 'true' : 'declined');
                  if (val) {
                    initSentry();
                    optInPostHog();
                  } else {
                    optOutPostHog();
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: colors.dark.bg3, true: 'rgba(46,196,160,0.4)' }}
                thumbColor={analyticsEnabled ? colors.teal : colors.dark.text2}
                ios_backgroundColor={colors.dark.bg3}
              />
            }
          />
        </View>

        {/* NOTIFICATIONS */}
        <SectionHeader icon="bell" title="Notifications" />
        <View style={styles.card}>
          <SettingRow
            icon="bell"
            label="Push Notifications"
            sublabel="Enable device notifications"
            onPress={() => requestNotificationConsent(user?.id)}
          />
          <View style={styles.divider} />
          <ToggleRow icon="user-plus" label="New Connections" value={settings.notifyConnections} storageKey="pref_notify_connections" settingKey="notifyConnections" />
          <View style={styles.divider} />
          <ToggleRow icon="message-circle" label="Messages" value={settings.notifyMessages} storageKey="pref_notify_messages" settingKey="notifyMessages" />
          <View style={styles.divider} />
          <ToggleRow icon="users" label="Nearby Nomads" sublabel="When travelers arrive in your city" value={settings.notifyNearbyNomads} storageKey="pref_notify_nearby" settingKey="notifyNearbyNomads" />
          <View style={styles.divider} />
          <ToggleRow icon="calendar" label="Events" value={settings.notifyEvents} storageKey="pref_notify_events" settingKey="notifyEvents" />
          <View style={styles.divider} />
          <ToggleRow icon="moon" label="Quiet Hours" sublabel="Mute notifications at night" value={settings.quietHoursEnabled} storageKey="pref_quiet_hours" settingKey="quietHoursEnabled" />
          <View style={styles.divider} />
          <ToggleRow icon="at-sign" label="Email Notifications" value={settings.emailNotifications} storageKey="pref_email_notifications" settingKey="emailNotifications" />
        </View>

        {/* APP PREFERENCES */}
        <SectionHeader icon="sliders" title="App Preferences" />
        <View style={styles.card}>
          <SettingRow
            icon="navigation"
            label="Distance Unit"
            right={
              <SegmentedControl
                options={[
                  { label: 'km', value: 'km' },
                  { label: 'mi', value: 'mi' },
                ]}
                value={settings.distanceUnit}
                onSelect={(v) => {
                  updateField('distanceUnit', v as DistanceUnit);
                  updatePreference('distance_unit', v as any);
                }}
              />
            }
          />
          <View style={styles.divider} />
          <ToggleRow icon="image" label="Auto-Load Images" sublabel="Save data on slow connections" value={settings.autoLoadImages} storageKey="pref_auto_load_images" settingKey="autoLoadImages" />
          <View style={styles.divider} />
          <SettingRow
            icon="globe"
            label="Translate Language"
            sublabel="Tap-to-translate target language"
            right={
              <TouchableOpacity
                style={styles.langPicker}
                onPress={() => {
                  const currentIdx = LANGUAGES.findIndex((l) => l.code === preferences.preferred_language);
                  const nextIdx = (currentIdx + 1) % LANGUAGES.length;
                  const next = LANGUAGES[nextIdx];
                  updatePreference('preferred_language', next.code);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.langPickerText}>
                  {LANGUAGES.find((l) => l.code === preferences.preferred_language)?.flag || ''}{' '}
                  {LANGUAGES.find((l) => l.code === preferences.preferred_language)?.name || preferences.preferred_language}
                </Text>
                <Feather name="chevron-right" size={12} color={colors.dark.text3} />
              </TouchableOpacity>
            }
          />
        </View>

        {/* ACCOUNT */}
        <SectionHeader icon="settings" title="Account" tint={colors.dark.text2} />
        <View style={styles.card}>
          <SettingRow icon="mail" label="Email" sublabel={user?.email || 'Not set'} />
          <View style={styles.divider} />
          <SettingRow icon="key" label="Change Password" onPress={handleChangePassword} />
          <View style={styles.divider} />
          <SettingRow icon="download" label="Export My Data" sublabel="GDPR data export" onPress={handleExportData} />
          <View style={styles.divider} />
          <SettingRow icon="file-text" label="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
          <View style={styles.divider} />
          <SettingRow icon="file-text" label="Terms of Service" onPress={() => navigation.navigate('Terms')} />
        </View>

        {/* BETA FEEDBACK */}
        <View style={styles.card}>
          <SettingRow
            icon="message-square"
            label="Send Feedback"
            sublabel="Help us improve x/pat"
            onPress={() => setFeedbackVisible(true)}
          />
        </View>

        {/* DANGER ZONE */}
        <View style={[styles.card, { marginTop: spacing.lg, borderColor: 'rgba(255,107,107,0.15)' }]}>
          <SettingRow
            icon="log-out"
            label="Sign Out"
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              signOut();
            }}
            destructive
          />
          <View style={styles.divider} />
          <SettingRow icon="trash-2" label="Delete Account" sublabel="Permanent and irreversible" onPress={handleDeleteAccount} destructive />
        </View>

        <Text style={styles.version}>x/pat v{appVersion} beta</Text>
      </ScrollView>

      {/* Add Travel Plan Modal */}
      <Modal visible={showAddPlan} transparent animationType="slide">
        <View style={styles.travelModalOverlay}>
          <View style={styles.travelModalContent}>
            <View style={styles.travelModalHeader}>
              <Text style={styles.travelModalTitle}>Add Destination</Text>
              <TouchableOpacity onPress={() => setShowAddPlan(false)}>
                <Feather name="x" size={20} color={colors.dark.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.fieldInput}
                value={planCity}
                onChangeText={setPlanCity}
                placeholder="e.g. Bangkok"
                placeholderTextColor={colors.dark.text3}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Country</Text>
              <TextInput
                style={styles.fieldInput}
                value={planCountry}
                onChangeText={setPlanCountry}
                placeholder="e.g. Thailand"
                placeholderTextColor={colors.dark.text3}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Arrival Date</Text>
              <TouchableOpacity
                style={styles.fieldInput}
                onPress={() => setShowArrivalPicker(true)}
              >
                <Text style={{ color: colors.dark.text, fontFamily: fonts.body, fontSize: 14 }}>
                  {planArrival.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              {showArrivalPicker && (
                <DateTimePicker
                  value={planArrival}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  themeVariant="dark"
                  onChange={(_, date) => {
                    setShowArrivalPicker(Platform.OS === 'ios');
                    if (date) setPlanArrival(date);
                  }}
                />
              )}
            </View>

            <View style={styles.fieldGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                <Text style={styles.fieldLabel}>Departure Date</Text>
                <Switch
                  value={hasDeparture}
                  onValueChange={(v) => {
                    setHasDeparture(v);
                    if (v && !planDeparture) {
                      const dep = new Date(planArrival);
                      dep.setDate(dep.getDate() + 14);
                      setPlanDeparture(dep);
                    }
                  }}
                  trackColor={{ false: colors.dark.bg3, true: 'rgba(46,196,160,0.4)' }}
                  thumbColor={hasDeparture ? colors.teal : colors.dark.text2}
                  ios_backgroundColor={colors.dark.bg3}
                />
              </View>
              {hasDeparture && (
                <>
                  <TouchableOpacity
                    style={styles.fieldInput}
                    onPress={() => setShowDeparturePicker(true)}
                  >
                    <Text style={{ color: colors.dark.text, fontFamily: fonts.body, fontSize: 14 }}>
                      {planDeparture
                        ? planDeparture.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                  {showDeparturePicker && (
                    <DateTimePicker
                      value={planDeparture || planArrival}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      minimumDate={planArrival}
                      themeVariant="dark"
                      onChange={(_, date) => {
                        setShowDeparturePicker(Platform.OS === 'ios');
                        if (date) setPlanDeparture(date);
                      }}
                    />
                  )}
                </>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.travelModalSaveBtn,
                (!planCity.trim() || !planCountry.trim()) && { opacity: 0.4 },
              ]}
              disabled={!planCity.trim() || !planCountry.trim() || addingPlan}
              onPress={async () => {
                setAddingPlan(true);
                const arrStr = planArrival.toISOString().split('T')[0];
                const depStr = hasDeparture && planDeparture
                  ? planDeparture.toISOString().split('T')[0]
                  : null;
                const { error } = await addPlan(planCity.trim(), planCountry.trim(), arrStr, depStr);
                setAddingPlan(false);
                if (error) {
                  Alert.alert('Error', error.message);
                } else {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowAddPlan(false);
                }
              }}
            >
              {addingPlan ? (
                <ActivityIndicator size="small" color={colors.dark.bg} />
              ) : (
                <Text style={styles.travelModalSaveBtnText}>Add Destination</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Prompt Picker Modal */}
      <Modal
        visible={promptPickerSlot !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setPromptPickerSlot(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPromptPickerSlot(null)}>
          <Pressable style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Pick a Prompt</Text>
            <FlatList
              data={PROFILE_PROMPTS}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected =
                  (promptPickerSlot === 1 && settings.prompt1Question === item.question) ||
                  (promptPickerSlot === 2 && settings.prompt2Question === item.question) ||
                  (promptPickerSlot === 3 && settings.prompt3Question === item.question);
                return (
                  <TouchableOpacity
                    style={[styles.promptOption, isSelected && styles.promptOptionSelected]}
                    onPress={() => {
                      if (promptPickerSlot) {
                        const qKey = `prompt${promptPickerSlot}Question` as keyof SettingsState;
                        updateField(qKey as any, item.question);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setPromptPickerSlot(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.promptCategoryBadge}>
                      <Text style={styles.promptCategoryText}>{item.category}</Text>
                    </View>
                    <Text style={styles.promptOptionText}>{item.question}</Text>
                    {isSelected && <Feather name="check" size={16} color={colors.teal} />}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <FeedbackSheet
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
        screenContext="settings"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: fonts.heading, fontSize: 24, color: colors.dark.text },
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46,196,160,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(46,196,160,0.3)',
  },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.teal },
  scroll: { padding: spacing.lg },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 16, color: colors.dark.text },

  card: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.dark.border, marginLeft: 52 },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: 52,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(46,196,160,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  settingContent: { flex: 1 },
  settingLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.text },
  settingSublabel: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2, marginTop: 1 },

  fieldGroup: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  fieldInput: {
    backgroundColor: colors.dark.bg,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  charCount: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text3,
    textAlign: 'right',
    marginTop: 4,
  },

  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.dark.bg,
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  segment: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  segmentActive: { backgroundColor: colors.teal },
  segmentText: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2 },
  segmentTextActive: { color: colors.dark.bg, fontFamily: fonts.bodyBold },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.bg,
  },
  chipActive: {
    backgroundColor: 'rgba(46,196,160,0.15)',
    borderColor: colors.teal,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  chipTextActive: {
    color: colors.teal,
    fontFamily: fonts.bodyBold,
  },
  langPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dark.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  langPickerText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text,
  },

  // Amber chip variant for travel style
  chipActiveAmber: {
    backgroundColor: 'rgba(232,128,58,0.15)',
    borderColor: colors.amber,
  },
  chipTextActiveAmber: {
    color: colors.amber,
    fontFamily: fonts.bodyBold,
  },

  // Status row
  statusRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  emojiScroll: { flexGrow: 0 },
  emojiBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.bg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  emojiBtnActive: {
    borderColor: colors.teal,
    backgroundColor: 'rgba(46,196,160,0.12)',
  },
  emojiText: { fontSize: 18 },

  // Prompt hint
  promptHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    marginBottom: spacing.sm,
    lineHeight: 16,
  },

  // Prompt selector
  promptSelector: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: colors.dark.bg,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  promptQuestion: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.amber,
    flex: 1,
  },

  // Country input
  countryInputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  addCountryBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(46,196,160,0.12)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: 'rgba(46,196,160,0.3)',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end' as const,
  },
  modalContent: {
    backgroundColor: colors.dark.bg2,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '70%' as any,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.dark.bg4,
    alignSelf: 'center' as const,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
    marginBottom: spacing.md,
  },
  promptOption: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  promptOptionSelected: {
    backgroundColor: 'rgba(46,196,160,0.08)',
  },
  promptOptionText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    flex: 1,
  },
  promptCategoryBadge: {
    backgroundColor: colors.dark.bg3,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  promptCategoryText: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.dark.text2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },

  version: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
    textAlign: 'center',
    marginTop: spacing.xl,
  },

  // Add Travel Plan Modal
  travelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end' as const,
  },
  travelModalContent: {
    backgroundColor: colors.dark.bg2,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  travelModalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.lg,
  },
  travelModalTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    color: colors.dark.text,
  },
  travelModalSaveBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center' as const,
    marginTop: spacing.md,
  },
  travelModalSaveBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.bg,
  },
});
