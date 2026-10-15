import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gavel,
  RefreshCw,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpAssignee,
  type TransactionFollowUpDirectivesDashboard,
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
import { NativeSelect } from './ui/native-select';

const EMPTY_DATA: TransactionFollowUpDirectivesDashboard = {
  generatedAt: new Date(0).toISOString(),
  scope: 'all',
  summary: {
    total: 0,
    open: 0,
    pending: 0,
    inProgress: 0,
    awaitingApproval: 0,
    returned: 0,
    overdue: 0,
    dueToday: 0,
    dueSoon: 0,
    completed7d: 0,
    issuedToday: 0,
    urgentOpen: 0,
    decisions: 0,
    directives: 0,
  },
  employees: [],
  items: [],
  totalItems: 0,
};

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : '—';

const statusLabel: Record<string, string> = {
  pending: 'بانتظار التنفيذ',
  in_progress: 'قيد التنفيذ',
  awaiting_approval: 'بانتظار اعتماد الإدارة',
  returned: 'معاد للاستكمال',
  completed: 'منجز ومعتمد',
  cancelled: 'ملغى',
};

const priorityLabel: Record<string, string> = {
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supervisor: boolean;
  assignees: TransactionFollowUpAssignee[];
  onOpenTransaction: (transactionId: string) => void;
};

export const TransactionDirectivesDashboardDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  supervisor,
  assignees,
  onOpenTransaction,
}) => {
  const [data, setData] = React.useState<TransactionFollowUpDirectivesDashboard>(EMPTY_DATA);
  const [loading, setLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [assigneeUserId, setAssigneeUserId] = React.useState('');

  const load = React.useCallback(async (overrideAssigneeUserId?: string) => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.directivesDashboard({
        search,
        status,
        priority,
        assigneeUserId: supervisor
          ? (overrideAssigneeUserId !== undefined ? overrideAssigneeUserId : assigneeUserId) || undefined
          : undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل لوحة التوجيهات والقرارات');
    } finally {
      setLoading(false);
    }
  }, [assigneeUserId, priority, search, status, supervisor]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setAssigneeUserId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1320px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-indigo-700" />
            {supervisor ? 'اللوحة المركزية للتوجيهات والقرارات' : 'توجيهاتي وقراراتي'}
          </DialogTitle>
          <DialogDescription>
            {supervisor
              ? 'متابعة جميع التوجيهات والقرارات الصادرة عبر المعاملات، مع رصد التأخير والاستحقاقات والحمل لكل موظف.'
              : 'متابعة التوجيهات والقرارات المسندة إليك وحالات تنفيذها.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pe-1">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-11">
            <Metric label="المفتوحة" value={data.summary.open} />
            <Metric label="بانتظار التنفيذ" value={data.summary.pending} warning={data.summary.pending > 0} />
            <Metric label="قيد التنفيذ" value={data.summary.inProgress} />
            <Metric label="بانتظار الاعتماد" value={data.summary.awaitingApproval} warning={data.summary.awaitingApproval > 0} />
            <Metric label="معادة للاستكمال" value={data.summary.returned} warning={data.summary.returned > 0} />
            <Metric label="صدرت اليوم" value={data.summary.issuedToday} />
            <Metric label="المتأخرة" value={data.summary.overdue} danger={data.summary.overdue > 0} />
            <Metric label="مستحقة اليوم" value={data.summary.dueToday} warning={data.summary.dueToday > 0} />
            <Metric label="خلال 3 أيام" value={data.summary.dueSoon} />
            <Metric label="عاجلة" value={data.summary.urgentOpen} danger={data.summary.urgentOpen > 0} />
            <Metric label="منجزة آخر 7 أيام" value={data.summary.completed7d} success={data.summary.completed7d > 0} />
          </div>

          <Card className="shadow-none">
            <CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[1.5fr_.8fr_.8fr_.9fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pe-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث برقم المعاملة، الموضوع، التوجيه أو الموظف..."
                />
              </div>
              <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">كل الحالات</option>
                <option value="pending">بانتظار التنفيذ</option>
                <option value="in_progress">قيد التنفيذ</option>
                <option value="awaiting_approval">بانتظار اعتماد الإدارة</option>
                <option value="returned">معادة للاستكمال</option>
                <option value="completed">منجزة ومعتمدة</option>
                <option value="cancelled">ملغاة</option>
              </NativeSelect>
              <NativeSelect value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">كل الأولويات</option>
                <option value="normal">عادية</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </NativeSelect>
              {supervisor ? (
                <NativeSelect value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}>
                  <option value="">جميع الموظفين</option>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </NativeSelect>
              ) : <div />}
              <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                تطبيق
              </Button>
              <Button type="button" variant="ghost" onClick={clearFilters}>
                مسح
              </Button>
            </CardContent>
          </Card>

          <div className={`grid gap-4 ${supervisor ? 'xl:grid-cols-[1.85fr_.75fr]' : ''}`}>
            <Card className="min-w-0 shadow-none">
              <CardHeader className="border-b py-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">جميع التوجيهات والقرارات</CardTitle>
                  <Badge variant="outline">{data.totalItems.toLocaleString('ar-SA')} سجل</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading && !data.items.length ? (
                  <div className="py-20 text-center text-sm text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    جارٍ تحميل التوجيهات...
                  </div>
                ) : data.items.length === 0 ? (
                  <div className="py-20 text-center text-sm text-muted-foreground">
                    لا توجد توجيهات مطابقة للمرشحات الحالية.
                  </div>
                ) : (
                  <div className="max-h-[520px] divide-y overflow-y-auto">
                    {data.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onOpenChange(false);
                          onOpenTransaction(item.transactionId);
                        }}
                        className="w-full p-4 text-right transition hover:bg-slate-50"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">
                                {item.directiveType === 'decision' ? 'قرار إداري' : 'توجيه إداري'}
                              </Badge>
                              <Badge variant="outline">{statusLabel[item.status]}</Badge>
                              <Badge
                                variant="outline"
                                className={item.priority === 'urgent'
                                  ? 'border-red-300 bg-red-50 text-red-700'
                                  : item.priority === 'high'
                                    ? 'border-orange-300 bg-orange-50 text-orange-800'
                                    : ''}
                              >
                                {priorityLabel[item.priority]}
                              </Badge>
                              {item.isOverdue && (
                                <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
                                  متأخر {item.daysOverdue.toLocaleString('ar-SA')} يوم
                                </Badge>
                              )}
                              {item.isDueToday && !item.isOverdue && (
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                                  مستحق اليوم
                                </Badge>
                              )}
                            </div>
                            <h4 className="mt-2 text-sm font-black text-slate-900">{item.title}</h4>
                            <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-600">{item.instruction}</p>
                            <p className="mt-2 text-[11px] text-muted-foreground">
                              المعاملة <b className="text-foreground">{item.transaction.transactionNumber}</b>
                              {' — '}
                              {item.transaction.subject}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                              <span>المكلف: <b className="text-foreground">{item.assigneeName}</b></span>
                              <span>الاستحقاق: <b className="text-foreground">{formatDate(item.dueDate)}</b></span>
                              <span>صدر بواسطة: <b className="text-foreground">{item.issuedByName || '—'}</b></span>
                            </div>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold text-primary">فتح المعاملة</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {supervisor && (
              <Card className="shadow-none">
                <CardHeader className="border-b py-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UsersRound className="h-4 w-4" />
                    التوجيهات حسب الموظف
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {data.employees.length === 0 ? (
                    <div className="py-16 text-center text-xs text-muted-foreground">لا توجد بيانات موظفين.</div>
                  ) : (
                    <div className="max-h-[520px] divide-y overflow-y-auto">
                      {data.employees.map((employee) => (
                        <button
                          key={employee.userId}
                          type="button"
                          onClick={() => {
                            setAssigneeUserId(employee.userId);
                            void load(employee.userId);
                          }}
                          className="w-full px-4 py-3 text-right transition hover:bg-slate-50"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-slate-900">{employee.username}</p>
                              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                                <span>مفتوحة: <b>{employee.open.toLocaleString('ar-SA')}</b></span>
                                <span>قيد التنفيذ: <b>{employee.inProgress.toLocaleString('ar-SA')}</b></span>
                                <span>بانتظار الاعتماد: <b>{employee.awaitingApproval.toLocaleString('ar-SA')}</b></span>
                                <span>معادة: <b>{employee.returned.toLocaleString('ar-SA')}</b></span>
                                <span>منجزة ومعتمدة: <b>{employee.completed.toLocaleString('ar-SA')}</b></span>
                                <span className={employee.overdue ? 'text-red-700' : ''}>
                                  متأخرة: <b>{employee.overdue.toLocaleString('ar-SA')}</b>
                                </span>
                              </div>
                            </div>
                            {employee.urgent > 0 && (
                              <Badge variant="outline" className="shrink-0 border-red-300 bg-red-50 text-red-700">
                                {employee.urgent.toLocaleString('ar-SA')} عاجلة
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <MiniSummary
              icon={<Gavel className="h-4 w-4 text-indigo-700" />}
              label="إجمالي التوجيهات"
              value={data.summary.directives}
            />
            <MiniSummary
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-700" />}
              label="إجمالي القرارات"
              value={data.summary.decisions}
            />
            <MiniSummary
              icon={<UserRound className="h-4 w-4 text-slate-700" />}
              label="إجمالي السجلات"
              value={data.summary.total}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Metric = ({
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
  <div
    className={`rounded-xl border px-3 py-2.5 text-center ${
      danger
        ? 'border-red-200 bg-red-50'
        : warning
          ? 'border-amber-200 bg-amber-50'
          : success
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-slate-200 bg-white'
    }`}
  >
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`mt-0.5 text-xl font-black ${
      danger ? 'text-red-700' : warning ? 'text-amber-800' : success ? 'text-emerald-700' : 'text-slate-900'
    }`}>
      {value.toLocaleString('ar-SA')}
    </p>
  </div>
);

const MiniSummary = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) => (
  <div className="flex items-center justify-between rounded-xl border bg-slate-50/70 px-3 py-2.5">
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-xs font-bold text-slate-700">{label}</span>
    </div>
    <b>{value.toLocaleString('ar-SA')}</b>
  </div>
);

export default TransactionDirectivesDashboardDialog;
