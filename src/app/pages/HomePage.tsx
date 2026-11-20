import React from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Activity, AlertTriangle, ArrowUpLeft, BarChart3, BellRing, Building2,
  CalendarDays, CheckCircle2, ChevronLeft, ClipboardList, Download, Printer,
  FileCheck2, FileText, Filter, Layers3, MapPinned, PieChart as PieChartIcon,
  PlusCircle, RefreshCw, Ruler, Search, ShieldCheck, TrendingUp, WalletCards,
  type LucideIcon,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useDeeds } from '../../context/DeedContext';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../context/PermissionsContext';
import { mosqueApi, type MosqueBuilding } from '../api/mosques';
import {
  transactionFollowUpApi,
  type TransactionFollowUpDashboard,
} from '../api/transactionFollowUp';
import { PLATFORM_LOGO_URL } from '../config/branding';
import { HomeOperationalAnalytics } from '../components/HomeOperationalAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

type Period = '30' | '90' | '365' | 'all';
type MonthRange = 6 | 12;
type Metric = {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  route: string;
  tone: string;
  iconTone: string;
};
type NavigationItem = {
  label: string;
  subtitle: string;
  path: string;
  icon: LucideIcon;
};

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const positiveArea = (value: unknown) => Math.max(0, numberValue(value));
const hasText = (value: unknown) => String(value ?? '').trim().length > 0;
const DASHBOARD_FONT_STORAGE_KEY = 'iau-deeds.dashboard-font-size.v1';
const DASHBOARD_FONT_PRESETS = [100, 115, 130, 145] as const;
const DEFAULT_DASHBOARD_FONT = 115;
const initialDashboardFontSize = (): number => {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_FONT;
  try {
    const saved = Number(window.localStorage.getItem(DASHBOARD_FONT_STORAGE_KEY));
    return DASHBOARD_FONT_PRESETS.find((value) => value === saved) ?? DEFAULT_DASHBOARD_FONT;
  } catch {
    return DEFAULT_DASHBOARD_FONT;
  }
};
const buildingCoordinatesValid = (building: MosqueBuilding) => {
  if (building.latitude == null || building.longitude == null) return false;
  const latitude = Number(building.latitude);
  const longitude = Number(building.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};
const validDate = (value: unknown) => {
  const timestamp = new Date(value as string).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const ar = i18n.language.startsWith('ar');
  const locale = ar ? 'ar-SA' : 'en-US';
  const ui = (arabic: string, english: string) => ar ? arabic : english;
  const fmt = (value: number) => new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
  const { deeds, loading: deedsLoading } = useDeeds();
  const {
    allocatedLands, deliveredLands, leasedLandsOut, leasedLandsIn,
    leasedBuildingsOut, leasedBuildingsIn, loading: recordsLoading,
  } = useData();
  const { isAdmin, hasPermission, loading: permissionsLoading } = usePermissions();

  const access = (module: Parameters<typeof hasPermission>[0]) =>
    isAdmin || hasPermission(module, 'canView');
  const canDeeds = access('deeds');
  const canAllocated = access('allocated_lands');
  const canDelivered = access('delivered_lands');
  const canLeasedOut = access('leased_lands_out');
  const canLeasedIn = access('leased_lands_in');
  const canBuildingsOut = access('leased_buildings_out');
  const canBuildingsIn = access('leased_buildings_in');
  const canRegistry = access('central_buildings');
  const canFollowUp = access('transaction_follow_up');
  const canArchive = access('archive');
  const canReports = access('reports');
  const canVacant = access('vacant_lands');
  const canInvestments = access('investments');
  const canAssets = access('assets');
  const canAccounting = access('accounting_transformation');
  const canMosques = access('mosques');
  const canInspections = access('site_inspections');
  const canContracts = access('contracts_follow_up');
  const dataLoading = deedsLoading || recordsLoading || permissionsLoading;

  const [buildings, setBuildings] = React.useState<MosqueBuilding[] | null>(null);
  const [buildingsError, setBuildingsError] = React.useState(false);
  const [followUp, setFollowUp] = React.useState<TransactionFollowUpDashboard | null>(null);
  const [followUpError, setFollowUpError] = React.useState(false);
  const [filterDays, setFilterDays] = React.useState<Period>('all');
  const [monthRange, setMonthRange] = React.useState<MonthRange>(6);
  const [buildingCampus, setBuildingCampus] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [sort, setSort] = React.useState<'newest' | 'oldest'>('newest');
  const [dashboardFontSize, setDashboardFontSize] = React.useState<number>(initialDashboardFontSize);
  const fontPresetIndex = DASHBOARD_FONT_PRESETS.findIndex((size) => size === dashboardFontSize);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(DASHBOARD_FONT_STORAGE_KEY, String(dashboardFontSize));
    } catch {
      // Browser storage may be disabled; the controls still work for this visit.
    }
  }, [dashboardFontSize]);

  const adjustDashboardFontSize = (direction: -1 | 1) => {
    const nextIndex = Math.min(DASHBOARD_FONT_PRESETS.length - 1, Math.max(0, fontPresetIndex + direction));
    setDashboardFontSize(DASHBOARD_FONT_PRESETS[nextIndex]);
  };

  React.useEffect(() => {
    if (permissionsLoading) return;
    let active = true;
    if (canRegistry) {
      mosqueApi.buildings().then((rows) => {
        if (!active) return;
        setBuildings(Array.isArray(rows) ? rows : []);
        setBuildingsError(false);
      }).catch(() => {
        if (!active) return;
        setBuildings(null);
        setBuildingsError(true);
      });
    } else {
      setBuildings(null);
      setBuildingsError(false);
    }
    if (canFollowUp) {
      transactionFollowUpApi.dashboard().then((result) => {
        if (!active) return;
        setFollowUp(result);
        setFollowUpError(false);
      }).catch(() => {
        if (!active) return;
        setFollowUp(null);
        setFollowUpError(true);
      });
    } else {
      setFollowUp(null);
      setFollowUpError(false);
    }
    return () => { active = false; };
  }, [canRegistry, canFollowUp, permissionsLoading]);

  const missingCoords = React.useMemo(() =>
    deeds.filter((deed) => !hasText(deed.coordinates)).length, [deeds]);
  const missingArea = React.useMemo(() =>
    deeds.filter((deed) => positiveArea(deed.area) <= 0).length, [deeds]);
  const totalDeedArea = React.useMemo(() =>
    deeds.reduce((total, deed) => total + positiveArea(deed.area), 0), [deeds]);
  const plannedCount = React.useMemo(() => deeds.filter((deed) => deed.isPlanned).length, [deeds]);
  const missingBuildingLinks = buildings?.filter((building) =>
    !building.deedId && !building.deed?.id).length ?? 0;
  const missingBuildingCoords = buildings?.filter((building) =>
    !buildingCoordinatesValid(building)).length ?? 0;

  const buildingCampuses = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const building of buildings ?? []) {
      const campus = building.campusLocation?.trim() || '';
      counts.set(campus, (counts.get(campus) || 0) + 1);
    }
    return [...counts].map(([key, count]) => ({
      key,
      name: key || ui('غير محدد', 'Not specified'),
      count,
    })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, locale));
  }, [buildings, locale]);

  // A campus choice changes the detailed criteria; the headline KPI stays university-wide.
  const selectedCampus = buildingCampuses.some((campus) => campus.key === buildingCampus)
    ? buildingCampus : '';
  const scopedBuildings = React.useMemo(() => {
    if (!buildings) return [];
    if (!selectedCampus) return buildings;
    return buildings.filter((building) => (building.campusLocation?.trim() || '') === selectedCampus);
  }, [buildings, selectedCampus]);
  const buildingCount = scopedBuildings.length;
  const buildingLinked = scopedBuildings.filter((building) =>
    Boolean(building.deedId || building.deed?.id)).length;
  const buildingGeocoded = scopedBuildings.filter(buildingCoordinatesValid).length;
  const buildingActive = scopedBuildings.filter((building) =>
    building.operationalStatus === 'active').length;
  const buildingNotExisting = scopedBuildings.filter((building) =>
    building.operationalStatus === 'not_existing').length;
  const buildingAreaProvided = scopedBuildings.filter((building) =>
    positiveArea(building.builtUpArea) > 0 || positiveArea(building.landArea) > 0).length;
  const buildingPercentage = (count: number) =>
    buildingCount ? Math.round(100 * count / buildingCount) : 0;
  const buildingStatusDefinitions = [
    { key: 'active', name: ui('قائم ونشط', 'Active'), color: '#10b981' },
    { key: 'maintenance', name: ui('تحت الصيانة', 'Maintenance'), color: '#f59e0b' },
    { key: 'under_construction', name: ui('تحت الإنشاء', 'Under construction'), color: '#3b82f6' },
    { key: 'temporarily_closed', name: ui('مغلق مؤقتًا', 'Temporarily closed'), color: '#8b5cf6' },
    { key: 'out_of_service', name: ui('خارج الخدمة', 'Out of service'), color: '#ef4444' },
    { key: 'not_existing', name: ui('غير قائم', 'Not existing'), color: '#64748b' },
    { key: 'other', name: ui('أخرى', 'Other'), color: '#06b6d4' },
    { key: 'unspecified', name: ui('غير محدد', 'Unspecified'), color: '#a3a3a3' },
  ];
  const statuses = new Set(buildingStatusDefinitions.map((item) => item.key));
  const buildingStatusDistribution = buildingStatusDefinitions.map((status) => ({
    ...status,
    count: scopedBuildings.filter((building) =>
      (statuses.has(building.operationalStatus || '') ? building.operationalStatus : 'unspecified') === status.key).length,
  })).filter((status) => status.count > 0);

  const topCampusRows = buildingCampuses.slice(0, 8).map((row) => ({
    ...row, selected: Boolean(selectedCampus && selectedCampus === row.key),
  }));
  if (buildingCampuses.length > 8) {
    topCampusRows.push({
      key: '__remaining__',
      name: ui('بقية المواقع', 'Remaining campuses'),
      count: buildingCampuses.slice(8).reduce((sum, row) => sum + row.count, 0),
      selected: buildingCampuses.slice(8).some((row) => row.key === selectedCampus),
    });
  }

  const deedCompleteness = React.useMemo(() => {
    if (!deeds.length) return null;
    const totalPresent = deeds.reduce((count, deed) =>
      count + Number(hasText(deed.deedNumber))
      + Number(positiveArea(deed.area) > 0)
      + Number(hasText(deed.city))
      + Number(hasText(deed.coordinates)), 0);
    return Math.round(100 * totalPresent / (deeds.length * 4));
  }, [deeds]);

  const recordGroups = [
    { name: ui('الصكوك', 'Deeds'), count: canDeeds ? deeds.length : 0, color: '#3b82f6', allowed: canDeeds },
    { name: ui('الأراضي المخصصة', 'Allocated lands'), count: canAllocated ? allocatedLands.length : 0, color: '#0d9488', allowed: canAllocated },
    { name: ui('الأراضي المسلّمة', 'Delivered lands'), count: canDelivered ? deliveredLands.length : 0, color: '#8b5cf6', allowed: canDelivered },
    { name: ui('الأراضي المؤجرة والمستأجرة', 'Leased lands'), count: (canLeasedOut ? leasedLandsOut.length : 0) + (canLeasedIn ? leasedLandsIn.length : 0), color: '#f59e0b', allowed: canLeasedOut || canLeasedIn },
    { name: ui('المباني المؤجرة والمستأجرة', 'Leased buildings'), count: (canBuildingsOut ? leasedBuildingsOut.length : 0) + (canBuildingsIn ? leasedBuildingsIn.length : 0), color: '#ec4899', allowed: canBuildingsOut || canBuildingsIn },
    { name: ui('السجل المركزي للمباني', 'Central buildings registry'), count: canRegistry && buildings ? buildings.length : 0, color: '#6366f1', allowed: canRegistry },
  ].filter((item) => item.allowed);
  const totalRecords = recordGroups.reduce((sum, item) => sum + item.count, 0);

  const metrics: Metric[] = [
    ...(canDeeds ? [
      { title: ui('الصكوك المسجلة', 'Registered deeds'), value: dataLoading ? '—' : fmt(deeds.length), subtitle: ui('إجمالي الصكوك في السجل', 'Total deeds'), icon: FileCheck2, route: '/deeds', tone: 'border-blue-200/60 dark:border-blue-800/50', iconTone: 'bg-blue-500/10 text-blue-600 dark:text-blue-300' },
      { title: ui('مساحة الصكوك', 'Deed area'), value: dataLoading ? '—' : fmt(totalDeedArea), subtitle: ui('متر مربع • مجموع المساحات المسجلة', 'Square metres • recorded sum'), icon: Ruler, route: '/deeds', tone: 'border-teal-200/60 dark:border-teal-800/50', iconTone: 'bg-teal-500/10 text-teal-600 dark:text-teal-300' },
    ] : []),
    ...(canRegistry ? [{
      title: ui('عدد المباني المسجلة', 'Registered buildings count'),
      value: buildings === null ? '—' : fmt(buildings.length),
      subtitle: buildingsError ? ui('تعذر تحميل البيانات', 'Data unavailable') : ui('المباني المسجلة فعليًا', 'Registered buildings'),
      icon: Building2, route: '/buildings/registry',
      tone: 'border-indigo-200/60 dark:border-indigo-800/50',
      iconTone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
    }] : []),
    ...(canAllocated ? [{
      title: ui('الأراضي المخصصة', 'Allocated lands'), value: recordsLoading ? '—' : fmt(allocatedLands.length),
      subtitle: ui('عدد سجلات الأراضي', 'Land records'), icon: MapPinned, route: '/lands/allocated',
      tone: 'border-emerald-200/60 dark:border-emerald-800/50',
      iconTone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    }] : []),
    ...(canLeasedOut || canLeasedIn ? [{
      title: ui('الأراضي المؤجرة / المستأجرة', 'Leased lands'),
      value: recordsLoading ? '—' : fmt((canLeasedOut ? leasedLandsOut.length : 0) + (canLeasedIn ? leasedLandsIn.length : 0)),
      subtitle: ui('مجموع سجلات عقود الأراضي', 'Land lease records'), icon: WalletCards,
      route: canLeasedOut ? '/lands/leased-out' : '/lands/leased-in',
      tone: 'border-amber-200/60 dark:border-amber-800/50',
      iconTone: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    }] : []),
    ...(canFollowUp ? [{
      title: ui('المعاملات المفتوحة', 'Open transactions'), value: followUp ? fmt(followUp.open) : '—',
      subtitle: followUpError ? ui('تعذر تحميل البيانات', 'Data unavailable') : ui('وفق نطاق صلاحية الحساب', 'Within your access scope'),
      icon: ClipboardList, route: '/follow-up',
      tone: 'border-rose-200/60 dark:border-rose-800/50',
      iconTone: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    }] : []),
  ];

  const trend = React.useMemo(() => {
    const now = new Date();
    const rows = [];
    for (let offset = monthRange - 1; offset >= 0; offset -= 1) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
      const from = monthStart.getTime();
      const until = monthEnd.getTime();
      rows.push({
        label: new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' }).format(monthStart),
        count: deeds.filter((deed) => {
          const time = validDate(deed.createdAt);
          return time >= from && time < until;
        }).length,
      });
    }
    return rows;
  }, [deeds, locale, monthRange]);

  const recentDeeds = React.useMemo(() => {
    const lowerQuery = query.trim().toLocaleLowerCase();
    const cutoff = filterDays === 'all' ? 0 : Date.now() - Number(filterDays) * 24 * 60 * 60 * 1000;
    return deeds.filter((deed) => {
      const searchable = [deed.deedNumber, deed.propertyDescription, deed.city, deed.district]
        .filter(Boolean).join(' ').toLocaleLowerCase();
      return (!lowerQuery || searchable.includes(lowerQuery)) &&
        (!cutoff || validDate(deed.createdAt) >= cutoff);
    }).sort((a, b) => sort === 'newest'
      ? validDate(b.createdAt) - validDate(a.createdAt)
      : validDate(a.createdAt) - validDate(b.createdAt));
  }, [deeds, query, filterDays, sort]);

  const notifications: Array<{ label: string; count: number; route: string; color: string }> = [];
  if (canFollowUp && followUp && followUp.overdue > 0) {
    notifications.push({ label: ui('معاملات تجاوزت تاريخ الاستحقاق', 'Overdue transactions'), count: followUp.overdue, route: '/follow-up', color: 'text-rose-600 dark:text-rose-300' });
  }
  if (canFollowUp && followUp && followUp.unassigned > 0) {
    notifications.push({ label: ui('معاملات غير مسندة', 'Unassigned transactions'), count: followUp.unassigned, route: '/follow-up', color: 'text-amber-600 dark:text-amber-300' });
  }
  if (canRegistry && buildings && missingBuildingLinks > 0) {
    notifications.push({ label: ui('مبانٍ غير مرتبطة بصك', 'Buildings without deed links'), count: missingBuildingLinks, route: '/buildings/registry', color: 'text-indigo-600 dark:text-indigo-300' });
  }
  if (canRegistry && buildings && missingBuildingCoords > 0) {
    notifications.push({ label: ui('مبانٍ دون إحداثيات', 'Buildings without coordinates'), count: missingBuildingCoords, route: '/buildings/registry', color: 'text-orange-600 dark:text-orange-300' });
  }
  if (canDeeds && !deedsLoading && missingCoords > 0) {
    notifications.push({ label: ui('صكوك دون إحداثيات', 'Deeds without coordinates'), count: missingCoords, route: '/deeds', color: 'text-amber-600 dark:text-amber-300' });
  }
  if (canDeeds && !deedsLoading && missingArea > 0) {
    notifications.push({ label: ui('صكوك دون مساحة مدخلة', 'Deeds missing area'), count: missingArea, route: '/deeds', color: 'text-rose-600 dark:text-rose-300' });
  }

  const actions: NavigationItem[] = [
    ...(isAdmin ? [{ label: ui('إضافة صك جديد', 'Add deed'), subtitle: ui('تسجيل وتوثيق الصك', 'Register a deed'), path: '/deeds/new', icon: PlusCircle }] : []),
    ...(canRegistry ? [{ label: ui('السجل المركزي للمباني', 'Buildings registry'), subtitle: ui('المباني والربط بالصكوك', 'Buildings and deed links'), path: '/buildings/registry', icon: Building2 }] : []),
    ...(canFollowUp ? [{ label: ui('نظام المتابعة', 'Transaction follow-up'), subtitle: ui('المعاملات والإجراءات', 'Transactions and actions'), path: '/follow-up', icon: ClipboardList }] : []),
    ...(canVacant ? [{ label: ui('الأراضي الشاغرة', 'Vacant lands'), subtitle: ui('المواقع والفرص المتاحة', 'Sites and opportunities'), path: '/lands/vacant', icon: MapPinned }] : []),
    ...(canInvestments ? [{ label: ui('المساحات والفرص الاستثمارية', 'Investments'), subtitle: ui('ملفات الاستثمار العقاري', 'Investment sites and opportunities'), path: '/investments', icon: WalletCards }] : []),
    ...(canAssets ? [{ label: ui('وحدة الأصول', 'Assets'), subtitle: ui('سجلات الأصول وتقاريرها', 'Asset registry and reports'), path: '/assets', icon: Layers3 }] : []),
    ...(canAccounting ? [{ label: ui('التحول المحاسبي', 'Accounting transformation'), subtitle: ui('الملفات المحاسبية والتقارير', 'Accounting files and reports'), path: '/accounting-transformation', icon: BarChart3 }] : []),
    ...(canMosques ? [{ label: ui('المساجد والمصليات الجامعية', 'Mosques and prayer rooms'), subtitle: ui('متابعة أعمال الوحدة', 'Unit workspace'), path: '/mosques', icon: Building2 }] : []),
    ...(canInspections ? [{ label: ui('المعاينات الميدانية', 'Site inspections'), subtitle: ui('المواقع والمعاينات', 'Field inspection records'), path: '/site-inspections', icon: MapPinned }] : []),
    ...(canContracts ? [{ label: ui('متابعة العقود', 'Contract follow-up'), subtitle: ui('سجل متابعة العقود', 'Contract follow-up registry'), path: '/contracts/follow-up', icon: ClipboardList }] : []),
    ...(canArchive ? [{ label: ui('الأرشيف', 'Archive'), subtitle: ui('المستندات والمرفقات', 'Documents and attachments'), path: '/archive', icon: Layers3 }] : []),
    ...(canReports ? [{ label: ui('مركز التقارير', 'Reports centre'), subtitle: ui('التصفية والطباعة', 'Filter and print'), path: '/reports', icon: BarChart3 },
      { label: ui('التقرير التنفيذي', 'Executive report'), subtitle: ui('مؤشرات الأعمال والتصدير إلى Excel وPDF', 'KPIs and Excel/PDF export'), path: '/reports/executive', icon: FileCheck2 }] : []),
    { label: ui('البحث والاستعلام', 'Search'), subtitle: ui('البحث في سجلات المنصة', 'Find platform records'), path: '/search', icon: Search },
  ];

  const dateLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const donutData = recordGroups.filter((group) => group.count > 0);
  const colors = { border: 'hsl(var(--border))', text: 'hsl(var(--muted-foreground))' };
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 12,
    color: 'hsl(var(--foreground))',
    fontSize: 13,
  };
  const exportPdf = () => {
    // Native print produces selectable Arabic text and preserves chart visuals without uploading data.
    if (!dataLoading) window.print();
  };
  const exportCsv = () => {
    const data = [
      [ui('المؤشر', 'Indicator'), ui('القيمة', 'Value')],
      ...metrics.map((metric) => [metric.title, metric.value]),
      ...recordGroups.map((group) => [group.name, String(group.count)]),
      ...(canRegistry && buildings ? [
        [ui('إجمالي مباني السجل المركزي', 'Central buildings total'), String(buildings.length)],
        [ui('المباني في النطاق المحدد', 'Buildings in selected campus'), String(buildingCount)],
        [ui('المباني المرتبطة بصك', 'Buildings linked to deed'), String(buildingLinked)],
        [ui('المباني بإحداثيات صحيحة', 'Buildings with valid coordinates'), String(buildingGeocoded)],
        [ui('المباني القائمة النشطة', 'Active buildings'), String(buildingActive)],
        [ui('المباني غير القائمة', 'Not existing buildings'), String(buildingNotExisting)],
        [ui('المباني المدخلة مساحاتها', 'Buildings with recorded area'), String(buildingAreaProvided)],
        ...buildingCampuses.map((campus) => [ui('مبانٍ حسب الحرم: ', 'Buildings by campus: ') + campus.name, String(campus.count)]),
        ...buildingStatusDistribution.map((status) => [ui('مبانٍ حسب الحالة: ', 'Buildings by status: ') + status.name, String(status.count)]),
      ] : []),
      ...(canDeeds ? [
        [ui('الصكوك دون إحداثيات', 'Deeds without coordinates'), String(missingCoords)],
        [ui('الصكوك دون مساحة', 'Deeds without area'), String(missingArea)],
        [ui('نسبة اكتمال الحقول الأساسية', 'Basic deed field completeness'), deedCompleteness === null ? '—' : String(deedCompleteness) + '%'],
      ] : []),
      ...(canFollowUp && followUp ? [
        [ui('المعاملات المتأخرة', 'Overdue transactions'), String(followUp.overdue)],
        [ui('المعاملات غير المسندة', 'Unassigned transactions'), String(followUp.unassigned)],
      ] : []),
    ];
    const csv = '\uFEFF' + data.map((row) =>
      row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(',')
    ).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'iau-deeds-dashboard-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="iau-dashboard-print-root" className="mx-auto w-full max-w-[1760px] min-w-0 space-y-5 pb-8 sm:space-y-6"
      style={{ zoom: dashboardFontSize / 100 }}>
      <style>{'@media print { @page { size: A4 landscape; margin: 12mm; } html,body { background: #fff !important; } body * { visibility: hidden !important; } #iau-dashboard-print-root, #iau-dashboard-print-root * { visibility: visible !important; } #iau-dashboard-print-root { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; zoom: 1 !important; transform: none !important; overflow: visible !important; color: #152238 !important; background: white !important; } #iau-dashboard-print-root .dashboard-no-print { display: none !important; } #iau-dashboard-print-root .dashboard-print-meta { display: block !important; } #iau-dashboard-print-root .future-card, #iau-dashboard-print-root .recharts-wrapper, #iau-dashboard-print-root .rounded-xl, #iau-dashboard-print-root .rounded-2xl { break-inside: avoid; page-break-inside: avoid; } #iau-dashboard-print-root h1 { font-size: 20pt !important; } #iau-dashboard-print-root h2 { font-size: 14pt !important; } #iau-dashboard-print-root p, #iau-dashboard-print-root span, #iau-dashboard-print-root td, #iau-dashboard-print-root th { font-size: 10pt !important; } #iau-dashboard-print-root input, #iau-dashboard-print-root select, #iau-dashboard-print-root button { display: none !important; } #iau-dashboard-print-root .bg-card, #iau-dashboard-print-root .future-card { background: white !important; color: #152238 !important; box-shadow: none !important; } #iau-dashboard-print-root .text-muted-foreground { color: #475569 !important; } } @media screen { #iau-dashboard-print-root .dashboard-print-meta { display: none !important; } }'}</style>
      <div className="dashboard-print-meta text-sm font-semibold" dir={ar ? 'rtl' : 'ltr'}>{ui('تقرير مؤشرات أوقاف وأملاك الجامعة', 'University endowments and properties dashboard report')} — {dateLabel}. {ui('تُعرض المؤشرات وفق الصلاحيات المسندة للمستخدم. بيانات المباني المفصلة بحسب الحرم: ', 'Role-scoped indicators. Detailed building campus filter: ')}{selectedCampus || ui('جميع المواقع', 'All campuses')}</div>
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/15 via-card to-card px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -start-12 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-primary/15 bg-background/75 shadow-sm sm:h-16 sm:w-16">
              <img src={PLATFORM_LOGO_URL} alt={ui('شعار المنصة', 'Platform logo')} className="h-12 w-12 object-contain sm:h-14 sm:w-14" />
            </div>
            <div className="min-w-0 space-y-2">
              <Badge variant="secondary" className="gap-1.5 rounded-full border border-primary/15 bg-primary/10 text-primary">
                <Activity className="h-3.5 w-3.5" />
                {ui('لوحة المؤشرات التنفيذية', 'Executive dashboard')}
              </Badge>
              <h1 className="text-xl font-extrabold leading-snug tracking-tight text-foreground sm:text-2xl 2xl:text-3xl">
                {ui('نظرة شاملة على أوقاف وأملاك الجامعة', 'University endowments and properties overview')}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {ui('بيانات مباشرة من سجلات المنصة، مع مؤشرات للمتابعة وجودة البيانات وروابط للإجراءات.',
                  'Live platform records, operational indicators, data quality and actionable shortcuts.')}
              </p>
            </div>
          </div>
          <div className="dashboard-no-print flex shrink-0 flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-primary/25 bg-background/90 p-1.5 shadow-sm"
              role="group" aria-label={ui('التحكم بحجم الخط في لوحة المؤشرات', 'Dashboard font size controls')}>
              <span className="px-1.5 text-xs font-semibold text-muted-foreground">{ui('حجم الخط', 'Font size')}</span>
              <Button type="button" variant="outline" size="sm"
                className="h-9 min-w-10 rounded-lg px-2 text-base font-bold"
                onClick={() => adjustDashboardFontSize(-1)}
                disabled={fontPresetIndex <= 0}
                aria-label={ui('تصغير الخط', 'Decrease font size')}
                title={ui('تصغير الخط', 'Decrease font size')}>A−</Button>
              <button type="button" className="min-w-12 rounded-md px-1 text-center text-xs font-bold tabular-nums text-foreground hover:bg-muted"
                onClick={() => setDashboardFontSize(DEFAULT_DASHBOARD_FONT)}
                title={ui('استعادة حجم الخط الافتراضي', 'Reset default font size')}
                aria-label={ui('استعادة حجم الخط الافتراضي', 'Reset default font size')}>
                {dashboardFontSize}%
              </button>
              <Button type="button" variant="outline" size="sm"
                className="h-9 min-w-10 rounded-lg px-2 text-base font-bold"
                onClick={() => adjustDashboardFontSize(1)}
                disabled={fontPresetIndex >= DASHBOARD_FONT_PRESETS.length - 1}
                aria-label={ui('تكبير الخط', 'Increase font size')}
                title={ui('تكبير الخط', 'Increase font size')}>A+</Button>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {dateLabel}
            </span>
            <Button variant="outline" className="gap-2 rounded-xl bg-background/80" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4" />
              {ui('تحديث البيانات', 'Refresh')}
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl bg-background/80" onClick={exportCsv}>
              <Download className="h-4 w-4" />
              {ui('تصدير المؤشرات CSV / Excel', 'Export metrics CSV / Excel')}
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl bg-background/80" onClick={exportPdf}
              disabled={dataLoading} aria-label={ui('تصدير المؤشرات PDF', 'Export metrics PDF')}
              title={ui('اختر حفظ بصيغة PDF من نافذة الطباعة', 'Choose Save as PDF in the print dialog')}>
              <Printer className="h-4 w-4" />
              {ui('تصدير PDF', 'Export PDF')}
            </Button>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-border/50 pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/60 px-2.5 py-1.5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            {ui('العرض بحسب صلاحيات المستخدم', 'Role-scoped visibility')}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-background/60 px-2.5 py-1.5">
            <Layers3 className="h-4 w-4 text-primary" />
            {dataLoading ? ui('جارٍ تحميل السجلات', 'Loading records') : ui('إجمالي سجلات الوحدات المتاحة: ', 'Accessible category records: ') + fmt(totalRecords)}
          </span>
          <span>{ui('المؤشرات العددية إجمالية، ولا تعني عدد عقارات فريدة.', 'Counts are record totals, not unique properties.')}</span>
        </div>
      </section>

      <section className="space-y-3" aria-label={ui('المؤشرات الرئيسية', 'Key performance indicators')}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
              <BarChart3 className="h-5 w-5 text-primary" />
              {ui('المؤشرات الرئيسية', 'Key indicators')}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{ui('اضغط على أي مؤشر للانتقال إلى سجلاته', 'Select any indicator to see its records')}</p>
          </div>
          <Badge variant="outline">{ui('بيانات فعلية', 'Live records')}</Badge>
        </div>
        {metrics.length === 0 ? (
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="font-bold text-foreground">{ui('الصفحة الرئيسية متاحة لك', 'Your dashboard is available')}</p>
              <p className="text-sm leading-6 text-muted-foreground">
                {ui('لا توجد مؤشرات رقمية ضمن صلاحيات هذا الحساب حاليًا. يمكنك الانتقال إلى وحدات عملك من مركز الوصول السريع أدناه، وتُعرض إحصاءات الوحدات عند منح صلاحيات الاطلاع عليها.',
                  'There are no numeric indicators within this account’s current permissions. Open your assigned workspaces below; additional metrics appear when access is granted.')}
              </p>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <button type="button" key={metric.title} onClick={() => navigate(metric.route)}
                className={'group min-w-0 rounded-2xl border bg-card p-4 text-start shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ' + metric.tone}>
                <div className="flex items-start justify-between gap-3">
                  <span className={'grid h-11 w-11 place-items-center rounded-xl ' + metric.iconTone}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowUpLeft className="h-4 w-4 text-muted-foreground opacity-40 transition group-hover:opacity-100" />
                </div>
                <p className="mt-4 text-xs font-semibold text-muted-foreground">{metric.title}</p>
                <p className="mt-1 break-words text-2xl font-extrabold tracking-tight text-foreground tabular-nums">{metric.value}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{metric.subtitle}</p>
              </button>
            );
          })}
        </div>
        )}
      </section>


      {canRegistry && (
        <section className="space-y-4" aria-label={ui('مؤشرات السجل المركزي للمباني', 'Central buildings analytics')}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-foreground">
                <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                {ui('مؤشرات المباني الجامعية', 'University building indicators')}
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {ui('من السجل المركزي للمباني فقط، دون احتساب المباني المؤجرة أو المصليات كسجلات إضافية.',
                  'Based on central registry records only; leased buildings and prayer sites are not added.')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 rounded-xl border bg-card px-3 text-xs">
                <span className="font-semibold text-muted-foreground">{ui('الحرم / الموقع', 'Campus')}</span>
                <select value={selectedCampus} onChange={(event) => setBuildingCampus(event.target.value)}
                  disabled={buildings === null}
                  className="h-10 max-w-[175px] bg-transparent text-foreground outline-none"
                  aria-label={ui('تصفية المباني حسب الحرم', 'Filter buildings by campus')}>
                  <option value="">{ui('جميع المواقع', 'All campuses')}</option>
                  {buildingCampuses.filter((campus) => campus.key).map((campus) => (
                    <option key={campus.key} value={campus.key}>{campus.name} ({fmt(campus.count)})</option>
                  ))}
                </select>
              </label>
              <Button variant="outline" size="sm" onClick={() => navigate('/buildings/registry')} className="h-10 gap-2">
                {ui('فتح السجل المركزي', 'Open central registry')}
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {buildingsError ? (
            <Card className="future-card"><CardContent className="flex flex-col items-center gap-2 py-9 text-center">
              <AlertTriangle className="h-7 w-7 text-amber-600" />
              <p className="text-sm font-semibold">{ui('تعذر تحميل مباني السجل المركزي؛ لا يمكن حساب المؤشرات حاليًا.', 'Building records are unavailable. Metrics cannot be calculated.')}</p>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>{ui('إعادة المحاولة', 'Retry')}</Button>
            </CardContent></Card>
          ) : buildings === null ? (
            <Card className="future-card"><CardContent className="py-10 text-center text-sm text-muted-foreground">
              {ui('جارٍ تحميل بيانات المباني من السجل المركزي…', 'Loading central registry building data…')}
            </CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
                {[
                  { label: ui('إجمالي المباني', 'Total buildings'), value: buildingCount, sub: ui('سجلات النطاق المحدد', 'Records in selection'), icon: Building2, accent: 'text-indigo-600 dark:text-indigo-300' },
                  { label: ui('مرتبطة بصك', 'Linked to deeds'), value: buildingLinked, sub: fmt(buildingPercentage(buildingLinked)) + '% ' + ui('من مباني النطاق', 'of buildings'), icon: FileCheck2, accent: 'text-emerald-600 dark:text-emerald-300' },
                  { label: ui('بإحداثيات صحيحة', 'Geolocated'), value: buildingGeocoded, sub: fmt(buildingPercentage(buildingGeocoded)) + '% ' + ui('من مباني النطاق', 'of buildings'), icon: MapPinned, accent: 'text-sky-600 dark:text-sky-300' },
                  { label: ui('قائمة ونشطة', 'Active buildings'), value: buildingActive, sub: fmt(buildingPercentage(buildingActive)) + '% ' + ui('من مباني النطاق', 'of buildings'), icon: CheckCircle2, accent: 'text-teal-600 dark:text-teal-300' },
                  { label: ui('بمساحة مسجلة', 'Area documented'), value: buildingAreaProvided, sub: fmt(buildingPercentage(buildingAreaProvided)) + '% ' + ui('من مباني النطاق', 'of buildings'), icon: Ruler, accent: 'text-violet-600 dark:text-violet-300' },
                  { label: ui('غير قائمة', 'Not existing'), value: buildingNotExisting, sub: ui('بحسب الحالة المسجلة', 'As recorded'), icon: AlertTriangle, accent: 'text-slate-600 dark:text-slate-300' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold leading-5 text-muted-foreground">{item.label}</span>
                        <Icon className={'h-5 w-5 shrink-0 ' + item.accent} />
                      </div>
                      <p className="mt-3 text-2xl font-black tabular-nums text-foreground">{fmt(item.value)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
                    </div>
                  );
                })}
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                <Card className="future-card min-w-0 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      {ui('توزيع المباني حسب الحرم الجامعي', 'Buildings by campus')}
                    </CardTitle>
                    <CardDescription>{ui('أعلى ثمانية مواقع، مع تجميع بقية المواقع دون استبعاد سجلات', 'Top eight locations; remaining locations are grouped without excluding records')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topCampusRows.length === 0 ? (
                      <p className="grid h-[250px] place-items-center text-center text-sm text-muted-foreground">
                        {ui('لا توجد مبانٍ مسجلة لعرض التوزيع', 'No building records to chart')}
                      </p>
                    ) : (
                      <div className="w-full min-w-0" style={{ height: Math.max(260, topCampusRows.length * 47) }} dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topCampusRows} layout="vertical" margin={{ top: 4, right: 19, left: 5, bottom: 4 }}>
                            <CartesianGrid stroke={colors.border} strokeDasharray="4 4" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false}
                              tick={{ fill: colors.text, fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false}
                              tick={{ fill: colors.text, fontSize: 12 }}
                              tickFormatter={(value: string) => value.length > 19 ? value.slice(0, 18) + '…' : value} />
                            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                              formatter={(value: number) => [fmt(Number(value)), ui('مبنى', 'Buildings')]} />
                            <Bar dataKey="count" maxBarSize={22} radius={[0, 5, 5, 0]}>
                              {topCampusRows.map((row) => (
                                <Cell key={row.key} fill={row.selected ? '#0d9488' : '#6366f1'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {ui('يعرض الرسم جميع مواقع السجل، ويبرز الموقع المحدد باللون المختلف.', 'This chart shows all campus locations; the selected location is highlighted.')}
                    </p>
                  </CardContent>
                </Card>
                <Card className="future-card min-w-0 overflow-hidden">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PieChartIcon className="h-5 w-5 text-primary" />
                      {ui('الحالة التشغيلية للمباني', 'Building operational status')}
                    </CardTitle>
                    <CardDescription>
                      {selectedCampus ? ui('وفق الحرم / الموقع المحدد', 'For the selected campus') : ui('جميع المواقع الجامعية', 'Across all campuses')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {buildingStatusDistribution.length === 0 ? (
                      <p className="grid h-[220px] place-items-center text-center text-sm text-muted-foreground">
                        {ui('لا توجد حالات تشغيلية لعرض الرسم', 'No building status records available')}
                      </p>
                    ) : (
                      <div className="relative h-[230px] w-full min-w-0" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={buildingStatusDistribution} dataKey="count" nameKey="name" cx="50%" cy="50%"
                              innerRadius={67} outerRadius={97} paddingAngle={2} stroke="none">
                              {buildingStatusDistribution.map((status) => (
                                <Cell key={status.key} fill={status.color} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle}
                              formatter={(value: number) => [fmt(Number(value)), ui('مبنى', 'Buildings')]} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-extrabold tabular-nums">{fmt(buildingCount)}</span>
                          <span className="text-xs text-muted-foreground">{ui('مبنى', 'buildings')}</span>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 space-y-2">
                      {buildingStatusDistribution.map((status) => (
                        <div key={status.key} className="flex items-center justify-between gap-2 text-xs">
                          <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: status.color }} />
                            <span className="truncate">{status.name}</span>
                          </span>
                          <span className="shrink-0 font-bold tabular-nums text-foreground">
                            {fmt(status.count)} ({fmt(buildingPercentage(status.count))}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <p className="rounded-xl border border-dashed bg-muted/25 px-3 py-2 text-xs leading-5 text-muted-foreground">
                {ui('العدد يمثل السجلات الفعلية بالمباني بما فيها «غير قائم»، ولا يمثّل عدد المباني المشغولة أو عدد الصكوك الفريدة. وتُحدّث المؤشرات عند إعادة تحميل البيانات.',
                  'Counts reflect actual building records, including not-existing buildings; they are not occupancy counts or unique deed counts. Refresh to reload data.')}
              </p>
            </>
          )}
        </section>
      )}

      <HomeOperationalAnalytics
        canVacant={canVacant} canInspections={canInspections} canFollowUp={canFollowUp}
        followUp={followUp} followUpError={followUpError}
        locale={locale} ui={ui} fmt={fmt}
      />

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]" aria-label={ui('التحليل البياني', 'Analytics')}>
        <Card className="future-card min-w-0 overflow-hidden">
          <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-primary" />
                {ui('حركة تسجيل الصكوك', 'Deed registration activity')}
              </CardTitle>
              <CardDescription className="mt-1">
                {ui('عدد الصكوك المضافة شهريًا وفق تاريخ إنشاء السجل', 'Monthly additions by record creation date')}
              </CardDescription>
            </div>
            {canDeeds && (
              <div className="flex gap-1 rounded-xl border bg-background/50 p-1">
                {([6, 12] as const).map((months) => (
                  <button key={months} type="button" onClick={() => setMonthRange(months)}
                    aria-pressed={monthRange === months}
                    className={'rounded-lg px-3 py-1.5 text-xs transition ' +
                      (monthRange === months ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted')}>
                    {months} {ui('شهرًا', 'months')}
                  </button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="min-w-0">
            {!canDeeds ? (
              <div className="grid h-[255px] place-items-center text-center text-sm text-muted-foreground">
                {ui('لا تتوفر صلاحية عرض بيانات الصكوك', 'Deed access is unavailable')}
              </div>
            ) : deedsLoading ? (
              <div className="grid h-[255px] place-items-center text-sm text-muted-foreground">{ui('جارٍ تحميل المؤشرات…', 'Loading metrics…')}</div>
            ) : deeds.length === 0 ? (
              <div className="grid h-[255px] place-items-center text-center text-sm text-muted-foreground">{ui('لا توجد سجلات صكوك لعرض الرسم البياني', 'No deed data to chart')}</div>
            ) : (
              <div className="h-[260px] w-full min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 12, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="deed-activity-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={colors.border} strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: colors.text, fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: colors.text, fontSize: 12 }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmt(Number(value)), ui('صك مضاف', 'Deeds added')]} />
                    <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2.7}
                      fill="url(#deed-activity-fill)" dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                      activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="future-card min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-5 w-5 text-primary" />
              {ui('توزيع سجلات الأصول', 'Asset record distribution')}
            </CardTitle>
            <CardDescription>{ui('حسب نوع السجل، دون دمج السجلات المتشابهة', 'By category, without record deduplication')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recordsLoading || deedsLoading ? (
              <div className="grid h-[185px] place-items-center text-sm text-muted-foreground">{ui('جارٍ تحميل التصنيف…', 'Loading distribution…')}</div>
            ) : donutData.length === 0 ? (
              <div className="grid h-[185px] place-items-center text-sm text-muted-foreground">{ui('لا توجد سجلات متاحة للرسم البياني', 'No accessible records to chart')}</div>
            ) : (
              <div className="relative h-[180px] w-full min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="count" nameKey="name" cx="50%" cy="50%"
                      innerRadius={58} outerRadius={79} paddingAngle={3} stroke="none">
                      {donutData.map((item) => <Cell key={item.name} fill={item.color} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [fmt(Number(value)), ui('سجل', 'Records')]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-extrabold tabular-nums">{fmt(totalRecords)}</span>
                  <span className="text-xs text-muted-foreground">{ui('سجل', 'records')}</span>
                </div>
              </div>
            )}
            <div className="mt-2 space-y-2">
              {recordGroups.map((group) => (
                <div key={group.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: group.color }} />
                    <span className="truncate">{group.name}</span>
                  </span>
                  <span className="shrink-0 font-bold tabular-nums text-foreground">{fmt(group.count)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="future-card min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {ui('جودة بيانات الصكوك', 'Deed data completeness')}
            </CardTitle>
            <CardDescription>{ui('اكتمال أربعة حقول أساسية في سجلات الصكوك', 'Coverage of four core fields in deed records')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canDeeds ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{ui('هذا المؤشر يتطلب صلاحية عرض الصكوك', 'Deed access is required')}</p>
            ) : deedsLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{ui('جارٍ تحميل بيانات الصكوك…', 'Loading deeds…')}</p>
            ) : deedCompleteness === null ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{ui('لا توجد بيانات لحساب نسبة الاكتمال', 'No data for completeness')}</p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-primary/5 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{ui('نسبة تعبئة الحقول الأساسية', 'Core fields filled')}</p>
                    <p className="mt-1 text-3xl font-black tabular-nums text-foreground">{fmt(deedCompleteness)}%</p>
                  </div>
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <FileCheck2 className="h-7 w-7" />
                  </div>
                </div>
                {[
                  { label: ui('رقم الصك', 'Deed number'), count: deeds.filter((d) => hasText(d.deedNumber)).length },
                  { label: ui('مساحة الصك', 'Deed area'), count: deeds.length - missingArea },
                  { label: ui('المدينة', 'City'), count: deeds.filter((d) => hasText(d.city)).length },
                  { label: ui('الإحداثيات', 'Coordinates'), count: deeds.length - missingCoords },
                ].map((item) => {
                  const ratio = Math.round(item.count / deeds.length * 100);
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between gap-3 text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-bold tabular-nums">{fmt(item.count)} / {fmt(deeds.length)} ({fmt(ratio)}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={ratio} aria-valuemin={0} aria-valuemax={100} aria-label={item.label}>
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: String(ratio) + '%' }} />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs leading-5 text-muted-foreground">{ui('هذه النسبة تعكس تعبئة الحقول فقط، ولا تمثل اعتمادًا قانونيًا أو هندسيًا للمعلومات.', 'This measures field completion, not legal or engineering verification.')}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="future-card min-w-0 overflow-hidden">
          <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <BellRing className="h-5 w-5 text-primary" />
                {ui('مؤشرات تستدعي المراجعة', 'Attention indicators')}
              </CardTitle>
              <CardDescription className="mt-1">{ui('تنبيهات مستخلصة من البيانات، وليست بلاغات آلية', 'Data-derived flags, not system incidents')}</CardDescription>
            </div>
            {notifications.length > 0 && <Badge variant="secondary">{fmt(notifications.length)} {ui('بنود', 'flags')}</Badge>}
          </CardHeader>
          <CardContent className="space-y-2.5">
            {notifications.length > 0 ? notifications.map((item) => (
              <button type="button" key={item.label} onClick={() => navigate(item.route)}
                className="flex w-full items-center gap-3 rounded-xl border bg-background/35 p-3 text-start transition hover:border-primary/40 hover:bg-primary/5">
                <AlertTriangle className={'h-4 w-4 shrink-0 ' + item.color} />
                <span className="min-w-0 flex-1 text-sm text-foreground">{item.label}</span>
                <span className="rounded-lg bg-muted px-2 py-1 text-xs font-bold tabular-nums">{fmt(item.count)}</span>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            )) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-7 text-center text-muted-foreground">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                <p className="text-sm">{ui('لا توجد مؤشرات ظاهرة تستدعي المراجعة ضمن البيانات المحمّلة', 'No flagged items in available data')}</p>
              </div>
            )}
            {(buildingsError || followUpError) && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300">
                {ui('تعذر تحميل بعض المؤشرات؛ لا تعني النتائج الحالية خلو السجلات من الملاحظات.', 'Some indicators were unavailable; shown flags may be incomplete.')}
              </p>
            )}
            {canRegistry && buildings && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-xs">
                <span className="text-muted-foreground">{ui('ارتباط المباني بالصكوك', 'Building-to-deed linkage')}</span>
                <span className="font-bold tabular-nums">{fmt(buildings.length - missingBuildingLinks)} / {fmt(buildings.length)}</span>
              </div>
            )}
            {canFollowUp && followUp && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-xs">
                <span className="text-muted-foreground">{ui('المعاملات المنجزة أو المغلقة (غير المؤرشفة)', 'Completed/closed unarchived transactions')}</span>
                <span className="font-bold tabular-nums">{fmt(followUp.completed)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
        {canDeeds && (
          <Card className="future-card min-w-0 overflow-hidden">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-5 w-5 text-primary" />
                    {ui('آخر سجلات الصكوك', 'Recent deeds')}
                  </CardTitle>
                  <CardDescription className="mt-1">{ui('بحث وفرز حسب تاريخ إضافة السجل', 'Search and sort by record creation date')}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/deeds')} className="gap-1.5">
                  {ui('عرض جميع الصكوك', 'All deeds')}
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative min-w-[165px] flex-1">
                  <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
                    placeholder={ui('ابحث برقم الصك أو الموقع…', 'Search by deed or location…')}
                    aria-label={ui('البحث في الصكوك', 'Search deeds')}
                    className="h-9 w-full rounded-xl border bg-background/75 ps-9 pe-3 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
                </div>
                <label className="flex items-center gap-1.5 rounded-xl border bg-background/75 px-2 text-xs text-muted-foreground">
                  <Filter className="h-3.5 w-3.5" />
                  <span className="sr-only">{ui('المدة', 'Period')}</span>
                  <select value={filterDays} onChange={(event) => setFilterDays(event.target.value as Period)}
                    className="h-9 max-w-[125px] bg-transparent text-foreground outline-none" aria-label={ui('المدة', 'Period')}>
                    <option value="all">{ui('كل الفترات', 'All dates')}</option>
                    <option value="30">{ui('آخر 30 يومًا', 'Last 30 days')}</option>
                    <option value="90">{ui('آخر 90 يومًا', 'Last 90 days')}</option>
                    <option value="365">{ui('آخر سنة', 'Last year')}</option>
                  </select>
                </label>
                <select value={sort} onChange={(event) => setSort(event.target.value as 'newest' | 'oldest')}
                  className="h-9 rounded-xl border bg-background/75 px-2 text-xs text-foreground outline-none focus:border-primary"
                  aria-label={ui('ترتيب الصكوك', 'Sort deeds')}>
                  <option value="newest">{ui('الأحدث أولًا', 'Newest first')}</option>
                  <option value="oldest">{ui('الأقدم أولًا', 'Oldest first')}</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {deedsLoading ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{ui('جارٍ جلب السجلات…', 'Loading records…')}</p>
              ) : recentDeeds.length === 0 ? (
                <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">{ui('لا توجد صكوك مطابقة لمعايير البحث', 'No deeds match the filters')}</p>
              ) : (
                <div className="space-y-2">
                  {recentDeeds.slice(0, 7).map((deed) => (
                    <button type="button" key={deed.id} onClick={() => navigate('/deeds/' + deed.id)}
                      className="group flex w-full min-w-0 items-center gap-3 rounded-xl border bg-background/35 p-3 text-start transition hover:border-primary/40 hover:bg-primary/5">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{deed.deedNumber || '—'}</span>
                          <Badge variant="secondary" className="text-xs">{deed.isPlanned ? ui('مخططة', 'Planned') : ui('غير مخططة', 'Unplanned')}</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{[deed.city, deed.district, deed.propertyDescription].filter(Boolean).join(' • ') || '—'}</p>
                      </div>
                      <div className="shrink-0 text-end text-xs">
                        <p className="font-bold tabular-nums text-foreground">{fmt(positiveArea(deed.area))} {ui('م²', 'm²')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{validDate(deed.createdAt) ? new Date(deed.createdAt).toLocaleDateString(locale) : '—'}</p>
                      </div>
                      <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground opacity-50 transition group-hover:opacity-100" />
                    </button>
                  ))}
                  <p className="pt-1 text-xs text-muted-foreground">
                    {ui('عدد النتائج المطابقة: ', 'Matching records: ')}{fmt(recentDeeds.length)} • {ui('يُعرض أول 7 سجلات', 'Showing the first 7')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="future-card min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers3 className="h-5 w-5 text-primary" />
              {ui('مركز الوصول السريع', 'Quick access')}
            </CardTitle>
            <CardDescription>{ui('اختصارات تشغيلية مرتبطة بصلاحياتك', 'Operational shortcuts based on permissions')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button key={action.path} type="button" onClick={() => navigate(action.path)}
                  className="group flex items-center gap-3 rounded-xl border bg-background/35 p-3 text-start transition hover:border-primary/40 hover:bg-primary/5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{action.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{action.subtitle}</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </button>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {canDeeds && !deedsLoading && deeds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-muted/25 px-4 py-3 text-xs text-muted-foreground">
          <span>{ui('تصنيف الصكوك حسب التخطيط:', 'Deed planning classification:')} {fmt(plannedCount)} {ui('مخططة', 'planned')} • {fmt(deeds.length - plannedCount)} {ui('غير مخططة', 'unplanned')}</span>
          <button type="button" onClick={() => navigate('/deeds')} className="font-semibold text-primary hover:underline">
            {ui('مراجعة بيانات الصكوك', 'Review deed records')}
          </button>
        </div>
      )}
    </div>
  );
};
