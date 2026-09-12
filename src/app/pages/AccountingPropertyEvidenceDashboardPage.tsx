import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  FolderOpen,
  Loader2,
  RefreshCcw,
  Search,
  ShieldCheck,
  Printer,
  Siren,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import { getAccountingTransformationRecords } from '../api/accountingTransformation';
import {
  PROPERTY_CONTROL_MEMO_PROFILES,
  findPropertyControlMemoProfile,
  memoProfileToAnalysisSeed,
  type PropertyControlMemoProfile,
} from '../config/accountingPropertyControlMemoProfiles';
import {
  findMatchingPropertyEvidenceAttachment,
  getPropertyEvidenceRequirements,
  type PropertyEvidenceStatus,
} from '../config/accountingPropertyEvidenceRequirements';
import {
  EVIDENCE_ESCALATION_CONFIG,
  EVIDENCE_ESCALATION_LABELS,
  EVIDENCE_FOLLOW_UP_STATUS_LABELS,
  EVIDENCE_PRIORITY_LABELS,
  defaultFollowUpStatus,
  evidenceDaysPastDue,
  evidenceDueSoon,
  getEvidenceEscalationLevel,
  isEvidenceTaskOpen,
  isEvidenceTaskOverdue,
  type EvidenceEscalationLevel,
  type EvidenceFollowUpPriority,
  type EvidenceFollowUpStatus,
} from '../config/accountingPropertyEvidenceFollowUp';
import { mergeEvidenceHistory, type EvidenceHistoryEvent } from '../config/accountingPropertyEvidenceHistory';
import type {
  AccountingTransformationAttachment,
  AccountingTransformationRecord,
} from '../../types/accountingTransformation';

const CONTROL_KEY = '__propertyControlAnalysis';

type EvidenceChecklistEntry = {
  status?: PropertyEvidenceStatus;
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

type SavedControlAnalysis = {
  evidenceChecklist?: Record<string, EvidenceChecklistEntry>;
  evidenceCompletionPercent?: number;
  responsible?: string;
  nextAction?: string;
  documentCompleteness?: 'complete' | 'partial' | 'missing';
  updatedAt?: string;
};

type FilterMode = 'all' | 'missing' | 'needs_update' | 'complete' | 'open' | 'overdue' | 'critical' | 'high_priority';

type DashboardTask = {
  key: string;
  label: string;
  status: PropertyEvidenceStatus;
  responsible: string;
  dueDate?: string;
  priority: EvidenceFollowUpPriority;
  followUpStatus: EvidenceFollowUpStatus;
  lastAction?: string;
  lastActionAt?: string;
  open: boolean;
  overdue: boolean;
  daysPastDue: number;
  dueSoon: boolean;
  escalation: EvidenceEscalationLevel;
  historyCount: number;
  latestHistory?: EvidenceHistoryEvent;
};

type DashboardRow = {
  profile: PropertyControlMemoProfile;
  records: AccountingTransformationRecord[];
  representative: AccountingTransformationRecord | null;
  attachments: AccountingTransformationAttachment[];
  percentage: number;
  available: number;
  missing: number;
  needsUpdate: number;
  totalRequirements: number;
  tasks: DashboardTask[];
  openTasks: number;
  overdueTasks: number;
  criticalTasks: number;
  highPriorityOpen: number;
  dueSoonTasks: number;
  nearestDueDate?: string;
  responsible: string;
  nextAction: string;
  updatedAt?: string;
};

const normalize = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ');

const readSavedAnalysis = (record: AccountingTransformationRecord): SavedControlAnalysis | null => {
  const raw = record.payload?.[CONTROL_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as SavedControlAnalysis;
};

const latestAnalysisRecord = (records: AccountingTransformationRecord[]) => {
  const withAnalysis = records
    .map((record) => ({ record, analysis: readSavedAnalysis(record) }))
    .filter((item): item is { record: AccountingTransformationRecord; analysis: SavedControlAnalysis } => Boolean(item.analysis));
  if (!withAnalysis.length) return null;
  return withAnalysis.sort((a, b) => {
    const aTime = a.analysis.updatedAt ? Date.parse(a.analysis.updatedAt) : 0;
    const bTime = b.analysis.updatedAt ? Date.parse(b.analysis.updatedAt) : 0;
    return bTime - aTime;
  })[0];
};

const attachmentIdentity = (attachment: AccountingTransformationAttachment) =>
  attachment.driveFileId || attachment.driveUrl || `${attachment.title || ''}-${attachment.documentNumber || ''}`;

const uniqueAttachments = (records: AccountingTransformationRecord[]) => {
  const seen = new Set<string>();
  const result: AccountingTransformationAttachment[] = [];
  records.forEach((record) => (record.attachments || []).forEach((attachment) => {
    const key = attachmentIdentity(attachment);
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(attachment);
  }));
  return result;
};

const buildRow = (profile: PropertyControlMemoProfile, records: AccountingTransformationRecord[]): DashboardRow => {
  const profileRecords = records.filter((record) => findPropertyControlMemoProfile(record)?.id === profile.id);
  const latest = latestAnalysisRecord(profileRecords);
  const representative = latest?.record || profileRecords[0] || null;
  const attachments = uniqueAttachments(profileRecords);
  const seed = memoProfileToAnalysisSeed(profile) as SavedControlAnalysis;
  const saved = latest?.analysis || null;
  const analysis = { ...seed, ...(saved || {}) };
  const requirements = getPropertyEvidenceRequirements(profile.id);

  let available = 0;
  let missing = 0;
  let needsUpdate = 0;
  const tasks: DashboardTask[] = [];

  requirements.forEach((requirement) => {
    const savedEntry = analysis.evidenceChecklist?.[requirement.key];
    const linkedAttachment = savedEntry?.attachmentKey
      ? attachments.find((attachment) => attachmentIdentity(attachment) === savedEntry.attachmentKey)
        || findMatchingPropertyEvidenceAttachment(requirement, attachments)
      : findMatchingPropertyEvidenceAttachment(requirement, attachments);
    const status: PropertyEvidenceStatus = savedEntry?.status || (linkedAttachment ? 'available' : 'missing');
    if (status === 'available') available += 1;
    else if (status === 'needs_update') needsUpdate += 1;
    else missing += 1;

    if (status !== 'available') {
      const followUpStatus = savedEntry?.followUpStatus || defaultFollowUpStatus(status);
      const open = isEvidenceTaskOpen(status, followUpStatus);
      const overdue = isEvidenceTaskOverdue(status, savedEntry?.dueDate, followUpStatus);
      const historyEvents = mergeEvidenceHistory({ ...(savedEntry || {}), status, followUpStatus });
      tasks.push({
        key: requirement.key,
        label: requirement.label,
        status,
        responsible: String(savedEntry?.responsibleParty || analysis.responsible || profile.responsible || 'غير محدد'),
        dueDate: savedEntry?.dueDate,
        priority: savedEntry?.priority || 'medium',
        followUpStatus,
        lastAction: savedEntry?.lastAction,
        lastActionAt: savedEntry?.lastActionAt,
        open,
        overdue,
        daysPastDue: overdue ? evidenceDaysPastDue(savedEntry?.dueDate) : 0,
        dueSoon: evidenceDueSoon(status, savedEntry?.dueDate, followUpStatus),
        escalation: getEvidenceEscalationLevel(status, savedEntry?.dueDate, followUpStatus),
        historyCount: historyEvents.length,
        latestHistory: historyEvents[0],
      });
    }
  });

  const totalRequirements = requirements.length;
  const percentage = totalRequirements
    ? Math.round(((available + needsUpdate * 0.5) / totalRequirements) * 100)
    : 0;
  const openTasks = tasks.filter((task) => task.open).length;
  const overdueTasks = tasks.filter((task) => task.overdue).length;
  const criticalTasks = tasks.filter((task) => task.escalation === 'critical').length;
  const highPriorityOpen = tasks.filter((task) => task.open && task.priority === 'high').length;
  const dueSoonTasks = tasks.filter((task) => task.dueSoon && !task.overdue).length;
  const nearestDueDate = tasks
    .filter((task) => task.open && task.dueDate)
    .map((task) => task.dueDate as string)
    .sort()[0];

  return {
    profile,
    records: profileRecords,
    representative,
    attachments,
    percentage,
    available,
    missing,
    needsUpdate,
    totalRequirements,
    tasks,
    openTasks,
    overdueTasks,
    criticalTasks,
    highPriorityOpen,
    dueSoonTasks,
    nearestDueDate,
    responsible: String(analysis.responsible || profile.responsible || 'غير محدد'),
    nextAction: String(analysis.nextAction || profile.nextAction || 'غير محدد'),
    updatedAt: saved?.updatedAt,
  };
}

const completionTone = (percentage: number) => {
  if (percentage >= 100) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (percentage >= 50) return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-800';
};

export const AccountingPropertyEvidenceDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AccountingTransformationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const load = async () => {
    setLoading(true);
    try {
      const [buildings, lands] = await Promise.all([
        getAccountingTransformationRecords({ recordType: 'building', all: true }),
        getAccountingTransformationRecords({ recordType: 'land', all: true }),
      ]);
      setRecords([...(buildings.items || []), ...(lands.items || [])]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات مستندات الإثبات');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const rows = useMemo(
    () => PROPERTY_CONTROL_MEMO_PROFILES.map((profile) => buildRow(profile, records)),
    [records]
  );

  const filteredRows = useMemo(() => {
    const needle = normalize(query);
    return rows.filter((row) => {
      if (filter === 'missing' && row.missing === 0) return false;
      if (filter === 'needs_update' && row.needsUpdate === 0) return false;
      if (filter === 'complete' && row.percentage < 100) return false;
      if (filter === 'open' && row.openTasks === 0) return false;
      if (filter === 'overdue' && row.overdueTasks === 0) return false;
      if (filter === 'critical' && row.criticalTasks === 0) return false;
      if (filter === 'high_priority' && row.highPriorityOpen === 0) return false;
      if (!needle) return true;
      return normalize([
        row.profile.title,
        row.profile.sourceLabel,
        row.responsible,
        row.nextAction,
        row.representative?.assetDescription,
        row.representative?.city,
        ...row.tasks.flatMap((task) => [task.label, task.responsible, task.lastAction, task.latestHistory?.summary]),
      ].filter(Boolean).join(' ')).includes(needle);
    });
  }, [rows, query, filter]);

  const totalRequirements = rows.reduce((sum, row) => sum + row.totalRequirements, 0);
  const totalAvailable = rows.reduce((sum, row) => sum + row.available, 0);
  const totalMissing = rows.reduce((sum, row) => sum + row.missing, 0);
  const totalNeedsUpdate = rows.reduce((sum, row) => sum + row.needsUpdate, 0);
  const totalOpenTasks = rows.reduce((sum, row) => sum + row.openTasks, 0);
  const totalOverdueTasks = rows.reduce((sum, row) => sum + row.overdueTasks, 0);
  const totalCriticalTasks = rows.reduce((sum, row) => sum + row.criticalTasks, 0);
  const totalHighPriorityOpen = rows.reduce((sum, row) => sum + row.highPriorityOpen, 0);
  const taskRows = rows.flatMap((row) => row.tasks.map((task) => ({ row, task })));
  const filteredTaskRows = taskRows.filter(({ row, task }) => {
    if (filter === 'missing' && task.status !== 'missing') return false;
    if (filter === 'needs_update' && task.status !== 'needs_update') return false;
    if (filter === 'open' && !task.open) return false;
    if (filter === 'overdue' && !task.overdue) return false;
    if (filter === 'critical' && task.escalation !== 'critical') return false;
    if (filter === 'high_priority' && !(task.open && task.priority === 'high')) return false;
    if (filter === 'complete') return false;
    const needle = normalize(query);
    if (!needle) return true;
    return normalize([row.profile.title, task.label, task.responsible, task.lastAction, task.latestHistory?.summary].filter(Boolean).join(' ')).includes(needle);
  });
  const overallPercentage = totalRequirements
    ? Math.round(((totalAvailable + totalNeedsUpdate * 0.5) / totalRequirements) * 100)
    : 0;

  const escapeHtml = (value: unknown) => String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const printEvidenceReport = () => {
    const printable = filteredTaskRows.length ? filteredTaskRows : taskRows;
    const popup = window.open('', '_blank', 'width=1200,height=850');
    if (!popup) { toast.error('تعذر فتح نافذة الطباعة. تحقق من السماح بالنوافذ المنبثقة.'); return; }
    const rowsHtml = printable.map(({ row, task }) => `
      <tr class="${task.escalation}">
        <td>${escapeHtml(row.profile.title)}</td>
        <td>${escapeHtml(task.label)}</td>
        <td>${escapeHtml(task.status === 'missing' ? 'ناقص' : 'يحتاج تحديث')}</td>
        <td>${escapeHtml(EVIDENCE_ESCALATION_LABELS[task.escalation])}</td>
        <td>${escapeHtml(task.responsible)}</td>
        <td>${escapeHtml(EVIDENCE_PRIORITY_LABELS[task.priority])}</td>
        <td>${escapeHtml(task.dueDate || '-')}</td>
        <td>${task.daysPastDue ? escapeHtml(`${task.daysPastDue} يوم`) : '-'}</td>
        <td>${escapeHtml(EVIDENCE_FOLLOW_UP_STATUS_LABELS[task.followUpStatus])}</td>
        <td>${escapeHtml(task.lastAction || '-')}</td>
        <td>${escapeHtml(`${task.historyCount} حدث — ${task.latestHistory?.summary || 'لا يوجد سجل محفوظ'}`)}</td>
      </tr>`).join('');
    const generatedAt = new Date().toLocaleString('ar-SA');
    popup.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير متابعة مستندات الإثبات</title><style>
      @page{size:A4 landscape;margin:12mm} body{font-family:Arial,Tahoma,sans-serif;color:#111827;margin:0} h1{font-size:22px;margin:0 0 6px} .meta{font-size:11px;color:#475569;margin-bottom:14px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:12px 0 16px}.box{border:1px solid #cbd5e1;border-radius:8px;padding:8px;text-align:center}.box b{display:block;font-size:18px;margin-top:4px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #cbd5e1;padding:6px;vertical-align:top}th{background:#f1f5f9}.due_soon{background:#fffbeb}.overdue{background:#fef2f2}.critical{background:#fee2e2;font-weight:700}.legend{font-size:10px;margin-top:10px;color:#475569}@media print{button{display:none}}
    </style></head><body><h1>تقرير متابعة مستندات الإثبات</h1><div class="meta">جامعة الإمام عبدالرحمن بن فيصل — لجنة متابعة متطلبات التحول المحاسبي<br>تاريخ إعداد التقرير: ${escapeHtml(generatedAt)} — معيار الحالة الحرجة: ${EVIDENCE_ESCALATION_CONFIG.criticalAfterDays} يومًا بعد الاستحقاق</div>
    <div class="summary"><div class="box">المهام المفتوحة<b>${totalOpenTasks}</b></div><div class="box">المتأخرة<b>${totalOverdueTasks}</b></div><div class="box">الحرجة<b>${totalCriticalTasks}</b></div><div class="box">أولوية عالية<b>${totalHighPriorityOpen}</b></div></div>
    <table><thead><tr><th>العقار</th><th>المستند</th><th>حالة المستند</th><th>التصعيد</th><th>المسؤول</th><th>الأولوية</th><th>الاستحقاق</th><th>مدة التأخير</th><th>حالة المتابعة</th><th>آخر إجراء</th><th>السجل الزمني</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    <div class="legend">قريب الاستحقاق: خلال ${EVIDENCE_ESCALATION_CONFIG.dueSoonDays} أيام — متأخر: بعد تاريخ الاستحقاق — حرج: بعد ${EVIDENCE_ESCALATION_CONFIG.criticalAfterDays} يومًا من التأخير.</div></body></html>`);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 250);
  };

  return (
    <div className="mx-auto w-full max-w-[1780px] space-y-5 pb-8" dir="rtl">
      <section className="overflow-hidden rounded-[30px] border border-slate-300 bg-[linear-gradient(135deg,#17324d,#0b2238)] text-white shadow-xl">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-7">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-cyan-200/30 bg-cyan-200/10 text-cyan-50">متابعة مركزية</Badge>
              <Badge variant="outline" className="border-indigo-200/30 bg-indigo-200/10 text-indigo-50">الحالات الأربع في مذكرة مؤشرات السيطرة</Badge>
            </div>
            <h1 className="text-2xl font-black sm:text-3xl">لوحة متابعة مستندات الإثبات</h1>
            <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">متابعة اكتمال المعززات والمستندات الداعمة للعقارات محل تحليل السيطرة، مع إظهار المستندات الناقصة وما يحتاج تحديثًا والمسؤول والإجراء التالي دون إنشاء سجل مرفقات موازٍ.</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={printEvidenceReport}>
              <Printer className="ml-2 h-4 w-4" />طباعة تقرير المتابعة
            </Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => void load()} disabled={loading}>
              <RefreshCcw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />تحديث
            </Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate('/accounting-transformation/control-indicators')}>
              <ShieldCheck className="ml-2 h-4 w-4" />مؤشرات السيطرة
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {[
          ['الحالات', rows.length, FolderOpen, 'text-blue-700'],
          ['نسبة الاكتمال', `${overallPercentage}%`, FileCheck2, 'text-emerald-700'],
          ['مستندات ناقصة', totalMissing, AlertTriangle, 'text-red-700'],
          ['تحتاج تحديث', totalNeedsUpdate, FileWarning, 'text-amber-700'],
          ['مهام متابعة مفتوحة', totalOpenTasks, FolderOpen, 'text-sky-700'],
          ['مهام متأخرة', totalOverdueTasks, AlertTriangle, 'text-rose-700'],
          ['مهام حرجة', totalCriticalTasks, Siren, 'text-red-900'],
        ].map(([label, value, Icon, tone]) => (
          <Card key={String(label)} className="rounded-2xl">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border bg-slate-50"><Icon className={`h-5 w-5 ${tone}`} /></div>
              <div><p className="text-[11px] font-bold text-slate-500">{String(label)}</p><p className="mt-1 text-2xl font-black text-slate-950">{typeof value === 'number' ? value.toLocaleString('ar-SA') : String(value)}</p></div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="rounded-[26px]">
        <CardHeader className="border-b bg-slate-50/70">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto] lg:items-end">
            <div>
              <CardTitle className="text-base">متابعة الحالات</CardTitle>
              <div className="relative mt-3"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pr-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالعقار أو المسؤول أو الإجراء التالي..." /></div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold text-slate-600">حالة المستندات</p>
              <NativeSelect value={filter} onChange={(event) => setFilter(event.target.value as FilterMode)}>
                <option value="all">جميع الحالات</option>
                <option value="missing">يوجد مستند ناقص</option>
                <option value="needs_update">يوجد مستند يحتاج تحديث</option>
                <option value="complete">مكتمل 100%</option>
                <option value="open">مهام متابعة مفتوحة</option>
                <option value="overdue">مهام متأخرة</option>
                <option value="critical">مهام حرجة</option>
                <option value="high_priority">أولوية عالية</option>
              </NativeSelect>
            </div>
            <Button type="button" variant={filter === 'missing' ? 'default' : 'outline'} onClick={() => setFilter(filter === 'missing' ? 'all' : 'missing')}>
              <AlertTriangle className="ml-2 h-4 w-4" />الناقص فقط
            </Button>
            <Button type="button" variant={filter === 'overdue' ? 'default' : 'outline'} onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')}>
              <AlertTriangle className="ml-2 h-4 w-4" />المتأخر فقط
            </Button>
            <Button type="button" variant={filter === 'critical' ? 'destructive' : 'outline'} onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}>
              <Siren className="ml-2 h-4 w-4" />الحرج فقط
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />جاري تحميل ملف الإثبات...</div>}
          {!loading && !filteredRows.length && <div className="py-20 text-center text-sm text-slate-500">لا توجد حالات مطابقة للفلتر الحالي.</div>}
          {!loading && filteredRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1460px] text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="px-4 py-3">العقار / الحالة</th>
                    <th className="px-4 py-3">الربط بالسجل</th>
                    <th className="px-4 py-3">الاكتمال</th>
                    <th className="px-4 py-3">متوفر</th>
                    <th className="px-4 py-3">يحتاج تحديث</th>
                    <th className="px-4 py-3">ناقص</th>
                    <th className="px-4 py-3">مهام مفتوحة</th>
                    <th className="px-4 py-3">متأخرة</th>
                    <th className="px-4 py-3">أقرب استحقاق</th>
                    <th className="px-4 py-3">المسؤول</th>
                    <th className="px-4 py-3">الإجراء التالي</th>
                    <th className="px-4 py-3">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredRows.map((row) => (
                    <tr key={row.profile.id} className="align-top hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-900">{row.profile.title}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{row.profile.sourceLabel}</p>
                      </td>
                      <td className="px-4 py-4">
                        {row.records.length ? <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">{row.records.length.toLocaleString('ar-SA')} سجل مرتبط</Badge> : <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">غير مرتبط</Badge>}
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className={completionTone(row.percentage)}>{row.percentage}%</Badge>
                        <div className="mt-2 h-2 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-700" style={{ width: `${row.percentage}%` }} /></div>
                      </td>
                      <td className="px-4 py-4 font-black text-emerald-700">{row.available}</td>
                      <td className="px-4 py-4 font-black text-amber-700">{row.needsUpdate}</td>
                      <td className="px-4 py-4 font-black text-red-700">{row.missing}</td>
                      <td className="px-4 py-4 font-black text-sky-700">{row.openTasks}</td>
                      <td className="px-4 py-4 font-black text-rose-700">{row.overdueTasks}</td>
                      <td className="px-4 py-4 text-xs text-slate-700">{row.nearestDueDate || '-'}</td>
                      <td className="max-w-[220px] px-4 py-4 text-xs leading-6 text-slate-700">{row.responsible}</td>
                      <td className="max-w-[320px] px-4 py-4 text-xs leading-6 text-slate-700">{row.nextAction}</td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          {row.representative ? (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/accounting-transformation/${row.representative!.id}`)}>
                              <ArrowLeft className="ml-1 h-4 w-4" />فتح سجل العقار
                            </Button>
                          ) : (
                            <span className="text-[11px] text-red-600">يتطلب ربط الحالة بسجل عقاري أولًا</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[26px]">
        <CardHeader className="border-b bg-slate-50/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><CardTitle className="text-base">مهام متابعة المستندات</CardTitle><p className="mt-1 text-xs text-slate-500">تفاصيل كل مستند ناقص أو يحتاج تحديثًا، مع المسؤول والاستحقاق والأولوية وآخر إجراء.</p></div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">مفتوحة: {totalOpenTasks}</Badge>
              <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">متأخرة: {totalOverdueTasks}</Badge>
              <Badge variant="outline" className="border-red-400 bg-red-100 text-red-950">حرجة: {totalCriticalTasks}</Badge>
              <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-800">أولوية عالية: {totalHighPriorityOpen}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!filteredTaskRows.length ? <div className="py-12 text-center text-sm text-slate-500">لا توجد مهام متابعة مطابقة للفلتر الحالي.</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] text-right text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600"><tr>
                  <th className="px-4 py-3">العقار</th><th className="px-4 py-3">المستند</th><th className="px-4 py-3">حالة المستند</th><th className="px-4 py-3">التصعيد</th><th className="px-4 py-3">المسؤول</th><th className="px-4 py-3">الأولوية</th><th className="px-4 py-3">الاستحقاق</th><th className="px-4 py-3">حالة المتابعة</th><th className="px-4 py-3">آخر إجراء</th><th className="px-4 py-3">السجل الزمني</th><th className="px-4 py-3">فتح</th>
                </tr></thead>
                <tbody className="divide-y">
                  {filteredTaskRows.map(({ row, task }) => (
                    <tr key={`${row.profile.id}-${task.key}`} className={task.escalation === 'critical' ? 'bg-red-100/70 align-top' : task.escalation === 'overdue' ? 'bg-red-50/45 align-top' : task.escalation === 'due_soon' ? 'bg-amber-50/55 align-top' : 'align-top hover:bg-slate-50/70'}>
                      <td className="px-4 py-4 font-black text-slate-900">{row.profile.title}</td>
                      <td className="max-w-[260px] px-4 py-4 text-xs leading-6 text-slate-700">{task.label}</td>
                      <td className="px-4 py-4"><Badge variant="outline" className={task.status === 'missing' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'}>{task.status === 'missing' ? 'ناقص' : 'يحتاج تحديث'}</Badge></td>
                      <td className="px-4 py-4"><Badge variant="outline" className={task.escalation === 'critical' ? 'border-red-500 bg-red-100 text-red-950' : task.escalation === 'overdue' ? 'border-red-200 bg-red-50 text-red-800' : task.escalation === 'due_soon' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}>{EVIDENCE_ESCALATION_LABELS[task.escalation]}</Badge></td>
                      <td className="max-w-[220px] px-4 py-4 text-xs leading-6 text-slate-700">{task.responsible}</td>
                      <td className="px-4 py-4"><Badge variant="outline">{EVIDENCE_PRIORITY_LABELS[task.priority]}</Badge></td>
                      <td className="px-4 py-4 text-xs">{task.dueDate || '-'}{task.overdue && <p className="mt-1 font-black text-red-700">متأخر {task.daysPastDue.toLocaleString('ar-SA')} يوم</p>}{!task.overdue && task.dueSoon && <p className="mt-1 font-bold text-amber-700">خلال 7 أيام</p>}</td>
                      <td className="px-4 py-4 text-xs">{EVIDENCE_FOLLOW_UP_STATUS_LABELS[task.followUpStatus]}</td>
                      <td className="max-w-[320px] px-4 py-4 text-xs leading-6 text-slate-700">{task.lastAction || '-'}{task.lastActionAt && <p className="mt-1 text-[10px] text-slate-400">{task.lastActionAt}</p>}</td>
                      <td className="max-w-[300px] px-4 py-4 text-xs leading-6 text-slate-700"><div className="flex items-center gap-1 font-black text-slate-800"><History className="h-3.5 w-3.5" />{task.historyCount.toLocaleString('ar-SA')} حدث</div><p className="mt-1 text-[10px] text-slate-500">{task.latestHistory?.summary || 'لا يوجد سجل محفوظ'}</p></td>
                      <td className="px-4 py-4">{row.representative ? <Button size="sm" variant="outline" onClick={() => navigate(`/accounting-transformation/control-indicators`)}>متابعة</Button> : <span className="text-[11px] text-red-600">غير مرتبط</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">ملاحظة: النسبة في هذه اللوحة تجمع المرفقات الموجودة في جميع السجلات المطابقة لكل حالة. «متوفر» يحتسب بكامل الوزن، «يحتاج تحديث» بنصف الوزن، و«ناقص» بدون وزن. القرار المحاسبي يظل خاضعًا لمراجعة المستندات واعتماد الجهات المختصة.</p>
    </div>
  );
};
