import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
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

const AssetThemePreview: React.FC<{
  theme: ThemeOption;
  active: boolean;
}> = ({ theme, active }) => {
  const dashboard = theme.visual.assetDashboard;

  return (
    <div
      className="relative mt-5 overflow-hidden rounded-[22px] border p-3 text-white"
      style={{
        background: dashboard.base,
        borderColor: dashboard.border,
        boxShadow: active
          ? `0 0 0 2px ${dashboard.glow}, ${dashboard.shadow}`
          : dashboard.shadow,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: dashboard.overlay }}
      />
      <div className="relative space-y-2.5">
        <div
          className="h-7 rounded-xl border"
          style={{
            background: dashboard.panel,
            borderColor: dashboard.border,
          }}
        />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-12 rounded-xl border"
              style={{
                background:
                  item === 1 ? dashboard.panelStrong : dashboard.panel,
                borderColor: dashboard.border,
              }}
            />
          ))}
        </div>
        <div className="grid grid-cols-[0.78fr_1.4fr] gap-2">
          <div
            className="h-24 rounded-xl border"
            style={{
              background: dashboard.panel,
              borderColor: dashboard.border,
            }}
          />
          <div
            className="h-24 rounded-xl border p-2"
            style={{
              background: dashboard.panelStrong,
              borderColor: dashboard.border,
            }}
          >
            <div
              className="h-2.5 w-2/3 rounded-full"
              style={{ background: dashboard.glow }}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div
                className="h-12 rounded-lg border"
                style={{
                  background: dashboard.panel,
                  borderColor: dashboard.border,
                }}
              />
              <div
                className="h-12 rounded-lg border"
                style={{
                  background: dashboard.panel,
                  borderColor: dashboard.border,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    toast.info('تم تطبيق اللون كتجربة على وحدة الأصول؛ اضغط حفظ لاعتماده');
  };

  const saveTheme = () => {
    const keys = getUserKey(username);
    const theme = getThemeById(selectedTheme);

    localStorage.setItem(keys.theme, theme.id);
    localStorage.setItem(keys.mode, 'light');

    applyAppearanceTheme(theme.id);
    setSavedTheme(theme.id);
    savedThemeRef.current = theme.id;

    toast.success('تم حفظ لون وحدة الأصول لهذا المستخدم');
  };

  const resetTheme = () => {
    const keys = getUserKey(username);
    const theme = getThemeById(DEFAULT_THEME_ID);

    localStorage.setItem(keys.theme, theme.id);
    localStorage.setItem(keys.mode, 'light');

    setSelectedTheme(theme.id);
    setSavedTheme(theme.id);
    savedThemeRef.current = theme.id;
    applyAppearanceTheme(theme.id);

    toast.success('تمت استعادة اللون الافتراضي لوحدة الأصول');
  };

  const selected = getThemeById(selectedTheme);

  return (
    <div className="w-full space-y-5">
      <div className="future-card future-glass-thick p-5 md:p-6 2xl:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">
              <ShieldCheck className="ml-2 h-4 w-4" />
              تجربة ألوان وحدة الأصول
            </Badge>

            <h1 className="text-3xl font-bold">ألوان المظهر التجريبية</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              تم حذف الثيمات السابقة واستبدالها بست لوحات ألوان مستوحاة من
              المراجع المرفقة. في هذه المرحلة ينعكس الاختيار على لوحة وحدة
              الأصول فقط، بينما يبقى المظهر العام للمنصة فاتحًا وثابتًا.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={resetTheme}>
              <RotateCcw className="ml-2 h-4 w-4" />
              استعادة الافتراضي
            </Button>

            <Button onClick={saveTheme} className="future-glow-button">
              <Save className="ml-2 h-4 w-4" />
              حفظ التجربة
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-primary/15 bg-background/70 p-3 text-sm text-muted-foreground">
          <Sparkles className="ml-2 inline h-4 w-4" />
          بعد اختيار اللون انتقل إلى «وحدة الأصول» لمشاهدة النتيجة الفعلية.
          لن نعمم أي لوحة على بقية المنصة إلا بعد اعتمادك للثيم الأفضل.
        </div>

        {selectedTheme !== savedTheme && (
          <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-sm">
            اللون الحالي قيد المعاينة فقط. اضغط «حفظ التجربة» لاعتماده لهذا
            المستخدم.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]">
        <Card className="future-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              اختر لوحة الألوان
            </CardTitle>
            <CardDescription>
              ست لوحات فقط، مطابقة للألوان التي أرسلتها، ومخصصة حاليًا لتجربة
              لوحة وحدة الأصول.
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
                      ) : (
                        <Palette className="h-4 w-4" />
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border bg-background/70 px-2.5 py-1">
                      {theme.glassLabel}
                    </span>
                    <span className="rounded-full border bg-background/70 px-2.5 py-1">
                      {theme.glowLabel}
                    </span>
                  </div>

                  <AssetThemePreview theme={theme} active={isActive} />

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {theme.preview.map((color) => (
                      <div
                        key={color}
                        className="h-11 rounded-xl border shadow-sm"
                        style={{ background: color }}
                        title={color}
                      />
                    ))}
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-[10px] text-muted-foreground">
                    {theme.preview.map((color) => (
                      <span key={`${theme.id}-${color}`}>{color}</span>
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
              المعاينة المختارة
            </CardTitle>
            <CardDescription>{selected.name}</CardDescription>
          </CardHeader>

          <CardContent>
            <AssetThemePreview theme={selected} active />

            <div className="future-glass-thick mt-4 rounded-2xl border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{selected.title}</p>
                <Badge variant="secondary">{selected.badge}</Badge>
              </div>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {selected.description}
              </p>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {selected.preview.map((color) => (
                  <div key={color} className="text-center">
                    <div
                      className="h-12 rounded-xl border shadow-sm"
                      style={{ background: color }}
                    />
                    <span className="mt-1 block text-[10px] text-muted-foreground">
                      {color}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                هذه تجربة خاصة بوحدة الأصول. بعد اختيار اللوحة الأفضل يمكن
                توحيدها على بقية صفحات المنصة في خطوة مستقلة.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
