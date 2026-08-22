import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {
  ArrowRight,
  BarChart3,
  Download,
  FileOutput,
  FileSpreadsheet,
  Filter,
  History,
  LayoutGrid,
  Printer,
  RotateCcw,
  Search,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import { Badge } from '../components/ui/badge';
import { usePermissions } from '../../context/PermissionsContext';
import {
  downloadAccountingCycleOfficialTemplate,
  downloadOfficialAccountingExcelTemplate,
  getAccountingTransformationCycles,
  getAccountingTransformationRecords,
  getOfficialAccountingExcelTemplate,
  getOfficialAccountingExcelTemplateHistory,
  uploadAccountingCycleOfficialTemplateVersion,
  uploadOfficialAccountingExcelTemplate,
  type AccountingExcelTemplateMeta,
} from '../api/accountingTransformation';
import type {
  AccountingRecordType,
  AccountingTransformationCycle,
  AccountingTransformationRecord,
} from '../../types/accountingTransformation';
import { buildOfficialAccountingTransformationExcel } from '../../utils/officialAccountingTransformationExcel';
import { ACCOUNTING_COMMITTEE_STATUS_LABELS } from '../config/accountingTransformationFields';
import { getAccountingDisplayFields, getAccountingRecordTypeLabel } from '../config/accountingRecordPresentation';

const printableFields = [
  ['recordNumber', 'رقم السجل'], ['recordType', 'نوع الأصل'], ['entityName', 'الجهة'],
  ['entityAssetNumber', 'رقم الأصل بالجهة'], ['assetDescription', 'وصف الأصل'],
  ['accountingGroup', 'المجموعة المحاسبية'], ['accountingGroupCode', 'رمز المجموعة'],
  ['accountingAssetCode', 'رمز الأصل المحاسبي'], ['region', 'المنطقة'], ['city', 'المدينة'],
  ['committeeStatus', 'حالة اللجنة'], ['censusProgress', 'اكتمال الحصر'],
  ['inventoryProgress', 'اكتمال الجرد'], ['valuationProgress', 'اكتمال التقييم'],
  ['overallProgress', 'الاكتمال العام'], ['createdAt', 'تاريخ الإدخال'], ['updatedAt', 'آخر تحديث'],
] as const;
type FieldKey = (typeof printableFields)[number][0];

type ReportSettings = { universityName: string; departmentName: string; reportTitle: string; statementTitle: string };
const STORAGE_KEY = 'iau-accounting-transformation-report-settings';
const DEFAULT_SETTINGS: ReportSettings = {
  universityName: 'جامعة الإمام عبدالرحمن بن فيصل',
  departmentName: 'الإدارة العامة للأصول والأملاك والأوقاف الجامعية',
  reportTitle: 'تقرير متابعة متطلبات التحول المحاسبي',
  statementTitle: 'بيان سجل الأصول الثابتة ومتطلبات التحول المحاسبي',
};

const ReportStat: React.FC<{ title: string; value: string | number; hint?: string }> = ({ title, value, hint }) => (
  <div className="rounded-[20px] border bg-white/90 p-4 shadow-sm">
    <p className="text-xs text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    {hint && <p className="mt-1 text-[10px] leading-5 text-slate-500">{hint}</p>}
  </div>
);

const OutputCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: 'sky' | 'emerald' | 'violet';
  action: React.ReactNode;
}> = ({ title, description, icon, tone, action }) => {
  const tones = {
    sky: 'border-sky-200 bg-sky-50/55 text-sky-800',
    emerald: 'border-emerald-200 bg-emerald-50/55 text-emerald-800',
    violet: 'border-violet-200 bg-violet-50/55 text-violet-800',
  } as const;
  return (
    <div className={`rounded-[24px] border p-4 shadow-[0_8px_0_rgba(15,42,70,.04)] ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs leading-6 text-slate-600">{description}</p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border bg-white shadow-sm">{icon}</div>
      </div>
      <div className="mt-4">{action}</div>
    </div>
  );
};

const displayValue = (item: AccountingTransformationRecord, key: FieldKey) => {
  const value = item[key];
  if (key === 'recordType') return getAccountingRecordTypeLabel(item.recordType);
  if (key === 'committeeStatus') return ACCOUNTING_COMMITTEE_STATUS_LABELS[item.committeeStatus] || item.committeeStatus;
  if (key === 'createdAt' || key === 'updatedAt') return value ? new Date(String(value)).toLocaleString('ar-SA') : '-';
  if (key.endsWith('Progress')) return `${Number(value || 0)}%`;
  return value === null || value === undefined || value === '' ? '-' : String(value);
};

const detailedSheetRows = (items: AccountingTransformationRecord[], type: AccountingRecordType) => {
  const fields = getAccountingDisplayFields(type);
  return items.filter((item) => item.recordType === type).map((item) => {
    const row: Record<string, unknown> = {
      'رقم سجل اللجنة': item.recordNumber,
      'نوع السجل': getAccountingRecordTypeLabel(item.recordType),
      'حالة متابعة اللجنة': ACCOUNTING_COMMITTEE_STATUS_LABELS[item.committeeStatus] || item.committeeStatus,
      'نسبة اكتمال الحصر': item.censusProgress,
      'نسبة اكتمال الجرد': item.inventoryProgress,
      'نسبة اكتمال التقييم': item.valuationProgress,
      'الاكتمال العام': item.overallProgress,
    };
    fields.forEach((field) => { row[`${field.c} — ${field.a}`] = item.payload?.[field.c] ?? ''; });
    row['ملاحظات اللجنة'] = item.notes || '';
    return row;
  });
};

const groupKeyFor = (item: AccountingTransformationRecord) => {
  const code = String(item.accountingGroupCode || '').trim();
  const label = String(item.accountingGroup || '').trim();
  if (code || label) return `group:${code || label}`;
  return `type:${item.recordType}`;
};
const groupLabelFor = (item: AccountingTransformationRecord) => item.accountingGroup || item.accountingGroupCode || getAccountingRecordTypeLabel(item.recordType);
const escapeHtml = (value: unknown) => String(value ?? '-').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const openPrintHtml = (html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) { URL.revokeObjectURL(url); return false; }
  window.setTimeout(() => URL.revokeObjectURL(url), 120000);
  return true;
};

export const AccountingTransformationReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, hasPermission } = usePermissions();
  const canPrint = isAdmin || hasPermission('accounting_transformation', 'canPrint');
  const canAdd = isAdmin || hasPermission('accounting_transformation', 'canAdd');
  const [sourceItems, setSourceItems] = useState<AccountingTransformationRecord[]>([]);
  const [cycles, setCycles] = useState<AccountingTransformationCycle[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState(searchParams.get('cycle') || '');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [recordType, setRecordType] = useState('all');
  const [committeeStatus, setCommitteeStatus] = useState('all');
  const [group, setGroup] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [selectedFields] = useState<FieldKey[]>(printableFields.map(([key]) => key));
  const [officialTemplate, setOfficialTemplate] = useState<AccountingExcelTemplateMeta | null>(null);
  const [templateHistory, setTemplateHistory] = useState<AccountingExcelTemplateMeta[]>([]);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [officialExporting, setOfficialExporting] = useState(false);
  const [officialExcelMessage, setOfficialExcelMessage] = useState('');
  const [settings] = useState<ReportSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<ReportSettings>) } : { ...DEFAULT_SETTINGS };
    } catch { return { ...DEFAULT_SETTINGS }; }
  });

  useEffect(() => {
    let cancelled = false;
    setTemplateLoading(true);
    Promise.all([getOfficialAccountingExcelTemplate(), getOfficialAccountingExcelTemplateHistory()])
      .then(([template, history]) => {
        if (!cancelled) { setOfficialTemplate(template); setTemplateHistory(history || []); }
      })
      .catch(() => { if (!cancelled) { setOfficialTemplate(null); setTemplateHistory([]); } })
      .finally(() => { if (!cancelled) setTemplateLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAccountingTransformationCycles()
      .then((data) => { if (!cancelled) setCycles(data || []); })
      .catch(() => { if (!cancelled) setCycles([]); });
    return () => { cancelled = true; };
  }, []);

  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId) || null;

  const load = async () => {
    setLoading(true);
    try {
      const response = await getAccountingTransformationRecords({
        search: appliedSearch,
        recordType,
        committeeStatus,
        cycleId: selectedCycleId || undefined,
        all: true,
      });
      setSourceItems(response.items || []);
      if (response.truncated) toast.warning(`تم تحميل أول ${response.items.length.toLocaleString('ar-SA')} سجل لحماية أداء الصفحة. استخدم تصفية أدق عند الحاجة.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل التقرير');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [appliedSearch, recordType, committeeStatus, selectedCycleId]);
  useEffect(() => { setPage(1); }, [group, dateFrom, dateTo, pageSize, selectedCycleId]);

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

  const filteredItems = useMemo(() => group === 'all' ? datedItems : datedItems.filter((item) => groupKeyFor(item) === group), [datedItems, group]);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const pageRows = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const summary = useMemo(() => {
    const total = filteredItems.length;
    const fixedAssets = filteredItems.filter((item) => item.recordType === 'fixed_asset').length;
    const lands = filteredItems.filter((item) => item.recordType === 'land').length;
    const buildings = filteredItems.filter((item) => item.recordType === 'building').length;
    const average = total ? Math.round(filteredItems.reduce((sum, item) => sum + Number(item.overallProgress || 0), 0) / total) : 0;
    return { total, fixedAssets, lands, buildings, average };
  }, [filteredItems]);

  const exportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const selected = printableFields.filter(([key]) => selectedFields.includes(key));
      const summaryRows = filteredItems.map((item) => Object.fromEntries(selected.map(([key, label]) => [label, displayValue(item, key)])));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'ملخص المتابعة');
      const sheets: Array<[AccountingRecordType, string]> = [
        ['fixed_asset', 'سجل الأصول - نموذج ب'],
        ['land', 'الأراضي'],
        ['building', 'المباني'],
      ];
      sheets.forEach(([type, name]) => {
        const rows = detailedSheetRows(filteredItems, type);
        if (rows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
      });
      const prefix = selectedCycle ? `cycle-${selectedCycle.cycleNumber}` : 'current';
      XLSX.writeFile(workbook, `accounting-transformation-${prefix}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('تم تجهيز تقرير Excel حسب التصفية الحالية');
    } catch { toast.error('تعذر إنشاء ملف Excel'); }
  };

  const refreshTemplateMeta = async () => {
    const [template, history] = await Promise.all([getOfficialAccountingExcelTemplate(), getOfficialAccountingExcelTemplateHistory()]);
    setOfficialTemplate(template);
    setTemplateHistory(history || []);
  };

  const handleOfficialTemplateUpload = async (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) return setOfficialExcelMessage('النموذج الرسمي يجب أن يكون بصيغة XLSX.');
    try {
      setTemplateUploading(true);
      setOfficialExcelMessage('جارٍ رفع إصدار جديد من النموذج الرسمي...');
      const template = await uploadOfficialAccountingExcelTemplate(file);
      setOfficialTemplate(template);
      await refreshTemplateMeta();
      setOfficialExcelMessage(`تم اعتماد الإصدار ${template.versionNumber || ''}. الدورات السابقة ستظل مرتبطة بنسخها التاريخية.`);
    } catch (error) {
      setOfficialExcelMessage(error instanceof Error ? error.message : 'تعذر رفع النموذج الرسمي.');
    } finally { setTemplateUploading(false); }
  };

  const handleCycleTemplateVersionUpload = async (file: File | null) => {
    if (!file || !selectedCycle) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) return setOfficialExcelMessage('الإصدار الجديد يجب أن يكون بصيغة XLSX.');
    if (!['draft', 'under_review'].includes(selectedCycle.status)) return setOfficialExcelMessage('لا يمكن تغيير نموذج دورة معتمدة أو مؤرشفة.');
    try {
      setTemplateUploading(true);
      const result = await uploadAccountingCycleOfficialTemplateVersion(selectedCycle.id, file);
      setOfficialTemplate(result.template);
      setCycles((current) => current.map((cycle) => cycle.id === selectedCycle.id ? { ...cycle, officialTemplate: result.snapshot } : cycle));
      await refreshTemplateMeta();
      setOfficialExcelMessage(`تم تثبيت الإصدار ${result.snapshot.versionNumber} على الدورة #${selectedCycle.cycleNumber}.`);
      toast.success(`تم تثبيت الإصدار ${result.snapshot.versionNumber} على الدورة #${selectedCycle.cycleNumber}`);
    } catch (error) {
      setOfficialExcelMessage(error instanceof Error ? error.message : 'تعذر رفع الإصدار الجديد للدورة.');
    } finally { setTemplateUploading(false); }
  };

  const exportOfficialExcel = async () => {
    if (!filteredItems.length) return;
    if (selectedCycle && !selectedCycle.officialTemplate) return setOfficialExcelMessage('لا توجد نسخة نموذج رسمي مثبتة تاريخيًا على هذه الدورة.');
    if (!selectedCycle && !officialTemplate) return;
    try {
      setOfficialExporting(true);
      setOfficialExcelMessage('جارٍ تعبئة البيانات داخل النموذج الرسمي...');
      const buffer = selectedCycle
        ? await downloadAccountingCycleOfficialTemplate(selectedCycle.id)
        : await downloadOfficialAccountingExcelTemplate();
      const result = await buildOfficialAccountingTransformationExcel(buffer, filteredItems);
      const cyclePart = selectedCycle ? `الدورة-${selectedCycle.cycleNumber}` : 'الحالية-المعتمدة';
      saveAs(result.blob, `نموذج-ب-${cyclePart}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setOfficialExcelMessage(`تم تجهيز ${result.exportedCount.toLocaleString('ar-SA')} سجل.${result.skippedCount ? ` تم تجاوز ${result.skippedCount.toLocaleString('ar-SA')} سجل غير متوافق مع القالب.` : ''}`);
    } catch (error) {
      setOfficialExcelMessage(error instanceof Error ? error.message : 'تعذر تجهيز النموذج الرسمي.');
    } finally { setOfficialExporting(false); }
  };

  const printTabularReport = () => {
    if (!canPrint || !filteredItems.length) return;
    const selected = printableFields.filter(([key]) => selectedFields.includes(key));
    const headers = selected.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join('');
    const body = filteredItems.map((item, index) => `<tr><td>${index + 1}</td>${selected.map(([key]) => `<td>${escapeHtml(displayValue(item, key))}</td>`).join('')}</tr>`).join('');
    const groupLabel = group === 'all' ? 'جميع المجموعات' : groups.find((x) => x.key === group)?.label || '-';
    const typeLabel = recordType === 'all' ? 'الكل' : getAccountingRecordTypeLabel(recordType as AccountingRecordType);
    const cycleLabel = selectedCycle ? `#${selectedCycle.cycleNumber} — ${selectedCycle.name}` : 'الدورة الحالية المعتمدة';
    openPrintHtml(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><title>${escapeHtml(settings.reportTitle)}</title><style>@page{size:A4 landscape;margin:6mm 4mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0}.head{text-align:center;border-bottom:1px solid #1f4e79;padding:2mm;margin-bottom:2mm}.head h1{font-size:15px;margin:0}.head p{font-size:9px;margin:1mm 0}.meta{font-size:8px;border:1px solid #dbe3ec;padding:1.5mm 2mm;margin-bottom:2mm}.statement{text-align:center;font-size:12px;font-weight:800;margin:2mm 0}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9px}th{background:#0d3156;color:white;border:1px solid #dbe3ec;padding:2px}td{border:1px solid #dbe3ec;padding:1.5px;text-align:center;overflow-wrap:anywhere}tbody tr:nth-child(even){background:#f8fafc}thead{display:table-header-group}tr{break-inside:avoid}.foot{font-size:7px;color:#64748b;margin-top:2mm;display:flex;justify-content:space-between}</style></head><body><div class="head"><h1>${escapeHtml(settings.universityName)}</h1><p>${escapeHtml(settings.departmentName)}</p><h1>${escapeHtml(settings.reportTitle)}</h1></div><div class="meta">الدورة: ${escapeHtml(cycleLabel)} | النوع: ${escapeHtml(typeLabel)} | المجموعة: ${escapeHtml(groupLabel)} | إجمالي النتائج: ${filteredItems.length.toLocaleString('ar-SA')}</div><div class="statement">${escapeHtml(settings.statementTitle)}</div><table><thead><tr><th>#</th>${headers}</tr></thead><tbody>${body}</tbody></table><div class="foot"><span>تاريخ التقرير: ${escapeHtml(new Date().toLocaleString('ar-SA'))}</span><span>لجنة متابعة متطلبات التحول المحاسبي</span></div><script>window.onload=()=>window.print()</script></body></html>`);
  };

  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); setAppliedSearch(search.trim()); setPage(1); };
  const resetFilters = () => {
    setSearch(''); setAppliedSearch(''); setRecordType('all'); setCommitteeStatus('all');
    setGroup('all'); setDateFrom(''); setDateTo(''); setPageSize(50); setPage(1);
  };

  const cycleLabel = selectedCycle ? `#${selectedCycle.cycleNumber} — ${selectedCycle.name}` : 'الدورة الحالية المعتمدة';
  const cycleTemplate = selectedCycle?.officialTemplate || officialTemplate;

  return (
    <div className="accounting-report mx-auto w-full max-w-[1780px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="rounded-[28px] border bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sky-700"><BarChart3 className="h-5 w-5" /><span className="text-xs font-bold">لجنة متابعة متطلبات التحول المحاسبي</span></div>
            <h1 className="text-2xl font-black md:text-3xl">مركز التقارير والمخرجات</h1>
            <p className="mt-1 text-sm text-slate-500">اختر الدورة، راجع نطاق البيانات، ثم أنشئ المخرج المطلوب من مكان واحد.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/accounting-transformation')}><ArrowRight className="ml-2 h-4 w-4" />لوحة اللجنة</Button>
            {canAdd && <Button variant="outline" onClick={() => navigate('/accounting-transformation/import')}><FileSpreadsheet className="ml-2 h-4 w-4" />استيراد Excel</Button>}
            <Button variant="outline" onClick={() => navigate('/accounting-transformation/cycles')}><LayoutGrid className="ml-2 h-4 w-4" />مركز الدورات</Button>
          </div>
        </div>
      </section>

      <Card className="rounded-[24px] border-sky-200 bg-sky-50/55">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="text-xs font-bold">إصدار البيانات
            <NativeSelect value={selectedCycleId} onChange={(event) => {
              const value = event.target.value;
              setSelectedCycleId(value);
              const next = new URLSearchParams(searchParams);
              if (value) next.set('cycle', value); else next.delete('cycle');
              setSearchParams(next);
            }} className="mt-1 h-11 bg-white">
              <option value="">الدورة الحالية المعتمدة</option>
              {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>#{cycle.cycleNumber} — {cycle.name}{cycle.isCurrent ? ' (الحالية)' : cycle.status === 'archived' ? ' (مؤرشفة)' : cycle.status === 'under_review' ? ' (تحت المراجعة)' : ''}</option>)}
            </NativeSelect>
          </label>
          <div className="rounded-2xl border bg-white px-4 py-3 text-xs leading-6 text-slate-600">
            <strong className="text-slate-900">{cycleLabel}</strong><br />
            {cycleTemplate ? `النموذج المثبت: الإصدار ${cycleTemplate.versionNumber || 1}` : 'لا توجد نسخة نموذج رسمي مثبتة'}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <ReportStat title="نتائج التصفية" value={summary.total.toLocaleString('ar-SA')} />
        <ReportStat title="المباني" value={summary.buildings.toLocaleString('ar-SA')} />
        <ReportStat title="الأراضي" value={summary.lands.toLocaleString('ar-SA')} />
        <ReportStat title="نموذج ب" value={summary.fixedAssets.toLocaleString('ar-SA')} />
        <ReportStat title="متوسط الاكتمال" value={`${summary.average}%`} />
      </div>

      <Card className="rounded-[28px] border-slate-200 bg-[linear-gradient(135deg,#ffffff,#f8fbff)]">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><FileOutput className="h-5 w-5 text-sky-700" />مخرجات الدورة</CardTitle>
          <p className="text-xs leading-6 text-slate-500">كل مخرج يعتمد على الدورة والتصفية المحددتين أعلاه. لا يتم تغيير بيانات الدورة عند إنشاء التقرير.</p>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 lg:grid-cols-3">
          <OutputCard title="تقرير PDF / طباعة" description="تقرير رسمي جدولي من نتائج التصفية الحالية." icon={<Printer className="h-5 w-5" />} tone="sky" action={<Button className="w-full" disabled={!canPrint || !filteredItems.length} onClick={printTabularReport}><Printer className="ml-2 h-4 w-4" />إنشاء التقرير</Button>} />
          <OutputCard title="Excel حسب التصفية" description="ملخص المتابعة مع أوراق منفصلة للأراضي والمباني ونموذج ب." icon={<Download className="h-5 w-5" />} tone="emerald" action={<Button className="w-full bg-emerald-700 hover:bg-emerald-800" disabled={!canPrint || !filteredItems.length} onClick={exportExcel}><Download className="ml-2 h-4 w-4" />تنزيل Excel</Button>} />
          <OutputCard title="النموذج الرسمي المعبأ" description={cycleTemplate ? `يستخدم الإصدار ${cycleTemplate.versionNumber || 1} المثبت لهذه البيانات.` : 'يلزم رفع أو تثبيت نموذج رسمي أولًا.'} icon={<FileSpreadsheet className="h-5 w-5" />} tone="violet" action={<Button className="w-full bg-violet-700 hover:bg-violet-800" disabled={officialExporting || !filteredItems.length || !cycleTemplate} onClick={exportOfficialExcel}>{officialExporting ? 'جاري التجهيز...' : 'إنشاء النموذج الرسمي'}</Button>} />
        </CardContent>
      </Card>

      <details className="group rounded-[24px] border bg-white" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-black text-slate-900">
          <span className="flex items-center gap-2"><Filter className="h-4 w-4 text-sky-700" />البحث والتصفية</span>
          <Badge variant="outline">{filteredItems.length.toLocaleString('ar-SA')} نتيجة</Badge>
        </summary>
        <div className="border-t p-4">
          <form onSubmit={submitSearch} className="grid gap-3 xl:grid-cols-[1fr_210px_210px_auto]">
            <div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 pr-9" placeholder="رقم السجل أو الأصل أو الوصف أو المدينة..." /></div>
            <NativeSelect value={recordType} onChange={(e) => { setRecordType(e.target.value); setPage(1); }} className="h-11"><option value="all">كل الأنواع</option><option value="fixed_asset">نموذج ب — سجل الأصول</option><option value="land">الأراضي</option><option value="building">المباني</option></NativeSelect>
            <NativeSelect value={committeeStatus} onChange={(e) => { setCommitteeStatus(e.target.value); setPage(1); }} className="h-11"><option value="all">كل حالات اللجنة</option>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect>
            <div className="flex gap-2"><Button type="submit">بحث</Button><Button type="button" variant="outline" onClick={resetFilters}><RotateCcw className="ml-1 h-4 w-4" />إعادة</Button></div>
          </form>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <label className="text-xs font-bold">المجموعة<NativeSelect value={group} onChange={(e) => { setGroup(e.target.value); setPage(1); }} className="mt-1"><option value="all">كل المجموعات</option>{groups.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.count})</option>)}</NativeSelect></label>
            <label className="text-xs font-bold">من تاريخ<Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1" /></label>
            <label className="text-xs font-bold">إلى تاريخ<Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1" /></label>
            <label className="text-xs font-bold">حجم الصفحة<NativeSelect value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))} className="mt-1"><option value="25">25</option><option value="50">50</option><option value="100">100</option></NativeSelect></label>
          </div>
        </div>
      </details>

      {!selectedCycle ? (
        <Card className="rounded-[26px] border-emerald-200 bg-emerald-50/25">
          <CardHeader className="border-b border-emerald-100"><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-700" />مكتبة النموذج الرسمي</CardTitle><p className="text-xs leading-6 text-slate-500">الإدارة المركزية للقالب الرسمي وإصداراته. الدورات التاريخية لا تتغير عند رفع إصدار جديد.</p></CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="font-black text-slate-900">{templateLoading ? 'جاري التحقق...' : officialTemplate ? `الإصدار الحالي ${officialTemplate.versionNumber || 1}` : 'لا يوجد نموذج رسمي'}</p><p className="mt-1 text-xs text-slate-500">{officialTemplate?.fileName || 'ارفع ملف XLSX فارغ البيانات ومعتمد التصميم.'}</p></div>
              {isAdmin && <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm transition hover:-translate-y-0.5"><UploadCloud className="h-4 w-4" />{templateUploading ? 'جاري الرفع...' : officialTemplate ? 'رفع إصدار جديد' : 'رفع النموذج الرسمي'}<input type="file" accept=".xlsx" className="hidden" disabled={templateUploading} onChange={(e) => { const input = e.currentTarget; void handleOfficialTemplateUpload(input.files?.[0] || null).finally(() => { input.value = ''; }); }} /></label>}
            </div>
            {templateHistory.length > 0 && <details className="rounded-2xl border bg-white"><summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-xs font-black text-slate-700"><History className="h-4 w-4" />سجل الإصدارات ({templateHistory.length.toLocaleString('ar-SA')})</summary><div className="flex flex-wrap gap-2 border-t p-3">{templateHistory.map((item) => <Badge key={item.id} variant="outline" className={item.isCurrent ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'bg-slate-50'}>إصدار {item.versionNumber || '-'} · {item.fileName}</Badge>)}</div></details>}
            {officialExcelMessage && <p className="rounded-xl border bg-white p-3 text-xs leading-6 text-slate-700">{officialExcelMessage}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-[26px] border-violet-200 bg-violet-50/25">
          <CardHeader className="border-b border-violet-100"><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-violet-700" />قالب الدورة #{selectedCycle.cycleNumber}</CardTitle><p className="text-xs leading-6 text-slate-500">نسخة مستقلة مرتبطة بهذه الدورة فقط.</p></CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="font-black text-slate-900">{selectedCycle.officialTemplate ? `الإصدار ${selectedCycle.officialTemplate.versionNumber}` : 'لا توجد نسخة مثبتة'}</p><p className="mt-1 text-xs text-slate-500">{selectedCycle.officialTemplate?.fileName || 'يلزم تثبيت نموذج على الدورة.'}</p></div>
              {isAdmin && ['draft', 'under_review'].includes(selectedCycle.status) && <label className={`inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-800 shadow-sm ${templateUploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer transition hover:-translate-y-0.5'}`}><UploadCloud className="h-4 w-4" />{templateUploading ? 'جاري رفع الإصدار...' : 'رفع إصدار جديد'}<input type="file" accept=".xlsx" className="hidden" disabled={templateUploading} onChange={(e) => { const input = e.currentTarget; void handleCycleTemplateVersionUpload(input.files?.[0] || null).finally(() => { input.value = ''; }); }} /></label>}
            </div>
            <div className="rounded-xl border bg-white p-3 text-xs leading-6 text-slate-600">{['draft', 'under_review'].includes(selectedCycle.status) ? 'الدورة مفتوحة: يمكن تغيير القالب حتى الاعتماد.' : 'الدورة معتمدة/مؤرشفة: القالب مقفل تاريخيًا ولا يمكن استبداله.'}</div>
            {officialExcelMessage && <p className="rounded-xl border bg-white p-3 text-xs leading-6 text-slate-700">{officialExcelMessage}</p>}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[24px]">
        <CardHeader className="border-b"><CardTitle className="text-base">البيانات التفصيلية</CardTitle><p className="text-xs text-slate-500">معاينة السجلات التي ستدخل في المخرجات أعلاه.</p></CardHeader>
        <CardContent className="p-4">
          {loading ? <div className="py-16 text-center text-sm text-slate-500">جاري تحميل التقرير...</div> : !pageRows.length ? <div className="py-16 text-center text-slate-500">لا توجد نتائج.</div> : <>
            <div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[1100px] text-xs"><thead className="bg-slate-50"><tr>{printableFields.filter(([key]) => selectedFields.includes(key)).map(([key, label]) => <th key={key} className="p-3 text-right">{label}</th>)}</tr></thead><tbody>{pageRows.map((item) => <tr key={item.id} className="border-t">{printableFields.filter(([key]) => selectedFields.includes(key)).map(([key]) => <td key={key} className="p-3">{displayValue(item, key)}</td>)}</tr>)}</tbody></table></div>
            <div className="mt-4 flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>السابق</Button><span className="text-xs">صفحة {page} من {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>التالي</Button></div>
          </>}
        </CardContent>
      </Card>
    </div>
  );
};
