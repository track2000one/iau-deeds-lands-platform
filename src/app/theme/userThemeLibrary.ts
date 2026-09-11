import {
  DEFAULT_USER_DISPLAY_PREFERENCES,
  normalizeUserDisplayPreferences,
  type UserDisplayPreferences,
} from './userDisplayPreferences';

export type UserThemeColors = Pick<
  UserDisplayPreferences,
  | 'backgroundColor'
  | 'surfaceColor'
  | 'sidebarColor'
  | 'topbarColor'
  | 'primaryColor'
  | 'secondaryColor'
  | 'accentColor'
  | 'sidebarTextColor'
>;

export type SavedUserTheme = {
  id: string;
  name: string;
  baseThemeId: string;
  colors: UserThemeColors;
  createdAt: string;
  updatedAt: string;
};

const COLOR_KEYS: Array<keyof UserThemeColors> = [
  'backgroundColor',
  'surfaceColor',
  'sidebarColor',
  'topbarColor',
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'sidebarTextColor',
];

export const EMPTY_USER_THEME_COLORS: UserThemeColors = {
  backgroundColor: '',
  surfaceColor: '',
  sidebarColor: '',
  topbarColor: '',
  primaryColor: '',
  secondaryColor: '',
  accentColor: '',
  sidebarTextColor: '',
};

export const getUserThemeLibraryStorageKey = (username?: string | null) =>
  `iau-user-theme-library:${username?.trim() || 'guest'}`;

export const extractUserThemeColors = (
  preferences: UserDisplayPreferences
): UserThemeColors => {
  const normalized = normalizeUserDisplayPreferences(preferences);
  return COLOR_KEYS.reduce<UserThemeColors>(
    (accumulator, key) => ({
      ...accumulator,
      [key]: normalized[key] || '',
    }),
    { ...EMPTY_USER_THEME_COLORS }
  );
};

export const mergeUserThemeColors = (
  preferences: UserDisplayPreferences,
  colors: Partial<UserThemeColors>
): UserDisplayPreferences =>
  normalizeUserDisplayPreferences({
    ...preferences,
    ...colors,
  });

const normalizeSavedTheme = (value: unknown): SavedUserTheme | null => {
  if (!value || typeof value !== 'object') return null;
  const input = value as Partial<SavedUserTheme>;
  const name = String(input.name || '').trim();
  const id = String(input.id || '').trim();
  const baseThemeId = String(input.baseThemeId || '').trim();
  if (!name || !id || !baseThemeId) return null;

  const normalizedColors = extractUserThemeColors(
    normalizeUserDisplayPreferences({
      ...DEFAULT_USER_DISPLAY_PREFERENCES,
      ...(input.colors || {}),
    })
  );

  const now = new Date().toISOString();
  return {
    id,
    name: name.slice(0, 60),
    baseThemeId,
    colors: normalizedColors,
    createdAt: String(input.createdAt || now),
    updatedAt: String(input.updatedAt || input.createdAt || now),
  };
};

export const loadUserThemeLibrary = (
  username?: string | null
): SavedUserTheme[] => {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(
      getUserThemeLibraryStorageKey(username)
    );
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeSavedTheme)
      .filter((item): item is SavedUserTheme => Boolean(item))
      .slice(0, 24);
  } catch {
    return [];
  }
};

export const saveUserThemeLibrary = (
  username: string | null | undefined,
  themes: SavedUserTheme[]
) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    getUserThemeLibraryStorageKey(username),
    JSON.stringify(themes.slice(0, 24))
  );
};

export const createSavedUserTheme = (
  name: string,
  baseThemeId: string,
  preferences: UserDisplayPreferences
): SavedUserTheme => {
  const now = new Date().toISOString();
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `theme-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    name: name.trim().slice(0, 60),
    baseThemeId,
    colors: extractUserThemeColors(preferences),
    createdAt: now,
    updatedAt: now,
  };
};
