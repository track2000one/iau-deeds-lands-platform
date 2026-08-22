import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  PlusCircle,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
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

type ExtendedImportPreview = AccountingTransformationImportPreview & {
  cycleUpdate?: number;
  alreadyImported?: number;
  cycleUpdateIndexes?: number[];
  alreadyImportedIndexes?: number[];
};

type ImportScope = 'changes' | 'new' | 'modified' | 'manual' | 'sync';
type ViewFilter = 'all' | 'actionable' | 'new' | 'modified' | 'unchanged' | 'selected';

const IMPORT_LIMIT_OPTIONS = [50, 100, 250, 500, 0] as const;
const PREVIEW_PAGE_SIZE = 20;
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

const comparisonMessage = (previewInput: AccountingTransformationImportPreview) => {
  const preview = previewInput as ExtendedImportPreview;
  const notSupplied = preview.notSupplied ?? preview.removed ?? 0;
  const cycleUpdate = preview.cycleUpdate || 0;
  const alreadyImported = preview.alreadyImported || 0;
  const cycleText = cycleUpdate || alreadyImported
    ? ` داخل الدورة الحالية: ${cycleUpdate.toLocaleString('ar-SA')} يحتاج تحديثًا و${alreadyImported.toLocaleString('ar-SA')} موجود دون تغيير.`
    : preview.duplicate
      ? ` ويوجد ${preview.duplicate.toLocaleString('ar-SA')} سجل مكرر/مدخل مسبقًا.`
      : '';
  return `مقارنة مع النسخة السابقة: ${(preview.new || 0).toLocaleString('ar-SA')} جديد، ${(preview.modified || 0).toLocaleString('ar-SA')} معدل، ${(preview.unchanged || 0).toLocaleString('ar-SA')} بدون تغيير، ${notSupplied.toLocaleString('ar-SA')} من النسخة السابقة لم يرد في الملف الحالي.${cycleText}`;
};

const sourceBadge = (item: PreviewItem) => item.recordType === 'fixed_asset'
  ? { label: `مخطط نموذج ب ${MODEL_B_VERSION}`, className: 'border-violet-300 bg-violet-50 text-violet-800' }
  : { label: 'مصدر Legacy مرتبط بنيويًا', className: 'border-sky-300 bg-sky-50 text-sky-800' };

const uniqueSorted = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

export const AccountingTransformationScopedImportPage: React.FC = () => {
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
  const [importScope, setImportScope] = useState<ImportScope>('changes');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('all');
  const [manualSelectedIndexes, setManualSelectedIndexes] = useState<Set<number>>(new Set());
  const [previewPage, setPreviewPage] = useState(0);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

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

  useEffect(() => { setPreviewPage(0); }, [viewFilter, importScope, scan]);

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
    setImportScope('changes');
    setViewFilter('all');
    setManualSelectedIndexes(new Set());
    setPreviewPage(0);
    setImportProgress({ done: 0, total: 0 });
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

  const extendedScan = scan as ExtendedImportPreview | null;
  const freshIndexSet = useMemo(() => new Set(scan?.freshIndexes || []), [scan]);
  const duplicateIndexSet = useMemo(() => new Set(scan?.duplicateIndexes || []), [scan]);
  const invalidIndexSet = useMemo(() => new Set(scan?.invalidIndexes || []), [scan]);
  const newIndexSet = useMemo(() => new Set(scan?.newIndexes || []), [scan]);
  const modifiedIndexSet = useMemo(() => new Set(scan?.modifiedIndexes || []), [scan]);
  const unchangedIndexSet = useMemo(() => new Set(scan?.unchangedIndexes || []), [scan]);
  const cycleUpdateIndexSet = useMemo(() => new Set(extendedScan?.cycleUpdateIndexes || []), [scan]);
  const alreadyImportedIndexSet = useMemo(() => new Set(extendedScan?.alreadyImportedIndexes || []), [scan]);

  const actionableIndexes = useMemo(() => uniqueSorted(scan?.freshIndexes || []), [scan]);
  const changeIndexes = useMemo(
    () => actionableIndexes.filter((index) => newIndexSet.has(index) || modifiedIndexSet.has(index) || cycleUpdateIndexSet.has(index)),
    [actionableIndexes, newIndexSet, modifiedIndexSet, cycleUpdateIndexSet],
  );
  const newActionableIndexes = useMemo(() => actionableIndexes.filter((index) => newIndexSet.has(index)), [actionableIndexes, newIndexSet]);
  const modifiedActionableIndexes = useMemo(
    () => actionableIndexes.filter((index) => modifiedIndexSet.has(index) || cycleUpdateIndexSet.has(index)),
    [actionableIndexes, modifiedIndexSet, cycleUpdateIndexSet],
  );
  const validWorkbookIndexes = useMemo(
    () => items.map((_, index) => index).filter((index) => !invalidIndexSet.has(index)),
    [items, invalidIndexSet],
  );
  const manualActionableIndexes = useMemo(
    () => uniqueSorted([...manualSelectedIndexes].filter((index) => freshIndexSet.has(index))),
    [manualSelectedIndexes, freshIndexSet],
  );

  const scopeIndexes = useMemo(() => {
    if (importScope === 'new') return newActionableIndexes;
    if (importScope === 'modified') return modifiedActionableIndexes;
    if (importScope === 'manual') return manualActionableIndexes;
    if (importScope === 'sync') return validWorkbookIndexes;
    return changeIndexes;
  }, [importScope, newActionableIndexes, modifiedActionableIndexes, manualActionableIndexes, validWorkbookIndexes, changeIndexes]);

  const expectedActionableIndexes = useMemo(
    () => scopeIndexes.filter((index) => freshIndexSet.has(index)),
    [scopeIndexes, freshIndexSet],
  );
  const expectedDraftUpdates = useMemo(
    () => expectedActionableIndexes.filter((index) => cycleUpdateIndexSet.has(index)).length,
    [expectedActionableIndexes, cycleUpdateIndexSet],
  );
  const expectedAdds = Math.max(0, expectedActionableIndexes.length - expectedDraftUpdates);
  const expectedNew = useMemo(() => expectedActionableIndexes.filter((index) => newIndexSet.has(index)).length, [expectedActionableIndexes, newIndexSet]);
  const expectedModified = useMemo(() => expectedActionableIndexes.filter((index) => modifiedIndexSet.has(index)).length, [expectedActionableIndexes, modifiedIndexSet]);
  const expectedUnchanged = useMemo(() => expectedActionableIndexes.filter((index) => unchangedIndexSet.has(index)).length, [expectedActionableIndexes, unchangedIndexSet]);
  const notSupplied = scan?.notSupplied ?? scan?.removed ?? 0;

  const viewIndexes = useMemo(() => {
    if (viewFilter === 'actionable') return actionableIndexes;
    if (viewFilter === 'new') return items.map((_, index) => index).filter((index) => newIndexSet.has(index));
    if (viewFilter === 'modified') return uniqueSorted(items.map((_, index) => index).filter((index) => modifiedIndexSet.has(index) || cycleUpdateIndexSet.has(index)));
    if (viewFilter === 'unchanged') return items.map((_, index) => index).filter((index) => unchangedIndexSet.has(index));
    if (viewFilter === 'selected') return scopeIndexes;
    return items.map((_, index) => index);
  }, [viewFilter, items, actionableIndexes, newIndexSet, modifiedIndexSet, cycleUpdateIndexSet, unchangedIndexSet, scopeIndexes]);

  const previewPageCount = Math.max(1, Math.ceil(viewIndexes.length / PREVIEW_PAGE_SIZE));
  const normalizedPreviewPage = Math.min(previewPage, previewPageCount - 1);
  const previewIndexes = viewIndexes.slice(normalizedPreviewPage * PREVIEW_PAGE_SIZE, (normalizedPreviewPage + 1) * PREVIEW_PAGE_SIZE);

  const executionBatchSize = limitPerBatch === 0 ? Math.max(1, scopeIndexes.length) : limitPerBatch;
  const executionBatchCount = expectedActionableIndexes.length
    ? Math.max(1, Math.ceil(scopeIndexes.length / executionBatchSize))
    : 0;

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
    setImportScope('changes');
    setViewFilter('all');
    setManualSelectedIndexes(new Set());
    setPreviewPage(0);
    setImportProgress({ done: 0, total: 0 });
    setMessage('جاري تجهيز الملف للتحليل في محرك مستقل؛ الصفحة ستبقى قابلة للاستجابة...');

    try {
      const [sourceBuffer, officialBuffer] = await Promise.all([file.arrayBuffer(), getOfficialTemplateBuffer()]);
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

      setMessage(`${intakeMessage} جارٍ مقارنة ${parsed.length.toLocaleString('ar-SA')} سجل مع الدورة السابقة والمسودة الحالية...`);
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

  const scopeTitle = importScope === 'changes'
    ? 'كل التغييرات'
    : importScope === 'new'
      ? 'السجلات الجديدة فقط'
      : importScope === 'modified'
        ? 'السجلات المعدلة فقط'
        : importScope === 'manual'
          ? 'السجلات المحددة يدويًا'
          : 'مزامنة كامل الملف';

  const performImport = async () => {
    if (importing || scanning || !expectedActionableIndexes.length) return;

    const reviewCount = importScope === 'sync' ? scopeIndexes.length : expectedActionableIndexes.length;
    const confirmation = [
      `نطاق التنفيذ: ${scopeTitle}.`,
      `سيتم فحص ${reviewCount.toLocaleString('ar-SA')} سجل وتنفيذ ${expectedActionableIndexes.length.toLocaleString('ar-SA')} إجراء فعلي متوقع: ${expectedAdds.toLocaleString('ar-SA')} إضافة و${expectedDraftUpdates.toLocaleString('ar-SA')} تحديث داخل المسودة.`,
      `مقارنة بالدورة السابقة ضمن النطاق: ${expectedNew.toLocaleString('ar-SA')} جديد، ${expectedModified.toLocaleString('ar-SA')} معدل، ${expectedUnchanged.toLocaleString('ar-SA')} بدون تغيير.`,
      `لن يتم حذف ${notSupplied.toLocaleString('ar-SA')} سجل لم يظهر في الملف الحالي، والسجلات المطابقة الموجودة في المسودة ستتخطاها المنصة تلقائيًا.`,
      '',
      'هل ترغب بالمتابعة؟',
    ].join('\n');
    if (!window.confirm(confirmation)) return;

    setImporting(true);
    setResult(null);
    setImportProgress({ done: 0, total: scopeIndexes.length });
    try {
      const indexesToSend = importScope === 'sync' ? scopeIndexes : expectedActionableIndexes;
      const batchSize = limitPerBatch === 0 ? Math.max(1, indexesToSend.length) : limitPerBatch;
      const totalResult: ImportResult = { created: 0, updated: 0, skipped: 0, total: 0, new: 0, modified: 0, unchanged: 0 };

      for (let start = 0; start < indexesToSend.length; start += batchSize) {
        const chunkIndexes = indexesToSend.slice(start, start + batchSize);
        const chunk = chunkIndexes.map((index) => stripSource(items[index]));
        const response = await importAccountingTransformationCycleRecords(selectedCycleId, chunk, fileName || undefined);
        totalResult.created += response.created;
        totalResult.updated += response.updated;
        totalResult.skipped += response.skipped;
        totalResult.total += response.total;
        totalResult.new = (totalResult.new || 0) + (response.new || 0);
        totalResult.modified = (totalResult.modified || 0) + (response.modified || 0);
        totalResult.unchanged = (totalResult.unchanged || 0) + (response.unchanged || 0);
        setImportProgress({ done: Math.min(indexesToSend.length, start + chunkIndexes.length), total: indexesToSend.length });
      }

      setResult(totalResult);
      toast.success(`اكتملت المصالحة: ${totalResult.created.toLocaleString('ar-SA')} إضافة و${totalResult.updated.toLocaleString('ar-SA')} تحديث داخل الدورة`);
      setManualSelectedIndexes(new Set());
      const refreshed = await refreshScan(items, fileName);
      setMessage(comparisonMessage(refreshed));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استيراد السجلات');
    } finally {
      setImporting(false);
      setImportProgress({ done: 0, total: 0 });
    }
  };

  const statusForIndex = (index: number) => {
    if (invalidIndexSet.has(index)) return { label: 'غير صالح', className: 'border-red-300 bg-red-50 text-red-700' };
    if (cycleUpdateIndexSet.has(index)) return { label: 'تحديث داخل الدورة', className: 'border-violet-300 bg-violet-50 text-violet-800' };
    if (alreadyImportedIndexSet.has(index)) return { label: 'موجود دون تغيير', className: 'border-slate-300 bg-slate-50 text-slate-700' };
    if (duplicateIndexSet.has(index)) return { label: 'مكرر', className: 'border-amber-300 bg-amber-50 text-amber-800' };
    if (modifiedIndexSet.has(index)) return { label: 'معدل عن السابق', className: 'border-sky-300 bg-sky-50 text-sky-800' };
    if (unchangedIndexSet.has(index)) return { label: 'بدون تغيير عن السابق', className: 'border-slate-300 bg-slate-50 text-slate-700' };
    if (newIndexSet.has(index)) return { label: 'جديد', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
    return { label: 'جاهز', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
  };

  const toggleManualIndex = (index: number) => {
    if (!freshIndexSet.has(index)) return;
    setManualSelectedIndexes((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
    setImportScope('manual');
  };

  const selectVisibleActionable = () => {
    const visible = previewIndexes.filter((index) => freshIndexSet.has(index));
    setManualSelectedIndexes((current) => new Set([...current, ...visible]));
    setImportScope('manual');
  };

  const mappedSheetCount = inspection
    ? modelBSheets.length + inspection.sheets.filter((sheet) => sheet.recordType && !modelBSheetNames.has(sheet.sheetName)).length
    : 0;
  const unmappedSheetCount = inspection ? Math.max(0, inspection.sheets.length - mappedSheetCount) : 0;
  const noActionableRows = Boolean(scan && !expectedActionableIndexes.length);

  const scopeCards: Array<{ id: ImportScope; title: string; count: number; hint: string; recommended?: boolean }> = [
    { id: 'changes', title: 'كل التغييرات', count: changeIndexes.length, hint: 'الجديد + المعدل + تحديثات المسودة', recommended: true },
    { id: 'new', title: 'الجديد فقط', count: newActionableIndexes.length, hint: 'إضافة السجلات غير الموجودة سابقًا' },
    { id: 'modified', title: 'المعدل فقط', count: modifiedActionableIndexes.length, hint: 'تحديث السجلات التي تغيرت' },
    { id: 'manual', title: 'تحديد يدوي', count: manualActionableIndexes.length, hint: 'اختيار سجلات بعينها من المعاينة' },
    { id: 'sync', title: 'مزامنة كامل الملف', count: validWorkbookIndexes.length, hint: 'Upsert كامل بدون حذف تلقائي' },
  ];

  const viewFilters: Array<{ id: ViewFilter; label: string; count: number }> = [
    { id: 'all', label: 'الكل', count: items.length },
    { id: 'actionable', label: 'قابل للتنفيذ', count: actionableIndexes.length },
    { id: 'new', label: 'جديد', count: scan?.new || 0 },
    { id: 'modified', label: 'معدل', count: uniqueSorted([...modifiedIndexSet, ...cycleUpdateIndexSet]).length },
    { id: 'unchanged', label: 'بدون تغيير', count: scan?.unchanged || 0 },
    { id: 'selected', label: 'النطاق المختار', count: scopeIndexes.length },
  ];

  return (
    <div className="mx-auto w-full max-w-[1550px] space-y-5 p-1 pb-10 sm:p-3 md:p-5" dir="rtl">
      <section className="flex flex-col gap-4 rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)] md:flex-row md:items-center md:justify-between">
        <div>
          <Badge variant="outline" className="mb-2">لجنة متابعة متطلبات التحول المحاسبي</Badge>
          <h1 className="text-2xl font-black text-slate-900 md:text-3xl">استيراد دورة تحديث جديدة</h1>
          <p className="mt-1 text-sm text-slate-500">اقرأ الملف كاملًا، راجع الفروقات، ثم اختر نطاق التنفيذ قبل حفظ أي تغيير في المسودة.</p>
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
            <p className="font-black text-slate-900">استيراد آمن وموجّه بالقرار</p>
            <p className="mt-1 text-sm leading-7 text-slate-700">الملف الوارد مصدر تحديث، وليس أمرًا بالاستبدال الكامل. المنصة تقارن الهوية والحقول أولًا، ثم تتيح اختيار الجديد أو المعدل أو جميع التغييرات أو تحديد سجلات بعينها. السجل الذي لم يظهر في الملف لا يُحذف تلقائيًا.</p>
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
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <button type="button" onClick={() => setViewFilter('all')} className="rounded-[22px] border bg-white p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-xs text-slate-500">سجلات مرتبطة</p><p className="mt-1 text-3xl font-black">{items.length.toLocaleString('ar-SA')}</p><p className="text-[11px] text-slate-500">نموذج ب {fixedAssets.length.toLocaleString('ar-SA')} · Legacy أراضٍ {lands.length.toLocaleString('ar-SA')} · مبانٍ {buildings.length.toLocaleString('ar-SA')}</p></button>
          <button type="button" onClick={() => setViewFilter('new')} className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-xs text-emerald-700">جديد عن السابق</p><p className="mt-1 text-3xl font-black">{(scan?.new || 0).toLocaleString('ar-SA')}</p></button>
          <button type="button" onClick={() => setViewFilter('modified')} className="rounded-[22px] border border-sky-200 bg-sky-50/60 p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-xs text-sky-700">معدل عن السابق</p><p className="mt-1 text-3xl font-black">{(scan?.modified || 0).toLocaleString('ar-SA')}</p></button>
          <button type="button" onClick={() => setViewFilter('actionable')} className="rounded-[22px] border border-violet-200 bg-violet-50/60 p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-xs text-violet-700">تحديث داخل المسودة</p><p className="mt-1 text-3xl font-black">{(extendedScan?.cycleUpdate || 0).toLocaleString('ar-SA')}</p></button>
          <button type="button" onClick={() => setViewFilter('unchanged')} className="rounded-[22px] border bg-slate-50 p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-xs">بدون تغيير</p><p className="mt-1 text-3xl font-black">{(scan?.unchanged || 0).toLocaleString('ar-SA')}</p></button>
          <div className="rounded-[22px] border border-amber-200 bg-amber-50/60 p-4"><p className="text-xs text-amber-700">من السابق لم يرد هنا</p><p className="mt-1 text-3xl font-black">{notSupplied.toLocaleString('ar-SA')}</p><p className="mt-1 text-[10px] text-amber-700">لا حذف تلقائي</p></div>
        </div>

        <Card className="rounded-[26px] border-sky-200 bg-[linear-gradient(135deg,#f8fcff,#eef8ff)] shadow-[0_10px_0_rgba(15,57,95,.04)]">
          <CardHeader className="border-b border-sky-100"><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-sky-700" />اختيار نطاق التحديث</CardTitle><p className="text-xs leading-6 text-slate-500">اختر ما تريد تنفيذه. الخيار الافتراضي «كل التغييرات» لا يعيد كتابة السجلات المطابقة، ولا يحذف ما لم يظهر في الملف.</p></CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{scopeCards.map((scope) => {
              const active = importScope === scope.id;
              return <button key={scope.id} type="button" onClick={() => setImportScope(scope.id)} className={`relative rounded-2xl border p-4 text-right transition ${active ? 'border-sky-500 bg-white shadow-[0_8px_20px_rgba(14,116,144,.14)] ring-2 ring-sky-100' : 'border-slate-200 bg-white/70 hover:border-sky-300 hover:bg-white'}`}>
                {scope.recommended && <Badge className="absolute left-3 top-3 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"><Sparkles className="ml-1 h-3 w-3" />موصى به</Badge>}
                <p className="text-sm font-black text-slate-900">{scope.title}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{scope.count.toLocaleString('ar-SA')}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{scope.hint}</p>
              </button>;
            })}</div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-black text-slate-900">النطاق الحالي: {scopeTitle}</p>
                <p className="mt-1 text-xs leading-6 text-slate-600">إجراءات فعلية متوقعة: <strong>{expectedActionableIndexes.length.toLocaleString('ar-SA')}</strong> · إضافات: <strong>{expectedAdds.toLocaleString('ar-SA')}</strong> · تحديث داخل المسودة: <strong>{expectedDraftUpdates.toLocaleString('ar-SA')}</strong> · جديد مقابل الدورة السابقة: <strong>{expectedNew.toLocaleString('ar-SA')}</strong> · معدل: <strong>{expectedModified.toLocaleString('ar-SA')}</strong>.</p>
                <p className="mt-1 text-[11px] text-amber-700">لن يتم حذف {notSupplied.toLocaleString('ar-SA')} سجل لم يظهر في الملف الحالي.</p>
              </div>
              {importScope === 'manual' && <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={selectVisibleActionable}><ListChecks className="ml-1 h-4 w-4" />تحديد الظاهر القابل للتنفيذ</Button><Button type="button" size="sm" variant="outline" onClick={() => setManualSelectedIndexes(new Set())}>إلغاء التحديد</Button></div>}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardHeader><CardTitle>تنفيذ النطاق على دفعات آمنة</CardTitle><p className="text-xs text-slate-500">يتم تنفيذ النطاق المختار كاملًا بضغطة واحدة، وتقسم المنصة الطلب داخليًا إلى دفعات للحفاظ على الاستقرار.</p></CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-[1fr_1fr_1.3fr] lg:items-end">
            <label className="text-xs font-bold">حجم دفعة التنفيذ<NativeSelect value={String(limitPerBatch)} onChange={(event) => setLimitPerBatch(Number(event.target.value))} className="mt-1 h-11">{IMPORT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value === 0 ? 'كل النطاق في طلب واحد' : `${value} سجل`}</option>)}</NativeSelect></label>
            <div className="rounded-xl border bg-slate-50 p-3"><p className="text-xs text-slate-500">عدد الدفعات المتوقعة</p><p className="mt-1 text-xl font-black">{executionBatchCount.toLocaleString('ar-SA')}</p></div>
            <div className={`rounded-xl border p-3 ${noActionableRows ? 'border-slate-200 bg-slate-50' : 'border-emerald-200 bg-emerald-50/50'}`}><p className="text-xs">قابل للتنفيذ فعليًا: <strong>{expectedActionableIndexes.length.toLocaleString('ar-SA')}</strong></p><p className="mt-1 text-[11px] text-slate-500">السجلات المطابقة الموجودة في المسودة يتم تجاوزها تلقائيًا.</p>{importing && importProgress.total > 0 && <div className="mt-2"><div className="mb-1 flex justify-between text-[10px] text-slate-500"><span>جاري التنفيذ</span><span>{importProgress.done.toLocaleString('ar-SA')} / {importProgress.total.toLocaleString('ar-SA')}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round(importProgress.done / importProgress.total * 100)}%` }} /></div></div>}</div>
          </CardContent>
        </Card>

        <Card className="rounded-[24px]">
          <CardHeader className="space-y-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><CardTitle>معاينة السجلات المرتبطة</CardTitle><p className="mt-1 text-xs text-slate-500">استخدم الفلاتر لعرض الجديد أو المعدل، أو انتقل إلى التحديد اليدوي من مربعات الاختيار.</p></div><div className="flex flex-wrap gap-1.5">{viewFilters.map((filter) => <Button key={filter.id} type="button" size="sm" variant={viewFilter === filter.id ? 'default' : 'outline'} onClick={() => setViewFilter(filter.id)}>{filter.label} ({filter.count.toLocaleString('ar-SA')})</Button>)}</div></div></CardHeader>
          <CardContent className="space-y-3">
            <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[1180px] text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-right">تحديد</th><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">المصدر</th><th className="p-3 text-right">النوع</th><th className="p-3 text-right">صف Excel</th><th className="p-3 text-right">رقم الأصل</th><th className="p-3 text-right">وصف الأصل</th><th className="p-3 text-right">طريقة الربط</th></tr></thead><tbody>{previewIndexes.map((globalIndex) => {
              const item = items[globalIndex];
              const status = statusForIndex(globalIndex);
              const source = sourceBadge(item);
              const number = item.recordType === 'fixed_asset' ? String(item.payload.Y || item.payload.Z || item.payload.AB || '-') : String(item.payload.E || item.payload.D || '-');
              const description = item.recordType === 'fixed_asset' ? String(item.payload.AA || '-') : String(item.payload.G || '-');
              const checked = manualSelectedIndexes.has(globalIndex);
              const selectable = freshIndexSet.has(globalIndex);
              return <tr key={`${item.sourceSheet}-${item.sourceRow}-${globalIndex}`} className={`border-t ${checked ? 'bg-sky-50/60' : ''}`}><td className="p-3"><input type="checkbox" checked={checked} disabled={!selectable} onChange={() => toggleManualIndex(globalIndex)} className="h-4 w-4 accent-sky-600" aria-label={`تحديد السجل ${globalIndex + 1}`} /></td><td className="p-3"><Badge variant="outline" className={status.className}>{status.label}</Badge></td><td className="p-3 font-bold">{item.sourceSheet}</td><td className="p-3">{recordTypeLabel(item.recordType)}</td><td className="p-3">{item.sourceRow}</td><td className="p-3">{number}</td><td className="max-w-[320px] truncate p-3">{description}</td><td className="p-3"><Badge variant="outline" className={source.className}>{source.label}</Badge></td></tr>;
            })}</tbody></table></div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">عرض {previewIndexes.length.toLocaleString('ar-SA')} من {viewIndexes.length.toLocaleString('ar-SA')} سجل ضمن الفلتر الحالي.</p><div className="flex items-center gap-2"><Button type="button" variant="outline" size="icon" disabled={normalizedPreviewPage <= 0} onClick={() => setPreviewPage((value) => Math.max(0, value - 1))}><ChevronRight className="h-4 w-4" /></Button><div className="min-w-[110px] text-center text-xs font-black">صفحة {(normalizedPreviewPage + 1).toLocaleString('ar-SA')} من {previewPageCount.toLocaleString('ar-SA')}</div><Button type="button" variant="outline" size="icon" disabled={normalizedPreviewPage + 1 >= previewPageCount} onClick={() => setPreviewPage((value) => Math.min(previewPageCount - 1, value + 1))}><ChevronLeft className="h-4 w-4" /></Button></div></div>
          </CardContent>
        </Card>

        <div className={`flex flex-col gap-3 rounded-[24px] border p-4 sm:flex-row sm:items-center sm:justify-between ${noActionableRows ? 'border-slate-200 bg-slate-50/80' : 'border-emerald-200 bg-white'}`}>
          <div>
            <p className="font-black">{noActionableRows ? 'لا توجد تغييرات متبقية ضمن النطاق المختار' : `جاهز للتنفيذ — ${scopeTitle}`}</p>
            <p className="mt-1 text-xs leading-6 text-slate-500">{noActionableRows ? 'غيّر نطاق التحديث أو اختر سجلات أخرى. السجلات المطابقة لا يعيد النظام إنشاءها.' : `سيتم تنفيذ ${expectedActionableIndexes.length.toLocaleString('ar-SA')} إجراء فعلي مع الحفاظ على النسخة السابقة حتى اعتماد الدورة.`}</p>
          </div>
          <Button disabled={importing || scanning || !expectedActionableIndexes.length} onClick={performImport} className="min-w-[220px]">{importing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : importScope === 'sync' ? <RefreshCcw className="ml-2 h-4 w-4" /> : <UploadCloud className="ml-2 h-4 w-4" />}{importing ? 'جاري تنفيذ النطاق...' : importScope === 'changes' ? `تنفيذ كل التغييرات — ${expectedActionableIndexes.length.toLocaleString('ar-SA')}` : importScope === 'new' ? `إضافة الجديد — ${expectedActionableIndexes.length.toLocaleString('ar-SA')}` : importScope === 'modified' ? `تحديث المعدل — ${expectedActionableIndexes.length.toLocaleString('ar-SA')}` : importScope === 'manual' ? `تنفيذ المحدد — ${expectedActionableIndexes.length.toLocaleString('ar-SA')}` : `مزامنة الملف — ${expectedActionableIndexes.length.toLocaleString('ar-SA')} إجراء`}</Button>
        </div>
      </>}

      {result && <Card className="rounded-[24px] border-emerald-200 bg-emerald-50/60"><CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><CheckCircle2 className="h-6 w-6 text-emerald-700" /><div><p className="font-black text-emerald-900">اكتملت المصالحة داخل الدورة</p><p className="text-sm text-emerald-800">أضيف: {result.created.toLocaleString('ar-SA')} · حُدّث: {result.updated.toLocaleString('ar-SA')} · بدون إجراء: {result.skipped.toLocaleString('ar-SA')} · الإجمالي المعالج: {result.total.toLocaleString('ar-SA')}</p></div></div><Button variant="outline" onClick={() => navigate(`/accounting-transformation/records?cycle=${encodeURIComponent(selectedCycleId)}`)}>عرض سجلات الدورة</Button></CardContent></Card>}
    </div>
  );
};
