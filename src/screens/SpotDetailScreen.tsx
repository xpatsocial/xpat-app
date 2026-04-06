import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Linking, Share, Platform, ActivityIndicator,
  KeyboardAvoidingView, Alert, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePostHog } from '../lib/posthog';
import { Spot, Profile } from '../types';
import CheckInButton from '../components/CheckInButton';
// AffiliateCard removed pre-launch — re-add when partner agreements signed
import SpotCard from '../components/SpotCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;

const CATEGORY_EMOJI: Record<string, string> = {
  cafe: '☕',
  eat: '🍽️',
  cowork: '💻',
  colive: '🏠',
  experience: '🎯',
  stay: '🛏️',
  other: '📌',
};

const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  cafe: ['#2C2C2E', '#3A2A1A'],
  eat: ['#2C2C2E', '#3A2A20'],
  cowork: ['#2C2C2E', '#1A2A2E'],
  colive: ['#2C2C2E', '#2A2A1A'],
  experience: ['#2C2C2E', '#2E1A2A'],
  stay: ['#2C2C2E', '#1A2A3A'],
  other: ['#2C2C2E', '#2A2A2A'],
};

interface SpotComment {
  id: number;
  user_id: string;
  spot_id: number;
  content: string;
  created_at: string;
  profiles?: Profile;
}

type RouteParams = {
  SpotDetail: { spot: Spot };
};

export default function SpotDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, 'SpotDetail'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const posthog = usePostHog();

  const { spot } = route.params;

  const [comments, setComments] = useState<SpotComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [similarSpots, setSimilarSpots] = useState<Spot[]>([]);
  const [votes, setVotes] = useState(spot.votes || 0);
  const [hasVoted, setHasVoted] = useState(false);
  const [saved, setSaved] = useState(false);

  // Track screen view
  useEffect(() => {
    posthog.capture('spot_detail_viewed', { spot_id: spot.id, spot_name: spot.name });
  }, []);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    const { data, error } = await supabase
      .from('spot_comments')
      .select('*, profiles(id, display_name, avatar_url)')
      .eq('spot_id', spot.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data as SpotComment[]);
    }
    setLoadingComments(false);
  }, [spot.id]);

  // Fetch similar spots
  const fetchSimilar = useCallback(async () => {
    const { data } = await supabase
      .from('spots')
      .select('*, profiles(display_name, avatar_url)')
      .eq('city', spot.city)
      .eq('category', spot.category)
      .neq('id', spot.id)
      .limit(3);

    if (data) setSimilarSpots(data as Spot[]);
  }, [spot.id, spot.city, spot.category]);

  // Check if user has voted / saved
  useEffect(() => {
    if (!user) return;

    supabase
      .from('spot_votes')
      .select('id')
      .eq('spot_id', spot.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHasVoted(true);
      });

    supabase
      .from('saved_spots')
      .select('id')
      .eq('spot_id', spot.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSaved(true);
      });
  }, [user, spot.id]);

  useEffect(() => {
    fetchComments();
    fetchSimilar();
  }, [fetchComments, fetchSimilar]);

  // -- Actions --

  async function handleUpvote() {
    if (!user || hasVoted) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error } = await supabase
      .from('spot_votes')
      .insert({ spot_id: spot.id, user_id: user.id });

    if (!error) {
      setHasVoted(true);
      setVotes((v) => v + 1);
      posthog.capture('spot_upvoted', { spot_id: spot.id });
    }
  }

  async function handleSave() {
    if (!user) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (saved) {
      await supabase
        .from('saved_spots')
        .delete()
        .eq('spot_id', spot.id)
        .eq('user_id', user.id);
      setSaved(false);
      posthog.capture('spot_unsaved', { spot_id: spot.id });
    } else {
      const { error } = await supabase
        .from('saved_spots')
        .insert({ spot_id: spot.id, user_id: user.id });
      if (!error) {
        setSaved(true);
        posthog.capture('spot_saved', { spot_id: spot.id });
      }
    }
  }

  async function handleShare() {
    posthog.capture('spot_shared', { spot_id: spot.id });
    await Share.share({
      message: `Check out ${spot.name} in ${spot.city}, ${spot.country} on x/pat!\n\nhttps://xpat.social/spot/${spot.id}?utm_source=share&utm_medium=app${user?.id ? `&ref=${user.id}` : ''}`,
      title: spot.name,
    });
  }

  function handleNavigate() {
    if (!spot.lat || !spot.lng) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${spot.lat},${spot.lng}`,
      android: `google.navigation:q=${spot.lat},${spot.lng}`,
      default: `https://maps.apple.com/?daddr=${spot.lat},${spot.lng}`,
    });
    Linking.openURL(url);
    posthog.capture('spot_navigate', { spot_id: spot.id });
  }

  async function handlePostComment() {
    const text = commentText.trim();
    if (!text || !user || postingComment) return;

    setPostingComment(true);
    const { error } = await supabase
      .from('spot_comments')
      .insert({ spot_id: spot.id, user_id: user.id, content: text });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCommentText('');
      fetchComments();
      posthog.capture('spot_comment_added', { spot_id: spot.id });
    }
    setPostingComment(false);
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }

  const gradient = CATEGORY_GRADIENTS[spot.category] || CATEGORY_GRADIENTS.other;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top}
      >
        {/* Back button overlay */}
        <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={20} color={colors.dark.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={handleShare}>
            <Feather name="share-2" size={18} color={colors.dark.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero */}
          {spot.photo_url ? (
            <Image source={{ uri: spot.photo_url }} style={styles.hero} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          ) : (
            <LinearGradient colors={gradient} style={styles.hero}>
              <Text style={styles.heroEmoji}>{CATEGORY_EMOJI[spot.category] || '📌'}</Text>
            </LinearGradient>
          )}

          <View style={styles.content}>
            {/* Title + Category */}
            <View style={styles.titleSection}>
              <Text style={styles.name}>{spot.name}</Text>
              <View style={styles.metaRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryEmoji}>
                    {CATEGORY_EMOJI[spot.category] || '📌'}
                  </Text>
                  <Text style={styles.categoryText}>{spot.category}</Text>
                </View>
                <Text style={styles.dot}>·</Text>
                <Feather name="map-pin" size={11} color={colors.amber} />
                <Text style={styles.locationText}>
                  {spot.city}, {spot.country}
                </Text>
              </View>
            </View>

            {/* Vote bar */}
            <View style={styles.voteBar}>
              <TouchableOpacity
                style={[styles.voteBtn, hasVoted && styles.voteBtnActive]}
                onPress={handleUpvote}
                disabled={hasVoted}
                activeOpacity={0.7}
              >
                <Feather
                  name="arrow-up"
                  size={18}
                  color={hasVoted ? colors.dark.bg : colors.teal}
                />
                <Text style={[styles.voteCount, hasVoted && styles.voteCountActive]}>
                  {votes}
                </Text>
              </TouchableOpacity>
              <Text style={styles.voteLabel}>
                {votes === 1 ? 'upvote' : 'upvotes'}
              </Text>
            </View>

            {/* Author */}
            {spot.profiles?.display_name && (
              <View style={styles.authorSection}>
                <View style={styles.authorAvatar}>
                  {spot.profiles.avatar_url ? (
                    <Image
                      source={{ uri: spot.profiles.avatar_url }}
                      style={styles.authorAvatarImg}
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Text style={styles.authorAvatarText}>
                      {spot.profiles.display_name[0]?.toUpperCase() ?? '?'}
                    </Text>
                  )}
                </View>
                <View>
                  <Text style={styles.authorLabel}>Shared by</Text>
                  <Text style={styles.authorName}>{spot.profiles.display_name}</Text>
                </View>
              </View>
            )}

            {/* Note / Description */}
            {(spot.note || spot.description) && (
              <View style={styles.noteSection}>
                <Feather name="message-circle" size={14} color={colors.teal} />
                <Text style={styles.noteText}>
                  {spot.description || spot.note}
                </Text>
              </View>
            )}

            {/* Tags */}
            {spot.tags && spot.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {spot.tags.map((tag, i) => (
                  <View key={i} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[styles.actionBtn, saved && styles.actionBtnActive]}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Feather
                  name={saved ? 'bookmark' : 'bookmark'}
                  size={18}
                  color={saved ? colors.dark.bg : colors.teal}
                />
                <Text style={[styles.actionLabel, saved && styles.actionLabelActive]}>
                  {saved ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>

              <CheckInButton
                spotId={spot.id}
                spotName={spot.name}
                userId={user?.id}
                onCheckIn={() => {}}
              />

              <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
                <Feather name="share-2" size={18} color={colors.dark.text2} />
                <Text style={styles.actionLabel}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} onPress={handleNavigate} activeOpacity={0.7}>
                <Feather name="navigation" size={18} color={colors.dark.text2} />
                <Text style={styles.actionLabel}>Navigate</Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Comments */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Comments{comments.length > 0 ? ` (${comments.length})` : ''}
              </Text>

              {loadingComments ? (
                <ActivityIndicator color={colors.teal} style={{ marginVertical: spacing.md }} />
              ) : comments.length === 0 ? (
                <View style={styles.emptyComments}>
                  <Feather name="message-square" size={24} color={colors.dark.bg3} />
                  <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
                </View>
              ) : (
                comments.map((c) => (
                  <View key={c.id} style={styles.commentRow}>
                    <View style={styles.commentAvatar}>
                      {c.profiles?.avatar_url ? (
                        <Image
                          source={{ uri: c.profiles.avatar_url }}
                          style={styles.commentAvatarImg}
                          transition={200}
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <Text style={styles.commentAvatarText}>
                          {c.profiles?.display_name?.[0]?.toUpperCase() ?? '?'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.commentBody}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentAuthor}>
                          {c.profiles?.display_name || 'Anonymous'}
                        </Text>
                        <Text style={styles.commentTime}>{timeAgo(c.created_at)}</Text>
                      </View>
                      <Text style={styles.commentContent}>{c.content}</Text>
                    </View>
                  </View>
                ))
              )}

              {/* Add comment */}
              {user && (
                <View style={styles.addComment}>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.dark.text2}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendBtn,
                      (!commentText.trim() || postingComment) && styles.sendBtnDisabled,
                    ]}
                    onPress={handlePostComment}
                    disabled={!commentText.trim() || postingComment}
                  >
                    {postingComment ? (
                      <ActivityIndicator size="small" color={colors.dark.bg} />
                    ) : (
                      <Feather name="send" size={16} color={colors.dark.bg} />
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Divider */}
            {similarSpots.length > 0 && <View style={styles.divider} />}

            {/* Similar Spots */}
            {similarSpots.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Similar Spots</Text>
                <Text style={styles.sectionSubtitle}>
                  More {spot.category} spots in {spot.city}
                </Text>
                {similarSpots.map((s) => (
                  <SpotCard
                    key={s.id}
                    spot={s}
                    onPress={() =>
                      (navigation as any).navigate('SpotDetail', { spot: s })
                    }
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.bg,
  },
  topBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(28,28,30,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  scroll: {
    flex: 1,
  },
  hero: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 64,
    opacity: 0.4,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
  },

  // Title
  titleSection: {
    marginBottom: spacing.md,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark.bg3,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
    gap: 4,
  },
  categoryEmoji: { fontSize: 12 },
  categoryText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dot: { color: colors.dark.text2, fontSize: 12 },
  locationText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.amber,
  },

  // Vote bar
  voteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  voteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.teal,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
  },
  voteBtnActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  voteCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.teal,
  },
  voteCountActive: {
    color: colors.dark.bg,
  },
  voteLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
  },

  // Author
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  authorAvatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  authorAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.dark.bg,
  },
  authorLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  authorName: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.dark.text,
  },

  // Note
  noteSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: 'rgba(46,196,160,0.08)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 0.5,
    borderColor: 'rgba(46,196,160,0.15)',
  },
  noteText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    lineHeight: 20,
    flex: 1,
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tag: {
    backgroundColor: colors.dark.bg3,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
  },
  tagText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },

  // Action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dark.bg2,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
    minWidth: 68,
  },
  actionBtnActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  actionLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionLabelActive: {
    color: colors.dark.bg,
  },

  // Divider
  divider: {
    height: 0.5,
    backgroundColor: colors.dark.border,
    marginVertical: spacing.lg,
  },

  // Section
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.dark.text,
  },
  sectionSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text2,
    marginBottom: spacing.xs,
  },

  // Comments
  emptyComments: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text2,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.dark.bg3,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.dark.bg3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  commentAvatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  commentAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.dark.text2,
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  commentAuthor: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.dark.text,
  },
  commentTime: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.dark.text2,
  },
  commentContent: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    lineHeight: 18,
  },
  addComment: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    borderWidth: 0.5,
    borderColor: colors.dark.border,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  commentInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    paddingVertical: spacing.sm,
    maxHeight: 80,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.dark.bg3,
  },
});
