import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileCheck2,
  Gauge,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import {
  transactionRiskApi,
  type TransactionRiskCategory,
  type TransactionRiskDashboard,
  type TransactionRiskLevel,
  type TransactionRiskStatus,
} from '../api/transactionRisks';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const EMPTY: TransactionRiskDashboard = {
  generatedAt: '',
  appetite: {
    maxResidualScore: 9,
    level: 'medium',
    status: 'within',
    withinCount: 0,
    outsideCount: 0,
    outsideRate: 0,
    statement: '',
  },
  summary: {
    active: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    outsideAppetite: 0,
    overdueReview: 0,
    recurring: 0,
    accepted: 0,
    controlled: 0,
    averageInherentScore: null,
    averageResidualScore: null,
    averageRiskReductionPercent: null,
    treatmentCoveragePercent: 0,
  },
  kri: [],
  topRisks: [],
  owners: [],
  categories: [],
  statuses: [],
  treatmentStrategies: [],
  trend: [],
  earlyWarning: {
    summary: {
      atRiskMetrics: 0,
      predictedMetricBreaches: 0,
      atRiskEmployees: 0,
      criticalEmployees: 0,
      highRiskEmployees: 0,
      mediumRiskEmployees: 0,
    },
    metrics: [],
    employees: [],
  },
  preventive: {
    periodDays: 90,
    total: 0,
    verified: 0,
    effective: 0,
    failed: 0,
    overdue: 0,
    failureRate: 0,
  },
  capa: {
    open: 0,
    overdue: 0,
  },
  acceptance: {
    pending: 0,
    activeApproved: 0,
    expiringSoon: 0,
    rejected30d: 0,
    expired30d: 0,
    acceptedOutsideAppetite: 0,
  },
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

const levelClass: Record<TransactionRiskLevel, string> = {
  low: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  medium: 'border-amber-300 bg-amber-50 text-amber-900',
  high: 'border-orange-300 bg-orange-50 text-orange-800',
  critical: 'border-red-300 bg-red-50 text-red-800',
};

const kriClass = (status: string) => {
  if (status === 'red') return 'border-red-200 bg-red-50 text-red-900';
  if (status === 'yellow') return 'border-amber-200 bg-amber-50 text-amber-950';
  if (status === 'green') return 'border-emerald-200 bg-emerald-50 text-emerald-900';
  return 'border-slate-200 bg-slate-50 text-slate-700';
};

const appetiteClass = (status: TransactionRiskDashboard['appetite']['status']) => {
  if (status === 'breached') return 'border-red-300 bg-red-50 text-red-950';
  if (status === 'watch') return 'border-amber-300 bg-amber-50 text-amber-950';
  return 'border-emerald-300 bg-emerald-50 text-emerald-950';
};

const appetiteLabel = (status: TransactionRiskDashboard['appetite']['status']) => {
  if (status === 'breached') return 'تجاوز شهية المخاطر';
  if (status === 'watch') return 'تحت المراقبة';
  return 'ضمن شهية المخاطر';
};

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

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : '—';

const formatKriValue = (value: number | null, unit: string) => {
  if (value == null) return '—';
  const formatted = value.toLocaleString('ar-SA', { maximumFractionDigits: 1 });
  return unit === '%' ? formatted + '%' : formatted + ' ' + unit;
};

const monthName = (year: number, month: number) =>
  new Intl.DateTimeFormat('ar-SA', { month: 'short', year: '2-digit' }).format(new Date(year, month - 1, 1));

const ProgressMetric = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) => (
  <div className="space-y-2 rounded-xl border p-3">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <b>{value.toLocaleString('ar-SA', { maximumFractionDigits: 1 })}%</b>
    </div>
    <Progress value={Math.max(0, Math.min(100, value))} />
  </div>
);

export const TransactionRiskExecutiveDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = React.useState<TransactionRiskDashboard>(EMPTY);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setData(await transactionRiskApi.dashboard());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل لوحة المخاطر التنفيذية');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const maxTrend = Math.max(
    1,
    ...data.trend.flatMap((item) => [item.created, item.closed, item.highCriticalAssessments]),
  );

  const topCategoryMax = Math.max(1, ...data.categories.map((item) => item.active));
  const topOwnerMax = Math.max(1, ...data.owners.map((item) => item.active));

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate('/follow-up')}>
            <ArrowRight className="me-2 h-4 w-4" />
            نظام المتابعة
          </Button>
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-red-800">
            <Gauge className="h-4 w-4" />
            لوحة الإدارة العليا
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">لوحة المخاطر التنفيذية</h1>
          <p className="mt-2 max-w-5xl text-sm leading-7 text-muted-foreground">
            رؤية تنفيذية موحدة للمخاطر التشغيلية، شهية المخاطر، مؤشرات KRI، اتجاه المخاطر،
            فعالية المعالجات، المخاطر الأعلى أولوية، والتكامل مع الإنذار المبكر والتدخلات الوقائية وCAPA.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/follow-up/risks')}>
            <ShieldAlert className="me-2 h-4 w-4" />
            سجل المخاطر
          </Button>
          <Button variant="outline" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={'me-2 h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
            تحديث المؤشرات
          </Button>
        </div>
      </div>

      <Card className={appetiteClass(data.appetite.status)}>
        <CardContent className="grid gap-4 p-5 xl:grid-cols-[1.4fr_.6fr] xl:items-center">
          <div className="flex items-start gap-3">
            {data.appetite.status === 'breached' ? (
              <AlertTriangle className="mt-1 h-6 w-6 shrink-0" />
            ) : (
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-black">شهية المخاطر Risk Appetite</p>
                <Badge variant="outline" className="border-current">
                  {appetiteLabel(data.appetite.status)}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-7">
                {data.appetite.statement || 'جارٍ تحميل سياسة شهية المخاطر...'}
              </p>
              <p className="mt-1 text-xs opacity-80">
                آخر تحديث: {formatDateTime(data.generatedAt)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-current/20 bg-white/60 p-4 text-center">
            <p className="text-xs">خارج الشهية</p>
            <p className="mt-1 text-3xl font-black">
              {data.appetite.outsideRate.toLocaleString('ar-SA', { maximumFractionDigits: 1 })}%
            </p>
            <p className="mt-1 text-xs">
              {data.appetite.outsideCount.toLocaleString('ar-SA')} من {data.summary.active.toLocaleString('ar-SA')} خطر نشط
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="المخاطر النشطة"
          value={data.summary.active}
          hint={'منخفض ' + data.summary.low + ' · متوسط ' + data.summary.medium}
        />
        <SummaryCard
          label="مرتفعة / حرجة"
          value={data.summary.high + data.summary.critical}
          hint={'حرجة ' + data.summary.critical + ' · مرتفعة ' + data.summary.high}
          danger={data.summary.critical > 0}
        />
        <SummaryCard
          label="خارج الشهية"
          value={data.summary.outsideAppetite}
          hint={'الحد المقبول ≤ ' + data.appetite.maxResidualScore + '/25'}
          danger={data.summary.outsideAppetite > 0}
        />
        <SummaryCard
          label="مراجعات متأخرة"
          value={data.summary.overdueReview}
          hint="تتطلب إعادة تقييم"
          warning={data.summary.overdueReview > 0}
        />
        <SummaryCard
          label="متوسط الخطر المتبقي"
          value={data.summary.averageResidualScore == null ? '—' : data.summary.averageResidualScore}
          hint={'قبل المعالجة: ' + (data.summary.averageInherentScore ?? '—')}
        />
        <SummaryCard
          label="خفض المخاطر"
          value={data.summary.averageRiskReductionPercent == null ? '—' : data.summary.averageRiskReductionPercent + '%'}
          hint={'تغطية المعالجة ' + data.summary.treatmentCoveragePercent + '%'}
          success={(data.summary.averageRiskReductionPercent || 0) >= 30}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            مؤشرات المخاطر الرئيسية KRI
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.kri.map((item) => (
            <div key={item.key} className={'rounded-2xl border p-4 ' + kriClass(item.status)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black">{item.label}</p>
                  <p className="mt-2 text-2xl font-black">{formatKriValue(item.value, item.unit)}</p>
                </div>
                <Badge variant="outline" className="border-current">
                  المستهدف {item.target}
                </Badge>
              </div>
              <p className="mt-3 text-[11px] leading-5 opacity-80">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              اتجاه المخاطر — آخر 6 أشهر
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.trend.length ? (
              <div className="space-y-4">
                <div className="grid grid-cols-6 gap-2">
                  {data.trend.map((item) => (
                    <div key={item.key} className="space-y-2 text-center">
                      <div className="flex h-40 items-end justify-center gap-1 rounded-xl border bg-slate-50 p-2">
                        <div
                          className="w-3 rounded-t bg-sky-500"
                          style={{ height: Math.max(6, (item.created / maxTrend) * 120) }}
                          title={'مخاطر جديدة: ' + item.created}
                        />
                        <div
                          className="w-3 rounded-t bg-emerald-500"
                          style={{ height: Math.max(6, (item.closed / maxTrend) * 120) }}
                          title={'مغلقة: ' + item.closed}
                        />
                        <div
                          className="w-3 rounded-t bg-red-500"
                          style={{ height: Math.max(6, (item.highCriticalAssessments / maxTrend) * 120) }}
                          title={'تقييمات مرتفعة/حرجة: ' + item.highCriticalAssessments}
                        />
                      </div>
                      <p className="text-[10px] font-bold">{monthName(item.year, item.month)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
                  <span><i className="me-1 inline-block h-2.5 w-2.5 rounded bg-sky-500" />مخاطر جديدة</span>
                  <span><i className="me-1 inline-block h-2.5 w-2.5 rounded bg-emerald-500" />مخاطر مغلقة</span>
                  <span><i className="me-1 inline-block h-2.5 w-2.5 rounded bg-red-500" />تقييمات مرتفعة/حرجة</span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">لا توجد بيانات اتجاه كافية حتى الآن.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5" />
              فعالية المعالجة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProgressMetric
              label="تغطية المخاطر بخطة معالجة أو ضوابط"
              value={data.summary.treatmentCoveragePercent}
              hint="نسبة المخاطر النشطة التي لديها ضابط أو خطة معالجة موثقة"
            />
            <ProgressMetric
              label="متوسط خفض الخطر"
              value={Math.max(0, data.summary.averageRiskReductionPercent || 0)}
              hint="الفارق بين الخطر الكامن والخطر المتبقي"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border p-3 text-center">
                <p className="text-xs text-muted-foreground">تحت السيطرة</p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{data.summary.controlled.toLocaleString('ar-SA')}</p>
              </div>
              <div className="rounded-xl border p-3 text-center">
                <p className="text-xs text-muted-foreground">مقبولة إشرافيًا</p>
                <p className="mt-1 text-2xl font-black">{data.summary.accepted.toLocaleString('ar-SA')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5" />
            أعلى المخاطر أولوية Top Risks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الخطر</TableHead>
                <TableHead className="text-right">التصنيف</TableHead>
                <TableHead className="text-right">المالك</TableHead>
                <TableHead className="text-center">قبل</TableHead>
                <TableHead className="text-center">متبقي</TableHead>
                <TableHead className="text-center">الحالة</TableHead>
                <TableHead className="text-center">المراجعة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topRisks.map((risk) => (
                <TableRow key={risk.id}>
                  <TableCell>
                    <div className="max-w-xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="font-mono text-xs">{risk.riskNumber}</b>
                        <Badge variant="outline" className={levelClass[risk.residualLevel]}>
                          {levelLabels[risk.residualLevel]}
                        </Badge>
                        {risk.recurrenceCount > 0 && (
                          <Badge variant="outline">متكرر ×{risk.recurrenceCount.toLocaleString('ar-SA')}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs font-semibold">{risk.title}</p>
                    </div>
                  </TableCell>
                  <TableCell>{categoryLabels[risk.category]}</TableCell>
                  <TableCell>{risk.ownerName}</TableCell>
                  <TableCell className="text-center font-black">{risk.inherentScore}/25</TableCell>
                  <TableCell className="text-center font-black">{risk.residualScore}/25</TableCell>
                  <TableCell className="text-center">{statusLabels[risk.status]}</TableCell>
                  <TableCell className={'text-center ' + (risk.isReviewOverdue ? 'font-black text-red-700' : '')}>
                    {formatDate(risk.reviewDate)}
                  </TableCell>
                </TableRow>
              ))}
              {!data.topRisks.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    لا توجد مخاطر نشطة مسجلة.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersRound className="h-5 w-5" />
              توزيع المخاطر حسب مالك الخطر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.owners.slice(0, 8).map((owner) => (
              <div key={owner.ownerUserId || owner.ownerName} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{owner.ownerName}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      خارج الشهية {owner.outsideAppetite} · مراجعات متأخرة {owner.overdueReview}
                    </p>
                  </div>
                  <div className="text-left">
                    <b>{owner.active.toLocaleString('ar-SA')}</b>
                    <p className="text-[10px] text-muted-foreground">خطر نشط</p>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-700"
                    style={{ width: Math.max(4, (owner.active / topOwnerMax) * 100) + '%' }}
                  />
                </div>
              </div>
            ))}
            {!data.owners.length && <p className="py-8 text-center text-xs text-muted-foreground">لا توجد بيانات.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5" />
              توزيع المخاطر حسب التصنيف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.categories.map((item) => (
              <div key={item.category} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black">{categoryLabels[item.category]}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      خارج الشهية {item.outsideAppetite} · متوسط الدرجة {item.averageResidualScore}
                    </p>
                  </div>
                  <b>{item.active.toLocaleString('ar-SA')}</b>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-700"
                    style={{ width: Math.max(4, (item.active / topCategoryMax) * 100) + '%' }}
                  />
                </div>
              </div>
            ))}
            {!data.categories.length && <p className="py-8 text-center text-xs text-muted-foreground">لا توجد بيانات.</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              الإنذار المبكر المرتبط بالمخاطر
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <MiniStat label="مؤشرات معرضة للخطر" value={data.earlyWarning.summary.atRiskMetrics} />
              <MiniStat label="تجاوزات متوقعة" value={data.earlyWarning.summary.predictedMetricBreaches} danger />
              <MiniStat label="موظفون عالي/حرج" value={data.earlyWarning.summary.highRiskEmployees + data.earlyWarning.summary.criticalEmployees} warning />
            </div>
            <div className="space-y-2">
              {data.earlyWarning.metrics.map((metric) => (
                <div key={metric.metricKey} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-xs">{metric.metricLabel}</b>
                    <Badge variant="outline" className={levelClass[metric.riskLevel]}>{levelLabels[metric.riskLevel]}</Badge>
                  </div>
                  <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                    الحالي {metric.currentValue ?? '—'} · المتوقع {metric.projectedValue ?? '—'} · المستهدف {metric.direction === 'min' ? '≥' : '≤'} {metric.target}
                  </p>
                </div>
              ))}
              {!data.earlyWarning.metrics.length && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                  لا توجد مؤشرات KPI في نطاق تحذير أو تجاوز متوقع حاليًا.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5" />
              سلسلة المعالجة الوقائية وCAPA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="تدخلات وقائية / 90 يوم" value={data.preventive.total} />
              <MiniStat label="تدخلات فاشلة" value={data.preventive.failed} danger={data.preventive.failed > 0} />
              <MiniStat label="تدخلات متأخرة" value={data.preventive.overdue} warning={data.preventive.overdue > 0} />
              <MiniStat label="CAPA مفتوحة" value={data.capa.open} />
              <MiniStat label="CAPA متأخرة" value={data.capa.overdue} danger={data.capa.overdue > 0} />
              <MiniStat label="نسبة فشل الوقاية" value={data.preventive.failureRate + '%'} warning={data.preventive.failureRate >= 15} />
            </div>
            <Button className="w-full" variant="outline" onClick={() => navigate('/follow-up')}>
              <Activity className="me-2 h-4 w-4" />
              فتح نظام المتابعة والإجراءات التصحيحية
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-slate-50/70">
        <CardContent className="flex items-start gap-3 p-4 text-xs leading-6 text-muted-foreground">
          {data.appetite.status === 'breached' ? (
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
          ) : (
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
          )}
          <p>
            هذه اللوحة مخصصة للقرار الإداري السريع: تبدأ من المخاطر خارج الشهية وKRI الحمراء، ثم أعلى المخاطر أولوية،
            ثم مراجعة فعالية المعالجة والتدخلات الوقائية وCAPA. لا تستبدل سجل المخاطر التفصيلي؛ بل تلخصه للإدارة العليا.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  hint,
  danger = false,
  warning = false,
  success = false,
}: {
  label: string;
  value: number | string;
  hint: string;
  danger?: boolean;
  warning?: boolean;
  success?: boolean;
}) => (
  <Card className={danger ? 'border-red-200 bg-red-50/70' : warning ? 'border-amber-200 bg-amber-50/70' : success ? 'border-emerald-200 bg-emerald-50/70' : ''}>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={'text-3xl font-black ' + (danger ? 'text-red-700' : warning ? 'text-amber-800' : success ? 'text-emerald-700' : '')}>
        {typeof value === 'number' ? value.toLocaleString('ar-SA', { maximumFractionDigits: 1 }) : value}
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>
    </CardContent>
  </Card>
);

const MiniStat = ({
  label,
  value,
  danger = false,
  warning = false,
}: {
  label: string;
  value: number | string;
  danger?: boolean;
  warning?: boolean;
}) => (
  <div className={'rounded-xl border p-3 text-center ' + (danger ? 'border-red-200 bg-red-50' : warning ? 'border-amber-200 bg-amber-50' : 'bg-white')}>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={'mt-1 text-xl font-black ' + (danger ? 'text-red-700' : warning ? 'text-amber-800' : '')}>
      {typeof value === 'number' ? value.toLocaleString('ar-SA') : value}
    </p>
  </div>
);

export default TransactionRiskExecutiveDashboardPage;
