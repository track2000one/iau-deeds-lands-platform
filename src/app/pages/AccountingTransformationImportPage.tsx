import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import * as XLSX from 'xlsx';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  LandPlot,
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
import {
  ACCOUNTING_FIELDS,
  ACCOUNTING_RECORD_TYPE_LABELS,
  excelColumnToIndex,
  isMeaningfulAccountingValue,
  type AccountingRecordType,
} from '../config/accountingTransformationFields';
import {
  createAccountingTransformationCycle,
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
import type { AccountingTransformationCycle, AccountingTransformationInput } from '../../types/accountingTransformation';
import {
  findAccountingTemplateSheet,
  findExplicitYellowUsefulLifeRows,
  reconcileYellowBuildingClassifications,
  type AccountingWorkbookReviewMeta,
  type AccountingWorkbookReviewSummary,
} from '../../utils/accountingTransformationWorkbookReview';

type PreviewItem = AccountingTransformationInput & AccountingWorkbookReviewMeta & { sourceRow: number };
type ImportResult = { created: number; updated: number; skipped: number; total: number; new?: number; modified?: number; unchanged?: number };

type ReferenceCatalog = {
  versionLabel: string;
  classifications: AccountingAssetClassificationRow[];
  usefulLives: AccountingAssetUsefulLifeRow[];
};

const IMPORT_LIMIT_OPTIONS = [10, 25, 50, 100, 250, 0] as const;
const CATALOG_PAGE_SIZE = 200;

const parseSheet = (
  workbook: XLSX.WorkBook,
  type: AccountingRecordType,
  sheetName?: string,
): PreviewItem[] => {
  if (!sheetName) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
  });

  const output: PreviewItem[] = [];
  for (let rowIndex = 7; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const payload: Record<string, unknown> = {};
    for (const field of ACCOUNTING_FIELDS[type]) {
      const value = row[excelColumnToIndex(field.c)];
      if (isMeaningfulAccountingValue(value)) payload[field.c] = String(value).trim();
    }
    if (!isMeaningfulAccountingValue(payload.B) && !isMeaningfulAccountingValue(payload.E) && !isMeaningfulAccountingValue(payload.G)) continue;
    output.push({
      recordType: type,
      ownershipMode: inferOwnership(type, payload),
      committeeStatus: 'not_reviewed',
      payload,
      attachments: [],
      notes: null,
      sourceRow: rowIndex + 1,
      classificationYellow: false,
      classificationReviewStatus: 'not_required',
      usefulLifeReviewStatus: 'not_checked',
    });
  }
  return output;
};

const inferOwnership = (type: AccountingRecordType, payload: Record<string, unknown>) => {
  const columns = type === 'land' ? ['X', 'Y', 'Z'] : ['W', 'X', 'Y'];
  return columns.some((column) => isMeaningfulAccountingValue(payload[column])) ? 'leased' as const : 'owned' as const;
};

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
    throw new Error('لا يوجد إصدار معتمد من «تصنيف وترميز الأصول» في المنصة. استورد الدليل المرجعي أولًا قبل معالجة صفوف U الصفراء.');
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

  if (!classifications.length) throw new Error('إصدار دليل التصنيف الحالي لا يحتوي على سجلات ترميز قابلة للمطابقة.');
  return {
    versionLabel: firstClassifications.version.versionLabel,
    classifications,
    usefulLives,
  };
};

const comparisonMessage = (preview: AccountingTransformationImportPreview) =>
  `مقارنة دورة البيانات: ${(preview.new || 0).toLocaleString('ar-SA')} جديد، ${(preview.modified || 0).toLocaleString('ar-SA')} معدل، ${(preview.unchanged || 0).toLocaleString('ar-SA')} بدون تغيير، ${(preview.removed || 0).toLocaleString('ar-SA')} لم يظهر في الملف الجديد${preview.duplicate ? `، و${preview.duplicate.toLocaleString('ar-SA')} سبق إدخاله في هذه الدورة` : ''}.`;

const classificationBadge = (item: PreviewItem) => {
  if (!item.classificationYellow) return { label: 'غير معلّم', className: 'border-slate-200 bg-slate-50 text-slate-600' };
  if (item.classificationReviewStatus === 'corrected') return { label: `صحح H:T${item.classificationChangedFields?.length ? ` (${item.classificationChangedFields.length})` : ''}`, className: 'border-sky-300 bg-sky-50 text-sky-800' };
  if (item.classificationReviewStatus === 'matched') return { label: 'H:T مطابق', className: 'border-emerald-300 bg-emerald-50 text-emerald-800' };
  return { label: 'H:T يحتاج مراجعة', className: 'border-red-300 bg-red-50 text-red-800' };
};

const usefulLifeBadge = (item: PreviewItem) => {
  if (!item.classificationYellow) return { label: '—', className: 'border-slate-200 bg-white text-slate-500' };
  if (item.usefulLifeReviewStatus === 'valid') return { label: 'U صحيح', className: 'border-emerald-300 bg-emerald-50 text-emerald-800' };
  if (item.usefulLifeReviewStatus === 'adjusted') return { label: 'تم تصحيح U', className: 'border-sky-300 bg-sky-50 text-sky-800' };
  return { label: 'U يحتاج مراجعة', className: 'border-red-300 bg-red-50 text-red-800' };
};

export const AccountingTransformationImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, hasPermission } = usePermissions();
  const canCreateCycle = isAdmin || hasPermission('accounting_transformation', 'canCreateCycle');

  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [limitPerBatch, setLimitPerBatch] = useState<number>(0);
  const [batchIndex, setBatchIndex] = useState(0);
  const [scan, setScan] = useState<AccountingTransformationImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState('');
  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState(searchParams.get('cycle') || '');
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [cycleName, setCycleName] = useState('');
  const [cycleDescription, setCycleDescription] = useState('');
  const [creatingCycle, setCreatingCycle] = useState(false);
  const [reviewSummary, setReviewSummary] = useState<AccountingWorkbookReviewSummary | null>(null);
  const [referenceVersion, setReferenceVersion] = useState('');
  const [detectedSheets, setDetectedSheets] = useState<{ land?: string; building?: string }>({});

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
      .catch((error) => toast.error(error instanceof Error ? error.message : 'تعذر تحميل دورة التحديث'))
      .finally(() => active && setCyclesLoading(false));
    return () => { active = false; };
  }, []);

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
      toast.success(`تم إنشاء دورة #${created.cycleNumber} — ${created.name}. يمكنك الآن اختيار ملف Excel.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء دورة التحديث');
    } finally {
      setCreatingCycle(false);
    }
  };

  const resetFileState = () => {
    setItems([]);
    setScan(null);
    setResult(null);
    setFileName('');
    setMessage('');
    setReviewSummary(null);
    setReferenceVersion('');
    setDetectedSheets({});
    setBatchIndex(0);
  };

  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId);
  const lands = useMemo(() => items.filter((item) => item.recordType === 'land'), [items]);
  const buildings = useMemo(() => items.filter((item) => item.recordType === 'building'), [items]);

  const maxBatch = useMemo(() => {
    if (!items.length || limitPerBatch === 0) return 1;
    return Math.max(1, Math.ceil(items.length / limitPerBatch));
  }, [items.length, limitPerBatch]);

  const batchRange = useMemo(() => {
    if (limitPerBatch === 0) return { start: 0, end: items.length };
    const start = batchIndex * limitPerBatch;
    return { start, end: Math.min(items.length, start + limitPerBatch) };
  }, [items.length, batchIndex, limitPerBatch]);

  const currentRows = useMemo(() => items.slice(batchRange.start, batchRange.end), [items, batchRange]);
  const freshIndexSet = useMemo(() => new Set(scan?.freshIndexes || []), [scan]);
  const duplicateIndexSet = useMemo(() => new Set(scan?.duplicateIndexes || []), [scan]);
  const invalidIndexSet = useMemo(() => new Set(scan?.invalidIndexes || []), [scan]);

  const isReviewResolved = (item: PreviewItem) => !item.classificationYellow || (
    item.classificationReviewStatus !== 'needs_review'
    && item.usefulLifeReviewStatus !== 'needs_review'
  );

  const currentFreshRows = useMemo(
    () => items.filter((item, index) => index >= batchRange.start && index < batchRange.end && freshIndexSet.has(index) && isReviewResolved(item)),
    [items, batchRange, freshIndexSet]
  );

  const currentUnresolvedRows = useMemo(
    () => items.filter((item, index) => index >= batchRange.start && index < batchRange.end && freshIndexSet.has(index) && !isReviewResolved(item)),
    [items, batchRange, freshIndexSet]
  );

  const batchLabel = limitPerBatch === 0
    ? 'كل السجلات'
    : `الدفعة ${Math.min(batchIndex + 1, maxBatch).toLocaleString('ar-SA')} من ${maxBatch.toLocaleString('ar-SA')}`;

  const refreshScan = async (allItems: PreviewItem[], sourceFileName = fileName) => {
    setScanning(true);
    try {
      if (!selectedCycleId) throw new Error('أنشئ دورة تحديث جديدة أولًا من صفحة دورات البيانات.');
      const preview = await previewAccountingTransformationCycleImport(selectedCycleId, allItems.map(stripSource), sourceFileName || undefined);
      setScan(preview);
      return preview;
    } finally {
      setScanning(false);
    }
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!selectedCycleId) return toast.error('أنشئ أو اختر دورة تحديث مسودة قبل رفع الملف');
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error('اختر ملف Excel بصيغة XLSX أو XLS');

    setParsing(true);
    setResult(null);
    setScan(null);
    setReviewSummary(null);
    setReferenceVersion('');
    setDetectedSheets({});
    setBatchIndex(0);
    setMessage('جاري قراءة ملف Excel والتعرف على أوراق البيانات من الاسم أو بنية الأعمدة...');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, cellStyles: true });
      const landSheet = findAccountingTemplateSheet(workbook, 'land');
      const buildingSheet = findAccountingTemplateSheet(workbook, 'building');
      setDetectedSheets({ land: landSheet, building: buildingSheet });

      if (!landSheet && !buildingSheet) {
        throw new Error('لم يتمكن النظام من التعرف على ورقة الأراضي أو المباني، لا بالاسم ولا ببنية الأعمدة. تأكد من وجود أعمدة النموذج المعتمد ابتداءً من بيانات التعريف والتصنيف.');
      }

      let parsed: PreviewItem[] = [
        ...parseSheet(workbook, 'land', landSheet),
        ...parseSheet(workbook, 'building', buildingSheet),
      ];
      if (!parsed.length) throw new Error('تم التعرف على أوراق القالب، ولكن لا توجد سجلات بيانات قابلة للقراءة ابتداءً من الصف 8.');

      let reviewPrefix = '';
      if (buildingSheet) {
        setMessage('تم التعرف على ورقة المباني. جارٍ فحص اللون الأصفر الصريح FFFF00 في العمود U...');
        const yellowRows = await findExplicitYellowUsefulLifeRows(buffer, buildingSheet, workbook);
        if (yellowRows.size) {
          setMessage(`تم اكتشاف ${yellowRows.size.toLocaleString('ar-SA')} صفًا بعلامة U الصفراء. جارٍ تحميل دليل تصنيف وترميز الأصول المرجعي ومطابقة H:T كوحدة واحدة...`);
          const reference = await loadReferenceCatalog();
          setReferenceVersion(reference.versionLabel);
          const reconciled = reconcileYellowBuildingClassifications(parsed, yellowRows, reference.classifications, reference.usefulLives);
          parsed = reconciled.items;
          setReviewSummary(reconciled.summary);
          reviewPrefix = `مراجعة الدليل «${reference.versionLabel}»: ${reconciled.summary.yellow.toLocaleString('ar-SA')} صف U أصفر؛ ${reconciled.summary.matched.toLocaleString('ar-SA')} مطابق H:T، ${reconciled.summary.corrected.toLocaleString('ar-SA')} صححه النظام كوحدة واحدة، ${reconciled.summary.usefulLifeAdjusted.toLocaleString('ar-SA')} صُحح عمره الإنتاجي، ويتبقى ${reconciled.summary.unresolved.toLocaleString('ar-SA')} يحتاج مراجعة.`;
        } else if (/\.xls$/i.test(file.name) && !/\.xlsx$/i.test(file.name)) {
          reviewPrefix = 'تنبيه: الملف بصيغة XLS القديمة ولم يتم رصد علامة U الصفراء بشكل موثوق. يوصى بحفظ الملف بصيغة XLSX لتمكين فحص FFFF00.';
        } else {
          reviewPrefix = 'لم يتم رصد خلايا U ذات اللون الأصفر الصريح FFFF00 في ورقة المباني؛ لم تُطبق معالجة H:T المرجعية.';
        }
      }

      setItems(parsed);
      setFileName(file.name);
      setMessage('اكتملت المعالجة المرجعية. جارٍ الآن مقارنة السجلات مع دورة البيانات السابقة...');
      const preview = await refreshScan(parsed, file.name);
      setMessage(`${reviewPrefix} ${comparisonMessage(preview)}`.trim());
      toast.success(`تمت قراءة وفحص ${parsed.length.toLocaleString('ar-SA')} سجل`);
    } catch (error) {
      setItems([]);
      setFileName('');
      setScan(null);
      setReviewSummary(null);
      setReferenceVersion('');
      setMessage('');
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف Excel');
    } finally {
      setParsing(false);
    }
  };

  const performImport = async () => {
    if (importing || scanning) return;
    if (currentUnresolvedRows.length) {
      toast.error(`لا يمكن استيراد هذه الدفعة قبل مراجعة ${currentUnresolvedRows.length.toLocaleString('ar-SA')} صف معلّم باللون الأصفر. النظام لا يخمّن التصنيف أو العمر الإنتاجي.`);
      return;
    }
    if (!currentFreshRows.length) return;

    const confirmed = window.confirm(
      `سيتم حفظ ${currentFreshRows.length.toLocaleString('ar-SA')} سجل من ${batchLabel} داخل دورة التحديث الجديدة.\n\n` +
      'صفوف U الصفراء التي اجتازت المراجعة تم توحيد H:T فيها من نفس سجل الدليل المرجعي، وتم فحص U بشكل مستقل. سيبقى الإصدار السابق محفوظًا. هل ترغب بالمتابعة؟'
    );
    if (!confirmed) return;

    setImporting(true);
    setResult(null);
    try {
      if (!selectedCycleId) throw new Error('لم يتم تحديد دورة التحديث');
      const response = await importAccountingTransformationCycleRecords(selectedCycleId, currentFreshRows.map(stripSource), fileName || undefined);
      setResult(response);
      toast.success(`اكتملت ${batchLabel}: ${response.created.toLocaleString('ar-SA')} سجل أضيف إلى الإصدار الجديد`);
      const preview = await refreshScan(items, fileName);
      setMessage(comparisonMessage(preview));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استيراد السجلات');
    } finally {
      setImporting(false);
    }
  };

  const newIndexSet = useMemo(() => new Set(scan?.newIndexes || []), [scan]);
  const modifiedIndexSet = useMemo(() => new Set(scan?.modifiedIndexes || []), [scan]);
  const unchangedIndexSet = useMemo(() => new Set(scan?.unchangedIndexes || []), [scan]);

  const statusForIndex = (index: number) => {
    if (duplicateIndexSet.has(index)) return { label: 'مدخل بالدورة', className: 'border-amber-300 bg-amber-50 text-amber-800' };
    if (invalidIndexSet.has(index)) return { label: 'غير صالح', className: 'border-red-300 bg-red-50 text-red-700' };
    if (modifiedIndexSet.has(index)) return { label: 'معدل', className: 'border-sky-300 bg-sky-50 text-sky-800' };
    if (unchangedIndexSet.has(index)) return { label: 'بدون تغيير', className: 'border-slate-300 bg-slate-50 text-slate-700' };
    if (newIndexSet.has(index)) return { label: 'جديد', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
    return { label: 'جاهز', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
  };

  return (
    <div className="mx-auto w-full max-w-[1550px] space-y-5 p-1 pb-10 sm:p-3 md:p-5" dir="rtl">
      <section className="flex flex-col gap-4 rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)] md:flex-row md:items-center md:justify-between">
        <div>
          <Badge variant="outline" className="mb-2">لجنة متابعة متطلبات التحول المحاسبي</Badge>
          <h1 className="text-2xl font-black text-slate-900 md:text-3xl">استيراد دورة تحديث جديدة</h1>
          <p className="mt-1 text-sm text-slate-500">يتعرف النظام على أوراق القالب، يراجع صفوف U الصفراء، ويوحّد H:T من الدليل المرجعي قبل مقارنة الإصدار الجديد بالسابق.</p>
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
            <Button variant="outline" onClick={() => navigate('/accounting-transformation/cycles')}><PlusCircle className="ml-2 h-4 w-4" />{cycles.length ? 'إدارة الدورات' : 'سجل الدورات'}</Button>
          </div>
          {selectedCycle && <p className="rounded-xl border border-cyan-200 bg-white/80 px-4 py-3 text-xs text-slate-600">سيتم حفظ البيانات في: <strong>#{selectedCycle.cycleNumber} — {selectedCycle.name}</strong>. لن تصبح هذه البيانات رسمية حتى اعتماد الدورة.</p>}
          {!cyclesLoading && !cycles.length && canCreateCycle && <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <div className="mb-3"><p className="font-black text-amber-950">يلزم إنشاء دورة تحديث قبل اختيار ملف Excel</p><p className="mt-1 text-xs leading-6 text-amber-800">أنشئ الدورة هنا مرة واحدة، وبعدها سيتفعّل اختيار الملف تلقائيًا دون مغادرة الصفحة.</p></div>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="text-xs font-bold text-slate-700">اسم الدورة<Input id="accounting-cycle-name" value={cycleName} onChange={(event) => setCycleName(event.target.value)} placeholder="مثال: تحديث بيانات أغسطس 2026" className="mt-1 h-11 rounded-xl bg-white" /></label>
              <label className="text-xs font-bold text-slate-700">وصف مختصر<Input value={cycleDescription} onChange={(event) => setCycleDescription(event.target.value)} placeholder="مصدر البيانات أو سبب التحديث" className="mt-1 h-11 rounded-xl bg-white" /></label>
              <Button type="button" className="h-11 rounded-xl px-5" onClick={createDraftCycle} disabled={creatingCycle || !cycleName.trim()}>{creatingCycle ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <PlusCircle className="ml-2 h-4 w-4" />}{creatingCycle ? 'جاري الإنشاء...' : 'إنشاء الدورة والمتابعة'}</Button>
            </div>
          </div>}
          {!cyclesLoading && !cycles.length && !canCreateCycle && <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm font-bold text-amber-900">لا توجد دورة مسودة قابلة للاستيراد، ولا يملك حسابك صلاحية «إنشاء دورة جديدة».</div>}
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-yellow-300 bg-yellow-50/60">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[auto_1fr] lg:items-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-yellow-300 bg-[#FFFF00] text-slate-900 shadow-sm"><ShieldCheck className="h-6 w-6" /></div>
          <div><p className="font-black text-slate-900">قاعدة U الأصفر — FFFF00</p><p className="mt-1 text-sm leading-7 text-slate-700">في ورقة المباني: U أصفر ← تحديد الصف للمراجعة ← تحديد سجل واحد مؤكد من دليل التصنيف والترميز ← استبدال H:T بالكامل من نفس السجل المرجعي. بعد ذلك يُفحص U «العمر الإنتاجي» بصورة مستقلة مقابل العمر وحدوده المرجعية. لا يطبّق النظام مطابقة جزئية ولا تخمينًا عند الالتباس.</p></div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-dashed border-sky-300 bg-[linear-gradient(145deg,#fafeff,#eef9ff)] shadow-[0_9px_0_rgba(15,57,95,.05),0_16px_30px_rgba(15,42,70,.06)]">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-base"><UploadCloud className="h-5 w-5" />اختيار ملف التحول المحاسبي</CardTitle></CardHeader>
        <CardContent className="p-5">
          {selectedCycleId ? <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-sky-300/80 bg-white/75 px-5 py-10 text-center transition hover:bg-sky-50/80">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-sky-200 bg-sky-50 text-sky-700 shadow-sm"><FileSpreadsheet className="h-8 w-8" /></div>
            <h2 className="mt-4 text-lg font-black text-slate-900">اختر ملفًا واحدًا بصيغة XLSX أو XLS</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">يبحث النظام أولًا عن أسماء أوراق الأراضي والمباني، وإذا تغيّر الاسم يتعرف عليها من بنية الأعمدة. في XLSX يقرأ اللون الأصفر FFFF00 مباشرة من تنسيق الخلية U.</p>
            <span className="mt-4 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-sky-700">{parsing ? 'جاري تحليل الملف والمراجع...' : fileName || 'اضغط لاختيار XLSX / XLS'}</span>
            <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" disabled={parsing || importing} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; void chooseFile(file).finally(() => { input.value = ''; }); }} />
          </label> : <div className="rounded-[24px] border-2 border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center"><FileSpreadsheet className="mx-auto h-10 w-10 text-slate-400" /><h2 className="mt-3 font-black">أنشئ أو اختر دورة مسودة أولًا</h2></div>}
          {(message || scanning) && <div className="mt-3 flex items-start gap-2 rounded-2xl border bg-white/90 px-4 py-3 text-sm font-bold leading-7 text-slate-700">{scanning && <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin" />}{message || 'جاري فحص السجلات...'}</div>}
          {(detectedSheets.land || detectedSheets.building) && <div className="mt-3 flex flex-wrap gap-2 text-xs"><Badge variant="outline"><LandPlot className="ml-1 h-3.5 w-3.5" />الأراضي: {detectedSheets.land || 'غير موجودة'}</Badge><Badge variant="outline"><Building2 className="ml-1 h-3.5 w-3.5" />المباني: {detectedSheets.building || 'غير موجودة'}</Badge>{referenceVersion && <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">المرجع: {referenceVersion}</Badge>}</div>}
        </CardContent>
      </Card>

      {reviewSummary && <Card className={`rounded-[26px] ${reviewSummary.unresolved ? 'border-red-200 bg-red-50/45' : 'border-emerald-200 bg-emerald-50/45'}`}>
        <CardHeader><CardTitle className="flex items-center gap-2">{reviewSummary.unresolved ? <TriangleAlert className="h-5 w-5 text-red-700" /> : <ShieldCheck className="h-5 w-5 text-emerald-700" />}نتيجة مراجعة صفوف U الصفراء</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">U أصفر</p><p className="mt-1 text-2xl font-black">{reviewSummary.yellow.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-2xl border border-emerald-200 bg-white p-4"><p className="text-xs text-emerald-700">H:T مطابق</p><p className="mt-1 text-2xl font-black">{reviewSummary.matched.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-2xl border border-sky-200 bg-white p-4"><p className="text-xs text-sky-700">H:T تم تصحيحه</p><p className="mt-1 text-2xl font-black">{reviewSummary.corrected.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-2xl border border-sky-200 bg-white p-4"><p className="text-xs text-sky-700">U تم تصحيحه</p><p className="mt-1 text-2xl font-black">{reviewSummary.usefulLifeAdjusted.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-2xl border border-red-200 bg-white p-4"><p className="text-xs text-red-700">U يحتاج مراجعة</p><p className="mt-1 text-2xl font-black">{reviewSummary.usefulLifeNeedsReview.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-2xl border border-red-200 bg-white p-4"><p className="text-xs text-red-700">صفوف غير محسومة</p><p className="mt-1 text-2xl font-black">{reviewSummary.unresolved.toLocaleString('ar-SA')}</p></div>
        </CardContent>
      </Card>}

      {items.length > 0 && <>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[22px] border bg-white p-4"><p className="text-xs text-slate-500">إجمالي الملف</p><p className="mt-1 text-3xl font-black text-slate-900">{items.length.toLocaleString('ar-SA')}</p><p className="mt-1 text-[11px] text-slate-500">أراضٍ {lands.length.toLocaleString('ar-SA')} · مبانٍ {buildings.length.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4"><p className="text-xs text-emerald-700">جديد</p><p className="mt-1 text-3xl font-black text-emerald-900">{(scan?.new || 0).toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border border-sky-200 bg-sky-50/60 p-4"><p className="text-xs text-sky-700">تم تعديله</p><p className="mt-1 text-3xl font-black text-sky-900">{(scan?.modified || 0).toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border bg-slate-50 p-4"><p className="text-xs text-slate-600">بدون تغيير</p><p className="mt-1 text-3xl font-black text-slate-900">{(scan?.unchanged || 0).toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border border-amber-200 bg-amber-50/60 p-4"><p className="text-xs text-amber-700">لم يظهر بالتحديث</p><p className="mt-1 text-3xl font-black text-amber-900">{(scan?.removed || 0).toLocaleString('ar-SA')}</p></div>
        </div>

        <Card className="rounded-[24px] shadow-[0_7px_0_rgba(15,57,95,.05)]"><CardHeader><CardTitle>حجم الاستيراد التجريبي</CardTitle><p className="text-xs text-slate-500">يمكن تقسيم الملف إلى دفعات. أي دفعة تحتوي على صف U أصفر غير محسوم لن يسمح النظام باستيرادها.</p></CardHeader><CardContent className="grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr]">
          <label className="text-xs font-bold text-slate-600">عدد السجلات في كل دفعة<NativeSelect value={String(limitPerBatch)} onChange={(event) => { setLimitPerBatch(Number(event.target.value)); setBatchIndex(0); setResult(null); }} className="mt-1 h-11 rounded-xl">{IMPORT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value === 0 ? 'كل السجلات' : `${value} سجل`}</option>)}</NativeSelect></label>
          <div><p className="text-xs font-bold text-slate-600">الدفعة الحالية</p><div className="mt-1 flex items-center gap-2"><Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" disabled={batchIndex <= 0} onClick={() => { setBatchIndex((value) => Math.max(0, value - 1)); setResult(null); }}><ChevronRight className="h-4 w-4" /></Button><div className="flex h-11 flex-1 items-center justify-center rounded-xl border bg-white text-sm font-black">{batchLabel}</div><Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" disabled={batchIndex + 1 >= maxBatch} onClick={() => { setBatchIndex((value) => Math.min(maxBatch - 1, value + 1)); setResult(null); }}><ChevronLeft className="h-4 w-4" /></Button></div></div>
          <div className={`rounded-xl border p-3 ${currentUnresolvedRows.length ? 'border-red-200 bg-red-50' : 'bg-slate-50/70'}`}><p className="text-xs text-slate-500">الدفعة الحالية</p><p className="mt-1 text-sm font-black">{currentFreshRows.length.toLocaleString('ar-SA')} جاهز من {currentRows.length.toLocaleString('ar-SA')}</p>{currentUnresolvedRows.length > 0 && <p className="mt-1 text-xs font-bold text-red-700">{currentUnresolvedRows.length.toLocaleString('ar-SA')} صف معلّم يحتاج مراجعة ويمنع الاستيراد</p>}</div>
        </CardContent></Card>

        <Card className="rounded-[24px]"><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />معاينة الدفعة قبل الاستيراد</CardTitle></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[1280px] text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-right">حالة الدورة</th><th className="p-3 text-right">مراجعة H:T</th><th className="p-3 text-right">العمر U</th><th className="p-3 text-right">الورقة</th><th className="p-3 text-right">صف Excel</th><th className="p-3 text-right">رقم الأصل بالجهة</th><th className="p-3 text-right">وصف الأصل</th><th className="p-3 text-right">رمز T المرجعي</th><th className="p-3 text-right">العمر الحالي</th></tr></thead><tbody>{currentRows.slice(0, 15).map((item, localIndex) => {
            const globalIndex = batchRange.start + localIndex;
            const status = statusForIndex(globalIndex);
            const classification = classificationBadge(item);
            const life = usefulLifeBadge(item);
            return <tr key={`${item.recordType}-${item.sourceRow}-${globalIndex}`} className={item.classificationReviewStatus === 'needs_review' || item.usefulLifeReviewStatus === 'needs_review' ? 'border-t bg-red-50/35' : 'border-t'}>
              <td className="p-3"><Badge variant="outline" className={status.className}>{status.label}</Badge></td>
              <td className="p-3"><Badge variant="outline" className={classification.className}>{classification.label}</Badge>{item.classificationReviewMessage && <p className="mt-1 max-w-[260px] text-[10px] leading-4 text-red-700">{item.classificationReviewMessage}</p>}</td>
              <td className="p-3"><Badge variant="outline" className={life.className}>{life.label}</Badge>{item.usefulLifeReference && <p className="mt-1 max-w-[220px] text-[10px] text-slate-500">{item.usefulLifeReference}</p>}</td>
              <td className="p-3 font-bold">{ACCOUNTING_RECORD_TYPE_LABELS[item.recordType]}</td><td className="p-3">{item.sourceRow}</td><td className="p-3">{String(item.payload.E || '-')}</td><td className="max-w-[300px] truncate p-3">{String(item.payload.G || '-')}</td><td className="p-3 font-mono">{String(item.classificationReferenceCode || item.payload.T || '-')}</td><td className="p-3">{String(item.payload.U || '-')}</td>
            </tr>;
          })}</tbody></table></div>{currentRows.length > 15 && <p className="mt-3 text-xs text-slate-500">المعاينة تعرض أول 15 سجلًا من الدفعة الحالية وعددها {currentRows.length.toLocaleString('ar-SA')}.</p>}</CardContent></Card>

        <div className={`flex flex-col gap-3 rounded-[24px] border p-4 shadow-[0_7px_0_rgba(15,57,95,.05)] sm:flex-row sm:items-center sm:justify-between ${currentUnresolvedRows.length ? 'border-red-200 bg-red-50' : 'bg-white'}`}><div><p className="font-bold text-slate-900">{currentUnresolvedRows.length ? 'الاستيراد موقوف لهذه الدفعة حتى إكمال المراجعة' : currentFreshRows.length ? 'جاهز للحفظ داخل دورة التحديث' : 'لا توجد سجلات متبقية في هذه الدفعة'}</p><p className="mt-1 text-xs text-slate-500">التصنيف المرجعي لا يغيّر البيانات الرسمية مباشرة؛ النتيجة تحفظ في مسودة الدورة وتخضع للمراجعة والاعتماد.</p></div><Button disabled={importing || scanning || !currentFreshRows.length || currentUnresolvedRows.length > 0} className="rounded-2xl px-7" onClick={performImport}>{importing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UploadCloud className="ml-2 h-4 w-4" />}{currentUnresolvedRows.length ? 'توجد صفوف تحتاج مراجعة' : importing ? 'جاري الاستيراد...' : `استيراد ${currentFreshRows.length.toLocaleString('ar-SA')} سجل`}</Button></div>
      </>}

      {result && <Card className="rounded-[24px] border-emerald-200 bg-emerald-50/60"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-6 w-6 text-emerald-700" /><div><h3 className="font-black text-emerald-900">تمت عملية الاستيراد</h3><p className="mt-1 text-sm text-emerald-800">جديد: {result.created.toLocaleString('ar-SA')} — متجاوز: {result.skipped.toLocaleString('ar-SA')} — الإجمالي: {result.total.toLocaleString('ar-SA')}</p></div></div><Button variant="outline" className="rounded-2xl border-emerald-300 bg-white" onClick={() => navigate(selectedCycleId ? `/accounting-transformation/records?cycle=${encodeURIComponent(selectedCycleId)}` : '/accounting-transformation/records')}>عرض سجلات الدورة</Button></CardContent></Card>}
    </div>
  );
};
