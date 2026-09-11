export type DisplayDensity = 'compact' | 'comfortable' | 'spacious';

export type UserDisplayPreferences = {
  fontFamily: string;
  baseFontSize: string;
  headingFontWeight: string;
  foreground?: string;
  mutedForeground?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  sidebarColor?: string;
  topbarColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  sidebarTextColor?: string;
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
  backgroundColor: '',
  surfaceColor: '',
  sidebarColor: '',
  topbarColor: '',
  primaryColor: '',
  secondaryColor: '',
  accentColor: '',
  sidebarTextColor: '',
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
    backgroundColor: normalizeColor(input.backgroundColor),
    surfaceColor: normalizeColor(input.surfaceColor),
    sidebarColor: normalizeColor(input.sidebarColor),
    topbarColor: normalizeColor(input.topbarColor),
    primaryColor: normalizeColor(input.primaryColor),
    secondaryColor: normalizeColor(input.secondaryColor),
    accentColor: normalizeColor(input.accentColor),
    sidebarTextColor: normalizeColor(input.sidebarTextColor),
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

const getContrastHsl = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return '214 43% 20%';
  const channels = [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255
  );
  const linear = channels.map((value) =>
    value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4)
  );
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  return luminance > 0.48 ? '214 43% 16%' : '0 0% 100%';
};

const ensureUserPaletteStyle = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'iau-user-palette-overrides';
  let style = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html[data-user-page-color="true"] body {
        background: var(--user-page-color) !important;
      }
      html[data-user-page-color="true"] .neo-platform-shell {
        background:
          radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--user-page-color) 82%, white 18%), transparent 32%),
          linear-gradient(145deg, color-mix(in srgb, var(--user-page-color) 94%, white 6%), var(--user-page-color)) !important;
      }
      html[data-user-page-color="true"] .neo-platform-shell .app-main::before {
        background:
          radial-gradient(circle at 18% 12%, color-mix(in srgb, var(--user-page-color) 70%, white 30%), transparent 28%),
          radial-gradient(circle at 78% 78%, color-mix(in srgb, hsl(var(--primary)) 8%, transparent), transparent 30%) !important;
      }
      html[data-user-surface-color="true"] .neo-platform-shell main [data-slot="card"],
      html[data-user-surface-color="true"] .neo-platform-shell main .future-card,
      html[data-user-surface-color="true"] .neo-platform-shell main .platform-record-card,
      html[data-user-surface-color="true"] .neo-platform-shell main [data-slot="dialog-content"] {
        background: linear-gradient(145deg, color-mix(in srgb, var(--user-surface-color) 92%, white 8%), var(--user-surface-color)) !important;
      }
      html[data-user-sidebar-color="true"] .neo-platform-shell .future-sidebar {
        background: linear-gradient(160deg, color-mix(in srgb, var(--user-sidebar-color) 92%, white 8%), var(--user-sidebar-color)) !important;
      }
      html[data-user-topbar-color="true"] .neo-platform-shell .future-topbar {
        background: linear-gradient(180deg, color-mix(in srgb, var(--user-topbar-color) 94%, white 6%), var(--user-topbar-color)) !important;
      }
    `;
  }
  document.head.appendChild(style);
};

const setOptionalColor = (
  root: HTMLElement,
  dataKey: 'userPageColor' | 'userSurfaceColor' | 'userSidebarColor' | 'userTopbarColor',
  cssVariable: string,
  value?: string
) => {
  const active = Boolean(value);
  root.dataset[dataKey] = String(active);
  if (value) root.style.setProperty(cssVariable, value);
  else root.style.removeProperty(cssVariable);
};

export const applyUserDisplayPreferences = (
  value: UserDisplayPreferences
) => {
  if (typeof document === 'undefined') return;
  const preferences = normalizeUserDisplayPreferences(value);
  const root = document.documentElement;

  ensureUserPaletteStyle();

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

  setOptionalColor(root, 'userPageColor', '--user-page-color', preferences.backgroundColor);
  setOptionalColor(root, 'userSurfaceColor', '--user-surface-color', preferences.surfaceColor);
  setOptionalColor(root, 'userSidebarColor', '--user-sidebar-color', preferences.sidebarColor);
  setOptionalColor(root, 'userTopbarColor', '--user-topbar-color', preferences.topbarColor);

  if (preferences.backgroundColor) {
    const background = hexToHslChannels(preferences.backgroundColor);
    if (background) {
      root.style.setProperty('--background', background);
      root.style.setProperty('--appearance-body-bg', preferences.backgroundColor);
      if (!preferences.foreground) {
        root.style.setProperty('--foreground', getContrastHsl(preferences.backgroundColor));
      }
    }
  }

  if (preferences.surfaceColor) {
    const surface = hexToHslChannels(preferences.surfaceColor);
    if (surface) {
      root.style.setProperty('--card', surface);
      root.style.setProperty('--popover', surface);
      if (!preferences.foreground) {
        const contrast = getContrastHsl(preferences.surfaceColor);
        root.style.setProperty('--card-foreground', contrast);
        root.style.setProperty('--popover-foreground', contrast);
      }
    }
  }

  if (preferences.sidebarColor) {
    const sidebar = hexToHslChannels(preferences.sidebarColor);
    if (sidebar) {
      root.style.setProperty('--sidebar', sidebar);
      root.style.setProperty('--appearance-sidebar', preferences.sidebarColor);
      if (!preferences.sidebarTextColor) {
        const contrast = getContrastHsl(preferences.sidebarColor);
        root.style.setProperty('--sidebar-foreground', contrast);
        root.style.setProperty('--sidebar-accent-foreground', contrast);
      }
    }
  }

  if (preferences.topbarColor) {
    root.style.setProperty('--appearance-topbar', preferences.topbarColor);
  }

  const semanticColors = [
    ['--primary', preferences.primaryColor],
    ['--secondary', preferences.secondaryColor],
    ['--accent', preferences.accentColor],
  ] as const;

  semanticColors.forEach(([variable, color]) => {
    if (!color) return;
    const hsl = hexToHslChannels(color);
    if (hsl) root.style.setProperty(variable, hsl);
  });

  if (preferences.primaryColor) {
    const primary = hexToHslChannels(preferences.primaryColor);
    if (primary) {
      root.style.setProperty('--ring', primary);
      root.style.setProperty('--sidebar-primary', primary);
      root.style.setProperty('--primary-foreground', getContrastHsl(preferences.primaryColor));
      root.style.setProperty('--sidebar-primary-foreground', getContrastHsl(preferences.primaryColor));
    }
  }

  if (preferences.secondaryColor) {
    root.style.setProperty('--secondary-foreground', getContrastHsl(preferences.secondaryColor));
  }

  if (preferences.accentColor) {
    root.style.setProperty('--accent-foreground', getContrastHsl(preferences.accentColor));
  }

  if (preferences.sidebarTextColor) {
    const sidebarText = hexToHslChannels(preferences.sidebarTextColor);
    if (sidebarText) {
      root.style.setProperty('--sidebar-foreground', sidebarText);
      root.style.setProperty('--sidebar-accent-foreground', sidebarText);
    }
  }

  const allowTextColorOverrides = root.dataset.appearanceMode !== 'dark';
  if (allowTextColorOverrides && preferences.foreground) {
    const foreground = hexToHslChannels(preferences.foreground);
    if (foreground) {
      root.style.setProperty('--foreground', foreground);
      root.style.setProperty('--card-foreground', foreground);
      root.style.setProperty('--popover-foreground', foreground);
    }
  }

  if (allowTextColorOverrides && preferences.mutedForeground) {
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
