import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRightLeft,
  BarChart3,
  BellRing,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  Package,
  PlusCircle,
  ScanBarcode,
  ScanLine,
  Sparkles,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { usePermissions } from '../../context/PermissionsContext';
import { getAssetStats } from '../api/assets';
import type { AssetStats } from '../../types/asset';

const EMPTY_STATS: AssetStats = {
  total: 0,
  available: 0,
  inUse: 0,
  maintenance: 0,
  lost: 0,
  disposed: 0,
  inventoryCount: 0,
};

const safeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const percentage = (value: number, total: number) => {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
};

const quickActions = [
  {
    label: 'جميع الأصول',
    description: 'استعراض السجل الكامل والبحث والتصفية حسب الحالة أو المجموعة.',
    path: '/assets/list',
    icon: Boxes,
    ready: true,
    tone: 'blue',
  },
  {
    label: 'إضافة أصل جديد',
    description: 'تسجيل أصل وربطه بالباركود والموقع الإداري والمرفقات.',
    path: '/assets/new',
    icon: PlusCircle,
    ready: true,
    tone: 'emerald',
  },
  {
    label: 'استيراد Excel',
    description: 'رفع بيانات الأصول من النماذج المعتمدة دفعة واحدة.',
    path: '/assets/import',
    icon: FileSpreadsheet,
    ready: true,
    tone: 'amber',
  },
  {
    label: 'تقارير الأصول',
    description: 'إنشاء التقارير الإدارية وطباعتها وتصديرها.',
    path: '/assets/reports',
    icon: BarChart3,
    ready: true,
    tone: 'cyan',
  },
  {
    label: 'الجرد الميداني',
    description: 'مطابقة الأصول ميدانيًا باستخدام الباركود وموقع الأصل.',
    path: '/assets/inventory',
    icon: ScanLine,
    ready: false,
    tone: 'indigo',
  },
  {
    label: 'حركة الأصول',
    description: 'متابعة نقل الأصول والعهد بين الجهات والمواقع.',
    path: '/assets/movements',
    icon: ArrowRightLeft,
    ready: false,
    tone: 'slate',
  },
] as const;

const quickTone: Record<string, { icon: string; box: string; glow: string }> = {
  blue: {
    icon: 'text-blue-700',
    box: 'border-blue-100 bg-blue-50',
    glow: 'from-blue-50/80 to-transparent',
  },
  emerald: {
    icon: 'text-emerald-700',
    box: 'border-emerald-100 bg-emerald-50',
    glow: 'from-emerald-50/80 to-transparent',
  },
  amber: {
    icon: 'text-amber-700',
    box: 'border-amber-100 bg-amber-50',
    glow: 'from-amber-50/80 to-transparent',
  },
  cyan: {
    icon: 'text-cyan-700',
    box: 'border-cyan-100 bg-cyan-50',
    glow: 'from-cyan-50/80 to-transparent',
  },
  indigo: {
    icon: 'text-indigo-700',
    box: 'border-indigo-100 bg-indigo-50',
    glow: 'from-indigo-50/80 to-transparent',
  },
  slate: {
    icon: 'text-slate-700',
    box: 'border-slate-200 bg-slate-100',
    glow: 'from-slate-100/80 to-transparent',
  },
};

export const AssetDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const [stats, setStats] = useState<AssetStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  const canAdd = isAdmin || hasPermission('assets', 'canAdd');

  useEffect(() => {
    let cancelled = false;

    getAssetStats()
      .then((result) => {
        if (cancelled) return;
        setStats({
          total: safeNumber(result?.total),
          available: safeNumber(result?.available),
          inUse: safeNumber(result?.inUse),
          maintenance: safeNumber(result?.maintenance),
          lost: safeNumber(result?.lost),
          disposed: safeNumber(result?.disposed),
          inventoryCount: safeNumber(result?.inventoryCount),
        });
      })
      .catch(() => {
        if (!cancelled) setStats(EMPTY_STATS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const total = safeNumber(stats.total);
  const available = safeNumber(stats.available);
  const inUse = safeNumber(stats.inUse);
  const maintenance = safeNumber(stats.maintenance);
  const lost = safeNumber(stats.lost);
  const disposed = safeNumber(stats.disposed);
  const inventoryCount = safeNumber(stats.inventoryCount);
  const active = available + inUse;
  const inventoryGap = Math.max(total - inventoryCount, 0);

  const heroStats = useMemo(
    () => [
      {
        label: 'الأصول الإجمالية',
        value: total,
        icon: Boxes,
        accent: 'text-blue-200',
        glow: 'bg-blue-400/20 shadow-[0_0_32px_rgba(96,165,250,.28)]',
      },
      {
        label: 'الأصول النشطة',
        value: active,
        icon: ClipboardCheck,
        accent: 'text-amber-200',
        glow: 'bg-amber-300/20 shadow-[0_0_32px_rgba(252,211,77,.24)]',
      },
      {
        label: 'تحت الصيانة',
        value: maintenance,
        icon: Wrench,
        accent: 'text-emerald-200',
        glow: 'bg-emerald-300/20 shadow-[0_0_32px_rgba(110,231,183,.24)]',
      },
      {
        label: 'مفقود / عجز',
        value: lost,
        icon: TriangleAlert,
        accent: 'text-rose-200',
        glow: 'bg-rose-300/20 shadow-[0_0_32px_rgba(253,164,175,.22)]',
      },
    ],
    [active, lost, maintenance, total]
  );

  const analytics = useMemo(
    () => [
      { label: 'متاح', value: available, percent: percentage(available, total), bar: 'from-emerald-500 to-teal-400' },
      { label: 'قيد الاستخدام', value: inUse, percent: percentage(inUse, total), bar: 'from-blue-600 to-cyan-400' },
      { label: 'تحت الصيانة', value: maintenance, percent: percentage(maintenance, total), bar: 'from-amber-400 to-yellow-300' },
      { label: 'مستبعد', value: disposed, percent: percentage(disposed, total), bar: 'from-slate-500 to-slate-300' },
    ],
    [available, disposed, inUse, maintenance, total]
  );

  const alerts = useMemo(
    () => [
      {
        title: 'أصول تحت الصيانة',
        value: maintenance,
        hint: 'تحتاج متابعة حالة الصيانة والإجراء المنفذ.',
        icon: Wrench,
        box: 'border-amber-100 bg-amber-50/70 text-amber-700',
      },
      {
        title: 'أصول مفقودة / عجز',
        value: lost,
        hint: 'تحتاج مراجعة محاضر العجز أو حالة الأصل.',
        icon: AlertTriangle,
        box: 'border-rose-100 bg-rose-50/70 text-rose-700',
      },
      {
        title: 'متبقي للجرد',
        value: inventoryGap,
        hint: 'الفرق بين إجمالي الأصول وعدد الأصول التي تم جردها.',
        icon: ScanBarcode,
        box: 'border-blue-100 bg-blue-50/70 text-blue-700',
      },
    ],
    [inventoryGap, lost, maintenance]
  );

  return (
    <div className="relative mx-auto w-full max-w-[1760px] overflow-hidden rounded-[34px] bg-[#fbfaf5] pb-5 text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,.05)]">
      <div className="pointer-events-none absolute -right-32 -top-36 h-[420px] w-[420px] rounded-full bg-amber-100/45 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-40 h-[360px] w-[360px] rounded-full bg-blue-100/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/3 h-[300px] w-[300px] rounded-full bg-emerald-100/25 blur-3xl" />

      <div className="relative space-y-5 p-4 sm:p-6 lg:p-8">
        <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                وحدة الأصول
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/90 px-3 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
                <Database className="h-3.5 w-3.5" />
                منصة موحدة ومتصلة بقاعدة البيانات
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[#102949] sm:text-4xl lg:text-[42px]">
              نظام إدارة أصول الجامعة
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500 sm:text-[15px]">
              لوحة تشغيلية موحدة لإدارة الأصول ومتابعة حالتها ومواقعها وجردها وتقاريرها من نقطة واحدة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              variant="outline"
              onClick={() => navigate('/assets/list')}
              className="h-11 rounded-2xl border-slate-200 bg-white/85 px-4 text-[#17375f] shadow-sm hover:bg-white"
            >
              <ScanBarcode className="ml-2 h-4 w-4" />
              البحث والاستعراض
            </Button>
            {canAdd && (
              <Button
                onClick={() => navigate('/assets/new')}
                className="h-11 rounded-2xl bg-[#0f315f] px-5 text-white shadow-[0_12px_28px_rgba(15,49,95,.24)] hover:bg-[#0b274d]"
              >
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة أصل سريع
              </Button>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[#163f70]/20 bg-gradient-to-l from-[#0e2d56] via-[#123b6e] to-[#0d315e] p-2 shadow-[0_20px_42px_rgba(11,42,81,.22)]">
          <div className="grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
            {heroStats.map(({ label, value, icon: Icon, accent, glow }) => (
              <div key={label} className="flex min-h-[112px] items-center justify-between gap-4 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-sm font-bold text-white/85">{label}</p>
                  <p className="mt-1 text-3xl font-black tracking-tight text-white sm:text-[34px]">
                    {loading ? '...' : value.toLocaleString('ar-SA')}
                  </p>
                </div>
                <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/15 ${glow}`}>
                  <Icon className={`h-7 w-7 ${accent}`} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.78fr_1.6fr]">
          <div className="space-y-5">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_16px_38px_rgba(15,23,42,.055)] backdrop-blur-xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#102949]">ملخص التحليلات</h2>
                  <p className="mt-1 text-xs text-slate-500">توزيع حالات الأصول المسجلة حاليًا.</p>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-[#17375f]">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {analytics.map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                      <span className="font-bold text-slate-700">{item.label}</span>
                      <span className="font-semibold text-slate-500">
                        {loading ? '...' : item.value.toLocaleString('ar-SA')} · {item.percent}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full bg-gradient-to-l ${item.bar} transition-all duration-500`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-5 shadow-[0_16px_38px_rgba(15,23,42,.055)] backdrop-blur-xl sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-[#102949]">التنبيهات التشغيلية</h2>
                  <p className="mt-1 text-xs text-slate-500">أهم الحالات التي تستحق المراجعة.</p>
                </div>
                <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-[#17375f]">
                  <BellRing className="h-5 w-5" />
                  {(maintenance > 0 || lost > 0 || inventoryGap > 0) && (
                    <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {alerts.map(({ title, value, hint, icon: Icon, box }) => (
                  <div key={title} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#fcfcfa] p-3.5">
                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${box}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-black text-slate-800">{title}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
                          {loading ? '...' : value.toLocaleString('ar-SA')}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">{hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/82 shadow-[0_18px_46px_rgba(15,23,42,.065)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#1d5fa7]" />
                  <h2 className="text-xl font-black text-[#102949]">الوصول السريع</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">أهم مهام وحدة الأصول في واجهة تشغيلية واحدة.</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => navigate('/assets/list')}
                className="w-fit rounded-xl text-[#1d5fa7] hover:bg-blue-50 hover:text-[#174e89]"
              >
                جميع الأصول
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
              {quickActions.map(({ label, description, path, icon: Icon, ready, tone }) => {
                const needsAdd = path === '/assets/new' || path === '/assets/import';
                const disabled = !ready || (needsAdd && !canAdd);
                const toneStyle = quickTone[tone] || quickTone.blue;

                return (
                  <button
                    key={path}
                    type="button"
                    disabled={disabled}
                    onClick={() => !disabled && navigate(path)}
                    className="group relative min-h-[164px] overflow-hidden rounded-[22px] border border-slate-200/80 bg-white p-4 text-right shadow-[0_10px_24px_rgba(15,23,42,.04)] transition duration-200 enabled:hover:-translate-y-1 enabled:hover:border-slate-300 enabled:hover:shadow-[0_18px_32px_rgba(15,23,42,.08)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${toneStyle.glow}`} />
                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`grid h-11 w-11 place-items-center rounded-2xl border shadow-sm ${toneStyle.box}`}>
                          <Icon className={`h-5 w-5 ${toneStyle.icon}`} />
                        </div>
                        {!ready && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                            قريبًا
                          </span>
                        )}
                      </div>
                      <h3 className="mt-5 text-[15px] font-black text-[#17375f]">{label}</h3>
                      <p className="mt-1.5 text-xs leading-6 text-slate-500">{description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 border-t border-slate-100 bg-[#fbfbf8] p-4 sm:grid-cols-3 sm:p-5">
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  الأصول النشطة
                </div>
                <p className="mt-2 text-2xl font-black text-[#102949]">{loading ? '...' : active.toLocaleString('ar-SA')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <ScanBarcode className="h-4 w-4 text-blue-600" />
                  نسبة الجرد
                </div>
                <p className="mt-2 text-2xl font-black text-[#102949]">{loading ? '...' : `${percentage(inventoryCount, total)}%`}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Package className="h-4 w-4 text-slate-600" />
                  الأصول المستبعدة
                </div>
                <p className="mt-2 text-2xl font-black text-[#102949]">{loading ? '...' : disposed.toLocaleString('ar-SA')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-[22px] border border-slate-200/70 bg-white/65 px-4 py-3 text-xs text-slate-500 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            جميع الأرقام المعروضة مرتبطة مباشرة ببيانات وحدة الأصول.
          </div>
          <div className="font-medium text-slate-400">واجهة تشغيلية موحدة لإدارة أصول الجامعة</div>
        </section>
      </div>
    </div>
  );
};
