import React, { useState, useRef, useMemo } from 'react';
import fananFontUrl from '../../assets/fonts/Fanan.ttf?url';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { usePermissions } from '../../context/PermissionsContext';
import { formatFlexibleDate, getFlexibleDateType } from '../../utils/dateUtils';
import {
  FileSpreadsheet,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  Download,
  Settings,
  BarChart3,
  PieChart,
  TrendingUp,
  Layers,
  Filter,
  Edit3,
  Stamp,
  PenLine,
  Activity,
  Landmark,
  Ruler,
  Wallet,
  Sparkles,
  ShieldCheck,
  ClipboardCheck,
  CalendarDays,
  Images,
  MapPin,
  Printer,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import type { SiteInspection } from '../../types/siteInspection';
import { getSiteInspection, getSiteInspections } from '../api/siteInspections';
import { openSiteInspectionReport, openSiteInspectionReports } from '../utils/siteInspectionReport';
import * as XLSX from 'xlsx';
import { Badge } from '../components/ui/badge';
import {
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#7c6f64', '#8f7a66', '#a38b73', '#5f6f73', '#8b6f47', '#8c7a6b', '#6e7d70', '#9c8f84'];

const FANAN_FONT_FAMILY = "'Fanan', Tahoma, Arial, sans-serif";
const getFananFontAbsoluteUrl = () =>
  new URL(fananFontUrl, window.location.origin).href;

const inspectionWorkflowLabels: Record<string, string> = {
  new: 'جديدة',
  under_review: 'قيد المراجعة',
  referred: 'تمت الإحالة',
  in_progress: 'جارٍ التنفيذ',
  resolved: 'تمت المعالجة',
  closed: 'مغلقة',
};

const inspectionConditionLabels: Record<string, string> = {
  excellent: 'ممتازة',
  good: 'جيدة',
  follow_up: 'تحتاج متابعة',
  maintenance: 'تحتاج صيانة',
  major_notes: 'ملاحظات جوهرية',
  emergency: 'حالة طارئة',
};

type ReportSectionType =
  | 'deeds'
  | 'allocated'
  | 'delivered'
  | 'leasedOut'
  | 'leasedIn'
  | 'buildingsOut'
  | 'buildingsIn'
  | 'siteInspections';

type ReportFilters = {
  region: string;
  city: string;
  district: string;
  usageType: string;
  isPlanned: 'all' | 'planned' | 'unplanned';
  coordinates: 'all' | 'with' | 'without';
  attachments: 'all' | 'with' | 'without';
};

type ReportSortSettings = {
  key: string;
  direction: 'asc' | 'desc';
};

type PrintSettings = {
  universityName: string;
  platformName: string;
  reportTitle: string;
  introText: string;
  footerText: string;
  showSignature: boolean;
  showStamp: boolean;
  signatureLabel: string;
  stampLabel: string;
  fontFamily: string;
  fontSize: number;
  headerColor: string;
};

const emptyFilters: ReportFilters = {
  region: '',
  city: '',
  district: '',
  usageType: '',
  isPlanned: 'all',
  coordinates: 'all',
  attachments: 'all',
};

const defaultPrintSettings: PrintSettings = {
  universityName: 'جامعة الإمام عبدالرحمن بن فيصل',
  platformName: 'منصة إدارة الصكوك والأراضي',
  reportTitle: '',
  introText: '',
  footerText: 'منصة إدارة الصكوك والأراضي',
  showSignature: false,
  showStamp: false,
  fontFamily: 'Tahoma, Arial, sans-serif',
  fontSize: 13,
  headerColor: '#1f4e79',
};

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, hasPermission } = usePermissions();
  const canPrintInspections =
    isAdmin || hasPermission('site_inspections', 'canPrint');

  const deedsColumns = [
    { key: 'propertyDescription', label: 'وصف العقار', enabled: true },
    { key: 'deedNumber', label: 'رقم الصك', enabled: true },
    { key: 'deedDate', label: 'تاريخ الصك', enabled: true },
    { key: 'plotNumber', label: 'رقم القطعة', enabled: true },
    { key: 'planNumber', label: 'رقم المخطط', enabled: true },
    { key: 'area', label: 'المساحة', enabled: true },
    { key: 'region', label: 'المنطقة', enabled: false },
    { key: 'city', label: 'المدينة', enabled: true },
    { key: 'district', label: 'الحي', enabled: true },
    { key: 'usageType', label: 'نوع الاستخدام', enabled: false },
    { key: 'isPlanned', label: 'مخططة', enabled: false },
    { key: 'coordinates', label: 'الإحداثيات', enabled: false },
    { key: 'attachmentsCount', label: 'عدد المرفقات', enabled: false },
    { key: 'notes', label: 'ملاحظات', enabled: false },
  ];

  const allocatedLandsColumns = [
    { key: 'plotNumber', label: t('deed.plotNumber'), enabled: true },
    { key: 'planNumber', label: t('deed.planNumber'), enabled: true },
    { key: 'area', label: t('deed.area'), enabled: true },
    { key: 'usageType', label: t('deed.usageType'), enabled: true },
    { key: 'city', label: t('deed.city'), enabled: true },
    { key: 'district', label: t('deed.district'), enabled: true },
    { key: 'region', label: t('deed.region'), enabled: true },
    { key: 'coordinates', label: t('deed.coordinates'), enabled: false },
  ];

  const deliveredLandsColumns = [
    { key: 'receiptNumber', label: 'رقم محضر الاستلام', enabled: true },
    { key: 'recipientEntity', label: t('deed.recipientEntity'), enabled: true },
    { key: 'deliveryDate', label: t('deed.deliveryDate'), enabled: true },
    { key: 'plotNumber', label: t('deed.plotNumber'), enabled: true },
    { key: 'planNumber', label: t('deed.planNumber'), enabled: true },
    { key: 'area', label: t('deed.area'), enabled: true },
    { key: 'city', label: t('deed.city'), enabled: true },
    { key: 'district', label: t('deed.district'), enabled: true },
    { key: 'location', label: t('deed.location'), enabled: true },
    { key: 'status', label: 'الحالة', enabled: true },
    { key: 'coordinates', label: t('deed.coordinates'), enabled: false },
  ];

  const leasedLandsOutColumns = [
    { key: 'tenant', label: t('deed.tenant'), enabled: true },
    { key: 'contractNumber', label: t('deed.contractNumber'), enabled: true },
    { key: 'contractStartDate', label: t('deed.contractStartDate'), enabled: true },
    { key: 'contractDuration', label: t('deed.contractDuration'), enabled: true },
    { key: 'plotNumber', label: t('deed.plotNumber'), enabled: true },
    { key: 'area', label: t('deed.area'), enabled: true },
    { key: 'rentAmount', label: t('deed.rentAmount'), enabled: true },
  ];

  const leasedLandsInColumns = [
    { key: 'owner', label: t('deed.owner'), enabled: true },
    { key: 'contractNumber', label: t('deed.contractNumber'), enabled: true },
    { key: 'contractDuration', label: t('deed.contractDuration'), enabled: true },
    { key: 'area', label: t('deed.area'), enabled: true },
    { key: 'location', label: t('deed.location'), enabled: true },
    { key: 'rentAmount', label: t('deed.rentAmount'), enabled: true },
  ];

  const leasedBuildingsOutColumns = [
    { key: 'tenant', label: t('deed.tenant'), enabled: true },
    { key: 'contractNumber', label: t('deed.contractNumber'), enabled: true },
    { key: 'buildingNumber', label: t('deed.buildingNumber'), enabled: true },
    { key: 'locationName', label: t('deed.locationName'), enabled: true },
    { key: 'area', label: t('deed.area'), enabled: true },
    { key: 'city', label: t('deed.city'), enabled: true },
    { key: 'rentAmount', label: t('deed.rentAmount'), enabled: true },
  ];

  const leasedBuildingsInColumns = [
    { key: 'owner', label: t('deed.owner'), enabled: true },
    { key: 'contractNumber', label: t('deed.contractNumber'), enabled: true },
    { key: 'buildingNumber', label: t('deed.buildingNumber'), enabled: true },
    { key: 'locationName', label: t('deed.locationName'), enabled: true },
    { key: 'area', label: t('deed.area'), enabled: true },
    { key: 'region', label: t('deed.region'), enabled: true },
    { key: 'rentAmount', label: t('deed.rentAmount'), enabled: true },
  ];

  const siteInspectionsColumns = [
    { key: 'inspectionNumber', label: 'رقم المعاينة', enabled: true },
    { key: 'title', label: 'عنوان المعاينة', enabled: true },
    { key: 'siteName', label: 'اسم الموقع', enabled: true },
    { key: 'siteType', label: 'نوع الموقع', enabled: true },
    { key: 'visitDate', label: 'تاريخ الزيارة', enabled: true },
    { key: 'city', label: 'المدينة', enabled: true },
    { key: 'district', label: 'الحي', enabled: true },
    { key: 'deedNumber', label: 'رقم الصك', enabled: true },
    { key: 'plotNumber', label: 'رقم القطعة', enabled: true },
    { key: 'planNumber', label: 'رقم المخطط', enabled: true },
    { key: 'overallStatus', label: 'الحالة العامة', enabled: true },
    { key: 'workflowStatus', label: 'سير المعالجة', enabled: true },
    { key: 'coordinates', label: 'الإحداثيات', enabled: false },
    { key: 'attachmentsCount', label: 'عدد المرفقات', enabled: true },
  ];

  const {
    deeds,
    allocatedLands,
    deliveredLands,
    leasedLandsOut,
    leasedLandsIn,
    leasedBuildingsOut,
    leasedBuildingsIn,
  } = useData();

  const [siteInspections, setSiteInspections] = useState<SiteInspection[]>([]);
  const [inspectionReportTitle, setInspectionReportTitle] = useState('');
  const [inspectionReportSubtitle, setInspectionReportSubtitle] = useState('');
  const [inspectionReportIntroduction, setInspectionReportIntroduction] = useState('');
  const [inspectionReportFooter, setInspectionReportFooter] = useState('');
  const [inspectionReportIncludeItems, setInspectionReportIncludeItems] = useState(true);
  const [inspectionReportIncludePhotos, setInspectionReportIncludePhotos] = useState(true);
  const [inspectionReportIncludeDocuments, setInspectionReportIncludeDocuments] = useState(true);
  const [inspectionReportIncludeLocation, setInspectionReportIncludeLocation] = useState(true);
  const [printingInspectionId, setPrintingInspectionId] = useState<string | null>(null);
  const [printingAllInspections, setPrintingAllInspections] = useState(false);

  React.useEffect(() => {
    let cancelled = false;

    getSiteInspections()
      .then((items) => {
        if (!cancelled) {
          setSiteInspections(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (!cancelled) setSiteInspections([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const inspectionReportOptions = {
    customTitle: inspectionReportTitle.trim() || undefined,
    customSubtitle: inspectionReportSubtitle.trim() || undefined,
    introduction: inspectionReportIntroduction.trim() || undefined,
    footerNote: inspectionReportFooter.trim() || undefined,
    includeItems: inspectionReportIncludeItems,
    includePhotos: inspectionReportIncludePhotos,
    includeDocuments: inspectionReportIncludeDocuments,
    includeLocationData: inspectionReportIncludeLocation,
  };

  const printSingleInspection = async (inspection: SiteInspection) => {
    if (!canPrintInspections || printingInspectionId || printingAllInspections) return;

    try {
      setPrintingInspectionId(inspection.id);
      const fullRecord = await getSiteInspection(inspection.id);
      const opened = openSiteInspectionReport(fullRecord, inspectionReportOptions);

      if (!opened) {
        toast.error('تعذر فتح تقرير PDF. فعّل السماح بالنوافذ المنبثقة في المتصفح.');
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تجهيز تقرير المعاينة بصيغة PDF'
      );
    } finally {
      setPrintingInspectionId(null);
    }
  };

  const printAllInspectionReports = async () => {
    if (!canPrintInspections || printingAllInspections || printingInspectionId) return;

    if (siteInspections.length === 0) {
      toast.error('لا توجد معاينات مسجلة لإنشاء PDF.');
      return;
    }

    try {
      setPrintingAllInspections(true);
      const fullRecords = await Promise.all(
        siteInspections.map((inspection) => getSiteInspection(inspection.id))
      );
      const opened = openSiteInspectionReports(fullRecords, true, inspectionReportOptions);

      if (!opened) {
        toast.error('تعذر فتح تقرير PDF. فعّل السماح بالنوافذ المنبثقة في المتصفح.');
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر تجهيز تقارير المعاينات بصيغة PDF'
      );
    } finally {
      setPrintingAllInspections(false);
    }
  };

  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'detailed' | 'summary' | 'statistical' | 'graphical'>('detailed');

  const [reportFilters, setReportFilters] = useState<Record<ReportSectionType, ReportFilters>>({
    deeds: { ...emptyFilters },
    allocated: { ...emptyFilters },
    delivered: { ...emptyFilters },
    leasedOut: { ...emptyFilters },
    leasedIn: { ...emptyFilters },
    buildingsOut: { ...emptyFilters },
    buildingsIn: { ...emptyFilters },
    siteInspections: { ...emptyFilters },
  });

  const [sortSettingsBySection, setSortSettingsBySection] = useState<Record<ReportSectionType, ReportSortSettings>>({
    deeds: { key: '', direction: 'asc' },
    allocated: { key: '', direction: 'asc' },
    delivered: { key: '', direction: 'asc' },
    leasedOut: { key: '', direction: 'asc' },
    leasedIn: { key: '', direction: 'asc' },
    buildingsOut: { key: '', direction: 'asc' },
    buildingsIn: { key: '', direction: 'asc' },
    siteInspections: { key: '', direction: 'asc' },
  });

  const [printSettingsBySection, setPrintSettingsBySection] = useState<Record<ReportSectionType, PrintSettings>>({
    deeds: { ...defaultPrintSettings, reportTitle: 'تقرير الصكوك' },
    allocated: { ...defaultPrintSettings, reportTitle: 'تقرير الأراضي المخصصة' },
    delivered: { ...defaultPrintSettings, reportTitle: 'تقرير الأراضي المسلمة' },
    leasedOut: { ...defaultPrintSettings, reportTitle: 'تقرير الأراضي المؤجرة من الجامعة' },
    leasedIn: { ...defaultPrintSettings, reportTitle: 'تقرير الأراضي المستأجرة للجامعة' },
    buildingsOut: { ...defaultPrintSettings, reportTitle: 'تقرير المباني المؤجرة من الجامعة' },
    buildingsIn: { ...defaultPrintSettings, reportTitle: 'تقرير المباني المستأجرة للجامعة' },
    siteInspections: { ...defaultPrintSettings, reportTitle: 'تقرير معاينات الأراضي والمواقع' },
  });

  const [selectedColumns, setSelectedColumns] = useState<any>({
    deeds: deedsColumns,
    allocated: allocatedLandsColumns,
    delivered: deliveredLandsColumns,
    leasedOut: leasedLandsOutColumns,
    leasedIn: leasedLandsInColumns,
    buildingsOut: leasedBuildingsOutColumns,
    buildingsIn: leasedBuildingsInColumns,
    siteInspections: siteInspectionsColumns,
  });

  const printRefs = {
    deeds: useRef<HTMLDivElement>(null),
    allocated: useRef<HTMLDivElement>(null),
    delivered: useRef<HTMLDivElement>(null),
    leasedOut: useRef<HTMLDivElement>(null),
    leasedIn: useRef<HTMLDivElement>(null),
    buildingsOut: useRef<HTMLDivElement>(null),
    buildingsIn: useRef<HTMLDivElement>(null),
    siteInspections: useRef<HTMLDivElement>(null),
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleColumn = (section: string, columnKey: string) => {
    setSelectedColumns((prev: any) => ({
      ...prev,
      [section]: prev[section].map((col: any) =>
        col.key === columnKey ? { ...col, enabled: !col.enabled } : col
      ),
    }));
  };

  const toggleAllColumns = (section: string) => {
    const allEnabled = selectedColumns[section].every((col: any) => col.enabled);

    setSelectedColumns((prev: any) => ({
      ...prev,
      [section]: prev[section].map((col: any) => ({ ...col, enabled: !allEnabled })),
    }));
  };

  const updateReportFilter = (
    section: ReportSectionType,
    key: keyof ReportFilters,
    value: string
  ) => {
    setReportFilters((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const resetReportFilters = (section: ReportSectionType) => {
    setReportFilters((prev) => ({
      ...prev,
      [section]: { ...emptyFilters },
    }));
  };

  const updatePrintSetting = <K extends keyof PrintSettings>(
    section: ReportSectionType,
    key: K,
    value: PrintSettings[K]
  ) => {
    setPrintSettingsBySection((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const resetPrintSettings = (section: ReportSectionType, title: string) => {
    setPrintSettingsBySection((prev) => ({
      ...prev,
      [section]: {
        ...defaultPrintSettings,
        reportTitle: `تقرير ${title}`,
      },
    }));
  };

  const hasCoordinates = (item: any) => {
    if (typeof item?.latitude === 'number' && typeof item?.longitude === 'number') {
      return true;
    }

    if (!item?.coordinates) return false;

    if (typeof item.coordinates === 'string') {
      return item.coordinates.trim().length > 0;
    }

    if (typeof item.coordinates === 'object') {
      return Boolean(item.coordinates.latitude || item.coordinates.longitude || item.coordinates.lat || item.coordinates.lng);
    }

    return false;
  };

  const hasAttachments = (item: any) => {
    return Array.isArray(item?.attachments) && item.attachments.length > 0;
  };

  const normalizeText = (value: any) => String(value ?? '').trim();

  const getUniqueOptions = (data: any[], key: string) => {
    const values = new Set<string>();

    data.forEach((item) => {
      const value = normalizeText(item?.[key]);

      if (value) values.add(value);
    });

    return Array.from(values).sort((a, b) => a.localeCompare(b, 'ar'));
  };

  const applyFilters = (data: any[], filters: ReportFilters) => {
    const safeData = Array.isArray(data) ? data : [];

    return safeData.filter((item) => {
      if (filters.region && normalizeText(item.region) !== filters.region) return false;
      if (filters.city && normalizeText(item.city) !== filters.city) return false;
      if (filters.district && normalizeText(item.district) !== filters.district) return false;
      if (filters.usageType && normalizeText(item.usageType) !== filters.usageType) return false;

      if (filters.isPlanned === 'planned' && !item.isPlanned) return false;
      if (filters.isPlanned === 'unplanned' && item.isPlanned) return false;

      if (filters.coordinates === 'with' && !hasCoordinates(item)) return false;
      if (filters.coordinates === 'without' && hasCoordinates(item)) return false;

      if (filters.attachments === 'with' && !hasAttachments(item)) return false;
      if (filters.attachments === 'without' && hasAttachments(item)) return false;

      return true;
    });
  };

  const normalizeSortValue = (item: any, key: string) => {
    const rawValue = item?.[key];

    if (
      key === 'area' ||
      key === 'rentAmount' ||
      key === 'attachmentsCount' ||
      key === 'plotNumber' ||
      key === 'planNumber' ||
      key === 'buildingNumber'
    ) {
      if (key === 'attachmentsCount') {
        return Array.isArray(item?.attachments) ? item.attachments.length : 0;
      }

      const numericValue = Number(
        String(rawValue ?? '')
          .replaceAll(',', '')
          .replace(/[^\d.-]/g, '')
      );

      return Number.isFinite(numericValue) ? numericValue : 0;
    }

    if (
      key === 'deedDate' ||
      key === 'deliveryDate' ||
      key === 'receiptDate' ||
      key === 'contractStartDate' ||
      key === 'visitDate' ||
      key === 'followUpDate' ||
      key === 'createdAt' ||
      key === 'updatedAt'
    ) {
      const timestamp = new Date(rawValue || 0).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    }

    if (key === 'isPlanned') {
      return item?.isPlanned ? 1 : 0;
    }

    if (key === 'overallStatus') {
      return inspectionConditionLabels[item?.overallStatus] || item?.overallStatus || '';
    }

    if (key === 'workflowStatus') {
      return inspectionWorkflowLabels[item?.workflowStatus] || item?.workflowStatus || '';
    }

    if (key === 'propertyDescription') {
      return item?.propertyDescription || item?.description || '';
    }

    if (key === 'tenant' || key === 'owner') {
      return typeof rawValue === 'object'
        ? rawValue?.name || ''
        : String(rawValue || '');
    }

    return String(rawValue ?? '').trim();
  };

  const sortReportData = (
    data: any[],
    settings: ReportSortSettings
  ) => {
    const safeData = Array.isArray(data) ? [...data] : [];

    if (!settings.key) {
      return safeData;
    }

    const directionFactor = settings.direction === 'desc' ? -1 : 1;

    return safeData.sort((first, second) => {
      const firstValue = normalizeSortValue(first, settings.key);
      const secondValue = normalizeSortValue(second, settings.key);

      if (typeof firstValue === 'number' && typeof secondValue === 'number') {
        return (firstValue - secondValue) * directionFactor;
      }

      return String(firstValue).localeCompare(
        String(secondValue),
        'ar',
        {
          numeric: true,
          sensitivity: 'base',
        }
      ) * directionFactor;
    });
  };

  const updateSortSetting = (
    section: ReportSectionType,
    key: keyof ReportSortSettings,
    value: string
  ) => {
    setSortSettingsBySection((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value,
      },
    }));
  };

  const statistics = useMemo(() => {
    const safeDeeds = Array.isArray(deeds) ? deeds : [];
    const safeAllocated = Array.isArray(allocatedLands) ? allocatedLands : [];
    const safeDelivered = Array.isArray(deliveredLands) ? deliveredLands : [];
    const safeLeasedOut = Array.isArray(leasedLandsOut) ? leasedLandsOut : [];
    const safeLeasedIn = Array.isArray(leasedLandsIn) ? leasedLandsIn : [];
    const safeBuildingsOut = Array.isArray(leasedBuildingsOut) ? leasedBuildingsOut : [];
    const safeBuildingsIn = Array.isArray(leasedBuildingsIn) ? leasedBuildingsIn : [];
    const safeSiteInspections = Array.isArray(siteInspections) ? siteInspections : [];

    return {
      deeds: {
        total: safeDeeds.length,
        totalArea: safeDeeds.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0),
        plannedCount: safeDeeds.filter((item: any) => item.isPlanned).length,
        unplannedCount: safeDeeds.filter((item: any) => !item.isPlanned).length,
        byCity: safeDeeds.reduce((acc: any, item: any) => {
          const key = item.city || 'غير محدد';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
        byUsage: safeDeeds.reduce((acc: any, item: any) => {
          const key = item.usageType || 'غير محدد';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },
      allocated: {
        total: safeAllocated.length,
        totalArea: safeAllocated.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0),
        byCity: safeAllocated.reduce((acc: any, item: any) => {
          const key = item.city || 'غير محدد';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
        byUsage: safeAllocated.reduce((acc: any, item: any) => {
          const key = item.usageType || 'غير محدد';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },
      delivered: {
        total: safeDelivered.length,
        totalArea: safeDelivered.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0),
        byRecipient: safeDelivered.reduce((acc: any, item: any) => {
          const key = item.recipientEntity || 'غير محدد';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },
      leasedOut: {
        total: safeLeasedOut.length,
        totalArea: safeLeasedOut.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0),
        totalRent: safeLeasedOut.reduce((sum: number, item: any) => sum + Number(item.rentAmount || 0), 0),
      },
      leasedIn: {
        total: safeLeasedIn.length,
        totalArea: safeLeasedIn.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0),
        totalRent: safeLeasedIn.reduce((sum: number, item: any) => sum + Number(item.rentAmount || 0), 0),
      },
      buildingsOut: {
        total: safeBuildingsOut.length,
        totalArea: safeBuildingsOut.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0),
        totalRent: safeBuildingsOut.reduce((sum: number, item: any) => sum + Number(item.rentAmount || 0), 0),
      },
      buildingsIn: {
        total: safeBuildingsIn.length,
        totalArea: safeBuildingsIn.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0),
        totalRent: safeBuildingsIn.reduce((sum: number, item: any) => sum + Number(item.rentAmount || 0), 0),
      },
      siteInspections: {
        total: safeSiteInspections.length,
        withCoordinates: safeSiteInspections.filter((item: any) => item.latitude != null && item.longitude != null).length,
        withAttachments: safeSiteInspections.filter((item: any) => Array.isArray(item.attachments) && item.attachments.length > 0).length,
        byCity: safeSiteInspections.reduce((acc: any, item: any) => {
          const key = item.city || 'غير محدد';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
        byStatus: safeSiteInspections.reduce((acc: any, item: any) => {
          const key = inspectionWorkflowLabels[item.workflowStatus] || item.workflowStatus || 'غير محدد';
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
      },
    };
  }, [
    deeds,
    allocatedLands,
    deliveredLands,
    leasedLandsOut,
    leasedLandsIn,
    leasedBuildingsOut,
    leasedBuildingsIn,
    siteInspections,
  ]);

  const executiveOverview = useMemo(() => {
    const totalRecords =
      Number(statistics.deeds.total || 0) +
      Number(statistics.allocated.total || 0) +
      Number(statistics.delivered.total || 0) +
      Number(statistics.leasedOut.total || 0) +
      Number(statistics.leasedIn.total || 0) +
      Number(statistics.buildingsOut.total || 0) +
      Number(statistics.buildingsIn.total || 0) +
      Number(statistics.siteInspections.total || 0);

    const totalArea =
      Number(statistics.deeds.totalArea || 0) +
      Number(statistics.allocated.totalArea || 0) +
      Number(statistics.delivered.totalArea || 0) +
      Number(statistics.leasedOut.totalArea || 0) +
      Number(statistics.leasedIn.totalArea || 0) +
      Number(statistics.buildingsOut.totalArea || 0) +
      Number(statistics.buildingsIn.totalArea || 0);

    const totalRent =
      Number(statistics.leasedOut.totalRent || 0) +
      Number(statistics.leasedIn.totalRent || 0) +
      Number(statistics.buildingsOut.totalRent || 0) +
      Number(statistics.buildingsIn.totalRent || 0);

    const categories = [
      { name: 'الصكوك', value: Number(statistics.deeds.total || 0) },
      { name: 'الأراضي المخصصة', value: Number(statistics.allocated.total || 0) },
      { name: 'الأراضي المسلمة', value: Number(statistics.delivered.total || 0) },
      { name: 'الأراضي المؤجرة', value: Number(statistics.leasedOut.total || 0) },
      { name: 'الأراضي المستأجرة', value: Number(statistics.leasedIn.total || 0) },
      { name: 'المباني المؤجرة', value: Number(statistics.buildingsOut.total || 0) },
      { name: 'المباني المستأجرة', value: Number(statistics.buildingsIn.total || 0) },
      { name: 'المعاينات', value: Number(statistics.siteInspections.total || 0) },
    ];

    const inspectionsTotal = Number(statistics.siteInspections.total || 0);
    const inspectionsWithCoordinates = Number(
      statistics.siteInspections.withCoordinates || 0
    );
    const inspectionsWithAttachments = Number(
      statistics.siteInspections.withAttachments || 0
    );

    return {
      totalRecords,
      totalArea,
      totalRent,
      inspectionsTotal,
      categories,
      coordinateCoverage:
        inspectionsTotal > 0
          ? Math.round((inspectionsWithCoordinates / inspectionsTotal) * 100)
          : 0,
      attachmentCoverage:
        inspectionsTotal > 0
          ? Math.round((inspectionsWithAttachments / inspectionsTotal) * 100)
          : 0,
    };
  }, [statistics]);

  const formatDate = (value: any, type = 'gregorian') => {
    return formatFlexibleDate(value, type as any);
  };

  const formatCoordinates = (coordinates: any) => {
    if (!coordinates) return '-';

    if (typeof coordinates === 'string') {
      return coordinates;
    }

    if (
      typeof coordinates.latitude === 'number' &&
      typeof coordinates.longitude === 'number'
    ) {
      return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    }

    return '-';
  };

  const formatCellValue = (item: any, key: string) => {
    if (key === 'area') {
      return Number(item.area || 0).toLocaleString();
    }

    if (key === 'rentAmount') {
      return item.rentAmount ? `${Number(item.rentAmount).toLocaleString()} ${t('common.sar')}` : '-';
    }

    if (
      key === 'deedDate' ||
      key === 'deliveryDate' ||
      key === 'receiptDate' ||
      key === 'contractStartDate' ||
      key === 'visitDate' ||
      key === 'followUpDate'
    ) {
      return formatDate(item[key], getFlexibleDateType(item, key));
    }

    if (key === 'tenant' || key === 'owner') {
      if (typeof item[key] === 'object' && item[key]?.name) {
        return item[key].name;
      }

      return item[key] || '-';
    }

    if (key === 'coordinates') {
      if (typeof item?.latitude === 'number' && typeof item?.longitude === 'number') {
        return `${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}`;
      }

      return formatCoordinates(item.coordinates);
    }

    if (key === 'isPlanned') {
      return item.isPlanned ? 'نعم' : 'لا';
    }

    if (key === 'attachmentsCount') {
      return Array.isArray(item.attachments) ? item.attachments.length : 0;
    }

    if (key === 'overallStatus') {
      return inspectionConditionLabels[item.overallStatus] || item.overallStatus || '-';
    }

    if (key === 'workflowStatus') {
      return inspectionWorkflowLabels[item.workflowStatus] || item.workflowStatus || '-';
    }

    if (key === 'propertyDescription') {
      return item.propertyDescription || item.description || '-';
    }

    return item[key] || '-';
  };

  const exportToExcel = (data: any[], columns: any[], filename: string) => {
    try {
      const enabledColumns = columns.filter((col) => col.enabled);

      const excelData = data.map((item, index) => {
        const row: any = {
          '#': index + 1,
        };

        enabledColumns.forEach((col) => {
          row[col.label] = formatCellValue(item, col.key);
        });

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, 'Report');

      ws['!cols'] = [
        { wch: 8 },
        ...enabledColumns.map(() => ({ wch: 24 })),
      ];

      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(t('reports.exportSuccess') || 'تم التصدير بنجاح');
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast.error(t('reports.exportError') || 'فشل في التصدير');
    }
  };

  const escapeHtml = (value: any) => {
    return String(value ?? '-')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  };


  const getPrintableColumnMeta = (key: string, index: number) => {
    const normalizedKey = String(key || '').toLowerCase();

    if (index === 0) {
      return { width: '4%', className: 'col-index' };
    }

    if (/description|propertydescription|locationname|recipiententity|tenant|owner/.test(normalizedKey)) {
      return { width: '25%', className: 'col-description' };
    }

    if (/deednumber|receiptnumber|contractnumber|inspectionnumber/.test(normalizedKey)) {
      return { width: '12%', className: 'col-number' };
    }

    if (/date/.test(normalizedKey)) {
      return { width: '10%', className: 'col-date' };
    }

    if (/area|rentamount|amount|value/.test(normalizedKey)) {
      return { width: '10%', className: 'col-numeric' };
    }

    if (/city|district|region|usagetype|status|type/.test(normalizedKey)) {
      return { width: '9%', className: 'col-short' };
    }

    if (/plotnumber|plannumber|buildingnumber/.test(normalizedKey)) {
      return { width: '9%', className: 'col-code' };
    }

    return { width: '10%', className: 'col-default' };
  };

  const buildPrintableReportHtml = (
    data: any[],
    columns: any[],
    title: string,
    stats?: { total: number; totalArea?: string },
    settings?: PrintSettings,
    filters?: ReportFilters
  ) => {
    const enabledColumns = columns.filter((col) => col.enabled);
    const currentDate = new Date();
    const effectiveSettings = {
      ...defaultPrintSettings,
      ...(settings || {}),
      reportTitle: settings?.reportTitle || title,
    };

    const dateString = currentDate.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const timeString = currentDate.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const safeIntro = escapeHtml(effectiveSettings.introText).replaceAll('\n', '<br />');
    const safeFooter = escapeHtml(effectiveSettings.footerText).replaceAll('\n', '<br />');

    const activeFiltersHtml = filters
      ? [
          filters.region ? `المنطقة: ${escapeHtml(filters.region)}` : '',
          filters.city ? `المدينة: ${escapeHtml(filters.city)}` : '',
          filters.district ? `الحي: ${escapeHtml(filters.district)}` : '',
          filters.usageType ? `نوع الاستخدام: ${escapeHtml(filters.usageType)}` : '',
          filters.isPlanned !== 'all'
            ? `مخططة: ${filters.isPlanned === 'planned' ? 'نعم' : 'لا'}`
            : '',
          filters.coordinates !== 'all'
            ? `الإحداثيات: ${filters.coordinates === 'with' ? 'يوجد' : 'لا يوجد'}`
            : '',
          filters.attachments !== 'all'
            ? `المرفقات: ${filters.attachments === 'with' ? 'يوجد' : 'لا يوجد'}`
            : '',
        ]
          .filter(Boolean)
          .map((item) => `<span class="filter-chip">${item}</span>`)
          .join('')
      : '';

    const printableColumns = [
      { key: '__index', label: '#' },
      ...enabledColumns,
    ].map((column, index) => ({
      ...column,
      ...getPrintableColumnMeta(column.key, index),
    }));

    const printableColumnCount = printableColumns.length;
    const printableTableWidth =
      printableColumnCount <= 6
        ? '78%'
        : printableColumnCount <= 8
        ? '86%'
        : printableColumnCount <= 10
        ? '92%'
        : '96%';

    const colgroupHtml = printableColumns
      .map(
        (column) =>
          `<col class="${column.className}" style="width:${column.width}" />`
      )
      .join('');

    const rowsHtml =
      data.length === 0
        ? `<tr><td colspan="${printableColumns.length}" class="empty-cell">لا توجد بيانات</td></tr>`
        : data
            .map((item, index) => {
              const cells = enabledColumns
                .map((col, columnIndex) => {
                  const meta = printableColumns[columnIndex + 1];
                  const value = escapeHtml(formatCellValue(item, col.key));

                  return `<td class="${meta.className}" data-label="${escapeHtml(col.label)}"><span>${value}</span></td>`;
                })
                .join('');

              return `<tr><td class="col-index"><span>${index + 1}</span></td>${cells}</tr>`;
            })
            .join('');

    const headersHtml = printableColumns
      .map(
        (column) =>
          `<th class="${column.className}">${escapeHtml(column.label)}</th>`
      )
      .join('');

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(effectiveSettings.reportTitle)}</title>
  <style>
    @font-face {
      font-family: 'Fanan';
      src: url('${getFananFontAbsoluteUrl()}') format('truetype');
      font-style: normal;
      font-weight: 400;
      font-display: swap;
    }

    @page {
      size: A4 landscape;
      margin: 7mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      direction: rtl;
      background: #ffffff;
      color: #172033;
      font-family: ${effectiveSettings.fontFamily};
      font-size: ${Math.max(10, Number(effectiveSettings.fontSize || 13) - 1)}px;
      line-height: 1.45;
    }

    body {
      padding: 8px;
    }

    .report {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    .header {
      position: relative;
      overflow: hidden;
      border: 1px solid #d6dee8;
      border-top: 4px solid ${effectiveSettings.headerColor};
      border-radius: 14px;
      padding: 11px 16px 9px;
      margin-bottom: 9px;
      text-align: center;
      background: linear-gradient(135deg, #ffffff 0%, #f7fafc 55%, #eef4f8 100%);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
    }

    .header::after {
      content: '';
      position: absolute;
      inset-inline-start: -45px;
      top: -55px;
      width: 150px;
      height: 150px;
      border-radius: 999px;
      background: radial-gradient(circle, rgba(255,255,255,.9), transparent 68%);
      pointer-events: none;
    }

    .university {
      font-size: 19px;
      line-height: 1.25;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .subtitle {
      font-size: 10.5px;
      color: #64748b;
      margin-bottom: 6px;
    }

    .title {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 230px;
      padding: 5px 18px;
      border-radius: 999px;
      border: 1px solid #d7e0ea;
      background: rgba(255, 255, 255, .9);
      box-shadow: inset 0 1px 0 #ffffff, 0 3px 9px rgba(15, 23, 42, .05);
      font-size: 16px;
      line-height: 1.25;
      font-weight: 800;
      color: ${effectiveSettings.headerColor};
    }

    .meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 7px;
      color: #64748b;
      font-size: 9.5px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 8px 0;
    }

    .stat {
      border: 1px solid #dbe3ec;
      border-radius: 11px;
      padding: 6px 9px;
      background: linear-gradient(180deg, #ffffff, #f8fafc);
      text-align: center;
      box-shadow: inset 0 1px 0 #ffffff;
    }

    .stat-label {
      color: #718096;
      font-size: 9.5px;
      margin-bottom: 1px;
    }

    .stat-value {
      color: ${effectiveSettings.headerColor};
      font-size: 16px;
      line-height: 1.2;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }

    .intro {
      margin: 7px 0;
      padding: 7px 10px;
      border: 1px solid #dbe3ec;
      border-inline-start: 4px solid ${effectiveSettings.headerColor};
      border-radius: 9px;
      background: #fbfdff;
      color: #334155;
      font-size: 10px;
    }

    .filters {
      margin: 6px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .filter-chip {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border: 1px solid #d7e0ea;
      border-radius: 999px;
      background: #f8fafc;
      color: #475569;
      font-size: 9px;
    }

    .table-shell {
      width: var(--report-table-width, 96%);
      margin-inline: auto;
      overflow: hidden;
      border: 0.65px solid #d8e0e8;
      border-radius: 9px;
      background: #ffffff;
      box-shadow:
        0 7px 20px rgba(15, 23, 42, .03),
        inset 0 1px 0 rgba(255, 255, 255, .96);
    }

    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      table-layout: fixed;
      background: #ffffff;
    }

    thead th {
      position: relative;
      padding: 6px 4px;
      background: linear-gradient(180deg, ${effectiveSettings.headerColor} 0%, #173f62 100%);
      color: #ffffff;
      font-size: 9.7px;
      line-height: 1.25;
      font-weight: 800;
      text-align: center;
      vertical-align: middle;
      border-inline-start: 0.6px solid rgba(255, 255, 255, .16);
      border-bottom: 0.7px solid #173f62;
      white-space: normal;
      overflow-wrap: anywhere;
    }

    thead th:first-child {
      border-inline-start: 0;
    }

    tbody td {
      padding: 5px 4px;
      text-align: center;
      vertical-align: middle;
      color: #1f2937;
      font-size: 9.4px;
      line-height: 1.35;
      border-inline-start: 0.6px solid #e2e8ef;
      border-bottom: 0.6px solid #e2e8ef;
      overflow-wrap: anywhere;
      word-break: normal;
      white-space: normal;
    }

    tbody td:first-child {
      border-inline-start: 0;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    tbody tr:nth-child(odd) td {
      background: #ffffff;
    }

    tbody tr:nth-child(even) td {
      background: #f6f9fc;
    }

    tbody tr:nth-child(5n) td {
      border-bottom-color: #cbd6e2;
    }

    td span {
      display: block;
      max-width: 100%;
    }

    .col-index {
      font-weight: 800;
      color: ${effectiveSettings.headerColor};
      font-variant-numeric: tabular-nums;
    }

    .col-number,
    .col-code,
    .col-numeric,
    .col-date {
      font-variant-numeric: tabular-nums;
    }

    .col-number,
    .col-code {
      font-weight: 700;
    }

    .col-description {
      text-align: right;
      font-weight: 600;
    }

    .col-numeric {
      font-weight: 700;
      color: #1d4f73;
    }

    .empty-cell {
      padding: 24px !important;
      color: #64748b;
      text-align: center !important;
    }

    .footer {
      margin-top: 8px;
      padding: 7px 3px 0;
      border-top: 1px solid #d7e0ea;
      display: flex;
      justify-content: space-between;
      gap: 14px;
      color: #64748b;
      font-size: 8.8px;
      line-height: 1.35;
    }

    .signature {
      display: flex;
      justify-content: center;
      gap: 70px;
      margin-top: 26px;
      color: #111827;
    }

    .signature-item {
      min-width: 150px;
      text-align: center;
      border-top: 1px solid #475569;
      padding-top: 6px;
      font-size: 10px;
    }

    .no-print {
      margin-bottom: 8px;
      padding: 6px 10px;
      border: 1px solid #fde68a;
      background: #fffbeb;
      color: #92400e;
      border-radius: 8px;
      font-size: 10px;
      text-align: center;
    }

    @media print {
      html,
      body {
        width: 100%;
        height: auto;
      }

      body {
        padding: 0;
      }

      .no-print {
        display: none !important;
      }

      .header,
      .stats,
      .intro,
      .filters,
      .footer,
      .signature {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .table-shell {
        overflow: visible;
        box-shadow: none;
      }

      table {
        page-break-inside: auto;
      }

      tr {
        break-inside: avoid;
        page-break-inside: avoid;
        page-break-after: auto;
      }

      thead {
        display: table-header-group;
      }

      tfoot {
        display: table-footer-group;
      }
    }
  </style>
</head>
<body>
  <div class="report">
    <div class="no-print">
      للحفظ PDF اختر من نافذة الطباعة: Destination / الوجهة = Save as PDF
    </div>

    <div class="header">
      <div class="university">${escapeHtml(effectiveSettings.universityName)}</div>
      <div class="subtitle">${escapeHtml(effectiveSettings.platformName)}</div>
      <div class="title">${escapeHtml(effectiveSettings.reportTitle)}</div>
      <div class="meta">
        <div>التاريخ: ${escapeHtml(dateString)}</div>
        <div>الوقت: ${escapeHtml(timeString)}</div>
      </div>
    </div>

    ${safeIntro ? `<div class="intro">${safeIntro}</div>` : ''}
    ${activeFiltersHtml ? `<div class="filters">${activeFiltersHtml}</div>` : ''}

    ${
      stats
        ? `<div class="stats">
            <div class="stat">
              <div class="stat-label">إجمالي السجلات</div>
              <div class="stat-value">${escapeHtml(stats.total)}</div>
            </div>
            ${
              stats.totalArea
                ? `<div class="stat">
                    <div class="stat-label">إجمالي المساحة</div>
                    <div class="stat-value">${escapeHtml(stats.totalArea)} م²</div>
                  </div>`
                : ''
            }
          </div>`
        : ''
    }

    <div class="table-shell" style="--report-table-width:${printableTableWidth}">
      <table>
        <colgroup>${colgroupHtml}</colgroup>
      <thead>
        <tr>${headersHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
      </table>
    </div>


    ${
      effectiveSettings.showSignature || effectiveSettings.showStamp
        ? `<div class="signature">
            ${
              effectiveSettings.showSignature
                ? `<div class="signature-item">${escapeHtml(effectiveSettings.signatureLabel || 'التوقيع')}</div>`
                : ''
            }
            ${
              effectiveSettings.showStamp
                ? `<div class="signature-item">${escapeHtml(effectiveSettings.stampLabel || 'الختم')}</div>`
                : ''
            }
          </div>`
        : ''
    }
  </div>
</body>
</html>`;
  };

  const openPrintableHtml = (html: string, autoPrint = true) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank', 'noopener,noreferrer');

    if (!printWindow) {
      URL.revokeObjectURL(url);
      toast.error('تعذر فتح نافذة الطباعة. فعّل السماح بالنوافذ المنبثقة من المتصفح.');
      return;
    }

    if (autoPrint) {
      const timer = window.setInterval(() => {
        try {
          if (printWindow.document.readyState === 'complete') {
            window.clearInterval(timer);
            printWindow.focus();

            setTimeout(() => {
              printWindow.print();
            }, 500);
          }
        } catch {
          window.clearInterval(timer);
        }
      }, 250);
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const exportToPDF = (
    data: any[],
    columns: any[],
    title: string,
    filename: string,
    settings?: PrintSettings,
    filters?: ReportFilters
  ) => {
    try {
      const html = buildPrintableReportHtml(
        data,
        columns,
        title,
        {
          total: Array.isArray(data) ? data.length : 0,
        },
        settings,
        filters
      );

      openPrintableHtml(html, true);
      toast.success('تم فتح نافذة الطباعة. اختر Save as PDF للحفظ بصيغة PDF.');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error(t('reports.exportError') || 'فشل في التصدير');
    }
  };

  const handlePrint = (
    data: any[],
    columns: any[],
    title: string,
    stats?: { total: number; totalArea?: string },
    settings?: PrintSettings,
    filters?: ReportFilters
  ) => {
    try {
      const html = buildPrintableReportHtml(data, columns, title, stats, settings, filters);
      openPrintableHtml(html, true);
    } catch (error) {
      console.error('Print Error:', error);
      toast.error('فشل في فتح نافذة الطباعة');
    }
  };

  const getSectionStatistics = (type: ReportSectionType) => {
    return (statistics as any)[type] || {
      total: 0,
      totalArea: 0,
    };
  };

  const getDistributionData = (type: ReportSectionType) => {
    const sectionStats = getSectionStatistics(type);

    if (type === 'siteInspections') {
      if (sectionStats.byCity && Object.keys(sectionStats.byCity).length > 0) {
        return {
          title: 'توزيع المعاينات حسب المدينة',
          data: Object.entries(sectionStats.byCity).map(([name, value]) => ({ name, value })),
        };
      }

      if (sectionStats.byStatus && Object.keys(sectionStats.byStatus).length > 0) {
        return {
          title: 'توزيع المعاينات حسب حالة المعالجة',
          data: Object.entries(sectionStats.byStatus).map(([name, value]) => ({ name, value })),
        };
      }
    }

    if (sectionStats.byCity && Object.keys(sectionStats.byCity).length > 0) {
      return {
        title: 'التوزيع حسب المدينة',
        data: Object.entries(sectionStats.byCity).map(([name, value]) => ({ name, value })),
      };
    }

    if (sectionStats.byUsage && Object.keys(sectionStats.byUsage).length > 0) {
      return {
        title: 'التوزيع حسب نوع الاستخدام',
        data: Object.entries(sectionStats.byUsage).map(([name, value]) => ({ name, value })),
      };
    }

    if (sectionStats.byRecipient && Object.keys(sectionStats.byRecipient).length > 0) {
      return {
        title: 'التوزيع حسب الجهة المستلمة',
        data: Object.entries(sectionStats.byRecipient).map(([name, value]) => ({ name, value })),
      };
    }

    return {
      title: 'لا توجد بيانات توزيع',
      data: [],
    };
  };

  const renderReportSection = (
    type: ReportSectionType,
    title: string,
    data: any[],
    columns: any[],
    refKey: keyof typeof printRefs
  ) => {
    const originalData = Array.isArray(data) ? data : [];
    const filters = reportFilters[type];
    const printSettings = printSettingsBySection[type];
    const safeData = applyFilters(originalData, filters);
    const sortSettings = sortSettingsBySection[type];
    const sortedData = sortReportData(safeData, sortSettings);
    const enabledColumns = columns.filter((col) => col.enabled);
    const previewTableWidth =
      enabledColumns.length <= 5
        ? '78%'
        : enabledColumns.length <= 7
        ? '86%'
        : enabledColumns.length <= 9
        ? '92%'
        : '97%';
    const regionOptions = getUniqueOptions(originalData, 'region');
    const cityOptions = getUniqueOptions(originalData, 'city');
    const districtOptions = getUniqueOptions(originalData, 'district');
    const usageOptions = getUniqueOptions(originalData, 'usageType');
    const sectionStats = getSectionStatistics(type);
    const distribution = getDistributionData(type);

    return (
      <Card key={type} className="group relative overflow-hidden rounded-[30px] border border-white/45 bg-white/55 shadow-[0_20px_60px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_80px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.92)]">
        <CardHeader className="border-b border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,239,231,0.72),rgba(236,231,223,0.56))]">
          <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-700" />
                {title}
              </CardTitle>

              <CardDescription className="mt-2">
                إجمالي بعد الفرز: <strong>{safeData.length}</strong> من <strong>{originalData.length}</strong> سجل
                {sectionStats.totalArea > 0 && (
                  <>
                    {' '}
                    | إجمالي المساحة:{' '}
                    <strong>{Number(sectionStats.totalArea || 0).toLocaleString()}</strong> م²
                  </>
                )}
              </CardDescription>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSection(type)}
              className="rounded-full border border-white/50 bg-white/70 text-slate-700 shadow-sm hover:bg-white"
            >
              {expandedSection === type ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardHeader>

        {expandedSection === type && (
          <CardContent className="space-y-6 pt-6">
            <Tabs value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-[22px] border border-white/50 bg-white/70 p-1 shadow-sm backdrop-blur-xl md:grid-cols-4">
                <TabsTrigger value="detailed" className="text-xs md:text-sm">
                  <FileText className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                  تقرير مفصل
                </TabsTrigger>

                <TabsTrigger value="summary" className="text-xs md:text-sm">
                  <BarChart3 className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                  ملخص
                </TabsTrigger>

                <TabsTrigger value="statistical" className="text-xs md:text-sm">
                  <TrendingUp className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                  إحصائي
                </TabsTrigger>

                <TabsTrigger value="graphical" className="text-xs md:text-sm">
                  <PieChart className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
                  رسوم بيانية
                </TabsTrigger>
              </TabsList>

              <TabsContent value="detailed" className="space-y-4">
                <Card className="rounded-[24px] border border-white/45 bg-white/55 shadow-[0_10px_35px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        الفرز قبل الطباعة والتصدير
                      </CardTitle>

                      <Button variant="outline" size="sm" onClick={() => resetReportFilters(type)}>
                        مسح الفرز
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <Label>المنطقة</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={filters.region}
                          onChange={(event) => updateReportFilter(type, 'region', event.target.value)}
                        >
                          <option value="">الكل</option>
                          {regionOptions.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>المدينة</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={filters.city}
                          onChange={(event) => updateReportFilter(type, 'city', event.target.value)}
                        >
                          <option value="">الكل</option>
                          {cityOptions.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>الحي</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={filters.district}
                          onChange={(event) => updateReportFilter(type, 'district', event.target.value)}
                        >
                          <option value="">الكل</option>
                          {districtOptions.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>نوع الاستخدام</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={filters.usageType}
                          onChange={(event) => updateReportFilter(type, 'usageType', event.target.value)}
                        >
                          <option value="">الكل</option>
                          {usageOptions.map((value) => (
                            <option key={value} value={value}>{value}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>مخططة؟</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={filters.isPlanned}
                          onChange={(event) => updateReportFilter(type, 'isPlanned', event.target.value)}
                        >
                          <option value="all">الكل</option>
                          <option value="planned">مخططة</option>
                          <option value="unplanned">غير مخططة</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>الإحداثيات</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={filters.coordinates}
                          onChange={(event) => updateReportFilter(type, 'coordinates', event.target.value)}
                        >
                          <option value="all">الكل</option>
                          <option value="with">يوجد إحداثيات</option>
                          <option value="without">لا يوجد إحداثيات</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>المرفقات</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={filters.attachments}
                          onChange={(event) => updateReportFilter(type, 'attachments', event.target.value)}
                        >
                          <option value="all">الكل</option>
                          <option value="with">يوجد مرفقات</option>
                          <option value="without">لا يوجد مرفقات</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 text-sm text-muted-foreground">
                      سيتم تطبيق الفرز على الجدول الحالي، Excel، PDF، والمعاينة والطباعة.
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[24px] border border-white/45 bg-white/55 shadow-[0_10px_35px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Edit3 className="h-4 w-4" />
                        إعدادات العناوين والتوقيع والختم
                      </CardTitle>

                      <Button variant="outline" size="sm" onClick={() => resetPrintSettings(type, title)}>
                        استعادة إعدادات التقرير
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>اسم الجامعة</Label>
                        <input
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={printSettings.universityName}
                          onChange={(event) => updatePrintSetting(type, 'universityName', event.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>اسم المنصة</Label>
                        <input
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={printSettings.platformName}
                          onChange={(event) => updatePrintSetting(type, 'platformName', event.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>عنوان التقرير</Label>
                        <input
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={printSettings.reportTitle}
                          onChange={(event) => updatePrintSetting(type, 'reportTitle', event.target.value)}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-3">
                        <Label>عبارة قبل الجدول</Label>
                        <textarea
                          className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="اكتب عبارة اختيارية تظهر قبل الجدول..."
                          value={printSettings.introText}
                          onChange={(event) => updatePrintSetting(type, 'introText', event.target.value)}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-3">
                        <Label>عبارة أسفل التقرير</Label>
                        <textarea
                          className="w-full min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                          value={printSettings.footerText}
                          onChange={(event) => updatePrintSetting(type, 'footerText', event.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>نوع الخط</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={printSettings.fontFamily}
                          onChange={(event) => updatePrintSetting(type, 'fontFamily', event.target.value)}
                        >
                          <option value="Tahoma, Arial, sans-serif">Tahoma</option>
                          <option value="Arial, Tahoma, sans-serif">Arial</option>
                          <option value="'Segoe UI', Tahoma, Arial, sans-serif">Segoe UI</option>
                          <option value={FANAN_FONT_FAMILY}>Fanan — فنان</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>حجم الخط</Label>
                        <select
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={printSettings.fontSize}
                          onChange={(event) => updatePrintSetting(type, 'fontSize', Number(event.target.value))}
                        >
                          <option value={11}>صغير</option>
                          <option value={12}>متوسط صغير</option>
                          <option value={13}>متوسط</option>
                          <option value={14}>كبير</option>
                          <option value={15}>كبير جدًا</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>لون رأس الجدول</Label>
                        <input
                          type="color"
                          className="w-full h-10 rounded-md border bg-background px-2"
                          value={printSettings.headerColor}
                          onChange={(event) => updatePrintSetting(type, 'headerColor', event.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border bg-background p-3 space-y-3">
                        <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
                          <Label className="flex items-center gap-2">
                            <PenLine className="h-4 w-4" />
                            إظهار التوقيع
                          </Label>
                          <Checkbox
                            checked={printSettings.showSignature}
                            onCheckedChange={(checked) => updatePrintSetting(type, 'showSignature', Boolean(checked))}
                          />
                        </div>

                        <input
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={printSettings.signatureLabel}
                          onChange={(event) => updatePrintSetting(type, 'signatureLabel', event.target.value)}
                          disabled={!printSettings.showSignature}
                        />
                      </div>

                      <div className="rounded-lg border bg-background p-3 space-y-3">
                        <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
                          <Label className="flex items-center gap-2">
                            <Stamp className="h-4 w-4" />
                            إظهار الختم
                          </Label>
                          <Checkbox
                            checked={printSettings.showStamp}
                            onCheckedChange={(checked) => updatePrintSetting(type, 'showStamp', Boolean(checked))}
                          />
                        </div>

                        <input
                          className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                          value={printSettings.stampLabel}
                          onChange={(event) => updatePrintSetting(type, 'stampLabel', event.target.value)}
                          disabled={!printSettings.showStamp}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[24px] border border-white/45 bg-white/55 shadow-[0_10px_35px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <CardHeader>
                    <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        اختيار الأعمدة
                      </CardTitle>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllColumns(type)}
                      >
                        {columns.every((col) => col.enabled) ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {columns.map((col) => (
                        <div key={col.key} className="flex items-center space-x-2 space-x-reverse">
                          <Checkbox
                            id={`${type}-${col.key}`}
                            checked={col.enabled}
                            onCheckedChange={() => toggleColumn(type, col.key)}
                          />

                          <Label
                            htmlFor={`${type}-${col.key}`}
                            className="text-sm cursor-pointer"
                          >
                            {col.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[24px] border border-white/45 bg-white/55 shadow-[0_10px_35px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      ترتيب الصفوف قبل الطباعة والتصدير
                    </CardTitle>
                    <CardDescription>
                      يطبق الترتيب على الجدول الظاهر وملفات Excel وPDF والمعاينة والطباعة.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="space-y-2 md:col-span-2">
                        <Label>الترتيب حسب</Label>
                        <select
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={sortSettings.key}
                          onChange={(event) =>
                            updateSortSetting(type, 'key', event.target.value)
                          }
                        >
                          <option value="">بدون ترتيب إضافي</option>
                          {columns.map((column) => (
                            <option key={column.key} value={column.key}>
                              {column.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label>اتجاه الترتيب</Label>
                        <select
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={sortSettings.direction}
                          disabled={!sortSettings.key}
                          onChange={(event) =>
                            updateSortSetting(type, 'direction', event.target.value)
                          }
                        >
                          <option value="asc">تصاعدي: أ–ي / الأصغر أولًا</option>
                          <option value="desc">تنازلي: ي–أ / الأكبر أولًا</option>
                        </select>
                      </div>
                    </div>

                    {sortSettings.key && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                        <span>
                          الترتيب الحالي:{' '}
                          <strong className="text-foreground">
                            {columns.find((column) => column.key === sortSettings.key)?.label || sortSettings.key}
                          </strong>
                          {' — '}
                          {sortSettings.direction === 'asc' ? 'تصاعدي' : 'تنازلي'}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSortSettingsBySection((prev) => ({
                              ...prev,
                              [type]: { key: '', direction: 'asc' },
                            }));
                          }}
                        >
                          إلغاء الترتيب
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                  <Button
                    onClick={() => exportToExcel(sortedData, columns, printSettings.reportTitle || title)}
                    variant="outline"
                    className="w-full h-10 md:h-11 text-sm md:text-base"
                  >
                    <FileSpreadsheet className="h-4 w-4 ml-2 text-green-600" />
                    Excel
                  </Button>

                  <Button
                    onClick={() => exportToPDF(sortedData, columns, printSettings.reportTitle || title, type, printSettings, filters)}
                    variant="outline"
                    className="w-full h-10 md:h-11 text-sm md:text-base"
                  >
                    <FileText className="h-4 w-4 ml-2 text-red-600" />
                    PDF
                  </Button>

                  <Button
                    onClick={() => {
                      handlePrint(
                        sortedData,
                        columns,
                        printSettings.reportTitle || title,
                        {
                          total: sortedData.length,
                          totalArea: sortedData.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0).toLocaleString(),
                        },
                        printSettings,
                        filters
                      );
                    }}
                    variant="default"
                    className="w-full h-10 md:h-11 text-sm md:text-base bg-amber-700 hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 ml-2" />
                    معاينة وطباعة
                  </Button>
                </div>

                <div ref={printRefs[refKey]}>
                  <div
                    className="mx-auto overflow-x-auto rounded-[20px] border border-slate-200/70 bg-white/82 shadow-[0_8px_24px_rgba(15,23,42,0.035),inset_0_1px_0_rgba(255,255,255,0.95)]"
                    style={{ width: previewTableWidth }}
                  >
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-amber-700 hover:bg-amber-700">
                          <TableHead className="w-10 px-2 py-2 text-center text-white">#</TableHead>

                          {enabledColumns.map((col) => (
                            <TableHead key={col.key} className="px-2 py-2 text-center text-white">
                              {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {sortedData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={enabledColumns.length + 1}
                              className="text-center py-8 text-gray-500"
                            >
                              لا توجد بيانات
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedData.map((item, index) => (
                            <TableRow key={item.id || index} className="hover:bg-blue-50">
                              <TableCell className="px-2 py-2 text-center font-medium text-gray-600">
                                {index + 1}
                              </TableCell>

                              {enabledColumns.map((col) => (
                                <TableCell key={col.key} className="px-2 py-2 text-center">
                                  {col.key === 'usageType' ||
                                  col.key === 'rentAmount' ||
                                  col.key === 'isPlanned' ? (
                                    <Badge variant="outline">
                                      {formatCellValue(item, col.key)}
                                    </Badge>
                                  ) : (
                                    formatCellValue(item, col.key)
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="summary" className="space-y-4">
                <Card className="rounded-[24px] border border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.8),rgba(248,244,238,0.78),rgba(240,234,227,0.7))] shadow-[0_12px_40px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">ملخص إحصائي</CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      <div className="rounded-[22px] border border-white/45 bg-white/70 p-4 text-center shadow-[0_10px_30px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                        <div className="text-3xl font-bold text-amber-700">
                          {safeData.length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          إجمالي السجلات
                        </div>
                      </div>

                      {sectionStats.totalArea > 0 && (
                        <div className="rounded-[22px] border border-white/45 bg-white/70 p-4 text-center shadow-[0_10px_30px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                          <div className="text-3xl font-bold text-green-600">
                            {Number(sectionStats.totalArea || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            إجمالي المساحة م²
                          </div>
                        </div>
                      )}

                      {sectionStats.totalRent > 0 && (
                        <div className="rounded-[22px] border border-white/45 bg-white/70 p-4 text-center shadow-[0_10px_30px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                          <div className="text-3xl font-bold text-amber-600">
                            {Number(sectionStats.totalRent || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            إجمالي الإيجار
                          </div>
                        </div>
                      )}

                      {type === 'siteInspections' && (
                        <>
                          <div className="rounded-[22px] border border-white/45 bg-white/70 p-4 text-center shadow-[0_10px_30px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                            <div className="text-3xl font-bold text-slate-700">
                              {sectionStats.withCoordinates || 0}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              معاينات بإحداثيات
                            </div>
                          </div>

                          <div className="rounded-[22px] border border-white/45 bg-white/70 p-4 text-center shadow-[0_10px_30px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                            <div className="text-3xl font-bold text-emerald-700">
                              {sectionStats.withAttachments || 0}
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              معاينات بمرفقات
                            </div>
                          </div>
                        </>
                      )}

                      {type === 'deeds' && (
                        <>
                          <div className="rounded-[22px] border border-white/45 bg-white/70 p-4 text-center shadow-[0_10px_30px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                            <div className="text-3xl font-bold text-purple-600">
                              {sectionStats.plannedCount || 0}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              صكوك مخططة
                            </div>
                          </div>

                          <div className="rounded-[22px] border border-white/45 bg-white/70 p-4 text-center shadow-[0_10px_30px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                            <div className="text-3xl font-bold text-red-600">
                              {sectionStats.unplannedCount || 0}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              صكوك غير مخططة
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="statistical" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>تحليل إحصائي</CardTitle>
                  </CardHeader>

                  <CardContent>
                    {distribution.data.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        لا توجد بيانات كافية للتحليل الإحصائي.
                      </div>
                    ) : (
                      <div>
                        <h4 className="font-semibold mb-3">{distribution.title}</h4>

                        <div className="space-y-2">
                          {distribution.data.map((item: any) => (
                            <div
                              key={item.name}
                              className="flex items-center justify-between rounded-2xl border border-white/45 bg-white/70 p-3 shadow-sm backdrop-blur-xl"
                            >
                              <span>{item.name}</span>
                              <Badge>{item.value as number}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="graphical" className="space-y-4">
                {distribution.data.length === 0 ? (
                  <Card>
                    <CardContent className="text-center text-muted-foreground py-8">
                      لا توجد بيانات كافية لعرض الرسوم البيانية.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">{distribution.title}</CardTitle>
                      </CardHeader>

                      <CardContent>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={distribution.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8f7a66" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">تمثيل دائري</CardTitle>
                      </CardHeader>

                      <CardContent>
                        <ResponsiveContainer width="100%" height={240}>
                          <RechartsPie>
                            <Pie
                              data={distribution.data}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry) => entry.name}
                              outerRadius={90}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {distribution.data.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <>
      <style>{`
        @font-face {
          font-family: 'Fanan';
          src: url('${fananFontUrl}') format('truetype');
          font-style: normal;
          font-weight: 400;
          font-display: swap;
        }
      `}</style>

      <div className="relative mx-auto w-full min-w-0 space-y-5 p-0 sm:space-y-6 sm:p-2 md:p-4 lg:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="mx-auto h-44 w-[22rem] rounded-full bg-[radial-gradient(circle,rgba(250,240,220,0.55),transparent_70%)] blur-3xl" />
      </div>
      <section className="relative overflow-hidden rounded-[34px] border border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(247,242,234,0.78),rgba(235,230,222,0.70))] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.11),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl sm:p-7">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-amber-200/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-slate-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/65 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-amber-700" />
              مركز التقارير والتحليلات التنفيذية
            </div>

            <h1 className="bg-gradient-to-r from-stone-800 via-amber-800 to-slate-700 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl lg:text-5xl">
              {t('reports.title') || 'التقارير'}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              لوحة موحدة لتحليل الصكوك والأراضي والمباني والمعاينات الميدانية،
              مع تقارير قابلة للتخصيص والتصدير والطباعة.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[24px] border border-white/60 bg-white/60 p-3 shadow-[0_12px_35px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
            <div className="rounded-2xl bg-stone-800 p-3 text-white shadow-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">حالة البيانات</p>
              <p className="font-bold text-stone-800">محدثة وجاهزة للتقارير</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'إجمالي السجلات',
            value: executiveOverview.totalRecords.toLocaleString('ar-SA'),
            hint: 'جميع أنواع السجلات والمعاينات',
            icon: Landmark,
          },
          {
            label: 'إجمالي المساحات',
            value: executiveOverview.totalArea.toLocaleString('ar-SA'),
            suffix: 'م²',
            hint: 'المساحات المسجلة في المنصة',
            icon: Ruler,
          },
          {
            label: 'إجمالي القيم الإيجارية',
            value: executiveOverview.totalRent.toLocaleString('ar-SA'),
            suffix: 'ر.س',
            hint: 'قيمة إجمالية للسجلات الإيجارية',
            icon: Wallet,
          },
          {
            label: 'المعاينات الميدانية',
            value: executiveOverview.inspectionsTotal.toLocaleString('ar-SA'),
            hint: 'زيارات الأراضي والمواقع المسجلة',
            icon: ClipboardCheck,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card
              key={item.label}
              className="group relative overflow-hidden rounded-[28px] border border-white/50 bg-white/60 shadow-[0_18px_50px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_70px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,1)]"
            >
              <div className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-amber-200/20 blur-2xl transition-transform duration-500 group-hover:scale-125" />
              <CardContent className="relative p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-600">
                      {item.label}
                    </p>
                    <div className="mt-3 flex flex-wrap items-baseline gap-2">
                      <span className="text-3xl font-black text-stone-800">
                        {item.value}
                      </span>
                      {item.suffix && (
                        <span className="text-sm font-bold text-stone-500">
                          {item.suffix}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {item.hint}
                    </p>
                  </div>

                  <div className="rounded-[20px] border border-white/60 bg-[linear-gradient(145deg,rgba(255,255,255,0.9),rgba(238,231,221,0.72))] p-3 text-stone-700 shadow-[0_10px_25px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
        <Card className="overflow-hidden rounded-[30px] border border-white/50 bg-white/58 shadow-[0_20px_55px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
          <CardHeader className="border-b border-white/50">
            <CardTitle className="flex items-center gap-2 text-lg text-stone-800">
              <BarChart3 className="h-5 w-5 text-amber-700" />
              توزيع السجلات حسب الفئة
            </CardTitle>
            <CardDescription>
              نظرة تنفيذية على حجم البيانات المسجلة في كل قسم.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={executiveOverview.categories}>
                <CartesianGrid strokeDasharray="4 6" stroke="rgba(120,113,108,0.18)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#57534e' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#57534e' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.92)',
                    boxShadow: '0 18px 50px rgba(15,23,42,0.14)',
                    backdropFilter: 'blur(18px)',
                  }}
                />
                <Bar dataKey="value" fill="#8f7a66" radius={[10, 10, 2, 2]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[30px] border border-white/50 bg-white/58 shadow-[0_20px_55px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl">
          <CardHeader className="border-b border-white/50">
            <CardTitle className="flex items-center gap-2 text-lg text-stone-800">
              <Activity className="h-5 w-5 text-emerald-700" />
              جودة توثيق المعاينات
            </CardTitle>
            <CardDescription>
              مؤشرات اكتمال التوثيق المكاني والمرفقات.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            {[
              {
                label: 'المعاينات المرتبطة بإحداثيات',
                value: executiveOverview.coordinateCoverage,
              },
              {
                label: 'المعاينات المحتوية على مرفقات',
                value: executiveOverview.attachmentCoverage,
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-stone-700">{item.label}</span>
                  <span className="font-black text-stone-800">{item.value}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border border-white/60 bg-stone-200/55 p-0.5 shadow-inner">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#8f7a66,#6e7d70)] shadow-[0_0_16px_rgba(110,125,112,0.32)] transition-all duration-700"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="rounded-[22px] border border-white/60 bg-white/65 p-4 text-sm leading-6 text-stone-600 shadow-sm backdrop-blur-xl">
              يعكس هذا المؤشر مستوى اكتمال بيانات الزيارة، ويساعد على تحديد السجلات
              التي تحتاج استكمال الإحداثيات أو المرفقات.
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[30px] border border-white/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.85),rgba(247,241,232,0.78),rgba(239,233,226,0.70))] shadow-[0_18px_50px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Download className="h-6 w-6 text-amber-700 mt-1 flex-shrink-0" />

            <div className="space-y-2">
              <p className="font-semibold text-stone-800 text-lg">
                ميزات التقارير الاحترافية:
              </p>

              <ul className="text-sm text-stone-700 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-700 rounded-full"></span>
                  <strong>تقارير مفصلة</strong>: عرض كامل البيانات مع اختيار الأعمدة.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                  <strong>تقارير ملخصة</strong>: إحصائيات سريعة ومختصرة.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-600 rounded-full"></span>
                  <strong>تقارير إحصائية</strong>: تحليل وتوزيع البيانات.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-violet-600 rounded-full"></span>
                  <strong>رسوم بيانية</strong>: تمثيل مرئي للبيانات.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-rose-600 rounded-full"></span>
                  <strong>تصدير متعدد</strong>: PDF و Excel وطباعة مباشرة.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-slate-700 rounded-full"></span>
                  <strong>اختيار مخصص</strong>: تحديد الأعمدة المطلوبة فقط.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {renderReportSection(
          'deeds',
          'الصكوك',
          deeds,
          selectedColumns.deeds,
          'deeds'
        )}

        {renderReportSection(
          'allocated',
          t('reports.allocatedLands') || 'الأراضي المخصصة',
          allocatedLands,
          selectedColumns.allocated,
          'allocated'
        )}

        {renderReportSection(
          'delivered',
          t('reports.deliveredLands') || 'الأراضي المسلمة',
          deliveredLands,
          selectedColumns.delivered,
          'delivered'
        )}

        {renderReportSection(
          'leasedOut',
          t('reports.leasedLandsOut') || 'الأراضي المؤجرة من الجامعة',
          leasedLandsOut,
          selectedColumns.leasedOut,
          'leasedOut'
        )}

        {renderReportSection(
          'leasedIn',
          t('reports.leasedLandsIn') || 'الأراضي المستأجرة للجامعة',
          leasedLandsIn,
          selectedColumns.leasedIn,
          'leasedIn'
        )}

        {renderReportSection(
          'buildingsOut',
          t('reports.leasedBuildingsOut') || 'المباني المؤجرة من الجامعة',
          leasedBuildingsOut,
          selectedColumns.buildingsOut,
          'buildingsOut'
        )}

        {renderReportSection(
          'buildingsIn',
          t('reports.leasedBuildingsIn') || 'المباني المستأجرة للجامعة',
          leasedBuildingsIn,
          selectedColumns.buildingsIn,
          'buildingsIn'
        )}

        <Card className="relative overflow-hidden rounded-[30px] border border-white/45 bg-white/60 shadow-[0_20px_60px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl">
          <CardHeader className="border-b border-white/50 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(244,239,231,0.74),rgba(236,231,223,0.58))]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/60 bg-white/75 shadow-inner">
                  <ClipboardCheck className="h-6 w-6 text-slate-700" />
                </div>
                <div>
                  <CardTitle className="text-xl">تقارير معاينات الأراضي والمواقع</CardTitle>
                  <CardDescription className="mt-2 max-w-3xl leading-7">
                    كل معاينة لها تقرير سردي مستقل لا يعتمد على الجدول، ويجمع وصف الزيارة والملاحظات والتوصيات وعناصر المعاينة والصور في قالب رسمي قابل للحفظ بصيغة PDF مع الصور.
                  </CardDescription>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="w-fit rounded-full bg-white/70 px-3 py-1.5">
                  {siteInspections.length} تقرير
                </Badge>

                {canPrintInspections && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl border-white/60 bg-white/75 shadow-sm hover:bg-white"
                    onClick={printAllInspectionReports}
                    disabled={
                      printingAllInspections ||
                      Boolean(printingInspectionId) ||
                      siteInspections.length === 0
                    }
                  >
                    {printingAllInspections ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="ml-2 h-4 w-4" />
                    )}
                    {printingAllInspections
                      ? 'جاري تجهيز التقارير...'
                      : 'حفظ جميع التقارير PDF'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 p-4 sm:p-5">
            <div className="rounded-[24px] border border-white/55 bg-white/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl sm:p-5">
              <div className="mb-4">
                <h3 className="font-bold">إعدادات التقرير المرنة</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  جميع الحقول النصية اختيارية، وعند تركها فارغة يستخدم النظام العنوان والعبارات الافتراضية.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>عنوان التقرير اليدوي — اختياري</Label>
                  <input
                    className="h-11 w-full rounded-xl border bg-white/75 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-700/20"
                    value={inspectionReportTitle}
                    onChange={(event) => setInspectionReportTitle(event.target.value)}
                    placeholder="مثال: تقرير المعاينة الميدانية لأرض الجبيل"
                  />
                </div>

                <div className="space-y-2">
                  <Label>العنوان الفرعي — اختياري</Label>
                  <input
                    className="h-11 w-full rounded-xl border bg-white/75 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-700/20"
                    value={inspectionReportSubtitle}
                    onChange={(event) => setInspectionReportSubtitle(event.target.value)}
                    placeholder="مثال: زيارة التحقق من حدود الموقع وجاهزيته"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>تمهيد التقرير — اختياري</Label>
                  <textarea
                    className="min-h-24 w-full rounded-xl border bg-white/75 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-700/20"
                    value={inspectionReportIntroduction}
                    onChange={(event) => setInspectionReportIntroduction(event.target.value)}
                    placeholder="اكتب مقدمة أو مرجع الخطاب أو الغرض العام من إعداد التقرير..."
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>عبارة التذييل — اختياري</Label>
                  <input
                    className="h-11 w-full rounded-xl border bg-white/75 px-3 text-sm outline-none focus:ring-2 focus:ring-amber-700/20"
                    value={inspectionReportFooter}
                    onChange={(event) => setInspectionReportFooter(event.target.value)}
                    placeholder="مثال: إدارة أوقاف وأملاك الجامعة"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['عناصر المعاينة', inspectionReportIncludeItems, setInspectionReportIncludeItems],
                  ['الصور', inspectionReportIncludePhotos, setInspectionReportIncludePhotos],
                  ['المستندات', inspectionReportIncludeDocuments, setInspectionReportIncludeDocuments],
                  ['بيانات الموقع والإحداثيات', inspectionReportIncludeLocation, setInspectionReportIncludeLocation],
                ].map(([label, checked, setter]) => (
                  <label
                    key={String(label)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/55 bg-white/65 p-3"
                  >
                    <span className="text-sm font-medium">{String(label)}</span>
                    <Checkbox
                      checked={Boolean(checked)}
                      onCheckedChange={(value) => (setter as React.Dispatch<React.SetStateAction<boolean>>)(Boolean(value))}
                    />
                  </label>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-900/10 bg-amber-50/55 p-3 text-sm text-stone-700">
                <span>تم حذف خانات التوقيع والاعتماد من أسفل التقرير نهائيًا.</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl bg-white/70"
                  onClick={() => {
                    setInspectionReportTitle('');
                    setInspectionReportSubtitle('');
                    setInspectionReportIntroduction('');
                    setInspectionReportFooter('');
                    setInspectionReportIncludeItems(true);
                    setInspectionReportIncludePhotos(true);
                    setInspectionReportIncludeDocuments(true);
                    setInspectionReportIncludeLocation(true);
                  }}
                >
                  استعادة الإعدادات الافتراضية
                </Button>
              </div>
            </div>

            {siteInspections.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/60 bg-white/45 p-10 text-center text-muted-foreground">
                لا توجد معاينات مسجلة لإنشاء تقارير مستقلة.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {siteInspections.map((inspection) => (
                  <Card
                    key={inspection.id}
                    className="overflow-hidden rounded-[24px] border border-white/50 bg-white/72 shadow-[0_12px_34px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_rgba(15,23,42,0.11)]"
                  >
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{inspection.title}</p>
                          <p className="mt-1 font-mono text-xs text-muted-foreground">
                            {inspection.inspectionNumber}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 rounded-full bg-white/60">
                          {inspectionWorkflowLabels[inspection.workflowStatus] || inspection.workflowStatus}
                        </Badge>
                      </div>

                      <div className="rounded-2xl border border-white/55 bg-white/55 p-3">
                        <p className="font-medium">{inspection.siteName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[inspection.city, inspection.district].filter(Boolean).join(' - ') || 'الموقع غير محدد'}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-xl border border-white/55 bg-white/55 p-2">
                          <CalendarDays className="mx-auto mb-1 h-4 w-4 text-slate-600" />
                          {new Date(inspection.visitDate).toLocaleDateString('ar-SA')}
                        </div>
                        <div className="rounded-xl border border-white/55 bg-white/55 p-2">
                          <Images className="mx-auto mb-1 h-4 w-4 text-slate-600" />
                          {inspection.attachments?.length || 0} مرفق
                        </div>
                        <div className="rounded-xl border border-white/55 bg-white/55 p-2">
                          <MapPin className="mx-auto mb-1 h-4 w-4 text-slate-600" />
                          {inspection.latitude != null && inspection.longitude != null ? 'محدد' : 'غير محدد'}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl border-white/60 bg-white/70"
                          onClick={() => navigate(`/site-inspections/${inspection.id}`)}
                        >
                          <Eye className="ml-2 h-4 w-4" />
                          عرض التقرير
                        </Button>

                        {canPrintInspections && (
                          <Button
                            type="button"
                            className="w-full rounded-xl"
                            onClick={() => printSingleInspection(inspection)}
                            disabled={
                              printingAllInspections ||
                              Boolean(printingInspectionId)
                            }
                          >
                            {printingInspectionId === inspection.id ? (
                              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            ) : (
                              <FileText className="ml-2 h-4 w-4" />
                            )}
                            {printingInspectionId === inspection.id
                              ? 'جاري التجهيز...'
                              : 'حفظ التقرير PDF'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};
