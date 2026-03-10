import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, Switch, ActivityIndicator, Share,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { colors, fonts, spacing, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

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
  profileVisibility: ProfileVisibility;
  showLocationOnMap: boolean;
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
  profileVisibility: 'public',
  showLocationOnMap: true,
  notifyConnections: true,
  notifyMessages: true,
  notifyNearbyNomads: true,
  notifyEvents: true,
  quietHoursEnabled: false,
  emailNotifications: true,
  distanceUnit: 'km',
  autoLoadImages: true,
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, profile, signOut } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setSettings((prev) => ({
        ...prev,
        displayName: profile.display_name || '',
        username: profile.username || '',
        bio: profile.bio || '',
        currentCity: profile.current_city || '',
        homeCity: profile.home_city || '',
      }));
    }
    AsyncStorage.multiGet([
      'pref_distance_unit',
      'pref_auto_load_images',
      'pref_profile_visibility',
      'pref_show_location',
      'pref_notify_connections',
      'pref_notify_messages',
      'pref_notify_nearby',
      'pref_notify_events',
      'pref_quiet_hours',
      'pref_email_notifications',
    ]).then((entries) => {
      const map = Object.fromEntries(entries.filter(([, v]) => v !== null));
      setSettings((prev) => ({
        ...prev,
        distanceUnit: (map['pref_distance_unit'] as DistanceUnit) || prev.distanceUnit,
        autoLoadImages: map['pref_auto_load_images'] !== 'false',
        profileVisibility:
          (map['pref_profile_visibility'] as ProfileVisibility) || prev.profileVisibility,
        showLocationOnMap: map['pref_show_location'] !== 'false',
        notifyConnections: map['pref_notify_connections'] !== 'false',
        notifyMessages: map['pref_notify_messages'] !== 'false',
        notifyNearbyNomads: map['pref_notify_nearby'] !== 'false',
        notifyEvents: map['pref_notify_events'] !== 'false',
        quietHoursEnabled: map['pref_quiet_hours'] === 'true',
        emailNotifications: map['pref_email_notifications'] !== 'false',
      }));
    });
  }, [profile]);

  const updateField = useCallback(
    <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setHasChanges(true);
    },
    [],
  );

  const toggleSwitch = useCallback((key: keyof SettingsState, storageKey: string) => {
    setSettings((prev) => {
      const newVal = !prev[key];
      AsyncStorage.setItem(storageKey, String(newVal));
      return { ...prev, [key]: newVal };
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: settings.displayName.trim(),
        username: settings.username.trim() || null,
        bio: settings.bio.trim() || null,
        current_city: settings.currentCity.trim() || null,
        home_city: settings.homeCity.trim() || null,
      })
      .eq('id', user.id);

    await AsyncStorage.multiSet([
      ['pref_distance_unit', settings.distanceUnit],
      ['pref_auto_load_images', String(settings.autoLoadImages)],
      ['pref_profile_visibility', settings.profileVisibility],
      ['pref_show_location', String(settings.showLocationOnMap)],
      ['pref_notify_connections', String(settings.notifyConnections)],
      ['pref_notify_messages', String(settings.notifyMessages)],
      ['pref_notify_nearby', String(settings.notifyNearbyNomads)],
      ['pref_notify_events', String(settings.notifyEvents)],
      ['pref_quiet_hours', String(settings.quietHoursEnabled)],
      ['pref_email_notifications', String(settings.emailNotifications)],
    ]);

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
        const { data: spots } = await supabase
          .from('spots')
          .select('*')
          .eq('created_by', user.id);
        const { data: posts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id);
        if (spots) exportData.spots = spots;
        if (posts) exportData.posts = posts;
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
              'You have been signed out. Email alex@xpat.social to complete deletion.',
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
                  AsyncStorage.setItem('pref_profile_visibility', v);
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
            icon="slash"
            label="Blocked Users"
            sublabel="Manage your block list"
            onPress={() => Alert.alert('Blocked Users', 'No blocked users yet.')}
          />
        </View>

        {/* NOTIFICATIONS */}
        <SectionHeader icon="bell" title="Notifications" />
        <View style={styles.card}>
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
                  AsyncStorage.setItem('pref_distance_unit', v);
                }}
              />
            }
          />
          <View style={styles.divider} />
          <ToggleRow icon="image" label="Auto-Load Images" sublabel="Save data on slow connections" value={settings.autoLoadImages} storageKey="pref_auto_load_images" settingKey="autoLoadImages" />
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

  version: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text3,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
