import React from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  FileClock,
  MoreHorizontal,
  Pencil,
  PlayCircle,
  RotateCcw,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import type {
  TransactionFollowUpPriority,
  TransactionFollowUpRecord,
  TransactionFollowUpStatus,
  TransactionFollowUpType,
  TransactionFollowUpWorkQueueAction,
} from '../api/transactionFollowUp';

const statusLabels: Record<TransactionFollowUpStatus, string> = {
  new: 'جديدة',
  assigned: 'مسندة',
  in_progress: 'تحت التنفيذ',
  waiting_response: 'بانتظار جهة',
  needs_follow_up: 'تحتاج متابعة',
  completed: 'منجزة',
  closed: 'مغلقة',
};

const priorityLabels: Record<TransactionFollowUpPriority, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
};

const typeLabels: Record<TransactionFollowUpType, string> = {
  incoming: 'وارد',
  outgoing: 'صادر',
  internal: 'داخلي',
};

const priorityClass: Record<TransactionFollowUpPriority, string> = {
  low: 'border-slate-300 bg-slate-50 text-slate-700',
  normal: 'border-sky-300 bg-sky-50 text-sky-800',
  high: 'border-orange-300 bg-orange-50 text-orange-800',
  urgent: 'border-red-300 bg-red-50 text-red-800',
};

const statusClass: Record<TransactionFollowUpStatus, string> = {
  new: 'border-slate-300 bg-slate-50 text-slate-700',
  assigned: 'border-blue-300 bg-blue-50 text-blue-800',
  in_progress: 'border-sky-300 bg-sky-50 text-sky-800',
  waiting_response: 'border-violet-300 bg-violet-50 text-violet-800',
  needs_follow_up: 'border-amber-300 bg-amber-50 text-amber-900',
  completed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  closed: 'border-slate-400 bg-slate-100 text-slate-800',
};

const indicatorClass: Record<string, string> = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  danger: 'border-red-300 bg-red-50 text-red-800',
  info: 'border-sky-300 bg-sky-50 text-sky-800',
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

type Props = {
  record: TransactionFollowUpRecord;
  canEdit: boolean;
  canDelete: boolean;
  canReopen: boolean;
  supervisor: boolean;
  busy?: boolean;
  onView: (record: TransactionFollowUpRecord) => void;
  onEdit: (record: TransactionFollowUpRecord) => void;
  onDelete: (record: TransactionFollowUpRecord) => void;
  onReopen: (record: TransactionFollowUpRecord) => void;
  onQuickAction: (
    record: TransactionFollowUpRecord,
    action: Extract<TransactionFollowUpWorkQueueAction, 'start' | 'approve_close'>,
  ) => void;
};

export const TransactionFollowUpCard: React.FC<Props> = ({
  record,
  canEdit,
  canDelete,
  canReopen,
  supervisor,
  busy = false,
  onView,
  onEdit,
  onDelete,
  onReopen,
  onQuickAction,
}) => {
  const finalState = record.status === 'completed' || record.status === 'closed';
  const overdue =
    record.daysUntilDue != null &&
    record.daysUntilDue < 0 &&
    !finalState;

  const assigned = Boolean(record.currentAssigneeUserId);
  const primaryAction =
    canEdit && assigned && ['new', 'assigned'].includes(record.status)
      ? {
          kind: 'quick' as const,
          action: 'start' as const,
          label: 'بدء التنفيذ',
          icon: PlayCircle,
          className: 'bg-sky-700 text-white hover:bg-sky-800',
        }
      : record.status === 'waiting_response'
        ? {
            kind: 'open' as const,
            label: 'متابعة الجهة',
            icon: Building2,
            className: 'bg-violet-700 text-white hover:bg-violet-800',
          }
        : canEdit && ['in_progress', 'needs_follow_up'].includes(record.status)
          ? {
              kind: 'edit' as const,
              label: 'تسجيل إجراء',
              icon: Pencil,
              className: 'bg-sky-700 text-white hover:bg-sky-800',
            }
          : record.status === 'completed' && supervisor
            ? {
                kind: 'quick' as const,
                action: 'approve_close' as const,
                label: 'اعتماد وإغلاق',
                icon: CheckCircle2,
                className: 'bg-emerald-700 text-white hover:bg-emerald-800',
              }
            : record.status === 'closed' && canReopen
              ? {
                  kind: 'reopen' as const,
                  label: 'إعادة فتح',
                  icon: RotateCcw,
                  className: 'bg-amber-600 text-white hover:bg-amber-700',
                }
              : null;

  const handlePrimary = () => {
    if (!primaryAction || busy) return;
    if (primaryAction.kind === 'quick') {
      onQuickAction(record, primaryAction.action);
      return;
    }
    if (primaryAction.kind === 'edit') {
      onEdit(record);
      return;
    }
    if (primaryAction.kind === 'reopen') {
      onReopen(record);
      return;
    }
    onView(record);
  };

  const copyTrackingNumber = async () => {
    try {
      await navigator.clipboard.writeText(record.trackingNumber);
    } catch {
      // Clipboard access may be unavailable in older browsers; opening details is still available.
    }
  };

  return (
    <article className="platform-record-card flex h-full flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">رقم المعاملة</p>
          <h2 className="mt-1 truncate text-lg font-black text-slate-800">
            {record.transactionNumber}
          </h2>
          <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
            {record.trackingNumber}
          </p>
        </div>

        <div className="flex max-w-[58%] flex-wrap justify-end gap-1.5">
          <Badge variant="outline" className="shrink-0 border-slate-300 bg-white text-slate-700">
            {typeLabels[record.transactionType]}
          </Badge>
          <Badge variant="outline" className={priorityClass[record.priority]}>
            {priorityLabels[record.priority]}
          </Badge>
          <Badge variant="outline" className={statusClass[record.status]}>
            {statusLabels[record.status]}
          </Badge>
        </div>
      </div>

      <div className="platform-record-metric mt-4 p-3">
        <p className="text-xs text-muted-foreground">موضوع المعاملة</p>
        <p className="mt-1 min-h-[48px] line-clamp-2 text-sm font-semibold leading-6 text-slate-700">
          {record.subject || '—'}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div className="min-w-0">
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            الموظف
          </dt>
          <dd className="mt-1 truncate font-semibold">{record.currentAssigneeName || 'غير مسندة'}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            تاريخ المعاملة
          </dt>
          <dd className="mt-1 font-semibold">{formatDate(record.transactionDate)}</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <FileClock className="h-3.5 w-3.5" />
            الاستحقاق
          </dt>
          <dd className={'mt-1 font-semibold ' + (overdue ? 'text-red-700' : '')}>
            {formatDate(record.dueDate)}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            آخر إجراء
          </dt>
          <dd className="mt-1 truncate font-semibold">{formatDateTime(record.lastActionAt)}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/65 px-3 py-2.5">
        <p className="text-[11px] text-muted-foreground">الإجراء المطلوب</p>
        <p className="mt-1 min-h-[36px] line-clamp-2 text-xs font-semibold leading-5 text-slate-700">
          {record.requiredAction || 'لا يوجد إجراء مطلوب مسجل.'}
        </p>
      </div>

      <div className="mt-3 flex min-h-[28px] flex-wrap items-center gap-1.5">
        <Badge variant="outline" className={indicatorClass[record.indicatorSeverity]}>
          {record.indicatorLabel}
        </Badge>
        {overdue && (
          <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">
            متأخرة {Math.abs(record.daysUntilDue || 0).toLocaleString('ar-SA')} يوم
          </Badge>
        )}
        {record.sourceEntity && (
          <span className="max-w-full truncate text-[10px] text-muted-foreground">
            الجهة: {record.sourceEntity}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 border-t border-slate-200/80 pt-4">
        <Button
          variant="outline"
          size="sm"
          className="h-10 flex-1"
          disabled={busy}
          onClick={() => onView(record)}
        >
          <Eye className="ml-1 h-4 w-4" />
          عرض
        </Button>

        {primaryAction && (
          <Button
            size="sm"
            className={'h-10 flex-[1.25] ' + primaryAction.className}
            disabled={busy}
            onClick={handlePrimary}
          >
            <primaryAction.icon className="ml-1 h-4 w-4" />
            {busy ? 'جارٍ التنفيذ...' : primaryAction.label}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 shrink-0"
              disabled={busy}
              aria-label="المزيد من إجراءات المعاملة"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[210px]" dir="rtl">
            <DropdownMenuItem onClick={() => onView(record)}>
              <Eye className="ml-2 h-4 w-4" />
              عرض التفاصيل
            </DropdownMenuItem>

            {canEdit && !finalState && primaryAction?.kind !== 'edit' && (
              <DropdownMenuItem onClick={() => onEdit(record)}>
                <Pencil className="ml-2 h-4 w-4" />
                تسجيل / تعديل الإجراء
              </DropdownMenuItem>
            )}

            {canReopen && finalState && primaryAction?.kind !== 'reopen' && (
              <DropdownMenuItem onClick={() => onReopen(record)}>
                <RotateCcw className="ml-2 h-4 w-4" />
                إعادة فتح المعاملة
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => void copyTrackingNumber()}>
              <Copy className="ml-2 h-4 w-4" />
              نسخ رقم المتابعة
            </DropdownMenuItem>

            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(record)}
                  className="text-red-700 focus:bg-red-50 focus:text-red-800"
                >
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف المعاملة
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
};

export default TransactionFollowUpCard;
