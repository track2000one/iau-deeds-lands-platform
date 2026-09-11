export type DisplayDensity = 'compact' | 'comfortable' | 'spacious';

export type UserDisplayPreferences = {
  fontFamily: string;
  baseFontSize: string;
  headingFontWeight: string;
  foreground?: string;
  mutedForeground?: string;
  lineHeight: string;
  density: DisplayDensity;
  reduceMotion: boolean;
  enhancedFocus: boolean;
  underlineLinks: boolean;
};

export const DISPLAY_FONT_OPTIONS = [
  {
    label: 'تجوال — الافتراضي الرسمي',
    value: 'Tajawal, Cairo, Arial, sans-serif',
  },
  {
    label: 'Cairo — واضح وحديث',
    value: 'Cairo, Tajawal, Arial, sans-serif',
  },
  {
    label: 'Almarai — رسمي ومقروء',
    value: 'Almarai, Tajawal, Arial, sans-serif',
  },
  {
    label: 'IBM Plex Sans Arabic — إداري',
    value: '"IBM Plex Sans Arabic", Tajawal, Arial, sans-serif',
  },
  {
    label: 'Noto Sans Arabic — عالي الوضوح',
    value: '"Noto Sans Arabic", Tajawal, Arial, sans-serif',
  },
  {
    label: 'Amiri — عربي تقليدي',
    value: 'Amiri, "Traditional Arabic", serif',
  },
  {
    label: 'Changa — عريض وواضح',
    value: 'Changa, Tajawal, Arial, sans-serif',
  },
  {
    label: 'El Messiri — أنيق ورسمي',
    value: '"El Messiri", Tajawal, Arial, sans-serif',
  },
] as const;

export const DISPLAY_TEXT_COLOR_PRESETS = [
  { label: 'كحلي داكن', value: '#0f172a' },
  { label: 'رمادي رسمي', value: '#1f2937' },
  { label: 'أزرق إداري', value: '#243b53' },
  { label: 'بترولي هادئ', value: '#0f4c5c' },
] as const;

export const DISPLAY_MUTED_COLOR_PRESETS = [
  { label: 'رمادي متوسط', value: '#52606d' },
  { label: 'رمادي مزرق', value: '#5b677a' },
  { label: 'أزرق هادئ', value: '#486581' },
] as const;

export const DISPLAY_FONT_SIZE_MIN = 13;
export const DISPLAY_FONT_SIZE_MAX = 22;

export const DEFAULT_USER_DISPLAY_PREFERENCES: UserDisplayPreferences = {
  fontFamily: 'Tajawal, Cairo, Arial, sans-serif',
  baseFontSize: '15px',
  headingFontWeight: '800',
  foreground: '',
  mutedForeground: '',
  lineHeight: '1.65',
  density: 'comfortable',
  reduceMotion: false,
  enhancedFocus: false,
  underlineLinks: false,
};

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim());

const normalizeColor = (value: unknown) =>
  isHexColor(value) ? value.trim().toLowerCase() : '';

const normalizeFontSize = (value: unknown) => {
  const numeric = Number.parseInt(String(value ?? ''), 10);
  const safe = Number.isFinite(numeric)
    ? Math.min(DISPLAY_FONT_SIZE_MAX, Math.max(DISPLAY_FONT_SIZE_MIN, numeric))
    : 15;
  return `${safe}px`;
};

export const normalizeUserDisplayPreferences = (
  value: unknown
): UserDisplayPreferences => {
  const input = value && typeof value === 'object'
    ? (value as Partial<UserDisplayPreferences>)
    : {};

  const fontFamily = DISPLAY_FONT_OPTIONS.some(
    (option) => option.value === input.fontFamily
  )
    ? String(input.fontFamily)
    : DEFAULT_USER_DISPLAY_PREFERENCES.fontFamily;

  const headingFontWeight = ['700', '800', '900'].includes(
    String(input.headingFontWeight || '')
  )
    ? String(input.headingFontWeight)
    : DEFAULT_USER_DISPLAY_PREFERENCES.headingFontWeight;

  const lineHeight = ['1.45', '1.65', '1.85', '2'].includes(
    String(input.lineHeight || '')
  )
    ? String(input.lineHeight)
    : DEFAULT_USER_DISPLAY_PREFERENCES.lineHeight;

  const density: DisplayDensity = ['compact', 'comfortable', 'spacious'].includes(
    String(input.density || '')
  )
    ? (input.density as DisplayDensity)
    : DEFAULT_USER_DISPLAY_PREFERENCES.density;

  return {
    fontFamily,
    baseFontSize: normalizeFontSize(input.baseFontSize),
    headingFontWeight,
    foreground: normalizeColor(input.foreground),
    mutedForeground: normalizeColor(input.mutedForeground),
    lineHeight,
    density,
    reduceMotion: Boolean(input.reduceMotion),
    enhancedFocus: Boolean(input.enhancedFocus),
    underlineLinks: Boolean(input.underlineLinks),
  };
};

export const getUserDisplayPreferencesStorageKey = (
  username?: string | null
) => `iau-appearance-font-controls:${username?.trim() || 'guest'}`;

export const loadUserDisplayPreferences = (
  username?: string | null
): UserDisplayPreferences => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_USER_DISPLAY_PREFERENCES };
  }

  try {
    const stored = window.localStorage.getItem(
      getUserDisplayPreferencesStorageKey(username)
    );
    if (!stored) return { ...DEFAULT_USER_DISPLAY_PREFERENCES };
    return normalizeUserDisplayPreferences(JSON.parse(stored));
  } catch {
    return { ...DEFAULT_USER_DISPLAY_PREFERENCES };
  }
};

export const saveUserDisplayPreferences = (
  username: string | null | undefined,
  preferences: UserDisplayPreferences
) => {
  if (typeof window === 'undefined') return;
  const normalized = normalizeUserDisplayPreferences(preferences);
  window.localStorage.setItem(
    getUserDisplayPreferencesStorageKey(username),
    JSON.stringify(normalized)
  );
};

export const hexToHslChannels = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(
    l * 100
  )}%`;
};

export const applyUserDisplayPreferences = (
  value: UserDisplayPreferences
) => {
  if (typeof document === 'undefined') return;
  const preferences = normalizeUserDisplayPreferences(value);
  const root = document.documentElement;

  root.style.setProperty('--app-font-family', preferences.fontFamily);
  root.style.setProperty('--app-base-font-size', preferences.baseFontSize);
  root.style.setProperty(
    '--app-heading-font-weight',
    preferences.headingFontWeight
  );
  root.style.setProperty('--app-user-line-height', preferences.lineHeight);

  root.dataset.displayDensity = preferences.density;
  root.dataset.reduceMotion = String(preferences.reduceMotion);
  root.dataset.enhancedFocus = String(preferences.enhancedFocus);
  root.dataset.underlineLinks = String(preferences.underlineLinks);

  const allowColorOverrides = root.dataset.appearanceMode !== 'dark';
  if (allowColorOverrides && preferences.foreground) {
    const foreground = hexToHslChannels(preferences.foreground);
    if (foreground) {
      root.style.setProperty('--foreground', foreground);
      root.style.setProperty('--card-foreground', foreground);
      root.style.setProperty('--popover-foreground', foreground);
    }
  }

  if (allowColorOverrides && preferences.mutedForeground) {
    const muted = hexToHslChannels(preferences.mutedForeground);
    if (muted) root.style.setProperty('--muted-foreground', muted);
  }
};

export const userDisplayPreferencesEqual = (
  a: UserDisplayPreferences,
  b: UserDisplayPreferences
) =>
  JSON.stringify(normalizeUserDisplayPreferences(a)) ===
  JSON.stringify(normalizeUserDisplayPreferences(b));
