import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

type AppearanceMode = 'light' | 'dark' | 'system';

type FontControlSettings = {
  fontFamily: string;
  baseFontSize: string;
  headingFontWeight: string;
  foreground: string;
  mutedForeground: string;
  cardForeground: string;
  sidebarForeground: string;
  primary: string;
};

const DEFAULT_THEME_ID = 'classic-blue';
const DEFAULT_MODE: AppearanceMode = 'light';

const getUserKey = (username?: string | null) => {
  const safeUser = username?.trim() || 'guest';

  return {
    theme: `iau-appearance-theme:${safeUser}`,
    mode: `iau-appearance-mode:${safeUser}`,
    font: `iau-appearance-font-controls:${safeUser}`,
  };
};

const variableNameMap: Record<string, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  sidebar: '--sidebar',
  sidebarForeground: '--sidebar-foreground',
  sidebarPrimary: '--sidebar-primary',
  sidebarPrimaryForeground: '--sidebar-primary-foreground',
  sidebarAccent: '--sidebar-accent',
  sidebarAccentForeground: '--sidebar-accent-foreground',
  sidebarBorder: '--sidebar-border',
  sidebarRing: '--sidebar-ring',
};

const themeVariables: Record<string, Record<string, string>> = {
  'classic-blue': {
    background: '48 65% 97%',
    foreground: '215 40% 18%',
    card: '0 0% 100%',
    cardForeground: '215 40% 18%',
    popover: '0 0% 100%',
    popoverForeground: '215 40% 18%',
    primary: '208 42% 30%',
    primaryForeground: '0 0% 100%',
    secondary: '206 38% 58%',
    secondaryForeground: '0 0% 100%',
    muted: '210 25% 94%',
    mutedForeground: '215 18% 45%',
    accent: '206 52% 66%',
    accentForeground: '215 40% 18%',
    border: '38 38% 82%',
    input: '38 38% 82%',
    ring: '206 52% 66%',
    destructive: '0 72% 51%',
    destructiveForeground: '0 0% 100%',
    sidebar: '208 42% 30%',
    sidebarForeground: '0 0% 100%',
    sidebarPrimary: '206 52% 66%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '206 45% 46%',
    sidebarAccentForeground: '0 0% 100%',
    sidebarBorder: '208 38% 38%',
    sidebarRing: '206 52% 66%',
  },
  'future-2060-dark': {
    background: '232 45% 6%',
    foreground: '210 100% 96%',
    card: '232 42% 9%',
    cardForeground: '210 100% 96%',
    popover: '232 42% 9%',
    popoverForeground: '210 100% 96%',
    primary: '190 100% 50%',
    primaryForeground: '232 45% 6%',
    secondary: '260 82% 58%',
    secondaryForeground: '210 100% 96%',
    muted: '230 30% 14%',
    mutedForeground: '215 35% 72%',
    accent: '263 96% 63%',
    accentForeground: '210 100% 96%',
    border: '221 70% 26%',
    input: '228 38% 15%',
    ring: '190 100% 50%',
    destructive: '350 89% 60%',
    destructiveForeground: '210 100% 96%',
    sidebar: '232 48% 7%',
    sidebarForeground: '210 100% 96%',
    sidebarPrimary: '190 100% 50%',
    sidebarPrimaryForeground: '232 45% 6%',
    sidebarAccent: '232 45% 13%',
    sidebarAccentForeground: '210 100% 96%',
    sidebarBorder: '221 70% 22%',
    sidebarRing: '190 100% 50%',
  },
  'pearl-aurora': {
    background: '210 100% 98%',
    foreground: '222 46% 20%',
    card: '0 0% 100%',
    cardForeground: '222 46% 20%',
    popover: '0 0% 100%',
    popoverForeground: '222 46% 20%',
    primary: '216 94% 58%',
    primaryForeground: '0 0% 100%',
    secondary: '263 92% 70%',
    secondaryForeground: '222 46% 20%',
    muted: '220 55% 95%',
    mutedForeground: '222 20% 45%',
    accent: '190 94% 67%',
    accentForeground: '222 46% 20%',
    border: '220 70% 88%',
    input: '220 70% 88%',
    ring: '216 94% 58%',
    destructive: '350 82% 58%',
    destructiveForeground: '0 0% 100%',
    sidebar: '218 100% 99%',
    sidebarForeground: '222 46% 22%',
    sidebarPrimary: '216 94% 58%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '216 100% 94%',
    sidebarAccentForeground: '216 94% 38%',
    sidebarBorder: '220 70% 88%',
    sidebarRing: '216 94% 58%',
  },
  'crystal-mint': {
    background: '170 65% 98%',
    foreground: '180 38% 18%',
    card: '0 0% 100%',
    cardForeground: '180 38% 18%',
    popover: '0 0% 100%',
    popoverForeground: '180 38% 18%',
    primary: '174 92% 35%',
    primaryForeground: '0 0% 100%',
    secondary: '171 72% 56%',
    secondaryForeground: '180 38% 14%',
    muted: '170 45% 94%',
    mutedForeground: '180 18% 42%',
    accent: '185 80% 62%',
    accentForeground: '180 38% 14%',
    border: '174 45% 84%',
    input: '174 45% 84%',
    ring: '174 92% 35%',
    destructive: '350 82% 58%',
    destructiveForeground: '0 0% 100%',
    sidebar: '170 65% 99%',
    sidebarForeground: '180 38% 20%',
    sidebarPrimary: '174 92% 35%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '171 70% 92%',
    sidebarAccentForeground: '174 92% 26%',
    sidebarBorder: '174 45% 84%',
    sidebarRing: '174 92% 35%',
  },
  'sky-glass': {
    background: '207 100% 97%',
    foreground: '220 55% 22%',
    card: '0 0% 100%',
    cardForeground: '220 55% 22%',
    popover: '0 0% 100%',
    popoverForeground: '220 55% 22%',
    primary: '214 84% 56%',
    primaryForeground: '0 0% 100%',
    secondary: '198 90% 66%',
    secondaryForeground: '220 55% 18%',
    muted: '207 70% 94%',
    mutedForeground: '220 22% 45%',
    accent: '198 95% 61%',
    accentForeground: '220 55% 18%',
    border: '207 68% 86%',
    input: '207 68% 86%',
    ring: '214 84% 56%',
    destructive: '350 82% 58%',
    destructiveForeground: '0 0% 100%',
    sidebar: '207 100% 99%',
    sidebarForeground: '220 55% 24%',
    sidebarPrimary: '214 84% 56%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '207 95% 93%',
    sidebarAccentForeground: '214 84% 38%',
    sidebarBorder: '207 68% 86%',
    sidebarRing: '214 84% 56%',
  },
  'solar-rose-tech': {
    background: '28 100% 98%',
    foreground: '18 32% 20%',
    card: '0 0% 100%',
    cardForeground: '18 32% 20%',
    popover: '0 0% 100%',
    popoverForeground: '18 32% 20%',
    primary: '350 75% 58%',
    primaryForeground: '0 0% 100%',
    secondary: '29 82% 74%',
    secondaryForeground: '18 32% 20%',
    muted: '30 70% 95%',
    mutedForeground: '18 18% 45%',
    accent: '335 88% 72%',
    accentForeground: '18 32% 20%',
    border: '28 62% 86%',
    input: '28 62% 86%',
    ring: '350 75% 58%',
    destructive: '350 82% 58%',
    destructiveForeground: '0 0% 100%',
    sidebar: '28 100% 99%',
    sidebarForeground: '18 32% 22%',
    sidebarPrimary: '350 75% 58%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '350 85% 94%',
    sidebarAccentForeground: '350 75% 40%',
    sidebarBorder: '28 62% 86%',
    sidebarRing: '350 75% 58%',
  },
};

const hexToHsl = (hex: string) => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

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

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const applyMode = (mode: AppearanceMode) => {
  const root = document.documentElement;
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = mode === 'dark' || (mode === 'system' && systemDark);

  root.classList.toggle('dark', shouldUseDark);
  root.dataset.appearanceMode = mode;
};

const applyThemeVariables = (themeId: string) => {
  const root = document.documentElement;
  const variables = themeVariables[themeId] || themeVariables[DEFAULT_THEME_ID];

  Object.entries(variables).forEach(([key, value]) => {
    const cssVariable = variableNameMap[key];
    if (cssVariable) root.style.setProperty(cssVariable, value);
  });

  root.dataset.appearanceTheme = themeId;
};

const applyFontControls = (settings: FontControlSettings) => {
  const root = document.documentElement;

  root.style.setProperty('--app-font-family', settings.fontFamily);
  root.style.setProperty('--app-base-font-size', settings.baseFontSize);
  root.style.setProperty('--app-heading-font-weight', settings.headingFontWeight);

  const foreground = hexToHsl(settings.foreground);
  const mutedForeground = hexToHsl(settings.mutedForeground);
  const cardForeground = hexToHsl(settings.cardForeground);
  const sidebarForeground = hexToHsl(settings.sidebarForeground);
  const primary = hexToHsl(settings.primary);

  if (foreground) root.style.setProperty('--foreground', foreground);
  if (mutedForeground) root.style.setProperty('--muted-foreground', mutedForeground);
  if (cardForeground) root.style.setProperty('--card-foreground', cardForeground);
  if (sidebarForeground) root.style.setProperty('--sidebar-foreground', sidebarForeground);

  if (primary) {
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--ring', primary);
    root.style.setProperty('--sidebar-primary', primary);
  }

  root.dataset.customFontColors = 'enabled';
};

const injectGlobalThemeStyles = () => {
  const styleId = 'iau-future-2060-theme-style';

  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    :root {
      --app-font-family: Tajawal, Arial, sans-serif;
      --app-base-font-size: 15px;
      --app-heading-font-weight: 700;
    }

    body {
      font-family: var(--app-font-family) !important;
      font-size: var(--app-base-font-size) !important;
      transition: background 350ms ease, color 350ms ease;
    }

    h1, h2, h3, h4, h5, h6, .font-bold {
      font-weight: var(--app-heading-font-weight) !important;
    }

    html[data-appearance-theme] body {
      background: hsl(var(--background)) !important;
    }

    html[data-appearance-theme]:not([data-appearance-theme="classic-blue"]) body {
      background:
        radial-gradient(circle at 16% 12%, hsl(var(--primary) / 0.14), transparent 28%),
        radial-gradient(circle at 86% 18%, hsl(var(--secondary) / 0.12), transparent 32%),
        linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted) / 0.45)) !important;
    }

    html[data-appearance-theme] .future-glow-card,
    html[data-appearance-theme]:not([data-appearance-theme="classic-blue"]) .card,
    html[data-appearance-theme]:not([data-appearance-theme="classic-blue"]) [class*="bg-card"] {
      border-color: hsl(var(--primary) / 0.20);
      box-shadow: 0 14px 45px hsl(var(--primary) / 0.10);
      backdrop-filter: blur(16px);
    }

    html[data-appearance-theme="future-2060-dark"] body {
      background:
        radial-gradient(circle at 15% 15%, rgba(124, 77, 255, 0.20), transparent 34%),
        radial-gradient(circle at 80% 20%, rgba(0, 229, 255, 0.12), transparent 30%),
        #080B1A !important;
    }
  `;
  document.head.appendChild(style);
};

export const ThemeInitializer: React.FC = () => {
  const { username } = useAuth();

  useEffect(() => {
    injectGlobalThemeStyles();

    const keys = getUserKey(username);
    const themeId = localStorage.getItem(keys.theme) || DEFAULT_THEME_ID;
    const mode = (localStorage.getItem(keys.mode) as AppearanceMode) || DEFAULT_MODE;

    applyThemeVariables(themeId);
    applyMode(mode);

    try {
      const storedFont = localStorage.getItem(keys.font);

      if (storedFont) {
        applyFontControls(JSON.parse(storedFont));
      }
    } catch {
      // تجاهل القيم التالفة في localStorage
    }
  }, [username]);

  return null;
};
