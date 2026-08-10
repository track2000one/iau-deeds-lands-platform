import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { NativeSelect } from '../components/ui/native-select';
import { createAsset } from '../api/assets';
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

const isDuplicateError = (message: string) =>
  /unique|duplicate|مكرر|موجود مسبق|itemNumber|assetNumber|serialNumber/i.test(message);

export const AssetExcelImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [files, setFiles] = useState<ParsedAssetExcelFile[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [limitPerFile, setLimitPerFile] = useState<number>(25);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);

  const importRows = useMemo(() => {
    return files.flatMap((file) =>
      limitPerFile === 0 ? file.rows : file.rows.slice(0, limitPerFile)
    );
  }, [files, limitPerFile]);

  const handleFiles = async (selected: FileList | null) => {
    if (!selected?.length) return;
    const xlsxFiles = Array.from(selected).filter((file) => /\.xlsx$/i.test(file.name));
    if (!xlsxFiles.length) {
      setMessage('يرجى اختيار ملفات Excel بصيغة XLSX.');
      return;
    }

    setParsing(true);
    setResult(null);
    setMessage('جارٍ قراءة ملفات Excel والتعرف على بنية كل نموذج...');
    try {
      const parsed: ParsedAssetExcelFile[] = [];
      for (const file of xlsxFiles) {
        parsed.push(await parseOfficialAssetExcel(file));
      }
      setFiles(parsed);
      const total = parsed.reduce((sum, item) => sum + item.rows.length, 0);
      setMessage(`تم تحليل ${parsed.length} ملف بنجاح، وإيجاد ${total.toLocaleString('ar-SA')} سجل قابل للاستيراد.`);
    } catch (error: any) {
      setFiles([]);
      setMessage(error?.message || 'تعذر قراءة ملفات Excel.');
    } finally {
      setParsing(false);
    }
  };

  const importSelectedRows = async () => {
    if (!importRows.length || importing) return;

    const confirmed = window.confirm(
      `سيتم استيراد ${importRows.length.toLocaleString('ar-SA')} سجل إلى وحدة الأصول للاختبار.\n\n` +
      'السجلات المكررة سيتم تجاوزها تلقائيًا. هل ترغب بالمتابعة؟'
    );
    if (!confirmed) return;

    setImporting(true);
    setResult(null);
    setMessage('بدأ استيراد البيانات إلى قاعدة البيانات...');

    const state: ImportResult = {
      total: importRows.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    // Controlled concurrency to avoid overloading Railway/API when importing large files.
    const queue = [...importRows];
    const worker = async () => {
      while (queue.length) {
        const row = queue.shift() as ParsedAssetExcelRow | undefined;
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

    try {
      await Promise.all([worker(), worker(), worker()]);
      setResult({ ...state, errors: [...state.errors] });
      setMessage(
        `اكتمل الاستيراد: ${state.created.toLocaleString('ar-SA')} جديد، ` +
        `${state.skipped.toLocaleString('ar-SA')} مكرر تم تجاوزه، ` +
        `${state.failed.toLocaleString('ar-SA')} تعذر استيراده.`
      );
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
                  يفضل البدء بعدد محدود من كل ملف للتأكد من شكل البيانات في المنصة، ثم اختيار «كل السجلات» بعد اعتماد النتيجة.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-[minmax(260px,420px)_1fr] lg:items-end">
                <div>
                  <label className="mb-2 block text-xs font-bold">عدد السجلات من كل ملف</label>
                  <NativeSelect value={String(limitPerFile)} onChange={(e) => setLimitPerFile(Number(e.target.value))} disabled={importing}>
                    {IMPORT_LIMIT_OPTIONS.map((value) => (
                      <option key={value} value={value}>{value === 0 ? 'كل السجلات' : `${value} سجل`}</option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="rounded-2xl border bg-white/75 px-4 py-3 text-sm">
                  إجمالي ما سيتم إدخاله الآن: <strong>{importRows.length.toLocaleString('ar-SA')} سجل</strong>
                </div>
              </div>

              <Button className="h-12 w-full rounded-2xl" onClick={() => void importSelectedRows()} disabled={importing || importRows.length === 0}>
                {importing ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <UploadCloud className="ml-2 h-5 w-5" />}
                {importing ? 'جارٍ استيراد البيانات...' : 'استيراد البيانات إلى وحدة الأصول'}
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
              <div className="rounded-2xl border p-4"><div className="text-xs text-muted-foreground">مكرر / متجاوز</div><div className="mt-2 text-2xl font-black">{result.skipped.toLocaleString('ar-SA')}</div></div>
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

            <Button variant="outline" className="w-full" onClick={() => navigate('/assets/list')}>عرض الأصول المستوردة</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
