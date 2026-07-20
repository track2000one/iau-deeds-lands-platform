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

const DEFAULT_THEME_ID = 'official-classic-navy';
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

const officialClassicNavyVariables: Record<string, string> = {
  background: '48 65% 97%',
  foreground: '211 56% 18%',
  card: '0 0% 100%',
  cardForeground: '211 56% 18%',
  popover: '0 0% 100%',
  popoverForeground: '211 56% 18%',
  primary: '208 52% 28%',
  primaryForeground: '0 0% 100%',
  secondary: '207 36% 48%',
  secondaryForeground: '0 0% 100%',
  muted: '42 34% 94%',
  mutedForeground: '213 20% 45%',
  accent: '207 46% 58%',
  accentForeground: '0 0% 100%',
  border: '38 34% 82%',
  input: '38 34% 82%',
  ring: '207 46% 58%',
  destructive: '350 82% 42%',
  destructiveForeground: '0 0% 100%',
  sidebar: '208 52% 28%',
  sidebarForeground: '0 0% 100%',
  sidebarPrimary: '207 46% 58%',
  sidebarPrimaryForeground: '0 0% 100%',
  sidebarAccent: '208 44% 38%',
  sidebarAccentForeground: '0 0% 100%',
  sidebarBorder: '208 38% 38%',
  sidebarRing: '207 46% 58%',
};

const defaultFontControls: FontControlSettings = {
  fontFamily: 'Tajawal, Arial, sans-serif',
  baseFontSize: '15px',
  headingFontWeight: '700',
  foreground: '#17395B',
  mutedForeground: '#667085',
  cardForeground: '#17395B',
  sidebarForeground: '#FFFFFF',
  primary: '#2C4F73',
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

const applyThemeVariables = () => {
  const root = document.documentElement;

  Object.entries(officialClassicNavyVariables).forEach(([key, value]) => {
    const cssVariable = variableNameMap[key];
    if (cssVariable) root.style.setProperty(cssVariable, value);
  });

  root.dataset.appearanceTheme = DEFAULT_THEME_ID;
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
  if (sidebarForeground) {
    root.style.setProperty('--sidebar-foreground', sidebarForeground);
    root.style.setProperty('--sidebar-accent-foreground', sidebarForeground);
  }

  if (primary) {
    root.style.setProperty('--primary', primary);
    root.style.setProperty('--ring', primary);
    root.style.setProperty('--sidebar-primary', primary);
  }

  root.dataset.customFontColors = 'enabled';
};

const injectOfficialClassicStyles = () => {
  const styleId = 'iau-official-classic-navy-theme';

  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    :root {
      --app-font-family: Tajawal, Arial, sans-serif;
      --app-base-font-size: 15px;
      --app-heading-font-weight: 700;
    }

    html[data-appearance-theme="official-classic-navy"] body {
      font-family: var(--app-font-family) !important;
      font-size: var(--app-base-font-size) !important;
      background:
        radial-gradient(circle at 12% 10%, rgba(44, 79, 115, 0.06), transparent 26%),
        linear-gradient(180deg, #fcfaf1 0%, #f8f4e7 100%) !important;
      color: hsl(var(--foreground)) !important;
    }

    html[data-appearance-theme="official-classic-navy"] h1,
    html[data-appearance-theme="official-classic-navy"] h2,
    html[data-appearance-theme="official-classic-navy"] h3,
    html[data-appearance-theme="official-classic-navy"] h4,
    html[data-appearance-theme="official-classic-navy"] .font-bold,
    html[data-appearance-theme="official-classic-navy"] .font-semibold {
      font-weight: var(--app-heading-font-weight) !important;
      color: hsl(var(--primary)) !important;
    }

    html[data-appearance-theme="official-classic-navy"] header {
      background: linear-gradient(180deg, #315a83 0%, #244a70 100%) !important;
      color: #ffffff !important;
      box-shadow: 0 2px 8px rgba(22, 43, 64, 0.26);
    }

    html[data-appearance-theme="official-classic-navy"] [data-sidebar],
    html[data-appearance-theme="official-classic-navy"] aside {
      background: linear-gradient(180deg, #2c557e 0%, #244a70 100%) !important;
      color: #ffffff !important;
      border-color: rgba(255,255,255,0.12) !important;
    }

    html[data-appearance-theme="official-classic-navy"] [data-sidebar] *,
    html[data-appearance-theme="official-classic-navy"] aside * {
      color: #ffffff !important;
    }

    html[data-appearance-theme="official-classic-navy"] [data-sidebar] button[data-state="active"],
    html[data-appearance-theme="official-classic-navy"] aside button.bg-sidebar-accent,
    html[data-appearance-theme="official-classic-navy"] aside .bg-sidebar-accent {
      background: rgba(255, 255, 255, 0.15) !important;
      border-radius: 10px;
    }

    html[data-appearance-theme="official-classic-navy"] .bg-card,
    html[data-appearance-theme="official-classic-navy"] [class*="bg-card"] {
      background: rgba(255, 255, 255, 0.96) !important;
      border-color: #d9cdb6 !important;
      color: hsl(var(--card-foreground)) !important;
      box-shadow: 0 1px 2px rgba(37, 59, 84, 0.05);
    }

    html[data-appearance-theme="official-classic-navy"] .border,
    html[data-appearance-theme="official-classic-navy"] [class*="border-"] {
      border-color: #d9cdb6;
    }

    html[data-appearance-theme="official-classic-navy"] .text-muted-foreground {
      color: #667085 !important;
    }

    html[data-appearance-theme="official-classic-navy"] button.bg-primary,
    html[data-appearance-theme="official-classic-navy"] .bg-primary {
      background: #2c4f73 !important;
      color: #ffffff !important;
    }

    html[data-appearance-theme="official-classic-navy"] button.bg-destructive,
    html[data-appearance-theme="official-classic-navy"] .bg-destructive {
      background: #c40028 !important;
      color: #ffffff !important;
    }

    html[data-appearance-theme="official-classic-navy"] [role="dialog"] {
      background: #ffffff !important;
      color: #17395b !important;
      border: 1px solid #e5dcc9 !important;
      box-shadow: 0 20px 50px rgba(24, 39, 55, 0.22) !important;
      border-radius: 18px !important;
    }

    html[data-appearance-theme="official-classic-navy"] [role="dialog"] h2,
    html[data-appearance-theme="official-classic-navy"] [role="dialog"] h3 {
      color: #17395b !important;
    }

    html[data-appearance-theme="official-classic-navy"] input,
    html[data-appearance-theme="official-classic-navy"] select,
    html[data-appearance-theme="official-classic-navy"] textarea {
      background: #ffffff !important;
      color: #17395b !important;
      border-color: #d9cdb6 !important;
    }

    html[data-appearance-theme="official-classic-navy"] .official-card-accent-red {
      border-right: 4px solid #c40028 !important;
    }

    html[data-appearance-theme="official-classic-navy"] .official-card-accent-blue {
      border-right: 4px solid #2c4f73 !important;
    }

    /* ============================================================
       إصلاح شفافية نافذة تسجيل الخروج / جميع النوافذ المنبثقة
       ============================================================ */

    html[data-appearance-theme="official-classic-navy"] [data-radix-dialog-overlay],
    html[data-appearance-theme="official-classic-navy"] .fixed.inset-0.bg-black\/80,
    html[data-appearance-theme="official-classic-navy"] .fixed.inset-0.z-50 {
      background: rgba(15, 23, 42, 0.55) !important;
      backdrop-filter: blur(3px) !important;
    }

    html[data-appearance-theme="official-classic-navy"] [role="dialog"],
    html[data-appearance-theme="official-classic-navy"] [data-radix-dialog-content],
    html[data-appearance-theme="official-classic-navy"] .fixed.left-\[50\%\].top-\[50\%\] {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #17395b !important;
      opacity: 1 !important;
      border: 1px solid #e5dcc9 !important;
      box-shadow: 0 24px 70px rgba(24, 39, 55, 0.28) !important;
      border-radius: 18px !important;
      backdrop-filter: none !important;
    }

    html[data-appearance-theme="official-classic-navy"] [role="dialog"] *,
    html[data-appearance-theme="official-classic-navy"] [data-radix-dialog-content] * {
      color: inherit;
    }

    html[data-appearance-theme="official-classic-navy"] [role="dialog"] h2,
    html[data-appearance-theme="official-classic-navy"] [role="dialog"] h3,
    html[data-appearance-theme="official-classic-navy"] [role="dialog"] [data-radix-dialog-title] {
      color: #17395b !important;
      font-weight: 700 !important;
    }

    html[data-appearance-theme="official-classic-navy"] [role="dialog"] p,
    html[data-appearance-theme="official-classic-navy"] [role="dialog"] [data-radix-dialog-description] {
      color: #667085 !important;
    }

    html[data-appearance-theme="official-classic-navy"] [role="dialog"] button.bg-destructive,
    html[data-appearance-theme="official-classic-navy"] [role="dialog"] .bg-destructive {
      background: #c40028 !important;
      background-color: #c40028 !important;
      color: #ffffff !important;
      border-color: #c40028 !important;
      opacity: 1 !important;
    }

    html[data-appearance-theme="official-classic-navy"] [role="dialog"] button:not(.bg-destructive) {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #17395b !important;
      border-color: #d9cdb6 !important;
      opacity: 1 !important;
    }

    html[data-appearance-theme="official-classic-navy"] [role="dialog"] button:hover:not(.bg-destructive) {
      background: #f8f4e7 !important;
      color: #17395b !important;
    }

  `;

  document.head.appendChild(style);
};

export const ThemeInitializer: React.FC = () => {
  const { username } = useAuth();

  useEffect(() => {
    injectOfficialClassicStyles();

    const keys = getUserKey(username);
    const savedTheme = localStorage.getItem(keys.theme) || DEFAULT_THEME_ID;
    const savedMode = (localStorage.getItem(keys.mode) as AppearanceMode) || DEFAULT_MODE;

    // هذا الثيم يبقى افتراضيًا رسميًا، ولا يتأثر بباقي المستخدمين
    if (savedTheme === DEFAULT_THEME_ID || !savedTheme) {
      applyThemeVariables();
    }

    applyMode(savedMode);

    try {
      const storedFont = localStorage.getItem(keys.font);
      applyFontControls(storedFont ? JSON.parse(storedFont) : defaultFontControls);
    } catch {
      applyFontControls(defaultFontControls);
    }
  }, [username]);

  return null;
};
