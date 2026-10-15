import React from 'react';
import {
  AlertTriangle,
  BellRing,
  CalendarCheck2,
  Clock3,
  Gauge,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Target,
  TimerReset,
  TrendingUp,
  UsersRound,
  ClipboardCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpAssignee,
  type TransactionFollowUpDirectiveKpi,
  type TransactionFollowUpKpiEvaluationItem,
  type TransactionFollowUpKpiTargets,
  type TransactionFollowUpImprovementPlan,
} from '../api/transactionFollowUp';
import type { ImprovementPlanSeed } from './TransactionImprovementPlansDialog';
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

const DEFAULT_TARGETS: TransactionFollowUpKpiTargets = {
  scope: 'global',
  firstPassRateMin: 90,
  onTimeRateMin: 95,
  reworkRateMax: 10,
  avgExecutionHoursMax: 72,
  avgApprovalHoursMax: 24,
  warningTolerancePercent: 10,
  alertPeriodDays: 30,
  alertsEnabled: true,
};

const NEUTRAL_EVALUATION: TransactionFollowUpKpiEvaluationItem = {
  status: 'neutral',
  met: null,
  value: null,
  target: 0,
  direction: 'min',
};

const EMPTY: TransactionFollowUpDirectiveKpi = {
  generatedAt: new Date(0).toISOString(),
  periodDays: 90,
  assigneeUserId: null,
  targets: DEFAULT_TARGETS,
  evaluation: {
    firstPassRate: { ...NEUTRAL_EVALUATION },
    onTimeRate: { ...NEUTRAL_EVALUATION },
    reworkRate: { ...NEUTRAL_EVALUATION, direction: 'max' },
    avgExecutionHours: { ...NEUTRAL_EVALUATION, direction: 'max' },
    avgApprovalHours: { ...NEUTRAL_EVALUATION, direction: 'max' },
  },
  summary: {
    reviewCount: 0,
    reviewedDirectives: 0,
    approvedDirectives: 0,
    approvedReviews: 0,
    returnedReviews: 0,
    modificationReviews: 0,
    firstPassRate: null,
    reworkRate: null,
    avgExecutionHours: null,
    avgApprovalHours: null,
    onTimeRate: null,
    openDirectives: 0,
    overdueOpen: 0,
    urgentOpen: 0,
  },
  previousSummary: null,
  employees: [],
  monthlyTrend: [],
};

const monthLabel = (year: number, month: number) =>
  new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));

const formatRate = (value: number | null) =>
  value == null ? '—' : `${value.toLocaleString('ar-SA')}%`;

const formatHours = (value: number | null) => {
  if (value == null) return '—';
  if (value < 24) return `${value.toLocaleString('ar-SA')} ساعة`;
  return `${(value / 24).toLocaleString('ar-SA', { maximumFractionDigits: 1 })} يوم`;
};

const deltaText = (
  current: number | null,
  previous: number | null | undefined,
  unit: 'point' | 'hour',
  lowerIsBetter = false,
) => {
  if (current == null || previous == null) return 'لا توجد فترة سابقة كافية للمقارنة';
  const delta = Number((current - previous).toFixed(1));
  if (delta === 0) return 'دون تغير عن الفترة السابقة';
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  const amount = Math.abs(delta).toLocaleString('ar-SA');
  const suffix = unit === 'point' ? 'نقطة' : 'ساعة';
  return `${improved ? 'تحسن' : 'تراجع'} ${amount} ${suffix} عن الفترة السابقة`;
};

const evaluationClass = (status: TransactionFollowUpKpiEvaluationItem['status']) => {
  if (status === 'green') return 'border-emerald-300 bg-emerald-50/70';
  if (status === 'yellow') return 'border-amber-300 bg-amber-50/70';
  if (status === 'red') return 'border-red-300 bg-red-50/70';
  return 'border-slate-200 bg-white';
};

const evaluationTextClass = (status: TransactionFollowUpKpiEvaluationItem['status']) => {
  if (status === 'green') return 'text-emerald-700';
  if (status === 'yellow') return 'text-amber-800';
  if (status === 'red') return 'text-red-700';
  return 'text-slate-700';
};

const statusLabel = (status: TransactionFollowUpKpiEvaluationItem['status']) => {
  if (status === 'green') return 'ضمن المستهدف';
  if (status === 'yellow') return 'قريب من المستهدف';
  if (status === 'red') return 'دون المستهدف';
  return 'بيانات غير كافية';
};

const targetText = (
  evaluation: TransactionFollowUpKpiEvaluationItem,
  unit: 'rate' | 'hours',
) => {
  const symbol = evaluation.direction === 'min' ? '≥' : '≤';
  const formatted = unit === 'rate'
    ? `${evaluation.target.toLocaleString('ar-SA')}%`
    : formatHours(evaluation.target);
  return `المستهدف ${symbol} ${formatted}`;
};

type EditableTargets = Omit<
  TransactionFollowUpKpiTargets,
  'id' | 'scope' | 'updatedById' | 'updatedByName' | 'createdAt' | 'updatedAt'
>;

const editableTargets = (targets: TransactionFollowUpKpiTargets): EditableTargets => ({
  firstPassRateMin: targets.firstPassRateMin,
  onTimeRateMin: targets.onTimeRateMin,
  reworkRateMax: targets.reworkRateMax,
  avgExecutionHoursMax: targets.avgExecutionHoursMax,
  avgApprovalHoursMax: targets.avgApprovalHoursMax,
  warningTolerancePercent: targets.warningTolerancePercent,
  alertPeriodDays: targets.alertPeriodDays,
  alertsEnabled: targets.alertsEnabled,
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: TransactionFollowUpAssignee[];
  onOpenImprovementPlans?: (seed?: ImprovementPlanSeed) => void;
};

export const TransactionDirectiveKpiDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  assignees,
  onOpenImprovementPlans,
}) => {
  const [data, setData] = React.useState<TransactionFollowUpDirectiveKpi>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [savingTargets, setSavingTargets] = React.useState(false);
  const [showTargets, setShowTargets] = React.useState(false);
  const [periodDays, setPeriodDays] = React.useState<'30' | '90' | '365' | 'all'>('90');
  const [assigneeUserId, setAssigneeUserId] = React.useState('');
  const [targets, setTargets] = React.useState<EditableTargets>(editableTargets(DEFAULT_TARGETS));

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.directiveKpi({
        periodDays: periodDays === 'all' ? 'all' : Number(periodDays),
        assigneeUserId: assigneeUserId || undefined,
      });
      setData(result);
      setTargets(editableTargets(result.targets || DEFAULT_TARGETS));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل مؤشرات أداء التوجيهات');
    } finally {
      setLoading(false);
    }
  }, [assigneeUserId, periodDays]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const saveTargets = async () => {
    try {
      setSavingTargets(true);
      const saved = await transactionFollowUpApi.saveKpiTargets(targets);
      setTargets(editableTargets(saved));
      toast.success('تم حفظ مستهدفات الأداء وتفعيل قواعد التقييم');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ مستهدفات الأداء');
    } finally {
      setSavingTargets(false);
    }
  };

  const openCapa = (
    metricKey: TransactionFollowUpImprovementPlan['metricKey'],
    baselineValue: number | null,
    evaluation: TransactionFollowUpKpiEvaluationItem,
    employee?: { userId: string; username: string },
  ) => {
    onOpenImprovementPlans?.({
      metricKey,
      metricLabel:
        metricKey === 'firstPassRate' ? 'الإنجاز من أول مرة' :
        metricKey === 'onTimeRate' ? 'الالتزام بالمواعيد' :
        metricKey === 'reworkRate' ? 'معدل إعادة العمل' :
        metricKey === 'avgExecutionHours' ? 'متوسط زمن التنفيذ' :
        'متوسط زمن الاعتماد',
      baselineValue,
      targetValue: evaluation.target,
      direction: evaluation.direction,
      assigneeUserId: employee?.userId || null,
      assigneeName: employee?.username || null,
    });
  };

  const previous = data.previousSummary;
  const evaluations = Object.values(data.evaluation || {});
  const redCount = evaluations.filter((item) => item.status === 'red').length;
  const yellowCount = evaluations.filter((item) => item.status === 'yellow').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1420px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-emerald-700" />
            مؤشرات أداء التوجيهات والاعتمادات KPI
          </DialogTitle>
          <DialogDescription>
            قياس الأداء مقابل مستهدفات معتمدة، مع تصنيف أخضر / أصفر / أحمر وإصدار تنبيه للإدارة عند انخفاض الأداء.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pe-1">
          <div className="flex flex-col gap-3 rounded-2xl border bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <NativeSelect
                value={periodDays}
                onChange={(event) => setPeriodDays(event.target.value as typeof periodDays)}
                className="w-full sm:w-48"
              >
                <option value="30">آخر 30 يومًا</option>
                <option value="90">آخر 90 يومًا</option>
                <option value="365">آخر سنة</option>
                <option value="all">كل الفترات</option>
              </NativeSelect>
              <NativeSelect
                value={assigneeUserId}
                onChange={(event) => setAssigneeUserId(event.target.value)}
                className="w-full sm:w-60"
              >
                <option value="">جميع الموظفين</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                أخضر: محقق
              </Badge>
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                أصفر: قريب
              </Badge>
              <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                أحمر: دون المستهدف
              </Badge>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowTargets((value) => !value)}>
                <Settings2 className="ml-1 h-3.5 w-3.5" />
                {showTargets ? 'إخفاء المستهدفات' : 'إعداد المستهدفات'}
              </Button>
              {onOpenImprovementPlans && (
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenImprovementPlans()}>
                  <ClipboardCheck className="ml-1 h-3.5 w-3.5" />
                  خطط التحسين CAPA
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
                <RefreshCw className={`ml-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
          </div>

          {showTargets && (
            <Card className="border-emerald-200 bg-emerald-50/20 shadow-none">
              <CardHeader className="border-b border-emerald-100 py-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-emerald-700" />
                  مستهدفات الأداء المعتمدة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <TargetField
                    label="الإنجاز من أول مرة ≥"
                    value={targets.firstPassRateMin}
                    suffix="%"
                    onChange={(value) => setTargets((current) => ({ ...current, firstPassRateMin: value }))}
                  />
                  <TargetField
                    label="الالتزام بالمواعيد ≥"
                    value={targets.onTimeRateMin}
                    suffix="%"
                    onChange={(value) => setTargets((current) => ({ ...current, onTimeRateMin: value }))}
                  />
                  <TargetField
                    label="إعادة العمل ≤"
                    value={targets.reworkRateMax}
                    suffix="%"
                    onChange={(value) => setTargets((current) => ({ ...current, reworkRateMax: value }))}
                  />
                  <TargetField
                    label="زمن التنفيذ ≤"
                    value={targets.avgExecutionHoursMax}
                    suffix="ساعة"
                    max={8760}
                    onChange={(value) => setTargets((current) => ({ ...current, avgExecutionHoursMax: value }))}
                  />
                  <TargetField
                    label="زمن الاعتماد ≤"
                    value={targets.avgApprovalHoursMax}
                    suffix="ساعة"
                    max={8760}
                    onChange={(value) => setTargets((current) => ({ ...current, avgApprovalHoursMax: value }))}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <TargetField
                    label="هامش المنطقة الصفراء"
                    value={targets.warningTolerancePercent}
                    suffix="%"
                    onChange={(value) => setTargets((current) => ({ ...current, warningTolerancePercent: value }))}
                  />
                  <TargetField
                    label="فترة قياس التنبيه"
                    value={targets.alertPeriodDays}
                    suffix="يوم"
                    min={7}
                    max={365}
                    onChange={(value) => setTargets((current) => ({ ...current, alertPeriodDays: Math.round(value) }))}
                  />
                  <label className="flex items-center justify-between rounded-xl border bg-white px-4 py-3">
                    <div>
                      <p className="text-xs font-black text-slate-800">تنبيهات انخفاض KPI</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        إشعار يومي للإدارة عند بقاء المؤشر أصفر أو أحمر.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={targets.alertsEnabled}
                      onChange={(event) => setTargets((current) => ({ ...current, alertsEnabled: event.target.checked }))}
                      className="h-4 w-4 accent-emerald-700"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[10px] leading-5 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    المنطقة الصفراء تسمح بهامش تنبيه قبل الوصول إلى الأحمر؛ أما الأحمر فيعني ابتعادًا أكبر عن المستهدف ويظهر كتنبيه عالي الأهمية.
                  </span>
                  <Button type="button" size="sm" onClick={() => void saveTargets()} disabled={savingTargets}>
                    {savingTargets
                      ? <RefreshCw className="ml-1 h-3.5 w-3.5 animate-spin" />
                      : <Save className="ml-1 h-3.5 w-3.5" />}
                    حفظ المستهدفات
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {(redCount > 0 || yellowCount > 0) && (
            <div className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              redCount > 0 ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'
            }`}>
              <div className="flex items-start gap-2">
                {redCount > 0
                  ? <AlertTriangle className="mt-0.5 h-4 w-4 text-red-700" />
                  : <BellRing className="mt-0.5 h-4 w-4 text-amber-700" />}
                <div>
                  <p className={`text-xs font-black ${redCount > 0 ? 'text-red-800' : 'text-amber-900'}`}>
                    يوجد أداء يحتاج متابعة مقابل المستهدف
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {redCount.toLocaleString('ar-SA')} مؤشر أحمر، و{yellowCount.toLocaleString('ar-SA')} مؤشر أصفر.
                    {data.targets.alertsEnabled ? ' التنبيهات الآلية مفعلة.' : ' التنبيهات الآلية متوقفة.'}
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                فترة التنبيه: {data.targets.alertPeriodDays.toLocaleString('ar-SA')} يوم
              </Badge>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title="الإنجاز من أول مرة"
              value={formatRate(data.summary.firstPassRate)}
              hint={deltaText(data.summary.firstPassRate, previous?.firstPassRate, 'point')}
              target={targetText(data.evaluation.firstPassRate, 'rate')}
              evaluation={data.evaluation.firstPassRate}
              onCreatePlan={data.evaluation.firstPassRate.status === 'red' ? () => openCapa('firstPassRate', data.summary.firstPassRate, data.evaluation.firstPassRate) : undefined}
              icon={<TrendingUp className="h-5 w-5 text-emerald-700" />}
            />
            <KpiCard
              title="معدل إعادة العمل"
              value={formatRate(data.summary.reworkRate)}
              hint={deltaText(data.summary.reworkRate, previous?.reworkRate, 'point', true)}
              target={targetText(data.evaluation.reworkRate, 'rate')}
              evaluation={data.evaluation.reworkRate}
              onCreatePlan={data.evaluation.reworkRate.status === 'red' ? () => openCapa('reworkRate', data.summary.reworkRate, data.evaluation.reworkRate) : undefined}
              icon={<RotateCcw className="h-5 w-5 text-amber-700" />}
            />
            <KpiCard
              title="متوسط زمن التنفيذ"
              value={formatHours(data.summary.avgExecutionHours)}
              hint={deltaText(data.summary.avgExecutionHours, previous?.avgExecutionHours, 'hour', true)}
              target={targetText(data.evaluation.avgExecutionHours, 'hours')}
              evaluation={data.evaluation.avgExecutionHours}
              onCreatePlan={data.evaluation.avgExecutionHours.status === 'red' ? () => openCapa('avgExecutionHours', data.summary.avgExecutionHours, data.evaluation.avgExecutionHours) : undefined}
              icon={<TimerReset className="h-5 w-5 text-sky-700" />}
            />
            <KpiCard
              title="متوسط زمن الاعتماد"
              value={formatHours(data.summary.avgApprovalHours)}
              hint={deltaText(data.summary.avgApprovalHours, previous?.avgApprovalHours, 'hour', true)}
              target={targetText(data.evaluation.avgApprovalHours, 'hours')}
              evaluation={data.evaluation.avgApprovalHours}
              onCreatePlan={data.evaluation.avgApprovalHours.status === 'red' ? () => openCapa('avgApprovalHours', data.summary.avgApprovalHours, data.evaluation.avgApprovalHours) : undefined}
              icon={<Clock3 className="h-5 w-5 text-violet-700" />}
            />
            <KpiCard
              title="الالتزام بالمواعيد"
              value={formatRate(data.summary.onTimeRate)}
              hint={deltaText(data.summary.onTimeRate, previous?.onTimeRate, 'point')}
              target={targetText(data.evaluation.onTimeRate, 'rate')}
              evaluation={data.evaluation.onTimeRate}
              onCreatePlan={data.evaluation.onTimeRate.status === 'red' ? () => openCapa('onTimeRate', data.summary.onTimeRate, data.evaluation.onTimeRate) : undefined}
              icon={<CalendarCheck2 className="h-5 w-5 text-emerald-700" />}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard label="توجيهات تمت مراجعتها" value={data.summary.reviewedDirectives} />
            <StatusCard label="مراجعات الإدارة" value={data.summary.reviewCount} />
            <StatusCard
              label="متأخرة حاليًا"
              value={data.summary.overdueOpen}
              danger={data.summary.overdueOpen > 0}
            />
            <StatusCard
              label="عاجلة مفتوحة"
              value={data.summary.urgentOpen}
              danger={data.summary.urgentOpen > 0}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_1.85fr]">
            <Card className="shadow-none">
              <CardHeader className="border-b py-3">
                <CardTitle className="text-base">الاتجاه الشهري — آخر 6 أشهر</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {data.monthlyTrend.map((month) => (
                  <div key={month.key} className="rounded-xl border bg-white p-3">
                    <div className="flex items-center justify-between gap-3">
                      <b className="text-xs">{monthLabel(month.year, month.month)}</b>
                      <span className="text-[10px] text-muted-foreground">
                        {month.reviewedDirectives.toLocaleString('ar-SA')} توجيه تمت مراجعته
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <TrendBar label="من أول مرة" value={month.firstPassRate} positive />
                      <TrendBar label="في الموعد" value={month.onTimeRate} positive />
                      <TrendBar label="إعادة العمل" value={month.reworkRate} />
                    </div>
                  </div>
                ))}
                {!data.monthlyTrend.length && (
                  <div className="py-16 text-center text-xs text-muted-foreground">لا توجد بيانات شهرية بعد.</div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 shadow-none">
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UsersRound className="h-4 w-4" />
                    مقارنة مؤشرات الموظفين
                  </CardTitle>
                  <Badge variant="outline">{data.employees.length.toLocaleString('ar-SA')} موظف</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data.employees.length ? (
                  <div className="max-h-[560px] overflow-auto">
                    <table className="w-full min-w-[930px] border-collapse text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-50">
                        <tr className="border-b text-right">
                          <th className="p-3">الموظف</th>
                          <th className="p-3 text-center">من أول مرة</th>
                          <th className="p-3 text-center">إعادة العمل</th>
                          <th className="p-3 text-center">زمن التنفيذ</th>
                          <th className="p-3 text-center">زمن الاعتماد</th>
                          <th className="p-3 text-center">في الموعد</th>
                          <th className="p-3 text-center">المراجعة</th>
                          <th className="p-3 text-center">متأخرة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.employees.map((employee) => (
                          <tr key={employee.userId} className="border-b last:border-0 hover:bg-slate-50/70">
                            <td className="p-3">
                              <button
                                type="button"
                                className="font-black text-slate-900 hover:text-primary"
                                onClick={() => setAssigneeUserId(employee.userId)}
                              >
                                {employee.username}
                              </button>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {employee.openDirectives.toLocaleString('ar-SA')} توجيه مفتوح
                              </p>
                            </td>
                            <MetricCell
                              value={formatRate(employee.firstPassRate)}
                              evaluation={employee.evaluation.firstPassRate}
                              onCreatePlan={employee.evaluation.firstPassRate.status === 'red'
                                ? () => openCapa('firstPassRate', employee.firstPassRate, employee.evaluation.firstPassRate, employee)
                                : undefined}
                            />
                            <MetricCell
                              value={formatRate(employee.reworkRate)}
                              evaluation={employee.evaluation.reworkRate}
                              onCreatePlan={employee.evaluation.reworkRate.status === 'red'
                                ? () => openCapa('reworkRate', employee.reworkRate, employee.evaluation.reworkRate, employee)
                                : undefined}
                            />
                            <MetricCell
                              value={formatHours(employee.avgExecutionHours)}
                              evaluation={employee.evaluation.avgExecutionHours}
                              onCreatePlan={employee.evaluation.avgExecutionHours.status === 'red'
                                ? () => openCapa('avgExecutionHours', employee.avgExecutionHours, employee.evaluation.avgExecutionHours, employee)
                                : undefined}
                            />
                            <MetricCell
                              value={formatHours(employee.avgApprovalHours)}
                              evaluation={employee.evaluation.avgApprovalHours}
                              onCreatePlan={employee.evaluation.avgApprovalHours.status === 'red'
                                ? () => openCapa('avgApprovalHours', employee.avgApprovalHours, employee.evaluation.avgApprovalHours, employee)
                                : undefined}
                            />
                            <MetricCell
                              value={formatRate(employee.onTimeRate)}
                              evaluation={employee.evaluation.onTimeRate}
                              onCreatePlan={employee.evaluation.onTimeRate.status === 'red'
                                ? () => openCapa('onTimeRate', employee.onTimeRate, employee.evaluation.onTimeRate, employee)
                                : undefined}
                            />
                            <td className="p-3 text-center font-bold">{employee.reviewedDirectives.toLocaleString('ar-SA')}</td>
                            <td className={`p-3 text-center font-black ${employee.overdueOpen ? 'text-red-700' : 'text-slate-700'}`}>
                              {employee.overdueOpen.toLocaleString('ar-SA')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-20 text-center text-xs text-muted-foreground">
                    لا توجد بيانات أداء كافية في الفترة المحددة.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[11px] leading-6 text-slate-600">
            <b>طريقة احتساب المؤشرات:</b> الإنجاز من أول مرة يعتمد على أول مراجعة إدارية للتوجيه؛
            إعادة العمل تشمل الإعادة للاستكمال أو طلب التعديل؛ زمن التنفيذ من إصدار التوجيه حتى أول رفع للإنجاز؛
            زمن الاعتماد من رفع الإنجاز حتى قرار الإدارة؛ والالتزام بالموعد يُحتسب وفق تاريخ رفع الإنجاز مقارنة بتاريخ الاستحقاق.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TargetField = ({
  label,
  value,
  suffix,
  min = 0,
  max = 100,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) => (
  <div className="space-y-1.5">
    <Label className="text-[11px]">{label}</Label>
    <div className="relative">
      <Input
        type="number"
        min={min}
        max={max}
        step="0.1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="pe-14"
      />
      <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
        {suffix}
      </span>
    </div>
  </div>
);

const KpiCard = ({
  title,
  value,
  hint,
  target,
  icon,
  evaluation,
  onCreatePlan,
}: {
  title: string;
  value: string;
  hint: string;
  target: string;
  icon: React.ReactNode;
  evaluation: TransactionFollowUpKpiEvaluationItem;
  onCreatePlan?: () => void;
}) => (
  <Card className={`shadow-none ${evaluationClass(evaluation.status)}`}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground">{title}</p>
          <p className={`mt-1 text-xl font-black ${evaluationTextClass(evaluation.status)}`}>{value}</p>
        </div>
        <div className="rounded-xl border bg-white p-2">{icon}</div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline" className={evaluationClass(evaluation.status)}>
          {statusLabel(evaluation.status)}
        </Badge>
        <Badge variant="outline">{target}</Badge>
      </div>
      <p className="mt-2 text-[10px] leading-5 text-muted-foreground">{hint}</p>
      {onCreatePlan && (
        <Button type="button" variant="outline" size="sm" className="mt-2 w-full border-red-200 bg-white text-red-800" onClick={onCreatePlan}>
          <ClipboardCheck className="ml-1 h-3.5 w-3.5" />
          إنشاء خطة تحسين
        </Button>
      )}
    </CardContent>
  </Card>
);

const StatusCard = ({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
}) => (
  <div className={`rounded-xl border px-4 py-3 ${danger ? 'border-red-200 bg-red-50' : 'bg-white'}`}>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`mt-1 text-xl font-black ${danger ? 'text-red-700' : 'text-slate-900'}`}>
      {value.toLocaleString('ar-SA')}
    </p>
  </div>
);

const TrendBar = ({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: number | null;
  positive?: boolean;
}) => {
  const width = Math.max(0, Math.min(100, value || 0));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <b>{formatRate(value)}</b>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${positive ? 'bg-emerald-500' : 'bg-amber-500'}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

const MetricCell = ({
  value,
  evaluation,
  onCreatePlan,
}: {
  value: string;
  evaluation: TransactionFollowUpKpiEvaluationItem;
  onCreatePlan?: () => void;
}) => (
  <td className="p-3 text-center">
    <div className="flex flex-col items-center gap-1">
      <span className={`inline-flex min-w-16 justify-center rounded-lg border px-2 py-1 font-black ${
        evaluationClass(evaluation.status)
      } ${evaluationTextClass(evaluation.status)}`}>
        {value}
      </span>
      {onCreatePlan && (
        <button type="button" className="text-[9px] font-bold text-red-700 underline-offset-2 hover:underline" onClick={onCreatePlan}>
          خطة تحسين
        </button>
      )}
    </div>
  </td>
);

export default TransactionDirectiveKpiDialog;
