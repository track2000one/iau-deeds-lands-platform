import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Loader2,
  LockKeyhole,
  RefreshCcw,
  ShieldAlert,
  Trash2,
  UploadCloud,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import type { AccountingRecordType } from '../../types/accountingTransformation';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { downloadOfficialAccountingExcelTemplate } from '../api/accountingTransformation';
import {
  previewAccountingTransformationBaselineReset,
  resetAccountingTransformationBaseline,
  type AccountingBaselineResetItem,
  type AccountingBaselineResetPreview,
  type AccountingBaselineResetResult,
} from '../api/accountingBaselineReset';
import { analyzeAccountingWorkbookOffThread } from '../../utils/accountingWorkbookWorkerClient';
import {
  ACCOUNTING_BASELINE_SOURCE_SHEETS,
  hasRequiredAccountingBaselineSheets,
  isAccountingBaselineSourceSheet,
  normalizeAccountingSheetName,
} from '../../utils/accountingBaselineSourcePolicy';

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
  ignoredSheets: number;
  items: AccountingBaselineResetItem[];
  typeCounts: { land: number; building: number; fixed_asset: number };
};

const inferOwnership = (recordType: AccountingRecordType, payload: Record<string, unknown>) => {
  if (recordType === 'fixed_asset') return 'owned' as const;
  const columns = recordType === 'land' ? ['X', 'Y', 'Z'] : ['W', 'X', 'Y'];
  return columns.some((column) => String(payload[column] ?? '').trim()) ? 'leased' as const : 'owned' as const;
};

const toInput = (row: IntakeRow): AccountingBaselineResetItem => ({
  recordType: row.recordType,
  ownershipMode: inferOwnership(row.recordType, row.payload),
  committeeStatus: 'approved',
  payload: row.payload,
  attachments: [],
  notes: null,
  sourceSheet: normalizeAccountingSheetName(row.sourceSheet),
  sourceRow: row.sourceRow,
});

const currentYearBaselineName = () => `البيانات الأساسية المعتمدة ${new Date().getFullYear()}`;

const Metric: React.FC<{ label: string; value: number | string; tone?: string; hint?: string }> = ({ label, value, tone = 'text-slate-950', hint }) => (
  <div className="rounded-2xl border bg-white/90 p-4 shadow-sm">
    <p className="text-[11px] font-bold text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-black ${tone}`}>{typeof value === 'number' ? value.toLocaleString('ar-SA') : value}</p>
    {hint && <p className="mt-1 text-[10px] leading-5 text-slate-500">{hint}</p>}
  </div>
);

export const AccountingTransformationBaselineResetPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const controllerRef = useRef<AbortController | null>(null);

  const [fileName, setFileName] = useState('');
  const [cycleName, setCycleName] = useState(currentYearBaselineName());
  const [confirmation, setConfirmation] = useState('');
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [serverPreview, setServerPreview] = useState<AccountingBaselineResetPreview | null>(null);
  const [message, setMessage] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<AccountingBaselineResetResult | null>(null);

  const confirmationReady = confirmation.trim() === CONFIRMATION_PHRASE;
  const expectedUniversityBaseline = useMemo(
    () => Boolean(serverPreview
      && serverPreview.typeCounts.building === 626
      && serverPreview.typeCounts.land === 11
      && serverPreview.typeCounts.fixed_asset === 0
      && serverPreview.willImport === 637),
    [serverPreview],
  );

  const requestServerPreview = async (nextSummary: AnalysisSummary, nextFileName: string) => {
    setPreviewing(true);
    setServerPreview(null);
    setMessage('جاري مطابقة ملف الأساس مع حالة قاعدة البيانات الحالية قبل السماح بالحذف...');
    try {
      const preview = await previewAccountingTransformationBaselineReset({
        fileName: nextFileName,
        items: nextSummary.items,
      });
      setServerPreview(preview);
      setCycleName(preview.suggestedCycleName || currentYearBaselineName());
      setMessage(`المعاينة النهائية جاهزة: سيُعتمد ${preview.willImport.toLocaleString('ar-SA')} سجلًا من ورقتي الأساس الثابتتين.`);
      return preview;
    } catch (error) {
      setServerPreview(null);
      setMessage('تعذرت المعاينة الخادمية. لم يتم حذف أي بيانات.');
      toast.error(error instanceof Error ? error.message : 'تعذر تجهيز معاينة إعادة التأسيس');
      return null;
    } finally {
      setPreviewing(false);
    }
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error('اختر ملف Excel بصيغة XLSX أو XLS');

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setAnalyzing(true);
    setResult(null);
    setSummary(null);
    setServerPreview(null);
    setConfirmation('');
    setFileName(file.name);
    setCycleName(currentYearBaselineName());
    setMessage('جاري تحليل المصنف والتحقق من أسماء أوراق الأساس الثابتة...');

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

      const workbookSheetNames = analyzed.inspection.sheets.map((sheet) => sheet.sheetName);
      if (!hasRequiredAccountingBaselineSheets(workbookSheetNames)) {
        throw new Error(
          `ملف الأساس يجب أن يحتوي على الورقتين الثابتتين: «${ACCOUNTING_BASELINE_SOURCE_SHEETS.land}» و«${ACCOUNTING_BASELINE_SOURCE_SHEETS.building}».`,
        );
      }

      const rows = (analyzed.legacyRows as IntakeRow[])
        .filter((row) => isAccountingBaselineSourceSheet(row.recordType, row.sourceSheet));
      const items = rows.map(toInput);
      const typeCounts = items.reduce(
        (acc, item) => {
          acc[item.recordType] += 1;
          return acc;
        },
        { land: 0, building: 0, fixed_asset: 0 } as AnalysisSummary['typeCounts'],
      );
      const linkedSheets = Object.values(ACCOUNTING_BASELINE_SOURCE_SHEETS).length;
      const ignoredSheets = Math.max(0, analyzed.inspection.sheets.length - linkedSheets);
      const nextSummary: AnalysisSummary = {
        sheets: analyzed.inspection.sheets.length,
        linkedSheets,
        ignoredSheets,
        items,
        typeCounts,
      };
      setSummary(nextSummary);
      setMessage(
        `تم اعتماد ورقتي الأساس فقط: ${items.length.toLocaleString('ar-SA')} سجلًا. `
        + `تم تجاهل ${ignoredSheets.toLocaleString('ar-SA')} ورقة مرجعية/تصنيفية وعدم تحويلها إلى سجلات.`,
      );
      await requestServerPreview(nextSummary, file.name);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setSummary(null);
      setServerPreview(null);
      setMessage('');
      toast.error(error instanceof Error ? error.message : 'تعذر تحليل ملف Excel');
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
      setAnalyzing(false);
    }
  };

  const refreshImpact = async () => {
    if (!summary || !fileName) return;
    setConfirmation('');
    await requestServerPreview(summary, fileName);
  };

  const executeReset = async () => {
    if (!isAdmin) return toast.error('إعادة تأسيس بيانات اللجنة متاحة لمسؤول النظام فقط');
    if (!summary?.items.length || !serverPreview) return toast.error('أكمل المعاينة النهائية أولًا');
    if (!confirmationReady) return toast.error(`اكتب عبارة التأكيد حرفيًا: ${CONFIRMATION_PHRASE}`);

    const current = serverPreview.impact.currentCycle;
    const accepted = window.confirm(
      `تأكيد نهائي لإعادة تأسيس لجنة متابعة متطلبات التحول المحاسبي\n\n` +
      `سيتم حذف: ${serverPreview.impact.destructive.cycles.toLocaleString('ar-SA')} دورة و${serverPreview.impact.destructive.records.toLocaleString('ar-SA')} سجل حالي.\n` +
      `${current ? `الدورة الحالية: #${current.cycleNumber} — ${current.name}\n` : ''}` +
      `سيتم إنشاء: دورة #1 — ${cycleName.trim() || serverPreview.suggestedCycleName}\n` +
      `سيتم اعتماد: ${serverPreview.willImport.toLocaleString('ar-SA')} سجل من ${fileName}\n` +
      `المباني: ${serverPreview.typeCounts.building.toLocaleString('ar-SA')} · الأراضي: ${serverPreview.typeCounts.land.toLocaleString('ar-SA')}\n` +
      `مصادر البيانات: ${serverPreview.baselineSourceSheets.land} + ${serverPreview.baselineSourceSheets.building}\n\n` +
      `لن يتم حذف المستخدمين أو الصلاحيات أو Audit Log أو إصدارات النموذج الرسمي.\n\n` +
      'هل تريد تنفيذ إعادة التأسيس الآن؟',
    );
    if (!accepted) return;

    setResetting(true);
    try {
      const response = await resetAccountingTransformationBaseline({
        confirmation: confirmation.trim(),
        fileName,
        cycleName: cycleName.trim() || serverPreview.suggestedCycleName,
        items: summary.items,
        expectedImpact: serverPreview.impact.destructive,
        expectedDatasetFingerprint: serverPreview.datasetFingerprint,
      });
      setResult(response);
      setConfirmation('');
      toast.success(`تم اعتماد ${response.imported.toLocaleString('ar-SA')} سجلًا كأساس رسمي جديد للجنة`);
    } catch (error) {
      setConfirmation('');
      setServerPreview(null);
      toast.error(error instanceof Error ? error.message : 'تعذر إعادة تأسيس بيانات اللجنة');
      toast.info('لم يتم اعتماد أي حذف غير مؤكد. حدّث المعاينة قبل المحاولة مرة أخرى.');
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
    <div className="mx-auto w-full max-w-[1380px] space-y-5 p-2 pb-12 sm:p-5" dir="rtl">
      <section className="rounded-[28px] border border-red-200 bg-[linear-gradient(135deg,#fff,#fff7f7)] p-5 shadow-[0_14px_40px_rgba(127,29,29,.08)] md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge className="mb-3 border-red-200 bg-red-50 text-red-700"><ShieldAlert className="ml-1 h-4 w-4" />إجراء إداري عالي الحساسية</Badge>
            <h1 className="text-2xl font-black text-slate-950 md:text-3xl">إعادة تأسيس بيانات لجنة التحول المحاسبي</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-600">يستبدل هذا الإجراء السجل التشغيلي للجنة بدورة أساس واحدة معتمدة من ملف Excel، مع الاحتفاظ بالحوكمة والنماذج الرسمية وسجل التدقيق.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/accounting-transformation/import')}><ArrowRight className="ml-2 h-4 w-4" />العودة للاستيراد</Button>
        </div>
      </section>

      <Card className="rounded-[24px] border-amber-300 bg-amber-50/70">
        <CardContent className="flex gap-3 p-5 text-sm leading-7 text-amber-950">
          <AlertTriangle className="mt-1 h-6 w-6 shrink-0" />
          <div><strong>لا يبدأ الحذف عند اختيار الملف.</strong> في إعادة التأسيس تُعامل أسماء الأوراق كعقد ثابت: البيانات تؤخذ فقط من <strong>{ACCOUNTING_BASELINE_SOURCE_SHEETS.land}</strong> و<strong>{ACCOUNTING_BASELINE_SOURCE_SHEETS.building}</strong>. بقية الأوراق تبقى مراجع ولا تتحول إلى سجلات.</div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px]">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-700" />ملف البيانات الأساسي الجديد</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-emerald-300 bg-emerald-50/30 px-5 py-9 text-center">
            <UploadCloud className="h-10 w-10 text-emerald-700" />
            <p className="mt-3 font-black">اختر ملف Excel الذي سيصبح المصدر الأساسي</p>
            <p className="mt-1 text-xs text-slate-500">سيتم فحص المصنف كاملًا، لكن سجلات الأساس تُقرأ فقط من الورقتين الثابتتين.</p>
            <span className="mt-4 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-emerald-800">{analyzing ? 'جاري التحليل...' : fileName || 'اختيار XLSX / XLS'}</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" disabled={analyzing || previewing || resetting} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; void chooseFile(file).finally(() => { input.value = ''; }); }} />
          </label>
          {message && <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">{(analyzing || previewing) && <Loader2 className="h-4 w-4 animate-spin" />}{message}</div>}
        </CardContent>
      </Card>

      {summary && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="سجلات الأساس المكتشفة" value={summary.items.length} />
          <Metric label="المباني" value={summary.typeCounts.building} tone="text-sky-800" />
          <Metric label="الأراضي" value={summary.typeCounts.land} tone="text-emerald-800" />
          <Metric label="أوراق البيانات المعتمدة" value={summary.linkedSheets} tone="text-violet-800" />
          <Metric label="أوراق مرجعية مستبعدة" value={summary.ignoredSheets} />
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs leading-6 text-sky-950">
          <strong>سياسة مصدر البيانات:</strong> تم تثبيت ورقة الأراضي وورقة المباني كمصدرَي السجلات فقط. الأوراق الأخرى مثل التعريفات والتصنيفات والأعمار والـValidation تبقى داخل Excel للاستدلال والتنسيق، ولا تُنشئ أصولًا في قاعدة البيانات.
        </div>
      </>}

      {summary && !serverPreview && !previewing && <Card className="rounded-[24px] border-amber-300 bg-amber-50">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-black text-amber-950">المعاينة النهائية غير صالحة للتنفيذ</p><p className="mt-1 text-xs text-amber-800">حدّث المعاينة للتأكد من حالة قاعدة البيانات وعدد السجلات الفعلي قبل الحذف.</p></div>
          <Button variant="outline" onClick={refreshImpact}><RefreshCcw className="ml-2 h-4 w-4" />تحديث المعاينة</Button>
        </CardContent>
      </Card>}

      {serverPreview && <>
        {expectedUniversityBaseline
          ? <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-5 w-5" />المعاينة الخادمية مطابقة لنقطة البداية الحالية: 637 سجلًا = 626 مبنى + 11 أرضًا.</div>
          : <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><strong>تنبيه مراجعة:</strong> الأعداد تختلف عن الفحص السابق للملف المرجعي (637 = 626 مبنى + 11 أرضًا). لا تنفذ الحذف إلا إذا كنت تتوقع هذا التغيير في ملف الأساس.</div>}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-[26px] border-red-200 bg-red-50/50">
            <CardHeader className="border-b border-red-100"><CardTitle className="flex items-center gap-2 text-red-900"><Trash2 className="h-5 w-5" />سيُحذف من سجل اللجنة</CardTitle></CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <Metric label="الدورات الحالية" value={serverPreview.impact.destructive.cycles} tone="text-red-800" />
              <Metric label="السجلات الحالية" value={serverPreview.impact.destructive.records} tone="text-red-800" />
              <Metric label="ربط النماذج بالدورات" value={serverPreview.impact.destructive.cycleTemplateSnapshots} tone="text-red-800" />
              {serverPreview.impact.currentCycle && <div className="sm:col-span-3 lg:col-span-1 xl:col-span-3 rounded-2xl border border-red-200 bg-white p-3 text-xs leading-6 text-red-900">الدورة الحالية: <strong>#{serverPreview.impact.currentCycle.cycleNumber} — {serverPreview.impact.currentCycle.name}</strong></div>}
            </CardContent>
          </Card>

          <Card className="rounded-[26px] border-emerald-200 bg-emerald-50/50">
            <CardHeader className="border-b border-emerald-100"><CardTitle className="flex items-center gap-2 text-emerald-900"><Database className="h-5 w-5" />سيُنشأ من ملف الأساس</CardTitle></CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <Metric label="دورة أساس جديدة" value={1} tone="text-emerald-800" hint="#1 — معتمدة وحالية" />
              <Metric label="السجلات التي ستُعتمد" value={serverPreview.willImport} tone="text-emerald-800" />
              <Metric label="المباني" value={serverPreview.typeCounts.building} tone="text-sky-800" />
              <Metric label="الأراضي" value={serverPreview.typeCounts.land} tone="text-emerald-800" />
              <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-white p-3 text-xs leading-6 text-emerald-950">
                <strong>مصادر السجلات:</strong> {serverPreview.baselineSourceSheets.land} ({(serverPreview.sourceSheetCounts[serverPreview.baselineSourceSheets.land] || 0).toLocaleString('ar-SA')}) · {serverPreview.baselineSourceSheets.building} ({(serverPreview.sourceSheetCounts[serverPreview.baselineSourceSheets.building] || 0).toLocaleString('ar-SA')})
              </div>
              {(serverPreview.invalid > 0 || serverPreview.duplicate > 0) && <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">سيُستبعد قبل التأسيس: {serverPreview.invalid.toLocaleString('ar-SA')} غير صالح و{serverPreview.duplicate.toLocaleString('ar-SA')} مكرر.</div>}
            </CardContent>
          </Card>

          <Card className="rounded-[26px] border-sky-200 bg-sky-50/50">
            <CardHeader className="border-b border-sky-100"><CardTitle className="flex items-center gap-2 text-sky-900"><LockKeyhole className="h-5 w-5" />سيبقى محفوظًا</CardTitle></CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
              <Metric label="المستخدمون" value={serverPreview.impact.preserved.users} tone="text-sky-800" />
              <Metric label="الصلاحيات" value={serverPreview.impact.preserved.permissions} tone="text-sky-800" />
              <Metric label="سجل التدقيق" value={serverPreview.impact.preserved.auditLogs} tone="text-sky-800" />
              <Metric label="إصدارات النموذج الرسمي" value={serverPreview.impact.preserved.officialTemplateVersions} tone="text-sky-800" />
              <div className="sm:col-span-2 rounded-2xl border border-sky-200 bg-white p-3 text-xs leading-6 text-sky-900">{serverPreview.officialTemplate ? <>ستُربط الدورة الجديدة بالنموذج الرسمي <strong>الإصدار {serverPreview.officialTemplate.versionNumber}</strong> — {serverPreview.officialTemplate.fileName}</> : 'لا يوجد نموذج رسمي حالي لربطه بالدورة الجديدة؛ بيانات الأساس ستظل معتمدة.'}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[26px] border-red-200">
          <CardHeader className="flex-row items-center justify-between border-b"><CardTitle>التأكيد النهائي</CardTitle><Button variant="outline" size="sm" onClick={refreshImpact} disabled={previewing || resetting}><RefreshCcw className="ml-2 h-4 w-4" />تحديث حالة اللجنة</Button></CardHeader>
          <CardContent className="space-y-4 p-5">
            <label className="block text-sm font-bold">اسم دورة الأساس الجديدة<Input className="mt-2" value={cycleName} onChange={(event) => setCycleName(event.target.value)} /></label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-7 text-slate-800">بعد التنفيذ ستكون الدورة <strong>#1 — {cycleName}</strong> هي <strong>الحالية المعتمدة</strong> ونقطة المقارنة الرسمية لكل دورة مستقبلية. لا يتم تحديث هذه الدورة مباشرة من Excel بعد تأسيسها؛ أي تحديث لاحق ينشئ دورة جديدة.</div>
            <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 text-sm leading-7 text-red-900">للسماح بالحذف، اكتب العبارة التالية حرفيًا: <strong>{CONFIRMATION_PHRASE}</strong></div>
            <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={CONFIRMATION_PHRASE} className={confirmationReady ? 'border-emerald-400' : 'border-red-200'} />
            <Button className="h-12 w-full bg-red-700 text-white hover:bg-red-800" disabled={!confirmationReady || resetting || analyzing || previewing} onClick={executeReset}>{resetting ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Trash2 className="ml-2 h-5 w-5" />}{resetting ? 'جاري تنفيذ المعاملة الآمنة...' : `إعادة تأسيس البيانات واعتماد ${serverPreview.willImport.toLocaleString('ar-SA')} سجلًا`}</Button>
          </CardContent>
        </Card>
      </>}

      {result && <Card className="rounded-[26px] border-emerald-300 bg-emerald-50">
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-3"><CheckCircle2 className="h-7 w-7 text-emerald-700" /><div><p className="text-lg font-black text-emerald-950">اكتملت إعادة التأسيس</p><p className="text-sm text-emerald-800">تم اعتماد {result.imported.toLocaleString('ar-SA')} سجلًا في الدورة #1 الجديدة.</p></div></div>
          <p className="text-xs leading-6 text-emerald-900">حُذف من السجل التشغيلي السابق: {result.deleted.cycles.toLocaleString('ar-SA')} دورة و{result.deleted.records.toLocaleString('ar-SA')} سجل. تم الحفاظ على المستخدمين والصلاحيات وAudit Log وإصدارات النماذج الرسمية.</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate('/accounting-transformation/cycles')}>فتح سجل الدورات الجديد</Button><Button variant="outline" onClick={() => navigate('/accounting-transformation/records')}>عرض بيانات الأساس</Button></div>
        </CardContent>
      </Card>}
    </div>
  );
};
