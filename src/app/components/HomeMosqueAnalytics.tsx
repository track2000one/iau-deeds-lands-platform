import React from 'react';
import { Building2, RefreshCw, AlertTriangle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { mosqueApi, type MosqueSite, type MosqueDashboard } from '../api/mosques';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

type Props = { locale: string; ui: (ar: string, en: string) => string; fmt: (n: number) => string };
const kinds = [
  { key: 'mosque', ar: 'مساجد', en: 'Mosques' },
  { key: 'jami', ar: 'جوامع', en: 'Congregational mosques' },
  { key: 'prayer_room', ar: 'مصليات', en: 'Prayer rooms' },
] as const;
const statuses = [
  { key: 'active', ar: 'نشطة', en: 'Active' },
  { key: 'maintenance', ar: 'تحت الصيانة', en: 'Maintenance' },
  { key: 'temporarily_closed', ar: 'مغلقة مؤقتًا', en: 'Temporarily closed' },
] as const;

export const HomeMosqueAnalytics: React.FC<Props> = ({ locale, ui, fmt }) => {
  const [sites, setSites] = React.useState<MosqueSite[] | null>(null);
  const [dashboard, setDashboard] = React.useState<MosqueDashboard | null>(null);
  const [siteError, setSiteError] = React.useState(false);
  const [dashboardError, setDashboardError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [reload, setReload] = React.useState(0);
  const [campus, setCampus] = React.useState('');
  React.useEffect(() => {
    let active = true;
    setLoading(true); setSites(null); setDashboard(null);
    setSiteError(false); setDashboardError(false);
    Promise.allSettled([mosqueApi.sites(), mosqueApi.dashboard()]).then(([s, d]) => {
      if (!active) return;
      if (s.status === 'fulfilled' && Array.isArray(s.value)) setSites(s.value);
      else setSiteError(true);
      if (d.status === 'fulfilled' && d.value?.stats) setDashboard(d.value);
      else setDashboardError(true);
      setLoading(false);
    });
    return () => { active = false; };
  }, [reload]);
  const campuses = [...new Set((sites ?? []).map((site) => site.campusLocation?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, locale));
  const selectedCampus = campuses.includes(campus) ? campus : '';
  const selected = (sites ?? []).filter((site) => !selectedCampus || site.campusLocation?.trim() === selectedCampus);
  const types = kinds.map((x) => ({ key: x.key, name: ui(x.ar, x.en), count: selected.filter((s) => s.siteType === x.key).length }));
  const conditions = statuses.map((x) => ({ key: x.key, name: ui(x.ar, x.en), count: selected.filter((s) => s.status === x.key).length }));
  const women = selected.filter((s) => s.hasWomenPrayerArea || s.womenPrayerArea?.presenceStatus === 'present').length;
  const gps = selected.filter((s) => s.latitude != null && s.longitude != null &&
    Number.isFinite(Number(s.latitude)) && Number.isFinite(Number(s.longitude)) &&
    Math.abs(Number(s.latitude)) <= 90 && Math.abs(Number(s.longitude)) <= 180).length;
  const siteByCampus = campuses.map((name) => ({ name, count: selected.filter((s) => s.campusLocation?.trim() === name).length }))
    .filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
  const tile = (label: string, count: number, detail: string) => (
    <div className="rounded-xl border bg-background/60 p-3" key={label}>
      <p className="text-sm font-semibold">{label}</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{fmt(count)}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
  return <section className="space-y-3" aria-label={ui('مؤشرات المساجد والمصليات الجامعية', 'Mosques and prayer rooms analytics')}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-lg font-extrabold"><Building2 className="h-5 w-5 text-primary" />
        {ui('مؤشرات المساجد والمصليات الجامعية', 'Mosques and prayer rooms indicators')}</h2>
        <p className="text-sm text-muted-foreground">{ui('مؤشرات مستقلة عن السجل المركزي للمباني والصكوك، وفق صلاحيات المستخدم.', 'Separate from building and deed totals; scoped by access permissions.')}</p>
      </div>
      <div className="dashboard-no-print flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">{ui('الحرم', 'Campus')}
          <select value={selectedCampus} onChange={(e) => setCampus(e.target.value)} disabled={!sites}
            aria-label={ui('تصفية المساجد والمصليات حسب الحرم', 'Filter mosques by campus')}
            className="max-w-[210px] rounded-lg border bg-background p-2">
            <option value="">{ui('جميع المواقع', 'All campuses')}</option>
            {campuses.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <Button size="sm" variant="outline" disabled={loading} onClick={() => setReload((v) => v + 1)}><RefreshCw className="me-1 h-4 w-4" />{ui('تحديث', 'Refresh')}</Button>
      </div>
    </div>
    <Card className="future-card min-w-0">
      <CardHeader><CardTitle className="text-base">{ui('حصر المساجد والجوامع والمصليات', 'Mosques and prayer rooms inventory')}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">{ui('جارٍ تحميل البيانات…', 'Loading…')}</p>}
        {siteError && <p role="alert" className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" />{ui('تعذر تحميل بيانات المواقع؛ لا تعرض أصفار افتراضية.', 'Site data unavailable; no zero totals assumed.')}</p>}
        {sites && <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {tile(ui('إجمالي المواقع', 'All sites'), selected.length, selectedCampus || ui('ضمن الصلاحيات', 'Authorized scope'))}
            {types.map((x) => tile(x.name, x.count, ui('مواقع', 'Sites')))}
            {tile(ui('مواقع بها مصلى نساء', 'With women prayer area'), women, ui('حسب البيانات المسجلة', 'Registered data'))}
            {tile(ui('مواقع بإحداثيات', 'Sites with coordinates'), gps, ui('إحداثيات صالحة', 'Valid coordinates'))}
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-xl border p-3">
              <h3 className="mb-2 text-sm font-bold">{ui('التوزيع حسب نوع الموقع', 'Site type distribution')}</h3>
              <div className="h-[210px]" dir="ltr"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={types}><CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} />
                  <Tooltip /><Bar dataKey="count" name={ui('عدد المواقع', 'Sites')} fill="#6366f1" maxBarSize={55} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer></div>
            </div>
            <div className="min-w-0 rounded-xl border p-3">
              <h3 className="mb-2 text-sm font-bold">{ui('الحالة التشغيلية والتوزيع حسب الحرم', 'Status and campus distribution')}</h3>
              {conditions.map((x) => <div key={x.key} className="flex justify-between border-b py-1.5 text-sm"><span>{x.name}</span><strong>{fmt(x.count)}</strong></div>)}
              <div className="mt-2 max-h-36 space-y-1 overflow-auto">
                {siteByCampus.map((x) => <div key={x.name} className="flex justify-between text-xs"><span>{x.name}</span><strong>{fmt(x.count)}</strong></div>)}
              </div>
            </div>
          </div>
        </>}
        {dashboardError && <p role="alert" className="text-sm text-muted-foreground">{ui('مؤشرات الطلبات والمهام غير متاحة.', 'Request and task indicators unavailable.')}</p>}
        {dashboard && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {tile(ui('طلبات جديدة', 'New requests'), dashboard.stats.newRequests, ui('حسب صلاحيات الحساب', 'Permission scoped'))}
          {tile(ui('طلبات متأخرة', 'Overdue requests'), dashboard.stats.lateRequests, ui('تحتاج متابعة', 'Require follow-up'))}
          {tile(ui('بلاغات مفتوحة', 'Open tickets'), dashboard.stats.openTickets, ui('غير مغلقة', 'Open'))}
          {tile(ui('مهام استكمال قائمة', 'Active completion tasks'), dashboard.stats.completionTasksActive, ui('قيد التنفيذ', 'In progress'))}
        </div>}
        <p className="text-xs text-muted-foreground">{ui('مرشح الحرم يطبق على حصر المواقع فقط؛ طلبات الوحدة وبلاغاتها تعرض وفق النطاق المعتمد من الخادم.', 'Campus filter applies to site counts only; workflow totals are server-scoped.')}</p>
      </CardContent>
    </Card>
  </section>;
};
