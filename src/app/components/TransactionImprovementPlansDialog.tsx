import React from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  RefreshCw,
  Repeat2,
  Save,
  ShieldCheck,
  Target,
  TimerReset,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpAssignee,
  type TransactionFollowUpImprovementEffectiveness,
  type TransactionFollowUpImprovementPlan,
  type TransactionFollowUpImprovementPlanPage,
} from '../api/transactionFollowUp';
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

export type ImprovementPlanSeed = {
  metricKey: TransactionFollowUpImprovementPlan['metricKey'];
  metricLabel: string;
  baselineValue?: number | null;
  targetValue: number;
  direction: 'min' | 'max';
  assigneeUserId?: string | null;
  assigneeName?: string | null;
};

const EMPTY_PAGE: TransactionFollowUpImprovementPlanPage = {
  generatedAt: new Date(0).toISOString(),
  summary: { open: 0, overdue: 0, monitoring: 0, completed30d: 0 },
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

const metricLabels: Record<TransactionFollowUpImprovementPlan['metricKey'], string> = {
  firstPassRate: 'الإنجاز من أول مرة',
  onTimeRate: 'الالتزام بالمواعيد',
  reworkRate: 'معدل إعادة العمل',
  avgExecutionHours: 'متوسط زمن التنفيذ',
  avgApprovalHours: 'متوسط زمن الاعتماد',
};

const metricDirections: Record<TransactionFollowUpImprovementPlan['metricKey'], 'min' | 'max'> = {
  firstPassRate: 'min',
  onTimeRate: 'min',
  reworkRate: 'max',
  avgExecutionHours: 'max',
  avgApprovalHours: 'max',
};

const statusLabels: Record<TransactionFollowUpImprovementPlan['status'], string> = {
  open: 'مفتوحة',
  in_progress: 'قيد التنفيذ',
  monitoring: 'قياس الأثر',
  completed: 'مغلقة بعد تحقق الأثر',
  cancelled: 'ملغاة',
};

const statusClass: Record<TransactionFollowUpImprovementPlan['status'], string> = {
  open: 'border-sky-300 bg-sky-50 text-sky-800',
  in_progress: 'border-violet-300 bg-violet-50 text-violet-800',
  monitoring: 'border-amber-300 bg-amber-50 text-amber-900',
  completed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  cancelled: 'border-slate-300 bg-slate-50 text-slate-700',
};

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : '—';

const formatDateTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

const formatMetricValue = (metricKey: TransactionFollowUpImprovementPlan['metricKey'], value?: number | null) => {
  if (value == null) return '—';
  if (metricKey.includes('Rate')) return `${value.toLocaleString('ar-SA')}%`;
  if (value < 24) return `${value.toLocaleString('ar-SA')} ساعة`;
  return `${(value / 24).toLocaleString('ar-SA', { maximumFractionDigits: 1 })} يوم`;
};

const formatPercent = (value?: number | null) =>
  value == null ? '—' : `${value.toLocaleString('ar-SA', { maximumFractionDigits: 1 })}%`;

const formatDays = (value?: number | null) =>
  value == null ? '—' : `${value.toLocaleString('ar-SA', { maximumFractionDigits: 1 })} يوم`;

const formatTrendMonth = (year: number, month: number) =>
  new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { month: 'short', year: 'numeric' })
    .format(new Date(year, month - 1, 1));

const dateInput = (daysFromNow = 30) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
};

type FormState = {
  metricKey: TransactionFollowUpImprovementPlan['metricKey'];
  scopeType: 'global' | 'employee';
  assigneeUserId: string;
  baselineValue: string;
  targetValue: string;
  direction: 'min' | 'max';
  periodDays: string;
  rootCause: string;
  correctiveAction: string;
  preventiveAction: string;
  ownerUserId: string;
  dueDate: string;
};

const blankForm = (): FormState => ({
  metricKey: 'firstPassRate',
  scopeType: 'global',
  assigneeUserId: '',
  baselineValue: '',
  targetValue: '90',
  direction: 'min',
  periodDays: '30',
  rootCause: '',
  correctiveAction: '',
  preventiveAction: '',
  ownerUserId: '',
  dueDate: dateInput(30),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: TransactionFollowUpAssignee[];
  seed?: ImprovementPlanSeed | null;
};

export const TransactionImprovementPlansDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  assignees,
  seed,
}) => {
  const [data, setData] = React.useState<TransactionFollowUpImprovementPlanPage>(EMPTY_PAGE);
  const [effectiveness, setEffectiveness] = React.useState<TransactionFollowUpImprovementEffectiveness | null>(null);
  const [effectivenessLoading, setEffectivenessLoading] = React.useState(false);
  const [effectivenessPeriod, setEffectivenessPeriod] = React.useState<'90' | '180' | '365' | 'all'>('180');
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [form, setForm] = React.useState<FormState>(blankForm());
  const [progressNotes, setProgressNotes] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.improvementPlans({
        page: 1,
        pageSize: 50,
        status: statusFilter || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل خطط تحسين الأداء');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadEffectiveness = React.useCallback(async () => {
    try {
      setEffectivenessLoading(true);
      const result = await transactionFollowUpApi.improvementEffectiveness({
        periodDays: effectivenessPeriod === 'all' ? 'all' : Number(effectivenessPeriod),
      });
      setEffectiveness(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل تحليل فعالية خطط التحسين');
    } finally {
      setEffectivenessLoading(false);
    }
  }, [effectivenessPeriod]);

  React.useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  React.useEffect(() => {
    if (!open) return;
    void loadEffectiveness();
  }, [open, loadEffectiveness]);

  React.useEffect(() => {
    if (!open || !seed) return;
    setForm({
      metricKey: seed.metricKey,
      scopeType: seed.assigneeUserId ? 'employee' : 'global',
      assigneeUserId: seed.assigneeUserId || '',
      baselineValue: seed.baselineValue == null ? '' : String(seed.baselineValue),
      targetValue: String(seed.targetValue),
      direction: seed.direction,
      periodDays: '30',
      rootCause: '',
      correctiveAction: '',
      preventiveAction: '',
      ownerUserId: seed.assigneeUserId || '',
      dueDate: dateInput(30),
    });
    setCreateOpen(true);
  }, [open, seed]);

  const onMetricChanged = (metricKey: TransactionFollowUpImprovementPlan['metricKey']) => {
    const direction = metricDirections[metricKey];
    const defaultTarget =
      metricKey === 'firstPassRate' ? 90 :
      metricKey === 'onTimeRate' ? 95 :
      metricKey === 'reworkRate' ? 10 :
      metricKey === 'avgApprovalHours' ? 24 : 72;

    setForm((current) => ({
      ...current,
      metricKey,
      direction,
      targetValue: String(defaultTarget),
    }));
  };

  const createPlan = async () => {
    if (!form.rootCause.trim() || !form.correctiveAction.trim() || !form.dueDate) {
      toast.error('أكمل سبب الانحراف والإجراء التصحيحي وتاريخ الاستحقاق');
      return;
    }
    if (form.scopeType === 'employee' && !form.assigneeUserId) {
      toast.error('حدد الموظف المرتبط بخطة التحسين');
      return;
    }

    try {
      setSaving(true);
      await transactionFollowUpApi.createImprovementPlan({
        metricKey: form.metricKey,
        scopeType: form.scopeType,
        assigneeUserId: form.scopeType === 'employee' ? form.assigneeUserId : null,
        baselineValue: form.baselineValue === '' ? null : Number(form.baselineValue),
        targetValue: Number(form.targetValue),
        direction: form.direction,
        periodDays: Number(form.periodDays),
        rootCause: form.rootCause.trim(),
        correctiveAction: form.correctiveAction.trim(),
        preventiveAction: form.preventiveAction.trim() || null,
        ownerUserId: form.ownerUserId || null,
        dueDate: form.dueDate,
      });
      toast.success('تم إنشاء خطة تحسين الأداء CAPA');
      setCreateOpen(false);
      setForm(blankForm());
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await Promise.all([load(), loadEffectiveness()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء خطة التحسين');
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = async (
    plan: TransactionFollowUpImprovementPlan,
    status: TransactionFollowUpImprovementPlan['status'],
  ) => {
    const note = String(progressNotes[plan.id] || '').trim();
    if (status === 'in_progress' && !note) {
      toast.error('اكتب تحديثًا مختصرًا عن بدء تنفيذ الخطة');
      return;
    }

    try {
      setSaving(true);
      await transactionFollowUpApi.updateImprovementPlan(plan.id, {
        status,
        progressNote: note || null,
      });
      toast.success(status === 'monitoring' ? 'تم تحويل الخطة إلى مرحلة قياس الأثر' : 'تم تحديث حالة خطة التحسين');
      setProgressNotes((current) => ({ ...current, [plan.id]: '' }));
      await Promise.all([load(), loadEffectiveness()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث خطة التحسين');
    } finally {
      setSaving(false);
    }
  };

  const verifyPlan = async (plan: TransactionFollowUpImprovementPlan) => {
    try {
      setVerifyingId(plan.id);
      const result = await transactionFollowUpApi.verifyImprovementPlan(plan.id);
      if (result.verification.metTarget) {
        toast.success('تم التحقق من الأثر وحقق المؤشر المستهدف — أغلقت الخطة');
      } else {
        toast.warning('تم قياس الأثر وما زال المؤشر دون المستهدف — تستمر الخطة في المتابعة');
      }
      await Promise.all([load(), loadEffectiveness()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر قياس أثر خطة التحسين');
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1380px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-teal-700" />
            خطط تحسين الأداء CAPA
          </DialogTitle>
          <DialogDescription>
            تحويل انحرافات مؤشرات الأداء إلى إجراءات تصحيحية ووقائية قابلة للمتابعة، ثم قياس أثر الخطة آليًا على نفس KPI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pe-1">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="خطط مفتوحة" value={data.summary.open} />
            <SummaryCard label="متأخرة" value={data.summary.overdue} danger={data.summary.overdue > 0} />
            <SummaryCard label="في قياس الأثر" value={data.summary.monitoring} warning={data.summary.monitoring > 0} />
            <SummaryCard label="أغلقت آخر 30 يومًا" value={data.summary.completed30d} success={data.summary.completed30d > 0} />
          </div>

          <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-none">
            <CardHeader className="border-b py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-5 w-5 text-teal-700" />
                    فعالية خطط التحسين CAPA
                  </CardTitle>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    قياس نجاح الخطط، سرعة استعادة المؤشرات للمستهدف، واستدامة التحسن بعد الإغلاق.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <NativeSelect
                    className="w-40"
                    value={effectivenessPeriod}
                    onChange={(event) => setEffectivenessPeriod(event.target.value as '90' | '180' | '365' | 'all')}
                  >
                    <option value="90">آخر 90 يومًا</option>
                    <option value="180">آخر 180 يومًا</option>
                    <option value="365">آخر سنة</option>
                    <option value="all">كل الفترات</option>
                  </NativeSelect>
                  <Button type="button" size="sm" variant="outline" onClick={() => void loadEffectiveness()} disabled={effectivenessLoading}>
                    <RefreshCw className={`ml-1 h-3.5 w-3.5 ${effectivenessLoading ? 'animate-spin' : ''}`} />
                    تحديث التحليل
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {effectivenessLoading && !effectiveness ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  جارٍ احتساب فعالية خطط التحسين...
                </div>
              ) : effectiveness ? (
                <>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <EffectivenessMetric
                      label="نسبة فعالية الخطط"
                      value={formatPercent(effectiveness.summary.effectivenessRate)}
                      hint={`${effectiveness.summary.successful.toLocaleString('ar-SA')} ناجحة من ${effectiveness.summary.verified.toLocaleString('ar-SA')} خطة تم قياسها`}
                      icon={<TrendingUp className="h-4 w-4 text-emerald-700" />}
                      good={effectiveness.summary.effectivenessRate != null && effectiveness.summary.effectivenessRate >= 80}
                    />
                    <EffectivenessMetric
                      label="متوسط استعادة المستهدف"
                      value={formatDays(effectiveness.summary.avgRecoveryDays)}
                      hint="من إنشاء الخطة حتى تحقق المستهدف وإغلاقها"
                      icon={<TimerReset className="h-4 w-4 text-sky-700" />}
                    />
                    <EffectivenessMetric
                      label="متوسط التحسن"
                      value={formatPercent(effectiveness.summary.avgImprovementPercent)}
                      hint="التغير النسبي في الاتجاه الإيجابي مقارنة بالقيمة الأساسية"
                      icon={<Target className="h-4 w-4 text-violet-700" />}
                      good={effectiveness.summary.avgImprovementPercent != null && effectiveness.summary.avgImprovementPercent > 0}
                    />
                    <EffectivenessMetric
                      label="تكرار المشكلة خلال 90 يومًا"
                      value={formatPercent(effectiveness.summary.recurrenceRate90d)}
                      hint={effectiveness.summary.recurrenceEligible
                        ? `${effectiveness.summary.recurrenceCount.toLocaleString('ar-SA')} حالة تكرار من ${effectiveness.summary.recurrenceEligible.toLocaleString('ar-SA')} خطة مكتملة فترة المراقبة`
                        : 'لا توجد خطط مكتملة أتمت فترة مراقبة 90 يومًا بعد'}
                      icon={<Repeat2 className="h-4 w-4 text-amber-700" />}
                      danger={effectiveness.summary.recurrenceRate90d != null && effectiveness.summary.recurrenceRate90d > 20}
                    />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                    <div className="overflow-hidden rounded-xl border bg-white">
                      <div className="border-b px-3 py-2">
                        <p className="text-xs font-black">الفعالية حسب مؤشر الأداء</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-[11px]">
                          <thead className="bg-slate-50 text-slate-600">
                            <tr>
                              <th className="p-2 text-right">المؤشر</th>
                              <th className="p-2 text-center">الخطط</th>
                              <th className="p-2 text-center">تم القياس</th>
                              <th className="p-2 text-center">نجحت</th>
                              <th className="p-2 text-center">الفعالية</th>
                              <th className="p-2 text-center">زمن الاستعادة</th>
                              <th className="p-2 text-center">التكرار 90 يومًا</th>
                            </tr>
                          </thead>
                          <tbody>
                            {effectiveness.metricBreakdown.map((metric) => (
                              <tr key={metric.metricKey} className="border-t">
                                <td className="p-2 font-bold">{metric.metricLabel}</td>
                                <td className="p-2 text-center">{metric.plans.toLocaleString('ar-SA')}</td>
                                <td className="p-2 text-center">{metric.verified.toLocaleString('ar-SA')}</td>
                                <td className="p-2 text-center">{metric.successful.toLocaleString('ar-SA')}</td>
                                <td className="p-2 text-center">
                                  <span className={`inline-flex rounded-full px-2 py-1 font-black ${
                                    metric.effectivenessRate == null
                                      ? 'bg-slate-100 text-slate-600'
                                      : metric.effectivenessRate >= 80
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : metric.effectivenessRate >= 60
                                          ? 'bg-amber-50 text-amber-800'
                                          : 'bg-red-50 text-red-700'
                                  }`}>
                                    {formatPercent(metric.effectivenessRate)}
                                  </span>
                                </td>
                                <td className="p-2 text-center">{formatDays(metric.avgRecoveryDays)}</td>
                                <td className="p-2 text-center">{formatPercent(metric.recurrenceRate90d)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-xl border bg-white p-3">
                      <p className="text-xs font-black">اتجاه آخر 6 أشهر</p>
                      <div className="mt-3 space-y-2">
                        {effectiveness.monthlyTrend.map((month) => (
                          <div key={month.key} className="rounded-lg border bg-slate-50 p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold">{formatTrendMonth(month.year, month.month)}</span>
                              <span className="text-[9px] text-muted-foreground">
                                {month.successful.toLocaleString('ar-SA')} نجاح
                              </span>
                            </div>
                            <div className="mt-1 grid grid-cols-3 gap-1 text-center text-[9px]">
                              <div><b>{month.created.toLocaleString('ar-SA')}</b><br />أنشئت</div>
                              <div><b>{month.verified.toLocaleString('ar-SA')}</b><br />قيست</div>
                              <div><b className="text-emerald-700">{month.successful.toLocaleString('ar-SA')}</b><br />نجحت</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <EffectivenessTextTable
                      title="أكثر أسباب الانحراف تكرارًا"
                      rows={effectiveness.topRootCauses}
                      textHeader="سبب الانحراف"
                    />
                    <EffectivenessTextTable
                      title="الإجراءات التصحيحية الأكثر استخدامًا وفعالية"
                      rows={effectiveness.topCorrectiveActions}
                      textHeader="الإجراء التصحيحي"
                    />
                  </div>

                  <div className="overflow-hidden rounded-xl border bg-white">
                    <div className="border-b px-3 py-2">
                      <p className="text-xs font-black">فعالية التنفيذ حسب مسؤول الخطة</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] text-[11px]">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-2 text-right">المسؤول</th>
                            <th className="p-2 text-center">الخطط</th>
                            <th className="p-2 text-center">مفتوحة</th>
                            <th className="p-2 text-center">متأخرة</th>
                            <th className="p-2 text-center">تم قياسها</th>
                            <th className="p-2 text-center">الفعالية</th>
                            <th className="p-2 text-center">متوسط الاستعادة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {effectiveness.owners.map((owner) => (
                            <tr key={owner.userId || owner.username} className="border-t">
                              <td className="p-2 font-bold">{owner.username}</td>
                              <td className="p-2 text-center">{owner.plans.toLocaleString('ar-SA')}</td>
                              <td className="p-2 text-center">{owner.open.toLocaleString('ar-SA')}</td>
                              <td className={`p-2 text-center font-bold ${owner.overdue ? 'text-red-700' : ''}`}>
                                {owner.overdue.toLocaleString('ar-SA')}
                              </td>
                              <td className="p-2 text-center">{owner.verified.toLocaleString('ar-SA')}</td>
                              <td className="p-2 text-center">{formatPercent(owner.effectivenessRate)}</td>
                              <td className="p-2 text-center">{formatDays(owner.avgRecoveryDays)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <p className="text-[9px] leading-5 text-muted-foreground">
                    معدل التكرار خلال 90 يومًا يُحسب فقط للخطط التي حققت المستهدف ومضى على إغلاقها 90 يومًا كاملة؛
                    ويُعد ظهور خطة جديدة لنفس المؤشر ونفس النطاق خلال هذه المدة تكرارًا للمشكلة.
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 rounded-xl border bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <NativeSelect value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">كل الحالات</option>
                <option value="open">مفتوحة</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="monitoring">قياس الأثر</option>
                <option value="completed">مغلقة بعد تحقق الأثر</option>
                <option value="cancelled">ملغاة</option>
              </NativeSelect>
              <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
            <Button type="button" onClick={() => {
              setForm(blankForm());
              setCreateOpen((value) => !value);
            }}>
              <Target className="ml-1 h-4 w-4" />
              إنشاء خطة تحسين
            </Button>
          </div>

          {createOpen && (
            <Card className="border-teal-200 bg-teal-50/20 shadow-none">
              <CardHeader className="border-b py-3">
                <CardTitle className="text-base">إنشاء CAPA جديدة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>المؤشر</Label>
                    <NativeSelect
                      value={form.metricKey}
                      onChange={(event) => onMetricChanged(event.target.value as TransactionFollowUpImprovementPlan['metricKey'])}
                    >
                      {Object.entries(metricLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label>نطاق الخطة</Label>
                    <NativeSelect
                      value={form.scopeType}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        scopeType: event.target.value as 'global' | 'employee',
                        assigneeUserId: event.target.value === 'global' ? '' : current.assigneeUserId,
                      }))}
                    >
                      <option value="global">الإدارة بالكامل</option>
                      <option value="employee">موظف محدد</option>
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label>الموظف المرتبط</Label>
                    <NativeSelect
                      disabled={form.scopeType === 'global'}
                      value={form.assigneeUserId}
                      onChange={(event) => setForm((current) => ({ ...current, assigneeUserId: event.target.value }))}
                    >
                      <option value="">اختر الموظف</option>
                      {assignees.map((user) => (
                        <option key={user.id} value={user.id}>{user.username}</option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1.5">
                    <Label>مسؤول تنفيذ الخطة</Label>
                    <NativeSelect
                      value={form.ownerUserId}
                      onChange={(event) => setForm((current) => ({ ...current, ownerUserId: event.target.value }))}
                    >
                      <option value="">غير محدد</option>
                      {assignees.map((user) => (
                        <option key={user.id} value={user.id}>{user.username}</option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="القيمة الحالية" value={form.baselineValue} onChange={(value) => setForm((current) => ({ ...current, baselineValue: value }))} />
                  <Field label="المستهدف" value={form.targetValue} onChange={(value) => setForm((current) => ({ ...current, targetValue: value }))} />
                  <Field label="فترة قياس الأثر — يوم" value={form.periodDays} onChange={(value) => setForm((current) => ({ ...current, periodDays: value }))} />
                  <div className="space-y-1.5">
                    <Label>تاريخ الاستحقاق</Label>
                    <Input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  <TextField
                    label="تحليل سبب الانحراف"
                    value={form.rootCause}
                    placeholder="ما السبب الجذري أو العوامل التي أدت إلى انخفاض المؤشر؟"
                    onChange={(value) => setForm((current) => ({ ...current, rootCause: value }))}
                  />
                  <TextField
                    label="الإجراء التصحيحي"
                    value={form.correctiveAction}
                    placeholder="ما الإجراء المباشر لمعالجة الانحراف الحالي؟"
                    onChange={(value) => setForm((current) => ({ ...current, correctiveAction: value }))}
                  />
                  <TextField
                    label="الإجراء الوقائي"
                    value={form.preventiveAction}
                    placeholder="ما الذي سيمنع تكرار المشكلة مستقبلًا؟"
                    onChange={(value) => setForm((current) => ({ ...current, preventiveAction: value }))}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="button" disabled={saving} onClick={() => void createPlan()}>
                    {saving ? <RefreshCw className="ml-1 h-4 w-4 animate-spin" /> : <Save className="ml-1 h-4 w-4" />}
                    حفظ خطة التحسين
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && !data.items.length ? (
            <div className="py-20 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              جارٍ تحميل خطط التحسين...
            </div>
          ) : data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-20 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
              <p className="mt-3 text-sm font-black">لا توجد خطط تحسين مسجلة</p>
              <p className="mt-1 text-xs text-muted-foreground">يمكن إنشاء CAPA مباشرة من مؤشر KPI الأحمر أو من هذه الشاشة.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.items.map((plan) => {
                const note = progressNotes[plan.id] || '';
                return (
                  <Card key={plan.id} className={`shadow-none ${plan.isOverdue ? 'border-red-300' : ''}`}>
                    <CardContent className="space-y-4 p-4">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={statusClass[plan.status]}>{statusLabels[plan.status]}</Badge>
                            <Badge variant="outline">{plan.metricLabel}</Badge>
                            <Badge variant="outline">{plan.scopeType === 'employee' ? plan.assigneeName || 'موظف' : 'الإدارة بالكامل'}</Badge>
                            {plan.isOverdue && (
                              <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                                <AlertTriangle className="ml-1 h-3 w-3" />
                                متأخرة
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                            <span>القيمة الأساسية: <b className="text-foreground">{formatMetricValue(plan.metricKey, plan.baselineValue)}</b></span>
                            <span>المستهدف: <b className="text-foreground">{plan.direction === 'min' ? '≥' : '≤'} {formatMetricValue(plan.metricKey, plan.targetValue)}</b></span>
                            <span>المسؤول: <b className="text-foreground">{plan.ownerName || 'غير محدد'}</b></span>
                            <span>الاستحقاق: <b className="text-foreground">{formatDate(plan.dueDate)}</b></span>
                          </div>
                        </div>
                        {plan.verifiedAt && (
                          <div className={`rounded-xl border px-3 py-2 text-center ${plan.resultMetTarget ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
                            <p className="text-[10px] text-muted-foreground">آخر قياس للأثر</p>
                            <p className={`mt-0.5 text-sm font-black ${plan.resultMetTarget ? 'text-emerald-700' : 'text-amber-800'}`}>
                              {formatMetricValue(plan.metricKey, plan.resultValue)}
                            </p>
                            <p className="text-[9px] text-muted-foreground">{formatDateTime(plan.verifiedAt)}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 lg:grid-cols-3">
                        <InfoBlock title="سبب الانحراف" text={plan.rootCause} />
                        <InfoBlock title="الإجراء التصحيحي" text={plan.correctiveAction} />
                        <InfoBlock title="الإجراء الوقائي" text={plan.preventiveAction || 'غير محدد'} />
                      </div>

                      {!['completed', 'cancelled'].includes(plan.status) && (
                        <div className="rounded-xl border bg-slate-50/70 p-3">
                          <Label className="text-[11px]">تحديث التنفيذ / الملاحظة الإدارية</Label>
                          <Textarea
                            rows={2}
                            value={note}
                            onChange={(event) => setProgressNotes((current) => ({ ...current, [plan.id]: event.target.value }))}
                            placeholder="اكتب آخر تحديث على تنفيذ خطة التحسين..."
                          />
                          <div className="mt-3 flex flex-wrap justify-end gap-2">
                            {plan.status === 'open' && (
                              <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void updatePlan(plan, 'in_progress')}>
                                بدء التنفيذ
                              </Button>
                            )}
                            {plan.status === 'in_progress' && (
                              <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => void updatePlan(plan, 'monitoring')}>
                                <Clock3 className="ml-1 h-3.5 w-3.5" />
                                تحويل إلى قياس الأثر
                              </Button>
                            )}
                            {['in_progress', 'monitoring'].includes(plan.status) && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={verifyingId === plan.id}
                                onClick={() => void verifyPlan(plan)}
                              >
                                {verifyingId === plan.id
                                  ? <RefreshCw className="ml-1 h-3.5 w-3.5 animate-spin" />
                                  : <ShieldCheck className="ml-1 h-3.5 w-3.5" />}
                                قياس أثر الخطة الآن
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {(plan.events || []).length > 0 && (
                        <details className="rounded-xl border bg-white p-3">
                          <summary className="cursor-pointer text-[11px] font-black">
                            سجل الخطة ({(plan.events || []).length.toLocaleString('ar-SA')})
                          </summary>
                          <div className="mt-3 space-y-2">
                            {(plan.events || []).map((event) => (
                              <div key={event.id} className="rounded-lg border bg-slate-50 px-3 py-2 text-[10px]">
                                <div className="flex flex-wrap justify-between gap-2">
                                  <b>{event.action === 'verified' ? 'قياس أثر' : event.action === 'created' ? 'إنشاء الخطة' : 'تحديث الخطة'}</b>
                                  <span className="text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                                </div>
                                {event.note && <p className="mt-1 leading-5 text-slate-600">{event.note}</p>}
                                <p className="mt-1 text-muted-foreground">بواسطة {event.changedByName || '—'}</p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EffectivenessMetric = ({
  label,
  value,
  hint,
  icon,
  good = false,
  danger = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  good?: boolean;
  danger?: boolean;
}) => (
  <div className={`rounded-xl border p-3 ${
    danger
      ? 'border-red-200 bg-red-50/70'
      : good
        ? 'border-emerald-200 bg-emerald-50/70'
        : 'bg-white'
  }`}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-[10px] font-bold text-slate-600">{label}</p>
      {icon}
    </div>
    <p className={`mt-1 text-xl font-black ${danger ? 'text-red-700' : good ? 'text-emerald-700' : 'text-slate-900'}`}>
      {value}
    </p>
    <p className="mt-1 text-[9px] leading-4 text-muted-foreground">{hint}</p>
  </div>
);

const EffectivenessTextTable = ({
  title,
  rows,
  textHeader,
}: {
  title: string;
  rows: TransactionFollowUpImprovementEffectiveness['topRootCauses'];
  textHeader: string;
}) => (
  <div className="overflow-hidden rounded-xl border bg-white">
    <div className="border-b px-3 py-2">
      <p className="text-xs font-black">{title}</p>
    </div>
    {rows.length ? (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-[10px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-2 text-right">{textHeader}</th>
              <th className="p-2 text-center">مرات الظهور</th>
              <th className="p-2 text-center">مفتوحة</th>
              <th className="p-2 text-center">تم قياسها</th>
              <th className="p-2 text-center">الفعالية</th>
              <th className="p-2 text-center">الاستعادة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.text}-${index}`} className="border-t">
                <td className="max-w-[320px] p-2 font-medium leading-5">{row.text}</td>
                <td className="p-2 text-center">{row.plans.toLocaleString('ar-SA')}</td>
                <td className="p-2 text-center">{row.open.toLocaleString('ar-SA')}</td>
                <td className="p-2 text-center">{row.verified.toLocaleString('ar-SA')}</td>
                <td className="p-2 text-center">{formatPercent(row.effectivenessRate)}</td>
                <td className="p-2 text-center">{formatDays(row.avgRecoveryDays)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="p-6 text-center text-[10px] text-muted-foreground">لا توجد بيانات كافية للتحليل بعد.</div>
    )}
  </div>
);

const Field = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input type="number" value={value} onChange={(event) => onChange(event.target.value)} />
  </div>
);

const TextField = ({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Textarea rows={4} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </div>
);

const InfoBlock = ({ title, text }: { title: string; text: string }) => (
  <div className="rounded-xl border bg-white p-3">
    <p className="text-[10px] font-black text-slate-800">{title}</p>
    <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-slate-600">{text}</p>
  </div>
);

const SummaryCard = ({
  label,
  value,
  danger = false,
  warning = false,
  success = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
  warning?: boolean;
  success?: boolean;
}) => (
  <div className={`rounded-xl border px-4 py-3 text-center ${
    danger
      ? 'border-red-200 bg-red-50'
      : warning
        ? 'border-amber-200 bg-amber-50'
        : success
          ? 'border-emerald-200 bg-emerald-50'
          : 'bg-white'
  }`}>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`mt-1 text-xl font-black ${
      danger ? 'text-red-700' : warning ? 'text-amber-800' : success ? 'text-emerald-700' : 'text-slate-900'
    }`}>
      {value.toLocaleString('ar-SA')}
    </p>
  </div>
);

export default TransactionImprovementPlansDialog;
