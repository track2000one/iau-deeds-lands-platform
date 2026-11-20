import type { TransactionFollowUpDashboard } from '../api/transactionFollowUp';

export type ReportRow = {
  id?: string;
  deedNumber?: string | null;
  campusLocation?: string | null;
  campus?: string | null;
  operationalStatus?: string | null;
  deedId?: string | null;
  deed?: { id?: string | null } | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  area?: number | string | null;
  approximateArea?: number | string | null;
  verifiedVacantArea?: number | string | null;
  status?: string | null;
  visitDate?: string | null;
  workflowStatus?: string | null;
  priority?: string | null;
  createdAt?: string | null;
  coordinates?: unknown;
};
export type CollectionKey =
  | 'deeds' | 'buildings' | 'vacant' | 'inspections'
  | 'allocated' | 'delivered' | 'leasedOut' | 'leasedIn'
  | 'leasedBuildingsOut' | 'leasedBuildingsIn';
export type ReportData = Record<CollectionKey, ReportRow[] | null> & {
  followUp: TransactionFollowUpDashboard | null;
};
export type MetricValue = {
  key: string;
  labelAr: string;
  labelEn: string;
  value: number;
  unit: 'count' | 'sqm' | 'percent';
  source: string;
  noteAr?: string;
  noteEn?: string;
  scope: string;
};
export type MetricSection = {
  key: string;
  titleAr: string;
  titleEn: string;
  metrics: MetricValue[];
  available: boolean;
  source: string;
};
export const emptyReportData = (): ReportData => ({
  deeds: null, buildings: null, vacant: null, inspections: null,
  allocated: null, delivered: null, leasedOut: null, leasedIn: null,
  leasedBuildingsOut: null, leasedBuildingsIn: null, followUp: null,
});
export const positiveNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};
export const coordinatePairPresent = (row: ReportRow): boolean => {
  if (row.latitude === null || row.latitude === undefined || row.latitude === '' ||
      row.longitude === null || row.longitude === undefined || row.longitude === '') return false;
  const lat = Number(row.latitude);
  const lon = Number(row.longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    Number.isFinite(lon) && lon >= -180 && lon <= 180;
};
export const hasCoordinates = (value: unknown): boolean => {
  if (!value) return false;
  if (typeof value === 'object') {
    const maybe = value as { latitude?: unknown; longitude?: unknown };
    return coordinatePairPresent({ latitude: maybe.latitude as number, longitude: maybe.longitude as number });
  }
  return typeof value === 'string' && value.trim().length > 0;
};
export const isWithinDays = (date: unknown, days: number | null, now: number): boolean => {
  if (days === null) return true;
  const parsed = new Date(String(date || '')).getTime();
  return Number.isFinite(parsed) && parsed <= now && parsed >= now - days * 86400000;
};
export const metric = (
  key: string, labelAr: string, labelEn: string, value: number,
  unit: MetricValue['unit'], source: string, scope = 'all',
  noteAr?: string, noteEn?: string,
): MetricValue => ({ key, labelAr, labelEn, value, unit, source, scope, noteAr, noteEn });
export const rate = (numerator: number, denominator: number): number | null =>
  denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : null;

export const buildExecutiveSections = (
  data: ReportData,
  enabled: Record<CollectionKey | 'followUp', boolean>,
  campus: string,
  period: number | null,
  now: number,
): MetricSection[] => {
  const output: MetricSection[] = [];
  const rows = (key: CollectionKey) => data[key] ?? [];
  const visible = (key: CollectionKey) => enabled[key] && data[key] !== null;
  const includeSection = (key: CollectionKey | 'followUp', titleAr: string, titleEn: string,
    source: string, metrics: MetricValue[]) => {
    if (enabled[key]) output.push({ key, titleAr, titleEn, source, metrics, available: key === 'followUp' ? data.followUp !== null : data[key] !== null });
  };
  const scopedBuildings = rows('buildings').filter((row) => !campus || (row.campusLocation || '').trim() === campus);
  const scopedLands = rows('vacant').filter((row) => !campus || (row.campus || '').trim() === campus);
  const recentDeeds = rows('deeds').filter((row) => isWithinDays(row.createdAt, period, now));
  const recentInspections = rows('inspections').filter((row) => isWithinDays(row.visitDate, period, now));
  const area = (item: ReportRow, field: 'area' | 'approximateArea' | 'verifiedVacantArea') => positiveNumber(item[field]);
  if (enabled.buildings) {
    const linked = scopedBuildings.filter((row) => Boolean(row.deedId || row.deed?.id)).length;
    const geocoded = scopedBuildings.filter(coordinatePairPresent).length;
    const active = scopedBuildings.filter((row) => row.operationalStatus === 'active').length;
    const base = [
      metric('buildings.total', 'المباني المسجلة', 'Registered buildings', scopedBuildings.length, 'count', 'central_buildings', campus || 'all'),
      metric('buildings.linked', 'مبانٍ مرتبطة بصك', 'Linked to deed', linked, 'count', 'central_buildings', campus || 'all'),
      metric('buildings.unlinked', 'مبانٍ دون ارتباط بصك', 'Without deed link', scopedBuildings.length - linked, 'count', 'central_buildings', campus || 'all'),
      metric('buildings.geocoded', 'مبانٍ بإحداثيات صحيحة', 'With valid coordinates', geocoded, 'count', 'central_buildings', campus || 'all'),
      metric('buildings.active', 'مبانٍ قائمة ونشطة', 'Active buildings', active, 'count', 'central_buildings', campus || 'all'),
      metric('buildings.not_existing', 'مبانٍ غير قائمة', 'Not-existing buildings', scopedBuildings.filter((row) => row.operationalStatus === 'not_existing').length, 'count', 'central_buildings', campus || 'all'),
    ];
    const percentage = rate(linked, scopedBuildings.length);
    if (percentage !== null) base.push(metric('buildings.linkage_rate', 'نسبة ارتباط المباني بالصكوك', 'Deed linkage rate', percentage, 'percent', 'central_buildings', campus || 'all'));
    includeSection('buildings', 'السجل المركزي للمباني', 'Central building registry', 'central_buildings', base);
  }
  if (enabled.deeds) {
    const complete = recentDeeds.filter((row) => String(row.deedNumber ?? '').trim() &&
      area(row, 'area') > 0 && hasCoordinates(row.coordinates)).length;
    includeSection('deeds', 'الصكوك العقارية', 'Property deeds', 'deeds', [
      metric('deeds.total', 'الصكوك المسجلة', 'Recorded deeds', recentDeeds.length, 'count', 'deeds', 'all'),
      metric('deeds.area_sqm', 'مجموع مساحات الصكوك (م²)', 'Recorded deed area (sqm)', recentDeeds.reduce((sum, row) => sum + area(row, 'area'), 0), 'sqm', 'deeds', 'all',
        'مجموع مساحات السجلات، وقد تتكرر العقارات', 'Sum of record areas, not deduplicated properties'),
      metric('deeds.complete_core', 'صكوك مكتملة الرقم والمساحة والإحداثيات', 'Deeds with number, area and coordinates', complete, 'count', 'deeds', 'all'),
      metric('deeds.missing_coordinates', 'صكوك دون إحداثيات', 'Deeds missing coordinates', recentDeeds.filter((row) => !hasCoordinates(row.coordinates)).length, 'count', 'deeds', 'all'),
    ]);
  }
  if (enabled.vacant) {
    const verified = scopedLands.filter((row) => row.status === 'VERIFIED_VACANT');
    includeSection('vacant', 'الأراضي الشاغرة', 'Vacant lands', 'vacant_lands', [
      metric('vacant.total_loaded', 'مواقع الأراضي المحملة', 'Vacant land sites loaded', scopedLands.length, 'count', 'vacant_lands', campus || 'all'),
      metric('vacant.verified', 'مواقع شاغرة معتمدة', 'Verified vacant sites', verified.length, 'count', 'vacant_lands', campus || 'all'),
      metric('vacant.in_review', 'مواقع مبدئية أو قيد المراجعة', 'Draft or under review', scopedLands.filter((row) => row.status === 'DRAFT' || row.status === 'UNDER_REVIEW').length, 'count', 'vacant_lands', campus || 'all'),
      metric('vacant.approximate_sqm', 'إجمالي المساحات التقديرية (م²)', 'Indicative area (sqm)', scopedLands.reduce((sum, row) => sum + area(row, 'approximateArea'), 0), 'sqm', 'vacant_lands', campus || 'all'),
      metric('vacant.verified_sqm', 'المساحة الشاغرة المعتمدة (م²)', 'Verified vacant area (sqm)', verified.reduce((sum, row) => sum + area(row, 'verifiedVacantArea'), 0), 'sqm', 'vacant_lands', campus || 'all'),
    ]);
  }
  if (enabled.inspections) {
    const completed = recentInspections.filter((row) => ['resolved', 'closed'].includes(row.workflowStatus || '')).length;
    includeSection('inspections', 'المعاينات الميدانية', 'Field inspections', 'site_inspections', [
      metric('inspections.total', 'المعاينات المسجلة', 'Inspections', recentInspections.length, 'count', 'site_inspections', 'all'),
      metric('inspections.open', 'المعاينات قيد الإجراء', 'Open inspections', recentInspections.length - completed, 'count', 'site_inspections', 'all'),
      metric('inspections.completed', 'المعاينات المغلقة / المعالجة', 'Resolved / closed', completed, 'count', 'site_inspections', 'all'),
      metric('inspections.high_priority_open', 'معاينات مفتوحة عالية الأولوية', 'High-priority open inspections', recentInspections.filter((row) =>
        !['resolved', 'closed'].includes(row.workflowStatus || '') && ['high', 'urgent', 'critical'].includes((row.priority || '').toLowerCase())).length, 'count', 'site_inspections', 'all'),
    ]);
  }
  if (enabled.followUp) {
    const f = data.followUp;
    includeSection('followUp', 'نظام متابعة المعاملات', 'Transaction follow-up', 'transaction_follow_up', f ? [
      metric('followup.open', 'المعاملات المفتوحة', 'Open transactions', f.open, 'count', 'transaction_follow_up', 'authorized'),
      metric('followup.overdue', 'المعاملات المتأخرة', 'Overdue transactions', f.overdue, 'count', 'transaction_follow_up', 'authorized'),
      metric('followup.waiting', 'المعاملات بانتظار الرد', 'Awaiting response', f.waiting, 'count', 'transaction_follow_up', 'authorized'),
      metric('followup.completed', 'المعاملات المنجزة / المغلقة', 'Completed / closed', f.completed, 'count', 'transaction_follow_up', 'authorized'),
      metric('followup.unassigned', 'المعاملات غير المسندة', 'Unassigned transactions', f.unassigned, 'count', 'transaction_follow_up', 'authorized'),
    ] : []);
  }
  const extra: Array<[CollectionKey, string, string, string]> = [
    ['allocated', 'الأراضي المخصصة', 'Allocated lands', 'allocated_lands'],
    ['delivered', 'الأراضي المسلّمة', 'Delivered lands', 'delivered_lands'],
    ['leasedOut', 'الأراضي المؤجرة', 'Leased out lands', 'leased_lands_out'],
    ['leasedIn', 'الأراضي المستأجرة', 'Leased in lands', 'leased_lands_in'],
    ['leasedBuildingsOut', 'المباني المؤجرة', 'Leased out buildings', 'leased_buildings_out'],
    ['leasedBuildingsIn', 'المباني المستأجرة', 'Leased in buildings', 'leased_buildings_in'],
  ];
  for (const [key, ar, en, source] of extra) {
    if (enabled[key]) includeSection(key, ar, en, source, [
      metric(key + '.records', 'إجمالي السجلات', 'Total records', rows(key).length, 'count', source),
    ]);
  }
  // An unavailable module should never appear to have zero records.
  return output.map((section) => section.available ? section : { ...section, metrics: [] });
};

/** Neutralizes spreadsheet formula prefixes in user-defined labels, even with leading whitespace. */
export const safeSpreadsheetLabel = (value: unknown): string => {
  const original = String(value ?? '');
  return /^[=+@\-]/.test(original.trimStart()) || /^[\t\r\n]/.test(original)
    ? "'" + original : original;
};
