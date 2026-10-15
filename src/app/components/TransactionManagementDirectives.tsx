import React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Gavel,
  Play,
  Plus,
  RefreshCw,
  UserRound,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpAssignee,
  type TransactionFollowUpDirective,
  type TransactionFollowUpRecord,
} from '../api/transactionFollowUp';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';

const statusLabels: Record<TransactionFollowUpDirective['status'], string> = {
  pending: 'بانتظار التنفيذ',
  in_progress: 'قيد التنفيذ',
  completed: 'منجز',
  cancelled: 'ملغى',
};

const priorityLabels: Record<TransactionFollowUpDirective['priority'], string> = {
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
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
  assignees: TransactionFollowUpAssignee[];
  currentUserId?: string | null;
  supervisor: boolean;
  onChanged: () => Promise<void> | void;
};

export const TransactionManagementDirectives: React.FC<Props> = ({
  record,
  assignees,
  currentUserId,
  supervisor,
  onChanged,
}) => {
  const directives = record.directives || [];
  const [creating, setCreating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [directiveType, setDirectiveType] = React.useState<'directive' | 'decision'>('directive');
  const [title, setTitle] = React.useState('');
  const [instruction, setInstruction] = React.useState('');
  const [priority, setPriority] = React.useState<'normal' | 'high' | 'urgent'>('normal');
  const [assigneeUserId, setAssigneeUserId] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [completionId, setCompletionId] = React.useState<string | null>(null);
  const [completionResponse, setCompletionResponse] = React.useState('');
  const [completionNote, setCompletionNote] = React.useState('');

  const openCount = directives.filter((item) => ['pending', 'in_progress'].includes(item.status)).length;
  const overdueCount = directives.filter((item) => item.isOverdue).length;
  const completedCount = directives.filter((item) => item.status === 'completed').length;

  const resetCreate = () => {
    setDirectiveType('directive');
    setTitle('');
    setInstruction('');
    setPriority('normal');
    setAssigneeUserId('');
    setDueDate('');
  };

  const createDirective = async () => {
    if (!title.trim() || !instruction.trim() || !assigneeUserId) {
      toast.error('أكمل عنوان التوجيه ونصه والموظف المكلف');
      return;
    }
    try {
      setSaving(true);
      await transactionFollowUpApi.createDirective(record.id, {
        directiveType,
        title: title.trim(),
        instruction: instruction.trim(),
        priority,
        assigneeUserId,
        dueDate: dueDate || null,
      });
      toast.success(directiveType === 'decision' ? 'تم إصدار القرار وإسناده للموظف' : 'تم إصدار التوجيه وإسناده للموظف');
      setCreating(false);
      resetCreate();
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إصدار التوجيه');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (
    directive: TransactionFollowUpDirective,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
  ) => {
    if (status === 'cancelled' && !window.confirm('إلغاء هذا التوجيه أو القرار؟')) return;
    if (status === 'completed' && !completionResponse.trim()) {
      toast.error('اكتب نتيجة التنفيذ أولًا');
      return;
    }

    try {
      setSaving(true);
      await transactionFollowUpApi.updateDirective(record.id, directive.id, {
        status,
        completionResponse: status === 'completed' ? completionResponse.trim() : null,
        completionNote: status === 'completed' ? completionNote.trim() || null : null,
      });
      toast.success(
        status === 'completed'
          ? 'تم تسجيل نتيجة التنفيذ وإنجاز التوجيه'
          : status === 'in_progress'
            ? 'تم بدء تنفيذ التوجيه'
            : status === 'cancelled'
              ? 'تم إلغاء التوجيه'
              : 'تم تحديث حالة التوجيه',
      );
      setCompletionId(null);
      setCompletionResponse('');
      setCompletionNote('');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث التوجيه');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-indigo-200 bg-indigo-50/20">
      <CardHeader className="border-b border-indigo-100 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gavel className="h-4 w-4 text-indigo-700" />
              توجيهات وقرارات الإدارة
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              كل توجيه له موظف مكلف وموعد وحالة تنفيذ مستقلة عن حالة المعاملة.
            </p>
          </div>
          {supervisor && !['completed', 'closed'].includes(record.status) && (
            <Button
              type="button"
              size="sm"
              variant={creating ? 'outline' : 'default'}
              onClick={() => setCreating((value) => !value)}
            >
              {creating ? <XCircle className="ml-1 h-4 w-4" /> : <Plus className="ml-1 h-4 w-4" />}
              {creating ? 'إلغاء الإضافة' : 'إصدار توجيه / قرار'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-2">
          <DirectiveMetric title="قيد المتابعة" value={openCount} />
          <DirectiveMetric title="متأخرة" value={overdueCount} danger={overdueCount > 0} />
          <DirectiveMetric title="منجزة" value={completedCount} success={completedCount > 0} />
        </div>

        {creating && supervisor && (
          <div className="rounded-2xl border border-indigo-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="النوع">
                <NativeSelect value={directiveType} onChange={(e) => setDirectiveType(e.target.value as 'directive' | 'decision')}>
                  <option value="directive">توجيه إداري</option>
                  <option value="decision">قرار إداري</option>
                </NativeSelect>
              </Field>
              <Field label="الأولوية">
                <NativeSelect value={priority} onChange={(e) => setPriority(e.target.value as 'normal' | 'high' | 'urgent')}>
                  <option value="normal">عادية</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </NativeSelect>
              </Field>
              <div className="md:col-span-2">
                <Field label="عنوان التوجيه / القرار *">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: إعداد مسودة الرد ورفعها للاعتماد" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="نص التوجيه / القرار *">
                  <Textarea rows={3} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="اكتب المطلوب تنفيذه بشكل واضح..." />
                </Field>
              </div>
              <Field label="الموظف المكلف *">
                <NativeSelect value={assigneeUserId} onChange={(e) => setAssigneeUserId(e.target.value)}>
                  <option value="">اختر الموظف...</option>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="موعد التنفيذ">
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={() => void createDirective()} disabled={saving}>
                {saving ? <RefreshCw className="ml-2 h-4 w-4 animate-spin" /> : <Gavel className="ml-2 h-4 w-4" />}
                إصدار وإسناد
              </Button>
            </div>
          </div>
        )}

        {directives.length === 0 ? (
          <div className="rounded-xl border border-dashed border-indigo-200 bg-white py-10 text-center">
            <ClipboardCheck className="mx-auto h-7 w-7 text-indigo-300" />
            <p className="mt-2 text-sm font-bold text-slate-600">لا توجد توجيهات أو قرارات على هذه المعاملة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {directives.map((directive) => {
              const mine = directive.assigneeUserId === currentUserId;
              const canUpdate = supervisor || mine;
              const isFinal = ['completed', 'cancelled'].includes(directive.status);
              const completing = completionId === directive.id;

              return (
                <div
                  key={directive.id}
                  className={`rounded-2xl border bg-white p-4 ${
                    directive.isOverdue
                      ? 'border-red-300'
                      : directive.isDueToday
                        ? 'border-amber-300'
                        : directive.status === 'completed'
                          ? 'border-emerald-200'
                          : 'border-indigo-100'
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">
                          {directive.directiveType === 'decision' ? 'قرار إداري' : 'توجيه إداري'}
                        </Badge>
                        <Badge variant="outline">{statusLabels[directive.status]}</Badge>
                        <Badge
                          variant="outline"
                          className={directive.priority === 'urgent'
                            ? 'border-red-300 bg-red-50 text-red-700'
                            : directive.priority === 'high'
                              ? 'border-orange-300 bg-orange-50 text-orange-800'
                              : ''}
                        >
                          {priorityLabels[directive.priority]}
                        </Badge>
                        {directive.isOverdue && (
                          <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700">
                            <AlertTriangle className="ml-1 h-3 w-3" />
                            متأخر {directive.daysOverdue.toLocaleString('ar-SA')} يوم
                          </Badge>
                        )}
                        {directive.isDueToday && !directive.isOverdue && (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                            مستحق اليوم
                          </Badge>
                        )}
                      </div>

                      <h4 className="mt-2 text-sm font-black text-slate-900">{directive.title}</h4>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700">{directive.instruction}</p>

                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3.5 w-3.5" />
                          المكلف: <b className="text-foreground">{directive.assigneeName}</b>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          الاستحقاق: <b className="text-foreground">{formatDate(directive.dueDate)}</b>
                        </span>
                        <span>صدر بواسطة: <b className="text-foreground">{directive.issuedByName || '—'}</b></span>
                        <span>{formatDateTime(directive.issuedAt)}</span>
                      </div>

                      {directive.completionResponse && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                          <p className="text-[11px] font-black text-emerald-800">نتيجة التنفيذ</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{directive.completionResponse}</p>
                          {directive.completionNote && (
                            <p className="mt-2 text-xs text-muted-foreground">ملاحظة: {directive.completionNote}</p>
                          )}
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            تم الإنجاز: {formatDateTime(directive.completedAt)}
                          </p>
                        </div>
                      )}
                    </div>

                    {canUpdate && !isFinal && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {directive.status === 'pending' && (
                          <Button size="sm" variant="outline" disabled={saving} onClick={() => void updateStatus(directive, 'in_progress')}>
                            <Play className="ml-1 h-3.5 w-3.5" />
                            بدء التنفيذ
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant={completing ? 'default' : 'outline'}
                          disabled={saving}
                          onClick={() => {
                            setCompletionId(completing ? null : directive.id);
                            setCompletionResponse('');
                            setCompletionNote('');
                          }}
                        >
                          <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                          تسجيل الإنجاز
                        </Button>
                        {supervisor && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-700"
                            disabled={saving}
                            onClick={() => void updateStatus(directive, 'cancelled')}
                          >
                            إلغاء
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {completing && canUpdate && !isFinal && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/30 p-3">
                      <div className="grid gap-3">
                        <Field label="نتيجة التنفيذ *">
                          <Textarea
                            rows={3}
                            value={completionResponse}
                            onChange={(e) => setCompletionResponse(e.target.value)}
                            placeholder="اكتب ما تم تنفيذه والنتيجة..."
                          />
                        </Field>
                        <Field label="ملاحظة إضافية">
                          <Input value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} />
                        </Field>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          size="sm"
                          disabled={saving || !completionResponse.trim()}
                          onClick={() => void updateStatus(directive, 'completed')}
                        >
                          {saving ? <RefreshCw className="ml-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="ml-1 h-3.5 w-3.5" />}
                          اعتماد الإنجاز
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    {children}
  </div>
);

const DirectiveMetric = ({
  title,
  value,
  danger = false,
  success = false,
}: {
  title: string;
  value: number;
  danger?: boolean;
  success?: boolean;
}) => (
  <div
    className={`rounded-xl border px-3 py-2 text-center ${
      danger
        ? 'border-red-200 bg-red-50'
        : success
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-indigo-100 bg-white'
    }`}
  >
    <p className="text-[10px] text-muted-foreground">{title}</p>
    <p className={`mt-0.5 text-xl font-black ${danger ? 'text-red-700' : success ? 'text-emerald-700' : 'text-slate-900'}`}>
      {value.toLocaleString('ar-SA')}
    </p>
  </div>
);

export default TransactionManagementDirectives;
