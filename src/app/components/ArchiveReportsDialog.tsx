import React, { useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import {
  FileDown,
  FileSpreadsheet,
  Filter,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { toast } from 'sonner';

export type ArchiveReportDocument = {
  id: string;
  title: string;
  category: string;
  documentNumber?: string | null;
  documentDate?: string | null;
  documentDateType?: 'gregorian' | 'hijri' | null;
  issuingAuthority?: string | null;
  confidentiality: 'public' | 'internal' | 'confidential';
  tags?: string | null;
  description?: string | null;
  fileName?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  fileSize?: number | string | null;
  driveUrl?: string | null;
  driveFileId?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ArchiveReportsDialogProps = {
  documents: ArchiveReportDocument[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ReportColumnKey =
  | 'reference'
  | 'title'
  | 'category'
  | 'documentNumber'
  | 'documentDate'
  | 'issuingAuthority'
  | 'confidentiality'
  | 'fileType'
  | 'fileSize'
  | 'createdAt'
  | 'updatedAt'
  | 'tags'
  | 'quality'
  | 'link';

type FileGroup = 'all' | 'pdf' | 'image' | 'word' | 'excel' | 'powerpoint' | 'archive' | 'other';

const confidentialityLabels: Record<ArchiveReportDocument['confidentiality'], string> = {
  public: 'عام',
  internal: 'داخلي',
  confidential: 'سري',
};

const reportColumns: Array<{ key: ReportColumnKey; label: string; default: boolean }> = [
  { key: 'reference', label: 'المرجع الأرشيفي', default: true },
  { key: 'title', label: 'العنوان', default: true },
  { key: 'category', label: 'التصنيف', default: true },
  { key: 'documentNumber', label: 'رقم المستند', default: true },
  { key: 'documentDate', label: 'تاريخ المستند', default: true },
  { key: 'issuingAuthority', label: 'الجهة / المصدر', default: true },
  { key: 'confidentiality', label: 'درجة السرية', default: true },
  { key: 'fileType', label: 'نوع الملف', default: true },
  { key: 'fileSize', label: 'حجم الملف', default: true },
  { key: 'createdAt', label: 'تاريخ الأرشفة', default: true },
  { key: 'updatedAt', label: 'آخر تعديل', default: false },
  { key: 'tags', label: 'الكلمات المفتاحية', default: false },
  { key: 'quality', label: 'جودة البيانات', default: true },
  { key: 'link', label: 'رابط الملف', default: false },
];

const defaultColumns = () =>
  new Set<ReportColumnKey>(reportColumns.filter((column) => column.default).map((column) => column.key));

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatFileSize = (raw: number | string | null | undefined) => {
  const bytes = Number(raw || 0);
  if (!bytes || Number.isNaN(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ar-SA-u-ca-gregory');
};

const formatDocumentDate = (doc: ArchiveReportDocument) => {
  if (!doc.documentDate) return '-';
  if (doc.documentDateType === 'hijri') return `${doc.documentDate}هـ`;
  return formatDate(doc.documentDate);
};

const archiveReference = (doc: ArchiveReportDocument) =>
  `ARC-${String(doc.id || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase() || '00000000'}`;

const fileGroupOf = (doc: ArchiveReportDocument): Exclude<FileGroup, 'all'> => {
  const name = String(doc.originalName || doc.fileName || '').toLowerCase();
  const mime = String(doc.mimeType || '').toLowerCase();
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|tiff?)$/.test(name)) return 'image';
  if (mime.includes('word') || /\.(docx?|rtf)$/.test(name)) return 'word';
  if (mime.includes('excel') || mime.includes('spreadsheet') || /\.(xlsx?|csv)$/.test(name)) return 'excel';
  if (mime.includes('powerpoint') || mime.includes('presentation') || /\.(pptx?)$/.test(name)) return 'powerpoint';
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'archive';
  return 'other';
};

const fileGroupLabel = (group: FileGroup) => ({
  all: 'جميع أنواع الملفات',
  pdf: 'PDF',
  image: 'صور',
  word: 'Word',
  excel: 'Excel / CSV',
  powerpoint: 'PowerPoint',
  archive: 'ملفات مضغوطة',
  other: 'أخرى',
}[group]);

const missingMetadata = (doc: ArchiveReportDocument) => {
  const fields: string[] = [];
  if (!String(doc.documentNumber || '').trim()) fields.push('رقم المستند');
  if (!String(doc.documentDate || '').trim()) fields.push('تاريخ المستند');
  if (!String(doc.issuingAuthority || '').trim()) fields.push('الجهة');
  if (!String(doc.tags || '').trim()) fields.push('الكلمات المفتاحية');
  if (!String(doc.description || '').trim()) fields.push('الوصف');
  if (!String(doc.driveUrl || '').trim()) fields.push('رابط الملف');
  return fields;
};

const toTimestamp = (value?: string | null) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const isWithin = (value: string | null | undefined, from: string, to: string) => {
  if (!from && !to) return true;
  const timestamp = toTimestamp(value);
  if (timestamp === null) return false;
  if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
  return true;
};

const duplicateDocumentNumbers = (documents: ArchiveReportDocument[]) => {
  const counter = new Map<string, number>();
  documents.forEach((doc) => {
    const value = String(doc.documentNumber || '').trim().toLowerCase();
    if (value) counter.set(value, (counter.get(value) || 0) + 1);
  });
  return new Set(Array.from(counter.entries()).filter(([, count]) => count > 1).map(([value]) => value));
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

export const ArchiveReportsDialog: React.FC<ArchiveReportsDialogProps> = ({ documents, open, onOpenChange }) => {
  const [reportTitle, setReportTitle] = useState('تقرير الأرشفة الإلكترونية');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [confidentiality, setConfidentiality] = useState('');
  const [authority, setAuthority] = useState('');
  const [fileGroup, setFileGroup] = useState<FileGroup>('all');
  const [archiveFrom, setArchiveFrom] = useState('');
  const [archiveTo, setArchiveTo] = useState('');
  const [documentFrom, setDocumentFrom] = useState('');
  const [documentTo, setDocumentTo] = useState('');
  const [qualityMode, setQualityMode] = useState<'all' | 'complete' | 'incomplete' | 'duplicates'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title' | 'category'>('newest');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [paperSize, setPaperSize] = useState<'A4' | 'A3'>('A4');
  const [compact, setCompact] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<Set<ReportColumnKey>>(defaultColumns);

  const categories = useMemo(
    () => Array.from(new Set(documents.map((doc) => doc.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')),
    [documents],
  );
  const authorities = useMemo(
    () => Array.from(new Set(documents.map((doc) => String(doc.issuingAuthority || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')),
    [documents],
  );
  const duplicateNumbers = useMemo(() => duplicateDocumentNumbers(documents), [documents]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const result = documents.filter((doc) => {
      const matchesQuery = !normalizedQuery || [
        doc.title,
        doc.category,
        doc.documentNumber,
        doc.documentDate,
        doc.issuingAuthority,
        doc.tags,
        doc.description,
        doc.originalName,
        doc.mimeType,
        archiveReference(doc),
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesCategory = !category || doc.category === category;
      const matchesConfidentiality = !confidentiality || doc.confidentiality === confidentiality;
      const matchesAuthority = !authority || String(doc.issuingAuthority || '') === authority;
      const matchesFile = fileGroup === 'all' || fileGroupOf(doc) === fileGroup;
      const matchesArchiveDate = isWithin(doc.createdAt, archiveFrom, archiveTo);
      const matchesDocumentDate = !documentFrom && !documentTo
        ? true
        : doc.documentDateType !== 'hijri' && isWithin(doc.documentDate, documentFrom, documentTo);
      const missing = missingMetadata(doc);
      const duplicate = duplicateNumbers.has(String(doc.documentNumber || '').trim().toLowerCase());
      const matchesQuality = qualityMode === 'all'
        || (qualityMode === 'complete' && missing.length === 0 && !duplicate)
        || (qualityMode === 'incomplete' && missing.length > 0)
        || (qualityMode === 'duplicates' && duplicate);
      return matchesQuery && matchesCategory && matchesConfidentiality && matchesAuthority && matchesFile && matchesArchiveDate && matchesDocumentDate && matchesQuality;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'oldest') return (toTimestamp(a.createdAt) || 0) - (toTimestamp(b.createdAt) || 0);
      if (sortBy === 'title') return String(a.title || '').localeCompare(String(b.title || ''), 'ar');
      if (sortBy === 'category') return String(a.category || '').localeCompare(String(b.category || ''), 'ar');
      return (toTimestamp(b.createdAt) || 0) - (toTimestamp(a.createdAt) || 0);
    });
  }, [documents, query, category, confidentiality, authority, fileGroup, archiveFrom, archiveTo, documentFrom, documentTo, qualityMode, sortBy, duplicateNumbers]);

  const metrics = useMemo(() => {
    const incomplete = filtered.filter((doc) => missingMetadata(doc).length > 0).length;
    const confidential = filtered.filter((doc) => doc.confidentiality === 'confidential').length;
    const duplicated = filtered.filter((doc) => duplicateNumbers.has(String(doc.documentNumber || '').trim().toLowerCase())).length;
    const bytes = filtered.reduce((sum, doc) => sum + Number(doc.fileSize || 0), 0);
    return { count: filtered.length, incomplete, confidential, duplicated, bytes };
  }, [filtered, duplicateNumbers]);

  const activeColumns = reportColumns.filter((column) => selectedColumns.has(column.key));

  const valueForColumn = (doc: ArchiveReportDocument, key: ReportColumnKey) => {
    if (key === 'reference') return archiveReference(doc);
    if (key === 'title') return doc.title || '-';
    if (key === 'category') return doc.category || '-';
    if (key === 'documentNumber') return doc.documentNumber || '-';
    if (key === 'documentDate') return formatDocumentDate(doc);
    if (key === 'issuingAuthority') return doc.issuingAuthority || '-';
    if (key === 'confidentiality') return confidentialityLabels[doc.confidentiality] || doc.confidentiality;
    if (key === 'fileType') return fileGroupLabel(fileGroupOf(doc));
    if (key === 'fileSize') return formatFileSize(doc.fileSize);
    if (key === 'createdAt') return formatDate(doc.createdAt);
    if (key === 'updatedAt') return formatDate(doc.updatedAt);
    if (key === 'tags') return doc.tags || '-';
    if (key === 'quality') {
      const missing = missingMetadata(doc);
      const duplicate = duplicateNumbers.has(String(doc.documentNumber || '').trim().toLowerCase());
      if (!missing.length && !duplicate) return 'مكتمل';
      return [duplicate ? 'رقم مكرر' : '', missing.length ? `ناقص: ${missing.join('، ')}` : ''].filter(Boolean).join(' | ');
    }
    if (key === 'link') return doc.driveUrl || '-';
    return '-';
  };

  const filterSummary = () => [
    query ? `بحث: ${query}` : '',
    category ? `التصنيف: ${category}` : '',
    confidentiality ? `السرية: ${confidentialityLabels[confidentiality as ArchiveReportDocument['confidentiality']]}` : '',
    authority ? `الجهة: ${authority}` : '',
    fileGroup !== 'all' ? `نوع الملف: ${fileGroupLabel(fileGroup)}` : '',
    archiveFrom ? `الأرشفة من: ${archiveFrom}` : '',
    archiveTo ? `الأرشفة إلى: ${archiveTo}` : '',
    documentFrom ? `تاريخ المستند الميلادي من: ${documentFrom}` : '',
    documentTo ? `تاريخ المستند الميلادي إلى: ${documentTo}` : '',
    qualityMode !== 'all' ? `جودة البيانات: ${qualityMode === 'complete' ? 'مكتملة' : qualityMode === 'incomplete' ? 'ناقصة' : 'أرقام مكررة'}` : '',
  ].filter(Boolean).join(' | ') || 'بدون فلاتر إضافية';

  const resetFilters = () => {
    setQuery('');
    setCategory('');
    setConfidentiality('');
    setAuthority('');
    setFileGroup('all');
    setArchiveFrom('');
    setArchiveTo('');
    setDocumentFrom('');
    setDocumentTo('');
    setQualityMode('all');
    setSortBy('newest');
    setSelectedColumns(defaultColumns());
  };

  const toggleColumn = (key: ReportColumnKey) => {
    setSelectedColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const printReport = () => {
    if (!filtered.length) {
      toast.error('لا توجد بيانات مطابقة لإعدادات التقرير');
      return;
    }
    if (!activeColumns.length) {
      toast.error('اختر عمودًا واحدًا على الأقل');
      return;
    }

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1280,height=900');
    if (!popup) {
      toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.');
      return;
    }

    const rows = filtered.map((doc) => `<tr>${activeColumns.map((column) => `<td>${escapeHtml(valueForColumn(doc, column.key))}</td>`).join('')}</tr>`).join('');
    popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(reportTitle)}</title><style>
      @page{size:${paperSize} ${orientation};margin:10mm}*{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;color:#172033;margin:0;font-size:${compact ? '10px' : '11px'}}
      .head{border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin-bottom:10px;background:#f8fafc}.uni{font-size:11px;color:#0f766e;font-weight:700}.title{font-size:22px;font-weight:800;color:#123047;margin:5px 0}.meta{color:#64748b;line-height:1.8}.metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:10px 0}.metric{border:1px solid #cbd5e1;border-radius:8px;padding:7px;text-align:center;background:#fff}.metric b{display:block;font-size:16px;color:#0369a1}.filters{background:#e0f2fe;border:1px solid #bae6fd;padding:7px 10px;border-radius:8px;margin:8px 0;line-height:1.7}table{width:100%;border-collapse:collapse;table-layout:auto}th{background:#123047;color:white;font-weight:700;padding:${compact ? '6px' : '8px'};border:1px solid #94a3b8}td{padding:${compact ? '5px' : '7px'};border:1px solid #cbd5e1;vertical-align:top;word-break:break-word}tbody tr:nth-child(even){background:#f8fafc}.footer{margin-top:10px;color:#64748b;font-size:9px;text-align:left}@media print{.no-print{display:none!important}.head{break-inside:avoid}tr{break-inside:avoid}}
    </style></head><body><div class="head"><div class="uni">جامعة الإمام عبدالرحمن بن فيصل — منصة إدارة الأصول والأملاك والأوقاف الجامعية</div><div class="title">${escapeHtml(reportTitle)}</div><div class="meta">تاريخ الاستخراج: ${escapeHtml(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</div><div class="filters"><b>معايير التقرير:</b> ${escapeHtml(filterSummary())}</div><div class="metrics"><div class="metric">النتائج<b>${metrics.count}</b></div><div class="metric">الحجم<b>${escapeHtml(formatFileSize(metrics.bytes))}</b></div><div class="metric">سري<b>${metrics.confidential}</b></div><div class="metric">بيانات ناقصة<b>${metrics.incomplete}</b></div><div class="metric">أرقام مكررة<b>${metrics.duplicated}</b></div></div></div><table><thead><tr>${activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="footer">تقرير مولد من الأرشفة الإلكترونية — ${metrics.count} سجل</div><script>window.onload=()=>setTimeout(()=>window.print(),250);<\/script></body></html>`);
    popup.document.close();
  };

  const exportExcel = async () => {
    if (!filtered.length) {
      toast.error('لا توجد بيانات مطابقة لإعدادات التقرير');
      return;
    }
    if (!activeColumns.length) {
      toast.error('اختر عمودًا واحدًا على الأقل');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'IAU Deeds Platform';
      workbook.company = 'جامعة الإمام عبدالرحمن بن فيصل';
      workbook.created = new Date();

      const summary = workbook.addWorksheet('ملخص', { views: [{ rightToLeft: true, showGridLines: false }] });
      summary.columns = [{ width: 28 }, { width: 55 }];
      summary.mergeCells('A1:B1');
      summary.getCell('A1').value = reportTitle;
      summary.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
      summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123047' } };
      summary.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      summary.getRow(1).height = 34;
      const summaryRows: Array<[string, string | number]> = [
        ['تاريخ الاستخراج', new Date().toLocaleString('ar-SA-u-ca-gregory')],
        ['معايير التقرير', filterSummary()],
        ['عدد النتائج', metrics.count],
        ['إجمالي الحجم', formatFileSize(metrics.bytes)],
        ['المستندات السرية', metrics.confidential],
        ['سجلات ناقصة البيانات', metrics.incomplete],
        ['سجلات بأرقام مكررة', metrics.duplicated],
      ];
      summaryRows.forEach(([label, value], index) => {
        const row = summary.getRow(index + 3);
        row.values = [label, value];
        row.getCell(1).font = { bold: true, color: { argb: 'FF123047' } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
          cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
        });
      });

      const sheet = workbook.addWorksheet('المستندات', { views: [{ rightToLeft: true, showGridLines: false }] });
      sheet.pageSetup = { orientation, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
      const header = sheet.addRow(activeColumns.map((column) => column.label));
      header.height = 28;
      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      });
      filtered.forEach((doc, rowIndex) => {
        const row = sheet.addRow(activeColumns.map((column) => valueForColumn(doc, column.key)));
        row.height = compact ? 22 : 30;
        row.eachCell((cell) => {
          cell.font = { size: 10, color: { argb: 'FF172033' } };
          if (rowIndex % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
          cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
        });
        const linkIndex = activeColumns.findIndex((column) => column.key === 'link');
        if (linkIndex >= 0 && doc.driveUrl) {
          const cell = row.getCell(linkIndex + 1);
          cell.value = { text: 'فتح الملف', hyperlink: doc.driveUrl, tooltip: 'فتح الملف المؤرشف' };
          cell.font = { color: { argb: 'FF0563C1' }, underline: true };
        }
      });
      sheet.columns = activeColumns.map((column) => ({ width: ['title', 'issuingAuthority', 'quality', 'tags'].includes(column.key) ? 30 : column.key === 'link' ? 18 : 17 }));
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, filtered.length + 1), column: activeColumns.length } };
      sheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true, showGridLines: false }];

      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `تقرير-الأرشفة-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('تم إنشاء تقرير Excel بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('تعذر إنشاء ملف Excel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-[1180px] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileDown className="h-5 w-5 text-sky-700" />
            مركز تقارير الأرشفة
          </DialogTitle>
          <DialogDescription>
            تقرير مرن يطبق الفلاتر فورًا ثم يتيح الطباعة أو الحفظ PDF أو التصدير إلى Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border bg-sky-50 p-3"><p className="text-xs text-muted-foreground">النتائج</p><p className="text-2xl font-black text-sky-800">{metrics.count}</p></div>
          <div className="rounded-2xl border bg-slate-50 p-3"><p className="text-xs text-muted-foreground">إجمالي الحجم</p><p className="text-xl font-black">{formatFileSize(metrics.bytes)}</p></div>
          <div className="rounded-2xl border bg-red-50 p-3"><p className="text-xs text-muted-foreground">سري</p><p className="text-2xl font-black text-red-700">{metrics.confidential}</p></div>
          <div className="rounded-2xl border bg-amber-50 p-3"><p className="text-xs text-muted-foreground">بيانات ناقصة</p><p className="text-2xl font-black text-amber-700">{metrics.incomplete}</p></div>
          <div className="rounded-2xl border bg-violet-50 p-3"><p className="text-xs text-muted-foreground">أرقام مكررة</p><p className="text-2xl font-black text-violet-700">{metrics.duplicated}</p></div>
        </div>

        <div className="rounded-2xl border bg-muted/20 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-bold"><Filter className="h-4 w-4" /> معايير التقرير</div>
            <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="ml-2 h-4 w-4" />إعادة ضبط</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2"><Label>عنوان التقرير</Label><Input className="mt-1" value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} /></div>
            <div className="relative lg:col-span-2"><Label>بحث شامل</Label><Search className="absolute right-3 bottom-3 h-4 w-4 text-muted-foreground" /><Input className="mt-1 pr-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="العنوان، الرقم، الجهة، الملف، الكلمات المفتاحية..." /></div>
            <div><Label>التصنيف</Label><NativeSelect className="mt-1" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">الكل</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</NativeSelect></div>
            <div><Label>درجة السرية</Label><NativeSelect className="mt-1" value={confidentiality} onChange={(event) => setConfidentiality(event.target.value)}><option value="">الكل</option><option value="public">عام</option><option value="internal">داخلي</option><option value="confidential">سري</option></NativeSelect></div>
            <div><Label>الجهة / المصدر</Label><NativeSelect className="mt-1" value={authority} onChange={(event) => setAuthority(event.target.value)}><option value="">الكل</option>{authorities.map((value) => <option key={value} value={value}>{value}</option>)}</NativeSelect></div>
            <div><Label>نوع الملف</Label><NativeSelect className="mt-1" value={fileGroup} onChange={(event) => setFileGroup(event.target.value as FileGroup)}>{(['all','pdf','image','word','excel','powerpoint','archive','other'] as FileGroup[]).map((value) => <option key={value} value={value}>{fileGroupLabel(value)}</option>)}</NativeSelect></div>
            <div><Label>الأرشفة من</Label><Input className="mt-1" type="date" value={archiveFrom} onChange={(event) => setArchiveFrom(event.target.value)} /></div>
            <div><Label>الأرشفة إلى</Label><Input className="mt-1" type="date" value={archiveTo} onChange={(event) => setArchiveTo(event.target.value)} /></div>
            <div><Label>تاريخ المستند الميلادي من</Label><Input className="mt-1" type="date" value={documentFrom} onChange={(event) => setDocumentFrom(event.target.value)} /></div>
            <div><Label>تاريخ المستند الميلادي إلى</Label><Input className="mt-1" type="date" value={documentTo} onChange={(event) => setDocumentTo(event.target.value)} /></div>
            <div><Label>جودة البيانات</Label><NativeSelect className="mt-1" value={qualityMode} onChange={(event) => setQualityMode(event.target.value as typeof qualityMode)}><option value="all">الكل</option><option value="complete">مكتملة</option><option value="incomplete">ناقصة البيانات</option><option value="duplicates">أرقام مستندات مكررة</option></NativeSelect></div>
            <div><Label>الترتيب</Label><NativeSelect className="mt-1" value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="newest">الأحدث أرشفة</option><option value="oldest">الأقدم أرشفة</option><option value="title">العنوان</option><option value="category">التصنيف</option></NativeSelect></div>
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="mb-3 flex items-center justify-between gap-2"><div className="font-bold">أعمدة التقرير</div><Badge variant="outline">{activeColumns.length} عمود</Badge></div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {reportColumns.map((column) => (
              <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm">
                <input type="checkbox" checked={selectedColumns.has(column.key)} onChange={() => toggleColumn(column.key)} />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div><Label>حجم الورق</Label><NativeSelect className="mt-1" value={paperSize} onChange={(event) => setPaperSize(event.target.value as typeof paperSize)}><option value="A4">A4</option><option value="A3">A3</option></NativeSelect></div>
          <div><Label>الاتجاه</Label><NativeSelect className="mt-1" value={orientation} onChange={(event) => setOrientation(event.target.value as typeof orientation)}><option value="landscape">أفقي</option><option value="portrait">عمودي</option></NativeSelect></div>
          <label className="mt-6 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm"><input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} />جدول مضغوط</label>
          <div className="mt-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"><ShieldAlert className="h-4 w-4 shrink-0" />PDF يتم عبر نافذة الطباعة باختيار «حفظ كملف PDF».</div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button variant="outline" onClick={printReport}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button>
          <Button onClick={exportExcel}><FileSpreadsheet className="ml-2 h-4 w-4" />تصدير Excel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
