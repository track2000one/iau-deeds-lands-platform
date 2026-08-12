import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  Building2,
  FileText,
  LandPlot,
  Paperclip,
  Pencil,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { usePermissions } from '../../context/PermissionsContext';
import { getAccountingTransformationRecord } from '../api/accountingTransformation';
import type { AccountingTransformationRecord } from '../../types/accountingTransformation';
import {
  ACCOUNTING_COMMITTEE_STATUS_LABELS,
  ACCOUNTING_FIELDS,
  ACCOUNTING_FIELD_GROUPS,
  ACCOUNTING_RECORD_TYPE_LABELS,
  isMeaningfulAccountingValue,
} from '../config/accountingTransformationFields';

const progressTone = (value: number) => {
  if (value >= 100) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (value >= 75) return 'border-cyan-200 bg-cyan-50 text-cyan-800';
  if (value >= 40) return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const ProgressCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className={`rounded-[20px] border p-4 ${progressTone(value)}`}>
    <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold">{label}</span><span className="text-2xl font-black">{value}%</span></div>
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70"><div className="h-full rounded-full bg-gradient-to-l from-cyan-500 to-blue-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
  </div>
);

export const AccountingTransformationViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { recordId } = useParams<{ recordId: string }>();
  const { isAdmin, hasPermission } = usePermissions();
  const [record, setRecord] = useState<AccountingTransformationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const canEdit = isAdmin || hasPermission('accounting_transformation', 'canEdit');
  const canPrint = isAdmin || hasPermission('accounting_transformation', 'canPrint');

  useEffect(() => {
    if (!recordId) return;
    getAccountingTransformationRecord(recordId)
      .then(setRecord)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'تعذر تحميل السجل'))
      .finally(() => setLoading(false));
  }, [recordId]);

  const populatedCount = useMemo(() => {
    if (!record) return 0;
    return ACCOUNTING_FIELDS[record.recordType].filter((field) => isMeaningfulAccountingValue(record.payload?.[field.c])).length;
  }, [record]);

  if (loading) return <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">جاري تحميل السجل...</div>;
  if (!record) return <div className="rounded-[28px] border border-dashed bg-white/70 p-12 text-center text-slate-500">السجل غير موجود.</div>;

  const TypeIcon = record.recordType === 'land' ? LandPlot : Building2;
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];

  return (
    <div className="accounting-record-print mx-auto w-full max-w-[1600px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <style>{`@media print { [data-sidebar], header, .print-hidden { display:none !important; } .accounting-record-print { max-width:none !important; padding:0 !important; } body { background:#fff !important; } .accounting-record-print * { box-shadow:none !important; } }`}</style>
      <section className="rounded-[28px] border bg-white/92 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl border ${record.recordType === 'land' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700'}`}><TypeIcon className="h-7 w-7" /></div>
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{ACCOUNTING_RECORD_TYPE_LABELS[record.recordType]}</Badge><Badge variant="secondary">{ACCOUNTING_COMMITTEE_STATUS_LABELS[record.committeeStatus] || record.committeeStatus}</Badge></div><h1 className="mt-2 truncate text-2xl font-black text-slate-900 md:text-3xl">{record.assetDescription || record.entityAssetNumber || 'سجل التحول المحاسبي'}</h1><p className="mt-1 font-mono text-xs text-slate-500">{record.recordNumber}</p></div>
          </div>
          <div className="print-hidden flex flex-wrap gap-2"><Button variant="outline" className="rounded-2xl" onClick={() => navigate('/accounting-transformation/records')}><ArrowRight className="ml-2 h-4 w-4" />السجلات</Button>{canEdit && <Button variant="outline" className="rounded-2xl" onClick={() => navigate(`/accounting-transformation/${record.id}/edit`)}><Pencil className="ml-2 h-4 w-4" />تعديل</Button>}{canPrint && <Button className="rounded-2xl" onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button>}</div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-4"><ProgressCard label="الحصر" value={record.censusProgress} /><ProgressCard label="الجرد" value={record.inventoryProgress} /><ProgressCard label="التقييم" value={record.valuationProgress} /><ProgressCard label="الاكتمال العام" value={record.overallProgress} /></div>

      <Card className="rounded-[24px]"><CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-slate-50/70 p-3"><span className="text-[11px] text-slate-500">اسم الجهة</span><p className="mt-1 text-sm font-bold text-slate-800">{record.entityName || '-'}</p></div>
        <div className="rounded-xl border bg-slate-50/70 p-3"><span className="text-[11px] text-slate-500">رقم الأصل بالجهة</span><p className="mt-1 text-sm font-bold text-slate-800">{record.entityAssetNumber || '-'}</p></div>
        <div className="rounded-xl border bg-slate-50/70 p-3"><span className="text-[11px] text-slate-500">رمز الأصل المحاسبي</span><p className="mt-1 text-sm font-bold text-slate-800">{record.accountingAssetCode || '-'}</p></div>
        <div className="rounded-xl border bg-slate-50/70 p-3"><span className="text-[11px] text-slate-500">الحقول المعبأة</span><p className="mt-1 text-sm font-bold text-slate-800">{populatedCount} من {ACCOUNTING_FIELDS[record.recordType].length}</p></div>
      </CardContent></Card>

      {ACCOUNTING_FIELD_GROUPS[record.recordType].map(([groupKey, groupLabel]) => {
        const fields = ACCOUNTING_FIELDS[record.recordType].filter((field) => field.g === groupKey && isMeaningfulAccountingValue(record.payload?.[field.c]));
        if (!fields.length) return null;
        return <Card key={groupKey} className="rounded-[24px] break-inside-avoid"><CardHeader><CardTitle className="text-base">{groupLabel}</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{fields.map((field) => <div key={field.c} className="rounded-xl border bg-white p-3"><div className="flex items-start justify-between gap-2"><span className="text-[11px] leading-5 text-slate-500">{field.a}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">{field.c}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-sm font-bold leading-6 text-slate-800">{String(record.payload?.[field.c] ?? '-')}</p></div>)}</CardContent></Card>;
      })}

      {(attachments.length > 0 || record.notes) && <div className="grid gap-4 lg:grid-cols-2">
        {attachments.length > 0 && <Card className="rounded-[24px]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="h-4 w-4" />المرفقات</CardTitle></CardHeader><CardContent className="space-y-2">{attachments.map((attachment, index) => <a key={`${attachment.driveUrl}-${index}`} href={attachment.driveUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border bg-slate-50/60 p-3 text-sm font-bold text-sky-700 hover:bg-sky-50"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{attachment.title}</span></a>)}</CardContent></Card>}
        {record.notes && <Card className="rounded-[24px]"><CardHeader><CardTitle className="text-base">ملاحظات اللجنة</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{record.notes}</p></CardContent></Card>}
      </div>}
    </div>
  );
};
