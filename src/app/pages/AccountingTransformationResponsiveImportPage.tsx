import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  PlusCircle,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { NativeSelect } from '../components/ui/native-select';
import { Input } from '../components/ui/input';
import { ACCOUNTING_RECORD_TYPE_LABELS } from '../config/accountingTransformationFields';
import { MODEL_B_VERSION } from '../config/fixedAssetModelB';
import {
  createAccountingTransformationCycle,
  downloadOfficialAccountingExcelTemplate,
  getAccountingTransformationCycles,
  importAccountingTransformationCycleRecords,
  previewAccountingTransformationCycleImport,
  type AccountingTransformationImportPreview,
} from '../api/accountingTransformation';
import type {
  AccountingRecordType,
  AccountingTransformationCycle,
  AccountingTransformationInput,
} from '../../types/accountingTransformation';
import type { ModelBSheetInspection } from '../../utils/fixedAssetModelBWorkbook';
import type { StructuralAccountingWorkbookInspection } from '../../utils/accountingWorkbookStructuralIntake';
import { analyzeAccountingWorkbookOffThread } from '../../utils/accountingWorkbookWorkerClient';

type PreviewItem = AccountingTransformationInput & {
  sourceRow: number;
  sourceSheet: string;
};

type IntakeRow = {
  recordType: AccountingRecordType;
  sourceSheet: string;
  sourceRow: number;
  payload: Record<string, unknown>;
};

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  new?: number;
  modified?: number;
  unchanged?: number;
};

const IMPORT_LIMIT_OPTIONS = [50, 100, 250, 500, 0] as const;
let officialTemplateBufferPromise: Promise<ArrayBuffer | undefined> | null = null;

const getOfficialTemplateBuffer = async () => {
  if (!officialTemplateBufferPromise) {
    officialTemplateBufferPromise = downloadOfficialAccountingExcelTemplate().catch(() => undefined);
  }
  const cached = await officialTemplateBufferPromise;
  return cached ? cached.slice(0) : undefined;
};

const recordTypeLabel = (recordType?: AccountingRecordType) => {
  if (recordType === 'fixed_asset') return 'سجل الأصول الثابتة — نموذج ب';
  if (!recordType) return 'ورقة إضافية';
  return ACCOUNTING_RECORD_TYPE_LABELS[recordType] || recordType;
};

const inferOwnership = (recordType: AccountingRecordType, payload: Record<string, unknown>) => {
  if (recordType === 'fixed_asset') return 'owned' as const;
  const columns = recordType === 'land' ? ['X', 'Y', 'Z'] : ['W', 'X', 'Y'];
  return columns.some((column) => String(payload[column] ?? '').trim()) ? 'leased' as const : 'owned' as const;
};

const toPreviewItem = (row: IntakeRow): PreviewItem => ({
  recordType: row.recordType,
  ownershipMode: inferOwnership(row.recordType, row.payload),
  committeeStatus: 'not_reviewed',
  payload: row.payload,
  attachments: [],
  notes: null,
  sourceRow: row.sourceRow,
  sourceSheet: row.sourceSheet,
});

const stripSource = (item: PreviewItem): AccountingTransformationInput => ({
  recordType: item.recordType,
  ownershipMode: item.ownershipMode,
  committeeStatus: item.committeeStatus,
  payload: item.payload,
  attachments: item.attachments || [],
  notes: item.notes || null,
});

const comparisonMessage = (preview: AccountingTransformationImportPreview) => {
  const notSupplied = preview.notSupplied ?? preview.removed ?? 0;
  return `نتيجة المقارنة: ${(preview.new || 0).toLocaleString('ar-SA')} جديد، ${(preview.modified || 0).toLocaleString('ar-SA')} معدل، ${(preview.unchanged || 0).toLocaleString('ar-SA')} بدون تغيير، ${notSupplied.toLocaleString('ar-SA')} من النسخة السابقة لم يرد في الملف الحالي${preview.duplicate ? `، و${preview.duplicate.toLocaleString('ar-SA')} مكرر داخل الدورة` : ''}.`;
};

const sourceBadge = (item: PreviewItem) => item.recordType === 'fixed_asset'
  ? { label: `مخطط نموذج ب ${MODEL_B_VERSION}`, className: 'border-violet-300 bg-violet-50 text-violet-800' }
  : { label: 'مصدر Legacy مرتبط بنيويًا', className: 'border-sky-300 bg-sky-50 text-sky-800' };

export const AccountingTransformationResponsiveImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, hasPermission } = usePermissions();
  const canCreateCycle = isAdmin || hasPermission('accounting_transformation', 'canCreateCycle');
  const analysisController = useRef<AbortController | null>(null);

  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState(searchParams.get('cycle') || '');
  const [cycleName, setCycleName] = useState('');
  const [cycleDescription, setCycleDescription] = useState('');
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [inspection, setInspection] = useState<StructuralAccountingWorkbookInspection | null>(null);
  const [modelBSheets, setModelBSheets] = useState<ModelBSheetInspection[]>([]);
  const [message, setMessage] = useState('');
  const [scan, setScan] = useState<AccountingTransformationImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [limitPerBatch, setLimitPerBatch] = useState<number>(250);
  const [batchIndex, setBatchIndex] = useState(0);

  useEffect(() => {
    let active = true;
    getAccountingTransformationCycles()
      .then((data) => {
        if (!active) return;
        const open = (data || []).filter((cycle) => cycle.status === 'draft');
        setCycles(open);
        const requested = searchParams.get('cycle');
        const selected = open.find((cycle) => cycle.id === requested) || open[0];
        setSelectedCycleId(selected?.id || '');
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'تعذر تحميل دورات التحديث'))
      .finally(() => active && setCyclesLoading(false));
    return () => {
      active = false;
      analysisController.current?.abort();
    };
  }, []);

  const resetFileState = () => {
    analysisController.current?.abort();
    analysisController.current = null;
    setFileName('');
    setItems([]);
    setInspection(null);
    setModelBSheets([]);
    setMessage('');
    setScan(null);
    setResult(null);
    setBatchIndex(0);
    setParsing(false);
  };

  const createDraftCycle = async () => {
    if (!canCreateCycle) return toast.error('لا تملك صلاحية «إنشاء دورة جديدة»');
    const name = cycleName.trim();
    if (!name) return toast.error('أدخل اسم دورة التحديث أولًا');
    setCreatingCycle(true);
    try {
      const created = await createAccountingTransformationCycle({ name, description: cycleDescription.trim() || null });
      setCycles([created]);
      setSelectedCycleId(created.id);
      setCycleName('');
      setCycleDescription('');
      resetFileState();
      toast.success(`تم إنشاء دورة #${created.cycleNumber} — ${created.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء دورة التحديث');
    } finally {
      setCreatingCycle(false);
    }
  };

  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId);
  const fixedAssets = useMemo(() => items.filter((item) => item.recordType === 'fixed_asset'), [items]);
  const lands = useMemo(() => items.filter((item) => item.recordType === 'land'), [items]);
  const buildings = useMemo(() => items.filter((item) => item.recordType === 'building'), [items]);
  const modelBSheetNames = useMemo(() => new Set(modelBSheets.map((sheet) => sheet.sheetName)), [modelBSheets]);
  const modelBByName = useMemo(() => new Map(modelBSheets.map((sheet) => [sheet.sheetName, sheet])), [modelBSheets]);

  const freshIndexSet = useMemo(() => new Set(scan?.freshIndexes || []), [scan]);
  const duplicateIndexSet = useMemo(() => new Set(scan?.duplicateIndexes || []), [scan]);
  const invalidIndexSet = useMemo(() => new Set(scan?.invalidIndexes || []), [scan]);
  const newIndexSet = useMemo(() => new Set(scan?.newIndexes || []), [scan]);
  const modifiedIndexSet = useMemo(() => new Set(scan?.modifiedIndexes || []), [scan]);
  const unchangedIndexSet = useMemo(() => new Set(scan?.unchangedIndexes || []), [scan]);

  const maxBatch = useMemo(() => !items.length || limitPerBatch === 0 ? 1 : Math.max(1, Math.ceil(items.length / limitPerBatch)), [items.length, limitPerBatch]);
  const batchRange = useMemo(() => {
    if (limitPerBatch === 0) return { start: 0, end: items.length };
    const start = batchIndex * limitPerBatch;
    return { start, end: Math.min(items.length, start + limitPerBatch) };
  }, [items.length, batchIndex, limitPerBatch]);
  const currentRows = useMemo(() => items.slice(batchRange.start, batchRange.end), [items, batchRange]);
  const currentFreshRows = useMemo(
    () => items.filter((_, index) => index >= batchRange.start && index < batchRange.end && freshIndexSet.has(index)),
    [items, batchRange, freshIndexSet],
  );
  const batchLabel = limitPerBatch === 0
    ? 'كل السجلات'
    : `الدفعة ${Math.min(batchIndex + 1, maxBatch).toLocaleString('ar-SA')} من ${maxBatch.toLocaleString('ar-SA')}`;

  const refreshScan = async (allItems: PreviewItem[], sourceFileName: string) => {
    setScanning(true);
    try {
      if (!selectedCycleId) throw new Error('لم يتم تحديد دورة تحديث مسودة');
      const preview = await previewAccountingTransformationCycleImport(selectedCycleId, allItems.map(stripSource), sourceFileName || undefined);
      setScan(preview);
      return preview;
    } finally {
      setScanning(false);
    }
  };

  const cancelAnalysis = () => {
    analysisController.current?.abort();
    analysisController.current = null;
    setParsing(false);
    setMessage('تم إلغاء تحليل الملف. لم يتم حفظ أي بيانات.');
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!selectedCycleId) return toast.error('أنشئ أو اختر دورة تحديث مسودة قبل رفع الملف');
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error('اختر ملف Excel بصيغة XLSX أو XLS');

    analysisController.current?.abort();
    const controller = new AbortController();
    analysisController.current = controller;
    setParsing(true);
    setScan(null);
    setResult(null);
    setInspection(null);
    setModelBSheets([]);
    setBatchIndex(0);
    setMessage('جاري تجهيز الملف للتحليل في محرك مستقل؛ الصفحة ستبقى قابلة للاستجابة...');

    try {
      const [sourceBuffer, officialBuffer] = await Promise.all([
        file.arrayBuffer(),
        getOfficialTemplateBuffer(),
      ]);
      if (controller.signal.aborted) return;

      const analyzed = await analyzeAccountingWorkbookOffThread({
        sourceBuffer,
        officialBuffer,
        signal: controller.signal,
        onProgress: (progressMessage) => setMessage(progressMessage),
      });
      if (controller.signal.aborted) return;

      setInspection(analyzed.inspection);
      setModelBSheets(analyzed.modelBSheets);
      const parsed = [...analyzed.modelBRows, ...analyzed.legacyRows].map((row) => toPreviewItem(row as IntakeRow));
      setFileName(file.name);
      setItems(parsed);

      const modelBNames = new Set(analyzed.modelBSheets.map((sheet) => sheet.sheetName));
      const legacyMapped = analyzed.inspection.sheets.filter((sheet) => sheet.recordType && !modelBNames.has(sheet.sheetName)).length;
      const mappedCount = analyzed.modelBSheets.length + legacyMapped;
      const unmappedCount = Math.max(0, analyzed.inspection.sheets.length - mappedCount);
      const modelBText = analyzed.modelBSheets.length
        ? ` تم التعرف على ${analyzed.modelBSheets.length.toLocaleString('ar-SA')} ورقة وفق نموذج ب ${MODEL_B_VERSION}.`
        : '';
      const intakeMessage = `اكتمل التحليل بالخلفية دون حجز واجهة المستخدم: ${analyzed.inspection.sheets.length.toLocaleString('ar-SA')} ورقة؛ ${mappedCount.toLocaleString('ar-SA')} مرتبطة بالمخطط الرسمي و${unmappedCount.toLocaleString('ar-SA')} ورقة إضافية/مرجعية.${modelBText}`;

      if (!parsed.length) {
        setMessage(`${intakeMessage} لم تُكتب أي بيانات لأن النظام لم يجد سجلات يمكن ربطها آليًا.`);
        toast.warning('تمت قراءة الملف، ولكن لا توجد سجلات قابلة للربط الآلي');
        return;
      }

      setMessage(`${intakeMessage} جارٍ مقارنة ${parsed.length.toLocaleString('ar-SA')} سجل مع الدورة السابقة...`);
      const preview = await refreshScan(parsed, file.name);
      if (controller.signal.aborted) return;
      setMessage(`${intakeMessage} ${comparisonMessage(preview)}`);
      toast.success(`تم تحليل وربط ${parsed.length.toLocaleString('ar-SA')} سجل دون تجميد الصفحة`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setItems([]);
      setInspection(null);
      setModelBSheets([]);
      setFileName('');
      setScan(null);
      setMessage('');
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف Excel');
    } finally {
      if (analysisController.current === controller) analysisController.current = null;
      setParsing(false);
    }
  };

  const performImport = async () => {
    if (importing || scanning || !currentFreshRows.length) return;
    const confirmed = window.confirm(
      `سيتم حفظ ${currentFreshRows.length.toLocaleString('ar-SA')} سجل من ${batchLabel} داخل دورة التحديث.\n\n` +
      'الملف الوارد مصدر بيانات متغير، بينما نموذج ب الرسمي هو مخطط المخرجات الثابت. هل ترغب بالمتابعة؟',
    );
    if (!confirmed) return;

    setImporting(true);
    setResult(null);
    try {
      const response = await importAccountingTransformationCycleRecords(selectedCycleId, currentFreshRows.map(stripSource), fileName || undefined);
      setResult(response);
      toast.success(`تم إدخال ${response.created.toLocaleString('ar-SA')} سجل إلى دورة التحديث`);
      await refreshScan(items, fileName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استيراد السجلات');
    } finally {
      setImporting(false);
    }
  };

  const statusForIndex = (index: number) => {
    if (duplicateIndexSet.has(index)) return { label: 'مدخل بالدورة', className: 'border-amber-300 bg-amber-50 text-amber-800' };
    if (invalidIndexSet.has(index)) return { label: 'غير صالح', className: 'border-red-300 bg-red-50 text-red-700' };
    if (modifiedIndexSet.has(index)) return { label: 'معدل', className: 'border-sky-300 bg-sky-50 text-sky-800' };
    if (unchangedIndexSet.has(index)) return { label: 'بدون تغيير', className: 'border-slate-300 bg-slate-50 text-slate-700' };
    if (newIndexSet.has(index)) return { label: 'جديد', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
    return { label: 'جاهز', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
  };

  const mappedSheetCount = inspection
    ? modelBSheets.length + inspection.sheets.filter((sheet) => sheet.recordType && !modelBSheetNames.has(sheet.sheetName)).length
    : 0;
  const unmappedSheetCount = inspection ? Math.max(0, inspection.sheets.length - mappedSheetCount) : 0;

  return (
    <div className="mx-auto w-full max-w-[1550px] space-y-5 p-1 pb-10 sm:p-3 md:p-5" dir="rtl">
      <section className="flex flex-col gap-4 rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)] md:flex-row md:items-center md:justify-between">
        <div>
          <Badge variant="outline" className="mb-2">لجنة متابعة متطلبات التحول المحاسبي</Badge>
          <h1 className="text-2xl font-black text-slate-900 md:text-3xl">استيراد دورة تحديث جديدة</h1>
          <p className="mt-1 text-sm text-slate-500">تحليل Excel يعمل في محرك مستقل للحفاظ على استجابة الصفحة. نموذج ب هو المخطط الرسمي، والملفات الواردة مصادر تحديث متغيرة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation/cycles')}>دورات البيانات</Button>
          <Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation')}><ArrowRight className="ml-2 h-4 w-4" />العودة للوحة اللجنة</Button>
        </div>
      </section>

      <Card className="rounded-[24px] border-cyan-200 bg-cyan-50/50">
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="text-xs font-bold text-slate-600">دورة التحديث المستهدفة
              <NativeSelect value={selectedCycleId} disabled={cyclesLoading || !cycles.length} onChange={(event) => { setSelectedCycleId(event.target.value); resetFileState(); }} className="mt-1 h-11 rounded-xl bg-white">
                {cycles.length ? cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name} (مسودة)</option>) : <option value="">لا توجد دورة مسودة قابلة للاستيراد</option>}
              </NativeSelect>
            </label>
            <Button variant="outline" onClick={() => navigate('/accounting-transformation/cycles')}><PlusCircle className="ml-2 h-4 w-4" />إدارة الدورات</Button>
          </div>
          {selectedCycle && <p className="rounded-xl border border-cyan-200 bg-white/80 px-4 py-3 text-xs text-slate-600">سيتم حفظ البيانات في: <strong>#{selectedCycle.cycleNumber} — {selectedCycle.name}</strong>. تبقى مسودة حتى اعتماد الدورة.</p>}
          {!cyclesLoading && !cycles.length && canCreateCycle && <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <p className="mb-3 font-black text-amber-950">أنشئ دورة تحديث قبل اختيار الملف</p>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="text-xs font-bold">اسم الدورة<Input value={cycleName} onChange={(event) => setCycleName(event.target.value)} className="mt-1 h-11 bg-white" placeholder="مثال: تحديث أغسطس 2026" /></label>
              <label className="text-xs font-bold">الوصف<Input value={cycleDescription} onChange={(event) => setCycleDescription(event.target.value)} className="mt-1 h-11 bg-white" /></label>
              <Button onClick={createDraftCycle} disabled={creatingCycle || !cycleName.trim()} className="h-11">{creatingCycle && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}إنشاء الدورة</Button>
            </div>
          </div>}
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-violet-200 bg-violet-50/45">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-200 bg-white text-violet-700"><ShieldCheck className="h-6 w-6" /></div>
          <div>
            <p className="font-black text-slate-900">الاستيراد مرن — والمخرجات الرسمية ثابتة</p>
            <p className="mt-1 text-sm leading-7 text-slate-700">لا تعتمد المعالجة على لون أو عمود ثابت. يقرأ النظام بنية جميع الأوراق وعناوين الحقول، يربطها بنموذج ب أو محولات Legacy، ثم يقارن هوية السجل وحقوله مع الدورة السابقة. أي قاعدة طارئة مستقبلية تُضاف مستقلة عن محرك القراءة الأساسي.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-dashed border-sky-300 bg-[linear-gradient(145deg,#fafeff,#eef9ff)]">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-base"><UploadCloud className="h-5 w-5" />اختيار ملف التحديث</CardTitle></CardHeader>
        <CardContent className="p-5">
          {selectedCycleId ? <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-sky-300/80 bg-white/75 px-5 py-10 text-center">
            <FileSpreadsheet className="h-12 w-12 text-sky-700" />
            <h2 className="mt-4 text-lg font-black">اختر XLSX أو XLS</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">تحليل الملف الكبير يتم خارج خيط الواجهة، لذلك تبقى الصفحة قابلة للتمرير والتفاعل أثناء القراءة. لا يشترط اسم Sheet ثابت.</p>
            <span className="mt-4 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-sky-700">{parsing ? 'جاري التحليل بالخلفية...' : fileName || 'اضغط لاختيار الملف'}</span>
            <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" disabled={parsing || importing} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; void chooseFile(file).finally(() => { input.value = ''; }); }} />
          </label> : <div className="rounded-2xl border bg-slate-50 p-8 text-center">اختر أو أنشئ دورة مسودة أولًا.</div>}

          {(message || scanning || parsing) && <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 text-sm font-bold leading-7 text-slate-700">
            <div className="flex items-start gap-2">{(scanning || parsing) && <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin" />}{message}</div>
            {parsing && <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-xl border-red-200 text-red-700" onClick={cancelAnalysis}><X className="ml-1 h-4 w-4" />إلغاء التحليل</Button>}
          </div>}
        </CardContent>
      </Card>

      {inspection && <Card className="rounded-[26px]">
        <CardHeader><CardTitle>نتيجة قراءة المصنف الكامل</CardTitle><p className="text-xs text-slate-500">الأوراق غير المرتبطة لا تسبب رفض الملف، ولا يتم تحميل تنسيقات الخلايا الثقيلة أثناء الاستيراد العادي.</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs text-slate-500">إجمالي الأوراق</p><p className="mt-1 text-2xl font-black">{inspection.sheets.length.toLocaleString('ar-SA')}</p></div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4"><p className="text-xs text-violet-700">نموذج ب</p><p className="mt-1 text-2xl font-black">{modelBSheets.length.toLocaleString('ar-SA')}</p></div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4"><p className="text-xs text-emerald-700">الأوراق المرتبطة</p><p className="mt-1 text-2xl font-black">{mappedSheetCount.toLocaleString('ar-SA')}</p></div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4"><p className="text-xs text-amber-700">أوراق إضافية/مرجعية</p><p className="mt-1 text-2xl font-black">{unmappedSheetCount.toLocaleString('ar-SA')}</p></div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4"><p className="text-xs text-sky-700">السجلات المرتبطة</p><p className="mt-1 text-2xl font-black">{items.length.toLocaleString('ar-SA')}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">{inspection.sheets.map((sheet) => {
            const modelB = modelBByName.get(sheet.sheetName);
            const linked = Boolean(modelB || (sheet.recordType && !modelBSheetNames.has(sheet.sheetName)));
            return <Badge key={sheet.sheetName} variant="outline" className={linked ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}>{sheet.sheetName} · {modelB ? `نموذج ب — ${modelB.matchedFields} حقل` : sheet.recordType ? `${recordTypeLabel(sheet.recordType)} — ${sheet.matchedFields} حقل مطابق` : 'ورقة إضافية/مرجعية'}</Badge>;
          })}</div>
          <div className="rounded-xl border bg-slate-50/70 px-4 py-3 text-xs leading-6 text-slate-600">أولوية المخرجات: <strong>نموذج (ب - استدامة) سجل الأصول الثابتة — {MODEL_B_VERSION}</strong>. لا تتحول ملفات الإدارات إلى قوالب رسمية تلقائيًا.</div>
        </CardContent>
      </Card>}

      {items.length > 0 && <>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[22px] border bg-white p-4"><p className="text-xs text-slate-500">سجلات مرتبطة</p><p className="mt-1 text-3xl font-black">{items.length.toLocaleString('ar-SA')}</p><p className="text-[11px] text-slate-500">نموذج ب {fixedAssets.length.toLocaleString('ar-SA')} · Legacy أراضٍ {lands.length.toLocaleString('ar-SA')} · مبانٍ {buildings.length.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4"><p className="text-xs text-emerald-700">جديد</p><p className="mt-1 text-3xl font-black">{(scan?.new || 0).toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border border-sky-200 bg-sky-50/60 p-4"><p className="text-xs text-sky-700">معدل</p><p className="mt-1 text-3xl font-black">{(scan?.modified || 0).toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border bg-slate-50 p-4"><p className="text-xs">بدون تغيير</p><p className="mt-1 text-3xl font-black">{(scan?.unchanged || 0).toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border border-amber-200 bg-amber-50/60 p-4"><p className="text-xs text-amber-700">من السابق لم يرد هنا</p><p className="mt-1 text-3xl font-black">{(scan?.notSupplied ?? scan?.removed ?? 0).toLocaleString('ar-SA')}</p></div>
        </div>

        <Card className="rounded-[24px]">
          <CardHeader><CardTitle>الدفعات</CardTitle><p className="text-xs text-slate-500">القيمة الافتراضية 250 سجلًا لتقليل حجم الطلب والحفاظ على استقرار الاستيراد.</p></CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr]">
            <label className="text-xs font-bold">عدد السجلات<NativeSelect value={String(limitPerBatch)} onChange={(event) => { setLimitPerBatch(Number(event.target.value)); setBatchIndex(0); setResult(null); }} className="mt-1 h-11">{IMPORT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value === 0 ? 'كل السجلات' : `${value} سجل`}</option>)}</NativeSelect></label>
            <div><p className="text-xs font-bold">الدفعة الحالية</p><div className="mt-1 flex gap-2"><Button variant="outline" size="icon" disabled={batchIndex <= 0} onClick={() => setBatchIndex((value) => Math.max(0, value - 1))}><ChevronRight /></Button><div className="flex h-10 flex-1 items-center justify-center rounded-xl border bg-white font-black">{batchLabel}</div><Button variant="outline" size="icon" disabled={batchIndex + 1 >= maxBatch} onClick={() => setBatchIndex((value) => Math.min(maxBatch - 1, value + 1))}><ChevronLeft /></Button></div></div>
            <div className="rounded-xl border bg-slate-50 p-3"><p className="text-xs">جاهز للاستيراد: <strong>{currentFreshRows.length.toLocaleString('ar-SA')}</strong> من {currentRows.length.toLocaleString('ar-SA')}</p></div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardHeader><CardTitle>معاينة السجلات المرتبطة</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[1100px] text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">المصدر</th><th className="p-3 text-right">النوع</th><th className="p-3 text-right">صف Excel</th><th className="p-3 text-right">رقم الأصل</th><th className="p-3 text-right">وصف الأصل</th><th className="p-3 text-right">طريقة الربط</th></tr></thead><tbody>{currentRows.slice(0, 15).map((item, localIndex) => {
            const globalIndex = batchRange.start + localIndex;
            const status = statusForIndex(globalIndex);
            const source = sourceBadge(item);
            const number = item.recordType === 'fixed_asset' ? String(item.payload.Y || item.payload.Z || item.payload.AB || '-') : String(item.payload.E || item.payload.D || '-');
            const description = item.recordType === 'fixed_asset' ? String(item.payload.AA || '-') : String(item.payload.G || '-');
            return <tr key={`${item.sourceSheet}-${item.sourceRow}-${globalIndex}`} className="border-t"><td className="p-3"><Badge variant="outline" className={status.className}>{status.label}</Badge></td><td className="p-3 font-bold">{item.sourceSheet}</td><td className="p-3">{recordTypeLabel(item.recordType)}</td><td className="p-3">{item.sourceRow}</td><td className="p-3">{number}</td><td className="max-w-[320px] truncate p-3">{description}</td><td className="p-3"><Badge variant="outline" className={source.className}>{source.label}</Badge></td></tr>;
          })}</tbody></table></div></CardContent>
        </Card>

        <div className="flex flex-col gap-3 rounded-[24px] border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-black">جاهز للحفظ في دورة التحديث</p><p className="mt-1 text-xs text-slate-500">السجلات غير الواردة في ملف جزئي لا تُحذف، وتبقى النسخة السابقة محفوظة حتى اعتماد الدورة.</p></div>
          <Button disabled={importing || scanning || !currentFreshRows.length} onClick={performImport}>{importing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UploadCloud className="ml-2 h-4 w-4" />}{importing ? 'جاري الاستيراد...' : `استيراد ${currentFreshRows.length.toLocaleString('ar-SA')} سجل`}</Button>
        </div>
      </>}

      {result && <Card className="rounded-[24px] border-emerald-200 bg-emerald-50/60"><CardContent className="flex items-center justify-between p-5"><div className="flex items-start gap-3"><CheckCircle2 className="h-6 w-6 text-emerald-700" /><div><p className="font-black text-emerald-900">تم الاستيراد</p><p className="text-sm text-emerald-800">أضيف: {result.created.toLocaleString('ar-SA')} · متجاوز: {result.skipped.toLocaleString('ar-SA')} · الإجمالي: {result.total.toLocaleString('ar-SA')}</p></div></div><Button variant="outline" onClick={() => navigate(`/accounting-transformation/records?cycle=${encodeURIComponent(selectedCycleId)}`)}>عرض سجلات الدورة</Button></CardContent></Card>}
    </div>
  );
};
