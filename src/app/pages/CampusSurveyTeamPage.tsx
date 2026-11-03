import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Building2, ClipboardCheck, LandPlot, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';
import { apiJson } from '../../lib/http';
import { reportPreparerName } from '../utils/reportAttribution';
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
  employeeBuildings: number | null;
  employeeInspections: number | null;
  employeeVacantLands: number | null;
  accountUsername: string | null;
  countsAreProvisional: true;
};

type StaffWorkReport = {
  memberName: string;
  username: string;
  campus: string;
  counts: { buildings: number; inspections: number; vacantLands: number | null };
  vacantLandsTableAvailable: boolean;
  activities: Array<{
    type: 'building' | 'inspection' | 'vacant_land';
    identifier: string;
    title: string;
    location: string;
    date: string;
    deedNumber: string | null;
    details: string;
    inAssignedCampus: boolean;
  }>;
  disclaimer: string;
};

const escapeForPrint = (value: unknown) =>
  String(value ?? '—').replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));

const activityLabel: Record<StaffWorkReport['activities'][number]['type'], string> = {
  building: 'حصر / تسجيل مبنى',
  inspection: 'معاينة ميدانية',
  vacant_land: 'حصر / تسجيل أرض شاغرة',
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

export function CampusSurveyTeamPage({
  embedded = false, onReportCreator,
}: { embedded?: boolean; onReportCreator?: (username: string) => void }) {
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

  const printWork = async (code: string) => {
    const page = window.open('', '_blank');
    if (!page) return toast.error('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير');
    page.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="UTF-8"><title>تجهيز التقرير</title><body style="font:18px Tahoma;padding:32px">جارٍ تجهيز تقرير أعمال الموظف...</body></html>');
    page.document.close();
    try {
      const report = await apiJson<StaffWorkReport>('/api/campus-survey-team/work-report/' + encodeURIComponent(code));
      const counts = report.counts;
      const rows = report.activities.map((item, index) => [
        '<tr><td>', index + 1, '</td><td>', escapeForPrint(activityLabel[item.type]),
        '</td><td>', escapeForPrint(item.identifier), '</td><td>', escapeForPrint(item.title),
        '</td><td>', escapeForPrint(item.location), '</td><td>',
        escapeForPrint(new Date(item.date).toLocaleDateString('ar-SA-u-ca-gregory')),
        '</td><td>', escapeForPrint(item.deedNumber || '—'),
        '</td><td>', escapeForPrint(item.details || '—'),
        '</td><td>', item.inAssignedCampus ? 'مرتبط بالحرم' : 'يلزم تحقق من النطاق',
        '</td></tr>',
      ].join('')).join('');
      const html = [
        '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير أعمال ', escapeForPrint(report.memberName), '</title>',
        '<style>@page{size:A4 landscape;margin:12mm}body{font:14px/1.8 Tahoma,Arial,sans-serif;color:#19334b;margin:20px}header{border:2px solid #0d5263;padding:15px;background:#eef6f8}h1{margin:0 0 7px}h2{margin:18px 0 9px}.meta{display:flex;gap:24px;flex-wrap:wrap;margin-top:10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aabdc7;padding:8px;text-align:right;vertical-align:top;overflow-wrap:anywhere}th{background:#0d5263;color:white}tr{break-inside:avoid}button{padding:9px 22px;background:#0d5263;color:white;border:0;border-radius:6px}footer{margin-top:20px;border-top:1px solid #94a3b8;padding-top:10px}@media print{button{display:none}body{margin:0}}</style></head><body>',
        '<button onclick="window.print()">طباعة / حفظ PDF</button><header><h1>تقرير أعمال فريق الحصر الميداني</h1>',
        '<div>جامعة الإمام عبدالرحمن بن فيصل — منصة إدارة الصكوك والأراضي</div>',
        '<div class="meta"><span>الموظف: <strong>', escapeForPrint(report.memberName),
        '</strong></span><span>اسم المستخدم: <strong>', escapeForPrint(report.username),
        '</strong></span><span>الحرم المكلف: ', escapeForPrint(report.campus),
        '</span><span>أُعدّ بواسطة: ', escapeForPrint(reportPreparerName()),
        '</span><span>التاريخ: ', escapeForPrint(new Date().toLocaleDateString('ar-SA-u-ca-gregory')), '</span></div></header>',
        '<h2>ملخص الأعمال المسجلة</h2><p>المباني: ', counts.buildings, ' — المعاينات: ', counts.inspections,
        ' — الأراضي الشاغرة: ', counts.vacantLands ?? 'تعذر التحقق من الجدول',
        '</p><p>', escapeForPrint(report.disclaimer), '</p>',
        '<h2>تفاصيل الأعمال حسب السجلات</h2><table><thead><tr><th>م</th><th>نوع العمل</th><th>رقم السجل</th>',
        '<th>المسمى</th><th>الموقع</th><th>التاريخ</th><th>الصك</th><th>الأعمال والملاحظات</th><th>نطاق الحرم</th></tr></thead><tbody>',
        rows || '<tr><td colspan="9">لا توجد أعمال منسوبة إلى هذا الحساب في السجلات الحالية.</td></tr>',
        '</tbody></table><footer>بيانات السجل لا تُثبت اكتمال الحصر أو حدود الملكية دون مراجعة المستندات والمعاينة.</footer></body></html>',
      ].join('');
      if (!page.closed) {
        page.document.open();
        page.document.write(html);
        page.document.close();
      }
    } catch (error) {
      if (!page.closed) page.document.body.textContent = 'تعذر إنشاء تقرير الأعمال؛ تحقق من ربط الحساب والاتصال بالخادم.';
      toast.error(error instanceof Error ? error.message : 'تعذر إعداد تقرير الأعمال');
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
        مؤشرات الموظفين تعتمد على السجلات المنسوبة إلى حساباتهم، وهي أولية وليست نسب إنجاز أو إثباتًا على اكتمال الحصر.
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
                    <div className="space-y-2">
                      <p className="text-sm font-bold">الأعمال المسجلة بواسطة الموظف</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'مبانٍ سجلها', count: metric?.employeeBuildings, icon: Building2 },
                          { label: 'معاينات سجلها', count: metric?.employeeInspections, icon: ClipboardCheck },
                          { label: 'أراضٍ سجلها', count: metric?.employeeVacantLands, icon: LandPlot },
                        ].map(({ label, count, icon: Icon }) => (
                          <div key={label} className="rounded-xl border bg-muted/30 p-3 text-center">
                            <Icon className="mx-auto mb-2 h-5 w-5" />
                            <p className="text-xl font-bold tabular-nums">{count == null ? '—' : count}</p>
                            <p className="text-xs leading-5 text-muted-foreground">{label}</p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs leading-6 text-muted-foreground">
                        السجلات الموجودة بالحرم (جميع المستخدمين): {metric?.buildings ?? '—'} مبنى،
                        {' '}{metric?.inspections ?? '—'} معاينة مرتبطة بمبنى،
                        {' '}{metric?.vacantLands ?? '—'} أرض شاغرة.
                        معاينات الموظف محسوبة من اسم حسابه حتى لو لم يُربط بعضها بمبنى.
                      </p>
                      {metric?.accountUsername && onReportCreator && (
                        <Button variant="outline" onClick={() => onReportCreator(metric.accountUsername!)}>
                          تقرير أعمال المعاينات — {metric.accountUsername}
                        </Button>
                      )}
                      {metric?.accountUsername && team?.canManage && (
                        <Button variant="outline" onClick={() => { void printWork(member.code); }}>
                          تقرير أعمال الموظف الشامل (المباني / الأراضي / المعاينات)
                        </Button>
                      )}
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
