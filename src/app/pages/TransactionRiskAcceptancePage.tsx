import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileCheck2,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  transactionRiskApi,
  type TransactionRiskAcceptancePage,
  type TransactionRiskAcceptanceRequest,
  type TransactionRiskAcceptanceStatus,
  type TransactionRiskLevel,
} from '../api/transactionRisks';
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

export type RiskAcceptanceSeed = {
  id: string;
  riskNumber: string;
  title: string;
  residualScore: number;
  residualLevel: TransactionRiskLevel;
  appetiteLimit?: number;
  controls?: string[] | null;
};

const EMPTY: TransactionRiskAcceptancePage = {
  generatedAt: new Date(0).toISOString(),
  supervisor: false,
  summary: {
    pending: 0,
    activeApproved: 0,
    expiringSoon: 0,
    rejected30d: 0,
    expired30d: 0,
  },
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 0,
};

const statusLabels: Record<TransactionRiskAcceptanceStatus, string> = {
  pending: 'بانتظار الاعتماد',
  approved: 'معتمد',
  rejected: 'مرفوض',
  cancelled: 'ملغى',
  expired: 'منتهي',
};

const statusClass: Record<TransactionRiskAcceptanceStatus, string> = {
  pending: 'border-amber-300 bg-amber-50 text-amber-900',
  approved: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  rejected: 'border-red-300 bg-red-50 text-red-800',
  cancelled: 'border-slate-300 bg-slate-50 text-slate-700',
  expired: 'border-orange-300 bg-orange-50 text-orange-800',
};

const levelClass: Record<TransactionRiskLevel, string> = {
  low: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  medium: 'border-amber-300 bg-amber-50 text-amber-900',
  high: 'border-orange-300 bg-orange-50 text-orange-800',
  critical: 'border-red-300 bg-red-50 text-red-800',
};

const levelLabels: Record<TransactionRiskLevel, string> = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
  critical: 'حرج',
};

const dateInput = (days = 90) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
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

export const TransactionRiskAcceptancePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();
  const supervisor = isAdmin || hasPermission('transaction_follow_up', 'canDelete');

  const navigationSeed =
    (location.state as { riskAcceptanceSeed?: RiskAcceptanceSeed } | null)?.riskAcceptanceSeed || null;

  const [data, setData] = React.useState<TransactionRiskAcceptancePage>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<TransactionRiskAcceptanceStatus | ''>('');
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [decisionOpen, setDecisionOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TransactionRiskAcceptanceRequest | null>(null);
  const [justification, setJustification] = React.useState('');
  const [controls, setControls] = React.useState('');
  const [requestedUntil, setRequestedUntil] = React.useState(dateInput(90));
  const [decision, setDecision] = React.useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = React.useState('');

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setData(await transactionRiskApi.acceptances({
        page: 1,
        pageSize: 50,
        status: statusFilter,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل طلبات قبول المخاطر');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!navigationSeed) return;
    setJustification('');
    setControls(
      Array.isArray(navigationSeed.controls)
        ? navigationSeed.controls.filter(Boolean).join('\n')
        : '',
    );
    setRequestedUntil(dateInput(90));
    setRequestOpen(true);
  }, [navigationSeed]);

  const clearNavigationSeed = () => {
    if (!navigationSeed) return;
    navigate(location.pathname, { replace: true, state: null });
  };

  const submitRequest = async () => {
    if (!navigationSeed) {
      toast.error('لم يتم تحديد الخطر المطلوب قبوله');
      return;
    }
    if (justification.trim().length < 10) {
      toast.error('اكتب مبررات واضحة لقبول الخطر');
      return;
    }
    const controlRows = controls.split('\n').map((item) => item.trim()).filter(Boolean);
    const appetiteLimit = navigationSeed.appetiteLimit ?? 9;
    if (navigationSeed.residualScore > appetiteLimit && !controlRows.length) {
      toast.error(`الخطر خارج شهية المخاطر المعتمدة لفئته (الحد ${appetiteLimit}/25)؛ أضف ضابطًا تعويضيًا واحدًا على الأقل`);
      return;
    }

    try {
      setSaving(true);
      await transactionRiskApi.requestAcceptance(navigationSeed.id, {
        justification: justification.trim(),
        compensatingControls: controlRows,
        requestedUntil,
      });
      toast.success('تم رفع طلب قبول الخطر إلى مسار الاعتماد الإداري');
      setRequestOpen(false);
      clearNavigationSeed();
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إرسال طلب قبول الخطر');
    } finally {
      setSaving(false);
    }
  };

  const openDecision = (request: TransactionRiskAcceptanceRequest, nextDecision: 'approved' | 'rejected') => {
    setSelected(request);
    setDecision(nextDecision);
    setReviewComment(
      nextDecision === 'approved'
        ? 'تمت مراجعة مبررات القبول والضوابط التعويضية، ويعتمد قبول الخطر للمدة المحددة.'
        : '',
    );
    setDecisionOpen(true);
  };

  const saveDecision = async () => {
    if (!selected) return;
    if (reviewComment.trim().length < 3) {
      toast.error('اكتب ملاحظة قرار الاعتماد');
      return;
    }
    try {
      setSaving(true);
      await transactionRiskApi.decideAcceptance(selected.id, {
        decision,
        reviewComment: reviewComment.trim(),
      });
      toast.success(decision === 'approved' ? 'تم اعتماد قبول الخطر' : 'تم رفض طلب قبول الخطر');
      setDecisionOpen(false);
      setSelected(null);
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ قرار طلب القبول');
    } finally {
      setSaving(false);
    }
  };

  const cancelRequest = async (request: TransactionRiskAcceptanceRequest) => {
    try {
      setSaving(true);
      await transactionRiskApi.cancelAcceptance(request.id);
      toast.success('تم إلغاء طلب قبول الخطر');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إلغاء الطلب');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate('/follow-up/risks')}>
            <ArrowRight className="me-2 h-4 w-4" />
            سجل المخاطر التشغيلية
          </Button>
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
            <FileCheck2 className="h-4 w-4" />
            حوكمة قبول المخاطر
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">طلبات قبول المخاطر Risk Acceptance</h1>
          <p className="mt-2 max-w-5xl text-sm leading-7 text-muted-foreground">
            قبول الخطر ليس تغيير حالة مباشرًا. يتم رفع طلب موثق بالمبررات والضوابط التعويضية والمدة،
            ثم يعتمد أو يرفض إداريًا، ويعاد الخطر تلقائيًا إلى المراقبة عند انتهاء مدة القبول.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {supervisor && (
            <Button variant="outline" onClick={() => navigate('/follow-up/risks/executive')}>
              <ShieldAlert className="me-2 h-4 w-4" />
              لوحة المخاطر التنفيذية
            </Button>
          )}
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={'me-2 h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="بانتظار الاعتماد" value={data.summary.pending} warning={data.summary.pending > 0} />
        <SummaryCard label="قبول فعال" value={data.summary.activeApproved} success={data.summary.activeApproved > 0} />
        <SummaryCard label="ينتهي خلال 7 أيام" value={data.summary.expiringSoon} danger={data.summary.expiringSoon > 0} />
        <SummaryCard label="مرفوضة / 30 يوم" value={data.summary.rejected30d} />
        <SummaryCard label="منتهية / 30 يوم" value={data.summary.expired30d} />
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-5 w-5" />
                سجل قرارات قبول المخاطر
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                المسار: طلب قبول ← مراجعة إدارية ← اعتماد/رفض ← مراقبة مدة القبول ← إعادة فتح تلقائية عند الانتهاء.
              </p>
            </div>
            <NativeSelect
              className="w-full sm:w-48"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as TransactionRiskAcceptanceStatus | '')}
            >
              <option value="">جميع الحالات</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && !data.items.length ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin" />
              جارٍ تحميل الطلبات...
            </div>
          ) : data.items.length ? (
            <div className="divide-y">
              {data.items.map((request) => {
                const risk = request.risk;
                const canCancel =
                  request.status === 'pending' &&
                  (supervisor || request.requestedById === currentUser?.uid);
                return (
                  <div key={request.id} className="space-y-3 p-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {risk?.riskNumber && <b className="font-mono text-xs">{risk.riskNumber}</b>}
                          <Badge variant="outline" className={statusClass[request.status]}>
                            {statusLabels[request.status]}
                          </Badge>
                          {risk?.residualLevel && (
                            <Badge variant="outline" className={levelClass[risk.residualLevel]}>
                              {levelLabels[risk.residualLevel]} · {risk.residualScore}/25
                            </Badge>
                          )}
                        </div>
                        <h3 className="mt-2 text-sm font-black">{risk?.title || 'خطر تشغيلي'}</h3>
                        <p className="mt-2 text-xs leading-6 text-slate-700">
                          <b>مبررات القبول:</b> {request.justification}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-muted-foreground">
                          <span>مقدم الطلب: <b className="text-foreground">{request.requestedByName}</b></span>
                          <span>تاريخ الطلب: <b className="text-foreground">{formatDateTime(request.createdAt)}</b></span>
                          <span>القبول المطلوب حتى: <b className="text-foreground">{formatDate(request.requestedUntil)}</b></span>
                          {risk?.ownerName && <span>مالك الخطر: <b className="text-foreground">{risk.ownerName}</b></span>}
                        </div>
                        {request.compensatingControls?.length ? (
                          <div className="mt-3 rounded-xl border bg-slate-50 p-3">
                            <p className="text-[10px] font-black">الضوابط التعويضية أثناء مدة القبول</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {request.compensatingControls.map((control, index) => (
                                <span key={index} className="rounded-full border bg-white px-2 py-1 text-[9px]">
                                  {control}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {request.reviewComment && (
                          <div className="mt-3 rounded-xl border bg-white p-3 text-[10px] leading-5">
                            <b>قرار المراجع:</b> {request.reviewComment}
                            {request.reviewedByName ? ' — ' + request.reviewedByName : ''}
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        {supervisor && request.status === 'pending' && (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-emerald-700 hover:bg-emerald-800"
                              disabled={saving}
                              onClick={() => openDecision(request, 'approved')}
                            >
                              <CheckCircle2 className="me-1 h-3.5 w-3.5" />
                              اعتماد القبول
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-800"
                              disabled={saving}
                              onClick={() => openDecision(request, 'rejected')}
                            >
                              <XCircle className="me-1 h-3.5 w-3.5" />
                              رفض
                            </Button>
                          </>
                        )}
                        {canCancel && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={saving}
                            onClick={() => void cancelRequest(request)}
                          >
                            إلغاء الطلب
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-muted-foreground">
              لا توجد طلبات قبول مخاطر ضمن الفلتر الحالي.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-sky-200 bg-sky-50/60">
        <CardContent className="flex items-start gap-3 p-4 text-xs leading-6 text-sky-950">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            النظام ينبه قبل انتهاء القبول بـ7 و3 و1 يوم، وعند الانتهاء يعيد الخطر تلقائيًا إلى حالة
            «تحت المراقبة» ويطلب إعادة التقييم. كما أن طلب القبول المعلق لأكثر من يومين يظهر للمشرفين كتذكير اعتماد.
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={requestOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setRequestOpen(open);
            if (!open) clearNavigationSeed();
          }
        }}
      >
        <DialogContent className="sm:max-w-[760px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>رفع طلب قبول خطر</DialogTitle>
            <DialogDescription>
              {navigationSeed
                ? navigationSeed.riskNumber + ' — ' + navigationSeed.title
                : 'حدد الخطر من سجل المخاطر أولًا.'}
            </DialogDescription>
          </DialogHeader>

          {navigationSeed && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <InfoBox label="الخطر المتبقي" value={navigationSeed.residualScore + '/25'} />
                <InfoBox label="المستوى" value={levelLabels[navigationSeed.residualLevel]} />
                <InfoBox label="داخل الشهية" value={navigationSeed.residualScore <= (navigationSeed.appetiteLimit ?? 9) ? 'نعم' : 'لا'} />
                <InfoBox label="حد الفئة" value={(navigationSeed.appetiteLimit ?? 9) + '/25'} />
              </div>
              <div className="space-y-2">
                <Label>مبررات قبول الخطر *</Label>
                <Textarea
                  rows={5}
                  value={justification}
                  onChange={(event) => setJustification(event.target.value)}
                  placeholder="وضح لماذا يتعذر خفض الخطر أكثر، وما المصلحة التشغيلية من قبوله مؤقتًا..."
                />
              </div>
              <div className="space-y-2">
                <Label>الضوابط التعويضية أثناء مدة القبول</Label>
                <Textarea
                  rows={4}
                  value={controls}
                  onChange={(event) => setControls(event.target.value)}
                  placeholder="كل ضابط في سطر مستقل. إلزامي إذا كان الخطر خارج شهية المخاطر."
                />
              </div>
              <div className="space-y-2">
                <Label>تاريخ انتهاء القبول *</Label>
                <Input
                  type="date"
                  value={requestedUntil}
                  onChange={(event) => setRequestedUntil(event.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">الحد الأعلى للقبول المؤقت: سنة واحدة.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setRequestOpen(false)}>
              إلغاء
            </Button>
            <Button type="button" disabled={saving || !navigationSeed} onClick={() => void submitRequest()}>
              <Save className="me-1 h-4 w-4" />
              {saving ? 'جارٍ الإرسال...' : 'رفع للاعتماد'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={decisionOpen} onOpenChange={(open) => !saving && setDecisionOpen(open)}>
        <DialogContent className="sm:max-w-[650px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>{decision === 'approved' ? 'اعتماد قبول الخطر' : 'رفض طلب قبول الخطر'}</DialogTitle>
            <DialogDescription>
              {selected?.risk?.riskNumber} — {selected?.risk?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selected && decision === 'approved' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950">
                سيصبح الخطر «مقبولًا» حتى {formatDate(selected.requestedUntil)}، ثم يعيده النظام تلقائيًا إلى المراقبة لإعادة التقييم.
              </div>
            )}
            <div className="space-y-2">
              <Label>ملاحظة قرار الاعتماد *</Label>
              <Textarea
                rows={5}
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder={decision === 'approved' ? 'مبررات الاعتماد والشروط...' : 'سبب رفض طلب القبول...'}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" disabled={saving} onClick={() => setDecisionOpen(false)}>
              تراجع
            </Button>
            <Button
              type="button"
              disabled={saving}
              className={decision === 'rejected' ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-700 hover:bg-emerald-800'}
              onClick={() => void saveDecision()}
            >
              {decision === 'approved' ? <CheckCircle2 className="me-1 h-4 w-4" /> : <XCircle className="me-1 h-4 w-4" />}
              {saving ? 'جارٍ الحفظ...' : decision === 'approved' ? 'اعتماد' : 'رفض'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
  <Card className={danger ? 'border-red-200 bg-red-50/70' : warning ? 'border-amber-200 bg-amber-50/70' : success ? 'border-emerald-200 bg-emerald-50/70' : ''}>
    <CardHeader className="pb-2">
      <CardTitle className="text-xs">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className={'text-3xl font-black ' + (danger ? 'text-red-700' : warning ? 'text-amber-800' : success ? 'text-emerald-700' : '')}>
        {value.toLocaleString('ar-SA')}
      </p>
    </CardContent>
  </Card>
);

const InfoBox = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-slate-50 p-3 text-center">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-black">{value}</p>
  </div>
);

export default TransactionRiskAcceptancePage;
