export const colors = {
  teal: '#2EC4A0',
  tealDark: '#25a384',
  tealLight: '#3DDBB5',
  amber: '#E8803A',
  amberDark: '#d06e2e',
  amberLight: '#F0944F',
  red: '#FF6B6B',
  green: '#4CD964',

  dark: {
    bg0: '#0F0F11',
    bg: '#1C1C1E',
    bg2: '#2C2C2E',
    bg3: '#3A3A3C',
    bg4: '#48484A',
    text: '#F5F5F5',
    text2: '#BABABF',
    text3: '#8E8E93', // Raised from #636366 (2.66:1) to meet WCAG AA 4.5:1 contrast
    border: '#48484A',
    borderLight: '#5A5A5E',
  },

  glass: {
    light: 'rgba(255, 255, 255, 0.06)',
    medium: 'rgba(255, 255, 255, 0.10)',
    heavy: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.08)',
  },
};

export const fonts = {
  heading: 'DMSerifDisplay-Regular',
  body: 'SpaceMono-Regular',
  bodyBold: 'SpaceMono-Bold',
  mono: 'SpaceMono-Regular',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const shadows = {
  /** Cards, list items — Material 3 elevation 1 */
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 1,
  },
  /** Raised cards, app bars — Material 3 elevation 4 */
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  /** FABs — Material 3 elevation 6 */
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  /** Bottom sheets — Material 3 elevation 8 */
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  /** Dialogs — Material 3 elevation 24 */
  dialog: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 24,
  },
  /** Colored glow — elevation 6 */
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  }),
};

export const animation = {
  spring: { damping: 15, stiffness: 150 },
  springFast: { damping: 20, stiffness: 300 },
  springGentle: { damping: 12, stiffness: 100 },
  /** Press interactions — snappy scale response */
  springPress: { damping: 15, stiffness: 300, mass: 0.6 },
  /** Tab indicator — smooth glide */
  springTab: { damping: 18, stiffness: 220, mass: 0.4 },
  /** Sheets/modals — heavier, more grounded */
  springSheet: { damping: 20, stiffness: 200, mass: 0.8 },
  duration: { fast: 200, normal: 300, slow: 500 },
};
