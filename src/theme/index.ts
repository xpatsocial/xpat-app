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
    text3: '#636366',
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
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
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
  duration: { fast: 200, normal: 300, slow: 500 },
};
