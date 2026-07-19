import React, { useEffect, useMemo, useState } from 'react';
import { Check, Moon, Palette, RotateCcw, Sparkles, Sun, Monitor, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';

type AppearanceMode = 'light' | 'dark' | 'system';

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

const applyMode = (mode: AppearanceMode) => {
  const root = document.documentElement;
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const shouldUseDark = mode === 'dark' || (mode === 'system' && systemDark);

  root.classList.toggle('dark', shouldUseDark);
  root.dataset.appearanceMode = mode;
};

const injectRailwayGlowStyles = () => {
  const styleId = 'iau-railway-appearance-glow-style';

  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
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
        radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.28), transparent 30%),
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

export const AppearanceSettingsPage: React.FC = () => {
  const [selectedThemeId, setSelectedThemeId] = useState(
    () => localStorage.getItem(STORAGE_THEME_KEY) || 'professional-blue'
  );

  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>(
    () => (localStorage.getItem(STORAGE_MODE_KEY) as AppearanceMode) || 'system'
  );

  const selectedTheme = useMemo(() => {
    return themes.find((theme) => theme.id === selectedThemeId) || themes[0];
  }, [selectedThemeId]);

  useEffect(() => {
    injectRailwayGlowStyles();
  }, []);

  useEffect(() => {
    applyThemeVariables(selectedTheme);
    localStorage.setItem(STORAGE_THEME_KEY, selectedTheme.id);
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

  const resetAppearance = () => {
    setSelectedThemeId('professional-blue');
    setAppearanceMode('system');
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

            <h1 className="text-2xl md:text-3xl font-bold">تخصيص شكل المنصة</h1>

            <p className="mt-2 text-muted-foreground max-w-2xl">
              اختر مظهرًا عصريًا للمنصة. تمت إضافة مظهر Railway Neon مع توهج أثناء الاختيار، وحواف مضيئة، وخلفية داكنة احترافية.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={resetAppearance}>
              <RotateCcw className="ml-2 h-4 w-4" />
              استعادة الافتراضي
            </Button>

            <Button className="railway-button-glow" type="button">
              <Zap className="ml-2 h-4 w-4" />
              يتم الحفظ تلقائيًا
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
          <CardDescription>اختر الوضع الفاتح أو الداكن أو حسب إعدادات الجهاز.</CardDescription>
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
            اختر مجموعة ألوان متكاملة. مظهر Railway Neon يعطي إحساسًا قريبًا من لوحة Railway من ناحية الظلام والتوهج والحواف الحديثة.
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

                      <p className="mt-1 text-sm text-muted-foreground leading-6">{theme.description}</p>
                    </div>

                    <div
                      className={[
                        'flex h-8 w-8 items-center justify-center rounded-full border',
                        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted',
                      ].join(' ')}
                    >
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

            <div className="relative z-10 mt-4 flex flex-col sm:flex-row gap-2">
              <Button>زر أساسي</Button>
              <Button variant="outline">زر ثانوي</Button>
              <Button variant="secondary">زر مساعد</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>اختيار سريع للمظهر</Label>
              <NativeSelect value={selectedThemeId} onChange={(event) => setSelectedThemeId(event.target.value)}>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>نمط العرض</Label>
              <NativeSelect value={appearanceMode} onChange={(event) => setAppearanceMode(event.target.value as AppearanceMode)}>
                <option value="system">حسب الجهاز</option>
                <option value="light">فاتح</option>
                <option value="dark">داكن</option>
              </NativeSelect>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
