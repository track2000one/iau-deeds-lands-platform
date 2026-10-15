import React from 'react';
import { useSearchParams } from 'react-router';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileClock,
  Inbox,
  ListTodo,
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
import {
  transactionFollowUpApi,
  type TransactionFollowUpAssignee,
  type TransactionFollowUpCreateInput,
  type TransactionFollowUpDashboard,
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

  const [dashboard, setDashboard] = React.useState<TransactionFollowUpDashboard>(EMPTY_DASHBOARD);
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

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const [pageResult, dashboardResult] = await Promise.all([
        transactionFollowUpApi.list({
          page,
          pageSize: 30,
          search,
          status,
          priority,
          mine,
        }),
        transactionFollowUpApi.dashboard(mine),
      ]);
      setRecords(pageResult.items || []);
      setTotal(pageResult.total || 0);
      setTotalPages(pageResult.totalPages || 0);
      setDashboard(dashboardResult);
      if (pageResult.totalPages && page > pageResult.totalPages) setPage(pageResult.totalPages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل نظام المتابعة');
    } finally {
      setLoading(false);
    }
  }, [page, priority, search, status, mine]);

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
