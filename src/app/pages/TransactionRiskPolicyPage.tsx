import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  History,
  RefreshCw,
  Save,
  Settings2,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  transactionRiskApi,
  type TransactionRiskCategory,
  type TransactionRiskCategoryAppetite,
  type TransactionRiskKriKey,
  type TransactionRiskKriThreshold,
  type TransactionRiskPolicy,
  type TransactionRiskPolicyProposalInput,
  type TransactionRiskPolicyResponse,
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
import { Textarea } from '../components/ui/textarea';

const categoryLabels: Record<TransactionRiskCategory, string> = {
  operational: 'تشغيلي',
  process: 'إجرائي',
  workload: 'ضغط عمل',
  compliance: 'امتثال',
  technology: 'تقني',
  data: 'بيانات',
  financial: 'مالي',
  reputational: 'سمعة',
  other: 'أخرى',
};

const kriMeta: Record<TransactionRiskKriKey, { label: string; unit: string; hint: string }> = {
  outsideAppetiteRate: { label: 'المخاطر خارج الشهية', unit: '%', hint: 'كلما ارتفعت النسبة زاد الخطر.' },
  criticalRisks: { label: 'المخاطر الحرجة', unit: 'خطر', hint: 'عدد المخاطر الحرجة النشطة.' },
  overdueReviewRate: { label: 'تأخر مراجعة المخاطر', unit: '%', hint: 'نسبة المراجعات المتجاوزة للموعد.' },
  recurringRiskRate: { label: 'تكرار المخاطر', unit: '%', hint: 'نسبة المخاطر التي سجل لها تكرار.' },
  riskReduction: { label: 'فعالية خفض المخاطر', unit: '%', hint: 'كلما انخفضت النسبة زاد الخطر.' },
  preventiveFailureRate: { label: 'فشل التدخلات الوقائية', unit: '%', hint: 'نسبة التدخلات التي لم تحقق الهدف.' },
  predictedBreaches: { label: 'تجاوزات KPI المتوقعة', unit: 'مؤشر', hint: 'مؤشرات متوقع انتقالها للأحمر.' },
  capaOverdue: { label: 'CAPA المتأخرة', unit: 'خطة', hint: 'خطط التحسين المتجاوزة للاستحقاق.' },
  pendingRiskAcceptances: { label: 'طلبات قبول معلقة', unit: 'طلب', hint: 'طلبات القبول بانتظار القرار.' },
  expiringRiskAcceptances: { label: 'قبول يقترب من الانتهاء', unit: 'خطر', hint: 'قبول مخاطر ينتهي خلال 7 أيام.' },
};

const kriKeys = Object.keys(kriMeta) as TransactionRiskKriKey[];
const categoryKeys = Object.keys(categoryLabels) as TransactionRiskCategory[];

const formatDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : '—';

const todayInput = () => new Date().toISOString().slice(0, 10);

const policyStatusLabel = (status: TransactionRiskPolicy['status']) => {
  if (status === 'approved') return 'معتمد';
  if (status === 'pending') return 'بانتظار الاعتماد';
  if (status === 'rejected') return 'مرفوض';
  if (status === 'cancelled') return 'ملغى';
  return 'افتراضي';
};

const policyStatusClass = (status: TransactionRiskPolicy['status']) => {
  if (status === 'approved') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  if (status === 'pending') return 'border-amber-300 bg-amber-50 text-amber-900';
  if (status === 'rejected') return 'border-red-300 bg-red-50 text-red-800';
  return 'border-slate-300 bg-slate-50 text-slate-700';
};

const EMPTY: TransactionRiskPolicyResponse = {
  generatedAt: '',
  supervisor: false,
  current: {
    id: null,
    versionNumber: 0,
    name: '',
    statement: '',
    appetiteMaxScore: 9,
    categoryAppetite: {
      operational: 9,
      process: 9,
      workload: 9,
      compliance: 9,
      technology: 9,
      data: 9,
      financial: 9,
      reputational: 9,
      other: 9,
    },
    kriThresholds: {
      outsideAppetiteRate: { direction: 'max', target: 10, warning: 10, danger: 25 },
      criticalRisks: { direction: 'max', target: 0, warning: 1, danger: 3 },
      overdueReviewRate: { direction: 'max', target: 10, warning: 10, danger: 20 },
      recurringRiskRate: { direction: 'max', target: 10, warning: 10, danger: 20 },
      riskReduction: { direction: 'min', target: 30, warning: 30, danger: 15 },
      preventiveFailureRate: { direction: 'max', target: 15, warning: 15, danger: 30 },
      predictedBreaches: { direction: 'max', target: 0, warning: 1, danger: 2 },
      capaOverdue: { direction: 'max', target: 0, warning: 1, danger: 3 },
      pendingRiskAcceptances: { direction: 'max', target: 0, warning: 1, danger: 4 },
      expiringRiskAcceptances: { direction: 'max', target: 0, warning: 1, danger: 3 },
    },
    effectiveFrom: null,
    effectiveTo: null,
    status: 'default',
    changeReason: '',
    proposedByName: 'النظام',
  },
  pending: [],
  history: [],
  defaults: {} as TransactionRiskPolicy,
};

type Draft = TransactionRiskPolicyProposalInput;

const toDraft = (policy: TransactionRiskPolicy): Draft => ({
  name: policy.versionNumber === 0 ? 'سياسة شهية المخاطر التشغيلية' : policy.name,
  statement: policy.statement,
  appetiteMaxScore: policy.appetiteMaxScore,
  categoryAppetite: { ...policy.categoryAppetite },
  kriThresholds: Object.fromEntries(
    kriKeys.map((key) => [key, { ...policy.kriThresholds[key] }]),
  ) as Record<TransactionRiskKriKey, TransactionRiskKriThreshold>,
  effectiveFrom: todayInput(),
  changeReason: '',
});

export const TransactionRiskPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { isAdmin, hasPermission } = usePermissions();
  const supervisor = isAdmin || hasPermission('transaction_follow_up', 'canDelete');
  const [data, setData] = React.useState<TransactionRiskPolicyResponse>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [proposalOpen, setProposalOpen] = React.useState(false);
  const [decisionOpen, setDecisionOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<TransactionRiskPolicy | null>(null);
  const [decision, setDecision] = React.useState<'approved' | 'rejected'>('approved');
  const [reviewComment, setReviewComment] = React.useState('');
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(EMPTY.current));

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setData(await transactionRiskApi.policy());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل سياسة شهية المخاطر');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const openProposal = () => {
    setDraft(toDraft(data.current));
    setProposalOpen(true);
  };

  const updateCategory = (key: TransactionRiskCategory, value: number) => {
    setDraft((current) => ({
      ...current,
      categoryAppetite: { ...current.categoryAppetite, [key]: value },
    }));
  };

  const updateKri = (key: TransactionRiskKriKey, field: 'target' | 'warning' | 'danger', value: number) => {
    setDraft((current) => ({
      ...current,
      kriThresholds: {
        ...current.kriThresholds,
        [key]: { ...current.kriThresholds[key], [field]: value },
      },
    }));
  };

  const submitProposal = async () => {
    if (draft.name.trim().length < 3 || draft.statement.trim().length < 10 || draft.changeReason.trim().length < 5) {
      toast.error('أكمل اسم السياسة وبيان الشهية ومبرر التعديل');
      return;
    }
    try {
      setSaving(true);
      await transactionRiskApi.proposePolicy({
        ...draft,
        name: draft.name.trim(),
        statement: draft.statement.trim(),
        changeReason: draft.changeReason.trim(),
      });
      toast.success('تم رفع مقترح سياسة المخاطر إلى مسار الاعتماد');
      setProposalOpen(false);
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع مقترح السياسة');
    } finally {
      setSaving(false);
    }
  };

  const openDecision = (proposal: TransactionRiskPolicy, nextDecision: 'approved' | 'rejected') => {
    setSelected(proposal);
    setDecision(nextDecision);
    setReviewComment(nextDecision === 'approved'
      ? 'تمت مراجعة حدود شهية المخاطر وKRI وتاريخ السريان، ويعتمد الإصدار وفق الضوابط المحددة.'
      : '');
    setDecisionOpen(true);
  };

  const saveDecision = async () => {
    if (!selected?.id || reviewComment.trim().length < 3) {
      toast.error('اكتب ملاحظة قرار الاعتماد');
      return;
    }
    try {
      setSaving(true);
      await transactionRiskApi.decidePolicy(selected.id, {
        decision,
        reviewComment: reviewComment.trim(),
      });
      toast.success(decision === 'approved' ? 'تم اعتماد إصدار سياسة المخاطر' : 'تم رفض مقترح السياسة');
      setDecisionOpen(false);
      setSelected(null);
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ قرار السياسة');
    } finally {
      setSaving(false);
    }
  };

  const cancelProposal = async (proposal: TransactionRiskPolicy) => {
    if (!proposal.id) return;
    try {
      setSaving(true);
      await transactionRiskApi.cancelPolicy(proposal.id);
      toast.success('تم إلغاء مقترح السياسة');
      window.dispatchEvent(new CustomEvent('iau-notifications-changed'));
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إلغاء مقترح السياسة');
    } finally {
      setSaving(false);
    }
  };

  const current = data.current;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate('/follow-up/risks')}>
            <ArrowRight className="me-2 h-4 w-4" />
            سجل المخاطر التشغيلية
          </Button>
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-800">
            <Settings2 className="h-4 w-4" />
            حوكمة منهجية المخاطر
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">شهية المخاطر وإعدادات KRI</h1>
          <p className="mt-2 max-w-5xl text-sm leading-7 text-muted-foreground">
            إدارة رسمية لحدود شهية المخاطر ومؤشرات الإنذار الرئيسية، مع إصدار وتاريخ سريان ومسار اعتماد وسجل تاريخي كامل.
            أي تعديل لا يؤثر على النظام إلا بعد اعتماده ودخول تاريخ السريان.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate('/follow-up/risks/executive')}>
            <ShieldAlert className="me-2 h-4 w-4" />
            لوحة المخاطر التنفيذية
          </Button>
          <Button variant="outline" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={'me-2 h-4 w-4 ' + (loading ? 'animate-spin' : '')} />
            تحديث
          </Button>
          {supervisor && (
            <Button disabled={data.pending.length > 0} onClick={openProposal}>
              <Settings2 className="me-2 h-4 w-4" />
              اقتراح تعديل
            </Button>
          )}
        </div>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck2 className="h-5 w-5 text-emerald-700" />
                السياسة السارية حاليًا
              </CardTitle>
              <p className="mt-2 text-sm font-black">{current.name || 'جارٍ تحميل السياسة...'}</p>
              <p className="mt-2 max-w-5xl text-xs leading-6 text-muted-foreground">{current.statement}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={policyStatusClass(current.status)}>{policyStatusLabel(current.status)}</Badge>
              <Badge variant="outline">الإصدار {current.versionNumber}</Badge>
              <Badge variant="outline">السريان: {formatDate(current.effectiveFrom)}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <InfoCard label="الحد العام للخطر المتبقي" value={current.appetiteMaxScore + '/25'} />
            <InfoCard label="الفئات المخصصة" value={String(categoryKeys.filter((key) => current.categoryAppetite[key] !== current.appetiteMaxScore).length)} />
            <InfoCard label="عدد KRI المحكومة" value={String(kriKeys.length)} />
            <InfoCard label="الإصدار" value={'v' + current.versionNumber} />
            <InfoCard label="آخر اعتماد" value={formatDate(current.decisionAt)} />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-black">حدود شهية المخاطر حسب الفئة</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {categoryKeys.map((key) => (
                <div key={key} className="rounded-xl border bg-slate-50 px-3 py-3">
                  <p className="text-[10px] text-muted-foreground">{categoryLabels[key]}</p>
                  <p className="mt-1 text-lg font-black">{current.categoryAppetite[key]}/25</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-black">حدود مؤشرات KRI المعتمدة</h2>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[860px] text-right text-xs">
                <thead className="bg-slate-50 text-[10px] text-slate-600">
                  <tr><th className="p-3">المؤشر</th><th className="p-3">الاتجاه</th><th className="p-3">المستهدف</th><th className="p-3">تنبيه أصفر</th><th className="p-3">خطر أحمر</th><th className="p-3">الوحدة</th></tr>
                </thead>
                <tbody className="divide-y">
                  {kriKeys.map((key) => {
                    const threshold = current.kriThresholds[key];
                    return (
                      <tr key={key}>
                        <td className="p-3"><b>{kriMeta[key].label}</b><p className="mt-1 text-[10px] text-muted-foreground">{kriMeta[key].hint}</p></td>
                        <td className="p-3">{threshold.direction === 'max' ? 'الارتفاع أسوأ' : 'الانخفاض أسوأ'}</td>
                        <td className="p-3 font-black">{threshold.target}</td>
                        <td className="p-3 font-black text-amber-700">{threshold.warning}</td>
                        <td className="p-3 font-black text-red-700">{threshold.danger}</td>
                        <td className="p-3">{kriMeta[key].unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {supervisor && data.pending.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Clock3 className="h-5 w-5 text-amber-700" />مقترح بانتظار الاعتماد</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.pending.map((proposal) => (
              <div key={proposal.id || proposal.versionNumber} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={policyStatusClass(proposal.status)}>{policyStatusLabel(proposal.status)}</Badge>
                      <Badge variant="outline">الإصدار {proposal.versionNumber}</Badge>
                      <Badge variant="outline">السريان المقترح {formatDate(proposal.effectiveFrom)}</Badge>
                    </div>
                    <h3 className="mt-2 font-black">{proposal.name}</h3>
                    <p className="mt-2 text-xs leading-6 text-slate-700">{proposal.statement}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      مقدم المقترح: <b className="text-foreground">{proposal.proposedByName}</b>
                      {' · '}مبرر التعديل: <b className="text-foreground">{proposal.changeReason}</b>
                    </p>
                    {proposal.proposedById === currentUser?.uid && (
                      <p className="mt-2 text-[10px] text-amber-800">أنت مقدم المقترح؛ يطبق النظام فصل مقدم التعديل عن المعتمد عند وجود مشرف آخر.</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={saving} onClick={() => openDecision(proposal, 'approved')}>
                      <CheckCircle2 className="me-1 h-4 w-4" />اعتماد
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-300 text-red-800" disabled={saving} onClick={() => openDecision(proposal, 'rejected')}>
                      <XCircle className="me-1 h-4 w-4" />رفض
                    </Button>
                    <Button size="sm" variant="ghost" disabled={saving} onClick={() => void cancelProposal(proposal)}>إلغاء المقترح</Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><History className="h-5 w-5" />سجل إصدارات السياسة</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.history.length ? (
            <div className="divide-y">
              {data.history.map((item) => (
                <div key={item.id || item.versionNumber} className="flex flex-col gap-2 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <b>v{item.versionNumber} — {item.name}</b>
                      <Badge variant="outline" className={policyStatusClass(item.status)}>{policyStatusLabel(item.status)}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      السريان {formatDate(item.effectiveFrom)}{item.effectiveTo ? ' إلى ' + formatDate(item.effectiveTo) : ''}
                      {' · '}الحد العام {item.appetiteMaxScore}/25{' · '}المقترح بواسطة {item.proposedByName}
                    </p>
                    {item.reviewComment && <p className="mt-1 text-[10px] text-slate-600">قرار الاعتماد: {item.reviewComment}</p>}
                  </div>
                  <div className="text-[10px] text-muted-foreground">القرار: {formatDate(item.decisionAt)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-xs text-muted-foreground">لم تعتمد إصدارات رسمية بعد؛ يعمل النظام حاليًا بالإعداد الافتراضي.</div>
          )}
        </CardContent>
      </Card>

      <Dialog open={proposalOpen} onOpenChange={(open) => !saving && setProposalOpen(open)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-[1050px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>اقتراح إصدار جديد لسياسة المخاطر</DialogTitle>
            <DialogDescription>لن تصبح القيم فعالة فور الحفظ؛ سترفع كمقترح وتدخل مسار الاعتماد، ثم تطبق تلقائيًا في تاريخ السريان.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="اسم السياسة *"><Input value={draft.name} onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))} /></Field>
              <Field label="تاريخ السريان *"><Input type="date" min={todayInput()} value={draft.effectiveFrom} onChange={(e) => setDraft((v) => ({ ...v, effectiveFrom: e.target.value }))} /></Field>
              <div className="space-y-2 sm:col-span-2"><Label>بيان شهية المخاطر *</Label><Textarea rows={3} value={draft.statement} onChange={(e) => setDraft((v) => ({ ...v, statement: e.target.value }))} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>مبرر التعديل *</Label><Textarea rows={3} value={draft.changeReason} onChange={(e) => setDraft((v) => ({ ...v, changeReason: e.target.value }))} placeholder="سبب تغيير الحدود أو المؤشرات وأثره المتوقع..." /></div>
            </div>

            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <Field label="الحد العام للخطر المتبقي 1-25"><Input type="number" min={1} max={25} value={draft.appetiteMaxScore} onChange={(e) => setDraft((v) => ({ ...v, appetiteMaxScore: Number(e.target.value) }))} /></Field>
                <Button type="button" variant="outline" onClick={() => setDraft((v) => ({
                  ...v,
                  categoryAppetite: Object.fromEntries(categoryKeys.map((key) => [key, v.appetiteMaxScore])) as TransactionRiskCategoryAppetite,
                }))}>تطبيق الحد العام على جميع الفئات</Button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categoryKeys.map((key) => <Field key={key} label={categoryLabels[key]}><Input type="number" min={1} max={25} value={draft.categoryAppetite[key]} onChange={(e) => updateCategory(key, Number(e.target.value))} /></Field>)}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-black">حدود KRI</h3>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[920px] text-right text-xs">
                  <thead className="bg-slate-50 text-[10px] text-slate-600"><tr><th className="p-3">المؤشر</th><th className="p-3">الاتجاه</th><th className="p-3">المستهدف</th><th className="p-3">الأصفر</th><th className="p-3">الأحمر</th><th className="p-3">الوحدة</th></tr></thead>
                  <tbody className="divide-y">
                    {kriKeys.map((key) => {
                      const threshold = draft.kriThresholds[key];
                      return (
                        <tr key={key}>
                          <td className="p-3"><b>{kriMeta[key].label}</b><p className="mt-1 text-[10px] text-muted-foreground">{kriMeta[key].hint}</p></td>
                          <td className="p-3">{threshold.direction === 'max' ? 'الارتفاع أسوأ' : 'الانخفاض أسوأ'}</td>
                          <td className="p-3"><Input type="number" value={threshold.target} onChange={(e) => updateKri(key, 'target', Number(e.target.value))} /></td>
                          <td className="p-3"><Input type="number" value={threshold.warning} onChange={(e) => updateKri(key, 'warning', Number(e.target.value))} /></td>
                          <td className="p-3"><Input type="number" value={threshold.danger} onChange={(e) => updateKri(key, 'danger', Number(e.target.value))} /></td>
                          <td className="p-3">{kriMeta[key].unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-muted-foreground">
                للمؤشرات التي يكون الارتفاع فيها سلبيًا: الأحمر يجب أن يساوي أو يتجاوز الأصفر. أما فعالية خفض المخاطر فالاتجاه عكسي، ويصبح الانخفاض هو الحالة الأسوأ.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" disabled={saving} onClick={() => setProposalOpen(false)}>إلغاء</Button>
            <Button disabled={saving} onClick={() => void submitProposal()}><Save className="me-1 h-4 w-4" />{saving ? 'جارٍ الرفع...' : 'رفع للاعتماد'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={decisionOpen} onOpenChange={(open) => !saving && setDecisionOpen(open)}>
        <DialogContent className="sm:max-w-[680px]" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle>{decision === 'approved' ? 'اعتماد إصدار سياسة المخاطر' : 'رفض مقترح السياسة'}</DialogTitle>
            <DialogDescription>الإصدار {selected?.versionNumber} — {selected?.name}</DialogDescription>
          </DialogHeader>
          {selected && decision === 'approved' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950">
              عند الاعتماد ستدخل السياسة حيز التطبيق في {formatDate(selected.effectiveFrom)}، وستستخدم حدود الفئات وKRI الجديدة تلقائيًا في لوحة المخاطر وطلبات قبول المخاطر.
            </div>
          )}
          <div className="space-y-2"><Label>ملاحظة قرار الاعتماد *</Label><Textarea rows={5} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder={decision === 'approved' ? 'مبررات الاعتماد وأي شروط تنفيذية...' : 'سبب رفض المقترح...'} /></div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" disabled={saving} onClick={() => setDecisionOpen(false)}>تراجع</Button>
            <Button disabled={saving} className={decision === 'approved' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'} onClick={() => void saveDecision()}>
              {decision === 'approved' ? <CheckCircle2 className="me-1 h-4 w-4" /> : <XCircle className="me-1 h-4 w-4" />}
              {saving ? 'جارٍ الحفظ...' : decision === 'approved' ? 'اعتماد الإصدار' : 'رفض'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="space-y-2"><Label>{label}</Label>{children}</div>;
const InfoCard = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl border bg-slate-50 p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-black">{value}</p></div>;

export default TransactionRiskPolicyPage;
