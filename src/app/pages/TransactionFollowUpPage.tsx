import React from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  Building2,
  CalendarClock,
  GitCompareArrows,
  Gavel,
  History,
  CheckCircle2,
  ClipboardCheck,
  CircleDot,
  Clock3,
  FileClock,
  FileCheck2,
  FileDown,
  FileSpreadsheet,
  FileText,
  Paperclip,
  Upload,
  ExternalLink,
  Printer,
  Inbox,
  ListTodo,
  Gauge,
  TimerReset,
  TrendingUp,
  UsersRound,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Save,
  ShieldAlert,
  ShieldCheck,
  Play,
  Trash2,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '../../context/PermissionsContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Textarea } from '../components/ui/textarea';
import { TransactionExecutiveReport } from '../components/TransactionExecutiveReport';
import { TransactionExecutiveInbox } from '../components/TransactionExecutiveInbox';
import { TransactionDailyWorkCenter } from '../components/TransactionDailyWorkCenter';
import { TransactionBackupSettings } from '../components/TransactionBackupSettings';
import { TransactionFollowUpCard } from '../components/TransactionFollowUpCard';
import { AppDateField } from '../components/AppDateField';
import { TransactionManagementDirectives } from '../components/TransactionManagementDirectives';
import { TransactionDirectivesDashboardDialog } from '../components/TransactionDirectivesDashboardDialog';
import { TransactionApprovalCenterDialog } from '../components/TransactionApprovalCenterDialog';
import { TransactionApprovalHistoryDialog } from '../components/TransactionApprovalHistoryDialog';
import { TransactionDirectiveKpiDialog } from '../components/TransactionDirectiveKpiDialog';
import { TransactionEarlyWarningDialog } from '../components/TransactionEarlyWarningDialog';
import {
  TransactionPreventiveActionsDialog,
  type PreventiveActionSeed,
} from '../components/TransactionPreventiveActionsDialog';
import {
  TransactionImprovementPlansDialog,
  type ImprovementPlanSeed,
} from '../components/TransactionImprovementPlansDialog';
import {
  transactionFollowUpApi,
  type TransactionFollowUpAnalytics,
  type TransactionFollowUpAssignee,
  type TransactionFollowUpAttachment,
  type TransactionFollowUpBackupData,
  type TransactionFollowUpCreateInput,
  type TransactionFollowUpDashboard,
  type TransactionFollowUpExecutiveInbox,
  type TransactionFollowUpExecutiveReport,
  type TransactionFollowUpReportArchive,
  type TransactionFollowUpReportComparison,
  type TransactionFollowUpReportSchedule,
  type TransactionFollowUpPriority,
  type TransactionFollowUpRecord,
  type TransactionFollowUpStatus,
  type TransactionFollowUpType,
  type TransactionFollowUpOrganizationalUnit,
} from '../api/transactionFollowUp';
import { formatFlexibleDate, isValidFlexibleDate } from '../../utils/dateUtils';

const EMPTY_DASHBOARD: TransactionFollowUpDashboard = {
  total: 0,
  open: 0,
  waiting: 0,
  overdue: 0,
  completed: 0,
  unassigned: 0,
  needsAction: 0,
};

const EMPTY_EXECUTIVE_INBOX: TransactionFollowUpExecutiveInbox = {
  generatedAt: new Date(0).toISOString(),
  scope: 'all',
  counters: {
    totalOpen: 0,
    attention: 0,
    overdue: 0,
    dueToday: 0,
    unassigned: 0,
    inactive: 0,
    needsFollowUp: 0,
    urgent: 0,
    staleWaiting: 0,
  },
  attentionItems: [],
  employeeLoad: [],
  highLoadThreshold: 3,
};

const EMPTY_ANALYTICS: TransactionFollowUpAnalytics = {
  periodDays: 90,
  generatedAt: new Date(0).toISOString(),
  summary: {
    tracked: 0,
    open: 0,
    completed: 0,
    overdueOpen: 0,
    needsAction: 0,
    onTimeRate: null,
    avgCompletionDays: null,
    avgFirstActionHours: null,
  },
  ageBuckets: {
    upTo2Days: 0,
    from3To7Days: 0,
    from8To14Days: 0,
    over14Days: 0,
  },
  employees: [],
  oldestOverdue: [],
};

const statusLabels: Record<TransactionFollowUpStatus, string> = {
  new: 'جديدة',
  assigned: 'تحت الإجراء',
  in_progress: 'تحت الإجراء',
  waiting_response: 'بانتظار رد',
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
  incoming_internal: 'وارد داخلي',
  incoming_external: 'وارد خارجي',
  outgoing_internal: 'صادر داخلي',
  outgoing_external: 'صادر خارجي',
  other: 'أخرى',
  incoming: 'وارد',
  outgoing: 'صادر',
  internal: 'داخلي',
};

const transactionTypeOptions: Array<{ value: TransactionFollowUpType; label: string }> = [
  { value: 'incoming_internal', label: 'وارد داخلي' },
  { value: 'incoming_external', label: 'وارد خارجي' },
  { value: 'outgoing_internal', label: 'صادر داخلي' },
  { value: 'outgoing_external', label: 'صادر خارجي' },
  { value: 'other', label: 'أخرى' },
];

const organizationalUnitLabels: Record<TransactionFollowUpOrganizationalUnit, string> = {
  endowments_properties: 'إدارة أوقاف وأملاك الجامعة',
  mosques_prayer_rooms: 'وحدة العناية بالمساجد والمصليات الجامعية',
};

const organizationalUnitOptions: Array<{
  value: TransactionFollowUpOrganizationalUnit;
  label: string;
}> = [
  { value: 'endowments_properties', label: 'إدارة أوقاف وأملاك الجامعة' },
  { value: 'mosques_prayer_rooms', label: 'وحدة العناية بالمساجد والمصليات الجامعية' },
];

const indicatorClass: Record<string, string> = {
  success: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-300 bg-amber-50 text-amber-900',
  danger: 'border-red-300 bg-red-50 text-red-800',
  info: 'border-sky-300 bg-sky-50 text-sky-800',
};

const priorityClass: Record<TransactionFollowUpPriority, string> = {
  low: 'border-slate-300 bg-slate-50 text-slate-700',
  normal: 'border-sky-300 bg-sky-50 text-sky-800',
  high: 'border-orange-300 bg-orange-50 text-orange-800',
  urgent: 'border-red-300 bg-red-50 text-red-800',
};

const statusClass: Record<TransactionFollowUpStatus, string> = {
  new: 'border-amber-300 bg-amber-50 text-amber-900',
  assigned: 'border-blue-300 bg-blue-50 text-blue-800',
  in_progress: 'border-blue-300 bg-blue-50 text-blue-800',
  waiting_response: 'border-sky-300 bg-sky-50 text-sky-800',
  needs_follow_up: 'border-orange-300 bg-orange-50 text-orange-800',
  completed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  closed: 'border-slate-300 bg-slate-50 text-slate-700',
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

const formatTransactionDate = (record?: Pick<
  TransactionFollowUpRecord,
  'transactionDate' | 'transactionDateType' | 'transactionDateInput'
> | null) =>
  record
    ? formatFlexibleDate(
        record.transactionDateInput || record.transactionDate,
        record.transactionDateType || 'gregorian',
        'ar',
      )
    : '—';

const enteredTransactionYear = (value?: string | null) =>
  value?.match(/^(\d{4})/)?.[1] || '';

const TRANSACTION_ATTACHMENT_ACCEPT =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4';
const MAX_TRANSACTION_ATTACHMENTS = 10;
const MAX_TRANSACTION_ATTACHMENT_SIZE_MB = 20;

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
};

const safeBackupFileName = (value: string, fallback = 'file') => {
  const cleaned = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
  return cleaned || fallback;
};

const saveBrowserBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const reportRange = (mode: 'weekly' | 'monthly') => {
  const today = new Date();
  if (mode === 'weekly') {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toInputDate(start), to: toInputDate(end) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: toInputDate(start), to: toInputDate(end) };
};

const emptyCreate = (): TransactionFollowUpCreateInput => ({
  transactionNumber: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  transactionDateType: 'gregorian',
  transactionType: 'incoming_external',
  organizationalUnit: '' as TransactionFollowUpOrganizationalUnit,
  subject: '',
  sourceEntity: '',
  priority: 'normal',
  currentAssigneeUserId: '',
  requiredAction: '',
  dueDate: '',
  inactivityAlertDays: 3,
  notes: '',
});

export const TransactionFollowUpPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const openedFromUrlRef = React.useRef<string | null>(null);
  const { currentUser } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();
  const canEdit = isAdmin || hasPermission('transaction_follow_up', 'canEdit');
  const canDelete = isAdmin || hasPermission('transaction_follow_up', 'canDelete');
  const canAdd = isAdmin || hasPermission('transaction_follow_up', 'canAdd');
  const canReopen = isAdmin || hasPermission('transaction_follow_up', 'canReopen');
  const canTransfer =
    isAdmin ||
    canDelete ||
    hasPermission('transaction_follow_up', 'canTransfer');
  const canUploadAttachments =
    isAdmin ||
    canDelete ||
    hasPermission('transaction_follow_up', 'canUploadAttachments');
  const canDeleteAttachments =
    isAdmin ||
    canDelete ||
    hasPermission('transaction_follow_up', 'canDeleteAttachments');
  const canPrint = isAdmin || hasPermission('transaction_follow_up', 'canPrint');
  const canArchive = isAdmin || hasPermission('archive', 'canAdd');

  const [dashboard, setDashboard] = React.useState<TransactionFollowUpDashboard>(EMPTY_DASHBOARD);
  const [executiveInbox, setExecutiveInbox] = React.useState<TransactionFollowUpExecutiveInbox>(EMPTY_EXECUTIVE_INBOX);
  const [analytics, setAnalytics] = React.useState<TransactionFollowUpAnalytics>(EMPTY_ANALYTICS);
  const [analyticsPeriod, setAnalyticsPeriod] = React.useState<'30' | '90' | '365' | 'all'>('90');
  const [records, setRecords] = React.useState<TransactionFollowUpRecord[]>([]);
  const [assignees, setAssignees] = React.useState<TransactionFollowUpAssignee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [cardActionBusyId, setCardActionBusyId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [organizationalUnitFilter, setOrganizationalUnitFilter] = React.useState<TransactionFollowUpOrganizationalUnit | ''>('');
  const [mine, setMine] = React.useState(false);
  const [activeWorkspace, setActiveWorkspace] = React.useState<'daily' | 'transactions' | 'directives' | 'oversight'>('daily');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [directivesDashboardOpen, setDirectivesDashboardOpen] = React.useState(false);
  const [approvalCenterOpen, setApprovalCenterOpen] = React.useState(false);
  const [approvalHistoryOpen, setApprovalHistoryOpen] = React.useState(false);
  const [directiveKpiOpen, setDirectiveKpiOpen] = React.useState(false);
  const [earlyWarningOpen, setEarlyWarningOpen] = React.useState(false);
  const [preventiveActionsOpen, setPreventiveActionsOpen] = React.useState(false);
  const [preventiveActionSeed, setPreventiveActionSeed] = React.useState<PreventiveActionSeed | null>(null);
  const [improvementPlansOpen, setImprovementPlansOpen] = React.useState(false);
  const [improvementPlanSeed, setImprovementPlanSeed] = React.useState<ImprovementPlanSeed | null>(null);
  const [capaSourcePreventiveActionId, setCapaSourcePreventiveActionId] = React.useState<string | null>(null);
  const [createForm, setCreateForm] = React.useState<TransactionFollowUpCreateInput>(emptyCreate());
  const [selected, setSelected] = React.useState<TransactionFollowUpRecord | null>(null);
  const [actionText, setActionText] = React.useState('');
  const [actionNote, setActionNote] = React.useState('');
  const [actionStatus, setActionStatus] = React.useState<TransactionFollowUpStatus>('in_progress');
  const [nextAction, setNextAction] = React.useState('');
  const [nextDueDate, setNextDueDate] = React.useState('');
  const [assignUserId, setAssignUserId] = React.useState('');
  const [assignNote, setAssignNote] = React.useState('');
  const [createFiles, setCreateFiles] = React.useState<File[]>([]);
  const [detailFiles, setDetailFiles] = React.useState<File[]>([]);
  const [attachmentUploading, setAttachmentUploading] = React.useState(false);
  const reportRef = React.useRef<HTMLDivElement | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [reportExporting, setReportExporting] = React.useState(false);
  const [backupProgress, setBackupProgress] = React.useState('');
  const [reportMode, setReportMode] = React.useState<'weekly' | 'monthly' | 'custom'>('monthly');
  const [reportFrom, setReportFrom] = React.useState(reportRange('monthly').from);
  const [reportTo, setReportTo] = React.useState(reportRange('monthly').to);
  const [reportAssigneeId, setReportAssigneeId] = React.useState('');
  const [reportData, setReportData] = React.useState<TransactionFollowUpExecutiveReport | null>(null);
  const [reportSection, setReportSection] = React.useState<'preview' | 'archive' | 'schedule'>('preview');
  const [reportArchives, setReportArchives] = React.useState<TransactionFollowUpReportArchive[]>([]);
  const [reportArchiveLoading, setReportArchiveLoading] = React.useState(false);
  const [reportArchivePage, setReportArchivePage] = React.useState(1);
  const [reportArchiveTotalPages, setReportArchiveTotalPages] = React.useState(0);
  const [compareLeftId, setCompareLeftId] = React.useState('');
  const [compareRightId, setCompareRightId] = React.useState('');
  const [reportComparison, setReportComparison] = React.useState<TransactionFollowUpReportComparison | null>(null);
  const [reportSchedules, setReportSchedules] = React.useState<TransactionFollowUpReportSchedule[]>([]);
  const [reportScheduleLoading, setReportScheduleLoading] = React.useState(false);
  const [scheduleName, setScheduleName] = React.useState('التقرير الأسبوعي للمتابعة');
  const [scheduleFrequency, setScheduleFrequency] = React.useState<'weekly' | 'monthly'>('weekly');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = React.useState(0);
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = React.useState(1);
  const [scheduleRunHour, setScheduleRunHour] = React.useState(8);
  const [scheduleAssigneeId, setScheduleAssigneeId] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [pageResult, dashboardResult, executiveInboxResult, analyticsResult] = await Promise.all([
        transactionFollowUpApi.list({
          page,
          pageSize: 30,
          search,
          status,
          priority,
          organizationalUnit: organizationalUnitFilter,
          mine,
        }),
        transactionFollowUpApi.dashboard(mine),
        transactionFollowUpApi.executiveInbox(mine),
        transactionFollowUpApi.analytics({
          mine,
          periodDays: analyticsPeriod === 'all' ? 'all' : Number(analyticsPeriod),
        }),
      ]);
      setRecords(pageResult.items || []);
      setTotal(pageResult.total || 0);
      setTotalPages(pageResult.totalPages || 0);
      setDashboard(dashboardResult);
      setExecutiveInbox(executiveInboxResult);
      setAnalytics(analyticsResult);
      if (pageResult.totalPages && page > pageResult.totalPages) setPage(pageResult.totalPages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل نظام المتابعة');
    } finally {
      setLoading(false);
    }
  }, [page, priority, search, status, organizationalUnitFilter, mine, analyticsPeriod]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), search.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  React.useEffect(() => {
    transactionFollowUpApi.assignees()
      .then(setAssignees)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'تعذر تحميل الموظفين'));
  }, []);

  React.useEffect(() => {
    setPage(1);
  }, [status, priority, organizationalUnitFilter, mine]);

  React.useEffect(() => {
    if (!(isAdmin || canDelete) && !mine) {
      setMine(true);
    }
  }, [isAdmin, canDelete, mine]);

  const openDetails = async (id: string) => {
    try {
      setDetailLoading(true);
      const record = await transactionFollowUpApi.get(id);
      setSelected(record);
      setDetailFiles([]);
      setAssignUserId(record.currentAssigneeUserId || '');
      setAssignNote('');
      setActionText('');
      setActionNote('');
      setActionStatus(
        ['completed', 'closed'].includes(record.status)
          ? record.status
          : record.status === 'waiting_response'
            ? 'waiting_response'
            : 'in_progress',
      );
      setNextAction(record.requiredAction || '');
      setNextDueDate(record.dueDate?.slice(0, 10) || '');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر فتح المعاملة');
    } finally {
      setDetailLoading(false);
    }
  };

  React.useEffect(() => {
    const transactionId = searchParams.get('transaction');
    if (!transactionId || openedFromUrlRef.current === transactionId) return;
    openedFromUrlRef.current = transactionId;
    void openDetails(transactionId);
  }, [searchParams]);

  React.useEffect(() => {
    if (searchParams.get('kpi') !== '1' || !(isAdmin || canDelete)) return;
    setDirectiveKpiOpen(true);
  }, [searchParams, isAdmin, canDelete]);

  React.useEffect(() => {
    if (searchParams.get('capa') !== '1' || !(isAdmin || canDelete)) return;
    setImprovementPlanSeed(null);
    setImprovementPlansOpen(true);
  }, [searchParams, isAdmin, canDelete]);

  React.useEffect(() => {
    if (searchParams.get('earlyWarning') !== '1' || !(isAdmin || canDelete)) return;
    setEarlyWarningOpen(true);
  }, [searchParams, isAdmin, canDelete]);

  React.useEffect(() => {
    if (searchParams.get('preventive') !== '1') return;
    setPreventiveActionSeed(null);
    setPreventiveActionsOpen(true);
  }, [searchParams]);

  const selectTransactionFiles = (
    incoming: File[],
    current: File[],
    existingCount = 0,
  ) => {
    const available = Math.max(0, MAX_TRANSACTION_ATTACHMENTS - existingCount);
    if (available === 0) {
      toast.error(`الحد الأعلى للمرفقات هو ${MAX_TRANSACTION_ATTACHMENTS} ملفات`);
      return current;
    }

    const next = [...current];
    const oversized: string[] = [];

    for (const file of incoming) {
      if (file.size > MAX_TRANSACTION_ATTACHMENT_SIZE_MB * 1024 * 1024) {
        oversized.push(file.name);
        continue;
      }
      const duplicate = next.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified,
      );
      if (!duplicate && next.length < available) next.push(file);
    }

    if (oversized.length) {
      toast.error(
        `تجاوز حجم الملف الحد المسموح (${MAX_TRANSACTION_ATTACHMENT_SIZE_MB} م.ب): ${oversized.join('، ')}`,
      );
    }
    if (incoming.length + current.length > available) {
      toast.warning(`الحد الأعلى للمرفقات هو ${MAX_TRANSACTION_ATTACHMENTS} ملفات`);
    }

    return next;
  };

  const uploadTransactionFiles = async (transactionId: string, files: File[]) => {
    let uploaded = 0;
    const failed: string[] = [];

    for (const file of files) {
      try {
        await transactionFollowUpApi.uploadAttachment(transactionId, file);
        uploaded += 1;
      } catch {
        failed.push(file.name);
      }
    }

    return { uploaded, failed };
  };

  const uploadDetailAttachments = async () => {
    if (!selected || detailFiles.length === 0) return;

    try {
      setAttachmentUploading(true);
      const result = await uploadTransactionFiles(selected.id, detailFiles);
      if (result.uploaded) {
        toast.success(
          result.uploaded === 1
            ? 'تم رفع المرفق بنجاح'
            : `تم رفع ${result.uploaded} مرفقات بنجاح`,
        );
      }
      if (result.failed.length) {
        toast.warning(`تعذر رفع: ${result.failed.join('، ')}`);
      }
      setDetailFiles([]);
      await openDetails(selected.id);
      await load();
    } finally {
      setAttachmentUploading(false);
    }
  };

  const deleteTransactionAttachment = async (attachmentId: string, title: string) => {
    if (!selected) return;
    if (!window.confirm(`حذف المرفق «${title}» من المعاملة؟`)) return;

    try {
      setAttachmentUploading(true);
      await transactionFollowUpApi.deleteAttachment(selected.id, attachmentId);
      toast.success('تم حذف المرفق');
      await openDetails(selected.id);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المرفق');
    } finally {
      setAttachmentUploading(false);
    }
  };

  const createTransaction = async () => {
    if (!canAdd) {
      toast.error('لا تملك صلاحية إضافة معاملة جديدة');
      return;
    }
    if (
      !createForm.transactionNumber.trim() ||
      !createForm.subject.trim() ||
      !createForm.transactionDate ||
      !createForm.organizationalUnit
    ) {
      toast.error('أكمل رقم المعاملة وتاريخها وموضوعها واختر الإدارة أو الوحدة');
      return;
    }
    if (!isValidFlexibleDate(createForm.transactionDate, createForm.transactionDateType)) {
      toast.error(
        createForm.transactionDateType === 'hijri'
          ? 'أدخل تاريخًا هجريًا صحيحًا مثل 1448/05/10'
          : 'أدخل تاريخًا ميلاديًا صحيحًا',
      );
      return;
    }
    try {
      setSaving(true);
      const created = await transactionFollowUpApi.create({
        ...createForm,
        currentAssigneeUserId: createForm.currentAssigneeUserId || null,
        sourceEntity: createForm.sourceEntity || null,
        requiredAction: createForm.requiredAction || null,
        dueDate: createForm.dueDate || null,
        notes: createForm.notes || null,
      });
      toast.success(`تم تسجيل المعاملة برقم متابعة ${created.trackingNumber}`);

      if (createFiles.length && canUploadAttachments) {
        setAttachmentUploading(true);
        const result = await uploadTransactionFiles(created.id, createFiles);
        if (result.uploaded) {
          toast.success(
            result.uploaded === 1
              ? 'تم إرفاق ملف واحد بالمعاملة'
              : `تم إرفاق ${result.uploaded} ملفات بالمعاملة`,
          );
        }
        if (result.failed.length) {
          toast.warning(`تم تسجيل المعاملة، وتعذر رفع: ${result.failed.join('، ')}`);
        }
      }

      setCreateOpen(false);
      setCreateForm(emptyCreate());
      setCreateFiles([]);
      setPage(1);
      await load();
      await openDetails(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تسجيل المعاملة');
    } finally {
      setSaving(false);
      setAttachmentUploading(false);
    }
  };

  const saveAssignment = async () => {
    if (!selected || !assignUserId) {
      toast.error('اختر الموظف المختص');
      return;
    }
    if (assignUserId === selected.currentAssigneeUserId) {
      toast.error('المعاملة مسندة بالفعل إلى الموظف المحدد');
      return;
    }

    const initialAssignment = !selected.currentAssigneeUserId;
    if (!initialAssignment && !(isAdmin || canDelete) && assignNote.trim().length < 3) {
      toast.error('سبب تحويل المعاملة مطلوب');
      return;
    }

    try {
      setSaving(true);
      const updated = await transactionFollowUpApi.assign(selected.id, {
        assigneeUserId: assignUserId,
        note: assignNote || null,
      });
      toast.success(initialAssignment ? 'تم إسناد المعاملة وبدء معالجتها' : 'تم تحويل المعاملة وتسجيل التحويل');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await openDetails(updated.id);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إسناد المعاملة');
    } finally {
      setSaving(false);
    }
  };

  const recordAction = async () => {
    if (!selected || !actionText.trim()) {
      toast.error('اكتب الإجراء الذي تم اتخاذه');
      return;
    }
    try {
      setSaving(true);
      const updated = await transactionFollowUpApi.recordAction(selected.id, {
        actionText: actionText.trim(),
        note: actionNote || null,
        status: actionStatus,
        requiredAction: nextAction || null,
        dueDate: nextDueDate || null,
      });
      toast.success(actionStatus === 'completed' || actionStatus === 'closed' ? 'تم تحديث وإنهاء حالة المعاملة' : 'تم تسجيل الإجراء');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await openDetails(updated.id);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تسجيل الإجراء');
    } finally {
      setSaving(false);
    }
  };

  const loadExecutiveReport = async (
    from = reportFrom,
    to = reportTo,
    assigneeUserId = reportAssigneeId,
  ) => {
    if (!from || !to) {
      toast.error('حدد بداية ونهاية فترة التقرير');
      return;
    }
    if (new Date(from).getTime() > new Date(to).getTime()) {
      toast.error('بداية فترة التقرير يجب أن تسبق نهايتها');
      return;
    }

    try {
      setReportLoading(true);
      const data = await transactionFollowUpApi.executiveReport({
        from,
        to,
        assigneeUserId: isAdmin || canDelete ? assigneeUserId || undefined : undefined,
        mine: !(isAdmin || canDelete),
      });
      setReportData(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إعداد التقرير التنفيذي');
    } finally {
      setReportLoading(false);
    }
  };

  const loadReportArchives = async (page = reportArchivePage) => {
    try {
      setReportArchiveLoading(true);
      const result = await transactionFollowUpApi.reportArchives({ page, pageSize: 20 });
      setReportArchives(result.items || []);
      setReportArchivePage(result.page || 1);
      setReportArchiveTotalPages(result.totalPages || 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل أرشيف التقارير');
    } finally {
      setReportArchiveLoading(false);
    }
  };

  const loadReportSchedules = async () => {
    try {
      setReportScheduleLoading(true);
      setReportSchedules(await transactionFollowUpApi.reportSchedules());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل جدولة التقارير');
    } finally {
      setReportScheduleLoading(false);
    }
  };

  const saveCurrentReportArchive = async () => {
    if (!reportData) {
      toast.error('أنشئ التقرير أولًا قبل حفظه في الأرشيف');
      return;
    }
    try {
      setReportArchiveLoading(true);
      await transactionFollowUpApi.archiveReport({
        reportType: reportMode,
        from: reportFrom,
        to: reportTo,
        assigneeUserId: isAdmin || canDelete ? reportAssigneeId || null : null,
      });
      toast.success('تم حفظ نسخة ثابتة من التقرير في الأرشيف');
      setReportSection('archive');
      await loadReportArchives(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ التقرير في الأرشيف');
    } finally {
      setReportArchiveLoading(false);
    }
  };

  const openArchivedReport = async (id: string) => {
    try {
      setReportArchiveLoading(true);
      const archive = await transactionFollowUpApi.reportArchive(id);
      setReportData(archive.snapshot);
      setReportFrom(archive.periodFrom.slice(0, 10));
      setReportTo(archive.periodTo.slice(0, 10));
      setReportMode(archive.reportType);
      setReportAssigneeId(archive.assigneeUserId || '');
      setReportSection('preview');
      toast.success('تم فتح النسخة المؤرشفة');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر فتح التقرير المؤرشف');
    } finally {
      setReportArchiveLoading(false);
    }
  };

  const deleteArchivedReport = async (id: string) => {
    if (!window.confirm('حذف هذه النسخة المؤرشفة من التقرير؟')) return;
    try {
      await transactionFollowUpApi.deleteReportArchive(id);
      toast.success('تم حذف التقرير المؤرشف');
      await loadReportArchives(reportArchivePage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف التقرير المؤرشف');
    }
  };

  const compareArchivedReports = async () => {
    if (!compareLeftId || !compareRightId || compareLeftId === compareRightId) {
      toast.error('اختر تقريرين مختلفين للمقارنة');
      return;
    }
    try {
      setReportArchiveLoading(true);
      setReportComparison(await transactionFollowUpApi.compareReportArchives(compareLeftId, compareRightId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر مقارنة التقريرين');
    } finally {
      setReportArchiveLoading(false);
    }
  };

  const createReportSchedule = async () => {
    if (!scheduleName.trim()) {
      toast.error('اكتب اسم الجدولة');
      return;
    }
    try {
      setReportScheduleLoading(true);
      await transactionFollowUpApi.createReportSchedule({
        name: scheduleName.trim(),
        frequency: scheduleFrequency,
        dayOfWeek: scheduleFrequency === 'weekly' ? scheduleDayOfWeek : null,
        dayOfMonth: scheduleFrequency === 'monthly' ? scheduleDayOfMonth : null,
        runHour: scheduleRunHour,
        assigneeUserId: isAdmin || canDelete ? scheduleAssigneeId || null : null,
        isActive: true,
      });
      toast.success('تم إنشاء جدولة التقرير الآلي');
      await loadReportSchedules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء جدولة التقرير');
    } finally {
      setReportScheduleLoading(false);
    }
  };

  const toggleReportSchedule = async (schedule: TransactionFollowUpReportSchedule) => {
    try {
      setReportScheduleLoading(true);
      await transactionFollowUpApi.updateReportSchedule(schedule.id, { isActive: !schedule.isActive });
      toast.success(schedule.isActive ? 'تم إيقاف الجدولة' : 'تم تفعيل الجدولة');
      await loadReportSchedules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث الجدولة');
    } finally {
      setReportScheduleLoading(false);
    }
  };

  const runReportScheduleNow = async (schedule: TransactionFollowUpReportSchedule) => {
    try {
      setReportScheduleLoading(true);
      const result = await transactionFollowUpApi.runReportSchedule(schedule.id);
      toast.success(result.generated ? 'تم إنشاء تقرير مؤرشف من الجدولة' : 'لا يوجد تقرير جديد يحتاج للإنشاء');
      await Promise.all([loadReportSchedules(), loadReportArchives(1)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تشغيل الجدولة');
    } finally {
      setReportScheduleLoading(false);
    }
  };

  const deleteReportSchedule = async (schedule: TransactionFollowUpReportSchedule) => {
    if (!window.confirm(`حذف جدولة «${schedule.name}»؟`)) return;
    try {
      await transactionFollowUpApi.deleteReportSchedule(schedule.id);
      toast.success('تم حذف الجدولة');
      await loadReportSchedules();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف الجدولة');
    }
  };

  const openExecutiveReport = async () => {
    const range = reportRange('monthly');
    setReportMode('monthly');
    setReportFrom(range.from);
    setReportTo(range.to);
    setReportAssigneeId('');
    setReportSection('preview');
    setReportOpen(true);
    await Promise.all([
      loadExecutiveReport(range.from, range.to, ''),
      loadReportArchives(1),
      loadReportSchedules(),
    ]);
  };

  const applyReportMode = async (mode: 'weekly' | 'monthly' | 'custom') => {
    setReportMode(mode);
    if (mode === 'custom') return;
    const range = reportRange(mode);
    setReportFrom(range.from);
    setReportTo(range.to);
    await loadExecutiveReport(range.from, range.to, reportAssigneeId);
  };

  const buildFollowUpWorkbook = async (backup: TransactionFollowUpBackupData) => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IAU Deeds and Lands Platform';
    workbook.company = 'Imam Abdulrahman Bin Faisal University';
    workbook.subject = 'نسخة بيانات نظام المتابعة';
    workbook.created = new Date();

    const setupSheet = (
      name: string,
      columns: Array<{ header: string; key: string; width?: number }>,
    ) => {
      const sheet = workbook.addWorksheet(name, {
        views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
      });
      sheet.columns = columns;
      const header = sheet.getRow(1);
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      header.alignment = { horizontal: 'center', vertical: 'middle' };
      header.height = 24;
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: Math.max(1, columns.length) },
      };
      return sheet;
    };

    const transactionSheet = setupSheet('المعاملات', [
      { header: 'رقم المتابعة', key: 'trackingNumber', width: 20 },
      { header: 'رقم المعاملة', key: 'transactionNumber', width: 18 },
      { header: 'السنة', key: 'transactionYear', width: 12 },
      { header: 'نوع التاريخ', key: 'transactionDateType', width: 14 },
      { header: 'تاريخ المعاملة', key: 'transactionDate', width: 18 },
      { header: 'التاريخ ISO', key: 'transactionDateIso', width: 24 },
      { header: 'النوع', key: 'transactionType', width: 16 },
      { header: 'الإدارة / الوحدة', key: 'organizationalUnit', width: 38 },
      { header: 'الموضوع', key: 'subject', width: 42 },
      { header: 'الجهة', key: 'sourceEntity', width: 26 },
      { header: 'الأولوية', key: 'priority', width: 12 },
      { header: 'الحالة', key: 'status', width: 16 },
      { header: 'الموظف المختص', key: 'assignee', width: 22 },
      { header: 'الإجراء المطلوب', key: 'requiredAction', width: 36 },
      { header: 'تاريخ الاستحقاق', key: 'dueDate', width: 18 },
      { header: 'آخر إجراء', key: 'lastActionAt', width: 22 },
      { header: 'آخر إجراء بواسطة', key: 'lastActionBy', width: 22 },
      { header: 'ملاحظات', key: 'notes', width: 36 },
      { header: 'تاريخ الإنجاز', key: 'completedAt', width: 20 },
      { header: 'تاريخ الإقفال', key: 'closedAt', width: 20 },
      { header: 'مؤرشفة', key: 'archived', width: 12 },
      { header: 'تاريخ الأرشفة', key: 'archivedAt', width: 20 },
      { header: 'أرشفها', key: 'archivedBy', width: 20 },
      { header: 'ملاحظة الأرشفة', key: 'archiveNote', width: 32 },
      { header: 'أنشأها', key: 'createdBy', width: 20 },
      { header: 'تاريخ الإنشاء', key: 'createdAt', width: 22 },
    ]);

    backup.transactions.forEach((record) => {
      transactionSheet.addRow({
        trackingNumber: record.trackingNumber,
        transactionNumber: record.transactionNumber,
        transactionYear: record.transactionYear ?? '',
        transactionDateType: record.transactionDateType === 'hijri' ? 'هجري' : 'ميلادي',
        transactionDate:
          record.transactionDateType === 'hijri' && record.transactionDateInput
            ? record.transactionDateInput
            : formatDate(record.transactionDate),
        transactionDateIso: record.transactionDate,
        transactionType: typeLabels[record.transactionType] || record.transactionType,
        organizationalUnit: record.organizationalUnit
          ? organizationalUnitLabels[record.organizationalUnit]
          : 'غير محددة للمعاملات السابقة',
        subject: record.subject,
        sourceEntity: record.sourceEntity || '',
        priority: priorityLabels[record.priority] || record.priority,
        status: statusLabels[record.status] || record.status,
        assignee: record.currentAssigneeName || '',
        requiredAction: record.requiredAction || '',
        dueDate: formatDate(record.dueDate),
        lastActionAt: formatDateTime(record.lastActionAt),
        lastActionBy: record.lastActionByName || '',
        notes: record.notes || '',
        completedAt: formatDateTime(record.completedAt),
        closedAt: formatDateTime(record.closedAt),
        archived: record.archivedAt ? 'نعم' : 'لا',
        archivedAt: formatDateTime(record.archivedAt),
        archivedBy: record.archivedByName || '',
        archiveNote: record.archiveNote || '',
        createdBy: record.createdByName || '',
        createdAt: formatDateTime(record.createdAt),
      });
    });

    const eventSheet = setupSheet('سجل الإجراءات', [
      { header: 'رقم المعاملة', key: 'transactionNumber', width: 18 },
      { header: 'السنة', key: 'transactionYear', width: 12 },
      { header: 'نوع الحدث', key: 'eventType', width: 22 },
      { header: 'من حالة', key: 'fromStatus', width: 16 },
      { header: 'إلى حالة', key: 'toStatus', width: 16 },
      { header: 'من موظف', key: 'fromAssignee', width: 22 },
      { header: 'إلى موظف', key: 'toAssignee', width: 22 },
      { header: 'الإجراء', key: 'actionText', width: 42 },
      { header: 'الملاحظة', key: 'note', width: 42 },
      { header: 'بواسطة', key: 'createdBy', width: 22 },
      { header: 'التاريخ والوقت', key: 'createdAt', width: 22 },
    ]);

    backup.transactions.forEach((record) => {
      record.events.forEach((event) => {
        eventSheet.addRow({
          transactionNumber: record.transactionNumber,
          transactionYear: record.transactionYear ?? '',
          eventType: event.eventType,
          fromStatus: event.fromStatus ? statusLabels[event.fromStatus as TransactionFollowUpStatus] || event.fromStatus : '',
          toStatus: event.toStatus ? statusLabels[event.toStatus as TransactionFollowUpStatus] || event.toStatus : '',
          fromAssignee: event.fromAssigneeName || '',
          toAssignee: event.toAssigneeName || '',
          actionText: event.actionText || '',
          note: event.note || '',
          createdBy: event.createdByName || '',
          createdAt: formatDateTime(event.createdAt),
        });
      });
    });

    const directiveSheet = setupSheet('التوجيهات والقرارات', [
      { header: 'رقم المعاملة', key: 'transactionNumber', width: 18 },
      { header: 'السنة', key: 'transactionYear', width: 12 },
      { header: 'النوع', key: 'directiveType', width: 12 },
      { header: 'العنوان', key: 'title', width: 34 },
      { header: 'النص', key: 'instruction', width: 48 },
      { header: 'الأولوية', key: 'priority', width: 12 },
      { header: 'الحالة', key: 'status', width: 18 },
      { header: 'المكلف', key: 'assigneeName', width: 22 },
      { header: 'الاستحقاق', key: 'dueDate', width: 18 },
      { header: 'أصدره', key: 'issuedByName', width: 22 },
      { header: 'تاريخ الإصدار', key: 'issuedAt', width: 22 },
      { header: 'رد الإنجاز', key: 'completionResponse', width: 40 },
      { header: 'ملاحظة الإنجاز', key: 'completionNote', width: 36 },
      { header: 'قرار المراجعة', key: 'reviewDecision', width: 20 },
      { header: 'ملاحظة المراجعة', key: 'reviewNote', width: 36 },
    ]);

    const reviewSheet = setupSheet('مراجعات التوجيهات', [
      { header: 'رقم المعاملة', key: 'transactionNumber', width: 18 },
      { header: 'عنوان التوجيه', key: 'directiveTitle', width: 34 },
      { header: 'القرار', key: 'decision', width: 22 },
      { header: 'الحالة السابقة', key: 'previousStatus', width: 18 },
      { header: 'الحالة التالية', key: 'nextStatus', width: 18 },
      { header: 'ملاحظة المراجعة', key: 'reviewNote', width: 38 },
      { header: 'رد الإنجاز', key: 'completionResponse', width: 38 },
      { header: 'المراجع', key: 'reviewedByName', width: 22 },
      { header: 'تاريخ المراجعة', key: 'reviewedAt', width: 22 },
    ]);

    backup.transactions.forEach((record) => {
      record.directives.forEach((directive) => {
        directiveSheet.addRow({
          transactionNumber: record.transactionNumber,
          transactionYear: record.transactionYear ?? '',
          directiveType: directive.directiveType === 'decision' ? 'قرار' : 'توجيه',
          title: directive.title,
          instruction: directive.instruction,
          priority: directive.priority,
          status: directive.status,
          assigneeName: directive.assigneeName,
          dueDate: formatDate(directive.dueDate),
          issuedByName: directive.issuedByName || '',
          issuedAt: formatDateTime(directive.issuedAt),
          completionResponse: directive.completionResponse || '',
          completionNote: directive.completionNote || '',
          reviewDecision: directive.reviewDecision || '',
          reviewNote: directive.reviewNote || '',
        });
        directive.reviews.forEach((review) => {
          reviewSheet.addRow({
            transactionNumber: record.transactionNumber,
            directiveTitle: directive.title,
            decision: review.decision,
            previousStatus: review.previousStatus,
            nextStatus: review.nextStatus,
            reviewNote: review.reviewNote || '',
            completionResponse: review.completionResponse || '',
            reviewedByName: review.reviewedByName || '',
            reviewedAt: formatDateTime(review.reviewedAt),
          });
        });
      });
    });

    const extensionSheet = setupSheet('طلبات التمديد', [
      { header: 'رقم المعاملة', key: 'transactionNumber', width: 18 },
      { header: 'الاستحقاق السابق', key: 'currentDueDate', width: 18 },
      { header: 'الاستحقاق المطلوب', key: 'requestedDueDate', width: 18 },
      { header: 'السبب', key: 'reason', width: 42 },
      { header: 'الحالة', key: 'status', width: 16 },
      { header: 'طلبها', key: 'requestedByName', width: 22 },
      { header: 'راجعها', key: 'reviewedByName', width: 22 },
      { header: 'ملاحظة المراجعة', key: 'reviewNote', width: 36 },
      { header: 'تاريخ القرار', key: 'decisionAt', width: 22 },
      { header: 'تاريخ الطلب', key: 'createdAt', width: 22 },
    ]);

    backup.transactions.forEach((record) => {
      record.extensionRequests.forEach((request) => {
        extensionSheet.addRow({
          transactionNumber: record.transactionNumber,
          currentDueDate: formatDate(request.currentDueDate),
          requestedDueDate: formatDate(request.requestedDueDate),
          reason: request.reason,
          status: request.status,
          requestedByName: request.requestedByName,
          reviewedByName: request.reviewedByName || '',
          reviewNote: request.reviewNote || '',
          decisionAt: formatDateTime(request.decisionAt),
          createdAt: formatDateTime(request.createdAt),
        });
      });
    });

    const waitSheet = setupSheet('انتظار الجهات', [
      { header: 'رقم المعاملة', key: 'transactionNumber', width: 18 },
      { header: 'الجهة الخارجية', key: 'externalEntity', width: 28 },
      { header: 'رقم المرجع الصادر', key: 'outboundReferenceNumber', width: 20 },
      { header: 'تاريخ الإرسال', key: 'sentAt', width: 18 },
      { header: 'المتابعة القادمة', key: 'nextFollowUpDate', width: 18 },
      { header: 'الحالة', key: 'status', width: 16 },
      { header: 'عدد المتابعات', key: 'followUpCount', width: 14 },
      { header: 'آخر متابعة', key: 'lastFollowUpAt', width: 22 },
      { header: 'ملاحظة آخر متابعة', key: 'lastFollowUpNote', width: 38 },
      { header: 'تاريخ ورود الرد', key: 'responseReceivedAt', width: 22 },
      { header: 'رقم الرد', key: 'responseReferenceNumber', width: 20 },
      { header: 'ملخص الرد', key: 'responseNote', width: 38 },
    ]);

    backup.transactions.forEach((record) => {
      record.externalWaits.forEach((wait) => {
        waitSheet.addRow({
          transactionNumber: record.transactionNumber,
          externalEntity: wait.externalEntity,
          outboundReferenceNumber: wait.outboundReferenceNumber || '',
          sentAt: formatDate(wait.sentAt),
          nextFollowUpDate: formatDate(wait.nextFollowUpDate),
          status: wait.status,
          followUpCount: wait.followUpCount,
          lastFollowUpAt: formatDateTime(wait.lastFollowUpAt),
          lastFollowUpNote: wait.lastFollowUpNote || '',
          responseReceivedAt: formatDateTime(wait.responseReceivedAt),
          responseReferenceNumber: wait.responseReferenceNumber || '',
          responseNote: wait.responseNote || '',
        });
      });
    });

    const transactionById = new Map(backup.transactions.map((record) => [record.id, record]));
    const directiveInfo = new Map<string, { transactionId: string; title: string }>();
    backup.transactions.forEach((record) => {
      record.directives.forEach((directive) => {
        directiveInfo.set(directive.id, {
          transactionId: record.id,
          title: directive.title,
        });
      });
    });

    const attachmentSheet = setupSheet('المرفقات', [
      { header: 'رقم المعاملة', key: 'transactionNumber', width: 18 },
      { header: 'السنة', key: 'transactionYear', width: 12 },
      { header: 'المصدر', key: 'source', width: 22 },
      { header: 'عنوان التوجيه', key: 'directiveTitle', width: 30 },
      { header: 'اسم الملف', key: 'title', width: 38 },
      { header: 'نوع الملف', key: 'mimeType', width: 28 },
      { header: 'ملاحظات', key: 'notes', width: 36 },
      { header: 'أضيف بواسطة', key: 'createdBy', width: 22 },
      { header: 'تاريخ الإضافة', key: 'createdAt', width: 22 },
      { header: 'رابط Google Drive', key: 'driveUrl', width: 55 },
      { header: 'معرف الملف', key: 'driveFileId', width: 30 },
    ]);

    backup.attachments.forEach((attachment) => {
      const directive = attachment.entityType === 'transaction_follow_up_directive'
        ? directiveInfo.get(attachment.entityId)
        : null;
      const transaction = transactionById.get(
        attachment.entityType === 'transaction_follow_up'
          ? attachment.entityId
          : directive?.transactionId || '',
      );
      attachmentSheet.addRow({
        transactionNumber: transaction?.transactionNumber || '',
        transactionYear: transaction?.transactionYear ?? '',
        source: attachment.entityType === 'transaction_follow_up' ? 'المعاملة' : 'دليل توجيه/قرار',
        directiveTitle: directive?.title || '',
        title: attachment.title,
        mimeType: attachment.mimeType || '',
        notes: attachment.notes || '',
        createdBy: attachment.createdBy || '',
        createdAt: formatDateTime(attachment.createdAt),
        driveUrl: attachment.driveUrl,
        driveFileId: attachment.driveFileId || '',
      });
    });

    workbook.eachSheet((sheet) => {
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.alignment = { vertical: 'top', wrapText: true, readingOrder: 'rtl' };
      });
    });

    return {
      workbook,
      transactionById,
      directiveInfo,
    };
  };

  const exportFollowUpExcel = async () => {
    try {
      setReportExporting(true);
      setBackupProgress('جارٍ تجهيز بيانات Excel...');
      const backup = await transactionFollowUpApi.backupData({
        from: reportFrom,
        to: reportTo,
        assigneeUserId: isAdmin || canDelete ? reportAssigneeId || undefined : undefined,
        mine: !(isAdmin || canDelete),
      });
      const { workbook } = await buildFollowUpWorkbook(backup);
      const buffer = await workbook.xlsx.writeBuffer();
      saveBrowserBlob(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        `تقرير-متابعة-المعاملات-${reportFrom}-إلى-${reportTo}.xlsx`,
      );
      toast.success(`تم إنشاء تقرير Excel ويحتوي على ${backup.totals.transactions} معاملة وبيانات المرفقات`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء تقرير Excel');
    } finally {
      setBackupProgress('');
      setReportExporting(false);
    }
  };

  const exportFullFollowUpBackup = async () => {
    if (!window.confirm(
      'سيتم إنشاء نسخة احتياطية كاملة تحتوي على ملف Excel، البيانات الخام، والصور والمرفقات الفعلية. قد تستغرق العملية وقتًا حسب عدد وحجم الملفات. هل تريد المتابعة؟',
    )) {
      return;
    }

    try {
      setReportExporting(true);
      setBackupProgress('جارٍ جمع بيانات نظام المتابعة...');
      const [backup, JSZipModule] = await Promise.all([
        transactionFollowUpApi.backupData({
          full: true,
          mine: !(isAdmin || canDelete),
        }),
        import('jszip'),
      ]);
      const { workbook, transactionById, directiveInfo } = await buildFollowUpWorkbook(backup);
      const zip = new JSZipModule.default();

      setBackupProgress('جارٍ إنشاء ملف Excel...');
      const workbookBuffer = await workbook.xlsx.writeBuffer();
      zip.file('تقرير-نظام-المتابعة.xlsx', workbookBuffer);
      zip.file(
        'manifest.json',
        JSON.stringify(
          {
            ...backup,
            note: 'نسخة احتياطية مستقلة لنظام المتابعة تحتوي على البيانات الوصفية وسجل الإجراءات وروابط المرفقات.',
          },
          null,
          2,
        ),
      );

      const downloadFailures: Array<{ attachmentId: string; title: string; reason: string }> = [];
      let completedDownloads = 0;
      const totalAttachments = backup.attachments.length;

      const buildAttachmentPath = (attachment: TransactionFollowUpBackupData['attachments'][number]) => {
        const directive = attachment.entityType === 'transaction_follow_up_directive'
          ? directiveInfo.get(attachment.entityId)
          : null;
        const transaction = transactionById.get(
          attachment.entityType === 'transaction_follow_up'
            ? attachment.entityId
            : directive?.transactionId || '',
        );
        const transactionFolder = transaction
          ? `معاملة-${safeBackupFileName(transaction.transactionNumber)}-${transaction.transactionYear || 'بدون-سنة'}`
          : 'معاملة-غير-معروفة';
        const sourceFolder = attachment.entityType === 'transaction_follow_up'
          ? 'مرفقات-المعاملة'
          : `أدلة-التوجيهات/${safeBackupFileName(directive?.title || attachment.entityId)}`;
        return `المرفقات/${transactionFolder}/${sourceFolder}/${attachment.id.slice(-8)}-${safeBackupFileName(attachment.title, 'مرفق')}`;
      };

      for (let index = 0; index < backup.attachments.length; index += 4) {
        const batch = backup.attachments.slice(index, index + 4);
        await Promise.all(batch.map(async (attachment) => {
          try {
            if (!attachment.driveFileId) {
              throw new Error('لا يوجد معرف Google Drive');
            }
            const blob = await transactionFollowUpApi.downloadBackupAttachment(attachment.id);
            zip.file(buildAttachmentPath(attachment), await blob.arrayBuffer());
          } catch (error) {
            downloadFailures.push({
              attachmentId: attachment.id,
              title: attachment.title,
              reason: error instanceof Error ? error.message : 'تعذر تنزيل الملف',
            });
          } finally {
            completedDownloads += 1;
            setBackupProgress(
              totalAttachments
                ? `جارٍ تنزيل المرفقات ${completedDownloads}/${totalAttachments}`
                : 'لا توجد مرفقات؛ جارٍ إكمال النسخة...',
            );
          }
        }));
      }

      if (downloadFailures.length) {
        zip.file('مرفقات-تعذر-تنزيلها.json', JSON.stringify(downloadFailures, null, 2));
      }

      setBackupProgress('جارٍ ضغط النسخة الاحتياطية...');
      const zipBlob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          setBackupProgress(`جارٍ ضغط النسخة الاحتياطية ${Math.round(metadata.percent)}%`);
        },
      );

      const stamp = new Date().toISOString().slice(0, 10);
      saveBrowserBlob(zipBlob, `نسخة-احتياطية-نظام-المتابعة-${stamp}.zip`);

      if (downloadFailures.length) {
        toast.warning(
          `تم إنشاء النسخة، لكن تعذر تنزيل ${downloadFailures.length} مرفق. أُضيفت قائمة بها داخل الملف المضغوط.`,
        );
      } else {
        toast.success(
          `تم إنشاء نسخة احتياطية كاملة: ${backup.totals.transactions} معاملة و${backup.totals.attachments} مرفق.`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء النسخة الاحتياطية الكاملة');
    } finally {
      setBackupProgress('');
      setReportExporting(false);
    }
  };

  const printExecutiveReport = () => {
    if (!reportRef.current || !reportData) return;
    const popup = window.open('', '_blank', 'width=1200,height=900');
    if (!popup) {
      toast.error('تعذر فتح نافذة الطباعة. تحقق من السماح بالنوافذ المنبثقة.');
      return;
    }
    const title = `تقرير متابعة المعاملات ${reportFrom} إلى ${reportTo}`;
    const styleAssets = [
      ...Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
        (link) => `<link rel="stylesheet" href="${(link as HTMLLinkElement).href}" />`,
      ),
      ...Array.from(document.querySelectorAll('style')).map((style) => style.outerHTML),
    ].join('\n');
    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${title}</title>
${styleAssets}
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Tahoma, sans-serif; color: #17202a; background: #fff; }
  .report-sheet { width: 100% !important; max-width: none !important; padding: 0 !important; box-shadow: none !important; border: 0 !important; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #d5d9dd; padding: 6px 7px; font-size: 10px; vertical-align: top; }
  th { background: #f2f5f4; font-weight: 700; }
  h1, h2, h3, p { margin-top: 0; }
  .no-print { display: none !important; }
  .break-inside-avoid { break-inside: avoid; }
</style>
</head>
<body>${reportRef.current.outerHTML}</body>
</html>`);
    popup.document.close();
    popup.focus();
    window.setTimeout(() => {
      popup.print();
    }, 700);
  };

  const exportExecutiveReportPdf = async () => {
    if (!reportRef.current || !reportData) return;
    try {
      setReportExporting(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const margin = 8;
      const pageWidth = 210;
      const pageHeight = 297;
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;
      const pxPerMm = canvas.width / printableWidth;
      const pageHeightPx = Math.max(1, Math.floor(printableHeight * pxPerMm));

      let pageIndex = 0;
      for (let offsetY = 0; offsetY < canvas.height; offsetY += pageHeightPx) {
        const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const context = pageCanvas.getContext('2d');
        if (!context) continue;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        context.drawImage(
          canvas,
          0,
          offsetY,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight,
        );

        if (pageIndex > 0) pdf.addPage();
        const imageHeightMm = sliceHeight / pxPerMm;
        pdf.addImage(
          pageCanvas.toDataURL('image/jpeg', 0.92),
          'JPEG',
          margin,
          margin,
          printableWidth,
          imageHeightMm,
          undefined,
          'FAST',
        );
        pageIndex += 1;
      }

      pdf.save(`تقرير-متابعة-المعاملات-${reportFrom}-إلى-${reportTo}.pdf`);
      toast.success('تم إنشاء ملف PDF للتقرير التنفيذي');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء ملف PDF');
    } finally {
      setReportExporting(false);
    }
  };

  const runCardQuickAction = async (
    record: TransactionFollowUpRecord,
    action: 'approve_close',
  ) => {
    if (
      !window.confirm(`اعتماد إنجاز المعاملة رقم ${record.transactionNumber} وإقفالها؟`)
    ) {
      return;
    }

    try {
      setCardActionBusyId(record.id);
      await transactionFollowUpApi.workQueueAction(record.id, { action });
      toast.success('تم اعتماد إنجاز المعاملة وإقفالها');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
      if (selected?.id === record.id) {
        await openDetails(record.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تنفيذ الإجراء');
    } finally {
      setCardActionBusyId(null);
    }
  };

  const reopenTransaction = async (record: TransactionFollowUpRecord) => {
    const entered = window.prompt(
      `اكتب سبب إعادة فتح المعاملة رقم ${record.transactionNumber}:`,
    );
    if (entered == null) return;
    const reason = entered.trim();
    if (reason.length < 5) {
      toast.error('سبب إعادة فتح المعاملة مطلوب');
      return;
    }
    if (!window.confirm('سيتم إعادة المعاملة إلى العمل وحفظ سبب إعادة الفتح في سجل الإجراءات. هل تريد المتابعة؟')) {
      return;
    }

    try {
      setSaving(true);
      await transactionFollowUpApi.workQueueAction(record.id, {
        action: 'reopen',
        note: reason,
      });
      toast.success('تمت إعادة فتح المعاملة وإعادتها إلى العمل');
      await Promise.all([load(), openDetails(record.id)]);
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إعادة فتح المعاملة');
    } finally {
      setSaving(false);
    }
  };

  const archiveTransaction = async (record: TransactionFollowUpRecord) => {
    if (record.status !== 'closed') {
      toast.error('لا يمكن أرشفة المعاملة إلا بعد اعتماد إنجازها وإقفالها');
      return;
    }

    const entered = window.prompt(
      `ملاحظات الأرشفة للمعاملة رقم ${record.transactionNumber} (اختياري):`,
      '',
    );
    if (entered == null) return;

    if (!window.confirm(
      'سيتم ترحيل المعاملة من قوائم المتابعة النشطة إلى قسم «الأرشفة»، مع الاحتفاظ بكامل سجل الإجراءات والمرفقات. هل تريد المتابعة؟',
    )) {
      return;
    }

    try {
      setSaving(true);
      await transactionFollowUpApi.archive(record.id, entered.trim() || null);
      toast.success('تم ترحيل المعاملة إلى قسم الأرشفة');
      if (selected?.id === record.id) setSelected(null);
      await load();
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر ترحيل المعاملة إلى الأرشفة');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: TransactionFollowUpRecord) => {
    if (!window.confirm(`حذف المعاملة رقم ${record.transactionNumber} من نظام المتابعة نهائيًا؟`)) return;
    try {
      await transactionFollowUpApi.remove(record.id);
      toast.success('تم حذف المعاملة');
      if (selected?.id === record.id) setSelected(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حذف المعاملة');
    }
  };

  const canManageSelected = Boolean(
    selected &&
    canEdit &&
    (
      isAdmin ||
      canDelete ||
      selected.currentAssigneeUserId === currentUser?.uid
    )
  );

  const canAssignSelected = Boolean(
    selected &&
    !['completed', 'closed'].includes(selected.status) &&
    !selected.currentAssigneeUserId &&
    (
      isAdmin ||
      canDelete ||
      (
        canAdd &&
        selected.createdById === currentUser?.uid
      )
    )
  );

  const canTransferSelected = Boolean(
    selected &&
    canTransfer &&
    !['completed', 'closed'].includes(selected.status) &&
    Boolean(selected.currentAssigneeUserId) &&
    (
      isAdmin ||
      canDelete ||
      selected.currentAssigneeUserId === currentUser?.uid
    )
  );

  const canUploadSelectedAttachments = Boolean(
    selected &&
    !['completed', 'closed'].includes(selected.status) &&
    (
      isAdmin ||
      canDelete ||
      (
        canUploadAttachments &&
        selected.currentAssigneeUserId === currentUser?.uid
      )
    )
  );

  const canDeleteSelectedAttachment = (attachment: TransactionFollowUpAttachment) =>
    Boolean(
      selected &&
      (
        isAdmin ||
        canDelete ||
        (
          canDeleteAttachments &&
          selected.currentAssigneeUserId === currentUser?.uid &&
          attachment.createdById === currentUser?.uid &&
          !['completed', 'closed'].includes(selected.status)
        )
      )
    );

  const recentRecords = React.useMemo(
    () =>
      [...records]
        .sort((left, right) =>
          new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
        )
        .slice(0, 5),
    [records],
  );

  const openBackupCenter = () => {
    setReportSection('schedule');
    setReportOpen(true);
    void loadReportSchedules();
  };

  return (
    <div className="follow-up-page-theme mx-auto w-full max-w-[1750px] space-y-5">
      <section className="followup-hero overflow-hidden rounded-[28px]">
        <div className="followup-hero__top">
          <div className="followup-hero__title">
            <span className="followup-hero__title-icon">
              <FileText className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-black text-cyan-300">
                <ListTodo className="h-3.5 w-3.5" />
                سير ومتابعة المعاملات
              </div>
              <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">نظام المتابعة</h1>
              <p className="mt-1 text-xs leading-6 text-slate-300 sm:text-sm">
                إدارة ومتابعة معاملات إدارة أوقاف وأملاك الجامعة ووحدة العناية بالمساجد والمصليات الجامعية.
              </p>
            </div>
          </div>

          <div className="followup-hero__search">
            <Search className="h-5 w-5 shrink-0 text-cyan-300" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') setActiveWorkspace('transactions');
              }}
              placeholder="البحث في المعاملات..."
              className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="followup-hero__actions">
            {(isAdmin || canDelete) ? (
              <Button
                variant="outline"
                className="followup-hero__button"
                onClick={() => setMine((value) => !value)}
              >
                <UserRound className="ml-2 h-4 w-4" />
                {mine ? 'عرض الإدارة' : 'معاملاتي'}
              </Button>
            ) : (
              <Badge variant="outline" className="followup-hero__badge">
                <UserRound className="ml-2 h-4 w-4" />
                مهامي المسندة
              </Badge>
            )}

            <Button
              variant="outline"
              className="followup-hero__button"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw className={'ml-2 h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
              تحديث
            </Button>

            {canPrint && (
              <Button
                variant="outline"
                className="followup-hero__button"
                onClick={() => void openExecutiveReport()}
              >
                <FileText className="ml-2 h-4 w-4" />
                التقارير
              </Button>
            )}

            {canAdd && (
              <Button
                className="followup-hero__button followup-hero__button--primary"
                onClick={() => {
                  setCreateForm(emptyCreate());
                  setCreateFiles([]);
                  setCreateOpen(true);
                }}
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة معاملة
              </Button>
            )}
          </div>
        </div>

        <div className="followup-unit-grid">
          <FollowUpUnitCard
            title="إدارة أوقاف وأملاك الجامعة"
            subtitle="عرض معاملات الإدارة"
            icon={<Building2 className="h-8 w-8" />}
            tone="blue"
            onClick={() => {
              setOrganizationalUnitFilter('endowments_properties');
              setStatus('');
              setPriority('');
              setSearch('');
              setActiveWorkspace('transactions');
            }}
          />
          <FollowUpUnitCard
            title="وحدة العناية بالمساجد والمصليات الجامعية"
            subtitle="عرض معاملات الوحدة"
            icon={<ShieldCheck className="h-8 w-8" />}
            tone="teal"
            onClick={() => {
              setOrganizationalUnitFilter('mosques_prayer_rooms');
              setStatus('');
              setPriority('');
              setSearch('');
              setActiveWorkspace('transactions');
            }}
          />
        </div>

        <div className="followup-workspace-nav">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <WorkspaceTab
              active={activeWorkspace === 'daily'}
              icon={<Inbox className="h-4 w-4" />}
              title="الرئيسية"
              hint="لوحة المتابعة"
              onClick={() => setActiveWorkspace('daily')}
            />
            <WorkspaceTab
              active={activeWorkspace === 'transactions'}
              icon={<ListTodo className="h-4 w-4" />}
              title="المعاملات"
              hint="البحث والقائمة الكاملة"
              onClick={() => setActiveWorkspace('transactions')}
            />
            <WorkspaceTab
              active={activeWorkspace === 'directives'}
              icon={<Gavel className="h-4 w-4" />}
              title="التوجيهات والاعتمادات"
              hint="التوجيهات والقرارات"
              onClick={() => setActiveWorkspace('directives')}
            />
            <WorkspaceTab
              active={activeWorkspace === 'oversight'}
              icon={<Gauge className="h-4 w-4" />}
              title="الرقابة والتحسين"
              hint="الأداء والمخاطر والتقارير"
              onClick={() => setActiveWorkspace('oversight')}
            />
          </div>
        </div>
      </section>

      {activeWorkspace === 'daily' && (
        <div className="space-y-5">
          <div className="followup-kpi-grid">
            <FollowUpKpiCard title="مفتوحة" value={dashboard.open} icon={<Inbox className="h-6 w-6" />} tone="slate" />
            <FollowUpKpiCard title="تحتاج إجراء" value={dashboard.needsAction} icon={<AlertTriangle className="h-6 w-6" />} tone="orange" />
            <FollowUpKpiCard title="متأخرة" value={dashboard.overdue} icon={<Clock3 className="h-6 w-6" />} tone="red" />
            <FollowUpKpiCard title="بانتظار جهة" value={dashboard.waiting} icon={<FileClock className="h-6 w-6" />} tone="blue" />
            <FollowUpKpiCard title="غير مسندة" value={dashboard.unassigned} icon={<UserRound className="h-6 w-6" />} tone="amber" />
            <FollowUpKpiCard title="منجزة / مغلقة" value={dashboard.completed} icon={<CheckCircle2 className="h-6 w-6" />} tone="green" />
          </div>

          <section className="followup-filterbar">
            <div className="followup-filterbar__search">
              <Search className="h-5 w-5 text-cyan-300" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setActiveWorkspace('transactions');
                }}
                placeholder="البحث في رقم المعاملة أو الموضوع أو الجهة..."
                className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
            </div>

            <NativeSelect
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="followup-filterbar__select"
            >
              <option value="">جميع الحالات</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="followup-filterbar__select"
            >
              <option value="">جميع الأولويات</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>

            <NativeSelect
              value={organizationalUnitFilter}
              onChange={(event) =>
                setOrganizationalUnitFilter(event.target.value as TransactionFollowUpOrganizationalUnit | '')
              }
              className="followup-filterbar__select"
            >
              <option value="">جميع الإدارات والوحدات</option>
              {organizationalUnitOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </NativeSelect>

            <Button
              type="button"
              className="followup-filterbar__advanced"
              onClick={() => setActiveWorkspace('transactions')}
            >
              <Settings2 className="ml-2 h-4 w-4" />
              تصفية متقدمة
            </Button>
          </section>

          <section className="followup-recent-panel">
            <div className="followup-recent-panel__header">
              <div className="flex items-center gap-3">
                <span className="followup-recent-panel__icon">
                  <Clock3 className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black">أحدث المعاملات</h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    آخر المعاملات التي جرى تحديثها ضمن نطاق العرض الحالي.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="followup-recent-panel__all"
                onClick={() => setActiveWorkspace('transactions')}
              >
                عرض الكل
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="followup-recent-table w-full min-w-[920px]">
                <thead>
                  <tr className="followup-recent-table__head-row">
                    <th>رقم المعاملة</th>
                    <th>الموضوع</th>
                    <th>الإدارة / الوحدة</th>
                    <th>تاريخ المعاملة</th>
                    <th>الحالة</th>
                    <th>الأولوية</th>
                    <th>الموظف المسؤول</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && recentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                        <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                        جارٍ تحميل المعاملات...
                      </td>
                    </tr>
                  ) : recentRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                        لا توجد معاملات مطابقة للنطاق الحالي.
                      </td>
                    </tr>
                  ) : recentRecords.map((record) => (
                    <tr key={record.id} className="followup-recent-table__row">
                      <td>
                        <button
                          type="button"
                          className="text-right font-black text-white hover:text-cyan-300"
                          onClick={() => void openDetails(record.id)}
                        >
                          {record.transactionNumber}
                          <span className="mt-1 block font-mono text-[10px] font-normal text-slate-400">
                            {record.trackingNumber}
                          </span>
                        </button>
                      </td>
                      <td className="max-w-[280px]">
                        <span className="block truncate font-semibold text-slate-100">{record.subject}</span>
                      </td>
                      <td className="max-w-[230px]">
                        <span className="block truncate text-xs text-slate-300">
                          {record.organizationalUnit
                            ? organizationalUnitLabels[record.organizationalUnit]
                            : 'غير محددة'}
                        </span>
                      </td>
                      <td>{formatTransactionDate(record)}</td>
                      <td>
                        <Badge variant="outline" className={statusClass[record.status]}>
                          {statusLabels[record.status]}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant="outline" className={priorityClass[record.priority]}>
                          {priorityLabels[record.priority]}
                        </Badge>
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span className="followup-user-dot">
                            <UserRound className="h-3.5 w-3.5" />
                          </span>
                          {record.currentAssigneeName || 'غير مسندة'}
                        </span>
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline"
                          className="followup-row-action"
                          onClick={() => void openDetails(record.id)}
                        >
                          عرض
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="followup-shortcut-grid">
            {canAdd && (
              <FollowUpShortcutCard
                title="إضافة معاملة جديدة"
                subtitle="تسجيل معاملة ومتابعتها"
                icon={<Plus className="h-6 w-6" />}
                tone="violet"
                onClick={() => {
                  setCreateForm(emptyCreate());
                  setCreateFiles([]);
                  setCreateOpen(true);
                }}
              />
            )}
            {canPrint && (
              <FollowUpShortcutCard
                title="التقارير والإحصائيات"
                subtitle="عرض التقارير التفصيلية"
                icon={<Gauge className="h-6 w-6" />}
                tone="cyan"
                onClick={() => void openExecutiveReport()}
              />
            )}
            {(isAdmin || canDelete) && (
              <FollowUpShortcutCard
                title="نسخ احتياطية"
                subtitle="النسخ والاستعادة والتحقق"
                icon={<Archive className="h-6 w-6" />}
                tone="amber"
                onClick={openBackupCenter}
              />
            )}
          </div>

          <div className="followup-detail-separator">
            <span>مركز العمل التشغيلي</span>
          </div>

          <TransactionDailyWorkCenter
            mine={mine}
            supervisor={isAdmin || canDelete}
            onOpenTransaction={(id) => void openDetails(id)}
            onChanged={() => void load()}
          />

          {(isAdmin || canDelete) && (
            <TransactionExecutiveInbox
              data={executiveInbox}
              loading={loading}
              supervisor
              onRefresh={() => void load()}
              onOpenTransaction={(id) => void openDetails(id)}
            />
          )}
        </div>
      )}

      {activeWorkspace === 'oversight' && (
        <div className="space-y-4">
          <Card className="rounded-[24px] border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b pb-4">
              <div>
                <CardTitle className="text-base">الرقابة والتحسين</CardTitle>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                  الأدوات المتقدمة منفصلة عن العمل اليومي لتبقى الشاشة الرئيسية واضحة وسريعة.
                </p>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
              {(isAdmin || canDelete) && (
                <ToolCard
                  icon={<ShieldAlert className="h-5 w-5" />}
                  title="الإنذار المبكر"
                  description="رصد المؤشرات والحالات التي تتجه للتعثر."
                  onClick={() => setEarlyWarningOpen(true)}
                />
              )}
              <ToolCard
                icon={<ShieldCheck className="h-5 w-5" />}
                title="التدخلات الوقائية"
                description="إجراءات وقائية قبل تحول الحالة إلى مشكلة فعلية."
                onClick={() => {
                  setPreventiveActionSeed(null);
                  setPreventiveActionsOpen(true);
                }}
              />
              {(isAdmin || canDelete) && (
                <ToolCard
                  icon={<ClipboardCheck className="h-5 w-5" />}
                  title="خطط التحسين CAPA"
                  description="متابعة الإجراءات التصحيحية وقياس فعاليتها."
                  onClick={() => {
                    setImprovementPlanSeed(null);
                    setImprovementPlansOpen(true);
                  }}
                />
              )}
              <ToolCard
                icon={<ShieldAlert className="h-5 w-5" />}
                title="سجل المخاطر"
                description="المخاطر التشغيلية المرتبطة بدورة المتابعة."
                onClick={() => navigate('/follow-up/risks')}
              />
              <ToolCard
                icon={<FileCheck2 className="h-5 w-5" />}
                title="قبول المخاطر"
                description="طلبات القبول والاعتماد المؤقت للمخاطر."
                onClick={() => navigate('/follow-up/risks/acceptance')}
              />
              {(isAdmin || canDelete) && (
                <ToolCard
                  icon={<Settings2 className="h-5 w-5" />}
                  title="شهية المخاطر وKRI"
                  description="حدود المخاطر ومؤشرات الإنذار الرئيسية."
                  onClick={() => navigate('/follow-up/risks/policy')}
                />
              )}
              {(isAdmin || canDelete) && (
                <ToolCard
                  icon={<Gauge className="h-5 w-5" />}
                  title="لوحة المخاطر التنفيذية"
                  description="ملخص تنفيذي للمخاطر والتجاوزات."
                  onClick={() => navigate('/follow-up/risks/executive')}
                />
              )}
              {canPrint && (
                <ToolCard
                  icon={<FileText className="h-5 w-5" />}
                  title="التقارير التنفيذية"
                  description="تقارير دورية وأرشيف ومقارنات وجدولة."
                  onClick={() => void openExecutiveReport()}
                />
              )}
            </CardContent>
          </Card>

      <Card className="rounded-[28px] border-slate-200 bg-white/90 shadow-md">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-primary" />
                لوحة الرقابة والأداء SLA
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                مؤشرات سرعة الإجراء والإنجاز في الموعد والحمل التشغيلي للموظفين.
              </p>
            </div>
            <NativeSelect
              value={analyticsPeriod}
              onChange={(event) => setAnalyticsPeriod(event.target.value as '30' | '90' | '365' | 'all')}
              className="w-full lg:w-52"
            >
              <option value="30">آخر 30 يومًا</option>
              <option value="90">آخر 90 يومًا</option>
              <option value="365">آخر سنة</option>
              <option value="all">كل الفترات</option>
            </NativeSelect>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              title="الإنجاز في الموعد"
              value={analytics.summary.onTimeRate == null ? '—' : `${analytics.summary.onTimeRate}%`}
              hint={analytics.summary.completed ? `${analytics.summary.completed.toLocaleString('ar-SA')} معاملة منجزة` : 'لا توجد معاملات منجزة في الفترة'}
              icon={<TrendingUp className="h-5 w-5 text-emerald-700" />}
            />
            <MetricTile
              title="متوسط مدة الإنجاز"
              value={analytics.summary.avgCompletionDays == null ? '—' : `${analytics.summary.avgCompletionDays} يوم`}
              hint="من تسجيل المعاملة حتى إنجازها"
              icon={<TimerReset className="h-5 w-5 text-sky-700" />}
            />
            <MetricTile
              title="متوسط أول إجراء"
              value={analytics.summary.avgFirstActionHours == null ? '—' : `${analytics.summary.avgFirstActionHours} ساعة`}
              hint="من الإسناد حتى أول إجراء مسجل"
              icon={<Clock3 className="h-5 w-5 text-violet-700" />}
            />
            <MetricTile
              title="متأخرة حاليًا"
              value={analytics.summary.overdueOpen.toLocaleString('ar-SA')}
              hint={`${analytics.summary.needsAction.toLocaleString('ar-SA')} تحتاج إجراء أو تحديث`}
              icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_2.1fr]">
            <Card className="border-slate-200 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">أعمار المعاملات المفتوحة</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-center">
                <AgeBox label="0 - 2 يوم" value={analytics.ageBuckets.upTo2Days} />
                <AgeBox label="3 - 7 أيام" value={analytics.ageBuckets.from3To7Days} />
                <AgeBox label="8 - 14 يوم" value={analytics.ageBuckets.from8To14Days} />
                <AgeBox label="أكثر من 14 يوم" value={analytics.ageBuckets.over14Days} danger />
              </CardContent>
            </Card>

            <Card className="min-w-0 border-slate-200 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UsersRound className="h-4 w-4" />
                  أداء وحمل الموظفين
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {analytics.employees.length ? (
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-2 py-2 text-right font-bold">الموظف</th>
                        <th className="px-2 py-2 text-center font-bold">مفتوحة</th>
                        <th className="px-2 py-2 text-center font-bold">متأخرة</th>
                        <th className="px-2 py-2 text-center font-bold">منجزة</th>
                        <th className="px-2 py-2 text-center font-bold">في الموعد</th>
                        <th className="px-2 py-2 text-center font-bold">متوسط الإنجاز</th>
                        <th className="px-2 py-2 text-center font-bold">أول إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.employees.map((employee) => (
                        <tr key={employee.userId} className="border-b last:border-0">
                          <td className="px-2 py-3 font-bold">{employee.username}</td>
                          <td className="px-2 py-3 text-center">{employee.open.toLocaleString('ar-SA')}</td>
                          <td className={`px-2 py-3 text-center font-bold ${employee.overdue ? 'text-red-700' : ''}`}>
                            {employee.overdue.toLocaleString('ar-SA')}
                          </td>
                          <td className="px-2 py-3 text-center">{employee.completed.toLocaleString('ar-SA')}</td>
                          <td className="px-2 py-3 text-center">{employee.onTimeRate == null ? '—' : `${employee.onTimeRate}%`}</td>
                          <td className="px-2 py-3 text-center">{employee.avgCompletionDays == null ? '—' : `${employee.avgCompletionDays} يوم`}</td>
                          <td className="px-2 py-3 text-center">{employee.avgFirstActionHours == null ? '—' : `${employee.avgFirstActionHours} س`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">لا توجد بيانات أداء كافية للفترة المحددة.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {analytics.oldestOverdue.length > 0 && (
            <Card className="border-red-200 bg-red-50/20 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-red-900">أقدم المعاملات المتأخرة</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 lg:grid-cols-2">
                {analytics.oldestOverdue.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void openDetails(item.id)}
                    className="rounded-xl border border-red-100 bg-white p-3 text-right transition hover:border-red-300"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <b className="text-sm">معاملة {item.transactionNumber}</b>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.subject}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {item.assigneeName || 'غير مسندة'} · الاستحقاق {formatDate(item.dueDate)}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 border-red-300 bg-red-50 text-red-700">
                        {item.overdueDays.toLocaleString('ar-SA')} يوم
                      </Badge>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>


        </div>
      )}

      {activeWorkspace === 'directives' && (
        <Card className="rounded-[24px] border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base">التوجيهات والاعتمادات</CardTitle>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              إدارة التوجيهات الإدارية وطلبات الاعتماد ومؤشرات تنفيذها من مكان واحد.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <ToolCard
              icon={<Gavel className="h-5 w-5" />}
              title="لوحة التوجيهات"
              description="عرض التوجيهات المفتوحة وحالتها ومسؤولي التنفيذ."
              onClick={() => setDirectivesDashboardOpen(true)}
            />
            {(isAdmin || canDelete) && (
              <ToolCard
                icon={<FileCheck2 className="h-5 w-5" />}
                title="مركز الاعتمادات"
                description="طلبات بانتظار مراجعة واعتماد المدير."
                onClick={() => setApprovalCenterOpen(true)}
                emphasis
              />
            )}
            {(isAdmin || canDelete) && (
              <ToolCard
                icon={<History className="h-5 w-5" />}
                title="سجل الاعتمادات"
                description="القرارات السابقة وتاريخ المراجعات."
                onClick={() => setApprovalHistoryOpen(true)}
              />
            )}
            {(isAdmin || canDelete) && (
              <ToolCard
                icon={<Gauge className="h-5 w-5" />}
                title="KPI التوجيهات"
                description="قياس الالتزام والتنفيذ والتأخير للتوجيهات."
                onClick={() => setDirectiveKpiOpen(true)}
              />
            )}
          </CardContent>
        </Card>
      )}

      {activeWorkspace === 'transactions' && (
        <div className="space-y-4">
      <Card className="rounded-[28px] border-white/60 bg-white/80 shadow-md">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>قائمة المعاملات</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">إجمالي النتائج: {total.toLocaleString('ar-SA')}</p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:min-w-[1040px] xl:grid-cols-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pr-10" placeholder="رقم المعاملة، الموضوع، الجهة، الموظف..." />
              </div>
              <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">جميع الحالات</option>
                {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
              <NativeSelect value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="">جميع الأولويات</option>
                {Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </NativeSelect>
              <NativeSelect
                value={organizationalUnitFilter}
                onChange={(event) =>
                  setOrganizationalUnitFilter(event.target.value as TransactionFollowUpOrganizationalUnit | '')
                }
              >
                <option value="">جميع الإدارات والوحدات</option>
                {organizationalUnitOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </NativeSelect>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
              جارٍ تحميل المعاملات...
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              لا توجد معاملات مطابقة.
            </div>
          ) : (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {records.map((record) => {
                const recordCanEdit =
                  canEdit &&
                  !['completed', 'closed'].includes(record.status) &&
                  (
                    isAdmin ||
                    canDelete ||
                    record.currentAssigneeUserId === currentUser?.uid
                  );

                return (
                  <TransactionFollowUpCard
                    key={record.id}
                    record={record}
                    canEdit={recordCanEdit}
                    canDelete={canDelete}
                    canReopen={canReopen}
                    canTransfer={
                      canTransfer &&
                      !['completed', 'closed'].includes(record.status) &&
                      Boolean(record.currentAssigneeUserId) &&
                      (
                        isAdmin ||
                        canDelete ||
                        record.currentAssigneeUserId === currentUser?.uid
                      )
                    }
                    supervisor={isAdmin || canDelete}
                    busy={cardActionBusyId === record.id}
                    onView={(item) => void openDetails(item.id)}
                    onEdit={(item) => void openDetails(item.id)}
                    onDelete={(item) => void remove(item)}
                    onReopen={(item) => void reopenTransaction(item)}
                    onTransfer={(item) => void openDetails(item.id)}
                    onQuickAction={(item, action) => void runCardQuickAction(item, action)}
                  />
                );
              })}
            </section>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <span className="text-xs text-muted-foreground">صفحة {page.toLocaleString('ar-SA')} من {Math.max(totalPages, 1).toLocaleString('ar-SA')}</span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>السابق</Button>
              <Button variant="outline" disabled={totalPages === 0 || page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>التالي</Button>
            </div>
          </div>
        </CardContent>
      </Card>


        </div>
      )}

      <TransactionDirectivesDashboardDialog
        open={directivesDashboardOpen}
        onOpenChange={setDirectivesDashboardOpen}
        supervisor={isAdmin || canDelete}
        assignees={assignees}
        onOpenTransaction={(id) => void openDetails(id)}
      />

      {(isAdmin || canDelete) && (
        <TransactionApprovalCenterDialog
          open={approvalCenterOpen}
          onOpenChange={setApprovalCenterOpen}
          assignees={assignees}
          onOpenTransaction={(id) => void openDetails(id)}
          onChanged={() => void load()}
        />
      )}

      {(isAdmin || canDelete) && (
        <TransactionApprovalHistoryDialog
          open={approvalHistoryOpen}
          onOpenChange={setApprovalHistoryOpen}
          assignees={assignees}
          onOpenTransaction={(id) => void openDetails(id)}
        />
      )}

      {(isAdmin || canDelete) && (
        <TransactionDirectiveKpiDialog
          open={directiveKpiOpen}
          onOpenChange={(open) => {
            setDirectiveKpiOpen(open);
            if (!open && searchParams.get('kpi') === '1') {
              const next = new URLSearchParams(searchParams);
              next.delete('kpi');
              next.delete('alert');
              setSearchParams(next);
            }
          }}
          assignees={assignees}
          onOpenImprovementPlans={(seed) => {
            setDirectiveKpiOpen(false);
            if (searchParams.get('kpi') === '1') {
              const next = new URLSearchParams(searchParams);
              next.delete('kpi');
              next.delete('alert');
              setSearchParams(next);
            }
            setImprovementPlanSeed(seed || null);
            setImprovementPlansOpen(true);
          }}
        />
      )}

      {(isAdmin || canDelete) && (
        <TransactionEarlyWarningDialog
          open={earlyWarningOpen}
          onOpenChange={(open) => {
            setEarlyWarningOpen(open);
            if (!open && searchParams.get('earlyWarning') === '1') {
              const next = new URLSearchParams(searchParams);
              next.delete('earlyWarning');
              next.delete('alert');
              setSearchParams(next);
            }
          }}
          onOpenPreventiveActions={(seed) => {
            setEarlyWarningOpen(false);
            setPreventiveActionSeed(seed);
            setPreventiveActionsOpen(true);
          }}
        />
      )}

      <TransactionPreventiveActionsDialog
        open={preventiveActionsOpen}
        onOpenChange={(open) => {
          setPreventiveActionsOpen(open);
          if (!open) {
            setPreventiveActionSeed(null);
            if (searchParams.get('preventive') === '1') {
              const next = new URLSearchParams(searchParams);
              next.delete('preventive');
              next.delete('alert');
              setSearchParams(next);
            }
          }
        }}
        assignees={assignees}
        supervisor={isAdmin || canDelete}
        seed={preventiveActionSeed}
        onOpenCapa={(seed, preventiveActionId) => {
          setPreventiveActionsOpen(false);
          setPreventiveActionSeed(null);
          setCapaSourcePreventiveActionId(preventiveActionId);
          setImprovementPlanSeed(seed);
          setImprovementPlansOpen(true);
        }}
      />

      {(isAdmin || canDelete) && (
        <TransactionImprovementPlansDialog
          open={improvementPlansOpen}
          onOpenChange={(open) => {
            setImprovementPlansOpen(open);
            if (!open) {
              setImprovementPlanSeed(null);
              setCapaSourcePreventiveActionId(null);
              if (searchParams.get('capa') === '1') {
                const next = new URLSearchParams(searchParams);
                next.delete('capa');
                next.delete('alert');
                setSearchParams(next);
              }
            }
          }}
          assignees={assignees}
          seed={improvementPlanSeed}
          onPlanCreated={async (plan) => {
            if (!capaSourcePreventiveActionId) return;
            try {
              await transactionFollowUpApi.linkPreventiveActionCapa(capaSourcePreventiveActionId, plan.id);
              toast.success('تم ربط خطة CAPA بالتدخل الوقائي الفاشل');
              setCapaSourcePreventiveActionId(null);
            } catch (error) {
              toast.warning(error instanceof Error ? error.message : 'تم إنشاء CAPA وتعذر ربطها تلقائيًا بالتدخل الوقائي');
            }
          }}
        />
      )}

      <Dialog open={reportOpen} onOpenChange={(open) => !reportExporting && setReportOpen(open)}>
        <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1180px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>التقارير التنفيذية لمتابعة المعاملات</DialogTitle>
            <DialogDescription>
              إعداد التقارير، حفظ النسخ المؤرشفة، المقارنة بين الفترات، وجدولة التقارير الأسبوعية والشهرية.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 border-b pb-3">
            <Button
              type="button"
              variant={reportSection === 'preview' ? 'default' : 'outline'}
              onClick={() => setReportSection('preview')}
            >
              <FileText className="ml-2 h-4 w-4" />
              معاينة التقرير
            </Button>
            <Button
              type="button"
              variant={reportSection === 'archive' ? 'default' : 'outline'}
              onClick={() => {
                setReportSection('archive');
                void loadReportArchives(reportArchivePage);
              }}
            >
              <Archive className="ml-2 h-4 w-4" />
              أرشيف التقارير
            </Button>
            <Button
              type="button"
              variant={reportSection === 'schedule' ? 'default' : 'outline'}
              onClick={() => {
                setReportSection('schedule');
                void loadReportSchedules();
              }}
            >
              <CalendarClock className="ml-2 h-4 w-4" />
              الجدولة الآلية
            </Button>
          </div>

          {reportSection === 'preview' && (
            <>
              <div className="grid gap-3 rounded-2xl border bg-slate-50/70 p-3 md:grid-cols-2 xl:grid-cols-8">
                <Field label="نوع التقرير">
                  <NativeSelect
                    value={reportMode}
                    onChange={(event) => void applyReportMode(event.target.value as 'weekly' | 'monthly' | 'custom')}
                  >
                    <option value="weekly">أسبوعي</option>
                    <option value="monthly">شهري</option>
                    <option value="custom">فترة مخصصة</option>
                  </NativeSelect>
                </Field>
                <Field label="من تاريخ">
                  <Input
                    type="date"
                    value={reportFrom}
                    onChange={(event) => {
                      setReportMode('custom');
                      setReportFrom(event.target.value);
                    }}
                  />
                </Field>
                <Field label="إلى تاريخ">
                  <Input
                    type="date"
                    value={reportTo}
                    onChange={(event) => {
                      setReportMode('custom');
                      setReportTo(event.target.value);
                    }}
                  />
                </Field>
                {(isAdmin || canDelete) && (
                  <Field label="الموظف">
                    <NativeSelect value={reportAssigneeId} onChange={(event) => setReportAssigneeId(event.target.value)}>
                      <option value="">جميع الموظفين</option>
                      {assignees.map((user) => (
                        <option key={user.id} value={user.id}>{user.username}</option>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
                <div className="flex items-end">
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={reportLoading}
                    onClick={() => void loadExecutiveReport()}
                  >
                    <RefreshCw className={`ml-2 h-4 w-4 ${reportLoading ? 'animate-spin' : ''}`} />
                    تحديث
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={!reportData || reportLoading || reportArchiveLoading}
                    onClick={() => void saveCurrentReportArchive()}
                  >
                    <Save className="ml-2 h-4 w-4" />
                    حفظ بالأرشيف
                  </Button>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={!reportData || reportLoading || reportExporting}
                    onClick={printExecutiveReport}
                  >
                    <Printer className="ml-2 h-4 w-4" />
                    طباعة
                  </Button>
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={!reportData || reportLoading || reportExporting}
                    onClick={() => void exportExecutiveReportPdf()}
                  >
                    {reportExporting
                      ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                      : <FileDown className="ml-2 h-4 w-4" />}
                    PDF
                  </Button>
                </div>

                <div className="flex items-end gap-2 xl:col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
                    disabled={reportLoading || reportExporting}
                    onClick={() => void exportFollowUpExcel()}
                  >
                    <FileSpreadsheet className="ml-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    type="button"
                    className="flex-[1.4] bg-slate-800 text-white hover:bg-slate-900"
                    disabled={reportLoading || reportExporting}
                    onClick={() => void exportFullFollowUpBackup()}
                  >
                    {reportExporting
                      ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                      : <Archive className="ml-2 h-4 w-4" />}
                    {backupProgress || 'نسخة احتياطية كاملة'}
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs leading-6 text-emerald-950">
                <b>الحفظ الاحتياطي:</b> زر «Excel» يصدر بيانات الفترة المحددة في ملف منظم متعدد الأوراق،
                بينما «نسخة احتياطية كاملة» تنشئ ملف ZIP مستقل يحتوي على Excel لجميع بيانات نظام المتابعة،
                وملف بيانات خام JSON، ونسخ فعلية من الصور والمرفقات وأدلة التوجيهات. الهدف أن تبقى لديك نسخة قابلة للفتح
                حتى في حال تعذر الوصول إلى الخدمة لاحقًا.
              </div>

              <div className="max-h-[68dvh] overflow-auto rounded-2xl border bg-slate-100 p-2 sm:p-4">
                {reportLoading && !reportData ? (
                  <div className="py-24 text-center text-sm text-muted-foreground">
                    <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
                    جارٍ إعداد التقرير التنفيذي...
                  </div>
                ) : reportData ? (
                  <TransactionExecutiveReport
                    ref={reportRef}
                    report={reportData}
                    assigneeLabel={
                      reportAssigneeId
                        ? assignees.find((user) => user.id === reportAssigneeId)?.username || null
                        : !(isAdmin || canDelete)
                          ? currentUser?.username || null
                          : null
                    }
                  />
                ) : (
                  <div className="py-24 text-center text-sm text-muted-foreground">
                    حدد فترة التقرير ثم اضغط «تحديث».
                  </div>
                )}
              </div>
            </>
          )}

          {reportSection === 'archive' && (
            <div className="max-h-[74dvh] space-y-4 overflow-auto">
              <Card className="border-violet-200 shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <GitCompareArrows className="h-4 w-4" />
                    مقارنة تقريرين
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                    <NativeSelect value={compareLeftId} onChange={(e) => setCompareLeftId(e.target.value)}>
                      <option value="">التقرير السابق</option>
                      {reportArchives.map((archive) => (
                        <option key={archive.id} value={archive.id}>
                          {archive.reportType === 'weekly' ? 'أسبوعي' : archive.reportType === 'monthly' ? 'شهري' : 'مخصص'} — {formatDate(archive.periodFrom)} إلى {formatDate(archive.periodTo)}
                        </option>
                      ))}
                    </NativeSelect>
                    <NativeSelect value={compareRightId} onChange={(e) => setCompareRightId(e.target.value)}>
                      <option value="">التقرير اللاحق</option>
                      {reportArchives.map((archive) => (
                        <option key={archive.id} value={archive.id}>
                          {archive.reportType === 'weekly' ? 'أسبوعي' : archive.reportType === 'monthly' ? 'شهري' : 'مخصص'} — {formatDate(archive.periodFrom)} إلى {formatDate(archive.periodTo)}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={reportArchiveLoading || !compareLeftId || !compareRightId}
                      onClick={() => void compareArchivedReports()}
                    >
                      <GitCompareArrows className="ml-2 h-4 w-4" />
                      مقارنة
                    </Button>
                  </div>

                  {reportComparison && (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <ComparisonMetric label="إجمالي المعاملات" value={reportComparison.delta.totalIncluded} />
                      <ComparisonMetric label="المفتوحة" value={reportComparison.delta.open} inverse />
                      <ComparisonMetric label="المنجزة" value={reportComparison.delta.completed} />
                      <ComparisonMetric label="المتأخرة" value={reportComparison.delta.overdueSnapshot} inverse />
                      <ComparisonMetric label="الإنجاز في الموعد" value={reportComparison.delta.onTimeRate} suffix="%" />
                      <ComparisonMetric label="متوسط الإنجاز" value={reportComparison.delta.avgCompletionDays} suffix=" يوم" inverse />
                      <ComparisonMetric label="متوسط أول إجراء" value={reportComparison.delta.avgFirstActionHours} suffix=" س" inverse />
                      <ComparisonMetric label="بانتظار رد" value={reportComparison.delta.waiting} inverse />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">التقارير المحفوظة</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">كل تقرير هنا يمثل نسخة ثابتة من البيانات وقت الحفظ.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void loadReportArchives(reportArchivePage)} disabled={reportArchiveLoading}>
                      <RefreshCw className={`ml-1 h-4 w-4 ${reportArchiveLoading ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reportArchiveLoading && !reportArchives.length ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">جارٍ تحميل الأرشيف...</div>
                  ) : reportArchives.length === 0 ? (
                    <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                      لا توجد تقارير مؤرشفة حتى الآن.
                    </div>
                  ) : (
                    reportArchives.map((archive) => (
                      <div key={archive.id} className="flex flex-col gap-3 rounded-xl border bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="text-sm">
                              {archive.reportType === 'weekly' ? 'تقرير أسبوعي' : archive.reportType === 'monthly' ? 'تقرير شهري' : 'تقرير مخصص'}
                            </b>
                            <Badge variant="outline">{archive.source === 'scheduled' ? 'آلي' : 'يدوي'}</Badge>
                            {archive.assigneeName && <Badge variant="outline">{archive.assigneeName}</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(archive.periodFrom)} — {formatDate(archive.periodTo)}
                            {' · '}
                            تم الحفظ {formatDateTime(archive.createdAt)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
                            <span>الإجمالي: <b>{archive.summary?.totalIncluded?.toLocaleString('ar-SA') ?? '—'}</b></span>
                            <span>منجزة: <b>{archive.summary?.completed?.toLocaleString('ar-SA') ?? '—'}</b></span>
                            <span className={archive.summary?.overdueSnapshot ? 'text-red-700' : ''}>متأخرة: <b>{archive.summary?.overdueSnapshot?.toLocaleString('ar-SA') ?? '—'}</b></span>
                            <span>في الموعد: <b>{archive.summary?.onTimeRate == null ? '—' : `${archive.summary.onTimeRate}%`}</b></span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button size="sm" variant="outline" onClick={() => void openArchivedReport(archive.id)}>
                            <FileText className="ml-1 h-4 w-4" />
                            فتح
                          </Button>
                          {canDelete && (
                            <Button size="sm" variant="outline" className="border-red-200 text-red-700" onClick={() => void deleteArchivedReport(archive.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">
                      صفحة {reportArchivePage.toLocaleString('ar-SA')} من {Math.max(1, reportArchiveTotalPages).toLocaleString('ar-SA')}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reportArchivePage <= 1 || reportArchiveLoading}
                        onClick={() => void loadReportArchives(reportArchivePage - 1)}
                      >
                        السابق
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!reportArchiveTotalPages || reportArchivePage >= reportArchiveTotalPages || reportArchiveLoading}
                        onClick={() => void loadReportArchives(reportArchivePage + 1)}
                      >
                        التالي
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {reportSection === 'schedule' && (
            <div className="max-h-[74dvh] space-y-4 overflow-auto">
              {(isAdmin || canDelete) && <TransactionBackupSettings />}

              {canEdit && (
                <Card className="border-sky-200 shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="h-4 w-4" />
                      إنشاء جدولة تقرير
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <div className="xl:col-span-2">
                      <Field label="اسم الجدولة">
                        <Input value={scheduleName} onChange={(e) => setScheduleName(e.target.value)} />
                      </Field>
                    </div>
                    <Field label="التكرار">
                      <NativeSelect
                        value={scheduleFrequency}
                        onChange={(e) => {
                          const value = e.target.value as 'weekly' | 'monthly';
                          setScheduleFrequency(value);
                          setScheduleName(value === 'weekly' ? 'التقرير الأسبوعي للمتابعة' : 'التقرير الشهري للمتابعة');
                        }}
                      >
                        <option value="weekly">أسبوعي</option>
                        <option value="monthly">شهري</option>
                      </NativeSelect>
                    </Field>
                    {scheduleFrequency === 'weekly' ? (
                      <Field label="يوم الإصدار">
                        <NativeSelect value={scheduleDayOfWeek} onChange={(e) => setScheduleDayOfWeek(Number(e.target.value))}>
                          <option value={0}>الأحد</option>
                          <option value={1}>الاثنين</option>
                          <option value={2}>الثلاثاء</option>
                          <option value={3}>الأربعاء</option>
                          <option value={4}>الخميس</option>
                          <option value={5}>الجمعة</option>
                          <option value={6}>السبت</option>
                        </NativeSelect>
                      </Field>
                    ) : (
                      <Field label="يوم الشهر">
                        <NativeSelect value={scheduleDayOfMonth} onChange={(e) => setScheduleDayOfMonth(Number(e.target.value))}>
                          {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </NativeSelect>
                      </Field>
                    )}
                    <Field label="ساعة الإصدار">
                      <NativeSelect value={scheduleRunHour} onChange={(e) => setScheduleRunHour(Number(e.target.value))}>
                        {Array.from({ length: 24 }, (_, hour) => (
                          <option key={hour} value={hour}>{String(hour).padStart(2, '0')}:00</option>
                        ))}
                      </NativeSelect>
                    </Field>
                    {(isAdmin || canDelete) && (
                      <Field label="نطاق الموظف">
                        <NativeSelect value={scheduleAssigneeId} onChange={(e) => setScheduleAssigneeId(e.target.value)}>
                          <option value="">جميع الموظفين</option>
                          {assignees.map((user) => (
                            <option key={user.id} value={user.id}>{user.username}</option>
                          ))}
                        </NativeSelect>
                      </Field>
                    )}
                    <div className="flex items-end">
                      <Button className="w-full" disabled={reportScheduleLoading} onClick={() => void createReportSchedule()}>
                        <Plus className="ml-2 h-4 w-4" />
                        إنشاء الجدولة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-none">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">الجدولات النشطة والمحـفوظة</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        التقرير الأسبوعي يغطي الأسبوع المكتمل السابق، والشهري يغطي الشهر المكتمل السابق.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void loadReportSchedules()} disabled={reportScheduleLoading}>
                      <RefreshCw className={`ml-1 h-4 w-4 ${reportScheduleLoading ? 'animate-spin' : ''}`} />
                      تحديث
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {reportScheduleLoading && !reportSchedules.length ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">جارٍ تحميل الجدولات...</div>
                  ) : reportSchedules.length === 0 ? (
                    <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                      لا توجد جدولات تقارير حتى الآن.
                    </div>
                  ) : (
                    reportSchedules.map((schedule) => (
                      <div key={schedule.id} className="flex flex-col gap-3 rounded-xl border bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="text-sm">{schedule.name}</b>
                            <Badge variant="outline">{schedule.frequency === 'weekly' ? 'أسبوعي' : 'شهري'}</Badge>
                            <Badge variant="outline" className={schedule.isActive ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-50 text-slate-600'}>
                              {schedule.isActive ? 'نشطة' : 'متوقفة'}
                            </Badge>
                            {schedule.assigneeName && <Badge variant="outline">{schedule.assigneeName}</Badge>}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {schedule.frequency === 'weekly'
                              ? `يوم ${['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][schedule.dayOfWeek ?? 0]}`
                              : `يوم ${schedule.dayOfMonth ?? 1} من كل شهر`}
                            {' · '}
                            الساعة {String(schedule.runHour).padStart(2, '0')}:00
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            الإصدار القادم: {formatDateTime(schedule.nextRunAt)}
                            {schedule.lastRunAt ? <> · آخر تشغيل: {formatDateTime(schedule.lastRunAt)}</> : null}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => void runReportScheduleNow(schedule)} disabled={reportScheduleLoading}>
                            <Play className="ml-1 h-4 w-4" />
                            تشغيل الآن
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void toggleReportSchedule(schedule)} disabled={reportScheduleLoading}>
                            {schedule.isActive ? 'إيقاف' : 'تفعيل'}
                          </Button>
                          <Button size="sm" variant="outline" className="border-red-200 text-red-700" onClick={() => void deleteReportSchedule(schedule)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (saving || attachmentUploading) return;
          setCreateOpen(open);
          if (!open) setCreateFiles([]);
        }}
      >
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>تسجيل معاملة جديدة</DialogTitle>
            <DialogDescription>سجّل بيانات المعاملة وحدد الموظف والإجراء والمدة المستهدفة.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="الإدارة / الوحدة *">
                <NativeSelect
                  value={createForm.organizationalUnit || ''}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      organizationalUnit: e.target.value as TransactionFollowUpOrganizationalUnit,
                    }))
                  }
                >
                  <option value="">اختر الإدارة أو الوحدة</option>
                  {organizationalUnitOptions.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </NativeSelect>
              </Field>
              <p className="mt-1 text-[11px] text-muted-foreground">
                حقل إلزامي لتحديد الجهة التنظيمية التي تتبع لها المعاملة داخل نظام المتابعة.
              </p>
            </div>

            <div className="md:col-span-2">
              <Field label="رقم المعاملة *">
                <Input
                  value={createForm.transactionNumber}
                  onChange={(e) => setCreateForm((p) => ({ ...p, transactionNumber: e.target.value }))}
                  placeholder="مثال: 1234"
                />
              </Field>
              <p className="mt-1 text-[11px] text-muted-foreground">
                رقم المعاملة فريد داخل نفس العام، ويمكن تكراره فقط في عام مختلف.
              </p>
            </div>

            <div className="md:col-span-2">
              <AppDateField
                label="تاريخ المعاملة"
                value={createForm.transactionDate}
                dateType={createForm.transactionDateType}
                onValueChange={(value) => setCreateForm((p) => ({ ...p, transactionDate: value }))}
                onDateTypeChange={(transactionDateType) =>
                  setCreateForm((p) => ({ ...p, transactionDateType, transactionDate: '' }))
                }
                required
                helperText={
                  enteredTransactionYear(createForm.transactionDate)
                    ? `سيتم التحقق من عدم تكرار رقم المعاملة داخل عام ${enteredTransactionYear(createForm.transactionDate)}${createForm.transactionDateType === 'hijri' ? 'هـ' : 'م'}.`
                    : 'اختر التقويم الميلادي أو الهجري حسب تاريخ أصل المعاملة.'
                }
              />
            </div>

            <Field label="نوع المعاملة"><NativeSelect value={createForm.transactionType} onChange={(e) => setCreateForm((p) => ({ ...p, transactionType: e.target.value as TransactionFollowUpType }))}>{transactionTypeOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</NativeSelect></Field>
            <Field label="الأولوية"><NativeSelect value={createForm.priority} onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value as TransactionFollowUpPriority }))}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field>

            <div className="md:col-span-2"><Field label="موضوع المعاملة *"><Input value={createForm.subject} onChange={(e) => setCreateForm((p) => ({ ...p, subject: e.target.value }))} /></Field></div>
            <Field label="الجهة"><Input value={createForm.sourceEntity || ''} onChange={(e) => setCreateForm((p) => ({ ...p, sourceEntity: e.target.value }))} placeholder="الجهة الواردة منها أو الموجهة إليها" /></Field>
            <Field label="الموظف المختص"><NativeSelect value={createForm.currentAssigneeUserId || ''} onChange={(e) => setCreateForm((p) => ({ ...p, currentAssigneeUserId: e.target.value }))}><option value="">بدون إسناد حاليًا</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}</NativeSelect></Field>
            <div className="md:col-span-2"><Field label="الإجراء المطلوب"><Input value={createForm.requiredAction || ''} onChange={(e) => setCreateForm((p) => ({ ...p, requiredAction: e.target.value }))} placeholder="مثال: إعداد الرد ورفعه للاعتماد" /></Field></div>
            <Field label="تاريخ الاستحقاق"><Input type="date" value={createForm.dueDate || ''} onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))} /></Field>
            <Field label="تنبيه عدم النشاط بعد (أيام)"><Input type="number" min={1} max={90} value={createForm.inactivityAlertDays || 3} onChange={(e) => setCreateForm((p) => ({ ...p, inactivityAlertDays: Number(e.target.value) || 3 }))} /></Field>
            <div className="md:col-span-2"><Field label="ملاحظات"><Textarea rows={3} value={createForm.notes || ''} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} /></Field></div>

            {canUploadAttachments && (
            <div className="md:col-span-2 rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <Paperclip className="h-4 w-4 text-sky-700" />
                    إرفاق الملفات
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    يمكنك اختيار عدة ملفات دفعة واحدة. الحد الأعلى {MAX_TRANSACTION_ATTACHMENTS} ملفات، وبحد {MAX_TRANSACTION_ATTACHMENT_SIZE_MB} م.ب لكل ملف.
                  </p>
                </div>
                <Badge variant="outline" className="bg-white">
                  {createFiles.length.toLocaleString('ar-SA')} ملف محدد
                </Badge>
              </div>

              <Input
                className="mt-3 bg-white"
                type="file"
                multiple
                accept={TRANSACTION_ATTACHMENT_ACCEPT}
                disabled={saving || attachmentUploading}
                onChange={(event) => {
                  const incoming = Array.from(event.target.files || []);
                  event.target.value = '';
                  setCreateFiles((current) => selectTransactionFiles(incoming, current));
                }}
              />

              {createFiles.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {createFiles.map((file, index) => (
                    <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{file.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 shrink-0 p-0 text-red-600"
                        onClick={() => setCreateFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        disabled={saving || attachmentUploading}
                        aria-label="إزالة الملف"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateFiles([]); }} disabled={saving || attachmentUploading}>إلغاء</Button>
              <Button onClick={() => void createTransaction()} disabled={saving || attachmentUploading}>
                {saving ? (createFiles.length ? 'جارٍ الحفظ ورفع المرفقات...' : 'جارٍ الحفظ...') : 'تسجيل وإسناد المعاملة'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selected) || detailLoading}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setSelected(null);
            setDetailFiles([]);
            if (searchParams.get('transaction')) {
              openedFromUrlRef.current = null;
              setSearchParams({});
            }
          }
        }}
      >
        <DialogContent className="followup-transaction-dialog max-h-[94dvh] overflow-y-auto sm:max-w-5xl" dir="rtl">
          {detailLoading && !selected ? (
            <div className="py-16 text-center"><RefreshCw className="mx-auto h-6 w-6 animate-spin" /></div>
          ) : selected ? (
            <>
              <DialogHeader className="text-right">
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <span>معاملة {selected.transactionNumber}</span>
                  <Badge variant="outline" className={indicatorClass[selected.indicatorSeverity]}>{selected.indicatorLabel}</Badge>
                </DialogTitle>
                <DialogDescription>{selected.trackingNumber} — {selected.subject}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 md:grid-cols-4">
                <Info label="تاريخ المعاملة" value={formatTransactionDate(selected)} />
                <Info label="النوع" value={typeLabels[selected.transactionType]} />
                <Info label="الإدارة / الوحدة" value={selected.organizationalUnit ? organizationalUnitLabels[selected.organizationalUnit] : 'غير محددة للمعاملات السابقة'} />
                <Info label="الأولوية" value={priorityLabels[selected.priority]} />
                <Info label="الحالة" value={statusLabels[selected.status]} />
                <Info label="الجهة" value={selected.sourceEntity || '—'} />
                <Info label="الموظف الحالي" value={selected.currentAssigneeName || 'غير مسندة'} />
                <Info label="الاستحقاق" value={formatDate(selected.dueDate)} />
                <Info label="دون إجراء" value={`${selected.daysWithoutAction || 0} يوم`} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="border-sky-200">
                  <CardHeader><CardTitle className="text-base">الإجراء المطلوب حاليًا</CardTitle></CardHeader>
                  <CardContent className="text-sm leading-7">{selected.requiredAction || 'لم يحدد إجراء قادم.'}</CardContent>
                </Card>
                <Card className="border-slate-200">
                  <CardHeader><CardTitle className="text-base">ملاحظات المعاملة</CardTitle></CardHeader>
                  <CardContent className="text-sm leading-7">{selected.notes || 'لا توجد ملاحظات.'}</CardContent>
                </Card>
              </div>

              <Card className="border-sky-200">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                    <span className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-sky-700" />
                      مرفقات المعاملة
                    </span>
                    <Badge variant="outline" className="bg-white">
                      {(selected.attachments?.length || 0).toLocaleString('ar-SA')} مرفق
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selected.attachments?.length ? (
                    <div className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground">
                      لا توجد مرفقات مسجلة لهذه المعاملة.
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {selected.attachments.map((attachment) => (
                        <div key={attachment.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border bg-slate-50/70 p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{attachment.title}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {attachment.createdBy ? `أضيف بواسطة ${attachment.createdBy} · ` : ''}
                              {formatDateTime(attachment.createdAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="outline" size="sm" className="h-8" asChild>
                              <a href={attachment.driveUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="ml-1 h-3.5 w-3.5" />
                                فتح
                              </a>
                            </Button>
                            {canDeleteSelectedAttachment(attachment) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600"
                                disabled={attachmentUploading}
                                onClick={() => void deleteTransactionAttachment(attachment.id, attachment.title)}
                                aria-label="حذف المرفق"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {canUploadSelectedAttachments && (
                    <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-black">إضافة مرفقات جديدة</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            اختيار متعدد، حتى {MAX_TRANSACTION_ATTACHMENTS} مرفقات إجمالًا، وبحد {MAX_TRANSACTION_ATTACHMENT_SIZE_MB} م.ب للملف.
                          </p>
                        </div>
                        {detailFiles.length ? (
                          <Badge variant="outline" className="bg-white">{detailFiles.length.toLocaleString('ar-SA')} محدد</Badge>
                        ) : null}
                      </div>

                      <Input
                        className="mt-3 bg-white"
                        type="file"
                        multiple
                        accept={TRANSACTION_ATTACHMENT_ACCEPT}
                        disabled={attachmentUploading}
                        onChange={(event) => {
                          const incoming = Array.from(event.target.files || []);
                          event.target.value = '';
                          setDetailFiles((current) =>
                            selectTransactionFiles(
                              incoming,
                              current,
                              selected.attachments?.length || 0,
                            ),
                          );
                        }}
                      />

                      {detailFiles.length ? (
                        <div className="mt-3 space-y-2">
                          {detailFiles.map((file, index) => (
                            <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{file.name}</p>
                                <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-600"
                                onClick={() => setDetailFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                                disabled={attachmentUploading}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            onClick={() => void uploadDetailAttachments()}
                            disabled={attachmentUploading || detailFiles.length === 0}
                          >
                            <Upload className="ml-2 h-4 w-4" />
                            {attachmentUploading ? 'جارٍ رفع الملفات...' : `رفع ${detailFiles.length} ملف`}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>

              {selected.externalWaits?.length ? (
                <Card className="border-cyan-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4" />
                      سجل انتظار الجهات الخارجية
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selected.externalWaits.map((wait) => (
                      <div key={wait.id} className="rounded-xl border bg-slate-50/70 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="text-sm">{wait.externalEntity}</b>
                            <Badge
                              variant="outline"
                              className={
                                wait.status === 'active'
                                  ? 'border-sky-300 bg-sky-50 text-sky-900'
                                  : wait.status === 'responded'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                    : 'border-slate-300 bg-white text-slate-700'
                              }
                            >
                              {wait.status === 'active' ? 'بانتظار الرد' : wait.status === 'responded' ? 'تم الرد' : 'ملغى'}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            أرسل: {formatDate(wait.sentAt)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          {wait.outboundReferenceNumber && <span>المرجع الصادر: <b className="text-foreground">{wait.outboundReferenceNumber}</b></span>}
                          <span>المتابعة القادمة: <b className="text-foreground">{formatDate(wait.nextFollowUpDate)}</b></span>
                          <span>عدد المتابعات: <b className="text-foreground">{wait.followUpCount.toLocaleString('ar-SA')}</b></span>
                          {wait.responseReceivedAt && <span>ورود الرد: <b className="text-foreground">{formatDate(wait.responseReceivedAt)}</b></span>}
                          {wait.responseReferenceNumber && <span>مرجع الرد: <b className="text-foreground">{wait.responseReferenceNumber}</b></span>}
                        </div>
                        {wait.notes && <p className="mt-2 text-xs leading-6"><b>ملاحظات الانتظار:</b> {wait.notes}</p>}
                        {wait.lastFollowUpNote && <p className="mt-1 text-xs leading-6"><b>آخر متابعة:</b> {wait.lastFollowUpNote}</p>}
                        {wait.responseNote && <p className="mt-1 text-xs leading-6"><b>{wait.status === 'cancelled' ? 'سبب الإلغاء' : 'ملخص الرد'}:</b> {wait.responseNote}</p>}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {canArchive && selected.status === 'closed' && !selected.archivedAt && (
                <Card className="border-emerald-200 bg-emerald-50/50">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black text-emerald-950">
                        <Archive className="h-4 w-4" />
                        ترحيل اختياري إلى الأرشفة
                      </p>
                      <p className="mt-1 text-xs leading-6 text-emerald-900/80">
                        المعاملة مغلقة ويمكن ترحيلها إلى قسم «الأرشفة» عند الحاجة. لن يتم حذف سجلها أو مرفقاتها،
                        وستختفي فقط من قوائم المتابعة النشطة.
                      </p>
                    </div>
                    <Button
                      className="shrink-0 bg-emerald-700 text-white hover:bg-emerald-800"
                      disabled={saving}
                      onClick={() => void archiveTransaction(selected)}
                    >
                      <Archive className="ml-2 h-4 w-4" />
                      ترحيل إلى الأرشفة
                    </Button>
                  </CardContent>
                </Card>
              )}

              {canReopen && ['completed', 'closed'].includes(selected.status) && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black text-amber-950">
                        <RotateCcw className="h-4 w-4" />
                        إعادة فتح المعاملة
                      </p>
                      <p className="mt-1 text-xs leading-6 text-amber-900/80">
                        المعاملة {selected.status === 'closed' ? 'مغلقة' : 'منجزة'}، ويمكن لصاحب صلاحية «إعادة فتح» إعادتها للعمل عند وجود سبب يستدعي الاستكمال أو التعديل.
                        سيحفظ النظام سبب إعادة الفتح واسم المستخدم وتاريخه في سجل الإجراءات.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                      disabled={saving}
                      onClick={() => void reopenTransaction(selected)}
                    >
                      <RotateCcw className="ml-2 h-4 w-4" />
                      إعادة فتح المعاملة
                    </Button>
                  </CardContent>
                </Card>
              )}

              {(canAssignSelected || canTransferSelected || canManageSelected) && !['completed', 'closed'].includes(selected.status) && (
                <div className="grid gap-4 xl:grid-cols-2">
                  {(canAssignSelected || canTransferSelected) && (
                    <Card className={canAssignSelected ? 'border-sky-200 bg-sky-50/20' : 'border-violet-200'}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <ArrowLeftRight className="h-4 w-4" />
                          {canAssignSelected ? 'إسناد المعاملة إلى موظف' : (isAdmin || canDelete ? 'إسناد / تحويل' : 'تحويل المعاملة')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Field label={canAssignSelected ? 'الموظف المسند إليه' : 'الموظف المحول إليه'}>
                          <NativeSelect value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
                            <option value="">{canAssignSelected ? 'اختر الموظف الذي ستسند إليه المعاملة' : 'اختر الموظف'}</option>
                            {assignees
                              .filter((user) => user.id !== selected.currentAssigneeUserId)
                              .map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}
                          </NativeSelect>
                        </Field>
                        <Field
                          label={
                            canAssignSelected
                              ? 'ملاحظة الإسناد'
                              : (isAdmin || canDelete ? 'ملاحظة التحويل' : 'سبب التحويل *')
                          }
                        >
                          <Input
                            value={assignNote}
                            onChange={(e) => setAssignNote(e.target.value)}
                            placeholder={canAssignSelected ? 'اختياري: المطلوب من الموظف أو ملاحظة الإسناد' : 'سبب التحويل أو المطلوب من الموظف'}
                          />
                        </Field>

                        {canAssignSelected ? (
                          <p className="text-[11px] leading-5 text-sky-800">
                            هذه المعاملة غير مسندة حاليًا. بعد اختيار الموظف وحفظ الإسناد ستبدأ المعالجة تلقائيًا وتتحول الحالة إلى «تحت الإجراء».
                          </p>
                        ) : !(isAdmin || canDelete) ? (
                          <p className="text-[11px] leading-5 text-muted-foreground">
                            صلاحية «تحويل» تتيح للمستخدم العادي تحويل المعاملة المسندة إليه فقط إلى موظف آخر، مع إلزامه بتسجيل سبب التحويل وحفظه في سجل الإجراءات.
                          </p>
                        ) : null}

                        <Button
                          onClick={() => void saveAssignment()}
                          disabled={
                            saving ||
                            !assignUserId ||
                            (!canAssignSelected && !(isAdmin || canDelete) && assignNote.trim().length < 3)
                          }
                        >
                          <Send className="ml-2 h-4 w-4" />
                          {canAssignSelected ? 'إسناد المعاملة' : 'تحويل المعاملة'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {canManageSelected && (
                    <Card className="border-emerald-200">
                      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CircleDot className="h-4 w-4" />تسجيل إجراء</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <Field label="الإجراء الذي تم اتخاذه *"><Textarea rows={2} value={actionText} onChange={(e) => setActionText(e.target.value)} placeholder="مثال: تم إعداد الخطاب ورفعه للاعتماد" /></Field>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="الحالة بعد الإجراء"><NativeSelect value={actionStatus} onChange={(e) => setActionStatus(e.target.value as TransactionFollowUpStatus)}>{Object.entries(statusLabels).filter(([value]) => value !== 'new' && value !== 'assigned').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field>
                          <Field label="الاستحقاق القادم"><Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} /></Field>
                        </div>
                        <Field label="الإجراء القادم"><Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} /></Field>
                        <Field label="ملاحظة"><Textarea rows={2} value={actionNote} onChange={(e) => setActionNote(e.target.value)} /></Field>
                        <Button onClick={() => void recordAction()} disabled={saving || !actionText.trim()}><CheckCircle2 className="ml-2 h-4 w-4" />تسجيل الإجراء</Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              <TransactionManagementDirectives
                record={selected}
                assignees={assignees}
                currentUserId={currentUser?.uid || null}
                supervisor={isAdmin || canDelete}
                onChanged={async () => {
                  await Promise.all([openDetails(selected.id), load()]);
                }}
              />

              <Card>
                <CardHeader><CardTitle className="text-base">سجل الإجراءات والتحويلات</CardTitle></CardHeader>
                <CardContent>
                  {!selected.events?.length ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">لا توجد أحداث مسجلة.</div>
                  ) : (
                    <div className="space-y-3">
                      {selected.events.map((event) => (
                        <div key={event.id} className="rounded-xl border bg-slate-50/70 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <b className="text-sm">{event.actionText || 'تحديث المعاملة'}</b>
                            <span className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">بواسطة: {event.createdByName || '—'}</div>
                          {(event.fromAssigneeName || event.toAssigneeName) && (
                            <div className="mt-1 text-xs">المسؤول: {event.fromAssigneeName || '—'} ← {event.toAssigneeName || '—'}</div>
                          )}
                          {event.note && <p className="mt-2 text-sm leading-6">{event.note}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                {canDelete ? <Button variant="outline" className="border-red-300 text-red-700" onClick={() => void remove(selected)}>حذف المعاملة</Button> : <span />}
                <Button variant="outline" onClick={() => setSelected(null)}>إغلاق</Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const WorkspaceTab = ({
  active,
  icon,
  title,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={'group flex min-h-[62px] items-center gap-3 rounded-2xl border px-3 py-2.5 text-right transition ' + (
      active
        ? 'border-primary/40 bg-white text-primary shadow-sm ring-1 ring-primary/10'
        : 'border-transparent bg-transparent text-slate-600 hover:border-slate-200 hover:bg-white'
    )}
  >
    <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + (
      active ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-50'
    )}>
      {icon}
    </span>
    <span className="min-w-0">
      <span className="block text-xs font-black sm:text-sm">{title}</span>
      <span className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">{hint}</span>
    </span>
  </button>
);

const FollowUpUnitCard = ({
  title,
  subtitle,
  icon,
  tone,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'blue' | 'teal';
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`followup-unit-card followup-unit-card--${tone} group`}
  >
    <span className="followup-unit-card__icon">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-base font-black sm:text-lg">{title}</span>
      <span className="mt-1 block text-xs opacity-75">{subtitle}</span>
    </span>
    <span className="followup-unit-card__arrow">‹</span>
  </button>
);

const FollowUpKpiCard = ({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone: 'slate' | 'orange' | 'red' | 'blue' | 'amber' | 'green';
}) => (
  <div className={`followup-kpi-card followup-kpi-card--${tone}`}>
    <span className="followup-kpi-card__icon">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-black">{title}</span>
      <span className="mt-1 block text-3xl font-black leading-none">{value.toLocaleString('ar-SA')}</span>
      <span className="mt-2 block text-[11px] opacity-70">معاملة</span>
    </span>
    <span className="followup-kpi-card__spark" aria-hidden="true" />
  </div>
);

const FollowUpShortcutCard = ({
  title,
  subtitle,
  icon,
  tone,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tone: 'violet' | 'cyan' | 'amber';
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`followup-shortcut-card followup-shortcut-card--${tone}`}
  >
    <span className="followup-shortcut-card__icon">{icon}</span>
    <span className="min-w-0 flex-1">
      <span className="block text-base font-black">{title}</span>
      <span className="mt-1 block text-xs opacity-70">{subtitle}</span>
    </span>
    <span className="followup-shortcut-card__arrow">‹</span>
  </button>
);

const DailyStat = ({
  title,
  value,
  icon,
  tone = 'default',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'default' | 'danger' | 'warning' | 'info' | 'success';
}) => {
  const toneClass = {
    default: 'border-slate-200 bg-white text-slate-900',
    danger: 'border-red-200 bg-red-50/60 text-red-900',
    warning: 'border-amber-200 bg-amber-50/60 text-amber-900',
    info: 'border-sky-200 bg-sky-50/60 text-sky-900',
    success: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
  }[tone];

  return (
    <div className={'flex items-center justify-between rounded-2xl border px-3 py-3 ' + toneClass}>
      <div>
        <p className="text-sm font-bold opacity-75">{title}</p>
        <p className="mt-1 text-2xl font-black">{value.toLocaleString('ar-SA')}</p>
      </div>
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-current/10 bg-white/70">
        {icon}
      </span>
    </div>
  );
};

const ToolCard = ({
  icon,
  title,
  description,
  onClick,
  emphasis = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  emphasis?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={'group rounded-2xl border p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md ' + (
      emphasis
        ? 'border-violet-200 bg-violet-50/60'
        : 'border-slate-200 bg-white hover:border-primary/30'
    )}
  >
    <div className="flex items-start gap-3">
      <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl ' + (
        emphasis
          ? 'bg-violet-100 text-violet-800'
          : 'bg-slate-100 text-slate-700 group-hover:bg-primary/10 group-hover:text-primary'
      )}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-900">{title}</span>
        <span className="mt-1 block text-[11px] leading-5 text-slate-500">{description}</span>
      </span>
    </div>
  </button>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);

const Info = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-slate-50/70 p-3">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
  </div>
);

const ComparisonMetric = ({
  label,
  value,
  suffix = '',
  inverse = false,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  inverse?: boolean;
}) => {
  const isPositive = (value || 0) > 0;
  const isNegative = (value || 0) < 0;
  const favorable = value == null || value === 0
    ? null
    : inverse
      ? isNegative
      : isPositive;

  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-black ${
        favorable === true
          ? 'text-emerald-700'
          : favorable === false
            ? 'text-red-700'
            : 'text-slate-900'
      }`}>
        {value == null ? '—' : `${value > 0 ? '+' : ''}${value}${suffix}`}
      </p>
    </div>
  );
};

const MetricTile = ({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) => (
  <div className="rounded-2xl border bg-slate-50/70 p-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      </div>
      <div className="rounded-xl border bg-white p-2">{icon}</div>
    </div>
    <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{hint}</p>
  </div>
);

const AgeBox = ({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) => (
  <div className={`rounded-xl border p-3 ${danger ? 'border-red-200 bg-red-50' : 'bg-slate-50/70'}`}>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className={`mt-1 text-xl font-black ${danger && value ? 'text-red-700' : 'text-slate-900'}`}>{value.toLocaleString('ar-SA')}</p>
  </div>
);

