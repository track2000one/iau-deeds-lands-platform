import React from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDeeds } from '../../context/DeedContext';
import { useData } from '../../context/DataContext';
import {
  FileText,
  MapPin,
  MapPinOff,
  Ruler,
  PlusCircle,
  Search,
  BarChart3,
  Building,
  Shield,
  Users,
  UploadCloud,
  Bell,
  Lock,
  Map,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';

const safeNumber = (value: unknown) => {
  const number = Number(value || 0);

  return Number.isNaN(number) ? 0 : number;
};

const percent = (value: number, total: number) => {
  if (!total) return '0.0';

  return ((value / total) * 100).toFixed(1);
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { deeds } = useDeeds();
  const { getStatistics } = useData();
  const dataStats = getStatistics();

  const stats = React.useMemo(() => {
    const plannedCount = deeds.filter((d) => d.isPlanned).length;
    const unplannedCount = deeds.filter((d) => !d.isPlanned).length;
    const totalArea = deeds.reduce((sum, d) => sum + safeNumber(d.area), 0);

    return {
      total: deeds.length,
      planned: plannedCount,
      unplanned: unplannedCount,
      totalArea,
      totalAreaText: totalArea.toLocaleString(),
    };
  }, [deeds]);

  const recentDeeds = React.useMemo(() => {
    return [...deeds]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [deeds]);

  const topStats = [
    {
      label: t('home.totalDeeds'),
      value: stats.total.toLocaleString(),
      sub: t('deed.title'),
      icon: FileText,
      accent: 'text-primary',
    },
    {
      label: t('home.plannedLands'),
      value: stats.planned.toLocaleString(),
      sub: `${percent(stats.planned, stats.total)}% ${t('deed.isPlanned')}`,
      icon: MapPin,
      accent: 'text-violet-500',
    },
    {
      label: t('home.unplannedLands'),
      value: stats.unplanned.toLocaleString(),
      sub: `${percent(stats.unplanned, stats.total)}% غير مخططة`,
      icon: MapPinOff,
      accent: 'text-cyan-500',
    },
    {
      label: t('home.totalArea'),
      value: stats.totalAreaText,
      sub: t('deed.sqm'),
      icon: Ruler,
      accent: 'text-emerald-500',
    },
  ];

  const quickActions = [
    { id: 'add-deed', path: '/deeds/new', icon: PlusCircle, label: 'إصدار صك جديد', sub: 'إضافة صك إلكتروني' },
    { id: 'allocated-lands', path: '/lands/allocated', icon: MapPin, label: 'تسجيل أرض', sub: 'إضافة أرض جديدة' },
    { id: 'archive', path: '/archive', icon: UploadCloud, label: 'رفع مستند', sub: 'حفظ الملفات والأرشفة' },
    { id: 'search', path: '/search', icon: Search, label: 'بحث متقدم', sub: 'البحث في السجلات' },
    { id: 'reports', path: '/reports', icon: BarChart3, label: 'التقارير', sub: 'إحصاءات وطباعة' },
  ];

  return (
    <div className="w-full space-y-5">
      <div className="grid w-full grid-cols-1 items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-5 2xl:order-2">
          <Card className="future-card">
            <CardContent className="p-5">
              <div className="future-hero-art min-h-[230px]">
                <div className="future-shield">
                  <Shield className="h-24 w-24" />
                </div>
              </div>

              <div className="mt-5">
                <h2 className="text-xl font-bold">مرحباً بك في المستقبل</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  إدارة ذكية، وثائق موثوقة، وأراضٍ آمنة.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="future-card">
            <CardHeader>
              <CardTitle>إجراء سريع</CardTitle>
              <CardDescription>الوصول السريع لأهم العمليات</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full h-12 future-glow-button" onClick={() => navigate('/deeds/new')}>
                <PlusCircle className="ml-2 h-5 w-5" />
                إنشاء معاملة جديدة
              </Button>
            </CardContent>
          </Card>

          <Card className="future-card">
            <CardHeader>
              <CardTitle>معلومات النظام</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border bg-background/40 p-3">
                <span className="text-sm text-muted-foreground">إصدار المنصة</span>
                <span className="font-mono">v2060.1.0</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-background/40 p-3">
                <span className="text-sm text-muted-foreground">وقت التشغيل</span>
                <span className="font-mono">10.0 يوم</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-background/40 p-3">
                <span className="text-sm text-muted-foreground">حالة النظام</span>
                <Badge variant="secondary">يعمل بكفاءة</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 2xl:order-1">
          <div className="text-right">
            <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-bold">{t('home.welcome')}</h1>
            <p className="text-muted-foreground mt-2">{t('app.subtitle')}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {topStats.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.label} className="future-card min-h-[132px]">
                  <CardContent className="h-full p-4 2xl:p-5">
                    <div className="flex h-full items-center justify-between gap-4">
                      <div className="future-stat-icon h-12 w-12 bg-primary/10">
                        <Icon className={`h-6 w-6 ${item.accent}`} />
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-2xl 2xl:text-3xl font-bold tabular-nums">{item.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="future-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>نظرة عامة على المنصة</span>
                <BarChart3 className="h-5 w-5 text-primary" />
              </CardTitle>
              <CardDescription>ملخص شامل لأداء المنصة والعمليات الرئيسية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center rounded-2xl border bg-background/40 p-4">
                  <Users className="h-7 w-7 mx-auto mb-3 text-primary" />
                  <p className="text-2xl font-bold">{dataStats.totalRecords}</p>
                  <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
                </div>
                <div className="text-center rounded-2xl border bg-background/40 p-4">
                  <FileText className="h-7 w-7 mx-auto mb-3 text-primary" />
                  <p className="text-2xl font-bold">{dataStats.totalDeeds}</p>
                  <p className="text-xs text-muted-foreground">الصكوك</p>
                </div>
                <div className="text-center rounded-2xl border bg-background/40 p-4">
                  <Map className="h-7 w-7 mx-auto mb-3 text-primary" />
                  <p className="text-2xl font-bold">
                    {dataStats.totalAllocatedLands + dataStats.totalDeliveredLands +
                      dataStats.totalLeasedLandsOut + dataStats.totalLeasedLandsIn}
                  </p>
                  <p className="text-xs text-muted-foreground">الأراضي</p>
                </div>
                <div className="text-center rounded-2xl border bg-background/40 p-4">
                  <Building className="h-7 w-7 mx-auto mb-3 text-primary" />
                  <p className="text-2xl font-bold">
                    {dataStats.totalLeasedBuildingsOut + dataStats.totalLeasedBuildingsIn}
                  </p>
                  <p className="text-xs text-muted-foreground">المباني</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="future-card">
            <CardHeader>
              <CardTitle>{t('home.quickActions')}</CardTitle>
              <CardDescription>العمليات الشائعة للوصول السريع</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="future-glow-button h-[92px] min-w-0 flex-col gap-1.5 px-3 whitespace-normal"
                      onClick={() => navigate(action.path)}
                    >
                      <Icon className="h-6 w-6 text-primary" />
                      <span className="font-bold leading-tight">{action.label}</span>
                      <span className="text-center text-xs leading-tight text-muted-foreground">{action.sub}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
            <Card className="future-card min-w-0">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{t('home.recentDeeds')}</CardTitle>
                    <CardDescription>آخر الصكوك المضافة للنظام</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/deeds')}>
                    {t('nav.allDeeds')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentDeeds.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد صكوك</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentDeeds.map((deed, index) => (
                      <div key={deed.id}>
                        <div
                          className="flex items-center justify-between p-3 rounded-2xl border bg-background/35 hover:bg-primary/5 cursor-pointer transition-colors gap-3"
                          onClick={() => navigate(`/deeds/${deed.id}`)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold truncate">{deed.deedNumber}</p>
                                {deed.isPlanned && <Badge variant="secondary">مخططة</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {deed.city || '-'} - {deed.district || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            <p className="font-bold">{safeNumber(deed.area).toLocaleString()} {t('deed.sqm')}</p>
                            <p className="text-xs text-muted-foreground">
                              {deed.createdAt ? new Date(deed.createdAt).toLocaleDateString('ar-SA') : '-'}
                            </p>
                          </div>
                        </div>
                        {index < recentDeeds.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="future-card">
              <CardHeader>
                <CardTitle>الأمان والموثوقية</CardTitle>
                <CardDescription>مستوى أمان متقدم</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="future-hero-art min-h-[210px]">
                  <div className="future-shield">
                    <Lock className="h-20 w-20" />
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border bg-background/35 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">مستوى الأمان</p>
                    <p className="text-2xl font-bold">99.9%</p>
                  </div>
                  <Shield className="h-10 w-10 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="future-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                التنبيهات والإشعارات
              </CardTitle>
              <CardDescription>آخر التحديثات المهمة على المنصة</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border bg-background/35 p-4">
                <p className="font-bold">تحديث جديد</p>
                <p className="text-sm text-muted-foreground mt-1">تم تحسين واجهة المنصة المستقبلية.</p>
              </div>
              <div className="rounded-2xl border bg-background/35 p-4">
                <p className="font-bold">معاملة بحاجة لمراجعة</p>
                <p className="text-sm text-muted-foreground mt-1">راجع السجلات الأخيرة عند الحاجة.</p>
              </div>
              <div className="rounded-2xl border bg-background/35 p-4">
                <p className="font-bold">رفع مخطط</p>
                <p className="text-sm text-muted-foreground mt-1">يمكن رفع المخططات من صفحة الأرشفة.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
