import React, { useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, fonts } from '../theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SwipeDirection = 'left' | 'right' | 'up';

export interface SwipeCardDeckRef {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeUp: () => void;
  undo: () => void;
}

export interface SwipeCardDeckProps<T> {
  /** Data items to render as cards */
  data: T[];
  /** Render function for each card */
  renderCard: (item: T, index: number) => React.ReactNode;
  /** Unique key extractor */
  keyExtractor: (item: T) => string;
  /** Called when a card is swiped away */
  onSwipe: (item: T, direction: SwipeDirection) => void;
  /** Called when all cards are exhausted */
  onEmpty?: () => void;
  /** Number of visible stacked cards behind the top card (default 3) */
  stackSize?: number;
  /** Horizontal distance (px) to trigger a swipe commit (default 120) */
  swipeThreshold?: number;
  /** Vertical distance (px) to trigger an up-swipe commit (default 100) */
  superSwipeThreshold?: number;
  /** Container style override */
  style?: StyleProp<ViewStyle>;
  /** Custom overlay for right swipe (default green checkmark) */
  renderRightOverlay?: () => React.ReactNode;
  /** Custom overlay for left swipe (default red X) */
  renderLeftOverlay?: () => React.ReactNode;
  /** Custom overlay for up swipe (default teal star) */
  renderUpOverlay?: () => React.ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W - spacing.lg * 2;
const CARD_H = SCREEN_H * 0.58;
const FLY_OFF_X = SCREEN_W * 1.5;
const FLY_OFF_Y = -SCREEN_H * 0.9;
const MAX_ROTATION_DEG = 18;

const SPRING_BACK = { damping: 18, stiffness: 200, mass: 0.8 };
const SPRING_FLY = { damping: 22, stiffness: 120, mass: 0.7 };

// ---------------------------------------------------------------------------
// Overlay components
// ---------------------------------------------------------------------------

function DefaultRightOverlay() {
  return (
    <View style={[overlayStyles.badge, overlayStyles.rightBadge]}>
      <Text style={overlayStyles.rightText}>CONNECT</Text>
    </View>
  );
}

function DefaultLeftOverlay() {
  return (
    <View style={[overlayStyles.badge, overlayStyles.leftBadge]}>
      <Text style={overlayStyles.leftText}>SKIP</Text>
    </View>
  );
}

function DefaultUpOverlay() {
  return (
    <View style={[overlayStyles.badge, overlayStyles.upBadge]}>
      <Text style={overlayStyles.upText}>SUPER</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Single animated card
// ---------------------------------------------------------------------------

interface AnimatedCardProps {
  children: React.ReactNode;
  index: number;
  isTop: boolean;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  stackSize: number;
  renderRightOverlay: () => React.ReactNode;
  renderLeftOverlay: () => React.ReactNode;
  renderUpOverlay: () => React.ReactNode;
  swipeThreshold: number;
  superSwipeThreshold: number;
}

function AnimatedCard({
  children,
  index,
  isTop,
  translateX,
  translateY,
  stackSize,
  renderRightOverlay,
  renderLeftOverlay,
  renderUpOverlay,
  swipeThreshold,
  superSwipeThreshold,
}: AnimatedCardProps) {
  const cardStyle = useAnimatedStyle(() => {
    if (isTop) {
      const rotation = interpolate(
        translateX.value,
        [-SCREEN_W, 0, SCREEN_W],
        [-MAX_ROTATION_DEG, 0, MAX_ROTATION_DEG],
        Extrapolation.CLAMP,
      );
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotate: `${rotation}deg` },
        ],
        zIndex: 10,
      };
    }

    // Background cards: scale down + offset down slightly
    const behindScale = interpolate(
      index,
      [0, stackSize],
      [1, 0.88],
      Extrapolation.CLAMP,
    );
    const behindTranslateY = interpolate(
      index,
      [0, stackSize],
      [0, -24],
      Extrapolation.CLAMP,
    );
    const behindOpacity = interpolate(
      index,
      [0, stackSize],
      [1, 0.4],
      Extrapolation.CLAMP,
    );

    // When the top card moves, the next card grows toward full size
    const progress = interpolate(
      Math.abs(translateX.value),
      [0, swipeThreshold],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const adjustedIndex = index - progress;
    const dynamicScale = interpolate(
      adjustedIndex,
      [0, stackSize],
      [1, 0.88],
      Extrapolation.CLAMP,
    );
    const dynamicY = interpolate(
      adjustedIndex,
      [0, stackSize],
      [0, -24],
      Extrapolation.CLAMP,
    );
    const dynamicOpacity = interpolate(
      adjustedIndex,
      [0, stackSize],
      [1, 0.4],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateY: isTop ? 0 : dynamicY },
        { scale: isTop ? 1 : dynamicScale },
      ],
      opacity: isTop ? 1 : dynamicOpacity,
      zIndex: 10 - index,
    };
  });

  const rightOverlayStyle = useAnimatedStyle(() => {
    if (!isTop) return { opacity: 0 };
    const opacity = interpolate(
      translateX.value,
      [0, swipeThreshold * 0.5, swipeThreshold],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const leftOverlayStyle = useAnimatedStyle(() => {
    if (!isTop) return { opacity: 0 };
    const opacity = interpolate(
      translateX.value,
      [0, -swipeThreshold * 0.5, -swipeThreshold],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  const upOverlayStyle = useAnimatedStyle(() => {
    if (!isTop) return { opacity: 0 };
    const opacity = interpolate(
      translateY.value,
      [0, -superSwipeThreshold * 0.5, -superSwipeThreshold],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    );
    return { opacity };
  });

  return (
    <Animated.View style={[styles.cardContainer, cardStyle]}>
      {children}
      {/* Overlays */}
      <Animated.View style={[overlayStyles.overlayWrap, overlayStyles.overlayRight, rightOverlayStyle]}>
        {renderRightOverlay()}
      </Animated.View>
      <Animated.View style={[overlayStyles.overlayWrap, overlayStyles.overlayLeft, leftOverlayStyle]}>
        {renderLeftOverlay()}
      </Animated.View>
      <Animated.View style={[overlayStyles.overlayWrap, overlayStyles.overlayUp, upOverlayStyle]}>
        {renderUpOverlay()}
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// SwipeCardDeck
// ---------------------------------------------------------------------------

function SwipeCardDeckInner<T>(
  {
    data,
    renderCard,
    keyExtractor,
    onSwipe,
    onEmpty,
    stackSize = 3,
    swipeThreshold = 120,
    superSwipeThreshold = 100,
    style,
    renderRightOverlay = () => <DefaultRightOverlay />,
    renderLeftOverlay = () => <DefaultLeftOverlay />,
    renderUpOverlay = () => <DefaultUpOverlay />,
  }: SwipeCardDeckProps<T>,
  ref: React.Ref<SwipeCardDeckRef>,
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [undoStack, setUndoStack] = useState<{ item: T; direction: SwipeDirection }[]>([]);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // -----------------------------------------------------------------------
  // Imperative swipe helpers
  // -----------------------------------------------------------------------

  const commitSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (currentIndex >= data.length) return;
      const item = data[currentIndex];
      setUndoStack((prev) => [...prev, { item, direction }]);
      setCurrentIndex((prev) => prev + 1);
      onSwipe(item, direction);
      if (currentIndex + 1 >= data.length && onEmpty) {
        onEmpty();
      }
    },
    [currentIndex, data, onSwipe, onEmpty],
  );

  const animateSwipe = useCallback(
    (direction: SwipeDirection) => {
      'worklet';
      const toX =
        direction === 'right' ? FLY_OFF_X : direction === 'left' ? -FLY_OFF_X : 0;
      const toY = direction === 'up' ? FLY_OFF_Y : 0;

      translateX.value = withSpring(toX, SPRING_FLY, (finished) => {
        if (finished) {
          translateX.value = 0;
          translateY.value = 0;
          runOnJS(commitSwipe)(direction);
        }
      });
      translateY.value = withSpring(toY, SPRING_FLY);
      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    },
    [commitSwipe, translateX, translateY],
  );

  useImperativeHandle(ref, () => ({
    swipeLeft: () => animateSwipe('left'),
    swipeRight: () => animateSwipe('right'),
    swipeUp: () => animateSwipe('up'),
    undo: () => {
      if (undoStack.length === 0) return;
      setUndoStack((prev) => prev.slice(0, -1));
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  }));

  // -----------------------------------------------------------------------
  // Pan gesture
  // -----------------------------------------------------------------------

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .activeOffsetY([-10, 10])
    .onChange((e) => {
      translateX.value += e.changeX;
      translateY.value += e.changeY;
    })
    .onEnd((e) => {
      // Determine commit direction
      if (translateX.value > swipeThreshold || e.velocityX > 800) {
        animateSwipe('right');
      } else if (translateX.value < -swipeThreshold || e.velocityX < -800) {
        animateSwipe('left');
      } else if (translateY.value < -superSwipeThreshold || e.velocityY < -800) {
        animateSwipe('up');
      } else {
        // Snap back
        translateX.value = withSpring(0, SPRING_BACK);
        translateY.value = withSpring(0, SPRING_BACK);
      }
    });

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const visibleCards = data.slice(currentIndex, currentIndex + stackSize);

  if (visibleCards.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🌎</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>Check back soon for more discoveries</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Render bottom-to-top so index 0 (top) is drawn last */}
      {[...visibleCards].reverse().map((item, reverseIdx) => {
        const stackIndex = visibleCards.length - 1 - reverseIdx;
        const isTop = stackIndex === 0;
        const card = (
          <AnimatedCard
            key={keyExtractor(item)}
            index={stackIndex}
            isTop={isTop}
            translateX={translateX}
            translateY={translateY}
            stackSize={stackSize}
            renderRightOverlay={renderRightOverlay}
            renderLeftOverlay={renderLeftOverlay}
            renderUpOverlay={renderUpOverlay}
            swipeThreshold={swipeThreshold}
            superSwipeThreshold={superSwipeThreshold}
          >
            {renderCard(item, currentIndex + stackIndex)}
          </AnimatedCard>
        );

        if (isTop) {
          return (
            <GestureDetector key={keyExtractor(item)} gesture={panGesture}>
              {card}
            </GestureDetector>
          );
        }
        return card;
      })}
    </View>
  );
}

// ForwardRef with generic — cast needed for TypeScript
export const SwipeCardDeck = forwardRef(SwipeCardDeckInner) as <T>(
  props: SwipeCardDeckProps<T> & { ref?: React.Ref<SwipeCardDeckRef> },
) => React.ReactElement | null;

export default SwipeCardDeck;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: CARD_W,
    height: CARD_H,
    position: 'absolute',
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.dark.bg2,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: fonts.heading,
    fontSize: 24,
    color: colors.dark.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.dark.text2,
    textAlign: 'center',
  },
});

const overlayStyles = StyleSheet.create({
  overlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.xl,
    pointerEvents: 'none',
  },
  overlayRight: {
    backgroundColor: 'rgba(46, 196, 160, 0.15)',
  },
  overlayLeft: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  overlayUp: {
    backgroundColor: 'rgba(232, 128, 58, 0.15)',
  },
  badge: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 3,
  },
  rightBadge: {
    borderColor: colors.teal,
  },
  leftBadge: {
    borderColor: colors.red,
  },
  upBadge: {
    borderColor: colors.amber,
  },
  rightText: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    color: colors.teal,
    letterSpacing: 4,
  },
  leftText: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    color: colors.red,
    letterSpacing: 4,
  },
  upText: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    color: colors.amber,
    letterSpacing: 4,
  },
});
