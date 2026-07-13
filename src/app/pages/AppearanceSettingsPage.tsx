import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomTheme, PREDEFINED_THEMES } from '../../context/CustomThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

const FONT_FAMILIES = [
  { value: 'Cairo, sans-serif', label: 'Cairo' },
  { value: 'Tajawal, sans-serif', label: 'Tajawal' },
  { value: 'Almarai, sans-serif', label: 'Almarai' },
  { value: 'IBM Plex Sans Arabic, sans-serif', label: 'IBM Plex Sans Arabic' },
  { value: 'Noto Sans Arabic, sans-serif', label: 'Noto Sans Arabic' },
  { value: 'Amiri, serif', label: 'Amiri' },
  { value: 'Changa, sans-serif', label: 'Changa' },
  { value: 'El Messiri, sans-serif', label: 'El Messiri' },
];

const FONT_SIZES = [
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px (Default)' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
];

export const AppearanceSettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { currentTheme, fontSettings, applyTheme, updateFontSettings, resetToDefault } = useCustomTheme();

  const [selectedFontFamily, setSelectedFontFamily] = useState(fontSettings.family);
  const [selectedFontSize, setSelectedFontSize] = useState(fontSettings.size);
  const [selectedFontColor, setSelectedFontColor] = useState(fontSettings.color || '#2C4A6B');
  const [customFontFile, setCustomFontFile] = useState<File | null>(null);
  const [customFontName, setCustomFontName] = useState(fontSettings.customFontName || '');
  const [customFontUrl, setCustomFontUrl] = useState(fontSettings.customFontUrl || '');

  const [customColors, setCustomColors] = useState({
    primary: currentTheme.colors.primary,
    secondary: currentTheme.colors.secondary,
    accent: currentTheme.colors.accent,
    background: currentTheme.colors.background,
  });

  useEffect(() => {
    setCustomColors({
      primary: currentTheme.colors.primary,
      secondary: currentTheme.colors.secondary,
      accent: currentTheme.colors.accent,
      background: currentTheme.colors.background,
    });
  }, [currentTheme]);

  useEffect(() => {
    if (fontSettings.customFontUrl && fontSettings.customFontName) {
      setCustomFontUrl(fontSettings.customFontUrl);
      setCustomFontName(fontSettings.customFontName);
    }
    if (fontSettings.color) {
      setSelectedFontColor(fontSettings.color);
    }
  }, [fontSettings]);

  const handleThemeSelect = (themeKey: string) => {
    const theme = PREDEFINED_THEMES[themeKey];
    if (theme) {
      applyTheme(theme);
      setCustomColors(theme.colors);
      toast.success(t('settings.themeApplied'));
    }
  };

  const handleFontFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['.ttf', '.otf', '.woff', '.woff2'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!allowedTypes.includes(fileExtension)) {
        toast.error(t('settings.invalidFontFile'));
        return;
      }

      setCustomFontFile(file);
      const fontName = file.name.replace(/\.[^/.]+$/, '');
      setCustomFontName(fontName);

      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setCustomFontUrl(url);
        toast.success(t('settings.fontUploaded'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFontUpdate = () => {
    updateFontSettings({
      family: selectedFontFamily,
      size: selectedFontSize,
      color: selectedFontColor,
      customFontUrl: customFontUrl || undefined,
      customFontName: customFontName || undefined,
    });
    toast.success(t('settings.fontUpdated'));
  };

  const handleReset = () => {
    resetToDefault();
    setSelectedFontFamily('Cairo, sans-serif');
    setSelectedFontSize('16px');
    setSelectedFontColor('#2C4A6B');
    setCustomFontFile(null);
    setCustomFontName('');
    setCustomFontUrl('');
    const defaultTheme = PREDEFINED_THEMES.professionalBlue;
    setCustomColors(defaultTheme.colors);
    toast.success('تمت إعادة التعيين إلى الإعدادات الافتراضية');
  };

  const handleColorChange = (colorKey: keyof typeof customColors, value: string) => {
    setCustomColors((prev) => ({
      ...prev,
      [colorKey]: value,
    }));
  };

  const handleApplyCustomColors = () => {
    const customTheme = {
      name: 'Custom Theme',
      colors: customColors,
    };
    applyTheme(customTheme);
    toast.success(t('settings.customColorsApplied'));
  };

  const ThemeCard = ({ themeKey, theme }: { themeKey: string; theme: any }) => {
    const isSelected = currentTheme.name === theme.name;
    const isDefault = themeKey === 'professionalBlue';

    return (
      <Card
        className={`cursor-pointer transition-all hover:shadow-lg ${
          isSelected ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => handleThemeSelect(themeKey)}
      >
        <CardHeader className="relative">
          <CardTitle className="text-base flex items-center justify-between">
            {t(`themes.${themeKey}`)}
            {isSelected && (
              <div className="absolute top-4 right-4 bg-blue-500 text-white rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}
          </CardTitle>
          {isDefault && (
            <span className="text-xs text-blue-600 font-medium">افتراضي</span>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <div
                className="h-16 rounded-md border"
                style={{ backgroundColor: theme.colors.primary }}
              />
              <p className="text-xs text-center mt-1">P</p>
              <p className="text-xs text-center text-muted-foreground">{theme.colors.primary}</p>
            </div>
            <div className="flex-1">
              <div
                className="h-16 rounded-md border"
                style={{ backgroundColor: theme.colors.secondary }}
              />
              <p className="text-xs text-center mt-1">S</p>
              <p className="text-xs text-center text-muted-foreground">{theme.colors.secondary}</p>
            </div>
            <div className="flex-1">
              <div
                className="h-16 rounded-md border"
                style={{ backgroundColor: theme.colors.accent }}
              />
              <p className="text-xs text-center mt-1">A</p>
              <p className="text-xs text-center text-muted-foreground">{theme.colors.accent}</p>
            </div>
            <div className="flex-1">
              <div
                className="h-16 rounded-md border"
                style={{ backgroundColor: theme.colors.background }}
              />
              <p className="text-xs text-center mt-1">B</p>
              <p className="text-xs text-center text-muted-foreground">{theme.colors.background}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings.appearance')}</h1>
        <p className="text-muted-foreground">{t('settings.customization')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.colorTheme')}</CardTitle>
          <CardDescription>اختر نظام الألوان المفضل لديك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(PREDEFINED_THEMES).map(([key, theme]) => (
              <ThemeCard key={key} themeKey={key} theme={theme} />
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">{t('settings.colorGuide')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                <span>P: {t('themes.primaryColorDesc')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-secondary" />
                <span>S: {t('themes.secondaryColorDesc')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-accent" />
                <span>A: {t('themes.accentColorDesc')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border bg-background" />
                <span>B: {t('themes.backgroundColorDesc')}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.customColorSettings')}</CardTitle>
          <CardDescription>{t('settings.customColorDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color">
                {t('settings.primaryColorLabel')} (Primary Color)
              </Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="primary-color-picker"
                  value={customColors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  id="primary-color"
                  value={customColors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="flex-1 h-10 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="#2C4A6B"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary-color">
                {t('settings.secondaryColorLabel')} (Secondary Color)
              </Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="secondary-color-picker"
                  value={customColors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  id="secondary-color"
                  value={customColors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="flex-1 h-10 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="#4A6B8F"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accent-color">
                {t('settings.accentColorLabel')} (Accent Color)
              </Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="accent-color-picker"
                  value={customColors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  id="accent-color"
                  value={customColors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="flex-1 h-10 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="#6B9EC1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background-color">
                {t('settings.backgroundColorLabel')} (Background Color)
              </Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="background-color-picker"
                  value={customColors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  id="background-color"
                  value={customColors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="flex-1 h-10 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="#FCFAEE"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApplyCustomColors}>
              {t('settings.applyCustomColors')}
            </Button>
          </div>

          <div className="p-4 border rounded-lg">
            <p className="text-sm mb-3 font-medium">{t('settings.colorPreview')}:</p>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <div
                  className="h-20 rounded-md border"
                  style={{ backgroundColor: customColors.primary }}
                />
                <p className="text-xs text-center text-muted-foreground">Primary</p>
              </div>
              <div className="space-y-1">
                <div
                  className="h-20 rounded-md border"
                  style={{ backgroundColor: customColors.secondary }}
                />
                <p className="text-xs text-center text-muted-foreground">Secondary</p>
              </div>
              <div className="space-y-1">
                <div
                  className="h-20 rounded-md border"
                  style={{ backgroundColor: customColors.accent }}
                />
                <p className="text-xs text-center text-muted-foreground">Accent</p>
              </div>
              <div className="space-y-1">
                <div
                  className="h-20 rounded-md border"
                  style={{ backgroundColor: customColors.background }}
                />
                <p className="text-xs text-center text-muted-foreground">Background</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.fontSettings')}</CardTitle>
          <CardDescription>قم بتخصيص نوع وحجم الخط</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t('settings.fontFamily')}</Label>
              <NativeSelect
                value={selectedFontFamily}
                onChange={(e) => setSelectedFontFamily(e.target.value)}
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label>{t('settings.fontSize')}</Label>
              <NativeSelect
                value={selectedFontSize}
                onChange={(e) => setSelectedFontSize(e.target.value)}
              >
                {FONT_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-color">{t('settings.fontColor')}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  id="font-color-picker"
                  value={selectedFontColor}
                  onChange={(e) => setSelectedFontColor(e.target.value)}
                  className="w-16 h-10 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  id="font-color"
                  value={selectedFontColor}
                  onChange={(e) => setSelectedFontColor(e.target.value)}
                  className="flex-1 h-10 rounded-md border border-input bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="#2C4A6B"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-font">{t('settings.customFont')}</Label>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                id="custom-font"
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFontFileUpload}
                className="h-10 rounded-md border border-input bg-input-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium cursor-pointer"
              />
              {customFontFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>✓ {customFontFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomFontFile(null);
                      setCustomFontName('');
                      setCustomFontUrl('');
                    }}
                  >
                    {t('settings.removeFont')}
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {t('settings.supportedFormats')}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleFontUpdate}>
              تطبيق إعدادات الخط
            </Button>
            <Button variant="outline" onClick={handleReset}>
              {t('settings.resetToDefault')}
            </Button>
          </div>

          <div
            className="p-4 border rounded-lg"
            style={{
              fontFamily: customFontName ? `'${customFontName}', ${selectedFontFamily}` : selectedFontFamily,
              fontSize: selectedFontSize,
              color: selectedFontColor
            }}
          >
            <p className="mb-2 font-bold">{t('settings.fontPreview')}:</p>
            <p className="mb-2">هذا نموذج نص عربي لمعاينة الخط المحدد واللون</p>
            <p className="text-sm">This is sample English text for font and color preview</p>
            {customFontFile && (
              <p className="text-xs mt-2 opacity-70">
                {i18n.language === 'ar' ? `استخدام الخط المخصص: ${customFontName}` : `Using custom font: ${customFontName}`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
