import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Flag,
  Gauge,
  Image as ImageIcon,
  Lightbulb,
  ListChecks,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  Upload,
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
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import {
  mosqueApi,
  type MosqueCompletionTaskAssignee,
  type MosqueImprovementAction,
  type MosqueImprovementEvidenceItem,
  type MosqueImprovementGoal,
  type MosqueImprovementGoalSuggestion,
  type MosqueImprovementGoalSuggestions,
} from '../api/mosques';

type GoalForm = {
  title: string;
  category: MosqueImprovementGoal['category'];
  metricKey: MosqueImprovementGoal['metricKey'];
  baselineValue: string;
  targetValue: string;
  targetDirection: MosqueImprovementGoal['targetDirection'];
  sourceMonth: string;
  sourceSnapshotId: string;
  assigneeUserId: string;
  assigneeName: string;
  gapKey: string;
  ownerUserId: string;
  dueDate: string;
  notes: string;
  status: 'draft' | 'active';
  correctiveActions: MosqueImprovementAction[];
};

type MosqueImprovementGoalsCenterProps = {
  role: string;
  currentUsername?: string | null;
};

const currentRiyadhYear = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
  }).formatToParts(new Date());
  return Number(parts.find((part) => part.type === 'year')?.value || new Date().getFullYear());
};

const metricLabel: Record<MosqueImprovementGoal['metricKey'], string> = {
  completionRate: 'نسبة الإنجاز',
  onTimeRate: 'الالتزام بالمواعيد',
  avgCompletionDays: 'متوسط مدة الإنجاز',
  overdueRate: 'نسبة التأخير',
  kpiScore: 'درجة KPI',
  gapCreatedCount: 'عدد حالات النقص الجديدة',
};

const categoryLabel: Record<MosqueImprovementGoal['category'], string> = {
  unit_metric: 'مؤشر الوحدة',
  assignee_metric: 'أداء مسؤول',
  gap_reduction: 'خفض نوع نقص',
};

const statusLabel: Record<MosqueImprovementGoal['status'], string> = {
  draft: 'مسودة',
  active: 'قيد التنفيذ',
  at_risk: 'معرض للتعثر',
  achieved: 'متحقق — بانتظار الإثبات',
  evidence_review: 'إثبات قيد المراجعة',
  closed: 'مغلق ومعتمد',
  cancelled: 'ملغى',
};

const statusClass: Record<MosqueImprovementGoal['status'], string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  active: 'border-sky-200 bg-sky-50 text-sky-800',
  at_risk: 'border-rose-200 bg-rose-50 text-rose-800',
  achieved: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  evidence_review: 'border-amber-200 bg-amber-50 text-amber-800',
  closed: 'border-violet-200 bg-violet-50 text-violet-800',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
};

const actionStatusLabel: Record<MosqueImprovementAction['status'], string> = {
  planned: 'مخطط',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
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

const directionForMetric = (metric: MosqueImprovementGoal['metricKey']): MosqueImprovementGoal['targetDirection'] =>
  ['avgCompletionDays', 'overdueRate', 'gapCreatedCount'].includes(metric) ? 'lte' : 'gte';

const metricUnit = (metric: MosqueImprovementGoal['metricKey']) => {
  if (metric === 'avgCompletionDays') return ' يوم';
  if (metric === 'gapCreatedCount') return '';
  if (metric === 'kpiScore') return '/100';
  return '%';
};

const formatMetric = (metric: MosqueImprovementGoal['metricKey'], value?: number | null) =>
  value == null ? '—' : `${Number(value).toFixed(Number.isInteger(Number(value)) ? 0 : 1)}${metricUnit(metric)}`;

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const defaultDueDate = (year: number) => `${year}-12-31`;

const emptyForm = (year: number): GoalForm => ({
  title: '',
  category: 'unit_metric',
  metricKey: 'completionRate',
  baselineValue: '',
  targetValue: '90',
  targetDirection: 'gte',
  sourceMonth: '',
  sourceSnapshotId: '',
  assigneeUserId: '',
  assigneeName: '',
  gapKey: '',
  ownerUserId: '',
  dueDate: defaultDueDate(year),
  notes: '',
  status: 'draft',
  correctiveActions: [],
});

export const MosqueImprovementGoalsCenter: React.FC<MosqueImprovementGoalsCenterProps> = ({
  role,
  currentUsername,
}) => {
  const canManage = role === 'head';
  const [year, setYear] = useState(currentRiyadhYear());
  const [goals, setGoals] = useState<MosqueImprovementGoal[]>([]);
  const [assignees, setAssignees] = useState<MosqueCompletionTaskAssignee[]>([]);
  const [suggestions, setSuggestions] = useState<MosqueImprovementGoalSuggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | MosqueImprovementGoal['status']>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<MosqueImprovementGoal | null>(null);
  const [form, setForm] = useState<GoalForm>(() => emptyForm(currentRiyadhYear()));
  const [saving, setSaving] = useState(false);

  const [evidenceDialogOpen, setEvidenceDialogOpen] = useState(false);
  const [evidenceGoal, setEvidenceGoal] = useState<MosqueImprovementGoal | null>(null);
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [evidenceItems, setEvidenceItems] = useState<MosqueImprovementEvidenceItem[]>([]);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceSaving, setEvidenceSaving] = useState(false);

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewGoal, setReviewGoal] = useState<MosqueImprovementGoal | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);

  const load = async (selectedYear = year) => {
    setLoading(true);
    try {
      const [goalRows, ownerRows, suggestionRows] = await Promise.all([
        mosqueApi.improvementGoals({ year: selectedYear }),
        mosqueApi.improvementGoalAssignees(),
        mosqueApi.improvementGoalSuggestions(selectedYear),
      ]);
      setGoals(goalRows || []);
      setAssignees(ownerRows || []);
      setSuggestions(suggestionRows);
    } catch (error) {
      setGoals([]);
      setSuggestions(null);
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل خطة التحسين السنوية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(year);
  }, [year]);

  const summary = useMemo(() => {
    const measurable = goals.filter((goal) => ['active', 'at_risk', 'achieved', 'evidence_review', 'closed'].includes(goal.status));
    const performanceProgress = measurable.length
      ? Math.round(measurable.reduce((sum, goal) => sum + (goal.progressPercent || 0), 0) / measurable.length)
      : 0;
    const actionProgress = measurable.length
      ? Math.round(measurable.reduce((sum, goal) => sum + (goal.actionProgressPercent || 0), 0) / measurable.length)
      : 0;

    return {
      total: goals.length,
      active: goals.filter((goal) => goal.status === 'active').length,
      atRisk: goals.filter((goal) => goal.status === 'at_risk').length,
      achieved: goals.filter((goal) => goal.status === 'achieved').length,
      evidenceReview: goals.filter((goal) => goal.status === 'evidence_review').length,
      closed: goals.filter((goal) => goal.status === 'closed').length,
      performanceProgress,
      actionProgress,
    };
  }, [goals]);

  const visibleGoals = useMemo(
    () => goals.filter((goal) => statusFilter === 'all' || goal.status === statusFilter),
    [goals, statusFilter]
  );

  const availableSuggestions = useMemo(
    () => (suggestions?.suggestions || []).filter((item) => !item.alreadyExists),
    [suggestions]
  );

  const openNewGoal = (suggestion?: MosqueImprovementGoalSuggestion) => {
    setEditingGoal(null);
    if (suggestion) {
      setForm({
        ...emptyForm(year),
        title: suggestion.title.replace(/identity|gender|building|location|coordinates|area|capacity|contact|photos|documents|women_verification|women_details|visit/g, (key) => missingLabels[key] || key),
        category: suggestion.category,
        metricKey: suggestion.metricKey,
        baselineValue: String(suggestion.baselineValue),
        targetValue: String(suggestion.targetValue),
        targetDirection: suggestion.targetDirection,
        sourceMonth: suggestion.sourceMonth,
        sourceSnapshotId: suggestion.sourceSnapshotId,
        assigneeUserId: suggestion.assigneeUserId || '',
        assigneeName: suggestion.assigneeName || '',
        gapKey: suggestion.gapKey || '',
        dueDate: defaultDueDate(year),
        correctiveActions: [
          {
            id: crypto.randomUUID(),
            title: 'تحليل سبب الفجوة ووضع الإجراء التصحيحي',
            status: 'planned',
            dueDate: '',
            note: '',
          },
        ],
      });
    } else {
      setForm({
        ...emptyForm(year),
        sourceMonth: suggestions?.sourceSnapshot?.month || '',
        sourceSnapshotId: suggestions?.sourceSnapshot?.id || '',
      });
    }
    setDialogOpen(true);
  };

  const openEditGoal = (goal: MosqueImprovementGoal) => {
    setEditingGoal(goal);
    setForm({
      title: goal.title,
      category: goal.category,
      metricKey: goal.metricKey,
      baselineValue: String(goal.baselineValue),
      targetValue: String(goal.targetValue),
      targetDirection: goal.targetDirection,
      sourceMonth: goal.sourceMonth || '',
      sourceSnapshotId: goal.sourceSnapshotId || '',
      assigneeUserId: goal.assigneeUserId || '',
      assigneeName: goal.assigneeName || '',
      gapKey: goal.gapKey || '',
      ownerUserId: goal.ownerUserId || '',
      dueDate: goal.dueDate ? String(goal.dueDate).slice(0, 10) : '',
      notes: goal.notes || '',
      status: goal.status === 'draft' ? 'draft' : 'active',
      correctiveActions: Array.isArray(goal.correctiveActions) ? goal.correctiveActions.map((action) => ({ ...action })) : [],
    });
    setDialogOpen(true);
  };

  const setMetricKey = (metricKey: MosqueImprovementGoal['metricKey']) => {
    const direction = directionForMetric(metricKey);
    setForm((current) => ({
      ...current,
      metricKey,
      targetDirection: direction,
      targetValue: metricKey === 'avgCompletionDays' ? '5'
        : metricKey === 'overdueRate' ? '10'
          : metricKey === 'kpiScore' ? '80'
            : metricKey === 'gapCreatedCount' ? '0'
              : '90',
    }));
  };

  const setCategory = (category: MosqueImprovementGoal['category']) => {
    const metricKey = category === 'gap_reduction' ? 'gapCreatedCount' : 'completionRate';
    setForm((current) => ({
      ...current,
      category,
      metricKey,
      targetDirection: directionForMetric(metricKey),
      targetValue: category === 'gap_reduction' ? '0' : '90',
      assigneeUserId: category === 'assignee_metric' ? current.assigneeUserId : '',
      assigneeName: category === 'assignee_metric' ? current.assigneeName : '',
      gapKey: category === 'gap_reduction' ? current.gapKey : '',
    }));
  };

  const addAction = () => {
    setForm((current) => ({
      ...current,
      correctiveActions: [
        ...current.correctiveActions,
        {
          id: crypto.randomUUID(),
          title: '',
          status: 'planned',
          dueDate: '',
          note: '',
        },
      ],
    }));
  };

  const updateAction = (index: number, patch: Partial<MosqueImprovementAction>) => {
    setForm((current) => ({
      ...current,
      correctiveActions: current.correctiveActions.map((action, actionIndex) =>
        actionIndex === index ? { ...action, ...patch } : action
      ),
    }));
  };

  const removeAction = (index: number) => {
    setForm((current) => ({
      ...current,
      correctiveActions: current.correctiveActions.filter((_, actionIndex) => actionIndex !== index),
    }));
  };

  const saveGoal = async () => {
    if (!form.title.trim()) {
      toast.error('عنوان هدف التحسين مطلوب');
      return;
    }
    if (!form.baselineValue || !form.targetValue) {
      toast.error('قيمة خط الأساس والقيمة المستهدفة مطلوبتان');
      return;
    }
    if (form.category === 'assignee_metric' && !form.assigneeUserId && !form.assigneeName.trim()) {
      toast.error('حدد المسؤول المستهدف');
      return;
    }
    if (form.category === 'gap_reduction' && !form.gapKey) {
      toast.error('حدد نوع النقص المراد خفضه');
      return;
    }
    if (form.correctiveActions.some((action) => !action.title.trim())) {
      toast.error('أكمل عناوين الإجراءات التصحيحية أو احذف الإجراء الفارغ');
      return;
    }

    setSaving(true);
    try {
      if (editingGoal) {
        const isSupervisor = role === 'supervisor';
        const closureStage = editingGoal.status === 'achieved';
        const payload = isSupervisor || closureStage
          ? {
              notes: form.notes || null,
              correctiveActions: form.correctiveActions,
            }
          : {
              title: form.title,
              targetValue: Number(form.targetValue),
              ownerUserId: form.ownerUserId || null,
              dueDate: form.dueDate || null,
              notes: form.notes || null,
              correctiveActions: form.correctiveActions,
            };
        await mosqueApi.updateImprovementGoal(editingGoal.id, payload);
        toast.success('تم تحديث هدف التحسين');
      } else {
        await mosqueApi.createImprovementGoal({
          year,
          title: form.title,
          category: form.category,
          metricKey: form.metricKey,
          baselineValue: Number(form.baselineValue),
          targetValue: Number(form.targetValue),
          targetDirection: form.targetDirection,
          sourceMonth: form.sourceMonth || null,
          sourceSnapshotId: form.sourceSnapshotId || null,
          assigneeUserId: form.assigneeUserId || null,
          assigneeName: form.assigneeName || null,
          gapKey: form.gapKey || null,
          ownerUserId: form.ownerUserId || null,
          dueDate: form.dueDate || null,
          notes: form.notes || null,
          correctiveActions: form.correctiveActions,
          status: form.status,
        });
        toast.success('تم إنشاء هدف التحسين');
      }
      setDialogOpen(false);
      await load(year);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ هدف التحسين');
    } finally {
      setSaving(false);
    }
  };

  const transitionGoal = async (goal: MosqueImprovementGoal, status: MosqueImprovementGoal['status']) => {
    const confirmation = status === 'cancelled'
      ? 'هل تريد إلغاء هدف التحسين؟ سيبقى محفوظًا في السجل.'
      : null;
    if (confirmation && !window.confirm(confirmation)) return;

    try {
      await mosqueApi.updateImprovementGoal(goal.id, { status });
      toast.success(status === 'active' ? 'تم تفعيل هدف التحسين' : 'تم إلغاء الهدف');
      await load(year);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث حالة الهدف');
    }
  };

  const openEvidenceDialog = (goal: MosqueImprovementGoal) => {
    setEvidenceGoal(goal);
    setEvidenceSummary(goal.closureSummary || '');
    setEvidenceItems(Array.isArray(goal.closureEvidence) ? goal.closureEvidence.map((item) => ({ ...item })) : []);
    setEvidenceFiles([]);
    setEvidenceDialogOpen(true);
  };

  const openReviewDialog = (goal: MosqueImprovementGoal) => {
    setReviewGoal(goal);
    setReviewNote(goal.evidenceReviewNote || '');
    setReviewDialogOpen(true);
  };

  const submitEvidence = async () => {
    if (!evidenceGoal) return;
    if (evidenceSummary.trim().length < 10) {
      toast.error('اكتب ملخصًا واضحًا لنتيجة التنفيذ بما لا يقل عن 10 أحرف');
      return;
    }
    if (evidenceItems.length + evidenceFiles.length < 1) {
      toast.error('يلزم إرفاق صورة أو مستند واحد على الأقل');
      return;
    }
    if (evidenceItems.length + evidenceFiles.length > 20) {
      toast.error('الحد الأعلى لإثباتات الإغلاق هو 20 ملفًا');
      return;
    }

    setEvidenceSaving(true);
    const uploadedFileIds: string[] = [];
    try {
      const uploadedItems: MosqueImprovementEvidenceItem[] = [];
      for (const file of evidenceFiles) {
        const uploaded = await mosqueApi.upload(file);
        if (uploaded.driveFileId) uploadedFileIds.push(uploaded.driveFileId);
        uploadedItems.push({
          url: uploaded.driveUrl,
          fileId: uploaded.driveFileId || null,
          fileName: file.name || uploaded.fileName || null,
          mimeType: uploaded.mimeType || file.type || null,
          kind: String(uploaded.mimeType || file.type || '').startsWith('image/') ? 'image' : 'document',
        });
      }

      await mosqueApi.submitImprovementGoalEvidence(evidenceGoal.id, {
        summary: evidenceSummary.trim(),
        evidence: [...evidenceItems, ...uploadedItems],
      });
      toast.success('تم إرسال إثبات الإغلاق لرئيس الوحدة للمراجعة');
      setEvidenceDialogOpen(false);
      await load(year);
    } catch (error) {
      for (const fileId of uploadedFileIds.reverse()) {
        try { await mosqueApi.deleteUpload(fileId); } catch { /* best-effort cleanup */ }
      }
      toast.error(error instanceof Error ? error.message : 'تعذر إرسال إثبات الإغلاق');
    } finally {
      setEvidenceSaving(false);
    }
  };

  const reviewEvidence = async (decision: 'approve' | 'return') => {
    if (!reviewGoal) return;
    if (decision === 'return' && !reviewNote.trim()) {
      toast.error('اكتب ملاحظة توضح ما يلزم استكماله');
      return;
    }
    if (decision === 'approve' && !window.confirm('اعتماد الأدلة وإغلاق الهدف نهائيًا؟')) return;

    setReviewSaving(true);
    try {
      await mosqueApi.reviewImprovementGoalEvidence(reviewGoal.id, decision, reviewNote.trim() || undefined);
      toast.success(decision === 'approve' ? 'تم اعتماد الأدلة وإغلاق الهدف' : 'تمت إعادة الإثبات للاستكمال');
      setReviewDialogOpen(false);
      await load(year);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر اعتماد قرار مراجعة الإثبات');
    } finally {
      setReviewSaving(false);
    }
  };

  const evaluateGoals = async () => {
    setEvaluating(true);
    try {
      const updated = await mosqueApi.evaluateImprovementGoals(year);
      setGoals(updated || []);
      const suggestionRows = await mosqueApi.improvementGoalSuggestions(year);
      setSuggestions(suggestionRows);
      toast.success('تم تحديث قياس الأهداف من أحدث النتائج الرسمية');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث قياس الأهداف');
    } finally {
      setEvaluating(false);
    }
  };

  const exportPlan = () => {
    if (!goals.length) {
      toast.error('لا توجد أهداف لتصديرها');
      return;
    }

    const goalRows = goals.map((goal, index) => ({
      'م': index + 1,
      'رقم الهدف': goal.goalNumber,
      'السنة': goal.year,
      'الهدف': goal.title,
      'الفئة': categoryLabel[goal.category],
      'المؤشر': metricLabel[goal.metricKey],
      'خط الأساس': formatMetric(goal.metricKey, goal.baselineValue),
      'المستهدف': formatMetric(goal.metricKey, goal.targetValue),
      'القيمة الحالية': formatMetric(goal.metricKey, goal.currentValue),
      'شهر آخر قياس': goal.currentMonth || '',
      'تقدم المؤشر': goal.progressPercent + '%',
      'تقدم الإجراءات': goal.actionProgressPercent + '%',
      'الحالة': statusLabel[goal.status],
      'المسؤول عن الهدف': goal.ownerName || '',
      'المسؤول المستهدف': goal.assigneeName || '',
      'نوع النقص': goal.gapKey ? (missingLabels[goal.gapKey] || goal.gapKey) : '',
      'تاريخ الاستحقاق': formatDate(goal.dueDate),
      'ملاحظة القياس': goal.measurementNote || '',
      'حالة الإثبات': goal.evidenceStatus || 'not_submitted',
      'ملخص الإغلاق': goal.closureSummary || '',
      'عدد المرفقات': Array.isArray(goal.closureEvidence) ? goal.closureEvidence.length : 0,
      'رافع الإثبات': goal.evidenceSubmittedName || '',
      'تاريخ رفع الإثبات': formatDate(goal.evidenceSubmittedAt),
      'مراجع الإثبات': goal.evidenceReviewedName || '',
      'تاريخ المراجعة': formatDate(goal.evidenceReviewedAt),
      'ملاحظة المراجعة': goal.evidenceReviewNote || '',
      'ملاحظات': goal.notes || '',
    }));

    const actionRows = goals.flatMap((goal) =>
      (Array.isArray(goal.correctiveActions) ? goal.correctiveActions : []).map((action, index) => ({
        'رقم الهدف': goal.goalNumber,
        'الهدف': goal.title,
        'م': index + 1,
        'الإجراء التصحيحي': action.title,
        'حالة الإجراء': actionStatusLabel[action.status],
        'موعد الإجراء': action.dueDate || '',
        'ملاحظة': action.note || '',
      }))
    );

    const evidenceRows = goals.flatMap((goal) =>
      (Array.isArray(goal.closureEvidence) ? goal.closureEvidence : []).map((item, index) => ({
        'رقم الهدف': goal.goalNumber,
        'الهدف': goal.title,
        'م': index + 1,
        'نوع الإثبات': item.kind === 'image' ? 'صورة' : 'مستند',
        'اسم الملف': item.fileName || '',
        'نوع الملف': item.mimeType || '',
        'الرابط': item.url,
        'تاريخ الرفع': item.submittedAt ? formatDate(item.submittedAt) : formatDate(goal.evidenceSubmittedAt),
        'رافع الإثبات': goal.evidenceSubmittedName || '',
        'حالة المراجعة': goal.evidenceStatus || '',
        'ملاحظة المراجعة': goal.evidenceReviewNote || '',
      }))
    );

    const summaryRows = [
      ['التقرير', 'خطة التحسين السنوية لمؤشرات بيانات المساجد والمصليات'],
      ['السنة', year],
      ['تاريخ الاستخراج', new Date().toLocaleString('ar-SA')],
      [],
      ['إجمالي الأهداف', summary.total],
      ['قيد التنفيذ', summary.active],
      ['معرضة للتعثر', summary.atRisk],
      ['متحققة وتنتظر الإثبات', summary.achieved],
      ['إثباتات قيد المراجعة', summary.evidenceReview],
      ['مغلقة بعد اعتماد الإثبات', summary.closed],
      ['متوسط تقدم المؤشرات', summary.performanceProgress + '%'],
      ['متوسط تقدم الإجراءات', summary.actionProgress + '%'],
    ];

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    const goalsSheet = XLSX.utils.json_to_sheet(goalRows);
    const actionsSheet = XLSX.utils.json_to_sheet(actionRows);
    const evidenceSheet = XLSX.utils.json_to_sheet(evidenceRows);

    for (const sheet of [summarySheet, goalsSheet, actionsSheet, evidenceSheet]) {
      (sheet as any)['!views'] = [{ RTL: true }];
    }
    (summarySheet as any)['!cols'] = [{ wch: 34 }, { wch: 28 }];
    (goalsSheet as any)['!cols'] = Array.from({ length: 28 }, () => ({ wch: 22 }));
    (actionsSheet as any)['!cols'] = [{ wch: 18 }, { wch: 36 }, { wch: 6 }, { wch: 48 }, { wch: 18 }, { wch: 18 }, { wch: 36 }];
    (evidenceSheet as any)['!cols'] = [{ wch: 18 }, { wch: 36 }, { wch: 6 }, { wch: 14 }, { wch: 34 }, { wch: 24 }, { wch: 48 }, { wch: 18 }, { wch: 24 }, { wch: 18 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص');
    XLSX.utils.book_append_sheet(workbook, goalsSheet, 'الأهداف');
    XLSX.utils.book_append_sheet(workbook, actionsSheet, 'الإجراءات التصحيحية');
    XLSX.utils.book_append_sheet(workbook, evidenceSheet, 'أدلة الإغلاق');
    XLSX.writeFile(workbook, `IAU_Mosques_Improvement_Plan_${year}.xlsx`);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
        <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]">الإجراءات التصحيحية والتحسين المستمر</Badge>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl">
                <Target className="h-5 w-5" />
                الأهداف وخطة التحسين السنوية
              </CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-6">
                تحويل نتائج KPI والفجوات إلى أهداف قابلة للقياس، وإسنادها ومتابعة الإجراءات التصحيحية وقياس تحقق التحسن من النتائج الرسمية اللاحقة.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <NativeSelect className="h-10 min-w-[135px] bg-white" value={String(year)} onChange={(event) => setYear(Number(event.target.value))}>
                {Array.from({ length: 5 }, (_, index) => currentRiyadhYear() - 2 + index).map((item) => <option key={item} value={item}>{item}</option>)}
              </NativeSelect>
              <Button variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={evaluateGoals} disabled={evaluating || loading}>
                <RefreshCw className={evaluating ? 'ml-2 h-4 w-4 animate-spin' : 'ml-2 h-4 w-4'} />
                تحديث القياس
              </Button>
              <Button variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800" onClick={exportPlan} disabled={!goals.length}>
                <FileSpreadsheet className="ml-2 h-4 w-4" />
                تصدير الخطة
              </Button>
              {canManage && (
                <Button className="bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => openNewGoal()}>
                  <Plus className="ml-2 h-4 w-4" />
                  هدف جديد
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <SummaryMetric label="إجمالي الأهداف" value={summary.total} icon={Flag} />
            <SummaryMetric label="قيد التنفيذ" value={summary.active} icon={TrendingUp} />
            <SummaryMetric label="معرضة للتعثر" value={summary.atRisk} icon={AlertTriangle} tone={summary.atRisk ? 'danger' : 'normal'} />
            <SummaryMetric label="تنتظر إثبات الإغلاق" value={summary.achieved} icon={Upload} />
            <SummaryMetric label="إثبات قيد المراجعة" value={summary.evidenceReview} icon={FileCheck2} />
            <SummaryMetric label="مغلقة ومعتمدة" value={summary.closed} icon={ShieldCheck} />
          </div>

          {availableSuggestions.length > 0 && (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50/60 p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-amber-900">
                    <Lightbulb className="h-4 w-4" />
                    أهداف تحسين مقترحة آليًا
                  </p>
                  <p className="mt-1 text-[11px] leading-5 text-amber-800">
                    مبنية على آخر نتيجة KPI رسمية{suggestions?.sourceSnapshot?.month ? ` لشهر ${suggestions.sourceSnapshot.month}` : ''}.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-amber-300 bg-white text-amber-800">{availableSuggestions.length} مقترح</Badge>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {availableSuggestions.map((suggestion, index) => (
                  <div key={`${suggestion.category}-${suggestion.metricKey}-${suggestion.gapKey || suggestion.assigneeUserId || index}`} className="rounded-2xl border border-amber-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">{categoryLabel[suggestion.category]}</Badge>
                        <p className="mt-2 text-sm font-black text-slate-800">{suggestion.title.replace(/identity|gender|building|location|coordinates|area|capacity|contact|photos|documents|women_verification|women_details|visit/g, (key) => missingLabels[key] || key)}</p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {metricLabel[suggestion.metricKey]}: {formatMetric(suggestion.metricKey, suggestion.baselineValue)} ← {formatMetric(suggestion.metricKey, suggestion.targetValue)}
                        </p>
                      </div>
                      {canManage && (
                        <Button size="sm" variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-900" onClick={() => openNewGoal(suggestion)}>
                          تحويل إلى هدف
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-slate-800">سجل أهداف التحسين</p>
              <p className="mt-1 text-[11px] text-slate-500">تقدم المؤشر يقاس من نتائج KPI الرسمية، بينما تقدم الإجراءات يعكس تنفيذ الخطة التصحيحية.</p>
            </div>
            <NativeSelect className="h-10 min-w-[190px] bg-white" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">جميع الحالات</option>
              <option value="draft">مسودة</option>
              <option value="active">قيد التنفيذ</option>
              <option value="at_risk">معرض للتعثر</option>
              <option value="achieved">متحقق — بانتظار الإثبات</option>
              <option value="evidence_review">إثبات قيد المراجعة</option>
              <option value="closed">مغلق ومعتمد</option>
              <option value="cancelled">ملغى</option>
            </NativeSelect>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center text-sm font-bold text-slate-500">
              <RefreshCw className="ml-2 h-5 w-5 animate-spin" />
              جاري تحميل خطة التحسين...
            </div>
          ) : visibleGoals.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <Target className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-600">لا توجد أهداف تحسين ضمن التصفية الحالية.</p>
              {canManage && <Button className="mt-4 bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={() => openNewGoal()}><Plus className="ml-2 h-4 w-4" />إنشاء أول هدف</Button>}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleGoals.map((goal) => {
                const actions = Array.isArray(goal.correctiveActions) ? goal.correctiveActions : [];
                const isOwner = role === 'supervisor' && goal.ownerName === currentUsername;
                const canEditThis = (canManage || isOwner) && !['evidence_review', 'closed', 'cancelled'].includes(goal.status);
                const canSubmitEvidence = canManage || isOwner;
                const evidence = Array.isArray(goal.closureEvidence) ? goal.closureEvidence : [];
                return (
                  <div key={goal.id} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={statusClass[goal.status]}>{statusLabel[goal.status]}</Badge>
                          <Badge variant="outline" className="border-[#d9c9a5] bg-[#fffdf8] text-[#0b4a3f]">{categoryLabel[goal.category]}</Badge>
                          <span className="text-[10px] font-black text-slate-400">{goal.goalNumber}</span>
                        </div>
                        <h3 className="mt-2 text-base font-black text-slate-900">{goal.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-slate-500">
                          <span>المؤشر: <strong className="text-slate-700">{metricLabel[goal.metricKey]}</strong></span>
                          <span>المسؤول: <strong className="text-slate-700">{goal.ownerName || 'غير مسند'}</strong></span>
                          <span>الاستحقاق: <strong className="text-slate-700">{formatDate(goal.dueDate)}</strong></span>
                          <span>آخر قياس: <strong className="text-slate-700">{goal.currentMonth || 'لم يقس بعد'}</strong></span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {canEditThis && (
                          <Button size="sm" variant="outline" className="border-slate-200 bg-white" onClick={() => openEditGoal(goal)}>
                            <Pencil className="ml-1 h-3.5 w-3.5" />
                            {goal.status === 'achieved' ? 'استكمال الإجراءات' : canManage ? 'إدارة الهدف' : 'تحديث الإجراءات'}
                          </Button>
                        )}
                        {canManage && goal.status === 'draft' && (
                          <Button size="sm" className="bg-sky-700 text-white hover:bg-sky-800" onClick={() => void transitionGoal(goal, 'active')}>
                            بدء التنفيذ
                          </Button>
                        )}
                        {canManage && ['active', 'at_risk'].includes(goal.status) && (
                          <Button size="sm" variant="outline" className="border-rose-200 bg-rose-50 text-rose-800" onClick={() => void transitionGoal(goal, 'cancelled')}>
                            إلغاء
                          </Button>
                        )}
                        {goal.status === 'achieved' && canSubmitEvidence && (
                          <Button
                            size="sm"
                            className="bg-emerald-700 text-white hover:bg-emerald-800"
                            onClick={() => openEvidenceDialog(goal)}
                            disabled={actions.length > 0 && goal.actionProgressPercent < 100}
                            title={actions.length > 0 && goal.actionProgressPercent < 100 ? 'أكمل جميع الإجراءات التصحيحية أولًا' : undefined}
                          >
                            <Upload className="ml-1 h-3.5 w-3.5" />
                            {goal.evidenceStatus === 'returned' ? 'إعادة رفع الإثبات' : 'رفع إثبات الإغلاق'}
                          </Button>
                        )}
                        {goal.status === 'evidence_review' && (
                          <Button
                            size="sm"
                            className={canManage ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-slate-700 text-white hover:bg-slate-800'}
                            onClick={() => openReviewDialog(goal)}
                          >
                            <FileCheck2 className="ml-1 h-3.5 w-3.5" />
                            {canManage ? 'مراجعة الإثبات' : 'عرض الإثبات'}
                          </Button>
                        )}
                        {goal.status === 'closed' && (
                          <Button size="sm" variant="outline" className="border-violet-200 bg-violet-50 text-violet-800" onClick={() => openReviewDialog(goal)}>
                            <ShieldCheck className="ml-1 h-3.5 w-3.5" />
                            ملف الإغلاق
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_260px]">
                      <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-black text-slate-600">تقدم المؤشر</p>
                          <strong className="text-sm font-black text-[#0b4a3f]">{goal.progressPercent}%</strong>
                        </div>
                        <Progress value={goal.progressPercent} className="mt-2 h-2" />
                        <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
                          <span>الأساس: {formatMetric(goal.metricKey, goal.baselineValue)}</span>
                          <span>الحالي: {formatMetric(goal.metricKey, goal.currentValue)}</span>
                          <span>المستهدف: {formatMetric(goal.metricKey, goal.targetValue)}</span>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-black text-slate-600">تنفيذ الإجراءات التصحيحية</p>
                          <strong className="text-sm font-black text-[#0b4a3f]">{goal.actionProgressPercent}%</strong>
                        </div>
                        <Progress value={goal.actionProgressPercent} className="mt-2 h-2" />
                        <p className="mt-2 text-[10px] font-bold text-slate-400">{actions.filter((action) => action.status === 'completed').length} من {actions.length} إجراء مكتمل</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-[10px] font-black text-slate-400">حالة القياس</p>
                        <p className="mt-2 text-[11px] font-bold leading-5 text-slate-600">{goal.measurementNote || 'لم يتم القياس من نتيجة رسمية بعد.'}</p>
                      </div>
                    </div>

                    {['achieved', 'evidence_review', 'closed'].includes(goal.status) && (
                      <div className={`mt-3 rounded-2xl border p-3 ${goal.status === 'closed' ? 'border-violet-200 bg-violet-50/50' : goal.status === 'evidence_review' ? 'border-amber-200 bg-amber-50/50' : 'border-emerald-200 bg-emerald-50/40'}`}>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="flex items-center gap-2 text-[11px] font-black text-slate-700">
                              <FileCheck2 className="h-4 w-4" />
                              حوكمة إثبات الإغلاق
                            </p>
                            <p className="mt-1 text-[10px] leading-5 text-slate-500">
                              {goal.status === 'closed'
                                ? `اعتمد الإغلاق بواسطة ${goal.evidenceReviewedName || 'رئيس الوحدة'} بتاريخ ${formatDate(goal.evidenceReviewedAt || goal.closedAt)}.`
                                : goal.status === 'evidence_review'
                                  ? `تم رفع ${evidence.length} مرفق/مرفقات بواسطة ${goal.evidenceSubmittedName || 'المسؤول'} بتاريخ ${formatDate(goal.evidenceSubmittedAt)} وهي بانتظار قرار رئيس الوحدة.`
                                  : goal.evidenceStatus === 'returned'
                                    ? `أعيد الإثبات للاستكمال: ${goal.evidenceReviewNote || 'يرجى استكمال متطلبات الإثبات'}`
                                    : 'تحقق المستهدف رقميًا، ولا يكتمل الإغلاق الإداري قبل رفع واعتماد أدلة التنفيذ.'}
                            </p>
                          </div>
                          {evidence.length > 0 && goal.status === 'achieved' && (
                            <Button size="sm" variant="outline" className="shrink-0 border-slate-200 bg-white" onClick={() => openReviewDialog(goal)}>
                              <FileText className="ml-1 h-3.5 w-3.5" />
                              عرض الإثبات السابق
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {actions.length > 0 && (
                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {actions.slice(0, 6).map((action) => (
                          <div key={action.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-black text-slate-700">{action.title}</p>
                              <p className="mt-0.5 text-[9px] text-slate-400">{action.dueDate || 'بدون موعد فرعي'}</p>
                            </div>
                            <Badge variant="outline" className={action.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : action.status === 'in_progress' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-600'}>
                              {actionStatusLabel[action.status]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-hidden p-0 sm:max-w-[980px]" dir="rtl">
          <DialogHeader className="border-b border-slate-200 bg-[#fffdf8] p-5 text-right">
            <DialogTitle className="text-xl font-black text-[#0b4a3f]">{editingGoal ? 'إدارة هدف التحسين' : 'إنشاء هدف تحسين'}</DialogTitle>
            <DialogDescription>
              {editingGoal
                ? 'حدّث المسؤول والمستهدف والخطة التصحيحية. القياس الفعلي يحدث من نتائج KPI الرسمية.'
                : 'حدد خط الأساس والمستهدف والمسؤول وخطة الإجراءات التصحيحية.'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto p-4 md:p-5">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-black text-slate-600">عنوان الهدف</span>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} disabled={Boolean(editingGoal && !canManage)} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-600">الفئة</span>
                <NativeSelect value={form.category} onChange={(event) => setCategory(event.target.value as GoalForm['category'])} disabled={Boolean(editingGoal) || !canManage}>
                  <option value="unit_metric">مؤشر الوحدة</option>
                  <option value="assignee_metric">أداء مسؤول</option>
                  <option value="gap_reduction">خفض نوع نقص</option>
                </NativeSelect>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-600">المؤشر</span>
                <NativeSelect value={form.metricKey} onChange={(event) => setMetricKey(event.target.value as GoalForm['metricKey'])} disabled={Boolean(editingGoal) || !canManage}>
                  {form.category !== 'gap_reduction' && <>
                    <option value="completionRate">نسبة الإنجاز</option>
                    <option value="onTimeRate">الالتزام بالمواعيد</option>
                    <option value="avgCompletionDays">متوسط مدة الإنجاز</option>
                    <option value="overdueRate">نسبة التأخير</option>
                    <option value="kpiScore">درجة KPI</option>
                  </>}
                  {form.category === 'gap_reduction' && <option value="gapCreatedCount">عدد حالات النقص الجديدة</option>}
                </NativeSelect>
              </label>

              {form.category === 'assignee_metric' && (
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-black text-slate-600">المسؤول المستهدف بتحسين الأداء</span>
                  <NativeSelect
                    value={form.assigneeUserId}
                    onChange={(event) => {
                      const selected = assignees.find((item) => item.id === event.target.value);
                      setForm((current) => ({ ...current, assigneeUserId: event.target.value, assigneeName: selected?.username || current.assigneeName }));
                    }}
                    disabled={Boolean(editingGoal) || !canManage}
                  >
                    <option value="">اختر المسؤول</option>
                    {assignees.map((item) => <option key={item.id} value={item.id}>{item.username}</option>)}
                  </NativeSelect>
                </label>
              )}

              {form.category === 'gap_reduction' && (
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-black text-slate-600">نوع النقص</span>
                  <NativeSelect value={form.gapKey} onChange={(event) => setForm((current) => ({ ...current, gapKey: event.target.value }))} disabled={Boolean(editingGoal) || !canManage}>
                    <option value="">اختر نوع النقص</option>
                    {Object.entries(missingLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                  </NativeSelect>
                </label>
              )}

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-600">قيمة خط الأساس</span>
                <Input type="number" step="0.1" value={form.baselineValue} onChange={(event) => setForm((current) => ({ ...current, baselineValue: event.target.value }))} disabled={Boolean(editingGoal) || !canManage} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-600">القيمة المستهدفة</span>
                <Input type="number" step="0.1" value={form.targetValue} onChange={(event) => setForm((current) => ({ ...current, targetValue: event.target.value }))} disabled={!canManage} />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-600">مسؤول تنفيذ الهدف</span>
                <NativeSelect value={form.ownerUserId} onChange={(event) => setForm((current) => ({ ...current, ownerUserId: event.target.value }))} disabled={!canManage}>
                  <option value="">غير مسند</option>
                  {assignees.map((item) => <option key={item.id} value={item.id}>{item.username} — {item.moduleRole === 'head' ? 'رئيس الوحدة' : 'مشرف'}</option>)}
                </NativeSelect>
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-black text-slate-600">تاريخ الاستحقاق</span>
                <Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} disabled={!canManage} />
              </label>

              {!editingGoal && (
                <label className="space-y-1.5">
                  <span className="text-xs font-black text-slate-600">الحالة عند الإنشاء</span>
                  <NativeSelect value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as 'draft' | 'active' }))}>
                    <option value="draft">مسودة</option>
                    <option value="active">بدء التنفيذ مباشرة</option>
                  </NativeSelect>
                </label>
              )}

              <label className="space-y-1.5 md:col-span-2">
                <span className="text-xs font-black text-slate-600">ملاحظات الهدف</span>
                <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="مبررات الهدف، منهجية المتابعة، أو أي ضوابط إضافية..." />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-[#fbfcfd] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-slate-800"><ListChecks className="h-4 w-4" />الإجراءات التصحيحية</p>
                  <p className="mt-1 text-[11px] text-slate-500">يحسب تقدم الخطة من نسبة الإجراءات المكتملة.</p>
                </div>
                <Button size="sm" variant="outline" className="border-[#d9c9a5] bg-white text-[#0b4a3f]" onClick={addAction}>
                  <Plus className="ml-1 h-3.5 w-3.5" />
                  إضافة إجراء
                </Button>
              </div>

              <div className="mt-4 space-y-3">
                {form.correctiveActions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-xs font-bold text-slate-400">لم تضف إجراءات تصحيحية بعد.</p>
                ) : form.correctiveActions.map((action, index) => (
                  <div key={action.id || index} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(240px,1fr)_150px_150px_42px]">
                    <Input value={action.title} onChange={(event) => updateAction(index, { title: event.target.value })} placeholder="الإجراء التصحيحي" />
                    <NativeSelect value={action.status} onChange={(event) => updateAction(index, { status: event.target.value as MosqueImprovementAction['status'] })}>
                      <option value="planned">مخطط</option>
                      <option value="in_progress">قيد التنفيذ</option>
                      <option value="completed">مكتمل</option>
                    </NativeSelect>
                    <Input type="date" value={action.dueDate || ''} onChange={(event) => updateAction(index, { dueDate: event.target.value })} />
                    <Button type="button" variant="ghost" size="icon" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => removeAction(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {editingGoal && (
              <div className="grid gap-3 md:grid-cols-3">
                <InfoBox label="تقدم المؤشر" value={`${editingGoal.progressPercent}%`} icon={Gauge} />
                <InfoBox label="تقدم الإجراءات" value={`${editingGoal.actionProgressPercent}%`} icon={ClipboardCheck} />
                <InfoBox label="آخر قياس رسمي" value={editingGoal.currentMonth || 'لم يقس'} icon={UserRoundCheck} />
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-200 bg-white p-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={saveGoal} disabled={saving}>
              {saving ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="ml-2 h-4 w-4" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SummaryMetric = ({
  label,
  value,
  suffix = '',
  icon: Icon,
  tone = 'normal',
}: {
  label: string;
  value: number | string;
  suffix?: string;
  icon: React.ElementType;
  tone?: 'normal' | 'danger';
}) => (
  <div className={`rounded-2xl border p-3 shadow-sm ${tone === 'danger' ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-center justify-between gap-2">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${tone === 'danger' ? 'bg-white text-rose-700' : 'bg-[#e8f5f2] text-[#006b63]'}`}><Icon className="h-4 w-4" /></span>
      <strong className={`text-xl font-black ${tone === 'danger' ? 'text-rose-800' : 'text-[#0b4a3f]'}`}>{value}{suffix}</strong>
    </div>
    <p className="mt-2 text-[11px] font-bold text-slate-500">{label}</p>
  </div>
);

const InfoBox = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3">
    <div className="flex items-center gap-2 text-slate-500"><Icon className="h-4 w-4" /><span className="text-[10px] font-black">{label}</span></div>
    <p className="mt-2 text-lg font-black text-[#0b4a3f]">{value}</p>
  </div>
);

export default MosqueImprovementGoalsCenter;
