import React from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, BarChart3, ClipboardCheck, ClipboardList, Download, LandPlot, MapPinned } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiJson } from '../../lib/http';
import { getSiteInspections } from '../api/siteInspections';
import type { TransactionFollowUpDashboard } from '../api/transactionFollowUp';
import type { SiteInspection } from '../../types/siteInspection';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

type Localize = (arabic: string, english: string) => string;
type VacantLandRow = {
  id: string;
  campus: string;
  status: string;
  approximateArea: number | string | null;
  verifiedVacantArea?: number | string | null;
};
type Props = {
  canVacant: boolean;
  canInspections: boolean;
  canFollowUp: boolean;
  followUp: TransactionFollowUpDashboard | null;
  followUpError: boolean;
  locale: string;
  ui: Localize;
  fmt: (number: number) => string;
};

const landStatuses = [
  { key: 'DRAFT', ar: 'شاغرة مبدئيًا', en: 'Draft vacancy', color: '#64748b' },
  { key: 'UNDER_REVIEW', ar: 'قيد التحقق', en: 'Under review', color: '#3b82f6' },
  { key: 'VERIFIED_VACANT', ar: 'شاغرة معتمدة', en: 'Verified vacant', color: '#10b981' },
  { key: 'PARTIALLY_OCCUPIED', ar: 'مشغولة جزئيًا', en: 'Partially occupied', color: '#f59e0b' },
  { key: 'OCCUPIED', ar: 'مشغولة بالكامل', en: 'Occupied', color: '#ef4444' },
  { key: 'ALLOCATED', ar: 'مخصصة لمشروع', en: 'Allocated', color: '#8b5cf6' },
] as const;

const inspectionStatuses = [
  { key: 'new', ar: 'جديدة', en: 'New', color: '#64748b' },
  { key: 'under_review', ar: 'قيد المراجعة', en: 'Under review', color: '#3b82f6' },
  { key: 'referred', ar: 'تمت الإحالة', en: 'Referred', color: '#8b5cf6' },
  { key: 'in_progress', ar: 'جارٍ التنفيذ', en: 'In progress', color: '#f59e0b' },
  { key: 'resolved', ar: 'تمت المعالجة', en: 'Resolved', color: '#10b981' },
  { key: 'closed', ar: 'مغلقة', en: 'Closed', color: '#0d9488' },
] as const;

const area = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
const closedInspection = (item: SiteInspection) =>
  item.workflowStatus === 'closed' || item.workflowStatus === 'resolved';
const countByStatus = <T extends { status?: string; workflowStatus?: string }>(
  items: T[],
  field: 'status' | 'workflowStatus',
  definitions: readonly { key: string; ar: string; en: string; color: string }[],
  ui: Localize,
) => {
  const known = new Set(definitions.map((definition) => definition.key));
  const counts = definitions.map((definition) => ({
    key: definition.key,
    name: ui(definition.ar, definition.en),
    color: definition.color,
    count: items.filter((item) => item[field] === definition.key).length,
  }));
  const otherCount = items.filter((item) => !known.has(item[field] || '')).length;
  if (otherCount) counts.push({ key: 'other', name: ui('حالة أخرى / غير محددة', 'Other / unspecified'), color: '#a3a3a3', count: otherCount });
  return counts.filter((item) => item.count > 0);
};

export const HomeOperationalAnalytics: React.FC<Props> = ({
  canVacant, canInspections, canFollowUp, followUp, followUpError, locale, ui, fmt,
}) => {
  const navigate = useNavigate();
  const [lands, setLands] = React.useState<VacantLandRow[] | null>(null);
  const [inspections, setInspections] = React.useState<SiteInspection[] | null>(null);
  const [landError, setLandError] = React.useState(false);
  const [inspectionError, setInspectionError] = React.useState(false);
  const [campus, setCampus] = React.useState('');
  const [inspectionPeriod, setInspectionPeriod] = React.useState<'all' | '30' | '90'>('all');

  React.useEffect(() => {
    let active = true;
    if (canVacant) {
      setLands(null);
      setLandError(false);
      void apiJson<VacantLandRow[]>('/api/vacant-lands').then((data) => {
        if (active) setLands(Array.isArray(data) ? data : []);
      }).catch(() => {
        if (active) { setLands(null); setLandError(true); }
      });
    } else {
      setLands(null);
      setLandError(false);
    }
    if (canInspections) {
      setInspections(null);
      setInspectionError(false);
      void getSiteInspections().then((data) => {
        if (active) setInspections(Array.isArray(data) ? data : []);
      }).catch(() => {
        if (active) { setInspections(null); setInspectionError(true); }
      });
    } else {
      setInspections(null);
      setInspectionError(false);
    }
    return () => { active = false; };
  }, [canVacant, canInspections]);

  const campuses = React.useMemo(() => [...new Set((lands ?? []).map((land) => land.campus?.trim()).filter((value): value is string => Boolean(value)))]
    .sort((a, b) => a.localeCompare(b, locale)), [lands, locale]);
  const selectedCampus = campuses.includes(campus) ? campus : '';
  const filteredLands = React.useMemo(() => (lands ?? []).filter((land) => !selectedCampus || land.campus === selectedCampus), [lands, selectedCampus]);
  const verifiedLands = filteredLands.filter((land) => land.status === 'VERIFIED_VACANT');
  const pendingLands = filteredLands.filter((land) => land.status === 'DRAFT' || land.status === 'UNDER_REVIEW');
  const verifiedArea = verifiedLands.reduce((sum, land) => sum + area(land.verifiedVacantArea), 0);
  const indicativeArea = filteredLands.reduce((sum, land) => sum + area(land.approximateArea), 0);
  const landStatusRows = countByStatus(filteredLands, 'status', landStatuses, ui);
  // The vacant-lands API currently limits the result to 1,000 records. Never label a capped result as a definitive total.
  const potentiallyCapped = lands !== null && lands.length >= 1000;

  const filteredInspections = React.useMemo(() => {
    if (inspectionPeriod === 'all') return inspections ?? [];
    const cutoff = Date.now() - Number(inspectionPeriod) * 86400000;
    return (inspections ?? []).filter((item) => {
      const visitTime = new Date(item.visitDate).getTime();
      return Number.isFinite(visitTime) && visitTime >= cutoff;
    });
  }, [inspections, inspectionPeriod]);
  const activeInspections = filteredInspections.filter((item) => !closedInspection(item)).length;
  const completedInspections = filteredInspections.length - activeInspections;
  const urgentInspections = filteredInspections.filter((item) =>
    !closedInspection(item) && ['high', 'urgent', 'critical'].includes(item.priority?.toLowerCase() || '')).length;
  const inspectionStatusRows = countByStatus(filteredInspections, 'workflowStatus', inspectionStatuses, ui);

  const exportSummary = () => {
    const rows: string[][] = [[ui('المؤشر', 'Indicator'), ui('القيمة', 'Value')]];
    if (canVacant && lands) {
      rows.push(
        [ui('نطاق الأراضي', 'Land campus'), selectedCampus || ui('جميع المواقع', 'All campuses')],
        [ui('سجلات الأراضي المحملة', 'Loaded vacant-land records'), String(filteredLands.length)],
        [ui('الأراضي الشاغرة المعتمدة', 'Verified vacant sites'), String(verifiedLands.length)],
        [ui('الأراضي قيد التحقق', 'Pending land verification'), String(pendingLands.length)],
        [ui('المساحة التقديرية للمواقع م²', 'Indicative site area sqm'), String(indicativeArea)],
        [ui('المساحة الشاغرة المعتمدة م²', 'Verified vacant area sqm'), String(verifiedArea)],
        [ui('هل وصل السجل حد العرض (1000)', 'Hit 1000-record API limit'), potentiallyCapped ? ui('نعم - قد تكون النتائج جزئية', 'Yes - data may be partial') : ui('لا', 'No')],
        ...landStatusRows.map((row) => [ui('حالة الأراضي: ', 'Land status: ') + row.name, String(row.count)]),
      );
    }
    if (canInspections && inspections) {
      rows.push(
        [ui('فترة المعاينات (يوم)', 'Inspection period (days)'), inspectionPeriod],
        [ui('المعاينات خلال الفترة', 'Inspections in period'), String(filteredInspections.length)],
        [ui('المعاينات المفتوحة', 'Open inspections'), String(activeInspections)],
        [ui('المعاينات المنجزة / المغلقة', 'Resolved / closed inspections'), String(completedInspections)],
        [ui('معاينات مفتوحة عالية الأولوية', 'Open high-priority inspections'), String(urgentInspections)],
        ...inspectionStatusRows.map((row) => [ui('حالة المعاينات: ', 'Inspection status: ') + row.name, String(row.count)]),
      );
    }
    if (canFollowUp && followUp) {
      rows.push(
        [ui('المعاملات المفتوحة', 'Open transactions'), String(followUp.open)],
        [ui('المعاملات المتأخرة', 'Overdue transactions'), String(followUp.overdue)],
        [ui('المعاملات بانتظار الرد', 'Waiting transactions'), String(followUp.waiting)],
        [ui('المعاملات المنجزة / المغلقة', 'Completed / closed transactions'), String(followUp.completed)],
        [ui('المعاملات غير المسندة', 'Unassigned transactions'), String(followUp.unassigned)],
      );
    }
    const safeCell = (value: string) => {
          // Prevent spreadsheet formula injection from user-entered campus/location names.
          const text = String(value);
          const sanitized = /^[=+@\-\t\r]/.test(text.trimStart()) ? "'" + text : text;
          return '"' + sanitized.replace(/"/g, '""') + '"';
        };
        const csv = '\uFEFF' + rows.map((row) => row.map(safeCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'iau-deeds-operational-analytics-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!canVacant && !canInspections && !canFollowUp) return null;

  const tooltipStyle = { backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', borderRadius: 12 };
  const indicator = (label: string, value: string, detail: string) => (
    <div key={label} className="min-w-0 rounded-xl border bg-muted/20 p-3">
      <p className="text-sm font-semibold leading-6 text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );

  return (
    <section className="space-y-4" aria-label={ui('تحليلات تشغيلية متقدمة', 'Advanced operational analytics')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-foreground">
            <BarChart3 className="h-5 w-5 text-primary" />
            {ui('التحليلات التشغيلية المتقدمة', 'Advanced operational analytics')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ui('مؤشرات الأراضي والمعاينات والمتابعة؛ تعرض كل وحدة البيانات المتاحة وفق صلاحيات الحساب.',
              'Land, inspection and follow-up indicators, scoped by account permissions.')}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={exportSummary}
          disabled={!(canVacant && lands) && !(canInspections && inspections) && !(canFollowUp && followUp)}>
          <Download className="h-4 w-4" />
          {ui('تصدير التحليلات CSV / Excel', 'Export CSV / Excel')}
        </Button>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        {canVacant && (
          <Card className="future-card min-w-0 overflow-hidden">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LandPlot className="h-5 w-5 text-emerald-600" />
                    {ui('تحليل الأراضي الشاغرة', 'Vacant land analytics')}
                  </CardTitle>
                  <CardDescription className="mt-1">{ui('التمييز بين المساحات التقديرية والمساحات الشاغرة المعتمدة', 'Indicative and verified vacant areas are distinct')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/lands/vacant')}>
                  {ui('عرض السجل', 'View registry')}
                </Button>
              </div>
              <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <span>{ui('الحرم / الموقع', 'Campus')}</span>
                <select className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-foreground"
                  aria-label={ui('تصفية الأراضي حسب الحرم', 'Filter lands by campus')}
                  value={selectedCampus} onChange={(event) => setCampus(event.target.value)} disabled={!lands}>
                  <option value="">{ui('جميع المواقع', 'All campuses')}</option>
                  {campuses.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </CardHeader>
            <CardContent className="space-y-4">
              {landError ? (
                <p role="alert" className="flex items-center gap-2 rounded-xl border border-amber-500/30 p-4 text-sm">
                  <AlertTriangle className="h-5 w-5" />{ui('تعذر تحميل بيانات الأراضي؛ لا يمكن حساب المؤشرات.', 'Land data is unavailable; metrics cannot be calculated.')}
                </p>
              ) : lands === null ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{ui('جارٍ تحميل الأراضي…', 'Loading lands…')}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {indicator(ui('المواقع المسجلة', 'Recorded sites'), fmt(filteredLands.length), ui('حسب النطاق المختار', 'Selected campus'))}
                    {indicator(ui('شاغرة معتمدة', 'Verified vacant'), fmt(verifiedLands.length), ui('بعد التحقق', 'Verified status only'))}
                    {indicator(ui('المساحة التقديرية م²', 'Indicative area sqm'), fmt(indicativeArea), ui('ليست مساحة معتمدة', 'Not verified area'))}
                    {indicator(ui('المساحة الشاغرة المعتمدة م²', 'Verified vacant sqm'), fmt(verifiedArea), ui('للمواقع المعتمدة فقط', 'Verified sites only'))}
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm">
                    <span>{ui('مواقع مبدئية أو قيد التحقق', 'Draft or pending verification')}</span>
                    <strong className="tabular-nums">{fmt(pendingLands.length)}</strong>
                  </div>
                  {filteredLands.length ? (
                    <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center">
                      <div className="h-[180px] min-w-0" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={landStatusRows} dataKey="count" nameKey="name" innerRadius={44} outerRadius={72} stroke="none">
                              {landStatusRows.map((row) => <Cell key={row.key} fill={row.color} />)}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => fmt(Number(value))} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {landStatusRows.map((row) => (
                          <div key={row.key} className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                              <span className="truncate">{row.name}</span>
                            </span>
                            <strong className="tabular-nums">{fmt(row.count)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : <p className="py-4 text-center text-sm text-muted-foreground">{ui('لا توجد مواقع في النطاق المحدد', 'No sites in the selected scope')}</p>}
                  {potentiallyCapped && (
                    <p role="note" className="rounded-xl border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-300">
                      {ui('خدمة الأراضي تعرض حتى ١٬٠٠٠ سجل؛ قد تكون هذه المؤشرات جزئية وليست إجمالي الجامعة.',
                        'The API returns up to 1,000 sites; these figures may be partial.')}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
        {canInspections && (
          <Card className="future-card min-w-0 overflow-hidden">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardCheck className="h-5 w-5 text-sky-600" />
                    {ui('تحليل المعاينات الميدانية', 'Field inspection analytics')}
                  </CardTitle>
                  <CardDescription className="mt-1">{ui('احتساب النتائج حسب تاريخ الزيارة المسجل', 'Metrics based on recorded visit dates')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/site-inspections')}>
                  {ui('عرض المعاينات', 'View inspections')}
                </Button>
              </div>
              <label className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <span>{ui('الفترة', 'Period')}</span>
                <select className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-foreground"
                  value={inspectionPeriod} onChange={(event) => setInspectionPeriod(event.target.value as 'all' | '30' | '90')}
                  aria-label={ui('تصفية المعاينات حسب التاريخ', 'Filter inspections by period')}>
                  <option value="all">{ui('جميع الفترات', 'All time')}</option>
                  <option value="30">{ui('آخر ٣٠ يومًا', 'Last 30 days')}</option>
                  <option value="90">{ui('آخر ٩٠ يومًا', 'Last 90 days')}</option>
                </select>
              </label>
            </CardHeader>
            <CardContent className="space-y-4">
              {inspectionError ? (
                <p role="alert" className="flex items-center gap-2 rounded-xl border border-amber-500/30 p-4 text-sm">
                  <AlertTriangle className="h-5 w-5" />{ui('تعذر تحميل المعاينات؛ لا يمكن حساب المؤشرات.', 'Inspections are unavailable; metrics cannot be calculated.')}
                </p>
              ) : inspections === null ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{ui('جارٍ تحميل المعاينات…', 'Loading inspections…')}</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {indicator(ui('إجمالي المعاينات', 'Total inspections'), fmt(filteredInspections.length), ui('خلال الفترة المحددة', 'In selected period'))}
                    {indicator(ui('قيد الإجراء', 'Open inspections'), fmt(activeInspections), ui('لم تغلق أو تعالج', 'Not resolved or closed'))}
                    {indicator(ui('منجزة / مغلقة', 'Resolved / closed'), fmt(completedInspections), ui('حسب حالة الإجراء', 'By workflow status'))}
                    {indicator(ui('مفتوحة عالية الأولوية', 'Open high-priority'), fmt(urgentInspections), ui('مستوى أولوية مرتفع', 'High / urgent priority'))}
                  </div>
                  {filteredInspections.length ? (
                    <div className="h-[250px] min-w-0" dir="ltr">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={inspectionStatusRows} layout="vertical" margin={{ top: 6, bottom: 6, left: 6, right: 14 }}>
                          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => fmt(Number(value))} />
                          <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={20}>
                            {inspectionStatusRows.map((row) => <Cell key={row.key} fill={row.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <p className="py-4 text-center text-sm text-muted-foreground">{ui('لا توجد معاينات في الفترة المحددة', 'No inspections in the selected period')}</p>}
                </>
              )}
            </CardContent>
          </Card>
        )}
        {canFollowUp && (
          <Card className="future-card min-w-0 overflow-hidden xl:col-span-2">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-5 w-5 text-violet-600" />
                  {ui('متابعة سير المعاملات', 'Transaction follow-up performance')}
                </CardTitle>
                <CardDescription className="mt-1">{ui('من لوحة المتابعة وفق نطاق صلاحيات المستخدم، دون احتساب المعاملات المؤرشفة.', 'Scoped follow-up totals, excluding archived transactions.')}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/follow-up')}>
                {ui('فتح نظام المتابعة', 'Open follow-up')}
              </Button>
            </CardHeader>
            <CardContent>
              {followUpError ? (
                <p role="alert" className="flex items-center gap-2 rounded-xl border border-amber-500/30 p-4 text-sm">
                  <AlertTriangle className="h-5 w-5" />{ui('تعذر تحميل مؤشرات المعاملات.', 'Transaction metrics are unavailable.')}
                </p>
              ) : !followUp ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{ui('جارٍ تحميل مؤشرات المعاملات…', 'Loading transaction indicators…')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                  {indicator(ui('المعاملات المفتوحة', 'Open'), fmt(followUp.open), ui('قيد العمل', 'Active workload'))}
                  {indicator(ui('متأخرة', 'Overdue'), fmt(followUp.overdue), ui('تجاوزت تاريخ الاستحقاق', 'Past due date'))}
                  {indicator(ui('بانتظار الرد', 'Waiting'), fmt(followUp.waiting), ui('لم يصل الرد بعد', 'Awaiting response'))}
                  {indicator(ui('منجزة / مغلقة', 'Completed / closed'), fmt(followUp.completed), ui('وفق تصنيف المتابعة', 'Follow-up status'))}
                  {indicator(ui('غير مسندة', 'Unassigned'), fmt(followUp.unassigned), ui('تحتاج إلى إسناد', 'Need an assignee'))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        <MapPinned className="me-1 inline h-3.5 w-3.5" />
        {ui('التقارير التحليلية للمتابعة وليست بديلًا عن اعتماد الصكوك أو المساحات هندسيًا. يمكن تحديث البيانات من زر تحديث الصفحة الرئيسي.',
          'Analytics support monitoring; they do not certify deeds or surveyed areas. Refresh from the dashboard toolbar.')}
      </p>
    </section>
  );
};
