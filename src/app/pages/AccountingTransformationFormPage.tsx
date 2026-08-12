import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowRight,
  FileText,
  Paperclip,
  Save,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Badge } from '../components/ui/badge';
import {
  ACCOUNTING_COMMITTEE_STATUS_LABELS,
  ACCOUNTING_FIELDS,
  ACCOUNTING_FIELD_GROUPS,
  ACCOUNTING_RECORD_TYPE_LABELS,
  calculateAccountingProgress,
  getAccountingFieldType,
  isConditionalAccountingMarker,
  type AccountingRecordType,
} from '../config/accountingTransformationFields';
import {
  createAccountingTransformationRecord,
  getAccountingTransformationRecord,
  updateAccountingTransformationRecord,
  uploadAccountingTransformationFile,
} from '../api/accountingTransformation';
import type {
  AccountingCommitteeStatus,
  AccountingOwnershipMode,
  AccountingTransformationAttachment,
} from '../../types/accountingTransformation';

const initialPayload = (): Record<string, unknown> => ({
  B: 'جامعة الامام عبدالرحمن بن فيصل',
  C: '0029',
});

const PhaseBadges: React.FC<{ h: string; j: string; v: string }> = ({ h, j, v }) => {
  const values = [
    ['حصر', h],
    ['جرد', j],
    ['تقييم', v],
  ].filter(([, marker]) => Boolean(String(marker || '').trim()));
  if (!values.length) return null;
  return <div className="flex flex-wrap gap-1">{values.map(([label, marker]) => <span key={label} className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${isConditionalAccountingMarker(marker) ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>{label}{isConditionalAccountingMarker(marker) ? ' شرطي' : ''}</span>)}</div>;
};

const ProgressPreview: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-xl border bg-white p-3">
    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700"><span>{label}</span><span>{value}%</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-l from-cyan-500 to-blue-600" style={{ width: `${value}%` }} /></div>
  </div>
);

export const AccountingTransformationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { recordId } = useParams<{ recordId?: string }>();
  const editing = Boolean(recordId);
  const [recordType, setRecordType] = useState<AccountingRecordType>('land');
  const [ownershipMode, setOwnershipMode] = useState<AccountingOwnershipMode>('owned');
  const [committeeStatus, setCommitteeStatus] = useState<AccountingCommitteeStatus>('not_reviewed');
  const [payload, setPayload] = useState<Record<string, unknown>>(initialPayload);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<AccountingTransformationAttachment[]>([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!recordId) return;
    getAccountingTransformationRecord(recordId)
      .then((record) => {
        setRecordType(record.recordType);
        setOwnershipMode(record.ownershipMode);
        setCommitteeStatus(record.committeeStatus);
        setPayload(record.payload || {});
        setNotes(record.notes || '');
        setAttachments(Array.isArray(record.attachments) ? record.attachments : []);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'تعذر تحميل السجل');
        navigate('/accounting-transformation/records');
      })
      .finally(() => setLoading(false));
  }, [recordId]);

  const progress = useMemo(() => ({
    census: calculateAccountingProgress(recordType, payload, 'census'),
    inventory: calculateAccountingProgress(recordType, payload, 'inventory'),
    valuation: calculateAccountingProgress(recordType, payload, 'valuation'),
  }), [recordType, payload]);

  const setField = (column: string, value: unknown) => setPayload((current) => ({ ...current, [column]: value }));

  const changeType = (type: AccountingRecordType) => {
    if (editing) return;
    setRecordType(type);
    setPayload({ ...initialPayload() });
    setOwnershipMode('owned');
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: AccountingTransformationAttachment[] = [];
      for (const file of Array.from(files)) uploaded.push(await uploadAccountingTransformationFile(file));
      setAttachments((current) => [...current, ...uploaded]);
      toast.success(`تم رفع ${uploaded.length} مرفق`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع المرفقات');
    } finally {
      setUploading(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!String(payload.B || '').trim() || !String(payload.C || '').trim()) return toast.error('اسم الجهة ورمز الجهة مطلوبان');
    if (!String(payload.G || '').trim()) return toast.error('وصف الأصل مطلوب');
    setSaving(true);
    try {
      const input = { recordType, ownershipMode, committeeStatus, payload, attachments, notes: notes || null };
      const result = recordId
        ? await updateAccountingTransformationRecord(recordId, input)
        : await createAccountingTransformationRecord(input);
      toast.success(editing ? 'تم تحديث السجل بنجاح' : 'تم إنشاء السجل بنجاح');
      navigate(`/accounting-transformation/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ السجل');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">جاري تحميل السجل...</div>;

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-[1600px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">لجنة متابعة متطلبات التحول المحاسبي</Badge><Badge variant="secondary">{editing ? 'تعديل سجل' : 'إضافة سجل'}</Badge></div><h1 className="text-2xl font-black text-slate-900 md:text-3xl">{editing ? 'تعديل بيانات التحول المحاسبي' : 'إضافة متطلب تحول محاسبي'}</h1><p className="mt-1 text-sm text-slate-500">الحقول مبنية على نموذج الجامعة المرفق للأراضي والمباني.</p></div>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="rounded-2xl" onClick={() => navigate(-1)}><ArrowRight className="ml-2 h-4 w-4" />رجوع</Button><Button type="submit" disabled={saving || uploading} className="rounded-2xl px-6"><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : 'حفظ السجل'}</Button></div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <Card className="rounded-[24px]"><CardHeader><CardTitle>إعداد السجل</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>نوع السجل</Label><NativeSelect value={recordType} disabled={editing} onChange={(e) => changeType(e.target.value as AccountingRecordType)}><option value="land">الأراضي</option><option value="building">المباني</option></NativeSelect></div>
            <div className="space-y-2"><Label>نوع الملكية</Label><NativeSelect value={ownershipMode} onChange={(e) => setOwnershipMode(e.target.value as AccountingOwnershipMode)}><option value="owned">مملوك</option><option value="leased">مستأجر</option><option value="other">أخرى</option></NativeSelect></div>
            <div className="space-y-2"><Label>حالة متابعة اللجنة</Label><NativeSelect value={committeeStatus} onChange={(e) => setCommitteeStatus(e.target.value as AccountingCommitteeStatus)}>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
          </CardContent></Card>

          {ACCOUNTING_FIELD_GROUPS[recordType].map(([groupKey, groupLabel], groupIndex) => {
            const fields = ACCOUNTING_FIELDS[recordType].filter((field) => field.g === groupKey);
            return <details key={groupKey} open={groupIndex < 2} className="group rounded-[24px] border bg-white/90 shadow-sm">
              <summary className="cursor-pointer list-none px-5 py-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-slate-900">{groupLabel}</h2><p className="mt-1 text-xs text-slate-500">{fields.length} حقلًا حسب النموذج المعتمد</p></div><span className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-600">فتح / إغلاق</span></div></summary>
              <div className="grid gap-4 border-t p-5 md:grid-cols-2 xl:grid-cols-3">
                {fields.map((field) => {
                  const fieldType = getAccountingFieldType(field.a);
                  const value = payload[field.c] ?? '';
                  const conditional = isConditionalAccountingMarker(field.h) || isConditionalAccountingMarker(field.j) || isConditionalAccountingMarker(field.v);
                  return <div key={field.c} className={`space-y-2 rounded-2xl border p-3 ${conditional ? 'border-amber-200/80 bg-amber-50/40' : 'border-slate-200 bg-white/70'}`}>
                    <div className="flex min-h-11 items-start justify-between gap-2"><Label className="text-xs font-bold leading-5 text-slate-800">{field.a}</Label><span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">{field.c}</span></div>
                    <PhaseBadges h={field.h} j={field.j} v={field.v} />
                    {fieldType === 'yesno' ? <NativeSelect value={String(value)} onChange={(e) => setField(field.c, e.target.value)}><option value="">اختر</option><option value="نعم">نعم</option><option value="لا">لا</option></NativeSelect> : fieldType === 'textarea' ? <textarea value={String(value)} onChange={(e) => setField(field.c, e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /> : <Input type={fieldType === 'number' ? 'number' : 'text'} inputMode={fieldType === 'number' ? 'decimal' : undefined} value={String(value)} onChange={(e) => setField(field.c, e.target.value)} placeholder={fieldType === 'date' ? 'مثال: 2026-08-12 أو التاريخ كما في النموذج' : ''} />}
                  </div>;
                })}
              </div>
            </details>;
          })}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card className="rounded-[24px] border-sky-200/80 bg-[linear-gradient(145deg,#f8fcff,#eef8ff)]"><CardHeader><CardTitle className="text-base">مؤشر اكتمال المتطلبات</CardTitle></CardHeader><CardContent className="space-y-3"><ProgressPreview label="الحصر" value={progress.census} /><ProgressPreview label="الجرد" value={progress.inventory} /><ProgressPreview label="التقييم" value={progress.valuation} /><p className="text-[11px] leading-5 text-slate-500">النسبة المعروضة تقديرية أثناء الإدخال، وتتم إعادة احتسابها في الخادم عند الحفظ بما في ذلك الحقول الشرطية المرتبطة بالإيجار والإيرادات.</p></CardContent></Card>

          <Card className="rounded-[24px]"><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="h-4 w-4" />المرفقات</CardTitle></CardHeader><CardContent className="space-y-3">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-bold text-slate-600 hover:bg-slate-50"><Upload className="h-4 w-4" />{uploading ? 'جاري الرفع...' : 'رفع صور أو مستندات'}<input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} /></label>
            {attachments.length ? <div className="space-y-2">{attachments.map((attachment, index) => <div key={`${attachment.driveUrl}-${index}`} className="flex items-center gap-2 rounded-xl border bg-white p-2 text-xs"><FileText className="h-4 w-4 shrink-0 text-sky-600" /><a href={attachment.driveUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-bold text-sky-700">{attachment.title}</a><button type="button" onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-red-50"><X className="h-3.5 w-3.5 text-red-600" /></button></div>)}</div> : <p className="text-xs text-slate-400">لا توجد مرفقات.</p>}
          </CardContent></Card>

          <Card className="rounded-[24px]"><CardHeader><CardTitle className="text-base">ملاحظات اللجنة</CardTitle></CardHeader><CardContent><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="ملاحظات المتابعة أو النواقص أو الإجراء المطلوب..." /></CardContent></Card>
        </aside>
      </div>
    </form>
  );
};
