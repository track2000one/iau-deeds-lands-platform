import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  Bot,
  Building2,
  CalendarDays,
  Download,
  Eye,
  FileClock,
  History,
  Loader2,
  Printer,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';
import {
  getAccountingEvidenceAuditMirror,
  getAccountingTransformationRecords,
  type AccountingEvidenceAuditMirrorItem,
} from '../api/accountingTransformation';
import {
  findPropertyControlMemoProfile,
  PROPERTY_CONTROL_MEMO_PROFILES,
} from '../config/accountingPropertyControlMemoProfiles';
import {
  getPropertyEvidenceRequirements,
  type PropertyEvidenceStatus,
} from '../config/accountingPropertyEvidenceRequirements';
import {
  defaultFollowUpStatus,
  EVIDENCE_ESCALATION_LABELS,
  getEvidenceEscalationLevel,
  type EvidenceEscalationLevel,
  type EvidenceFollowUpPriority,
  type EvidenceFollowUpStatus,
} from '../config/accountingPropertyEvidenceFollowUp';
import {
  mergeEvidenceHistory,
  type EvidenceHistoryEvent,
  type EvidenceHistoryEventType,
} from '../config/accountingPropertyEvidenceHistory';
import type { AccountingTransformationRecord } from '../../types/accountingTransformation';

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

type SavedAnalysis = {
  updatedAt?: string;
  evidenceChecklist?: Record<string, EvidenceChecklistEntry>;
};

type AuditRow = EvidenceHistoryEvent & {
  rowKey: string;
  profileId: string;
  propertyTitle: string;
  requirementKey: string;
  requirementLabel: string;
  recordId: string;
  recordNumber: string;
  assetDescription: string;
  responsible: string;
  dueDate?: string;
  evidenceStatus: PropertyEvidenceStatus;
  followUpStatus: EvidenceFollowUpStatus;
  escalation: EvidenceEscalationLevel;
  storedEvent: boolean;
  verificationStatus: VerificationStatus;
  serverRecordedAt?: string;
  auditLogId?: string;
};

type SourceFilter = 'all' | 'user' | 'system';
type EscalationFilter = 'all' | EvidenceEscalationLevel;
type VerificationStatus = 'verified' | 'missing' | 'mismatch' | 'derived' | 'unavailable';
type VerificationFilter = 'all' | VerificationStatus;

const verificationLabels: Record<VerificationStatus, string> = {
  verified: 'موثّق بالخادم',
  missing: 'لا توجد نسخة مرآة',
  mismatch: 'اختلاف يحتاج مراجعة',
  derived: 'حدث نظامي محسوب',
  unavailable: 'تعذر التحقق من الخادم',
};

const eventTypeLabels: Record<EvidenceHistoryEventType, string> = {
  created: 'إنشاء مهمة',
  status_changed: 'تغيير حالة المستند',
  responsible_changed: 'تغيير المسؤول',
  due_date_changed: 'تغيير الاستحقاق',
  priority_changed: 'تغيير الأولوية',
  follow_up_status_changed: 'تغيير حالة المتابعة',
  action_logged: 'تسجيل إجراء',
  attachment_uploaded: 'رفع / ربط مستند',
  closed: 'إقفال المهمة',
  note: 'ملاحظة / حدث آلي',
};

const normalize = (value: unknown) => String(value ?? '')
  .trim()
  .toLowerCase()
  .replace(/[أإآ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/\s+/g, ' ');

const readAnalysis = (record: AccountingTransformationRecord): SavedAnalysis | null => {
  const raw = record.payload?.[CONTROL_KEY];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as SavedAnalysis;
};

const escalationTone = (value: EvidenceEscalationLevel) => {
  if (value === 'critical') return 'border-red-500 bg-red-100 text-red-950';
  if (value === 'overdue') return 'border-red-200 bg-red-50 text-red-800';
  if (value === 'due_soon') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const eventTone = (type: EvidenceHistoryEventType) => {
  if (type === 'closed' || type === 'attachment_uploaded') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (type === 'status_changed' || type === 'follow_up_status_changed') return 'border-sky-200 bg-sky-50 text-sky-800';
  if (type === 'due_date_changed' || type === 'priority_changed') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-white text-slate-700';
};

const verificationTone = (value: VerificationStatus) => {
  if (value === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (value === 'missing' || value === 'mismatch') return 'border-red-200 bg-red-50 text-red-800';
  if (value === 'derived') return 'border-sky-200 bg-sky-50 text-sky-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
};

const objectValue = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

const mirrorMatchesEvent = (event: EvidenceHistoryEvent, requirementKey: string, mirror: AccountingEvidenceAuditMirrorItem) => {
  const data = objectValue(mirror.newData);
  const metadata = objectValue(mirror.metadata);
  const mirrorRequirement = String(data.requirementKey ?? metadata.requirementKey ?? '');
  const coreMatches = String(data.id ?? '') === event.id
    && String(data.type ?? '') === event.type
    && String(data.at ?? '') === event.at
    && String(data.summary ?? '') === event.summary
    && mirrorRequirement === requirementKey;
  if (!coreMatches) return false;

  const optionalPairs: Array<[unknown, unknown]> = [
    [event.actorUserId, data.actorUserId],
    [event.actorEmail, data.actorEmail],
    [event.actorRole, data.actorRole],
    [event.serverRecordedAt, data.serverRecordedAt ?? metadata.serverRecordedAt],
  ];
  return optionalPairs.every(([expected, actual]) => !expected || String(expected) === String(actual ?? ''));
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const AccountingPropertyEvidenceAuditPage: React.FC = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AccountingTransformationRecord[]>([]);
  const [auditMirror, setAuditMirror] = useState<AccountingEvidenceAuditMirrorItem[]>([]);
  const [mirrorConnected, setMirrorConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [profileFilter, setProfileFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<'all' | EvidenceHistoryEventType>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [escalationFilter, setEscalationFilter] = useState<EscalationFilter>('all');
  const [verificationFilter, setVerificationFilter] = useState<VerificationFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [buildings, lands] = await Promise.all([
        getAccountingTransformationRecords({ recordType: 'building', all: true }),
        getAccountingTransformationRecords({ recordType: 'land', all: true }),
      ]);
      setRecords([...(buildings.items || []), ...(lands.items || [])]);

      try {
        const mirror = await getAccountingEvidenceAuditMirror();
        setAuditMirror(mirror.items || []);
        setMirrorConnected(true);
        if (mirror.truncated) toast.warning('تم الوصول إلى الحد الأعلى لسجل الخادم؛ بعض الأحداث الأقدم قد لا تظهر في التحقق الحالي.');
      } catch (mirrorError) {
        setAuditMirror([]);
        setMirrorConnected(false);
        toast.warning(mirrorError instanceof Error ? `تم تحميل الأحداث، لكن تعذر التحقق من سجل الخادم: ${mirrorError.message}` : 'تم تحميل الأحداث، لكن تعذر التحقق من سجل الخادم.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل السجل الرقابي لمستندات الإثبات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const mirrorByEntityId = useMemo(() => new Map(
    auditMirror.filter((item) => item.entityId).map((item) => [String(item.entityId), item])
  ), [auditMirror]);

  const auditRows = useMemo(() => {
    const latestTasks = new Map<string, {
      updatedAt: number;
      profileId: string;
      propertyTitle: string;
      requirementKey: string;
      requirementLabel: string;
      record: AccountingTransformationRecord;
      entry: EvidenceChecklistEntry;
    }>();

    records.forEach((record) => {
      const profile = findPropertyControlMemoProfile(record);
      if (!profile) return;
      const analysis = readAnalysis(record);
      if (!analysis?.evidenceChecklist) return;
      const updatedAt = analysis.updatedAt ? Date.parse(analysis.updatedAt) || 0 : 0;
      const requirementMap = new Map(
        getPropertyEvidenceRequirements(profile.id).map((requirement) => [requirement.key, requirement])
      );

      Object.entries(analysis.evidenceChecklist).forEach(([key, entry]) => {
        const taskKey = `${profile.id}:${key}`;
        const existing = latestTasks.get(taskKey);
        if (existing && existing.updatedAt > updatedAt) return;
        latestTasks.set(taskKey, {
          updatedAt,
          profileId: profile.id,
          propertyTitle: profile.title,
          requirementKey: key,
          requirementLabel: requirementMap.get(key)?.label || key,
          record,
          entry,
        });
      });
    });

    const rows: AuditRow[] = [];
    latestTasks.forEach((task) => {
      const status = task.entry.status || 'missing';
      const followUpStatus = task.entry.followUpStatus || defaultFollowUpStatus(status);
      const escalation = getEvidenceEscalationLevel(status, task.entry.dueDate, followUpStatus);
      const storedIds = new Set((task.entry.history || []).map((event) => event.id));
      mergeEvidenceHistory({ ...task.entry, status, followUpStatus }).forEach((event) => {
        const source = event.source || (event.actor === 'النظام' ? 'system' : 'user');
        const storedEvent = storedIds.has(event.id);
        const mirror = storedEvent ? mirrorByEntityId.get(`${task.record.id}:${event.id}`) : undefined;
        const mirrorData = objectValue(mirror?.newData);
        const mirrorMetadata = objectValue(mirror?.metadata);
        const verificationStatus: VerificationStatus = !storedEvent
          ? 'derived'
          : !mirrorConnected
            ? 'unavailable'
            : !mirror
              ? 'missing'
              : mirrorMatchesEvent(event, task.requirementKey, mirror)
                ? 'verified'
                : 'mismatch';
        rows.push({
          ...event,
          source,
          rowKey: `${task.profileId}:${task.requirementKey}:${event.id}`,
          profileId: task.profileId,
          propertyTitle: task.propertyTitle,
          requirementKey: task.requirementKey,
          requirementLabel: task.requirementLabel,
          recordId: task.record.id,
          recordNumber: task.record.recordNumber || '-',
          assetDescription: task.record.assetDescription || task.propertyTitle,
          responsible: task.entry.responsibleParty || 'غير محدد',
          dueDate: task.entry.dueDate,
          evidenceStatus: status,
          followUpStatus,
          escalation,
          storedEvent,
          verificationStatus,
          serverRecordedAt: event.serverRecordedAt || String(mirrorData.serverRecordedAt ?? mirrorMetadata.serverRecordedAt ?? mirror?.createdAt ?? '') || undefined,
          auditLogId: mirror?.id,
        });
      });
    });

    return rows.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }, [records, mirrorByEntityId, mirrorConnected]);

  const actors = useMemo(() => {
    const unique = new Map<string, string>();
    auditRows.forEach((row) => {
      const key = row.actorUserId || row.actorEmail || row.actor || '';
      if (!key || row.source === 'system') return;
      unique.set(key, row.actor || row.actorEmail || key);
    });
    return Array.from(unique.entries()).sort((a, b) => a[1].localeCompare(b[1], 'ar'));
  }, [auditRows]);

  const filteredRows = useMemo(() => {
    const needle = normalize(query);
    const fromTime = dateFrom ? Date.parse(`${dateFrom}T00:00:00`) : null;
    const toTime = dateTo ? Date.parse(`${dateTo}T23:59:59`) : null;

    return auditRows.filter((row) => {
      const eventTime = Date.parse(row.at);
      const actorKey = row.actorUserId || row.actorEmail || row.actor || '';
      if (profileFilter !== 'all' && row.profileId !== profileFilter) return false;
      if (actorFilter !== 'all' && actorKey !== actorFilter) return false;
      if (eventTypeFilter !== 'all' && row.type !== eventTypeFilter) return false;
      if (sourceFilter !== 'all' && row.source !== sourceFilter) return false;
      if (escalationFilter !== 'all' && row.escalation !== escalationFilter) return false;
      if (verificationFilter !== 'all' && row.verificationStatus !== verificationFilter) return false;
      if (fromTime !== null && eventTime < fromTime) return false;
      if (toTime !== null && eventTime > toTime) return false;
      if (!needle) return true;
      return [
        row.propertyTitle,
        row.assetDescription,
        row.requirementLabel,
        row.summary,
        row.actor,
        row.actorEmail,
        row.actorRoleLabel,
        row.actorContext,
        row.responsible,
        row.recordNumber,
        row.from,
        row.to,
      ].some((value) => normalize(value).includes(needle));
    });
  }, [auditRows, query, profileFilter, actorFilter, eventTypeFilter, sourceFilter, escalationFilter, verificationFilter, dateFrom, dateTo]);

  const selected = filteredRows.find((row) => row.rowKey === selectedKey) || null;
  const verifiedEvents = filteredRows.filter((row) => row.verificationStatus === 'verified').length;
  const integrityIssues = filteredRows.filter((row) => row.verificationStatus === 'missing' || row.verificationStatus === 'mismatch').length;
  const systemEvents = filteredRows.filter((row) => row.source === 'system').length;
  const criticalEvents = filteredRows.filter((row) => row.escalation === 'critical').length;
  const uniqueUsers = new Set(
    filteredRows.filter((row) => row.source === 'user').map((row) => row.actorUserId || row.actorEmail || row.actor).filter(Boolean)
  ).size;

  const resetFilters = () => {
    setQuery('');
    setProfileFilter('all');
    setActorFilter('all');
    setEventTypeFilter('all');
    setSourceFilter('all');
    setEscalationFilter('all');
    setVerificationFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const exportCsv = () => {
    if (!filteredRows.length) {
      toast.error('لا توجد أحداث مطابقة لتصديرها');
      return;
    }
    const header = [
      'التاريخ والوقت', 'العقار', 'متطلب الإثبات', 'نوع الحدث', 'ملخص الحدث', 'المصدر',
      'المستخدم', 'البريد الإلكتروني', 'الدور', 'السياق', 'من', 'إلى', 'المسؤول عن المتابعة',
      'تاريخ الاستحقاق', 'حالة المهمة الحالية', 'رقم السجل', 'حالة التحقق من الخادم', 'وقت التسجيل بالخادم', 'معرف AuditLog',
    ];
    const lines = [header.map(csvCell).join(',')];
    filteredRows.forEach((row) => {
      lines.push([
        new Date(row.at).toLocaleString('ar-SA'),
        row.propertyTitle,
        row.requirementLabel,
        eventTypeLabels[row.type],
        row.summary,
        row.source === 'system' ? 'النظام' : 'مستخدم',
        row.actor || '',
        row.actorEmail || '',
        row.actorRoleLabel || row.actorRole || '',
        row.actorContext || '',
        row.from || '',
        row.to || '',
        row.responsible,
        row.dueDate || '',
        EVIDENCE_ESCALATION_LABELS[row.escalation],
        row.recordNumber,
        verificationLabels[row.verificationStatus],
        row.serverRecordedAt ? new Date(row.serverRecordedAt).toLocaleString('ar-SA') : '',
        row.auditLogId || '',
      ].map(csvCell).join(','));
    });
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `accounting-evidence-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success('تم تجهيز ملف السجل الرقابي بصيغة CSV');
  };

  return (
    <div className="mx-auto w-full max-w-[1780px] space-y-5 pb-8" dir="rtl">
      <style>{`@media print { .audit-no-print { display:none !important; } .audit-print-card { box-shadow:none !important; border-color:#cbd5e1 !important; } body { background:white !important; } }`}</style>

      <section className="audit-print-card overflow-hidden rounded-[30px] border border-slate-300 bg-[linear-gradient(135deg,#10263d,#0a1e32)] text-white shadow-xl">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-7">
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-cyan-200/30 bg-cyan-200/10 text-cyan-50">Audit Trail — التحول المحاسبي</Badge>
              <Badge variant="outline" className="border-emerald-200/30 bg-emerald-200/10 text-emerald-50">سجل للقراءة والتتبع الرقابي</Badge>
              <Badge variant="outline" className={mirrorConnected ? 'border-emerald-200/30 bg-emerald-200/10 text-emerald-50' : 'border-amber-200/30 bg-amber-200/10 text-amber-50'}>{mirrorConnected ? 'متصل بنسخة AuditLog على الخادم' : 'التحقق من الخادم غير متاح'}</Badge>
            </div>
            <h1 className="text-2xl font-black sm:text-3xl">السجل الرقابي المركزي لمستندات الإثبات</h1>
            <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">يعرض جميع أحداث متابعة مستندات الإثبات المسجلة داخل الحالات الأربع لمؤشرات السيطرة، ويجمع هوية المنفذ والتوقيت ونوع الإجراء والتغيرات وحالة التصعيد الحالية في شاشة رقابية واحدة.</p>
          </div>
          <div className="audit-no-print flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => void load()} disabled={loading}><RefreshCcw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />تحديث</Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={() => navigate('/accounting-transformation/evidence-dashboard')}><ShieldCheck className="ml-2 h-4 w-4" />لوحة الإثبات</Button>
            <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white" onClick={exportCsv}><Download className="ml-2 h-4 w-4" />تصدير CSV</Button>
            <Button className="bg-cyan-500 text-slate-950 hover:bg-cyan-400" onClick={() => window.print()}><Printer className="ml-2 h-4 w-4" />طباعة</Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['الأحداث المطابقة', filteredRows.length, History, 'text-blue-700'],
          ['موثقة بالخادم', verifiedEvents, ShieldCheck, 'text-emerald-700'],
          ['تحتاج تحقق', integrityIssues, AlertTriangle, 'text-red-700'],
          ['أحداث النظام', systemEvents, Bot, 'text-slate-700'],
          ['مستخدمون منفذون', uniqueUsers, ShieldCheck, 'text-violet-700'],
          ['ضمن مهام حرجة', criticalEvents, AlertTriangle, 'text-red-700'],
        ].map(([label, value, Icon, tone]) => (
          <Card key={String(label)} className="audit-print-card rounded-2xl"><CardContent className="flex items-center gap-3 p-4"><div className="grid h-11 w-11 place-items-center rounded-2xl border bg-slate-50"><Icon className={`h-5 w-5 ${tone}`} /></div><div><p className="text-[11px] font-bold text-slate-500">{String(label)}</p><p className="mt-1 text-2xl font-black text-slate-950">{Number(value).toLocaleString('ar-SA')}</p></div></CardContent></Card>
        ))}
      </section>

      <Card className="audit-no-print rounded-[26px]">
        <CardHeader className="border-b"><CardTitle className="text-base">البحث والفلترة الرقابية</CardTitle></CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input className="pr-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالعقار، المستند، المستخدم، البريد، رقم السجل أو نص الحدث..." /></div>
          <NativeSelect value={profileFilter} onChange={(event) => setProfileFilter(event.target.value)}><option value="all">كل العقارات</option>{PROPERTY_CONTROL_MEMO_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.title}</option>)}</NativeSelect>
          <NativeSelect value={actorFilter} onChange={(event) => setActorFilter(event.target.value)}><option value="all">كل المستخدمين</option>{actors.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect>
          <NativeSelect value={eventTypeFilter} onChange={(event) => setEventTypeFilter(event.target.value as 'all' | EvidenceHistoryEventType)}><option value="all">كل أنواع الأحداث</option>{Object.entries(eventTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect>
          <NativeSelect value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}><option value="all">كل المصادر</option><option value="user">أحداث المستخدمين</option><option value="system">أحداث النظام</option></NativeSelect>
          <NativeSelect value={escalationFilter} onChange={(event) => setEscalationFilter(event.target.value as EscalationFilter)}><option value="all">كل حالات المهمة</option><option value="normal">ضمن المدة / بدون تصعيد</option><option value="due_soon">قريب الاستحقاق</option><option value="overdue">متأخر</option><option value="critical">حرج</option></NativeSelect>
          <NativeSelect value={verificationFilter} onChange={(event) => setVerificationFilter(event.target.value as VerificationFilter)}><option value="all">كل حالات التحقق</option><option value="verified">موثّق بالخادم</option><option value="missing">لا توجد نسخة مرآة</option><option value="mismatch">اختلاف يحتاج مراجعة</option><option value="derived">حدث نظامي محسوب</option><option value="unavailable">تعذر التحقق من الخادم</option></NativeSelect>
          <div><p className="mb-1 text-[10px] font-bold text-slate-500">من تاريخ</p><Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></div>
          <div><p className="mb-1 text-[10px] font-bold text-slate-500">إلى تاريخ</p><Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></div>
          <div className="md:col-span-2 xl:col-span-4"><Button type="button" variant="outline" onClick={resetFilters}>مسح جميع الفلاتر</Button></div>
        </CardContent>
      </Card>

      <Card className="audit-print-card overflow-hidden rounded-[26px]">
        <CardHeader className="border-b bg-slate-50/70">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="text-base">الأحداث الرقابية</CardTitle><p className="mt-1 text-xs text-slate-500">النتائج مرتبة من الأحدث إلى الأقدم. حالة التصعيد المعروضة هي الحالة الحالية لمهمة المستند المرتبطة بالحدث.</p></div><Badge variant="outline">{filteredRows.length.toLocaleString('ar-SA')} حدث</Badge></div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />جاري تحميل السجل الرقابي...</div> : !filteredRows.length ? <p className="py-16 text-center text-sm text-slate-500">لا توجد أحداث مطابقة للفلاتر الحالية.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-right text-xs">
                <thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">التاريخ والوقت</th><th className="p-3">العقار / المتطلب</th><th className="p-3">نوع الحدث</th><th className="p-3">التفاصيل</th><th className="p-3">المنفذ</th><th className="p-3">التحقق / تسجيل الخادم</th><th className="p-3">حالة المهمة</th><th className="audit-no-print p-3">إجراء</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row.rowKey} className="align-top hover:bg-slate-50/70">
                      <td className="whitespace-nowrap p-3"><p className="font-bold text-slate-900">{new Date(row.at).toLocaleDateString('ar-SA')}</p><p className="mt-1 text-[10px] text-slate-500">{new Date(row.at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</p></td>
                      <td className="p-3"><p className="font-black text-slate-900">{row.propertyTitle}</p><p className="mt-1 max-w-[260px] text-[10px] leading-5 text-slate-500">{row.requirementLabel}</p><p className="mt-1 text-[10px] text-slate-400">سجل: {row.recordNumber}</p></td>
                      <td className="p-3"><Badge variant="outline" className={eventTone(row.type)}>{eventTypeLabels[row.type]}</Badge><p className="mt-2 text-[10px] text-slate-500">{row.source === 'system' ? 'النظام' : 'مستخدم'}</p></td>
                      <td className="max-w-[420px] p-3"><p className="font-bold leading-6 text-slate-800">{row.summary}</p>{(row.from || row.to) && <p className="mt-1 text-[10px] leading-5 text-slate-500">{row.from ? `من: ${row.from}` : ''}{row.from && row.to ? ' · ' : ''}{row.to ? `إلى: ${row.to}` : ''}</p>}</td>
                      <td className="p-3"><div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-xl border bg-white">{row.source === 'system' ? <Bot className="h-4 w-4 text-slate-600" /> : <UserRound className="h-4 w-4 text-blue-700" />}</div><div><p className="font-bold text-slate-900">{row.actor || (row.source === 'system' ? 'النظام' : 'مستخدم المنصة')}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.actorRoleLabel || row.actorEmail || (row.source === 'system' ? 'حدث آلي' : '-')}</p></div></div></td>
                      <td className="p-3"><Badge variant="outline" className={verificationTone(row.verificationStatus)}>{verificationLabels[row.verificationStatus]}</Badge><p className="mt-2 text-[10px] leading-5 text-slate-500">{row.serverRecordedAt ? `الخادم: ${new Date(row.serverRecordedAt).toLocaleString('ar-SA')}` : row.verificationStatus === 'derived' ? 'غير مطلوب للأحداث المحسوبة' : '-'}</p></td>
                      <td className="p-3"><Badge variant="outline" className={escalationTone(row.escalation)}>{EVIDENCE_ESCALATION_LABELS[row.escalation]}</Badge>{row.dueDate && <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500"><CalendarDays className="h-3 w-3" />{row.dueDate}</p>}</td>
                      <td className="audit-no-print p-3"><div className="flex gap-1"><Button type="button" size="sm" variant="outline" onClick={() => setSelectedKey(row.rowKey)}><Eye className="ml-1 h-3.5 w-3.5" />تفاصيل</Button><Button type="button" size="sm" variant="ghost" onClick={() => navigate(`/accounting-transformation/control-indicators`)}><Building2 className="h-3.5 w-3.5" /></Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card className="audit-no-print rounded-[26px] border-sky-200 bg-sky-50/35">
          <CardHeader className="border-b border-sky-100"><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">تفاصيل الحدث الرقابي</CardTitle><p className="mt-1 text-xs text-slate-500">{selected.propertyTitle} · {selected.requirementLabel}</p></div><Button size="sm" variant="ghost" onClick={() => setSelectedKey('')}>إغلاق</Button></div></CardHeader>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">الحدث</p><p className="mt-1 font-black text-slate-900">{eventTypeLabels[selected.type]}</p></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">التاريخ والوقت</p><p className="mt-1 font-black text-slate-900">{new Date(selected.at).toLocaleString('ar-SA')}</p></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">المنفذ</p><p className="mt-1 font-black text-slate-900">{selected.actor || 'مستخدم المنصة'}</p><p className="mt-1 text-[10px] text-slate-500">{selected.actorEmail || '-'}</p></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">الدور / السياق</p><p className="mt-1 font-black text-slate-900">{selected.actorRoleLabel || selected.actorRole || (selected.source === 'system' ? 'النظام' : '-')}</p><p className="mt-1 text-[10px] text-slate-500">{selected.actorContext || '-'}</p></div>
            <div className="rounded-2xl border bg-white p-3 md:col-span-2 xl:col-span-4"><p className="text-[10px] font-bold text-slate-500">ملخص الحدث</p><p className="mt-1 font-bold leading-7 text-slate-900">{selected.summary}</p></div>
            {(selected.from || selected.to) && <div className="rounded-2xl border bg-white p-3 md:col-span-2"><p className="text-[10px] font-bold text-slate-500">القيمة السابقة ← الجديدة</p><p className="mt-1 font-bold text-slate-900">{selected.from || 'غير محدد'} ← {selected.to || 'غير محدد'}</p></div>}
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">المسؤول عن المتابعة</p><p className="mt-1 font-bold text-slate-900">{selected.responsible}</p></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">حالة المهمة الحالية</p><p className="mt-1 font-bold text-slate-900">{EVIDENCE_ESCALATION_LABELS[selected.escalation]}</p></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">حالة التحقق من الخادم</p><Badge variant="outline" className={`mt-2 ${verificationTone(selected.verificationStatus)}`}>{verificationLabels[selected.verificationStatus]}</Badge></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">وقت التسجيل بالخادم</p><p className="mt-1 font-bold text-slate-900">{selected.serverRecordedAt ? new Date(selected.serverRecordedAt).toLocaleString('ar-SA') : '-'}</p></div>
            <div className="rounded-2xl border bg-white p-3 md:col-span-2"><p className="text-[10px] font-bold text-slate-500">معرف نسخة AuditLog</p><p className="mt-1 break-all font-mono text-xs text-slate-800">{selected.auditLogId || '-'}</p></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">UID</p><p className="mt-1 break-all font-mono text-xs text-slate-800">{selected.actorUserId || '-'}</p></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">معرف الحدث</p><p className="mt-1 break-all font-mono text-xs text-slate-800">{selected.id}</p></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">رقم السجل</p><p className="mt-1 font-bold text-slate-900">{selected.recordNumber}</p></div>
            <div className="rounded-2xl border bg-white p-3"><p className="text-[10px] font-bold text-slate-500">تاريخ الاستحقاق</p><p className="mt-1 font-bold text-slate-900">{selected.dueDate || '-'}</p></div>
          </CardContent>
        </Card>
      )}

      <Card className="audit-print-card rounded-[26px] border-slate-200 bg-slate-50/70"><CardContent className="flex items-start gap-3 p-4"><FileClock className="mt-1 h-5 w-5 shrink-0 text-slate-600" /><p className="text-[11px] leading-6 text-slate-600">هذا السجل يطابق أحداث Audit Trail المحفوظة في سجلات مؤشرات السيطرة مع النسخة المرآة المحفوظة في AuditLog على الخادم. تظهر الأحداث النظامية المحسوبة كأحداث مشتقة لا تتطلب نسخة مرآة، بينما تُعلّم أي حالة فقد أو اختلاف لمراجعتها. لا تقدم الصفحة وظائف تعديل أو حذف للأحداث السابقة.</p></CardContent></Card>
    </div>
  );
};
