import React from 'react';
import * as XLSX from 'xlsx';
import { BarChart3, FileSpreadsheet, FileText, Printer, Save, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  mosqueApi,
  type MosqueBuilding,
  type MosqueFieldVisit,
  type MosqueJobApplication,
  type MosqueLeave,
  type MosquePersonnel,
  type MosqueQuranInventoryOverviewItem,
  type MosqueQuranStockDashboard,
  type MosqueQuranStockMovement,
  type MosqueRequest,
  type MosqueSite,
  type MosqueTicket,
} from '../api/mosques';
import { appendExcelReportSheet, excelReportDateStamp, writeProfessionalExcel } from '../utils/excelReport';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ReportViewToggle } from './ReportViewToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';

const siteTypeLabels: Record<string, string> = { mosque: 'مسجد', jami: 'جامع', prayer_room: 'مصلى' };
const genderLabels: Record<string, string> = { men: 'رجال', women: 'نساء' };
const siteStatusLabels: Record<string, string> = { active: 'نشط', maintenance: 'تحت الصيانة', temporarily_closed: 'مغلق مؤقتًا' };
const buildingCoverageLabels: Record<string, string> = {
  unassessed: 'لم يتم التقييم', covered: 'مغطى بخدمة الصلاة', needs_prayer_room: 'يحتاج مصلى',
  under_feasibility_study: 'قيد دراسة إمكانية الإنشاء', not_feasible_alternative: 'تعذر الإنشاء / بديل معتمد', under_implementation: 'مصلى تحت التنفيذ',
};
const priorityLabels: Record<string, string> = { low: 'منخفضة', normal: 'عادية', medium: 'متوسطة', high: 'عالية', urgent: 'عاجلة' };
const statusLabels: Record<string, string> = {
  new: 'جديد', pending: 'جديد', planned: 'مجدولة', under_review: 'تحت المراجعة', approved: 'معتمد', assigned: 'مسند',
  in_progress: 'قيد التنفيذ', completed: 'مكتمل', follow_up: 'تحتاج متابعة', resolved: 'تم الحل', closed: 'مغلق',
  returned_for_edit: 'معاد للتعديل', rejected: 'مرفوض', shortlisted: 'مرشح مبدئيًا', interview: 'مقابلة', accepted: 'مقبول', archived: 'مؤرشف',
};

// IAU_NON_APPROVED_PUBLICATIONS_REPORTING_V1
const NON_APPROVED_PUBLICATIONS_ITEM_TITLE = 'خلو الموقع من الكتب والنشرات غير المعتمدة';
const nonApprovedPublicationTypeLabels: Record<string, string> = {
  books: 'كتب',
  booklets: 'كتيبات',
  leaflets: 'مطويات',
  publications: 'منشورات / نشرات',
  other: 'أخرى',
};
const visitScopeLabels: Record<string, string> = {
  whole_site: 'الموقع بالكامل',
  men_section: 'قسم الرجال',
  women_section: 'مصلى النساء',
  both_sections: 'قسم الرجال + مصلى النساء',
};
const isWomenVisitItem = (item: MosqueFieldVisit['items'][number]) =>
  item.details?.section === 'women' || String(item.category || '').startsWith('مصلى النساء');
const visitIncludesWomenSection = (visit: MosqueFieldVisit) =>
  visit.site?.siteType === 'prayer_room'
    ? visit.site.prayerRoomGender === 'women'
    : Boolean(visit.site?.hasWomenPrayerArea) && ['whole_site', 'women_section', 'both_sections'].includes(visit.visitScope || 'whole_site');
const womenOpenItemCount = (visit: MosqueFieldVisit) =>
  (visit.items || []).filter((item) => isWomenVisitItem(item) && item.status === 'needs_action' && !['resolved', 'closed'].includes(item.resolutionStatus)).length;

const getNonApprovedPublicationsSummary = (visit: MosqueFieldVisit) => {
  const item = (visit.items || []).find((entry) => entry.title === NON_APPROVED_PUBLICATIONS_ITEM_TITLE);
  const raw = (item?.details?.nonApprovedPublications || {}) as { observedCount?: number | null; withdrawnCount?: number | null; materialTypes?: string[] };
  const observed = Math.max(0, Number(raw.observedCount || 0));
  const withdrawn = Math.max(0, Number(raw.withdrawnCount || 0));
  const remaining = Math.max(0, observed - withdrawn);
  const types = Array.isArray(raw.materialTypes) ? raw.materialTypes.map((value) => nonApprovedPublicationTypeLabels[value] || value).join('، ') : '';
  return { observed, withdrawn, remaining, types };
};

const reportLabels = {
  comprehensive: 'التقرير الشامل للوحدة', sites: 'المساجد والمصليات', buildings: 'تغطية المباني بخدمة الصلاة', visits: 'الجولات والزيارات',
  requests: 'الطلبات والصيانة', tickets: 'البلاغات', quran: 'المصاحف والاحتياج', personnel: 'منسوبو المساجد', leaves: 'الإجازات والاعتذارات', jobs: 'التوظيف',
} as const;
type ReportType = keyof typeof reportLabels;

type ReportMeta = { search?: string; date?: string; city?: string; campus?: string; type?: string; status?: string; priority?: string };
type ReportRow = { data: Record<string, string | number>; meta: ReportMeta };
type SavedTemplate = { id: string; name: string; settings: ReportSettings };
type ReportSettings = { reportType: ReportType; from: string; to: string; city: string; campus: string; siteType: string; status: string; priority: string; search: string };

type Props = {
  sites: MosqueSite[];
  buildings: MosqueBuilding[];
  requests: MosqueRequest[];
  tickets: MosqueTicket[];
  leaves: MosqueLeave[];
  jobs: MosqueJobApplication[];
  personnel: MosquePersonnel[];
  quranInventoryItems: MosqueQuranInventoryOverviewItem[];
  quranStockDashboard: MosqueQuranStockDashboard | null;
  canPrint: boolean;
};

const STORAGE_KEY = 'iau_mosque_report_templates_v1';
const dateOnly = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : '';
const displayDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('ar-SA-u-ca-gregory') : '-';
const siteTypeLabel = (site: Pick<MosqueSite, 'siteType' | 'prayerRoomGender'>) => site.siteType === 'prayer_room' && site.prayerRoomGender
  ? `مصلى ${genderLabels[site.prayerRoomGender] || site.prayerRoomGender}` : (siteTypeLabels[site.siteType] || site.siteType);
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));

const loadTemplates = (): SavedTemplate[] => {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; }
};
const saveTemplates = (value: SavedTemplate[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value));

export const MosqueReportsCenter: React.FC<Props> = ({ sites, buildings, requests, tickets, leaves, jobs, personnel, quranInventoryItems, quranStockDashboard, canPrint }) => {
  const [settings, setSettings] = React.useState<ReportSettings>({ reportType: 'comprehensive', from: '', to: '', city: '', campus: '', siteType: 'all', status: 'all', priority: 'all', search: '' });
  const [visits, setVisits] = React.useState<MosqueFieldVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = React.useState(false);
  const [quranMovements, setQuranMovements] = React.useState<MosqueQuranStockMovement[]>([]);
  const [quranMovementsLoading, setQuranMovementsLoading] = React.useState(false);
  const [templates, setTemplates] = React.useState<SavedTemplate[]>(loadTemplates);
  const [templateName, setTemplateName] = React.useState('');

  React.useEffect(() => {
    let active = true;
    setVisitsLoading(true);
    mosqueApi.fieldVisits().then((rows) => { if (active) setVisits(rows); }).catch(() => { if (active) setVisits([]); }).finally(() => { if (active) setVisitsLoading(false); });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    let active = true;
    setQuranMovementsLoading(true);
    mosqueApi.quranStockMovements()
      .then((rows) => { if (active) setQuranMovements(rows || []); })
      .catch(() => { if (active) setQuranMovements([]); })
      .finally(() => { if (active) setQuranMovementsLoading(false); });
    return () => { active = false; };
  }, []);

  const quranPeriodMovements = React.useMemo(() => quranMovements.filter((movement) => {
    if (!movement.siteId) return false;
    const movementDate = String(movement.movementAt || movement.createdAt || '').slice(0, 10);
    if (settings.from && movementDate && movementDate < settings.from) return false;
    if (settings.to && movementDate && movementDate > settings.to) return false;
    return true;
  }), [quranMovements, settings.from, settings.to]);

  const quranMovementTotalsBySite = React.useMemo(() => {
    const result = new Map<string, { added: number; withdrawn: number; returned: number; net: number }>();
    for (const movement of quranPeriodMovements) {
      if (!movement.siteId) continue;
      const current = result.get(movement.siteId) || { added: 0, withdrawn: 0, returned: 0, net: 0 };
      const quantity = Number(movement.totalCount || 0);
      if (movement.movementType === 'distribution') current.added += quantity;
      if (movement.movementType === 'site_withdrawal') current.withdrawn += quantity;
      if (movement.movementType === 'return') current.returned += quantity;
      current.net = current.added - current.withdrawn - current.returned;
      result.set(movement.siteId, current);
    }
    return result;
  }, [quranPeriodMovements]);

  const siteById = React.useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const cities = React.useMemo(() => Array.from(new Set([...sites.map((x) => x.city), ...buildings.map((x) => x.city)].filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')), [sites, buildings]);
  const campuses = React.useMemo(() => Array.from(new Set([...sites.map((x) => x.campusLocation), ...buildings.map((x) => x.campusLocation)].filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')), [sites, buildings]);

  const datasets = React.useMemo<Record<Exclude<ReportType, 'comprehensive'>, ReportRow[]>>(() => ({
    sites: sites.map((site, index) => {
      const quranStock = quranStockDashboard?.sites.find((row) => row.site.id === site.id);
      const movement = quranMovementTotalsBySite.get(site.id) || { added: 0, withdrawn: 0, returned: 0, net: 0 };
      return ({ data: {
        'م': index + 1, 'المسجد / المصلى': site.name, 'النوع': siteTypeLabel(site), 'رقم المبنى': site.building?.buildingNumber || '-',
        'الحرم / الموقع': site.campusLocation || '-', 'المدينة': site.city || '-', 'الحي': site.district || '-', 'المساحة م²': site.area || '-', 'السعة': site.capacity || '-',
        'يوجد مصلى نساء': site.siteType !== 'prayer_room' && site.hasWomenPrayerArea ? 'نعم' : 'لا',
        'سعة مصلى النساء': site.hasWomenPrayerArea ? (site.womenPrayerArea?.capacity || '-') : '-',
        'حالة مصلى النساء': site.hasWomenPrayerArea ? (siteStatusLabels[site.womenPrayerArea?.status || 'active'] || site.womenPrayerArea?.status || 'نشط') : '-',
        'الإمام': site.imamName || '-', 'المؤذن': site.muezzinName || '-', 'الخطيب': site.khateebName || '-', 'الحالة': siteStatusLabels[site.status] || site.status,
        'رصيد المصاحف الحالي': quranStock?.systemStock?.totalCount || 0, 'المضاف خلال الفترة': movement.added, 'المسحوب خلال الفترة': movement.withdrawn,
        'المرتجع خلال الفترة': movement.returned, 'صافي حركة المصاحف': movement.net, 'احتياج المصاحف الحالي': quranStock?.needCount || 0,
        'الإحداثيات': site.latitude != null && site.longitude != null ? `${site.latitude}, ${site.longitude}` : '-',
      }, meta: { search: [site.name, site.building?.buildingNumber, site.city, site.district, site.campusLocation, site.imamName].filter(Boolean).join(' '), city: site.city || '', campus: site.campusLocation || '', type: site.siteType, status: site.status } });
    }),
    buildings: buildings.map((building, index) => ({ data: {
      'م': index + 1, 'رقم المبنى': building.buildingNumber, 'اسم المبنى': building.name || '-', 'الحرم / الموقع': building.campusLocation || '-', 'المدينة': building.city || '-', 'الحي': building.district || '-',
      'حالة التغطية': buildingCoverageLabels[building.coverageStatus] || building.coverageStatus, 'عدد المواقع المرتبطة': building._count?.sites ?? building.sites?.length ?? 0,
      'مستفيدون متوقعون': building.expectedUsers || '-', 'الإحداثيات': building.latitude != null && building.longitude != null ? `${building.latitude}, ${building.longitude}` : '-',
    }, meta: { search: [building.buildingNumber, building.name, building.city, building.district, building.campusLocation].filter(Boolean).join(' '), city: building.city || '', campus: building.campusLocation || '', status: building.coverageStatus } })),
    visits: visits.map((visit, index) => {
      const publications = getNonApprovedPublicationsSummary(visit);
      return ({ data: {
        'م': index + 1, 'رقم الزيارة': visit.visitNumber, 'الموقع': visit.site?.name || '-', 'التاريخ': displayDate(visit.visitDate), 'النوع': visit.visitType,
        'نطاق الزيارة': visitScopeLabels[visit.visitScope || 'whole_site'] || visit.visitScope || 'الموقع بالكامل',
        'شملت مصلى النساء': visitIncludesWomenSection(visit) ? 'نعم' : 'لا',
        'ملاحظات مصلى النساء المفتوحة': womenOpenItemCount(visit),
        'الحالة': statusLabels[visit.workflowStatus] || visit.workflowStatus, 'التقييم': visit.overallStatus, 'الأولوية': priorityLabels[visit.priority] || visit.priority,
        'الملاحظات المفتوحة': visit.items?.filter((item) => !['resolved', 'closed'].includes(item.resolutionStatus)).length || 0,
        'العاجلة': visit.items?.filter((item) => item.priority === 'urgent' && !['resolved', 'closed'].includes(item.resolutionStatus)).length || 0,
        'المواد المخالفة المرصودة': publications.observed,
        'المواد المخالفة المسحوبة': publications.withdrawn,
        'المواد المخالفة المتبقية': publications.remaining,
        'أنواع الكتب والمطبوعات المخالفة': publications.types || '-',
        'التوصيات': visit.recommendations || '-',
      }, meta: { search: [visit.visitNumber, visit.site?.name, visit.generalNotes, visit.recommendations, publications.types].filter(Boolean).join(' '), date: dateOnly(visit.visitDate), city: visit.site?.city || '', campus: visit.site?.campusLocation || '', type: visit.site?.siteType || '', status: visit.workflowStatus, priority: visit.priority } });
    }),
    requests: requests.map((request, index) => { const site = siteById.get(request.siteId); return ({ data: {
      'م': index + 1, 'رقم الطلب': request.requestNumber, 'الموقع': request.site?.name || site?.name || '-', 'النوع': request.requestType, 'الأولوية': priorityLabels[request.priority] || request.priority,
      'الحالة': statusLabels[request.status] || request.status, 'الوصف': request.description, 'المسند إلى': request.assignedTo || '-', 'تاريخ الإنشاء': displayDate(request.createdAt), 'إثبات الإنجاز': request.completionEvidenceUrl ? 'متوفر' : 'غير متوفر',
    }, meta: { search: [request.requestNumber, request.site?.name, site?.name, request.description, request.assignedTo].filter(Boolean).join(' '), date: dateOnly(request.createdAt), city: site?.city || '', campus: site?.campusLocation || '', type: request.requestType, status: request.status, priority: request.priority } }); }),
    tickets: tickets.map((ticket, index) => { const site = siteById.get(ticket.siteId); return ({ data: {
      'م': index + 1, 'رقم البلاغ': ticket.ticketNumber, 'الموقع': ticket.site?.name || site?.name || '-', 'النوع': ticket.ticketType, 'الحالة': statusLabels[ticket.status] || ticket.status,
      'الوصف': ticket.description, 'المبلّغ': ticket.reporterName || '-', 'وسيلة التواصل': ticket.reporterPhone || ticket.reporterEmail || '-', 'طلب صيانة مرتبط': ticket.convertedRequestId ? 'نعم' : 'لا', 'تاريخ الإنشاء': displayDate(ticket.createdAt),
    }, meta: { search: [ticket.ticketNumber, ticket.site?.name, site?.name, ticket.description, ticket.reporterName].filter(Boolean).join(' '), date: dateOnly(ticket.createdAt), city: site?.city || '', campus: site?.campusLocation || '', type: ticket.ticketType, status: ticket.status } }); }),
    quran: quranInventoryItems.map((item, index) => {
      const stock = quranStockDashboard?.sites.find((row) => row.site.id === item.site.id);
      const movement = quranMovementTotalsBySite.get(item.site.id) || { added: 0, withdrawn: 0, returned: 0, net: 0 };
      const currentStock = stock?.systemStock?.totalCount ?? item.latest?.totalCount ?? 0;
      return ({ data: {
        'م': index + 1, 'الموقع': item.site.name, 'النوع': siteTypeLabel(item.site as MosqueSite), 'الرصيد الحالي': currentStock,
        'كبير': stock?.systemStock?.largeCount ?? item.latest?.largeCount ?? 0, 'متوسط': stock?.systemStock?.mediumCount ?? item.latest?.mediumCount ?? 0, 'صغير': stock?.systemStock?.smallCount ?? item.latest?.smallCount ?? 0,
        'المضاف خلال الفترة': movement.added, 'المسحوب خلال الفترة': movement.withdrawn, 'المرتجع خلال الفترة': movement.returned, 'صافي الحركة': movement.net,
        'المسحوب التراكمي': stock?.withdrawnStock?.totalCount || 0, 'المستهدف': stock?.targetCount || 0, 'التغطية %': stock?.coveragePercent ?? '-',
        'الاحتياج': stock?.needCount || 0, 'آخر جرد': item.latest?.countedAt ? displayDate(item.latest.countedAt) : 'لم يجرد',
      }, meta: { search: [item.site.name, item.site.city, item.site.district, item.site.campusLocation].filter(Boolean).join(' '), city: item.site.city || '', campus: item.site.campusLocation || '', type: item.site.siteType, status: (stock?.needCount || 0) > 0 ? 'needs_supply' : 'covered' } });
    }),
    personnel: personnel.map((person, index) => { const site = siteById.get(person.siteId); return ({ data: {
      'م': index + 1, 'الاسم': person.name, 'الصفة': person.role, 'المسجد / المصلى': person.site?.name || site?.name || '-', 'الجوال': person.mobile || '-', 'البريد': person.email || '-', 'الحالة': person.active ? 'نشط' : 'غير نشط',
    }, meta: { search: [person.name, person.role, person.site?.name, site?.name, person.mobile, person.email].filter(Boolean).join(' '), city: site?.city || '', campus: site?.campusLocation || '', type: person.role, status: person.active ? 'active' : 'inactive' } }); }),
    leaves: leaves.map((leave, index) => { const site = siteById.get(leave.siteId); return ({ data: {
      'م': index + 1, 'رقم الطلب': leave.leaveNumber, 'الموقع': leave.site?.name || site?.name || '-', 'النوع': leave.requestType, 'من': displayDate(leave.startDate), 'إلى': displayDate(leave.endDate),
      'البديل': leave.replacementName || '-', 'الحالة': statusLabels[leave.status] || leave.status, 'السبب': leave.reason, 'تاريخ الإنشاء': displayDate(leave.createdAt),
    }, meta: { search: [leave.leaveNumber, leave.site?.name, site?.name, leave.replacementName, leave.reason].filter(Boolean).join(' '), date: dateOnly(leave.createdAt), city: site?.city || '', campus: site?.campusLocation || '', type: leave.requestType, status: leave.status } }); }),
    jobs: jobs.map((job, index) => ({ data: {
      'م': index + 1, 'رقم الطلب': job.applicationNumber, 'الاسم': job.fullName, 'الوظيفة': job.jobType, 'المؤهل': job.qualification, 'الموقع المفضل': job.preferredLocation || '-',
      'الحالة': statusLabels[job.status] || job.status, 'الجوال': job.phone, 'البريد': job.email, 'تاريخ التقديم': displayDate(job.createdAt),
    }, meta: { search: [job.applicationNumber, job.fullName, job.jobType, job.qualification, job.preferredLocation].filter(Boolean).join(' '), date: dateOnly(job.createdAt), campus: job.preferredLocation || '', type: job.jobType, status: job.status } })),
  }), [sites, buildings, visits, requests, tickets, quranInventoryItems, quranStockDashboard, quranMovementTotalsBySite, personnel, leaves, jobs, siteById]);

  const filterRows = React.useCallback((rows: ReportRow[]) => rows.filter((row) => {
    const query = settings.search.trim().toLowerCase();
    if (query && !String(row.meta.search || '').toLowerCase().includes(query)) return false;
    if (settings.from && row.meta.date && row.meta.date < settings.from) return false;
    if (settings.to && row.meta.date && row.meta.date > settings.to) return false;
    if (settings.city && row.meta.city !== settings.city) return false;
    if (settings.campus && row.meta.campus !== settings.campus) return false;
    if (settings.siteType !== 'all' && row.meta.type !== settings.siteType) return false;
    if (settings.status !== 'all' && row.meta.status !== settings.status) return false;
    if (settings.priority !== 'all' && row.meta.priority !== settings.priority) return false;
    return true;
  }), [settings]);

  const activeSections = React.useMemo(() => {
    if (settings.reportType !== 'comprehensive') return [{ key: settings.reportType, title: reportLabels[settings.reportType], rows: filterRows(datasets[settings.reportType]) }];
    return (Object.keys(datasets) as Array<Exclude<ReportType, 'comprehensive'>>).map((key) => ({ key, title: reportLabels[key], rows: filterRows(datasets[key]) }));
  }, [settings.reportType, datasets, filterRows]);

  const activeRows = settings.reportType === 'comprehensive' ? activeSections.reduce((sum, section) => sum + section.rows.length, 0) : activeSections[0]?.rows.length || 0;
  const openRequests = requests.filter((item) => !['completed', 'closed', 'rejected', 'archived'].includes(item.status)).length;
  const openTickets = tickets.filter((item) => !['resolved', 'closed', 'rejected', 'archived'].includes(item.status)).length;
  const buildingsNeedPrayerRoom = buildings.filter((item) => item.coverageStatus === 'needs_prayer_room').length;
  const openVisitItems = visits.reduce((sum, visit) => sum + (visit.items?.filter((item) => !['resolved', 'closed'].includes(item.resolutionStatus)).length || 0), 0);
  const sitesWithWomenPrayerArea = sites.filter((site) => ['mosque', 'jami'].includes(site.siteType) && site.hasWomenPrayerArea).length;
  const womenSectionVisits = visits.filter(visitIncludesWomenSection).length;
  const womenSectionOpenItems = visits.reduce((sum, visit) => sum + womenOpenItemCount(visit), 0);
  const visitedWomenPrayerAreas = new Set(visits.filter(visitIncludesWomenSection).map((visit) => visit.siteId)).size;
  const filteredVisitRowsForMetrics = filterRows(datasets.visits);
  const nonApprovedPublicationsObserved = filteredVisitRowsForMetrics.reduce((sum, row) => sum + Number(row.data['المواد المخالفة المرصودة'] || 0), 0);
  const nonApprovedPublicationsWithdrawn = filteredVisitRowsForMetrics.reduce((sum, row) => sum + Number(row.data['المواد المخالفة المسحوبة'] || 0), 0);
  const nonApprovedPublicationsRemaining = filteredVisitRowsForMetrics.reduce((sum, row) => sum + Number(row.data['المواد المخالفة المتبقية'] || 0), 0);
  const quranNeed = quranStockDashboard?.summary.siteNeedTotal || 0;
  const quranAddedInPeriod = quranPeriodMovements.filter((movement) => movement.movementType === 'distribution').reduce((sum, movement) => sum + Number(movement.totalCount || 0), 0);
  const quranWithdrawnInPeriod = quranPeriodMovements.filter((movement) => movement.movementType === 'site_withdrawal').reduce((sum, movement) => sum + Number(movement.totalCount || 0), 0);
  const quranReturnedInPeriod = quranPeriodMovements.filter((movement) => movement.movementType === 'return').reduce((sum, movement) => sum + Number(movement.totalCount || 0), 0);

  const dynamicStatusOptions = React.useMemo(() => {
    const rows = settings.reportType === 'comprehensive' ? Object.values(datasets).flat() : datasets[settings.reportType];
    return Array.from(new Set(rows.map((row) => row.meta.status).filter(Boolean) as string[])).sort();
  }, [datasets, settings.reportType]);
  const dynamicTypeOptions = React.useMemo(() => {
    const rows = settings.reportType === 'comprehensive' ? Object.values(datasets).flat() : datasets[settings.reportType];
    return Array.from(new Set(rows.map((row) => row.meta.type).filter(Boolean) as string[])).sort();
  }, [datasets, settings.reportType]);

  const filterSummary = () => [
    settings.from ? `من ${settings.from}` : '', settings.to ? `إلى ${settings.to}` : '', settings.city ? `المدينة: ${settings.city}` : '',
    settings.campus ? `الحرم/الموقع: ${settings.campus}` : '', settings.siteType !== 'all' ? `النوع: ${settings.siteType}` : '',
    settings.status !== 'all' ? `الحالة: ${statusLabels[settings.status] || buildingCoverageLabels[settings.status] || settings.status}` : '',
    settings.priority !== 'all' ? `الأولوية: ${priorityLabels[settings.priority] || settings.priority}` : '', settings.search ? `بحث: ${settings.search}` : '',
  ].filter(Boolean).join(' — ') || 'جميع البيانات المتاحة';

  const exportExcel = async () => {
    if (!activeRows) return toast.info('لا توجد بيانات مطابقة لمعايير التقرير');
    const workbook = XLSX.utils.book_new();
    for (const section of activeSections) {
      appendExcelReportSheet(workbook, section.title.slice(0, 31), section.rows.map((row) => row.data), 'لا توجد بيانات مطابقة');
    }
    appendExcelReportSheet(workbook, 'الملخص التنفيذي', [{
      'نوع التقرير': reportLabels[settings.reportType], 'النتائج المطابقة': activeRows, 'المساجد والمصليات': sites.length, 'المباني التي تحتاج مصلى': buildingsNeedPrayerRoom,
      'الطلبات المفتوحة': openRequests, 'البلاغات المفتوحة': openTickets, 'ملاحظات الزيارات المفتوحة': openVisitItems, 'احتياج المصاحف': quranNeed,
      'المساجد والجوامع التي بها مصلى نساء': sitesWithWomenPrayerArea, 'زيارات شملت مصلى النساء': womenSectionVisits, 'مصليات النساء التي تمت تغطيتها': visitedWomenPrayerAreas, 'ملاحظات مصلى النساء المفتوحة': womenSectionOpenItems,
      'المواد المخالفة المرصودة': nonApprovedPublicationsObserved, 'المواد المخالفة المسحوبة': nonApprovedPublicationsWithdrawn, 'المواد المخالفة المتبقية': nonApprovedPublicationsRemaining,
      'المصاحف المضافة خلال الفترة': quranAddedInPeriod, 'المصاحف المسحوبة خلال الفترة': quranWithdrawnInPeriod, 'المصاحف المرتجعة خلال الفترة': quranReturnedInPeriod,
      'معايير التقرير': filterSummary(), 'تاريخ الاستخراج': new Date().toLocaleString('ar-SA-u-ca-gregory'),
    }]);
    await writeProfessionalExcel(workbook, `mosques-${settings.reportType}-${excelReportDateStamp()}.xlsx`, {
      title: reportLabels[settings.reportType], subtitle: filterSummary(), orientation: 'landscape', metrics: [
        { label: 'النتائج', value: activeRows, tone: 'blue' }, { label: 'طلبات مفتوحة', value: openRequests, tone: 'amber' },
        { label: 'بلاغات مفتوحة', value: openTickets, tone: 'red' }, { label: 'احتياج المصاحف', value: quranNeed, tone: 'green' },
        { label: 'مخالفات مرصودة', value: nonApprovedPublicationsObserved, tone: 'amber' }, { label: 'مخالفات مسحوبة', value: nonApprovedPublicationsWithdrawn, tone: 'green' },
        { label: 'مصاحف مضافة', value: quranAddedInPeriod, tone: 'green' }, { label: 'مصاحف مسحوبة', value: quranWithdrawnInPeriod, tone: 'red' },
      ],
    });
    toast.success('تم تجهيز تقرير Excel الاحترافي');
  };

  const printPdf = () => {
    if (!activeRows) return toast.info('لا توجد بيانات مطابقة لمعايير التقرير');
    const win = window.open('', '_blank', 'width=1450,height=950');
    if (!win) return toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
    const sectionsHtml = activeSections.map((section) => {
      if (!section.rows.length) return '';
      const columns = Object.keys(section.rows[0].data);
      const head = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
      const body = section.rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row.data[column])}</td>`).join('')}</tr>`).join('');
      return `<section><div class="section-title"><h2>${escapeHtml(section.title)}</h2><span>${section.rows.length} سجل</span></div><div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></section>`;
    }).join('');
    const generatedAt = new Date().toLocaleString('ar-SA-u-ca-gregory');
    win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(reportLabels[settings.reportType])}</title><style>
      @page{size:A4 landscape;margin:8mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0;font-size:9px;direction:rtl}.header{border:1.5px solid #94a3b8;border-radius:14px;padding:14px;background:linear-gradient(110deg,#eff6ff,#fff,#ecfdf5)}.kicker{font-size:8px;color:#64748b}.head-row{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.head-row h1{margin:4px 0;font-size:21px}.badge{border:1px solid #93c5fd;background:#eff6ff;border-radius:999px;padding:5px 10px;font-weight:800}.meta{color:#64748b}.filters{margin-top:8px;border-top:1px solid #dbeafe;padding-top:7px}.metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:10px 0}.metric{border:1px solid #cbd5e1;border-radius:9px;padding:7px;text-align:center;background:#f8fafc}.metric span{display:block;color:#64748b;font-size:7px}.metric b{display:block;font-size:15px;margin-top:2px}.section-title{display:flex;justify-content:space-between;align-items:center;margin:14px 0 6px}.section-title h2{font-size:14px;margin:0}.section-title span{color:#64748b}.table-wrap{overflow:hidden;border-radius:8px}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #cbd5e1;padding:4px 3px;text-align:center;vertical-align:middle;line-height:1.45;word-break:break-word}th{background:#e0f2fe;font-weight:900;font-size:7.5px}td{font-size:7.2px}.footer{margin-top:10px;border-top:1px solid #e2e8f0;padding-top:6px;color:#64748b;display:flex;justify-content:space-between}section{break-inside:auto}thead{display:table-header-group}@media print{.no-print{display:none!important}}
    </style></head><body><header class="header"><div class="kicker">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><div class="head-row"><div><h1>${escapeHtml(reportLabels[settings.reportType])}</h1><div class="meta">تاريخ الاستخراج: ${escapeHtml(generatedAt)}</div></div><span class="badge">${activeRows} نتيجة</span></div><div class="filters"><b>معايير التقرير:</b> ${escapeHtml(filterSummary())}</div></header><div class="metrics"><div class="metric"><span>المساجد والمصليات</span><b>${sites.length}</b></div><div class="metric"><span>مبانٍ تحتاج مصلى</span><b>${buildingsNeedPrayerRoom}</b></div><div class="metric"><span>طلبات مفتوحة</span><b>${openRequests}</b></div><div class="metric"><span>بلاغات مفتوحة</span><b>${openTickets}</b></div><div class="metric"><span>ملاحظات زيارة مفتوحة</span><b>${openVisitItems}</b></div><div class="metric"><span>احتياج المصاحف</span><b>${quranNeed}</b></div><div class="metric"><span>مخالفات مرصودة</span><b>${nonApprovedPublicationsObserved}</b></div><div class="metric"><span>مخالفات مسحوبة</span><b>${nonApprovedPublicationsWithdrawn}</b></div><div class="metric"><span>مصاحف مضافة</span><b>${quranAddedInPeriod}</b></div><div class="metric"><span>مصاحف مسحوبة</span><b>${quranWithdrawnInPeriod}</b></div></div>${sectionsHtml}<div class="footer"><span>منصة إدارة الأملاك والأراضي — وحدة العناية بالمساجد والمصليات الجامعية</span><span>${escapeHtml(generatedAt)}</span></div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    win.document.close();
  };

  const saveTemplate = () => {
    const name = templateName.trim();
    if (!name) return toast.error('اكتب اسمًا لإعداد التقرير');
    const next = [{ id: `${Date.now()}`, name, settings: { ...settings } }, ...templates].slice(0, 20);
    setTemplates(next); saveTemplates(next); setTemplateName(''); toast.success('تم حفظ إعداد التقرير على هذا الجهاز');
  };
  const applyTemplate = (template: SavedTemplate) => { setSettings({ ...template.settings }); toast.success(`تم تطبيق إعداد «${template.name}»`); };
  const deleteTemplate = (id: string) => { const next = templates.filter((item) => item.id !== id); setTemplates(next); saveTemplates(next); };
  const resetFilters = () => setSettings((current) => ({ ...current, from: '', to: '', city: '', campus: '', siteType: 'all', status: 'all', priority: 'all', search: '' }));

  return <div id="mosque-reports-view" className="space-y-5" dir="rtl">
    <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
      <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Badge variant="outline" className="mb-2 border-[#d6b46a]/60 bg-[#fff8e8] text-[#8a6a1f]">مركز التقارير</Badge>
            <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl"><BarChart3 className="h-5 w-5" />التقارير والتحليل</CardTitle>
            <CardDescription className="mt-2 max-w-3xl leading-6">اختر نوع التقرير ومعاييره، راجع النتائج، ثم صدّر PDF أو Excel من مساحة عمل واحدة.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {canPrint && <Button variant="outline" className="border-[#d9c9a5] bg-white font-bold text-[#0b4a3f]" onClick={printPdf}><Printer className="ml-2 h-4 w-4" />PDF / طباعة</Button>}
            <Button className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={exportExcel}><FileSpreadsheet className="ml-2 h-4 w-4" />Excel احترافي</Button>
          </div>
        </div>
      </CardHeader>
    </Card>

    <section className="grid gap-5 xl:grid-cols-[1.6fr_0.85fr]">
      <div className="space-y-4">
        <Card className="overflow-hidden rounded-[24px] border border-[#ded3b8] bg-white shadow-[0_10px_28px_rgba(6,60,51,0.06)]">
          <CardHeader className="border-b border-[#ece2cc] bg-[#fffdf8] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><CardTitle className="text-lg font-black text-[#0b4a3f]">إعداد التقرير</CardTitle><CardDescription className="mt-1">الفلاتر تنعكس مباشرة على النتائج والمعاينة والتصدير.</CardDescription></div>
              <Badge variant="outline" className="border-[#d6b46a]/55 bg-white px-3 py-1.5 font-black text-[#0b4a3f]">{activeRows.toLocaleString('ar-SA')} نتيجة</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-4 md:p-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="نوع التقرير"><NativeSelect value={settings.reportType} onChange={(e) => setSettings({ ...settings, reportType: e.target.value as ReportType, siteType: 'all', status: 'all', priority: 'all' })}>{Object.entries(reportLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
              <Field label="من تاريخ"><Input type="date" value={settings.from} onChange={(e) => setSettings({ ...settings, from: e.target.value })} /></Field>
              <Field label="إلى تاريخ"><Input type="date" value={settings.to} onChange={(e) => setSettings({ ...settings, to: e.target.value })} /></Field>
              <Field label="المدينة"><NativeSelect value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })}><option value="">جميع المدن</option>{cities.map((city) => <option key={city} value={city}>{city}</option>)}</NativeSelect></Field>
              <Field label="الحرم / الموقع"><NativeSelect value={settings.campus} onChange={(e) => setSettings({ ...settings, campus: e.target.value })}><option value="">جميع المواقع</option>{campuses.map((campus) => <option key={campus} value={campus}>{campus}</option>)}</NativeSelect></Field>
              <Field label="النوع"><NativeSelect value={settings.siteType} onChange={(e) => setSettings({ ...settings, siteType: e.target.value })}><option value="all">جميع الأنواع</option>{dynamicTypeOptions.map((value) => <option key={value} value={value}>{siteTypeLabels[value] || value}</option>)}</NativeSelect></Field>
              <Field label="الحالة"><NativeSelect value={settings.status} onChange={(e) => setSettings({ ...settings, status: e.target.value })}><option value="all">جميع الحالات</option>{dynamicStatusOptions.map((value) => <option key={value} value={value}>{statusLabels[value] || buildingCoverageLabels[value] || value}</option>)}</NativeSelect></Field>
              <Field label="الأولوية"><NativeSelect value={settings.priority} onChange={(e) => setSettings({ ...settings, priority: e.target.value })}><option value="all">جميع الأولويات</option>{Object.entries(priorityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
              <div className="relative md:col-span-2 xl:col-span-3"><Label className="mb-1.5 block">بحث نصي</Label><Search className="absolute right-3 top-[37px] h-4 w-4 text-slate-400" /><Input className="pr-9" value={settings.search} onChange={(e) => setSettings({ ...settings, search: e.target.value })} placeholder="اسم الموقع، رقم المبنى، رقم الطلب، الوصف..." /></div>
              <div className="flex items-end"><Button type="button" variant="outline" className="w-full border-[#d9c9a5] text-[#0b4a3f]" onClick={resetFilters}>مسح الفلاتر</Button></div>
            </div>

            <div className="rounded-2xl border border-[#e2d4b4] bg-[#fbf8f1] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0"><div className="font-black text-[#0b4a3f]">معايير التقرير الحالية</div><div className="mt-1 text-xs leading-6 text-slate-600">{filterSummary()}{visitsLoading ? ' — جاري استكمال بيانات الزيارات...' : ''}{quranMovementsLoading ? ' — جاري تحميل حركات المصاحف...' : ''}</div>{['sites', 'quran', 'comprehensive'].includes(settings.reportType) && <div className="mt-1 text-[11px] font-semibold text-emerald-800">المضاف والمسحوب والمرتجع للمصاحف يحتسب حسب الفترة المحددة، بينما الرصيد الحالي قيمة لحظية.</div>}</div>
                <ReportViewToggle storageKey="iau-mosque-reports-view" scopeId="mosque-reports-view" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[24px] border border-[#ded3b8] bg-white shadow-[0_8px_22px_rgba(6,60,51,0.05)]">
          <CardHeader className="border-b border-[#ece2cc] bg-[#fffdf8] pb-3"><CardTitle className="flex items-center gap-2 text-base font-black text-[#0b4a3f]"><FileText className="h-4 w-4" />معاينة أقسام التقرير</CardTitle><CardDescription>كل بطاقة تمثل قسمًا سيظهر في التقرير النهائي وفق المعايير الحالية.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">{activeSections.map((section) => <div key={section.key} className="rounded-2xl border border-[#e4d8bd] bg-[#fffdf8] p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><strong className="text-[#0b4a3f]">{section.title}</strong><Badge variant="outline" className="border-[#d6b46a]/50 bg-white">{section.rows.length} سجل</Badge></div><p className="mt-2 text-xs text-slate-500">{section.rows.length ? 'جاهز للتصدير — ' + Object.keys(section.rows[0].data).length + ' أعمدة' : 'لا توجد نتائج مطابقة للفلاتر الحالية'}</p></div>)}</CardContent>
        </Card>
      </div>

      <aside className="grid content-start gap-4">
        <Card className="overflow-hidden rounded-[24px] border border-[#ded3b8] bg-white shadow-[0_8px_24px_rgba(6,60,51,0.07)]">
          <CardHeader className="pb-3"><CardTitle className="text-base font-black text-[#0b4a3f]">المؤشرات السريعة</CardTitle><CardDescription>لقطة تشغيلية تساعد في اختيار التقرير المناسب.</CardDescription></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <ReportSideMetric label="المساجد والمصليات" value={sites.length} />
            <ReportSideMetric label="مبانٍ تحتاج مصلى" value={buildingsNeedPrayerRoom} />
            <ReportSideMetric label="طلبات مفتوحة" value={openRequests} />
            <ReportSideMetric label="بلاغات مفتوحة" value={openTickets} />
            <ReportSideMetric label="ملاحظات زيارات" value={openVisitItems} />
            <ReportSideMetric label="مساجد بها مصلى نساء" value={sitesWithWomenPrayerArea} />
            <ReportSideMetric label="زيارات مصلى النساء" value={womenSectionVisits} />
            <ReportSideMetric label="ملاحظات مصلى النساء" value={womenSectionOpenItems} />
            <ReportSideMetric label="احتياج المصاحف" value={quranNeed} />
            <ReportSideMetric label="مخالفات مرصودة" value={nonApprovedPublicationsObserved} />
            <ReportSideMetric label="مخالفات مسحوبة" value={nonApprovedPublicationsWithdrawn} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[24px] border border-[#ded3b8] bg-[#fffdf8] shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base font-black text-[#0b4a3f]"><Save className="h-4 w-4" />إعدادات محفوظة</CardTitle><CardDescription>احفظ تركيبة التقرير لاستخدامها مرة أخرى.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2"><Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="مثال: التقرير الشهري للوحدة" /><Button className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]" onClick={saveTemplate}><Save className="ml-2 h-4 w-4" />حفظ الإعداد</Button></div>
            {templates.length ? <div className="grid gap-2">{templates.slice(0, 8).map((template) => <div key={template.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#e4d8bd] bg-white p-3"><button className="min-w-0 flex-1 text-right" onClick={() => applyTemplate(template)}><div className="truncate font-bold text-[#0b4a3f]">{template.name}</div><div className="truncate text-[11px] text-slate-500">{reportLabels[template.settings.reportType]}</div></button><Button size="icon" variant="ghost" onClick={() => deleteTemplate(template.id)} title="حذف"><Trash2 className="h-4 w-4" /></Button></div>)}</div> : <p className="rounded-xl border border-dashed border-[#d9c9a5] bg-white p-4 text-center text-sm text-slate-500">لا توجد إعدادات محفوظة بعد.</p>}
          </CardContent>
        </Card>
      </aside>
    </section>
  </div>
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <div><Label className="mb-1.5 block">{label}</Label>{children}</div>;
const ReportSideMetric: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-2xl border border-[#e2d4b4] bg-white p-3 text-center shadow-[0_4px_12px_rgba(6,60,51,0.04)]">
    <div className="text-[11px] font-bold leading-5 text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-black text-[#0b4a3f]">{value.toLocaleString('ar-SA')}</div>
  </div>
);
