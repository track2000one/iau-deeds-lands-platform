import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Archive,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileDiff,
  FileSpreadsheet,
  History,
  Loader2,
  PlusCircle,
  RefreshCcw,
  RotateCcw,
  Send,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { usePermissions } from '../../context/PermissionsContext';
import {
  approveAccountingTransformationCycle,
  createAccountingTransformationCycle,
  deleteAccountingTransformationCycle,
  getAccountingTransformationCycleComparison,
  getAccountingTransformationCycles,
  reopenAccountingTransformationCycle,
  sendAccountingTransformationCycleToReview,
} from '../api/accountingTransformation';
import type {
  AccountingCycleComparison,
  AccountingTransformationCycle,
} from '../../types/accountingTransformation';

const statusLabel: Record<string, string> = {
  draft: 'مسودة',
  under_review: 'تحت المراجعة',
  approved: 'الحالية المعتمدة',
  archived: 'مؤرشفة',
};

const statusTone: Record<string, string> = {
  draft: 'border-amber-300 bg-amber-50 text-amber-800',
  under_review: 'border-sky-300 bg-sky-50 text-sky-800',
  approved: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  archived: 'border-slate-300 bg-slate-50 text-slate-700',
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const Metric: React.FC<{ label: string; value: number; tone?: string }> = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="rounded-2xl border bg-white/80 p-3 text-center shadow-sm">
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-black ${tone}`}>{value.toLocaleString('ar-SA')}</p>
  </div>
);

export const AccountingTransformationCyclesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canAdd = isAdmin || hasPermission('accounting_transformation', 'canAdd');
  const canEdit = isAdmin || hasPermission('accounting_transformation', 'canEdit');
  const canDelete = isAdmin || hasPermission('accounting_transformation', 'canDelete');

  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);
  const [comparisons, setComparisons] = useState<Record<string, AccountingCycleComparison>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const current = useMemo(() => cycles.find((cycle) => cycle.isCurrent), [cycles]);
  const openCycle = useMemo(() => cycles.find((cycle) => ['draft', 'under_review'].includes(cycle.status)), [cycles]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAccountingTransformationCycles();
      setCycles(data || []);
      const candidates = (data || []).filter((cycle) => cycle.basedOnCycleId && cycle.recordCount > 0);
      const results = await Promise.allSettled(candidates.map(async (cycle) => [cycle.id, await getAccountingTransformationCycleComparison(cycle.id)] as const));
      const next: Record<string, AccountingCycleComparison> = {};
      for (const result of results) {
        if (result.status === 'fulfilled') next[result.value[0]] = result.value[1];
      }
      setComparisons(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل دورات تحديث البيانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createCycle = async () => {
    if (name.trim().length < 3) return toast.error('أدخل اسمًا واضحًا لدورة التحديث');
    setCreating(true);
    try {
      const cycle = await createAccountingTransformationCycle({ name: name.trim(), description: description.trim() || null });
      toast.success('تم إنشاء دورة تحديث جديدة كمسودة');
      setName('');
      setDescription('');
      setShowCreate(false);
      await load();
      navigate(`/accounting-transformation/import?cycle=${encodeURIComponent(cycle.id)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء دورة التحديث');
    } finally {
      setCreating(false);
    }
  };

  const runAction = async (cycle: AccountingTransformationCycle, action: 'review' | 'reopen' | 'approve' | 'delete') => {
    const messages = {
      review: 'سيتم إيقاف الاستيراد مؤقتًا وإرسال الدورة للمراجعة. هل تريد المتابعة؟',
      reopen: 'سيتم إعادة الدورة إلى وضع المسودة لاستكمال البيانات. هل تريد المتابعة؟',
      approve: 'سيتم اعتماد هذه الدورة لتصبح البيانات الحالية، وستُؤرشف الدورة الحالية السابقة دون حذفها. هل تريد المتابعة؟',
      delete: 'سيتم حذف هذه المسودة وبياناتها فقط. الدورات المعتمدة والمؤرشفة لا يمكن حذفها. هل تريد المتابعة؟',
    } as const;
    if (!window.confirm(messages[action])) return;
    setBusyId(cycle.id);
    try {
      if (action === 'review') await sendAccountingTransformationCycleToReview(cycle.id);
      if (action === 'reopen') await reopenAccountingTransformationCycle(cycle.id);
      if (action === 'approve') await approveAccountingTransformationCycle(cycle.id);
      if (action === 'delete') await deleteAccountingTransformationCycle(cycle.id);
      toast.success(action === 'approve' ? 'تم اعتماد دورة التحديث وأصبحت هي البيانات الحالية' : 'تم تنفيذ الإجراء بنجاح');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تنفيذ الإجراء');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1560px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="relative overflow-hidden rounded-[30px] border border-slate-300 bg-[linear-gradient(135deg,#0f2943,#183e5f_52%,#0c3147)] p-5 text-white shadow-[0_18px_45px_rgba(15,42,70,.18)] md:p-7">
        <div className="absolute -left-10 -top-10 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Badge className="mb-3 border-white/20 bg-white/10 text-white hover:bg-white/10"><History className="ml-1 h-3.5 w-3.5" />سجل تاريخي كامل</Badge>
            <h1 className="text-2xl font-black md:text-3xl">دورات تحديث بيانات التحول المحاسبي</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-200">كل تحديث جديد يُحفظ كإصدار مستقل. لا تُحذف البيانات السابقة؛ بل تُقارن الدورة الجديدة بالدورة المعتمدة ثم تصبح الحالية بعد الاعتماد فقط.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate('/accounting-transformation')}><ArrowRight className="ml-2 h-4 w-4" />لوحة اللجنة</Button>
            {canAdd && !openCycle && <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300" onClick={() => setShowCreate((value) => !value)}><PlusCircle className="ml-2 h-4 w-4" />إنشاء دورة جديدة</Button>}
          </div>
        </div>

        {current && <div className="relative mt-5 grid gap-3 rounded-2xl border border-white/15 bg-white/[.08] p-4 backdrop-blur md:grid-cols-[1fr_auto] md:items-center">
          <div><p className="text-xs font-bold text-cyan-100">الدورة الحالية المعتمدة</p><p className="mt-1 text-lg font-black">#{current.cycleNumber} — {current.name}</p><p className="mt-1 text-xs text-slate-300">{current.recordCount.toLocaleString('ar-SA')} سجل · اعتمدت: {formatDate(current.approvedAt)}</p></div>
          <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate(`/accounting-transformation/records?cycle=${encodeURIComponent(current.id)}`)}><FileSpreadsheet className="ml-2 h-4 w-4" />عرض بيانات الدورة</Button>
        </div>}
      </section>

      {showCreate && !openCycle && <Card className="rounded-[26px] border-sky-200 bg-sky-50/50 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><PlusCircle className="h-5 w-5 text-sky-700" />إنشاء دورة تحديث جديدة</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-1.5 block text-sm font-bold text-slate-700">اسم الدورة</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: تحديث بيانات الربع الثالث 2026" /></div>
          <div><label className="mb-1.5 block text-sm font-bold text-slate-700">وصف مختصر</label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مصدر البيانات أو سبب التحديث" /></div>
          <div className="md:col-span-2 flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button><Button onClick={createCycle} disabled={creating}>{creating && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}إنشاء والانتقال للاستيراد</Button></div>
        </CardContent>
      </Card>}

      {openCycle && <section className="rounded-[26px] border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div><p className="text-xs font-black text-amber-700">دورة قيد العمل</p><h2 className="mt-1 text-xl font-black text-slate-900">#{openCycle.cycleNumber} — {openCycle.name}</h2><p className="mt-1 text-sm text-slate-600">الحالة: {statusLabel[openCycle.status]} · {openCycle.recordCount.toLocaleString('ar-SA')} سجل</p></div>
          <Button onClick={() => navigate(`/accounting-transformation/import?cycle=${encodeURIComponent(openCycle.id)}`)}><RefreshCcw className="ml-2 h-4 w-4" />فتح دورة التحديث</Button>
        </div>
      </section>}

      <section className="space-y-3">
        <div className="flex items-center justify-between"><div><h2 className="text-xl font-black text-slate-900">سجل الدورات</h2><p className="mt-1 text-xs text-slate-500">الدورات المؤرشفة محفوظة للعرض والمقارنة ولا يمكن حذفها.</p></div>{loading && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}</div>

        {!loading && !cycles.length && <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">لا توجد دورات حتى الآن.</div>}

        <div className="grid gap-4 xl:grid-cols-2">
          {cycles.map((cycle) => {
            const comparison = comparisons[cycle.id];
            const busy = busyId === cycle.id;
            return <Card key={cycle.id} className={`overflow-hidden rounded-[26px] ${cycle.isCurrent ? 'border-emerald-300 ring-2 ring-emerald-100' : ''}`}>
              <CardHeader className="border-b bg-slate-50/70 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><CardTitle className="truncate text-lg">#{cycle.cycleNumber} — {cycle.name}</CardTitle>{cycle.isCurrent && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}</div><p className="mt-2 text-xs leading-5 text-slate-500">{cycle.description || 'بدون وصف إضافي'}</p></div>
                  <Badge variant="outline" className={statusTone[cycle.status] || statusTone.archived}>{statusLabel[cycle.status] || cycle.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4"><div><span className="text-slate-500">السجلات</span><p className="mt-1 font-black text-slate-900">{cycle.recordCount.toLocaleString('ar-SA')}</p></div><div><span className="text-slate-500">تاريخ الإنشاء</span><p className="mt-1 font-bold text-slate-800">{formatDate(cycle.createdAt)}</p></div><div><span className="text-slate-500">ملف المصدر</span><p className="mt-1 truncate font-bold text-slate-800">{cycle.sourceFileName || '-'}</p></div><div><span className="text-slate-500">آخر استيراد</span><p className="mt-1 font-bold text-slate-800">{formatDate(cycle.importedAt)}</p></div></div>

                {comparison && <div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="جديد" value={comparison.new} tone="text-emerald-700" /><Metric label="معدل" value={comparison.modified} tone="text-sky-700" /><Metric label="بدون تغيير" value={comparison.unchanged} /><Metric label="لم يظهر بالتحديث" value={comparison.removed} tone="text-amber-700" /></div>}

                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/accounting-transformation/records?cycle=${encodeURIComponent(cycle.id)}`)}><FileSpreadsheet className="ml-1 h-4 w-4" />عرض البيانات</Button>
                  {cycle.basedOnCycleId && cycle.recordCount > 0 && <Button size="sm" variant="outline" onClick={() => navigate(`/accounting-transformation/cycles?compare=${encodeURIComponent(cycle.id)}`)}><FileDiff className="ml-1 h-4 w-4" />المقارنة</Button>}
                  {cycle.status === 'draft' && canAdd && <Button size="sm" variant="outline" onClick={() => navigate(`/accounting-transformation/import?cycle=${encodeURIComponent(cycle.id)}`)}><RefreshCcw className="ml-1 h-4 w-4" />استكمال الاستيراد</Button>}
                  {cycle.status === 'draft' && canEdit && cycle.recordCount > 0 && <Button size="sm" onClick={() => runAction(cycle, 'review')} disabled={busy}><Send className="ml-1 h-4 w-4" />إرسال للمراجعة</Button>}
                  {cycle.status === 'under_review' && canEdit && <Button size="sm" variant="outline" onClick={() => runAction(cycle, 'reopen')} disabled={busy}><RotateCcw className="ml-1 h-4 w-4" />إعادة للمسودة</Button>}
                  {cycle.status === 'under_review' && canEdit && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => runAction(cycle, 'approve')} disabled={busy}><CheckCircle2 className="ml-1 h-4 w-4" />اعتماد الدورة</Button>}
                  {['draft', 'under_review'].includes(cycle.status) && canDelete && <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => runAction(cycle, 'delete')} disabled={busy}><Trash2 className="ml-1 h-4 w-4" />حذف المسودة</Button>}
                  {cycle.status === 'archived' && <span className="mr-auto inline-flex items-center gap-1 text-xs font-bold text-slate-500"><Archive className="h-4 w-4" />محفوظة تاريخيًا</span>}
                  {cycle.status === 'under_review' && <span className="mr-auto inline-flex items-center gap-1 text-xs font-bold text-sky-700"><Clock3 className="h-4 w-4" />بانتظار الاعتماد</span>}
                </div>
              </CardContent>
            </Card>;
          })}
        </div>
      </section>
    </div>
  );
};
