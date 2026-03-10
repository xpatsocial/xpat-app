import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, fonts, spacing, radius } from '../theme';
import { NeighborhoodTag, SAFETY_TAGS, VIBE_TAGS } from '../types';

interface NeighborhoodPulseSheetProps {
  visible: boolean;
  coordinate: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onSubmit: (tags: NeighborhoodTag[], neighborhoodName: string) => void;
}

const SHEET_HEIGHT = 420;
const DISMISS_THRESHOLD = 80;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

const TAG_ICONS: Partial<Record<NeighborhoodTag, string>> = {
  'feels safe': 'shield',
  'stay alert': 'alert-triangle',
  'avoid at night': 'moon',
  'well-lit': 'sun',
  'tourist-friendly': 'globe',
  'nightlife': 'music',
  'quiet residential': 'home',
  'artsy': 'pen-tool',
  'foodie heaven': 'coffee',
  'walkable': 'map',
  'local feel': 'heart',
  'coworking-friendly': 'wifi',
  'beach vibes': 'sunrise',
  'nature/countryside': 'feather',
  'touristy': 'camera',
  'family-friendly': 'users',
  'expat hub': 'compass',
};

export default function NeighborhoodPulseSheet({
  visible, coordinate, onClose, onSubmit,
}: NeighborhoodPulseSheetProps) {
  const translateY = useSharedValue(SHEET_HEIGHT);
  const context = useSharedValue(0);
  const [selectedTags, setSelectedTags] = useState<NeighborhoodTag[]>([]);

  useEffect(() => {
    if (visible) {
      setSelectedTags([]);
      translateY.value = withSpring(0, SPRING_CONFIG);
    } else {
      translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
    }
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((e) => {
      const newY = context.value + e.translationY;
      translateY.value = Math.max(0, newY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > 500) {
        translateY.value = withTiming(SHEET_HEIGHT, { duration: 200 });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  function toggleTag(tag: NeighborhoodTag) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSubmit() {
    if (selectedTags.length === 0) return;
    onSubmit(selectedTags, '');
  }

  if (!visible || !coordinate) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, sheetStyle]}>
        <BlurView tint="dark" intensity={90} style={styles.blur}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Rate this neighborhood</Text>
              <Text style={styles.subtitle}>
                {coordinate.latitude.toFixed(4)}, {coordinate.longitude.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Feather name="x" size={18} color={colors.dark.text2} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.sectionLabel}>
              <Feather name="shield" size={11} color={colors.teal} /> Safety
            </Text>
            <View style={styles.tagGrid}>
              {SAFETY_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                const isCaution = tag === 'stay alert' || tag === 'avoid at night';
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tag,
                      active && {
                        backgroundColor: isCaution
                          ? 'rgba(232,128,58,0.15)'
                          : 'rgba(46,196,160,0.15)',
                        borderColor: isCaution
                          ? 'rgba(232,128,58,0.4)'
                          : 'rgba(46,196,160,0.4)',
                      },
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Feather
                      name={(TAG_ICONS[tag] || 'tag') as any}
                      size={12}
                      color={
                        active
                          ? isCaution
                            ? colors.amber
                            : colors.teal
                          : colors.dark.text2
                      }
                    />
                    <Text
                      style={[
                        styles.tagText,
                        active && {
                          color: isCaution ? colors.amber : colors.teal,
                        },
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
              <Feather name="zap" size={11} color={colors.amber} /> Vibes
            </Text>
            <View style={styles.tagGrid}>
              {VIBE_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.tag,
                      active && {
                        backgroundColor: 'rgba(232,128,58,0.15)',
                        borderColor: 'rgba(232,128,58,0.4)',
                      },
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Feather
                      name={(TAG_ICONS[tag] || 'tag') as any}
                      size={12}
                      color={active ? colors.amber : colors.dark.text2}
                    />
                    <Text
                      style={[
                        styles.tagText,
                        active && { color: colors.amber },
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              selectedTags.length === 0 && styles.submitBtnDisabled,
            ]}
            onPress={handleSubmit}
            disabled={selectedTags.length === 0}
          >
            <Feather name="check" size={16} color={colors.dark.bg} />
            <Text style={styles.submitText}>
              Share pulse{selectedTags.length > 0 ? ` (${selectedTags.length})` : ''}
            </Text>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
  },
  blur: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    padding: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 0.5,
    borderColor: colors.dark.border,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.dark.bg3,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    marginTop: 2,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center', justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.dark.bg2,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.teal,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    backgroundColor: colors.dark.bg3,
  },
  submitText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.dark.bg,
  },
});
