import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Filter,
  Image as ImageIcon,
  Layers3,
  Printer,
  RotateCcw,
  Search,
  UploadCloud,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import { Badge } from '../components/ui/badge';
import {
  getAttachmentPreviewUrl,
  isImageAttachmentPreview,
} from '../components/AttachmentPreview';
import { usePermissions } from '../../context/PermissionsContext';
import {
  downloadOfficialAssetExcelTemplate,
  getAsset,
  getAssetGroups,
  getAssetReportPage,
  getOfficialAssetExcelTemplate,
  uploadOfficialAssetExcelTemplate,
  type AssetExcelTemplateMeta,
  type AssetGroupSummary,
} from '../api/assets';
import { buildOfficialAssetExcel } from '../../utils/officialAssetExcel';
import type { AssetRecord } from '../../types/asset';
import { ASSET_STATUS_LABELS } from '../../types/asset';

const CATEGORY_LABELS: Record<string, string> = {
  it: 'تقنية معلومات',
  furniture: 'الأثاث',
  equipment: 'الآلات والمعدات',
  vehicle: 'أصول النقل العام',
  infrastructure: 'البنية التحتية',
  intangible: 'الأصول غير الملموسة',
  land: 'الأراضي',
  other: 'أخرى',
};

const printableFields = [
  ['itemNumber', 'رقم الصنف'],
  ['barcode', 'الباركود'],
  ['name', 'اسم الأصل'],
  ['category', 'التصنيف'],
  ['brand', 'الماركة'],
  ['model', 'الموديل'],
  ['serialNumber', 'الرقم التسلسلي'],
  ['status', 'الحالة'],
  ['department', 'الجهة / الإدارة'],
  ['building', 'المبنى'],
  ['floor', 'الدور'],
  ['room', 'الغرفة / الموقع'],
  ['cardNumber', 'رقم البطاقة'],
  ['purchaseDate', 'تاريخ الشراء'],
  ['purchaseValue', 'قيمة الشراء'],
  ['attachments', 'عدد المرفقات'],
] as const;

type FieldKey = (typeof printableFields)[number][0];

type ReportAsset = AssetRecord & { attachmentsCount?: number };

const SCREEN_COLUMN_WEIGHTS: Record<FieldKey, number> = {
  itemNumber: 8,
  barcode: 10,
  name: 15,
  category: 8,
  brand: 7,
  model: 7,
  serialNumber: 10,
  status: 7,
  department: 15,
  building: 7,
  floor: 5,
  room: 9,
  cardNumber: 8,
  purchaseDate: 8,
  purchaseValue: 9,
  attachments: 6,
};

const valueFor = (asset: ReportAsset, key: FieldKey) => {
  if (key === 'category') return CATEGORY_LABELS[asset.category] || asset.category || '-';
  if (key === 'status') return ASSET_STATUS_LABELS[asset.status] || asset.status || '-';
  if (key === 'purchaseDate') {
    return asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('ar-SA') : '-';
  }
  if (key === 'purchaseValue') {
    return asset.purchaseValue != null ? Number(asset.purchaseValue).toLocaleString('ar-SA') : '-';
  }
  if (key === 'attachments') return asset.attachmentsCount ?? asset.attachments?.length ?? 0;
  const value = asset[key as keyof ReportAsset];
  return value === null || value === undefined || value === '' ? '-' : String(value);
};

const escapeHtml = (value: unknown) =>
  String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const openPrintHtml = (html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    return false;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  return true;
};

const buildSingleAssetHtml = (asset: AssetRecord) => {
  const images = (asset.attachments || []).filter((attachment) => isImageAttachmentPreview(attachment));
  const imageHtml = images.length
    ? images.map((attachment, index) => {
        const url = getAttachmentPreviewUrl(attachment);
        return url ? `<figure><img src="${escapeHtml(url)}" alt="صورة ${index + 1}"/><figcaption>${escapeHtml(attachment.title || `صورة ${index + 1}`)}</figcaption></figure>` : '';
      }).join('')
    : '<div class="empty">لا توجد صور مرفقة بهذا الأصل.</div>';

  const fields: Array<[string, unknown]> = [
    ['رقم الصنف', asset.itemNumber || asset.assetNumber],
    ['الباركود', asset.barcode],
    ['اسم الأصل', asset.name],
    ['التصنيف', CATEGORY_LABELS[asset.category] || asset.category],
    ['الحالة', ASSET_STATUS_LABELS[asset.status] || asset.status],
    ['الحالة الفنية', asset.technicalCondition],
    ['الجهة / الإدارة', asset.department || asset.responsibleDepartment],
    ['المبنى', asset.building],
    ['الدور', asset.floor],
    ['الغرفة / الموقع', asset.room],
    ['الرقم التسلسلي', asset.serialNumber],
    ['رقم البطاقة', asset.cardNumber],
    ['قيمة الشراء', asset.purchaseValue != null ? `${Number(asset.purchaseValue).toLocaleString('ar-SA')} ر.س` : '-'],
  ];

  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>تقرير أصل</title><style>
  @page{size:A4 portrait;margin:7mm}*{box-sizing:border-box}html{background:#eef2f6;padding:1px 0}body{font-family:Tahoma,Arial,sans-serif;color:#172033;width:calc(100% - 24px);max-width:190mm;min-height:270mm;margin:12px auto;background:#fff;border:1px solid #d7e0ea;box-shadow:0 12px 32px rgba(15,23,42,.10);display:flex;flex-direction:column}.head{text-align:center;border-top:4px solid #1f4e79;border-bottom:1px solid #d7e0ea;padding:8px 10px 7px;margin-bottom:7px}.head h1{font-size:18px;line-height:1.15;margin:0;font-weight:800;color:#10233f}.head p{font-size:9px;line-height:1.2;color:#64748b;margin:2px 0 0}.title{font-size:14px;line-height:1.2;font-weight:800;color:#1f4e79;margin-top:4px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;padding:0 8px}.field{border:1px solid #d9e2ec;border-radius:6px;padding:5px 7px;min-height:38px;background:#fff;break-inside:avoid}.field:nth-child(3),.field:nth-child(7){grid-column:1/-1}.label{font-size:8px;line-height:1.1;color:#718096}.value{font-size:11px;line-height:1.25;font-weight:700;margin-top:3px;color:#10233f;overflow-wrap:anywhere}.photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px;padding:0 8px}figure{margin:0;border:1px solid #d9e2ec;border-radius:6px;padding:5px;break-inside:avoid;background:#fff}figure img{display:block;width:100%;height:74mm;object-fit:contain;background:#f8fafc}figcaption{text-align:center;font-size:8px;line-height:1.2;color:#64748b;margin-top:4px}.empty{grid-column:1/-1;border:1px dashed #b9c8d8;border-radius:6px;padding:14px 8px;text-align:center;color:#64748b;background:#fbfdff;font-size:10px}.foot{margin-top:auto;border-top:1px solid #d9e2ec;padding:5px 8px;font-size:7.5px;line-height:1.2;color:#64748b;display:flex;justify-content:space-between;gap:12px}@media(max-width:760px){body{width:calc(100% - 12px);margin:6px auto;min-height:auto}.grid{grid-template-columns:1fr}.field:nth-child(3),.field:nth-child(7){grid-column:auto}.photos{grid-template-columns:1fr}}@media print{html{background:#fff;padding:0}body{width:100%;max-width:none;min-height:calc(297mm - 14mm);margin:0;border:0;box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}.head{padding:3.5mm 4mm 3mm;margin-bottom:3mm}.grid{padding:0 5mm;gap:2mm}.photos{padding:0 5mm;margin-top:3mm;gap:2mm}.foot{padding:2mm 5mm}}</style></head><body>
  <div class="head"><h1>جامعة الإمام عبدالرحمن بن فيصل</h1><p>الإدارة العامة للأصول والأملاك والأوقاف الجامعية</p><div class="title">تقرير أصل مستقل</div></div>
  <div class="grid">${fields.map(([label,value]) => `<div class="field"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value || '-')}</div></div>`).join('')}</div>
  <div class="photos">${imageHtml}</div><div class="foot"><span>تاريخ التقرير: ${escapeHtml(new Date().toLocaleString('ar-SA'))}</span><span>وحدة الأصول</span></div>
  <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
};

export const AssetReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canPrint = isAdmin || hasPermission('assets', 'canPrint');

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [group, setGroup] = useState('all');
  const [sortKey, setSortKey] = useState<FieldKey>('itemNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [rows, setRows] = useState<ReportAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [groups, setGroups] = useState<AssetGroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(printableFields.map(([key]) => key));
  const [officialTemplate, setOfficialTemplate] = useState<AssetExcelTemplateMeta | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [officialExporting, setOfficialExporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [officialExcelMessage, setOfficialExcelMessage] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status, category, group, sortKey, sortDirection, pageSize]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAssetReportPage({
      search: debouncedQuery,
      status,
      category,
      group,
      page,
      limit: pageSize,
      sortKey,
      sortDirection,
    }).then((result) => {
      if (cancelled) return;
      setRows(result.items || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 0);
    }).catch(() => {
      if (!cancelled) {
        setRows([]);
        setTotal(0);
        setTotalPages(0);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [debouncedQuery, status, category, group, page, pageSize, sortKey, sortDirection]);

  useEffect(() => {
    let cancelled = false;
    setGroupsLoading(true);
    getAssetGroups({ search: debouncedQuery, category, status })
      .then((result) => {
        if (cancelled) return;
        setGroups(Array.isArray(result) ? result : []);
        if (group !== 'all' && !result.some((item) => item.key === group)) setGroup('all');
      })
      .catch(() => { if (!cancelled) setGroups([]); })
      .finally(() => { if (!cancelled) setGroupsLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery, category, status]);

  useEffect(() => {
    let cancelled = false;
    setTemplateLoading(true);
    getOfficialAssetExcelTemplate()
      .then((template) => { if (!cancelled) setOfficialTemplate(template); })
      .catch(() => { if (!cancelled) setOfficialTemplate(null); })
      .finally(() => { if (!cancelled) setTemplateLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const activeGroup = useMemo(() => groups.find((item) => item.key === group), [groups, group]);
  const totalPurchaseValue = useMemo(() => rows.reduce((sum, asset) => sum + Number(asset.purchaseValue || 0), 0), [rows]);

  const fetchAllFilteredRows = async () => {
    const result = await getAssetReportPage({
      search: debouncedQuery,
      status,
      category,
      group,
      sortKey,
      sortDirection,
      all: true,
    });
    return result.items || [];
  };

  const resetFilters = () => {
    setQuery('');
    setDebouncedQuery('');
    setStatus('all');
    setCategory('all');
    setGroup('all');
    setSortKey('itemNumber');
    setSortDirection('asc');
    setPage(1);
  };

  const toggleField = (key: FieldKey) => {
    setSelectedFields((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const handleOfficialTemplateUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setOfficialExcelMessage('القالب الرسمي يجب أن يكون بصيغة XLSX.');
      return;
    }
    try {
      setTemplateUploading(true);
      setOfficialExcelMessage('جارٍ رفع القالب الرسمي واعتماده...');
      const uploaded = await uploadOfficialAssetExcelTemplate(file);
      setOfficialTemplate(uploaded);
      setOfficialExcelMessage('تم اعتماد قالب Excel الرسمي بنجاح.');
    } catch (error: any) {
      setOfficialExcelMessage(error?.message || 'تعذر رفع قالب Excel الرسمي.');
    } finally {
      setTemplateUploading(false);
    }
  };

  const exportOfficialExcel = async () => {
    if (!officialTemplate || total === 0) return;
    try {
      setOfficialExporting(true);
      setOfficialExcelMessage('جارٍ تجهيز جميع نتائج التصفية داخل أوراق Excel الرسمية المناسبة...');
      const [templateBuffer, allRows] = await Promise.all([downloadOfficialAssetExcelTemplate(), fetchAllFilteredRows()]);
      const result = await buildOfficialAssetExcel(templateBuffer, allRows);
      saveAs(result.blob, `نموذج-الأصول-الرسمي-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setOfficialExcelMessage(`تم تجهيز ${result.exportedCount} سجل من نتائج التصفية الحالية وتوزيعها على أوراق القالب الرسمية حسب نوع الأصل.`);
    } catch (error: any) {
      setOfficialExcelMessage(error?.message || 'تعذر تجهيز نموذج Excel الرسمي.');
    } finally {
      setOfficialExporting(false);
    }
  };

  const exportExcel = async () => {
    if (!total) return;
    try {
      setExporting(true);
      const allRows = await fetchAllFilteredRows();
      const data = allRows.map((asset, index) => {
        const row: Record<string, unknown> = { '#': index + 1 };
        printableFields.forEach(([key, label]) => {
          if (selectedFields.includes(key)) row[label] = valueFor(asset, key);
        });
        return row;
      });
      const sheet = XLSX.utils.json_to_sheet(data);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, activeGroup?.label?.slice(0, 31) || 'الأصول');
      XLSX.writeFile(book, `assets-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const printReport = async () => {
    if (!canPrint || !total || !selectedFields.length) return;
    try {
      setExporting(true);
      const allRows = await fetchAllFilteredRows();
      const headers = selectedFields.map((key) => printableFields.find(([field]) => field === key)?.[1] || key).map((label) => `<th>${escapeHtml(label)}</th>`).join('');
      const printWeights: Record<FieldKey, number> = { itemNumber: 8, barcode: 10, name: 14, category: 7, brand: 6, model: 7, serialNumber: 9, status: 6, department: 13, building: 6, floor: 4, room: 8, cardNumber: 8, purchaseDate: 7, purchaseValue: 8, attachments: 5 };
      const weightTotal = 3 + selectedFields.reduce((sum, key) => sum + (printWeights[key] || 7), 0);
      const colgroup = `<colgroup><col style="width:${(3 / weightTotal * 100).toFixed(3)}%">${selectedFields.map((key) => `<col style="width:${((printWeights[key] || 7) / weightTotal * 100).toFixed(3)}%">`).join('')}</colgroup>`;
      const body = allRows.map((asset, index) => `<tr><td>${index + 1}</td>${selectedFields.map((key) => `<td>${escapeHtml(valueFor(asset, key))}</td>`).join('')}</tr>`).join('');
      const groupLabel = activeGroup?.label || 'جميع المجموعات';
      openPrintHtml(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>تقرير الأصول</title><style>
      @page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{width:100%;margin:0!important;padding:0!important}body{font-family:Tahoma,Arial,sans-serif;color:#172033}.header{text-align:center;border-bottom:1px solid #1f4e79;padding:0;margin:0}.header h1{font-size:14px;line-height:1;margin:0;font-weight:800}.sub{font-size:8px;line-height:1;color:#64748b;margin:0}.filters{margin:0;padding:1px 2px;border:1px solid #dbe3ec;border-radius:0;font-size:8.5px;line-height:1}.summary{display:flex;gap:0;margin:0}.summary div{flex:1;border:1px solid #dbe3ec;border-radius:0;padding:1px 2px;text-align:center;line-height:1;font-size:9px}.summary strong{font-size:12px}table{width:100%;margin:0;border-collapse:collapse;border-spacing:0;table-layout:fixed;font-size:11px;line-height:1.02}th{background:#1f4e79;color:#fff;padding:.6px 1px;border:.45px solid #dbe3ec;font-size:11px;font-weight:800;vertical-align:middle;white-space:normal;overflow-wrap:anywhere}td{padding:.45px 1px;border:.45px solid #dbe3ec;font-size:11px;text-align:center;vertical-align:middle;white-space:normal;overflow-wrap:anywhere;word-break:break-word}tbody tr:nth-child(even){background:#f8fafc}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}.footer{margin-top:0;padding:0 1px;font-size:7px;line-height:1;color:#64748b;display:flex;justify-content:space-between}</style></head><body>
      <div class="header"><h1>جامعة الإمام عبدالرحمن بن فيصل</h1><div class="sub">الإدارة العامة للأصول والأملاك والأوقاف الجامعية</div><div class="sub">تقرير الأصول — ${escapeHtml(groupLabel)}</div></div>
      <div class="filters">التصنيف: ${escapeHtml(category === 'all' ? 'الكل' : CATEGORY_LABELS[category] || category)} | الحالة: ${escapeHtml(status === 'all' ? 'الكل' : ASSET_STATUS_LABELS[status] || status)} | المجموعة: ${escapeHtml(groupLabel)}${debouncedQuery ? ` | البحث: ${escapeHtml(debouncedQuery)}` : ''}</div>
      <div class="summary"><div>إجمالي السجلات<br><strong>${allRows.length.toLocaleString('ar-SA')}</strong></div><div>إجمالي قيمة الشراء<br><strong>${allRows.reduce((sum,a)=>sum+Number(a.purchaseValue||0),0).toLocaleString('ar-SA')} ر.س</strong></div></div>
      <table>${colgroup}<thead><tr><th>#</th>${headers}</tr></thead><tbody>${body}</tbody></table><div class="footer"><span>تاريخ التقرير: ${escapeHtml(new Date().toLocaleString('ar-SA'))}</span><span>وحدة الأصول</span></div><script>window.onload=()=>window.print()</script></body></html>`);
    } finally {
      setExporting(false);
    }
  };

  const printSingleAsset = async (asset: ReportAsset) => {
    if (!canPrint) return;
    try {
      const fullAsset = await getAsset(asset.id);
      openPrintHtml(buildSingleAssetHtml(fullAsset));
    } catch {
      openPrintHtml(buildSingleAssetHtml(asset));
    }
  };

  const printCurrentPageImages = async () => {
    if (!canPrint || !rows.length) return;
    try {
      setExporting(true);
      const fullRows = await Promise.all(rows.map((asset) => getAsset(asset.id).catch(() => asset)));
      const pages = fullRows.map((asset) => buildSingleAssetHtml(asset).replace(/<!doctype html>[\s\S]*?<body>/i, '').replace(/<script>[\s\S]*?<\/script><\/body><\/html>$/i, '')).join('<div style="page-break-after:always"></div>');
      openPrintHtml(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>تقارير الأصول</title><style>@page{size:A4 portrait;margin:10mm}body{font-family:Tahoma,Arial,sans-serif}</style></head><body>${pages}<script>window.onload=()=>setTimeout(()=>window.print(),500)</script></body></html>`);
    } finally {
      setExporting(false);
    }
  };

  const tableColumnWeightTotal = 4 + selectedFields.reduce((sum, key) => sum + (SCREEN_COLUMN_WEIGHTS[key] || 7), 0) + (canPrint ? 9 : 0);

  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[30px] border border-white/55 bg-white/72 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.09)] backdrop-blur-xl sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">وحدة الأصول</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">تقارير الأصول</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">تصفية مرنة حسب نوع الأصل والمجموعة والحالة والبحث، مع تحميل النتائج على دفعات سريعة وتطبيق نفس التصفية على Excel وPDF والقالب الرسمي.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/assets')}><ArrowRight className="ml-2 h-4 w-4" />لوحة الأصول</Button>
      </section>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40"><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5 text-primary" />البحث والتصفية المتقدمة</CardTitle></CardHeader>
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative md:col-span-2 xl:col-span-2"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={(e)=>setQuery(e.target.value)} className="pr-10" placeholder="ابحث برقم الصنف، الباركود، الاسم، الإدارة، الموقع أو الرقم التسلسلي..."/></div>
            <NativeSelect value={category} onChange={(e)=>setCategory(e.target.value)}><option value="all">جميع التصنيفات</option>{Object.entries(CATEGORY_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</NativeSelect>
            <NativeSelect value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">جميع الحالات</option>{Object.entries(ASSET_STATUS_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</NativeSelect>
            <NativeSelect value={group} onChange={(e)=>setGroup(e.target.value)}><option value="all">جميع مجموعات الأصول</option>{groups.map((item)=><option key={item.key} value={item.key}>{item.label} ({item.count.toLocaleString('ar-SA')})</option>)}</NativeSelect>
            <Button variant="outline" onClick={resetFilters}><RotateCcw className="ml-2 h-4 w-4"/>إعادة ضبط</Button>
          </div>

          <div className="rounded-2xl border bg-background/55 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 font-black"><Layers3 className="h-5 w-5 text-primary"/>مجموعات سريعة</div><span className="text-xs text-muted-foreground">{groupsLoading ? 'جارٍ تحليل المجموعات...' : `${groups.length.toLocaleString('ar-SA')} مجموعة متاحة`}</span></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={()=>setGroup('all')} className={`rounded-full border px-4 py-2 text-xs font-bold transition ${group==='all'?'border-primary bg-primary text-primary-foreground':'bg-white/70 hover:border-primary/40'}`}>جميع المجموعات</button>
              {groups.map((item)=><button key={item.key} type="button" onClick={()=>setGroup(item.key)} className={`rounded-full border px-4 py-2 text-xs font-bold transition ${group===item.key?'border-primary bg-primary text-primary-foreground':'bg-white/70 hover:border-primary/40'}`}>{item.label}<span className="mr-2 opacity-75">{item.count.toLocaleString('ar-SA')}</span></button>)}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border bg-background/60 p-4"><div className="text-xs text-muted-foreground">نتائج التصفية</div><div className="mt-1 text-2xl font-black">{total.toLocaleString('ar-SA')}</div></div>
            <div className="rounded-2xl border bg-background/60 p-4"><div className="text-xs text-muted-foreground">المجموعة الحالية</div><div className="mt-1 truncate text-base font-black">{activeGroup?.label || 'جميع المجموعات'}</div></div>
            <div className="rounded-2xl border bg-background/60 p-4"><div className="text-xs text-muted-foreground">قيمة الصفحة الحالية</div><div className="mt-1 text-xl font-black">{totalPurchaseValue.toLocaleString('ar-SA')} ر.س</div></div>
            <div className="rounded-2xl border bg-background/60 p-4"><div className="text-xs text-muted-foreground">ترتيب النتائج</div><div className="mt-2 grid grid-cols-2 gap-2"><NativeSelect value={sortKey} onChange={(e)=>setSortKey(e.target.value as FieldKey)}>{printableFields.filter(([key])=>key!=='attachments').map(([key,label])=><option key={key} value={key}>{label}</option>)}</NativeSelect><NativeSelect value={sortDirection} onChange={(e)=>setSortDirection(e.target.value as 'asc'|'desc')}><option value="asc">تصاعدي</option><option value="desc">تنازلي</option></NativeSelect></div></div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-sm"><CardHeader className="border-b bg-white/40"><CardTitle>اختيار أعمدة التقرير</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-2 p-5 md:grid-cols-4 xl:grid-cols-6 sm:p-6">{printableFields.map(([key,label])=><label key={key} className="flex items-center gap-2 rounded-xl border bg-background/60 p-3 text-sm"><input type="checkbox" checked={selectedFields.includes(key)} onChange={()=>toggleField(key)}/><span>{label}</span></label>)}</CardContent></Card>

      <Card className="rounded-[26px] border-emerald-200/70 bg-emerald-50/35 shadow-sm"><CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 font-black"><FileSpreadsheet className="h-5 w-5 text-emerald-600"/>نموذج Excel الرسمي المعتمد</div><p className="mt-1 text-sm text-muted-foreground">يتم تطبيق التصفية الحالية على القالب الرسمي، وتوزيع السجلات على الأوراق المناسبة حسب نوع الأصل مع الحفاظ على تصميم الملف.</p><p className="mt-2 text-xs font-medium">{templateLoading?'جارٍ التحقق من القالب...':officialTemplate?`القالب المعتمد: ${officialTemplate.fileName}`:'لم يتم رفع القالب الرسمي إلى المنصة بعد.'}</p>{officialExcelMessage&&<p className="mt-2 text-xs font-semibold text-emerald-800">{officialExcelMessage}</p>}</div><div className="flex flex-wrap gap-2">{isAdmin&&<label className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-md border bg-white px-4 text-sm font-semibold ${templateUploading?'pointer-events-none opacity-60':''}`}><UploadCloud className="ml-2 h-4 w-4"/>{templateUploading?'جارٍ رفع القالب...':officialTemplate?'استبدال القالب الرسمي':'رفع القالب الرسمي'}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event)=>{const file=event.target.files?.[0]||null;void handleOfficialTemplateUpload(file);event.currentTarget.value='';}}/></label>}{canPrint&&<Button onClick={()=>void exportOfficialExcel()} disabled={templateLoading||officialExporting||!officialTemplate||!total} className="bg-emerald-700 text-white hover:bg-emerald-800"><Download className="ml-2 h-4 w-4"/>{officialExporting?'جارٍ تجهيز Excel...':'تنزيل Excel الرسمي'}</Button>}</div></CardContent></Card>

      <div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={()=>void exportExcel()} disabled={exporting||!total}><FileSpreadsheet className="ml-2 h-4 w-4"/>Excel</Button>{canPrint&&<><Button variant="outline" onClick={()=>void printReport()} disabled={exporting||!total||!selectedFields.length}><Printer className="ml-2 h-4 w-4"/>التقرير الجدولي / PDF</Button><Button onClick={()=>void printCurrentPageImages()} disabled={exporting||!rows.length}><ImageIcon className="ml-2 h-4 w-4"/>تقارير بالصور للصفحة الحالية</Button></>}<Badge variant="outline" className="rounded-full px-4 py-2">{total.toLocaleString('ar-SA')} سجل</Badge><div className="mr-auto flex items-center gap-2"><span className="text-xs text-muted-foreground">حجم الصفحة</span><NativeSelect value={String(pageSize)} onChange={(e)=>setPageSize(Number(e.target.value))} className="w-[100px]"><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="200">200</option></NativeSelect></div></div>

      <Card className="overflow-hidden rounded-[20px] border-white/55 bg-white/70 shadow-[0_12px_36px_rgba(15,23,42,0.06)] backdrop-blur-xl"><CardContent className="p-0">{loading?<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">جارٍ تحميل نتائج التقرير...</div>:!rows.length?<div className="flex min-h-[240px] items-center justify-center text-sm text-muted-foreground">لا توجد سجلات مطابقة للتصفية الحالية.</div>:<div className="overflow-x-auto p-1.5 sm:p-2"><table className="w-full table-fixed border-collapse text-[10px] leading-tight sm:text-[11px] lg:text-xs"><colgroup><col style={{width:((4/tableColumnWeightTotal)*100).toFixed(3)+'%'}}/>{selectedFields.map((key)=><col key={key} style={{width:(((SCREEN_COLUMN_WEIGHTS[key]||7)/tableColumnWeightTotal)*100).toFixed(3)+'%'}}/>)}{canPrint&&<col style={{width:((9/tableColumnWeightTotal)*100).toFixed(3)+'%'}}/>}</colgroup><thead className="bg-primary text-primary-foreground"><tr><th className="border border-primary-foreground/15 px-1 py-1.5 text-center font-extrabold leading-tight">#</th>{selectedFields.map((key)=><th key={key} className="border border-primary-foreground/15 px-1 py-1.5 text-center font-extrabold leading-tight whitespace-normal break-words [overflow-wrap:anywhere]">{printableFields.find(([field])=>field===key)?.[1]}</th>)}{canPrint&&<th className="border border-primary-foreground/15 px-1 py-1.5 text-center font-extrabold leading-tight">التقرير</th>}</tr></thead><tbody>{rows.map((asset,index)=><tr key={asset.id} className="odd:bg-white/25 even:bg-muted/20 hover:bg-primary/5"><td className="border border-border/60 px-1 py-1.5 text-center align-middle font-bold">{(page-1)*pageSize+index+1}</td>{selectedFields.map((key)=><td key={key} title={String(valueFor(asset,key))} className="border border-border/60 px-1 py-1.5 text-center align-middle font-medium leading-tight whitespace-normal break-words [overflow-wrap:anywhere]">{String(valueFor(asset,key))}</td>)}{canPrint&&<td className="border border-border/60 px-1 py-1.5 text-center align-middle"><Button type="button" variant="outline" size="sm" className="h-7 max-w-full gap-1 px-1.5 text-[10px]" title="تقرير الأصل" onClick={()=>void printSingleAsset(asset)}><Printer className="h-3.5 w-3.5 shrink-0"/><span>تقرير</span></Button></td>}</tr>)}</tbody></table></div>}</CardContent></Card>

      {totalPages>1&&<div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border bg-white/65 p-3"><Button variant="outline" disabled={page<=1||loading} onClick={()=>setPage((p)=>Math.max(1,p-1))}><ChevronRight className="ml-2 h-4 w-4"/>السابق</Button><span className="rounded-full border bg-background px-4 py-2 text-sm font-bold">الصفحة {page.toLocaleString('ar-SA')} من {totalPages.toLocaleString('ar-SA')}</span><Button variant="outline" disabled={page>=totalPages||loading} onClick={()=>setPage((p)=>Math.min(totalPages,p+1))}>التالي<ChevronLeft className="mr-2 h-4 w-4"/></Button></div>}
    </div>
  );
};
