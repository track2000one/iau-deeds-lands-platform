import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import * as XLSX from 'xlsx';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  LandPlot,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  ACCOUNTING_FIELDS,
  ACCOUNTING_RECORD_TYPE_LABELS,
  excelColumnToIndex,
  isMeaningfulAccountingValue,
  type AccountingRecordType,
} from '../config/accountingTransformationFields';
import { bulkImportAccountingTransformationRecords } from '../api/accountingTransformation';
import type { AccountingTransformationInput } from '../../types/accountingTransformation';

type PreviewItem = AccountingTransformationInput & { sourceRow: number };
type ImportResult = { created: number; updated: number; skipped: number; total: number };

const normalizeSheetName = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

const findTemplateSheet = (workbook: XLSX.WorkBook, type: AccountingRecordType) => {
  const names = workbook.SheetNames;
  if (type === 'land') {
    return names.find((name) => {
      const normalized = normalizeSheetName(name);
      return normalized.includes('الأراضي') || normalized.includes('land');
    });
  }
  return names.find((name) => {
    const normalized = normalizeSheetName(name);
    return normalized.includes('المباني') || normalized.includes('building');
  });
};

const inferOwnership = (type: AccountingRecordType, payload: Record<string, unknown>) => {
  const columns = type === 'land' ? ['X', 'Y', 'Z'] : ['W', 'X', 'Y'];
  return columns.some((column) => isMeaningfulAccountingValue(payload[column])) ? 'leased' as const : 'owned' as const;
};

const parseSheet = (workbook: XLSX.WorkBook, type: AccountingRecordType): PreviewItem[] => {
  const sheetName = findTemplateSheet(workbook, type);
  if (!sheetName) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
  });

  const output: PreviewItem[] = [];
  for (let rowIndex = 7; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] || [];
    const payload: Record<string, unknown> = {};
    for (const field of ACCOUNTING_FIELDS[type]) {
      const value = row[excelColumnToIndex(field.c)];
      if (isMeaningfulAccountingValue(value)) payload[field.c] = String(value).trim();
    }
    if (!isMeaningfulAccountingValue(payload.B) && !isMeaningfulAccountingValue(payload.E) && !isMeaningfulAccountingValue(payload.G)) continue;
    output.push({
      recordType: type,
      ownershipMode: inferOwnership(type, payload),
      committeeStatus: 'not_reviewed',
      payload,
      attachments: [],
      notes: null,
      sourceRow: rowIndex + 1,
    });
  }
  return output;
};

export const AccountingTransformationImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const lands = useMemo(() => items.filter((item) => item.recordType === 'land'), [items]);
  const buildings = useMemo(() => items.filter((item) => item.recordType === 'building'), [items]);

  const chooseFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error('اختر ملف Excel بصيغة XLSX أو XLS');
    setParsing(true);
    setResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const landSheet = findTemplateSheet(workbook, 'land');
      const buildingSheet = findTemplateSheet(workbook, 'building');
      if (!landSheet && !buildingSheet) throw new Error('لم يتم العثور على ورقتي الأراضي أو المباني في القالب. تأكد من استخدام نموذج التحول المحاسبي المعتمد.');
      const parsed = [...parseSheet(workbook, 'land'), ...parseSheet(workbook, 'building')];
      if (!parsed.length) throw new Error('تم العثور على القالب، ولكن لا توجد سجلات بيانات ابتداءً من الصف 8.');
      setItems(parsed);
      setFileName(file.name);
      toast.success(`تمت قراءة ${parsed.length} سجل من ملف Excel`);
    } catch (error) {
      setItems([]);
      setFileName('');
      toast.error(error instanceof Error ? error.message : 'تعذر قراءة ملف Excel');
    } finally {
      setParsing(false);
    }
  };

  const performImport = async () => {
    if (!items.length) return;
    setImporting(true);
    try {
      const payload = items.map(({ sourceRow: _sourceRow, ...item }) => item);
      const response = await bulkImportAccountingTransformationRecords(payload);
      setResult(response);
      toast.success(`اكتمل الاستيراد: ${response.created} جديد، ${response.updated} محدث`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر استيراد السجلات');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="flex flex-col gap-4 rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)] md:flex-row md:items-center md:justify-between">
        <div><Badge variant="outline" className="mb-2">لجنة متابعة متطلبات التحول المحاسبي</Badge><h1 className="text-2xl font-black text-slate-900 md:text-3xl">استيراد نموذج Excel</h1><p className="mt-1 text-sm text-slate-500">يدعم النموذج المرفق للجامعة ويقرأ ورقتي الأراضي والمباني مع الاحتفاظ بجميع أعمدة النموذج.</p></div>
        <Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation')}><ArrowRight className="ml-2 h-4 w-4" />العودة للوحة اللجنة</Button>
      </section>

      <Card className="rounded-[28px] border-dashed border-sky-300 bg-[linear-gradient(145deg,#fafeff,#eef9ff)]">
        <CardContent className="p-7">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-sky-300/80 bg-white/75 px-5 py-12 text-center transition hover:bg-sky-50/80">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-sky-200 bg-sky-50 text-sky-700 shadow-sm"><UploadCloud className="h-8 w-8" /></div>
            <h2 className="mt-4 text-lg font-black text-slate-900">اختر ملف التحول المحاسبي</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">سيتم البحث تلقائيًا عن ورقة <strong>الأراضي - Land</strong> وورقة <strong>Building - المباني</strong>، وقراءة البيانات ابتداءً من الصف الثامن.</p>
            <span className="mt-4 rounded-xl border bg-white px-4 py-2 text-xs font-bold text-sky-700">{parsing ? 'جاري تحليل الملف...' : fileName || 'XLSX / XLS'}</span>
            <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" disabled={parsing || importing} onChange={(event) => chooseFile(event.target.files?.[0])} />
          </label>
        </CardContent>
      </Card>

      {items.length > 0 && <>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border bg-white p-4 shadow-sm"><p className="text-xs text-slate-500">إجمالي السجلات المقروءة</p><p className="mt-1 text-3xl font-black text-slate-900">{items.length}</p></div>
          <div className="rounded-[22px] border border-amber-200 bg-amber-50/60 p-4 shadow-sm"><div className="flex items-center gap-3"><LandPlot className="h-6 w-6 text-amber-700" /><div><p className="text-xs text-amber-700">الأراضي</p><p className="text-3xl font-black text-amber-900">{lands.length}</p></div></div></div>
          <div className="rounded-[22px] border border-blue-200 bg-blue-50/60 p-4 shadow-sm"><div className="flex items-center gap-3"><Building2 className="h-6 w-6 text-blue-700" /><div><p className="text-xs text-blue-700">المباني</p><p className="text-3xl font-black text-blue-900">{buildings.length}</p></div></div></div>
        </div>

        <Card className="rounded-[24px]"><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />معاينة قبل الاستيراد</CardTitle></CardHeader><CardContent><div className="overflow-x-auto rounded-xl border"><table className="w-full min-w-[900px] text-xs"><thead className="bg-slate-50"><tr><th className="p-3 text-right">الورقة</th><th className="p-3 text-right">صف Excel</th><th className="p-3 text-right">رقم الأصل بالجهة</th><th className="p-3 text-right">وصف الأصل</th><th className="p-3 text-right">المنطقة</th><th className="p-3 text-right">المدينة</th><th className="p-3 text-right">الملكية</th></tr></thead><tbody>{items.slice(0, 12).map((item, index) => <tr key={`${item.recordType}-${item.sourceRow}-${index}`} className="border-t"><td className="p-3 font-bold">{ACCOUNTING_RECORD_TYPE_LABELS[item.recordType]}</td><td className="p-3">{item.sourceRow}</td><td className="p-3">{String(item.payload.E || '-')}</td><td className="max-w-[330px] truncate p-3">{String(item.payload.G || '-')}</td><td className="p-3">{String(item.payload[item.recordType === 'land' ? 'AB' : 'AL'] || '-')}</td><td className="p-3">{String(item.payload[item.recordType === 'land' ? 'AC' : 'AM'] || '-')}</td><td className="p-3">{item.ownershipMode === 'leased' ? 'مستأجر' : 'مملوك'}</td></tr>)}</tbody></table></div>{items.length > 12 && <p className="mt-3 text-xs text-slate-500">المعاينة تعرض أول 12 سجل فقط. سيتم استيراد جميع السجلات وعددها {items.length}.</p>}</CardContent></Card>

        <div className="flex flex-col gap-3 rounded-[24px] border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-900">جاهز للاستيراد</p><p className="mt-1 text-xs text-slate-500">إعادة رفع نفس البيانات لا تنشئ تكرارًا؛ يقوم النظام بتحديث السجل المطابق لبصمة بياناته.</p></div><Button disabled={importing} className="rounded-2xl px-7" onClick={performImport}><UploadCloud className="ml-2 h-4 w-4" />{importing ? 'جاري الاستيراد...' : `استيراد ${items.length} سجل`}</Button></div>
      </>}

      {result && <Card className="rounded-[24px] border-emerald-200 bg-emerald-50/60"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><CheckCircle2 className="mt-1 h-6 w-6 text-emerald-700" /><div><h3 className="font-black text-emerald-900">تمت عملية الاستيراد</h3><p className="mt-1 text-sm text-emerald-800">جديد: {result.created} — محدث: {result.updated} — متجاوز: {result.skipped} — الإجمالي: {result.total}</p></div></div><Button variant="outline" className="rounded-2xl border-emerald-300 bg-white" onClick={() => navigate('/accounting-transformation/records')}>عرض السجلات</Button></CardContent></Card>}
    </div>
  );
};
