import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Archive,
  ArrowLeft,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  Package,
  PlusCircle,
  ScanBarcode,
  ScanLine,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { usePermissions } from '../../context/PermissionsContext';
import { getAssetStats } from '../api/assets';
import type { AssetStats } from '../../types/asset';

const quickActions = [
  {
    label: 'جميع الأصول',
    description: 'استعراض سجل الأصول والبحث والتصفية',
    path: '/assets/list',
    icon: Boxes,
    ready: true,
    tone: 'blue',
  },
  {
    label: 'إضافة أصل',
    description: 'تسجيل أصل جديد وربطه بموقعه الإداري',
    path: '/assets/new',
    icon: PlusCircle,
    ready: true,
    tone: 'green',
  },
  {
    label: 'استيراد Excel',
    description: 'رفع بيانات الأصول من النماذج المعتمدة',
    path: '/assets/import',
    icon: FileSpreadsheet,
    ready: true,
    tone: 'emerald',
  },
  {
    label: 'الجرد الميداني',
    description: 'مسح الباركود ومطابقة الأصل مع الموقع الفعلي',
    path: '/assets/inventory',
    icon: ScanLine,
    ready: false,
    tone: 'cyan',
  },
  {
    label: 'حركة الأصول',
    description: 'متابعة نقل الأصول بين الإدارات والمواقع',
    path: '/assets/movements',
    icon: ArrowRightLeft,
    ready: false,
    tone: 'amber',
  },
  {
    label: 'الصيانة',
    description: 'متابعة حالات الصيانة والإجراءات المنفذة',
    path: '/assets/maintenance',
    icon: Wrench,
    ready: false,
    tone: 'slate',
  },
  {
    label: 'تقارير الأصول',
    description: 'تقارير إدارية قابلة للطباعة والتصدير',
    path: '/assets/reports',
    icon: BarChart3,
    ready: true,
    tone: 'indigo',
  },
] as const;

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

const toneClasses: Record<string, { icon: string; soft: string; border: string }> = {
  blue: {
    icon: 'text-blue-600',
    soft: 'bg-blue-50',
    border: 'border-blue-100',
  },
  green: {
    icon: 'text-green-600',
    soft: 'bg-green-50',
    border: 'border-green-100',
  },
  emerald: {
    icon: 'text-emerald-600',
    soft: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  cyan: {
    icon: 'text-cyan-600',
    soft: 'bg-cyan-50',
    border: 'border-cyan-100',
  },
  amber: {
    icon: 'text-amber-600',
    soft: 'bg-amber-50',
    border: 'border-amber-100',
  },
  slate: {
    icon: 'text-slate-600',
    soft: 'bg-slate-100',
    border: 'border-slate-200',
  },
  indigo: {
    icon: 'text-indigo-600',
    soft: 'bg-indigo-50',
    border: 'border-indigo-100',
  },
};

const percentage = (value: number, total: number) => {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
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
        if (!cancelled) {
          setStats({
            total: safeNumber(result?.total),
            available: safeNumber(result?.available),
            inUse: safeNumber(result?.inUse),
            maintenance: safeNumber(result?.maintenance),
            lost: safeNumber(result?.lost),
            disposed: safeNumber(result?.disposed),
            inventoryCount: safeNumber(result?.inventoryCount),
          });
        }
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

  const primaryStats = useMemo(
    () => [
      {
        label: 'إجمالي الأصول',
        value: safeNumber(stats.total),
        icon: Boxes,
        iconClass: 'text-blue-600',
        iconBg: 'bg-blue-50',
      },
      {
        label: 'الأصول المتاحة',
        value: safeNumber(stats.available),
        icon: CheckCircle2,
        iconClass: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
      },
      {
        label: 'قيد الاستخدام',
        value: safeNumber(stats.inUse),
        icon: ClipboardCheck,
        iconClass: 'text-amber-600',
        iconBg: 'bg-amber-50',
      },
      {
        label: 'تحت الصيانة',
        value: safeNumber(stats.maintenance),
        icon: Wrench,
        iconClass: 'text-cyan-600',
        iconBg: 'bg-cyan-50',
      },
      {
        label: 'مفقود / عجز / تالف',
        value: safeNumber(stats.lost),
        icon: TriangleAlert,
        iconClass: 'text-rose-600',
        iconBg: 'bg-rose-50',
      },
    ],
    [stats]
  );

  const total = safeNumber(stats.total);
  const statusRows = useMemo(
    () => [
      {
        label: 'متاح',
        value: safeNumber(stats.available),
        percent: percentage(safeNumber(stats.available), total),
        bar: 'bg-emerald-500',
      },
      {
        label: 'قيد الاستخدام',
        value: safeNumber(stats.inUse),
        percent: percentage(safeNumber(stats.inUse), total),
        bar: 'bg-amber-500',
      },
      {
        label: 'تحت الصيانة',
        value: safeNumber(stats.maintenance),
        percent: percentage(safeNumber(stats.maintenance), total),
        bar: 'bg-cyan-500',
      },
      {
        label: 'مستبعد',
        value: safeNumber(stats.disposed),
        percent: percentage(safeNumber(stats.disposed), total),
        bar: 'bg-slate-500',
      },
    ],
    [stats, total]
  );

  return (
    <div className="mx-auto w-full max-w-[1740px] space-y-5 pb-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-blue-700 via-blue-500 to-cyan-400" />
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-blue-100/70 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-12 h-72 w-72 rounded-full bg-emerald-100/50 blur-3xl" />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[20px] border border-blue-100 bg-blue-50 shadow-[0_10px_25px_rgba(37,99,235,0.12)] sm:h-16 sm:w-16">
              <Boxes className="h-7 w-7 text-blue-700 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                  وحدة الأصول
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <Database className="h-3.5 w-3.5" />
                  متصلة بقاعدة البيانات
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-[36px]">
                نظام إدارة أصول الجامعة
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500 sm:text-[15px]">
                لوحة موحدة لإدارة الأصول ومتابعة حالتها ومواقعها وحركتها وتقاريرها من نقطة واحدة.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Button
              variant="outline"
              onClick={() => navigate('/assets/list')}
              className="h-11 rounded-xl border-slate-200 bg-white px-4 text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ScanBarcode className="ml-2 h-4 w-4 text-blue-600" />
              البحث والاستعراض
            </Button>
            {canAdd && (
              <Button
                onClick={() => navigate('/assets/new')}
                className="h-11 rounded-xl bg-blue-700 px-5 shadow-[0_10px_24px_rgba(29,78,216,0.22)] hover:bg-blue-800"
              >
                <PlusCircle className="ml-2 h-4 w-4" />
                إضافة أصل
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {primaryStats.map(({ label, value, icon: Icon, iconClass, iconBg }) => (
          <div
            key={label}
            className="group rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.07)] sm:p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-[28px]">
                  {loading ? '...' : value.toLocaleString('ar-SA')}
                </p>
              </div>
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white shadow-inner ${iconBg}`}>
                <Icon className={`h-6 w-6 ${iconClass}`} />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.65fr_0.85fr]">
        <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="flex items-center gap-2 text-lg font-black text-slate-950">
                <Package className="h-5 w-5 text-blue-700" />
                الوصول السريع
              </div>
              <p className="mt-1 text-xs text-slate-500">أهم مهام وحدة الأصول مرتبة في واجهة واحدة.</p>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/assets/list')}
              className="w-fit rounded-xl text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
              جميع الأصول
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
            {quickActions.map(({ label, description, path, icon: Icon, ready, tone }) => {
              const requiresAdd = path === '/assets/new' || path === '/assets/import';
              const disabled = !ready || (requiresAdd && !canAdd);
              const toneStyle = toneClasses[tone] || toneClasses.blue;

              return (
                <button
                  key={path}
                  type="button"
                  disabled={disabled}
                  onClick={() => ready && !disabled && navigate(path)}
                  className="group relative min-h-[148px] overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 text-right shadow-[0_8px_20px_rgba(15,23,42,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_12px_28px_rgba(15,23,42,0.07)] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${toneStyle.soft} ${toneStyle.border}`}>
                      <Icon className={`h-5 w-5 ${toneStyle.icon}`} />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {ready ? 'متاح' : 'قريبًا'}
                    </span>
                  </div>
                  <h2 className="mt-4 text-[15px] font-black text-slate-900">{label}</h2>
                  <p className="mt-1.5 text-xs leading-6 text-slate-500">{description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">حالة الأصول</h2>
                <p className="mt-1 text-xs text-slate-500">توزيع مباشر من إجمالي السجلات.</p>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {statusRows.map((row) => (
                <div key={row.label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-slate-700">{row.label}</span>
                    <span className="text-slate-500">
                      {loading ? '...' : row.value.toLocaleString('ar-SA')} · {loading ? '...' : `${row.percent}%`}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all duration-500 ${row.bar}`} style={{ width: `${row.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-blue-100 bg-[linear-gradient(145deg,rgba(239,246,255,0.98),rgba(255,255,255,0.98))] p-5 shadow-[0_16px_36px_rgba(37,99,235,0.08)] sm:p-6">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-700 text-white shadow-[0_8px_20px_rgba(29,78,216,0.2)]">
                <ScanLine className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-950">ملخص الجرد</h3>
                <p className="mt-1 text-xs leading-6 text-slate-500">عدد عمليات الجرد المسجلة في النظام حتى الآن.</p>
              </div>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4 border-t border-blue-100 pt-4">
              <div>
                <p className="text-xs text-slate-500">عمليات الجرد</p>
                <p className="mt-1 text-3xl font-black text-blue-800">
                  {loading ? '...' : safeNumber(stats.inventoryCount).toLocaleString('ar-SA')}
                </p>
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-500">الأصول المستبعدة</p>
                <p className="mt-1 text-xl font-black text-slate-800">
                  {loading ? '...' : safeNumber(stats.disposed).toLocaleString('ar-SA')}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/80 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-600" />
          بيانات الإحصاءات والعمليات المتاحة مرتبطة بقاعدة بيانات النظام.
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Archive className="h-4 w-4" />
          يمكن الرجوع إلى التصميم السابق بسهولة عند الحاجة.
        </div>
      </section>
    </div>
  );
};
