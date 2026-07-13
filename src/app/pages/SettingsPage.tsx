import React from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { colorThemes } from '../../config/themes';
import { Palette, Check, Globe, Info, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currentTheme, setTheme } = useTheme();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground mt-1">تخصيص المنصة حسب تفضيلاتك</p>
      </div>

      {/* Language Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('settings.language')}
          </CardTitle>
          <CardDescription>اختر لغة واجهة المنصة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={i18n.language === 'ar' ? 'default' : 'outline'}
              onClick={() => {
                if (i18n.language !== 'ar') toggleLanguage();
              }}
              className="flex-1"
            >
              العربية
              {i18n.language === 'ar' && <Check className="mr-2 h-4 w-4" />}
            </Button>
            <Button
              variant={i18n.language === 'en' ? 'default' : 'outline'}
              onClick={() => {
                if (i18n.language !== 'en') toggleLanguage();
              }}
              className="flex-1"
            >
              English
              {i18n.language === 'en' && <Check className="mr-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Appearance Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {t('settings.customization')}
          </CardTitle>
          <CardDescription>تخصيص متقدم للألوان والخطوط</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/appearance')} className="w-full">
            <Palette className="ml-2 h-4 w-4" />
            فتح إعدادات المظهر المتقدمة
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            قم بتخصيص الألوان، الخطوط، وأحجام النصوص بشكل يدوي
          </p>
        </CardContent>
      </Card>

      {/* Color Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            ألوان المنصة
          </CardTitle>
          <CardDescription>اختر مجموعة الألوان المفضلة لديك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Theme Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-900 font-medium mb-1">
                    المجموعة الحالية: {i18n.language === 'ar' ? currentTheme.nameAr : currentTheme.name}
                  </p>
                  <p className="text-xs text-blue-800">
                    سيتم حفظ اختيارك تلقائياً وتطبيقه على جميع صفحات المنصة
                  </p>
                </div>
              </div>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {colorThemes.map((theme) => {
                const isActive = currentTheme.id === theme.id;
                return (
                  <div
                    key={theme.id}
                    className={`
                      relative p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${isActive
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50 hover:shadow-sm'
                      }
                    `}
                    onClick={() => setTheme(theme.id)}
                  >
                    {/* Theme Name */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">
                          {i18n.language === 'ar' ? theme.nameAr : theme.name}
                        </h3>
                        {theme.id === 'theme-8' && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            افتراضي
                          </Badge>
                        )}
                      </div>
                      {isActive && (
                        <div className="p-2 bg-primary rounded-full">
                          <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Color Palette */}
                    <div className="grid grid-cols-4 gap-2">
                      <div
                        className="h-12 rounded border border-gray-300 flex items-center justify-center"
                        style={{ backgroundColor: theme.colors.primary }}
                        title="Primary"
                      >
                        <span className="text-xs font-mono text-white drop-shadow">
                          P
                        </span>
                      </div>
                      <div
                        className="h-12 rounded border border-gray-300 flex items-center justify-center"
                        style={{ backgroundColor: theme.colors.secondary }}
                        title="Secondary"
                      >
                        <span className="text-xs font-mono text-gray-700 drop-shadow-sm">
                          S
                        </span>
                      </div>
                      <div
                        className="h-12 rounded border border-gray-300 flex items-center justify-center"
                        style={{ backgroundColor: theme.colors.accent }}
                        title="Accent"
                      >
                        <span className="text-xs font-mono text-gray-700 drop-shadow-sm">
                          A
                        </span>
                      </div>
                      <div
                        className="h-12 rounded border border-gray-300 flex items-center justify-center"
                        style={{ backgroundColor: theme.colors.background }}
                        title="Background"
                      >
                        <span className="text-xs font-mono text-gray-700 drop-shadow-sm">
                          B
                        </span>
                      </div>
                    </div>

                    {/* Color Codes */}
                    <div className="mt-2 grid grid-cols-4 gap-2 text-xs font-mono text-muted-foreground">
                      <div className="text-center">{theme.colors.primary}</div>
                      <div className="text-center">{theme.colors.secondary}</div>
                      <div className="text-center">{theme.colors.accent}</div>
                      <div className="text-center">{theme.colors.background}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-2">دليل الألوان:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary"></div>
                  <span>P: اللون الأساسي</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-secondary"></div>
                  <span>S: اللون الثانوي</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-accent"></div>
                  <span>A: اللون المميز</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-background border"></div>
                  <span>B: لون الخلفية</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* About Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.about')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الإصدار:</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">المؤسسة:</span>
              <span className="font-medium">جامعة الإمام عبدالرحمن بن فيصل</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">السنة:</span>
              <span className="font-medium">2024</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
