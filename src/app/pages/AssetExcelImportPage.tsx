import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { NativeSelect } from '../components/ui/native-select';
import { createAsset, getAssets } from '../api/assets';
import {
  ASSET_EXCEL_KIND_LABELS,
  parseOfficialAssetExcel,
  type ParsedAssetExcelFile,
  type ParsedAssetExcelRow,
} from '../../utils/assetExcelImport';

const IMPORT_LIMIT_OPTIONS = [10, 25, 50, 100, 250, 0] as const;

type ImportResult = {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type DuplicateScan = {
  total: number;
  duplicate: number;
  fresh: number;
};

const isDuplicateError = (message: string) =>
  /unique|duplicate|مكرر|موجود مسبق|مستخدم مسبق|فريد|رقم الصنف|itemNumber|assetNumber|serialNumber/i.test(message);

const cleanIdentifier = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^(?:-|--|0|غير متوفر|غير متاح|لا يوجد|n\/?a|null|undefined)$/i.test(text)) return '';
  return text;
};

const readPayloadValue = (row: ParsedAssetExcelRow, ...keys: string[]) => {
  const payload = (row.input.excelPayload || {}) as Record<string, unknown>;
  for (const key of keys) {
    const value = cleanIdentifier(payload[key]);
    if (value) return value;
  }
  return '';
};

const normalizeSourcePart = (value: unknown) => String(value ?? '').trim().toLowerCase();

const sourceKeys = (row: ParsedAssetExcelRow) => {
  const sheet = normalizeSourcePart(row.sourceSheet);
  const sourceRow = String(row.sourceRow);
  const keys = [`file:${normalizeSourcePart(row.sourceFile)}::${sheet}::${sourceRow}`];
  if (row.sourceFileHash) keys.unshift(`hash:${normalizeSourcePart(row.sourceFileHash)}::${sheet}::${sourceRow}`);
  return keys;
};

const existingSourceKeys = (asset: any) => {
  const payload = asset?.excelPayload as Record<string, unknown> | null | undefined;
  if (!payload) return [];
  const file = normalizeSourcePart(payload.__sourceFile);
  const hash = normalizeSourcePart(payload.__sourceFileHash);
  const sheet = normalizeSourcePart(payload.__sourceSheet);
  const row = String(payload.__sourceRow ?? '').trim();
  const keys: string[] = [];
  if (hash && sheet && row) keys.push(`hash:${hash}::${sheet}::${row}`);
  if (file && sheet && row) keys.push(`file:${file}::${sheet}::${row}`);
  return keys;
};

const buildDuplicateIndex = (existingList: any[]) => {
  const importedSources = new Set<string>();
  const serials = new Set<string>();
  const barcodes = new Set<string>();

  existingList.forEach((asset: any) => {
    existingSourceKeys(asset).forEach((key) => importedSources.add(key));
    const serial = cleanIdentifier(asset?.serialNumber).toLowerCase();
    const barcode = cleanIdentifier(asset?.barcode).toLowerCase();
    if (serial) serials.add(serial);
    if (barcode) barcodes.add(barcode);
  });

  return { importedSources, serials, barcodes };
};

const isKnownDuplicateRow = (row: ParsedAssetExcelRow, index: ReturnType<typeof buildDuplicateIndex>) => {
  if (sourceKeys(row).some((key) => index.importedSources.has(key))) return true;
  const serial = cleanIdentifier(row.input.serialNumber).toLowerCase();
  const barcode = cleanIdentifier(row.input.barcode).toLowerCase();
  if (serial && index.serials.has(serial)) return true;
  if (barcode && index.barcodes.has(barcode)) return true;
  return false;
};

const preferredImportedIdentifier = (row: ParsedAssetExcelRow) => {
  const serial = cleanIdentifier(row.input.serialNumber);
  const card = cleanIdentifier(row.input.cardNumber);
  const mof = readPayloadValue(
    row,
    'رقم الأصل الفريد في نظام وزارة المالية (الرقم التعريفي)',
    'Unique Asset Number in MoF system'
  );
  const entityUnique = readPayloadValue(
    row,
    'رقم الأصل الفريد بالجهة (الرقم المستخدم حاليا للأصل او الرقم تسلسلي)',
    'Unique Asset Number in the entity'
  );
  const existing = cleanIdentifier(row.input.itemNumber);

  // ملفات Excel المعتمدة تحتوي أحيانًا رقماً متكرراً في حقل "رقم الأصل الفريد بالجهة".
  // لذلك نفضّل الرقم التسلسلي/البطاقة/رقم وزارة المالية قبل استخدام ذلك الحقل.
  return serial || card || mof || entityUnique || existing || `XLS-${row.kind.toUpperCase()}-${row.sourceRow}`;
};

const makeUniqueIdentifier = (baseValue: string, row: ParsedAssetExcelRow, used: Set<string>) => {
  const base = cleanIdentifier(baseValue) || `XLS-${row.kind.toUpperCase()}-${row.sourceRow}`;
  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  const deterministic = `${base}-${row.sourceRow}`;
  if (!used.has(deterministic)) {
    used.add(deterministic);
    return deterministic;
  }

  let sequence = 2;
  while (used.has(`${deterministic}-${sequence}`)) sequence += 1;
  const value = `${deterministic}-${sequence}`;
  used.add(value);
  return value;
};

export const AssetExcelImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<ParsedAssetExcelFile[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [limitPerFile, setLimitPerFile] = useState<number>(25);
  const [batchIndex, setBatchIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicateScan, setDuplicateScan] = useState<DuplicateScan | null>(null);

  const maxBatch = useMemo(() => {
    if (limitPerFile === 0 || files.length === 0) return 1;
    const largestFile = Math.max(...files.map((file) => file.rows.length), 0);
    return Math.max(1, Math.ceil(largestFile / limitPerFile));
  }, [files, limitPerFile]);

  const importRows = useMemo(() => {
    if (limitPerFile === 0) return files.flatMap((file) => file.rows);
    const start = batchIndex * limitPerFile;
    const end = start + limitPerFile;
    return files.flatMap((file) => file.rows.slice(start, end));
  }, [files, limitPerFile, batchIndex]);

  const batchLabel = limitPerFile === 0
    ? 'كل السجلات'
    : `الدفعة ${Math.min(batchIndex + 1, maxBatch).toLocaleString('ar-SA')} من ${maxBatch.toLocaleString('ar-SA')}`;

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    const xlsxFiles = Array.from(selected).filter((file) => /\.xlsx$/i.test(file.name));
    if (!xlsxFiles.length) {
      setMessage('يرجى اختيار ملفات Excel بصيغة XLSX.');
      return;
    }

    setParsing(true);
    setBatchIndex(0);
    setResult(null);
    setDuplicateScan(null);
    setMessage('جارٍ قراءة ملفات Excel والتعرف على بنية كل نموذج...');
    try {
      const parsed: ParsedAssetExcelFile[] = [];
      for (const file of xlsxFiles) {
        parsed.push(await parseOfficialAssetExcel(file));
      }
      setFiles(parsed);
      const allRows = parsed.flatMap((item) => item.rows);
      const total = allRows.length;
      setMessage(`تم تحليل ${parsed.length} ملف بنجاح، وإيجاد ${total.toLocaleString('ar-SA')} سجل. جارٍ فحص التكرار مع بيانات المنصة...`);

      const existingAssets = await getAssets();
      const existingList = Array.isArray(existingAssets) ? existingAssets : [];
      const duplicateIndex = buildDuplicateIndex(existingList);
      let duplicate = 0;
      const seenSources = new Set(duplicateIndex.importedSources);
      const seenSerials = new Set(duplicateIndex.serials);
      const seenBarcodes = new Set(duplicateIndex.barcodes);

      for (const row of allRows) {
        const rowKeys = sourceKeys(row);
        const serial = cleanIdentifier(row.input.serialNumber).toLowerCase();
        const barcode = cleanIdentifier(row.input.barcode).toLowerCase();
        const repeated = rowKeys.some((key) => seenSources.has(key)) || (serial && seenSerials.has(serial)) || (barcode && seenBarcodes.has(barcode));
        if (repeated) {
          duplicate += 1;
          continue;
        }
        rowKeys.forEach((key) => seenSources.add(key));
        if (serial) seenSerials.add(serial);
        if (barcode) seenBarcodes.add(barcode);
      }

      const scan = { total, duplicate, fresh: Math.max(0, total - duplicate) };
      setDuplicateScan(scan);
      if (total > 0 && duplicate === total) {
        setMessage(`تم فحص الملف: جميع السجلات وعددها ${total.toLocaleString('ar-SA')} مكررة أو سبق استيرادها. لن تتم إضافة سجلات جديدة.`);
      } else {
        setMessage(`اكتمل فحص الملف: ${scan.fresh.toLocaleString('ar-SA')} سجل جديد، و${scan.duplicate.toLocaleString('ar-SA')} سجل مكرر/سبق استيراده.`);
      }
    } catch (error: any) {
      setFiles([]);
      setDuplicateScan(null);
      setMessage(error?.message || 'تعذر قراءة ملفات Excel.');
    } finally {
      setParsing(false);
    }
  };

  const importSelectedRows = async () => {
    if (!importRows.length || importing) return;

    const confirmed = window.confirm(
      `سيتم استيراد ${importRows.length.toLocaleString('ar-SA')} سجل من ${batchLabel} إلى وحدة الأصول للاختبار.\n\n` +
      'سيتم الحفاظ على رقم الصنف كحقل فريد، واستخدام أفضل رقم تعريفي متاح من ملف Excel عند وجود أرقام مكررة. السجلات التي سبق استيراد نفس صفها سيتم تجاوزها تلقائيًا. هل ترغب بالمتابعة؟'
    );
    if (!confirmed) return;

    setImporting(true);
    setResult(null);
    setMessage(`جارٍ مطابقة ${batchLabel} مع السجلات الحالية وتجهيز أرقام الأصناف الفريدة...`);

    const state: ImportResult = {
      total: importRows.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      const existingAssets = await getAssets();
      const existingList = Array.isArray(existingAssets) ? existingAssets : [];
      const duplicateIndex = buildDuplicateIndex(existingList);
      const importedSourceKeys = new Set(duplicateIndex.importedSources);
      const seenSerials = new Set(duplicateIndex.serials);
      const seenBarcodes = new Set(duplicateIndex.barcodes);
      const usedIdentifiers = new Set<string>();

      existingList.forEach((asset: any) => {
        [asset?.itemNumber, asset?.assetNumber, asset?.serialNumber, asset?.cardNumber]
          .map(cleanIdentifier)
          .filter(Boolean)
          .forEach((value) => usedIdentifiers.add(value));
      });

      const queue: ParsedAssetExcelRow[] = [];
      for (const row of importRows) {
        const rowKeys = sourceKeys(row);
        const serial = cleanIdentifier(row.input.serialNumber).toLowerCase();
        const barcode = cleanIdentifier(row.input.barcode).toLowerCase();
        const repeated = rowKeys.some((key) => importedSourceKeys.has(key)) || (serial && seenSerials.has(serial)) || (barcode && seenBarcodes.has(barcode));
        if (repeated) {
          state.skipped += 1;
          continue;
        }

        rowKeys.forEach((key) => importedSourceKeys.add(key));
        if (serial) seenSerials.add(serial);
        if (barcode) seenBarcodes.add(barcode);

        const preferred = preferredImportedIdentifier(row);
        const uniqueItemNumber = makeUniqueIdentifier(preferred, row, usedIdentifiers);
        const excelPayload = {
          ...((row.input.excelPayload || {}) as Record<string, unknown>),
          __platformImportedItemNumber: uniqueItemNumber,
          __sourcePreferredIdentifier: preferred,
          __importFingerprint: sourceKeys(row)[0],
        };

        queue.push({
          ...row,
          input: {
            ...row.input,
            itemNumber: uniqueItemNumber,
            excelPayload,
          },
        });
      }

      setResult({ ...state, errors: [...state.errors] });
      setMessage(`تمت المطابقة. سيتم إنشاء ${queue.length.toLocaleString('ar-SA')} سجل جديد، وتجاوز ${state.skipped.toLocaleString('ar-SA')} سجل سبق استيراده.`);

      const worker = async () => {
        while (queue.length) {
          const row = queue.shift();
          if (!row) return;
          try {
            await createAsset(row.input);
            state.created += 1;
          } catch (error: any) {
            const raw = String(error?.message || error || 'خطأ غير معروف');
            if (isDuplicateError(raw)) {
              state.skipped += 1;
            } else {
              state.failed += 1;
              if (state.errors.length < 20) {
                state.errors.push(`${row.sourceFile} / صف ${row.sourceRow}: ${raw}`);
              }
            }
          }
          setResult({ ...state, errors: [...state.errors] });
        }
      };

      await Promise.all([worker(), worker(), worker()]);
      setResult({ ...state, errors: [...state.errors] });
      const nextHint = state.created === 0 && state.failed === 0 && state.skipped === state.total && limitPerFile !== 0 && batchIndex + 1 < maxBatch
        ? ' هذه الدفعة سبق استيرادها بالكامل؛ استخدم «الدفعة التالية» لاستيراد سجلات جديدة.'
        : '';
      setMessage(
        `اكتمل الاستيراد: ${state.created.toLocaleString('ar-SA')} جديد، ` +
        `${state.skipped.toLocaleString('ar-SA')} مكرر/سبق استيراده، ` +
        `${state.failed.toLocaleString('ar-SA')} تعذر استيراده.${nextHint}`
      );
    } catch (error: any) {
      state.failed += 1;
      if (state.errors.length < 20) state.errors.push(String(error?.message || error || 'تعذر تجهيز الاستيراد.'));
      setResult({ ...state, errors: [...state.errors] });
      setMessage('تعذر تجهيز عملية الاستيراد. راجع الملاحظات أدناه.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 sm:space-y-6">
      <section className="rounded-[30px] border border-white/55 bg-white/70 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-2xl sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 text-xs font-bold text-emerald-700">وحدة الأصول • استيراد تجريبي</div>
            <h1 className="text-2xl font-black sm:text-3xl">استيراد بيانات ملفات Excel المعتمدة</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              هذه الصفحة تقرأ ملفات الأصول المعتمدة وتحوّل بياناتها إلى سجلات فعلية في وحدة الأصول مع حفظ كامل بيانات الصف الأصلي داخل الحقل المرجعي Excel Payload.
              لا يتم تعديل ملف Excel نفسه.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/assets')}>
            <ArrowRight className="ml-2 h-4 w-4" /> العودة إلى وحدة الأصول
          </Button>
        </div>
      </section>

      <Card className="rounded-[28px] border-white/55 bg-white/72 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            اختيار ملفات Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed bg-background/55 px-5 text-center transition hover:border-primary/45 hover:bg-primary/5">
            {parsing ? <Loader2 className="mb-3 h-9 w-9 animate-spin text-primary" /> : <FileSpreadsheet className="mb-3 h-9 w-9 text-emerald-600" />}
            <span className="font-extrabold">اختر ملفًا واحدًا أو عدة ملفات XLSX</span>
            <span className="mt-2 text-xs text-muted-foreground">
              يدعم: الآلات والمعدات، الأثاث، أصول النقل العام، البنية التحتية، الأصول غير الملموسة، والأراضي.
            </span>
            <input
              type="file"
              multiple
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={parsing || importing}
              onChange={(event) => void handleFiles(event.target.files)}
            />
          </label>

          {message && (
            <div className="rounded-2xl border bg-background/70 px-4 py-3 text-sm font-semibold">{message}</div>
          )}

          {duplicateScan && duplicateScan.total > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-white/80 p-4"><div className="text-xs text-muted-foreground">إجمالي سجلات الملف</div><div className="mt-1 text-2xl font-black">{duplicateScan.total.toLocaleString('ar-SA')}</div></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><div className="text-xs font-bold text-emerald-700">سجلات جديدة</div><div className="mt-1 text-2xl font-black text-emerald-700">{duplicateScan.fresh.toLocaleString('ar-SA')}</div></div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><div className="text-xs font-bold text-amber-800">مكرر / سبق استيراده</div><div className="mt-1 text-2xl font-black text-amber-800">{duplicateScan.duplicate.toLocaleString('ar-SA')}</div></div>
            </div>
          )}
        </CardContent>
      </Card>

      {files.length > 0 && (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {files.map((file) => (
              <Card key={`${file.fileName}-${file.sheetName}`} className="rounded-[24px] border-white/55 bg-white/72 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black">{file.fileName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">الورقة: {file.sheetName}</p>
                    </div>
                    <span className="shrink-0 rounded-full border bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      {ASSET_EXCEL_KIND_LABELS[file.kind]}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t pt-4">
                    <span className="text-sm text-muted-foreground">السجلات المكتشفة</span>
                    <span className="text-2xl font-black">{file.rows.length.toLocaleString('ar-SA')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card className="rounded-[28px] border-amber-200/80 bg-amber-50/55 shadow-sm">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div>
                <h2 className="font-black">حجم الاستيراد التجريبي</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  يفضل البدء بعدد محدود من كل ملف للتأكد من شكل البيانات في المنصة، ثم الانتقال بين الدفعات حتى اعتماد النتيجة، وبعدها يمكن اختيار «كل السجلات».
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
                <div>
                  <label className="mb-2 block text-xs font-bold">عدد السجلات من كل ملف</label>
                  <NativeSelect
                    value={String(limitPerFile)}
                    onChange={(e) => {
                      setLimitPerFile(Number(e.target.value));
                      setBatchIndex(0);
                      setResult(null);
                    }}
                    disabled={importing}
                  >
                    {IMPORT_LIMIT_OPTIONS.map((value) => (
                      <option key={value} value={value}>{value === 0 ? 'كل السجلات' : `${value} سجل`}</option>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold">الدفعة الحالية</label>
                  <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 px-0"
                      disabled={importing || limitPerFile === 0 || batchIndex <= 0}
                      onClick={() => {
                        setBatchIndex((value) => Math.max(0, value - 1));
                        setResult(null);
                      }}
                      title="الدفعة السابقة"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="flex h-10 items-center justify-center rounded-xl border bg-white/80 px-3 text-sm font-bold">
                      {batchLabel}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 px-0"
                      disabled={importing || limitPerFile === 0 || batchIndex + 1 >= maxBatch}
                      onClick={() => {
                        setBatchIndex((value) => Math.min(maxBatch - 1, value + 1));
                        setResult(null);
                      }}
                      title="الدفعة التالية"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-white/75 px-4 py-3 text-sm">
                  إجمالي ما سيتم إدخاله في {batchLabel}: <strong>{importRows.length.toLocaleString('ar-SA')} سجل</strong>
                </div>
              </div>

              <Button
                className="h-12 w-full rounded-2xl"
                onClick={() => void importSelectedRows()}
                disabled={importing || importRows.length === 0 || Boolean(duplicateScan && duplicateScan.total > 0 && duplicateScan.duplicate === duplicateScan.total)}
              >
                {importing ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <UploadCloud className="ml-2 h-5 w-5" />}
                {importing
                  ? 'جارٍ استيراد البيانات...'
                  : duplicateScan && duplicateScan.total > 0 && duplicateScan.duplicate === duplicateScan.total
                    ? 'جميع سجلات الملف مكررة — لا يوجد ما يُستورد'
                    : `استيراد ${batchLabel} إلى وحدة الأصول`}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      {result && (
        <Card className="rounded-[28px] border-white/55 bg-white/75 shadow-sm">
          <CardHeader><CardTitle>نتيجة الاستيراد</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl border p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="mt-2 text-2xl font-black">{result.total.toLocaleString('ar-SA')}</div></div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><div className="text-xs text-emerald-700">تمت الإضافة</div><div className="mt-2 flex items-center gap-2 text-2xl font-black text-emerald-700"><CheckCircle2 className="h-5 w-5" />{result.created.toLocaleString('ar-SA')}</div></div>
              <div className="rounded-2xl border p-4"><div className="text-xs text-muted-foreground">مكرر / سبق استيراده</div><div className="mt-2 text-2xl font-black">{result.skipped.toLocaleString('ar-SA')}</div></div>
              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4"><div className="text-xs text-red-700">تعذر</div><div className="mt-2 flex items-center gap-2 text-2xl font-black text-red-700"><XCircle className="h-5 w-5" />{result.failed.toLocaleString('ar-SA')}</div></div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4">
                <div className="mb-2 font-black text-red-800">أول الملاحظات التي تحتاج مراجعة</div>
                <ul className="space-y-1 text-xs leading-6 text-red-800">
                  {result.errors.map((error, index) => <li key={`${error}-${index}`}>• {error}</li>)}
                </ul>
              </div>
            )}

            {limitPerFile !== 0 && batchIndex + 1 < maxBatch && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  setBatchIndex((value) => Math.min(maxBatch - 1, value + 1));
                  setResult(null);
                  setMessage('تم الانتقال إلى الدفعة التالية. راجع العدد ثم ابدأ الاستيراد.');
                }}
              >
                الانتقال إلى الدفعة التالية
                <ChevronLeft className="mr-2 h-4 w-4" />
              </Button>
            )}

            <Button variant="outline" className="w-full" onClick={() => navigate('/assets/list')}>عرض الأصول المستوردة</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
