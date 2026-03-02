export const Colors = {
  primaryOrange: '#ff6600',
  secondaryOrange: '#f34b1d',
  darkOrange: '#e55a00',
  lightOrangeBg: '#fff5f0',
  lightOrangeBorder: '#fed7aa',

  bgLight: '#F9FAFB',
  bgWhite: '#ffffff',
  textDark: '#1a1a1a',
  textMuted: '#6B7280',
  borderColor: '#E5E7EB',

  successGreen: '#10B981',
  successBg: '#D1FAE5',
  warningYellow: '#F59E0B',
  warningBg: '#FEF3C7',
  errorRed: '#EF4444',
  errorBg: '#FEE2E2',

  white: '#ffffff',
  black: '#000000',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
};

export const BorderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  lg: 15,
  xl: 17,
  xxl: 20,
  xxxl: 24,
  title: 28,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
};
