export const colors = {
  light: {
    primary: '#0F7B53',
    accent: '#C9A227',
    background: '#FAFAF7',
    surface: '#FFFFFF',
    text: '#111827',
    textSecondary: '#4B5563',
    border: '#E5E7EB',
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626'
  },
  dark: {
    primary: '#22C17D',
    accent: '#D7B24C',
    background: '#0B1220',
    surface: '#111827',
    text: '#F9FAFB',
    textSecondary: '#CBD5E1',
    border: '#1F2937',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#F87171'
  }
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16
} as const;

export const typography = {
  h1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' }
} as const;

export const fonts = {
  en: { regular: 'Inter-Regular', medium: 'Inter-Medium', bold: 'Inter-Bold' },
  bn: { regular: 'HindSiliguri-Regular', medium: 'HindSiliguri-Medium', bold: 'HindSiliguri-Bold' }
} as const;

