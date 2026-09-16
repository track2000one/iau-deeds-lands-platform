import React, { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

type ExistingArchiveDocument = {
  documentNumber?: string;
  driveUrl?: string;
  title?: string;
};

export type ArchiveExcelImportPayload = {
  title: string;
  category: string;
  documentNumber: string;
  documentDate: string;
  documentDateType: 'gregorian' | 'hijri';
  issuingAuthority: string;
  confidentiality: 'public' | 'internal' | 'confidential';
  tags: string;
  description: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  driveUrl: string;
  driveFileId: string;
};

type ImportRow = ArchiveExcelImportPayload & {
  rowNumber: number;
  errors: string[];
  warnings: string[];
  duplicate: boolean;
  imported?: boolean;
  serverError?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingDocuments: ExistingArchiveDocument[];
  createArchiveDocument: (payload: ArchiveExcelImportPayload) => Promise<unknown>;
  onImported: () => Promise<void> | void;
};

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[\s_\-./\\()[\]{}:]+/g, '');

const toWesternDigits = (value: string) =>
  value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));

const text = (value: unknown) => toWesternDigits(String(value ?? '').trim());

const readCell = (row: Record<string, unknown>, aliases: string[]) => {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  for (const [key, value] of Object.entries(row)) {
    if (normalizedAliases.has(normalizeHeader(key))) return value;
  }
  return '';
};

const normalizeDocumentNumber = (value: string) =>
  toWesternDigits(value).trim().toLowerCase().replace(/\s+/g, '');

const normalizeUrl = (value: unknown) => String(value ?? '').trim();

const isValidHttpUrl = (value: string) => {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const pad2 = (value: number) => String(value).padStart(2, '0');

const excelSerialToDate = (value: number) => {
  try {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return '';
    return `${parsed.y}-${pad2(parsed.m)}-${pad2(parsed.d)}`;
  } catch {
    return '';
  }
};

const normalizeGregorianDate = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return excelSerialToDate(value);
  }

  const raw = text(value);
  if (!raw) return '';

  const ymd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) return `${ymd[1]}-${pad2(Number(ymd[2]))}-${pad2(Number(ymd[3]))}`;

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${dmy[3]}-${pad2(Number(dmy[2]))}-${pad2(Number(dmy[1]))}`;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  }

  return raw;
};

const normalizeHijriDate = (value: unknown) => {
  const raw = text(value).replaceAll('-', '/').replace(/[^0-9/]/g, '');
  const parts = raw.split('/').filter(Boolean);
  if (parts.length === 3) {
    return `${parts[0]}/${pad2(Number(parts[1]))}/${pad2(Number(parts[2]))}`;
  }
  return raw;
};

const normalizeDateType = (value: unknown, dateValue: unknown): 'gregorian' | 'hijri' => {
  const normalized = normalizeHeader(value);
  if (normalized.includes('هجري') || normalized === 'hijri' || normalized === 'h') return 'hijri';
  if (normalized.includes('ميلادي') || normalized === 'gregorian' || normalized === 'g') return 'gregorian';

  const rawDate = text(dateValue);
  const yearMatch = rawDate.match(/(\d{4})/);
  const year = yearMatch ? Number(yearMatch[1]) : 0;
  if (year >= 1300 && year <= 1600) return 'hijri';
  return 'gregorian';
};

const normalizeConfidentiality = (value: unknown): ArchiveExcelImportPayload['confidentiality'] => {
  const normalized = normalizeHeader(value);
  if (normalized.includes('سري') || normalized === 'confidential') return 'confidential';
  if (normalized.includes('عام') || normalized === 'public') return 'public';
  return 'internal';
};

const inferMimeType = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    txt: 'text/plain',
    zip: 'application/zip',
  };
  return extension ? mimeMap[extension] || 'application/octet-stream' : 'application/octet-stream';
};

const deriveFileName = (driveUrl: string, explicitName: string) => {
  if (explicitName) return explicitName;
  try {
    const parsed = new URL(driveUrl);
    const lastSegment = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    if (lastSegment && lastSegment.includes('.')) return lastSegment;
  } catch {
    // URL validation is handled separately.
  }
  return 'مستند-مؤرشف';
};

const rowHasContent = (row: Record<string, unknown>) =>
  Object.values(row).some((value) => String(value ?? '').trim() !== '');

const buildTemplate = () => {
  const headers = [
    'عنوان المستند *',
    'التصنيف',
    'رقم المستند',
    'تاريخ المستند',
    'نوع التاريخ',
    'الجهة / المصدر',
    'درجة السرية',
    'الكلمات المفتاحية',
    'الوصف / الملاحظات',
    'اسم الملف',
    'نوع الملف MIME',
    'حجم الملف بالبايت',
    'رابط الملف *',
    'معرف ملف Google Drive',
  ];

  const example = [
    'محضر تسليم مبنى',
    'محاضر',
    '12345',
    '2026-09-16',
    'ميلادي',
    'إدارة أوقاف وأملاك الجامعة',
    'داخلي',
    'محضر، تسليم، مبنى',
    'مثال توضيحي — احذف هذا الصف قبل الاستيراد الفعلي',
    'handover.pdf',
    'application/pdf',
    0,
    'https://drive.google.com/file/d/EXAMPLE/view',
    'EXAMPLE',
  ];

  const workbook = XLSX.utils.book_new();
  const dataSheet = XLSX.utils.aoa_to_sheet([headers, example]);
  dataSheet['!cols'] = [
    { wch: 30 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 28 }, { wch: 14 },
    { wch: 28 }, { wch: 42 }, { wch: 26 }, { wch: 34 }, { wch: 18 }, { wch: 50 }, { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'بيانات الأرشفة');

  const instructions = [
    ['تعليمات استيراد الأرشفة'],
    ['الحقل', 'التعليمات'],
    ['عنوان المستند', 'إلزامي. السجل الذي لا يحتوي عنوانًا لن يتم استيراده.'],
    ['رابط الملف', 'إلزامي في الاستيراد الجماعي. ضع رابط Google Drive أو رابط HTTP/HTTPS صالح للملف الموجود مسبقًا.'],
    ['نوع التاريخ', 'اكتب ميلادي أو هجري. عند تركه فارغًا يحاول النظام استنتاج النوع من السنة.'],
    ['درجة السرية', 'القيم المدعومة: عام، داخلي، سري. القيمة الافتراضية: داخلي.'],
    ['التصنيف', 'اختياري. القيمة الافتراضية: عام.'],
    ['التكرار', 'رقم المستند أو رابط الملف المطابق لسجل موجود يُعامل كتكرار ويُستبعد افتراضيًا.'],
    ['الملفات', 'Excel يستورد بيانات الفهرسة والروابط فقط ولا يرفع الملفات الفعلية من جهازك. لرفع ملف جديد استخدم إضافة ملف للأرشفة.'],
  ];
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 24 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'تعليمات');

  XLSX.writeFile(workbook, 'نموذج-استيراد-الأرشفة.xlsx');
};

const parseWorkbookRows = async (file: File): Promise<{ sheetName: string; rows: Record<string, unknown>[] }> => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('ملف Excel لا يحتوي أوراق عمل');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: true });
  return { sheetName, rows: rows.filter(rowHasContent) };
};

const mapRawRow = (row: Record<string, unknown>, rowNumber: number): ImportRow => {
  const dateValue = readCell(row, ['تاريخ المستند', 'التاريخ', 'document date', 'document_date', 'date']);
  const dateType = normalizeDateType(readCell(row, ['نوع التاريخ', 'نوع تاريخ المستند', 'date type', 'date_type']), dateValue);
  const driveUrl = normalizeUrl(readCell(row, ['رابط الملف', 'رابط google drive', 'رابط جوجل درايف', 'drive url', 'drive_url', 'url', 'link']));
  const explicitFileName = text(readCell(row, ['اسم الملف', 'file name', 'filename', 'original name', 'original_name']));
  const fileName = deriveFileName(driveUrl, explicitFileName);
  const title = text(readCell(row, ['عنوان المستند', 'عنوان الملف', 'العنوان', 'title', 'document title', 'document_title']));
  const documentNumber = text(readCell(row, ['رقم المستند', 'رقم الخطاب', 'رقم الوثيقة', 'document number', 'document_number', 'number']));
  const mimeTypeInput = text(readCell(row, ['نوع الملف mime', 'نوع الملف', 'mime type', 'mime_type', 'mimetype']));
  const rawFileSize = text(readCell(row, ['حجم الملف بالبايت', 'حجم الملف', 'file size', 'file_size', 'filesize']));
  const fileSize = rawFileSize && Number.isFinite(Number(rawFileSize)) ? Math.max(0, Number(rawFileSize)) : 0;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!title) errors.push('عنوان المستند مطلوب');
  if (!driveUrl) errors.push('رابط الملف مطلوب للاستيراد الجماعي');
  else if (!isValidHttpUrl(driveUrl)) errors.push('رابط الملف غير صالح');
  if (!documentNumber) warnings.push('رقم المستند غير مدخل');
  if (!text(dateValue)) warnings.push('تاريخ المستند غير مدخل');
  if (!text(readCell(row, ['الجهة / المصدر', 'الجهة', 'المصدر', 'issuing authority', 'issuing_authority', 'source']))) warnings.push('الجهة / المصدر غير مدخلة');

  const normalizedDate = dateType === 'hijri' ? normalizeHijriDate(dateValue) : normalizeGregorianDate(dateValue);
  if (text(dateValue) && !normalizedDate) errors.push('تعذر قراءة تاريخ المستند');

  return {
    rowNumber,
    title,
    category: text(readCell(row, ['التصنيف', 'الفئة', 'category'])) || 'عام',
    documentNumber,
    documentDate: normalizedDate,
    documentDateType: dateType,
    issuingAuthority: text(readCell(row, ['الجهة / المصدر', 'الجهة', 'المصدر', 'issuing authority', 'issuing_authority', 'source'])),
    confidentiality: normalizeConfidentiality(readCell(row, ['درجة السرية', 'السرية', 'confidentiality', 'privacy'])),
    tags: text(readCell(row, ['الكلمات المفتاحية', 'وسوم', 'tags', 'keywords'])),
    description: text(readCell(row, ['الوصف / الملاحظات', 'الوصف', 'الملاحظات', 'description', 'notes'])),
    fileName,
    originalName: fileName,
    mimeType: mimeTypeInput || inferMimeType(fileName),
    fileSize,
    driveUrl,
    driveFileId: text(readCell(row, ['معرف ملف google drive', 'معرف الملف', 'drive file id', 'drive_file_id', 'file id', 'file_id'])),
    errors,
    warnings,
    duplicate: false,
  };
};

export const ArchiveExcelImportDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  existingDocuments,
  createArchiveDocument,
  onImported,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [resultText, setResultText] = useState('');

  const existingNumbers = useMemo(
    () => new Set(existingDocuments.map((doc) => normalizeDocumentNumber(doc.documentNumber || '')).filter(Boolean)),
    [existingDocuments],
  );
  const existingUrls = useMemo(
    () => new Set(existingDocuments.map((doc) => String(doc.driveUrl || '').trim().toLowerCase()).filter(Boolean)),
    [existingDocuments],
  );

  const analyzedRows = useMemo(() => {
    const batchNumbers = new Map<string, number>();
    const batchUrls = new Map<string, number>();
    for (const row of rows) {
      const number = normalizeDocumentNumber(row.documentNumber);
      const url = row.driveUrl.trim().toLowerCase();
      if (number) batchNumbers.set(number, (batchNumbers.get(number) || 0) + 1);
      if (url) batchUrls.set(url, (batchUrls.get(url) || 0) + 1);
    }

    return rows.map((row) => {
      const number = normalizeDocumentNumber(row.documentNumber);
      const url = row.driveUrl.trim().toLowerCase();
      const duplicate = Boolean(
        (number && (existingNumbers.has(number) || (batchNumbers.get(number) || 0) > 1)) ||
        (url && (existingUrls.has(url) || (batchUrls.get(url) || 0) > 1))
      );
      return { ...row, duplicate };
    });
  }, [rows, existingNumbers, existingUrls]);

  const stats = useMemo(() => {
    const errors = analyzedRows.filter((row) => row.errors.length > 0 || Boolean(row.serverError)).length;
    const duplicates = analyzedRows.filter((row) => row.duplicate).length;
    const warnings = analyzedRows.filter((row) => row.warnings.length > 0 && row.errors.length === 0).length;
    const imported = analyzedRows.filter((row) => row.imported).length;
    const importable = analyzedRows.filter(
      (row) => !row.imported && row.errors.length === 0 && !row.serverError && (allowDuplicates || !row.duplicate),
    ).length;
    return { total: analyzedRows.length, errors, duplicates, warnings, imported, importable };
  }, [analyzedRows, allowDuplicates]);

  const reset = () => {
    setSourceFile(null);
    setSheetName('');
    setRows([]);
    setAllowDuplicates(false);
    setResultText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isImporting) reset();
    onOpenChange(nextOpen);
  };

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      toast.error('اختر ملف Excel بصيغة XLSX أو XLS أو CSV');
      return;
    }

    setIsParsing(true);
    setResultText('');
    try {
      const parsed = await parseWorkbookRows(file);
      if (parsed.rows.length === 0) throw new Error('لا توجد صفوف بيانات في أول ورقة عمل');
      const mapped = parsed.rows.map((row, index) => mapRawRow(row, index + 2));
      setSourceFile(file);
      setSheetName(parsed.sheetName);
      setRows(mapped);
      toast.success(`تمت قراءة ${mapped.length} صف من ملف Excel`);
    } catch (error) {
      console.error('Archive Excel parse error:', error);
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف Excel');
      reset();
    } finally {
      setIsParsing(false);
    }
  };

  const runImport = async () => {
    const candidates = analyzedRows.filter(
      (row) => !row.imported && row.errors.length === 0 && !row.serverError && (allowDuplicates || !row.duplicate),
    );
    if (candidates.length === 0) {
      toast.error('لا توجد صفوف صالحة للاستيراد وفق الإعدادات الحالية');
      return;
    }

    setIsImporting(true);
    setResultText('');
    let successCount = 0;
    const failed = new Map<number, string>();
    const succeeded = new Set<number>();

    for (const row of candidates) {
      try {
        const { rowNumber: _rowNumber, errors: _errors, warnings: _warnings, duplicate: _duplicate, imported: _imported, serverError: _serverError, ...payload } = row;
        await createArchiveDocument(payload);
        successCount += 1;
        succeeded.add(row.rowNumber);
      } catch (error) {
        failed.set(row.rowNumber, error instanceof Error ? error.message : 'فشل حفظ السجل');
      }
    }

    setRows((current) => current.map((row) => {
      if (succeeded.has(row.rowNumber)) return { ...row, imported: true, serverError: undefined };
      if (failed.has(row.rowNumber)) return { ...row, serverError: failed.get(row.rowNumber) };
      return row;
    }));

    if (successCount > 0) await onImported();

    const summary = `تم استيراد ${successCount} سجل بنجاح${failed.size ? `، وتعذر استيراد ${failed.size} سجل` : ''}.`;
    setResultText(summary);
    if (failed.size) toast.warning(summary);
    else toast.success(summary);
    setIsImporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-6 w-6 text-emerald-700" />
            استيراد سجلات الأرشفة من Excel
          </DialogTitle>
          <DialogDescription>
            استيراد جماعي آمن مع معاينة وفحص التكرار والأخطاء قبل الحفظ. الاستيراد يضيف بيانات الفهرسة ويربط الملفات الموجودة مسبقًا عبر روابطها، ولا يرفع الملفات الفعلية من جهازك.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <button
              type="button"
              onClick={() => !isParsing && !isImporting && fileInputRef.current?.click()}
              className="flex min-h-[122px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5 text-center transition hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed"
              disabled={isParsing || isImporting}
            >
              <div>
                {isParsing ? <Loader2 className="mx-auto mb-2 h-9 w-9 animate-spin text-emerald-700" /> : <Upload className="mx-auto mb-2 h-9 w-9 text-emerald-700" />}
                <p className="font-black text-slate-800">{sourceFile ? sourceFile.name : 'اختر ملف Excel للاستيراد'}</p>
                <p className="mt-1 text-xs text-slate-500">XLSX / XLS / CSV — تتم القراءة محليًا ثم تعرض المعاينة قبل الحفظ</p>
                {sheetName && <p className="mt-1 text-xs font-semibold text-emerald-700">ورقة العمل: {sheetName}</p>}
              </div>
            </button>

            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={buildTemplate} disabled={isImporting}>
                <Download className="ml-2 h-4 w-4" />
                تنزيل النموذج المعتمد
              </Button>
              <Button variant="outline" onClick={reset} disabled={isImporting || (!sourceFile && rows.length === 0)}>
                <RefreshCw className="ml-2 h-4 w-4" />
                بدء استيراد جديد
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-sm text-sky-950">
            <b>مهم:</b> يلزم في الاستيراد الجماعي وجود <b>عنوان المستند</b> و<b>رابط ملف صالح</b>. الصفوف الناقصة أو ذات الروابط غير الصحيحة لا تُحفظ. أما البيانات الوصفية الاختيارية فيمكن استكمالها لاحقًا من شاشة الأرشفة.
          </div>

          {analyzedRows.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border bg-white p-3"><p className="text-xs text-slate-500">إجمالي الصفوف</p><p className="text-2xl font-black">{stats.total}</p></div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs text-slate-500">جاهزة للاستيراد</p><p className="text-2xl font-black text-emerald-700">{stats.importable}</p></div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs text-slate-500">تحتاج استكمالًا</p><p className="text-2xl font-black text-amber-700">{stats.warnings}</p></div>
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-3"><p className="text-xs text-slate-500">مكررة</p><p className="text-2xl font-black text-violet-700">{stats.duplicates}</p></div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-xs text-slate-500">أخطاء مانعة</p><p className="text-2xl font-black text-red-700">{stats.errors}</p></div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-violet-200 bg-violet-50/60 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={allowDuplicates}
                  onChange={(event) => setAllowDuplicates(event.target.checked)}
                  disabled={isImporting}
                />
                <span>
                  <b>السماح باستيراد السجلات المكررة</b>
                  <span className="mt-0.5 block text-xs text-slate-600">افتراضيًا يتم استبعاد الصف الذي يطابق رقم مستند أو رابط ملف موجود في الأرشفة أو مكرر داخل نفس ملف Excel.</span>
                </span>
              </label>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-black text-slate-800">معاينة وفحص البيانات</p>
                    <p className="text-xs text-slate-500">راجع حالة كل صف قبل اعتماد الاستيراد.</p>
                  </div>
                  <Badge variant="outline">{analyzedRows.length} صف</Badge>
                </div>

                <div className="max-h-[390px] overflow-auto">
                  <table className="w-full min-w-[1050px] text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-right">الصف</th>
                        <th className="px-3 py-2 text-right">الحالة</th>
                        <th className="px-3 py-2 text-right">العنوان</th>
                        <th className="px-3 py-2 text-right">رقم المستند</th>
                        <th className="px-3 py-2 text-right">التصنيف</th>
                        <th className="px-3 py-2 text-right">التاريخ</th>
                        <th className="px-3 py-2 text-right">الجهة</th>
                        <th className="px-3 py-2 text-right">الملف / الرابط</th>
                        <th className="px-3 py-2 text-right">الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyzedRows.map((row) => {
                        const blockedByDuplicate = row.duplicate && !allowDuplicates;
                        const blocked = row.errors.length > 0 || Boolean(row.serverError) || blockedByDuplicate;
                        return (
                          <tr key={row.rowNumber} className="border-t align-top">
                            <td className="px-3 py-3 font-bold">{row.rowNumber}</td>
                            <td className="px-3 py-3">
                              {row.imported ? (
                                <Badge className="bg-emerald-600"><CheckCircle2 className="ml-1 h-3.5 w-3.5" />تم الاستيراد</Badge>
                              ) : blocked ? (
                                <Badge variant="destructive"><XCircle className="ml-1 h-3.5 w-3.5" />مستبعد</Badge>
                              ) : row.warnings.length ? (
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800"><AlertTriangle className="ml-1 h-3.5 w-3.5" />تنبيه</Badge>
                              ) : (
                                <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800"><CheckCircle2 className="ml-1 h-3.5 w-3.5" />جاهز</Badge>
                              )}
                            </td>
                            <td className="max-w-[220px] px-3 py-3 font-semibold">{row.title || '-'}</td>
                            <td className="px-3 py-3">{row.documentNumber || '-'}</td>
                            <td className="px-3 py-3">{row.category}</td>
                            <td className="px-3 py-3">{row.documentDate || '-'} <span className="text-xs text-slate-400">({row.documentDateType === 'hijri' ? 'هجري' : 'ميلادي'})</span></td>
                            <td className="max-w-[180px] px-3 py-3">{row.issuingAuthority || '-'}</td>
                            <td className="max-w-[250px] px-3 py-3">
                              <p className="font-medium">{row.originalName}</p>
                              <p className="truncate text-xs text-slate-500" dir="ltr">{row.driveUrl || '-'}</p>
                            </td>
                            <td className="max-w-[310px] px-3 py-3">
                              <div className="space-y-1">
                                {row.duplicate && <p className="font-semibold text-violet-700">• سجل مكرر</p>}
                                {row.errors.map((issue) => <p key={issue} className="text-xs font-semibold text-red-700">• {issue}</p>)}
                                {row.warnings.map((issue) => <p key={issue} className="text-xs text-amber-700">• {issue}</p>)}
                                {row.serverError && <p className="text-xs font-semibold text-red-700">• الخادم: {row.serverError}</p>}
                                {!row.duplicate && row.errors.length === 0 && row.warnings.length === 0 && !row.serverError && <span className="text-xs text-emerald-700">لا توجد ملاحظات</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {resultText && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 font-semibold text-emerald-900">
              {resultText}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isImporting}>إغلاق</Button>
          <Button onClick={() => void runImport()} disabled={isImporting || stats.importable === 0} className="bg-emerald-700 hover:bg-emerald-800">
            {isImporting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="ml-2 h-4 w-4" />}
            {isImporting ? 'جاري الاستيراد...' : `استيراد ${stats.importable} سجل`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
