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
  Upload,
  ExternalLink,
  History,
  PlusCircle,
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
  uploadAccountingTransformationFile,
} from '../api/accountingTransformation';
import type { AccountingTransformationAttachment, AccountingTransformationRecord } from '../../types/accountingTransformation';
import { findPropertyControlMemoProfile, memoProfileToAnalysisSeed } from '../config/accountingPropertyControlMemoProfiles';
import {
  findMatchingPropertyEvidenceAttachment,
  getPropertyEvidenceRequirements,
  type PropertyEvidenceStatus,
} from '../config/accountingPropertyEvidenceRequirements';
import {
  EVIDENCE_ESCALATION_LABELS,
  EVIDENCE_FOLLOW_UP_STATUS_LABELS,
  EVIDENCE_PRIORITY_LABELS,
  defaultFollowUpStatus,
  evidenceDaysPastDue,
  evidenceDueSoon,
  getEvidenceEscalationLevel,
  isEvidenceTaskOverdue,
  type EvidenceFollowUpPriority,
  type EvidenceFollowUpStatus,
} from '../config/accountingPropertyEvidenceFollowUp';
import {
  appendEvidenceHistoryFromChanges,
  createEvidenceHistoryEvent,
  mergeEvidenceHistory,
  type EvidenceHistoryEvent,
} from '../config/accountingPropertyEvidenceHistory';

const CONTROL_KEY = '__propertyControlAnalysis';

type IndicatorValue = 'yes' | 'partial' | 'no' | 'unknown';
type DocumentCompleteness = 'complete' | 'partial' | 'missing';
type AnalysisLevel = 'strong_needs_approval' | 'needs_more_study' | 'insufficient' | 'undetermined';
type EvidenceChecklistEntry = {
  status: PropertyEvidenceStatus;
  attachmentKey?: string;
  notes?: string;
  responsibleParty?: string;
  dueDate?: string;
  priority?: EvidenceFollowUpPriority;
  followUpStatus?: EvidenceFollowUpStatus;
  lastAction?: string;
  lastActionAt?: string;
  history?: EvidenceHistoryEvent[];
};

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
  memoProfileId?: string;
  memoSourceLabel?: string;
  memoReferenceScore?: number;
  evidenceChecklist?: Record<string, EvidenceChecklistEntry>;
  evidenceCompletionPercent?: number;
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
  const profile = findPropertyControlMemoProfile(record);
  const seed = profile ? memoProfileToAnalysisSeed(profile) as Partial<ControlAnalysis> : {};
  const raw = record.payload?.[CONTROL_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...emptyAnalysis(), ...seed };
  return { ...emptyAnalysis(), ...seed, ...(raw as Partial<ControlAnalysis>) };
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
  const [attachments, setAttachments] = useState<AccountingTransformationAttachment[]>([]);
  const [uploadingEvidenceKey, setUploadingEvidenceKey] = useState('');
  const [expandedHistoryKey, setExpandedHistoryKey] = useState('');
  const [historyNoteDrafts, setHistoryNoteDrafts] = useState<Record<string, string>>({});

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
  const selectedMemoProfile = selected ? findPropertyControlMemoProfile(selected) : undefined;

  useEffect(() => {
    if (!selectedId && candidates.length) setSelectedId(candidates[0].id);
  }, [candidates, selectedId]);

  useEffect(() => {
    setAnalysis(readAnalysis(selected));
    setAttachments(Array.isArray(selected?.attachments) ? selected.attachments : []);
  }, [selected?.id]);

  const completedAnalyses = candidates.filter((record) => {
    const saved = readAnalysis(record);
    return saved.documentCompleteness === 'complete';
  }).length;
  const strongCount = candidates.filter((record) => readAnalysis(record).analysisLevel === 'strong_needs_approval').length;
  const studyCount = candidates.filter((record) => readAnalysis(record).analysisLevel === 'needs_more_study').length;
  const insufficientCount = candidates.filter((record) => readAnalysis(record).analysisLevel === 'insufficient').length;
  const score = scoreAnalysis(analysis);
  const memoReferenceScore = analysis.memoReferenceScore;
  const evidenceRequirements = useMemo(
    () => getPropertyEvidenceRequirements(selectedMemoProfile?.id),
    [selectedMemoProfile?.id]
  );
  const evidenceRows = useMemo(() => evidenceRequirements.map((requirement) => {
    const saved = analysis.evidenceChecklist?.[requirement.key];
    const autoAttachment = findMatchingPropertyEvidenceAttachment(requirement, attachments);
    const linkedAttachment = saved?.attachmentKey
      ? attachments.find((attachment) => (attachment.driveFileId || attachment.driveUrl) === saved.attachmentKey) || autoAttachment
      : autoAttachment;
    const status: PropertyEvidenceStatus = saved?.status || (linkedAttachment ? 'available' : 'missing');
    const followUpStatus = saved?.followUpStatus || defaultFollowUpStatus(status);
    const overdue = isEvidenceTaskOverdue(status, saved?.dueDate, followUpStatus);
    const daysPastDue = overdue ? evidenceDaysPastDue(saved?.dueDate) : 0;
    const dueSoon = evidenceDueSoon(status, saved?.dueDate, followUpStatus);
    const escalation = getEvidenceEscalationLevel(status, saved?.dueDate, followUpStatus);
    const historyEvents = mergeEvidenceHistory({ ...(saved || {}), status, followUpStatus });
    return { requirement, saved, attachment: linkedAttachment, status, followUpStatus, overdue, daysPastDue, dueSoon, escalation, historyEvents };
  }), [analysis.evidenceChecklist, attachments, evidenceRequirements]);
  const evidenceCompletionPercent = evidenceRows.length
    ? Math.round(evidenceRows.reduce((sum, row) => sum + (row.status === 'available' ? 1 : row.status === 'needs_update' ? 0.5 : 0), 0) / evidenceRows.length * 100)
    : 0;

  const update = <K extends keyof ControlAnalysis>(key: K, value: ControlAnalysis[K]) => {
    setAnalysis((prev) => ({ ...prev, [key]: value }));
  };

  const setEvidenceEntry = (key: string, patch: Partial<EvidenceChecklistEntry>) => {
    setAnalysis((prev) => ({
      ...prev,
      evidenceChecklist: {
        ...(prev.evidenceChecklist || {}),
        [key]: { ...(prev.evidenceChecklist?.[key] || { status: 'missing' as PropertyEvidenceStatus }), ...patch },
      },
    }));
  };

  const setEvidenceStatus = (key: string, status: PropertyEvidenceStatus) => {
    setAnalysis((prev) => {
      const current = prev.evidenceChecklist?.[key];
      const followUpStatus: EvidenceFollowUpStatus = status === 'available'
        ? 'completed'
        : current?.followUpStatus === 'completed'
          ? 'not_started'
          : current?.followUpStatus || 'not_started';
      return {
        ...prev,
        evidenceChecklist: {
          ...(prev.evidenceChecklist || {}),
          [key]: { ...(current || {}), status, followUpStatus },
        },
      };
    });
  };

  const addEvidenceHistoryNote = (key: string) => {
    const summary = (historyNoteDrafts[key] || '').trim();
    if (!summary) { toast.error('اكتب تفاصيل المتابعة أولًا'); return; }
    setAnalysis((prev) => {
      const current = prev.evidenceChecklist?.[key] || { status: 'missing' as PropertyEvidenceStatus };
      return {
        ...prev,
        evidenceChecklist: {
          ...(prev.evidenceChecklist || {}),
          [key]: {
            ...current,
            history: [...(current.history || []), createEvidenceHistoryEvent('note', summary)],
          },
        },
      };
    });
    setHistoryNoteDrafts((prev) => ({ ...prev, [key]: '' }));
    toast.success('تمت إضافة المتابعة إلى السجل الزمني؛ احفظ التحليل لتثبيتها');
  };

  const handleEvidenceUpload = async (key: string, label: string, file?: File | null) => {
    if (!file) return;
    setUploadingEvidenceKey(key);
    try {
      const uploaded = await uploadAccountingTransformationFile(file);
      const attachment: AccountingTransformationAttachment = {
        ...uploaded,
        title: uploaded.title || file.name,
        documentPurpose: 'ownership_acquisition',
        documentType: label,
        notes: `مؤشرات السيطرة - ${label}`,
      };
      const attachmentKey = attachment.driveFileId || attachment.driveUrl;
      setAttachments((current) => [...current, attachment]);
      setAnalysis((prev) => ({
        ...prev,
        evidenceChecklist: {
          ...(prev.evidenceChecklist || {}),
          [key]: {
            ...(prev.evidenceChecklist?.[key] || {}),
            status: 'available',
            attachmentKey,
            followUpStatus: 'completed',
            lastAction: `تم رفع المستند: ${label}`,
            lastActionAt: new Date().toISOString().slice(0, 10),
          },
        },
      }));
      toast.success(`تم رفع مستند: ${label}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع مستند الإثبات');
    } finally {
      setUploadingEvidenceKey('');
    }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const computedDocumentCompleteness: DocumentCompleteness = evidenceRequirements.length
        ? evidenceCompletionPercent >= 100
          ? 'complete'
          : evidenceCompletionPercent <= 0
            ? 'missing'
            : 'partial'
        : analysis.documentCompleteness;
      const savedAnalysis = readAnalysis(selected);
      const historyAt = new Date().toISOString();
      const nextEvidenceChecklist = Object.fromEntries(
        Object.entries(analysis.evidenceChecklist || {}).map(([key, entry]) => [
          key,
          appendEvidenceHistoryFromChanges(savedAnalysis.evidenceChecklist?.[key], entry, historyAt),
        ])
      );
      const nextAnalysis: ControlAnalysis = {
        ...analysis,
        evidenceChecklist: nextEvidenceChecklist,
        documentCompleteness: computedDocumentCompleteness,
        evidenceCompletionPercent,
        updatedAt: historyAt,
      };
      const updated = await updateAccountingTransformationRecord(selected.id, {
        recordType: selected.recordType,
        ownershipMode: selected.ownershipMode,
        committeeStatus: selected.committeeStatus,
        payload: { ...selected.payload, [CONTROL_KEY]: nextAnalysis },
        attachments,
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
            <p className="mt-2 max-w-5xl text-xs leading-6 text-cyan-100">الحالات الأربع الواردة في مذكرة 27/08/2026 يتم التعرف عليها تلقائيًا وتعبئة بيانات البطاقة المرجعية مع بقاء التعديل والمراجعة متاحين للمستخدم.</p>
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
              <Card className="rounded-[26px] border-teal-200 bg-teal-50/55">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-teal-700">الربط مع مذكرة مؤشرات السيطرة</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{selectedMemoProfile ? selectedMemoProfile.title : 'هذه الحالة غير مطابقة تلقائيًا لإحدى البطاقات الأربع'}</p>
                      {analysis.memoSourceLabel && <p className="mt-1 text-[11px] text-slate-600">{analysis.memoSourceLabel}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedMemoProfile && <Badge variant="outline" className="border-teal-300 bg-white text-teal-800">بيانات مرجعية معبأة تلقائيًا</Badge>}
                      {typeof memoReferenceScore === 'number' && <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-800">درجة المذكرة: {memoReferenceScore}/10</Badge>}
                      <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">الدرجة الحسابية المساعدة: {score}/10</Badge>
                    </div>
                  </div>
                  {selectedMemoProfile && typeof memoReferenceScore === 'number' && memoReferenceScore !== score && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-6 text-amber-900">
                      درجة المذكرة محفوظة كما وردت في المستند، وقد تختلف عن الدرجة الحسابية المساعدة للمنصة. لا يتم تعديل أي منهما آليًا لتطابق الأخرى.
                    </p>
                  )}
                </CardContent>
              </Card>

            {selectedMemoProfile && (
              <Card className="rounded-[26px] border-indigo-200 bg-indigo-50/35">
                <CardHeader className="border-b border-indigo-100">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">ملف مستندات الإثبات</CardTitle>
                      <p className="mt-1 text-xs leading-6 text-slate-500">المتطلبات أدناه مستمدة من فجوات المستندات والإجراءات الواردة في مذكرة مؤشرات السيطرة. يمكن ربط مرفق موجود أو رفع مستند جديد ثم حفظ التحليل.</p>
                    </div>
                    <div className="min-w-[150px] rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-center">
                      <p className="text-[10px] font-bold text-slate-500">نسبة اكتمال ملف الإثبات</p>
                      <p className="mt-1 text-2xl font-black text-indigo-800">{evidenceCompletionPercent}%</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-indigo-100">
                    <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: evidenceCompletionPercent + '%' }} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  {evidenceRows.map(({ requirement, attachment, status, saved, followUpStatus, overdue, daysPastDue, dueSoon, escalation, historyEvents }) => (
                    <div key={requirement.key} className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-center">
                        <div>
                          <div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-900">{requirement.label}</p>{status !== 'available' && <Badge variant="outline" className={escalation === 'critical' ? 'border-red-500 bg-red-100 text-red-950' : escalation === 'overdue' ? 'border-red-200 bg-red-50 text-red-800' : escalation === 'due_soon' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}>{EVIDENCE_ESCALATION_LABELS[escalation]}</Badge>}</div>
                          <p className="mt-1 text-[11px] leading-5 text-slate-500">{requirement.description}</p>
                          {attachment && <p className="mt-2 text-[11px] font-bold text-emerald-700">المرفق المرتبط: {attachment.title}</p>}
                          {!attachment && status === 'available' && <p className="mt-2 text-[11px] font-bold text-amber-700">الحالة «متوفر» ولكن لا يوجد ملف مرفوع مرتبط بهذه الخانة.</p>}
                        </div>
                        <NativeSelect value={status} onChange={(event) => setEvidenceStatus(requirement.key, event.target.value as PropertyEvidenceStatus)}>
                          <option value="available">متوفر</option>
                          <option value="needs_update">يحتاج تحديث</option>
                          <option value="missing">ناقص</option>
                        </NativeSelect>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          {attachment?.driveUrl && (
                            <Button type="button" size="sm" variant="outline" asChild>
                              <a href={attachment.driveUrl} target="_blank" rel="noreferrer"><ExternalLink className="ml-1 h-4 w-4" />فتح</a>
                            </Button>
                          )}
                          <label className="inline-flex cursor-pointer items-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100">
                            <Upload className="ml-1 h-4 w-4" />
                            {uploadingEvidenceKey === requirement.key ? 'جارٍ الرفع...' : attachment ? 'استبدال / إضافة' : 'رفع المستند'}
                            <input
                              type="file"
                              className="hidden"
                              disabled={Boolean(uploadingEvidenceKey)}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                void handleEvidenceUpload(requirement.key, requirement.label, file);
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <p className="mb-2 text-[11px] font-bold text-slate-600">الجهة / المسؤول عن المتابعة</p>
                          <Input
                            value={saved?.responsibleParty ?? analysis.responsible}
                            onChange={(event) => setEvidenceEntry(requirement.key, { responsibleParty: event.target.value })}
                            placeholder="الجهة أو الموظف المسؤول"
                          />
                        </div>
                        <div>
                          <p className="mb-2 text-[11px] font-bold text-slate-600">تاريخ الاستحقاق</p>
                          <Input type="date" value={saved?.dueDate || ''} onChange={(event) => setEvidenceEntry(requirement.key, { dueDate: event.target.value })} />
                        </div>
                        <div>
                          <p className="mb-2 text-[11px] font-bold text-slate-600">الأولوية</p>
                          <NativeSelect value={saved?.priority || 'medium'} onChange={(event) => setEvidenceEntry(requirement.key, { priority: event.target.value as EvidenceFollowUpPriority })}>
                            {Object.entries(EVIDENCE_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </NativeSelect>
                        </div>
                        <div>
                          <p className="mb-2 text-[11px] font-bold text-slate-600">حالة المتابعة</p>
                          <NativeSelect value={followUpStatus} onChange={(event) => setEvidenceEntry(requirement.key, { followUpStatus: event.target.value as EvidenceFollowUpStatus })}>
                            {Object.entries(EVIDENCE_FOLLOW_UP_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                          </NativeSelect>
                        </div>
                        <div className="md:col-span-2 xl:col-span-3">
                          <p className="mb-2 text-[11px] font-bold text-slate-600">آخر إجراء / متابعة</p>
                          <Input
                            value={saved?.lastAction || ''}
                            onChange={(event) => setEvidenceEntry(requirement.key, {
                              lastAction: event.target.value,
                              lastActionAt: saved?.lastActionAt || new Date().toISOString().slice(0, 10),
                            })}
                            placeholder="مثال: تمت مخاطبة الجهة المالكة لطلب نسخة محدثة من المستند"
                          />
                        </div>
                        <div>
                          <p className="mb-2 text-[11px] font-bold text-slate-600">تاريخ آخر إجراء</p>
                          <Input type="date" value={saved?.lastActionAt || ''} onChange={(event) => setEvidenceEntry(requirement.key, { lastActionAt: event.target.value })} />
                        </div>
                      </div>

                      {(overdue || dueSoon) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {overdue && <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">متأخر {daysPastDue.toLocaleString('ar-SA')} يوم</Badge>}
                          {!overdue && dueSoon && <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">موعد الاستحقاق خلال 7 أيام</Badge>}
                        </div>
                      )}

                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <Button type="button" size="sm" variant="ghost" onClick={() => setExpandedHistoryKey(expandedHistoryKey === requirement.key ? '' : requirement.key)}>
                          <History className="ml-1 h-4 w-4" />سجل المتابعة ({historyEvents.length.toLocaleString('ar-SA')})
                        </Button>
                        {expandedHistoryKey === requirement.key && (
                          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                              <Input
                                value={historyNoteDrafts[requirement.key] || ''}
                                onChange={(event) => setHistoryNoteDrafts((prev) => ({ ...prev, [requirement.key]: event.target.value }))}
                                placeholder="إضافة متابعة جديدة، مثل: تمت مخاطبة الجهة واستلام إفادة أولية..."
                              />
                              <Button type="button" size="sm" onClick={() => addEvidenceHistoryNote(requirement.key)}>
                                <PlusCircle className="ml-1 h-4 w-4" />إضافة للسجل
                              </Button>
                            </div>
                            {!historyEvents.length ? (
                              <p className="py-5 text-center text-xs text-slate-500">لا توجد أحداث متابعة مسجلة حتى الآن.</p>
                            ) : (
                              <div className="mt-3 space-y-2">
                                {historyEvents.map((event) => (
                                  <div key={event.id} className="relative rounded-xl border bg-white p-3 pr-5">
                                    <span className="absolute right-2 top-4 h-2 w-2 rounded-full bg-slate-400" />
                                    <p className="text-xs font-bold leading-6 text-slate-800">{event.summary}</p>
                                    <p className="mt-1 text-[10px] text-slate-500">{new Date(event.at).toLocaleString('ar-SA')} · {event.actor || 'مستخدم المنصة'}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-6 text-slate-600">طريقة الاحتساب: «متوفر» = 100% من وزن المتطلب، «يحتاج تحديث» = 50%، «ناقص» = 0%. وتتحول حالة اكتمال المستندات في التحليل تلقائيًا إلى مكتملة أو جزئية أو مفقودة عند الحفظ.</p>
                </CardContent>
              </Card>
            )}

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
