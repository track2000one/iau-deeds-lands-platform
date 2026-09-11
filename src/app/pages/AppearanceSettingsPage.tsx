import React, { useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Layers3,
  PaintBucket,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sun,
  Trash2,
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
  DEFAULT_USER_DISPLAY_PREFERENCES,
  DISPLAY_FONT_OPTIONS,
  DISPLAY_FONT_SIZE_MAX,
  DISPLAY_FONT_SIZE_MIN,
  DISPLAY_MUTED_COLOR_PRESETS,
  DISPLAY_TEXT_COLOR_PRESETS,
  applyUserDisplayPreferences,
  loadUserDisplayPreferences,
  normalizeUserDisplayPreferences,
  saveUserDisplayPreferences,
  userDisplayPreferencesEqual,
  type UserDisplayPreferences,
} from '../theme/userDisplayPreferences';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Input } from '../components/ui/input';
import {
  EMPTY_USER_THEME_COLORS,
  createSavedUserTheme,
  extractUserThemeColors,
  loadUserThemeLibrary,
  mergeUserThemeColors,
  saveUserThemeLibrary,
  type SavedUserTheme,
  type UserThemeColors,
} from '../theme/userThemeLibrary';
import { toast } from 'sonner';

const THEME_COLOR_PRESETS: Array<{
  name: string;
  description: string;
  colors: UserThemeColors;
}> = [
  {
    name: 'الأزرق الجامعي',
    description: 'أزرق رسمي هادئ مناسب للعمل الإداري اليومي.',
    colors: {
      backgroundColor: '#eef4f9',
      surfaceColor: '#ffffff',
      sidebarColor: '#f7fafc',
      topbarColor: '#ffffff',
      primaryColor: '#245b86',
      secondaryColor: '#5f7891',
      accentColor: '#2f8195',
      sidebarTextColor: '#20384f',
    },
  },
  {
    name: 'الزمرد الإداري',
    description: 'أخضر بترولي رسمي مع خلفيات فاتحة مريحة.',
    colors: {
      backgroundColor: '#eef7f4',
      surfaceColor: '#ffffff',
      sidebarColor: '#f5fbf8',
      topbarColor: '#ffffff',
      primaryColor: '#176b5b',
      secondaryColor: '#4f7f75',
      accentColor: '#2b8f7c',
      sidebarTextColor: '#21483f',
    },
  },
  {
    name: 'الرمادي التنفيذي',
    description: 'محايد ورسمي مع تباين واضح للنصوص والجداول.',
    colors: {
      backgroundColor: '#f0f2f4',
      surfaceColor: '#fbfcfd',
      sidebarColor: '#f5f6f7',
      topbarColor: '#fafbfc',
      primaryColor: '#445d73',
      secondaryColor: '#687b8c',
      accentColor: '#607d8b',
      sidebarTextColor: '#2e3f4d',
    },
  },
  {
    name: 'الرملي الهادئ',
    description: 'درجات دافئة خفيفة تقلل إجهاد العين في الاستخدام الطويل.',
    colors: {
      backgroundColor: '#f7f3ec',
      surfaceColor: '#fffdfa',
      sidebarColor: '#fbf8f2',
      topbarColor: '#fffdfa',
      primaryColor: '#805f36',
      secondaryColor: '#8a7356',
      accentColor: '#9a7646',
      sidebarTextColor: '#514231',
    },
  },
];

const THEME_COLOR_CONTROLS: Array<{
  key: keyof UserThemeColors;
  label: string;
  description: string;
  fallback: string;
}> = [
  { key: 'backgroundColor', label: 'خلفية المنصة', description: 'الخلفية العامة خلف الصفحات والمحتوى.', fallback: '#eef4f9' },
  { key: 'surfaceColor', label: 'البطاقات والأسطح', description: 'لون البطاقات والنوافذ والأسطح الرئيسية.', fallback: '#ffffff' },
  { key: 'sidebarColor', label: 'القائمة الجانبية', description: 'لون خلفية قائمة التنقل الرئيسية.', fallback: '#f7fafc' },
  { key: 'topbarColor', label: 'الشريط العلوي', description: 'لون شريط الأدوات أعلى المنصة.', fallback: '#ffffff' },
  { key: 'primaryColor', label: 'اللون الأساسي', description: 'للأزرار والعناصر المحددة والهوية الرئيسية.', fallback: '#245b86' },
  { key: 'secondaryColor', label: 'اللون الثانوي', description: 'للعناصر الثانوية والمساندة.', fallback: '#5f7891' },
  { key: 'accentColor', label: 'لون الإبراز', description: 'للتأكيد البصري والعناصر المساعدة.', fallback: '#2f8195' },
  { key: 'sidebarTextColor', label: 'نص القائمة', description: 'لون الكتابة والأيقونات داخل القائمة الجانبية.', fallback: '#20384f' },
];

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
      className="relative rounded-2xl border px-3 py-2"
      style={{
        background: theme.visual.topbar,
        borderColor: theme.visual.border,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="h-2.5 w-24 rounded-full bg-primary/70" />
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-primary/75" />
          <div className="h-2.5 w-2.5 rounded-full bg-secondary/70" />
        </div>
      </div>
    </div>

    <div className="relative mt-3 grid grid-cols-[72px_1fr] gap-3">
      <div
        className="rounded-2xl border p-2"
        style={{
          background: theme.visual.sidebar,
          borderColor: theme.visual.border,
        }}
      >
        <div className="space-y-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className={[
                'h-7 rounded-xl border',
                item === 1 ? 'bg-primary/15' : 'bg-background/45',
              ].join(' ')}
              style={{ borderColor: theme.visual.border }}
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
              }}
            />
          ))}
        </div>

        <div
          className="h-20 rounded-2xl border p-3"
          style={{
            background: theme.visual.glassStrong,
            borderColor: theme.visual.border,
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

const PreferenceToggle: React.FC<{
  checked: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}> = ({ checked, title, description, onChange }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-background/55 p-4 transition-colors hover:bg-background/80">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
    />
    <span>
      <span className="block font-bold">{title}</span>
      <span className="mt-1 block text-sm leading-6 text-muted-foreground">
        {description}
      </span>
    </span>
  </label>
);

const ThemeColorControl: React.FC<{
  label: string;
  description: string;
  value?: string;
  fallback: string;
  onChange: (value: string) => void;
  onReset: () => void;
}> = ({ label, description, value, fallback, onChange, onReset }) => (
  <div className="rounded-2xl border bg-background/55 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-bold">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <input
        type="color"
        value={value || fallback}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-14 cursor-pointer rounded-xl border bg-transparent p-1"
        aria-label={label}
      />
    </div>
    <div className="mt-3 flex items-center justify-between gap-2">
      <code className="rounded-lg border bg-background px-2 py-1 text-xs" dir="ltr">
        {value || 'لون الثيم الأساسي'}
      </code>
      <Button type="button" size="sm" variant="ghost" onClick={onReset}>
        إعادة
      </Button>
    </div>
  </div>
);

export const AppearanceSettingsPage: React.FC = () => {
  const { username } = useAuth();
  const [selectedTheme, setSelectedTheme] =
    useState<ThemeId>(DEFAULT_THEME_ID);
  const [savedTheme, setSavedTheme] = useState<ThemeId>(DEFAULT_THEME_ID);
  const savedThemeRef = useRef<ThemeId>(DEFAULT_THEME_ID);

  const [displayPreferences, setDisplayPreferences] =
    useState<UserDisplayPreferences>({ ...DEFAULT_USER_DISPLAY_PREFERENCES });
  const [savedDisplayPreferences, setSavedDisplayPreferences] =
    useState<UserDisplayPreferences>({ ...DEFAULT_USER_DISPLAY_PREFERENCES });
  const savedDisplayPreferencesRef = useRef<UserDisplayPreferences>({
    ...DEFAULT_USER_DISPLAY_PREFERENCES,
  });
  const [savedColorThemes, setSavedColorThemes] = useState<SavedUserTheme[]>([]);
  const [customThemeName, setCustomThemeName] = useState('');

  const applyThemeAndDisplay = (
    themeId: ThemeId,
    preferences: UserDisplayPreferences
  ) => {
    applyAppearanceTheme(themeId);
    applyUserDisplayPreferences(preferences);

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => applyUserDisplayPreferences(preferences));
    }
  };

  useEffect(() => {
    const keys = getUserKey(username);
    const storedTheme = localStorage.getItem(keys.theme);
    const current = getThemeById(storedTheme);
    const storedDisplay = loadUserDisplayPreferences(username);
    setSavedColorThemes(loadUserThemeLibrary(username));

    setSelectedTheme(current.id);
    setSavedTheme(current.id);
    savedThemeRef.current = current.id;

    setDisplayPreferences(storedDisplay);
    setSavedDisplayPreferences(storedDisplay);
    savedDisplayPreferencesRef.current = storedDisplay;

    applyThemeAndDisplay(current.id, storedDisplay);
  }, [username]);

  useEffect(() => {
    savedThemeRef.current = savedTheme;
  }, [savedTheme]);

  useEffect(() => {
    savedDisplayPreferencesRef.current = savedDisplayPreferences;
  }, [savedDisplayPreferences]);

  useEffect(
    () => () => {
      applyThemeAndDisplay(
        savedThemeRef.current,
        savedDisplayPreferencesRef.current
      );
    },
    []
  );

  const previewTheme = (theme: ThemeOption) => {
    setSelectedTheme(theme.id);
    applyThemeAndDisplay(theme.id, displayPreferences);
    toast.info('تم تطبيق المعاينة؛ اضغط حفظ الإعدادات لاعتمادها');
  };

  const updateDisplayPreferences = (
    patch: Partial<UserDisplayPreferences>
  ) => {
    const next = normalizeUserDisplayPreferences({
      ...displayPreferences,
      ...patch,
    });
    setDisplayPreferences(next);
    applyThemeAndDisplay(selectedTheme, next);
  };

  const updateThemeColor = (key: keyof UserThemeColors, value: string) => {
    updateDisplayPreferences({
      [key]: value,
    } as Partial<UserDisplayPreferences>);
  };

  const applyThemeColorPreset = (colors: UserThemeColors) => {
    updateDisplayPreferences(colors);
    toast.info('تم تطبيق لوحة الألوان للمعاينة');
  };

  const clearCustomThemeColors = () => {
    updateDisplayPreferences({ ...EMPTY_USER_THEME_COLORS });
    toast.info('تم الرجوع إلى ألوان الثيم الأساسي للمعاينة');
  };

  const persistThemeLibrary = (next: SavedUserTheme[]) => {
    setSavedColorThemes(next);
    saveUserThemeLibrary(username, next);
  };

  const saveCurrentColorTheme = () => {
    const name = customThemeName.trim();
    if (!name) {
      toast.error('اكتب اسمًا للثيم قبل الحفظ');
      return;
    }

    const saved = createSavedUserTheme(name, selectedTheme, displayPreferences);
    persistThemeLibrary([saved, ...savedColorThemes].slice(0, 24));
    setCustomThemeName('');
    toast.success('تم حفظ الثيم في مكتبتك ويمكن الرجوع إليه في أي وقت');
  };

  const previewSavedColorTheme = (saved: SavedUserTheme) => {
    const baseTheme = getThemeById(saved.baseThemeId);
    const next = mergeUserThemeColors(displayPreferences, saved.colors);
    setSelectedTheme(baseTheme.id);
    setDisplayPreferences(next);
    applyThemeAndDisplay(baseTheme.id, next);
    toast.info('تم تطبيق الثيم المحفوظ للمعاينة؛ احفظ الإعدادات لاعتماده');
  };

  const updateSavedColorTheme = (saved: SavedUserTheme) => {
    const next = savedColorThemes.map((item) =>
      item.id === saved.id
        ? {
            ...item,
            baseThemeId: selectedTheme,
            colors: extractUserThemeColors(displayPreferences),
            updatedAt: new Date().toISOString(),
          }
        : item
    );
    persistThemeLibrary(next);
    toast.success('تم تحديث الثيم المحفوظ بالألوان الحالية');
  };

  const deleteSavedColorTheme = (id: string) => {
    persistThemeLibrary(savedColorThemes.filter((item) => item.id !== id));
    toast.success('تم حذف الثيم من مكتبتك');
  };

  const saveSettings = () => {
    const keys = getUserKey(username);
    const theme = getThemeById(selectedTheme);
    const normalizedDisplay = normalizeUserDisplayPreferences(displayPreferences);

    localStorage.setItem(keys.theme, theme.id);
    localStorage.setItem(keys.mode, theme.mode);
    saveUserDisplayPreferences(username, normalizedDisplay);

    applyThemeAndDisplay(theme.id, normalizedDisplay);
    setSavedTheme(theme.id);
    savedThemeRef.current = theme.id;
    setSavedDisplayPreferences(normalizedDisplay);
    savedDisplayPreferencesRef.current = normalizedDisplay;

    toast.success('تم حفظ المظهر وإعدادات القراءة لهذا المستخدم');
  };

  const resetSettings = () => {
    const keys = getUserKey(username);
    const theme = getThemeById(DEFAULT_THEME_ID);
    const defaults = { ...DEFAULT_USER_DISPLAY_PREFERENCES };

    localStorage.setItem(keys.theme, theme.id);
    localStorage.setItem(keys.mode, theme.mode);
    saveUserDisplayPreferences(username, defaults);

    setSelectedTheme(theme.id);
    setSavedTheme(theme.id);
    savedThemeRef.current = theme.id;
    setDisplayPreferences(defaults);
    setSavedDisplayPreferences(defaults);
    savedDisplayPreferencesRef.current = defaults;
    applyThemeAndDisplay(theme.id, defaults);

    toast.success('تمت استعادة إعدادات المظهر والقراءة الافتراضية');
  };

  const selected = getThemeById(selectedTheme);
  const fontSize = Number.parseInt(displayPreferences.baseFontSize, 10) || 15;
  const hasUnsavedChanges =
    selectedTheme !== savedTheme ||
    !userDisplayPreferencesEqual(
      displayPreferences,
      savedDisplayPreferences
    );

  return (
    <div className="w-full space-y-5">
      <div className="future-card future-glass-thick p-5 md:p-6 2xl:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">
              <ShieldCheck className="ml-2 h-4 w-4" />
              إعدادات شخصية لكل مستخدم
            </Badge>

            <h1 className="text-3xl font-bold">
              إعدادات المظهر وسهولة الاستخدام
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              تحكم في المظهر والخط وحجم القراءة وألوان النص والخلفية والقائمة والثيم،
              مع إمكانية حفظ أكثر من ثيم شخصي والرجوع إليه في أي وقت.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={resetSettings}>
              <RotateCcw className="ml-2 h-4 w-4" />
              استعادة الافتراضي
            </Button>

            <Button onClick={saveSettings} className="future-glow-button">
              <Save className="ml-2 h-4 w-4" />
              حفظ الإعدادات
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-primary/15 bg-background/55 p-3 text-sm text-muted-foreground">
          التغييرات تظهر فورًا للمعاينة. عند الحفظ تُحفظ لهذا المستخدم على هذا
          المتصفح، ولا تؤثر على إعدادات بقية المستخدمين.
        </div>

        {hasUnsavedChanges && (
          <div className="mt-3 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-sm">
            توجد تغييرات قيد المعاينة. اضغط «حفظ الإعدادات» لاعتمادها.
          </div>
        )}
      </div>

      <Card className="future-card">
        <CardHeader>
          <CardTitle>الخط وراحة القراءة</CardTitle>
          <CardDescription>
            هذه الإعدادات تطبق على كامل المنصة بما في ذلك النماذج والجداول والقوائم.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="display-font-family">نوع الخط</Label>
              <NativeSelect
                id="display-font-family"
                value={displayPreferences.fontFamily}
                onChange={(event) =>
                  updateDisplayPreferences({ fontFamily: event.target.value })
                }
              >
                {DISPLAY_FONT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="display-font-size">حجم الخط والواجهة</Label>
                <Badge variant="outline">{fontSize}px</Badge>
              </div>
              <input
                id="display-font-size"
                type="range"
                min={DISPLAY_FONT_SIZE_MIN}
                max={DISPLAY_FONT_SIZE_MAX}
                step={1}
                value={fontSize}
                onChange={(event) =>
                  updateDisplayPreferences({
                    baseFontSize: `${event.target.value}px`,
                  })
                }
                className="h-10 w-full cursor-pointer accent-[hsl(var(--primary))]"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>أصغر</span>
                <span>افتراضي 15px</span>
                <span>أكبر</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-heading-weight">وضوح العناوين</Label>
              <NativeSelect
                id="display-heading-weight"
                value={displayPreferences.headingFontWeight}
                onChange={(event) =>
                  updateDisplayPreferences({
                    headingFontWeight: event.target.value,
                  })
                }
              >
                <option value="700">عادي وواضح</option>
                <option value="800">عريض — الافتراضي</option>
                <option value="900">عريض جدًا</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-line-height">تباعد السطور</Label>
              <NativeSelect
                id="display-line-height"
                value={displayPreferences.lineHeight}
                onChange={(event) =>
                  updateDisplayPreferences({ lineHeight: event.target.value })
                }
              >
                <option value="1.45">متقارب</option>
                <option value="1.65">مريح — الافتراضي</option>
                <option value="1.85">واسع</option>
                <option value="2">واسع جدًا</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="display-density">كثافة الواجهة</Label>
              <NativeSelect
                id="display-density"
                value={displayPreferences.density}
                onChange={(event) =>
                  updateDisplayPreferences({
                    density: event.target.value as UserDisplayPreferences['density'],
                  })
                }
              >
                <option value="compact">مضغوطة — معلومات أكثر</option>
                <option value="comfortable">مريحة — الافتراضي</option>
                <option value="spacious">واسعة — لمس وقراءة أسهل</option>
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-background/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">لون النص الأساسي</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    للعناوين والنصوص الأساسية في المظاهر الفاتحة.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateDisplayPreferences({ foreground: '' })}
                >
                  لون المظهر
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {DISPLAY_TEXT_COLOR_PRESETS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.label}
                    aria-label={color.label}
                    onClick={() =>
                      updateDisplayPreferences({ foreground: color.value })
                    }
                    className={[
                      'h-10 w-10 rounded-xl border-2 shadow-sm transition-transform hover:scale-105',
                      displayPreferences.foreground === color.value
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border',
                    ].join(' ')}
                    style={{ background: color.value }}
                  />
                ))}
                <label className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm">
                  مخصص
                  <input
                    type="color"
                    value={displayPreferences.foreground || '#1f2937'}
                    onChange={(event) =>
                      updateDisplayPreferences({ foreground: event.target.value })
                    }
                    className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/55 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">لون النص الثانوي</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    للملاحظات والوصف والنصوص الأقل أهمية.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    updateDisplayPreferences({ mutedForeground: '' })
                  }
                >
                  لون المظهر
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {DISPLAY_MUTED_COLOR_PRESETS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.label}
                    aria-label={color.label}
                    onClick={() =>
                      updateDisplayPreferences({ mutedForeground: color.value })
                    }
                    className={[
                      'h-10 w-10 rounded-xl border-2 shadow-sm transition-transform hover:scale-105',
                      displayPreferences.mutedForeground === color.value
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border',
                    ].join(' ')}
                    style={{ background: color.value }}
                  />
                ))}
                <label className="flex h-10 items-center gap-2 rounded-xl border bg-background px-3 text-sm">
                  مخصص
                  <input
                    type="color"
                    value={displayPreferences.mutedForeground || '#52606d'}
                    onChange={(event) =>
                      updateDisplayPreferences({
                        mutedForeground: event.target.value,
                      })
                    }
                    className="h-7 w-9 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <PreferenceToggle
              checked={displayPreferences.reduceMotion}
              title="تقليل الحركة والمؤثرات"
              description="يوقف معظم الحركات والانتقالات للمستخدم الذي يفضل واجهة أكثر ثباتًا."
              onChange={(checked) =>
                updateDisplayPreferences({ reduceMotion: checked })
              }
            />
            <PreferenceToggle
              checked={displayPreferences.enhancedFocus}
              title="إبراز موضع التركيز"
              description="يضيف إطارًا واضحًا حول الحقل أو الزر المحدد، خصوصًا عند استخدام لوحة المفاتيح."
              onChange={(checked) =>
                updateDisplayPreferences({ enhancedFocus: checked })
              }
            />
            <PreferenceToggle
              checked={displayPreferences.underlineLinks}
              title="تسطير الروابط النصية"
              description="يساعد على تمييز الروابط داخل النصوص والتقارير دون الاعتماد على اللون فقط."
              onChange={(checked) =>
                updateDisplayPreferences({ underlineLinks: checked })
              }
            />
          </div>

          <div className="rounded-2xl border border-primary/20 bg-background/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold">معاينة القراءة</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  يظهر هذا المثال بنفس إعدادات الخط والحجم والتباعد التي اخترتها.
                </p>
              </div>
              <Badge variant="secondary">معاينة فورية</Badge>
            </div>
            <p className="mt-4 leading-relaxed">
              منصة إدارة الأصول والأملاك والأوقاف الجامعية — مثال لنص إداري يوضح
              سهولة القراءة ووضوح الحروف أثناء العمل اليومي على النماذج والجداول.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm">زر أساسي</Button>
              <Button size="sm" variant="outline">زر ثانوي</Button>
              <a href="#appearance-themes" className="self-center text-sm text-primary">
                مثال لرابط نصي
              </a>
            </div>
          </div>

          <p className="text-xs leading-6 text-muted-foreground">
            عند استخدام مظهر داكن تتولى المنصة ضبط ألوان النص تلقائيًا لحماية
            التباين والوضوح، بينما تبقى إعدادات الخط والحجم والتباعد فعالة.
          </p>
        </CardContent>
      </Card>

      <Card id="custom-theme-colors" className="future-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PaintBucket className="h-5 w-5" />
            ألوان الخلفية والقائمة والثيمات الشخصية
          </CardTitle>
          <CardDescription>
            خصص خلفية المنصة والقائمة والشريط العلوي والألوان الأساسية، ثم احفظ أكثر من ثيم باسم تختاره.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <p className="font-bold">لوحات ألوان جاهزة</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {THEME_COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyThemeColorPreset(preset.colors)}
                  className="rounded-2xl border bg-background/60 p-4 text-right transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <p className="font-bold">{preset.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{preset.description}</p>
                  <div className="mt-3 grid grid-cols-4 gap-1.5">
                    {[
                      preset.colors.backgroundColor,
                      preset.colors.sidebarColor,
                      preset.colors.primaryColor,
                      preset.colors.accentColor,
                    ].map((color, index) => (
                      <span
                        key={index}
                        className="h-8 rounded-lg border shadow-sm"
                        style={{ background: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {THEME_COLOR_CONTROLS.map((control) => (
              <ThemeColorControl
                key={control.key}
                label={control.label}
                description={control.description}
                fallback={control.fallback}
                value={displayPreferences[control.key] || ''}
                onChange={(value) => updateThemeColor(control.key, value)}
                onReset={() => updateThemeColor(control.key, '')}
              />
            ))}
          </div>

          <div
            className="overflow-hidden rounded-3xl border p-4"
            style={{ background: displayPreferences.backgroundColor || '#eef4f9' }}
          >
            <div
              className="rounded-2xl border p-3 shadow-sm"
              style={{ background: displayPreferences.topbarColor || '#ffffff' }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">معاينة الثيم</span>
                <span
                  className="h-8 w-20 rounded-xl"
                  style={{ background: displayPreferences.primaryColor || '#245b86' }}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-[110px_1fr] gap-3">
              <div
                className="rounded-2xl border p-3"
                style={{
                  background: displayPreferences.sidebarColor || '#f7fafc',
                  color: displayPreferences.sidebarTextColor || '#20384f',
                }}
              >
                <p className="text-xs font-bold">القائمة</p>
                <div className="mt-3 space-y-2">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="h-8 rounded-lg border"
                      style={{
                        background:
                          item === 1
                            ? displayPreferences.primaryColor || '#245b86'
                            : 'rgba(255,255,255,.55)',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="min-h-28 rounded-2xl border p-4 shadow-sm"
                    style={{ background: displayPreferences.surfaceColor || '#ffffff' }}
                  >
                    <div
                      className="h-3 w-1/2 rounded-full"
                      style={{ background: displayPreferences.primaryColor || '#245b86' }}
                    />
                    <div
                      className="mt-4 h-2 w-4/5 rounded-full"
                      style={{ background: displayPreferences.secondaryColor || '#5f7891' }}
                    />
                    <div
                      className="mt-2 h-2 w-2/3 rounded-full"
                      style={{ background: displayPreferences.accentColor || '#2f8195' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="custom-theme-name">اسم الثيم الشخصي</Label>
                <Input
                  id="custom-theme-name"
                  value={customThemeName}
                  onChange={(event) => setCustomThemeName(event.target.value)}
                  placeholder="مثال: الثيم الأزرق المريح"
                  maxLength={60}
                />
              </div>
              <Button type="button" onClick={saveCurrentColorTheme}>
                <BookmarkPlus className="ml-2 h-4 w-4" />
                حفظ كثيم جديد
              </Button>
              <Button type="button" variant="outline" onClick={clearCustomThemeColors}>
                <RotateCcw className="ml-2 h-4 w-4" />
                ألوان الثيم الأساسي
              </Button>
            </div>

            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              حفظ الثيم يضيفه إلى مكتبتك. لتعيين الألوان الحالية كمظهر افتراضي للحساب استخدم زر «حفظ الإعدادات» أعلى الصفحة.
            </p>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">ثيماتي المحفوظة</p>
                  <p className="text-xs text-muted-foreground">يمكن حفظ حتى 24 ثيمًا لكل مستخدم.</p>
                </div>
                <Badge variant="secondary">{savedColorThemes.length} ثيم</Badge>
              </div>

              {savedColorThemes.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-background/40 p-6 text-center text-sm text-muted-foreground">
                  لم تحفظ ثيمات شخصية بعد. اختر الألوان ثم اكتب اسمًا واضغط «حفظ كثيم جديد».
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {savedColorThemes.map((saved) => (
                    <div key={saved.id} className="rounded-2xl border bg-background/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{saved.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            آخر تحديث {new Date(saved.updatedAt).toLocaleDateString('ar-SA')}
                          </p>
                        </div>
                        <BookmarkPlus className="h-5 w-5 text-primary" />
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-1.5">
                        {[
                          saved.colors.backgroundColor || '#eef4f9',
                          saved.colors.sidebarColor || '#f7fafc',
                          saved.colors.primaryColor || '#245b86',
                          saved.colors.accentColor || '#2f8195',
                        ].map((color, index) => (
                          <span
                            key={index}
                            className="h-8 rounded-lg border"
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <Button type="button" size="sm" onClick={() => previewSavedColorTheme(saved)}>
                          تطبيق
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => updateSavedColorTheme(saved)}>
                          <RefreshCw className="ml-1 h-3.5 w-3.5" />
                          تحديث
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteSavedColorTheme(saved.id)}
                        >
                          <Trash2 className="ml-1 h-3.5 w-3.5" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        id="appearance-themes"
        className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,390px)]"
      >
        <Card className="future-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              اختر المظهر الرسمي
            </CardTitle>
            <CardDescription>
              الخيارات التالية مصممة للاستخدام الإداري الرسمي، بدون مظاهر نيون
              أو ألوان ترفيهية أو تباين منخفض.
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
              معاينة المظهر
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
                  <span className="text-xs text-muted-foreground">نوع السطح</span>
                  <p className="mt-1 font-semibold">{selected.glassLabel}</p>
                </div>

                <div className="rounded-xl border bg-background/35 p-3">
                  <span className="text-xs text-muted-foreground">الإضاءة</span>
                  <p className="mt-1 font-semibold">{selected.glowLabel}</p>
                </div>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                المعاينة فورية، ولا يتم اعتمادها لهذا المستخدم إلا بعد الحفظ.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
