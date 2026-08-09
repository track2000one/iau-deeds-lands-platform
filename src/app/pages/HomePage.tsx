import React from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDeeds } from '../../context/DeedContext';
import { useData } from '../../context/DataContext';
import { PLATFORM_LOGO_URL } from '../config/branding';
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
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const locale = isArabic ? 'ar-SA' : 'en-US';
  const ui = (ar: string, en: string) => (isArabic ? ar : en);
  const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
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
      totalAreaText: new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US').format(totalArea),
    };
  }, [deeds, i18n.language]);

  const recentDeeds = React.useMemo(() => {
    return [...deeds]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [deeds]);

  const topStats = [
    {
      label: t('home.totalDeeds'),
      value: formatNumber(stats.total),
      sub: t('deed.title'),
      icon: FileText,
      accent: 'text-primary',
    },
    {
      label: t('home.plannedLands'),
      value: formatNumber(stats.planned),
      sub: `${percent(stats.planned, stats.total)}% ${t('deed.isPlanned')}`,
      icon: MapPin,
      accent: 'text-violet-500',
    },
    {
      label: t('home.unplannedLands'),
      value: formatNumber(stats.unplanned),
      sub: `${percent(stats.unplanned, stats.total)}% ${ui('غير مخططة', 'Unplanned')}`, 
      icon: MapPinOff,
      accent: 'text-cyan-500',
    },
    {
      label: ui('إجمالي مساحة الصكوك', 'Total Deed Area'),
      value: stats.totalAreaText,
      sub: t('deed.sqm'),
      icon: Ruler,
      accent: 'text-emerald-500',
    },
  ];

  const quickActions = [
    { id: 'add-deed', path: '/deeds/new', icon: PlusCircle, label: ui('إصدار صك جديد', 'Create New Deed'), sub: ui('إضافة صك إلكتروني', 'Add an electronic deed') },
    { id: 'allocated-lands', path: '/lands/allocated', icon: MapPin, label: ui('تسجيل أرض', 'Register Land'), sub: ui('إضافة أرض جديدة', 'Add new land') },
    { id: 'archive', path: '/archive', icon: UploadCloud, label: ui('رفع مستند', 'Upload Document'), sub: ui('حفظ الملفات والأرشفة', 'Save files and archive') },
    { id: 'search', path: '/search', icon: Search, label: ui('بحث متقدم', 'Advanced Search'), sub: ui('البحث في السجلات', 'Search records') },
    { id: 'reports', path: '/reports', icon: BarChart3, label: ui('التقارير', 'Reports'), sub: ui('إحصاءات وطباعة', 'Statistics and printing') },
  ];

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div className="grid w-full grid-cols-1 items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="space-y-5 2xl:order-2">
          <Card className="future-card overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <div className="future-hero-art min-h-[165px] sm:min-h-[210px]">
                <div className="future-shield">
                  <img
                    src={PLATFORM_LOGO_URL}
                    alt="Platform logo"
                    className="h-24 w-24 sm:h-32 sm:w-32 object-contain drop-shadow-[0_0_30px_hsl(var(--primary)/0.35)]"
                  />
                </div>
              </div>

              <div className="mt-5">
                <h2 className="text-xl font-bold">{ui('مرحباً بك في', 'Welcome to')}</h2>
                <h2 className="text-xl font-bold">{ui('إدارة أوقاف وأملاك الجامعة', 'University Endowments and Properties Administration')}</h2>
              </div>
            </CardContent>
          </Card>

          <Card className="future-card overflow-hidden">
            <CardHeader>
              <CardTitle>{ui('إجراء سريع', 'Quick Action')}</CardTitle>
              <CardDescription>{ui('الوصول السريع لأهم العمليات', 'Quick access to key operations')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full h-12 future-glow-button" onClick={() => navigate('/deeds/new')}>
                <PlusCircle className="ml-2 h-5 w-5" />
                {ui('إنشاء معاملة جديدة', 'Create New Transaction')}
              </Button>
            </CardContent>
          </Card>

          <Card className="future-card overflow-hidden">
            <CardHeader>
              <CardTitle>{ui('معلومات النظام', 'System Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border bg-background/40 p-3">
                <span className="text-sm text-muted-foreground">{ui('إصدار المنصة', 'Platform Version')}</span>
                <span className="font-mono">v2060.1.0</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-background/40 p-3">
                <span className="text-sm text-muted-foreground">{ui('وقت التشغيل', 'Uptime')}</span>
                <span className="font-mono">{ui('١٠٫٠ يوم', '10.0 days')}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border bg-background/40 p-3">
                <span className="text-sm text-muted-foreground">{ui('حالة النظام', 'System Status')}</span>
                <Badge variant="secondary">{ui('يعمل بكفاءة', 'Operational')}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-5 2xl:order-1">
          <div className={isArabic ? 'text-right' : 'text-left'}>
            <h1 className="text-2xl md:text-3xl 2xl:text-4xl font-bold">{t('home.welcome')}</h1>
            <p className="text-muted-foreground mt-2">{t('app.subtitle')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {topStats.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.label} className="future-card min-h-[118px] overflow-hidden">
                  <CardContent className="h-full p-3 sm:p-4 2xl:p-5">
                    <div className="flex h-full flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <div className="future-stat-icon h-12 w-12 bg-primary/10">
                        <Icon className={`h-6 w-6 ${item.accent}`} />
                      </div>
                      <div className={isArabic ? 'text-right' : 'text-left'}>
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

          <Card className="future-card overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{ui('نظرة عامة على المنصة', 'Platform Overview')}</span>
                <BarChart3 className="h-5 w-5 text-primary" />
              </CardTitle>
              <CardDescription>{ui('ملخص شامل لأداء المنصة والعمليات الرئيسية', 'A comprehensive summary of platform performance and core operations')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                <div className="text-center rounded-2xl border bg-background/40 p-4">
                  <Users className="h-7 w-7 mx-auto mb-3 text-primary" />
                  <p className="text-2xl font-bold">{formatNumber(dataStats.totalRecords)}</p>
                  <p className="text-xs text-muted-foreground">{ui('إجمالي السجلات', 'Total Records')}</p>
                </div>
                <div className="text-center rounded-2xl border bg-background/40 p-4">
                  <FileText className="h-7 w-7 mx-auto mb-3 text-primary" />
                  <p className="text-2xl font-bold">{formatNumber(dataStats.totalDeeds)}</p>
                  <p className="text-xs text-muted-foreground">{ui('الصكوك', 'Deeds')}</p>
                </div>
                <div className="text-center rounded-2xl border bg-background/40 p-4">
                  <Map className="h-7 w-7 mx-auto mb-3 text-primary" />
                  <p className="text-2xl font-bold">
                    {formatNumber(dataStats.totalAllocatedLands + dataStats.totalDeliveredLands +
                      dataStats.totalLeasedLandsOut + dataStats.totalLeasedLandsIn)}
                  </p>
                  <p className="text-xs text-muted-foreground">{ui('الأراضي', 'Lands')}</p>
                </div>
                <div className="text-center rounded-2xl border bg-background/40 p-4">
                  <Building className="h-7 w-7 mx-auto mb-3 text-primary" />
                  <p className="text-2xl font-bold">
                    {formatNumber(dataStats.totalLeasedBuildingsOut + dataStats.totalLeasedBuildingsIn)}
                  </p>
                  <p className="text-xs text-muted-foreground">{ui('المباني', 'Buildings')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="future-card overflow-hidden">
            <CardHeader>
              <CardTitle>{t('home.quickActions')}</CardTitle>
              <CardDescription>{ui('العمليات الشائعة للوصول السريع', 'Common operations for quick access')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="future-glow-button h-[88px] sm:h-[92px] min-w-0 flex-col gap-1.5 px-3 whitespace-normal"
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
                    <CardDescription>{ui('آخر الصكوك المضافة للنظام', 'Latest deeds added to the system')}</CardDescription>
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
                    <p>{ui('لا توجد صكوك', 'No deeds found')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentDeeds.map((deed, index) => (
                      <div key={deed.id}>
                        <div
                          className="flex flex-col items-stretch justify-between gap-3 rounded-2xl border bg-background/35 p-3 transition-colors hover:bg-primary/5 sm:flex-row sm:items-center cursor-pointer"
                          onClick={() => navigate(`/deeds/${deed.id}`)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-11 w-11 rounded-2xl bg-primary/10 grid place-items-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold truncate">{deed.deedNumber}</p>
                                {deed.isPlanned && <Badge variant="secondary">{ui('مخططة', 'Planned')}</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {deed.city || '-'} - {deed.district || '-'}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center justify-between gap-3 text-right sm:block sm:text-left">
                            <p className="font-bold">{formatNumber(safeNumber(deed.area))} {t('deed.sqm')}</p>
                            <p className="text-xs text-muted-foreground">
                              {deed.createdAt ? new Date(deed.createdAt).toLocaleDateString(locale) : '-'}
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

            <Card className="future-card overflow-hidden">
              <CardHeader>
                <CardTitle>{ui('الأمان والموثوقية', 'Security and Reliability')}</CardTitle>
                <CardDescription>{ui('مستوى أمان متقدم', 'Advanced security level')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="future-hero-art min-h-[210px]">
                  <div className="future-shield">
                    <Lock className="h-20 w-20" />
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border bg-background/35 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{ui('مستوى الأمان', 'Security Level')}</p>
                    <p className="text-2xl font-bold">99.9%</p>
                  </div>
                  <Shield className="h-10 w-10 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="future-card overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                {ui('التنبيهات والإشعارات', 'Alerts and Notifications')}
              </CardTitle>
              <CardDescription>{ui('آخر التحديثات المهمة على المنصة', 'Latest important platform updates')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-2xl border bg-background/35 p-4">
                <p className="font-bold">{ui('تحديث جديد', 'New Update')}</p>
                <p className="text-sm text-muted-foreground mt-1">{ui('تم تحسين واجهة المنصة المستقبلية.', 'The platform interface has been improved.')}</p>
              </div>
              <div className="rounded-2xl border bg-background/35 p-4">
                <p className="font-bold">{ui('معاملة بحاجة لمراجعة', 'Transaction Requires Review')}</p>
                <p className="text-sm text-muted-foreground mt-1">{ui('راجع السجلات الأخيرة عند الحاجة.', 'Review the latest records when needed.')}</p>
              </div>
              <div className="rounded-2xl border bg-background/35 p-4">
                <p className="font-bold">{ui('رفع مخطط', 'Upload Plan')}</p>
                <p className="text-sm text-muted-foreground mt-1">{ui('يمكن رفع المخططات من صفحة الأرشفة.', 'Plans can be uploaded from the Archive page.')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
