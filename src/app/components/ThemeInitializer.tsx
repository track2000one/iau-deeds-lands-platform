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

const applyFontControls = (
  settings: FontControlSettings,
  allowColorOverrides = true
) => {
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

  if (allowColorOverrides) {
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

    @media (max-width: 1023px) {
      .future-sidebar {
        position: fixed !important;
      }
    }

    @media (min-width: 1024px) {
      .future-sidebar {
        position: static !important;
      }
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



    /* ===== Platform-wide Soft 3D system ===== */
    /*
     * لغة بصرية موحدة للمنصة: عمق هادئ ورسمي مع بقاء الخلفيات فاتحة.
     * تطبق مركزيًا على المكونات المشتركة حتى تشمل الصفحات الحالية والمستقبلية.
     */
    html:not([data-appearance-mode="dark"]) .future-topbar {
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(247,250,252,.94)) !important;
      box-shadow:
        0 4px 0 rgba(23,57,95,.055),
        0 12px 30px rgba(15,42,70,.09),
        inset 0 1px 0 rgba(255,255,255,1),
        inset 0 -1px 0 rgba(23,57,95,.07) !important;
    }

    html:not([data-appearance-mode="dark"]) .future-sidebar {
      background: linear-gradient(180deg, rgba(255,255,255,.97), rgba(244,249,252,.96)) !important;
      box-shadow:
        0 0 0 1px rgba(23,57,95,.04),
        0 18px 40px rgba(15,42,70,.10),
        inset 1px 0 0 rgba(255,255,255,.96),
        inset 0 1px 0 rgba(255,255,255,1) !important;
    }

    .future-nav-item {
      border-radius: 15px !important;
      transform: translateY(0);
      background: linear-gradient(180deg, rgba(255,255,255,.42), rgba(239,245,249,.25)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.82),
        inset 0 -1px 0 rgba(23,57,95,.025) !important;
      transition: transform 170ms ease, filter 170ms ease, box-shadow 170ms ease, border-color 170ms ease, background 170ms ease !important;
    }

    .future-nav-item:hover {
      transform: translateY(-1px);
      border-color: rgba(89,128,160,.28) !important;
      background: linear-gradient(180deg, rgba(255,255,255,.94), rgba(228,240,248,.72)) !important;
      box-shadow:
        0 3px 0 rgba(54,91,124,.09),
        0 7px 14px rgba(15,42,70,.08),
        inset 0 1px 0 rgba(255,255,255,1) !important;
    }

    .future-nav-item.is-active {
      transform: translateY(-2px);
      color: hsl(var(--sidebar-accent-foreground)) !important;
      border-color: rgba(82,151,193,.34) !important;
      background: linear-gradient(180deg, rgba(224,247,255,.97), rgba(200,234,248,.90)) !important;
      box-shadow:
        0 5px 0 rgba(82,143,178,.18),
        0 10px 20px rgba(31,107,151,.15),
        inset 0 1px 0 rgba(255,255,255,1),
        inset 0 -1px 0 rgba(67,134,172,.10) !important;
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="card"],
    html:not([data-appearance-mode="dark"]) main .future-card {
      border-color: rgba(84,111,137,.30) !important;
      background: linear-gradient(145deg, rgba(255,255,255,.99) 0%, rgba(251,253,255,.97) 48%, rgba(240,246,250,.96) 100%) !important;
      box-shadow:
        0 7px 0 rgba(23,57,95,.075),
        0 16px 30px rgba(15,42,70,.09),
        inset 0 2px 0 rgba(255,255,255,1),
        inset 0 -2px 5px rgba(23,57,95,.045) !important;
      transition: transform 190ms ease, box-shadow 190ms ease, border-color 190ms ease !important;
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="card"]:hover,
    html:not([data-appearance-mode="dark"]) main .future-card:hover {
      transform: translateY(-2px);
      border-color: rgba(57,92,125,.42) !important;
      box-shadow:
        0 9px 0 rgba(23,57,95,.085),
        0 21px 36px rgba(15,42,70,.12),
        inset 0 2px 0 rgba(255,255,255,1),
        inset 0 -2px 6px rgba(23,57,95,.055) !important;
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="card-header"] {
      background: linear-gradient(180deg, rgba(255,255,255,.62), rgba(238,246,250,.42));
      box-shadow: inset 0 -1px 0 rgba(23,57,95,.055);
    }

    /* الأزرار: نضيف عمقًا عبر drop-shadow حتى لا نلغي الظلال الخاصة لبعض الصفحات مثل وحدة الأصول. */
    [data-slot="button"]:not(:disabled) {
      transform: translateY(0);
      filter:
        drop-shadow(0 3px 0 rgba(23,57,95,.11))
        drop-shadow(0 6px 6px rgba(15,42,70,.09));
      transition: transform 145ms ease, filter 145ms ease, background 145ms ease, border-color 145ms ease !important;
    }

    [data-slot="button"]:not(:disabled):hover {
      transform: translateY(-1px);
      filter:
        drop-shadow(0 4px 0 rgba(23,57,95,.12))
        drop-shadow(0 8px 8px rgba(15,42,70,.11));
    }

    [data-slot="button"]:not(:disabled):active {
      transform: translateY(2px) !important;
      filter:
        drop-shadow(0 1px 0 rgba(23,57,95,.10))
        drop-shadow(0 2px 3px rgba(15,42,70,.07));
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="input"],
    html:not([data-appearance-mode="dark"]) main [data-slot="select-trigger"],
    html:not([data-appearance-mode="dark"]) main [data-slot="textarea"] {
      border-color: rgba(54,87,119,.52) !important;
      background: linear-gradient(180deg, #ffffff 0%, #fbfdff 60%, #f0f5f8 100%) !important;
      box-shadow:
        inset 0 2px 3px rgba(23,57,95,.045),
        inset 0 1px 0 rgba(255,255,255,1),
        0 2px 0 rgba(23,57,95,.07),
        0 5px 10px rgba(15,42,70,.045) !important;
      transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease !important;
    }

    html:not([data-appearance-mode="dark"]) main [data-slot="input"]:focus,
    html:not([data-appearance-mode="dark"]) main [data-slot="select-trigger"]:focus,
    html:not([data-appearance-mode="dark"]) main [data-slot="textarea"]:focus {
      transform: translateY(-1px);
      border-color: rgba(43,102,143,.72) !important;
      box-shadow:
        inset 0 1px 2px rgba(23,57,95,.035),
        0 3px 0 rgba(77,135,173,.10),
        0 8px 16px rgba(25,78,115,.09),
        0 0 0 3px rgba(91,156,197,.10) !important;
    }

    [data-slot="badge"] {
      filter:
        drop-shadow(0 2px 0 rgba(23,57,95,.09))
        drop-shadow(0 4px 4px rgba(15,42,70,.07));
      box-shadow: inset 0 1px 0 rgba(255,255,255,.65);
    }

    html:not([data-appearance-mode="dark"]) [data-slot="select-content"],
    html:not([data-appearance-mode="dark"]) [data-slot="popover-content"],
    html:not([data-appearance-mode="dark"]) [data-slot="dropdown-menu-content"] {
      border-color: rgba(65,93,120,.28) !important;
      background: linear-gradient(145deg, #ffffff, #f4f8fb) !important;
      box-shadow:
        0 8px 0 rgba(23,57,95,.07),
        0 20px 42px rgba(15,42,70,.17),
        inset 0 2px 0 rgba(255,255,255,1) !important;
    }

    html:not([data-appearance-mode="dark"]) [data-slot="dialog-content"],
    html:not([data-appearance-mode="dark"]) [data-slot="alert-dialog-content"] {
      border-color: rgba(65,93,120,.30) !important;
      background: linear-gradient(145deg, #ffffff 0%, #fbfdff 58%, #eef4f8 100%) !important;
      box-shadow:
        0 10px 0 rgba(23,57,95,.08),
        0 28px 70px rgba(15,42,70,.24),
        inset 0 2px 0 rgba(255,255,255,1),
        inset 0 -2px 7px rgba(23,57,95,.05) !important;
    }

    /* البطاقات الهيكلية التي لا تستخدم Card component ولكنها معرفة future-card. */
    html:not([data-appearance-mode="dark"]) main section.future-card,
    html:not([data-appearance-mode="dark"]) main article.future-card {
      overflow: hidden;
    }


    /* ===== Platform record cards 3D ===== */
    .platform-record-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 18px;
      align-items: stretch;
    }

    @media (min-width: 768px) {
      .platform-record-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (min-width: 1280px) {
      .platform-record-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }

    html:not([data-appearance-mode="dark"]) .platform-record-card {
      position: relative;
      isolation: isolate;
      height: 100%;
      overflow: hidden;
      border: 1px solid rgba(30, 67, 102, .66) !important;
      border-radius: 19px !important;
      background: linear-gradient(145deg, #ffffff 0%, #fbfdff 50%, #f2f7fb 100%) !important;
      box-shadow:
        0 6px 0 rgba(30, 67, 102, .14),
        0 15px 28px rgba(15, 42, 70, .12),
        inset 0 2px 0 rgba(255, 255, 255, 1),
        inset 0 -2px 6px rgba(38, 76, 112, .055) !important;
      transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease !important;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-card::before {
      content: '';
      position: absolute;
      z-index: 2;
      inset-inline: 8px;
      top: 0;
      height: 4px;
      border-radius: 0 0 999px 999px;
      background: linear-gradient(90deg, #355872 0%, #5e92b8 45%, #9cd5ff 100%);
      box-shadow: 0 2px 5px rgba(41, 89, 128, .22);
      pointer-events: none;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-card:hover {
      transform: translateY(-3px);
      border-color: rgba(35, 92, 139, .82) !important;
      box-shadow:
        0 9px 0 rgba(30, 67, 102, .15),
        0 22px 38px rgba(15, 42, 70, .16),
        inset 0 2px 0 rgba(255, 255, 255, 1),
        inset 0 -2px 7px rgba(38, 76, 112, .06) !important;
    }

    .platform-record-card[data-slot="card"] {
      display: flex;
      flex-direction: column;
    }

    .platform-record-card[data-slot="card"] > [data-slot="card-content"] {
      flex: 1 1 auto;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-metric {
      border: 1px solid rgba(91, 119, 145, .24) !important;
      border-radius: 13px !important;
      background: linear-gradient(180deg, rgba(255,255,255,.98), rgba(239,246,251,.84)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,1),
        0 3px 0 rgba(44,79,111,.07),
        0 7px 12px rgba(15,42,70,.055) !important;
    }

    .platform-record-actions {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(94px, 1fr));
      gap: 8px;
      margin-top: auto;
      padding-top: 12px;
      border-top: 1px solid rgba(66, 96, 124, .11);
    }

    html:not([data-appearance-mode="dark"]) .platform-record-actions [data-slot="button"] {
      min-height: 40px;
      border: 1px solid rgba(38, 75, 111, .72) !important;
      border-radius: 10px !important;
      color: #17395f;
      background: linear-gradient(180deg, #ffffff 0%, #f7fbfe 58%, #e8f1f7 100%) !important;
      box-shadow:
        0 4px 0 rgba(38, 75, 111, .19),
        0 8px 12px rgba(15, 42, 70, .10),
        inset 0 1px 0 rgba(255,255,255,1) !important;
      filter: none !important;
      transform: translateY(0);
    }

    html:not([data-appearance-mode="dark"]) .platform-record-actions [data-slot="button"]:hover {
      transform: translateY(-1px);
      background: linear-gradient(180deg, #ffffff 0%, #eff8fd 58%, #dcecf6 100%) !important;
      box-shadow:
        0 5px 0 rgba(38, 75, 111, .20),
        0 10px 15px rgba(15, 42, 70, .12),
        inset 0 1px 0 rgba(255,255,255,1) !important;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-actions [data-slot="button"]:active {
      transform: translateY(3px) !important;
      box-shadow:
        0 1px 0 rgba(38, 75, 111, .16),
        0 3px 5px rgba(15, 42, 70, .08),
        inset 0 1px 2px rgba(22,55,86,.06) !important;
    }

    html:not([data-appearance-mode="dark"]) .platform-record-actions .platform-record-danger {
      border-color: rgba(239, 68, 68, .66) !important;
      color: #dc2626 !important;
      background: linear-gradient(180deg, #fffefe 0%, #fff5f5 58%, #ffe8e8 100%) !important;
      box-shadow:
        0 4px 0 rgba(220, 38, 38, .17),
        0 8px 12px rgba(185, 28, 28, .08),
        inset 0 1px 0 rgba(255,255,255,1) !important;
    }

    html[data-appearance-mode="dark"] .platform-record-card {
      border-color: rgba(125, 165, 201, .48) !important;
      background: linear-gradient(145deg, rgba(15,31,49,.98), rgba(20,42,64,.98)) !important;
      box-shadow: 0 6px 0 rgba(4,12,22,.55), 0 18px 34px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.07) !important;
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

    /* FINAL_DARK_READABILITY_FIX */
    html[data-appearance-mode="dark"] {
      color-scheme: dark;
    }

    html[data-appearance-mode="dark"] body,
    html[data-appearance-mode="dark"] main {
      color: hsl(var(--foreground)) !important;
    }

    html[data-appearance-mode="dark"] main {
      background:
        radial-gradient(circle at 12% 8%, var(--appearance-glow), transparent 30%),
        radial-gradient(circle at 88% 15%, var(--appearance-glow-secondary), transparent 30%),
        hsl(var(--background) / .88) !important;
    }

    html[data-appearance-mode="dark"] main [class*="bg-white"],
    html[data-appearance-mode="dark"] main [class*="bg-slate-50"],
    html[data-appearance-mode="dark"] main [class*="bg-gray-50"],
    html[data-appearance-mode="dark"] main [class*="bg-sky-50"],
    html[data-appearance-mode="dark"] main [class*="bg-blue-50"],
    html[data-appearance-mode="dark"] main [class*="bg-violet-50"] {
      color: hsl(var(--card-foreground)) !important;
      background-color: var(--appearance-glass-strong) !important;
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main [class*="from-white"],
    html[data-appearance-mode="dark"] main [class*="via-white"],
    html[data-appearance-mode="dark"] main [class*="to-white"],
    html[data-appearance-mode="dark"] main [class*="from-sky-50"],
    html[data-appearance-mode="dark"] main [class*="via-sky-50"],
    html[data-appearance-mode="dark"] main [class*="to-sky-50"],
    html[data-appearance-mode="dark"] main [class*="from-blue-50"],
    html[data-appearance-mode="dark"] main [class*="to-blue-50"],
    html[data-appearance-mode="dark"] main [class*="from-violet-50"],
    html[data-appearance-mode="dark"] main [class*="to-violet-50"] {
      color: hsl(var(--card-foreground)) !important;
      background-color: var(--appearance-glass-strong) !important;
      background-image:
        radial-gradient(circle at 14% 8%, var(--appearance-glow), transparent 28%),
        radial-gradient(circle at 88% 16%, var(--appearance-glow-secondary), transparent 28%),
        linear-gradient(
          135deg,
          var(--appearance-glass-strong),
          var(--appearance-glass)
        ) !important;
      border-color: var(--appearance-glass-border) !important;
      box-shadow:
        var(--appearance-card-shadow),
        inset 0 1px 0 rgba(255,255,255,.08) !important;
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
    html[data-appearance-mode="dark"] main .text-gray-500,
    html[data-appearance-mode="dark"] main .text-muted-foreground {
      color: hsl(var(--muted-foreground)) !important;
    }

    html[data-appearance-mode="dark"] main input,
    html[data-appearance-mode="dark"] main textarea,
    html[data-appearance-mode="dark"] main select,
    html[data-appearance-mode="dark"] main [role="combobox"] {
      color: hsl(var(--foreground)) !important;
      background-color: hsl(var(--input) / .94) !important;
      border-color: var(--appearance-glass-border) !important;
      caret-color: hsl(var(--primary)) !important;
    }

    html[data-appearance-mode="dark"] main input::placeholder,
    html[data-appearance-mode="dark"] main textarea::placeholder {
      color: hsl(var(--muted-foreground)) !important;
      opacity: .96 !important;
    }

    html[data-appearance-mode="dark"] main select option {
      color: hsl(var(--foreground)) !important;
      background: hsl(var(--popover)) !important;
    }

    html[data-appearance-mode="dark"] main table,
    html[data-appearance-mode="dark"] main thead,
    html[data-appearance-mode="dark"] main tbody,
    html[data-appearance-mode="dark"] main tr,
    html[data-appearance-mode="dark"] main th,
    html[data-appearance-mode="dark"] main td {
      background-color: transparent !important;
      border-color: var(--appearance-glass-border) !important;
    }

    html[data-appearance-mode="dark"] main th {
      color: hsl(var(--foreground)) !important;
      font-weight: 750 !important;
    }

    html[data-appearance-mode="dark"] main td {
      color: hsl(var(--card-foreground)) !important;
    }

    html[data-appearance-mode="dark"] main tbody tr:hover {
      background-color: hsl(var(--muted) / .62) !important;
    }

    html[data-appearance-mode="dark"] main button[class*="bg-primary"],
    html[data-appearance-mode="dark"] main button[class*="from-sky-600"],
    html[data-appearance-mode="dark"] main button[class*="from-blue-600"],
    html[data-appearance-mode="dark"] main a[class*="bg-primary"] {
      color: hsl(var(--primary-foreground)) !important;
    }

    html[data-appearance-theme="future-neon-dark"] {
      --foreground: 210 100% 98%;
      --card-foreground: 210 100% 98%;
      --muted-foreground: 215 42% 82%;
      --popover-foreground: 210 100% 98%;
      --sidebar-foreground: 210 100% 97%;
      --sidebar-accent-foreground: 210 100% 98%;
    }

    html[data-appearance-theme="silver-noir"] {
      --foreground: 214 55% 98%;
      --card-foreground: 214 55% 98%;
      --muted-foreground: 215 32% 80%;
      --popover-foreground: 214 55% 98%;
      --sidebar-foreground: 214 55% 97%;
      --sidebar-accent-foreground: 214 55% 98%;
    }




    /* ===== Full platform Neumorphism / Soft 3D ===== */
    /* Scoped to the authenticated application shell so public/login pages keep their own design. */
    .neo-platform-shell {
      --neo-radius: 22px;
      --neo-radius-sm: 15px;
      --neo-ease: cubic-bezier(.2,.72,.2,1);
      --neo-surface: color-mix(in srgb, hsl(var(--background)) 82%, #e8edf2 18%);
      --neo-surface-soft: color-mix(in srgb, hsl(var(--background)) 90%, #f3f6f8 10%);
      --neo-surface-strong: color-mix(in srgb, hsl(var(--background)) 72%, #dfe6ec 28%);
      --neo-highlight: rgba(255,255,255,.92);
      --neo-highlight-soft: rgba(255,255,255,.56);
      --neo-shadow: color-mix(in srgb, hsl(var(--foreground)) 20%, transparent);
      --neo-shadow-soft: color-mix(in srgb, hsl(var(--foreground)) 11%, transparent);
      --neo-line: color-mix(in srgb, hsl(var(--foreground)) 13%, transparent);
      --neo-primary-soft: color-mix(in srgb, hsl(var(--primary)) 16%, var(--neo-surface));
      --neo-primary-strong: color-mix(in srgb, hsl(var(--primary)) 28%, var(--neo-surface));
      --neo-raised:
        -10px -10px 22px var(--neo-highlight),
        10px 10px 22px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.65),
        inset -1px -1px 0 rgba(15,23,42,.035);
      --neo-raised-sm:
        -5px -5px 11px var(--neo-highlight-soft),
        5px 5px 11px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.55);
      --neo-inset:
        inset 5px 5px 11px var(--neo-shadow-soft),
        inset -5px -5px 11px var(--neo-highlight),
        0 1px 0 rgba(255,255,255,.45);
      position: relative;
      background:
        radial-gradient(circle at 13% 8%, rgba(255,255,255,.85), transparent 24%),
        radial-gradient(circle at 88% 82%, color-mix(in srgb, hsl(var(--primary)) 8%, transparent), transparent 28%),
        linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface-strong));
    }

    html[data-appearance-mode="dark"] .neo-platform-shell {
      --neo-surface: color-mix(in srgb, hsl(var(--background)) 88%, #1d2a36 12%);
      --neo-surface-soft: color-mix(in srgb, hsl(var(--background)) 92%, #263544 8%);
      --neo-surface-strong: color-mix(in srgb, hsl(var(--background)) 82%, #07111b 18%);
      --neo-highlight: rgba(255,255,255,.07);
      --neo-highlight-soft: rgba(255,255,255,.045);
      --neo-shadow: rgba(0,0,0,.58);
      --neo-shadow-soft: rgba(0,0,0,.34);
      --neo-line: rgba(255,255,255,.10);
      --neo-primary-soft: color-mix(in srgb, hsl(var(--primary)) 14%, var(--neo-surface));
      --neo-primary-strong: color-mix(in srgb, hsl(var(--primary)) 24%, var(--neo-surface));
      --neo-raised:
        -9px -9px 20px var(--neo-highlight),
        10px 10px 23px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.05),
        inset -1px -1px 0 rgba(0,0,0,.22);
      --neo-raised-sm:
        -5px -5px 10px var(--neo-highlight-soft),
        5px 5px 11px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.04);
      --neo-inset:
        inset 5px 5px 12px rgba(0,0,0,.30),
        inset -5px -5px 12px rgba(255,255,255,.035),
        0 1px 0 rgba(255,255,255,.03);
    }

    .neo-platform-shell .app-content-row,
    .neo-platform-shell .app-main {
      background: transparent !important;
    }

    .neo-platform-shell .app-main {
      position: relative;
      isolation: isolate;
    }

    .neo-platform-shell .app-main::before {
      content: '';
      position: fixed;
      inset: 64px 0 0;
      z-index: -1;
      pointer-events: none;
      background:
        radial-gradient(circle at 18% 12%, rgba(255,255,255,.46), transparent 24%),
        radial-gradient(circle at 78% 78%, color-mix(in srgb, hsl(var(--primary)) 7%, transparent), transparent 27%);
    }

    .neo-platform-shell .future-topbar {
      border: 0 !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      box-shadow:
        0 8px 18px var(--neo-shadow-soft),
        inset 0 1px 0 var(--neo-highlight-soft),
        inset 0 -1px 0 var(--neo-line) !important;
    }

    .neo-platform-shell .future-sidebar {
      border-color: var(--neo-line) !important;
      background: linear-gradient(160deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      box-shadow:
        -5px -3px 14px var(--neo-highlight-soft),
        8px 0 22px var(--neo-shadow-soft),
        inset 1px 0 0 rgba(255,255,255,.18) !important;
    }

    html[dir="ltr"] .neo-platform-shell .future-sidebar {
      box-shadow:
        5px -3px 14px var(--neo-highlight-soft),
        -8px 0 22px var(--neo-shadow-soft),
        inset -1px 0 0 rgba(255,255,255,.18) !important;
    }

    .neo-platform-shell .future-sidebar::before {
      opacity: .18 !important;
      background: radial-gradient(circle at 50% 8%, color-mix(in srgb, hsl(var(--primary)) 12%, transparent), transparent 32%) !important;
    }

    .neo-platform-shell .future-sidebar > div:first-child {
      margin: 12px 12px 4px;
      border: 1px solid var(--neo-line) !important;
      border-radius: 18px;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset);
    }

    .neo-platform-shell .future-nav-item {
      border: 1px solid transparent !important;
      border-radius: 16px !important;
      color: hsl(var(--sidebar-foreground)) !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      box-shadow: var(--neo-raised-sm) !important;
      filter: none !important;
      transform: translateY(0) !important;
      transition: transform 160ms var(--neo-ease), box-shadow 160ms ease, color 160ms ease, background 160ms ease !important;
    }

    .neo-platform-shell .future-nav-item:hover {
      transform: translateY(-2px) !important;
      border-color: color-mix(in srgb, hsl(var(--primary)) 20%, transparent) !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-primary-soft)) !important;
      box-shadow:
        -6px -6px 13px var(--neo-highlight-soft),
        7px 7px 14px var(--neo-shadow-soft) !important;
    }

    .neo-platform-shell .future-nav-item.is-active {
      transform: translateY(0) !important;
      color: hsl(var(--primary)) !important;
      border-color: color-mix(in srgb, hsl(var(--primary)) 28%, transparent) !important;
      background: var(--neo-primary-soft) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell main [data-slot="card"],
    .neo-platform-shell main .future-card,
    .neo-platform-shell main .platform-record-card {
      border: 1px solid var(--neo-line) !important;
      border-radius: var(--neo-radius) !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      box-shadow: var(--neo-raised) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      transition: transform 190ms var(--neo-ease), box-shadow 190ms ease, border-color 190ms ease !important;
    }

    .neo-platform-shell main [data-slot="card"]:hover,
    .neo-platform-shell main .future-card:hover,
    .neo-platform-shell main .platform-record-card:hover {
      transform: translateY(-2px);
      border-color: color-mix(in srgb, hsl(var(--primary)) 24%, var(--neo-line)) !important;
      box-shadow:
        -12px -12px 25px var(--neo-highlight),
        12px 12px 26px var(--neo-shadow-soft),
        inset 1px 1px 0 rgba(255,255,255,.48) !important;
    }

    .neo-platform-shell main [data-slot="card-header"] {
      background: transparent !important;
      box-shadow: inset 0 -1px 0 var(--neo-line) !important;
    }

    .neo-platform-shell main .platform-record-card::before {
      height: 3px !important;
      background: linear-gradient(90deg, transparent, hsl(var(--primary)), transparent) !important;
      box-shadow: 0 2px 8px color-mix(in srgb, hsl(var(--primary)) 20%, transparent) !important;
    }

    .neo-platform-shell main .platform-record-metric,
    .neo-platform-shell main .statistics-box,
    .neo-platform-shell main [class*="rounded-xl"][class*="bg-muted"],
    .neo-platform-shell main [class*="rounded-2xl"][class*="bg-muted"] {
      border-color: var(--neo-line) !important;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell [data-slot="button"]:not(:disabled) {
      border-radius: 14px !important;
      box-shadow: var(--neo-raised-sm) !important;
      filter: none !important;
      transform: translateY(0) !important;
      transition: transform 145ms var(--neo-ease), box-shadow 145ms ease, filter 145ms ease, background 145ms ease !important;
    }

    .neo-platform-shell [data-slot="button"]:not(:disabled):hover {
      transform: translateY(-2px) !important;
      box-shadow:
        -6px -6px 13px var(--neo-highlight-soft),
        7px 7px 14px var(--neo-shadow-soft) !important;
    }

    .neo-platform-shell [data-slot="button"]:not(:disabled):active,
    .neo-platform-shell [data-slot="button"][data-state="on"] {
      transform: translateY(0) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell [data-slot="button"][class*="bg-primary"],
    .neo-platform-shell [data-slot="button"][class*="bg-destructive"],
    .neo-platform-shell [data-slot="button"][class*="bg-secondary"] {
      box-shadow:
        -4px -4px 9px var(--neo-highlight-soft),
        5px 5px 12px var(--neo-shadow-soft),
        inset 0 1px 0 rgba(255,255,255,.26) !important;
    }

    .neo-platform-shell main [data-slot="input"],
    .neo-platform-shell main [data-slot="textarea"],
    .neo-platform-shell main [data-slot="select-trigger"],
    .neo-platform-shell main input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
    .neo-platform-shell main textarea,
    .neo-platform-shell main select {
      border: 1px solid color-mix(in srgb, hsl(var(--foreground)) 11%, transparent) !important;
      border-radius: 13px !important;
      color: hsl(var(--foreground)) !important;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset) !important;
      filter: none !important;
      outline: none;
      transition: box-shadow 150ms ease, border-color 150ms ease, transform 150ms ease !important;
    }

    .neo-platform-shell main [data-slot="input"]:focus,
    .neo-platform-shell main [data-slot="textarea"]:focus,
    .neo-platform-shell main [data-slot="select-trigger"]:focus,
    .neo-platform-shell main input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):focus,
    .neo-platform-shell main textarea:focus,
    .neo-platform-shell main select:focus {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, hsl(var(--primary)) 55%, transparent) !important;
      box-shadow:
        inset 4px 4px 9px var(--neo-shadow-soft),
        inset -4px -4px 9px var(--neo-highlight),
        0 0 0 3px color-mix(in srgb, hsl(var(--primary)) 12%, transparent) !important;
    }

    .neo-platform-shell main [data-slot="tabs-list"] {
      border: 1px solid var(--neo-line) !important;
      border-radius: 16px !important;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset) !important;
      padding: 5px !important;
    }

    .neo-platform-shell main [data-slot="tabs-trigger"] {
      border-radius: 12px !important;
      transition: box-shadow 150ms ease, transform 150ms ease, color 150ms ease !important;
    }

    .neo-platform-shell main [data-slot="tabs-trigger"][data-state="active"] {
      color: hsl(var(--primary)) !important;
      background: var(--neo-surface-soft) !important;
      box-shadow: var(--neo-raised-sm) !important;
    }

    .neo-platform-shell main [data-slot="table-container"],
    .neo-platform-shell main .overflow-x-auto:has(table) {
      border: 1px solid var(--neo-line);
      border-radius: 17px;
      background: var(--neo-surface);
      box-shadow: var(--neo-inset);
    }

    .neo-platform-shell main table {
      border-collapse: separate;
      border-spacing: 0;
      background: transparent !important;
    }

    .neo-platform-shell main thead,
    .neo-platform-shell main th {
      background: color-mix(in srgb, var(--neo-surface) 84%, hsl(var(--primary)) 16%) !important;
    }

    .neo-platform-shell main th,
    .neo-platform-shell main td {
      border-color: var(--neo-line) !important;
    }

    .neo-platform-shell main tbody tr {
      transition: background 140ms ease, box-shadow 140ms ease;
    }

    .neo-platform-shell main tbody tr:hover {
      background: color-mix(in srgb, hsl(var(--primary)) 7%, transparent) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.08);
    }

    .neo-platform-shell [data-slot="dialog-content"],
    .neo-platform-shell [data-slot="alert-dialog-content"],
    .neo-platform-shell [data-slot="select-content"],
    .neo-platform-shell [data-slot="popover-content"],
    .neo-platform-shell [data-slot="dropdown-menu-content"],
    .neo-platform-shell [role="menu"] {
      border: 1px solid var(--neo-line) !important;
      border-radius: 20px !important;
      color: hsl(var(--popover-foreground)) !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      box-shadow:
        -10px -10px 24px var(--neo-highlight-soft),
        14px 18px 38px var(--neo-shadow),
        inset 1px 1px 0 rgba(255,255,255,.22) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .neo-platform-shell [data-slot="dialog-overlay"],
    .neo-platform-shell [data-slot="alert-dialog-overlay"] {
      background: rgba(15,23,42,.48) !important;
      backdrop-filter: blur(5px) !important;
      -webkit-backdrop-filter: blur(5px) !important;
    }

    .neo-platform-shell [data-slot="badge"] {
      border: 1px solid var(--neo-line) !important;
      border-radius: 999px !important;
      box-shadow: var(--neo-raised-sm) !important;
      filter: none !important;
    }

    .neo-platform-shell main [data-slot="checkbox"],
    .neo-platform-shell main [data-slot="radio-group-item"],
    .neo-platform-shell main [data-slot="switch"] {
      box-shadow: var(--neo-raised-sm) !important;
      border-color: var(--neo-line) !important;
    }

    .neo-platform-shell main [data-state="checked"][data-slot="checkbox"],
    .neo-platform-shell main [data-state="checked"][data-slot="radio-group-item"],
    .neo-platform-shell main [data-state="checked"][data-slot="switch"] {
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell main [data-slot="progress"] {
      border: 1px solid var(--neo-line) !important;
      background: var(--neo-surface) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell main button:not([data-slot="button"]):not(.leaflet-control-zoom-in):not(.leaflet-control-zoom-out) {
      border-radius: 12px;
      transition: transform 145ms var(--neo-ease), box-shadow 145ms ease;
    }

    .neo-platform-shell main button:not([data-slot="button"]):not(.leaflet-control-zoom-in):not(.leaflet-control-zoom-out):hover {
      transform: translateY(-1px);
    }

    .neo-platform-shell main .leaflet-container {
      border: 1px solid var(--neo-line) !important;
      border-radius: 18px !important;
      box-shadow:
        inset 0 0 0 1px rgba(255,255,255,.16),
        7px 7px 16px var(--neo-shadow-soft),
        -5px -5px 13px var(--neo-highlight-soft) !important;
    }

    .neo-platform-shell main .leaflet-control-zoom,
    .neo-platform-shell main .leaflet-control-layers {
      border: 0 !important;
      border-radius: 12px !important;
      box-shadow: var(--neo-raised-sm) !important;
      overflow: hidden;
    }

    .neo-platform-shell main [class*="border-dashed"] {
      background: color-mix(in srgb, var(--neo-surface) 94%, hsl(var(--primary)) 6%) !important;
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell .future-topbar [data-slot="button"],
    .neo-platform-shell .future-topbar button:not([data-slot="button"]) {
      border: 1px solid var(--neo-line) !important;
      background: var(--neo-surface) !important;
      color: hsl(var(--foreground)) !important;
      box-shadow: var(--neo-raised-sm) !important;
      filter: none !important;
    }

    .neo-platform-shell .future-topbar [data-slot="button"]:active,
    .neo-platform-shell .future-topbar button:not([data-slot="button"]):active {
      box-shadow: var(--neo-inset) !important;
    }

    .neo-platform-shell .future-topbar button[aria-label="Platform home"] {
      border-radius: 50% !important;
      background: linear-gradient(145deg, var(--neo-surface-soft), var(--neo-surface)) !important;
      box-shadow: var(--neo-raised-sm) !important;
    }

    @media (max-width: 1023px) {
      .neo-platform-shell {
        --neo-radius: 18px;
        --neo-raised:
          -6px -6px 14px var(--neo-highlight-soft),
          7px 7px 15px var(--neo-shadow-soft),
          inset 1px 1px 0 rgba(255,255,255,.35);
        --neo-raised-sm:
          -3px -3px 8px var(--neo-highlight-soft),
          4px 4px 9px var(--neo-shadow-soft);
      }

      .neo-platform-shell .future-sidebar {
        box-shadow: 12px 0 30px rgba(0,0,0,.24), inset 1px 0 0 rgba(255,255,255,.10) !important;
      }

      html[dir="ltr"] .neo-platform-shell .future-sidebar {
        box-shadow: -12px 0 30px rgba(0,0,0,.24), inset -1px 0 0 rgba(255,255,255,.10) !important;
      }
    }

    @media (max-width: 767px) {
      .neo-platform-shell {
        --neo-radius: 16px;
        --neo-radius-sm: 12px;
      }

      .neo-platform-shell main [data-slot="card"]:hover,
      .neo-platform-shell main .future-card:hover,
      .neo-platform-shell main .platform-record-card:hover,
      .neo-platform-shell [data-slot="button"]:not(:disabled):hover,
      .neo-platform-shell .future-nav-item:hover {
        transform: none !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .neo-platform-shell *,
      .neo-platform-shell *::before,
      .neo-platform-shell *::after {
        scroll-behavior: auto !important;
        transition: none !important;
        animation: none !important;
      }
    }

    @media print {
      .neo-platform-shell,
      .neo-platform-shell main,
      .neo-platform-shell main [data-slot="card"],
      .neo-platform-shell main .future-card,
      .neo-platform-shell main .platform-record-card,
      .neo-platform-shell main input,
      .neo-platform-shell main textarea,
      .neo-platform-shell main select,
      .neo-platform-shell main table,
      .neo-platform-shell main [class*="border-dashed"] {
        background: white !important;
        box-shadow: none !important;
        filter: none !important;
        transform: none !important;
        backdrop-filter: none !important;
      }
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
        applyFontControls(
          JSON.parse(storedFont),
          normalizedTheme.mode !== 'dark'
        );
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

