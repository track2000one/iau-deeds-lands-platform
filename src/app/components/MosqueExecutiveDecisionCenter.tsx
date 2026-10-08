import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSpreadsheet,
  Gavel,
  History,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  UserRoundCheck,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';
import {
  mosqueApi,
  type MosqueCompletionKpiSnapshot,
  type MosqueExecutiveDecision,
  type MosqueImprovementGoal,
  type MosqueImprovementGoalSuggestion,
} from '../api/mosques';

type DecisionKind =
  | 'evidence_review'
  | 'at_risk'
  | 'regressed'
  | 'suggestion'
  | 'awaiting_evidence'
  | 'sustained';

type QueueFilter = 'all' | 'decisions' | 'monitoring' | 'positive';

type PendingExecutiveAction =
  | { type: 'extend'; itemId: string; goal: MosqueImprovementGoal }
  | { type: 'activate_follow_up'; itemId: string; goal: MosqueImprovementGoal }
  | { type: 'create_suggestion'; itemId: string; suggestion: MosqueImprovementGoalSuggestion };

type ExecutiveItem = {
  id: string;
  kind: DecisionKind;
  severity: 'critical' | 'high' | 'medium' | 'positive';
  priority: number;
  title: string;
  description: string;
  detail?: string;
  goal?: MosqueImprovementGoal;
  suggestion?: MosqueImprovementGoalSuggestion;
};

type ExecutiveAlert = {
  id: string;
  kind: 'overdue' | 'due_soon' | 'stale' | 'unassigned' | 'evidence_waiting';
  severity: 'critical' | 'warning' | 'attention';
  title: string;
  description: string;
  detail: string;
  goal: MosqueImprovementGoal;
  priority: number;
};

type Props = {
  onOpenImprovementPlan: () => void;
};

const currentRiyadhYear = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === 'year')?.value || new Date().getFullYear());
};

const riyadhDateInput = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};

const firstDayOfRiyadhMonth = () => {
  const today = riyadhDateInput();
  return `${today.slice(0, 7)}-01`;
};

const decisionTypeLabel: Record<string, string> = {
  create_improvement_goal: 'إنشاء هدف تحسين',
  activate_improvement_goal: 'تفعيل هدف تحسين',
  activate_follow_up_goal: 'تفعيل خطة متابعة',
  cancel_improvement_goal: 'إلغاء هدف تحسين',
  change_goal_due_date: 'تعديل موعد الاستحقاق',
  reassign_goal_owner: 'إعادة إسناد الهدف',
  change_goal_target: 'تعديل المستهدف',
  update_improvement_goal: 'تعديل هدف تحسين',
  approve_closure_evidence: 'اعتماد إثبات الإغلاق',
  return_closure_evidence: 'إعادة إثبات الإغلاق',
  approve_monthly_kpi: 'اعتماد KPI الشهري',
};

const missingLabels: Record<string, string> = {
  identity: 'اسم الموقع',
  gender: 'فئة المصلى',
  building: 'ربط المبنى',
  location: 'بيانات الموقع',
  coordinates: 'الإحداثيات',
  area: 'المساحة',
  capacity: 'السعة',
  contact: 'التواصل / المسؤول',
  photos: 'الصور',
  documents: 'المستندات',
  women_verification: 'التحقق من مصلى النساء',
  women_details: 'تفاصيل مصلى النساء',
  visit: 'الزيارة الميدانية',
};

const metricLabel: Record<string, string> = {
  completionRate: 'نسبة الإنجاز',
  onTimeRate: 'الالتزام بالمواعيد',
  avgCompletionDays: 'متوسط مدة الإنجاز',
  overdueRate: 'نسبة التأخير',
  kpiScore: 'درجة KPI',
  gapCreatedCount: 'عدد حالات النقص الجديدة',
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const normalizeSuggestionTitle = (suggestion: MosqueImprovementGoalSuggestion) =>
  suggestion.title.replace(
    /identity|gender|building|location|coordinates|area|capacity|contact|photos|documents|women_verification|women_details|visit/g,
    (key) => missingLabels[key] || key
  );

const addDaysDateInput = (value: string | null | undefined, days: number) => {
  const candidate = value ? new Date(value) : new Date();
  const current = new Date();
  const base = Number.isNaN(candidate.getTime()) || candidate.getTime() < current.getTime() ? current : candidate;
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

const severityClass: Record<ExecutiveItem['severity'], string> = {
  critical: 'border-rose-200 bg-rose-50/70',
  high: 'border-amber-200 bg-amber-50/70',
  medium: 'border-sky-200 bg-sky-50/60',
  positive: 'border-emerald-200 bg-emerald-50/60',
};

const severityBadge: Record<ExecutiveItem['severity'], string> = {
  critical: 'border-rose-200 bg-white text-rose-800',
  high: 'border-amber-200 bg-white text-amber-800',
  medium: 'border-sky-200 bg-white text-sky-800',
  positive: 'border-emerald-200 bg-white text-emerald-800',
};

const severityLabel: Record<ExecutiveItem['severity'], string> = {
  critical: 'قرار عاجل',
  high: 'أولوية عالية',
  medium: 'متابعة إدارية',
  positive: 'إحاطة إيجابية',
};

const executiveStatusLabel: Record<string, string> = {
  draft: 'مسودة',
  active: 'قيد التنفيذ',
  at_risk: 'معرض للتعثر',
  achieved: 'متحقق',
  evidence_review: 'إثبات قيد المراجعة',
  closed: 'مغلق',
  cancelled: 'ملغى',
  review: 'قيد المراجعة',
  approved: 'معتمد',
  archived: 'مؤرشف',
};

const decisionStateSummary = (state?: Record<string, unknown> | null) => {
  if (!state) return '—';
  const parts: string[] = [];
  const status = typeof state.status === 'string' ? state.status : '';
  if (status) parts.push(`الحالة: ${executiveStatusLabel[status] || status}`);
  if (state.month) parts.push(`الشهر: ${String(state.month)}`);
  if (state.kpiScore !== undefined && state.kpiScore !== null) parts.push(`KPI: ${String(state.kpiScore)}/100`);
  if (state.ownerName) parts.push(`المسؤول: ${String(state.ownerName)}`);
  if (state.dueDate) parts.push(`الاستحقاق: ${formatDate(String(state.dueDate))}`);
  if (state.targetValue !== undefined && state.targetValue !== null) parts.push(`المستهدف: ${String(state.targetValue)}`);
  if (state.currentValue !== undefined && state.currentValue !== null) parts.push(`الحالي: ${String(state.currentValue)}`);
  if (state.progressPercent !== undefined && state.progressPercent !== null) parts.push(`التقدم: ${String(state.progressPercent)}%`);
  if (state.sustainabilityStatus) parts.push(`الاستدامة: ${String(state.sustainabilityStatus)}`);
  return parts.length ? parts.join(' — ') : 'لا توجد حالة مختصرة';
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const MosqueExecutiveDecisionCenter: React.FC<Props> = ({ onOpenImprovementPlan }) => {
  const [goals, setGoals] = useState<MosqueImprovementGoal[]>([]);
  const [decisions, setDecisions] = useState<MosqueExecutiveDecision[]>([]);
  const [decisionFrom, setDecisionFrom] = useState(firstDayOfRiyadhMonth());
  const [decisionTo, setDecisionTo] = useState(riyadhDateInput());
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingExecutiveAction | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionSaving, setDecisionSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<MosqueImprovementGoalSuggestion[]>([]);
  const [snapshots, setSnapshots] = useState<MosqueCompletionKpiSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [trackingStatus, setTrackingStatus] = useState('all');
  const [trackingOwner, setTrackingOwner] = useState('all');
  const [alertFilter, setAlertFilter] = useState<'all' | ExecutiveAlert['kind']>('all');

  const [reviewGoal, setReviewGoal] = useState<MosqueImprovementGoal | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  const year = currentRiyadhYear();

  const loadDecisionLog = async (from = decisionFrom, to = decisionTo) => {
    setDecisionLoading(true);
    try {
      const rows = await mosqueApi.executiveDecisions({ from, to });
      setDecisions(rows || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجل القرارات التنفيذية');
    } finally {
      setDecisionLoading(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [goalRows, suggestionRows, snapshotRows] = await Promise.all([
        mosqueApi.improvementGoals(),
        mosqueApi.improvementGoalSuggestions(year),
        mosqueApi.completionKpiSnapshots(),
      ]);
      setGoals(goalRows || []);
      setSuggestions((suggestionRows?.suggestions || []).filter((item) => !item.alreadyExists));
      setSnapshots(snapshotRows || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل لوحة القرارات التنفيذية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    void loadDecisionLog();
  }, []);

  const latestOfficialSnapshot = useMemo(
    () => snapshots
      .filter((snapshot) => snapshot.status === 'approved' || snapshot.status === 'archived')
      .sort((a, b) => b.month.localeCompare(a.month))[0] || null,
    [snapshots]
  );

  const queue = useMemo<ExecutiveItem[]>(() => {
    const items: ExecutiveItem[] = [];

    for (const goal of goals) {
      if (goal.status === 'evidence_review') {
        items.push({
          id: `evidence:${goal.id}`,
          kind: 'evidence_review',
          severity: 'critical',
          priority: 100,
          title: `اعتماد إثبات إغلاق: ${goal.title}`,
          description: `الهدف ${goal.goalNumber} ينتظر قرار رئيس الوحدة لاعتماد الأدلة وإغلاق الهدف أو إعادتها للاستكمال.`,
          detail: `${Array.isArray(goal.closureEvidence) ? goal.closureEvidence.length : 0} مرفق — رفع بواسطة ${goal.evidenceSubmittedName || 'المسؤول'} — ${formatDate(goal.evidenceSubmittedAt)}`,
          goal,
        });
      }

      if (goal.status === 'at_risk') {
        items.push({
          id: `risk:${goal.id}`,
          kind: 'at_risk',
          severity: 'high',
          priority: 90,
          title: `هدف معرض للتعثر: ${goal.title}`,
          description: `التقدم الحالي ${goal.progressPercent}%، والاستحقاق ${formatDate(goal.dueDate)}. يتطلب قرارًا حول المتابعة أو تمديد الموعد أو تعديل الخطة التصحيحية.`,
          detail: `المسؤول: ${goal.ownerName || 'غير مسند'} — ${goal.goalNumber}`,
          goal,
        });
      }

      if (goal.status === 'closed' && goal.sustainabilityStatus === 'regressed') {
        const followUp = goal.followUpGoalId ? goals.find((item) => item.id === goal.followUpGoalId) : null;
        items.push({
          id: `relapse:${goal.id}`,
          kind: 'regressed',
          severity: 'critical',
          priority: 95,
          title: `انتكاس بعد الإغلاق: ${goal.title}`,
          description: goal.sustainabilityNote || 'رصد النظام تراجعًا جوهريًا في المؤشر بعد إغلاق هدف التحسين.',
          detail: followUp
            ? `مسودة المتابعة: ${followUp.goalNumber} — حالتها ${followUp.status === 'draft' ? 'مسودة تنتظر التفعيل' : 'مفعلة/قيد المعالجة'}`
            : 'لم يتم العثور على مسودة متابعة مرتبطة.',
          goal,
        });
      }

      if (goal.status === 'achieved') {
        items.push({
          id: `awaiting-evidence:${goal.id}`,
          kind: 'awaiting_evidence',
          severity: 'medium',
          priority: 55,
          title: `تحقق رقميًا وينتظر الإثبات: ${goal.title}`,
          description: `بلغ الهدف المستهدف بنسبة تقدم ${goal.progressPercent}%، لكنه لم يغلق إداريًا لعدم اكتمال حزمة الإثبات.`,
          detail: `تقدم الإجراءات التصحيحية: ${goal.actionProgressPercent}% — المسؤول: ${goal.ownerName || 'غير مسند'}`,
          goal,
        });
      }

      if (goal.status === 'closed' && goal.sustainabilityStatus === 'sustained') {
        items.push({
          id: `sustained:${goal.id}`,
          kind: 'sustained',
          severity: 'positive',
          priority: 10,
          title: `تحسن مستدام: ${goal.title}`,
          description: goal.sustainabilityNote || 'استمر تحقيق المستهدف بعد الإغلاق وفق فترة الاستدامة المعتمدة.',
          detail: `آخر قياس رسمي: ${goal.sustainabilityMonth || '—'} — ${goal.goalNumber}`,
          goal,
        });
      }
    }

    suggestions.forEach((suggestion, index) => {
      const isAssignee = suggestion.category === 'assignee_metric';
      const isGap = suggestion.category === 'gap_reduction';
      items.push({
        id: `suggestion:${suggestion.category}:${suggestion.metricKey}:${suggestion.gapKey || suggestion.assigneeUserId || index}`,
        kind: 'suggestion',
        severity: isAssignee || isGap ? 'high' : 'medium',
        priority: isAssignee || isGap ? 75 : 60,
        title: isAssignee
          ? `أداء مسؤول يحتاج تدخل: ${suggestion.assigneeName || 'مسؤول'}`
          : isGap
            ? `نقص متكرر يحتاج قرارًا: ${missingLabels[suggestion.gapKey || ''] || suggestion.gapKey || 'غير محدد'}`
            : normalizeSuggestionTitle(suggestion),
        description: normalizeSuggestionTitle(suggestion),
        detail: `${metricLabel[suggestion.metricKey] || suggestion.metricKey}: ${suggestion.baselineValue} ← المستهدف ${suggestion.targetValue}`,
        suggestion,
      });
    });

    return items.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title, 'ar'));
  }, [goals, suggestions]);

  const visibleQueue = useMemo(() => {
    if (filter === 'decisions') return queue.filter((item) => ['evidence_review', 'at_risk', 'regressed', 'suggestion'].includes(item.kind));
    if (filter === 'monitoring') return queue.filter((item) => item.kind === 'awaiting_evidence');
    if (filter === 'positive') return queue.filter((item) => item.kind === 'sustained');
    return queue;
  }, [queue, filter]);

  const counts = useMemo(() => ({
    critical: queue.filter((item) => item.severity === 'critical').length,
    evidence: queue.filter((item) => item.kind === 'evidence_review').length,
    atRisk: queue.filter((item) => item.kind === 'at_risk').length,
    relapse: queue.filter((item) => item.kind === 'regressed').length,
    suggestions: queue.filter((item) => item.kind === 'suggestion').length,
    sustained: queue.filter((item) => item.kind === 'sustained').length,
  }), [queue]);

  const trackingOwners = useMemo(
    () => Array.from(new Set(goals.map((goal) => goal.ownerName).filter((name): name is string => Boolean(name)))).sort((a, b) => a.localeCompare(b, 'ar')),
    [goals]
  );

  const trackingRows = useMemo(() => {
    const today = new Date(`${riyadhDateInput()}T00:00:00+03:00`).getTime();

    return goals
      .map((goal) => {
        const dueAt = goal.dueDate ? new Date(`${goal.dueDate.slice(0, 10)}T00:00:00+03:00`).getTime() : null;
        const daysDelta = dueAt === null || Number.isNaN(dueAt)
          ? null
          : Math.ceil((dueAt - today) / 86400000);
        const isClosed = goal.status === 'closed' || goal.status === 'cancelled';
        const isCompleted = goal.status === 'achieved' || goal.status === 'evidence_review' || goal.status === 'closed';
        const isOverdue = !isClosed && !isCompleted && daysDelta !== null && daysDelta < 0;

        const displayStatus = goal.status === 'draft'
          ? 'لم يبدأ'
          : goal.status === 'active'
            ? 'جاري التنفيذ'
            : goal.status === 'at_risk'
              ? 'متعثر'
              : goal.status === 'achieved'
                ? 'مكتمل رقميًا'
                : goal.status === 'evidence_review'
                  ? 'مكتمل - بانتظار الاعتماد'
                  : goal.status === 'closed'
                    ? 'مغلق'
                    : 'ملغى';

        const statusGroup = goal.status === 'draft'
          ? 'pending'
          : goal.status === 'active'
            ? 'active'
            : goal.status === 'at_risk'
              ? 'at_risk'
              : isCompleted
                ? 'completed'
                : 'cancelled';

        return {
          goal,
          daysDelta,
          isOverdue,
          isCompleted,
          displayStatus,
          statusGroup,
          evidenceCount: Array.isArray(goal.closureEvidence) ? goal.closureEvidence.length : 0,
        };
      })
      .filter((row) => trackingStatus === 'all' || row.statusGroup === trackingStatus)
      .filter((row) => trackingOwner === 'all' || row.goal.ownerName === trackingOwner)
      .sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        if (a.goal.status === 'at_risk' && b.goal.status !== 'at_risk') return -1;
        if (a.goal.status !== 'at_risk' && b.goal.status === 'at_risk') return 1;
        return (a.daysDelta ?? 99999) - (b.daysDelta ?? 99999);
      });
  }, [goals, trackingOwner, trackingStatus]);

  const trackingSummary = useMemo(() => {
    const today = new Date(`${riyadhDateInput()}T00:00:00+03:00`).getTime();
    const total = goals.length;
    const active = goals.filter((goal) => goal.status === 'active').length;
    const atRisk = goals.filter((goal) => goal.status === 'at_risk').length;
    const completed = goals.filter((goal) => ['achieved', 'evidence_review', 'closed'].includes(goal.status)).length;
    const overdue = goals.filter((goal) => {
      if (!goal.dueDate || ['achieved', 'evidence_review', 'closed', 'cancelled'].includes(goal.status)) return false;
      const dueAt = new Date(`${goal.dueDate.slice(0, 10)}T00:00:00+03:00`).getTime();
      return !Number.isNaN(dueAt) && dueAt < today;
    }).length;
    return { total, active, atRisk, completed, overdue };
  }, [goals]);

  const executiveAlerts = useMemo<ExecutiveAlert[]>(() => {
    const now = new Date();
    const today = new Date(`${riyadhDateInput(now)}T00:00:00+03:00`).getTime();
    const alerts: ExecutiveAlert[] = [];

    goals.forEach((goal) => {
      if (['closed', 'cancelled'].includes(goal.status)) return;

      const dueAt = goal.dueDate
        ? new Date(`${goal.dueDate.slice(0, 10)}T00:00:00+03:00`).getTime()
        : null;
      const daysToDue = dueAt === null || Number.isNaN(dueAt)
        ? null
        : Math.ceil((dueAt - today) / 86400000);
      const updatedAt = new Date(goal.updatedAt).getTime();
      const staleDays = Number.isNaN(updatedAt)
        ? null
        : Math.floor((now.getTime() - updatedAt) / 86400000);

      if (
        daysToDue !== null &&
        daysToDue < 0 &&
        !['achieved', 'evidence_review'].includes(goal.status)
      ) {
        alerts.push({
          id: `overdue:${goal.id}`,
          kind: 'overdue',
          severity: 'critical',
          title: `قرار متأخر عن موعده: ${goal.title}`,
          description: `تجاوز الهدف ${goal.goalNumber} تاريخ الاستحقاق دون إغلاق التنفيذ.`,
          detail: `التأخير ${Math.abs(daysToDue)} يوم — المسؤول: ${goal.ownerName || 'غير مسند'}`,
          goal,
          priority: 100 + Math.min(Math.abs(daysToDue), 30),
        });
      } else if (
        daysToDue !== null &&
        daysToDue >= 0 &&
        daysToDue <= 7 &&
        ['draft', 'active', 'at_risk'].includes(goal.status)
      ) {
        alerts.push({
          id: `due-soon:${goal.id}`,
          kind: 'due_soon',
          severity: daysToDue <= 2 ? 'warning' : 'attention',
          title: daysToDue === 0 ? `يستحق اليوم: ${goal.title}` : `موعد استحقاق قريب: ${goal.title}`,
          description: daysToDue === 0
            ? `الهدف ${goal.goalNumber} يستحق اليوم ويحتاج تحديث حالة التنفيذ.`
            : `متبقي ${daysToDue} يوم على استحقاق الهدف ${goal.goalNumber}.`,
          detail: `المسؤول: ${goal.ownerName || 'غير مسند'} — الإنجاز: ${Math.round(goal.progressPercent)}%`,
          goal,
          priority: 80 - daysToDue,
        });
      }

      if (
        staleDays !== null &&
        staleDays >= 7 &&
        ['active', 'at_risk'].includes(goal.status)
      ) {
        alerts.push({
          id: `stale:${goal.id}`,
          kind: 'stale',
          severity: staleDays >= 14 ? 'warning' : 'attention',
          title: `لم يتم تحديث التنفيذ: ${goal.title}`,
          description: `لم يسجل تحديث على الهدف ${goal.goalNumber} منذ ${staleDays} يومًا.`,
          detail: `آخر تحديث: ${formatDate(goal.updatedAt)} — المسؤول: ${goal.ownerName || 'غير مسند'}`,
          goal,
          priority: 65 + Math.min(staleDays, 20),
        });
      }

      if (!goal.ownerName && ['draft', 'active', 'at_risk'].includes(goal.status)) {
        alerts.push({
          id: `unassigned:${goal.id}`,
          kind: 'unassigned',
          severity: 'warning',
          title: `قرار دون مسؤول تنفيذ: ${goal.title}`,
          description: `الهدف ${goal.goalNumber} ما زال دون مسؤول محدد، مما يضعف قابلية المتابعة والمساءلة.`,
          detail: goal.dueDate ? `الاستحقاق: ${formatDate(goal.dueDate)}` : 'لا يوجد تاريخ استحقاق محدد',
          goal,
          priority: 85,
        });
      }

      if (goal.status === 'evidence_review') {
        const submittedAt = goal.evidenceSubmittedAt ? new Date(goal.evidenceSubmittedAt).getTime() : NaN;
        const waitingDays = Number.isNaN(submittedAt)
          ? 0
          : Math.floor((now.getTime() - submittedAt) / 86400000);
        if (waitingDays >= 3) {
          alerts.push({
            id: `evidence-waiting:${goal.id}`,
            kind: 'evidence_waiting',
            severity: waitingDays >= 7 ? 'warning' : 'attention',
            title: `إثبات إغلاق ينتظر الاعتماد: ${goal.title}`,
            description: `مضى ${waitingDays} يومًا على رفع إثبات الهدف ${goal.goalNumber} دون حسم المراجعة.`,
            detail: `${Array.isArray(goal.closureEvidence) ? goal.closureEvidence.length : 0} مرفق — رفع بواسطة: ${goal.evidenceSubmittedName || 'المسؤول'}`,
            goal,
            priority: 70 + Math.min(waitingDays, 20),
          });
        }
      }
    });

    return alerts.sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title, 'ar'));
  }, [goals]);

  const visibleExecutiveAlerts = useMemo(
    () => alertFilter === 'all' ? executiveAlerts : executiveAlerts.filter((alert) => alert.kind === alertFilter),
    [alertFilter, executiveAlerts]
  );

  const executiveAlertSummary = useMemo(() => ({
    total: executiveAlerts.length,
    overdue: executiveAlerts.filter((alert) => alert.kind === 'overdue').length,
    dueSoon: executiveAlerts.filter((alert) => alert.kind === 'due_soon').length,
    stale: executiveAlerts.filter((alert) => alert.kind === 'stale').length,
    unassigned: executiveAlerts.filter((alert) => alert.kind === 'unassigned').length,
    evidenceWaiting: executiveAlerts.filter((alert) => alert.kind === 'evidence_waiting').length,
  }), [executiveAlerts]);

  useEffect(() => {
    if (!executiveAlerts.length) return;

    const todayKey = riyadhDateInput();
    const storageKey = `iau-mosques-executive-alerts:${todayKey}`;
    try {
      if (window.localStorage.getItem(storageKey)) return;
      window.localStorage.setItem(storageKey, 'shown');
    } catch {
      // Local storage can be unavailable in restricted browser modes.
    }

    const criticalCount = executiveAlerts.filter((alert) => alert.severity === 'critical').length;
    const warningCount = executiveAlerts.filter((alert) => alert.severity === 'warning').length;

    if (criticalCount > 0) {
      toast.error(`تنبيه تنفيذي: توجد ${criticalCount} حالة حرجة تحتاج تدخلاً، من أصل ${executiveAlerts.length} تنبيه.`);
    } else if (warningCount > 0) {
      toast.warning(`تنبيه تنفيذي: توجد ${warningCount} حالة ذات أولوية، من أصل ${executiveAlerts.length} تنبيه.`);
    } else {
      toast.info(`لديك ${executiveAlerts.length} تنبيه متابعة تنفيذي جديد.`);
    }
  }, [executiveAlerts]);

  const extendGoal = async (goal: MosqueImprovementGoal, reason: string) => {
    setActingId(goal.id);
    try {
      await mosqueApi.updateImprovementGoal(goal.id, {
        dueDate: addDaysDateInput(goal.dueDate, 30),
        decisionReason: reason,
      });
      toast.success('تم تمديد موعد الهدف 30 يومًا وتوثيق القرار في السجل');
      await Promise.all([load(), loadDecisionLog()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تمديد موعد الهدف');
      throw error;
    } finally {
      setActingId(null);
    }
  };

  const activateFollowUp = async (goal: MosqueImprovementGoal, reason: string) => {
    const followUp = goal.followUpGoalId ? goals.find((item) => item.id === goal.followUpGoalId) : null;
    if (!followUp) {
      toast.error('لم يتم العثور على مسودة المتابعة المرتبطة');
      throw new Error('لم يتم العثور على مسودة المتابعة المرتبطة');
    }
    if (followUp.status !== 'draft') {
      toast.info('خطة المتابعة مرتبطة ومفعلة بالفعل');
      return;
    }

    setActingId(goal.id);
    try {
      await mosqueApi.updateImprovementGoal(followUp.id, {
        status: 'active',
        decisionReason: reason,
      });
      toast.success('تم تفعيل خطة المتابعة وتوثيق القرار في السجل');
      await Promise.all([load(), loadDecisionLog()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تفعيل خطة المتابعة');
      throw error;
    } finally {
      setActingId(null);
    }
  };

  const createGoalFromSuggestion = async (
    suggestion: MosqueImprovementGoalSuggestion,
    itemId: string,
    reason: string
  ) => {
    setActingId(itemId);
    try {
      const dueDate = addDaysDateInput(null, 90);
      await mosqueApi.createImprovementGoal({
        year,
        title: normalizeSuggestionTitle(suggestion),
        category: suggestion.category,
        metricKey: suggestion.metricKey,
        baselineValue: suggestion.baselineValue,
        targetValue: suggestion.targetValue,
        targetDirection: suggestion.targetDirection,
        sourceMonth: suggestion.sourceMonth,
        sourceSnapshotId: suggestion.sourceSnapshotId,
        assigneeUserId: suggestion.assigneeUserId || null,
        assigneeName: suggestion.assigneeName || null,
        gapKey: suggestion.gapKey || null,
        ownerUserId: null,
        dueDate,
        status: 'draft',
        decisionReason: reason,
        correctiveActions: [{
          id: crypto.randomUUID(),
          title: 'تحليل السبب الجذري واعتماد الإجراء التصحيحي المناسب',
          status: 'planned',
          dueDate: null,
          note: 'أنشئت من لوحة القرارات التنفيذية.',
        }],
        notes: 'مسودة هدف أنشئت من لوحة القرارات التنفيذية بناءً على آخر نتيجة KPI رسمية.',
      });
      toast.success('تم إنشاء مسودة هدف التحسين وتوثيق القرار في السجل');
      await Promise.all([load(), loadDecisionLog()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء مسودة هدف التحسين');
      throw error;
    } finally {
      setActingId(null);
    }
  };

  const openPendingDecision = (action: PendingExecutiveAction) => {
    setPendingAction(action);
    setDecisionReason(
      action.type === 'extend'
        ? 'منح مهلة إضافية لاستكمال الإجراءات التصحيحية ومعالجة أسباب التعثر.'
        : action.type === 'activate_follow_up'
          ? 'تفعيل خطة المتابعة لمعالجة التراجع الجوهري الذي ظهر بعد إغلاق الهدف.'
          : 'اعتماد التوصية المبنية على آخر نتيجة KPI وتحويلها إلى مسودة هدف تحسين قابلة للمتابعة.'
    );
  };

  const executePendingDecision = async () => {
    if (!pendingAction) return;
    if (decisionReason.trim().length < 3) {
      toast.error('مبرر القرار مطلوب لتوثيقه في السجل التنفيذي');
      return;
    }

    setDecisionSaving(true);
    try {
      if (pendingAction.type === 'extend') {
        await extendGoal(pendingAction.goal, decisionReason.trim());
      } else if (pendingAction.type === 'activate_follow_up') {
        await activateFollowUp(pendingAction.goal, decisionReason.trim());
      } else {
        await createGoalFromSuggestion(pendingAction.suggestion, pendingAction.itemId, decisionReason.trim());
      }
      setPendingAction(null);
      setDecisionReason('');
    } catch {
      // The action handler already shows a detailed error.
    } finally {
      setDecisionSaving(false);
    }
  };

  const openEvidenceReview = (goal: MosqueImprovementGoal) => {
    setReviewGoal(goal);
    setReviewNote('');
  };

  const reviewEvidence = async (decision: 'approve' | 'return') => {
    if (!reviewGoal) return;
    if (reviewNote.trim().length < 3) {
      toast.error('مبرر القرار مطلوب لحفظه في سجل القرارات التنفيذية');
      return;
    }
    if (decision === 'approve' && !window.confirm('اعتماد الأدلة وإغلاق الهدف نهائيًا؟')) return;

    setReviewSaving(true);
    try {
      await mosqueApi.reviewImprovementGoalEvidence(
        reviewGoal.id,
        decision,
        reviewNote.trim(),
        reviewNote.trim()
      );
      toast.success(decision === 'approve' ? 'تم اعتماد الأدلة وإغلاق الهدف وتوثيق القرار' : 'تمت إعادة الإثبات للاستكمال وتوثيق القرار');
      setReviewGoal(null);
      await Promise.all([load(), loadDecisionLog()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تنفيذ قرار مراجعة الإثبات');
    } finally {
      setReviewSaving(false);
    }
  };

  const exportQueue = () => {
    const rows = visibleQueue.map((item, index) => ({
      'م': index + 1,
      'الأولوية': severityLabel[item.severity],
      'النوع': item.kind === 'evidence_review' ? 'إثبات إغلاق ينتظر الاعتماد'
        : item.kind === 'at_risk' ? 'هدف معرض للتعثر'
          : item.kind === 'regressed' ? 'انتكاس بعد الإغلاق'
            : item.kind === 'suggestion' ? 'فرصة تدخل / هدف مقترح'
              : item.kind === 'awaiting_evidence' ? 'هدف متحقق ينتظر الإثبات'
                : 'تحسن مستدام',
      'العنوان': item.title,
      'الوصف': item.description,
      'التفاصيل': item.detail || '',
      'رقم الهدف': item.goal?.goalNumber || '',
      'الحالة': item.goal?.status || '',
      'المسؤول': item.goal?.ownerName || item.suggestion?.assigneeName || '',
      'تاريخ الاستحقاق': item.goal?.dueDate ? formatDate(item.goal.dueDate) : '',
      'آخر KPI رسمي': latestOfficialSnapshot?.month || '',
    }));

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    (sheet as any)['!views'] = [{ RTL: true }];
    (sheet as any)['!cols'] = [
      { wch: 6 }, { wch: 18 }, { wch: 26 }, { wch: 42 }, { wch: 70 }, { wch: 50 },
      { wch: 18 }, { wch: 18 }, { wch: 26 }, { wch: 18 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, 'قرارات الإدارة');
    XLSX.writeFile(workbook, `IAU_Mosques_Executive_Decisions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportDecisionLog = () => {
    if (!decisions.length) {
      toast.error('لا توجد قرارات ضمن الفترة المحددة');
      return;
    }

    const rows = decisions.map((decision, index) => ({
      'م': index + 1,
      'رقم القرار': decision.decisionNumber,
      'نوع القرار': decisionTypeLabel[decision.decisionType] || decision.decisionType,
      'عنوان القرار': decision.title,
      'المبرر': decision.rationale,
      'الحالة قبل القرار': decisionStateSummary(decision.beforeState),
      'الحالة بعد القرار': decisionStateSummary(decision.afterState),
      'الهدف / الكيان المرتبط': decision.goalId || decision.entityId || '',
      'المؤشر المرتبط': decision.metricKey ? (metricLabel[decision.metricKey] || decision.metricKey) : '',
      'متخذ القرار': decision.actorName || '',
      'الصفة': decision.actorRole === 'head' ? 'رئيس الوحدة' : (decision.actorRole || ''),
      'التاريخ والوقت': new Date(decision.decidedAt).toLocaleString('ar-SA-u-ca-gregory'),
    }));

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    (sheet as any)['!views'] = [{ RTL: true }];
    (sheet as any)['!cols'] = [
      { wch: 6 }, { wch: 20 }, { wch: 28 }, { wch: 45 }, { wch: 55 }, { wch: 55 },
      { wch: 55 }, { wch: 26 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 24 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, 'سجل القرارات');
    XLSX.writeFile(workbook, `IAU_Mosques_Executive_Decision_Log_${decisionFrom}_to_${decisionTo}.xlsx`);
  };

  const printDecisionMinutes = () => {
    if (!decisions.length) {
      toast.error('لا توجد قرارات ضمن الفترة المحددة لإعداد المحضر');
      return;
    }

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
    if (!popup) {
      toast.error('تعذر فتح نافذة الطباعة. تحقق من السماح بالنوافذ المنبثقة.');
      return;
    }

    const rows = decisions.map((decision, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(decision.decisionNumber)}</strong><br/><small>${escapeHtml(decisionTypeLabel[decision.decisionType] || decision.decisionType)}</small></td>
        <td>${escapeHtml(decision.title)}</td>
        <td>${escapeHtml(decision.rationale)}</td>
        <td>${escapeHtml(decisionStateSummary(decision.beforeState))}</td>
        <td>${escapeHtml(decisionStateSummary(decision.afterState))}</td>
        <td>${escapeHtml(decision.actorName || '—')}<br/><small>${escapeHtml(decision.actorRole === 'head' ? 'رئيس الوحدة' : (decision.actorRole || ''))}</small></td>
        <td>${escapeHtml(new Date(decision.decidedAt).toLocaleString('ar-SA-u-ca-gregory'))}</td>
      </tr>
    `).join('');

    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>محضر القرارات التنفيذية</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Tahoma, sans-serif; color: #17202a; margin: 0; direction: rtl; }
.header { text-align: center; border-bottom: 3px solid #0b4a3f; padding-bottom: 12px; margin-bottom: 16px; }
.header h1 { margin: 0; color: #0b4a3f; font-size: 22px; }
.header h2 { margin: 7px 0 0; font-size: 15px; font-weight: 700; }
.meta { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; margin: 10px 0 16px; }
table { width: 100%; border-collapse: collapse; font-size: 9px; }
th, td { border: 1px solid #b9c1c7; padding: 7px; vertical-align: top; line-height: 1.55; }
th { background: #eaf4f1; color: #0b4a3f; font-weight: 800; }
small { color: #64748b; }
.footer { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; font-size: 11px; }
.signature { min-height: 70px; border-top: 1px solid #94a3b8; padding-top: 8px; text-align: center; }
.note { margin-top: 12px; font-size: 9px; color: #64748b; }
@media print { button { display:none; } }
</style>
</head>
<body>
  <div class="header">
    <h1>جامعة الإمام عبدالرحمن بن فيصل</h1>
    <h2>وحدة العناية بالمساجد والمصليات الجامعية — محضر القرارات التنفيذية</h2>
  </div>
  <div class="meta">
    <div><strong>الفترة:</strong> ${escapeHtml(decisionFrom)} إلى ${escapeHtml(decisionTo)}</div>
    <div><strong>عدد القرارات:</strong> ${decisions.length}</div>
    <div><strong>تاريخ إعداد المحضر:</strong> ${escapeHtml(new Date().toLocaleString('ar-SA-u-ca-gregory'))}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>م</th><th>رقم / نوع القرار</th><th>موضوع القرار</th><th>المبرر</th>
        <th>الحالة قبل</th><th>الحالة بعد</th><th>متخذ القرار</th><th>التاريخ والوقت</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="note">أُعد هذا المحضر آليًا من سجل القرارات التنفيذي المحفوظ في منصة IAU-Deeds، وتبقى تفاصيل كل قرار وحالته قبل التنفيذ وبعده محفوظة في السجل الإلكتروني.</div>
  <div class="footer">
    <div class="signature">إعداد ومراجعة<br/>الاسم: ____________________<br/>التوقيع: ____________________</div>
    <div class="signature">رئيس وحدة العناية بالمساجد والمصليات الجامعية<br/>الاسم: ____________________<br/>التوقيع: ____________________</div>
  </div>
  <script>window.onload = () => window.print();<\/script>
</body>
</html>`);
    popup.document.close();
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
        <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">مركز القرار التنفيذي</Badge>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl">
                <Gavel className="h-5 w-5" />
                تنبيهات وقرارات الإدارة التنفيذية
              </CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-6">
                يجمع الحالات التي تحتاج قرار رئيس الوحدة في مكان واحد، مع إجراءات مباشرة وسجل مبني على مؤشرات KPI وخطة التحسين والاستدامة.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={loading ? 'ml-2 h-4 w-4 animate-spin' : 'ml-2 h-4 w-4'} />
                تحديث
              </Button>
              <Button variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800" onClick={exportQueue} disabled={!visibleQueue.length}>
                <FileSpreadsheet className="ml-2 h-4 w-4" />
                تصدير الموجز
              </Button>
              <Button className="bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={onOpenImprovementPlan}>
                <Target className="ml-2 h-4 w-4" />
                خطة التحسين
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <DecisionMetric label="قرارات عاجلة" value={counts.critical} icon={Gavel} tone={counts.critical ? 'danger' : 'normal'} />
            <DecisionMetric label="إثباتات للمراجعة" value={counts.evidence} icon={FileCheck2} />
            <DecisionMetric label="أهداف متعثرة" value={counts.atRisk} icon={AlertTriangle} tone={counts.atRisk ? 'warning' : 'normal'} />
            <DecisionMetric label="حالات انتكاس" value={counts.relapse} icon={TrendingDown} tone={counts.relapse ? 'danger' : 'normal'} />
            <DecisionMetric label="تدخلات مقترحة" value={counts.suggestions} icon={Sparkles} />
            <DecisionMetric label="تحسن مستدام" value={counts.sustained} icon={ShieldCheck} tone="success" />
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-slate-600">
              <span className="font-black text-[#0b4a3f]">آخر KPI رسمي:</span>{' '}
              {latestOfficialSnapshot
                ? `${latestOfficialSnapshot.month} — ${latestOfficialSnapshot.kpiScore == null ? 'غير مقاس' : latestOfficialSnapshot.kpiScore + '/100'}`
                : 'لا توجد نتيجة رسمية بعد'}
            </div>
            <NativeSelect className="h-10 min-w-[210px] bg-white" value={filter} onChange={(event) => setFilter(event.target.value as QueueFilter)}>
              <option value="all">كل التنبيهات والقرارات</option>
              <option value="decisions">تحتاج قرارًا إداريًا</option>
              <option value="monitoring">متابعة دون قرار فوري</option>
              <option value="positive">إحاطات إيجابية</option>
            </NativeSelect>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm font-bold text-slate-500">
              <RefreshCw className="ml-2 h-5 w-5 animate-spin" />
              جاري إعداد موجز القرارات...
            </div>
          ) : visibleQueue.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-700" />
              <p className="mt-3 text-sm font-black text-emerald-900">لا توجد حالات ضمن التصفية الحالية.</p>
              <p className="mt-1 text-xs text-emerald-700">القرارات التنفيذية الحرجة والمفتوحة ستظهر هنا تلقائيًا.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleQueue.map((item) => {
                const followUp = item.goal?.followUpGoalId ? goals.find((goal) => goal.id === item.goal?.followUpGoalId) : null;
                return (
                  <div key={item.id} className={`rounded-[22px] border p-4 shadow-sm ${severityClass[item.severity]}`}>
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={severityBadge[item.severity]}>{severityLabel[item.severity]}</Badge>
                          {item.goal?.goalNumber && <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">{item.goal.goalNumber}</Badge>}
                          {item.kind === 'evidence_review' && <Badge variant="outline" className="border-amber-200 bg-white text-amber-800">بانتظار اعتماد</Badge>}
                          {item.kind === 'regressed' && <Badge variant="outline" className="border-rose-200 bg-white text-rose-800">انتكاس</Badge>}
                          {item.kind === 'sustained' && <Badge variant="outline" className="border-emerald-200 bg-white text-emerald-800">مستدام</Badge>}
                        </div>
                        <h3 className="mt-2 text-base font-black text-slate-900">{item.title}</h3>
                        <p className="mt-1 text-xs leading-6 text-slate-600">{item.description}</p>
                        {item.detail && <p className="mt-1 text-[10px] font-bold leading-5 text-slate-400">{item.detail}</p>}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {item.kind === 'evidence_review' && item.goal && (
                          <Button size="sm" className="bg-violet-700 text-white hover:bg-violet-800" onClick={() => openEvidenceReview(item.goal!)}>
                            <FileCheck2 className="ml-1 h-3.5 w-3.5" />
                            مراجعة واعتماد
                          </Button>
                        )}

                        {item.kind === 'at_risk' && item.goal && (
                          <>
                            <Button
                              size="sm"
                              className="bg-amber-700 text-white hover:bg-amber-800"
                              disabled={actingId === item.goal.id}
                              onClick={() => openPendingDecision({ type: 'extend', itemId: item.id, goal: item.goal! })}
                            >
                              {actingId === item.goal.id ? <RefreshCw className="ml-1 h-3.5 w-3.5 animate-spin" /> : <Clock3 className="ml-1 h-3.5 w-3.5" />}
                              تمديد 30 يومًا
                            </Button>
                            <Button size="sm" variant="outline" className="border-amber-300 bg-white text-amber-900" onClick={onOpenImprovementPlan}>فتح الخطة</Button>
                          </>
                        )}

                        {item.kind === 'regressed' && item.goal && (
                          followUp?.status === 'draft' ? (
                            <Button
                              size="sm"
                              className="bg-rose-700 text-white hover:bg-rose-800"
                              disabled={actingId === item.goal.id}
                              onClick={() => openPendingDecision({ type: 'activate_follow_up', itemId: item.id, goal: item.goal! })}
                            >
                              {actingId === item.goal.id ? <RefreshCw className="ml-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="ml-1 h-3.5 w-3.5" />}
                              تفعيل خطة المتابعة
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="border-rose-200 bg-white text-rose-800" onClick={onOpenImprovementPlan}>عرض خطة المتابعة</Button>
                          )
                        )}

                        {item.kind === 'suggestion' && item.suggestion && (
                          <Button
                            size="sm"
                            className="bg-sky-700 text-white hover:bg-sky-800"
                            disabled={actingId === item.id}
                            onClick={() => openPendingDecision({ type: 'create_suggestion', itemId: item.id, suggestion: item.suggestion! })}
                          >
                            {actingId === item.id ? <RefreshCw className="ml-1 h-3.5 w-3.5 animate-spin" /> : <Target className="ml-1 h-3.5 w-3.5" />}
                            إنشاء مسودة هدف
                          </Button>
                        )}

                        {(item.kind === 'awaiting_evidence' || item.kind === 'sustained') && (
                          <Button size="sm" variant="outline" className="border-slate-200 bg-white text-slate-700" onClick={onOpenImprovementPlan}>
                            عرض الهدف
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.06)]">
        <Card className="overflow-hidden rounded-[26px] border border-rose-200 bg-white shadow-[0_14px_34px_rgba(127,29,29,0.06)]">
        <CardHeader className="border-b border-rose-100 bg-rose-50/40">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-rose-200 bg-white text-rose-800">تنبيهات آلية داخل المنصة</Badge>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f]">
                <BellRing className="h-5 w-5 text-rose-700" />
                مركز تنبيهات تنفيذ القرارات
              </CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-6">
                يراقب الاستحقاقات والتأخير وعدم التحديث وإسناد المسؤول واعتماد الإثباتات تلقائيًا، ويعرض الحالات الأعلى أولوية أولًا.
              </CardDescription>
            </div>
            <Badge variant="outline" className={executiveAlertSummary.total ? 'border-rose-200 bg-white text-rose-800' : 'border-emerald-200 bg-white text-emerald-800'}>
              {executiveAlertSummary.total ? `${executiveAlertSummary.total} تنبيه نشط` : 'لا توجد تنبيهات نشطة'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <DecisionMetric label="متأخرة" value={executiveAlertSummary.overdue} icon={AlertTriangle} tone={executiveAlertSummary.overdue ? 'danger' : 'normal'} />
            <DecisionMetric label="استحقاق خلال 7 أيام" value={executiveAlertSummary.dueSoon} icon={CalendarClock} tone={executiveAlertSummary.dueSoon ? 'warning' : 'normal'} />
            <DecisionMetric label="دون تحديث 7+ أيام" value={executiveAlertSummary.stale} icon={RefreshCw} tone={executiveAlertSummary.stale ? 'warning' : 'normal'} />
            <DecisionMetric label="دون مسؤول تنفيذ" value={executiveAlertSummary.unassigned} icon={UserRoundCheck} tone={executiveAlertSummary.unassigned ? 'warning' : 'normal'} />
            <DecisionMetric label="إثباتات تنتظر الاعتماد" value={executiveAlertSummary.evidenceWaiting} icon={FileCheck2} tone={executiveAlertSummary.evidenceWaiting ? 'warning' : 'normal'} />
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-[1fr_auto] md:items-end">
            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-600">نوع التنبيه</span>
              <NativeSelect value={alertFilter} onChange={(event) => setAlertFilter(event.target.value as 'all' | ExecutiveAlert['kind'])}>
                <option value="all">جميع التنبيهات</option>
                <option value="overdue">متأخر عن الاستحقاق</option>
                <option value="due_soon">استحقاق قريب</option>
                <option value="stale">لم يتم تحديثه</option>
                <option value="unassigned">دون مسؤول تنفيذ</option>
                <option value="evidence_waiting">إثبات ينتظر الاعتماد</option>
              </NativeSelect>
            </label>
            <Button variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={onOpenImprovementPlan}>
              فتح خطة التحسين
            </Button>
          </div>

          {visibleExecutiveAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/50 p-8 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-3 text-sm font-black text-emerald-900">لا توجد تنبيهات مطابقة للتصفية الحالية.</p>
              <p className="mt-1 text-xs text-emerald-700">سيظهر أي تأخير أو استحقاق قريب أو توقف في التحديث هنا تلقائيًا.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {visibleExecutiveAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={alert.severity === 'critical'
                    ? 'rounded-2xl border border-rose-200 bg-rose-50/70 p-4'
                    : alert.severity === 'warning'
                      ? 'rounded-2xl border border-amber-200 bg-amber-50/70 p-4'
                      : 'rounded-2xl border border-sky-200 bg-sky-50/60 p-4'}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={alert.severity === 'critical'
                            ? 'border-rose-200 bg-white text-rose-800'
                            : alert.severity === 'warning'
                              ? 'border-amber-200 bg-white text-amber-800'
                              : 'border-sky-200 bg-white text-sky-800'}
                        >
                          {alert.kind === 'overdue'
                            ? 'متأخر'
                            : alert.kind === 'due_soon'
                              ? 'استحقاق قريب'
                              : alert.kind === 'stale'
                                ? 'توقف تحديث'
                                : alert.kind === 'unassigned'
                                  ? 'دون مسؤول'
                                  : 'انتظار اعتماد'}
                        </Badge>
                        <span className="text-[10px] font-black text-slate-400">{alert.goal.goalNumber}</span>
                      </div>
                      <h3 className="mt-2 text-sm font-black text-slate-900">{alert.title}</h3>
                      <p className="mt-1 text-xs leading-6 text-slate-600">{alert.description}</p>
                      <p className="mt-1 text-[10px] font-bold leading-5 text-slate-400">{alert.detail}</p>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 border-slate-200 bg-white text-slate-700" onClick={onOpenImprovementPlan}>
                      معالجة الحالة
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-6 text-slate-600">
            قواعد التنبيه الحالية: استحقاق خلال 7 أيام، تجاوز الموعد، عدم تحديث لمدة 7 أيام فأكثر، قرار دون مسؤول تنفيذ، أو إثبات إغلاق ينتظر الاعتماد 3 أيام فأكثر. يظهر ملخص تنبيهي مرة واحدة يوميًا عند فتح المركز.
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[26px] border border-[#d9c9a5] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.06)]">
        <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-emerald-200 bg-white text-emerald-800">متابعة التنفيذ بعد صدور القرار</Badge>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f]">
                <ShieldCheck className="h-5 w-5" />
                لوحة المتابعة التنفيذية للقرارات
              </CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-6">
                تحول القرار من سجل توثيقي إلى متابعة تشغيلية: المسؤول، الاستحقاق، نسبة الإنجاز، التأخير، آخر تحديث، الإثباتات، والارتباط بمؤشر KPI.
              </CardDescription>
            </div>
            <Button variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={loading ? 'ml-2 h-4 w-4 animate-spin' : 'ml-2 h-4 w-4'} />
              تحديث المتابعة
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <DecisionMetric label="إجمالي القرارات المرتبطة بأهداف" value={trackingSummary.total} icon={Gavel} />
            <DecisionMetric label="جاري التنفيذ" value={trackingSummary.active} icon={Clock3} />
            <DecisionMetric label="المتأخرة" value={trackingSummary.overdue} icon={AlertTriangle} tone={trackingSummary.overdue ? 'danger' : 'normal'} />
            <DecisionMetric label="المتعثرة" value={trackingSummary.atRisk} icon={TrendingDown} tone={trackingSummary.atRisk ? 'warning' : 'normal'} />
            <DecisionMetric label="المكتملة / المغلقة" value={trackingSummary.completed} icon={CheckCircle2} tone="success" />
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-600">الحالة التنفيذية</span>
              <NativeSelect value={trackingStatus} onChange={(event) => setTrackingStatus(event.target.value)}>
                <option value="all">جميع الحالات</option>
                <option value="pending">لم يبدأ</option>
                <option value="active">جاري التنفيذ</option>
                <option value="at_risk">متعثر</option>
                <option value="completed">مكتمل / مغلق</option>
              </NativeSelect>
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-600">المسؤول عن التنفيذ</span>
              <NativeSelect value={trackingOwner} onChange={(event) => setTrackingOwner(event.target.value)}>
                <option value="all">جميع المسؤولين</option>
                {trackingOwners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
              </NativeSelect>
            </label>
          </div>

          {trackingRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-600">لا توجد عناصر متابعة مطابقة للتصفية الحالية.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1500px] text-right text-xs">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-500">
                    <tr>
                      <th className="px-3 py-3">رقم الهدف / القرار</th>
                      <th className="px-3 py-3">الموضوع</th>
                      <th className="px-3 py-3">الحالة</th>
                      <th className="px-3 py-3">المسؤول</th>
                      <th className="px-3 py-3">نسبة الإنجاز</th>
                      <th className="px-3 py-3">الاستحقاق</th>
                      <th className="px-3 py-3">المتبقي / التأخير</th>
                      <th className="px-3 py-3">KPI المرتبط</th>
                      <th className="px-3 py-3">الإثباتات</th>
                      <th className="px-3 py-3">آخر تحديث</th>
                      <th className="px-3 py-3">الملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {trackingRows.map(({ goal, daysDelta, isOverdue, displayStatus, evidenceCount }) => (
                      <tr key={goal.id} className={isOverdue ? 'bg-rose-50/50 align-top' : 'align-top'}>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="border-[#d9c9a5] bg-[#fffdf8] text-[#0b4a3f]">{goal.goalNumber}</Badge>
                          {goal.parentGoalId && <p className="mt-1 text-[10px] text-slate-400">متابعة لهدف سابق</p>}
                        </td>
                        <td className="max-w-[300px] px-3 py-3">
                          <p className="font-black text-slate-800">{goal.title}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{goal.category === 'unit_metric' ? 'مؤشر الوحدة' : goal.category === 'assignee_metric' ? 'أداء مسؤول' : 'معالجة فجوة'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <Badge
                            variant="outline"
                            className={goal.status === 'at_risk'
                              ? 'border-amber-200 bg-amber-50 text-amber-800'
                              : isOverdue
                                ? 'border-rose-200 bg-rose-50 text-rose-800'
                                : goal.status === 'closed'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-sky-200 bg-sky-50 text-sky-800'}
                          >
                            {displayStatus}
                          </Badge>
                          {isOverdue && <p className="mt-1 text-[10px] font-black text-rose-700">متأخر عن الموعد</p>}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-black text-slate-800">{goal.ownerName || 'غير مسند'}</p>
                          {goal.assigneeName && goal.assigneeName !== goal.ownerName && <p className="mt-1 text-[10px] text-slate-400">مرتبط: {goal.assigneeName}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-black text-slate-800">{Math.round(goal.progressPercent)}%</p>
                          <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#0b4a3f]" style={{ width: `${Math.max(0, Math.min(100, goal.progressPercent))}%` }} />
                          </div>
                          <p className="mt-1 text-[10px] text-slate-400">الإجراءات: {Math.round(goal.actionProgressPercent)}%</p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-bold text-slate-700">{formatDate(goal.dueDate)}</td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {daysDelta === null ? (
                            <span className="text-slate-400">غير محدد</span>
                          ) : daysDelta < 0 ? (
                            <span className="font-black text-rose-700">متأخر {Math.abs(daysDelta)} يوم</span>
                          ) : daysDelta === 0 ? (
                            <span className="font-black text-amber-700">يستحق اليوم</span>
                          ) : (
                            <span className={daysDelta <= 7 ? 'font-black text-amber-700' : 'font-bold text-slate-600'}>متبقي {daysDelta} يوم</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-black text-slate-700">{metricLabel[goal.metricKey] || goal.metricKey}</p>
                          <p className="mt-1 text-[10px] text-slate-400">الحالي {goal.currentValue ?? '—'} / المستهدف {goal.targetValue}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-black text-slate-700">{evidenceCount} مرفق</p>
                          <p className="mt-1 text-[10px] text-slate-400">{goal.evidenceStatus === 'approved' ? 'معتمد' : goal.evidenceStatus === 'submitted' ? 'مرفوع للمراجعة' : goal.evidenceStatus === 'returned' ? 'معاد للاستكمال' : 'لم يرفع'}</p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(goal.updatedAt)}</td>
                        <td className="max-w-[320px] px-3 py-3 leading-5 text-slate-500">
                          {goal.measurementNote || goal.sustainabilityNote || goal.notes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(trackingSummary.overdue > 0 || trackingSummary.atRisk > 0) && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-black">تنبيه تنفيذي</p>
                <p className="mt-1 text-xs leading-6">
                  توجد {trackingSummary.overdue} حالة متأخرة و{trackingSummary.atRisk} حالة متعثرة. تظهر هذه الحالات أعلى الجدول تلقائيًا لتسهيل التدخل الإداري.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-violet-200 bg-white text-violet-800">سجل تدقيق غير قابل للتجاوز</Badge>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f]">
                <History className="h-5 w-5" />
                سجل القرارات التنفيذية
              </CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-6">
                يحفظ رقم القرار ونوعه ومبرره ومتخذ القرار والحالة قبل التنفيذ وبعده، ويمكن استخراج محضر إداري رسمي لأي فترة.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={() => void loadDecisionLog()} disabled={decisionLoading}>
                <RefreshCw className={decisionLoading ? 'ml-2 h-4 w-4 animate-spin' : 'ml-2 h-4 w-4'} />
                تحديث السجل
              </Button>
              <Button variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800" onClick={exportDecisionLog} disabled={!decisions.length}>
                <FileSpreadsheet className="ml-2 h-4 w-4" />
                تصدير السجل
              </Button>
              <Button className="bg-violet-700 text-white hover:bg-violet-800" onClick={printDecisionMinutes} disabled={!decisions.length}>
                <Printer className="ml-2 h-4 w-4" />
                محضر القرارات
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-600">من تاريخ</span>
              <Input type="date" value={decisionFrom} onChange={(event) => setDecisionFrom(event.target.value)} />
            </label>
            <label className="space-y-1.5">
              <span className="text-[11px] font-black text-slate-600">إلى تاريخ</span>
              <Input type="date" value={decisionTo} onChange={(event) => setDecisionTo(event.target.value)} />
            </label>
            <Button className="bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => void loadDecisionLog(decisionFrom, decisionTo)} disabled={decisionLoading || !decisionFrom || !decisionTo}>
              تطبيق الفترة
            </Button>
          </div>

          {decisionLoading ? (
            <div className="flex min-h-32 items-center justify-center text-sm font-bold text-slate-500">
              <RefreshCw className="ml-2 h-5 w-5 animate-spin" />
              جاري تحميل سجل القرارات...
            </div>
          ) : decisions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <History className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-600">لا توجد قرارات محفوظة ضمن الفترة المحددة.</p>
              <p className="mt-1 text-xs text-slate-400">القرارات الجديدة الصادرة من مركز القرار أو اعتماد KPI ستوثق هنا تلقائيًا.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-black text-slate-800">القرارات المسجلة</p>
                <Badge variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]">{decisions.length} قرار</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1380px] text-right text-xs">
                  <thead className="bg-white text-[10px] font-black text-slate-500">
                    <tr>
                      <th className="px-3 py-3">رقم القرار</th>
                      <th className="px-3 py-3">النوع</th>
                      <th className="px-3 py-3">الموضوع والمبرر</th>
                      <th className="px-3 py-3">الحالة قبل</th>
                      <th className="px-3 py-3">الحالة بعد</th>
                      <th className="px-3 py-3">الهدف / المؤشر</th>
                      <th className="px-3 py-3">متخذ القرار</th>
                      <th className="px-3 py-3">التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {decisions.map((decision) => (
                      <tr key={decision.id} className="align-top">
                        <td className="px-3 py-3">
                          <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">{decision.decisionNumber}</Badge>
                        </td>
                        <td className="px-3 py-3 font-black text-slate-700">{decisionTypeLabel[decision.decisionType] || decision.decisionType}</td>
                        <td className="max-w-[360px] px-3 py-3">
                          <p className="font-black text-slate-800">{decision.title}</p>
                          <p className="mt-1 leading-5 text-slate-500">{decision.rationale}</p>
                        </td>
                        <td className="max-w-[300px] px-3 py-3 leading-5 text-slate-500">{decisionStateSummary(decision.beforeState)}</td>
                        <td className="max-w-[300px] px-3 py-3 leading-5 text-slate-700">{decisionStateSummary(decision.afterState)}</td>
                        <td className="px-3 py-3">
                          <p className="font-bold text-slate-700">{decision.goalId || decision.entityId || '—'}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{decision.metricKey ? (metricLabel[decision.metricKey] || decision.metricKey) : 'بدون مؤشر محدد'}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-black text-slate-800">{decision.actorName || '—'}</p>
                          <p className="mt-1 text-[10px] text-slate-400">{decision.actorRole === 'head' ? 'رئيس الوحدة' : (decision.actorRole || '—')}</p>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-slate-600">{new Date(decision.decidedAt).toLocaleString('ar-SA-u-ca-gregory')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="sm:max-w-[620px]" dir="rtl">
          {pendingAction && (
            <>
              <DialogHeader className="text-right">
                <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f]">
                  <Gavel className="h-5 w-5" />
                  توثيق القرار التنفيذي
                </DialogTitle>
                <DialogDescription className="leading-6">
                  {pendingAction.type === 'extend'
                    ? `تمديد موعد الهدف ${pendingAction.goal.goalNumber} لمدة 30 يومًا.`
                    : pendingAction.type === 'activate_follow_up'
                      ? 'تفعيل مسودة خطة المتابعة المرتبطة بالانتكاس والبدء في تنفيذها.'
                      : 'تحويل توصية KPI الحالية إلى مسودة هدف تحسين رسمي.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
                  سيُحفظ هذا القرار برقم مستقل مع الحالة قبل التنفيذ وبعده، واسم متخذ القرار والتاريخ والوقت.
                </div>
                <label className="block space-y-1.5">
                  <span className="text-xs font-black text-slate-600">مبرر القرار</span>
                  <Textarea
                    value={decisionReason}
                    onChange={(event) => setDecisionReason(event.target.value)}
                    rows={5}
                    placeholder="اكتب مبرر القرار الإداري بصورة واضحة..."
                  />
                </label>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPendingAction(null)} disabled={decisionSaving}>إلغاء</Button>
                <Button className="bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => void executePendingDecision()} disabled={decisionSaving}>
                  {decisionSaving ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Gavel className="ml-2 h-4 w-4" />}
                  اعتماد القرار وتنفيذه
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewGoal)} onOpenChange={(open) => !open && setReviewGoal(null)}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-[860px]" dir="rtl">
          {reviewGoal && (
            <>
              <DialogHeader className="border-b border-slate-200 bg-[#fffdf8] p-5 text-right">
                <DialogTitle className="text-xl font-black text-[#0b4a3f]">قرار اعتماد إثبات الإغلاق</DialogTitle>
                <DialogDescription>{reviewGoal.goalNumber} — {reviewGoal.title}</DialogDescription>
              </DialogHeader>

              <div className="max-h-[calc(92vh-160px)] space-y-4 overflow-y-auto p-4 md:p-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-black text-slate-500">ملخص نتيجة التنفيذ</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-800">{reviewGoal.closureSummary || 'لا يوجد ملخص.'}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-800">الأدلة المرفقة</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(Array.isArray(reviewGoal.closureEvidence) ? reviewGoal.closureEvidence : []).map((item, index) => (
                      <button
                        key={`${item.url}-${index}`}
                        type="button"
                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                        className="rounded-xl border border-slate-200 bg-white p-3 text-right transition hover:border-[#d6b46a] hover:bg-[#fffdf8]"
                      >
                        <p className="truncate text-xs font-black text-slate-700">{item.fileName || `إثبات ${index + 1}`}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{item.kind === 'image' ? 'صورة' : 'مستند'} — فتح المرفق</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-black text-slate-400">رفع بواسطة</p>
                    <p className="mt-1 text-xs font-black text-slate-800">{reviewGoal.evidenceSubmittedName || '—'}</p>
                    <p className="mt-1 text-[10px] text-slate-500">{formatDate(reviewGoal.evidenceSubmittedAt)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] font-black text-slate-400">الإجراءات التصحيحية</p>
                    <p className="mt-1 text-xs font-black text-slate-800">{reviewGoal.actionProgressPercent}% مكتملة</p>
                    <p className="mt-1 text-[10px] text-slate-500">المؤشر: {reviewGoal.progressPercent}%</p>
                  </div>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs font-black text-slate-600">مبرر القرار / ملاحظة المراجعة</span>
                  <Textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={4}
                    placeholder="اكتب مبرر القرار الإداري؛ يُحفظ في سجل القرارات التنفيذية..."
                  />
                </label>
              </div>

              <DialogFooter className="border-t border-slate-200 bg-white p-4">
                <Button variant="outline" onClick={() => setReviewGoal(null)} disabled={reviewSaving}>إلغاء</Button>
                <Button variant="outline" className="border-rose-200 bg-rose-50 text-rose-800" onClick={() => void reviewEvidence('return')} disabled={reviewSaving}>
                  <RotateCcw className="ml-2 h-4 w-4" />
                  إعادة للاستكمال
                </Button>
                <Button className="bg-violet-700 text-white hover:bg-violet-800" onClick={() => void reviewEvidence('approve')} disabled={reviewSaving}>
                  {reviewSaving ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-2 h-4 w-4" />}
                  اعتماد وإغلاق
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DecisionMetric = ({
  label,
  value,
  icon: Icon,
  tone = 'normal',
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone?: 'normal' | 'warning' | 'danger' | 'success';
}) => {
  const toneClass = tone === 'danger'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-slate-200 bg-white text-[#0b4a3f]';
  return (
    <div className={`rounded-2xl border p-3 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/80"><Icon className="h-4 w-4" /></span>
        <strong className="text-xl font-black">{value}</strong>
      </div>
      <p className="mt-2 text-[10px] font-black opacity-80">{label}</p>
    </div>
  );
};

export default MosqueExecutiveDecisionCenter;
