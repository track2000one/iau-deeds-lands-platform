import React, { useEffect, useState } from 'react';
import { Check, Moon, Palette, RotateCcw, Save, ShieldCheck, Sparkles, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

type ThemeId =
  | 'future-neon-dark'
  | 'future-glass-light'
  | 'official-classic-navy';

type ThemeOption = {
  id: ThemeId;
  name: string;
  title: string;
  description: string;
  badge: string;
  mode: 'light' | 'dark';
  preview: string[];
};

const DEFAULT_THEME_ID: ThemeId = 'future-glass-light';

const getUserKey = (username?: string | null) => {
  const safeUser = username?.trim() || 'guest';

  return {
    theme: `iau-appearance-theme:${safeUser}`,
    mode: `iau-appearance-mode:${safeUser}`,
  };
};

const themes: ThemeOption[] = [
  {
    id: 'future-glass-light',
    name: 'Future Glass Light',
    title: 'زجاج المستقبل الفاتح',
    description: 'تصميم فاتح مطابق لطابع الصورة: زجاج أبيض، إضاءات بنفسجية وسماوية، وبطاقات شفافة راقية.',
    badge: 'فاتح فاخر',
    mode: 'light',
    preview: ['#FFFFFF', '#3F7CFF', '#B87DFF', '#7DE7FF', '#F7FAFF'],
  },
  {
    id: 'future-neon-dark',
    name: 'Future Neon Dark',
    title: 'نيون المستقبل الداكن',
    description: 'تصميم داكن احترافي بإضاءات Neon سماوية وبنفسجية، مناسب للوحة تحكم مستقبلية عالية الفخامة.',
    badge: '2060',
    mode: 'dark',
    preview: ['#060A1F', '#00E5FF', '#7C4DFF', '#00F0B5', '#E6F1FF'],
  },
  {
    id: 'official-classic-navy',
    name: 'Official Classic Navy',
    title: 'الكلاسيك الرسمي',
    description: 'تصميم رسمي واضح وهادئ مناسب للاستخدام الإداري اليومي.',
    badge: 'رسمي',
    mode: 'light',
    preview: ['#FCFAF1', '#2C4F73', '#6B9CC1', '#FFFFFF', '#C40028'],
  },
];

const applyThemePreview = (theme: ThemeOption) => {
  document.documentElement.dataset.appearanceTheme = theme.id;
  document.documentElement.dataset.appearanceMode = theme.mode;
  document.documentElement.classList.toggle('dark', theme.mode === 'dark');
};

export const AppearanceSettingsPage: React.FC = () => {
  const { username } = useAuth();
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [savedTheme, setSavedTheme] = useState<ThemeId>(DEFAULT_THEME_ID);

  useEffect(() => {
    const keys = getUserKey(username);
    const current = (localStorage.getItem(keys.theme) as ThemeId) || DEFAULT_THEME_ID;

    setSelectedTheme(current);
    setSavedTheme(current);
  }, [username]);

  const previewTheme = (theme: ThemeOption) => {
    setSelectedTheme(theme.id);
    applyThemePreview(theme);
    toast.info('تمت المعاينة فقط، اضغط حفظ لاعتماد الثيم');
  };

  const saveTheme = () => {
    const keys = getUserKey(username);
    const theme = themes.find((item) => item.id === selectedTheme) || themes[0];

    localStorage.setItem(keys.theme, theme.id);
    localStorage.setItem(keys.mode, theme.mode);

    applyThemePreview(theme);
    setSavedTheme(theme.id);

    toast.success('تم حفظ الثيم لهذا المستخدم فقط');
  };

  const resetTheme = () => {
    const keys = getUserKey(username);
    const theme = themes.find((item) => item.id === DEFAULT_THEME_ID) || themes[0];

    localStorage.setItem(keys.theme, theme.id);
    localStorage.setItem(keys.mode, theme.mode);

    setSelectedTheme(theme.id);
    setSavedTheme(theme.id);
    applyThemePreview(theme);

    toast.success('تمت استعادة الثيم الافتراضي');
  };

  const selected = themes.find((theme) => theme.id === selectedTheme) || themes[0];

  return (
    <div className="w-full space-y-5">
      <div className="future-card p-5 md:p-6 2xl:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <Badge variant="secondary" className="mb-3">
              <Sparkles className="ml-2 h-4 w-4" />
              إعدادات المظهر 2060
            </Badge>

            <h1 className="text-3xl font-bold">إعدادات المظهر</h1>
            <p className="mt-2 text-muted-foreground">
              اختر واجهة مشابهة للمرفق: داكن Neon أو فاتح Glass، ويتم حفظ الاختيار لهذا المستخدم فقط.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
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
          <div className="mt-4 rounded-xl border bg-primary/10 p-3 text-sm">
            هذا الثيم قيد المعاينة ولم يتم حفظه بعد.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <Card className="future-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              اختر السمة
            </CardTitle>
            <CardDescription>
              اضغط على الثيم للمعاينة، ثم اضغط حفظ لهذا المستخدم.
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
                    'future-card min-w-0 text-right p-4 border transition-all',
                    isActive ? 'ring-2 ring-primary' : '',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-lg">{theme.title}</h3>
                        <Badge>{theme.badge}</Badge>
                        {isSaved && <Badge variant="secondary">محفوظ</Badge>}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground leading-6">
                        {theme.description}
                      </p>
                    </div>

                    <div
                      className={[
                        'h-9 w-9 rounded-full border flex items-center justify-center',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted',
                      ].join(' ')}
                    >
                      {isActive && <Check className="h-5 w-5" />}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-5 gap-2">
                    {theme.preview.map((color) => (
                      <div
                        key={color}
                        className="h-14 rounded-xl border shadow-sm"
                        style={{ background: color }}
                      />
                    ))}
                  </div>

                  <div className="mt-5 rounded-xl border bg-background/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">معاينة الإضاءة</span>
                      {theme.mode === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </div>
                    <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-2/3 rounded-full bg-primary shadow-[0_0_22px_hsl(var(--primary))]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="future-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              معاينة مباشرة
            </CardTitle>
            <CardDescription>{selected.name}</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="future-hero-art min-h-[240px]">
              <div className="future-shield">
                <ShieldCheck className="h-24 w-24" />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border bg-background/50 p-4">
              <p className="font-bold">{selected.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                يتم تطبيق السمة مباشرة كمعاينة، والحفظ يتم فقط بزر الحفظ.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
