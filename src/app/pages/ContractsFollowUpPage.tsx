import React from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, FileWarning, RefreshCcw, Save } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  getContractFollowUps,
  saveContractFollowUp,
  type ContractFollowUpInput,
  type ContractFollowUpRecord,
  type ContractFollowUpStatus,
} from '../api/contractsFollowUp';

type ContractItem = {
  key: string;
  id: string;
  source: string;
  direction: string;
  contractNumber: string;
  party: string;
  subject: string;
  startDate?: Date | null;
  endDate?: Date | null;
  endDateKnown: boolean;
  daysRemaining: number | null;
};

const MS_DAY = 86400000;

const parseDurationMonths = (value?: string | null) => {
  if (!value) return null;
  const text = String(value).trim().toLowerCase();
  const years = text.match(/(\d+(?:\.\d+)?)\s*(?:سنة|سنوات|عام|أعوام|year|years)/);
  const months = text.match(/(\d+(?:\.\d+)?)\s*(?:شهر|أشهر|month|months)/);
  const numericOnly = text.match(/^\d+(?:\.\d+)?$/);
  if (years) return Math.round(Number(years[1]) * 12);
  if (months) return Math.round(Number(months[1]));
  if (numericOnly) return Math.round(Number(numericOnly[0]) * 12);
  return null;
};

const toDate = (value: any) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const deriveEndDate = (record: any) => {
  const explicit = toDate(record.contractEndDate || record.endDate || record.expiryDate);
  if (explicit) return explicit;

  const start = toDate(record.contractStartDate || record.startDate);
  const months = parseDurationMonths(record.contractDuration);
  if (!start || !months || start.getFullYear() < 1900) return null;

  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  return end;
};

const formatDate = (value?: Date | null) =>
  value
    ? new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(value)
    : 'غير محدد';

const statusLabel: Record<ContractFollowUpStatus, string> = {
  not_started: 'لم تبدأ المتابعة',
  in_progress: 'تحت الإجراء',
  renewed: 'تم التجديد',
  not_renewing: 'عدم التجديد',
  closed: 'مغلق',
};

const urgency = (days: number | null) => {
  if (days === null) return { label: 'بيانات ناقصة', className: 'border-slate-300 bg-slate-50 text-slate-700' };
  if (days < 0) return { label: 'منتهي', className: 'border-red-300 bg-red-50 text-red-700' };
  if (days <= 30) return { label: 'حرج', className: 'border-red-300 bg-red-50 text-red-700' };
  if (days <= 90) return { label: 'عاجل', className: 'border-orange-300 bg-orange-50 text-orange-700' };
  if (days <= 180) return { label: 'بدأت المتابعة', className: 'border-amber-300 bg-amber-50 text-amber-800' };
  return { label: 'ساري', className: 'border-emerald-300 bg-emerald-50 text-emerald-700' };
};

export const ContractsFollowUpPage: React.FC = () => {
  const { leasedLandsOut, leasedLandsIn, leasedBuildingsOut, leasedBuildingsIn, loading } = useData();
  const { isAdmin, hasPermission } = usePermissions();
  const canEdit = isAdmin || hasPermission('contracts_follow_up', 'canEdit');
  const [followUps, setFollowUps] = React.useState<Record<string, ContractFollowUpRecord>>({});
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'followup' | 'expired' | 'missing'>('followup');
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<ContractFollowUpInput>({ status: 'not_started', assignedTo: '', action: '', notes: '', nextFollowUpDate: '' });

  const contracts = React.useMemo<ContractItem[]>(() => {
    const now = new Date();
    const make = (records: any[], source: string, direction: string, partyKey: 'tenant' | 'owner', subjectBuilder: (r: any) => string) =>
      records.map((record) => {
        const endDate = deriveEndDate(record);
        return {
          key: `${source}:${record.id}`,
          id: record.id,
          source,
          direction,
          contractNumber: record.contractNumber || '-',
          party: record?.[partyKey]?.name || '-',
          subject: subjectBuilder(record),
          startDate: toDate(record.contractStartDate),
          endDate,
          endDateKnown: Boolean(endDate),
          daysRemaining: endDate ? Math.ceil((endDate.getTime() - now.getTime()) / MS_DAY) : null,
        } as ContractItem;
      });

    return [
      ...make(leasedLandsOut as any[], 'leased-lands-out', 'الجامعة مؤجِّر', 'tenant', (r) => `أرض ${r.location || r.plotNumber || ''}`.trim()),
      ...make(leasedLandsIn as any[], 'leased-lands-in', 'الجامعة مستأجر', 'owner', (r) => r.propertyDescription || r.location || 'أرض مستأجرة'),
      ...make(leasedBuildingsOut as any[], 'leased-buildings-out', 'الجامعة مؤجِّر', 'tenant', (r) => r.locationName || `مبنى ${r.buildingNumber || ''}`),
      ...make(leasedBuildingsIn as any[], 'leased-buildings-in', 'الجامعة مستأجر', 'owner', (r) => r.locationName || `مبنى ${r.buildingNumber || ''}`),
    ].sort((a, b) => (a.daysRemaining ?? 999999) - (b.daysRemaining ?? 999999));
  }, [leasedLandsOut, leasedLandsIn, leasedBuildingsOut, leasedBuildingsIn]);

  const loadFollowUps = React.useCallback(async () => {
    try {
      const rows = await getContractFollowUps();
      setFollowUps(Object.fromEntries(rows.map((row) => [row.contractKey, row])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل متابعات العقود');
    }
  }, []);

  React.useEffect(() => { loadFollowUps(); }, [loadFollowUps]);

  const visibleContracts = contracts.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'expired') return item.daysRemaining !== null && item.daysRemaining < 0;
    if (filter === 'missing') return item.daysRemaining === null;
    return item.daysRemaining !== null && item.daysRemaining <= 180 && item.daysRemaining >= 0;
  });

  const selected = contracts.find((item) => item.key === selectedKey) || null;

  const openFollowUp = (item: ContractItem) => {
    const existing = followUps[item.key];
    setSelectedKey(item.key);
    setForm({
      status: existing?.status || 'not_started',
      assignedTo: existing?.assignedTo || '',
      action: existing?.action || '',
      notes: existing?.notes || '',
      nextFollowUpDate: existing?.nextFollowUpDate ? existing.nextFollowUpDate.slice(0, 10) : '',
    });
    setTimeout(() => document.getElementById('contract-followup-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
  };

  const save = async () => {
    if (!selected) return;
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لتعديل متابعة العقود.');
      return;
    }
    try {
      setSaving(true);
      const saved = await saveContractFollowUp(selected.key, form);
      setFollowUps((current) => ({ ...current, [saved.contractKey]: saved }));
      toast.success('تم حفظ إجراء متابعة العقد');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ المتابعة');
    } finally {
      setSaving(false);
    }
  };

  const withinSixMonths = contracts.filter((x) => x.daysRemaining !== null && x.daysRemaining >= 0 && x.daysRemaining <= 180).length;
  const expired = contracts.filter((x) => x.daysRemaining !== null && x.daysRemaining < 0).length;
  const missing = contracts.filter((x) => x.daysRemaining === null).length;
  const completed = Object.values(followUps).filter((x) => x.status === 'renewed' || x.status === 'closed' || x.status === 'not_renewing').length;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section className="rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-[0_16px_48px_rgba(15,23,42,.08)] backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary"><CalendarClock className="h-4 w-4" />إدارة العقود</div>
            <h1 className="text-2xl font-black sm:text-3xl">متابعة انتهاء العقود</h1>
            <p className="mt-2 text-sm text-muted-foreground">تبدأ المتابعة تلقائيًا قبل انتهاء العقد بـ 6 أشهر، مع تصعيد الأولوية كلما اقترب تاريخ الانتهاء.</p>
          </div>
          <Button variant="outline" onClick={loadFollowUps}><RefreshCcw className="ml-2 h-4 w-4" />تحديث المتابعات</Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Summary title="ضمن 6 أشهر" value={withinSixMonths} icon={<Clock3 className="h-5 w-5" />} />
        <Summary title="عقود منتهية" value={expired} icon={<AlertTriangle className="h-5 w-5" />} />
        <Summary title="تحتاج استكمال تاريخ" value={missing} icon={<FileWarning className="h-5 w-5" />} />
        <Summary title="إجراءات مكتملة" value={completed} icon={<CheckCircle2 className="h-5 w-5" />} />
      </div>

      <Card className="rounded-[28px] border-white/60 bg-white/75 shadow-md">
        <CardHeader className="border-b"><CardTitle>قائمة متابعة العقود</CardTitle></CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Button variant={filter === 'followup' ? 'default' : 'outline'} onClick={() => setFilter('followup')}>قبل 6 أشهر</Button>
            <Button variant={filter === 'expired' ? 'default' : 'outline'} onClick={() => setFilter('expired')}>المنتهية</Button>
            <Button variant={filter === 'missing' ? 'default' : 'outline'} onClick={() => setFilter('missing')}>بيانات ناقصة</Button>
            <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>جميع العقود</Button>
          </div>

          {loading ? <div className="py-10 text-center text-sm text-muted-foreground">جارٍ تحميل العقود...</div> : visibleContracts.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">لا توجد عقود ضمن هذه الفئة.</div> : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {visibleContracts.map((item) => {
                const state = urgency(item.daysRemaining);
                const follow = followUps[item.key];
                return <button key={item.key} type="button" onClick={() => openFollowUp(item)} className="rounded-2xl border bg-background/70 p-4 text-right transition hover:border-primary/50 hover:shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><p className="font-black">عقد رقم {item.contractNumber}</p><p className="mt-1 text-xs text-muted-foreground">{item.direction} • {item.party}</p></div>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${state.className}`}>{state.label}</span>
                  </div>
                  <p className="mt-3 text-sm">{item.subject}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <span>الانتهاء: <b className="text-foreground">{formatDate(item.endDate)}</b></span>
                    <span>المتبقي: <b className="text-foreground">{item.daysRemaining === null ? '-' : item.daysRemaining < 0 ? `منتهي منذ ${Math.abs(item.daysRemaining)} يوم` : `${item.daysRemaining} يوم`}</b></span>
                    <span>المتابعة: <b className="text-foreground">{follow ? statusLabel[follow.status] : 'لم تبدأ'}</b></span>
                  </div>
                </button>;
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card id="contract-followup-form" className="rounded-[28px] border-primary/20 bg-white/80 shadow-lg">
          <CardHeader className="border-b"><CardTitle>إجراء متابعة — عقد {selected.contractNumber}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div><Label>حالة المتابعة</Label><NativeSelect disabled={!canEdit} value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as ContractFollowUpStatus }))}><option value="not_started">لم تبدأ المتابعة</option><option value="in_progress">تحت الإجراء</option><option value="renewed">تم التجديد</option><option value="not_renewing">عدم التجديد</option><option value="closed">مغلق</option></NativeSelect></div>
            <div><Label>المسؤول عن المتابعة</Label><Input disabled={!canEdit} value={form.assignedTo || ''} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))} placeholder="اسم الموظف أو الجهة" /></div>
            <div><Label>الإجراء المطلوب</Label><Input disabled={!canEdit} value={form.action || ''} onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))} placeholder="مثال: مخاطبة المستأجر بشأن التجديد" /></div>
            <div><Label>موعد المتابعة القادم</Label><Input disabled={!canEdit} type="date" value={form.nextFollowUpDate || ''} onChange={(e) => setForm((p) => ({ ...p, nextFollowUpDate: e.target.value }))} /></div>
            <div className="md:col-span-2"><Label>ملاحظات المتابعة</Label><Textarea disabled={!canEdit} rows={4} value={form.notes || ''} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="سجل آخر تواصل، ما تم اتخاذه، والقرار المتوقع..." /></div>
            <div className="md:col-span-2 flex flex-wrap gap-2"><Button onClick={save} disabled={saving || !canEdit}><Save className="ml-2 h-4 w-4" />{saving ? 'جارٍ الحفظ...' : canEdit ? 'حفظ إجراء المتابعة' : 'عرض فقط'}</Button><Button variant="outline" onClick={() => setSelectedKey(null)}>إغلاق</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Summary = ({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) => (
  <Card className="rounded-2xl border-white/60 bg-white/75"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-2xl font-black">{value}</p></div><div className="rounded-xl border bg-background/80 p-2">{icon}</div></CardContent></Card>
);
