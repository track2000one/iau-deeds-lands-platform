import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileCheck2,
  Loader2,
  RefreshCcw,
  Save,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import { Textarea } from '../components/ui/textarea';
import {
  getAccountingTransformationRecords,
  updateAccountingTransformationRecord,
} from '../api/accountingTransformation';
import type { AccountingTransformationRecord } from '../../types/accountingTransformation';

const CONTROL_KEY = '__propertyControlAnalysis';

type IndicatorValue = 'yes' | 'partial' | 'no' | 'unknown';
type DocumentCompleteness = 'complete' | 'partial' | 'missing';
type AnalysisLevel = 'strong_needs_approval' | 'needs_more_study' | 'insufficient' | 'undetermined';

type ControlAnalysis = {
  relationshipType: string;
  documentReference: string;
  documentSummary: string;
  universityUse: string;
  legalOwnership: IndicatorValue;
  accessControl: IndicatorValue;
  universityPurposeUse: IndicatorValue;
  enforceableRight: IndicatorValue;
  operationsMaintenance: IndicatorValue;
  improvementFunding: string;
  reversionCompensation: string;
  benefitTerm: string;
  documentCompleteness: DocumentCompleteness;
  analysisLevel: AnalysisLevel;
  recognitionConditions: string;
  proposedTreatment: string;
  nextAction: string;
  responsible: string;
  notes: string;
  updatedAt?: string;
};

const emptyAnalysis = (): ControlAnalysis => ({
  relationshipType: '',
  documentReference: '',
  documentSummary: '',
  universityUse: '',
  legalOwnership: 'unknown',
  accessControl: 'unknown',
  universityPurposeUse: 'unknown',
  enforceableRight: 'unknown',
  operationsMaintenance: 'unknown',
  improvementFunding: '',
  reversionCompensation: '',
  benefitTerm: '',
  documentCompleteness: 'partial',
  analysisLevel: 'undetermined',
  recognitionConditions: '',
  proposedTreatment: '',
  nextAction: '',
  responsible: 'وحدة الأصول / الإدارة المالية',
  notes: '',
});

const normalize = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[أإآ]/g, 'ا')
  .replace(/\s+/g, ' ');

const isUniversityOwner = (value: unknown) => {
  const text = normalize(value);
  if (!text) return false;
  return text.includes('جامعة الامام عبدالرحمن بن فيصل')
    || text.includes('imam abdulrahman bin faisal university')
    || text === 'iau';
};

const isUnavailable = (value: unknown) => {
  const text = normalize(value);
  return !text || ['غير متوفر', 'غير متاح', 'not available', 'n/a', '-', '—'].includes(text);
};

const assetOwner = (record: AccountingTransformationRecord) => {
  if (record.recordType === 'building') return record.payload?.V;
  if (record.recordType === 'land') return record.payload?.W;
  return undefined;
};

const readAnalysis = (record?: AccountingTransformationRecord | null): ControlAnalysis => {
  if (!record) return emptyAnalysis();
  const raw = record.payload?.[CONTROL_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return emptyAnalysis();
  return { ...emptyAnalysis(), ...(raw as Partial<ControlAnalysis>) };
};

const indicatorScore = (value: IndicatorValue) => value === 'yes' ? 2 : value === 'partial' ? 1 : 0;
const scoreAnalysis = (analysis: ControlAnalysis) => [
  analysis.legalOwnership,
  analysis.accessControl,
  analysis.universityPurposeUse,
  analysis.enforceableRight,
  analysis.operationsMaintenance,
].reduce((sum, value) => sum + indicatorScore(value), 0);

const indicatorLabel: Record<IndicatorValue, string> = {
  yes: 'نعم',
  partial: 'جزئي',
  no: 'لا',
  unknown: 'غير متوفر',
};

const levelLabel: Record<AnalysisLevel, string> = {
  strong_needs_approval: 'مؤشرات قوية تحتاج اعتماد',
  needs_more_study: 'تحتاج دراسة إضافية',
  insufficient: 'مؤشرات غير كافية',
  undetermined: 'لم يحدد بعد',
};

const levelTone: Record<AnalysisLevel, string> = {
  strong_needs_approval: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  needs_more_study: 'border-amber-300 bg-amber-50 text-amber-800',
  insufficient: 'border-red-300 bg-red-50 text-red-800',
  undetermined: 'border-slate-300 bg-slate-50 text-slate-700',
};

const IndicatorField: React.FC<{
  label: string;
  value: IndicatorValue;
  onChange: (value: IndicatorValue) => void;
  hint: string;
}> = ({ label, value, onChange, hint }) => (
  <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <p className="font-black text-slate-900">{label}</p>
    <p className="mt-1 min-h-10 text-[11px] leading-5 text-slate-500">{hint}</p>
    <NativeSelect className="mt-3" value={value} onChange={(event) => onChange(event.target.value as IndicatorValue)}>
      <option value="unknown">غير متوفر / لم يحلل</option>
      <option value="yes">نعم</option>
      <option value="partial">جزئي</option>
      <option value="no">لا</option>
    </NativeSelect>
  </div>
);

export const AccountingPropertyControlIndicatorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AccountingTransformationRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [analysis, setAnalysis] = useState<ControlAnalysis>(emptyAnalysis());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [buildings, lands] = await Promise.all([
        getAccountingTransformationRecords({ recordType: 'building', all: true }),
        getAccountingTransformationRecords({ recordType: 'land', all: true }),
      ]);
      const combined = [...(buildings.items || []), ...(lands.items || [])];
      setRecords(combined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل العقارات محل تحليل السيطرة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const candidates = useMemo(() => records.filter((record) => {
    const owner = assetOwner(record);
    return isUnavailable(owner) || !isUniversityOwner(owner);
  }), [records]);

  const filtered = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return candidates;
    return candidates.filter((record) => [
      record.assetDescription,
      record.entityAssetNumber,
      record.city,
      assetOwner(record),
      record.recordNumber,
    ].some((value) => normalize(value).includes(needle)));
  }, [candidates, query]);

  const selected = candidates.find((record) => record.id === selectedId) || null;

  useEffect(() => {
    if (!selectedId && candidates.length) setSelectedId(candidates[0].id);
  }, [candidates, selectedId]);

  useEffect(() => { setAnalysis(readAnalysis(selected)); }, [selected?.id]);

  const completedAnalyses = candidates.filter((record) => {
    const saved = readAnalysis(record);
    return saved.documentCompleteness === 'complete';
  }).length;
  const strongCount = candidates.filter((record) => readAnalysis(record).analysisLevel === 'strong_needs_approval').length;
  const studyCount = candidates.filter((record) => readAnalysis(record).analysisLevel === 'needs_more_study').length;
  const insufficientCount = candidates.filter((record) => readAnalysis(record).analysisLevel === 'insufficient').length;
  const score = scoreAnalysis(analysis);

  const update = <K extends keyof ControlAnalysis>(key: K, value: ControlAnalysis[K]) => {
    setAnalysis((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const nextAnalysis: ControlAnalysis = { ...analysis, updatedAt: new Date().toISOString() };
      const updated = await updateAccountingTransformationRecord(selected.id, {
        recordType: selected.recordType,
        ownershipMode: selected.ownershipMode,
        committeeStatus: selected.committeeStatus,
        payload: { ...selected.payload, [CONTROL_KEY]: nextAnalysis },
        attachments: selected.attachments || [],
        notes: selected.notes || null,
      });
      setRecords((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      setAnalysis(readAnalysis(updated));
      toast.success('تم حفظ تحليل مؤشرات السيطرة داخل سجل العقار');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ تحليل مؤشرات السيطرة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1780px] space-y-5 pb-8" dir="rtl">
      <section className="overflow-hidden rounded-[30px] border border-slate-300 bg-[linear-gradient(135deg,#12304f,#0c2239)] text-white shadow-xl">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-7">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-cyan-200/30 bg-cyan-200/10 text-cyan-50">مذكرة مؤشرات السيطرة على العقارات</Badge>
              <Badge variant="outline" className="border-amber-200/30 bg-amber-200/10 text-amber-50">النتيجة استرشادية وليست اعتمادًا نهائيًا</Badge>
            </div>
            <h1 className="text-2xl font-black sm:text-3xl">العقارات التي يكون مالك الأصل فيها خلاف الجامعة</h1>
            <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">مساحة عمل لحصر الحالات، جمع المستندات، تحليل مؤشرات الملكية والوصول والاستخدام وحق النفاذ، ثم توثيق المعالجة المقترحة قبل الاعتماد المالي والنظامي.</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => void load()} disabled={loading}><RefreshCcw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />تحديث</Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate('/accounting-transformation/records')}><ClipboardList className="ml-2 h-4 w-4" />سجل الأصول</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['إجمالي الحالات', candidates.length, Building2, 'text-blue-700'],
          ['المستندات مكتملة', completedAnalyses, FileCheck2, 'text-emerald-700'],
          ['مؤشرات قوية تحتاج اعتماد', strongCount, ShieldCheck, 'text-teal-700'],
          ['تحتاج دراسة إضافية', studyCount, AlertTriangle, 'text-amber-700'],
          ['مؤشرات غير كافية', insufficientCount, Scale, 'text-red-700'],
        ].map(([label, value, Icon, tone]) => (
          <Card key={String(label)} className="rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><div className="grid h-11 w-11 place-items-center rounded-2xl border bg-slate-50"><Icon className={`h-5 w-5 ${tone}`} /></div><div><p className="text-[11px] font-bold text-slate-500">{String(label)}</p><p className="mt-1 text-2xl font-black text-slate-950">{Number(value).toLocaleString('ar-SA')}</p></div></CardContent></Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Card className="overflow-hidden rounded-[26px]">
          <CardHeader className="border-b bg-slate-50/70"><CardTitle className="text-base">الحالات المرشحة للتحليل</CardTitle><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو المالك أو المدينة..." /></CardHeader>
          <CardContent className="max-h-[1050px] space-y-2 overflow-y-auto p-3">
            {loading && <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />جاري التحميل...</div>}
            {!loading && !filtered.length && <p className="py-12 text-center text-sm text-slate-500">لا توجد حالات مطابقة.</p>}
            {filtered.map((record) => {
              const saved = readAnalysis(record);
              const active = record.id === selectedId;
              return <button key={record.id} type="button" onClick={() => setSelectedId(record.id)} className={`w-full rounded-2xl border p-3 text-right transition ${active ? 'border-sky-400 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-black text-slate-900">{record.assetDescription || record.entityAssetNumber || record.recordNumber}</p><p className="mt-1 truncate text-[11px] text-slate-500">المالك: {String(assetOwner(record) || 'غير متوفر')}</p><p className="mt-1 text-[11px] text-slate-500">{record.city || '-'} · {record.recordType === 'building' ? 'مبنى' : 'أرض'}</p></div><Badge variant="outline" className={levelTone[saved.analysisLevel]}>{levelLabel[saved.analysisLevel]}</Badge></div>
              </button>;
            })}
          </CardContent>
        </Card>

        <div className="space-y-5">
          {!selected && <Card className="rounded-[26px]"><CardContent className="py-20 text-center text-slate-500">اختر عقارًا من القائمة لبدء التحليل.</CardContent></Card>}
          {selected && <>
            <Card className="rounded-[26px]">
              <CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{selected.assetDescription || selected.entityAssetNumber || selected.recordNumber}</CardTitle><p className="mt-2 text-xs text-slate-500">المالك حسب سجل الأصول: {String(assetOwner(selected) || 'غير متوفر')} · رقم السجل: {selected.recordNumber}</p></div><Button variant="outline" onClick={() => navigate(`/accounting-transformation/${selected.id}`)}><Eye className="ml-2 h-4 w-4" />عرض السجل الأصلي</Button></div></CardHeader>
              <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
                <div><label className="mb-2 block text-xs font-bold text-slate-600">نوع العلاقة / أساس الانتفاع</label><Input value={analysis.relationshipType} onChange={(e) => update('relationshipType', e.target.value)} placeholder="تخصيص، انتفاع، إيجار، اتفاقية تشغيل..." /></div>
                <div><label className="mb-2 block text-xs font-bold text-slate-600">رقم / تاريخ المستند</label><Input value={analysis.documentReference} onChange={(e) => update('documentReference', e.target.value)} placeholder="رقم القرار أو الاتفاقية وتاريخها" /></div>
                <div className="lg:col-span-2"><label className="mb-2 block text-xs font-bold text-slate-600">ملخص المستند</label><Textarea value={analysis.documentSummary} onChange={(e) => update('documentSummary', e.target.value)} /></div>
                <div><label className="mb-2 block text-xs font-bold text-slate-600">استخدام الجامعة الحالي</label><Input value={analysis.universityUse} onChange={(e) => update('universityUse', e.target.value)} /></div>
                <div><label className="mb-2 block text-xs font-bold text-slate-600">مدة الانتفاع / الإيجار</label><Input value={analysis.benefitTerm} onChange={(e) => update('benefitTerm', e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card className="rounded-[26px]">
              <CardHeader className="border-b"><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>مؤشرات السيطرة</CardTitle><p className="mt-1 text-xs text-slate-500">الدرجة رقم مساعد للمراجعة فقط ولا تنتج قرار إثبات آلي.</p></div><div className="rounded-2xl border bg-slate-50 px-5 py-3 text-center"><p className="text-[10px] font-bold text-slate-500">درجة المؤشرات</p><p className="text-2xl font-black text-slate-950">{score} / 10</p></div></div></CardHeader>
              <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                <IndicatorField label="الملكية النظامية" value={analysis.legalOwnership} onChange={(v) => update('legalOwnership', v)} hint="صك باسم الجامعة أو مستند حق واجب النفاذ مثل قرار تخصيص أو اتفاقية." />
                <IndicatorField label="الوصول / تقييد الوصول" value={analysis.accessControl} onChange={(v) => update('accessControl', v)} hint="قدرة الجامعة على الوصول وتنظيم الدخول أو منع وتقييد وصول الآخرين." />
                <IndicatorField label="الاستخدام لأهداف الجامعة" value={analysis.universityPurposeUse} onChange={(v) => update('universityPurposeUse', v)} hint="استخدام فعلي لتحقيق أهداف تعليمية أو إدارية أو خدمية للجامعة." />
                <IndicatorField label="حق واجب النفاذ" value={analysis.enforceableRight} onChange={(v) => update('enforceableRight', v)} hint="وجود حق نظامي واجب النفاذ للحصول على الخدمات أو المنافع من العقار." />
                <IndicatorField label="التشغيل / الصيانة" value={analysis.operationsMaintenance} onChange={(v) => update('operationsMaintenance', v)} hint="تحمل الجامعة التشغيل أو الصيانة كقرينة مساندة وليست حكمًا منفردًا." />
                <div className="rounded-2xl border bg-slate-50 p-4"><p className="font-black text-slate-900">مستوى التحليل</p><p className="mt-1 text-[11px] leading-5 text-slate-500">يحدد يدويًا بعد مراجعة المستندات والجوهر؛ لا يتم تعيينه تلقائيًا من الدرجة.</p><NativeSelect className="mt-3" value={analysis.analysisLevel} onChange={(e) => update('analysisLevel', e.target.value as AnalysisLevel)}><option value="undetermined">لم يحدد بعد</option><option value="strong_needs_approval">مؤشرات قوية تحتاج اعتماد</option><option value="needs_more_study">تحتاج دراسة إضافية</option><option value="insufficient">مؤشرات غير كافية</option></NativeSelect></div>
              </CardContent>
            </Card>

            <Card className="rounded-[26px]">
              <CardHeader className="border-b"><CardTitle>اكتمال المستندات والمعالجة المقترحة</CardTitle></CardHeader>
              <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
                <div><label className="mb-2 block text-xs font-bold text-slate-600">اكتمال المستندات</label><NativeSelect value={analysis.documentCompleteness} onChange={(e) => update('documentCompleteness', e.target.value as DocumentCompleteness)}><option value="complete">مكتملة</option><option value="partial">جزئية</option><option value="missing">غير مكتملة</option></NativeSelect></div>
                <div><label className="mb-2 block text-xs font-bold text-slate-600">تمويل الإنشاء / التحسينات</label><Input value={analysis.improvementFunding} onChange={(e) => update('improvementFunding', e.target.value)} placeholder="الجامعة / المالك / مشترك / غير متوفر" /></div>
                <div className="lg:col-span-2"><label className="mb-2 block text-xs font-bold text-slate-600">احتمال رجوع الأصل للمالك / تعويض الجامعة</label><Textarea value={analysis.reversionCompensation} onChange={(e) => update('reversionCompensation', e.target.value)} /></div>
                <div className="lg:col-span-2"><label className="mb-2 block text-xs font-bold text-slate-600">الشروط الإضافية للإثبات</label><Textarea value={analysis.recognitionConditions} onChange={(e) => update('recognitionConditions', e.target.value)} placeholder="تعريف الأصل، تدفق الخدمات/المنافع، القياس الموثوق، العمر، حد الرسملة..." /></div>
                <div className="lg:col-span-2"><label className="mb-2 block text-xs font-bold text-slate-600">المعالجة المحاسبية المقترحة</label><Textarea value={analysis.proposedTreatment} onChange={(e) => update('proposedTreatment', e.target.value)} /></div>
                <div className="lg:col-span-2"><label className="mb-2 block text-xs font-bold text-slate-600">الإجراء التالي</label><Textarea value={analysis.nextAction} onChange={(e) => update('nextAction', e.target.value)} /></div>
                <div><label className="mb-2 block text-xs font-bold text-slate-600">المسؤول</label><Input value={analysis.responsible} onChange={(e) => update('responsible', e.target.value)} /></div>
                <div><label className="mb-2 block text-xs font-bold text-slate-600">ملاحظات</label><Input value={analysis.notes} onChange={(e) => update('notes', e.target.value)} /></div>
              </CardContent>
            </Card>

            <Card className="rounded-[26px] border-amber-200 bg-amber-50/55">
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><p className="font-black text-amber-950">ضابط الاعتماد</p><p className="mt-1 text-xs leading-6 text-amber-900">حفظ هذه الصفحة يوثق التحليل والمستندات المطلوبة فقط. إدراج العقار في سجل الأصول أو إثبات التحسينات أو الاكتفاء بالإفصاح/السجل الرقابي يبقى خاضعًا لاستكمال المستندات والاعتماد المالي والنظامي.</p></div></div><Button className="shrink-0" onClick={save} disabled={saving}>{saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}حفظ تحليل السيطرة</Button></CardContent>
            </Card>
          </>}
        </div>
      </section>
    </div>
  );
};
