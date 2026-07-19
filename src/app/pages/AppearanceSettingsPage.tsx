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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';

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

type ThemeOption = {
  id: string;
  name: string;
  description: string;
  badge?: string;
  preview: string[];
  variables: Record<string, string>;
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
  { label: 'Arial', value: 'Arial, Tahoma, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Arial, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", Tahoma, Arial, sans-serif' },
  { label: 'System', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
];

const themes: ThemeOption[] = [
  {
    id: 'railway-neon',
    name: 'Railway Neon',
    description: 'مظهر داكن عصري بتوهج بنفسجي/أزرق وحواف مضيئة أثناء الاختيار.',
    badge: 'جديد',
    preview: ['#0b0814', '#7c3aed', '#22d3ee', '#f8fafc'],
    variables: {
      background: '258 32% 7%',
      foreground: '210 40% 98%',
      card: '257 30% 10%',
      cardForeground: '210 40% 98%',
      popover: '257 30% 10%',
      popoverForeground: '210 40% 98%',
      primary: '263 90% 64%',
      primaryForeground: '210 40% 98%',
      secondary: '222 32% 16%',
      secondaryForeground: '210 40% 98%',
      muted: '222 25% 14%',
      mutedForeground: '226 18% 70%',
      accent: '190 95% 45%',
      accentForeground: '210 40% 98%',
      border: '262 40% 25%',
      input: '262 35% 20%',
      ring: '263 90% 64%',
      destructive: '0 84% 60%',
      destructiveForeground: '210 40% 98%',
      sidebar: '257 34% 9%',
      sidebarForeground: '210 40% 98%',
      sidebarPrimary: '263 90% 64%',
      sidebarPrimaryForeground: '210 40% 98%',
      sidebarAccent: '263 55% 18%',
      sidebarAccentForeground: '210 40% 98%',
      sidebarBorder: '263 35% 24%',
      sidebarRing: '263 90% 64%',
    },
  },
  {
    id: 'professional-blue',
    name: 'الأزرق المهني',
    description: 'المظهر الرسمي الحالي للمنصة بألوان الجامعة واللون الأزرق.',
    preview: ['#fcfaf1', '#6b9cc1', '#446b8f', '#2c4a6b'],
    variables: {
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
      muted: '210 25% 92%',
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
  },
  {
    id: 'graphite-glass',
    name: 'Graphite Glass',
    description: 'مظهر داكن هادئ ببطاقات زجاجية وتباين واضح.',
    preview: ['#0f172a', '#334155', '#14b8a6', '#e2e8f0'],
    variables: {
      background: '222 47% 8%',
      foreground: '210 40% 96%',
      card: '222 40% 12%',
      cardForeground: '210 40% 96%',
      popover: '222 40% 12%',
      popoverForeground: '210 40% 96%',
      primary: '173 80% 40%',
      primaryForeground: '222 47% 8%',
      secondary: '215 28% 18%',
      secondaryForeground: '210 40% 96%',
      muted: '215 24% 16%',
      mutedForeground: '215 16% 70%',
      accent: '199 89% 48%',
      accentForeground: '210 40% 96%',
      border: '215 24% 22%',
      input: '215 24% 20%',
      ring: '173 80% 40%',
      destructive: '0 72% 51%',
      destructiveForeground: '210 40% 96%',
      sidebar: '222 47% 9%',
      sidebarForeground: '210 40% 96%',
      sidebarPrimary: '173 80% 40%',
      sidebarPrimaryForeground: '222 47% 8%',
      sidebarAccent: '215 28% 18%',
      sidebarAccentForeground: '210 40% 96%',
      sidebarBorder: '215 24% 22%',
      sidebarRing: '173 80% 40%',
    },
  },
  {
    id: 'sand-admin',
    name: 'الرمل الإداري',
    description: 'ألوان هادئة مناسبة للطباعة والعمل الرسمي اليومي.',
    preview: ['#fdfaf5', '#6b5d50', '#a89586', '#4a7c9b'],
    variables: {
      background: '38 60% 97%',
      foreground: '28 20% 20%',
      card: '0 0% 100%',
      cardForeground: '28 20% 20%',
      popover: '0 0% 100%',
      popoverForeground: '28 20% 20%',
      primary: '204 36% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '30 18% 64%',
      secondaryForeground: '28 20% 20%',
      muted: '36 35% 92%',
      mutedForeground: '28 12% 45%',
      accent: '31 66% 76%',
      accentForeground: '28 20% 20%',
      border: '35 28% 82%',
      input: '35 28% 82%',
      ring: '204 36% 45%',
      destructive: '0 72% 51%',
      destructiveForeground: '0 0% 100%',
      sidebar: '204 36% 32%',
      sidebarForeground: '0 0% 100%',
      sidebarPrimary: '31 66% 76%',
      sidebarPrimaryForeground: '28 20% 20%',
      sidebarAccent: '204 30% 40%',
      sidebarAccentForeground: '0 0% 100%',
      sidebarBorder: '204 25% 38%',
      sidebarRing: '31 66% 76%',
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
};

const applyMode = (mode: AppearanceMode) => {
  const root = document.documentElement;
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = mode === 'dark' || (mode === 'system' && systemDark);

  root.classList.toggle('dark', shouldUseDark);
  root.dataset.appearanceMode = mode;
};

const injectAppearanceStyles = () => {
  const styleId = 'iau-appearance-custom-style';

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
    }

    h1, h2, h3, h4, h5, h6, .font-bold {
      font-weight: var(--app-heading-font-weight) !important;
    }

    html[data-appearance-theme="railway-neon"] body {
      background:
        radial-gradient(circle at 15% 15%, rgba(124, 58, 237, 0.18), transparent 32%),
        radial-gradient(circle at 80% 20%, rgba(34, 211, 238, 0.10), transparent 30%),
        hsl(var(--background)) !important;
    }

    html[data-appearance-theme="railway-neon"] .railway-glow-card {
      position: relative;
      overflow: hidden;
      border-color: rgba(124, 58, 237, 0.35) !important;
      box-shadow:
        0 0 0 1px rgba(124, 58, 237, 0.18),
        0 18px 60px rgba(0, 0, 0, 0.35);
    }

    html[data-appearance-theme="railway-neon"] .railway-glow-card::before {
      content: "";
      position: absolute;
      inset: -1px;
      background:
        radial-gradient(circle at var(--x, 20%) var(--y, 20%), rgba(124, 58, 237, 0.28), transparent 30%),
        linear-gradient(120deg, transparent, rgba(34, 211, 238, 0.10), transparent);
      pointer-events: none;
      opacity: 0.8;
    }

    html[data-appearance-theme="railway-neon"] .railway-theme-selected {
      box-shadow:
        0 0 0 1px rgba(124, 58, 237, 0.75),
        0 0 32px rgba(124, 58, 237, 0.55),
        inset 0 0 30px rgba(34, 211, 238, 0.08) !important;
    }

    html[data-appearance-theme="railway-neon"] .railway-button-glow {
      box-shadow: 0 0 22px rgba(124, 58, 237, 0.45);
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
      <div className="flex items-center gap-2 rounded-lg border bg-background p-2">
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
    () => localStorage.getItem(STORAGE_THEME_KEY) || 'professional-blue'
  );

  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(
    () => (localStorage.getItem(STORAGE_MODE_KEY) as AppearanceMode) || 'system'
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
    applyFontControls(fontControls);
    localStorage.setItem(STORAGE_THEME_KEY, selectedTheme.id);
  }, [selectedTheme, fontControls]);

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

  const resetAppearance = () => {
    setSelectedThemeId('professional-blue');
    setAppearanceMode('system');
    setFontControls(defaultFontControls);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-6 md:p-8 railway-glow-card">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <Badge className="mb-3 gap-1" variant="secondary">
              <Sparkles className="h-3.5 w-3.5" />
              إعدادات المظهر
            </Badge>

            <h1 className="text-2xl md:text-3xl font-bold">
              تخصيص شكل المنصة
            </h1>

            <p className="mt-2 text-muted-foreground max-w-2xl">
              اختر مظهرًا عصريًا للمنصة، وتحكم بالخط وحجم الخط وألوان النصوص والعناوين والقائمة الجانبية.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={resetAppearance}>
              <RotateCcw className="ml-2 h-4 w-4" />
              استعادة الافتراضي
            </Button>

            <Button className="railway-button-glow">
              <Zap className="ml-2 h-4 w-4" />
              تم الحفظ تلقائيًا
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            نمط العرض
          </CardTitle>
          <CardDescription>
            اختر الوضع الفاتح أو الداكن أو حسب إعدادات الجهاز.
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
                  active ? 'border-primary bg-primary/10 railway-theme-selected' : 'bg-card',
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
            <Palette className="h-5 w-5" />
            مظاهر المنصة
          </CardTitle>
          <CardDescription>
            اختر مجموعة ألوان متكاملة. مظهر Railway Neon يعطي إحساسًا قريبًا من Railway من ناحية الظلام والتوهج والحواف الحديثة.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {themes.map((theme) => {
            const active = selectedThemeId === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setSelectedThemeId(theme.id)}
                className={[
                  'group relative overflow-hidden rounded-2xl border p-4 text-right transition-all duration-300',
                  'hover:-translate-y-1 hover:shadow-2xl hover:border-primary',
                  active ? 'border-primary bg-primary/10 railway-theme-selected' : 'bg-card',
                ].join(' ')}
              >
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      theme.id === 'railway-neon'
                        ? 'radial-gradient(circle at 20% 20%, rgba(124,58,237,0.22), transparent 36%), radial-gradient(circle at 80% 30%, rgba(34,211,238,0.16), transparent 32%)'
                        : 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14), transparent 32%)',
                  }}
                />

                <div className="relative z-10">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-lg">{theme.name}</h3>
                        {theme.badge && <Badge>{theme.badge}</Badge>}
                      </div>

                      <p className="mt-1 text-sm text-muted-foreground leading-6">
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

                  {theme.id === 'railway-neon' && (
                    <div className="mt-4 rounded-xl border border-purple-500/30 bg-black/30 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Railway style preview</span>
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
                      </div>

                      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full w-2/3 rounded-full bg-primary shadow-[0_0_20px_rgba(124,58,237,0.8)]" />
                      </div>
                    </div>
                  )}
                </div>
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

            <div className="rounded-xl border bg-card p-5">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معاينة مباشرة</CardTitle>
          <CardDescription>
            مثال سريع يوضح شكل البطاقات والأزرار قبل اعتماد التصميم على كامل المنصة.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border bg-card p-4 railway-glow-card">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">إجمالي السجلات</p>
                <p className="mt-2 text-3xl font-bold text-primary">128</p>
              </div>

              <div className="rounded-xl border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">المرفقات</p>
                <p className="mt-2 text-3xl font-bold text-primary">42</p>
              </div>

              <div className="rounded-xl border bg-background/60 p-4">
                <p className="text-sm text-muted-foreground">حالة النظام</p>
                <p className="mt-2 text-lg font-bold text-emerald-400">Online</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
