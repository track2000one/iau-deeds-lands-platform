import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import * as XLSX from 'xlsx';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  PlusCircle,
  ShieldCheck,
  TriangleAlert,
  UploadCloud,
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
import {
  getAccountingAssetClassifications,
  getAccountingAssetUsefulLives,
  type AccountingAssetClassificationRow,
  type AccountingAssetUsefulLifeRow,
} from '../api/accountingAssetClassification';
import type {
  AccountingRecordType,
  AccountingTransformationCycle,
  AccountingTransformationInput,
} from '../../types/accountingTransformation';
import {
  ACCOUNTING_WORKBOOK_RULES,
  inspectAccountingWorkbook,
  markersForRule,
  parseAccountingWorkbook,
  type AccountingWorkbookInspection,
} from '../../utils/accountingWorkbookIntake';
import {
  inspectModelBWorkbook,
  parseModelBWorkbook,
  type ModelBSheetInspection,
} from '../../utils/fixedAssetModelBWorkbook';
import {
  reconcileYellowBuildingClassifications,
  type AccountingWorkbookReviewMeta,
  type AccountingWorkbookReviewSummary,
} from '../../utils/accountingTransformationWorkbookReview';

type PreviewItem = AccountingTransformationInput & AccountingWorkbookReviewMeta & {
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

type ReferenceCatalog = {
  versionLabel: string;
  classifications: AccountingAssetClassificationRow[];
  usefulLives: AccountingAssetUsefulLifeRow[];
};

const IMPORT_LIMIT_OPTIONS = [10, 25, 50, 100, 250, 0] as const;
const CATALOG_PAGE_SIZE = 200;
const CURRENT_CLASSIFICATION_RULE = 'classification-yellow-useful-life';

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
  classificationYellow: false,
  classificationReviewStatus: 'not_required',
  usefulLifeReviewStatus: 'not_checked',
});

const stripSource = (item: PreviewItem): AccountingTransformationInput => ({
  recordType: item.recordType,
  ownershipMode: item.ownershipMode,
  committeeStatus: item.committeeStatus,
  payload: item.payload,
  attachments: item.attachments || [],
  notes: item.notes || null,
});

const loadReferenceCatalog = async (): Promise<ReferenceCatalog> => {
  const firstClassifications = await getAccountingAssetClassifications({ page: 1, limit: CATALOG_PAGE_SIZE });
  if (!firstClassifications.version) {
    throw new Error('لا يوجد إصدار مرجعي معتمد من «تصنيف وترميز الأصول» في المنصة لتطبيق قاعدة التصنيف الحالية.');
  }
  const classifications = [...(firstClassifications.items || [])];
  for (let page = 2; page <= firstClassifications.pages; page += 1) {
    const response = await getAccountingAssetClassifications({ page, limit: CATALOG_PAGE_SIZE });
    classifications.push(...(response.items || []));
  }
  const firstUsefulLives = await getAccountingAssetUsefulLives({ page: 1, limit: CATALOG_PAGE_SIZE });
  const usefulLives = [...(firstUsefulLives.items || [])];
  for (let page = 2; page <= firstUsefulLives.pages; page += 1) {
    const response = await getAccountingAssetUsefulLives({ page, limit: CATALOG_PAGE_SIZE });
    usefulLives.push(...(response.items || []));
  }
  return { versionLabel: firstClassifications.version.versionLabel, classifications, usefulLives };
};

const emptyReviewSummary = (): AccountingWorkbookReviewSummary => ({
  yellow: 0, matched: 0, corrected: 0, unresolved: 0, usefulLifeAdjusted: 0, usefulLifeNeedsReview: 0,
});

const mergeReviewSummary = (target: AccountingWorkbookReviewSummary, source: AccountingWorkbookReviewSummary) => {
  target.yellow += source.yellow;
  target.matched += source.matched;
  target.corrected += source.corrected;
  target.unresolved += source.unresolved;
  target.usefulLifeAdjusted += source.usefulLifeAdjusted;
  target.usefulLifeNeedsReview += source.usefulLifeNeedsReview;
};

const comparisonMessage = (preview: AccountingTransformationImportPreview) => {
  const notSupplied = preview.notSupplied ?? preview.removed ?? 0;
  return `مقارنة دورة البيانات: ${(preview.new || 0).toLocaleString('ar-SA')} جديد، ${(preview.modified || 0).toLocaleString('ar-SA')} معدل، ${(preview.unchanged || 0).toLocaleString('ar-SA')} بدون تغيير، ${notSupplied.toLocaleString('ar-SA')} من النسخة السابقة لم يرد في هذا الملف الجزئي${preview.duplicate ? `، و${preview.duplicate.toLocaleString('ar-SA')} سبق إدخاله في هذه الدورة` : ''}.`;
};

const reviewBadge = (item: PreviewItem) => {
  if (item.recordType === 'fixed_asset') return { label: `نموذج ب ${MODEL_B_VERSION}`, className: 'border-violet-300 bg-violet-50 text-violet-800' };
  if (!item.classificationYellow) return { label: 'لا توجد قاعدة خاصة', className: 'border-slate-200 bg-slate-50 text-slate-600' };
  if (item.classificationReviewStatus === 'corrected') return { label: 'تم توحيد التصنيف', className: 'border-sky-300 bg-sky-50 text-sky-800' };
  if (item.classificationReviewStatus === 'matched') return { label: 'التصنيف مطابق', className: 'border-emerald-300 bg-emerald-50 text-emerald-800' };
  return { label: 'تحتاج مراجعة مرجعية', className: 'border-red-300 bg-red-50 text-red-800' };
};

const dependentBadge = (item: PreviewItem) => {
  if (item.recordType === 'fixed_asset') return { label: 'يُفحص عند الحفظ', className: 'border-violet-200 bg-violet-50 text-violet-700' };
  if (!item.classificationYellow) return { label: '—', className: 'border-slate-200 bg-white text-slate-500' };
  if (item.usefulLifeReviewStatus === 'valid') return { label: 'العمر صحيح', className: 'border-emerald-300 bg-emerald-50 text-emerald-800' };
  if (item.usefulLifeReviewStatus === 'adjusted') return { label: 'تم تصحيح العمر', className: 'border-sky-300 bg-sky-50 text-sky-800' };
  return { label: 'العمر يحتاج مراجعة', className: 'border-red-300 bg-red-50 text-red-800' };
};

export const AccountingTransformationUniversalImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, hasPermission } = usePermissions();
  const canCreateCycle = isAdmin || hasPermission('accounting_transformation', 'canCreateCycle');

  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState(searchParams.get('cycle') || '');
  const [cycleName, setCycleName] = useState('');
  const [cycleDescription, setCycleDescription] = useState('');
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [inspection, setInspection] = useState<AccountingWorkbookInspection | null>(null);
  const [modelBSheets, setModelBSheets] = useState<ModelBSheetInspection[]>([]);
  const [reviewSummary, setReviewSummary] = useState<AccountingWorkbookReviewSummary | null>(null);
  const [referenceVersion, setReferenceVersion] = useState('');
  const [message, setMessage] = useState('');
  const [scan, setScan] = useState<AccountingTransformationImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [limitPerBatch, setLimitPerBatch] = useState<number>(0);
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
    return () => { active = false; };
  }, []);

  const resetFileState = () => {
    setFileName(''); setItems([]); setInspection(null); setModelBSheets([]); setReviewSummary(null); setReferenceVersion('');
    setMessage(''); setScan(null); setResult(null); setBatchIndex(0);
  };

  const createDraftCycle = async () => {
    if (!canCreateCycle) return toast.error('لا تملك صلاحية «إنشاء دورة جديدة»');
    const name = cycleName.trim();
    if (!name) return toast.error('أدخل اسم دورة التحديث أولًا');
    setCreatingCycle(true);
    try {
      const created = await createAccountingTransformationCycle({ name, description: cycleDescription.trim() || null });
      setCycles([created]); setSelectedCycleId(created.id); setCycleName(''); setCycleDescription(''); resetFileState();
      toast.success(`تم إنشاء دورة #${created.cycleNumber} — ${created.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء دورة التحديث');
    } finally { setCreatingCycle(false); }
  };

  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId);
  const fixedAssets = useMemo(() => items.filter((item) => item.recordType === 'fixed_asset'), [items]);
  const lands = useMemo(() => items.filter((item) => item.recordType === 'land'), [items]);
  const buildings = useMemo(() => items.filter((item) => item.recordType === 'building'), [items]);
  const modelBSheetNames = useMemo(() => new Set(modelBSheets.map((sheet) => sheet.sheetName)), [modelBSheets]);

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
  const isReviewResolved = (item: PreviewItem) => !item.classificationYellow || (item.classificationReviewStatus !== 'needs_review' && item.usefulLifeReviewStatus !== 'needs_review');
  const currentFreshRows = useMemo(() => items.filter((item, index) => index >= batchRange.start && index < batchRange.end && freshIndexSet.has(index) && isReviewResolved(item)), [items, batchRange, freshIndexSet]);
  const currentUnresolvedRows = useMemo(() => items.filter((item, index) => index >= batchRange.start && index < batchRange.end && freshIndexSet.has(index) && !isReviewResolved(item)), [items, batchRange, freshIndexSet]);
  const batchLabel = limitPerBatch === 0 ? 'كل السجلات' : `الدفعة ${Math.min(batchIndex + 1, maxBatch).toLocaleString('ar-SA')} من ${maxBatch.toLocaleString('ar-SA')}`;

  const refreshScan = async (allItems: PreviewItem[], sourceFileName: string) => {
    setScanning(true);
    try {
      if (!selectedCycleId) throw new Error('لم يتم تحديد دورة تحديث مسودة');
      const preview = await previewAccountingTransformationCycleImport(selectedCycleId, allItems.map(stripSource), sourceFileName || undefined);
      setScan(preview);
      return preview;
    } finally { setScanning(false); }
  };

  const applyKnownWorkbookRules = async (parsed: PreviewItem[], workbookInspection: AccountingWorkbookInspection, excludedSheets: Set<string>) => {
    const markers = markersForRule(workbookInspection, CURRENT_CLASSIFICATION_RULE).filter((marker) => !excludedSheets.has(marker.sheetName));
    if (!markers.length) return { items: parsed, summary: null as AccountingWorkbookReviewSummary | null, versionLabel: '' };
    const reference = await loadReferenceCatalog();
    const output = [...parsed];
    const aggregate = emptyReviewSummary();
    const sheets = Array.from(new Set(markers.map((marker) => marker.sheetName)));
    for (const sheetName of sheets) {
      const yellowRows = new Set(markers.filter((marker) => marker.sheetName === sheetName).map((marker) => marker.row));
      const indexes = output.map((item, index) => ({ item, index })).filter(({ item }) => item.recordType === 'building' && item.sourceSheet === sheetName).map(({ index }) => index);
      if (!indexes.length) continue;
      const subset = indexes.map((index) => output[index]);
      const reconciled = reconcileYellowBuildingClassifications(subset as any, yellowRows, reference.classifications, reference.usefulLives);
      reconciled.items.forEach((item: PreviewItem, localIndex: number) => { output[indexes[localIndex]] = item; });
      mergeReviewSummary(aggregate, reconciled.summary);
    }
    return { items: output, summary: aggregate, versionLabel: reference.versionLabel };
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!selectedCycleId) return toast.error('أنشئ أو اختر دورة تحديث مسودة قبل رفع الملف');
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error('اختر ملف Excel بصيغة XLSX أو XLS');
    setParsing(true); setScan(null); setResult(null); setReviewSummary(null); setReferenceVersion(''); setInspection(null); setModelBSheets([]); setBatchIndex(0);
    setMessage('جاري قراءة المصنف كاملًا: جميع الأوراق، الحقول، القيم وتنسيقات الخلايا...');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, cellStyles: true });
      let officialWorkbook: XLSX.WorkBook | undefined;
      try {
        const officialBuffer = await downloadOfficialAccountingExcelTemplate();
        officialWorkbook = XLSX.read(officialBuffer, { type: 'array', cellDates: false, cellStyles: true });
      } catch { officialWorkbook = undefined; }

      setMessage('تم فتح المصنف. جارٍ البحث أولًا عن «سجل الأصول» وفق نموذج ب، ثم مطابقة بقية الأوراق مع المحولات القديمة...');
      const detectedModelB = inspectModelBWorkbook(workbook);
      const detectedModelBNames = new Set(detectedModelB.map((sheet) => sheet.sheetName));
      setModelBSheets(detectedModelB);

      const workbookInspection = await inspectAccountingWorkbook(workbook, buffer, officialWorkbook);
      setInspection(workbookInspection);

      const modelBRows = parseModelBWorkbook(workbook, detectedModelB);
      const legacyRows = parseAccountingWorkbook(workbook, workbookInspection).filter((row) => !detectedModelBNames.has(row.sourceSheet));
      let parsed = [...modelBRows, ...legacyRows].map((row) => toPreviewItem(row as IntakeRow));
      const processed = await applyKnownWorkbookRules(parsed, workbookInspection, detectedModelBNames);
      parsed = processed.items;
      setReviewSummary(processed.summary); setReferenceVersion(processed.versionLabel); setFileName(file.name); setItems(parsed);

      const legacyMapped = workbookInspection.sheets.filter((sheet) => sheet.recordType && !detectedModelBNames.has(sheet.sheetName)).length;
      const mappedCount = detectedModelB.length + legacyMapped;
      const unmappedCount = Math.max(0, workbookInspection.sheets.length - mappedCount);
      const modelBText = detectedModelB.length ? ` تم التعرف على ${detectedModelB.length.toLocaleString('ar-SA')} ورقة كسجل أصول ثابتة وفق نموذج ب ${MODEL_B_VERSION}.` : '';
      const intakeMessage = `تمت قراءة ${workbookInspection.sheets.length.toLocaleString('ar-SA')} ورقة كاملة؛ ${mappedCount.toLocaleString('ar-SA')} مرتبطة بمخطط المخرجات و${unmappedCount.toLocaleString('ar-SA')} ورقة إضافية/مرجعية.${modelBText} رُصد ${workbookInspection.totalMarkerCount.toLocaleString('ar-SA')} تنسيق لوني؛ القواعد الخاصة لا تطبق إلا على نوع الورقة الذي عُرّفت له.`;

      if (!parsed.length) {
        setMessage(`${intakeMessage} لم يُرفض المصنف؛ لا توجد حاليًا سجلات يمكن ربطها آليًا بالسجل الرسمي، لذلك بقي الملف في مرحلة الفحص دون كتابة بيانات.`);
        toast.warning('تمت قراءة الملف كاملًا، ولكن لا توجد سجلات قابلة للربط الآلي بالمخرجات الرسمية');
        return;
      }
      setMessage(`${intakeMessage} جارٍ مقارنة ${parsed.length.toLocaleString('ar-SA')} سجل مع دورة البيانات السابقة...`);
      const preview = await refreshScan(parsed, file.name);
      setMessage(`${intakeMessage} ${comparisonMessage(preview)}`);
      toast.success(`تمت قراءة المصنف وربط ${parsed.length.toLocaleString('ar-SA')} سجل`);
    } catch (error) {
      setItems([]); setInspection(null); setModelBSheets([]); setFileName(''); setScan(null); setMessage('');
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف Excel');
    } finally { setParsing(false); }
  };

  const performImport = async () => {
    if (importing || scanning || !currentFreshRows.length) return;
    if (currentUnresolvedRows.length) return toast.error(`توجد ${currentUnresolvedRows.length.toLocaleString('ar-SA')} حالة مرجعية غير محسومة في هذه الدفعة.`);
    const confirmed = window.confirm(`سيتم حفظ ${currentFreshRows.length.toLocaleString('ar-SA')} سجل من ${batchLabel} داخل دورة التحديث.\n\nالملف الوارد مصدر بيانات متغير؛ نموذج ب الرسمي هو مخطط المخرجات الثابت. هل ترغب بالمتابعة؟`);
    if (!confirmed) return;
    setImporting(true); setResult(null);
    try {
      const response = await importAccountingTransformationCycleRecords(selectedCycleId, currentFreshRows.map(stripSource), fileName || undefined);
      setResult(response);
      toast.success(`تم إدخال ${response.created.toLocaleString('ar-SA')} سجل إلى دورة التحديث`);
      await refreshScan(items, fileName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استيراد السجلات');
    } finally { setImporting(false); }
  };

  const statusForIndex = (index: number) => {
    if (duplicateIndexSet.has(index)) return { label: 'مدخل بالدورة', className: 'border-amber-300 bg-amber-50 text-amber-800' };
    if (invalidIndexSet.has(index)) return { label: 'غير صالح', className: 'border-red-300 bg-red-50 text-red-700' };
    if (modifiedIndexSet.has(index)) return { label: 'معدل', className: 'border-sky-300 bg-sky-50 text-sky-800' };
    if (unchangedIndexSet.has(index)) return { label: 'بدون تغيير', className: 'border-slate-300 bg-slate-50 text-slate-700' };
    if (newIndexSet.has(index)) return { label: 'جديد', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
    return { label: 'جاهز', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
  };

  const mappedSheetCount = inspection ? modelBSheets.length + inspection.sheets.filter((sheet) => sheet.recordType && !modelBSheetNames.has(sheet.sheetName)).length : 0;
  const unmappedSheetCount = inspection ? Math.max(0, inspection.sheets.length - mappedSheetCount) : 0;
  const modelBByName = useMemo(() => new Map(modelBSheets.map((sheet) => [sheet.sheetName, sheet])), [modelBSheets]);

  return (
    <div className="mx-auto w-full max-w-[1550px] space-y-5 p-1 pb-10 sm:p-3 md:p-5" dir="rtl">
      <section className="flex flex-col gap-4 rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)] md:flex-row md:items-center md:justify-between">
        <div><Badge variant="outline" className="mb-2">لجنة متابعة متطلبات التحول المحاسبي</Badge><h1 className="text-2xl font-black text-slate-900 md:text-3xl">استيراد دورة تحديث جديدة</h1><p className="mt-1 text-sm text-slate-500">المسار الرسمي المفضل: نموذج (ب - استدامة) سجل الأصول الثابتة — النسخة الثالثة. وتبقى ملفات الأراضي والمباني السابقة مدعومة كمصادر انتقالية.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation/cycles')}>دورات البيانات</Button><Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation')}><ArrowRight className="ml-2 h-4 w-4" />العودة للوحة اللجنة</Button></div>
      </section>

      <Card className="rounded-[24px] border-cyan-200 bg-cyan-50/50"><CardContent className="space-y-4 p-4"><div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"><label className="text-xs font-bold text-slate-600">دورة التحديث المستهدفة<NativeSelect value={selectedCycleId} disabled={cyclesLoading || !cycles.length} onChange={(event) => { setSelectedCycleId(event.target.value); resetFileState(); }} className="mt-1 h-11 rounded-xl bg-white">{cycles.length ? cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name} (مسودة)</option>) : <option value="">لا توجد دورة مسودة قابلة للاستيراد</option>}</NativeSelect></label><Button variant="outline" onClick={() => navigate('/accounting-transformation/cycles')}><PlusCircle className="ml-2 h-4 w-4" />إدارة الدورات</Button></div>{selectedCycle && <p className="rounded-xl border border-cyan-200 bg-white/80 px-4 py-3 text-xs text-slate-600">سيتم حفظ البيانات في: <strong>#{selectedCycle.cycleNumber} — {selectedCycle.name}</strong>. تبقى مسودة حتى اعتماد الدورة.</p>}{!cyclesLoading && !cycles.length && canCreateCycle && <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4"><p className="mb-3 font-black text-amber-950">أنشئ دورة تحديث قبل اختيار الملف</p><div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end"><label className="text-xs font-bold">اسم الدورة<Input value={cycleName} onChange={(event) => setCycleName(event.target.value)} className="mt-1 h-11 bg-white" placeholder="مثال: تحديث أغسطس 2026" /></label><label className="text-xs font-bold">الوصف<Input value={cycleDescription} onChange={(event) => setCycleDescription(event.target.value)} className="mt-1 h-11 bg-white" /></label><Button onClick={createDraftCycle} disabled={creatingCycle || !cycleName.trim()} className="h-11">{creatingCycle && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}إنشاء الدورة</Button></div></div>}</CardContent></Card>

      <Card className="rounded-[24px] border-violet-200 bg-violet-50/45"><CardContent className="grid gap-4 p-4 lg:grid-cols-[auto_1fr] lg:items-center"><div className="grid h-12 w-12 place-items-center rounded-2xl border border-violet-200 bg-white text-violet-700"><ShieldCheck className="h-6 w-6" /></div><div><p className="font-black text-slate-900">نموذج ب هو المخطط الرسمي — والملفات الواردة مصادر متغيرة</p><p className="mt-1 text-sm leading-7 text-slate-700">تقرأ المنصة جميع الأوراق. إذا وجدت حقول نموذج ب A:BB تتعامل معها كسجل أصل ثابت موحد. أما أوراق الأراضي والمباني القديمة فتُقرأ عبر محولات Legacy. العلامات اللونية والقواعد الطارئة مستقلة عن القالب ولا تغيّر النموذج الرسمي.</p></div></CardContent></Card>

      <Card className="rounded-[28px] border-dashed border-sky-300 bg-[linear-gradient(145deg,#fafeff,#eef9ff)]"><CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-base"><UploadCloud className="h-5 w-5" />اختيار ملف التحديث</CardTitle></CardHeader><CardContent className="p-5">{selectedCycleId ? <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-sky-300/80 bg-white/75 px-5 py-10 text-center"><FileSpreadsheet className="h-12 w-12 text-sky-700" /><h2 className="mt-4 text-lg font-black">اختر XLSX أو XLS</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">لا يشترط اسم Sheet ثابت لملفات الإدارات. نموذج ب يُكتشف من عناوين حقوله، وبقية الأوراق تبقى ظاهرة في تقرير الفحص حتى لو لم تُربط.</p><span className="mt-4 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-sky-700">{parsing ? 'جاري تحليل المصنف كاملًا...' : fileName || 'اضغط لاختيار الملف'}</span><input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" disabled={parsing || importing} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; void chooseFile(file).finally(() => { input.value = ''; }); }} /></label> : <div className="rounded-2xl border bg-slate-50 p-8 text-center">اختر أو أنشئ دورة مسودة أولًا.</div>}{(message || scanning) && <div className="mt-3 flex items-start gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-bold leading-7 text-slate-700">{scanning && <Loader2 className="mt-1 h-4 w-4 animate-spin" />}{message}</div>}</CardContent></Card>

      {inspection && <Card className="rounded-[26px]"><CardHeader><CardTitle>نتيجة قراءة المصنف الكامل</CardTitle><p className="text-xs text-slate-500">الورقة غير المرتبطة لا تسبب رفض الملف؛ لا تُكتب إلا البيانات التي تمت مطابقتها بثقة.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs text-slate-500">إجمالي الأوراق</p><p className="mt-1 text-2xl font-black">{inspection.sheets.length.toLocaleString('ar-SA')}</p></div><div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4"><p className="text-xs text-violet-700">نموذج ب</p><p className="mt-1 text-2xl font-black">{modelBSheets.length.toLocaleString('ar-SA')}</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4"><p className="text-xs text-emerald-700">إجمالي الأوراق المرتبطة</p><p className="mt-1 text-2xl font-black">{mappedSheetCount.toLocaleString('ar-SA')}</p></div><div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4"><p className="text-xs text-amber-700">أوراق إضافية/مرجعية</p><p className="mt-1 text-2xl font-black">{unmappedSheetCount.toLocaleString('ar-SA')}</p></div><div className="rounded-2xl border bg-slate-50 p-4"><p className="text-xs text-slate-500">علامات لونية</p><p className="mt-1 text-2xl font-black">{inspection.totalMarkerCount.toLocaleString('ar-SA')}</p></div><div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4"><p className="text-xs text-sky-700">قواعد Legacy المطابقة</p><p className="mt-1 text-2xl font-black">{inspection.matchedRuleMarkerCount.toLocaleString('ar-SA')}</p></div></div><div className="flex flex-wrap gap-2">{inspection.sheets.map((sheet) => { const modelB = modelBByName.get(sheet.sheetName); const linked = Boolean(modelB || (sheet.recordType && !modelBSheetNames.has(sheet.sheetName))); return <Badge key={sheet.sheetName} variant="outline" className={linked ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-600'}>{sheet.sheetName} · {modelB ? `سجل الأصول الثابتة — ${modelB.matchedFields} حقل نموذج ب` : sheet.recordType ? `${recordTypeLabel(sheet.recordType)} — ${sheet.matchedFields} حقل مطابق` : 'ورقة إضافية/مرجعية'}{sheet.markerCount ? ` · ${sheet.markerCount} علامة` : ''}</Badge>; })}</div><div className="rounded-xl border bg-slate-50/70 px-4 py-3 text-xs leading-6 text-slate-600">أولوية المخرجات: <strong>نموذج (ب - استدامة) سجل الأصول الثابتة — {MODEL_B_VERSION}</strong>. الملف المستورد لا يصبح قالبًا جديدًا تلقائيًا؛ هو مصدر للمطابقة والتحديث فقط.</div></CardContent></Card>}

      <Card className="rounded-[24px]"><CardHeader><CardTitle>قواعد المعالجة الخاصة</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{ACCOUNTING_WORKBOOK_RULES.map((rule) => <div key={rule.id} className="rounded-2xl border bg-white p-4"><p className="font-black text-slate-900">{rule.label} <Badge variant="outline" className="mr-2">Legacy</Badge></p><p className="mt-1 text-xs leading-6 text-slate-600">{rule.description}</p></div>)}</CardContent></Card>

      {reviewSummary && <Card className={`rounded-[26px] ${reviewSummary.unresolved ? 'border-red-200 bg-red-50/40' : 'border-emerald-200 bg-emerald-50/40'}`}><CardHeader><CardTitle className="flex items-center gap-2">{reviewSummary.unresolved ? <TriangleAlert className="h-5 w-5 text-red-700" /> : <ShieldCheck className="h-5 w-5 text-emerald-700" />}نتيجة قواعد الملفات القديمة {referenceVersion && <Badge variant="outline">{referenceVersion}</Badge>}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6"><div className="rounded-xl border bg-white p-3">علامات مطبقة: <strong>{reviewSummary.yellow}</strong></div><div className="rounded-xl border bg-white p-3">تصنيف مطابق: <strong>{reviewSummary.matched}</strong></div><div className="rounded-xl border bg-white p-3">تصنيف مصحح: <strong>{reviewSummary.corrected}</strong></div><div className="rounded-xl border bg-white p-3">عمر مصحح: <strong>{reviewSummary.usefulLifeAdjusted}</strong></div><div className="rounded-xl border bg-white p-3">عمر يحتاج مراجعة: <strong>{reviewSummary.usefulLifeNeedsReview}</strong></div><div className="rounded-xl border bg-white p-3">غير محسوم: <strong>{reviewSummary.unresolved}</strong></div></CardContent></Card>}

      {items.length > 0 && <><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><div className="rounded-[22px] border bg-white p-4"><p className="text-xs text-slate-500">سجلات مرتبطة</p><p className="mt-1 text-3xl font-black">{items.length.toLocaleString('ar-SA')}</p><p className="text-[11px] text-slate-500">نموذج ب {fixedAssets.length.toLocaleString('ar-SA')} · Legacy أراضٍ {lands.length.toLocaleString('ar-SA')} · مبانٍ {buildings.length.toLocaleString('ar-SA')}</p></div><div className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4"><p className="text-xs text-emerald-700">جديد</p><p className="mt-1 text-3xl font-black">{(scan?.new || 0).toLocaleString('ar-SA')}</p></div><div className="rounded-[22px] border border-sky-200 bg-sky-50/60 p-4"><p className="text-xs text-sky-700">معدل</p><p className="mt-1 text-3xl font-black">{(scan?.modified || 0).toLocaleString('ar-SA')}</p></div><div className="rounded-[22px] border bg-slate-50 p-4"><p className="text-xs">بدون تغيير</p><p className="mt-1 text-3xl font-black">{(scan?.unchanged || 0).toLocaleString('ar-SA')}</p></div><div className="rounded-[22px] border border-amber-200 bg-amber-50/60 p-4"><p className="text-xs text-amber-700">من السابق لم يرد هنا</p><p className="mt-1 text-3xl font-black">{(scan?.notSupplied ?? scan?.removed ?? 0).toLocaleString('ar-SA')}</p></div></div>

        <Card className="rounded-[24px]"><CardHeader><CardTitle>الدفعات</CardTitle></CardHeader><CardContent className="grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr]"><label className="text-xs font-bold">عدد السجلات<NativeSelect value={String(limitPerBatch)} onChange={(event) => { setLimitPerBatch(Number(event.target.value)); setBatchIndex(0); setResult(null); }} className="mt-1 h-11">{IMPORT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value === 0 ? 'كل السجلات' : `${value} سجل`}</option>)}</NativeSelect></label><div><p className="text-xs font-bold">الدفعة الحالية</p><div className="mt-1 flex gap-2"><Button variant="outline" size="icon" disabled={batchIndex <= 0} onClick={() => setBatchIndex((value) => Math.max(0, value - 1))}><ChevronRight /></Button><div className="flex h-10 flex-1 items-center justify-center rounded-xl border bg-white font-black">{batchLabel}</div><Button variant="outline" size="icon" disabled={batchIndex + 1 >= maxBatch} onClick={() => setBatchIndex((value) => Math.min(maxBatch - 1, value + 1))}><ChevronLeft /></Button></div></div><div className={`rounded-xl border p-3 ${currentUnresolvedRows.length ? 'border-red-200 bg-red-50' : 'bg-slate-50'}`}><p className="text-xs">جاهز: <strong>{currentFreshRows.length}</strong> من {currentRows.length}</p>{currentUnresolvedRows.length > 0 && <p className="mt-1 text-xs font-bold text-red-700">{currentUnresolvedRows.length} يحتاج مراجعة</p>}</div></CardContent></Card>

        <Card className="rounded-[24px]"><CardHeader><CardTitle>معاينة السجلات المرتبطة</CardTitle></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[1250px] text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">المصدر</th><th className="p-3 text-right">النوع</th><th className="p-3 text-right">صف Excel</th><th className="p-3 text-right">رقم الأصل</th><th className="p-3 text-right">وصف الأصل</th><th className="p-3 text-right">المراجعة المرجعية</th><th className="p-3 text-right">الفحص التابع</th></tr></thead><tbody>{currentRows.slice(0, 15).map((item, localIndex) => { const globalIndex = batchRange.start + localIndex; const status = statusForIndex(globalIndex); const review = reviewBadge(item); const dependent = dependentBadge(item); const number = item.recordType === 'fixed_asset' ? String(item.payload.Y || item.payload.Z || item.payload.AB || '-') : String(item.payload.E || item.payload.D || '-'); const description = item.recordType === 'fixed_asset' ? String(item.payload.AA || '-') : String(item.payload.G || '-'); return <tr key={`${item.sourceSheet}-${item.sourceRow}-${globalIndex}`} className="border-t"><td className="p-3"><Badge variant="outline" className={status.className}>{status.label}</Badge></td><td className="p-3 font-bold">{item.sourceSheet}</td><td className="p-3">{recordTypeLabel(item.recordType)}</td><td className="p-3">{item.sourceRow}</td><td className="p-3">{number}</td><td className="max-w-[300px] truncate p-3">{description}</td><td className="p-3"><Badge variant="outline" className={review.className}>{review.label}</Badge></td><td className="p-3"><Badge variant="outline" className={dependent.className}>{dependent.label}</Badge></td></tr>; })}</tbody></table></div></CardContent></Card>

        <div className={`flex flex-col gap-3 rounded-[24px] border p-4 sm:flex-row sm:items-center sm:justify-between ${currentUnresolvedRows.length ? 'border-red-200 bg-red-50' : 'bg-white'}`}><div><p className="font-black">{currentUnresolvedRows.length ? 'توجد حالات مرجعية تحتاج مراجعة' : 'جاهز للحفظ في دورة التحديث'}</p><p className="mt-1 text-xs text-slate-500">السجلات غير الواردة في ملف جزئي لا تُحذف؛ عند الاعتماد تحمل المنصة البيانات السابقة غير المستبدلة إلى الدورة الجديدة.</p></div><Button disabled={importing || scanning || !currentFreshRows.length || currentUnresolvedRows.length > 0} onClick={performImport}>{importing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UploadCloud className="ml-2 h-4 w-4" />}{importing ? 'جاري الاستيراد...' : `استيراد ${currentFreshRows.length.toLocaleString('ar-SA')} سجل`}</Button></div>
      </>}

      {result && <Card className="rounded-[24px] border-emerald-200 bg-emerald-50/60"><CardContent className="flex items-center justify-between p-5"><div className="flex items-start gap-3"><CheckCircle2 className="h-6 w-6 text-emerald-700" /><div><p className="font-black text-emerald-900">تم الاستيراد</p><p className="text-sm text-emerald-800">أضيف: {result.created.toLocaleString('ar-SA')} · متجاوز: {result.skipped.toLocaleString('ar-SA')} · الإجمالي: {result.total.toLocaleString('ar-SA')}</p></div></div><Button variant="outline" onClick={() => navigate(`/accounting-transformation/records?cycle=${encodeURIComponent(selectedCycleId)}`)}>عرض سجلات الدورة</Button></CardContent></Card>}
    </div>
  );
};
