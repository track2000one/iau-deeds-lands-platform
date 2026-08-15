import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Database, FileSpreadsheet, History, Loader2, PlusCircle, RefreshCw, ShieldCheck, UploadCloud, XCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  createAssetCycle,
  getAssetCycleComparison,
  getAssetCycles,
  importAssetCycleRows,
  type AssetCycleComparison,
  type AssetCycleImportRow,
  type AssetUpdateCycle,
} from '../api/assetCycles';
import {
  ASSET_EXCEL_KIND_LABELS,
  parseOfficialAssetExcel,
  type ParsedAssetExcelFile,
} from '../../utils/assetExcelImport';

const IMPORT_BATCH_SIZE = 200;

const statusLabel: Record<string, string> = {
  draft: 'مسودة',
  under_review: 'تحت المراجعة',
  approved: 'معتمدة',
  archived: 'مؤرشفة',
};

const SummaryCard = ({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'emerald' | 'amber' | 'sky' | 'rose' | 'slate' }) => {
  const styles = {
    emerald: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50/70 text-amber-800',
    sky: 'border-sky-200 bg-sky-50/70 text-sky-800',
    rose: 'border-rose-200 bg-rose-50/70 text-rose-800',
    slate: 'border-slate-200 bg-white/80 text-slate-800',
  } as const;
  return (
    <div className={`rounded-2xl border p-4 ${styles[tone]}`}>
      <div className="text-xs font-bold opacity-75">{label}</div>
      <div className="mt-2 text-2xl font-black">{Number(value || 0).toLocaleString('ar-SA')}</div>
    </div>
  );
};

export const AssetCycleImportPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestedCycleId = useMemo(() => new URLSearchParams(location.search).get('cycleId') || '', [location.search]);

  const [cycles, setCycles] = useState<AssetUpdateCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [creating, setCreating] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [cycleDescription, setCycleDescription] = useState('');
  const [files, setFiles] = useState<ParsedAssetExcelFile[]>([]);
  const [rows, setRows] = useState<AssetCycleImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [comparison, setComparison] = useState<AssetCycleComparison | null>(null);
  const [importStats, setImportStats] = useState({ created: 0, skipped: 0, invalid: 0 });

  const loadCycles = async () => {
    setLoadingCycles(true);
    try {
      const data = await getAssetCycles();
      setCycles(data);
      const draft = data.filter((cycle) => cycle.status === 'draft' && !cycle.isCurrent);
      const requested = draft.find((cycle) => cycle.id === requestedCycleId);
      const nextId = requested?.id || (selectedCycleId && draft.some((cycle) => cycle.id === selectedCycleId) ? selectedCycleId : draft[0]?.id || '');
      setSelectedCycleId(nextId);
      if (nextId) {
        const selected = data.find((cycle) => cycle.id === nextId);
        setComparison(selected?.comparison || null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل دورات تحديث الأصول');
    } finally {
      setLoadingCycles(false);
    }
  };

  useEffect(() => { void loadCycles(); }, [requestedCycleId]);

  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId) || null;
  const draftCycles = cycles.filter((cycle) => cycle.status === 'draft' && !cycle.isCurrent);

  const createCycle = async () => {
    if (cycleName.trim().length < 3) {
      toast.error('أدخل اسمًا واضحًا لدورة التحديث');
      return;
    }
    setCreating(true);
    try {
      const created = await createAssetCycle({ name: cycleName.trim(), description: cycleDescription.trim() || null });
      setCycleName('');
      setCycleDescription('');
      await loadCycles();
      setSelectedCycleId(created.id);
      toast.success('تم إنشاء دورة تحديث الأصول ويمكن الآن رفع ملفات Excel إليها');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء دورة التحديث');
    } finally {
      setCreating(false);
    }
  };

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length || !selectedCycleId) return;
    const xlsxFiles = Array.from(selected).filter((file) => /\.xlsx$/i.test(file.name));
    if (!xlsxFiles.length) {
      toast.error('يرجى اختيار ملفات Excel بصيغة XLSX');
      return;
    }
    setParsing(true);
    setFiles([]);
    setRows([]);
    setComparison(null);
    setImportStats({ created: 0, skipped: 0, invalid: 0 });
    setMessage('جارٍ قراءة ملفات Excel والتعرف على النماذج المعتمدة...');
    try {
      const parsed: ParsedAssetExcelFile[] = [];
      for (const file of xlsxFiles) parsed.push(await parseOfficialAssetExcel(file));
      const stagedRows: AssetCycleImportRow[] = parsed.flatMap((file) => file.rows.map((row) => ({
        input: row.input as unknown as Record<string, unknown>,
        sourceFile: row.sourceFile,
        sourceFileHash: row.sourceFileHash || null,
        sourceSheet: row.sourceSheet,
        sourceRow: row.sourceRow,
      })));
      setFiles(parsed);
      setRows(stagedRows);
      setMessage(`تم تحليل ${parsed.length.toLocaleString('ar-SA')} ملف وإيجاد ${stagedRows.length.toLocaleString('ar-SA')} سجل. الاستيراد التالي سيحفظها داخل مسودة الدورة فقط ولن يغيّر البيانات الحالية.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر قراءة ملفات Excel');
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملفات Excel');
    } finally {
      setParsing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const importIntoCycle = async () => {
    if (!selectedCycle || !rows.length || importing) return;
    if (!window.confirm(`سيتم حفظ ${rows.length.toLocaleString('ar-SA')} سجل داخل مسودة «${selectedCycle.name}» للمقارنة والمراجعة. لن تتغير بيانات الأصول الحالية قبل اعتماد الدورة. هل ترغب بالمتابعة؟`)) return;
    setImporting(true);
    setProgress(0);
    setImportStats({ created: 0, skipped: 0, invalid: 0 });
    setMessage('جارٍ حفظ البيانات داخل مسودة الدورة ومقارنتها بالدورة السابقة...');
    try {
      let created = 0;
      let skipped = 0;
      let invalid = 0;
      const fileNames = files.map((file) => file.fileName);
      for (let start = 0; start < rows.length; start += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(start, start + IMPORT_BATCH_SIZE);
        const result = await importAssetCycleRows(selectedCycle.id, batch, fileNames);
        created += result.created;
        skipped += result.skipped;
        invalid += result.invalid;
        setImportStats({ created, skipped, invalid });
        setProgress(Math.min(100, Math.round(((start + batch.length) / rows.length) * 100)));
      }
      const freshComparison = await getAssetCycleComparison(selectedCycle.id);
      setComparison(freshComparison);
      setMessage('اكتمل حفظ مسودة دورة الأصول. راجع ملخص التغييرات قبل إرسال الدورة للمراجعة والاعتماد.');
      toast.success('تم استيراد البيانات إلى مسودة دورة الأصول بنجاح');
      await loadCycles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استيراد البيانات إلى الدورة');
      setMessage(error instanceof Error ? error.message : 'تعذر استيراد البيانات إلى الدورة');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-8" dir="rtl">
      <Card className="overflow-hidden rounded-[30px] border-sky-200/70 bg-gradient-to-l from-slate-950 via-slate-900 to-sky-950 text-white shadow-[0_24px_70px_rgba(15,23,42,.22)]">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold">
                <ShieldCheck className="h-4 w-4" />
                استيراد آمن بنظام الإصدارات
              </div>
              <h1 className="text-3xl font-black">استيراد دورة تحديث جديدة للأصول</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                ملفات Excel تحفظ أولًا داخل دورة مستقلة، ثم تقارن بالبيانات السابقة. لا تصبح البيانات الحالية إلا بعد المراجعة والاعتماد.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate('/assets/cycles')}>
                <History className="ml-2 h-4 w-4" />سجل الدورات
              </Button>
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate('/assets')}>
                <ArrowRight className="ml-2 h-4 w-4" />لوحة الأصول
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-slate-200 bg-white/90 shadow-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-sky-700" />دورة التحديث المستهدفة</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {loadingCycles ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />جارٍ تحميل الدورات...</div>
          ) : draftCycles.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <select value={selectedCycleId} onChange={(event) => { setSelectedCycleId(event.target.value); setComparison(cycles.find((cycle) => cycle.id === event.target.value)?.comparison || null); }} className="h-11 rounded-xl border bg-white px-3 text-sm font-bold">
                {draftCycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name} — {statusLabel[cycle.status] || cycle.status}</option>)}
              </select>
              <Button variant="outline" onClick={() => void loadCycles()}><RefreshCw className="ml-2 h-4 w-4" />تحديث</Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm font-bold text-amber-900">لا توجد دورة مسودة مفتوحة. أنشئ دورة جديدة ثم ارفع الملفات إليها.</div>
          )}

          {!selectedCycleId && (
            <div className="grid gap-3 rounded-2xl border border-dashed border-sky-300 bg-sky-50/45 p-4 lg:grid-cols-2">
              <div><label className="mb-2 block text-xs font-bold">اسم دورة التحديث</label><Input value={cycleName} onChange={(event) => setCycleName(event.target.value)} placeholder="مثال: تحديث بيانات الأصول — أغسطس 2026" /></div>
              <div><label className="mb-2 block text-xs font-bold">وصف مختصر</label><Textarea value={cycleDescription} onChange={(event) => setCycleDescription(event.target.value)} className="min-h-10" placeholder="مصدر البيانات أو سبب التحديث" /></div>
              <Button className="lg:col-span-2" onClick={() => void createCycle()} disabled={creating}>{creating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <PlusCircle className="ml-2 h-4 w-4" />}إنشاء الدورة والمتابعة</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={`rounded-[28px] border bg-white/90 shadow-sm ${!selectedCycleId ? 'opacity-60' : ''}`}>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-700" />اختيار ملفات الأصول بصيغة XLSX</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <button type="button" disabled={!selectedCycleId || parsing || importing} onClick={() => inputRef.current?.click()} className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-sky-300 bg-gradient-to-b from-sky-50/70 to-white p-6 text-center transition hover:border-sky-500 disabled:cursor-not-allowed">
            {parsing ? <Loader2 className="mb-3 h-9 w-9 animate-spin text-sky-700" /> : <UploadCloud className="mb-3 h-10 w-10 text-sky-700" />}
            <div className="font-black">{selectedCycleId ? 'اضغط لاختيار ملف أو عدة ملفات Excel' : 'أنشئ دورة مسودة أولًا لتفعيل رفع الملفات'}</div>
            <div className="mt-2 text-xs text-muted-foreground">سيتم تحليل النماذج محليًا ثم حفظ السجلات في مسودة الدورة فقط.</div>
          </button>
          <input ref={inputRef} type="file" accept=".xlsx" multiple className="hidden" onChange={(event) => void handleFiles(event.target.files)} />

          {files.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {files.map((file) => (
                <div key={`${file.fileName}-${file.kind}`} className="rounded-2xl border bg-slate-50/70 p-4">
                  <div className="font-black">{file.fileName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{ASSET_EXCEL_KIND_LABELS[file.kind] || file.kind}</div>
                  <div className="mt-3 text-lg font-black">{file.rows.length.toLocaleString('ar-SA')} سجل</div>
                </div>
              ))}
            </div>
          )}

          {message && <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-7">{message}</div>}

          {rows.length > 0 && (
            <>
              {importing && <div className="overflow-hidden rounded-full bg-slate-200"><div className="h-2 bg-sky-600 transition-all" style={{ width: `${progress}%` }} /></div>}
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard label="تم حفظه في المسودة" value={importStats.created} tone="emerald" />
                <SummaryCard label="تم تجاوزه" value={importStats.skipped} tone="slate" />
                <SummaryCard label="يحتاج تصحيحًا" value={importStats.invalid} tone="rose" />
              </div>
              <Button className="h-12 w-full rounded-2xl" onClick={() => void importIntoCycle()} disabled={importing || !selectedCycleId}>
                {importing ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <UploadCloud className="ml-2 h-5 w-5" />}
                {importing ? `جارٍ الاستيراد إلى المسودة — ${progress}%` : `استيراد ${rows.length.toLocaleString('ar-SA')} سجل إلى مسودة الدورة`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {comparison && (
        <Card className="rounded-[28px] border-emerald-200/70 bg-white/90 shadow-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-700" />ملخص التغييرات مقارنة بالدورة السابقة</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
              <SummaryCard label="إجمالي الدورة" value={comparison.totalTarget} />
              <SummaryCard label="سجلات جديدة" value={comparison.new} tone="emerald" />
              <SummaryCard label="تم تعديلها" value={comparison.modified} tone="amber" />
              <SummaryCard label="بدون تغيير" value={comparison.unchanged} tone="sky" />
              <SummaryCard label="لم تظهر بالتحديث" value={comparison.removed} tone="rose" />
              <SummaryCard label="تحتاج مراجعة" value={comparison.needsReview} tone="amber" />
              <SummaryCard label="الدورة السابقة" value={comparison.totalBase} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/assets/cycles')}>الانتقال إلى المراجعة واعتماد الدورة</Button>
              <Button variant="outline" onClick={() => navigate('/assets/list')}>عرض البيانات الحالية دون تغيير</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedCycleId && !loadingCycles && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900"><XCircle className="h-5 w-5" />لن يسمح النظام برفع بيانات جديدة مباشرة إلى الأصول الحالية دون دورة تحديث.</div>
      )}
    </div>
  );
};
