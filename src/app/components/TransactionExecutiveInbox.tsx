import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Inbox,
  RefreshCw,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { TransactionFollowUpExecutiveInbox } from '../api/transactionFollowUp';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : '—';

const formatTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

const priorityLabel: Record<string, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
};

type Props = {
  data: TransactionFollowUpExecutiveInbox;
  loading?: boolean;
  supervisor?: boolean;
  onRefresh: () => void;
  onOpenTransaction: (id: string) => void;
};

export const TransactionExecutiveInbox: React.FC<Props> = ({
  data,
  loading = false,
  supervisor = false,
  onRefresh,
  onOpenTransaction,
}) => (
  <Card className="overflow-hidden rounded-[28px] border-amber-200 bg-gradient-to-l from-amber-50/70 via-white to-white shadow-md">
    <CardHeader className="border-b border-amber-100 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Inbox className="h-5 w-5 text-amber-700" />
            {supervisor ? 'صندوق الإدارة اليومي' : 'أولويات المتابعة اليوم'}
          </CardTitle>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {supervisor
              ? 'المعاملات التي تستدعي تدخلًا اليوم مرتبة حسب درجة الخطورة، مع نظرة على الحمل التشغيلي للموظفين.'
              : 'المعاملات المسندة إليك التي تحتاج إجراء أو متابعة اليوم.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">آخر تحديث {formatTime(data.generatedAt)}</span>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`ml-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>
    </CardHeader>

    <CardContent className="space-y-4 p-4 sm:p-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <InboxMetric title="تحتاج تدخل" value={data.counters.attention} danger={data.counters.attention > 0} />
        <InboxMetric title="متأخرة" value={data.counters.overdue} danger={data.counters.overdue > 0} />
        <InboxMetric title="مستحقة اليوم" value={data.counters.dueToday} warning={data.counters.dueToday > 0} />
        <InboxMetric title="غير مسندة" value={data.counters.unassigned} warning={data.counters.unassigned > 0} />
        <InboxMetric title="دون إجراء" value={data.counters.inactive} warning={data.counters.inactive > 0} />
        <InboxMetric title="عاجلة" value={data.counters.urgent} danger={data.counters.urgent > 0} />
      </div>

      <div className={`grid gap-4 ${supervisor ? 'xl:grid-cols-[1.65fr_.75fr]' : ''}`}>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">التدخلات ذات الأولوية</h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">الأعلى خطورة يظهر أولًا.</p>
            </div>
            <Badge variant="outline">{data.attentionItems.length.toLocaleString('ar-SA')} معاملة</Badge>
          </div>

          {data.attentionItems.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-2 text-sm font-black text-emerald-800">لا توجد معاملات حرجة حاليًا</p>
              <p className="mt-1 text-xs text-muted-foreground">جميع المعاملات المفتوحة ضمن المتابعة الحالية.</p>
            </div>
          ) : (
            <div className="max-h-[420px] divide-y overflow-y-auto">
              {data.attentionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenTransaction(item.id)}
                  className="w-full px-4 py-3 text-right transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <b className="text-sm text-slate-900">معاملة {item.transactionNumber}</b>
                        <Badge
                          variant="outline"
                          className={item.priority === 'urgent'
                            ? 'border-red-300 bg-red-50 text-red-800'
                            : item.priority === 'high'
                              ? 'border-orange-300 bg-orange-50 text-orange-800'
                              : ''}
                        >
                          {priorityLabel[item.priority] || item.priority}
                        </Badge>
                        {item.reasons.slice(0, 3).map((reason) => (
                          <Badge
                            key={reason}
                            variant="outline"
                            className={reason.includes('متأخرة') || reason.includes('عاجلة') || reason.includes('تحتاج إجراء')
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-amber-200 bg-amber-50 text-amber-800'}
                          >
                            {reason}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-slate-700">{item.subject}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                        <span>الموظف: <b className="text-foreground">{item.currentAssigneeName || 'غير مسندة'}</b></span>
                        <span>الاستحقاق: <b className="text-foreground">{formatDate(item.dueDate)}</b></span>
                        {item.requiredAction && <span className="max-w-[420px] truncate">المطلوب: <b className="text-foreground">{item.requiredAction}</b></span>}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-primary">فتح المعاملة</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {supervisor && (
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                <UsersRound className="h-4 w-4" />
                الحمل التشغيلي
              </h3>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                الحد الإرشادي للحمل المرتفع: {data.highLoadThreshold.toLocaleString('ar-SA')} معاملات مفتوحة.
              </p>
            </div>

            {data.employeeLoad.length ? (
              <div className="divide-y">
                {data.employeeLoad.map((employee) => (
                  <div key={employee.userId} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-900">{employee.username}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                          <span>مفتوحة: <b>{employee.open.toLocaleString('ar-SA')}</b></span>
                          <span className={employee.overdue ? 'text-red-700' : ''}>متأخرة: <b>{employee.overdue.toLocaleString('ar-SA')}</b></span>
                          <span>تحتاج تدخل: <b>{employee.needsAction.toLocaleString('ar-SA')}</b></span>
                        </div>
                      </div>
                      {employee.highLoad && (
                        <Badge variant="outline" className="shrink-0 border-orange-300 bg-orange-50 text-orange-800">
                          حمل مرتفع
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                لا توجد أحمال تشغيلية مسجلة حاليًا.
              </div>
            )}
          </section>
        )}
      </div>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-[10px] text-slate-600">
        <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-red-600" />تحتاج متابعة: <b>{data.counters.needsFollowUp.toLocaleString('ar-SA')}</b></span>
        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-amber-700" />بانتظار رد دون تحديث: <b>{data.counters.staleWaiting.toLocaleString('ar-SA')}</b></span>
        <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5 text-slate-600" />إجمالي المفتوحة: <b>{data.counters.totalOpen.toLocaleString('ar-SA')}</b></span>
      </div>
    </CardContent>
  </Card>
);

const InboxMetric = ({
  title,
  value,
  danger = false,
  warning = false,
}: {
  title: string;
  value: number;
  danger?: boolean;
  warning?: boolean;
}) => (
  <div
    className={`rounded-xl border px-3 py-2.5 text-center ${
      danger
        ? 'border-red-200 bg-red-50'
        : warning
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-white'
    }`}
  >
    <p className="text-[10px] text-muted-foreground">{title}</p>
    <p className={`mt-0.5 text-xl font-black ${danger ? 'text-red-700' : warning ? 'text-amber-800' : 'text-slate-900'}`}>
      {value.toLocaleString('ar-SA')}
    </p>
  </div>
);

export default TransactionExecutiveInbox;
