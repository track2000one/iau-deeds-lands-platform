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
  TrendingUp,
  PlusCircle,
  Search,
  BarChart3,
  Building,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { deeds } = useDeeds();
  const { getStatistics } = useData();
  const dataStats = getStatistics();

  const stats = React.useMemo(() => {
    const plannedCount = deeds.filter(d => d.isPlanned).length;
    const unplannedCount = deeds.filter(d => !d.isPlanned).length;
    const totalArea = deeds.reduce((sum, d) => sum + d.area, 0);

    return {
      total: deeds.length,
      planned: plannedCount,
      unplanned: unplannedCount,
      totalArea: totalArea.toLocaleString()
    };
  }, [deeds]);

  const recentDeeds = React.useMemo(() => {
    return [...deeds]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [deeds]);

  const quickActions = [
    { id: 'add-deed', path: '/deeds/new', icon: PlusCircle, label: t('nav.addDeed'), color: 'bg-primary' },
    { id: 'allocated-lands', path: '/lands/allocated', icon: MapPin, label: 'الأراضي المخصصة', color: 'bg-green-600' },
    { id: 'leased-buildings', path: '/buildings/leased-out', icon: Building, label: 'المباني المؤجرة', color: 'bg-blue-600' },
    { id: 'search', path: '/search', icon: Search, label: t('nav.search'), color: 'bg-secondary' },
    { id: 'reports', path: '/reports', icon: BarChart3, label: t('nav.reports'), color: 'bg-accent' },
    { id: 'admin', path: '/admin', icon: Shield, label: 'لوحة التحكم', color: 'bg-purple-600' },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Welcome Section */}
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t('home.welcome')}</h1>
        <p className="text-sm md:text-base text-muted-foreground">{t('app.subtitle')}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t('home.totalDeeds')}
              </CardTitle>
              <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              {t('deed.title')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-secondary">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t('home.plannedLands')}
              </CardTitle>
              <MapPin className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.planned}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.planned / stats.total) * 100).toFixed(1)}% {t('deed.isPlanned')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t('home.unplannedLands')}
              </CardTitle>
              <MapPinOff className="h-4 w-4 md:h-5 md:w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl md:text-3xl font-bold text-foreground">{stats.unplanned}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((stats.unplanned / stats.total) * 100).toFixed(1)}% غير مخططة
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2 md:pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                {t('home.totalArea')}
              </CardTitle>
              <Ruler className="h-4 w-4 md:h-5 md:w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold text-foreground">{stats.totalArea}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('deed.sqm')}</p>
          </CardContent>
        </Card>
      </div>

      {/* System Overview */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg md:text-xl">نظرة عامة على النظام</CardTitle>
          <CardDescription className="text-xs md:text-sm">إحصائيات شاملة لجميع البيانات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{dataStats.totalRecords}</p>
              <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{dataStats.totalDeeds}</p>
              <p className="text-xs text-muted-foreground">الصكوك</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {dataStats.totalAllocatedLands + dataStats.totalDeliveredLands +
                 dataStats.totalLeasedLandsOut + dataStats.totalLeasedLandsIn}
              </p>
              <p className="text-xs text-muted-foreground">الأراضي</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">
                {dataStats.totalLeasedBuildingsOut + dataStats.totalLeasedBuildingsIn}
              </p>
              <p className="text-xs text-muted-foreground">المباني</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <CardTitle className="text-lg md:text-xl">{t('home.quickActions')}</CardTitle>
          <CardDescription className="text-xs md:text-sm">الإجراءات الشائعة للوصول السريع</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  className="h-16 md:h-20 flex-col gap-1.5 md:gap-2"
                  onClick={() => navigate(action.path)}
                >
                  <div className={`p-1.5 md:p-2 rounded-full ${action.color} text-white`}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <span className="text-xs md:text-sm">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Deeds */}
      <Card>
        <CardHeader className="pb-3 md:pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg md:text-xl">{t('home.recentDeeds')}</CardTitle>
              <CardDescription className="text-xs md:text-sm">آخر الصكوك المضافة للنظام</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="text-xs md:text-sm w-full sm:w-auto" onClick={() => navigate('/deeds')}>
              {t('nav.allDeeds')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentDeeds.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm md:text-base">لا توجد صكوك</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {recentDeeds.map((deed, index) => (
                <div key={deed.id}>
                  <div
                    className="flex items-start sm:items-center justify-between p-2 md:p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors gap-2"
                    onClick={() => navigate(`/deeds/${deed.id}`)}
                  >
                    <div className="flex items-start sm:items-center gap-2 md:gap-3 flex-1 min-w-0">
                      <div className="p-1.5 md:p-2 rounded-md bg-primary/10 shrink-0">
                        <FileText className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm md:text-base truncate">{deed.deedNumber}</p>
                          {deed.isPlanned && (
                            <Badge variant="secondary" className="text-xs shrink-0">مخططة</Badge>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {deed.city} - {deed.district}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs md:text-sm font-medium whitespace-nowrap">{deed.area.toLocaleString()} {t('deed.sqm')}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {new Date(deed.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  {index < recentDeeds.length - 1 && <Separator className="mt-2 md:mt-3" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
