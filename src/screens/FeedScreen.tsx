import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput, Alert, Share,
} from 'react-native';
import { Image } from 'expo-image';
import { FlashList } from '@shopify/flash-list';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { colors, fonts, spacing, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Post, Comment } from '../types';

import ReportModal from '../components/ReportModal';
import Skeleton from '../components/Skeleton';
import ForYouSection from '../components/ForYouSection';
import { usePostHog } from '../lib/posthog';
import { trackScreenTime } from '../lib/analytics';
import { formatTimeAgo } from '../utils/formatTime';
import { checkTextSafety } from '../lib/contentModeration';
import { getRateLimitError } from '../lib/rateLimiter';
import ContextMenu, { ContextMenuItem } from '../components/ContextMenu';
import CelebrationOverlay, { CelebrationOverlayRef } from '../components/CelebrationOverlay';
import { Toast } from '../components/ToastNotification';

export default function FeedScreen({ navigation, hideHeader }: { navigation?: any; hideHeader?: boolean }) {
  const { user, session, profile } = useAuth();
  const fallbackNav = useNavigation<any>();
  const nav = navigation || fallbackNav;
  const insets = useSafeAreaInsets();
  const posthog = usePostHog();
  const composerRef = useRef<TextInput>(null);
  const celebrationRef = useRef<CelebrationOverlayRef>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [commentTexts, setCommentTexts] = useState<Record<number, string>>({});
  const [commentsData, setCommentsData] = useState<Record<number, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Set<number>>(new Set());
  const [postingComment, setPostingComment] = useState<Set<number>>(new Set());
  const [reportTarget, setReportTarget] = useState<{ id: number; visible: boolean }>({ id: 0, visible: false });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!session) return;
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(display_name, avatar_url), spots(name, city), post_likes(user_id), comments(count)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) setPosts(data);
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useEffect(() => {
    if (session) fetchPosts();
  }, [fetchPosts, session]);

  // Track time spent on Feed screen
  useEffect(() => trackScreenTime('Feed'), []);

  // ---------- Auth gate ----------
  if (!session) {
    return (
      <View style={styles.container}>
        {!hideHeader && (
          <View style={[styles.feedHeader, { paddingTop: insets.top }]}>
            <Text style={styles.feedWordmark}>
              <Text style={{ color: colors.amber }}>x</Text>
              <Text style={{ color: colors.teal }}>/</Text>
              <Text style={{ color: colors.dark.text }}>pat</Text>
            </Text>
            <TouchableOpacity
              style={styles.searchUserBtn}
              onPress={() => nav.navigate('NomadDiscovery')}
            >
              <Feather name="search" size={20} color={colors.dark.text2} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.authGate}>
          <View style={styles.authGateIconCircle}>
            <Feather name="message-circle" size={40} color={colors.teal} />
          </View>
          <Text style={styles.authGateBrand}>
            <Text style={styles.authGateX}>x</Text>
            <Text style={styles.authGateSlash}>/</Text>
            <Text style={styles.authGatePat}>pat</Text>
          </Text>
          <Text style={styles.authGateTitle}>See what nomads are sharing</Text>
          <Text style={styles.authGateSubtitle}>
            Sign in to read posts, share your experiences, and connect with the global nomad community.
          </Text>
          <TouchableOpacity
            style={styles.authGateBtn}
            onPress={() => nav.navigate('Auth')}
            activeOpacity={0.8}
          >
            <Text style={styles.authGateBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to add images to posts.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Image picker error', err.message || 'Failed to open photo library.');
    }
  }

  async function handlePost() {
    if (!newPost.trim() || !user) return;

    const rateLimitMsg = getRateLimitError('post');
    if (rateLimitMsg) {
      Alert.alert('Slow down', rateLimitMsg);
      return;
    }

    const safety = await checkTextSafety(newPost.trim());
    if (!safety.safe) {
      Alert.alert('Post not shared', safety.reason ?? 'Content flagged by moderation.');
      return;
    }

    setPosting(true);

    let photo_url: string | null = null;
    if (selectedImage) {
      try {
        setUploading(true);
        const manipulated = await ImageManipulator.manipulateAsync(
          selectedImage,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );

        const filePath = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('post-photos')
          .upload(filePath, decode(manipulated.base64!), { contentType: 'image/jpeg', upsert: false });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('post-photos')
            .getPublicUrl(filePath);
          photo_url = urlData.publicUrl;
        } else {
          Alert.alert('Upload failed', uploadError.message);
          setPosting(false);
          setUploading(false);
          return;
        }
      } catch (err: any) {
        Alert.alert('Upload error', err.message || 'Failed to upload photo.');
        setPosting(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const insertData: any = {
      user_id: user?.id,
      content: newPost.trim(),
    };
    if (photo_url) insertData.photo_url = photo_url;

    const { data: insertedPost, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      posthog.capture('post_created', { has_spot: false, has_photo: !!photo_url });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewPost('');
      setSelectedImage(null);
      fetchPosts();

      // Celebration: confetti on first post creation
      celebrationRef.current?.confetti();
      Toast.show({ type: 'success', title: 'Post shared!', message: 'Your post is now live.' });

      // Fire-and-forget: moderate content + award XP (non-blocking)
      if (insertedPost?.id && user?.id) {
        supabase.functions.invoke('moderate-content', {
          body: {
            content_type: 'post',
            content_id: String(insertedPost.id),
            text: insertData.content,
            user_id: user.id,
          },
        }).catch(() => {});

        supabase.functions.invoke('award-xp', {
          body: { reason: 'post_created', reference_id: String(insertedPost.id) },
        }).catch(() => {});
      }
    }
    setPosting(false);
  }

  function isLikedByUser(item: Post): boolean {
    if (!user || !item.post_likes) return false;
    return item.post_likes.some((like) => like.user_id === user.id);
  }

  function getLikeCount(item: Post): number {
    return item.post_likes?.length ?? 0;
  }

  function getCommentCount(item: Post): number {
    if (!item.comments || item.comments.length === 0) return 0;
    return (item.comments[0] as any)?.count ?? item.comments.length;
  }

  async function handleLike(item: Post) {
    if (!user) return;
    const liked = isLikedByUser(item);

    if (!liked) {
      const rateLimitMsg = getRateLimitError('like');
      if (rateLimitMsg) return; // Silent — don't alert for likes
    }

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== item.id) return p;
        const updatedLikes = liked
          ? (p.post_likes || []).filter((l) => l.user_id !== user.id)
          : [...(p.post_likes || []), { user_id: user.id }];
        return { ...p, post_likes: updatedLikes };
      })
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (liked) {
      await supabase
        .from('post_likes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', item.id);
    } else {
      await supabase
        .from('post_likes')
        .insert({ user_id: user.id, post_id: item.id });

      // Milestone like celebrations (10, 50, 100)
      const newCount = (item.post_likes?.length ?? 0) + 1;
      if (newCount === 10 || newCount === 50 || newCount === 100) {
        celebrationRef.current?.pulse();
      }
    }
  }

  async function fetchComments(postId: number) {
    setLoadingComments((prev) => new Set(prev).add(postId));
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(display_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setCommentsData((prev) => ({ ...prev, [postId]: data }));
    }
    setLoadingComments((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
  }

  function toggleComments(postId: number) {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
        if (!commentsData[postId]) fetchComments(postId);
      }
      return next;
    });
  }

  async function handleComment(postId: number) {
    const text = commentTexts[postId]?.trim();
    if (!text || !user) return;

    const rateLimitMsg = getRateLimitError('comment');
    if (rateLimitMsg) {
      Alert.alert('Slow down', rateLimitMsg);
      return;
    }

    const safety = await checkTextSafety(text);
    if (!safety.safe) {
      Alert.alert('Comment not posted', safety.reason ?? 'Content flagged by moderation.');
      return;
    }

    setPostingComment((prev) => new Set(prev).add(postId));

    const { error } = await supabase
      .from('comments')
      .insert({ user_id: user.id, post_id: postId, content: text });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      posthog.capture('comment_created', { post_id: postId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCommentTexts((prev) => ({ ...prev, [postId]: '' }));
      fetchComments(postId);
      // Update comment count optimistically
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const currentCount = getCommentCount(p);
          return { ...p, comments: [{ count: currentCount + 1 }] };
        })
      );
    }

    setPostingComment((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });
  }

  function handleReport(item: Post) {
    setReportTarget({ id: item.id, visible: true });
  }

  function handleDeletePost(item: Post) {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('posts').delete().eq('id', item.id);
            setPosts(prev => prev.filter(p => p.id !== item.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }

  async function submitReport(reason: string) {
    if (!user) return;
    const rateLimitMsg = getRateLimitError('report');
    if (rateLimitMsg) {
      Alert.alert('Slow down', rateLimitMsg);
      return;
    }
    await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: 'post',
      target_id: String(reportTarget.id),
      reason,
    });
    setReportTarget({ id: 0, visible: false });
    Alert.alert('Reported', 'Thanks for reporting. We\'ll review this post.');
  }

  async function handleShare(item: Post) {
    try {
      const authorName = item.profiles?.display_name || 'Someone';
      const spotInfo = item.spots ? ` at ${item.spots?.name}, ${item.spots?.city}` : '';
      posthog.capture('post_shared', { post_id: item.id });
      await Share.share({
        message: `${authorName}${spotInfo}: "${item.content}" — shared via x/pat\n\nhttps://xpat.social/feed?utm_source=share&utm_medium=app${user?.id ? `&ref=${user.id}` : ''}`,
      });
    } catch (_) {
      // user cancelled
    }
  }

  function renderComment(comment: Comment) {
    return (
      <View key={comment.id} style={styles.commentRow}>
        <View style={styles.commentAvatarSmall}>
          <Text style={styles.commentAvatarText}>
            {(comment.profiles?.display_name || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.commentMeta}>
            <Text style={styles.commentAuthor}>
              {comment.profiles?.display_name || 'Anonymous'}
            </Text>
            <Text style={styles.commentTime}>{formatTimeAgo(comment.created_at)}</Text>
          </View>
          <Text style={styles.commentContent}>{comment.content}</Text>
        </View>
      </View>
    );
  }

  function getPostContextMenuItems(item: Post): ContextMenuItem[] {
    const items: ContextMenuItem[] = [
      { label: 'Share Post', icon: 'share', onPress: () => handleShare(item) },
      {
        label: 'Copy Text',
        icon: 'copy',
        onPress: () => {
          // @ts-ignore — Clipboard deprecated but works without extra dependency
          const { Clipboard } = require('react-native');
          if (Clipboard?.setString) Clipboard.setString(item.content);
          Alert.alert('Copied', 'Post text copied to clipboard.');
        },
      },
      { label: 'Report Post', icon: 'flag', destructive: true, onPress: () => handleReport(item) },
    ];
    if (item.user_id === user?.id) {
      // Insert own-post actions before Report
      items.splice(items.length - 1, 0, {
        label: 'Delete Post',
        icon: 'trash-2',
        destructive: true,
        onPress: () => handleDeletePost(item),
      });
    }
    return items;
  }

  function renderPost({ item }: { item: Post }) {
    const initial = (item.profiles?.display_name || '?')[0].toUpperCase();
    const liked = isLikedByUser(item);
    const likeCount = getLikeCount(item);
    const commentCount = getCommentCount(item);
    const isExpanded = expandedComments.has(item.id);
    const postComments = commentsData[item.id] || [];
    const isLoadingComments = loadingComments.has(item.id);
    const isPostingComment = postingComment.has(item.id);

    return (
      <ContextMenu items={getPostContextMenuItems(item)} longPress title={item.profiles?.display_name || 'Post'}>
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>{item.profiles?.display_name || 'Anonymous'}</Text>
            <Text style={styles.postTime}>{formatTimeAgo(item.created_at)}</Text>
          </View>
          <ContextMenu items={getPostContextMenuItems(item)}>
            <View style={{ padding: 8 }}>
              <Feather name="more-horizontal" size={16} color={colors.dark.text2} />
            </View>
          </ContextMenu>
        </View>
        <Text style={styles.postContent}>{item.content}</Text>
        {item.photo_url && (
          <Image
            source={{ uri: item.photo_url }}
            style={styles.postImage}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={String(item.id)}
          />
        )}
        {item.spots && (
          <View style={styles.spotTag}>
            <Feather name="map-pin" size={10} color={colors.amber} />
            <Text style={styles.spotTagText}>{item.spots.name}, {item.spots.city}</Text>
          </View>
        )}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(item)}>
            <Feather
              name={liked ? 'heart' : 'heart'}
              size={16}
              color={liked ? colors.red : colors.dark.text2}
            />
            {likeCount > 0 && (
              <Text style={[styles.actionCount, liked && styles.actionCountLiked]}>
                {likeCount}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => toggleComments(item.id)}>
            <Feather name="message-circle" size={16} color={isExpanded ? colors.teal : colors.dark.text2} />
            {commentCount > 0 && (
              <Text style={[styles.actionCount, isExpanded && styles.actionCountActive]}>
                {commentCount}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(item)}>
            <Feather name="share" size={16} color={colors.dark.text2} />
          </TouchableOpacity>
        </View>

        {isExpanded && (
          <View style={styles.commentsSection}>
            {isLoadingComments ? (
              <ActivityIndicator color={colors.teal} size="small" style={{ marginVertical: spacing.sm }} />
            ) : postComments.length === 0 ? (
              <Text style={styles.noComments}>No comments yet</Text>
            ) : (
              postComments.map(renderComment)
            )}

            <View style={styles.commentComposer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={colors.dark.text2}
                value={commentTexts[item.id] || ''}
                onChangeText={(text) =>
                  setCommentTexts((prev) => ({ ...prev, [item.id]: text }))
                }
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.commentSendBtn,
                  (!commentTexts[item.id]?.trim() || isPostingComment) && styles.postBtnDisabled,
                ]}
                onPress={() => handleComment(item.id)}
                disabled={!commentTexts[item.id]?.trim() || isPostingComment}
              >
                {isPostingComment ? (
                  <ActivityIndicator color={colors.dark.bg} size="small" />
                ) : (
                  <Feather name="send" size={14} color={colors.dark.bg} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      </ContextMenu>
    );
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={[styles.feedHeader, { paddingTop: insets.top }]}>
          <Text style={styles.feedWordmark}>
            <Text style={{ color: colors.amber }}>x</Text>
            <Text style={{ color: colors.teal }}>/</Text>
            <Text style={{ color: colors.dark.text }}>pat</Text>
          </Text>
          <TouchableOpacity
            style={styles.searchUserBtn}
            onPress={() => nav.navigate('NomadDiscovery')}
          >
            <Feather name="search" size={20} color={colors.dark.text2} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.composer}>
        <TextInput
          ref={composerRef}
          style={styles.composerInput}
          placeholder="Share something with the community..."
          placeholderTextColor={colors.dark.text2}
          value={newPost}
          onChangeText={setNewPost}
          multiline
        />
        <TouchableOpacity onPress={pickImage} style={{ justifyContent: 'center', paddingHorizontal: 4 }}>
          <Feather name="image" size={20} color={colors.dark.text2} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.postBtn, (!newPost.trim() || posting || uploading) && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={!newPost.trim() || posting || uploading}
        >
          {posting || uploading ? (
            <ActivityIndicator color={colors.dark.bg} size="small" />
          ) : (
            <Feather name="send" size={16} color={colors.dark.bg} />
          )}
        </TouchableOpacity>
      </View>
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <View>
            <Image source={{ uri: selectedImage }} style={styles.imagePreview} transition={200} cachePolicy="memory-disk" />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => setSelectedImage(null)}
            >
              <Feather name="x" size={12} color={colors.dark.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={{ padding: spacing.lg }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                backgroundColor: colors.dark.bg2,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
                width: '100%',
              }}
            >
              <Skeleton width={40} height={40} borderRadius={20} />
              <View style={{ height: spacing.sm }} />
              <Skeleton width="60%" height={14} />
              <View style={{ height: spacing.sm }} />
              <Skeleton width="100%" height={60} />
              <View style={{ height: spacing.sm }} />
              <Skeleton width="30%" height={12} />
            </View>
          ))}
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.center}>
          <Feather name="message-circle" size={48} color={colors.amber} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptyText}>Share what you're up to!</Text>
          <Feather name="users" size={24} color={colors.dark.text2} style={{ marginTop: spacing.md }} />
          <Text style={styles.emptySubtext}>Post tips, ask questions, and share discoveries with the nomad community</Text>
          <TouchableOpacity
            style={styles.emptyPostBtn}
            onPress={() => composerRef.current?.focus()}
          >
            <Text style={styles.emptyPostBtnText}>Write your first post</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={posts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={
            (profile as any)?.current_city ? (
              <ForYouSection
                city={(profile as any).current_city}
                workStyle={(profile as any)?.work_style}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchPosts(); }}
              tintColor={colors.teal}
              colors={[colors.teal, colors.amber]}
              progressBackgroundColor={colors.dark.bg2}
              title="Refreshing..."
              titleColor={colors.dark.text2}
            />
          }
        />
      )}

      <ReportModal
        visible={reportTarget.visible}
        targetType="post"
        targetId={String(reportTarget.id)}
        onClose={() => setReportTarget({ id: 0, visible: false })}
        onSubmit={submitReport}
      />

      <CelebrationOverlay ref={celebrationRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.bg },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.dark.bg,
  },
  feedWordmark: {
    fontFamily: fonts.heading,
    fontSize: 28,
  },
  searchUserBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.sm + spacing.xs,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
    maxHeight: 80,
  },
  postBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: { opacity: 0.3 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  postCard: {
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + spacing.xs,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.amber,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.dark.bg },
  authorName: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.dark.text },
  postTime: { fontFamily: fonts.body, fontSize: 10, color: colors.dark.text2 },
  postContent: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text, lineHeight: 20 },
  spotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.dark.bg3,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  spotTagText: { fontFamily: fonts.body, fontSize: 11, color: colors.amber },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.dark.bg3,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  actionCount: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
  },
  actionCountLiked: {
    color: colors.red,
  },
  actionCountActive: {
    color: colors.teal,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.dark.text, marginTop: spacing.md },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.dark.text2, marginTop: spacing.xs },
  emptySubtext: { fontFamily: fonts.body, fontSize: 12, color: colors.dark.text2, marginTop: spacing.xs, textAlign: 'center' },
  emptyPostBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  emptyPostBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.dark.bg },

  // Image styles
  imagePreview: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
  imagePreviewContainer: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: spacing.lg, paddingBottom: 8 },
  removeImageBtn: {
    position: 'absolute' as const, top: -6, right: 2,
    backgroundColor: colors.dark.bg, borderRadius: 10,
    width: 20, height: 20,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  postImage: { width: '100%' as const, height: 200, borderRadius: 12, marginTop: 8 },

  // Comment section styles
  commentsSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    backgroundColor: colors.dark.bg3,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  commentAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.dark.bg,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentAuthor: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.dark.text,
  },
  commentTime: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.dark.text2,
  },
  commentContent: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text,
    lineHeight: 18,
    marginTop: 2,
  },
  noComments: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.dark.text2,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  commentComposer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.dark.bg2,
    borderRadius: radius.sm,
    padding: spacing.xs + 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.dark.text,
    borderWidth: 1,
    borderColor: colors.dark.border,
    maxHeight: 60,
  },
  commentSendBtn: {
    backgroundColor: colors.teal,
    borderRadius: radius.sm,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Auth gate styles
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
