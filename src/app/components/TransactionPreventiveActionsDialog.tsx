import React from 'react';
import {
  Activity,
  AlertTriangle,
  ClipboardList,
  Clock3,
  RefreshCw,
  Save,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  transactionFollowUpApi,
  type TransactionFollowUpAssignee,
  type TransactionFollowUpPreventiveAction,
  type TransactionFollowUpPreventiveActionPage,
} from '../api/transactionFollowUp';
import type { ImprovementPlanSeed } from './TransactionImprovementPlansDialog';
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
import { NativeSelect } from './ui/native-select';
import { Textarea } from './ui/textarea';

export type PreventiveActionSeed = {
  sourceType: 'metric' | 'employee';
  metricKey?: TransactionFollowUpPreventiveAction['metricKey'];
  metricLabel?: string | null;
  scopeType: 'global' | 'employee';
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  actionText: string;
  expectedOutcome?: string | null;
  periodDays: number;
  baselineValue?: number | null;
  projectedValue?: number | null;
  targetValue?: number | null;
  direction?: 'min' | 'max' | null;
  sourceRiskScore?: number | null;
  sourceRiskLevel?: 'low' | 'medium' | 'high' | 'critical' | null;
  sourceReasons?: string[];
};

const EMPTY_PAGE: TransactionFollowUpPreventiveActionPage = {
  generatedAt: new Date(0).toISOString(),
  supervisor: false,
  summary: { open: 0, overdue: 0, monitoring: 0, effective30d: 0, failed: 0 },
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

const statusLabels: Record<TransactionFollowUpPreventiveAction['status'], string> = {
  open: 'مفتوح',
  in_progress: 'قيد التنفيذ',
  monitoring: 'قياس الأثر',
  effective: 'فعال',
  failed: 'لم يحقق الأثر',
  cancelled: 'ملغى',
};

const statusClass: Record<TransactionFollowUpPreventiveAction['status'], string> = {
  open: 'border-sky-300 bg-sky-50 text-sky-800',
  in_progress: 'border-violet-300 bg-violet-50 text-violet-800',
  monitoring: 'border-amber-300 bg-amber-50 text-amber-900',
  effective: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  failed: 'border-red-300 bg-red-50 text-red-800',
  cancelled: 'border-slate-300 bg-slate-50 text-slate-700',
};

const riskClass = (risk?: string | null) => {
  if (risk === 'critical') return 'border-red-300 bg-red-50 text-red-800';
  if (risk === 'high') return 'border-orange-300 bg-orange-50 text-orange-800';
  if (risk === 'medium') return 'border-amber-300 bg-amber-50 text-amber-900';
  return 'border-emerald-300 bg-emerald-50 text-emerald-800';
};

const riskLabel = (risk?: string | null) => {
  if (risk === 'critical') return 'حرج';
  if (risk === 'high') return 'مرتفع';
  if (risk === 'medium') return 'متوسط';
  if (risk === 'low') return 'منخفض';
  return '—';
};

const dateInput = (daysFromNow = 14) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
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

const formatValue = (action: TransactionFollowUpPreventiveAction, value?: number | null) => {
  if (value == null) return '—';
  if (action.metricKey?.includes('Rate')) {
    return value.toLocaleString('ar-SA', { maximumFractionDigits: 1 }) + '%';
  }
  return value.toLocaleString('ar-SA', { maximumFractionDigits: 1 }) + ' ساعة';
};

type FormState = {
  sourceType: 'metric' | 'employee';
  metricKey: TransactionFollowUpPreventiveAction['metricKey'] | '';
  scopeType: 'global' | 'employee';
  assigneeUserId: string;
  ownerUserId: string;
  actionText: string;
  expectedOutcome: string;
  periodDays: string;
  baselineValue: string;
  projectedValue: string;
  targetValue: string;
  direction: 'min' | 'max' | '';
  sourceRiskScore: string;
  sourceRiskLevel: 'low' | 'medium' | 'high' | 'critical' | '';
  sourceReasons: string[];
  dueDate: string;
};

const blankForm = (): FormState => ({
  sourceType: 'metric',
  metricKey: 'firstPassRate',
  scopeType: 'global',
  assigneeUserId: '',
  ownerUserId: '',
  actionText: '',
  expectedOutcome: '',
  periodDays: '30',
  baselineValue: '',
  projectedValue: '',
  targetValue: '',
  direction: 'min',
  sourceRiskScore: '',
  sourceRiskLevel: '',
  sourceReasons: [],
  dueDate: dateInput(14),
});

const seedForm = (seed: PreventiveActionSeed): FormState => ({
  sourceType: seed.sourceType,
  metricKey: seed.metricKey || '',
  scopeType: seed.scopeType,
  assigneeUserId: seed.assigneeUserId || '',
  ownerUserId: seed.assigneeUserId || '',
  actionText: seed.actionText,
  expectedOutcome: seed.expectedOutcome || 'إعادة المؤشر إلى المستوى الآمن قبل الوصول إلى الانحراف الأحمر.',
  periodDays: String(seed.periodDays || 30),
  baselineValue: seed.baselineValue == null ? '' : String(seed.baselineValue),
  projectedValue: seed.projectedValue == null ? '' : String(seed.projectedValue),
  targetValue: seed.targetValue == null ? '' : String(seed.targetValue),
  direction: seed.direction || '',
  sourceRiskScore: seed.sourceRiskScore == null ? '' : String(seed.sourceRiskScore),
  sourceRiskLevel: seed.sourceRiskLevel || '',
  sourceReasons: seed.sourceReasons || [],
  dueDate: dateInput(14),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignees: TransactionFollowUpAssignee[];
  supervisor: boolean;
  seed?: PreventiveActionSeed | null;
  onOpenCapa?: (seed: ImprovementPlanSeed, preventiveActionId: string) => void;
};

export const TransactionPreventiveActionsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  assignees,
  supervisor,
  seed,
  onOpenCapa,
}) => {
  const [data, setData] = React.useState<TransactionFollowUpPreventiveActionPage>(EMPTY_PAGE);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [verifyingId, setVerifyingId] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState('');
  const [createOpen, setCreateOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(blankForm());
  const [notes, setNotes] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const result = await transactionFollowUpApi.preventiveActions({
        page: 1,
        pageSize: 50,
        status: statusFilter || undefined,
      });
      setData(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل سجل التدخلات الوقائية');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    if (open) void load();
  }, [open, load]);

  React.useEffect(() => {
    if (!open || !seed || !supervisor) return;
    setForm(seedForm(seed));
    setCreateOpen(true);
  }, [open, seed, supervisor]);

  const createAction = async () => {
    if (!form.ownerUserId || !form.actionText.trim() || !form.dueDate) {
      toast.error('حدد مسؤول التنفيذ والإجراء الوقائي وتاريخ الاستحقاق');
      return;
    }
    if (form.scopeType === 'employee' && !form.assigneeUserId) {
      toast.error('حدد الموظف المرتبط بالتدخل الوقائي');
      return;
    }
    if (form.sourceType === 'metric' && !form.metricKey) {
      toast.error('حدد مؤشر الأداء المرتبط بالإنذار المبكر');
      return;
    }

    try {
      setSaving(true);
      await transactionFollowUpApi.createPreventiveAction({
        sourceType: form.sourceType,
        metricKey: form.metricKey || null,
        scopeType: form.scopeType,
        assigneeUserId: form.scopeType === 'employee' ? form.assigneeUserId : null,
        ownerUserId: form.ownerUserId,
        actionText: form.actionText.trim(),
        expectedOutcome: form.expectedOutcome.trim() || null,
        periodDays: Number(form.periodDays),
        baselineValue: form.baselineValue === '' ? null : Number(form.baselineValue),
        projectedValue: form.projectedValue === '' ? null : Number(form.projectedValue),
        targetValue: form.targetValue === '' ? null : Number(form.targetValue),
        direction: form.direction || null,
        sourceRiskScore: form.sourceRiskScore === '' ? null : Number(form.sourceRiskScore),
        sourceRiskLevel: form.sourceRiskLevel || null,
        sourceReasons: form.sourceReasons,
        dueDate: form.dueDate,
      });
      toast.success('تم إنشاء التدخل الوقائي وإشعار مسؤول التنفيذ');
      setCreateOpen(false);
      setForm(blankForm());
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إنشاء التدخل الوقائي');
    } finally {
      setSaving(false);
    }
  };

  const updateAction = async (
    action: TransactionFollowUpPreventiveAction,
    status: 'in_progress' | 'monitoring',
  ) => {
    const progressNote = String(notes[action.id] || '').trim();
    if (status === 'in_progress' && !progressNote) {
      toast.error('اكتب تحديثًا مختصرًا عن بدء تنفيذ التدخل الوقائي');
      return;
    }

    try {
      setSaving(true);
      await transactionFollowUpApi.updatePreventiveAction(action.id, {
        status,
        progressNote: progressNote || null,
      });
      toast.success(status === 'monitoring' ? 'تم تحويل التدخل إلى مرحلة قياس الأثر' : 'تم تحديث التدخل الوقائي');
      setNotes((current) => ({ ...current, [action.id]: '' }));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث التدخل الوقائي');
    } finally {
      setSaving(false);
    }
  };

  const verifyAction = async (action: TransactionFollowUpPreventiveAction) => {
    try {
      setVerifyingId(action.id);
      const result = await transactionFollowUpApi.verifyPreventiveAction(action.id);
      if (result.verification.effective) {
        toast.success('نجح التدخل الوقائي وعاد المؤشر إلى المستوى الآمن — لا حاجة إلى CAPA');
      } else if (result.verification.capaRecommended) {
        toast.error('لم يحقق التدخل الوقائي الأثر عند الاستحقاق — يوصى بفتح CAPA');
      } else {
        toast.warning('المؤشر لم يحقق المستهدف بعد، وسيستمر التدخل في مرحلة المراقبة حتى الاستحقاق');
      }
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر قياس أثر التدخل الوقائي');
    } finally {
      setVerifyingId(null);
    }
  };

  const openCapa = (action: TransactionFollowUpPreventiveAction) => {
    if (!action.metricKey || action.targetValue == null || !action.direction || !onOpenCapa) return;
    onOpenCapa({
      metricKey: action.metricKey,
      metricLabel: action.metricLabel || action.metricKey,
      baselineValue: action.resultValue ?? action.baselineValue ?? null,
      targetValue: action.targetValue,
      direction: action.direction,
      assigneeUserId: action.scopeType === 'employee' ? action.assigneeUserId : null,
      assigneeName: action.scopeType === 'employee' ? action.assigneeName : null,
    }, action.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96dvh] overflow-hidden sm:max-w-[1380px]" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            سجل التدخلات الوقائية Preventive Actions
          </DialogTitle>
          <DialogDescription>
            تحويل الإنذار المبكر إلى تكليف وقائي محدد المسؤول والاستحقاق، ثم قياس أثره قبل اللجوء إلى CAPA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto pe-1">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="قيد المتابعة" value={data.summary.open} />
            <SummaryCard label="متأخرة" value={data.summary.overdue} danger={data.summary.overdue > 0} />
            <SummaryCard label="في قياس الأثر" value={data.summary.monitoring} warning={data.summary.monitoring > 0} />
            <SummaryCard label="فعالة آخر 30 يومًا" value={data.summary.effective30d} success={data.summary.effective30d > 0} />
            <SummaryCard label="تحتاج CAPA" value={data.summary.failed} danger={data.summary.failed > 0} />
          </div>

          <Card className="shadow-none">
            <CardHeader className="border-b py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-4 w-4 text-emerald-700" />
                    التدخلات الوقائية
                  </CardTitle>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    المسار التشغيلي: إنذار مبكر ← تدخل وقائي ← قياس الأثر ← CAPA فقط عند فشل التدخل.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <NativeSelect
                    className="w-44"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="">جميع الحالات</option>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </NativeSelect>
                  <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
                    <RefreshCw className={'ml-1 h-3.5 w-3.5 ' + (loading ? 'animate-spin' : '')} />
                    تحديث
                  </Button>
                  {supervisor && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setForm(blankForm());
                        setCreateOpen(true);
                      }}
                    >
                      <ShieldCheck className="ml-1 h-3.5 w-3.5" />
                      تدخل وقائي جديد
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading && !data.items.length ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  جارٍ تحميل التدخلات الوقائية...
                </div>
              ) : data.items.length ? (
                <div className="divide-y">
                  {data.items.map((action) => {
                    const closed = ['effective', 'failed', 'cancelled'].includes(action.status);
                    const progressNote = notes[action.id] || '';
                    return (
                      <div key={action.id} className="space-y-3 p-4">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <b className="text-sm text-slate-900">
                                {action.metricLabel || (action.assigneeName ? 'مخاطر تشغيلية — ' + action.assigneeName : 'تدخل وقائي')}
                              </b>
                              <Badge variant="outline" className={statusClass[action.status]}>
                                {statusLabels[action.status]}
                              </Badge>
                              {action.sourceRiskLevel && (
                                <Badge variant="outline" className={riskClass(action.sourceRiskLevel)}>
                                  الخطر عند الإنشاء: {riskLabel(action.sourceRiskLevel)}
                                  {action.sourceRiskScore != null ? ' · ' + action.sourceRiskScore + '/100' : ''}
                                </Badge>
                              )}
                              {action.improvementPlanId && (
                                <Badge variant="outline" className="border-teal-300 bg-teal-50 text-teal-800">
                                  مرتبط بـ CAPA
                                </Badge>
                              )}
                            </div>
                            <p className="mt-2 text-sm font-semibold leading-6">{action.actionText}</p>
                            {action.expectedOutcome && (
                              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                                النتيجة المتوقعة: {action.expectedOutcome}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-muted-foreground">
                              <span>مسؤول التنفيذ: <b className="text-foreground">{action.ownerName}</b></span>
                              <span>الاستحقاق: <b className={action.isOverdue ? 'text-red-700' : 'text-foreground'}>{formatDate(action.dueDate)}</b></span>
                              <span>النطاق: <b className="text-foreground">{action.scopeType === 'employee' ? action.assigneeName || 'موظف' : 'الإدارة'}</b></span>
                              <span>فترة القياس: <b className="text-foreground">{action.periodDays.toLocaleString('ar-SA')} يومًا</b></span>
                            </div>
                            {action.metricKey && (
                              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                                <span className="rounded-lg border bg-slate-50 px-2 py-1">
                                  الأساسي: <b>{formatValue(action, action.baselineValue)}</b>
                                </span>
                                <span className="rounded-lg border bg-slate-50 px-2 py-1">
                                  المتوقع: <b>{formatValue(action, action.projectedValue)}</b>
                                </span>
                                <span className="rounded-lg border bg-slate-50 px-2 py-1">
                                  المستهدف: <b>{action.direction === 'min' ? '≥' : '≤'} {formatValue(action, action.targetValue)}</b>
                                </span>
                              </div>
                            )}
                            {action.progressNote && (
                              <div className="mt-3 rounded-xl border bg-slate-50 px-3 py-2 text-[10px] leading-5">
                                <b>آخر تحديث:</b> {action.progressNote}
                              </div>
                            )}
                            {action.verifiedAt && (
                              <div className={'mt-3 rounded-xl border px-3 py-2 text-[10px] leading-5 ' + (
                                action.status === 'effective'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                  : action.status === 'failed'
                                    ? 'border-red-200 bg-red-50 text-red-900'
                                    : 'border-amber-200 bg-amber-50 text-amber-950'
                              )}>
                                <b>آخر قياس:</b> {formatDateTime(action.verifiedAt)}
                                {action.resultValue != null ? ' · النتيجة ' + formatValue(action, action.resultValue) : ''}
                                {action.resultRiskScore != null ? ' · درجة الخطر ' + action.resultRiskScore + '/100' : ''}
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            {!closed && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() => void updateAction(action, 'in_progress')}
                              >
                                <Activity className="ml-1 h-3.5 w-3.5" />
                                بدء التنفيذ
                              </Button>
                            )}
                            {!closed && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() => void updateAction(action, 'monitoring')}
                              >
                                <Clock3 className="ml-1 h-3.5 w-3.5" />
                                قياس الأثر
                              </Button>
                            )}
                            {supervisor && !closed && (
                              <Button
                                type="button"
                                size="sm"
                                className="bg-emerald-700 hover:bg-emerald-800"
                                disabled={verifyingId === action.id}
                                onClick={() => void verifyAction(action)}
                              >
                                <Target className="ml-1 h-3.5 w-3.5" />
                                {verifyingId === action.id ? 'جارٍ القياس...' : 'تحقق من الأثر'}
                              </Button>
                            )}
                            {supervisor && action.status === 'failed' && !action.improvementPlanId && action.metricKey && onOpenCapa && (
                              <Button
                                type="button"
                                size="sm"
                                className="bg-red-700 hover:bg-red-800"
                                onClick={() => openCapa(action)}
                              >
                                <AlertTriangle className="ml-1 h-3.5 w-3.5" />
                                إنشاء CAPA
                              </Button>
                            )}
                          </div>
                        </div>

                        {!closed && (
                          <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                            <Textarea
                              rows={2}
                              value={progressNote}
                              onChange={(event) => setNotes((current) => ({ ...current, [action.id]: event.target.value }))}
                              placeholder="تحديث التنفيذ أو الملاحظات..."
                            />
                            <div className="flex items-end text-[10px] text-muted-foreground">
                              {action.events?.[0]?.changedByName
                                ? 'آخر تحديث بواسطة ' + action.events[0].changedByName
                                : 'سجل زمني محفوظ لكل تحديث'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  لا توجد تدخلات وقائية مسجلة ضمن الفلتر الحالي.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="rounded-xl border border-sky-200 bg-sky-50/60 px-4 py-3 text-[10px] leading-5 text-sky-950">
            <ShieldCheck className="ml-1 inline h-3.5 w-3.5" />
            لا تتحول الحالة إلى CAPA لمجرد ارتفاع الخطر. يبدأ النظام بتدخل وقائي خفيف، ويُقاس أثره على نفس المؤشر أو على درجة الخطر التشغيلية.
            إذا عاد المؤشر للمستوى الآمن يغلق التدخل بوصفه فعالًا، وإذا لم يحقق الأثر عند الاستحقاق تظهر توصية CAPA.
          </div>
        </div>

        <Dialog open={createOpen} onOpenChange={(next) => !saving && setCreateOpen(next)}>
          <DialogContent className="sm:max-w-[780px]" dir="rtl">
            <DialogHeader className="text-right">
              <DialogTitle>إنشاء تدخل وقائي</DialogTitle>
              <DialogDescription>
                حدد الإجراء والمسؤول وتاريخ الاستحقاق. بيانات المؤشر تحفظ كخط أساس لقياس الأثر لاحقًا.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>مسؤول التنفيذ *</Label>
                <NativeSelect
                  value={form.ownerUserId}
                  onChange={(event) => setForm((current) => ({ ...current, ownerUserId: event.target.value }))}
                >
                  <option value="">اختر مسؤول التنفيذ</option>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label>تاريخ الاستحقاق *</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>نطاق التدخل</Label>
                <NativeSelect
                  value={form.scopeType}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    scopeType: event.target.value as 'global' | 'employee',
                    assigneeUserId: event.target.value === 'employee' ? current.assigneeUserId : '',
                  }))}
                >
                  <option value="global">الإدارة / المؤشر العام</option>
                  <option value="employee">موظف محدد</option>
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label>الموظف المرتبط</Label>
                <NativeSelect
                  value={form.assigneeUserId}
                  disabled={form.scopeType !== 'employee'}
                  onChange={(event) => setForm((current) => ({ ...current, assigneeUserId: event.target.value }))}
                >
                  <option value="">اختر الموظف</option>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>الإجراء الوقائي *</Label>
                <Textarea
                  rows={4}
                  value={form.actionText}
                  onChange={(event) => setForm((current) => ({ ...current, actionText: event.target.value }))}
                  placeholder="مثال: متابعة منتصف المدة للتوجيهات القريبة من الاستحقاق وإعادة توزيع الحمل مبكرًا."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>النتيجة المتوقعة</Label>
                <Textarea
                  rows={2}
                  value={form.expectedOutcome}
                  onChange={(event) => setForm((current) => ({ ...current, expectedOutcome: event.target.value }))}
                  placeholder="كيف نعرف أن التدخل الوقائي نجح؟"
                />
              </div>

              {(form.metricKey || form.sourceType === 'metric') && (
                <div className="sm:col-span-2 rounded-xl border bg-slate-50 p-3">
                  <p className="text-xs font-black">مرجع القياس من الإنذار المبكر</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <InfoBox label="القيمة الحالية" value={form.baselineValue || '—'} />
                    <InfoBox label="القيمة المتوقعة" value={form.projectedValue || '—'} />
                    <InfoBox label="المستهدف" value={form.targetValue || '—'} />
                    <InfoBox label="درجة الخطر" value={form.sourceRiskScore ? form.sourceRiskScore + '/100' : '—'} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
                إلغاء
              </Button>
              <Button type="button" onClick={() => void createAction()} disabled={saving}>
                <Save className="ml-1 h-4 w-4" />
                {saving ? 'جارٍ الحفظ...' : 'اعتماد التدخل الوقائي'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

const SummaryCard = ({
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
  <div className={'rounded-xl border px-4 py-3 text-center ' + (
    danger
      ? 'border-red-200 bg-red-50'
      : warning
        ? 'border-amber-200 bg-amber-50'
        : success
          ? 'border-emerald-200 bg-emerald-50'
          : 'bg-white'
  )}>
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className={'mt-1 text-xl font-black ' + (
      danger ? 'text-red-700' : warning ? 'text-amber-800' : success ? 'text-emerald-700' : 'text-slate-900'
    )}>
      {value.toLocaleString('ar-SA')}
    </p>
  </div>
);

const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border bg-white px-3 py-2 text-center">
    <p className="text-[9px] text-muted-foreground">{label}</p>
    <p className="mt-1 text-xs font-black text-slate-900">{value}</p>
  </div>
);

export default TransactionPreventiveActionsDialog;
