import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

type AppearanceMode = 'light' | 'dark';

type ThemeId =
  | 'future-neon-dark'
  | 'future-glass-light'
  | 'official-classic-navy';

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

const DEFAULT_THEME_ID: ThemeId = 'future-glass-light';
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

const themeVariables: Record<ThemeId, Record<string, string>> = {
  'future-neon-dark': {
    background: '231 56% 6%',
    foreground: '214 100% 96%',
    card: '230 48% 9%',
    cardForeground: '214 100% 96%',
    popover: '230 48% 9%',
    popoverForeground: '214 100% 96%',
    primary: '191 100% 50%',
    primaryForeground: '230 55% 7%',
    secondary: '258 92% 63%',
    secondaryForeground: '214 100% 96%',
    muted: '229 35% 15%',
    mutedForeground: '219 34% 74%',
    accent: '267 94% 63%',
    accentForeground: '214 100% 96%',
    border: '218 80% 28%',
    input: '229 34% 16%',
    ring: '191 100% 50%',
    destructive: '348 84% 54%',
    destructiveForeground: '0 0% 100%',
    sidebar: '230 58% 7%',
    sidebarForeground: '214 100% 96%',
    sidebarPrimary: '191 100% 50%',
    sidebarPrimaryForeground: '230 55% 7%',
    sidebarAccent: '230 42% 14%',
    sidebarAccentForeground: '214 100% 96%',
    sidebarBorder: '218 80% 26%',
    sidebarRing: '191 100% 50%',
  },
  'future-glass-light': {
    background: '220 100% 99%',
    foreground: '231 50% 24%',
    card: '0 0% 100%',
    cardForeground: '231 50% 24%',
    popover: '0 0% 100%',
    popoverForeground: '231 50% 24%',
    primary: '222 100% 63%',
    primaryForeground: '0 0% 100%',
    secondary: '262 100% 70%',
    secondaryForeground: '0 0% 100%',
    muted: '226 90% 96%',
    mutedForeground: '231 20% 48%',
    accent: '189 95% 65%',
    accentForeground: '231 50% 20%',
    border: '229 80% 90%',
    input: '229 80% 90%',
    ring: '222 100% 63%',
    destructive: '348 84% 54%',
    destructiveForeground: '0 0% 100%',
    sidebar: '0 0% 100%',
    sidebarForeground: '231 50% 26%',
    sidebarPrimary: '222 100% 63%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '229 100% 97%',
    sidebarAccentForeground: '222 100% 48%',
    sidebarBorder: '229 80% 90%',
    sidebarRing: '222 100% 63%',
  },
  'official-classic-navy': {
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
  },
};

const defaultFontControls: FontControlSettings = {
  fontFamily: 'Tajawal, Cairo, Arial, sans-serif',
  baseFontSize: '15px',
  headingFontWeight: '800',
  foreground: '#24315F',
  mutedForeground: '#667085',
  cardForeground: '#24315F',
  sidebarForeground: '#24315F',
  primary: '#3F7CFF',
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

  root.classList.toggle('dark', mode === 'dark');
  root.dataset.appearanceMode = mode;
};

const applyThemeVariables = (themeId: ThemeId) => {
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

const injectFutureStyles = () => {
  const styleId = 'iau-future-platform-theme';

  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    :root {
      --app-font-family: Tajawal, Cairo, Arial, sans-serif;
      --app-base-font-size: 15px;
      --app-heading-font-weight: 800;
      --future-radius: 22px;
    }

    body {
      font-family: var(--app-font-family) !important;
      font-size: var(--app-base-font-size) !important;
      color: hsl(var(--foreground)) !important;
      transition: background 300ms ease, color 300ms ease;
    }

    h1, h2, h3, h4, h5, h6, .font-bold, .font-semibold {
      font-weight: var(--app-heading-font-weight) !important;
    }

    html[data-appearance-theme="future-neon-dark"] body {
      background:
        radial-gradient(circle at 18% 10%, rgba(124, 77, 255, 0.26), transparent 34%),
        radial-gradient(circle at 80% 15%, rgba(0, 229, 255, 0.18), transparent 30%),
        radial-gradient(circle at 50% 90%, rgba(0, 248, 181, 0.10), transparent 34%),
        #060A1F !important;
    }

    html[data-appearance-theme="future-glass-light"] body {
      background:
        radial-gradient(circle at 20% 10%, rgba(90, 145, 255, 0.13), transparent 28%),
        radial-gradient(circle at 82% 18%, rgba(174, 110, 255, 0.12), transparent 30%),
        linear-gradient(180deg, #ffffff 0%, #f7faff 100%) !important;
    }

    html[data-appearance-theme="official-classic-navy"] body {
      background:
        radial-gradient(circle at 12% 10%, rgba(44, 79, 115, 0.06), transparent 26%),
        linear-gradient(180deg, #fcfaf1 0%, #f8f4e7 100%) !important;
    }

    .future-app-shell { background: transparent; }

    .future-topbar {
      border-bottom: 1px solid hsl(var(--border) / 0.55);
      backdrop-filter: blur(20px);
      position: relative;
      isolation: isolate;
    }

    html[data-appearance-theme="future-neon-dark"] .future-topbar {
      background:
        linear-gradient(90deg, rgba(3, 9, 28, 0.96), rgba(11, 20, 58, 0.88), rgba(3, 9, 28, 0.96)) !important;
      box-shadow: 0 0 35px rgba(0, 229, 255, 0.12);
    }

    html[data-appearance-theme="future-glass-light"] .future-topbar {
      background: rgba(255, 255, 255, 0.78) !important;
      box-shadow: 0 12px 40px rgba(65, 105, 225, 0.08);
    }

    .future-sidebar {
      backdrop-filter: blur(24px);
      position: relative;
      overflow: hidden;
    }

    html[data-appearance-theme="future-neon-dark"] .future-sidebar {
      background:
        linear-gradient(180deg, rgba(7, 13, 38, 0.96), rgba(6, 10, 31, 0.98)) !important;
      border-color: rgba(0, 229, 255, 0.18) !important;
      box-shadow: inset 0 0 24px rgba(0, 229, 255, 0.08), 0 0 45px rgba(0, 0, 0, 0.45);
    }

    html[data-appearance-theme="future-glass-light"] .future-sidebar {
      background: rgba(255, 255, 255, 0.82) !important;
      border-color: rgba(120, 145, 255, 0.24) !important;
      box-shadow: inset 0 0 28px rgba(121, 155, 255, 0.10), 0 20px 50px rgba(80, 96, 160, 0.10);
    }

    .future-nav-item {
      border: 1px solid transparent !important;
      transition: all 250ms ease !important;
      border-radius: 16px !important;
    }

    html[data-appearance-theme="future-neon-dark"] .future-nav-item:hover,
    html[data-appearance-theme="future-neon-dark"] .future-nav-item.is-active {
      background: linear-gradient(90deg, rgba(0, 229, 255, 0.14), rgba(124, 77, 255, 0.18)) !important;
      border-color: rgba(0, 229, 255, 0.35) !important;
      box-shadow: 0 0 26px rgba(0, 229, 255, 0.18), inset 0 0 18px rgba(124, 77, 255, 0.12);
      color: #eaf8ff !important;
    }

    html[data-appearance-theme="future-glass-light"] .future-nav-item:hover,
    html[data-appearance-theme="future-glass-light"] .future-nav-item.is-active {
      background: linear-gradient(90deg, rgba(63, 124, 255, 0.09), rgba(184, 125, 255, 0.10)) !important;
      border-color: rgba(63, 124, 255, 0.22) !important;
      box-shadow: 0 10px 26px rgba(63, 124, 255, 0.12);
      color: #3759d7 !important;
    }

    .future-card {
      border-radius: var(--future-radius) !important;
      border: 1px solid hsl(var(--border) / 0.72) !important;
      backdrop-filter: blur(18px);
      position: relative;
      overflow: hidden;
      transition: transform 260ms ease, box-shadow 260ms ease, border-color 260ms ease;
    }

    .future-card:hover { transform: translateY(-2px); }

    html[data-appearance-theme="future-neon-dark"] .future-card {
      background:
        linear-gradient(180deg, rgba(18, 28, 68, 0.66), rgba(8, 14, 38, 0.82)) !important;
      box-shadow: 0 0 34px rgba(0, 229, 255, 0.08), inset 0 0 18px rgba(124, 77, 255, 0.07);
    }

    html[data-appearance-theme="future-neon-dark"] .future-card:hover {
      border-color: rgba(0, 229, 255, 0.42) !important;
      box-shadow: 0 0 40px rgba(0, 229, 255, 0.18), inset 0 0 24px rgba(124, 77, 255, 0.10);
    }

    html[data-appearance-theme="future-glass-light"] .future-card {
      background: rgba(255, 255, 255, 0.76) !important;
      box-shadow: 0 18px 45px rgba(80, 96, 160, 0.10);
    }

    html[data-appearance-theme="future-glass-light"] .future-card:hover {
      border-color: rgba(63, 124, 255, 0.26) !important;
      box-shadow: 0 22px 60px rgba(80, 96, 160, 0.16);
    }

    .future-card::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 18% 10%, hsl(var(--primary) / 0.12), transparent 24%),
        radial-gradient(circle at 88% 18%, hsl(var(--secondary) / 0.10), transparent 24%);
      opacity: 0.75;
    }

    .future-card > * {
      position: relative;
      z-index: 1;
    }

    .future-stat-icon {
      display: grid;
      place-items: center;
      border-radius: 18px;
      box-shadow: 0 0 24px hsl(var(--primary) / 0.22);
    }

    .future-glow-button {
      border-radius: 16px !important;
      border: 1px solid hsl(var(--primary) / 0.30) !important;
      box-shadow: 0 0 24px hsl(var(--primary) / 0.20);
      transition: all 220ms ease !important;
    }

    .future-glow-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 34px hsl(var(--primary) / 0.34);
    }

    .future-hero-art {
      min-height: 260px;
      border-radius: 26px;
      overflow: hidden;
      border: 1px solid hsl(var(--primary) / 0.24);
      background:
        radial-gradient(circle at 50% 65%, hsl(var(--primary) / 0.36), transparent 18%),
        radial-gradient(circle at 50% 65%, hsl(var(--secondary) / 0.20), transparent 34%),
        linear-gradient(135deg, hsl(var(--card) / 0.82), hsl(var(--muted) / 0.42));
      position: relative;
    }

    .future-hero-art::before {
      content: "";
      position: absolute;
      inset: 18%;
      border-radius: 28px;
      border: 1px solid hsl(var(--primary) / 0.36);
      box-shadow: 0 0 38px hsl(var(--primary) / 0.26), inset 0 0 24px hsl(var(--secondary) / 0.18);
      transform: perspective(700px) rotateX(14deg) rotateY(-8deg);
    }

    .future-hero-art::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: 36px;
      width: 190px;
      height: 38px;
      transform: translateX(-50%);
      border-radius: 999px;
      background: hsl(var(--primary) / 0.30);
      filter: blur(18px);
    }

    .future-shield {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: hsl(var(--primary));
      filter: drop-shadow(0 0 22px hsl(var(--primary) / 0.65));
    }

    html[data-appearance-theme] [role="dialog"],
    html[data-appearance-theme] [data-radix-dialog-content] {
      background: hsl(var(--popover)) !important;
      color: hsl(var(--popover-foreground)) !important;
      opacity: 1 !important;
      border: 1px solid hsl(var(--border)) !important;
      box-shadow: 0 24px 70px rgba(24, 39, 55, 0.28) !important;
      border-radius: 18px !important;
      backdrop-filter: none !important;
    }

    html[data-appearance-theme] [data-radix-dialog-overlay] {
      background: rgba(15, 23, 42, 0.58) !important;
      backdrop-filter: blur(4px) !important;
    }


    .future-app-shell {
      width: 100%;
      min-width: 0;
      background: transparent;
    }

    .future-app-shell main,
    .future-app-shell main > div {
      min-width: 0;
      width: 100%;
      max-width: none !important;
    }

    .future-sidebar {
      flex-shrink: 0;
    }

    .future-card {
      min-width: 0;
    }

    .future-card > * {
      position: relative;
      z-index: 1;
    }

    .future-topbar > div {
      width: 100%;
    }

    @media (min-width: 1536px) {
      .future-card {
        border-radius: 20px !important;
      }
    }

    @media (max-width: 1279px) {
      .future-card {
        border-radius: 17px !important;
      }
    }

    @media (max-width: 767px) {
      :root {
        --future-radius: 15px;
      }

      .future-card:hover,
      .future-glow-button:hover {
        transform: none;
      }

      .future-hero-art {
        min-height: 210px;
      }
    }

    @media (max-width: 768px) {
      .future-card { border-radius: 18px !important; }
    }
  `;

  document.head.appendChild(style);
};

export const ThemeInitializer: React.FC = () => {
  const { username } = useAuth();

  useEffect(() => {
    injectFutureStyles();

    const keys = getUserKey(username);
    const savedTheme = (localStorage.getItem(keys.theme) as ThemeId) || DEFAULT_THEME_ID;
    const normalizedTheme: ThemeId = themeVariables[savedTheme] ? savedTheme : DEFAULT_THEME_ID;
    const savedMode = (localStorage.getItem(keys.mode) as AppearanceMode) || (normalizedTheme === 'future-neon-dark' ? 'dark' : DEFAULT_MODE);

    applyThemeVariables(normalizedTheme);
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
