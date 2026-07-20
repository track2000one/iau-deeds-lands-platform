import React, { useEffect, useState } from 'react';
import { Check, Palette, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

const THEME_ID = 'official-classic-navy';

const getUserKey = (username?: string | null) => {
  const safeUser = username?.trim() || 'guest';

  return {
    theme: `iau-appearance-theme:${safeUser}`,
    mode: `iau-appearance-mode:${safeUser}`,
  };
};

const previewColors = ['#FCFAF1', '#2C4F73', '#6B9CC1', '#FFFFFF', '#C40028'];

const applyOfficialThemePreview = () => {
  document.documentElement.dataset.appearanceTheme = THEME_ID;
  document.documentElement.classList.remove('dark');
  document.documentElement.dataset.appearanceMode = 'light';
};

export const AppearanceSettingsPage: React.FC = () => {
  const { username } = useAuth();
  const [isSelected, setIsSelected] = useState(false);

  useEffect(() => {
    const keys = getUserKey(username);
    setIsSelected((localStorage.getItem(keys.theme) || THEME_ID) === THEME_ID);
  }, [username]);

  const previewTheme = () => {
    applyOfficialThemePreview();
    toast.info('تمت معاينة الثيم الرسمي الكلاسيك');
  };

  const saveTheme = () => {
    const keys = getUserKey(username);

    localStorage.setItem(keys.theme, THEME_ID);
    localStorage.setItem(keys.mode, 'light');

    applyOfficialThemePreview();
    setIsSelected(true);

    toast.success('تم حفظ الثيم الرسمي لهذا المستخدم فقط');
  };

  const resetTheme = () => {
    const keys = getUserKey(username);

    localStorage.setItem(keys.theme, THEME_ID);
    localStorage.setItem(keys.mode, 'light');

    applyOfficialThemePreview();
    setIsSelected(true);

    toast.success('تمت استعادة الثيم الرسمي الافتراضي');
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <Badge variant="secondary" className="mb-3">
                <ShieldCheck className="ml-2 h-4 w-4" />
                الثيم الرسمي
              </Badge>

              <CardTitle className="text-2xl md:text-3xl">
                الثيم الكلاسيك الرسمي
              </CardTitle>

              <CardDescription className="mt-2">
                ثيم مطابق للطابع الظاهر في الصورة: خلفية عاجية، شريط علوي أزرق، قائمة جانبية أزرق داكن، بطاقات بيضاء، وحدود بيج هادئة.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={resetTheme}>
                <RotateCcw className="ml-2 h-4 w-4" />
                استعادة الافتراضي
              </Button>

              <Button onClick={saveTheme}>
                <Save className="ml-2 h-4 w-4" />
                حفظ لهذا المستخدم
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <button
            type="button"
            onClick={previewTheme}
            className={[
              'w-full rounded-2xl border p-5 text-right transition-all duration-300',
              'hover:-translate-y-1 hover:shadow-xl',
              isSelected ? 'border-primary bg-primary/5' : 'bg-card',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">الكلاسيك الرسمي المطابق</h3>
                  <Badge>افتراضي</Badge>
                  {isSelected && <Badge variant="secondary">محفوظ لك</Badge>}
                </div>

                <p className="mt-2 text-sm text-muted-foreground leading-7">
                  تصميم رسمي واضح وهادئ، مناسب للاستخدام الإداري اليومي، مع نافذة تأكيد خروج بيضاء وزر خروج أحمر.
                </p>
              </div>

              <div className={[
                'flex h-9 w-9 items-center justify-center rounded-full border',
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted',
              ].join(' ')}>
                {isSelected && <Check className="h-5 w-5" />}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-5 gap-3">
              {previewColors.map((color) => (
                <div
                  key={color}
                  className="h-14 rounded-xl border shadow-sm"
                  style={{ background: color }}
                />
              ))}
            </div>

            <div className="mt-5 rounded-xl border bg-[#FCFAF1] p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-xl border bg-white p-4 border-r-4 border-r-[#C40028]">
                  <p className="text-sm text-[#17395B]">إجمالي المساحة</p>
                  <p className="mt-4 text-2xl font-bold text-[#17395B]">0</p>
                </div>

                <div className="rounded-xl border bg-white p-4 border-r-4 border-r-[#2C4F73]">
                  <p className="text-sm text-[#17395B]">إجمالي الصكوك</p>
                  <p className="mt-4 text-2xl font-bold text-[#17395B]">0</p>
                </div>

                <div className="rounded-xl border bg-white p-4">
                  <p className="text-sm text-[#17395B]">نظرة عامة</p>
                  <p className="mt-4 text-2xl font-bold text-[#17395B]">0</p>
                </div>

                <div className="rounded-xl bg-[#2C4F73] p-4 text-white">
                  <p className="text-sm">القائمة الجانبية</p>
                  <p className="mt-4 text-2xl font-bold">رسمي</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={previewTheme}>
                <Palette className="ml-2 h-4 w-4" />
                معاينة الثيم
              </Button>
            </div>
          </button>
        </CardContent>
      </Card>
    </div>
  );
};
