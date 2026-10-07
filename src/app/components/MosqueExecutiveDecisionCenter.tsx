import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  AlertTriangle,
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

  const [reviewGoal, setReviewGoal] = useState<MosqueImprovementGoal | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  const year = currentRiyadhYear();

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

  const extendGoal = async (goal: MosqueImprovementGoal) => {
    if (!window.confirm(`تمديد موعد الهدف ${goal.goalNumber} لمدة 30 يومًا؟`)) return;
    setActingId(goal.id);
    try {
      await mosqueApi.updateImprovementGoal(goal.id, { dueDate: addDaysDateInput(goal.dueDate, 30) });
      toast.success('تم تمديد موعد الهدف 30 يومًا وإعادة تقييم حالته');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تمديد موعد الهدف');
    } finally {
      setActingId(null);
    }
  };

  const activateFollowUp = async (goal: MosqueImprovementGoal) => {
    const followUp = goal.followUpGoalId ? goals.find((item) => item.id === goal.followUpGoalId) : null;
    if (!followUp) {
      toast.error('لم يتم العثور على مسودة المتابعة المرتبطة');
      return;
    }
    if (followUp.status !== 'draft') {
      toast.info('خطة المتابعة مرتبطة ومفعلة بالفعل');
      return;
    }
    if (!window.confirm(`تفعيل مسودة المتابعة ${followUp.goalNumber} والبدء في تنفيذها؟`)) return;

    setActingId(goal.id);
    try {
      await mosqueApi.updateImprovementGoal(followUp.id, { status: 'active' });
      toast.success('تم تفعيل خطة المتابعة المرتبطة بالانتكاس');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تفعيل خطة المتابعة');
    } finally {
      setActingId(null);
    }
  };

  const createGoalFromSuggestion = async (suggestion: MosqueImprovementGoalSuggestion, itemId: string) => {
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
        correctiveActions: [{
          id: crypto.randomUUID(),
          title: 'تحليل السبب الجذري واعتماد الإجراء التصحيحي المناسب',
          status: 'planned',
          dueDate: null,
          note: 'أنشئت من لوحة القرارات التنفيذية.',
        }],
        notes: 'مسودة هدف أنشئت من لوحة القرارات التنفيذية بناءً على آخر نتيجة KPI رسمية.',
      });
      toast.success('تم إنشاء مسودة هدف تحسين، ويمكن إسنادها وتفعيلها من خطة التحسين');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء مسودة هدف التحسين');
    } finally {
      setActingId(null);
    }
  };

  const openEvidenceReview = (goal: MosqueImprovementGoal) => {
    setReviewGoal(goal);
    setReviewNote('');
  };

  const reviewEvidence = async (decision: 'approve' | 'return') => {
    if (!reviewGoal) return;
    if (decision === 'return' && !reviewNote.trim()) {
      toast.error('اكتب ملاحظة توضح متطلبات استكمال الإثبات');
      return;
    }
    if (decision === 'approve' && !window.confirm('اعتماد الأدلة وإغلاق الهدف نهائيًا؟')) return;

    setReviewSaving(true);
    try {
      await mosqueApi.reviewImprovementGoalEvidence(reviewGoal.id, decision, reviewNote.trim() || undefined);
      toast.success(decision === 'approve' ? 'تم اعتماد الأدلة وإغلاق الهدف' : 'تمت إعادة الإثبات للاستكمال');
      setReviewGoal(null);
      await load();
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
                              onClick={() => void extendGoal(item.goal!)}
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
                              onClick={() => void activateFollowUp(item.goal!)}
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
                            onClick={() => void createGoalFromSuggestion(item.suggestion!, item.id)}
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
                  <span className="text-xs font-black text-slate-600">ملاحظة القرار</span>
                  <Textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={4}
                    placeholder="اختياري عند الاعتماد، وإلزامي عند إعادة الإثبات للاستكمال..."
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
