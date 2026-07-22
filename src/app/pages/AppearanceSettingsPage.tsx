import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Moon,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  DEFAULT_THEME_ID,
  applyAppearanceTheme,
  getThemeById,
  themes,
  type ThemeId,
  type ThemeOption,
} from '../theme/appearanceThemes';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

const getUserKey = (username?: string | null) => {
  const safeUser = username?.trim() || 'guest';

  return {
    theme: `iau-appearance-theme:${safeUser}`,
    mode: `iau-appearance-mode:${safeUser}`,
  };
};

const ThemeMiniPreview: React.FC<{
  theme: ThemeOption;
  active: boolean;
}> = ({ theme, active }) => (
  <div
    className="relative mt-5 overflow-hidden rounded-[22px] border p-4"
    style={{
      background: theme.visual.background,
      borderColor: theme.visual.border,
      boxShadow: active
        ? `0 0 0 2px ${theme.visual.glow}, ${theme.visual.shadow}`
        : theme.visual.shadow,
    }}
  >
    <div
      className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl"
      style={{ background: theme.visual.glow }}
    />
    <div
      className="absolute -bottom-12 -left-8 h-28 w-28 rounded-full blur-3xl"
      style={{ background: theme.visual.glowSecondary }}
    />

    <div
      className="relative rounded-2xl border px-3 py-2"
      style={{
        background: theme.visual.topbar,
        borderColor: theme.visual.border,
        backdropFilter: 'blur(18px)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="h-2.5 w-24 rounded-full bg-primary/75" />
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-secondary/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-accent/80" />
        </div>
      </div>
    </div>

    <div className="relative mt-3 grid grid-cols-[72px_1fr] gap-3">
      <div
        className="rounded-2xl border p-2"
        style={{
          background: theme.visual.sidebar,
          borderColor: theme.visual.border,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="space-y-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className={[
                'h-7 rounded-xl',
                item === 1 ? 'bg-primary/25' : 'bg-background/30',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-14 rounded-2xl border"
              style={{
                background:
                  item === 1
                    ? theme.visual.glassStrong
                    : theme.visual.glass,
                borderColor: theme.visual.border,
                backdropFilter: 'blur(24px)',
                boxShadow:
                  item === 1
                    ? `0 0 24px ${theme.visual.glow}`
                    : 'none',
              }}
            />
          ))}
        </div>

        <div
          className="h-20 rounded-2xl border p-3"
          style={{
            background: theme.visual.glassStrong,
            borderColor: theme.visual.border,
            backdropFilter: 'blur(26px)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,.28), 0 0 26px ${theme.visual.glowSecondary}`,
          }}
        >
          <div className="h-2.5 w-1/2 rounded-full bg-primary/70" />
          <div className="mt-3 h-2 w-4/5 rounded-full bg-muted-foreground/25" />
          <div className="mt-2 h-2 w-2/3 rounded-full bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  </div>
);

export const AppearanceSettingsPage: React.FC = () => {
  const { username } = useAuth();
  const [selectedTheme, setSelectedTheme] =
    useState<ThemeId>(DEFAULT_THEME_ID);
  const [savedTheme, setSavedTheme] = useState<ThemeId>(DEFAULT_THEME_ID);
  const savedThemeRef = useRef<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    const keys = getUserKey(username);
    const storedTheme = localStorage.getItem(keys.theme);
    const current = getThemeById(storedTheme);

    setSelectedTheme(current.id);
    setSavedTheme(current.id);
    savedThemeRef.current = current.id;
    applyAppearanceTheme(current.id);
  }, [username]);

  useEffect(() => {
    savedThemeRef.current = savedTheme;
  }, [savedTheme]);

  useEffect(
    () => () => {
      applyAppearanceTheme(savedThemeRef.current);
    },
    []
  );

  const previewTheme = (theme: ThemeOption) => {
    setSelectedTheme(theme.id);
    applyAppearanceTheme(theme.id);
    toast.info('تم تطبيق المعاينة؛ اضغط حفظ لاعتماد المظهر');
  };

  const saveTheme = () => {
    const keys = getUserKey(username);
    const theme = getThemeById(selectedTheme);

    localStorage.setItem(keys.theme, theme.id);
    localStorage.setItem(keys.mode, theme.mode);

    applyAppearanceTheme(theme.id);
    setSavedTheme(theme.id);
    savedThemeRef.current = theme.id;

    toast.success('تم حفظ المظهر لهذا المستخدم');
  };

  const resetTheme = () => {
    const keys = getUserKey(username);
    const theme = getThemeById(DEFAULT_THEME_ID);

    localStorage.setItem(keys.theme, theme.id);
    localStorage.setItem(keys.mode, theme.mode);

    setSelectedTheme(theme.id);
    setSavedTheme(theme.id);
    savedThemeRef.current = theme.id;
    applyAppearanceTheme(theme.id);

    toast.success('تمت استعادة المظهر الافتراضي');
  };

  const selected = getThemeById(selectedTheme);

  return (
    <div className="w-full space-y-5">
      <div className="future-card future-glass-thick p-5 md:p-6 2xl:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">
              <Sparkles className="ml-2 h-4 w-4" />
              مكتبة المظهر الاحترافية
            </Badge>

            <h1 className="text-3xl font-bold">إعدادات المظهر</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              اختر مظهرًا عصريًا ملائمًا للمنصة. تتضمن المجموعة بطاقات زجاجية
              سميكة، وحواف مضيئة بنور هادئ، وخيارات رسمية وفاتحة وليلية.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={resetTheme}>
              <RotateCcw className="ml-2 h-4 w-4" />
              استعادة الافتراضي
            </Button>

            <Button onClick={saveTheme} className="future-glow-button">
              <Save className="ml-2 h-4 w-4" />
              حفظ لهذا المستخدم
            </Button>
          </div>
        </div>

        {selectedTheme !== savedTheme && (
          <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-sm">
            المظهر الحالي قيد المعاينة فقط. اضغط «حفظ لهذا المستخدم» لاعتماده.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]">
        <Card className="future-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              اختر المظهر
            </CardTitle>
            <CardDescription>
              اضغط على أي مظهر لتطبيق معاينة مباشرة على كامل المنصة.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {themes.map((theme) => {
              const isActive = selectedTheme === theme.id;
              const isSaved = savedTheme === theme.id;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => previewTheme(theme)}
                  className={[
                    'future-card min-w-0 border p-4 text-right transition-all',
                    isActive ? 'ring-2 ring-primary' : '',
                  ].join(' ')}
                  aria-pressed={isActive}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold">{theme.title}</h3>
                        <Badge>{theme.badge}</Badge>
                        {isSaved && (
                          <Badge variant="secondary">محفوظ</Badge>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {theme.description}
                      </p>
                    </div>

                    <div
                      className={[
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted',
                      ].join(' ')}
                    >
                      {isActive ? (
                        <Check className="h-5 w-5" />
                      ) : theme.mode === 'dark' ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border bg-background/50 px-2.5 py-1">
                      {theme.glassLabel}
                    </span>
                    <span className="rounded-full border bg-background/50 px-2.5 py-1">
                      {theme.glowLabel}
                    </span>
                  </div>

                  <ThemeMiniPreview theme={theme} active={isActive} />

                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {theme.preview.map((color) => (
                      <div
                        key={color}
                        className="h-10 rounded-xl border shadow-sm"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="future-card future-glass-thick 2xl:sticky 2xl:top-24 2xl:self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              معاينة مباشرة
            </CardTitle>
            <CardDescription>{selected.name}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="future-hero-art min-h-[260px]">
              <div className="future-shield">
                <ShieldCheck className="h-24 w-24" />
              </div>
            </div>

            <div className="future-glass-thick mt-4 rounded-2xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{selected.title}</p>
                <Badge variant="secondary">{selected.badge}</Badge>
              </div>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {selected.description}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border bg-background/35 p-3">
                  <span className="text-xs text-muted-foreground">
                    نوع السطح
                  </span>
                  <p className="mt-1 font-semibold">{selected.glassLabel}</p>
                </div>

                <div className="rounded-xl border bg-background/35 p-3">
                  <span className="text-xs text-muted-foreground">
                    نوع الإضاءة
                  </span>
                  <p className="mt-1 font-semibold">{selected.glowLabel}</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                يتم تطبيق المعاينة فورًا، ولا يعتمد المظهر إلا بعد الضغط على
                زر الحفظ.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
