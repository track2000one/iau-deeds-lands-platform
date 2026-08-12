import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowRight,
  BarChart3,
  Download,
  FileSpreadsheet,
  Printer,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import { usePermissions } from '../../context/PermissionsContext';
import { getAccountingTransformationRecords } from '../api/accountingTransformation';
import type { AccountingTransformationRecord } from '../../types/accountingTransformation';
import {
  ACCOUNTING_COMMITTEE_STATUS_LABELS,
  ACCOUNTING_FIELDS,
  ACCOUNTING_RECORD_TYPE_LABELS,
  type AccountingRecordType,
} from '../config/accountingTransformationFields';

const reportColumns = [
  ['recordNumber', 'رقم السجل'],
  ['recordType', 'نوع الأصل'],
  ['entityAssetNumber', 'رقم الأصل بالجهة'],
  ['assetDescription', 'وصف الأصل'],
  ['region', 'المنطقة'],
  ['city', 'المدينة'],
  ['accountingAssetCode', 'رمز الأصل المحاسبي'],
  ['committeeStatus', 'حالة اللجنة'],
  ['censusProgress', 'اكتمال الحصر'],
  ['inventoryProgress', 'اكتمال الجرد'],
  ['valuationProgress', 'اكتمال التقييم'],
  ['overallProgress', 'الاكتمال العام'],
] as const;

const ReportStat: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
  <div className="rounded-[20px] border bg-white/90 p-4 shadow-sm"><p className="text-xs text-slate-500">{title}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div>
);

const displayValue = (item: AccountingTransformationRecord, key: typeof reportColumns[number][0]) => {
  const value = item[key];
  if (key === 'recordType') return ACCOUNTING_RECORD_TYPE_LABELS[item.recordType];
  if (key === 'committeeStatus') return ACCOUNTING_COMMITTEE_STATUS_LABELS[item.committeeStatus] || item.committeeStatus;
  if (key.endsWith('Progress')) return `${Number(value || 0)}%`;
  return String(value ?? '-');
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

export const AccountingTransformationReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const [items, setItems] = useState<AccountingTransformationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [recordType, setRecordType] = useState('all');
  const [committeeStatus, setCommitteeStatus] = useState('all');
  const [reportTitle, setReportTitle] = useState(() => localStorage.getItem('accounting-transformation-report-title') || 'تقرير متابعة متطلبات التحول المحاسبي');
  const canPrint = isAdmin || hasPermission('accounting_transformation', 'canPrint');

  const load = async () => {
    setLoading(true);
    try {
      const response = await getAccountingTransformationRecords({ search, recordType, committeeStatus, all: true });
      setItems(response.items || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل التقرير');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [recordType, committeeStatus]);
  useEffect(() => { localStorage.setItem('accounting-transformation-report-title', reportTitle); }, [reportTitle]);

  const summary = useMemo(() => {
    const total = items.length;
    const lands = items.filter((item) => item.recordType === 'land').length;
    const buildings = items.filter((item) => item.recordType === 'building').length;
    const average = total ? Math.round(items.reduce((sum, item) => sum + Number(item.overallProgress || 0), 0) / total) : 0;
    const valuationReady = items.filter((item) => item.valuationProgress >= 100).length;
    return { total, lands, buildings, average, valuationReady };
  }, [items]);

  const exportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const summaryRows = items.map((item) => Object.fromEntries(reportColumns.map(([key, label]) => [label, displayValue(item, key)])));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'ملخص المتابعة');
      const landRows = detailedSheetRows(items, 'land');
      const buildingRows = detailedSheetRows(items, 'building');
      if (landRows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(landRows), 'الأراضي');
      if (buildingRows.length) XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildingRows), 'المباني');
      XLSX.writeFile(workbook, `accounting-transformation-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('تم تجهيز تقرير Excel');
    } catch {
      toast.error('تعذر إنشاء ملف Excel');
    }
  };

  const submitSearch = (event: React.FormEvent) => { event.preventDefault(); load(); };

  return (
    <div className="accounting-report mx-auto w-full max-w-[1780px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <style>{`@media print { [data-sidebar], header, .print-hidden { display:none !important; } .accounting-report { max-width:none!important; padding:0!important; } .accounting-report table { font-size:9px!important; } .accounting-report th,.accounting-report td { padding:5px!important; } @page { size:A4 landscape; margin:8mm; } body { background:#fff!important; } }`}</style>
      <section className="rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="mb-2 flex items-center gap-2 text-sky-700"><BarChart3 className="h-5 w-5" /><span className="text-xs font-bold">لجنة متابعة متطلبات التحول المحاسبي</span></div><h1 className="text-2xl font-black text-slate-900 md:text-3xl">{reportTitle}</h1><p className="mt-1 text-sm text-slate-500">تقرير موحد لمتابعة الأراضي والمباني ونسب اكتمال متطلبات الحصر والجرد والتقييم.</p></div>
          <div className="print-hidden flex flex-wrap gap-2"><Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation')}><ArrowRight className="ml-2 h-4 w-4" />لوحة اللجنة</Button>{canPrint && <><Button variant="outline" className="rounded-2xl" onClick={exportExcel}><Download className="ml-2 h-4 w-4" />Excel</Button><Button className="rounded-2xl" onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button></>}</div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><ReportStat title="إجمالي السجلات" value={summary.total} /><ReportStat title="الأراضي" value={summary.lands} /><ReportStat title="المباني" value={summary.buildings} /><ReportStat title="جاهز للتقييم" value={summary.valuationReady} /><ReportStat title="متوسط الاكتمال" value={`${summary.average}%`} /></div>

      <Card className="print-hidden rounded-[24px]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSpreadsheet className="h-4 w-4" />إعداد التقرير</CardTitle></CardHeader><CardContent className="space-y-3"><Input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="عنوان التقرير" className="h-11 rounded-xl" /><form onSubmit={submitSearch} className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]"><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-11 rounded-xl pr-9" placeholder="بحث في رقم الأصل أو الوصف أو المدينة..." /></div><NativeSelect value={recordType} onChange={(e) => setRecordType(e.target.value)} className="h-11 rounded-xl"><option value="all">الأراضي والمباني</option><option value="land">الأراضي فقط</option><option value="building">المباني فقط</option></NativeSelect><NativeSelect value={committeeStatus} onChange={(e) => setCommitteeStatus(e.target.value)} className="h-11 rounded-xl"><option value="all">كل الحالات</option>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect><Button type="submit" className="h-11 rounded-xl px-6">تطبيق</Button></form></CardContent></Card>

      <Card className="rounded-[24px] overflow-hidden"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[1250px] table-fixed text-[11px]"><thead><tr className="border-b bg-[#0d3156] text-white">{reportColumns.map(([, label]) => <th key={label} className="p-2.5 text-right font-bold">{label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={reportColumns.length} className="p-12 text-center text-slate-500">جاري تحميل التقرير...</td></tr> : items.length ? items.map((item) => <tr key={item.id} className="border-b last:border-0 odd:bg-white even:bg-slate-50/60">{reportColumns.map(([key]) => <td key={key} className="truncate p-2.5 align-top text-slate-700" title={displayValue(item, key)}>{displayValue(item, key)}</td>)}</tr>) : <tr><td colSpan={reportColumns.length} className="p-12 text-center text-slate-500">لا توجد بيانات مطابقة.</td></tr>}</tbody></table></div></CardContent></Card>

      <div className="hidden print:block text-center text-[10px] text-slate-500">تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')} — عدد السجلات: {items.length}</div>
    </div>
  );
};
