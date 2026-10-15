import React from 'react';
import {
  AlertTriangle,
  CalendarCheck2,
  Clock3,
  Gauge,
  RefreshCw,
  RotateCcw,
  TimerReset,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpAssignee,
  type TransactionFollowUpDirectiveKpi,
  type TransactionFollowUpDirectiveKpiMetrics,
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
import { NativeSelect } from './ui/native-select';

const EMPTY: TransactionFollowUpDirectiveKpi = {
  generatedAt: new Date(0).toISOString(),
  periodDays: 90,
  assigneeUserId: null,
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: TransactionFollowUpAssignee[];
};

export const TransactionDirectiveKpiDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  assignees,
}) => {
  const [data, setData] = React.useState<TransactionFollowUpDirectiveKpi>(EMPTY);
  const [loading, setLoading] = React.useState(false);
  const [periodDays, setPeriodDays] = React.useState<'30' | '90' | '365' | 'all'>('90');
  const [assigneeUserId, setAssigneeUserId] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.directiveKpi({
        periodDays: periodDays === 'all' ? 'all' : Number(periodDays),
        assigneeUserId: assigneeUserId || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل مؤشرات أداء التوجيهات');
    } finally {
      setLoading(false);
    }
  }, [assigneeUserId, periodDays]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const previous = data.previousSummary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1420px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-emerald-700" />
            مؤشرات أداء التوجيهات والاعتمادات KPI
          </DialogTitle>
          <DialogDescription>
            قياس جودة وسرعة تنفيذ التوجيهات، ونسبة الإنجاز من أول مرة، وإعادة العمل، والالتزام بالمواعيد، مع مقارنة الموظفين والفترات.
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {assigneeUserId ? 'عرض موظف محدد' : 'عرض الإدارة بالكامل'}
              </span>
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
                <RefreshCw className={`ml-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              title="الإنجاز من أول مرة"
              value={formatRate(data.summary.firstPassRate)}
              hint={deltaText(data.summary.firstPassRate, previous?.firstPassRate, 'point')}
              icon={<TrendingUp className="h-5 w-5 text-emerald-700" />}
            />
            <KpiCard
              title="معدل إعادة العمل"
              value={formatRate(data.summary.reworkRate)}
              hint={deltaText(data.summary.reworkRate, previous?.reworkRate, 'point', true)}
              icon={<RotateCcw className="h-5 w-5 text-amber-700" />}
              warning={(data.summary.reworkRate || 0) >= 25}
            />
            <KpiCard
              title="متوسط زمن التنفيذ"
              value={formatHours(data.summary.avgExecutionHours)}
              hint={deltaText(data.summary.avgExecutionHours, previous?.avgExecutionHours, 'hour', true)}
              icon={<TimerReset className="h-5 w-5 text-sky-700" />}
            />
            <KpiCard
              title="متوسط زمن الاعتماد"
              value={formatHours(data.summary.avgApprovalHours)}
              hint={deltaText(data.summary.avgApprovalHours, previous?.avgApprovalHours, 'hour', true)}
              icon={<Clock3 className="h-5 w-5 text-violet-700" />}
            />
            <KpiCard
              title="الالتزام بالمواعيد"
              value={formatRate(data.summary.onTimeRate)}
              hint={deltaText(data.summary.onTimeRate, previous?.onTimeRate, 'point')}
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
                    <table className="w-full min-w-[900px] border-collapse text-xs">
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
                            <MetricCell value={formatRate(employee.firstPassRate)} good={(employee.firstPassRate || 0) >= 80} />
                            <MetricCell value={formatRate(employee.reworkRate)} danger={(employee.reworkRate || 0) >= 25} />
                            <MetricCell value={formatHours(employee.avgExecutionHours)} />
                            <MetricCell value={formatHours(employee.avgApprovalHours)} />
                            <MetricCell value={formatRate(employee.onTimeRate)} good={(employee.onTimeRate || 0) >= 80} />
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

const KpiCard = ({
  title,
  value,
  hint,
  icon,
  warning = false,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  warning?: boolean;
}) => (
  <Card className={`shadow-none ${warning ? 'border-amber-300 bg-amber-50/40' : ''}`}>
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground">{title}</p>
          <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
        </div>
        <div className="rounded-xl border bg-white p-2">{icon}</div>
      </div>
      <p className="mt-2 text-[10px] leading-5 text-muted-foreground">{hint}</p>
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
  good = false,
  danger = false,
}: {
  value: string;
  good?: boolean;
  danger?: boolean;
}) => (
  <td className={`p-3 text-center font-bold ${
    danger ? 'text-red-700' : good ? 'text-emerald-700' : 'text-slate-700'
  }`}>
    {value}
  </td>
);

export default TransactionDirectiveKpiDialog;
