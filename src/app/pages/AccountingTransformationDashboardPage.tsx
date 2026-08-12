import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileSpreadsheet,
  LandPlot,
  ListChecks,
  PlusCircle,
  Scale,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { usePermissions } from '../../context/PermissionsContext';
import { getAccountingTransformationStats } from '../api/accountingTransformation';
import type { AccountingTransformationStats } from '../../types/accountingTransformation';

const EMPTY: AccountingTransformationStats = {
  total: 0,
  lands: 0,
  buildings: 0,
  censusReady: 0,
  inventoryReady: 0,
  valuationReady: 0,
  needsCompletion: 0,
  underReview: 0,
  averageCensus: 0,
  averageInventory: 0,
  averageValuation: 0,
  averageOverall: 0,
};

const quickActions = [
  { label: 'جميع السجلات', description: 'استعراض الأراضي والمباني والبحث في متطلبات التحول.', path: '/accounting-transformation/records', icon: FileSearch },
  { label: 'إضافة سجل جديد', description: 'إدخال سجل أرض أو مبنى وفق حقول النموذج المعتمد.', path: '/accounting-transformation/new', icon: PlusCircle },
  { label: 'استيراد Excel', description: 'استيراد ملف التحول المحاسبي المعتمد مباشرة مع تحليل الحقول.', path: '/accounting-transformation/import', icon: FileSpreadsheet },
  { label: 'التقارير', description: 'تقارير الحصر والجرد والتقييم مع Excel والطباعة.', path: '/accounting-transformation/reports', icon: BarChart3 },
] as const;

const ProgressLine: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
      <span>{label}</span><span>{value}%</span>
    </div>
    <div className="h-2.5 overflow-hidden rounded-full bg-white/10 shadow-inner">
      <div className="h-full rounded-full bg-gradient-to-l from-cyan-300 via-sky-300 to-blue-400 transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);

export const AccountingTransformationDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const [stats, setStats] = useState<AccountingTransformationStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const canAdd = isAdmin || hasPermission('accounting_transformation', 'canAdd');

  useEffect(() => {
    let active = true;
    getAccountingTransformationStats()
      .then((data) => active && setStats(data || EMPTY))
      .catch(() => active && setStats(EMPTY))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const hero = useMemo(() => [
    { label: 'إجمالي السجلات', value: stats.total, icon: ListChecks, tone: 'text-blue-100 border-blue-300/25 bg-blue-400/15' },
    { label: 'جاهز للحصر', value: stats.censusReady, icon: ClipboardCheck, tone: 'text-cyan-100 border-cyan-300/25 bg-cyan-400/15' },
    { label: 'جاهز للجرد', value: stats.inventoryReady, icon: CheckCircle2, tone: 'text-emerald-100 border-emerald-300/25 bg-emerald-400/15' },
    { label: 'جاهز للتقييم', value: stats.valuationReady, icon: Scale, tone: 'text-amber-100 border-amber-300/25 bg-amber-400/15' },
  ], [stats]);

  return (
    <div className="mx-auto w-full max-w-[1780px] pb-6" dir="rtl">
      <div className="relative overflow-hidden rounded-[36px] border border-slate-400/30 bg-[radial-gradient(circle_at_82%_2%,rgba(56,189,248,.18),transparent_26%),linear-gradient(135deg,#24384d_0%,#122940_45%,#0a1f35_100%)] text-white shadow-[0_34px_90px_rgba(2,8,23,.30)]">
        <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute right-[35%] -top-24 h-56 w-72 rotate-6 rounded-[44px] border border-white/10 bg-white/5 backdrop-blur-xl" />
        <div className="relative space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold backdrop-blur-xl">لجنة متابعة متطلبات التحول المحاسبي</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold text-cyan-50"><Sparkles className="h-3.5 w-3.5" />متوافق مع نموذج الأراضي والمباني</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-[42px]">لجنة متابعة متطلبات التحول المحاسبي</h1>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300 sm:text-[15px]">لوحة موحدة لمتابعة بيانات الأراضي والمباني ومتطلبات الحصر والجرد والتقييم والتصنيف المحاسبي، مع قياس تلقائي لاكتمال البيانات واستيراد النموذج الرسمي.</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button variant="outline" className="h-11 rounded-2xl border-white/15 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate('/accounting-transformation/records')}><FileSearch className="ml-2 h-4 w-4" />استعراض السجلات</Button>
              {canAdd && <Button className="h-11 rounded-2xl bg-cyan-500 px-5 text-slate-950 shadow-[0_10px_28px_rgba(34,211,238,.20)] hover:bg-cyan-400" onClick={() => navigate('/accounting-transformation/new')}><PlusCircle className="ml-2 h-4 w-4" />إضافة سجل</Button>}
            </div>
          </section>

          <section className="grid overflow-hidden rounded-[28px] border border-white/15 bg-[#071f47]/75 shadow-[inset_0_1px_0_rgba(255,255,255,.15),0_18px_45px_rgba(2,8,23,.24)] md:grid-cols-4">
            {hero.map(({ label, value, icon: Icon, tone }, index) => (
              <div key={label} className={`flex items-center gap-4 p-5 ${index ? 'border-t border-white/10 md:border-t-0 md:border-r' : ''}`}>
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border ${tone}`}><Icon className="h-6 w-6" /></div>
                <div><p className="text-xs font-bold text-slate-300">{label}</p><p className="mt-1 text-3xl font-black">{loading ? '...' : value.toLocaleString('ar-SA')}</p></div>
              </div>
            ))}
          </section>

          <section className="grid gap-5 xl:grid-cols-[.85fr_1.55fr]">
            <div className="space-y-5">
              <div className="rounded-[28px] border border-white/15 bg-white/[.075] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_18px_44px_rgba(2,8,23,.20)] backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-cyan-200" /><h2 className="font-black">متوسط اكتمال المتطلبات</h2></div>
                <div className="space-y-4">
                  <ProgressLine label="الحصر" value={stats.averageCensus} />
                  <ProgressLine label="الجرد" value={stats.averageInventory} />
                  <ProgressLine label="التقييم" value={stats.averageValuation} />
                  <ProgressLine label="المتوسط العام" value={stats.averageOverall} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => navigate('/accounting-transformation/records?type=land')} className="rounded-[24px] border border-white/15 bg-white/[.075] p-5 text-right transition hover:bg-white/10"><LandPlot className="mb-4 h-7 w-7 text-amber-200" /><p className="text-xs text-slate-300">سجلات الأراضي</p><p className="mt-1 text-3xl font-black">{stats.lands}</p></button>
                <button onClick={() => navigate('/accounting-transformation/records?type=building')} className="rounded-[24px] border border-white/15 bg-white/[.075] p-5 text-right transition hover:bg-white/10"><Building2 className="mb-4 h-7 w-7 text-blue-200" /><p className="text-xs text-slate-300">سجلات المباني</p><p className="mt-1 text-3xl font-black">{stats.buildings}</p></button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/[.075] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.18),0_18px_44px_rgba(2,8,23,.20)] backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black">الخدمات الرئيسية</h2><p className="mt-1 text-xs text-slate-300">بنفس مسار وحدة الأصول: إدخال، استعراض، استيراد، تقارير.</p></div>{stats.needsCompletion > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100"><TriangleAlert className="h-3.5 w-3.5" />{stats.needsCompletion} يحتاج استكمال</span>}</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {quickActions.map(({ label, description, path, icon: Icon }) => {
                  const disabled = (path.endsWith('/new') || path.endsWith('/import')) && !canAdd;
                  return <button key={path} disabled={disabled} onClick={() => !disabled && navigate(path)} className="group rounded-[24px] border border-white/15 bg-white/[.07] p-5 text-right transition hover:-translate-y-0.5 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"><div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100"><Icon className="h-5 w-5" /></div><h3 className="font-black">{label}</h3><p className="mt-2 text-xs leading-6 text-slate-300">{description}</p></button>;
                })}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
