import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  executeAccountingTransformationZeroReset,
  previewAccountingTransformationZeroReset,
  type AccountingZeroPreview,
  type AccountingZeroResult,
} from '../api/accountingZeroReset';

const Metric: React.FC<{ label: string; value: number; tone?: string; hint?: string }> = ({ label, value, tone = 'text-slate-950', hint }) => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <p className={`mt-1 text-3xl font-black ${tone}`}>{value.toLocaleString('ar-SA')}</p>
    {hint && <p className="mt-1 text-[10px] leading-5 text-slate-500">{hint}</p>}
  </div>
);

export const AccountingTransformationZeroResetPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const [preview, setPreview] = useState<AccountingZeroPreview | null>(null);
  const [result, setResult] = useState<AccountingZeroResult | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    setResult(null);
    setConfirmation('');
    setAcknowledged(false);
    try {
      const data = await previewAccountingTransformationZeroReset();
      setPreview(data);
    } catch (error) {
      setPreview(null);
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة حالة سجل الأصول ومتطلبات التحول');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) void loadPreview();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6" dir="rtl">
        <Card className="border-red-200 bg-red-50"><CardContent className="p-6 text-center font-bold text-red-900">هذه العملية متاحة لمسؤول النظام فقط.</CardContent></Card>
      </div>
    );
  }

  const ready = Boolean(preview && acknowledged && confirmation.trim() === preview.confirmationPhrase && !resetting);

  const executeReset = async () => {
    if (!preview || !ready) return;
    const accepted = window.confirm(
      `تأكيد نهائي لتصفير سجل الأصول ومتطلبات التحول\n\n` +
      `سيتم حذف ${preview.impact.destructive.records.toLocaleString('ar-SA')} سجلًا و${preview.impact.destructive.cycles.toLocaleString('ar-SA')} دورة و${preview.impact.destructive.cycleTemplateSnapshots.toLocaleString('ar-SA')} لقطة دورة.\n\n` +
      'لن يتم حذف المستخدمين أو الصلاحيات أو سجل التدقيق أو إصدارات النموذج الرسمي.\n\n' +
      'بعد العملية سيصبح السجل فارغًا تمامًا. هل تريد المتابعة؟',
    );
    if (!accepted) return;

    setResetting(true);
    try {
      const response = await executeAccountingTransformationZeroReset({
        confirmation: confirmation.trim(),
        expectedImpact: preview.impact.destructive,
      });
      setResult(response);
      setPreview(null);
      setConfirmation('');
      setAcknowledged(false);
      toast.success('تم تصفير سجل الأصول ومتطلبات التحول بنجاح');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تنفيذ عملية التصفير');
      await loadPreview();
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1260px] space-y-5 p-2 pb-12 sm:p-5" dir="rtl">
      <section className="rounded-[30px] border border-red-200 bg-[linear-gradient(135deg,#fff,#fff7f7)] p-5 shadow-[0_18px_55px_rgba(127,29,29,.10)] md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="mb-3 border-red-200 bg-red-50 text-red-700"><ShieldAlert className="ml-1 h-4 w-4" />إجراء إداري نهائي</Badge>
            <h1 className="text-2xl font-black text-slate-950 md:text-3xl">تصفير سجل الأصول ومتطلبات التحول</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">يحذف هذا الإجراء جميع سجلات ودورات التحول المحاسبي ويترك القسم فارغًا تمامًا، دون استيراد ملف بديل أو إنشاء دورة جديدة.</p>
          </div>
          <Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation')}><ArrowRight className="ml-2 h-4 w-4" />العودة للوحة اللجنة</Button>
        </div>
      </section>

      <Card className="rounded-[26px] border-amber-200 bg-amber-50/60">
        <CardContent className="grid gap-3 p-5 md:grid-cols-[auto_1fr] md:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-300 bg-white text-amber-700"><AlertTriangle className="h-6 w-6" /></div>
          <div><p className="font-black text-amber-950">ما الذي سيُحذف؟</p><p className="mt-1 text-sm leading-7 text-amber-900">جميع سجلات الأراضي والمباني والأصول داخل «سجل الأصول ومتطلبات التحول»، وجميع دورات البيانات ولقطات قوالب الدورات. لا يتم حذف المستخدمين أو صلاحياتهم أو Audit Log أو إصدارات النموذج الرسمي.</p></div>
        </CardContent>
      </Card>

      {loading && <Card className="rounded-[26px]"><CardContent className="flex items-center justify-center gap-2 p-10 text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />جاري قراءة الأثر الفعلي من قاعدة البيانات...</CardContent></Card>}

      {preview && !loading && <>
        <Card className="rounded-[26px]">
          <CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />الأثر قبل التصفير</CardTitle><Button variant="outline" size="sm" onClick={() => void loadPreview()}><RefreshCcw className="ml-2 h-4 w-4" />تحديث الأرقام</Button></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="السجلات التي ستُحذف" value={preview.impact.destructive.records} tone="text-red-700" />
              <Metric label="الدورات التي ستُحذف" value={preview.impact.destructive.cycles} tone="text-red-700" />
              <Metric label="لقطات الدورات التي ستُحذف" value={preview.impact.destructive.cycleTemplateSnapshots} tone="text-red-700" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="المستخدمون محفوظون" value={preview.impact.preserved.users} tone="text-emerald-700" />
              <Metric label="الصلاحيات محفوظة" value={preview.impact.preserved.permissions} tone="text-emerald-700" />
              <Metric label="Audit Log محفوظ" value={preview.impact.preserved.auditLogs} tone="text-emerald-700" />
              <Metric label="إصدارات النموذج محفوظة" value={preview.impact.preserved.officialTemplateVersions} tone="text-emerald-700" />
            </div>
            {preview.impact.currentCycle && <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-slate-700">الدورة الحالية: <strong>#{preview.impact.currentCycle.cycleNumber} — {preview.impact.currentCycle.name}</strong> · الحالة: {preview.impact.currentCycle.status}</div>}
          </CardContent>
        </Card>

        <Card className="rounded-[26px] border-red-200">
          <CardHeader><CardTitle className="flex items-center gap-2 text-red-800"><LockKeyhole className="h-5 w-5" />التأكيد النهائي</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-900">اكتب العبارة التالية حرفيًا للتأكيد: <strong className="select-all">{preview.confirmationPhrase}</strong></div>
            <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={preview.confirmationPhrase} className="h-12 rounded-xl" />
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm leading-6"><input type="checkbox" className="mt-1 h-4 w-4" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} /><span>أقر بأنني راجعت عدد السجلات أعلاه، وأن عملية التصفير ستجعل «سجل الأصول ومتطلبات التحول» فارغًا، وسأعيد إدخال البيانات الصحيحة بعد ذلك.</span></label>
            <Button disabled={!ready} onClick={() => void executeReset()} className="h-12 w-full rounded-2xl bg-red-700 text-white hover:bg-red-800"><Trash2 className="ml-2 h-5 w-5" />{resetting ? 'جاري التصفير...' : 'تصفير السجل الآن'}</Button>
          </CardContent>
        </Card>
      </>}

      {result && <Card className="rounded-[26px] border-emerald-200 bg-emerald-50/70">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-7 w-7 text-emerald-700" /><div><p className="text-lg font-black text-emerald-950">تم التصفير بنجاح</p><p className="mt-1 text-sm leading-7 text-emerald-900">{result.message}</p></div></div>
          <div className="grid gap-3 sm:grid-cols-3"><Metric label="السجلات المتبقية" value={result.remaining.records} tone="text-emerald-700" /><Metric label="الدورات المتبقية" value={result.remaining.cycles} tone="text-emerald-700" /><Metric label="لقطات الدورات المتبقية" value={result.remaining.cycleTemplateSnapshots} tone="text-emerald-700" /></div>
          <div className="flex flex-wrap gap-2"><Button onClick={() => navigate('/accounting-transformation/import')}>استيراد البيانات الصحيحة</Button><Button variant="outline" onClick={() => navigate('/accounting-transformation/records')}>فتح السجل الفارغ</Button><Button variant="outline" onClick={() => void loadPreview()}><RefreshCcw className="ml-2 h-4 w-4" />تحقق مرة أخرى</Button></div>
        </CardContent>
      </Card>}

      <Card className="rounded-[24px] border-slate-200 bg-slate-50/70"><CardContent className="grid gap-3 p-4 md:grid-cols-[auto_1fr] md:items-center"><div className="grid h-11 w-11 place-items-center rounded-xl border bg-white text-slate-700"><Users className="h-5 w-5" /></div><p className="text-xs leading-6 text-slate-600">يُسجل تنفيذ التصفير في Audit Log باسم المستخدم المنفذ وتاريخ ووقت العملية والأعداد التي تم حذفها، بينما تبقى بيانات المستخدمين والصلاحيات والنماذج الرسمية دون تغيير.</p></CardContent></Card>
    </div>
  );
};
