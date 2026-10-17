import React from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarPlus,
  CheckCircle2,
  CircleDot,
  Clock3,
  ExternalLink,
  FileCheck2,
  Hourglass,
  Inbox,
  PlayCircle,
  RefreshCw,
  RotateCcw,
  Send,
  TimerReset,
  UserRound,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpWorkQueue,
  type TransactionFollowUpWorkQueueAction,
  type TransactionFollowUpWorkQueueBucket,
  type TransactionFollowUpWorkQueueItem,
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
import { Textarea } from './ui/textarea';

const EMPTY: TransactionFollowUpWorkQueue = {
  generatedAt: new Date(0).toISOString(),
  scope: 'mine',
  supervisor: false,
  focusBucket: 'in_progress',
  counts: {
    overdue: 0,
    urgent_today: 0,
    extension_requests: 0,
    external_follow_up_due: 0,
    due_3_days: 0,
    awaiting_review: 0,
    waiting_external: 0,
    in_progress: 0,
    completed_today: 0,
    unassigned: 0,
  },
  buckets: {
    overdue: [],
    urgent_today: [],
    extension_requests: [],
    external_follow_up_due: [],
    due_3_days: [],
    awaiting_review: [],
    waiting_external: [],
    in_progress: [],
    completed_today: [],
    unassigned: [],
  },
};

const bucketMeta: Record<
  TransactionFollowUpWorkQueueBucket,
  {
    label: string;
    shortLabel: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  overdue: {
    label: 'المعاملات المتأخرة',
    shortLabel: 'متأخر',
    description: 'تجاوزت تاريخ الاستحقاق وتتطلب إجراءً فوريًا.',
    icon: AlertTriangle,
    className: 'border-red-300 bg-red-50 text-red-900',
  },
  urgent_today: {
    label: 'عاجل اليوم',
    shortLabel: 'عاجل اليوم',
    description: 'معاملة عاجلة أو مستحقة خلال اليوم.',
    icon: Clock3,
    className: 'border-orange-300 bg-orange-50 text-orange-900',
  },
  extension_requests: {
    label: 'طلبات التمديد',
    shortLabel: 'طلبات تمديد',
    description: 'طلبات تغيير تاريخ الاستحقاق التي تنتظر مراجعة واعتماد المدير.',
    icon: CalendarPlus,
    className: 'border-indigo-300 bg-indigo-50 text-indigo-900',
  },
  external_follow_up_due: {
    label: 'متابعة جهة مستحقة',
    shortLabel: 'متابعة جهة',
    description: 'حان موعد المتابعة مع الجهة المنتظر منها الرد أو تجاوز موعد المتابعة المحدد.',
    icon: Building2,
    className: 'border-cyan-300 bg-cyan-50 text-cyan-900',
  },
  due_3_days: {
    label: 'تستحق خلال 3 أيام',
    shortLabel: 'خلال 3 أيام',
    description: 'اقترب تاريخ الاستحقاق ويجب إنهاء الإجراء قبل التأخير.',
    icon: TimerReset,
    className: 'border-amber-300 bg-amber-50 text-amber-900',
  },
  awaiting_review: {
    label: 'بانتظار الاعتماد',
    shortLabel: 'بانتظار اعتماد',
    description: 'رفع الموظف الإنجاز وتنتظر المعاملة مراجعة واعتماد الإقفال.',
    icon: FileCheck2,
    className: 'border-violet-300 bg-violet-50 text-violet-900',
  },
  waiting_external: {
    label: 'بانتظار جهة أخرى',
    shortLabel: 'بانتظار جهة',
    description: 'توقفت المعاملة مؤقتًا لحين ورود رد أو مستند من جهة أخرى.',
    icon: Hourglass,
    className: 'border-sky-300 bg-sky-50 text-sky-900',
  },
  in_progress: {
    label: 'تحت التنفيذ',
    shortLabel: 'تحت التنفيذ',
    description: 'معاملات مسندة ويجري العمل عليها ضمن المسار الطبيعي.',
    icon: PlayCircle,
    className: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  },
  completed_today: {
    label: 'مكتمل اليوم',
    shortLabel: 'مكتمل اليوم',
    description: 'معاملات تم اعتماد إنجازها وإقفالها اليوم.',
    icon: CheckCircle2,
    className: 'border-emerald-300 bg-white text-emerald-800',
  },
  unassigned: {
    label: 'غير مسندة',
    shortLabel: 'غير مسند',
    description: 'معاملات جديدة لم يتم تحديد الموظف المختص لها.',
    icon: UserRound,
    className: 'border-slate-300 bg-slate-50 text-slate-800',
  },
};

const bucketOrder: TransactionFollowUpWorkQueueBucket[] = [
  'overdue',
  'urgent_today',
  'extension_requests',
  'external_follow_up_due',
  'due_3_days',
  'awaiting_review',
  'waiting_external',
  'in_progress',
  'completed_today',
  'unassigned',
];

const actionMeta: Record<
  TransactionFollowUpWorkQueueAction,
  { label: string; icon: React.ComponentType<{ className?: string }>; className?: string }
> = {
  start: { label: 'بدء التنفيذ', icon: PlayCircle },
  waiting_external: { label: 'بانتظار جهة أخرى', icon: Hourglass },
  resume: { label: 'استئناف العمل', icon: RotateCcw },
  needs_follow_up: { label: 'تحتاج متابعة', icon: CircleDot },
  submit_completion: {
    label: 'رفع للمراجعة',
    icon: Send,
    className: 'bg-violet-700 text-white hover:bg-violet-800',
  },
  approve_close: {
    label: 'اعتماد وإغلاق',
    icon: CheckCircle2,
    className: 'bg-emerald-700 text-white hover:bg-emerald-800',
  },
  return_to_employee: {
    label: 'إعادة للاستكمال',
    icon: RotateCcw,
    className: 'border-red-300 text-red-800 hover:bg-red-50',
  },
  reopen: {
    label: 'إعادة فتح المعاملة',
    icon: RotateCcw,
    className: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100',
  },
};

const priorityLabel: Record<string, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
};

const statusLabel: Record<string, string> = {
  new: 'جديدة',
  assigned: 'مسندة',
  in_progress: 'تحت الإجراء',
  waiting_response: 'بانتظار رد',
  needs_follow_up: 'تحتاج متابعة',
  completed: 'بانتظار الاعتماد',
  closed: 'مغلقة',
};

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
    ? new Intl.DateTimeFormat('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '—';

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const minimumExtensionDate = (item: TransactionFollowUpWorkQueueItem) => {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (!item.dueDate) return toInputDate(tomorrow);
  const afterDue = new Date(item.dueDate);
  afterDue.setHours(0, 0, 0, 0);
  afterDue.setDate(afterDue.getDate() + 1);
  return toInputDate(afterDue > tomorrow ? afterDue : tomorrow);
};

const dateAfterDays = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toInputDate(date);
};

type Props = {
  mine: boolean;
  supervisor: boolean;
  onOpenTransaction: (id: string) => void;
  onChanged?: () => void | Promise<void>;
};

export const TransactionDailyWorkCenter: React.FC<Props> = ({
  mine,
  supervisor,
  onOpenTransaction,
  onChanged,
}) => {
  const [data, setData] = React.useState<TransactionFollowUpWorkQueue>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [runningAction, setRunningAction] = React.useState<string | null>(null);
  const [extensionOpen, setExtensionOpen] = React.useState(false);
  const [extensionItem, setExtensionItem] = React.useState<TransactionFollowUpWorkQueueItem | null>(null);
  const [extensionDate, setExtensionDate] = React.useState('');
  const [extensionReason, setExtensionReason] = React.useState('');
  const [externalMode, setExternalMode] = React.useState<'start' | 'followup' | 'response' | null>(null);
  const [externalItem, setExternalItem] = React.useState<TransactionFollowUpWorkQueueItem | null>(null);
  const [externalEntity, setExternalEntity] = React.useState('');
  const [externalReference, setExternalReference] = React.useState('');
  const [externalSentAt, setExternalSentAt] = React.useState(toInputDate(new Date()));
  const [externalNextFollowUp, setExternalNextFollowUp] = React.useState(dateAfterDays(3));
  const [externalNote, setExternalNote] = React.useState('');
  const [externalResponseDate, setExternalResponseDate] = React.useState(toInputDate(new Date()));
  const [externalResponseReference, setExternalResponseReference] = React.useState('');
  const [selectedBucket, setSelectedBucket] = React.useState<TransactionFollowUpWorkQueueBucket>('in_progress');
  const userChangedBucket = React.useRef(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.workQueue(mine);
      setData(result);
      if (!userChangedBucket.current) {
        setSelectedBucket(result.focusBucket);
      } else if (!result.buckets[selectedBucket]) {
        setSelectedBucket(result.focusBucket);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل مركز المتابعة اليومي');
    } finally {
      setLoading(false);
    }
  }, [mine, selectedBucket]);

  React.useEffect(() => {
    userChangedBucket.current = false;
    void load();
  }, [mine]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAction = async (
    item: TransactionFollowUpWorkQueueItem,
    action: TransactionFollowUpWorkQueueAction,
  ) => {
    if (action === 'waiting_external') {
      setExternalItem(item);
      setExternalMode('start');
      setExternalEntity('');
      setExternalReference('');
      setExternalSentAt(toInputDate(new Date()));
      setExternalNextFollowUp(dateAfterDays(3));
      setExternalNote('');
      return;
    }

    if (action === 'resume' && item.activeExternalWait) {
      toast.error('سجل ورود الرد أو ألغِ حالة الانتظار أولًا حتى يعود العمل إلى التنفيذ');
      return;
    }

    let note: string | null = null;

    if (action === 'return_to_employee') {
      const entered = window.prompt('اكتب ملاحظة مختصرة للموظف توضح المطلوب استكماله:');
      if (entered == null) return;
      if (!entered.trim()) {
        toast.error('ملاحظة الإعادة مطلوبة');
        return;
      }
      note = entered.trim();
    }

    if (action === 'reopen') {
      const entered = window.prompt('اكتب سبب إعادة فتح المعاملة المنجزة أو المغلقة:');
      if (entered == null) return;
      if (entered.trim().length < 5) {
        toast.error('سبب إعادة فتح المعاملة مطلوب');
        return;
      }
      note = entered.trim();
      if (!window.confirm('سيتم إعادة المعاملة إلى العمل وتسجيل سبب إعادة الفتح في سجل الإجراءات. هل تريد المتابعة؟')) {
        return;
      }
    }

    if (action === 'approve_close' && !window.confirm('اعتماد إنجاز المعاملة وإقفالها نهائيًا؟')) {
      return;
    }

    try {
      setRunningAction(item.id + ':' + action);
      await transactionFollowUpApi.workQueueAction(item.id, { action, note });
      const messages: Record<TransactionFollowUpWorkQueueAction, string> = {
        start: 'تم بدء تنفيذ المعاملة',
        waiting_external: 'تم تحويل المعاملة إلى انتظار رد من جهة أخرى',
        resume: 'تم استئناف العمل على المعاملة',
        needs_follow_up: 'تم تحديد المعاملة كحالة تحتاج متابعة',
        submit_completion: 'تم رفع المعاملة للمراجعة والاعتماد',
        approve_close: 'تم اعتماد الإنجاز وإقفال المعاملة',
        return_to_employee: 'تمت إعادة المعاملة للموظف لاستكمال المطلوب',
        reopen: 'تمت إعادة فتح المعاملة وإعادتها إلى العمل',
      };
      toast.success(messages[action]);
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تنفيذ الإجراء السريع');
    } finally {
      setRunningAction(null);
    }
  };

  const openExternalFollowUp = (item: TransactionFollowUpWorkQueueItem) => {
    setExternalItem(item);
    setExternalMode('followup');
    setExternalNextFollowUp(dateAfterDays(3));
    setExternalNote('');
  };

  const openExternalResponse = (item: TransactionFollowUpWorkQueueItem) => {
    setExternalItem(item);
    setExternalMode('response');
    setExternalResponseDate(toInputDate(new Date()));
    setExternalResponseReference('');
    setExternalNote('');
  };

  const saveExternalWait = async () => {
    if (!externalItem || !externalMode) return;

    try {
      setRunningAction(externalItem.id + ':external');
      if (externalMode === 'start') {
        if (externalEntity.trim().length < 2 || !externalSentAt || !externalNextFollowUp) {
          toast.error('أكمل الجهة وتاريخ الإرسال وتاريخ المتابعة القادمة');
          return;
        }
        await transactionFollowUpApi.startExternalWait(externalItem.id, {
          externalEntity: externalEntity.trim(),
          outboundReferenceNumber: externalReference.trim() || null,
          sentAt: externalSentAt,
          nextFollowUpDate: externalNextFollowUp,
          notes: externalNote.trim() || null,
        });
        toast.success('تم تسجيل المعاملة بانتظار رد من الجهة المحددة');
      } else if (externalMode === 'followup') {
        if (!externalItem.activeExternalWait || !externalNextFollowUp || externalNote.trim().length < 2) {
          toast.error('اكتب نتيجة المتابعة وحدد موعد المتابعة القادمة');
          return;
        }
        await transactionFollowUpApi.recordExternalFollowUp(externalItem.activeExternalWait.id, {
          nextFollowUpDate: externalNextFollowUp,
          note: externalNote.trim(),
        });
        toast.success('تم تسجيل المتابعة وتحديد الموعد القادم');
      } else {
        if (!externalItem.activeExternalWait || !externalResponseDate || externalNote.trim().length < 2) {
          toast.error('حدد تاريخ ورود الرد واكتب ملخص الرد');
          return;
        }
        await transactionFollowUpApi.recordExternalResponse(externalItem.activeExternalWait.id, {
          responseReceivedAt: externalResponseDate,
          responseReferenceNumber: externalResponseReference.trim() || null,
          responseNote: externalNote.trim(),
        });
        toast.success('تم تسجيل ورود الرد وإعادة المعاملة إلى التنفيذ');
      }

      setExternalMode(null);
      setExternalItem(null);
      setExternalNote('');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ متابعة الجهة الخارجية');
    } finally {
      setRunningAction(null);
    }
  };

  const cancelExternalWait = async (item: TransactionFollowUpWorkQueueItem) => {
    if (!item.activeExternalWait) return;
    const entered = window.prompt('اكتب سبب إلغاء انتظار الجهة واستئناف العمل:');
    if (entered == null) return;
    if (!entered.trim()) {
      toast.error('سبب إلغاء الانتظار مطلوب');
      return;
    }
    try {
      setRunningAction(item.id + ':external-cancel');
      await transactionFollowUpApi.cancelExternalWait(item.activeExternalWait.id, entered.trim());
      toast.success('تم إلغاء الانتظار وإعادة المعاملة إلى التنفيذ');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إلغاء انتظار الجهة');
    } finally {
      setRunningAction(null);
    }
  };

  const openExtensionRequest = (item: TransactionFollowUpWorkQueueItem) => {
    setExtensionItem(item);
    setExtensionDate(minimumExtensionDate(item));
    setExtensionReason('');
    setExtensionOpen(true);
  };

  const submitExtensionRequest = async () => {
    if (!extensionItem || !extensionDate || extensionReason.trim().length < 5) {
      toast.error('حدد تاريخ التمديد واكتب سببًا واضحًا للطلب');
      return;
    }
    try {
      setRunningAction(extensionItem.id + ':extension');
      await transactionFollowUpApi.requestExtension(extensionItem.id, {
        requestedDueDate: extensionDate,
        reason: extensionReason.trim(),
      });
      toast.success('تم رفع طلب التمديد للمدير لاعتماده');
      setExtensionOpen(false);
      setExtensionItem(null);
      setExtensionReason('');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع طلب التمديد');
    } finally {
      setRunningAction(null);
    }
  };

  const decideExtension = async (
    item: TransactionFollowUpWorkQueueItem,
    decision: 'approved' | 'rejected',
  ) => {
    const request = item.pendingExtension;
    if (!request) return;

    let reviewNote: string | null = null;
    if (decision === 'approved') {
      if (!window.confirm(
        `اعتماد تمديد المعاملة ${item.transactionNumber} من ${formatDate(request.currentDueDate)} إلى ${formatDate(request.requestedDueDate)}؟`,
      )) return;
    } else {
      const entered = window.prompt('اكتب سبب رفض طلب التمديد:');
      if (entered == null) return;
      if (!entered.trim()) {
        toast.error('سبب الرفض مطلوب');
        return;
      }
      reviewNote = entered.trim();
    }

    try {
      setRunningAction(item.id + ':extension-decision');
      await transactionFollowUpApi.decideExtensionRequest(request.id, {
        decision,
        reviewNote,
      });
      toast.success(decision === 'approved' ? 'تم اعتماد التمديد وتحديث تاريخ الاستحقاق' : 'تم رفض طلب التمديد');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ قرار طلب التمديد');
    } finally {
      setRunningAction(null);
    }
  };

  const cancelExtension = async (item: TransactionFollowUpWorkQueueItem) => {
    if (!item.pendingExtension) return;
    if (!window.confirm('إلغاء طلب التمديد المعلق؟')) return;
    try {
      setRunningAction(item.id + ':extension-cancel');
      await transactionFollowUpApi.cancelExtensionRequest(item.pendingExtension.id);
      toast.success('تم إلغاء طلب التمديد');
      await load();
      await onChanged?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إلغاء طلب التمديد');
    } finally {
      setRunningAction(null);
    }
  };

  const visibleBuckets = bucketOrder.filter(
    (bucket) => (bucket !== 'unassigned' && bucket !== 'extension_requests') || supervisor,
  );
  const items = data.buckets[selectedBucket] || [];
  const selectedMeta = bucketMeta[selectedBucket];

  return (
    <Card className="overflow-hidden rounded-[24px] border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b bg-slate-50/60 px-4 py-4 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Inbox className="h-5 w-5 text-primary" />
              مركز عملي اليوم
            </CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {data.scope === 'mine' ? 'الأعمال المسندة إليك مرتبة حسب الأولوية.' : 'أعمال الإدارة مرتبة حسب الأولوية والاستحقاق.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" disabled={loading} onClick={() => void load()} className="shrink-0">
            <RefreshCw className={'ml-2 h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
            تحديث
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {visibleBuckets.map((bucket) => {
            const meta = bucketMeta[bucket];
            const Icon = meta.icon;
            const active = selectedBucket === bucket;
            return (
              <button
                key={bucket}
                type="button"
                onClick={() => {
                  userChangedBucket.current = true;
                  setSelectedBucket(bucket);
                }}
                className={
                  'min-h-[72px] rounded-2xl border px-3 py-2.5 text-right transition ' +
                  (active
                    ? meta.className + ' shadow-sm ring-1 ring-current/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/70">
                    <Icon className="h-4 w-4" />
                  </span>
                  <b className="text-2xl">{(data.counts[bucket] || 0).toLocaleString('ar-SA')}</b>
                </div>
                <p className="mt-2 text-sm font-black">{meta.shortLabel}</p>
              </button>
            );
          })}
        </div>

        <div className={'rounded-2xl border px-4 py-3 ' + selectedMeta.className}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-black">{selectedMeta.label}</p>
              <p className="mt-1 text-sm leading-6 opacity-80">{selectedMeta.description}</p>
            </div>
            <Badge variant="outline" className="border-current">
              {items.length.toLocaleString('ar-SA')} معاملة معروضة
            </Badge>
          </div>
        </div>

        {loading && !items.length ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
            جارٍ تحميل صندوق العمل...
          </div>
        ) : items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-base">معاملة {item.transactionNumber}</b>
                      <Badge variant="outline">{priorityLabel[item.priority] || item.priority}</Badge>
                      <Badge variant="outline">{statusLabel[item.status] || item.status}</Badge>
                      {item.overdueDays > 0 && (
                        <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
                          متأخرة {item.overdueDays.toLocaleString('ar-SA')} يوم
                        </Badge>
                      )}
                      {item.daysUntilDue === 0 && (
                        <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-900">
                          مستحقة اليوم
                        </Badge>
                      )}
                      {item.pendingExtension && (
                        <Badge variant="outline" className="border-indigo-300 bg-indigo-50 text-indigo-900">
                          تمديد معلق إلى {formatDate(item.pendingExtension.requestedDueDate)}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-base font-semibold leading-7 text-slate-800">
                      {item.subject}
                    </p>
                    {item.requiredAction && (
                      <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                        <b>المطلوب:</b> {item.requiredAction}
                      </p>
                    )}
                    {item.pendingExtension && (
                      <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-[11px] leading-5 text-indigo-950">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <b>طلب تمديد:</b>
                          <span>{formatDate(item.pendingExtension.currentDueDate)} ← {formatDate(item.pendingExtension.requestedDueDate)}</span>
                          <span>بواسطة {item.pendingExtension.requestedByName}</span>
                        </div>
                        <p className="mt-1"><b>السبب:</b> {item.pendingExtension.reason}</p>
                      </div>
                    )}
                    {item.activeExternalWait && (
                      <div className={
                        'mt-2 rounded-xl border px-3 py-2 text-sm leading-6 ' +
                        (item.activeExternalWait.followUpDue
                          ? 'border-red-200 bg-red-50/70 text-red-950'
                          : 'border-sky-200 bg-sky-50/70 text-sky-950')
                      }>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <b>بانتظار:</b>
                          <span>{item.activeExternalWait.externalEntity}</span>
                          {item.activeExternalWait.outboundReferenceNumber && (
                            <span>المرجع: {item.activeExternalWait.outboundReferenceNumber}</span>
                          )}
                          <span>منذ {Number(item.activeExternalWait.waitingDays || 0).toLocaleString('ar-SA')} يوم</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>أرسل بتاريخ {formatDate(item.activeExternalWait.sentAt)}</span>
                          <span>
                            المتابعة القادمة: <b>{formatDate(item.activeExternalWait.nextFollowUpDate)}</b>
                          </span>
                          <span>عدد المتابعات: {item.activeExternalWait.followUpCount.toLocaleString('ar-SA')}</span>
                        </div>
                        {item.activeExternalWait.lastFollowUpNote && (
                          <p className="mt-1"><b>آخر متابعة:</b> {item.activeExternalWait.lastFollowUpNote}</p>
                        )}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-muted-foreground">
                      {supervisor && (
                        <span>
                          الموظف: <b className="text-foreground">{item.currentAssigneeName || 'غير مسندة'}</b>
                        </span>
                      )}
                      <span>
                        الاستحقاق: <b className="text-foreground">{formatDate(item.dueDate)}</b>
                      </span>
                      <span>
                        عمر المعاملة: <b className="text-foreground">{item.ageDays.toLocaleString('ar-SA')} يوم</b>
                      </span>
                      <span>
                        آخر إجراء: <b className="text-foreground">{formatTime(item.lastActionAt)}</b>
                      </span>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {item.trackingNumber}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenTransaction(item.id)}
                  >
                    <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    فتح المعاملة
                  </Button>

                  {item.dueDate &&
                    !item.pendingExtension &&
                    !['completed', 'closed'].includes(item.status) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-indigo-300 text-indigo-800 hover:bg-indigo-50"
                        disabled={Boolean(runningAction)}
                        onClick={() => openExtensionRequest(item)}
                      >
                        <CalendarPlus className="ml-1 h-3.5 w-3.5" />
                        طلب تمديد
                      </Button>
                    )}

                  {item.pendingExtension && supervisor && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-emerald-700 text-white hover:bg-emerald-800"
                        disabled={Boolean(runningAction)}
                        onClick={() => void decideExtension(item, 'approved')}
                      >
                        <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                        اعتماد التمديد
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-800 hover:bg-red-50"
                        disabled={Boolean(runningAction)}
                        onClick={() => void decideExtension(item, 'rejected')}
                      >
                        <XCircle className="ml-1 h-3.5 w-3.5" />
                        رفض
                      </Button>
                    </>
                  )}

                  {item.pendingExtension && !supervisor && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={Boolean(runningAction)}
                      onClick={() => void cancelExtension(item)}
                    >
                      إلغاء طلب التمديد
                    </Button>
                  )}

                  {item.activeExternalWait && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-cyan-300 text-cyan-900 hover:bg-cyan-50"
                        disabled={Boolean(runningAction)}
                        onClick={() => openExternalFollowUp(item)}
                      >
                        <CircleDot className="ml-1 h-3.5 w-3.5" />
                        تسجيل متابعة
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-sky-700 text-white hover:bg-sky-800"
                        disabled={Boolean(runningAction)}
                        onClick={() => openExternalResponse(item)}
                      >
                        <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                        تم ورود الرد
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={Boolean(runningAction)}
                        onClick={() => void cancelExternalWait(item)}
                      >
                        إلغاء الانتظار
                      </Button>
                    </>
                  )}

                  {item.quickActions
                    .filter((action) => !(item.activeExternalWait && action === 'resume'))
                    .map((action) => {
                    const meta = actionMeta[action];
                    const Icon = meta.icon;
                    const busy = runningAction === item.id + ':' + action;
                    return (
                      <Button
                        key={action}
                        type="button"
                        size="sm"
                        variant={meta.className ? 'default' : 'outline'}
                        className={meta.className}
                        disabled={Boolean(runningAction)}
                        onClick={() => void runAction(item, action)}
                      >
                        {busy ? (
                          <RefreshCw className="ml-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Icon className="ml-1 h-3.5 w-3.5" />
                        )}
                        {meta.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed py-10 text-center text-xs text-muted-foreground">
            لا توجد معاملات في فئة «{selectedMeta.label}» حاليًا.
          </div>
        )}
      </CardContent>

      <Dialog
        open={Boolean(externalMode)}
        onOpenChange={(open) => {
          if (runningAction) return;
          if (!open) {
            setExternalMode(null);
            setExternalItem(null);
            setExternalNote('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[680px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>
              {externalMode === 'start'
                ? 'تسجيل المعاملة بانتظار جهة أخرى'
                : externalMode === 'followup'
                  ? 'تسجيل متابعة مع الجهة'
                  : 'تسجيل ورود الرد'}
            </DialogTitle>
            <DialogDescription>
              {externalItem
                ? `المعاملة ${externalItem.transactionNumber} — ${externalItem.subject}`
                : 'توثيق انتظار الجهة والمتابعة حتى ورود الرد.'}
            </DialogDescription>
          </DialogHeader>

          {externalMode === 'start' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الجهة المنتظر منها الرد *</Label>
                <Input
                  value={externalEntity}
                  onChange={(event) => setExternalEntity(event.target.value)}
                  placeholder="مثال: الهيئة العامة لعقارات الدولة"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>رقم الخطاب / المعاملة الصادرة</Label>
                  <Input
                    value={externalReference}
                    onChange={(event) => setExternalReference(event.target.value)}
                    placeholder="اختياري"
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ إرسال الطلب *</Label>
                  <Input
                    type="date"
                    max={toInputDate(new Date())}
                    value={externalSentAt}
                    onChange={(event) => setExternalSentAt(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>تاريخ المتابعة القادمة *</Label>
                <Input
                  type="date"
                  min={dateAfterDays(1)}
                  value={externalNextFollowUp}
                  onChange={(event) => setExternalNextFollowUp(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  rows={4}
                  value={externalNote}
                  onChange={(event) => setExternalNote(event.target.value)}
                  placeholder="المطلوب من الجهة أو أي تفاصيل مساندة..."
                />
              </div>
            </div>
          )}

          {externalMode === 'followup' && externalItem?.activeExternalWait && (
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs leading-6 text-sky-950">
                الجهة: <b>{externalItem.activeExternalWait.externalEntity}</b>
                {' · '}مدة الانتظار: <b>{Number(externalItem.activeExternalWait.waitingDays || 0).toLocaleString('ar-SA')} يوم</b>
                {' · '}عدد المتابعات السابقة: <b>{externalItem.activeExternalWait.followUpCount.toLocaleString('ar-SA')}</b>
              </div>
              <div className="space-y-2">
                <Label>نتيجة المتابعة *</Label>
                <Textarea
                  rows={5}
                  value={externalNote}
                  onChange={(event) => setExternalNote(event.target.value)}
                  placeholder="مثال: تمت مخاطبة الجهة وأفادت بأن الطلب تحت الإجراء..."
                />
              </div>
              <div className="space-y-2">
                <Label>المتابعة القادمة *</Label>
                <Input
                  type="date"
                  min={dateAfterDays(1)}
                  value={externalNextFollowUp}
                  onChange={(event) => setExternalNextFollowUp(event.target.value)}
                />
              </div>
            </div>
          )}

          {externalMode === 'response' && externalItem?.activeExternalWait && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>تاريخ ورود الرد *</Label>
                  <Input
                    type="date"
                    max={toInputDate(new Date())}
                    value={externalResponseDate}
                    onChange={(event) => setExternalResponseDate(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>رقم مرجع الرد</Label>
                  <Input
                    value={externalResponseReference}
                    onChange={(event) => setExternalResponseReference(event.target.value)}
                    placeholder="اختياري"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>ملخص الرد *</Label>
                <Textarea
                  rows={5}
                  value={externalNote}
                  onChange={(event) => setExternalNote(event.target.value)}
                  placeholder="اختصر الرد الوارد وما الإجراء التالي المطلوب..."
                />
              </div>
              <p className="text-[10px] leading-5 text-muted-foreground">
                بعد الحفظ ستعود المعاملة تلقائيًا إلى «تحت التنفيذ» مع حفظ بيانات الرد في السجل.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" disabled={Boolean(runningAction)} onClick={() => setExternalMode(null)}>
              إلغاء
            </Button>
            <Button disabled={Boolean(runningAction)} onClick={() => void saveExternalWait()}>
              {runningAction?.endsWith(':external') && <RefreshCw className="ml-1 h-4 w-4 animate-spin" />}
              {externalMode === 'start'
                ? 'بدء الانتظار'
                : externalMode === 'followup'
                  ? 'حفظ المتابعة'
                  : 'تسجيل الرد واستئناف العمل'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={extensionOpen} onOpenChange={(open) => {
        if (runningAction) return;
        setExtensionOpen(open);
        if (!open) {
          setExtensionItem(null);
          setExtensionReason('');
        }
      }}>
        <DialogContent className="sm:max-w-[620px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>طلب تمديد تاريخ استحقاق المعاملة</DialogTitle>
            <DialogDescription>
              {extensionItem
                ? `المعاملة ${extensionItem.transactionNumber} — الموعد الحالي ${formatDate(extensionItem.dueDate)}`
                : 'يرفع الطلب للمدير ولا يتغير تاريخ الاستحقاق إلا بعد الاعتماد.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>التاريخ المقترح الجديد *</Label>
              <Input
                type="date"
                min={extensionItem ? minimumExtensionDate(extensionItem) : undefined}
                value={extensionDate}
                onChange={(event) => setExtensionDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>سبب طلب التمديد *</Label>
              <Textarea
                rows={5}
                value={extensionReason}
                onChange={(event) => setExtensionReason(event.target.value)}
                placeholder="مثال: انتظار إفادة من جهة خارجية، الحاجة إلى استكمال مستندات، أو وجود إجراء مرتبط لم يكتمل بعد..."
              />
              <p className="text-[10px] leading-5 text-muted-foreground">
                سيحفظ النظام الموعد الحالي والموعد المقترح والسبب ومقدم الطلب وقرار المدير في سجل المعاملة.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" disabled={Boolean(runningAction)} onClick={() => setExtensionOpen(false)}>
              إلغاء
            </Button>
            <Button disabled={Boolean(runningAction)} onClick={() => void submitExtensionRequest()}>
              {runningAction?.endsWith(':extension') ? (
                <RefreshCw className="ml-1 h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="ml-1 h-4 w-4" />
              )}
              رفع طلب التمديد
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TransactionDailyWorkCenter;
