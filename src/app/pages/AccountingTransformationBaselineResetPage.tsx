import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import type { AccountingRecordType, AccountingTransformationInput } from '../../types/accountingTransformation';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { downloadOfficialAccountingExcelTemplate } from '../api/accountingTransformation';
import {
  resetAccountingTransformationBaseline,
  type AccountingBaselineResetResult,
} from '../api/accountingBaselineReset';
import { analyzeAccountingWorkbookOffThread } from '../../utils/accountingWorkbookWorkerClient';

const CONFIRMATION_PHRASE = 'إعادة تأسيس بيانات اللجنة';

type IntakeRow = {
  recordType: AccountingRecordType;
  sourceSheet: string;
  sourceRow: number;
  payload: Record<string, unknown>;
};

type AnalysisSummary = {
  sheets: number;
  linkedSheets: number;
  modelBSheets: number;
  items: AccountingTransformationInput[];
  typeCounts: { land: number; building: number; fixed_asset: number };
};

const inferOwnership = (recordType: AccountingRecordType, payload: Record<string, unknown>) => {
  if (recordType === 'fixed_asset') return 'owned' as const;
  const columns = recordType === 'land' ? ['X', 'Y', 'Z'] : ['W', 'X', 'Y'];
  return columns.some((column) => String(payload[column] ?? '').trim()) ? 'leased' as const : 'owned' as const;
};

const toInput = (row: IntakeRow): AccountingTransformationInput => ({
  recordType: row.recordType,
  ownershipMode: inferOwnership(row.recordType, row.payload),
  committeeStatus: 'approved',
  payload: row.payload,
  attachments: [],
  notes: null,
});

const deriveCycleName = (fileName: string) => {
  const match = fileName.match(/(20\d{2})[.\-_](\d{2})[.\-_](\d{2})/);
  return match
    ? `البيانات الأساسية المعتمدة - ${match[1]}.${match[2]}.${match[3]}`
    : 'البيانات الأساسية المعتمدة';
};

export const AccountingTransformationBaselineResetPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const controllerRef = useRef<AbortController | null>(null);

  const [fileName, setFileName] = useState('');
  const [cycleName, setCycleName] = useState('البيانات الأساسية المعتمدة');
  const [confirmation, setConfirmation] = useState('');
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [message, setMessage] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<AccountingBaselineResetResult | null>(null);

  const confirmationReady = confirmation.trim() === CONFIRMATION_PHRASE;
  const expectedUniversityBaseline = useMemo(
    () => Boolean(summary && summary.typeCounts.building === 626 && summary.typeCounts.land === 11 && summary.items.length === 637),
    [summary],
  );

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error('اختر ملف Excel بصيغة XLSX أو XLS');

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setAnalyzing(true);
    setResult(null);
    setSummary(null);
    setConfirmation('');
    setFileName(file.name);
    setCycleName(deriveCycleName(file.name));
    setMessage('جاري تحليل جميع أوراق الملف قبل السماح بإعادة التأسيس...');

    try {
      const [sourceBuffer, officialBuffer] = await Promise.all([
        file.arrayBuffer(),
        downloadOfficialAccountingExcelTemplate().catch(() => undefined),
      ]);
      if (controller.signal.aborted) return;

      const analyzed = await analyzeAccountingWorkbookOffThread({
        sourceBuffer,
        officialBuffer,
        signal: controller.signal,
        onProgress: (progress) => setMessage(progress),
      });
      if (controller.signal.aborted) return;

      const rows = [...analyzed.modelBRows, ...analyzed.legacyRows] as IntakeRow[];
      const items = rows.map(toInput);
      const typeCounts = items.reduce(
        (acc, item) => {
          acc[item.recordType] += 1;
          return acc;
        },
        { land: 0, building: 0, fixed_asset: 0 } as AnalysisSummary['typeCounts'],
      );
      const linkedSheets = analyzed.inspection.sheets.filter((sheet) => Boolean(sheet.recordType)).length + analyzed.modelBSheets.length;
      setSummary({
        sheets: analyzed.inspection.sheets.length,
        linkedSheets,
        modelBSheets: analyzed.modelBSheets.length,
        items,
        typeCounts,
      });
      setMessage(`اكتمل التحليل: ${items.length.toLocaleString('ar-SA')} سجلًا صالحًا مبدئيًا لإعادة التأسيس.`);
      toast.success('تم تحليل ملف الأساس دون تغيير أي بيانات في المنصة');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setSummary(null);
      setMessage('');
      toast.error(error instanceof Error ? error.message : 'تعذر تحليل ملف Excel');
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setAnalyzing(false);
    }
  };

  const executeReset = async () => {
    if (!isAdmin) return toast.error('إعادة تأسيس بيانات اللجنة متاحة لمسؤول النظام فقط');
    if (!summary?.items.length) return toast.error('حلل ملف Excel أولًا');
    if (!confirmationReady) return toast.error(`اكتب عبارة التأكيد حرفيًا: ${CONFIRMATION_PHRASE}`);

    const accepted = window.confirm(
      `سيتم حذف جميع دورات وسجلات لجنة متابعة متطلبات التحول المحاسبي الحالية، ثم إنشاء دورة أساس واحدة معتمدة من الملف:\n${fileName}\n\n` +
      `السجلات التي سيتم اعتمادها: ${summary.items.length.toLocaleString('ar-SA')}\n` +
      `المباني: ${summary.typeCounts.building.toLocaleString('ar-SA')} · الأراضي: ${summary.typeCounts.land.toLocaleString('ar-SA')} · نموذج ب: ${summary.typeCounts.fixed_asset.toLocaleString('ar-SA')}\n\n` +
      'المستخدمون والصلاحيات وسجل التدقيق وإصدارات النموذج الرسمي لن تُحذف. هل تريد تنفيذ إعادة التأسيس الآن؟',
    );
    if (!accepted) return;

    setResetting(true);
    try {
      const response = await resetAccountingTransformationBaseline({
        confirmation: confirmation.trim(),
        fileName,
        cycleName: cycleName.trim() || 'البيانات الأساسية المعتمدة',
        items: summary.items,
      });
      setResult(response);
      toast.success(`تم اعتماد ${response.imported.toLocaleString('ar-SA')} سجلًا كأساس جديد للجنة`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إعادة تأسيس بيانات اللجنة');
    } finally {
      setResetting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6" dir="rtl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center text-red-900">هذه العملية متاحة لمسؤول النظام فقط.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-5 p-2 pb-12 sm:p-5" dir="rtl">
      <section className="rounded-[28px] border border-red-200 bg-[linear-gradient(135deg,#fff,#fff7f7)] p-5 shadow-[0_14px_40px_rgba(127,29,29,.08)] md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="mb-3 border-red-200 bg-red-50 text-red-700"><ShieldAlert className="ml-1 h-4 w-4" />إجراء إداري عالي الحساسية</Badge>
            <h1 className="text-2xl font-black text-slate-950 md:text-3xl">إعادة تأسيس بيانات لجنة التحول المحاسبي</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">يستبدل هذا الإجراء جميع دورات وسجلات اللجنة بدورة أساس واحدة معتمدة من ملف Excel. لا يتم رفع ملف البيانات إلى GitHub.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/accounting-transformation/import')}><ArrowRight className="ml-2 h-4 w-4" />العودة للاستيراد</Button>
        </div>
      </section>

      <Card className="rounded-[24px] border-amber-300 bg-amber-50/70">
        <CardContent className="flex gap-3 p-5 text-sm leading-7 text-amber-950">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0" />
          <div><strong>ما سيتم حذفه:</strong> دورات اللجنة، سجلاتها، وربط النماذج بالدورات القديمة. <strong>ما سيبقى محفوظًا:</strong> المستخدمون، الصلاحيات، سجل التدقيق، وإصدارات نموذج Excel الرسمي. إذا فشلت عملية إنشاء الأساس الجديد تُلغى معاملة قاعدة البيانات ولا تبقى اللجنة فارغة.</div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px]">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-700" />ملف البيانات الأساسي الجديد</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-emerald-300 bg-emerald-50/30 px-5 py-9 text-center">
            <UploadCloud className="h-10 w-10 text-emerald-700" />
            <p className="mt-3 font-black">اختر ملف Excel الذي سيصبح المصدر الأساسي</p>
            <p className="mt-1 text-xs text-slate-500">سيتم تحليل جميع الأوراق أولًا دون حذف أي شيء.</p>
            <span className="mt-4 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-emerald-800">{analyzing ? 'جاري التحليل...' : fileName || 'اختيار XLSX / XLS'}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={analyzing || resetting} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; void chooseFile(file).finally(() => { input.value = ''; }); }} />
          </label>
          {message && <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{analyzing && <Loader2 className="h-4 w-4 animate-spin" />}{message}</div>}
        </CardContent>
      </Card>

      {summary && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">إجمالي السجلات</p><p className="mt-1 text-3xl font-black">{summary.items.length.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4"><p className="text-xs text-sky-700">المباني</p><p className="mt-1 text-3xl font-black">{summary.typeCounts.building.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs text-emerald-700">الأراضي</p><p className="mt-1 text-3xl font-black">{summary.typeCounts.land.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><p className="text-xs text-violet-700">نموذج ب</p><p className="mt-1 text-3xl font-black">{summary.typeCounts.fixed_asset.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs text-slate-500">أوراق المصنف</p><p className="mt-1 text-3xl font-black">{summary.sheets.toLocaleString('ar-SA')}</p></div>
        </div>

        {expectedUniversityBaseline && <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-5 w-5" />مطابق للفحص المسبق للملف المرفق: 637 سجلًا = 626 مبنى + 11 أرضًا.</div>}

        <Card className="rounded-[26px] border-red-200">
          <CardHeader><CardTitle>التأكيد النهائي</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="block text-sm font-bold">اسم دورة الأساس الجديدة<Input className="mt-2" value={cycleName} onChange={(event) => setCycleName(event.target.value)} /></label>
            <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-sm leading-7 text-red-900">للسماح بالحذف، اكتب العبارة التالية حرفيًا: <strong>{CONFIRMATION_PHRASE}</strong></div>
            <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={CONFIRMATION_PHRASE} className={confirmationReady ? 'border-emerald-400' : 'border-red-200'} />
            <Button className="h-12 w-full bg-red-700 text-white hover:bg-red-800" disabled={!confirmationReady || resetting || analyzing} onClick={executeReset}>{resetting ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Trash2 className="ml-2 h-5 w-5" />}{resetting ? 'جاري حذف البيانات وإعادة التأسيس...' : `حذف البيانات الحالية واعتماد ${summary.items.length.toLocaleString('ar-SA')} سجلًا كأساس جديد`}</Button>
          </CardContent>
        </Card>
      </>}

      {result && <Card className="rounded-[26px] border-emerald-300 bg-emerald-50">
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-3"><CheckCircle2 className="h-7 w-7 text-emerald-700" /><div><p className="text-lg font-black text-emerald-950">اكتملت إعادة التأسيس</p><p className="text-sm text-emerald-800">تم اعتماد {result.imported.toLocaleString('ar-SA')} سجلًا في الدورة #1 الجديدة.</p></div></div>
          <p className="text-xs leading-6 text-emerald-900">حُذف من السجل التشغيلي السابق: {result.deleted.cycles.toLocaleString('ar-SA')} دورة و{result.deleted.records.toLocaleString('ar-SA')} سجل. تم الحفاظ على Audit Log والنماذج الرسمية.</p>
          <Button variant="outline" onClick={() => navigate('/accounting-transformation/cycles')}>فتح سجل الدورات الجديد</Button>
        </CardContent>
      </Card>}
    </div>
  );
};
