import React from 'react';
import { useSearchParams } from 'react-router';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileClock,
  FileDown,
  FileText,
  Printer,
  Inbox,
  ListTodo,
  Gauge,
  TimerReset,
  TrendingUp,
  UsersRound,
  Plus,
  RefreshCw,
  Search,
  Send,
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
import {
  transactionFollowUpApi,
  type TransactionFollowUpAnalytics,
  type TransactionFollowUpAssignee,
  type TransactionFollowUpCreateInput,
  type TransactionFollowUpDashboard,
  type TransactionFollowUpExecutiveReport,
  type TransactionFollowUpPriority,
  type TransactionFollowUpRecord,
  type TransactionFollowUpStatus,
  type TransactionFollowUpType,
} from '../api/transactionFollowUp';

const EMPTY_DASHBOARD: TransactionFollowUpDashboard = {
  total: 0,
  open: 0,
  waiting: 0,
  overdue: 0,
  completed: 0,
  unassigned: 0,
  needsAction: 0,
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
  assigned: 'مسندة',
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
  incoming: 'وارد',
  outgoing: 'صادر',
  internal: 'داخلي',
};

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
  transactionType: 'incoming',
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
  const [searchParams, setSearchParams] = useSearchParams();
  const openedFromUrlRef = React.useRef<string | null>(null);
  const { currentUser } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();
  const canAdd = isAdmin || hasPermission('transaction_follow_up', 'canAdd');
  const canEdit = isAdmin || hasPermission('transaction_follow_up', 'canEdit');
  const canDelete = isAdmin || hasPermission('transaction_follow_up', 'canDelete');
  const canPrint = isAdmin || hasPermission('transaction_follow_up', 'canPrint');

  const [dashboard, setDashboard] = React.useState<TransactionFollowUpDashboard>(EMPTY_DASHBOARD);
  const [analytics, setAnalytics] = React.useState<TransactionFollowUpAnalytics>(EMPTY_ANALYTICS);
  const [analyticsPeriod, setAnalyticsPeriod] = React.useState<'30' | '90' | '365' | 'all'>('90');
  const [records, setRecords] = React.useState<TransactionFollowUpRecord[]>([]);
  const [assignees, setAssignees] = React.useState<TransactionFollowUpAssignee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [mine, setMine] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<TransactionFollowUpCreateInput>(emptyCreate());
  const [selected, setSelected] = React.useState<TransactionFollowUpRecord | null>(null);
  const [actionText, setActionText] = React.useState('');
  const [actionNote, setActionNote] = React.useState('');
  const [actionStatus, setActionStatus] = React.useState<TransactionFollowUpStatus>('in_progress');
  const [nextAction, setNextAction] = React.useState('');
  const [nextDueDate, setNextDueDate] = React.useState('');
  const [assignUserId, setAssignUserId] = React.useState('');
  const [assignNote, setAssignNote] = React.useState('');
  const reportRef = React.useRef<HTMLDivElement | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportLoading, setReportLoading] = React.useState(false);
  const [reportExporting, setReportExporting] = React.useState(false);
  const [reportMode, setReportMode] = React.useState<'weekly' | 'monthly' | 'custom'>('monthly');
  const [reportFrom, setReportFrom] = React.useState(reportRange('monthly').from);
  const [reportTo, setReportTo] = React.useState(reportRange('monthly').to);
  const [reportAssigneeId, setReportAssigneeId] = React.useState('');
  const [reportData, setReportData] = React.useState<TransactionFollowUpExecutiveReport | null>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [pageResult, dashboardResult, analyticsResult] = await Promise.all([
        transactionFollowUpApi.list({
          page,
          pageSize: 30,
          search,
          status,
          priority,
          mine,
        }),
        transactionFollowUpApi.dashboard(mine),
        transactionFollowUpApi.analytics({
          mine,
          periodDays: analyticsPeriod === 'all' ? 'all' : Number(analyticsPeriod),
        }),
      ]);
      setRecords(pageResult.items || []);
      setTotal(pageResult.total || 0);
      setTotalPages(pageResult.totalPages || 0);
      setDashboard(dashboardResult);
      setAnalytics(analyticsResult);
      if (pageResult.totalPages && page > pageResult.totalPages) setPage(pageResult.totalPages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل نظام المتابعة');
    } finally {
      setLoading(false);
    }
  }, [page, priority, search, status, mine, analyticsPeriod]);

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
  }, [status, priority, mine]);

  const openDetails = async (id: string) => {
    try {
      setDetailLoading(true);
      const record = await transactionFollowUpApi.get(id);
      setSelected(record);
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

  const createTransaction = async () => {
    if (!createForm.transactionNumber.trim() || !createForm.subject.trim() || !createForm.transactionDate) {
      toast.error('أكمل رقم المعاملة وتاريخها وموضوعها');
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
      setCreateOpen(false);
      setCreateForm(emptyCreate());
      setPage(1);
      await load();
      await openDetails(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تسجيل المعاملة');
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async () => {
    if (!selected || !assignUserId) {
      toast.error('اختر الموظف المختص');
      return;
    }
    try {
      setSaving(true);
      const updated = await transactionFollowUpApi.assign(selected.id, {
        assigneeUserId: assignUserId,
        note: assignNote || null,
      });
      toast.success('تم إسناد المعاملة وتسجيل التحويل');
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

  const openExecutiveReport = async () => {
    const range = reportRange('monthly');
    setReportMode('monthly');
    setReportFrom(range.from);
    setReportTo(range.to);
    setReportAssigneeId('');
    setReportOpen(true);
    await loadExecutiveReport(range.from, range.to, '');
  };

  const applyReportMode = async (mode: 'weekly' | 'monthly' | 'custom') => {
    setReportMode(mode);
    if (mode === 'custom') return;
    const range = reportRange(mode);
    setReportFrom(range.from);
    setReportTo(range.to);
    await loadExecutiveReport(range.from, range.to, reportAssigneeId);
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
      selected.createdById === currentUser?.uid ||
      selected.currentAssigneeUserId === currentUser?.uid
    )
  );

  return (
    <div className="mx-auto w-full max-w-[1750px] space-y-5">
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_16px_48px_rgba(15,23,42,.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-primary">
              <ListTodo className="h-4 w-4" />
              سير ومتابعة المعاملات
            </div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">نظام المتابعة</h1>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
              تسجيل المعاملة وإسنادها للموظف المختص، متابعة الإجراءات والتحويلات، وإظهار المعاملات المتأخرة أو التي لم يحدث عليها إجراء.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant={mine ? 'default' : 'outline'} onClick={() => setMine((value) => !value)}>
              <UserRound className="ml-2 h-4 w-4" />
              {mine ? 'عرض جميع المعاملات' : 'معاملاتي'}
            </Button>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`ml-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            {canPrint && (
              <Button variant="outline" onClick={() => void openExecutiveReport()}>
                <FileText className="ml-2 h-4 w-4" />
                التقارير التنفيذية
              </Button>
            )}
            {canAdd && (
              <Button onClick={() => { setCreateForm(emptyCreate()); setCreateOpen(true); }}>
                <Plus className="ml-2 h-4 w-4" />
                تسجيل معاملة
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        <Summary title="المعاملات المفتوحة" value={dashboard.open} icon={<Inbox className="h-5 w-5" />} />
        <Summary title="تحتاج إجراء" value={dashboard.needsAction} icon={<AlertTriangle className="h-5 w-5 text-red-600" />} />
        <Summary title="متأخرة" value={dashboard.overdue} icon={<Clock3 className="h-5 w-5 text-red-600" />} />
        <Summary title="بانتظار رد" value={dashboard.waiting} icon={<FileClock className="h-5 w-5 text-sky-700" />} />
        <Summary title="غير مسندة" value={dashboard.unassigned} icon={<UserRound className="h-5 w-5 text-amber-700" />} />
        <Summary title="منجزة / مغلقة" value={dashboard.completed} icon={<CheckCircle2 className="h-5 w-5 text-emerald-700" />} />
      </div>

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

      <Card className="rounded-[28px] border-white/60 bg-white/80 shadow-md">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>قائمة المعاملات</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">إجمالي النتائج: {total.toLocaleString('ar-SA')}</p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-3 xl:w-auto xl:min-w-[850px]">
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
            <div className="space-y-2">
              {records.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => void openDetails(record.id)}
                  className="w-full rounded-2xl border bg-background/80 p-4 text-right transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <b className="text-base text-slate-900">معاملة {record.transactionNumber}</b>
                        <Badge variant="outline">{typeLabels[record.transactionType]}</Badge>
                        <Badge variant="outline" className={priorityClass[record.priority]}>{priorityLabels[record.priority]}</Badge>
                        <Badge variant="outline" className={indicatorClass[record.indicatorSeverity]}>{record.indicatorLabel}</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-800">{record.subject}</p>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span>التاريخ: <b className="text-foreground">{formatDate(record.transactionDate)}</b></span>
                        <span>الموظف: <b className="text-foreground">{record.currentAssigneeName || 'غير مسندة'}</b></span>
                        <span>الحالة: <b className="text-foreground">{statusLabels[record.status]}</b></span>
                        <span>الاستحقاق: <b className="text-foreground">{formatDate(record.dueDate)}</b></span>
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground xl:text-left">
                      <div className="font-mono">{record.trackingNumber}</div>
                      <div className="mt-1">آخر إجراء: {formatDateTime(record.lastActionAt)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
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

      <Dialog open={reportOpen} onOpenChange={(open) => !reportExporting && setReportOpen(open)}>
        <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1180px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>التقارير التنفيذية لمتابعة المعاملات</DialogTitle>
            <DialogDescription>
              إعداد تقرير أسبوعي أو شهري أو لفترة مخصصة، مع إمكانية الطباعة أو الحفظ بصيغة PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 rounded-2xl border bg-slate-50/70 p-3 md:grid-cols-2 xl:grid-cols-6">
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
                تحديث التقرير
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
          </div>

          <div className="max-h-[70dvh] overflow-auto rounded-2xl border bg-slate-100 p-2 sm:p-4">
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
                حدد فترة التقرير ثم اضغط «تحديث التقرير».
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(open) => !saving && setCreateOpen(open)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>تسجيل معاملة جديدة</DialogTitle>
            <DialogDescription>سجّل بيانات المعاملة وحدد الموظف والإجراء والمدة المستهدفة.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="رقم المعاملة *"><Input value={createForm.transactionNumber} onChange={(e) => setCreateForm((p) => ({ ...p, transactionNumber: e.target.value }))} /></Field>
            <Field label="تاريخ المعاملة *"><Input type="date" value={createForm.transactionDate} onChange={(e) => setCreateForm((p) => ({ ...p, transactionDate: e.target.value }))} /></Field>
            <Field label="نوع المعاملة"><NativeSelect value={createForm.transactionType} onChange={(e) => setCreateForm((p) => ({ ...p, transactionType: e.target.value as TransactionFollowUpType }))}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field>
            <Field label="الأولوية"><NativeSelect value={createForm.priority} onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value as TransactionFollowUpPriority }))}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</NativeSelect></Field>
            <div className="md:col-span-2"><Field label="موضوع المعاملة *"><Input value={createForm.subject} onChange={(e) => setCreateForm((p) => ({ ...p, subject: e.target.value }))} /></Field></div>
            <Field label="الجهة"><Input value={createForm.sourceEntity || ''} onChange={(e) => setCreateForm((p) => ({ ...p, sourceEntity: e.target.value }))} placeholder="الجهة الواردة منها أو الموجهة إليها" /></Field>
            <Field label="الموظف المختص"><NativeSelect value={createForm.currentAssigneeUserId || ''} onChange={(e) => setCreateForm((p) => ({ ...p, currentAssigneeUserId: e.target.value }))}><option value="">بدون إسناد حاليًا</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}</NativeSelect></Field>
            <div className="md:col-span-2"><Field label="الإجراء المطلوب"><Input value={createForm.requiredAction || ''} onChange={(e) => setCreateForm((p) => ({ ...p, requiredAction: e.target.value }))} placeholder="مثال: إعداد الرد ورفعه للاعتماد" /></Field></div>
            <Field label="تاريخ الاستحقاق"><Input type="date" value={createForm.dueDate || ''} onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))} /></Field>
            <Field label="تنبيه عدم النشاط بعد (أيام)"><Input type="number" min={1} max={90} value={createForm.inactivityAlertDays || 3} onChange={(e) => setCreateForm((p) => ({ ...p, inactivityAlertDays: Number(e.target.value) || 3 }))} /></Field>
            <div className="md:col-span-2"><Field label="ملاحظات"><Textarea rows={3} value={createForm.notes || ''} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} /></Field></div>
            <div className="md:col-span-2 flex justify-end gap-2"><Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>إلغاء</Button><Button onClick={() => void createTransaction()} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'تسجيل وإسناد المعاملة'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selected) || detailLoading}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setSelected(null);
            if (searchParams.get('transaction')) {
              openedFromUrlRef.current = null;
              setSearchParams({});
            }
          }
        }}
      >
        <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-5xl" dir="rtl">
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
                <Info label="تاريخ المعاملة" value={formatDate(selected.transactionDate)} />
                <Info label="النوع" value={typeLabels[selected.transactionType]} />
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

              {canManageSelected && !['completed', 'closed'].includes(selected.status) && (
                <div className="grid gap-4 xl:grid-cols-2">
                  <Card className="border-violet-200">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><ArrowLeftRight className="h-4 w-4" />إسناد / تحويل</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <Field label="الموظف المختص"><NativeSelect value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}><option value="">اختر الموظف</option>{assignees.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}</NativeSelect></Field>
                      <Field label="ملاحظة التحويل"><Input value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="سبب التحويل أو المطلوب من الموظف" /></Field>
                      <Button onClick={() => void saveAssignment()} disabled={saving || !assignUserId}><Send className="ml-2 h-4 w-4" />حفظ الإسناد</Button>
                    </CardContent>
                  </Card>

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
                </div>
              )}

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

const Summary = ({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) => (
  <Card className="rounded-2xl border-white/60 bg-white/80">
    <CardContent className="flex items-center justify-between p-4">
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-black">{value.toLocaleString('ar-SA')}</p>
      </div>
      <div className="rounded-xl border bg-background/80 p-2">{icon}</div>
    </CardContent>
  </Card>
);
