import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Paperclip,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpApprovalCenter,
  type TransactionFollowUpAssignee,
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
import { Textarea } from './ui/textarea';

const EMPTY_DATA: TransactionFollowUpApprovalCenter = {
  generatedAt: new Date(0).toISOString(),
  summary: {
    awaitingApproval: 0,
    urgent: 0,
    overdue: 0,
    withoutEvidence: 0,
    waitingOver2Days: 0,
  },
  employees: [],
  items: [],
  totalItems: 0,
};

const priorityLabel: Record<string, string> = {
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: TransactionFollowUpAssignee[];
  onOpenTransaction: (transactionId: string) => void;
  onChanged?: () => void | Promise<void>;
};

export const TransactionApprovalCenterDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  assignees,
  onOpenTransaction,
  onChanged,
}) => {
  const [data, setData] = React.useState<TransactionFollowUpApprovalCenter>(EMPTY_DATA);
  const [loading, setLoading] = React.useState(false);
  const [reviewingId, setReviewingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [assigneeUserId, setAssigneeUserId] = React.useState('');
  const [notes, setNotes] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.approvalCenter({
        search,
        priority,
        assigneeUserId,
      });
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل مركز اعتماد الإنجازات');
    } finally {
      setLoading(false);
    }
  }, [assigneeUserId, priority, search]);

  React.useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void load(), search.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [open, load, search]);

  const review = async (
    transactionId: string,
    directiveId: string,
    decision: 'approved' | 'return_for_completion' | 'request_modification',
  ) => {
    const note = String(notes[directiveId] || '').trim();
    if (decision !== 'approved' && !note) {
      toast.error('اكتب ملاحظة الإدارة قبل الإعادة للاستكمال أو طلب التعديل');
      return;
    }
    if (decision === 'approved' && !window.confirm('اعتماد نتيجة التنفيذ وإغلاق هذا التوجيه نهائيًا؟')) {
      return;
    }

    try {
      setReviewingId(directiveId);
      await transactionFollowUpApi.reviewDirective(transactionId, directiveId, {
        decision,
        reviewNote: note || null,
      });
      toast.success(
        decision === 'approved'
          ? 'تم اعتماد الإنجاز'
          : decision === 'return_for_completion'
            ? 'تمت إعادة التوجيه للاستكمال'
            : 'تم طلب تعديل نتيجة التنفيذ',
      );
      setNotes((current) => {
        const next = { ...current };
        delete next[directiveId];
        return next;
      });
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر مراجعة الإنجاز');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1360px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-violet-700" />
            مركز اعتماد الإنجازات
          </DialogTitle>
          <DialogDescription>
            مراجعة نتائج تنفيذ التوجيهات والقرارات والمرفقات واعتمادها أو إعادتها للموظف دون فتح كل معاملة على حدة.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pe-1">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="بانتظار الاعتماد" value={data.summary.awaitingApproval} />
            <Metric label="عاجلة" value={data.summary.urgent} danger={data.summary.urgent > 0} />
            <Metric label="متجاوزة الاستحقاق" value={data.summary.overdue} danger={data.summary.overdue > 0} />
            <Metric label="دون مرفقات" value={data.summary.withoutEvidence} warning={data.summary.withoutEvidence > 0} />
            <Metric label="تنتظر 2+ يوم" value={data.summary.waitingOver2Days} warning={data.summary.waitingOver2Days > 0} />
          </div>

          <Card className="shadow-none">
            <CardContent className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[1.6fr_.8fr_1fr_auto_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pe-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="بحث برقم المعاملة، الموضوع، الموظف أو نتيجة التنفيذ..."
                />
              </div>
              <NativeSelect value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="">كل الأولويات</option>
                <option value="normal">عادية</option>
                <option value="high">عالية</option>
                <option value="urgent">عاجلة</option>
              </NativeSelect>
              <NativeSelect value={assigneeUserId} onChange={(event) => setAssigneeUserId(event.target.value)}>
                <option value="">جميع الموظفين</option>
                {assignees.map((user) => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </NativeSelect>
              <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`ml-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                تحديث
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setPriority('');
                  setAssigneeUserId('');
                }}
              >
                مسح
              </Button>
            </CardContent>
          </Card>

          {loading && !data.items.length ? (
            <div className="py-24 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              جارٍ تحميل الإنجازات بانتظار الاعتماد...
            </div>
          ) : data.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-20 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
              <p className="mt-3 text-sm font-black text-slate-800">لا توجد إنجازات بانتظار الاعتماد</p>
              <p className="mt-1 text-xs text-muted-foreground">جميع التوجيهات المرفوعة تمت مراجعتها.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.items.map((item) => {
                const note = notes[item.id] || '';
                const busy = reviewingId === item.id;
                return (
                  <Card
                    key={item.id}
                    className={`overflow-hidden shadow-none ${
                      item.priority === 'urgent'
                        ? 'border-red-300'
                        : item.waitingDays >= 2
                          ? 'border-amber-300'
                          : 'border-violet-200'
                    }`}
                  >
                    <CardHeader className="border-b bg-slate-50/70 py-3">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-800">
                              {item.directiveType === 'decision' ? 'قرار إداري' : 'توجيه إداري'}
                            </Badge>
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
                            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                              <Clock3 className="ml-1 h-3 w-3" />
                              انتظار الاعتماد: {item.waitingDays.toLocaleString('ar-SA')} يوم
                            </Badge>
                            {item.isOverdue && (
                              <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
                                <AlertTriangle className="ml-1 h-3 w-3" />
                                متأخر {item.daysOverdue.toLocaleString('ar-SA')} يوم
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="mt-2 text-base">{item.title}</CardTitle>
                          <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            المعاملة <b className="text-foreground">{item.transaction.transactionNumber}</b>
                            {' — '}
                            {item.transaction.subject}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onOpenChange(false);
                            onOpenTransaction(item.transactionId);
                          }}
                        >
                          فتح المعاملة
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4 p-4">
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-xl border bg-white p-3">
                          <p className="text-[11px] font-black text-slate-800">المطلوب بالتوجيه</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.instruction}</p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <UserRound className="h-3.5 w-3.5" />
                              المكلف: <b className="text-foreground">{item.assigneeName}</b>
                            </span>
                            <span>صدر بواسطة: <b className="text-foreground">{item.issuedByName || '—'}</b></span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-black text-emerald-800">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            نتيجة التنفيذ المرفوعة للاعتماد
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-800">
                            {item.completionResponse || 'لم تسجل نتيجة تنفيذ.'}
                          </p>
                          {item.completionNote && (
                            <p className="mt-2 text-xs text-slate-600">ملاحظة الموظف: {item.completionNote}</p>
                          )}
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            رُفعت بواسطة {item.completionSubmittedByName || item.assigneeName}
                            {' · '}
                            {formatDateTime(item.completionSubmittedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="flex items-center gap-1.5 text-[11px] font-black text-sky-900">
                            <Paperclip className="h-3.5 w-3.5" />
                            أدلة التنفيذ
                          </p>
                          <Badge variant="outline">{item.evidence.length.toLocaleString('ar-SA')} مرفق</Badge>
                        </div>
                        {item.evidence.length ? (
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {item.evidence.map((attachment) => (
                              <button
                                key={attachment.id}
                                type="button"
                                onClick={() => window.open(attachment.driveUrl, '_blank', 'noopener,noreferrer')}
                                className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-right transition hover:bg-sky-50"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-slate-800">{attachment.title}</p>
                                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                                    {attachment.mimeType || 'مرفق'} · {formatDateTime(attachment.createdAt)}
                                  </p>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-sky-700" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 py-4 text-center text-xs font-semibold text-amber-900">
                            لم يرفق الموظف مستندات أو أدلة تنفيذ.
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border bg-slate-50/70 p-3">
                        <p className="mb-2 text-[11px] font-black text-slate-800">ملاحظة الإدارة</p>
                        <Textarea
                          rows={2}
                          value={note}
                          onChange={(event) => setNotes((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))}
                          placeholder="اختيارية عند الاعتماد، وإلزامية عند الإعادة أو طلب التعديل..."
                        />
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-300 bg-amber-50 text-amber-900"
                            disabled={busy || !note.trim()}
                            onClick={() => void review(item.transactionId, item.id, 'return_for_completion')}
                          >
                            <RotateCcw className="ml-1 h-3.5 w-3.5" />
                            إعادة للاستكمال
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-orange-300 bg-orange-50 text-orange-900"
                            disabled={busy || !note.trim()}
                            onClick={() => void review(item.transactionId, item.id, 'request_modification')}
                          >
                            <PencilLine className="ml-1 h-3.5 w-3.5" />
                            طلب تعديل
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() => void review(item.transactionId, item.id, 'approved')}
                          >
                            {busy
                              ? <RefreshCw className="ml-1 h-3.5 w-3.5 animate-spin" />
                              : <CheckCircle2 className="ml-1 h-3.5 w-3.5" />}
                            اعتماد الإنجاز
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {data.employees.length > 0 && (
            <Card className="shadow-none">
              <CardHeader className="border-b py-3">
                <CardTitle className="text-sm">الإنجازات المرفوعة حسب الموظف</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
                {data.employees.map((employee) => (
                  <button
                    key={employee.userId}
                    type="button"
                    onClick={() => setAssigneeUserId(employee.userId)}
                    className="rounded-xl border bg-white p-3 text-right transition hover:border-violet-300 hover:bg-violet-50/40"
                  >
                    <p className="truncate text-xs font-black text-slate-900">{employee.username}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      <span>بانتظار: <b>{employee.awaitingApproval.toLocaleString('ar-SA')}</b></span>
                      <span className={employee.urgent ? 'text-red-700' : ''}>
                        عاجلة: <b>{employee.urgent.toLocaleString('ar-SA')}</b>
                      </span>
                      <span>أقصى انتظار: <b>{employee.maxWaitingDays.toLocaleString('ar-SA')} يوم</b></span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
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
}: {
  label: string;
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
          : 'border-violet-200 bg-violet-50/40'
    }`}
  >
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={`mt-0.5 text-xl font-black ${
      danger ? 'text-red-700' : warning ? 'text-amber-800' : 'text-violet-900'
    }`}>
      {value.toLocaleString('ar-SA')}
    </p>
  </div>
);

export default TransactionApprovalCenterDialog;
