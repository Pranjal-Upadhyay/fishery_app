// ============================================================
// Fishing God — Design System v2.0
// "Tech-Forward Agriculture" — Glassmorphism + Minimalism
// Dark-mode-first. Aqua primary. Lime secondary. Amber alerts.
// Based on: stitch_aquafarm_intelligence_platform/fishing_god/DESIGN.md
// ============================================================

export const darkTheme = {
  isDark: true,
  colors: {
    // ── Backgrounds ──────────────────────────────────────────
    background:         '#0b1326',   // deepest navy
    surface:            '#171f33',   // surface-container (cards)
    surfaceAlt:         '#222a3d',   // surface-container-high
    surfaceLow:         '#131b2e',   // surface-container-low
    surfaceLowest:      '#060e20',   // surface-container-lowest
    surfaceHigh:        '#222a3d',   // surface-container-high
    surfaceHighest:     '#2d3449',   // surface-container-highest
    surfaceBright:      '#31394d',   // surface-bright
    card:               '#171f33',   // alias for surface
    glass:              'rgba(30,41,59,0.45)',
    glassActive:        'rgba(30,41,59,0.80)',

    // ── Borders ───────────────────────────────────────────────
    border:             '#3b494b',   // outline-variant
    borderGlass:        'rgba(255,255,255,0.10)',

    // ── Primary (Aqua — Water / Life) ──────────────────────
    primary:            '#00dbe9',   // primary-fixed-dim — glow accent
    primaryContainer:   '#00f0ff',   // primary-container
    primaryLight:       'rgba(0,219,233,0.15)',
    primaryDark:        '#004f54',   // on-primary-fixed-variant

    // ── Secondary (Lime — Growth / Health / Good) ─────────
    secondary:          '#98da27',   // secondary-fixed-dim
    secondaryContainer: '#83c300',   // secondary-container
    secondaryLight:     'rgba(152,218,39,0.15)',

    // ── Accent / Tertiary (Amber — Warnings / Alerts) ─────
    accent:             '#ffb95f',   // tertiary-fixed-dim
    accentSoft:         'rgba(255,185,95,0.15)',

    // ── Text ──────────────────────────────────────────────────
    textPrimary:        '#dae2fd',   // on-surface
    textSecondary:      '#b9cacb',   // on-surface-variant
    textMuted:          '#849495',   // outline
    textInverse:        '#00363a',   // on-primary (dark navy on aqua)
    textOnSecondary:    '#121f00',   // on-secondary-fixed

    // ── Semantic ──────────────────────────────────────────────
    success:            '#98da27',   // secondary-fixed-dim
    warning:            '#ffb95f',   // tertiary-fixed-dim
    error:              '#ffb4ab',   // error
    errorContainer:     '#93000a',   // error-container
    errorSoft:          'rgba(255,180,171,0.15)',
  },
  spacing: {
    xs: 4, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
    base: 8, gutter: 16, margin: 20,
  },
  borderRadius: {
    sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
  },
  shadows: {
    glow: {
      shadowColor: '#00dbe9',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 7,
    },
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as const, color: '#dae2fd', letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: '600' as const, color: '#dae2fd' },
    h3: { fontSize: 18, fontWeight: '600' as const, color: '#dae2fd' },
    bodyLarge: { fontSize: 16, fontWeight: '400' as const, color: '#b9cacb', lineHeight: 24 },
    body: { fontSize: 14, fontWeight: '400' as const, color: '#b9cacb', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '500' as const, color: '#849495', letterSpacing: 0.5 },
    dataLabel: { fontSize: 12, fontWeight: '500' as const, color: '#849495', letterSpacing: 1 },
    buttonText: { fontSize: 15, fontWeight: '700' as const },
  },
};

export const lightTheme = {
  isDark: false,
  colors: {
    // ── Backgrounds ──────────────────────────────────────────
    background:         '#EEF6F8',
    surface:            '#FFFFFF',
    surfaceAlt:         '#E0EFF3',
    surfaceLow:         '#F0F8FA',
    surfaceLowest:      '#FFFFFF',
    surfaceHigh:        '#D4E8EE',
    surfaceHighest:     '#C5DDE6',
    surfaceBright:      '#F8FBFC',
    card:               '#FFFFFF',
    glass:              'rgba(255,255,255,0.70)',
    glassActive:        'rgba(255,255,255,0.92)',

    // ── Borders ───────────────────────────────────────────────
    border:             '#C5D8DB',
    borderGlass:        'rgba(0,105,112,0.15)',

    // ── Primary (Deep Teal) ────────────────────────────────
    primary:            '#006970',   // inverse-primary
    primaryContainer:   '#00f0ff',
    primaryLight:       'rgba(0,105,112,0.10)',
    primaryDark:        '#004f54',

    // ── Secondary (Dark Green) ─────────────────────────────
    secondary:          '#334f00',
    secondaryContainer: '#83c300',
    secondaryLight:     'rgba(51,79,0,0.10)',

    // ── Accent (Amber) ─────────────────────────────────────
    accent:             '#855300',
    accentSoft:         'rgba(133,83,0,0.10)',

    // ── Text ──────────────────────────────────────────────────
    textPrimary:        '#0b1326',
    textSecondary:      '#283044',
    textMuted:          '#4d6166',
    textInverse:        '#FFFFFF',
    textOnSecondary:    '#FFFFFF',

    // ── Semantic ──────────────────────────────────────────────
    success:            '#304b00',
    warning:            '#855300',
    error:              '#690005',
    errorContainer:     '#FFDAD6',
    errorSoft:          'rgba(105,0,5,0.10)',
  },
  spacing: {
    xs: 4, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
    base: 8, gutter: 16, margin: 20,
  },
  borderRadius: {
    sm: 8, md: 12, lg: 16, xl: 24, full: 9999,
  },
  shadows: {
    glow: {
      shadowColor: '#006970',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.20,
      shadowRadius: 12,
      elevation: 6,
    },
    sm: {
      shadowColor: '#0b1326',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#0b1326',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 5,
    },
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as const, color: '#0b1326', letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: '600' as const, color: '#0b1326' },
    h3: { fontSize: 18, fontWeight: '600' as const, color: '#0b1326' },
    bodyLarge: { fontSize: 16, fontWeight: '400' as const, color: '#283044', lineHeight: 24 },
    body: { fontSize: 14, fontWeight: '400' as const, color: '#283044', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '500' as const, color: '#4d6166', letterSpacing: 0.5 },
    dataLabel: { fontSize: 12, fontWeight: '500' as const, color: '#4d6166', letterSpacing: 1 },
    buttonText: { fontSize: 15, fontWeight: '700' as const },
  },
};

export type Theme = typeof darkTheme;
