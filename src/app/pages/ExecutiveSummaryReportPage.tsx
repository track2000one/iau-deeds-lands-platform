import React from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, BarChart3, Download, FileSpreadsheet, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import { usePermissions } from '../../context/PermissionsContext';
import { apiJson } from '../../lib/http';
import type { ModuleName } from '../../types/permissions';
import { mosqueApi } from '../api/mosques';
import { getSiteInspections } from '../api/siteInspections';
import { transactionFollowUpApi, type TransactionFollowUpDashboard } from '../api/transactionFollowUp';
import { PLATFORM_LOGO_URL } from '../config/branding';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import {
  buildExecutiveSections, emptyReportData, safeSpreadsheetLabel, type CollectionKey,
  type MetricValue, type ReportData, type ReportRow,
} from '../utils/executiveReportMetrics';

type DataKey = CollectionKey | 'followUp';
type ReportPeriod = 'all' | '30' | '90' | '365';
type Access = Record<DataKey, boolean>;
type Result = { key: DataKey; value?: unknown; error?: string };

const sources: Array<{ key: DataKey; module: ModuleName; path?: string }> = [
  { key: 'deeds', module: 'deeds', path: '/api/deeds' },
  { key: 'buildings', module: 'central_buildings' },
  { key: 'vacant', module: 'vacant_lands', path: '/api/vacant-lands' },
  { key: 'inspections', module: 'site_inspections' },
  { key: 'followUp', module: 'transaction_follow_up' },
  { key: 'allocated', module: 'allocated_lands', path: '/api/records/allocated-lands' },
  { key: 'delivered', module: 'delivered_lands', path: '/api/records/delivered-lands' },
  { key: 'leasedOut', module: 'leased_lands_out', path: '/api/records/leased-lands-out' },
  { key: 'leasedIn', module: 'leased_lands_in', path: '/api/records/leased-lands-in' },
  { key: 'leasedBuildingsOut', module: 'leased_buildings_out', path: '/api/records/leased-buildings-out' },
  { key: 'leasedBuildingsIn', module: 'leased_buildings_in', path: '/api/records/leased-buildings-in' },
];
const links: Record<string, string> = {
  central_buildings: '/buildings/registry', deeds: '/deeds', vacant_lands: '/lands/vacant',
  site_inspections: '/site-inspections', transaction_follow_up: '/follow-up',
  allocated_lands: '/lands/allocated', delivered_lands: '/lands/delivered',
  leased_lands_out: '/lands/leased-out', leased_lands_in: '/lands/leased-in',
  leased_buildings_out: '/buildings/leased-out', leased_buildings_in: '/buildings/leased-in',
};
const fetchSource = (key: DataKey, path?: string): Promise<unknown> => {
  if (key === 'buildings') return mosqueApi.buildings();
  if (key === 'inspections') return getSiteInspections();
  if (key === 'followUp') return transactionFollowUpApi.dashboard();
  if (!path) throw new Error('Missing API path');
  return apiJson<ReportRow[]>(path);
};
const isFollowUp = (value: unknown): value is TransactionFollowUpDashboard => {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return ['total', 'open', 'waiting', 'overdue', 'completed', 'unassigned', 'needsAction']
    .every((key) => typeof obj[key] === 'number' && Number.isFinite(obj[key]));
};

export const ExecutiveSummaryReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const locale = ar ? 'ar-SA' : 'en-US';
  const ui = (arabic: string, english: string) => ar ? arabic : english;
  const fmt = (value: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  const { isAdmin, hasPermission, loading: permissionLoading } = usePermissions();
  const access = (module: ModuleName) => isAdmin || hasPermission(module, 'canView');
  const enabled = Object.fromEntries(sources.map(({ key, module }) => [key, access(module)])) as Access;
  const accessKey = sources.map(({ key }) => String(Number(enabled[key]))).join('');
  const canExport = isAdmin || hasPermission('reports', 'canPrint');

  const [data, setData] = React.useState<ReportData>(emptyReportData);
  const [errors, setErrors] = React.useState<Partial<Record<DataKey, string>>>({});
  const [loading, setLoading] = React.useState(true);
  const [revision, setRevision] = React.useState(0);
  const [snapshotAt, setSnapshotAt] = React.useState<Date | null>(null);
  const [campus, setCampus] = React.useState('');
  const [period, setPeriod] = React.useState<ReportPeriod>('all');
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    if (permissionLoading) return;
    let active = true;
    setLoading(true);
    setData(emptyReportData());
    setErrors({});
    setSnapshotAt(null);
    void (async () => {
      const requests = sources.filter(({ key }) => enabled[key]);
      const results = await Promise.all(requests.map(async ({ key, path }): Promise<Result> => {
        try {
          const value = await fetchSource(key, path);
          if (key === 'followUp' ? !isFollowUp(value) : !Array.isArray(value))
            throw new Error('Unexpected response format');
          return { key, value };
        } catch (error) {
          return { key, error: error instanceof Error ? error.message : 'Failed to load data' };
        }
      }));
      if (!active) return;
      const next = emptyReportData();
      const failures: Partial<Record<DataKey, string>> = {};
      for (const result of results) {
        if (result.error) failures[result.key] = result.error;
        else if (result.key === 'followUp' && isFollowUp(result.value)) next.followUp = result.value;
        else if (result.key !== 'followUp' && Array.isArray(result.value)) next[result.key] = result.value as ReportRow[];
      }
      setData(next);
      setErrors(failures);
      setSnapshotAt(new Date());
      setLoading(false);
    })();
    return () => { active = false; };
  }, [accessKey, permissionLoading, revision]);

  const campuses = React.useMemo(() => [...new Set([
    ...(data.buildings ?? []).map((row) => row.campusLocation?.trim()),
    ...(data.vacant ?? []).map((row) => row.campus?.trim()),
  ].filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, locale)),
  [data.buildings, data.vacant, locale]);
  const selectedCampus = campuses.includes(campus) ? campus : '';
  const days = period === 'all' ? null : Number(period);
  const sections = buildExecutiveSections(data, enabled, selectedCampus, days, snapshotAt?.getTime() || Date.now());
  const available = sections.filter((section) => section.available);
  const count = available.reduce((sum, section) => sum + section.metrics.length, 0);
  const partialVacant = enabled.vacant && (data.vacant?.length || 0) >= 1000;
  const qualityNotes = [
    ...(partialVacant ? [ui('خدمة الأراضي الشاغرة تعرض حتى ١٬٠٠٠ سجل؛ قد تكون الإجماليات جزئية.',
      'Vacant lands API is capped at 1,000 records; totals may be partial.')] : []),
    ...sections.filter((s) => !s.available).map((s) => ui(s.titleAr, s.titleEn) + ': ' + ui('تعذر تحميل المصدر', 'Source unavailable')),
  ];

  const campusRows = React.useMemo(() => {
    const map = new Map<string, { campus: string; buildings: number; linked: number; vacant: number }>();
    const add = (name: string) => {
      if (!map.has(name)) map.set(name, { campus: name, buildings: 0, linked: 0, vacant: 0 });
      return map.get(name)!;
    };
    for (const row of data.buildings ?? []) {
      const site = add(row.campusLocation?.trim() || ui('غير محدد', 'Unspecified'));
      site.buildings++;
      if (row.deedId || row.deed?.id) site.linked++;
    }
    for (const row of data.vacant ?? []) add(row.campus?.trim() || ui('غير محدد', 'Unspecified')).vacant++;
    return [...map.values()].filter((row) => !selectedCampus || row.campus === selectedCampus)
      .sort((a, b) => b.buildings - a.buildings || b.vacant - a.vacant || a.campus.localeCompare(b.campus, locale));
  }, [data.buildings, data.vacant, selectedCampus, locale]);

  const snapshotLabel = snapshotAt ? new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(snapshotAt) : '—';
  const metricText = (item: MetricValue) => fmt(item.value) + (item.unit === 'percent' ? '%' : '');
  const snapshotScope = ui('تصفية الحرم تخص المباني والأراضي الشاغرة فقط؛ وتصفية التاريخ تخص إنشاء الصكوك وتاريخ زيارات المعاينات. المعاملات وفق نطاق صلاحيات الحساب.',
    'Campus filter affects buildings and vacant lands only; period affects deed creation and inspection visits. Transactions are permission-scoped.');
  const writeExcel = async () => {
    if (!canExport || loading || exporting || !snapshotAt || count === 0) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const summary: (string | number | null)[][] = [
        [ui('التقرير التنفيذي لأوقاف وأملاك الجامعة', 'University properties executive report')],
        [ui('وقت اللقطة', 'Snapshot time'), snapshotAt.toISOString()],
        [ui('تصفية الحرم للمباني والأراضي الشاغرة', 'Campus filter'), safeSpreadsheetLabel(selectedCampus || ui('جميع المواقع', 'All campuses'))],
        [ui('تصفية الصكوك والمعاينات', 'Deed/inspection time filter'), days === null ? ui('الكل', 'All') : String(days) + ' days'],
        [ui('حدود البيانات', 'Scope'), ui('الوحدات المصرح بها فقط؛ السجلات لا تمثل أصولًا فريدة',
          'Authorized modules only; records do not equal unique assets')],
        [ui('الأراضي الشاغرة', 'Vacant lands'), partialVacant ? ui('قد تكون جزئية', 'Potentially partial') : ui('وفق البيانات المحملة', 'Loaded data')],
        [],
        [ui('القسم', 'Section'), ui('المؤشر', 'Metric'), ui('القيمة', 'Value'), ui('الوحدة', 'Unit'), ui('الحالة', 'Status')],
        ...sections.flatMap((section) => section.available
          ? section.metrics.map((m) => [safeSpreadsheetLabel(ui(section.titleAr, section.titleEn)),
            safeSpreadsheetLabel(ui(m.labelAr, m.labelEn)), m.value, m.unit, ui('متاح', 'Available')])
          : [[safeSpreadsheetLabel(ui(section.titleAr, section.titleEn)), ui('غير متاح', 'Unavailable'),
            null, '', ui('تعذر تحميل المصدر', 'Source unavailable')]]),
      ];
      const sheet = XLSX.utils.aoa_to_sheet(summary);
      sheet['!cols'] = [42, 53, 20, 16, 25].map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, sheet, 'Executive_Summary');

      const biRows = sections.flatMap((section) => section.available ? section.metrics.map((m) => ({
        snapshot_utc: snapshotAt.toISOString(),
        metric_key: m.key,
        module: m.source,
        metric_label: safeSpreadsheetLabel(ui(m.labelAr, m.labelEn)),
        value: m.value,
        unit: m.unit,
        campus_filter: m.scope === 'all' || m.scope === 'authorized' ? '' : safeSpreadsheetLabel(m.scope),
        period_days: ['deeds', 'site_inspections'].includes(m.source) ? days : null,
        data_scope: 'authorized_module_scope',
        quality_status: partialVacant && m.source === 'vacant_lands' ? 'POTENTIALLY_PARTIAL' : 'REPORTED',
      })) : []);
      const biSheet = XLSX.utils.json_to_sheet(biRows, { header: [
        'snapshot_utc', 'metric_key', 'module', 'metric_label', 'value', 'unit',
        'campus_filter', 'period_days', 'data_scope', 'quality_status',
      ] });
      biSheet['!cols'] = [24, 34, 29, 48, 18, 13, 36, 16, 27, 25].map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, biSheet, 'PowerBI_Data');

      const locations = XLSX.utils.aoa_to_sheet([
        [ui('الحرم / الموقع', 'Campus'), ui('مباني السجل', 'Registry buildings'),
          ui('مبانٍ مرتبطة بصك', 'Linked buildings'), ui('مواقع أراضٍ شاغرة', 'Vacant sites')],
        ...campusRows.map((row) => [safeSpreadsheetLabel(row.campus), data.buildings ? row.buildings : null,
          data.buildings ? row.linked : null, data.vacant ? row.vacant : null]),
      ]);
      locations['!cols'] = [44, 23, 24, 25].map((wch) => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, locations, 'Campus_Distribution');
      XLSX.writeFile(workbook, 'IAU-DEEDS-Executive-' + snapshotAt.toISOString().slice(0, 10) + '.xlsx');
    } catch (error) {
      console.error('Failed to export executive report', error);
      window.alert(ui('تعذر إعداد ملف Excel. أعد المحاولة.', 'Excel export failed. Please retry.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 pb-10" dir={ar ? 'rtl' : 'ltr'}>
      <style>{'@media print { @page { size: A4 landscape; margin: 11mm; } body * { visibility: hidden !important; } #executive-report, #executive-report * { visibility: visible !important; } #executive-report { position:absolute !important; top:0 !important; left:0 !important; width:100% !important; background:white !important; color:#172033 !important; padding:0 !important; margin:0 !important; box-shadow:none !important; } #executive-report .no-print { display:none !important; } #executive-report .print-card { break-inside:avoid; page-break-inside:avoid; box-shadow:none !important; background:white !important; border:1px solid #cbd5e1 !important; color:#172033 !important; } #executive-report .print-card * { color:#172033 !important; } #executive-report tr { break-inside:avoid; } #executive-report .print-muted { color:#475569 !important; } }'}</style>
      <nav className="no-print flex flex-wrap items-center justify-between gap-3" aria-label={ui('إجراءات التقرير', 'Report actions')}>
        <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
          <ArrowRight className="h-4 w-4" />{ui('العودة للوحة المؤشرات', 'Back to dashboard')}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={loading} onClick={() => setRevision((v) => v + 1)} className="gap-2">
            <RefreshCw className="h-4 w-4" />{ui('تحديث البيانات', 'Refresh')}
          </Button>
          {canExport && (
            <>
              <Button variant="outline" className="gap-2" disabled={loading || !count}
                onClick={() => window.print()}>
                <Printer className="h-4 w-4" />{ui('طباعة / حفظ PDF', 'Print / Save PDF')}
              </Button>
              <Button className="gap-2" disabled={loading || !count || exporting} onClick={() => void writeExcel()}>
                <FileSpreadsheet className="h-4 w-4" />{exporting
                  ? ui('جارٍ إعداد Excel', 'Preparing Excel') : ui('Excel + Power BI', 'Excel + Power BI')}
              </Button>
            </>
          )}
        </div>
      </nav>

      <div className="no-print grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">{ui('الحرم / الموقع للمباني والأراضي الشاغرة', 'Buildings and vacant lands campus')}</span>
          <select value={selectedCampus} onChange={(e) => setCampus(e.target.value)} disabled={loading}
            className="h-10 rounded-xl border bg-background px-3 text-foreground">
            <option value="">{ui('جميع المواقع', 'All locations')}</option>
            {campuses.map((site) => <option key={site} value={site}>{site}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold">{ui('الفترة للصكوك والمعاينات', 'Deeds and inspections period')}</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value as ReportPeriod)} disabled={loading}
            className="h-10 rounded-xl border bg-background px-3 text-foreground">
            <option value="all">{ui('جميع الفترات', 'All time')}</option>
            <option value="30">{ui('آخر ٣٠ يومًا', 'Last 30 days')}</option>
            <option value="90">{ui('آخر ٩٠ يومًا', 'Last 90 days')}</option>
            <option value="365">{ui('آخر سنة', 'Last year')}</option>
          </select>
        </label>
      </div>

      <main id="executive-report" className="min-w-0 space-y-5 rounded-2xl bg-background p-2 sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary/30 pb-4">
          <div className="flex items-center gap-4">
            <img src={PLATFORM_LOGO_URL} alt={ui('شعار المنصة', 'Platform logo')} className="h-16 w-16 object-contain" />
            <div>
              <p className="text-sm font-semibold text-primary">{ui('جامعة الإمام عبدالرحمن بن فيصل', 'Imam Abdulrahman Bin Faisal University')}</p>
              <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{ui('التقرير التنفيذي لأوقاف وأملاك الجامعة', 'University properties executive report')}</h1>
              <p className="print-muted mt-1 text-sm text-muted-foreground">{ui('من منصة IAU-DEEDS — بيانات ضمن الصلاحيات', 'IAU-DEEDS — authorized records only')}</p>
            </div>
          </div>
          <div className="rounded-xl border px-4 py-2 text-sm">
            <p className="font-bold">{ui('تاريخ ووقت التقرير', 'Generated at')}</p>
            <p className="mt-1 tabular-nums">{loading ? '—' : snapshotLabel}</p>
            <p className="print-muted mt-1 text-xs text-muted-foreground">{ui('للاستخدام الإداري', 'Internal use')}</p>
          </div>
        </header>
        <p className="print-muted text-sm leading-7 text-muted-foreground">{snapshotScope}</p>

        {loading || permissionLoading ? (
          <Card><CardContent className="py-12 text-center">{ui('جارٍ تحميل مصادر البيانات…', 'Loading report sources…')}</CardContent></Card>
        ) : sections.length === 0 ? (
          <Card><CardContent className="flex items-center gap-3 py-8">
            <ShieldCheck className="h-6 w-6" />{ui('لا توجد مؤشرات ضمن صلاحيات هذا الحساب.', 'No indicators available for this account.')}
          </CardContent></Card>
        ) : (
          <>
            {qualityNotes.length > 0 && (
              <div role="note" className="space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" />
                  {ui('ملاحظات اكتمال البيانات', 'Data coverage notices')}</p>
                {qualityNotes.map((note) => <p key={note} className="leading-6">{note}</p>)}
              </div>
            )}
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-lg font-extrabold"><BarChart3 className="h-5 w-5 text-primary" />
                {ui('المؤشرات الرئيسية', 'Headline KPIs')}</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                {[
                  ['buildings.total', 'إجمالي المباني', 'Buildings'],
                  ['deeds.total', 'عدد الصكوك', 'Deeds'],
                  ['vacant.verified', 'الأراضي الشاغرة المعتمدة', 'Verified vacant lands'],
                  ['inspections.total', 'المعاينات', 'Inspections'],
                  ['followup.overdue', 'المعاملات المتأخرة', 'Overdue follow-ups'],
                ].map(([key, labelAr, labelEn]) => {
                  const item = available.flatMap((s) => s.metrics).find((m) => m.key === key);
                  const moduleKey = key.startsWith('buildings.') ? 'buildings' : key.startsWith('deeds.') ? 'deeds'
                    : key.startsWith('vacant.') ? 'vacant' : key.startsWith('inspections.') ? 'inspections' : 'followUp';
                  if (!enabled[moduleKey]) return null;
                  return (
                    <div key={key} className="print-card rounded-xl border bg-card p-4 shadow-sm">
                      <p className="text-sm font-semibold leading-6 text-muted-foreground">{ui(labelAr, labelEn)}</p>
                      <p className="mt-2 text-2xl font-black tabular-nums">{item ? metricText(item) : '—'}</p>
                      <p className="print-muted text-xs text-muted-foreground">{item ? ui('متاح', 'Available') : ui('غير متاح', 'Unavailable')}</p>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
              {sections.map((section) => (
                <Card className="print-card min-w-0" key={section.key}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div><CardTitle className="text-base">{ui(section.titleAr, section.titleEn)}</CardTitle>
                      <CardDescription className="mt-1">{ui('المصدر', 'Source')}: {section.source}</CardDescription>
                    </div>
                    <span className="rounded-lg bg-muted px-2 py-1 text-xs font-bold">{section.available
                      ? ui('محمل', 'Loaded') : ui('غير متاح', 'Unavailable')}</span>
                  </CardHeader>
                  <CardContent>
                    {!section.available ? (
                      <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />{errors[section.key as DataKey]
                          ? ui('تعذر تحميل البيانات؛ لم تُحتسب أصفار افتراضية.', 'Unavailable; no zero counts assumed.')
                          : ui('لا تتوفر بيانات', 'No source available')}
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>{section.metrics.map((m) => (
                          <tr key={m.key} className="border-t first:border-t-0">
                            <td className="py-2.5 pe-3 leading-6">{ui(m.labelAr, m.labelEn)}
                              {m.noteAr && <span className="print-muted block text-xs text-muted-foreground">{ui(m.noteAr, m.noteEn || '')}</span>}
                            </td>
                            <td className="whitespace-nowrap py-2.5 text-end font-extrabold tabular-nums">{metricText(m)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    )}
                    {section.available && links[section.source] && (
                      <Button className="no-print mt-2" size="sm" variant="ghost" onClick={() => navigate(links[section.source])}>
                        {ui('فتح السجل', 'Open records')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </section>
            {(enabled.buildings || enabled.vacant) && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold">{ui('توزيع المباني والأراضي الشاغرة حسب الموقع', 'Buildings and vacant lands by campus')}</h2>
                <div className="print-card overflow-x-auto rounded-xl border bg-card">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-muted/30"><tr>
                      <th className="p-3 text-start">{ui('الحرم / الموقع', 'Campus')}</th>
                      {enabled.buildings && <th className="p-3 text-end">{ui('المباني', 'Buildings')}</th>}
                      {enabled.buildings && <th className="p-3 text-end">{ui('المرتبطة بصك', 'Linked')}</th>}
                      {enabled.vacant && <th className="p-3 text-end">{ui('الأراضي الشاغرة', 'Vacant sites')}</th>}
                    </tr></thead>
                    <tbody>{campusRows.map((row) => (
                      <tr key={row.campus} className="border-t">
                        <td className="p-3">{row.campus}</td>
                        {enabled.buildings && <td className="p-3 text-end">{data.buildings ? fmt(row.buildings) : '—'}</td>}
                        {enabled.buildings && <td className="p-3 text-end">{data.buildings ? fmt(row.linked) : '—'}</td>}
                        {enabled.vacant && <td className="p-3 text-end">{data.vacant ? fmt(row.vacant) : '—'}</td>}
                      </tr>))}
                    {!campusRows.length && <tr><td colSpan={4} className="p-5 text-center">{ui('لا توجد مواقع', 'No campuses to show')}</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
        <footer className="print-muted border-t pt-3 text-xs leading-6 text-muted-foreground">
          <p>{ui('معلومات التقرير للمتابعة الإدارية، وليست إثباتًا لملكية العقار أو اعتمادًا لمساحته.',
            'For monitoring only, not proof of ownership or certified area.')}</p>
          <p>{ui('أعداد السجلات لا تعني عدد عقارات فريدة. وورقة PowerBI_Data لقطة تجميعية وليست ربطًا مباشرًا مع Power BI.',
            'Record counts are not unique property counts. PowerBI_Data is an aggregate snapshot, not a live Power BI connection.')}</p>
        </footer>
      </main>
      {!canExport && <p className="no-print text-sm text-muted-foreground">{ui('صلاحية طباعة التقارير مطلوبة للتصدير والطباعة.', 'Report print permission is required for export and printing.')}</p>}
    </div>
  );
};
