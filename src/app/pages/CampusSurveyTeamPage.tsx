import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, ClipboardCheck, LandPlot, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';
import { apiJson } from '../../lib/http';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { NativeSelect } from '../components/ui/native-select';
import { Input } from '../components/ui/input';

type SurveyStatus = 'pending' | 'in_progress' | 'submitted' | 'returned' | 'completed';
type Member = {
  code: string;
  fullName: string;
  role: 'member' | 'leader';
  campusName: string | null;
  userId: string | null;
  status: SurveyStatus;
  notes: string | null;
  startedAt: string | null;
  completedAt: string | null;
};
type TeamResponse = { members: Member[]; viewerRole: string; canManage: boolean };
type Account = { id: string; username: string; email: string };
type Metric = {
  code: string;
  buildings: number;
  inspections: number;
  vacantLands: number | null;
  countsAreProvisional: true;
};

const STATUS: Record<SurveyStatus, string> = {
  pending: 'بانتظار البدء',
  in_progress: 'قيد التنفيذ',
  submitted: 'مرفوع للمراجعة',
  returned: 'معاد للاستكمال',
  completed: 'مكتمل ومعتمد',
};
const STATUS_VALUES = Object.keys(STATUS) as SurveyStatus[];
const ASSIGNMENT_ORDER = ['LEAD', 'WEST', 'RAYYAN', 'EAST'];

export function CampusSurveyTeamPage({ embedded = false }: { embedded?: boolean }) {
  const { isAdmin } = usePermissions();
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, counts] = await Promise.all([
        apiJson<TeamResponse>('/api/campus-survey-team'),
        apiJson<Metric[]>('/api/campus-survey-team/metrics'),
      ]);
      setTeam(result);
      setMetrics(counts);
      setNotes(Object.fromEntries(result.members.map((m) => [m.code, m.notes || ''])));
      if (isAdmin) setAccounts(await apiJson<Account[]>('/api/campus-survey-team/accounts'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات فريق الحصر');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { void load(); }, [load]);

  const members = useMemo(
    () => [...(team?.members || [])].sort((a, b) =>
      ASSIGNMENT_ORDER.indexOf(a.code) - ASSIGNMENT_ORDER.indexOf(b.code)),
    [team],
  );

  const change = async (code: string, payload: { userId?: string | null; status?: SurveyStatus; notes?: string | null }) => {
    setBusy(code);
    try {
      await apiJson(`/api/campus-survey-team/${encodeURIComponent(code)}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      toast.success('تم تحديث التكليف');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تحديث التكليف');
    } finally {
      setBusy('');
    }
  };

  const initialize = async () => {
    setBusy('setup');
    try {
      await apiJson('/api/campus-survey-team/setup', { method: 'POST', body: '{}' });
      toast.success('تم إنشاء التكليفات المعتمدة دون ربط حسابات تلقائيًا');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تفعيل الفريق');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className={embedded ? "space-y-5" : "mx-auto max-w-7xl space-y-5 p-4 md:p-6"} dir="rtl">
      <header className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground"><Users className="h-7 w-7" />متابعة الحصر والتكليفات</h1>
            <p className="text-sm leading-7 text-muted-foreground">
              تكليف مستقل لكل حرم جامعي، بإشراف محمد المغربي. يشمل الحصر السجل المركزي للمباني والمعاينات والأراضي الشاغرة.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading || !!busy}>
            <RefreshCw className="ml-2 h-4 w-4" />تحديث
          </Button>
        </div>
      </header>

      <div className="rounded-xl border border-amber-400/50 bg-amber-400/10 p-4 text-sm leading-7 text-foreground">
        لا تشمل أعمال الحصر المنازل والأملاك المجاورة الواقعة خارج حدود ملكية الجامعة.
        الإحصاءات أدناه استرشادية من السجلات الحالية وليست نسب إنجاز أو دليلًا على اكتمال المعاينة.
        تفعيل صلاحيات الحرم على وحدات البيانات الثلاث يحتاج اختبارًا منفصلًا قبل تكليف الموظفين بالإدخال الفعلي.
      </div>

      {loading && !team && <p className="rounded-xl border p-5">جارٍ تحميل التكليفات...</p>}

      {!loading && team?.members.length === 0 && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>تأسيس فريق الحصر المعتمد</CardTitle>
            <CardDescription>ينشئ رئيس الفريق وثلاثة تكليفات وفق التوزيع المعتمد، دون افتراض حسابات المستخدمين.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void initialize()} disabled={!!busy}>
              {busy === 'setup' ? 'جارٍ التأسيس...' : 'تفعيل قائمة الفريق المعتمدة'}
            </Button>
          </CardContent>
        </Card>
      )}

      {members.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {members.map((member) => {
            const metric = metrics.find((m) => m.code === member.code);
            return (
              <Card key={member.code} className="border-2 shadow-sm">
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">{member.role === 'leader' ? 'رئيس الفريق' : member.campusName}</Badge>
                    <Badge variant="secondary">{STATUS[member.status]}</Badge>
                  </div>
                  <CardTitle className="text-lg">{member.fullName}</CardTitle>
                  <CardDescription>
                    {member.role === 'leader' ? 'المراجعة والتقارير والمتابعة لجميع المواقع' : 'حصر المباني والأراضي الشاغرة وإجراء المعاينات ضمن الحرم المكلف'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {member.role === 'member' && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'المباني', count: metric?.buildings, icon: Building2 },
                        { label: 'المعاينات المرتبطة بمبانٍ', count: metric?.inspections, icon: ClipboardCheck },
                        { label: 'الأراضي الشاغرة', count: metric?.vacantLands, icon: LandPlot },
                      ].map(({ label, count, icon: Icon }) => (
                        <div key={label} className="rounded-xl border bg-muted/30 p-3 text-center">
                          <Icon className="mx-auto mb-2 h-5 w-5" />
                          <p className="text-xl font-bold tabular-nums">{count == null ? '—' : count}</p>
                          <p className="text-xs leading-5 text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold">حساب الموظف المرتبط بالتكليف</label>
                    {isAdmin ? (
                      <NativeSelect
                        value={member.userId || ''}
                        onChange={(event) => void change(member.code, { userId: event.target.value || null })}
                        disabled={!!busy}
                        aria-label={`حساب ${member.fullName}`}
                      >
                        <option value="">لم يربط بحساب بعد</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>{a.username} — {a.email}</option>
                        ))}
                      </NativeSelect>
                    ) : (
                      <p className="rounded-lg border p-2 text-sm">{member.userId ? 'مرتبط بالحساب الرسمي' : 'بانتظار ربط الحساب بواسطة المسؤول'}</p>
                    )}
                  </div>
                  {team?.canManage && (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold">حالة التكليف</label>
                      <NativeSelect
                        value={member.status}
                        onChange={(event) => void change(member.code, { status: event.target.value as SurveyStatus })}
                        disabled={!!busy}
                      >
                        {STATUS_VALUES.map((status) => <option key={status} value={status}>{STATUS[status]}</option>)}
                      </NativeSelect>
                      <label className="block text-sm font-semibold">ملاحظات المتابعة</label>
                      <div className="flex gap-2">
                        <Input
                          value={notes[member.code] || ''}
                          onChange={(event) => setNotes((before) => ({ ...before, [member.code]: event.target.value }))}
                          maxLength={2000}
                          placeholder="ملاحظات أو أعمال مطلوب استكمالها"
                        />
                        <Button variant="outline" disabled={!!busy} onClick={() => void change(member.code, { notes: notes[member.code] || null })}>
                          حفظ
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs leading-6 text-muted-foreground">
        <ShieldCheck className="h-4 w-4" />
        لا تُفعل صلاحيات الحرم باستخدام الاسم وحده؛ يجب ربط حساب المستخدم رسميًا ومراجعة نطاقه قبل التشغيل.
      </p>
    </section>
  );
}
