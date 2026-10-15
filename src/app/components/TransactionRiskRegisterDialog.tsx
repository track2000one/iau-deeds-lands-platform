import React from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Target,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TransactionFollowUpAssignee } from '../api/transactionFollowUp';
import {
  transactionRiskApi,
  type TransactionRiskCategory,
  type TransactionRiskCreateInput,
  type TransactionRiskLevel,
  type TransactionRiskPage,
  type TransactionRiskRecord,
  type TransactionRiskSourceType,
  type TransactionRiskStatus,
  type TransactionRiskTreatmentStrategy,
} from '../api/transactionRisks';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';

export type RiskRegisterSeed = Partial<TransactionRiskCreateInput> & {
  suggestedTitle?: string;
};

const EMPTY_PAGE: TransactionRiskPage = {
  generatedAt: new Date(0).toISOString(),
  supervisor: false,
  summary: {
    active: 0,
    highCritical: 0,
    controlled: 0,
    overdueReview: 0,
    averageResidualScore: null,
  },
  levels: [],
  matrix: [],
  categories: [],
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

const categoryLabels: Record<TransactionRiskCategory, string> = {
  operational: 'تشغيلي',
  process: 'إجرائي',
  workload: 'ضغط عمل',
  compliance: 'امتثال',
  technology: 'تقني',
  data: 'بيانات',
  financial: 'مالي',
  reputational: 'سمعة',
  other: 'أخرى',
};

const levelLabels: Record<TransactionRiskLevel, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  critical: 'حرج',
};

const statusLabels: Record<TransactionRiskStatus, string> = {
  open: 'مفتوح',
  monitoring: 'تحت المراقبة',
  controlled: 'تحت السيطرة',
  accepted: 'مقبول',
  closed: 'مغلق',
};

const strategyLabels: Record<TransactionRiskTreatmentStrategy, string> = {
  reduce: 'تخفيض الخطر',
  avoid: 'تجنب الخطر',
  transfer: 'نقل الخطر',
  accept: 'قبول الخطر',
};

const sourceLabels: Record<TransactionRiskSourceType, string> = {
  manual: 'إدخال يدوي',
  early_warning: 'إنذار مبكر',
  preventive_action: 'تدخل وقائي',
  capa: 'CAPA',
};

const levelClass: Record<TransactionRiskLevel, string> = {
  low: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  medium: 'border-amber-300 bg-amber-50 text-amber-900',
  high: 'border-orange-300 bg-orange-50 text-orange-800',
  critical: 'border-red-300 bg-red-50 text-red-800',
};

const statusClass: Record<TransactionRiskStatus, string> = {
  open: 'border-sky-300 bg-sky-50 text-sky-800',
  monitoring: 'border-violet-300 bg-violet-50 text-violet-800',
  controlled: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  accepted: 'border-slate-300 bg-slate-50 text-slate-700',
  closed: 'border-slate-300 bg-slate-100 text-slate-700',
};

const matrixClass = (score: number) => {
  if (score >= 17) return 'border-red-300 bg-red-100 text-red-900';
  if (score >= 10) return 'border-orange-300 bg-orange-100 text-orange-900';
  if (score >= 5) return 'border-amber-300 bg-amber-100 text-amber-950';
  return 'border-emerald-300 bg-emerald-100 text-emerald-900';
};

const dateInput = (daysFromNow = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
};

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : '—';

type CreateForm = {
  title: string;
  description: string;
  category: TransactionRiskCategory;
  sourceType: TransactionRiskSourceType;
  metricKey: TransactionRiskCreateInput['metricKey'] | '';
  scopeType: 'global' | 'employee';
  assigneeUserId: string;
  ownerUserId: string;
  probability: string;
  impact: string;
  controls: string;
  treatmentStrategy: TransactionRiskTreatmentStrategy;
  treatmentPlan: string;
  residualProbability: string;
  residualImpact: string;
  reviewDate: string;
  sourcePreventiveActionId: string;
  sourceImprovementPlanId: string;
  recurrenceCount: string;
  notes: string;
};

const blankForm = (): CreateForm => ({
  title: '',
  description: '',
  category: 'operational',
  sourceType: 'manual',
  metricKey: '',
  scopeType: 'global',
  assigneeUserId: '',
  ownerUserId: '',
  probability: '3',
  impact: '3',
  controls: '',
  treatmentStrategy: 'reduce',
  treatmentPlan: '',
  residualProbability: '3',
  residualImpact: '3',
  reviewDate: dateInput(30),
  sourcePreventiveActionId: '',
  sourceImprovementPlanId: '',
  recurrenceCount: '0',
  notes: '',
});

const seededForm = (seed: RiskRegisterSeed): CreateForm => {
  const probability = String(seed.probability ?? 3);
  const impact = String(seed.impact ?? 3);
  return {
    title: seed.title || seed.suggestedTitle || '',
    description: seed.description || '',
    category: seed.category || 'operational',
    sourceType: seed.sourceType || 'manual',
    metricKey: seed.metricKey || '',
    scopeType: seed.scopeType || 'global',
    assigneeUserId: seed.assigneeUserId || '',
    ownerUserId: seed.ownerUserId || seed.assigneeUserId || '',
    probability,
    impact,
    controls: Array.isArray(seed.controls) ? seed.controls.join('\n') : '',
    treatmentStrategy: seed.treatmentStrategy || 'reduce',
    treatmentPlan: seed.treatmentPlan || '',
    residualProbability: String(seed.residualProbability ?? seed.probability ?? 3),
    residualImpact: String(seed.residualImpact ?? seed.impact ?? 3),
    reviewDate: seed.reviewDate || dateInput(30),
    sourcePreventiveActionId: seed.sourcePreventiveActionId || '',
    sourceImprovementPlanId: seed.sourceImprovementPlanId || '',
    recurrenceCount: String(seed.recurrenceCount ?? 0),
    notes: seed.notes || '',
  };
};

type EditState = {
  residualProbability: string;
  residualImpact: string;
  status: TransactionRiskStatus;
  reviewDate: string;
  treatmentPlan: string;
  notes: string;
};

const editState = (risk: TransactionRiskRecord): EditState => ({
  residualProbability: String(risk.residualProbability),
  residualImpact: String(risk.residualImpact),
  status: risk.status,
  reviewDate: risk.reviewDate?.slice(0, 10) || '',
  treatmentPlan: risk.treatmentPlan || '',
  notes: risk.notes || '',
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: TransactionFollowUpAssignee[];
  supervisor: boolean;
  seed?: RiskRegisterSeed | null;
};

export const TransactionRiskRegisterDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  assignees,
  supervisor,
  seed,
}) => {
  const [data, setData] = React.useState<TransactionRiskPage>(EMPTY_PAGE);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState<CreateForm>(blankForm());
  const [statusFilter, setStatusFilter] = React.useState('');
  const [levelFilter, setLevelFilter] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('');
  const [edits, setEdits] = React.useState<Record<string, EditState>>({});

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionRiskApi.list({
        page: 1,
        pageSize: 50,
        status: statusFilter || undefined,
        level: levelFilter || undefined,
        category: categoryFilter || undefined,
      });
      setData(result);
      setEdits((current) => {
        const next = { ...current };
        result.items.forEach((risk) => {
          if (!next[risk.id]) next[risk.id] = editState(risk);
        });
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجل المخاطر التشغيلية');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, levelFilter, categoryFilter]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  React.useEffect(() => {
    if (!open || !seed || !supervisor) return;
    setForm(seededForm(seed));
    setCreateOpen(true);
  }, [open, seed, supervisor]);

  const createRisk = async () => {
    if (!form.title.trim() || !form.description.trim() || !form.ownerUserId) {
      toast.error('أكمل عنوان الخطر ووصفه ومالك الخطر');
      return;
    }

    try {
      setSaving(true);
      const created = await transactionRiskApi.create({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        sourceType: form.sourceType,
        metricKey: form.metricKey || null,
        scopeType: form.scopeType,
        assigneeUserId: form.scopeType === 'employee' ? form.assigneeUserId || null : null,
        ownerUserId: form.ownerUserId,
        probability: Number(form.probability),
        impact: Number(form.impact),
        controls: form.controls
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        treatmentStrategy: form.treatmentStrategy,
        treatmentPlan: form.treatmentPlan.trim() || null,
        residualProbability: Number(form.residualProbability),
        residualImpact: Number(form.residualImpact),
        reviewDate: form.reviewDate || null,
        sourcePreventiveActionId: form.sourcePreventiveActionId || null,
        sourceImprovementPlanId: form.sourceImprovementPlanId || null,
        recurrenceCount: Number(form.recurrenceCount || 0),
        notes: form.notes.trim() || null,
      });
      toast.success('تم تسجيل الخطر ' + created.riskNumber);
      setCreateOpen(false);
      setForm(blankForm());
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تسجيل الخطر');
    } finally {
      setSaving(false);
    }
  };

  const saveAssessment = async (risk: TransactionRiskRecord) => {
    const state = edits[risk.id] || editState(risk);
    try {
      setSaving(true);
      const updated = await transactionRiskApi.update(risk.id, {
        residualProbability: Number(state.residualProbability),
        residualImpact: Number(state.residualImpact),
        status: state.status,
        reviewDate: state.reviewDate || null,
        treatmentPlan: state.treatmentPlan.trim() || null,
        notes: state.notes.trim() || null,
      });
      toast.success('تم تحديث تقييم الخطر ' + updated.riskNumber);
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث تقييم الخطر');
    } finally {
      setSaving(false);
    }
  };

  const matrixCount = (probability: number, impact: number) =>
    data.matrix.find((cell) => cell.probability === probability && cell.impact === impact)?.count || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1480px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-700" />
            سجل المخاطر التشغيلية Operational Risk Register
          </DialogTitle>
          <DialogDescription>
            توثيق المخاطر المتكررة وقياس الخطر قبل المعالجة وبعدها، وربطها بالتدخلات الوقائية وخطط CAPA ومواعيد المراجعة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pe-1">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="مخاطر نشطة" value={data.summary.active} />
            <SummaryCard label="مرتفعة / حرجة" value={data.summary.highCritical} danger={data.summary.highCritical > 0} />
            <SummaryCard label="تحت السيطرة" value={data.summary.controlled} success={data.summary.controlled > 0} />
            <SummaryCard label="مراجعة متأخرة" value={data.summary.overdueReview} warning={data.summary.overdueReview > 0} />
            <SummaryCard
              label="متوسط الخطر المتبقي"
              value={data.summary.averageResidualScore == null ? '—' : data.summary.averageResidualScore.toLocaleString('ar-SA')}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
            <Card className="shadow-none">
              <CardHeader className="border-b py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-red-700" />
                  مصفوفة الخطر المتبقي 5×5
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-[auto_repeat(5,minmax(48px,1fr))] gap-1 text-center text-[10px]">
                  <div />
                  {[1, 2, 3, 4, 5].map((probability) => (
                    <div key={'p-' + probability} className="rounded-md bg-slate-50 px-1 py-2 font-black">
                      احتمال {probability}
                    </div>
                  ))}
                  {[5, 4, 3, 2, 1].map((impact) => (
                    <React.Fragment key={'i-' + impact}>
                      <div className="flex items-center justify-center rounded-md bg-slate-50 px-2 font-black">
                        أثر {impact}
                      </div>
                      {[1, 2, 3, 4, 5].map((probability) => {
                        const score = probability * impact;
                        const count = matrixCount(probability, impact);
                        return (
                          <div
                            key={probability + '-' + impact}
                            className={'rounded-md border px-1 py-2 ' + matrixClass(score)}
                            title={'الدرجة ' + score}
                          >
                            <b>{score}</b>
                            <div className="mt-1 text-[9px]">{count ? count.toLocaleString('ar-SA') + ' خطر' : '—'}</div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
                <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
                  الدرجة = الاحتمالية × الأثر. يعرض الرقم السفلي عدد المخاطر الحالية داخل كل خلية بعد تطبيق الضوابط والمعالجات.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader className="border-b py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-base">المخاطر المسجلة</CardTitle>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      إجمالي النتائج: {data.total.toLocaleString('ar-SA')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <NativeSelect className="w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="">كل الحالات</option>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </NativeSelect>
                    <NativeSelect className="w-36" value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                      <option value="">كل المستويات</option>
                      {Object.entries(levelLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </NativeSelect>
                    <NativeSelect className="w-36" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                      <option value="">كل التصنيفات</option>
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </NativeSelect>
                    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
                      <RefreshCw className={'ml-1 h-3.5 w-3.5 ' + (loading ? 'animate-spin' : '')} />
                      تحديث
                    </Button>
                    {supervisor && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setForm(blankForm());
                          setCreateOpen(true);
                        }}
                      >
                        <Plus className="ml-1 h-3.5 w-3.5" />
                        تسجيل خطر
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="max-h-[760px] overflow-y-auto p-0">
                {loading && !data.items.length ? (
                  <div className="py-16 text-center text-xs text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    جارٍ تحميل سجل المخاطر...
                  </div>
                ) : data.items.length ? (
                  <div className="divide-y">
                    {data.items.map((risk) => {
                      const state = edits[risk.id] || editState(risk);
                      const residualScore = Number(state.residualProbability) * Number(state.residualImpact);
                      return (
                        <div key={risk.id} className="space-y-3 p-4">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <b className="font-mono text-xs">{risk.riskNumber}</b>
                                <Badge variant="outline" className={levelClass[risk.residualLevel]}>
                                  {levelLabels[risk.residualLevel]} · {risk.residualScore}/25
                                </Badge>
                                <Badge variant="outline" className={statusClass[risk.status]}>
                                  {statusLabels[risk.status]}
                                </Badge>
                                <Badge variant="outline">{categoryLabels[risk.category]}</Badge>
                                {risk.isReviewOverdue && (
                                  <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                                    مراجعة متأخرة
                                  </Badge>
                                )}
                              </div>
                              <h3 className="mt-2 text-sm font-black text-slate-900">{risk.title}</h3>
                              <p className="mt-1 text-[11px] leading-5 text-slate-600">{risk.description}</p>
                              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-muted-foreground">
                                <span>مالك الخطر: <b className="text-foreground">{risk.ownerName}</b></span>
                                <span>المصدر: <b className="text-foreground">{sourceLabels[risk.sourceType]}</b></span>
                                <span>قبل المعالجة: <b className="text-foreground">{risk.inherentScore}/25</b></span>
                                <span>المراجعة: <b className={risk.isReviewOverdue ? 'text-red-700' : 'text-foreground'}>{formatDate(risk.reviewDate)}</b></span>
                                <span>التكرار: <b className="text-foreground">{risk.recurrenceCount.toLocaleString('ar-SA')}</b></span>
                              </div>
                              {risk.metricLabel && (
                                <div className="mt-2 text-[10px] text-muted-foreground">
                                  المؤشر المرتبط: <b className="text-foreground">{risk.metricLabel}</b>
                                  {risk.assigneeName ? ' · الموظف: ' + risk.assigneeName : ''}
                                </div>
                              )}
                              {risk.controls?.length ? (
                                <div className="mt-3 rounded-xl border bg-slate-50 p-3">
                                  <p className="text-[10px] font-black">الضوابط الحالية</p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {risk.controls.map((control, index) => (
                                      <span key={index} className="rounded-full border bg-white px-2 py-1 text-[9px]">
                                        {control}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {risk.status !== 'closed' && (
                            <div className="grid gap-2 rounded-xl border bg-slate-50/70 p-3 lg:grid-cols-6">
                              <Field label="احتمالية متبقية">
                                <NativeSelect
                                  value={state.residualProbability}
                                  onChange={(event) => setEdits((current) => ({
                                    ...current,
                                    [risk.id]: { ...state, residualProbability: event.target.value },
                                  }))}
                                >
                                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                                </NativeSelect>
                              </Field>
                              <Field label="أثر متبقٍ">
                                <NativeSelect
                                  value={state.residualImpact}
                                  onChange={(event) => setEdits((current) => ({
                                    ...current,
                                    [risk.id]: { ...state, residualImpact: event.target.value },
                                  }))}
                                >
                                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                                </NativeSelect>
                              </Field>
                              <Field label="الدرجة الجديدة">
                                <div className={'flex h-10 items-center justify-center rounded-md border font-black ' + matrixClass(residualScore)}>
                                  {residualScore}/25
                                </div>
                              </Field>
                              <Field label="الحالة">
                                <NativeSelect
                                  value={state.status}
                                  onChange={(event) => setEdits((current) => ({
                                    ...current,
                                    [risk.id]: { ...state, status: event.target.value as TransactionRiskStatus },
                                  }))}
                                >
                                  {Object.entries(statusLabels).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </NativeSelect>
                              </Field>
                              <Field label="المراجعة القادمة">
                                <Input
                                  type="date"
                                  value={state.reviewDate}
                                  onChange={(event) => setEdits((current) => ({
                                    ...current,
                                    [risk.id]: { ...state, reviewDate: event.target.value },
                                  }))}
                                />
                              </Field>
                              <div className="flex items-end">
                                <Button type="button" className="w-full" disabled={saving} onClick={() => void saveAssessment(risk)}>
                                  <Save className="ml-1 h-3.5 w-3.5" />
                                  حفظ التقييم
                                </Button>
                              </div>
                              <div className="space-y-1 lg:col-span-3">
                                <Label className="text-[10px]">خطة المعالجة</Label>
                                <Textarea
                                  rows={2}
                                  value={state.treatmentPlan}
                                  onChange={(event) => setEdits((current) => ({
                                    ...current,
                                    [risk.id]: { ...state, treatmentPlan: event.target.value },
                                  }))}
                                  placeholder="الإجراء المخطط لخفض الخطر..."
                                />
                              </div>
                              <div className="space-y-1 lg:col-span-3">
                                <Label className="text-[10px]">ملاحظات إعادة التقييم</Label>
                                <Textarea
                                  rows={2}
                                  value={state.notes}
                                  onChange={(event) => setEdits((current) => ({
                                    ...current,
                                    [risk.id]: { ...state, notes: event.target.value },
                                  }))}
                                  placeholder="مبررات التقييم أو مستجدات الخطر..."
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-muted-foreground">
                    لا توجد مخاطر مسجلة ضمن الفلاتر الحالية.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {(['critical', 'high', 'medium', 'low'] as TransactionRiskLevel[]).map((level) => {
              const item = data.levels.find((row) => row.level === level);
              return (
                <div key={level} className={'rounded-xl border px-4 py-3 ' + levelClass[level]}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold">{levelLabels[level]}</span>
                    <b className="text-xl">{(item?.count || 0).toLocaleString('ar-SA')}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={(next) => !saving && setCreateOpen(next)}>
          <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[900px]" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle>تسجيل خطر تشغيلي</DialogTitle>
              <DialogDescription>
                قيّم الاحتمالية والأثر قبل المعالجة، ثم حدّد الضوابط الحالية وخطة المعالجة والخطر المتبقي وموعد المراجعة.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان الخطر *">
                <Input value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} />
              </Field>
              <Field label="التصنيف">
                <NativeSelect value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value as TransactionRiskCategory }))}>
                  {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <Label>وصف الخطر *</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm((v) => ({ ...v, description: e.target.value }))} />
              </div>
              <Field label="مالك الخطر *">
                <NativeSelect value={form.ownerUserId} onChange={(e) => setForm((v) => ({ ...v, ownerUserId: e.target.value }))}>
                  <option value="">اختر مالك الخطر</option>
                  {assignees.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}
                </NativeSelect>
              </Field>
              <Field label="النطاق">
                <NativeSelect value={form.scopeType} onChange={(e) => setForm((v) => ({ ...v, scopeType: e.target.value as 'global' | 'employee' }))}>
                  <option value="global">الإدارة / عام</option>
                  <option value="employee">موظف محدد</option>
                </NativeSelect>
              </Field>
              <Field label="الموظف المرتبط">
                <NativeSelect
                  disabled={form.scopeType !== 'employee'}
                  value={form.assigneeUserId}
                  onChange={(e) => setForm((v) => ({ ...v, assigneeUserId: e.target.value }))}
                >
                  <option value="">اختر الموظف</option>
                  {assignees.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}
                </NativeSelect>
              </Field>
              <Field label="مصدر الخطر">
                <NativeSelect value={form.sourceType} onChange={(e) => setForm((v) => ({ ...v, sourceType: e.target.value as TransactionRiskSourceType }))}>
                  {Object.entries(sourceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </Field>

              <div className="sm:col-span-2 rounded-xl border bg-slate-50 p-3">
                <p className="mb-3 text-xs font-black">التقييم قبل المعالجة</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="الاحتمالية 1-5">
                    <NativeSelect value={form.probability} onChange={(e) => setForm((v) => ({ ...v, probability: e.target.value }))}>
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="الأثر 1-5">
                    <NativeSelect value={form.impact} onChange={(e) => setForm((v) => ({ ...v, impact: e.target.value }))}>
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="درجة الخطر">
                    <div className={'flex h-10 items-center justify-center rounded-md border font-black ' + matrixClass(Number(form.probability) * Number(form.impact))}>
                      {Number(form.probability) * Number(form.impact)}/25
                    </div>
                  </Field>
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>الضوابط الحالية</Label>
                <Textarea
                  rows={3}
                  value={form.controls}
                  onChange={(e) => setForm((v) => ({ ...v, controls: e.target.value }))}
                  placeholder="اكتب كل ضابط في سطر مستقل"
                />
              </div>
              <Field label="استراتيجية المعالجة">
                <NativeSelect value={form.treatmentStrategy} onChange={(e) => setForm((v) => ({ ...v, treatmentStrategy: e.target.value as TransactionRiskTreatmentStrategy }))}>
                  {Object.entries(strategyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </NativeSelect>
              </Field>
              <Field label="موعد المراجعة">
                <Input type="date" value={form.reviewDate} onChange={(e) => setForm((v) => ({ ...v, reviewDate: e.target.value }))} />
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <Label>خطة المعالجة</Label>
                <Textarea rows={3} value={form.treatmentPlan} onChange={(e) => setForm((v) => ({ ...v, treatmentPlan: e.target.value }))} />
              </div>

              <div className="sm:col-span-2 rounded-xl border bg-slate-50 p-3">
                <p className="mb-3 text-xs font-black">الخطر المتبقي بعد الضوابط</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="الاحتمالية المتبقية">
                    <NativeSelect value={form.residualProbability} onChange={(e) => setForm((v) => ({ ...v, residualProbability: e.target.value }))}>
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="الأثر المتبقي">
                    <NativeSelect value={form.residualImpact} onChange={(e) => setForm((v) => ({ ...v, residualImpact: e.target.value }))}>
                      {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value}</option>)}
                    </NativeSelect>
                  </Field>
                  <Field label="الدرجة المتبقية">
                    <div className={'flex h-10 items-center justify-center rounded-md border font-black ' + matrixClass(Number(form.residualProbability) * Number(form.residualImpact))}>
                      {Number(form.residualProbability) * Number(form.residualImpact)}/25
                    </div>
                  </Field>
                </div>
              </div>

              <Field label="عدد مرات التكرار">
                <Input type="number" min={0} value={form.recurrenceCount} onChange={(e) => setForm((v) => ({ ...v, recurrenceCount: e.target.value }))} />
              </Field>
              <Field label="ملاحظات">
                <Input value={form.notes} onChange={(e) => setForm((v) => ({ ...v, notes: e.target.value }))} />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" disabled={saving} onClick={() => setCreateOpen(false)}>
                إلغاء
              </Button>
              <Button type="button" disabled={saving} onClick={() => void createRisk()}>
                <Save className="ml-1 h-4 w-4" />
                {saving ? 'جارٍ الحفظ...' : 'اعتماد سجل الخطر'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

const SummaryCard = ({
  label,
  value,
  danger = false,
  warning = false,
  success = false,
}: {
  label: string;
  value: number | string;
  danger?: boolean;
  warning?: boolean;
  success?: boolean;
}) => (
  <div className={'rounded-xl border px-4 py-3 text-center ' + (
    danger
      ? 'border-red-200 bg-red-50'
      : warning
        ? 'border-amber-200 bg-amber-50'
        : success
          ? 'border-emerald-200 bg-emerald-50'
          : 'bg-white'
  )}>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={'mt-1 text-xl font-black ' + (
      danger ? 'text-red-700' : warning ? 'text-amber-800' : success ? 'text-emerald-700' : 'text-slate-900'
    )}>
      {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
    </p>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-[10px]">{label}</Label>
    {children}
  </div>
);

export default TransactionRiskRegisterDialog;
