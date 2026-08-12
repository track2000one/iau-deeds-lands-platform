import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  ArrowRight,
  BarChart3,
  Download,
  FileSpreadsheet,
  Filter,
  Layers3,
  Printer,
  RotateCcw,
  Search,
  UploadCloud,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import { usePermissions } from '../../context/PermissionsContext';
import {
  downloadOfficialAccountingExcelTemplate,
  getAccountingTransformationRecords,
  getOfficialAccountingExcelTemplate,
  uploadOfficialAccountingExcelTemplate,
  type AccountingExcelTemplateMeta,
} from '../api/accountingTransformation';
import type { AccountingTransformationRecord } from '../../types/accountingTransformation';
import { buildOfficialAccountingTransformationExcel } from '../../utils/officialAccountingTransformationExcel';
import {
  ACCOUNTING_COMMITTEE_STATUS_LABELS,
  ACCOUNTING_FIELDS,
  ACCOUNTING_RECORD_TYPE_LABELS,
  type AccountingRecordType,
} from '../config/accountingTransformationFields';

const printableFields = [
  ['recordNumber', 'رقم السجل'],
  ['recordType', 'نوع الأصل'],
  ['entityName', 'الجهة'],
  ['entityAssetNumber', 'رقم الأصل بالجهة'],
  ['assetDescription', 'وصف الأصل'],
  ['accountingGroup', 'المجموعة المحاسبية'],
  ['accountingGroupCode', 'رمز المجموعة'],
  ['accountingAssetCode', 'رمز الأصل المحاسبي'],
  ['region', 'المنطقة'],
  ['city', 'المدينة'],
  ['committeeStatus', 'حالة اللجنة'],
  ['censusProgress', 'اكتمال الحصر'],
  ['inventoryProgress', 'اكتمال الجرد'],
  ['valuationProgress', 'اكتمال التقييم'],
  ['overallProgress', 'الاكتمال العام'],
  ['createdAt', 'تاريخ الإدخال'],
  ['updatedAt', 'آخر تحديث'],
] as const;

type FieldKey = (typeof printableFields)[number][0];

type ReportSettings = {
  universityName: string;
  departmentName: string;
  reportTitle: string;
  statementTitle: string;
};

const STORAGE_KEY = 'iau-accounting-transformation-report-settings';
const DEFAULT_SETTINGS: ReportSettings = {
  universityName: 'جامعة الإمام عبدالرحمن بن فيصل',
  departmentName: 'الإدارة العامة للأصول والأملاك والأوقاف الجامعية',
  reportTitle: 'تقرير متابعة متطلبات التحول المحاسبي',
  statementTitle: 'بيان سجلات متطلبات التحول المحاسبي',
};

const ReportStat: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="rounded-[20px] border bg-white/90 p-4 shadow-[0_7px_0_rgba(30,64,95,.05),0_12px_24px_rgba(15,42,70,.06)]"><p className="text-xs text-slate-500">{title}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div>
);

const displayValue = (item: AccountingTransformationRecord, key: FieldKey) => {
  const value = item[key];
  if (key === 'recordType') return ACCOUNTING_RECORD_TYPE_LABELS[item.recordType];
  if (key === 'committeeStatus') return ACCOUNTING_COMMITTEE_STATUS_LABELS[item.committeeStatus] || item.committeeStatus;
  if (key === 'createdAt' || key === 'updatedAt') return value ? new Date(String(value)).toLocaleString('ar-SA') : '-';
  if (key.endsWith('Progress')) return `${Number(value || 0)}%`;
  return value === null || value === undefined || value === '' ? '-' : String(value);
};

const detailedSheetRows = (items: AccountingTransformationRecord[], type: AccountingRecordType) => {
  const fields = ACCOUNTING_FIELDS[type];
  return items.filter((item) => item.recordType === type).map((item) => {
    const row: Record<string, unknown> = {
      'رقم سجل اللجنة': item.recordNumber,
      'حالة متابعة اللجنة': ACCOUNTING_COMMITTEE_STATUS_LABELS[item.committeeStatus] || item.committeeStatus,
      'نسبة اكتمال الحصر': item.censusProgress,
      'نسبة اكتمال الجرد': item.inventoryProgress,
      'نسبة اكتمال التقييم': item.valuationProgress,
      'الاكتمال العام': item.overallProgress,
    };
    fields.forEach((field) => { row[field.a] = item.payload?.[field.c] ?? ''; });
    row['ملاحظات اللجنة'] = item.notes || '';
    return row;
  });
};

const groupKeyFor = (item: AccountingTransformationRecord) => {
  const code = String(item.accountingGroupCode || '').trim();
  const label = String(item.accountingGroup || '').trim();
  if (code || label) return `group:${code || label}`;
  return item.recordType === 'land' ? 'type:land' : 'type:building';
};

const groupLabelFor = (item: AccountingTransformationRecord) =>
  item.accountingGroup || item.accountingGroupCode || (item.recordType === 'land' ? 'الأراضي' : 'المباني');

const escapeHtml = (value: unknown) => String(value ?? '-').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const openPrintHtml = (html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' }); const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener,noreferrer'); if (!win) { URL.revokeObjectURL(url); return false; }
  window.setTimeout(() => URL.revokeObjectURL(url), 120000); return true;
};

export const AccountingTransformationReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canPrint = isAdmin || hasPermission('accounting_transformation', 'canPrint');
  const canAdd = isAdmin || hasPermission('accounting_transformation', 'canAdd');

  const [sourceItems, setSourceItems] = useState<AccountingTransformationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [recordType, setRecordType] = useState('all');
  const [committeeStatus, setCommitteeStatus] = useState('all');
  const [group, setGroup] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<FieldKey>('recordNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(printableFields.map(([key]) => key));
  const [officialTemplate, setOfficialTemplate] = useState<AccountingExcelTemplateMeta | null>(null);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [officialExporting, setOfficialExporting] = useState(false);
  const [officialExcelMessage, setOfficialExcelMessage] = useState('');
  const [settings, setSettings] = useState<ReportSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReportSettings>) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
  }, [settings]);

  useEffect(() => {
    let cancelled = false; setTemplateLoading(true);
    getOfficialAccountingExcelTemplate().then((template) => { if (!cancelled) setOfficialTemplate(template); }).catch(() => { if (!cancelled) setOfficialTemplate(null); }).finally(() => { if (!cancelled) setTemplateLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getAccountingTransformationRecords({ search: appliedSearch, recordType, committeeStatus, all: true });
      setSourceItems(response.items || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل التقرير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [appliedSearch, recordType, committeeStatus]);
  useEffect(() => { setPage(1); }, [group, dateFrom, dateTo, sortKey, sortDirection, pageSize, selectedFields]);

  const datedItems = useMemo(() => sourceItems.filter((item) => {
    const time = new Date(item.createdAt).getTime();
    if (dateFrom) {
      const from = new Date(`${dateFrom}T00:00:00`).getTime();
      if (Number.isFinite(from) && time < from) return false;
    }
    if (dateTo) {
      const to = new Date(`${dateTo}T23:59:59.999`).getTime();
      if (Number.isFinite(to) && time > to) return false;
    }
    return true;
  }), [sourceItems, dateFrom, dateTo]);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number }>();
    datedItems.forEach((item) => {
      const key = groupKeyFor(item);
      const current = map.get(key) || { key, label: groupLabelFor(item), count: 0 };
      current.count += 1;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ar'));
  }, [datedItems]);

  const filteredItems = useMemo(() => {
    const rows = group === 'all' ? datedItems : datedItems.filter((item) => groupKeyFor(item) === group);
    return [...rows].sort((a, b) => {
      const av = displayValue(a, sortKey);
      const bv = displayValue(b, sortKey);
      const numericA = Number(String(av).replace(/[^\d.-]/g, ''));
      const numericB = Number(String(bv).replace(/[^\d.-]/g, ''));
      const result = Number.isFinite(numericA) && Number.isFinite(numericB) && /^\d/.test(String(av)) && /^\d/.test(String(bv))
        ? numericA - numericB
        : String(av).localeCompare(String(bv), 'ar', { numeric: true });
      return sortDirection === 'asc' ? result : -result;
    });
  }, [datedItems, group, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pageRows = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const summary = useMemo(() => {
    const total = filteredItems.length;
    const lands = filteredItems.filter((item) => item.recordType === 'land').length;
    const buildings = filteredItems.filter((item) => item.recordType === 'building').length;
    const average = total ? Math.round(filteredItems.reduce((sum, item) => sum + Number(item.overallProgress || 0), 0) / total) : 0;
    const valuationReady = filteredItems.filter((item) => item.valuationProgress >= 100).length;
    return { total, lands, buildings, average, valuationReady };
  }, [filteredItems]);

  const exportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const selected = printableFields.filter(([key]) => selectedFields.includes(key));
      const summaryRows = filteredItems.map((item) => Object.fromEntries(selected.map(([key, label]) => [label, displayValue(item, key)])));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'ملخص المتابعة');
      const landRows = detailedSheetRows(filteredItems, 'land');
      const buildingRows = detailedSheetRows(filteredItems, 'building');
      if (landRows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(landRows), 'الأراضي');
      if (buildingRows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildingRows), 'المباني');
      XLSX.writeFile(workbook, `accounting-transformation-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('تم تجهيز تقرير Excel حسب التصفية الحالية');
    } catch {
      toast.error('تعذر إنشاء ملف Excel');
    }
  };

  const handleOfficialTemplateUpload = async (file: File | null) => {
    if (!file) return; if (!file.name.toLowerCase().endsWith('.xlsx')) return setOfficialExcelMessage('النموذج الرسمي يجب أن يكون بصيغة XLSX.');
    try { setTemplateUploading(true); setOfficialExcelMessage('جارٍ رفع النموذج الرسمي واعتماده...'); const template = await uploadOfficialAccountingExcelTemplate(file); setOfficialTemplate(template); setOfficialExcelMessage('تم اعتماد نموذج Excel الرسمي بنجاح.'); }
    catch (error) { setOfficialExcelMessage(error instanceof Error ? error.message : 'تعذر رفع النموذج الرسمي.'); } finally { setTemplateUploading(false); }
  };

  const exportOfficialExcel = async () => {
    if (!officialTemplate || !filteredItems.length) return;
    try { setOfficialExporting(true); setOfficialExcelMessage('جارٍ تعبئة نتائج التصفية داخل النموذج الرسمي...'); const buffer = await downloadOfficialAccountingExcelTemplate(); const result = await buildOfficialAccountingTransformationExcel(buffer, filteredItems); saveAs(result.blob, `نموذج-التحول-المحاسبي-الرسمي-${new Date().toISOString().slice(0, 10)}.xlsx`); setOfficialExcelMessage(`تم تجهيز ${result.exportedCount.toLocaleString('ar-SA')} سجل داخل النموذج الرسمي المعتمد.`); }
    catch (error) { setOfficialExcelMessage(error instanceof Error ? error.message : 'تعذر تجهيز النموذج الرسمي.'); } finally { setOfficialExporting(false); }
  };

  const printTabularReport = () => {
    if (!canPrint || !filteredItems.length || !selectedFields.length) return;
    const selected = printableFields.filter(([key]) => selectedFields.includes(key));
    const headers = selected.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('');
    const body = filteredItems.map((item, index) => `<tr><td>${index + 1}</td>${selected.map(([key]) => `<td>${escapeHtml(displayValue(item, key))}</td>`).join('')}</tr>`).join('');
    const groupLabel = group === 'all' ? 'جميع المجموعات' : groups.find((x) => x.key === group)?.label || '-';
    openPrintHtml(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${escapeHtml(settings.reportTitle)}</title><style>@page{size:A4 landscape;margin:6mm 4mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{text-align:center;border-bottom:1px solid #1f4e79;padding:2mm;margin-bottom:2mm}.head h1{font-size:15px;margin:0}.head p{font-size:9px;margin:1mm 0}.meta{font-size:8px;border:1px solid #dbe3ec;padding:1.5mm 2mm;margin-bottom:2mm}.statement{text-align:center;font-size:12px;font-weight:800;margin:2mm 0}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px}th{background:#0d3156;color:white;border:1px solid #dbe3ec;padding:2px;font-size:9px}td{border:1px solid #dbe3ec;padding:1.5px;text-align:center;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f8fafc}thead{display:table-header-group}tr{break-inside:avoid}.foot{font-size:7px;color:#64748b;margin-top:2mm;display:flex;justify-content:space-between}</style></head><body><div class="head"><h1>${escapeHtml(settings.universityName)}</h1><p>${escapeHtml(settings.departmentName)}</p><h1>${escapeHtml(settings.reportTitle)}</h1></div><div class="meta">النوع: ${escapeHtml(recordType === 'all' ? 'الكل' : ACCOUNTING_RECORD_TYPE_LABELS[recordType as AccountingRecordType])} | حالة اللجنة: ${escapeHtml(committeeStatus === 'all' ? 'الكل' : ACCOUNTING_COMMITTEE_STATUS_LABELS[committeeStatus] || committeeStatus)} | المجموعة: ${escapeHtml(groupLabel)}${appliedSearch ? ' | البحث: ' + escapeHtml(appliedSearch) : ''} | إجمالي النتائج: ${filteredItems.length.toLocaleString('ar-SA')}</div><div class="statement">${escapeHtml(settings.statementTitle)}</div><table><thead><tr><th>#</th>${headers}</tr></thead><tbody>${body}</tbody></table><div class="foot"><span>تاريخ التقرير: ${escapeHtml(new Date().toLocaleString('ar-SA'))}</span><span>لجنة متابعة متطلبات التحول المحاسبي</span></div><script>window.onload=()=>window.print()</script></body></html>`);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedSearch(search.trim());
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setAppliedSearch('');
    setRecordType('all');
    setCommitteeStatus('all');
    setGroup('all');
    setDateFrom('');
    setDateTo('');
    setSortKey('recordNumber');
    setSortDirection('asc');
    setPageSize(50);
    setPage(1);
  };

  const resetSettings = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    setSelectedFields(printableFields.map(([key]) => key));
  };

  return (
    <div className="accounting-report mx-auto w-full max-w-[1780px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <style>{`@media print { [data-sidebar], header, .print-hidden { display:none !important; } .accounting-report { max-width:none!important; padding:0!important; } .accounting-report table { font-size:9px!important; } .accounting-report th,.accounting-report td { padding:5px!important; } @page { size:A4 landscape; margin:8mm; } body { background:#fff!important; } .print-report-head{display:block!important;} }`}</style>

      <section className="rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-sky-700"><BarChart3 className="h-5 w-5" /><span className="text-xs font-bold">لجنة متابعة متطلبات التحول المحاسبي</span></div><h1 className="text-2xl font-black text-slate-900 md:text-3xl">{settings.reportTitle}</h1><p className="mt-1 text-sm text-slate-500">تقرير متقدم بنفس أسلوب تقارير وحدة الأصول، مع المجموعات والتصفية واختيار الأعمدة والتصدير.</p></div>
          <div className="print-hidden flex flex-wrap gap-2"><Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation')}><ArrowRight className="ml-2 h-4 w-4" />لوحة اللجنة</Button>{canAdd && <Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation/import')}><FileSpreadsheet className="ml-2 h-4 w-4" />استيراد Excel</Button>}{canPrint && <><Button variant="outline" className="rounded-2xl" onClick={exportExcel}><Download className="ml-2 h-4 w-4" />Excel</Button><Button className="rounded-2xl" onClick={printTabularReport}><Printer className="ml-2 h-4 w-4" />التقرير الجدولي / PDF</Button></>}</div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><ReportStat title="نتائج التصفية" value={summary.total.toLocaleString('ar-SA')} /><ReportStat title="الأراضي" value={summary.lands.toLocaleString('ar-SA')} /><ReportStat title="المباني" value={summary.buildings.toLocaleString('ar-SA')} /><ReportStat title="جاهز للتقييم" value={summary.valuationReady.toLocaleString('ar-SA')} /><ReportStat title="متوسط الاكتمال" value={`${summary.average}%`} /></div>

      <Card className="print-hidden rounded-[24px] shadow-[0_7px_0_rgba(30,64,95,.05),0_12px_24px_rgba(15,42,70,.06)]">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" />البحث والتصفية المتقدمة</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-4">
          <form onSubmit={submitSearch} className="grid gap-3 xl:grid-cols-[1fr_190px_190px_auto]"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-xl pr-9" placeholder="ابحث برقم السجل أو الأصل أو الوصف أو المدينة..." /></div><NativeSelect value={recordType} onChange={(e) => { setRecordType(e.target.value); setPage(1); }} className="h-11 rounded-xl"><option value="all">كل الأنواع</option><option value="land">الأراضي</option><option value="building">المباني</option></NativeSelect><NativeSelect value={committeeStatus} onChange={(e) => { setCommitteeStatus(e.target.value); setPage(1); }} className="h-11 rounded-xl"><option value="all">كل حالات اللجنة</option>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect><div className="flex gap-2"><Button type="submit" className="h-11 rounded-xl px-6">بحث</Button><Button type="button" variant="outline" className="h-11 rounded-xl" onClick={resetFilters}><RotateCcw className="ml-1 h-4 w-4" />إعادة ضبط</Button></div></form>
          <div className="rounded-2xl border p-4"><p className="mb-2 text-sm font-black text-slate-800">حصر تاريخ عمليات إدخال البيانات</p><div className="grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-slate-600">من تاريخ الإدخال<Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 h-10 rounded-xl" /></label><label className="text-xs font-bold text-slate-600">إلى تاريخ الإدخال<Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 h-10 rounded-xl" /></label></div></div>
          <div className="rounded-2xl border p-4"><div className="mb-3 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4" /><p className="text-sm font-black text-slate-800">مجموعات سريعة</p></div><span className="text-xs text-slate-500">{groups.length.toLocaleString('ar-SA')} مجموعة</span></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setGroup('all')} className={`rounded-full border px-4 py-2 text-xs font-bold ${group === 'all' ? 'border-sky-500 bg-sky-50 text-sky-800' : 'bg-white text-slate-700'}`}>جميع المجموعات <span className="mr-1">{datedItems.length.toLocaleString('ar-SA')}</span></button>{groups.map((item) => <button key={item.key} type="button" onClick={() => setGroup(item.key)} className={`rounded-full border px-4 py-2 text-xs font-bold ${group === item.key ? 'border-sky-500 bg-sky-50 text-sky-800' : 'bg-white text-slate-700'}`}>{item.label} <span className="mr-1">{item.count.toLocaleString('ar-SA')}</span></button>)}</div></div>
          <div className="grid gap-3 md:grid-cols-4"><div className="rounded-xl border p-3"><p className="text-[11px] text-slate-500">المجموعة الحالية</p><p className="mt-1 truncate text-sm font-black text-slate-800">{group === 'all' ? 'جميع المجموعات' : groups.find((item) => item.key === group)?.label || '-'}</p></div><div className="rounded-xl border p-3"><p className="text-[11px] text-slate-500">قيمة الصفحة الحالية</p><p className="mt-1 text-sm font-black text-slate-800">{pageRows.length.toLocaleString('ar-SA')} سجل</p></div><label className="rounded-xl border p-3"><span className="text-[11px] text-slate-500">ترتيب النتائج</span><NativeSelect value={sortKey} onChange={(e) => setSortKey(e.target.value as FieldKey)} className="mt-1 h-8 border-0 bg-transparent p-0 text-sm font-bold">{printableFields.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></label><label className="rounded-xl border p-3"><span className="text-[11px] text-slate-500">اتجاه الترتيب</span><NativeSelect value={sortDirection} onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')} className="mt-1 h-8 border-0 bg-transparent p-0 text-sm font-bold"><option value="asc">تصاعدي</option><option value="desc">تنازلي</option></NativeSelect></label></div>
        </CardContent>
      </Card>

      <Card className="print-hidden rounded-[24px]"><CardHeader className="border-b"><div className="flex items-center justify-between gap-2"><CardTitle className="text-base">إعدادات عنوان التقرير والبيان</CardTitle><Button variant="outline" size="sm" onClick={resetSettings}>استعادة الإعدادات</Button></div></CardHeader><CardContent className="grid gap-3 p-4 md:grid-cols-2"><Input value={settings.universityName} onChange={(e) => setSettings((v) => ({ ...v, universityName: e.target.value }))} placeholder="اسم الجامعة" /><Input value={settings.departmentName} onChange={(e) => setSettings((v) => ({ ...v, departmentName: e.target.value }))} placeholder="اسم الإدارة" /><Input value={settings.reportTitle} onChange={(e) => setSettings((v) => ({ ...v, reportTitle: e.target.value }))} placeholder="عنوان التقرير" /><Input value={settings.statementTitle} onChange={(e) => setSettings((v) => ({ ...v, statementTitle: e.target.value }))} placeholder="عنوان البيان" /></CardContent></Card>

      <Card className="print-hidden rounded-[24px]"><CardHeader className="border-b"><CardTitle className="text-base">اختيار أعمدة التقرير</CardTitle></CardHeader><CardContent className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{printableFields.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border bg-white px-3 py-3 text-xs font-bold text-slate-700"><span>{label}</span><input type="checkbox" checked={selectedFields.includes(key)} onChange={(e) => setSelectedFields((current) => e.target.checked ? [...current, key] : current.filter((item) => item !== key))} /></label>)}</CardContent></Card>

      <Card className="print-hidden rounded-[24px] border-emerald-200/80 bg-gradient-to-l from-white via-emerald-50/25 to-white shadow-[0_7px_0_rgba(16,120,87,.06),0_12px_24px_rgba(15,42,70,.05)]">
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-base text-emerald-800"><FileSpreadsheet className="h-5 w-5" />نموذج Excel الرسمي المعتمد</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0"><p className="text-sm font-bold text-slate-800">{templateLoading ? 'جارٍ التحقق من النموذج المعتمد...' : officialTemplate ? officialTemplate.fileName : 'لم يتم اعتماد نموذج رسمي حتى الآن'}</p><p className="mt-1 text-xs leading-6 text-slate-500">يتم تعبئة نتائج التصفية الحالية داخل ورقتي الأراضي والمباني مع الحفاظ على بنية وتنسيق ملف Excel الرسمي.</p>{officialExcelMessage && <p className="mt-2 text-xs font-bold text-emerald-700">{officialExcelMessage}</p>}</div>
          <div className="flex flex-wrap gap-2">{isAdmin && <label className="inline-flex cursor-pointer items-center rounded-xl border bg-white px-4 py-2 text-sm font-bold shadow-sm"><UploadCloud className="ml-2 h-4 w-4" />{templateUploading ? 'جارٍ الاعتماد...' : officialTemplate ? 'استبدال النموذج الرسمي' : 'اعتماد النموذج الرسمي'}<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" disabled={templateUploading} onChange={(e) => handleOfficialTemplateUpload(e.target.files?.[0] || null)} /></label>}{canPrint && <Button className="bg-emerald-700 hover:bg-emerald-800" disabled={!officialTemplate || !filteredItems.length || officialExporting} onClick={exportOfficialExcel}><Download className="ml-2 h-4 w-4" />{officialExporting ? 'جاري التجهيز...' : 'تنزيل Excel الرسمي'}</Button>}</div>
        </CardContent>
      </Card>

      <div className="print-hidden flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs text-slate-500">حجم الصفحة<NativeSelect value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))} className="h-9 w-24"><option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="200">200</option></NativeSelect></label><div className="text-xs text-slate-500">الصفحة {page} من {totalPages} — {filteredItems.length.toLocaleString('ar-SA')} سجل</div></div>

      <div className="print-report-head hidden text-center"><h1 className="text-lg font-black">{settings.universityName}</h1><p className="text-sm font-bold">{settings.departmentName}</p><h2 className="mt-2 text-base font-black">{settings.reportTitle}</h2></div>

      <Card className="overflow-hidden rounded-[24px]"><CardHeader className="border-b py-3"><CardTitle className="text-center text-base">{settings.statementTitle}</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[1100px] table-fixed text-[11px]"><thead><tr className="border-b bg-[#0d3156] text-white">{printableFields.filter(([key]) => selectedFields.includes(key)).map(([, label]) => <th key={label} className="p-2.5 text-right font-bold">{label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={Math.max(1, selectedFields.length)} className="p-12 text-center text-slate-500">جاري تحميل التقرير...</td></tr> : pageRows.length ? pageRows.map((item) => <tr key={item.id} className="border-b last:border-0 odd:bg-white even:bg-slate-50/60">{printableFields.filter(([key]) => selectedFields.includes(key)).map(([key]) => <td key={key} className="truncate p-2.5 align-top text-slate-700" title={displayValue(item, key)}>{displayValue(item, key)}</td>)}</tr>) : <tr><td colSpan={Math.max(1, selectedFields.length)} className="p-12 text-center text-slate-500">لا توجد بيانات مطابقة.</td></tr>}</tbody></table></div></CardContent></Card>

      {totalPages > 1 && <div className="print-hidden flex justify-center gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>السابق</Button><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((v) => Math.min(totalPages, v + 1))}>التالي</Button></div>}
      <div className="hidden print:block text-center text-[10px] text-slate-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')} — عدد السجلات: {filteredItems.length}</div>
    </div>
  );
};
