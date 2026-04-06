import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePostHog } from '../lib/posthog';
import { SpotCategory } from '../types';
import { checkTextSafety } from '../lib/contentModeration';
import { getRateLimitError } from '../lib/rateLimiter';

const CATEGORIES: { key: SpotCategory; label: string; emoji: string }[] = [
  { key: 'cafe', label: 'Cafe', emoji: '☕' },
  { key: 'eat', label: 'Eat', emoji: '🍽️' },
  { key: 'cowork', label: 'Cowork', emoji: '💻' },
  { key: 'colive', label: 'Colive', emoji: '🏠' },
  { key: 'experience', label: 'Experience', emoji: '🎯' },
  { key: 'stay', label: 'Stay', emoji: '🛏️' },
  { key: 'other', label: 'Other', emoji: '📌' },
];

const mapDarkStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1C1C1E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1C1C1E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5a5a5e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#2C2C2E' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2C2C2E' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

export default function AddSpotScreen({ navigation }: any) {
  const { user } = useAuth();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [category, setCategory] = useState<SpotCategory>('cafe');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationGranted, setLocationGranted] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationLoading(false);
          setLocationGranted(false);
          return;
        }
        setLocationGranted(true);
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
      } catch {
        setLocationGranted(false);
      } finally {
        setLocationLoading(false);
      }
    })();
  }, []);

  async function handlePickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });

    if (!result.canceled && result.assets.length > 0) {
      const pickedUri = result.assets[0].uri;
      const manipulated = await ImageManipulator.manipulateAsync(
        pickedUri,
        [{ resize: { width: 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      setPhotoUri(manipulated.uri);
    }
  }

  function handleCategorySelect(key: SpotCategory) {
    setCategory(key);
    Haptics.selectionAsync();
  }

  function handleMarkerDragEnd(e: any) {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setLat(latitude);
    setLng(longitude);
  }

  async function handleSubmit() {
    if (!user) return;
    if (!name.trim() || !city.trim() || !country.trim()) {
      Alert.alert('Missing fields', 'Name, city, and country are required.');
      return;
    }

    const rateLimitMsg = getRateLimitError('spot');
    if (rateLimitMsg) {
      Alert.alert('Slow down', rateLimitMsg);
      return;
    }

    // Check name and note for content safety
    const nameSafety = await checkTextSafety(name.trim());
    if (!nameSafety.safe) {
      Alert.alert('Spot not shared', nameSafety.reason ?? 'Name flagged by moderation.');
      return;
    }
    if (note.trim()) {
      const noteSafety = await checkTextSafety(note.trim());
      if (!noteSafety.safe) {
        Alert.alert('Spot not shared', noteSafety.reason ?? 'Note flagged by moderation.');
        return;
      }
    }

    setLoading(true);

    let uploadedPhotoUrl: string | null = null;
    if (photoUri) {
      try {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const response = await fetch(photoUri);
        const blob = await response.blob();

        if (blob.size > 5 * 1024 * 1024) {
          Alert.alert('Photo too large', 'Image must be under 5 MB. Please choose a smaller photo.');
          setLoading(false);
          return;
        }

        const { error: uploadError } = await supabase.storage
          .from('spot-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg' });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('spot-photos')
            .getPublicUrl(fileName);
          uploadedPhotoUrl = urlData.publicUrl;
        }
      } catch {
        // Photo upload failed silently — spot still saves without photo
      }
    }

    const { data: newSpot, error } = await supabase.from('spots').insert({
      name: name.trim(),
      city: city.trim(),
      country: country.trim(),
      category,
      note: note.trim() || null,
      photo_url: uploadedPhotoUrl,
      created_by: user.id,
      lat,
      lng,
    }).select('id').single();

    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      posthog.capture('spot_created', { category, city: city.trim(), country: country.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Moderate spot name/note and award XP (fire-and-forget)
      if (newSpot?.id) {
        const moderationText = [name.trim(), note.trim()].filter(Boolean).join(' ');
        supabase.functions.invoke('moderate-content', {
          body: {
            content_type: 'spot',
            content_id: String(newSpot.id),
            text: moderationText,
            user_id: user.id,
          },
        }).catch(() => {});

        supabase.functions.invoke('award-xp', {
          body: { reason: 'spot_added', reference_id: String(newSpot.id) },
        }).catch(() => {});
      }

      Alert.alert('Spot added! +25 XP', `${name} has been shared with the community.`);
      navigation.goBack();
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Share a Spot</Text>
        <Text style={styles.subtitle}>Help nomads discover great places</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dojo Bali"
          placeholderTextColor={colors.dark.text2}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Canggu"
          placeholderTextColor={colors.dark.text2}
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.label}>Country</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Indonesia"
          placeholderTextColor={colors.dark.text2}
          value={country}
          onChangeText={setCountry}
        />

        {/* Location Map */}
        <Text style={styles.label}>Location</Text>
        {locationLoading ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator color={colors.teal} />
            <Text style={styles.mapPlaceholderText}>Detecting location...</Text>
          </View>
        ) : locationGranted && (lat !== 0 || lng !== 0) ? (
          <View>
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={Platform.OS === 'android' ? 'google' : undefined}
                userInterfaceStyle="dark"
                customMapStyle={Platform.OS === 'android' ? mapDarkStyle : undefined}
                initialRegion={{
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{ latitude: lat, longitude: lng }}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                />
              </MapView>
            </View>
            <Text style={styles.coordText}>
              Location: {lat.toFixed(5)}, {lng.toFixed(5)}
            </Text>
            <Text style={styles.coordHint}>Drag the pin to adjust</Text>
          </View>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>
              Location permission not granted. Enter city & country above.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.catPill, category === cat.key && styles.catActive]}
              onPress={() => handleCategorySelect(cat.key)}
            >
              <Text style={styles.catEmoji}>{cat.emoji}</Text>
              <Text style={[styles.catText, category === cat.key && styles.catTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Photo Upload */}
        <Text style={styles.label}>Photo (optional)</Text>
        {photoUri ? (
          <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            <Text style={styles.photoChangeHint}>Tap to change</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.photoButton} onPress={handlePickPhoto}>
            <Text style={styles.photoButtonIcon}>+</Text>
            <Text style={styles.photoButtonText}>Add a photo</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="What makes this place great?"
          placeholderTextColor={colors.dark.text2}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.dark.bg} />
          ) : (
            <Text style={styles.submitText}>Share Spot</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  scroll: { padding: spacing.lg, paddingTop: 60, paddingBottom: 100 },
  title: { fontFamily: fonts.heading, fontSize: 28, color: colors.dark.text, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2, marginBottom: spacing.xl },
  label: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.dark.text, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  input: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  textArea: { minHeight: 80 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dark.bg2,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  catActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  catEmoji: { fontSize: 14 },
  catText: { fontFamily: fonts.body, fontSize: 11, color: colors.dark.text2 },
  catTextActive: { color: colors.dark.bg },
  // Map
  mapContainer: {
    height: 200,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: spacing.xs,
  },
  map: { flex: 1 },
  mapPlaceholder: {
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.dark.bg2,
    borderWidth: 1,
    borderColor: colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mapPlaceholderText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  coordText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    marginBottom: 2,
  },
  coordHint: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    opacity: 0.6,
    marginBottom: spacing.md,
  },
  // Photo
  photoButton: {
    height: 120,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photoButtonIcon: {
    fontSize: 28,
    color: colors.dark.text2,
    marginBottom: spacing.xs,
  },
  photoButtonText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },
  photoPreview: {
    height: 200,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.dark.bg2,
  },
  photoChangeHint: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    opacity: 0.6,
    marginBottom: spacing.md,
  },
  // Submit
  submitBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.6 },
  submitText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.dark.bg },
});
