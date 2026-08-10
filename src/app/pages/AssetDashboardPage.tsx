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
  PackagePlus,
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
    label: 'تقارير الأصول',
    description: 'إنشاء التقارير الإدارية وطباعتها وتصديرها.',
    path: '/assets/reports',
    icon: BarChart3,
    ready: true,
    tone: 'cyan',
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

const actionTone: Record<string, { icon: string; box: string; glow: string }> = {
  blue: {
    icon: 'text-blue-200',
    box: 'border-blue-300/25 bg-blue-300/10',
    glow: 'shadow-[0_0_28px_rgba(96,165,250,.16)]',
  },
  emerald: {
    icon: 'text-emerald-200',
    box: 'border-emerald-300/25 bg-emerald-300/10',
    glow: 'shadow-[0_0_28px_rgba(52,211,153,.15)]',
  },
  cyan: {
    icon: 'text-cyan-200',
    box: 'border-cyan-300/25 bg-cyan-300/10',
    glow: 'shadow-[0_0_28px_rgba(34,211,238,.14)]',
  },
  amber: {
    icon: 'text-amber-200',
    box: 'border-amber-300/25 bg-amber-300/10',
    glow: 'shadow-[0_0_28px_rgba(251,191,36,.14)]',
  },
  indigo: {
    icon: 'text-indigo-200',
    box: 'border-indigo-300/25 bg-indigo-300/10',
    glow: 'shadow-[0_0_28px_rgba(129,140,248,.14)]',
  },
  slate: {
    icon: 'text-slate-200',
    box: 'border-slate-200/20 bg-slate-200/10',
    glow: 'shadow-[0_0_28px_rgba(203,213,225,.1)]',
  },
};

const glassPanel =
  'border border-white/20 bg-white/[0.075] shadow-[inset_0_1px_0_rgba(255,255,255,.28),0_20px_50px_rgba(2,8,23,.28)] backdrop-blur-2xl';

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
        iconClass: 'text-blue-100',
        iconBg: 'border-blue-300/30 bg-blue-400/15 shadow-[0_0_30px_rgba(96,165,250,.25)]',
      },
      {
        label: 'الأصول النشطة',
        value: active,
        icon: ClipboardCheck,
        iconClass: 'text-amber-100',
        iconBg: 'border-amber-300/30 bg-amber-300/15 shadow-[0_0_30px_rgba(251,191,36,.22)]',
      },
      {
        label: 'تحت الصيانة',
        value: maintenance,
        icon: Wrench,
        iconClass: 'text-emerald-100',
        iconBg: 'border-emerald-300/30 bg-emerald-300/15 shadow-[0_0_30px_rgba(52,211,153,.22)]',
      },
      {
        label: 'مفقود / عجز',
        value: lost,
        icon: TriangleAlert,
        iconClass: 'text-rose-100',
        iconBg: 'border-rose-300/30 bg-rose-300/15 shadow-[0_0_30px_rgba(251,113,133,.2)]',
      },
    ],
    [active, lost, maintenance, total]
  );

  const analytics = useMemo(
    () => [
      { label: 'متاح', value: available, percent: percentage(available, total), bar: 'from-emerald-300 via-teal-300 to-cyan-300' },
      { label: 'قيد الاستخدام', value: inUse, percent: percentage(inUse, total), bar: 'from-blue-400 via-cyan-300 to-sky-200' },
      { label: 'تحت الصيانة', value: maintenance, percent: percentage(maintenance, total), bar: 'from-amber-300 via-yellow-200 to-orange-200' },
      { label: 'مستبعد', value: disposed, percent: percentage(disposed, total), bar: 'from-slate-300 via-slate-200 to-white/70' },
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
        iconClass: 'text-amber-100',
        iconBg: 'border-amber-300/25 bg-amber-300/10',
      },
      {
        title: 'مفقود / عجز',
        value: lost,
        hint: 'تحتاج مراجعة محاضر العجز أو حالة الأصل.',
        icon: AlertTriangle,
        iconClass: 'text-rose-100',
        iconBg: 'border-rose-300/25 bg-rose-300/10',
      },
      {
        title: 'متبقي للجرد',
        value: inventoryGap,
        hint: 'الفرق بين إجمالي الأصول وعدد الأصول التي تم جردها.',
        icon: ScanBarcode,
        iconClass: 'text-cyan-100',
        iconBg: 'border-cyan-300/25 bg-cyan-300/10',
      },
    ],
    [inventoryGap, lost, maintenance]
  );

  return (
    <div className="mx-auto w-full max-w-[1780px] pb-5">
      <div className="relative overflow-hidden rounded-[36px] border border-slate-700/50 bg-[#10243b] text-white shadow-[0_34px_90px_rgba(2,8,23,.32)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_2%,rgba(148,163,184,.32),transparent_25%),radial-gradient(circle_at_18%_14%,rgba(226,232,240,.18),transparent_28%),radial-gradient(circle_at_64%_64%,rgba(56,189,248,.08),transparent_28%),linear-gradient(135deg,#23364a_0%,#122941_44%,#0a1f36_100%)]" />
        <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full border border-white/10 bg-white/5 blur-sm" />
        <div className="pointer-events-none absolute right-[22%] -top-24 h-48 w-72 rotate-6 rounded-[38px] border border-white/15 bg-white/10 shadow-[0_24px_50px_rgba(2,8,23,.28)] backdrop-blur-xl" />
        <div className="pointer-events-none absolute bottom-20 right-16 h-44 w-44 rounded-full bg-blue-400/10 blur-3xl" />

        <div className="relative space-y-5 p-4 sm:p-6 lg:p-8">
          <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold text-slate-100 shadow-inner backdrop-blur-xl">
                  وحدة الأصول
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-300/15 px-3 py-1 text-[11px] font-bold text-emerald-50 shadow-inner backdrop-blur-xl">
                  <Database className="h-3.5 w-3.5" />
                  منصة موحدة ومتصلة بقاعدة البيانات
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-[42px]">
                نظام إدارة أصول الجامعة
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200/80 sm:text-[15px]">
                لوحة تشغيلية موحدة لإدارة الأصول ومتابعة حالتها ومواقعها وجردها وتقاريرها من نقطة واحدة.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Button
                variant="outline"
                onClick={() => navigate('/assets/list')}
                className="h-11 rounded-2xl border-white/20 bg-white/10 px-4 text-white shadow-inner backdrop-blur-xl hover:bg-white/15 hover:text-white"
              >
                <ScanBarcode className="ml-2 h-4 w-4 text-cyan-100" />
                البحث والاستعراض
              </Button>
              {canAdd && (
                <Button
                  onClick={() => navigate('/assets/new')}
                  className="h-11 rounded-2xl border border-blue-300/25 bg-[#123d73] px-5 text-white shadow-[0_12px_28px_rgba(3,105,161,.28)] hover:bg-[#164b87]"
                >
                  <PlusCircle className="ml-2 h-4 w-4" />
                  إضافة أصل سريع
                </Button>
              )}
            </div>
          </section>

          <section className={`overflow-hidden rounded-[28px] p-2 ${glassPanel}`}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {heroStats.map(({ label, value, icon: Icon, iconClass, iconBg }) => (
                <div
                  key={label}
                  className="flex min-h-[112px] items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-slate-900/20 px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,.16)] backdrop-blur-xl sm:px-6"
                >
                  <div>
                    <p className="text-sm font-bold text-white/90">{label}</p>
                    <p className="mt-1 text-3xl font-black tracking-tight text-white sm:text-[34px]">
                      {loading ? '...' : value.toLocaleString('ar-SA')}
                    </p>
                  </div>
                  <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border ${iconBg}`}>
                    <Icon className={`h-7 w-7 ${iconClass}`} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.78fr_1.62fr]">
            <aside className="space-y-5">
              <div className={`rounded-[28px] p-5 sm:p-6 ${glassPanel}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white">ملخص التحليلات</h2>
                    <p className="mt-1 text-xs text-slate-200/65">توزيع حالات الأصول المسجلة حاليًا.</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-slate-100 shadow-inner">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {analytics.map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                        <span className="font-bold text-slate-100">{item.label}</span>
                        <span className="text-slate-200/70">
                          {loading ? '...' : item.value.toLocaleString('ar-SA')} · {loading ? '...' : `${item.percent}%`}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-slate-950/35 shadow-inner">
                        <div
                          className={`h-full rounded-full bg-gradient-to-l ${item.bar} shadow-[0_0_18px_rgba(255,255,255,.12)] transition-all duration-700`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-[28px] p-5 sm:p-6 ${glassPanel}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black text-white">التنبيهات</h2>
                    <p className="mt-1 text-xs text-slate-200/65">حالات تحتاج متابعة تشغيلية.</p>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-slate-100">
                    <BellRing className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {alerts.map(({ title, value, hint, icon: Icon, iconClass, iconBg }) => (
                    <div key={title} className="rounded-[20px] border border-white/10 bg-slate-950/18 p-3.5 shadow-inner backdrop-blur-xl">
                      <div className="flex items-start gap-3">
                        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${iconBg}`}>
                          <Icon className={`h-5 w-5 ${iconClass}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="truncate text-sm font-black text-white">{title}</h3>
                            <span className="text-lg font-black text-white">{loading ? '...' : value.toLocaleString('ar-SA')}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-5 text-slate-200/60">{hint}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <div className={`overflow-hidden rounded-[30px] ${glassPanel}`}>
              <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black text-white">
                    <Activity className="h-5 w-5 text-cyan-100" />
                    مركز عمليات الأصول
                  </div>
                  <p className="mt-1 text-xs text-slate-200/65">أهم مهام وحدة الأصول في واجهة زجاجية واحدة.</p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/assets/list')}
                  className="w-fit rounded-xl text-blue-100 hover:bg-white/10 hover:text-white"
                >
                  جميع الأصول
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                {quickActions.map(({ label, description, path, icon: Icon, ready, tone }) => {
                  const requiresAdd = path === '/assets/new' || path === '/assets/import';
                  const disabled = !ready || (requiresAdd && !canAdd);
                  const toneStyle = actionTone[tone] || actionTone.blue;

                  return (
                    <button
                      key={path}
                      type="button"
                      disabled={disabled}
                      onClick={() => ready && !disabled && navigate(path)}
                      className={`group relative min-h-[156px] overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.055] p-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,.15),0_12px_28px_rgba(2,8,23,.18)] backdrop-blur-2xl transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.085] hover:shadow-[inset_0_1px_0_rgba(255,255,255,.2),0_18px_34px_rgba(2,8,23,.24)] disabled:cursor-not-allowed disabled:opacity-50 ${toneStyle.glow}`}
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                      <div className="flex items-start justify-between gap-3">
                        <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${toneStyle.box}`}>
                          <Icon className={`h-5 w-5 ${toneStyle.icon}`} />
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${ready ? 'border-emerald-200/20 bg-emerald-300/12 text-emerald-100' : 'border-slate-300/15 bg-slate-200/8 text-slate-200/65'}`}>
                          {ready ? 'متاح' : 'قريبًا'}
                        </span>
                      </div>
                      <h2 className="mt-4 text-[15px] font-black text-white">{label}</h2>
                      <p className="mt-1.5 text-xs leading-6 text-slate-200/65">{description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-3 sm:p-5">
                <div className="rounded-[20px] border border-white/10 bg-slate-950/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-200/70">الأصول النشطة</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-white">{loading ? '...' : active.toLocaleString('ar-SA')}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-200/70">عمليات الجرد</span>
                    <ScanLine className="h-4 w-4 text-cyan-200" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-white">{loading ? '...' : inventoryCount.toLocaleString('ar-SA')}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-slate-950/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-200/70">الأصول المستبعدة</span>
                    <AlertTriangle className="h-4 w-4 text-amber-200" />
                  </div>
                  <p className="mt-2 text-2xl font-black text-white">{loading ? '...' : disposed.toLocaleString('ar-SA')}</p>
                </div>
              </div>
            </div>
          </section>

          <section className={`flex flex-col gap-3 rounded-[24px] px-4 py-4 text-xs text-slate-200/70 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${glassPanel}`}>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-200" />
              البيانات والإحصاءات مرتبطة بقاعدة بيانات النظام الحالية.
            </div>
            <div className="flex items-center gap-2 text-slate-200/55">
              <Sparkles className="h-4 w-4 text-blue-200" />
              واجهة زجاجية داكنة مستوحاة من التصميم المرفق مع الحفاظ على وظائف المنصة.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
