import React from 'react';
import { AlertTriangle, Activity, CheckCircle2, Clock3, LockKeyhole, RefreshCcw, ServerCrash, ShieldAlert } from 'lucide-react';
import { apiJson } from '../../lib/http';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

type MonitoringCounts = {
  total: number;
  succeeded: number;
  clientErrors: number;
  unauthenticated: number;
  forbidden: number;
  serverErrors: number;
  slowRequests: number;
  averageDurationMs: number;
  windowEndsAt: string;
  processScope: boolean;
  recentIncidents: Array<{
    occurredAt: string;
    module: string;
    method: string;
    kind: string;
    statusCode: number;
    requestId: string;
  }>;
};

type MonitoringResponse = {
  latest15Minutes: MonitoringCounts;
  persistentLast24Hours: {
    since: string;
    exactCounts: false;
    sampleCounts: {
      authentication_failed: number;
      access_denied: number;
      server_error: number;
    };
  };
  recentAuditedIncidents: Array<{
    id: string;
    createdAt: string;
    action: string;
    module: string;
    username: string | null;
    metadata: unknown;
  }>;
};

const statusText: Record<string, string> = {
  authentication_failed: 'جلسة غير صالحة',
  access_denied: 'صلاحية مرفوضة',
  server_error: 'خطأ خادمي',
};
const monitoringDate = (value: string) =>
  new Date(value).toLocaleString('ar-SA-u-nu-latn', {
    timeZone: 'Asia/Riyadh',
    dateStyle: 'short',
    timeStyle: 'short',
  });

const MonitorMetric: React.FC<{
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: 'normal' | 'warning';
}> = ({ title, value, icon: Icon, variant = 'normal' }) => (
  <div className="rounded-xl border border-border/80 bg-background/80 p-3 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-semibold text-muted-foreground">{title}</span>
      <Icon className={`h-4 w-4 ${variant === 'warning' ? 'text-amber-600' : 'text-primary'}`} />
    </div>
    <p className="mt-2 text-xl font-extrabold tabular-nums text-foreground" dir="ltr">{value}</p>
  </div>
);

/**
 * Admin-only API: /api/audit/monitoring.
 * This panel is additive and never blocks the existing audit operations.
 * No authentication tokens or request bodies are displayed.
 */
export const OperationalMonitoringPanel: React.FC = () => {
  const [data, setData] = React.useState<MonitoringResponse | null>(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [reload, setReload] = React.useState(0);

  React.useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void apiJson<MonitoringResponse>('/api/audit/monitoring', {
      signal: controller.signal,
    }).then((response) => {
      if (!controller.signal.aborted) setData(response);
    }).catch((reason) => {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : 'تعذر تحميل مراقبة المنصة');
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  const metrics = data?.latest15Minutes;
  const samples = data?.persistentLast24Hours.sampleCounts;

  return (
    <Card data-testid="operations-monitoring" className="border-primary/20 bg-card shadow-md">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            مراقبة أداء المنصة ومحاولات الوصول
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            onClick={() => setReload((value) => value + 1)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث المؤشرات
          </Button>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">
          آخر 15 دقيقة: أرقام فعلية من خدمة الـBackend الحالية، تُصفّر عند إعادة تشغيلها.
          سجل آخر 24 ساعة: عينات محفوظة من الأحداث المرفوضة والأخطاء، وليست عدّادًا شاملًا لكل المحاولات.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p role="alert" className="rounded-lg border border-amber-400/50 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
            تعذر تحميل المراقبة: {error}
          </p>
        )}
        {loading && !data && (
          <p role="status" className="py-3 text-sm text-muted-foreground">جارٍ تحميل مؤشرات التشغيل...</p>
        )}
        {metrics && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
              <MonitorMetric title="إجمالي الطلبات" value={metrics.total} icon={Activity} />
              <MonitorMetric title="طلبات ناجحة" value={metrics.succeeded} icon={CheckCircle2} />
              <MonitorMetric title="دخول غير مصرح" value={metrics.unauthenticated} icon={LockKeyhole} variant="warning" />
              <MonitorMetric title="صلاحيات مرفوضة" value={metrics.forbidden} icon={ShieldAlert} variant="warning" />
              <MonitorMetric title="أخطاء الخادم" value={metrics.serverErrors} icon={ServerCrash} variant="warning" />
              <MonitorMetric title="طلبات بطيئة (أكثر من ثانيتين)" value={metrics.slowRequests} icon={Clock3} />
              <MonitorMetric title="متوسط الاستجابة" value={`${metrics.averageDurationMs} ms`} icon={Clock3} />
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
              <span className="font-bold">عينات التدقيق المحفوظة خلال 24 ساعة:</span>
              <span>جلسات غير صالحة: {samples?.authentication_failed ?? 0}</span>
              <span>صلاحيات مرفوضة: {samples?.access_denied ?? 0}</span>
              <span>أخطاء خادمية: {samples?.server_error ?? 0}</span>
            </div>
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                آخر الحوادث المسجلة في سجل التدقيق
              </h3>
              {data?.recentAuditedIncidents?.length ? (
                <div className="max-h-72 overflow-auto rounded-xl border" role="region" aria-label="الحوادث المسجلة">
                  <table className="w-full min-w-[600px] text-right text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="p-2">التاريخ والوقت</th>
                        <th className="p-2">النوع</th>
                        <th className="p-2">القسم</th>
                        <th className="p-2">المستخدم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentAuditedIncidents.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-2 text-xs">{monitoringDate(item.createdAt)}</td>
                          <td className="p-2">{statusText[item.action] || item.action}</td>
                          <td className="p-2" dir="ltr">{item.module}</td>
                          <td className="p-2">{item.username || 'غير مسجل'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                  لا توجد عينات حوادث محفوظة خلال آخر 24 ساعة.
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
