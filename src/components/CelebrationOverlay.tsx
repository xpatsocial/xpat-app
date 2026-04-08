import React, { useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PARTICLE_COUNT = 25;
const AUTO_DISMISS_MS = 2000;

// Confetti colors matching theme
const CONFETTI_COLORS = [
  colors.teal,
  colors.tealLight,
  colors.amber,
  colors.amberLight,
  colors.red,
  '#A78BFA', // violet accent
  '#F472B6', // pink accent
];

const TEAL_SHADES = [
  colors.teal,
  colors.tealLight,
  colors.tealDark,
  'rgba(46,196,160,0.6)',
  'rgba(61,219,181,0.8)',
];

type CelebrationMode = 'confetti' | 'particles' | 'pulse';

export interface CelebrationOverlayRef {
  confetti: () => void;
  particles: (color?: string) => void;
  pulse: () => void;
}

interface ParticleData {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

function generateParticles(mode: CelebrationMode, customColor?: string): ParticleData[] {
  const particles: ParticleData[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.5;
    const velocity = 120 + Math.random() * 200;

    let startX = SCREEN_W / 2;
    let startY = SCREEN_H / 2;

    if (mode === 'confetti') {
      startX = SCREEN_W * 0.3 + Math.random() * SCREEN_W * 0.4;
      startY = -20;
    }

    const colorPool = mode === 'confetti' ? CONFETTI_COLORS : TEAL_SHADES;
    const particleColor = customColor || colorPool[Math.floor(Math.random() * colorPool.length)];

    particles.push({
      id: i,
      startX,
      startY,
      targetX: mode === 'confetti'
        ? startX + (Math.random() - 0.5) * SCREEN_W * 0.8
        : startX + Math.cos(angle) * velocity,
      targetY: mode === 'confetti'
        ? SCREEN_H + 40
        : startY + Math.sin(angle) * velocity,
      rotation: Math.random() * 720 - 360,
      color: particleColor,
      size: mode === 'confetti' ? 6 + Math.random() * 6 : 4 + Math.random() * 8,
      delay: Math.random() * 150,
    });
  }
  return particles;
}

// Individual animated particle
function AnimatedParticle({ particle, mode }: { particle: ParticleData; mode: CelebrationMode }) {
  const translateX = useSharedValue(particle.startX);
  const translateY = useSharedValue(particle.startY);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(mode === 'confetti' ? 1 : 0);

  React.useEffect(() => {
    const duration = mode === 'confetti' ? 1800 : 800;

    opacity.value = withDelay(particle.delay, withSequence(
      withTiming(1, { duration: 100 }),
      withDelay(duration - 400, withTiming(0, { duration: 300 })),
    ));

    if (mode === 'confetti') {
      translateX.value = withDelay(particle.delay,
        withTiming(particle.targetX, {
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
      );
      translateY.value = withDelay(particle.delay,
        withTiming(particle.targetY, {
          duration,
          easing: Easing.bezier(0.33, 0, 0.67, 1),
        }),
      );
      rotate.value = withDelay(particle.delay,
        withTiming(particle.rotation, { duration }),
      );
    } else {
      // Particle explosion — spring out
      translateX.value = withDelay(particle.delay,
        withSpring(particle.targetX, { damping: 12, stiffness: 80 }),
      );
      translateY.value = withDelay(particle.delay,
        withSpring(particle.targetY, { damping: 12, stiffness: 80 }),
      );
      scale.value = withDelay(particle.delay, withSequence(
        withSpring(1.2, { damping: 8, stiffness: 200 }),
        withTiming(0, { duration: 600 }),
      ));
      rotate.value = withDelay(particle.delay,
        withTiming(particle.rotation, { duration: 1000 }),
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: particle.size,
    height: mode === 'confetti' ? particle.size * 1.6 : particle.size,
    borderRadius: mode === 'confetti' ? 2 : particle.size / 2,
    backgroundColor: particle.color,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: mode === 'confetti' ? 1 : scale.value },
    ],
  }));

  return <Animated.View style={animatedStyle} />;
}

// Pulse ring effect
function PulseRing() {
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0.8);

  React.useEffect(() => {
    scale.value = withSpring(3, { damping: 15, stiffness: 40 });
    opacity.value = withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) });
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: SCREEN_W / 2 - 50,
    top: SCREEN_H / 2 - 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.teal,
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const ring2Style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: SCREEN_W / 2 - 50,
    top: SCREEN_H / 2 - 50,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: colors.tealLight,
    opacity: opacity.value * 0.6,
    transform: [{ scale: scale.value * 0.7 }],
  }));

  return (
    <>
      <Animated.View style={ring2Style} />
      <Animated.View style={ringStyle} />
    </>
  );
}

const CelebrationOverlay = forwardRef<CelebrationOverlayRef>((_, ref) => {
  const [activeMode, setActiveMode] = useState<CelebrationMode | null>(null);
  const [particles, setParticles] = useState<ParticleData[]>([]);
  const [renderKey, setRenderKey] = useState(0);

  const dismiss = useCallback(() => {
    setActiveMode(null);
    setParticles([]);
  }, []);

  const trigger = useCallback((mode: CelebrationMode, customColor?: string) => {
    const newParticles = mode !== 'pulse' ? generateParticles(mode, customColor) : [];
    setParticles(newParticles);
    setActiveMode(mode);
    setRenderKey(k => k + 1);
    setTimeout(() => {
      dismiss();
    }, AUTO_DISMISS_MS);
  }, [dismiss]);

  useImperativeHandle(ref, () => ({
    confetti: () => trigger('confetti'),
    particles: (color?: string) => trigger('particles', color),
    pulse: () => trigger('pulse'),
  }), [trigger]);

  if (!activeMode) return null;

  return (
    <View style={styles.overlay} pointerEvents="none" key={renderKey}>
      {activeMode === 'pulse' && <PulseRing />}
      {(activeMode === 'confetti' || activeMode === 'particles') &&
        particles.map((p) => (
          <AnimatedParticle key={p.id} particle={p} mode={activeMode} />
        ))
      }
    </View>
  );
});

CelebrationOverlay.displayName = 'CelebrationOverlay';

export default CelebrationOverlay;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});
