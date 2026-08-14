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
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { NativeSelect } from '../components/ui/native-select';
import {
  ACCOUNTING_FIELDS,
  ACCOUNTING_RECORD_TYPE_LABELS,
  excelColumnToIndex,
  isMeaningfulAccountingValue,
  type AccountingRecordType,
} from '../config/accountingTransformationFields';
import {
  getAccountingTransformationCycles,
  importAccountingTransformationCycleRecords,
  previewAccountingTransformationCycleImport,
  type AccountingTransformationImportPreview,
} from '../api/accountingTransformation';
import type { AccountingTransformationCycle, AccountingTransformationInput } from '../../types/accountingTransformation';

type PreviewItem = AccountingTransformationInput & { sourceRow: number };
type ImportResult = { created: number; updated: number; skipped: number; total: number; new?: number; modified?: number; unchanged?: number };

const IMPORT_LIMIT_OPTIONS = [10, 25, 50, 100, 250, 0] as const;
const normalizeSheetName = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const findTemplateSheet = (workbook: XLSX.WorkBook, type: AccountingRecordType) => {
  const names = workbook.SheetNames;
  if (type === 'land') {
    return names.find((name) => {
      const normalized = normalizeSheetName(name);
      return normalized.includes('الأراضي') || normalized.includes('land');
    });
  }
  return names.find((name) => {
    const normalized = normalizeSheetName(name);
    return normalized.includes('المباني') || normalized.includes('building');
  });
};

const inferOwnership = (type: AccountingRecordType, payload: Record<string, unknown>) => {
  const columns = type === 'land' ? ['X', 'Y', 'Z'] : ['W', 'X', 'Y'];
  return columns.some((column) => isMeaningfulAccountingValue(payload[column])) ? 'leased' as const : 'owned' as const;
};

const parseSheet = (workbook: XLSX.WorkBook, type: AccountingRecordType): PreviewItem[] => {
  const sheetName = findTemplateSheet(workbook, type);
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
    });
  }
  return output;
};

const stripSource = (item: PreviewItem): AccountingTransformationInput => {
  const { sourceRow: _sourceRow, ...input } = item;
  return input;
};

export const AccountingTransformationImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  const currentFreshRows = useMemo(
    () => items.filter((_, index) => index >= batchRange.start && index < batchRange.end && freshIndexSet.has(index)),
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
      setMessage(`نتيجة المقارنة مع الدورة السابقة: ${(preview.new || 0).toLocaleString('ar-SA')} جديد، ${(preview.modified || 0).toLocaleString('ar-SA')} معدل، ${(preview.unchanged || 0).toLocaleString('ar-SA')} بدون تغيير، ${(preview.removed || 0).toLocaleString('ar-SA')} لم يظهر في الملف الجديد${preview.duplicate ? `، و${preview.duplicate.toLocaleString('ar-SA')} سبق إدخاله في هذه الدورة` : ''}.`);
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
    setBatchIndex(0);
    setMessage('جاري قراءة ملف Excel والتعرف على ورقتي الأراضي والمباني...');
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const landSheet = findTemplateSheet(workbook, 'land');
      const buildingSheet = findTemplateSheet(workbook, 'building');
      if (!landSheet && !buildingSheet) throw new Error('لم يتم العثور على ورقتي الأراضي أو المباني في القالب. تأكد من استخدام نموذج التحول المحاسبي المعتمد.');
      const parsed = [...parseSheet(workbook, 'land'), ...parseSheet(workbook, 'building')];
      if (!parsed.length) throw new Error('تم العثور على القالب، ولكن لا توجد سجلات بيانات ابتداءً من الصف 8.');
      setItems(parsed);
      setFileName(file.name);
      setMessage(`تم تحليل الملف وإيجاد ${parsed.length.toLocaleString('ar-SA')} سجل. جارٍ فحص التكرار مع بيانات المنصة...`);
      await refreshScan(parsed, file.name);
      toast.success(`تمت قراءة وفحص ${parsed.length.toLocaleString('ar-SA')} سجل`);
    } catch (error) {
      setItems([]);
      setFileName('');
      setScan(null);
      setMessage('');
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف Excel');
    } finally {
      setParsing(false);
    }
  };

  const performImport = async () => {
    if (!currentFreshRows.length || importing) return;
    const confirmed = window.confirm(
      `سيتم حفظ ${currentFreshRows.length.toLocaleString('ar-SA')} سجل من ${batchLabel} داخل دورة التحديث الجديدة.\n\n` +
      'سيحتفظ النظام بالنسخة السابقة كاملة، وسيصنف السجلات إلى جديد أو معدل أو بدون تغيير. هل ترغب بالمتابعة؟'
    );
    if (!confirmed) return;

    setImporting(true);
    setResult(null);
    try {
      if (!selectedCycleId) throw new Error('لم يتم تحديد دورة التحديث');
      const response = await importAccountingTransformationCycleRecords(selectedCycleId, currentFreshRows.map(stripSource), fileName || undefined);
      setResult(response);
      toast.success(`اكتملت ${batchLabel}: ${response.created.toLocaleString('ar-SA')} سجل أضيف إلى الإصدار الجديد`);
      await refreshScan(items, fileName);
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
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="flex flex-col gap-4 rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)] md:flex-row md:items-center md:justify-between">
        <div><Badge variant="outline" className="mb-2">لجنة متابعة متطلبات التحول المحاسبي</Badge><h1 className="text-2xl font-black text-slate-900 md:text-3xl">استيراد دورة تحديث جديدة</h1><p className="mt-1 text-sm text-slate-500">الملف الجديد لا يستبدل البيانات القديمة؛ يُحفظ في دورة مستقلة ويُقارن بالإصدار السابق قبل الاعتماد.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation/cycles')}>دورات البيانات</Button><Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation')}><ArrowRight className="ml-2 h-4 w-4" />العودة للوحة اللجنة</Button></div>
      </section>

      <Card className="rounded-[24px] border-cyan-200 bg-cyan-50/50"><CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-end"><label className="text-xs font-bold text-slate-600">دورة التحديث المستهدفة<NativeSelect value={selectedCycleId} disabled={cyclesLoading || !cycles.length} onChange={(e) => { setSelectedCycleId(e.target.value); setItems([]); setScan(null); setResult(null); setFileName(''); setMessage(''); }} className="mt-1 h-11 rounded-xl bg-white">{cycles.length ? cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name} (مسودة)</option>) : <option value="">لا توجد دورة مسودة قابلة للاستيراد</option>}</NativeSelect></label><Button variant="outline" onClick={() => navigate('/accounting-transformation/cycles')}><PlusCircle className="ml-2 h-4 w-4" />{cycles.length ? 'إدارة الدورات' : 'إنشاء دورة جديدة'}</Button>{selectedCycle && <p className="md:col-span-2 text-xs text-slate-600">سيتم حفظ البيانات في: <strong>#{selectedCycle.cycleNumber} — {selectedCycle.name}</strong>. لن تصبح هذه البيانات رسمية حتى اعتماد الدورة.</p>}</CardContent></Card>

      <Card className="rounded-[28px] border-dashed border-sky-300 bg-[linear-gradient(145deg,#fafeff,#eef9ff)] shadow-[0_9px_0_rgba(15,57,95,.05),0_16px_30px_rgba(15,42,70,.06)]">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-base"><UploadCloud className="h-5 w-5" />اختيار ملف التحول المحاسبي</CardTitle></CardHeader>
        <CardContent className="p-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-sky-300/80 bg-white/75 px-5 py-10 text-center transition hover:bg-sky-50/80">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-sky-200 bg-sky-50 text-sky-700 shadow-sm"><FileSpreadsheet className="h-8 w-8" /></div>
            <h2 className="mt-4 text-lg font-black text-slate-900">اختر ملفًا واحدًا بصيغة XLSX أو XLS</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">سيتم التعرف تلقائيًا على ورقتي <strong>الأراضي - Land</strong> و<strong>Building - المباني</strong>، ثم فحص السجلات قبل إدخال أي بيانات.</p>
            <span className="mt-4 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-sky-700">{parsing ? 'جاري تحليل الملف...' : fileName || 'XLSX / XLS'}</span>
            <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" disabled={parsing || importing || !selectedCycleId} onChange={(event) => chooseFile(event.target.files?.[0])} />
          </label>
          {(message || scanning) && <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl border bg-white/85 px-4 py-3 text-sm font-bold text-slate-700">{scanning && <Loader2 className="h-4 w-4 animate-spin" />}{message || 'جاري فحص السجلات...'}</div>}
        </CardContent>
      </Card>

      {items.length > 0 && <>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[22px] border bg-white p-4"><p className="text-xs text-slate-500">إجمالي الملف</p><p className="mt-1 text-3xl font-black text-slate-900">{items.length.toLocaleString('ar-SA')}</p><p className="mt-1 text-[11px] text-slate-500">أراضٍ {lands.length.toLocaleString('ar-SA')} · مبانٍ {buildings.length.toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-4"><p className="text-xs text-emerald-700">جديد</p><p className="mt-1 text-3xl font-black text-emerald-900">{(scan?.new || 0).toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border border-sky-200 bg-sky-50/60 p-4"><p className="text-xs text-sky-700">تم تعديله</p><p className="mt-1 text-3xl font-black text-sky-900">{(scan?.modified || 0).toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border bg-slate-50 p-4"><p className="text-xs text-slate-600">بدون تغيير</p><p className="mt-1 text-3xl font-black text-slate-900">{(scan?.unchanged || 0).toLocaleString('ar-SA')}</p></div>
          <div className="rounded-[22px] border border-amber-200 bg-amber-50/60 p-4"><p className="text-xs text-amber-700">لم يظهر بالتحديث الجديد</p><p className="mt-1 text-3xl font-black text-amber-900">{(scan?.removed || 0).toLocaleString('ar-SA')}</p></div>
        </div>

        <Card className="rounded-[24px] shadow-[0_7px_0_rgba(15,57,95,.05)]"><CardHeader><CardTitle>حجم الاستيراد التجريبي</CardTitle><p className="text-xs text-slate-500">يفضل البدء بعدد محدود للتأكد من شكل البيانات، ثم الانتقال بين الدفعات حتى اعتماد النتيجة.</p></CardHeader><CardContent className="grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr]">
          <label className="text-xs font-bold text-slate-600">عدد السجلات في كل دفعة<NativeSelect value={String(limitPerBatch)} onChange={(e) => { setLimitPerBatch(Number(e.target.value)); setBatchIndex(0); setResult(null); }} className="mt-1 h-11 rounded-xl">{IMPORT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value === 0 ? 'كل السجلات' : `${value} سجل`}</option>)}</NativeSelect></label>
          <div><p className="text-xs font-bold text-slate-600">الدفعة الحالية</p><div className="mt-1 flex items-center gap-2"><Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" disabled={batchIndex <= 0} onClick={() => { setBatchIndex((v) => Math.max(0, v - 1)); setResult(null); }}><ChevronRight className="h-4 w-4" /></Button><div className="flex h-11 flex-1 items-center justify-center rounded-xl border bg-white text-sm font-black text-slate-800">{batchLabel}</div><Button type="button" variant="outline" size="icon" className="h-11 w-11 rounded-xl" disabled={batchIndex + 1 >= maxBatch} onClick={() => { setBatchIndex((v) => Math.min(maxBatch - 1, v + 1)); setResult(null); }}><ChevronLeft className="h-4 w-4" /></Button></div></div>
          <div className="rounded-xl border bg-slate-50/70 p-3"><p className="text-xs text-slate-500">الدفعة الحالية</p><p className="mt-1 text-sm font-black text-slate-900">{currentFreshRows.length.toLocaleString('ar-SA')} جاهز للإدخال من {currentRows.length.toLocaleString('ar-SA')} سجل</p><p className="mt-1 text-[11px] text-slate-500">من سجل {(batchRange.start + 1).toLocaleString('ar-SA')} إلى {batchRange.end.toLocaleString('ar-SA')}</p></div>
        </CardContent></Card>

        <Card className="rounded-[24px]"><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />معاينة الدفعة قبل الاستيراد</CardTitle></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[980px] text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-right">الحالة</th><th className="p-3 text-right">الورقة</th><th className="p-3 text-right">صف Excel</th><th className="p-3 text-right">رقم الأصل بالجهة</th><th className="p-3 text-right">وصف الأصل</th><th className="p-3 text-right">المنطقة</th><th className="p-3 text-right">المدينة</th><th className="p-3 text-right">الملكية</th></tr></thead><tbody>{currentRows.slice(0, 12).map((item, localIndex) => { const globalIndex = batchRange.start + localIndex; const status = statusForIndex(globalIndex); return <tr key={`${item.recordType}-${item.sourceRow}-${globalIndex}`} className="border-t"><td className="p-3"><Badge variant="outline" className={status.className}>{status.label}</Badge></td><td className="p-3 font-bold">{ACCOUNTING_RECORD_TYPE_LABELS[item.recordType]}</td><td className="p-3">{item.sourceRow}</td><td className="p-3">{String(item.payload.E || '-')}</td><td className="max-w-[330px] truncate p-3">{String(item.payload.G || '-')}</td><td className="p-3">{String(item.payload[item.recordType === 'land' ? 'AB' : 'AL'] || '-')}</td><td className="p-3">{String(item.payload[item.recordType === 'land' ? 'AC' : 'AM'] || '-')}</td><td className="p-3">{item.ownershipMode === 'leased' ? 'مستأجر' : 'مملوك'}</td></tr>; })}</tbody></table></div>{currentRows.length > 12 && <p className="mt-3 text-xs text-slate-500">المعاينة تعرض أول 12 سجلًا من الدفعة الحالية وعددها {currentRows.length.toLocaleString('ar-SA')}.</p>}</CardContent></Card>

        <div className="flex flex-col gap-3 rounded-[24px] border bg-white p-4 shadow-[0_7px_0_rgba(15,57,95,.05)] sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-900">{currentFreshRows.length ? 'جاهز للحفظ داخل دورة التحديث' : 'لا توجد سجلات متبقية في هذه الدفعة'}</p><p className="mt-1 text-xs text-slate-500">كل سجل يُحفظ كنسخة داخل الدورة الجديدة مع تصنيفه: جديد أو معدل أو بدون تغيير. الإصدار السابق يبقى محفوظًا.</p></div><Button disabled={importing || scanning || !currentFreshRows.length} className="rounded-2xl px-7" onClick={performImport}>{importing ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <UploadCloud className="ml-2 h-4 w-4" />}{importing ? 'جاري الاستيراد...' : `استيراد ${currentFreshRows.length.toLocaleString('ar-SA')} سجل`}</Button></div>
      </>}

      {result && <Card className="rounded-[24px] border-emerald-200 bg-emerald-50/60"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-6 w-6 text-emerald-700" /><div><h3 className="font-black text-emerald-900">تمت عملية الاستيراد</h3><p className="mt-1 text-sm text-emerald-800">جديد: {result.created.toLocaleString('ar-SA')} — متجاوز: {result.skipped.toLocaleString('ar-SA')} — الإجمالي: {result.total.toLocaleString('ar-SA')}</p></div></div><Button variant="outline" className="rounded-2xl border-emerald-300 bg-white" onClick={() => navigate(selectedCycleId ? `/accounting-transformation/records?cycle=${encodeURIComponent(selectedCycleId)}` : '/accounting-transformation/records')}>عرض سجلات الدورة</Button></CardContent></Card>}
    </div>
  );
};
