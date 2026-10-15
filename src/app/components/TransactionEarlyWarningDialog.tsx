import React from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Gauge,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpEarlyWarning,
  type TransactionFollowUpEarlyWarningMetric,
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

const riskLabel: Record<TransactionFollowUpEarlyWarningMetric['riskLevel'], string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  critical: 'حرج',
};

const confidenceLabel: Record<TransactionFollowUpEarlyWarningMetric['confidence'], string> = {
  low: 'ثقة منخفضة',
  medium: 'ثقة متوسطة',
  high: 'ثقة مرتفعة',
};

const riskClass = (level: TransactionFollowUpEarlyWarningMetric['riskLevel']) => {
  if (level === 'critical') return 'border-red-300 bg-red-50 text-red-800';
  if (level === 'high') return 'border-orange-300 bg-orange-50 text-orange-800';
  if (level === 'medium') return 'border-amber-300 bg-amber-50 text-amber-900';
  return 'border-emerald-300 bg-emerald-50 text-emerald-800';
};

const statusClass = (status: TransactionFollowUpEarlyWarningMetric['projectedStatus']) => {
  if (status === 'red') return 'border-red-300 bg-red-50 text-red-800';
  if (status === 'yellow') return 'border-amber-300 bg-amber-50 text-amber-900';
  if (status === 'green') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  return 'border-slate-300 bg-slate-50 text-slate-700';
};

const statusLabel = (status: TransactionFollowUpEarlyWarningMetric['projectedStatus']) => {
  if (status === 'red') return 'أحمر';
  if (status === 'yellow') return 'أصفر';
  if (status === 'green') return 'أخضر';
  return 'غير كافٍ';
};

const formatValue = (metric: TransactionFollowUpEarlyWarningMetric, value?: number | null) => {
  if (value == null) return '—';
  if (metric.metricKey.endsWith('Rate')) return `${value.toLocaleString('ar-SA', { maximumFractionDigits: 1 })}%`;
  if (value < 24) return `${value.toLocaleString('ar-SA', { maximumFractionDigits: 1 })} ساعة`;
  return `${(value / 24).toLocaleString('ar-SA', { maximumFractionDigits: 1 })} يوم`;
};

const formatTarget = (metric: TransactionFollowUpEarlyWarningMetric) =>
  `${metric.direction === 'min' ? '≥' : '≤'} ${formatValue(metric, metric.target)}`;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const TransactionEarlyWarningDialog: React.FC<Props> = ({
  open,
  onOpenChange,
}) => {
  const [data, setData] = React.useState<TransactionFollowUpEarlyWarning | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [periodDays, setPeriodDays] = React.useState<'14' | '30' | '60' | '90'>('30');

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.earlyWarning({
        periodDays: Number(periodDays),
      });
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل لوحة الإنذار المبكر');
    } finally {
      setLoading(false);
    }
  }, [periodDays]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1440px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-700" />
            الإنذار المبكر للمخاطر التشغيلية
          </DialogTitle>
          <DialogDescription>
            قراءة استباقية لاتجاه مؤشرات التوجيهات وضغط العمل قبل الوصول إلى الانحراف الأحمر.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pe-1">
          <div className="flex flex-col gap-3 rounded-2xl border bg-slate-50/70 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-2">
              <BrainCircuit className="mt-0.5 h-4 w-4 text-slate-700" />
              <div>
                <p className="text-xs font-black text-slate-900">منهجية إنذار مبكر قائمة على القواعد والاتجاه</p>
                <p className="mt-1 max-w-3xl text-[10px] leading-5 text-muted-foreground">
                  يقارن النظام آخر فترتين متساويتين، ويمد الاتجاه خطيًا إلى الفترة التالية، ثم يدمجه مع ضغط العمل والتأخير والإعادات.
                  هذه قراءة تشغيلية استباقية وليست تنبؤًا بالذكاء الاصطناعي أو ضمانًا لنتيجة مستقبلية.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NativeSelect
                value={periodDays}
                onChange={(event) => setPeriodDays(event.target.value as typeof periodDays)}
                className="w-44"
              >
                <option value="14">مقارنة كل 14 يومًا</option>
                <option value="30">مقارنة كل 30 يومًا</option>
                <option value="60">مقارنة كل 60 يومًا</option>
                <option value="90">مقارنة كل 90 يومًا</option>
              </NativeSelect>
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
                <RefreshCw className={`ml-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
            </div>
          </div>

          {loading && !data ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              جارٍ احتساب المخاطر والاتجاهات...
            </div>
          ) : data ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <SummaryCard label="مؤشرات عالية الخطورة" value={data.summary.atRiskMetrics} danger={data.summary.atRiskMetrics > 0} />
                <SummaryCard label="تجاوزات متوقعة" value={data.summary.predictedMetricBreaches} danger={data.summary.predictedMetricBreaches > 0} />
                <SummaryCard label="موظفون بحاجة تدخل" value={data.summary.atRiskEmployees} warning={data.summary.atRiskEmployees > 0} />
                <SummaryCard label="حالات حرجة" value={data.summary.criticalEmployees} danger={data.summary.criticalEmployees > 0} />
                <SummaryCard label="حالات متوسطة" value={data.summary.mediumRiskEmployees} />
              </div>

              <Card className="shadow-none">
                <CardHeader className="border-b py-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4 text-orange-700" />
                    المؤشرات المتوقع تعرضها للانحراف
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-[11px]">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="p-3 text-right">المؤشر</th>
                          <th className="p-3 text-center">الفترة السابقة</th>
                          <th className="p-3 text-center">الحالي</th>
                          <th className="p-3 text-center">التغير</th>
                          <th className="p-3 text-center">المتوقع</th>
                          <th className="p-3 text-center">المستهدف</th>
                          <th className="p-3 text-center">الخطر</th>
                          <th className="p-3 text-center">الثقة</th>
                          <th className="p-3 text-right">الإجراء الوقائي المقترح</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.metrics.map((metric) => {
                          const deteriorating =
                            metric.delta != null &&
                            (metric.direction === 'min' ? metric.delta < 0 : metric.delta > 0);
                          return (
                            <tr key={metric.metricKey} className="border-t align-top">
                              <td className="p-3">
                                <b>{metric.metricLabel}</b>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <Badge variant="outline" className={statusClass(metric.currentStatus)}>
                                    الآن: {statusLabel(metric.currentStatus)}
                                  </Badge>
                                  <Badge variant="outline" className={statusClass(metric.projectedStatus)}>
                                    متوقع: {statusLabel(metric.projectedStatus)}
                                  </Badge>
                                </div>
                                <p className="mt-2 max-w-xs text-[9px] leading-4 text-muted-foreground">
                                  {metric.reasons.join(' ')}
                                </p>
                              </td>
                              <td className="p-3 text-center font-bold">{formatValue(metric, metric.previousValue)}</td>
                              <td className="p-3 text-center font-black">{formatValue(metric, metric.currentValue)}</td>
                              <td className={`p-3 text-center font-black ${deteriorating ? 'text-red-700' : 'text-emerald-700'}`}>
                                <span className="inline-flex items-center gap-1">
                                  {deteriorating
                                    ? <TrendingDown className="h-3.5 w-3.5" />
                                    : <TrendingUp className="h-3.5 w-3.5" />}
                                  {metric.delta == null ? '—' : metric.delta.toLocaleString('ar-SA', { maximumFractionDigits: 1 })}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex rounded-lg border px-2 py-1 font-black ${statusClass(metric.projectedStatus)}`}>
                                  {formatValue(metric, metric.projectedValue)}
                                </span>
                              </td>
                              <td className="p-3 text-center font-bold">{formatTarget(metric)}</td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={riskClass(metric.riskLevel)}>
                                  {riskLabel[metric.riskLevel]} · {metric.riskScore}/100
                                </Badge>
                              </td>
                              <td className="p-3 text-center">{confidenceLabel[metric.confidence]}</td>
                              <td className="max-w-[310px] p-3 leading-5 text-slate-700">{metric.recommendation}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="border-b py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <UsersRound className="h-4 w-4 text-violet-700" />
                      خريطة مخاطر الموظفين
                    </CardTitle>
                    <Badge variant="outline">
                      أعلى {data.employees.length.toLocaleString('ar-SA')} حالة
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {data.employees.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1060px] text-[11px]">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="p-3 text-right">الموظف</th>
                            <th className="p-3 text-center">درجة الخطر</th>
                            <th className="p-3 text-center">توجيهات مفتوحة</th>
                            <th className="p-3 text-center">متأخرة</th>
                            <th className="p-3 text-center">عاجلة</th>
                            <th className="p-3 text-center">معادة</th>
                            <th className="p-3 text-center">تجاوزات متوقعة</th>
                            <th className="p-3 text-right">أهم سبب</th>
                            <th className="p-3 text-right">التدخل المقترح</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.employees.map((employee) => (
                            <tr key={employee.userId} className="border-t align-top">
                              <td className="p-3">
                                <b>{employee.username}</b>
                                <p className="mt-1 text-[9px] text-muted-foreground">
                                  {confidenceLabel[employee.confidence]} · {employee.reviewedDirectives.toLocaleString('ar-SA')} توجيه مراجع
                                </p>
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className={riskClass(employee.riskLevel)}>
                                  {riskLabel[employee.riskLevel]} · {employee.riskScore}/100
                                </Badge>
                              </td>
                              <td className="p-3 text-center font-bold">{employee.openDirectives.toLocaleString('ar-SA')}</td>
                              <td className={`p-3 text-center font-black ${employee.overdueOpen ? 'text-red-700' : ''}`}>
                                {employee.overdueOpen.toLocaleString('ar-SA')}
                              </td>
                              <td className="p-3 text-center">{employee.urgentOpen.toLocaleString('ar-SA')}</td>
                              <td className="p-3 text-center">{employee.returnedOpen.toLocaleString('ar-SA')}</td>
                              <td className={`p-3 text-center font-black ${employee.predictedBreaches ? 'text-orange-700' : ''}`}>
                                {employee.predictedBreaches.toLocaleString('ar-SA')}
                              </td>
                              <td className="max-w-[260px] p-3 leading-5">{employee.reasons[0] || '—'}</td>
                              <td className="max-w-[300px] p-3 leading-5 text-slate-700">{employee.recommendation}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-muted-foreground">
                      لا توجد بيانات تشغيلية كافية لبناء خريطة مخاطر.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-[10px] leading-5 text-amber-950">
                <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />
                يُستخدم الإنذار المبكر لتحديد أولوية المتابعة الوقائية فقط. كلما كانت كمية البيانات قليلة تظهر درجة ثقة أقل،
                ويجب عدم تفسير درجة الخطر كحكم على أداء الموظف أو كتوقع مؤكد.
              </div>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SummaryCard = ({
  label,
  value,
  danger = false,
  warning = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
  warning?: boolean;
}) => (
  <div className={`rounded-xl border px-4 py-3 text-center ${
    danger
      ? 'border-red-200 bg-red-50'
      : warning
        ? 'border-amber-200 bg-amber-50'
        : 'bg-white'
  }`}>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`mt-1 text-xl font-black ${danger ? 'text-red-700' : warning ? 'text-amber-800' : 'text-slate-900'}`}>
      {value.toLocaleString('ar-SA')}
    </p>
  </div>
);

export default TransactionEarlyWarningDialog;
