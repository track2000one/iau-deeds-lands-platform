import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowRight, FileText, Paperclip, Save, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Badge } from '../components/ui/badge';
import {
  ACCOUNTING_COMMITTEE_STATUS_LABELS,
  calculateAccountingProgress,
  getAccountingFieldType,
  isConditionalAccountingMarker,
  isMeaningfulAccountingValue,
  type AccountingRecordType as LegacyAccountingRecordType,
} from '../config/accountingTransformationFields';
import {
  getAccountingDisplayFields,
  getAccountingDisplayGroups,
  getAccountingRecordTypeLabel,
} from '../config/accountingRecordPresentation';
import {
  MODEL_B_PROCEDURES,
  MODEL_B_VALUATION_METHODS,
  MODEL_B_VERSION,
  validateModelBValues,
} from '../config/fixedAssetModelB';
import {
  createAccountingTransformationRecord,
  getAccountingTransformationRecord,
  getAccountingTransformationRecords,
  updateAccountingTransformationRecord,
  uploadAccountingTransformationFile,
} from '../api/accountingTransformation';
import { getOrganizationUnits } from '../api/organization';
import type {
  AccountingCommitteeStatus,
  AccountingOwnershipMode,
  AccountingRecordType,
  AccountingTransformationAttachment,
} from '../../types/accountingTransformation';
import {
  ACCOUNTING_ATTACHMENT_PURPOSE_OPTIONS,
  ACCOUNTING_DOCUMENT_TYPE_SUGGESTIONS,
  inferAccountingAttachmentMeta,
} from '../../utils/accountingSupportingDocuments';

const initialPayload = (type: AccountingRecordType): Record<string, unknown> => type === 'fixed_asset'
  ? { A: 'جامعة الإمام عبدالرحمن بن فيصل', B: '0029', AQ: 'المملكة العربية السعودية' }
  : { B: 'جامعة الامام عبدالرحمن بن فيصل', C: '0029' };

const PhaseBadges: React.FC<{ h?: string; j?: string; v?: string; automatic?: boolean; conditional?: boolean }> = ({ h = '', j = '', v = '', automatic, conditional }) => {
  if (automatic) return <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">آلي / مرجعي</span>;
  if (conditional) return <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">شرطي</span>;
  const values = [['حصر', h], ['جرد', j], ['تقييم', v]].filter(([, marker]) => Boolean(String(marker || '').trim()));
  if (!values.length) return null;
  return <div className="flex flex-wrap gap-1">{values.map(([label, marker]) => <span key={label} className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold ${isConditionalAccountingMarker(marker) ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>{label}{isConditionalAccountingMarker(marker) ? ' شرطي' : ''}</span>)}</div>;
};

const ProgressPreview: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-xl border bg-white p-3"><div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700"><span>{label}</span><span>{value}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-l from-cyan-500 to-blue-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>
);

const fixedProgress = (payload: Record<string, unknown>) => {
  const phase = (columns: string[]) => Math.round(columns.filter((column) => isMeaningfulAccountingValue(payload[column])).length / columns.length * 100);
  return {
    census: phase(['A','B','E','H','K','N','U','AA','AB','AC','AD','AE','AQ','AR','AS','AU','AV']),
    inventory: phase(['A','B','E','H','K','N','U','AA','AB','AC','AD','AE','AF','AQ','AR','AS','AU','AV']),
    valuation: validateModelBValues(payload).completion,
  };
};

const isOwnershipDeedAttachment = (attachment: AccountingTransformationAttachment) => {
  const classified = inferAccountingAttachmentMeta(attachment);
  return classified.documentPurpose === 'ownership_acquisition' && /صك/.test(String(classified.documentType || ''));
};

export const AccountingTransformationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { recordId } = useParams<{ recordId?: string }>();
  const editing = Boolean(recordId);
  const [recordType, setRecordType] = useState<AccountingRecordType>('fixed_asset');
  const [ownershipMode, setOwnershipMode] = useState<AccountingOwnershipMode>('owned');
  const [committeeStatus, setCommitteeStatus] = useState<AccountingCommitteeStatus>('not_reviewed');
  const [payload, setPayload] = useState<Record<string, unknown>>(initialPayload('fixed_asset'));
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<AccountingTransformationAttachment[]>([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [responsiblePartyOptions, setResponsiblePartyOptions] = useState<string[]>([]);
  const [linkedAssetCheck, setLinkedAssetCheck] = useState<{
    status: 'idle' | 'checking' | 'deed_found' | 'found_without_deed' | 'not_found' | 'error';
    recordType?: AccountingRecordType;
    assetDescription?: string;
  }>({ status: 'idle' });
  const linkedAssetNumber = String(
    recordType === 'fixed_asset' ? (payload.X ?? '') : recordType === 'land' ? (payload.F ?? '') : ''
  ).trim();
  const currentLandHasDeed = useMemo(() => attachments.some(isOwnershipDeedAttachment), [attachments]);

  useEffect(() => {
    let active = true;
    getOrganizationUnits()
      .then((units) => {
        if (!active) return;
        const options = Array.from(new Set(
          units
            .filter((unit) => unit.isActive && unit.nameAr?.trim())
            .map((unit) => unit.nameAr.trim())
        )).sort((a, b) => a.localeCompare(b, 'ar'));
        setResponsiblePartyOptions(options);
      })
      .catch(() => {
        // Non-critical lookup: keep the field available for free-text entry.
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (recordType !== 'fixed_asset' || !linkedAssetNumber) {
      setLinkedAssetCheck({ status: 'idle' });
      return;
    }

    let active = true;
    setLinkedAssetCheck({ status: 'checking' });
    const timer = window.setTimeout(() => {
      getAccountingTransformationRecords({ search: linkedAssetNumber, all: true, limit: 200 })
        .then((page) => {
          if (!active) return;
          const linkedRecord = page.items.find((item) => {
            if (item.id === recordId) return false;
            const references = [
              item.mofAssetNumber,
              item.entityAssetNumber,
              item.recordNumber,
              item.payload?.D,
              item.payload?.E,
              item.payload?.Y,
              item.payload?.Z,
            ];
            return references.some((reference) => String(reference ?? '').trim() === linkedAssetNumber);
          });
          if (!linkedRecord) {
            setLinkedAssetCheck({ status: 'not_found' });
            return;
          }
          const hasDeed = (linkedRecord.attachments || []).some(isOwnershipDeedAttachment);
          setLinkedAssetCheck({
            status: hasDeed ? 'deed_found' : 'found_without_deed',
            recordType: linkedRecord.recordType,
            assetDescription: linkedRecord.assetDescription || undefined,
          });
        })
        .catch(() => {
          if (active) setLinkedAssetCheck({ status: 'error' });
        });
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [recordType, linkedAssetNumber, recordId]);

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

  const displayFields = useMemo(() => getAccountingDisplayFields(recordType), [recordType]);
  const displayGroups = useMemo(() => getAccountingDisplayGroups(recordType), [recordType]);
  const modelBValidation = useMemo(() => recordType === 'fixed_asset' ? validateModelBValues(payload) : null, [recordType, payload]);
  const progress = useMemo(() => recordType === 'fixed_asset'
    ? fixedProgress(payload)
    : {
        census: calculateAccountingProgress(recordType as LegacyAccountingRecordType, payload, 'census'),
        inventory: calculateAccountingProgress(recordType as LegacyAccountingRecordType, payload, 'inventory'),
        valuation: calculateAccountingProgress(recordType as LegacyAccountingRecordType, payload, 'valuation'),
      }, [recordType, payload]);

  const setField = (column: string, value: unknown) => setPayload((current) => ({ ...current, [column]: value }));
  const changeType = (type: AccountingRecordType) => {
    if (editing) return;
    setRecordType(type);
    setPayload(initialPayload(type));
    setOwnershipMode('owned');
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploaded: AccountingTransformationAttachment[] = [];
      for (const file of Array.from(files)) uploaded.push(inferAccountingAttachmentMeta(await uploadAccountingTransformationFile(file)));
      setAttachments((current) => [...current, ...uploaded]);
      toast.success(`تم رفع ${uploaded.length} مرفق`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع المرفقات');
    } finally { setUploading(false); }
  };

  const updateAttachment = (index: number, patch: Partial<AccountingTransformationAttachment>) =>
    setAttachments((current) => current.map((attachment, itemIndex) => itemIndex === index ? { ...attachment, ...patch } : attachment));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (recordType === 'fixed_asset') {
      if (!String(payload.A || '').trim() || !String(payload.B || '').trim()) return toast.error('اسم الجهة ورمز الجهة مطلوبان');
      if (!['Y','Z','AA','AB'].some((column) => String(payload[column] || '').trim())) return toast.error('أدخل رقمًا فريدًا أو وصف الأصل/رقم البطاقة لتحديد هوية السجل');
    } else {
      if (!String(payload.B || '').trim() || !String(payload.C || '').trim()) return toast.error('اسم الجهة ورمز الجهة مطلوبان');
      if (!String(payload.G || '').trim()) return toast.error('وصف الأصل مطلوب');
    }
    setSaving(true);
    try {
      const input = { recordType, ownershipMode, committeeStatus, payload, attachments, notes: notes || null };
      const result = recordId ? await updateAccountingTransformationRecord(recordId, input) : await createAccountingTransformationRecord(input);
      toast.success(editing ? 'تم تحديث السجل بنجاح' : 'تم إنشاء السجل بنجاح');
      navigate(`/accounting-transformation/${result.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ السجل');
    } finally { setSaving(false); }
  };

  const renderFieldInput = (field: ReturnType<typeof getAccountingDisplayFields>[number]) => {
    const value = payload[field.c] ?? '';
    if (recordType === 'fixed_asset' && field.c === 'C') {
      return <NativeSelect value={String(value)} onChange={(e) => setField(field.c, e.target.value)}><option value="">اختر الإجراء</option>{MODEL_B_PROCEDURES.map((option) => <option key={option} value={option}>{option}</option>)}</NativeSelect>;
    }
    if (recordType === 'fixed_asset' && field.c === 'AG') {
      return <NativeSelect value={String(value)} onChange={(e) => setField(field.c, e.target.value)}><option value="">اختر طريقة التقييم</option>{MODEL_B_VALUATION_METHODS.map((option) => <option key={option} value={option}>{option}</option>)}</NativeSelect>;
    }
    const linkedAssetField =
      (recordType === 'fixed_asset' && field.c === 'X') ||
      (recordType === 'land' && field.c === 'F');
    if (linkedAssetField) {
      const hasValue = Boolean(String(value).trim());
      let statusClass = 'border-slate-200 bg-slate-50 text-slate-600';
      let statusText = 'الرقم يثبت وجود أصل مرتبط فقط، ولا يُعد إثباتًا لوجود صك ملكية.';

      if (hasValue && recordType === 'land') {
        if (currentLandHasDeed) {
          statusClass = 'border-emerald-200 bg-emerald-50 text-emerald-800';
          statusText = 'يوجد أصل مرتبط، وصك ملكية الأرض موجود ضمن المرفقات المصنفة.';
        } else {
          statusClass = 'border-amber-200 bg-amber-50 text-amber-800';
          statusText = 'يوجد أصل مرتبط، لكن لا يوجد صك ملكية مصنف لهذه الأرض. الرقم وحده لا يثبت وجود الصك.';
        }
      } else if (hasValue && recordType === 'fixed_asset') {
        if (linkedAssetCheck.status === 'checking') {
          statusClass = 'border-sky-200 bg-sky-50 text-sky-800';
          statusText = 'جاري التحقق من الأصل المرتبط ووثائق الملكية...';
        } else if (linkedAssetCheck.status === 'deed_found') {
          statusClass = 'border-emerald-200 bg-emerald-50 text-emerald-800';
          statusText = 'تم العثور على الأصل المرتبط' + (linkedAssetCheck.assetDescription ? ' (' + linkedAssetCheck.assetDescription + ')' : '') + ' ويوجد صك ملكية مصنف ضمن مرفقاته.';
        } else if (linkedAssetCheck.status === 'found_without_deed') {
          statusClass = 'border-amber-200 bg-amber-50 text-amber-800';
          statusText = 'تم العثور على الأصل المرتبط' + (linkedAssetCheck.assetDescription ? ' (' + linkedAssetCheck.assetDescription + ')' : '') + '، لكن لا يوجد صك ملكية مصنف ضمن مرفقاته.';
        } else if (linkedAssetCheck.status === 'not_found') {
          statusClass = 'border-amber-200 bg-amber-50 text-amber-800';
          statusText = 'لم يتم العثور على سجل مطابق لهذا الرقم. سيبقى الرقم كرابط مرجعي فقط حتى يتم تسجيل الأصل المرتبط.';
        } else if (linkedAssetCheck.status === 'error') {
          statusClass = 'border-slate-200 bg-slate-50 text-slate-600';
          statusText = 'تعذر التحقق الآن من الأصل المرتبط. لن تعتبر المنصة الرقم دليلًا على وجود صك.';
        }
      }

      return <div className="space-y-1.5">
        <Input value={String(value)} onChange={(e) => setField(field.c, e.target.value)} placeholder="أدخل الرقم الفريد للأصل المرتبط" />
        <p className={'rounded-xl border px-2.5 py-2 text-[10px] leading-5 ' + statusClass}>{statusText}</p>
      </div>;
    }

    const responsiblePartyField =
      (recordType === 'fixed_asset' && field.c === 'V') ||
      (recordType === 'building' && field.c === 'AW') ||
      (recordType === 'land' && field.c === 'AK');
    if (responsiblePartyField) {
      return <div className="space-y-1.5">
        <Input list="accounting-responsible-parties" value={String(value)} onChange={(e) => setField(field.c, e.target.value)} placeholder="اختر إدارة مسجلة أو اكتب اسم الشخص المسؤول" />
        <datalist id="accounting-responsible-parties">{responsiblePartyOptions.map((option) => <option key={option} value={option} />)}</datalist>
        <p className="text-[10px] leading-4 text-slate-500">تظهر الإدارات النشطة المسجلة في المنصة كمقترحات، ويمكن كتابة اسم شخص أو جهة أخرى عند الحاجة.</p>
      </div>;
    }
    const numericColumns = new Set(['AD','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AZ','BA','BB']);
    const fieldType = recordType === 'fixed_asset' ? (numericColumns.has(field.c) ? 'number' : 'text') : getAccountingFieldType(field.a);
    if (fieldType === 'yesno') return <NativeSelect value={String(value)} onChange={(e) => setField(field.c, e.target.value)}><option value="">اختر</option><option value="نعم">نعم</option><option value="لا">لا</option></NativeSelect>;
    if (fieldType === 'textarea') return <textarea value={String(value)} onChange={(e) => setField(field.c, e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />;
    return <Input type={fieldType === 'number' ? 'number' : 'text'} inputMode={fieldType === 'number' ? 'decimal' : undefined} value={String(value)} onChange={(e) => setField(field.c, fieldType === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)} placeholder={['AF','AY'].includes(field.c) ? 'YYYY-MM-DD' : ''} />;
  };

  if (loading) return <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">جاري تحميل السجل...</div>;

  return (
    <form onSubmit={save} className="mx-auto w-full max-w-[1600px] space-y-5 p-1 sm:p-3 md:p-5" dir="rtl">
      <section className="rounded-[28px] border bg-white/90 p-5 shadow-[0_14px_38px_rgba(15,42,70,.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><div className="mb-2 flex items-center gap-2"><Badge variant="outline">لجنة متابعة متطلبات التحول المحاسبي</Badge><Badge variant="secondary">{editing ? 'تعديل سجل' : 'إضافة سجل'}</Badge>{recordType === 'fixed_asset' && <Badge className="border-violet-200 bg-violet-50 text-violet-800">نموذج ب — {MODEL_B_VERSION}</Badge>}</div><h1 className="text-2xl font-black text-slate-900 md:text-3xl">{editing ? 'تعديل بيانات السجل' : 'إضافة سجل للتحول المحاسبي'}</h1><p className="mt-1 text-sm text-slate-500">نموذج ب هو المسار الرسمي الجديد، مع إبقاء نماذج الأراضي والمباني السابقة للتوافق التاريخي فقط.</p></div>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="rounded-2xl" onClick={() => navigate(-1)}><ArrowRight className="ml-2 h-4 w-4" />رجوع</Button><Button type="submit" disabled={saving || uploading} className="rounded-2xl px-6"><Save className="ml-2 h-4 w-4" />{saving ? 'جاري الحفظ...' : 'حفظ السجل'}</Button></div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_330px]">
        <div className="space-y-4">
          <Card className="rounded-[24px]"><CardHeader><CardTitle>إعداد السجل</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>نوع السجل</Label><NativeSelect value={recordType} disabled={editing} onChange={(e) => changeType(e.target.value as AccountingRecordType)}><option value="fixed_asset">سجل الأصول الثابتة — نموذج ب</option><option value="land">Legacy — الأراضي</option><option value="building">Legacy — المباني</option></NativeSelect></div>
            <div className="space-y-2"><Label>نوع الملكية</Label><NativeSelect value={ownershipMode} onChange={(e) => setOwnershipMode(e.target.value as AccountingOwnershipMode)}><option value="owned">مملوك</option><option value="leased">مستأجر</option><option value="other">أخرى</option></NativeSelect></div>
            <div className="space-y-2"><Label>حالة متابعة اللجنة</Label><NativeSelect value={committeeStatus} onChange={(e) => setCommitteeStatus(e.target.value as AccountingCommitteeStatus)}>{Object.entries(ACCOUNTING_COMMITTEE_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></div>
          </CardContent></Card>

          {displayGroups.map(([groupKey, groupLabel], groupIndex) => {
            const fields = displayFields.filter((field) => field.g === groupKey);
            return <details key={groupKey} open={groupIndex < 2} className="group rounded-[24px] border bg-white/90 shadow-sm">
              <summary className="cursor-pointer list-none px-5 py-4"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-slate-900">{groupLabel}</h2><p className="mt-1 text-xs text-slate-500">{fields.length} حقلًا حسب {recordType === 'fixed_asset' ? 'نموذج ب' : 'النموذج التاريخي'}</p></div><span className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-600">فتح / إغلاق</span></div></summary>
              <div className="grid gap-4 border-t p-5 md:grid-cols-2 xl:grid-cols-3">
                {fields.map((field) => <div key={field.c} className={`space-y-2 rounded-2xl border p-3 ${field.conditional ? 'border-amber-200/80 bg-amber-50/40' : field.automatic ? 'border-slate-200 bg-slate-50/60' : 'border-slate-200 bg-white/70'}`}><div className="flex min-h-11 items-start justify-between gap-2"><Label className="text-xs font-bold leading-5 text-slate-800">{field.a}</Label><span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">{field.c}</span></div><PhaseBadges h={field.h} j={field.j} v={field.v} automatic={field.automatic} conditional={field.conditional} />{renderFieldInput(field)}</div>)}
              </div>
            </details>;
          })}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card className="rounded-[24px] border-sky-200/80 bg-[linear-gradient(145deg,#f8fcff,#eef8ff)]"><CardHeader><CardTitle className="text-base">مؤشر اكتمال المتطلبات</CardTitle></CardHeader><CardContent className="space-y-3"><ProgressPreview label="الحصر" value={progress.census} /><ProgressPreview label="الجرد" value={progress.inventory} /><ProgressPreview label="التقييم" value={progress.valuation} />{modelBValidation && <div className={`rounded-xl border p-3 text-xs ${modelBValidation.complete ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>جاهزية نموذج ب: <strong>{modelBValidation.completion}%</strong><br />إلزامي ناقص: {modelBValidation.missingMandatory.length} · شرطي ناقص: {modelBValidation.conditionalMissing.length}</div>}<p className="text-[11px] leading-5 text-slate-500">تعاد جميع مؤشرات الجاهزية في الخادم عند الحفظ، ولا يصبح السجل رسميًا بمجرد الإدخال إذا بقيت متطلبات غير مكتملة.</p></CardContent></Card>

          <Card className="rounded-[24px]">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Paperclip className="h-4 w-4" />المرفقات المصنفة</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-bold text-slate-600 hover:bg-slate-50"><Upload className="h-4 w-4" />{uploading ? 'جاري الرفع...' : 'رفع صور أو مستندات'}<input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} /></label>
              <p className="rounded-xl border border-sky-100 bg-sky-50/70 p-2.5 text-[10px] leading-5 text-sky-800">صنّف المرفق مرة واحدة. عند إنشاء ملف Excel تستخدم المنصة مرفقات «إثبات الملكية / الاقتناء» لتعبئة نوع الوثيقة تلقائيًا في <strong>AU للمباني</strong> و<strong>AI للأراضي</strong>. إذا لم توجد وثيقة مناسبة تُكتب <strong>Not Available</strong> بدل الشرطة.</p>
              <datalist id="accounting-document-types">{ACCOUNTING_DOCUMENT_TYPE_SUGGESTIONS.map((option) => <option key={option} value={option} />)}</datalist>
              {attachments.length ? <div className="space-y-3">{attachments.map((attachment, index) => <div key={`${attachment.driveUrl}-${index}`} className="space-y-2 rounded-2xl border bg-white p-3 text-xs">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-sky-600" /><a href={attachment.driveUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-bold text-sky-700">{attachment.title}</a><button type="button" onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-red-50"><X className="h-3.5 w-3.5 text-red-600" /></button></div>
                <div className="space-y-1"><Label className="text-[10px]">تصنيف المرفق</Label><NativeSelect value={attachment.documentPurpose || 'other'} onChange={(e) => updateAttachment(index, { documentPurpose: e.target.value as AccountingTransformationAttachment['documentPurpose'] })}>{ACCOUNTING_ATTACHMENT_PURPOSE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></div>
                <div className="space-y-1"><Label className="text-[10px]">نوع الوثيقة</Label><Input list="accounting-document-types" value={attachment.documentType || ''} onChange={(e) => updateAttachment(index, { documentType: e.target.value || null })} placeholder="مثال: صك ملكية" /></div>
                <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-[10px]">رقم الوثيقة</Label><Input value={attachment.documentNumber || ''} onChange={(e) => updateAttachment(index, { documentNumber: e.target.value || null })} /></div><div className="space-y-1"><Label className="text-[10px]">رقم الأرشفة</Label><Input value={attachment.archiveNumber || ''} onChange={(e) => updateAttachment(index, { archiveNumber: e.target.value || null })} /></div></div>
              </div>)}</div> : <p className="text-xs text-slate-400">لا توجد مرفقات.</p>}
            </CardContent>
          </Card>

          <Card className="rounded-[24px]"><CardHeader><CardTitle className="text-base">ملاحظات اللجنة</CardTitle></CardHeader><CardContent><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></CardContent></Card>
        </aside>
      </div>
    </form>
  );
};
