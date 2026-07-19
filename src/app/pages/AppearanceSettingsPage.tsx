import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Moon,
  Palette,
  RotateCcw,
  Sparkles,
  Sun,
  Monitor,
  Zap,
  Type,
  SlidersHorizontal,
  Wand2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';

type AppearanceMode = 'light' | 'dark' | 'system';

type ThemeOption = {
  id: string;
  name: string;
  arabicName: string;
  description: string;
  badge?: string;
  version: string;
  preview: string[];
  mode: AppearanceMode;
  variables: Record<string, string>;
  fontDefaults: FontControlSettings;
};

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

const STORAGE_THEME_KEY = 'iau-appearance-theme';
const STORAGE_MODE_KEY = 'iau-appearance-mode';
const STORAGE_FONT_KEY = 'iau-appearance-font-controls';

const defaultFontControls: FontControlSettings = {
  fontFamily: 'Tajawal, Arial, sans-serif',
  baseFontSize: '15px',
  headingFontWeight: '700',
  foreground: '#1f2937',
  mutedForeground: '#64748b',
  cardForeground: '#1f2937',
  sidebarForeground: '#ffffff',
  primary: '#2c4a6b',
};

const fontOptions = [
  { label: 'Tajawal', value: 'Tajawal, Arial, sans-serif' },
  { label: 'Cairo', value: 'Cairo, Tajawal, Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, Tahoma, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Arial, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", Tahoma, Arial, sans-serif' },
  { label: 'System', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
];

const themes: ThemeOption[] = [
  {
    id: 'future-2060-dark',
    name: 'Future 2060 Dark',
    arabicName: 'مستقبل 2060 الداكن',
    description: 'ثيم داكن فاخر بإضاءة بنفسجية وسماوية وحواف نيون، مناسب للوحة تحكم مستقبلية عالية الفخامة.',
    badge: 'الأفخم',
    version: 'v2060-DARK',
    mode: 'dark',
    preview: ['#080B1A', '#00E5FF', '#7C4DFF', '#E6F1FF'],
    variables: {
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
    fontDefaults: {
      fontFamily: 'Tajawal, Arial, sans-serif',
      baseFontSize: '15px',
      headingFontWeight: '800',
      foreground: '#E6F1FF',
      mutedForeground: '#9DB2D1',
      cardForeground: '#F4F9FF',
      sidebarForeground: '#DDEBFF',
      primary: '#00E5FF',
    },
  },
  {
    id: 'pearl-aurora',
    name: 'Pearl Aurora',
    arabicName: 'لؤلؤة الشفق',
    description: 'ثيم فاتح لؤلؤي مع لمسات سماوية وبنفسجية ناعمة، فخم وهادئ وملائم للواجهات الرسمية.',
    badge: 'فاتح فاخر',
    version: 'v2060-PEARL',
    mode: 'light',
    preview: ['#F8FBFF', '#9FE7FF', '#C7A8FF', '#213A6B'],
    variables: {
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
    fontDefaults: {
      fontFamily: 'Tajawal, Arial, sans-serif',
      baseFontSize: '15px',
      headingFontWeight: '800',
      foreground: '#213A6B',
      mutedForeground: '#65758F',
      cardForeground: '#213A6B',
      sidebarForeground: '#263C69',
      primary: '#2F7BFF',
    },
  },
  {
    id: 'crystal-mint',
    name: 'Crystal Mint',
    arabicName: 'كريستال مينت',
    description: 'ثيم أبيض كريستالي بنَفَس أخضر مائي، مريح للعين ويعطي إحساس الإدارة الذكية والأمان.',
    badge: 'مريح',
    version: 'v2060-MINT',
    mode: 'light',
    preview: ['#F7FFFD', '#00BFA6', '#5EEAD4', '#123C3A'],
    variables: {
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
    fontDefaults: {
      fontFamily: 'Tajawal, Arial, sans-serif',
      baseFontSize: '15px',
      headingFontWeight: '700',
      foreground: '#123C3A',
      mutedForeground: '#54706C',
      cardForeground: '#123C3A',
      sidebarForeground: '#123C3A',
      primary: '#00A991',
    },
  },
  {
    id: 'sky-glass',
    name: 'Sky Glass',
    arabicName: 'سماء زجاجية',
    description: 'ثيم ثلجي زجاجي بلمسات أزرق سماوي، شديد النظافة والوضوح مع توهج هادئ.',
    badge: 'نظيف',
    version: 'v2060-SKY',
    mode: 'light',
    preview: ['#F4FAFF', '#2F80ED', '#56CCF2', '#1E3A8A'],
    variables: {
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
    fontDefaults: {
      fontFamily: 'Tajawal, Arial, sans-serif',
      baseFontSize: '15px',
      headingFontWeight: '800',
      foreground: '#1E3A8A',
      mutedForeground: '#64748B',
      cardForeground: '#1E3A8A',
      sidebarForeground: '#1E3A8A',
      primary: '#2F80ED',
    },
  },
  {
    id: 'solar-rose-tech',
    name: 'Solar Rose Tech',
    arabicName: 'وردي شمسي تقني',
    description: 'ثيم فاتح دافئ يمزج الشامبانيا والوردي، فاخر وناعم للمكاتب الرسمية.',
    badge: 'راقي',
    version: 'v2060-ROSE',
    mode: 'light',
    preview: ['#FFF9F4', '#E85D75', '#F4B183', '#4A2E2A'],
    variables: {
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
    fontDefaults: {
      fontFamily: 'Cairo, Tajawal, Arial, sans-serif',
      baseFontSize: '15px',
      headingFontWeight: '700',
      foreground: '#4A2E2A',
      mutedForeground: '#8B635B',
      cardForeground: '#4A2E2A',
      sidebarForeground: '#4A2E2A',
      primary: '#E85D75',
    },
  },
];

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

const loadFontControls = (): FontControlSettings => {
  try {
    const stored = localStorage.getItem(STORAGE_FONT_KEY);
    return stored ? { ...defaultFontControls, ...JSON.parse(stored) } : defaultFontControls;
  } catch {
    return defaultFontControls;
  }
};

const applyThemeVariables = (theme: ThemeOption) => {
  const root = document.documentElement;

  Object.entries(theme.variables).forEach(([key, value]) => {
    const cssVariable = variableNameMap[key];

    if (cssVariable) {
      root.style.setProperty(cssVariable, value);
    }
  });

  root.dataset.appearanceTheme = theme.id;
};

const applyFontControls = (settings: FontControlSettings) => {
  const root = document.documentElement;

  root.style.setProperty('--app-font-family', settings.fontFamily);
  root.style.setProperty('--app-base-font-size', settings.baseFontSize);
  root.style.setProperty('--app-heading-font-weight', settings.headingFontWeight);

  root.style.setProperty('--app-text-color', settings.foreground);
  root.style.setProperty('--app-muted-text-color', settings.mutedForeground);
  root.style.setProperty('--app-card-text-color', settings.cardForeground);
  root.style.setProperty('--app-sidebar-text-color', settings.sidebarForeground);
  root.style.setProperty('--app-primary-text-color', settings.primary);

  const foreground = hexToHsl(settings.foreground);
  const mutedForeground = hexToHsl(settings.mutedForeground);
  const cardForeground = hexToHsl(settings.cardForeground);
  const sidebarForeground = hexToHsl(settings.sidebarForeground);
  const primary = hexToHsl(settings.primary);

  if (foreground) root.style.setProperty('--foreground', foreground);
  if (mutedForeground) root.style.setProperty('--muted-foreground', mutedForeground);
  if (cardForeground) {
    root.style.setProperty('--card-foreground', cardForeground);
    root.style.setProperty('--popover-foreground', cardForeground);
  }
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

const applyMode = (mode: AppearanceMode) => {
  const root = document.documentElement;
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = mode === 'dark' || (mode === 'system' && systemDark);

  root.classList.toggle('dark', shouldUseDark);
  root.dataset.appearanceMode = mode;
};

const injectAppearanceStyles = () => {
  const styleId = 'iau-future-2060-theme-style';

  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    :root {
      --app-font-family: Tajawal, Arial, sans-serif;
      --app-base-font-size: 15px;
      --app-heading-font-weight: 700;
      --app-text-color: hsl(var(--foreground));
      --app-muted-text-color: hsl(var(--muted-foreground));
      --app-card-text-color: hsl(var(--card-foreground));
      --app-sidebar-text-color: hsl(var(--sidebar-foreground));
      --app-primary-text-color: hsl(var(--primary));
    }

    body {
      font-family: var(--app-font-family) !important;
      font-size: var(--app-base-font-size) !important;
      color: var(--app-text-color) !important;
      transition: background 350ms ease, color 350ms ease;
    }

    h1, h2, h3, h4, h5, h6, .font-bold {
      font-weight: var(--app-heading-font-weight) !important;
    }

    html[data-custom-font-colors="enabled"] .text-primary,
    html[data-custom-font-colors="enabled"] h1,
    html[data-custom-font-colors="enabled"] h2,
    html[data-custom-font-colors="enabled"] h3,
    html[data-custom-font-colors="enabled"] .font-bold,
    html[data-custom-font-colors="enabled"] .font-semibold {
      color: var(--app-primary-text-color) !important;
    }

    html[data-custom-font-colors="enabled"] .text-muted-foreground {
      color: var(--app-muted-text-color) !important;
    }

    html[data-custom-font-colors="enabled"] .bg-card,
    html[data-custom-font-colors="enabled"] [class*="bg-card"] {
      color: var(--app-card-text-color) !important;
    }

    html[data-custom-font-colors="enabled"] aside,
    html[data-custom-font-colors="enabled"] nav,
    html[data-custom-font-colors="enabled"] [data-sidebar],
    html[data-custom-font-colors="enabled"] aside *,
    html[data-custom-font-colors="enabled"] nav *,
    html[data-custom-font-colors="enabled"] [data-sidebar] * {
      color: var(--app-sidebar-text-color) !important;
    }

    html[data-custom-font-colors="enabled"] input,
    html[data-custom-font-colors="enabled"] select,
    html[data-custom-font-colors="enabled"] textarea {
      color: var(--app-text-color) !important;
    }

    html[data-appearance-theme] body {
      background:
        radial-gradient(circle at 16% 12%, hsl(var(--primary) / 0.16), transparent 28%),
        radial-gradient(circle at 86% 18%, hsl(var(--secondary) / 0.14), transparent 32%),
        linear-gradient(135deg, hsl(var(--background)), hsl(var(--muted) / 0.45)) !important;
    }

    html[data-appearance-theme] .future-glow-card {
      position: relative;
      overflow: hidden;
      border-color: hsl(var(--primary) / 0.35) !important;
      box-shadow:
        0 0 0 1px hsl(var(--primary) / 0.12),
        0 18px 60px hsl(var(--primary) / 0.14);
      backdrop-filter: blur(18px);
    }

    html[data-appearance-theme] .future-glow-card::before {
      content: "";
      position: absolute;
      inset: -1px;
      background:
        radial-gradient(circle at 18% 18%, hsl(var(--primary) / 0.18), transparent 34%),
        linear-gradient(120deg, transparent, hsl(var(--accent) / 0.10), transparent);
      pointer-events: none;
    }

    html[data-appearance-theme] .future-theme-selected {
      box-shadow:
        0 0 0 1px hsl(var(--primary) / 0.65),
        0 0 34px hsl(var(--primary) / 0.35),
        inset 0 0 24px hsl(var(--accent) / 0.08) !important;
    }

    html[data-appearance-theme] .future-button-glow {
      box-shadow: 0 0 22px hsl(var(--primary) / 0.36);
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

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-lg border bg-background/70 p-2">
        <Input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-14 cursor-pointer border-0 p-1"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          dir="ltr"
          className="font-mono"
        />
      </div>
    </div>
  );
};

export const AppearanceSettingsPage: React.FC = () => {
  const [selectedThemeId, setSelectedThemeId] = useState(
    () => localStorage.getItem(STORAGE_THEME_KEY) || 'future-2060-dark'
  );

  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(
    () => (localStorage.getItem(STORAGE_MODE_KEY) as AppearanceMode) || 'dark'
  );

  const [fontControls, setFontControls] = useState<FontControlSettings>(() => loadFontControls());

  const selectedTheme = useMemo(() => {
    return themes.find((theme) => theme.id === selectedThemeId) || themes[0];
  }, [selectedThemeId]);

  useEffect(() => {
    injectAppearanceStyles();
  }, []);

  useEffect(() => {
    applyThemeVariables(selectedTheme);
    applyMode(selectedTheme.mode);
    setAppearanceMode(selectedTheme.mode);

    localStorage.setItem(STORAGE_THEME_KEY, selectedTheme.id);
    localStorage.setItem(STORAGE_MODE_KEY, selectedTheme.mode);

    const stored = localStorage.getItem(STORAGE_FONT_KEY);
    if (!stored) {
      setFontControls(selectedTheme.fontDefaults);
    }
  }, [selectedTheme]);

  useEffect(() => {
    applyMode(appearanceMode);
    localStorage.setItem(STORAGE_MODE_KEY, appearanceMode);

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const handler = () => {
      if (appearanceMode === 'system') applyMode('system');
    };

    media?.addEventListener?.('change', handler);

    return () => media?.removeEventListener?.('change', handler);
  }, [appearanceMode]);

  useEffect(() => {
    applyFontControls(fontControls);
    localStorage.setItem(STORAGE_FONT_KEY, JSON.stringify(fontControls));
  }, [fontControls]);

  const updateFontControl = <K extends keyof FontControlSettings>(
    key: K,
    value: FontControlSettings[K]
  ) => {
    setFontControls((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyThemePreset = (theme: ThemeOption) => {
    setSelectedThemeId(theme.id);
    setFontControls(theme.fontDefaults);
  };

  const resetAppearance = () => {
    const defaultTheme = themes[0];
    setSelectedThemeId(defaultTheme.id);
    setAppearanceMode(defaultTheme.mode);
    setFontControls(defaultTheme.fontDefaults);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card/90 p-6 md:p-8 future-glow-card">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <Badge className="mb-3 gap-1" variant="secondary">
              <Sparkles className="h-3.5 w-3.5" />
              ثيمات المستقبل 2060
            </Badge>

            <h1 className="text-2xl md:text-3xl font-bold">
              تخصيص شكل المنصة
            </h1>

            <p className="mt-2 text-muted-foreground max-w-2xl">
              اختر واحدًا من ثيمات 2060 الفاخرة، مع تحكم كامل بالخطوط وألوان النصوص والإضاءة.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={resetAppearance}>
              <RotateCcw className="ml-2 h-4 w-4" />
              استعادة الافتراضي
            </Button>

            <Button className="future-button-glow">
              <Zap className="ml-2 h-4 w-4" />
              حفظ تلقائي
            </Button>
          </div>
        </div>
      </div>

      <Card className="future-glow-card">
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            اختر ثيم المنصة
          </CardTitle>
          <CardDescription>
            تم تجهيز 5 ثيمات: ثيم داكن رئيسي وأربعة ثيمات فاتحة مستوحاة من التصميمات التي أعجبتك.
          </CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {themes.map((theme) => {
            const active = selectedThemeId === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => applyThemePreset(theme)}
                className={[
                  'group relative overflow-hidden rounded-2xl border p-4 text-right transition-all duration-300',
                  'hover:-translate-y-1 hover:shadow-2xl hover:border-primary',
                  active ? 'border-primary bg-primary/10 future-theme-selected' : 'bg-card/80',
                ].join(' ')}
              >
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      'radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.18), transparent 36%), radial-gradient(circle at 80% 30%, hsl(var(--accent) / 0.15), transparent 32%)',
                  }}
                />

                <div className="relative z-10">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{theme.arabicName}</h3>
                        {theme.badge && <Badge>{theme.badge}</Badge>}
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">{theme.name} — {theme.version}</p>

                      <p className="mt-2 text-sm text-muted-foreground leading-6">
                        {theme.description}
                      </p>
                    </div>

                    <div className={[
                      'flex h-8 w-8 items-center justify-center rounded-full border',
                      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted',
                    ].join(' ')}>
                      {active && <Check className="h-4 w-4" />}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {theme.preview.map((color, index) => (
                      <div
                        key={`${theme.id}-${color}-${index}`}
                        className="h-12 rounded-lg border shadow-sm transition-transform duration-300 group-hover:scale-[1.03]"
                        style={{ background: color }}
                      />
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border bg-background/45 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">معاينة الإضاءة</span>
                      <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_16px_hsl(var(--primary))]" />
                    </div>

                    <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-2/3 rounded-full bg-primary shadow-[0_0_20px_hsl(var(--primary))]" />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            نمط العرض
          </CardTitle>
          <CardDescription>
            يمكنك اختيار فاتح أو داكن يدويًا، لكن عند اختيار ثيم جاهز يتم تطبيق النمط المناسب تلقائيًا.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { id: 'system', label: 'حسب الجهاز', icon: Monitor },
            { id: 'light', label: 'فاتح', icon: Sun },
            { id: 'dark', label: 'داكن', icon: Moon },
          ].map((mode) => {
            const Icon = mode.icon;
            const active = appearanceMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setAppearanceMode(mode.id as AppearanceMode)}
                className={[
                  'relative rounded-xl border p-4 text-right transition-all duration-300',
                  'hover:-translate-y-0.5 hover:border-primary hover:shadow-lg',
                  active ? 'border-primary bg-primary/10 future-theme-selected' : 'bg-card',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-primary" />
                  {active && <Check className="h-5 w-5 text-primary" />}
                </div>

                <p className="mt-4 font-semibold">{mode.label}</p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            التحكم بالخط وألوان النصوص
          </CardTitle>
          <CardDescription>
            تحكم بنوع الخط، حجم الخط، وزن العناوين، وألوان النصوص الأساسية والثانوية والقائمة الجانبية.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>نوع الخط</Label>
              <NativeSelect
                value={fontControls.fontFamily}
                onChange={(event) => updateFontControl('fontFamily', event.target.value)}
              >
                {fontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>حجم الخط العام</Label>
              <NativeSelect
                value={fontControls.baseFontSize}
                onChange={(event) => updateFontControl('baseFontSize', event.target.value)}
              >
                <option value="13px">صغير جدًا</option>
                <option value="14px">صغير</option>
                <option value="15px">متوسط</option>
                <option value="16px">كبير</option>
                <option value="17px">كبير جدًا</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>سماكة العناوين</Label>
              <NativeSelect
                value={fontControls.headingFontWeight}
                onChange={(event) => updateFontControl('headingFontWeight', event.target.value)}
              >
                <option value="500">خفيف</option>
                <option value="600">متوسط</option>
                <option value="700">واضح</option>
                <option value="800">عريض</option>
              </NativeSelect>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ColorInput
              label="لون النص الأساسي"
              value={fontControls.foreground}
              onChange={(value) => updateFontControl('foreground', value)}
            />

            <ColorInput
              label="لون النص الثانوي"
              value={fontControls.mutedForeground}
              onChange={(value) => updateFontControl('mutedForeground', value)}
            />

            <ColorInput
              label="لون نص البطاقات"
              value={fontControls.cardForeground}
              onChange={(value) => updateFontControl('cardForeground', value)}
            />

            <ColorInput
              label="لون نص القائمة الجانبية"
              value={fontControls.sidebarForeground}
              onChange={(value) => updateFontControl('sidebarForeground', value)}
            />

            <ColorInput
              label="لون العناوين والأزرار الرئيسية"
              value={fontControls.primary}
              onChange={(value) => updateFontControl('primary', value)}
            />
          </div>

          <div className="rounded-2xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <p className="font-semibold">معاينة الخط واللون</p>
            </div>

            <div className="rounded-xl border bg-card p-5 future-glow-card">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">
                  عنوان تجريبي داخل المنصة
                </h3>
                <p className="text-muted-foreground leading-7">
                  هذا نص تجريبي يوضح شكل الخط ولون النص الأساسي والثانوي بعد التعديل. يتم حفظ الإعدادات تلقائيًا وتطبيقها مباشرة على المنصة.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button>زر رئيسي</Button>
                  <Button variant="outline">زر ثانوي</Button>
                  <Button variant="secondary">زر مساعد</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
