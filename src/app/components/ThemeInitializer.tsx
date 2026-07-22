import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  DEFAULT_THEME_ID,
  applyAppearanceTheme,
  getThemeById,
} from '../theme/appearanceThemes';

type FontControlSettings = {
  fontFamily: string;
  baseFontSize: string;
  headingFontWeight: string;
  foreground?: string;
  mutedForeground?: string;
  cardForeground?: string;
  sidebarForeground?: string;
  primary?: string;
};

const getUserKey = (username?: string | null) => {
  const safeUser = username?.trim() || 'guest';

  return {
    theme: `iau-appearance-theme:${safeUser}`,
    mode: `iau-appearance-mode:${safeUser}`,
    font: `iau-appearance-font-controls:${safeUser}`,
  };
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

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(
    l * 100
  )}%`;
};

const applyFontControls = (settings: FontControlSettings) => {
  const root = document.documentElement;

  root.style.setProperty(
    '--app-font-family',
    settings.fontFamily || 'Tajawal, Cairo, Arial, sans-serif'
  );
  root.style.setProperty(
    '--app-base-font-size',
    settings.baseFontSize || '15px'
  );
  root.style.setProperty(
    '--app-heading-font-weight',
    settings.headingFontWeight || '800'
  );

  const optionalColors = [
    ['--foreground', settings.foreground],
    ['--muted-foreground', settings.mutedForeground],
    ['--card-foreground', settings.cardForeground],
    ['--sidebar-foreground', settings.sidebarForeground],
    ['--primary', settings.primary],
  ] as const;

  optionalColors.forEach(([variable, color]) => {
    if (!color) return;
    const hsl = hexToHsl(color);
    if (hsl) root.style.setProperty(variable, hsl);
  });

  if (settings.sidebarForeground) {
    const sidebar = hexToHsl(settings.sidebarForeground);
    if (sidebar) {
      root.style.setProperty('--sidebar-accent-foreground', sidebar);
    }
  }

  if (settings.primary) {
    const primary = hexToHsl(settings.primary);
    if (primary) {
      root.style.setProperty('--ring', primary);
      root.style.setProperty('--sidebar-primary', primary);
    }
  }
};

const injectAppearanceStyles = () => {
  const oldStyle = document.getElementById('iau-future-platform-theme');
  oldStyle?.remove();

  const styleId = 'iau-modern-appearance-themes';
  document.getElementById(styleId)?.remove();

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    :root {
      --app-font-family: Tajawal, Cairo, Arial, sans-serif;
      --app-base-font-size: 15px;
      --app-heading-font-weight: 800;
      --future-radius: 22px;
      --appearance-body-bg: linear-gradient(180deg, #ffffff, #f7faff);
      --appearance-glass: rgba(255,255,255,.74);
      --appearance-glass-strong: rgba(255,255,255,.90);
      --appearance-glass-border: rgba(109,139,240,.24);
      --appearance-glow: rgba(63,124,255,.22);
      --appearance-glow-secondary: rgba(184,125,255,.17);
      --appearance-card-shadow: 0 20px 55px rgba(67,83,145,.14);
      --appearance-topbar: rgba(255,255,255,.84);
      --appearance-sidebar: rgba(255,255,255,.88);
    }

    body {
      font-family: var(--app-font-family) !important;
      font-size: var(--app-base-font-size) !important;
      color: hsl(var(--foreground)) !important;
      background: var(--appearance-body-bg) !important;
      background-attachment: fixed !important;
      transition: background 320ms ease, color 260ms ease;
    }

    h1, h2, h3, h4, h5, h6, .font-bold, .font-semibold {
      font-weight: var(--app-heading-font-weight) !important;
    }

    .future-app-shell {
      width: 100%;
      min-width: 0;
      background: transparent;
    }

    .future-app-shell main,
    .future-app-shell main > div {
      width: 100%;
      min-width: 0;
      max-width: none !important;
    }

    .future-topbar {
      position: relative;
      isolation: isolate;
      border-bottom: 1px solid var(--appearance-glass-border) !important;
      background: var(--appearance-topbar) !important;
      backdrop-filter: blur(24px) saturate(135%);
      -webkit-backdrop-filter: blur(24px) saturate(135%);
      box-shadow:
        0 12px 38px var(--appearance-glow),
        inset 0 -1px 0 rgba(255,255,255,.16);
    }

    .future-topbar > div {
      width: 100%;
    }

    .future-sidebar {
      position: relative;
      flex-shrink: 0;
      overflow: hidden;
      border-color: var(--appearance-glass-border) !important;
      background: var(--appearance-sidebar) !important;
      backdrop-filter: blur(28px) saturate(135%);
      -webkit-backdrop-filter: blur(28px) saturate(135%);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.18),
        0 20px 58px var(--appearance-glow);
    }

    .future-sidebar::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 50% 0%, var(--appearance-glow), transparent 30%),
        radial-gradient(circle at 100% 65%, var(--appearance-glow-secondary), transparent 28%);
      opacity: .70;
    }

    .future-sidebar > * {
      position: relative;
      z-index: 1;
    }

    .future-nav-item {
      border: 1px solid transparent !important;
      border-radius: 16px !important;
      transition:
        transform 220ms ease,
        background 220ms ease,
        box-shadow 220ms ease,
        border-color 220ms ease !important;
    }

    .future-nav-item:hover,
    .future-nav-item.is-active {
      color: hsl(var(--sidebar-accent-foreground)) !important;
      border-color: var(--appearance-glass-border) !important;
      background:
        linear-gradient(
          100deg,
          hsl(var(--sidebar-primary) / .14),
          hsl(var(--secondary) / .12)
        ) !important;
      box-shadow:
        0 10px 28px var(--appearance-glow),
        inset 0 1px 0 rgba(255,255,255,.15);
    }

    .future-card {
      position: relative;
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--appearance-glass-border) !important;
      border-radius: var(--future-radius) !important;
      background: var(--appearance-glass) !important;
      backdrop-filter: blur(22px) saturate(138%);
      -webkit-backdrop-filter: blur(22px) saturate(138%);
      box-shadow: var(--appearance-card-shadow);
      transition:
        transform 240ms ease,
        box-shadow 240ms ease,
        border-color 240ms ease;
    }

    .future-card:hover {
      transform: translateY(-2px);
      border-color: hsl(var(--primary) / .38) !important;
      box-shadow:
        var(--appearance-card-shadow),
        0 0 34px var(--appearance-glow);
    }

    .future-card::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 14% 8%, var(--appearance-glow), transparent 25%),
        radial-gradient(circle at 90% 16%, var(--appearance-glow-secondary), transparent 25%);
      opacity: .72;
    }

    .future-card::after {
      content: "";
      position: absolute;
      top: 0;
      right: 8%;
      left: 8%;
      height: 1px;
      pointer-events: none;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255,255,255,.72),
        transparent
      );
      opacity: .72;
    }

    .future-card > * {
      position: relative;
      z-index: 1;
    }

    .future-glass-thick {
      border: 1px solid var(--appearance-glass-border) !important;
      background: var(--appearance-glass-strong) !important;
      backdrop-filter: blur(30px) saturate(145%) !important;
      -webkit-backdrop-filter: blur(30px) saturate(145%) !important;
      box-shadow:
        var(--appearance-card-shadow),
        inset 0 1px 0 rgba(255,255,255,.36),
        0 0 34px var(--appearance-glow-secondary) !important;
    }

    .future-stat-icon {
      display: grid;
      place-items: center;
      border-radius: 18px;
      box-shadow:
        0 0 24px var(--appearance-glow),
        inset 0 1px 0 rgba(255,255,255,.20);
    }

    .future-glow-button {
      border: 1px solid hsl(var(--primary) / .34) !important;
      border-radius: 16px !important;
      box-shadow:
        0 0 24px var(--appearance-glow),
        inset 0 1px 0 rgba(255,255,255,.20);
      transition:
        transform 220ms ease,
        box-shadow 220ms ease !important;
    }

    .future-glow-button:hover {
      transform: translateY(-2px);
      box-shadow:
        0 0 38px var(--appearance-glow),
        0 12px 32px var(--appearance-glow-secondary);
    }

    .future-hero-art {
      position: relative;
      min-height: 260px;
      overflow: hidden;
      border: 1px solid var(--appearance-glass-border);
      border-radius: 28px;
      background:
        radial-gradient(circle at 50% 65%, var(--appearance-glow), transparent 19%),
        radial-gradient(circle at 50% 65%, var(--appearance-glow-secondary), transparent 36%),
        linear-gradient(135deg, var(--appearance-glass-strong), var(--appearance-glass));
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.24),
        0 20px 58px var(--appearance-glow);
      backdrop-filter: blur(26px);
      -webkit-backdrop-filter: blur(26px);
    }

    .future-hero-art::before {
      content: "";
      position: absolute;
      inset: 18%;
      border: 1px solid hsl(var(--primary) / .38);
      border-radius: 30px;
      box-shadow:
        0 0 42px var(--appearance-glow),
        inset 0 0 28px var(--appearance-glow-secondary);
      transform: perspective(720px) rotateX(14deg) rotateY(-8deg);
    }

    .future-hero-art::after {
      content: "";
      position: absolute;
      bottom: 34px;
      left: 50%;
      width: 190px;
      height: 38px;
      border-radius: 999px;
      background: var(--appearance-glow);
      filter: blur(18px);
      transform: translateX(-50%);
    }

    .future-shield {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: hsl(var(--primary));
      filter: drop-shadow(0 0 24px var(--appearance-glow));
    }

    html[data-appearance-theme] [role="dialog"],
    html[data-appearance-theme] [data-radix-dialog-content] {
      color: hsl(var(--popover-foreground)) !important;
      border: 1px solid var(--appearance-glass-border) !important;
      border-radius: 20px !important;
      background: hsl(var(--popover)) !important;
      box-shadow:
        0 26px 78px rgba(15,23,42,.30),
        0 0 34px var(--appearance-glow) !important;
      opacity: 1 !important;
    }

    html[data-appearance-theme] [data-radix-dialog-overlay] {
      background: rgba(15,23,42,.58) !important;
      backdrop-filter: blur(5px) !important;
    }


    /*
     * Dark-theme compatibility layer
     * يعالج الصفحات القديمة التي تستخدم خلفيات فاتحة ثابتة مع النص الداكن.
     */
    html[data-appearance-mode="dark"] {
      color-scheme: dark;
    }

    html[data-appearance-mode="dark"] body,
    html[data-appearance-mode="dark"] main {
      color: hsl(var(--foreground)) !important;
    }

    html[data-appearance-mode="dark"] main [class*="bg-white"],
    html[data-appearance-mode="dark"] main [class*="bg-slate-50"],
    html[data-appearance-mode="dark"] main [class*="bg-sky-50"],
    html[data-appearance-mode="dark"] main [class*="bg-blue-50"],
    html[data-appearance-mode="dark"] main [class*="bg-violet-50"],
    html[data-appearance-mode="dark"] main [class*="bg-gray-50"] {
      color: hsl(var(--foreground)) !important;
      background-color: var(--appearance-glass-strong) !important;
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main [class*="from-white"],
    html[data-appearance-mode="dark"] main [class*="via-white"],
    html[data-appearance-mode="dark"] main [class*="from-sky-50"],
    html[data-appearance-mode="dark"] main [class*="via-sky-50"],
    html[data-appearance-mode="dark"] main [class*="to-sky-50"],
    html[data-appearance-mode="dark"] main [class*="from-blue-50"],
    html[data-appearance-mode="dark"] main [class*="to-blue-50"],
    html[data-appearance-mode="dark"] main [class*="from-violet-50"],
    html[data-appearance-mode="dark"] main [class*="to-violet-50"] {
      color: hsl(var(--foreground)) !important;
      background-image:
        radial-gradient(circle at 14% 8%, var(--appearance-glow), transparent 28%),
        radial-gradient(circle at 88% 16%, var(--appearance-glow-secondary), transparent 28%),
        linear-gradient(
          135deg,
          var(--appearance-glass-strong),
          var(--appearance-glass)
        ) !important;
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main .text-slate-950,
    html[data-appearance-mode="dark"] main .text-slate-900,
    html[data-appearance-mode="dark"] main .text-slate-800,
    html[data-appearance-mode="dark"] main .text-slate-700,
    html[data-appearance-mode="dark"] main .text-gray-950,
    html[data-appearance-mode="dark"] main .text-gray-900,
    html[data-appearance-mode="dark"] main .text-gray-800,
    html[data-appearance-mode="dark"] main .text-gray-700 {
      color: hsl(var(--foreground)) !important;
    }

    html[data-appearance-mode="dark"] main .text-slate-600,
    html[data-appearance-mode="dark"] main .text-slate-500,
    html[data-appearance-mode="dark"] main .text-gray-600,
    html[data-appearance-mode="dark"] main .text-gray-500 {
      color: hsl(var(--muted-foreground)) !important;
    }

    html[data-appearance-mode="dark"] main [class*="border-sky-"],
    html[data-appearance-mode="dark"] main [class*="border-blue-"],
    html[data-appearance-mode="dark"] main [class*="border-violet-"],
    html[data-appearance-mode="dark"] main [class*="border-slate-"],
    html[data-appearance-mode="dark"] main [class*="border-gray-"] {
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main input,
    html[data-appearance-mode="dark"] main textarea,
    html[data-appearance-mode="dark"] main select,
    html[data-appearance-mode="dark"] main [role="combobox"] {
      color: hsl(var(--foreground)) !important;
      background-color: hsl(var(--input) / .88) !important;
      border-color: var(--appearance-glass-border) !important;
      caret-color: hsl(var(--primary)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
    }

    html[data-appearance-mode="dark"] main input::placeholder,
    html[data-appearance-mode="dark"] main textarea::placeholder {
      color: hsl(var(--muted-foreground)) !important;
      opacity: .92;
    }

    html[data-appearance-mode="dark"] main select option {
      color: hsl(var(--foreground));
      background: hsl(var(--popover));
    }

    html[data-appearance-mode="dark"] main table {
      color: hsl(var(--foreground)) !important;
    }

    html[data-appearance-mode="dark"] main thead,
    html[data-appearance-mode="dark"] main [data-slot="table-header"] {
      color: hsl(var(--foreground)) !important;
      background: hsl(var(--muted) / .62) !important;
    }

    html[data-appearance-mode="dark"] main th {
      color: hsl(var(--foreground)) !important;
      font-weight: 750;
    }

    html[data-appearance-mode="dark"] main td {
      color: hsl(var(--card-foreground)) !important;
    }

    html[data-appearance-mode="dark"] main tr {
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main tbody tr:hover {
      background: hsl(var(--muted) / .58) !important;
    }

    html[data-appearance-mode="dark"] main hr,
    html[data-appearance-mode="dark"] main [data-orientation="horizontal"] {
      border-color: var(--appearance-glass-border) !important;
      background-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main .future-card,
    html[data-appearance-mode="dark"] main .future-glass-thick {
      color: hsl(var(--card-foreground)) !important;
    }

    /* المحافظة على وضوح الأزرار الأساسية. */
    html[data-appearance-mode="dark"] main button[class*="bg-primary"],
    html[data-appearance-mode="dark"] main button[class*="from-sky-600"],
    html[data-appearance-mode="dark"] main button[class*="from-blue-600"],
    html[data-appearance-mode="dark"] main a[class*="bg-primary"] {
      color: hsl(var(--primary-foreground)) !important;
    }

    /* رفع التباين في المظهرين الداكنين. */
    html[data-appearance-theme="future-neon-dark"] {
      --foreground: 210 100% 97%;
      --card-foreground: 210 100% 97%;
      --muted-foreground: 215 38% 78%;
      --popover-foreground: 210 100% 97%;
    }

    html[data-appearance-theme="silver-noir"] {
      --foreground: 214 52% 97%;
      --card-foreground: 214 52% 97%;
      --muted-foreground: 215 28% 76%;
      --popover-foreground: 214 52% 97%;
    }
    @media (max-width: 1279px) {
      .future-card {
        border-radius: 18px !important;
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

    @media (prefers-reduced-motion: reduce) {
      .future-card,
      .future-glow-button,
      .future-nav-item,
      body {
        transition: none !important;
      }
    }
  `;

  document.head.appendChild(style);
};

export const ThemeInitializer: React.FC = () => {
  const { username } = useAuth();

  useEffect(() => {
    injectAppearanceStyles();

    const keys = getUserKey(username);
    const storedTheme = localStorage.getItem(keys.theme);
    const normalizedTheme = getThemeById(storedTheme);

    applyAppearanceTheme(normalizedTheme.id);

    try {
      const storedFont = localStorage.getItem(keys.font);

      if (storedFont) {
        applyFontControls(JSON.parse(storedFont));
      } else {
        applyFontControls({
          fontFamily: 'Tajawal, Cairo, Arial, sans-serif',
          baseFontSize: '15px',
          headingFontWeight: '800',
        });
      }
    } catch {
      applyFontControls({
        fontFamily: 'Tajawal, Cairo, Arial, sans-serif',
        baseFontSize: '15px',
        headingFontWeight: '800',
      });
    }

    if (!storedTheme) {
      localStorage.setItem(keys.theme, DEFAULT_THEME_ID);
      localStorage.setItem(keys.mode, normalizedTheme.mode);
    }
  }, [username]);

  return null;
};

