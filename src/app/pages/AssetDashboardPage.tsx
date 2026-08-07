import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Archive,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  ClipboardCheck,
  Package,
  PlusCircle,
  ScanLine,
  Wrench,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { usePermissions } from '../../context/PermissionsContext';
import { getAssetStats } from '../api/assets';
import type { AssetStats } from '../../types/asset';

const quickActions = [
  { label: 'جميع الأصول', description: 'استعراض سجل الأصول والبحث والتصفية', path: '/assets/list', icon: Boxes, ready: true },
  { label: 'إضافة أصل', description: 'تسجيل أصل جديد وربطه بموقعه وعهدته', path: '/assets/new', icon: PlusCircle, ready: true },
  { label: 'الجرد الميداني', description: 'مسح الباركود ومطابقة الأصل مع الموقع الفعلي', path: '/assets/inventory', icon: ScanLine, ready: false },
  { label: 'حركة الأصول', description: 'متابعة النقل وتغيير العهد والمواقع', path: '/assets/movements', icon: ArrowRightLeft, ready: false },
  { label: 'الصيانة', description: 'متابعة حالات الصيانة والإجراءات المنفذة', path: '/assets/maintenance', icon: Wrench, ready: false },
  { label: 'تقارير الأصول', description: 'تقارير إدارية قابلة للطباعة والتصدير', path: '/assets/reports', icon: BarChart3, ready: true },
];

export const AssetDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const [stats, setStats] = useState<AssetStats>({
    total: 0,
    inCustody: 0,
    maintenance: 0,
    excluded: 0,
  });
  const [loading, setLoading] = useState(true);

  const canAdd = isAdmin || hasPermission('assets', 'canAdd');

  useEffect(() => {
    let cancelled = false;

    getAssetStats()
      .then((result) => {
        if (!cancelled) setStats(result);
      })
      .catch(() => {
        if (!cancelled) {
          setStats({ total: 0, inCustody: 0, maintenance: 0, excluded: 0 });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statsCards = useMemo(
    () => [
      { label: 'إجمالي الأصول', value: stats.total, icon: Boxes },
      { label: 'أصول بعهدة', value: stats.inCustody, icon: Package },
      { label: 'تحت الصيانة', value: stats.maintenance, icon: Wrench },
      { label: 'أصول مستبعدة', value: stats.excluded, icon: Archive },
    ],
    [stats]
  );

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[30px] border border-white/55 bg-white/70 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.07),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-white/75 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" />
              وحدة الأصول — متصلة بقاعدة البيانات
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              لوحة إدارة الأصول
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              إدارة دورة حياة أصول الجامعة من التسجيل والموقع والعهدة إلى الجرد والصيانة والنقل والاستبعاد.
            </p>
          </div>

          {canAdd && (
            <Button onClick={() => navigate('/assets/new')} className="h-12 rounded-2xl px-5 shadow-lg">
              <PlusCircle className="ml-2 h-5 w-5" />
              إضافة أصل جديد
            </Button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-[26px] border-white/50 bg-white/72 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl">
            <CardContent className="flex items-center justify-between p-5 sm:p-6">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-black text-foreground">{loading ? '...' : value.toLocaleString('ar-SA')}</p>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-2xl border bg-background/80 shadow-inner">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden rounded-[30px] border-white/55 bg-white/68 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
        <CardHeader className="border-b bg-white/45">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-primary" />
            العمليات الرئيسية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
          {quickActions.map(({ label, description, path, icon: Icon, ready }) => {
            const disabled = !ready || (path === '/assets/new' && !canAdd);

            return (
              <button
                key={path}
                type="button"
                disabled={disabled}
                onClick={() => ready && navigate(path)}
                className="group rounded-[24px] border bg-white/72 p-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-55"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl border bg-background/80 transition group-hover:scale-105">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="rounded-full border bg-background/75 px-2 py-1 text-[11px] text-muted-foreground">
                    {ready ? 'متاح' : 'المرحلة التالية'}
                  </span>
                </div>
                <h2 className="text-base font-extrabold text-foreground">{label}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-dashed bg-background/60 px-4 py-3 text-sm text-muted-foreground">
        التسجيل والعرض والتعديل والحذف والبحث وتقارير الأصول أصبحت مرتبطة فعليًا بالـBackend وقاعدة PostgreSQL. المراحل التالية: الجرد والحركة والصيانة.
      </div>
    </div>
  );
};
