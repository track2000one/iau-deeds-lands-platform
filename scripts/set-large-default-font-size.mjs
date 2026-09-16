import fs from 'node:fs';

const prefsPath = 'src/app/theme/userDisplayPreferences.ts';
const pagePath = 'src/app/pages/AppearanceSettingsPage.tsx';

let prefs = fs.readFileSync(prefsPath, 'utf8');
let page = fs.readFileSync(pagePath, 'utf8');

const replaceOnce = (source, from, to, label) => {
  if (source.includes(to)) return source;
  if (!source.includes(from)) {
    throw new Error(`Could not find patch target: ${label}`);
  }
  return source.replace(from, to);
};

prefs = replaceOnce(
  prefs,
  "export const DISPLAY_FONT_SIZE_MIN = 13;\nexport const DISPLAY_FONT_SIZE_MAX = 22;",
  "export const DISPLAY_FONT_SIZE_MIN = 13;\nexport const DISPLAY_FONT_SIZE_MAX = 22;\nexport const DISPLAY_FONT_SIZE_DEFAULT = 18;",
  'font size constants'
);

prefs = replaceOnce(
  prefs,
  "  baseFontSize: '15px',",
  "  baseFontSize: `${DISPLAY_FONT_SIZE_DEFAULT}px`,",
  'default base font size'
);

prefs = replaceOnce(
  prefs,
  "    : 15;\n  return `${safe}px`;",
  "    : DISPLAY_FONT_SIZE_DEFAULT;\n  return `${safe}px`;",
  'font normalization fallback'
);

prefs = replaceOnce(
  prefs,
  "export const getUserDisplayPreferencesStorageKey = (\n  username?: string | null\n) => `iau-appearance-font-controls:${username?.trim() || 'guest'}`;",
  "export const getUserDisplayPreferencesStorageKey = (\n  username?: string | null\n) => `iau-appearance-font-controls:${username?.trim() || 'guest'}`;\n\nconst getLargeDefaultFontMigrationKey = (username?: string | null) =>\n  `${getUserDisplayPreferencesStorageKey(username)}:large-default-v1`;",
  'migration key'
);

prefs = replaceOnce(
  prefs,
  "    if (!stored) return { ...DEFAULT_USER_DISPLAY_PREFERENCES };\n    return normalizeUserDisplayPreferences(JSON.parse(stored));",
  "    if (!stored) return { ...DEFAULT_USER_DISPLAY_PREFERENCES };\n\n    const normalized = normalizeUserDisplayPreferences(JSON.parse(stored));\n    const migrationKey = getLargeDefaultFontMigrationKey(username);\n    const alreadyMigrated = window.localStorage.getItem(migrationKey) === '1';\n\n    // Upgrade the former 15px default once for existing accounts. After this\n    // migration, users can still deliberately choose 15px and it will persist.\n    if (!alreadyMigrated && normalized.baseFontSize === '15px') {\n      const upgraded = {\n        ...normalized,\n        baseFontSize: `${DISPLAY_FONT_SIZE_DEFAULT}px`,\n      };\n      window.localStorage.setItem(\n        getUserDisplayPreferencesStorageKey(username),\n        JSON.stringify(upgraded)\n      );\n      window.localStorage.setItem(migrationKey, '1');\n      return upgraded;\n    }\n\n    if (!alreadyMigrated) {\n      window.localStorage.setItem(migrationKey, '1');\n    }\n\n    return normalized;",
  'legacy default migration'
);

page = replaceOnce(
  page,
  "  DISPLAY_FONT_SIZE_MAX,\n  DISPLAY_FONT_SIZE_MIN,",
  "  DISPLAY_FONT_SIZE_DEFAULT,\n  DISPLAY_FONT_SIZE_MAX,\n  DISPLAY_FONT_SIZE_MIN,",
  'default font size import'
);

page = replaceOnce(
  page,
  "  const fontSize = Number.parseInt(displayPreferences.baseFontSize, 10) || 15;",
  "  const fontSize = Number.parseInt(displayPreferences.baseFontSize, 10) || DISPLAY_FONT_SIZE_DEFAULT;",
  'appearance slider fallback'
);

page = replaceOnce(
  page,
  "                <span>افتراضي 15px</span>",
  "                <span>افتراضي 18px — كبير</span>",
  'appearance slider default label'
);

fs.writeFileSync(prefsPath, prefs);
fs.writeFileSync(pagePath, page);
console.log('Large default font size set to 18px with one-time migration from the former 15px default.');
