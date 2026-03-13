export const colors = {
  light: {
    primary: '#0F7B53',
    primaryHover: '#0d6646',
    accent: '#C9A227',
    background: '#FAFAF7',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F4F6',
    text: '#111827',
    textSecondary: '#4B5563',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',
    success: '#16A34A',
    successBg: '#F0FDF4',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    error: '#DC2626',
    errorBg: '#FEF2F2',
    info: '#2563EB',
    infoBg: '#EFF6FF',
    overlay: 'rgba(0, 0, 0, 0.5)'
  },
  dark: {
    primary: '#22C17D',
    primaryHover: '#1da870',
    accent: '#D7B24C',
    background: '#0B1220',
    surface: '#111827',
    surfaceAlt: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#CBD5E1',
    textMuted: '#6B7280',
    border: '#1F2937',
    borderStrong: '#374151',
    success: '#22C55E',
    successBg: '#052e16',
    warning: '#F59E0B',
    warningBg: '#1c1100',
    error: '#F87171',
    errorBg: '#2c0000',
    info: '#60A5FA',
    infoBg: '#0f1e3a',
    overlay: 'rgba(0, 0, 0, 0.7)'
  }
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999
} as const;

export const typography = {
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  h4: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' }
} as const;

// Mobile fonts (React Native)
export const fonts = {
  en: { regular: 'Inter-Regular', medium: 'Inter-Medium', bold: 'Inter-Bold' },
  bn: { regular: 'HindSiliguri-Regular', medium: 'HindSiliguri-Medium', bold: 'HindSiliguri-Bold' }
} as const;

// Web/Admin font families (CSS-compatible, used in Next.js)
export const webFonts = {
  en: {
    family: '"Geist", "Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    google: 'Geist'
  },
  bn: {
    family: '"Hind Siliguri", "Noto Sans Bengali", sans-serif',
    google: 'Hind+Siliguri:wght@400;500;600;700'
  }
} as const;

// CSS custom properties for theming
export const cssVars = {
  light: {
    '--color-primary': colors.light.primary,
    '--color-accent': colors.light.accent,
    '--color-bg': colors.light.background,
    '--color-surface': colors.light.surface,
    '--color-text': colors.light.text,
    '--color-text-secondary': colors.light.textSecondary,
    '--color-border': colors.light.border,
    '--color-success': colors.light.success,
    '--color-warning': colors.light.warning,
    '--color-error': colors.light.error
  },
  dark: {
    '--color-primary': colors.dark.primary,
    '--color-accent': colors.dark.accent,
    '--color-bg': colors.dark.background,
    '--color-surface': colors.dark.surface,
    '--color-text': colors.dark.text,
    '--color-text-secondary': colors.dark.textSecondary,
    '--color-border': colors.dark.border,
    '--color-success': colors.dark.success,
    '--color-warning': colors.dark.warning,
    '--color-error': colors.dark.error
  }
} as const;

export type ColorMode = 'light' | 'dark';
export type ThemeColors = typeof colors.light;
