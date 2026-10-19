import React, { useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import {
  FileSpreadsheet,
  Filter,
  Paperclip,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import type {
  TransactionFollowUpOrganizationalUnit,
  TransactionFollowUpPriority,
  TransactionFollowUpRecord,
  TransactionFollowUpStatus,
} from '../api/transactionFollowUp';
import { toast } from 'sonner';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { ReportViewToggle } from './ReportViewToggle';

type Props = {
  transactions: TransactionFollowUpRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ColumnKey =
  | 'transactionNumber'
  | 'trackingNumber'
  | 'transactionYear'
  | 'transactionDate'
  | 'organizationalUnit'
  | 'subject'
  | 'sourceEntity'
  | 'assignee'
  | 'priority'
  | 'status'
  | 'archivedAt'
  | 'archivedBy'
  | 'archiveNote'
  | 'attachmentCount'
  | 'attachmentNames';

type AttachmentMode = 'all' | 'with' | 'without';
type SortMode =
  | 'archive_newest'
  | 'archive_oldest'
  | 'transaction_newest'
  | 'transaction_oldest'
  | 'number'
  | 'subject'
  | 'assignee';

const columns: Array<{ key: ColumnKey; label: string; default: boolean }> = [
  { key: 'transactionNumber', label: 'رقم المعاملة', default: true },
  { key: 'trackingNumber', label: 'رقم المتابعة', default: true },
  { key: 'transactionYear', label: 'السنة', default: true },
  { key: 'transactionDate', label: 'تاريخ المعاملة', default: true },
  { key: 'organizationalUnit', label: 'الإدارة / الوحدة', default: true },
  { key: 'subject', label: 'الموضوع', default: true },
  { key: 'sourceEntity', label: 'الجهة', default: true },
  { key: 'assignee', label: 'الموظف المختص', default: true },
  { key: 'priority', label: 'الأولوية', default: false },
  { key: 'status', label: 'الحالة', default: true },
  { key: 'archivedAt', label: 'تاريخ الأرشفة', default: true },
  { key: 'archivedBy', label: 'أرشفها', default: true },
  { key: 'archiveNote', label: 'ملاحظة الأرشفة', default: false },
  { key: 'attachmentCount', label: 'عدد المرفقات', default: true },
  { key: 'attachmentNames', label: 'المرفقات', default: true },
];

const statusLabels: Partial<Record<TransactionFollowUpStatus, string>> = {
  completed: 'منجزة',
  closed: 'مغلقة',
  new: 'جديدة',
  assigned: 'تحت التنفيذ',
  in_progress: 'تحت التنفيذ',
  waiting_response: 'بانتظار جهة',
  needs_follow_up: 'تحتاج متابعة',
};

const priorityLabels: Record<TransactionFollowUpPriority, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
};

const unitLabels: Record<TransactionFollowUpOrganizationalUnit, string> = {
  endowments_properties: 'إدارة أوقاف وأملاك الجامعة',
  mosques_prayer_rooms: 'وحدة العناية بالمساجد والمصليات الجامعية',
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('ar-SA-u-ca-gregory');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ar-SA-u-ca-gregory', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatTransactionDate = (record: TransactionFollowUpRecord) => {
  if (record.transactionDateType === 'hijri' && record.transactionDateInput) {
    return `${record.transactionDateInput}هـ`;
  }
  return formatDate(record.transactionDate);
};

const transactionDateTimestamp = (record: TransactionFollowUpRecord) => {
  if (record.transactionDateType === 'hijri') return 0;
  const timestamp = new Date(record.transactionDate).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const archiveTimestamp = (record: TransactionFollowUpRecord) => {
  const timestamp = new Date(record.archivedAt || '').getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const within = (value: string | null | undefined, from: string, to: string) => {
  if (!from && !to) return true;
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return false;
  if (from && timestamp < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && timestamp > new Date(`${to}T23:59:59`).getTime()) return false;
  return true;
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

const defaultColumns = () =>
  new Set<ColumnKey>(columns.filter((column) => column.default).map((column) => column.key));

const attachmentTitles = (record: TransactionFollowUpRecord) =>
  (record.attachments || []).map((attachment) => attachment.title || 'مرفق').join('، ') || '—';

const unitLabel = (record: TransactionFollowUpRecord) =>
  record.organizationalUnit
    ? unitLabels[record.organizationalUnit]
    : 'غير محددة للمعاملات السابقة';

export const ArchivedTransactionsReportsDialog: React.FC<Props> = ({
  transactions,
  open,
  onOpenChange,
}) => {
  const [title, setTitle] = useState('تقرير المعاملات المؤرشفة من نظام المتابعة');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [unit, setUnit] = useState('');
  const [sourceEntity, setSourceEntity] = useState('');
  const [assignee, setAssignee] = useState('');
  const [archivedBy, setArchivedBy] = useState('');
  const [archiveFrom, setArchiveFrom] = useState('');
  const [archiveTo, setArchiveTo] = useState('');
  const [transactionFrom, setTransactionFrom] = useState('');
  const [transactionTo, setTransactionTo] = useState('');
  const [attachmentMode, setAttachmentMode] = useState<AttachmentMode>('all');
  const [sortBy, setSortBy] = useState<SortMode>('archive_newest');
  const [paperSize, setPaperSize] = useState<'A4' | 'A3'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [compact, setCompact] = useState(true);
  const [includeAttachmentAppendix, setIncludeAttachmentAppendix] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(defaultColumns);

  const sources = useMemo(
    () => Array.from(new Set(transactions.map((item) => item.sourceEntity?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')),
    [transactions],
  );
  const assignees = useMemo(
    () => Array.from(new Set(transactions.map((item) => item.currentAssigneeName?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')),
    [transactions],
  );
  const archivists = useMemo(
    () => Array.from(new Set(transactions.map((item) => item.archivedByName?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')),
    [transactions],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    const rows = transactions.filter((record) => {
      const attachments = record.attachments || [];
      const matchesQuery =
        !normalized ||
        [
          record.transactionNumber,
          record.trackingNumber,
          record.transactionYear,
          record.subject,
          record.sourceEntity,
          record.currentAssigneeName,
          record.archivedByName,
          record.archiveNote,
          unitLabel(record),
          ...attachments.flatMap((attachment) => [
            attachment.title,
            attachment.mimeType,
            attachment.notes,
            attachment.createdBy,
          ]),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalized));

      const matchesStatus = !status || record.status === status;
      const matchesUnit = !unit || record.organizationalUnit === unit;
      const matchesSource = !sourceEntity || record.sourceEntity === sourceEntity;
      const matchesAssignee = !assignee || record.currentAssigneeName === assignee;
      const matchesArchivedBy = !archivedBy || record.archivedByName === archivedBy;
      const matchesArchiveDate = within(record.archivedAt, archiveFrom, archiveTo);
      const matchesTransactionDate =
        !transactionFrom && !transactionTo
          ? true
          : record.transactionDateType !== 'hijri' &&
            within(record.transactionDate, transactionFrom, transactionTo);
      const matchesAttachments =
        attachmentMode === 'all' ||
        (attachmentMode === 'with' && attachments.length > 0) ||
        (attachmentMode === 'without' && attachments.length === 0);

      return (
        matchesQuery &&
        matchesStatus &&
        matchesUnit &&
        matchesSource &&
        matchesAssignee &&
        matchesArchivedBy &&
        matchesArchiveDate &&
        matchesTransactionDate &&
        matchesAttachments
      );
    });

    return [...rows].sort((a, b) => {
      if (sortBy === 'archive_oldest') return archiveTimestamp(a) - archiveTimestamp(b);
      if (sortBy === 'transaction_newest') return transactionDateTimestamp(b) - transactionDateTimestamp(a);
      if (sortBy === 'transaction_oldest') return transactionDateTimestamp(a) - transactionDateTimestamp(b);
      if (sortBy === 'number') return String(a.transactionNumber || '').localeCompare(String(b.transactionNumber || ''), 'ar', { numeric: true });
      if (sortBy === 'subject') return String(a.subject || '').localeCompare(String(b.subject || ''), 'ar');
      if (sortBy === 'assignee') return String(a.currentAssigneeName || '').localeCompare(String(b.currentAssigneeName || ''), 'ar');
      return archiveTimestamp(b) - archiveTimestamp(a);
    });
  }, [
    transactions,
    query,
    status,
    unit,
    sourceEntity,
    assignee,
    archivedBy,
    archiveFrom,
    archiveTo,
    transactionFrom,
    transactionTo,
    attachmentMode,
    sortBy,
  ]);

  const activeColumns = columns.filter((column) => selectedColumns.has(column.key));
  const attachmentCount = useMemo(
    () => filtered.reduce((sum, record) => sum + (record.attachments?.length || 0), 0),
    [filtered],
  );
  const withAttachments = useMemo(
    () => filtered.filter((record) => (record.attachments?.length || 0) > 0).length,
    [filtered],
  );

  const valueForColumn = (record: TransactionFollowUpRecord, key: ColumnKey) => {
    if (key === 'transactionNumber') return record.transactionNumber || '—';
    if (key === 'trackingNumber') return record.trackingNumber || '—';
    if (key === 'transactionYear') {
      return record.transactionYear
        ? `${record.transactionYear}${record.transactionDateType === 'hijri' ? 'هـ' : 'م'}`
        : '—';
    }
    if (key === 'transactionDate') return formatTransactionDate(record);
    if (key === 'organizationalUnit') return unitLabel(record);
    if (key === 'subject') return record.subject || '—';
    if (key === 'sourceEntity') return record.sourceEntity || '—';
    if (key === 'assignee') return record.currentAssigneeName || '—';
    if (key === 'priority') return priorityLabels[record.priority] || record.priority;
    if (key === 'status') return statusLabels[record.status] || record.status;
    if (key === 'archivedAt') return formatDate(record.archivedAt);
    if (key === 'archivedBy') return record.archivedByName || '—';
    if (key === 'archiveNote') return record.archiveNote || '—';
    if (key === 'attachmentCount') return record.attachments?.length || 0;
    if (key === 'attachmentNames') return attachmentTitles(record);
    return '—';
  };

  const filterSummary = () =>
    [
      query ? `بحث: ${query}` : '',
      status ? `الحالة: ${statusLabels[status as TransactionFollowUpStatus] || status}` : '',
      unit ? `الوحدة: ${unitLabels[unit as TransactionFollowUpOrganizationalUnit] || unit}` : '',
      sourceEntity ? `الجهة: ${sourceEntity}` : '',
      assignee ? `الموظف: ${assignee}` : '',
      archivedBy ? `أرشفها: ${archivedBy}` : '',
      archiveFrom ? `الأرشفة من: ${archiveFrom}` : '',
      archiveTo ? `الأرشفة إلى: ${archiveTo}` : '',
      transactionFrom ? `تاريخ المعاملة الميلادي من: ${transactionFrom}` : '',
      transactionTo ? `تاريخ المعاملة الميلادي إلى: ${transactionTo}` : '',
      attachmentMode === 'with' ? 'بها مرفقات' : attachmentMode === 'without' ? 'دون مرفقات' : '',
    ]
      .filter(Boolean)
      .join(' | ') || 'بدون فلاتر إضافية';

  const toggleColumn = (key: ColumnKey) => {
    setSelectedColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const reset = () => {
    setQuery('');
    setStatus('');
    setUnit('');
    setSourceEntity('');
    setAssignee('');
    setArchivedBy('');
    setArchiveFrom('');
    setArchiveTo('');
    setTransactionFrom('');
    setTransactionTo('');
    setAttachmentMode('all');
    setSortBy('archive_newest');
    setSelectedColumns(defaultColumns());
    setIncludeAttachmentAppendix(true);
  };

  const attachmentAppendixHtml = () => {
    if (!includeAttachmentAppendix) return '';
    const sections = filtered
      .filter((record) => (record.attachments?.length || 0) > 0)
      .map((record) => {
        const list = (record.attachments || [])
          .map(
            (attachment, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(attachment.title || 'مرفق')}</td>
                <td>${escapeHtml(attachment.mimeType || 'ملف')}</td>
                <td>${escapeHtml(attachment.createdBy || '—')}</td>
                <td>${escapeHtml(formatDate(attachment.createdAt))}</td>
                <td><a href="${escapeHtml(attachment.driveUrl)}" target="_blank">فتح المرفق</a></td>
              </tr>`,
          )
          .join('');

        return `
          <section class="attachment-section">
            <h3>مرفقات المعاملة ${escapeHtml(record.transactionNumber)} — ${escapeHtml(record.subject)}</h3>
            <table>
              <thead><tr><th>#</th><th>اسم المرفق</th><th>النوع</th><th>أضيف بواسطة</th><th>التاريخ</th><th>الرابط</th></tr></thead>
              <tbody>${list}</tbody>
            </table>
          </section>`;
      })
      .join('');

    if (!sections) {
      return '<section class="attachment-section"><h2>المرفقات</h2><p>لا توجد مرفقات ضمن نتائج التقرير.</p></section>';
    }

    return `<div class="page-break"></div><h2>ملحق المرفقات</h2>${sections}`;
  };

  const printReport = () => {
    if (!filtered.length) {
      toast.error('لا توجد معاملات مطابقة لإعدادات التقرير');
      return;
    }
    if (!activeColumns.length) {
      toast.error('اختر عمودًا واحدًا على الأقل');
      return;
    }

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1360,height=900');
    if (!popup) {
      toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.');
      return;
    }

    const rows = filtered
      .map(
        (record) =>
          `<tr>${activeColumns
            .map((column) => `<td>${escapeHtml(valueForColumn(record, column.key))}</td>`)
            .join('')}</tr>`,
      )
      .join('');

    popup.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
@page{size:${paperSize} ${orientation};margin:10mm}
*{box-sizing:border-box}
body{font-family:Arial,Tahoma,sans-serif;color:#172033;margin:0;font-size:${compact ? '10px' : '11px'}}
.head{border:1px solid #cbd5e1;border-radius:12px;padding:14px;margin-bottom:10px;background:#f8fafc}
.uni{font-size:11px;color:#0f766e;font-weight:700}
.title{font-size:22px;font-weight:800;color:#123047;margin:5px 0}
.meta{color:#64748b;line-height:1.8}
.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}
.metric{border:1px solid #cbd5e1;border-radius:8px;padding:7px;text-align:center;background:#fff}
.metric b{display:block;font-size:16px;color:#0369a1}
.filters{background:#e0f2fe;border:1px solid #bae6fd;padding:7px 10px;border-radius:8px;margin:8px 0;line-height:1.7}
table{width:100%;border-collapse:collapse;table-layout:auto}
th{background:#123047;color:white;font-weight:700;padding:${compact ? '6px' : '8px'};border:1px solid #94a3b8}
td{padding:${compact ? '5px' : '7px'};border:1px solid #cbd5e1;vertical-align:top;word-break:break-word}
tbody tr:nth-child(even){background:#f8fafc}
.attachment-section{margin:12px 0 18px;break-inside:avoid}
.attachment-section h3{font-size:13px;color:#123047;margin:0 0 6px}
.attachment-section a{color:#0563c1;text-decoration:underline}
.page-break{break-before:page}
.footer{margin-top:10px;color:#64748b;font-size:9px;text-align:left}
@media print{.head{break-inside:avoid}tr{break-inside:avoid}.page-break{break-before:page}}
</style>
</head>
<body>
<div class="head">
  <div class="uni">جامعة الإمام عبدالرحمن بن فيصل — منصة إدارة الأصول والأملاك والأوقاف الجامعية</div>
  <div class="title">${escapeHtml(title)}</div>
  <div class="meta">تاريخ الاستخراج: ${escapeHtml(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</div>
  <div class="filters"><b>معايير التقرير:</b> ${escapeHtml(filterSummary())}</div>
  <div class="metrics">
    <div class="metric">المعاملات<b>${filtered.length}</b></div>
    <div class="metric">المعاملات ذات المرفقات<b>${withAttachments}</b></div>
    <div class="metric">إجمالي المرفقات<b>${attachmentCount}</b></div>
    <div class="metric">بدون مرفقات<b>${filtered.length - withAttachments}</b></div>
  </div>
</div>
<table>
  <thead><tr>${activeColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody>
</table>
${attachmentAppendixHtml()}
<div class="footer">تقرير مرن للمعاملات المؤرشفة — ${filtered.length} معاملة — ${attachmentCount} مرفق</div>
<script>window.onload=()=>setTimeout(()=>window.print(),250);<\/script>
</body>
</html>`);
    popup.document.close();
  };

  const exportExcel = async () => {
    if (!filtered.length) {
      toast.error('لا توجد معاملات مطابقة لإعدادات التقرير');
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

      const summary = workbook.addWorksheet('ملخص', {
        views: [{ rightToLeft: true, showGridLines: false }],
      });
      summary.columns = [{ width: 28 }, { width: 60 }];
      summary.mergeCells('A1:B1');
      summary.getCell('A1').value = title;
      summary.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
      summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF123047' } };
      summary.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      summary.getRow(1).height = 34;

      const summaryRows: Array<[string, string | number]> = [
        ['تاريخ الاستخراج', new Date().toLocaleString('ar-SA-u-ca-gregory')],
        ['معايير التقرير', filterSummary()],
        ['عدد المعاملات', filtered.length],
        ['المعاملات ذات المرفقات', withAttachments],
        ['إجمالي المرفقات', attachmentCount],
        ['معاملات دون مرفقات', filtered.length - withAttachments],
      ];
      summaryRows.forEach(([label, value], index) => {
        const row = summary.getRow(index + 3);
        row.values = [label, value];
        row.getCell(1).font = { bold: true, color: { argb: 'FF123047' } };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
          cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
        });
      });

      const sheet = workbook.addWorksheet('المعاملات', {
        views: [{ rightToLeft: true, showGridLines: false }],
      });
      sheet.pageSetup = { orientation, fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
      const header = sheet.addRow(activeColumns.map((column) => column.label));
      header.height = 28;
      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });

      filtered.forEach((record, rowIndex) => {
        const row = sheet.addRow(activeColumns.map((column) => valueForColumn(record, column.key)));
        row.height = compact ? 22 : 30;
        row.eachCell((cell) => {
          cell.font = { size: 10, color: { argb: 'FF172033' } };
          if (rowIndex % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
          cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
        });
      });
      sheet.columns = activeColumns.map((column) => ({
        width: ['subject', 'archiveNote', 'attachmentNames'].includes(column.key) ? 34 : 18,
      }));
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: Math.max(1, filtered.length + 1), column: activeColumns.length },
      };
      sheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true, showGridLines: false }];

      if (includeAttachmentAppendix) {
        const attachmentsSheet = workbook.addWorksheet('المرفقات', {
          views: [{ rightToLeft: true, showGridLines: false }],
        });
        const attachmentHeaders = [
          'رقم المعاملة',
          'رقم المتابعة',
          'الموضوع',
          'اسم المرفق',
          'نوع الملف',
          'ملاحظات المرفق',
          'أضيف بواسطة',
          'تاريخ الإضافة',
          'رابط المرفق',
        ];
        const attachmentHeader = attachmentsSheet.addRow(attachmentHeaders);
        attachmentHeader.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        });

        filtered.forEach((record) => {
          (record.attachments || []).forEach((attachment) => {
            const row = attachmentsSheet.addRow([
              record.transactionNumber,
              record.trackingNumber,
              record.subject,
              attachment.title || 'مرفق',
              attachment.mimeType || 'ملف',
              attachment.notes || '—',
              attachment.createdBy || '—',
              formatDate(attachment.createdAt),
              'فتح المرفق',
            ]);
            row.eachCell((cell) => {
              cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
            });
            const linkCell = row.getCell(9);
            linkCell.value = {
              text: 'فتح المرفق',
              hyperlink: attachment.driveUrl,
              tooltip: attachment.title || 'فتح المرفق',
            };
            linkCell.font = { color: { argb: 'FF0563C1' }, underline: true };
          });
        });
        attachmentsSheet.columns = [
          { width: 16 },
          { width: 22 },
          { width: 34 },
          { width: 32 },
          { width: 24 },
          { width: 30 },
          { width: 20 },
          { width: 18 },
          { width: 18 },
        ];
        attachmentsSheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: Math.max(1, attachmentCount + 1), column: attachmentHeaders.length },
        };
        attachmentsSheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true, showGridLines: false }];
      }

      const buffer = await workbook.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `تقرير-المعاملات-المؤرشفة-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success('تم إنشاء التقرير المرن مع المرفقات بنجاح');
    } catch (error) {
      console.error(error);
      toast.error('تعذر إنشاء ملف Excel');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="archived-transactions-reports-dialog"
        className="max-h-[94dvh] w-[97vw] max-w-[1240px] overflow-y-auto overscroll-contain"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-5 w-5 text-emerald-700" />
            التقرير المرن للمعاملات المؤرشفة
          </DialogTitle>
          <DialogDescription>
            فرز وتصفية واختيار أعمدة التقرير، مع تضمين مرفقات المعاملات في الطباعة وPDF وExcel.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <ReportViewToggle
            storageKey="iau-archived-transactions-reports-view"
            scopeId="archived-transactions-reports-dialog"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
            <p className="text-xs text-muted-foreground">نتائج التقرير</p>
            <p className="text-2xl font-black text-emerald-800">{filtered.length.toLocaleString('ar-SA')}</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3">
            <p className="text-xs text-muted-foreground">إجمالي المرفقات</p>
            <p className="text-2xl font-black text-sky-800">{attachmentCount.toLocaleString('ar-SA')}</p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3">
            <p className="text-xs text-muted-foreground">معاملات بها مرفقات</p>
            <p className="text-2xl font-black text-violet-800">{withAttachments.toLocaleString('ar-SA')}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">دون مرفقات</p>
            <p className="text-2xl font-black text-slate-800">{(filtered.length - withAttachments).toLocaleString('ar-SA')}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-black text-slate-800">
              <Filter className="h-4 w-4" />
              التصفية والفرز
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="ml-2 h-4 w-4" />
              إعادة ضبط
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <Label>عنوان التقرير</Label>
              <Input className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="relative xl:col-span-2">
              <Label>بحث شامل</Label>
              <Search className="absolute bottom-3 right-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="mt-1 pr-9"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="رقم المعاملة، المتابعة، الموضوع، الجهة، الموظف، اسم المرفق..."
              />
            </div>

            <div>
              <Label>الحالة</Label>
              <NativeSelect className="mt-1" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">الكل</option>
                <option value="completed">منجزة</option>
                <option value="closed">مغلقة</option>
              </NativeSelect>
            </div>
            <div>
              <Label>الإدارة / الوحدة</Label>
              <NativeSelect className="mt-1" value={unit} onChange={(event) => setUnit(event.target.value)}>
                <option value="">الكل</option>
                {Object.entries(unitLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label>الجهة</Label>
              <NativeSelect className="mt-1" value={sourceEntity} onChange={(event) => setSourceEntity(event.target.value)}>
                <option value="">الكل</option>
                {sources.map((value) => <option key={value} value={value}>{value}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>الموظف المختص</Label>
              <NativeSelect className="mt-1" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                <option value="">الكل</option>
                {assignees.map((value) => <option key={value} value={value}>{value}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>أرشفها</Label>
              <NativeSelect className="mt-1" value={archivedBy} onChange={(event) => setArchivedBy(event.target.value)}>
                <option value="">الكل</option>
                {archivists.map((value) => <option key={value} value={value}>{value}</option>)}
              </NativeSelect>
            </div>
            <div>
              <Label>المرفقات</Label>
              <NativeSelect className="mt-1" value={attachmentMode} onChange={(event) => setAttachmentMode(event.target.value as AttachmentMode)}>
                <option value="all">الكل</option>
                <option value="with">بها مرفقات</option>
                <option value="without">دون مرفقات</option>
              </NativeSelect>
            </div>
            <div>
              <Label>الأرشفة من</Label>
              <Input className="mt-1" type="date" value={archiveFrom} onChange={(event) => setArchiveFrom(event.target.value)} />
            </div>
            <div>
              <Label>الأرشفة إلى</Label>
              <Input className="mt-1" type="date" value={archiveTo} onChange={(event) => setArchiveTo(event.target.value)} />
            </div>
            <div>
              <Label>تاريخ المعاملة الميلادي من</Label>
              <Input className="mt-1" type="date" value={transactionFrom} onChange={(event) => setTransactionFrom(event.target.value)} />
            </div>
            <div>
              <Label>تاريخ المعاملة الميلادي إلى</Label>
              <Input className="mt-1" type="date" value={transactionTo} onChange={(event) => setTransactionTo(event.target.value)} />
            </div>
            <div>
              <Label>الفرز</Label>
              <NativeSelect className="mt-1" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortMode)}>
                <option value="archive_newest">الأحدث أرشفة</option>
                <option value="archive_oldest">الأقدم أرشفة</option>
                <option value="transaction_newest">الأحدث بتاريخ المعاملة</option>
                <option value="transaction_oldest">الأقدم بتاريخ المعاملة</option>
                <option value="number">رقم المعاملة</option>
                <option value="subject">الموضوع</option>
                <option value="assignee">الموظف</option>
              </NativeSelect>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="font-black text-slate-800">أعمدة التقرير</div>
            <Badge variant="outline">{activeColumns.length} عمود</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {columns.map((column) => (
              <label
                key={column.key}
                className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedColumns.has(column.key)}
                  onChange={() => toggleColumn(column.key)}
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>حجم الورق</Label>
            <NativeSelect className="mt-1" value={paperSize} onChange={(event) => setPaperSize(event.target.value as typeof paperSize)}>
              <option value="A4">A4</option>
              <option value="A3">A3</option>
            </NativeSelect>
          </div>
          <div>
            <Label>الاتجاه</Label>
            <NativeSelect className="mt-1" value={orientation} onChange={(event) => setOrientation(event.target.value as typeof orientation)}>
              <option value="landscape">أفقي</option>
              <option value="portrait">عمودي</option>
            </NativeSelect>
          </div>
          <label className="mt-6 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
            <input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} />
            جدول مضغوط
          </label>
          <label className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm font-semibold text-emerald-900">
            <input
              type="checkbox"
              checked={includeAttachmentAppendix}
              onChange={(event) => setIncludeAttachmentAppendix(event.target.checked)}
            />
            <Paperclip className="h-4 w-4" />
            تضمين ملحق المرفقات
          </label>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          عند اختيار «تضمين ملحق المرفقات» تضاف أسماء المرفقات وروابط فتحها إلى الطباعة/‏PDF، ويضاف لها Sheet مستقل في Excel.
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button variant="outline" onClick={printReport}>
            <Printer className="ml-2 h-4 w-4" />
            طباعة / PDF مع المرفقات
          </Button>
          <Button onClick={exportExcel}>
            <FileSpreadsheet className="ml-2 h-4 w-4" />
            تصدير Excel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArchivedTransactionsReportsDialog;
