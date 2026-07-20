import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type ReportSectionType =
  | 'deeds'
  | 'allocated'
  | 'delivered'
  | 'leasedOut'
  | 'leasedIn'
  | 'buildingsOut'
  | 'buildingsIn';

type ReportFilters = {
  region: string;
  city: string;
  district: string;
  usageType: string;
  isPlanned: 'all' | 'planned' | 'unplanned';
  coordinates: 'all' | 'with' | 'without';
  attachments: 'all' | 'with' | 'without';
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
  showSignature: true,
  showStamp: true,
  signatureLabel: 'التوقيع',
  stampLabel: 'الختم',
  fontFamily: 'Tahoma, Arial, sans-serif',
  fontSize: 13,
  headerColor: '#1f4e79',
};

export const ReportsPage: React.FC = () => {
  const { t } = useTranslation();

  const deedsColumns = [
    { key: 'deedNumber', label: 'رقم الصك', enabled: true },
    { key: 'deedDate', label: 'تاريخ الصك', enabled: true },
    { key: 'propertyDescription', label: 'وصف العقار', enabled: true },
    { key: 'plotNumber', label: 'رقم القطعة', enabled: true },
    { key: 'planNumber', label: 'رقم المخطط', enabled: true },
    { key: 'area', label: 'المساحة', enabled: true },
    { key: 'region', label: 'المنطقة', enabled: false },
    { key: 'city', label: 'المدينة', enabled: true },
    { key: 'district', label: 'الحي', enabled: true },
    { key: 'usageType', label: 'نوع الاستخدام', enabled: true },
    { key: 'isPlanned', label: 'مخططة', enabled: true },
    { key: 'coordinates', label: 'الإحداثيات', enabled: false },
    { key: 'attachmentsCount', label: 'عدد المرفقات', enabled: true },
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

  const {
    deeds,
    allocatedLands,
    deliveredLands,
    leasedLandsOut,
    leasedLandsIn,
    leasedBuildingsOut,
    leasedBuildingsIn,
  } = useData();

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
  });

  const [printSettingsBySection, setPrintSettingsBySection] = useState<Record<ReportSectionType, PrintSettings>>({
    deeds: { ...defaultPrintSettings, reportTitle: 'تقرير الصكوك' },
    allocated: { ...defaultPrintSettings, reportTitle: 'تقرير الأراضي المخصصة' },
    delivered: { ...defaultPrintSettings, reportTitle: 'تقرير الأراضي المسلمة' },
    leasedOut: { ...defaultPrintSettings, reportTitle: 'تقرير الأراضي المؤجرة من الجامعة' },
    leasedIn: { ...defaultPrintSettings, reportTitle: 'تقرير الأراضي المستأجرة للجامعة' },
    buildingsOut: { ...defaultPrintSettings, reportTitle: 'تقرير المباني المؤجرة من الجامعة' },
    buildingsIn: { ...defaultPrintSettings, reportTitle: 'تقرير المباني المستأجرة للجامعة' },
  });

  const [selectedColumns, setSelectedColumns] = useState<any>({
    deeds: deedsColumns,
    allocated: allocatedLandsColumns,
    delivered: deliveredLandsColumns,
    leasedOut: leasedLandsOutColumns,
    leasedIn: leasedLandsInColumns,
    buildingsOut: leasedBuildingsOutColumns,
    buildingsIn: leasedBuildingsInColumns,
  });

  const printRefs = {
    deeds: useRef<HTMLDivElement>(null),
    allocated: useRef<HTMLDivElement>(null),
    delivered: useRef<HTMLDivElement>(null),
    leasedOut: useRef<HTMLDivElement>(null),
    leasedIn: useRef<HTMLDivElement>(null),
    buildingsOut: useRef<HTMLDivElement>(null),
    buildingsIn: useRef<HTMLDivElement>(null),
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

  const statistics = useMemo(() => {
    const safeDeeds = Array.isArray(deeds) ? deeds : [];
    const safeAllocated = Array.isArray(allocatedLands) ? allocatedLands : [];
    const safeDelivered = Array.isArray(deliveredLands) ? deliveredLands : [];
    const safeLeasedOut = Array.isArray(leasedLandsOut) ? leasedLandsOut : [];
    const safeLeasedIn = Array.isArray(leasedLandsIn) ? leasedLandsIn : [];
    const safeBuildingsOut = Array.isArray(leasedBuildingsOut) ? leasedBuildingsOut : [];
    const safeBuildingsIn = Array.isArray(leasedBuildingsIn) ? leasedBuildingsIn : [];

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
    };
  }, [
    deeds,
    allocatedLands,
    deliveredLands,
    leasedLandsOut,
    leasedLandsIn,
    leasedBuildingsOut,
    leasedBuildingsIn,
  ]);

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
      key === 'contractStartDate'
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
      return formatCoordinates(item.coordinates);
    }

    if (key === 'isPlanned') {
      return item.isPlanned ? 'نعم' : 'لا';
    }

    if (key === 'attachmentsCount') {
      return Array.isArray(item.attachments) ? item.attachments.length : 0;
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

    const rowsHtml =
      data.length === 0
        ? `<tr><td colspan="${enabledColumns.length + 1}" class="empty-cell">لا توجد بيانات</td></tr>`
        : data
            .map((item, index) => {
              const cells = enabledColumns
                .map((col) => `<td>${escapeHtml(formatCellValue(item, col.key))}</td>`)
                .join('');

              return `<tr><td>${index + 1}</td>${cells}</tr>`;
            })
            .join('');

    const headersHtml = ['#', ...enabledColumns.map((col) => col.label)]
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join('');

    return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(effectiveSettings.reportTitle)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 18px;
      direction: rtl;
      unicode-bidi: plaintext;
      background: #ffffff;
      color: #111827;
      font-family: ${effectiveSettings.fontFamily};
      font-size: ${Number(effectiveSettings.fontSize || 13)}px;
      line-height: 1.7;
    }

    .report {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }

    .header {
      border: 1px solid #d8dee9;
      border-top: 5px solid ${effectiveSettings.headerColor};
      border-radius: 10px;
      padding: 16px 18px;
      margin-bottom: 16px;
      text-align: center;
      background: #f8fafc;
    }

    .university {
      font-size: 21px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 13px;
      color: #475569;
      margin-bottom: 10px;
    }

    .title {
      display: inline-block;
      min-width: 260px;
      padding: 8px 18px;
      border-radius: 8px;
      border: 1px solid #d8dee9;
      background: #ffffff;
      font-size: 18px;
      font-weight: 700;
      color: #1f4e79;
    }

    .meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
      color: #475569;
      font-size: 12px;
    }

    .stats {
      display: flex;
      gap: 12px;
      margin: 14px 0;
    }

    .stat {
      flex: 1;
      border: 1px solid #d8dee9;
      border-radius: 8px;
      padding: 10px;
      background: #ffffff;
      text-align: center;
    }

    .stat-label {
      color: #64748b;
      font-size: 12px;
      margin-bottom: 3px;
    }

    .stat-value {
      color: ${effectiveSettings.headerColor};
      font-size: 18px;
      font-weight: 700;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      background: #ffffff;
      border: 1px solid #d8dee9;
    }

    th {
      background: ${effectiveSettings.headerColor};
      color: #ffffff;
      font-weight: 700;
      border: 1px solid #cbd5e1;
      padding: 8px 6px;
      text-align: center;
      white-space: normal;
    }

    td {
      border: 1px solid #e2e8f0;
      padding: 7px 6px;
      text-align: center;
      vertical-align: middle;
      white-space: normal;
      word-break: break-word;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .empty-cell {
      padding: 20px;
      color: #64748b;
    }


    .intro {
      margin: 12px 0;
      padding: 10px 12px;
      border: 1px solid #d8dee9;
      border-radius: 8px;
      background: #ffffff;
      color: #334155;
    }

    .filters {
      margin: 12px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .filter-chip {
      display: inline-block;
      padding: 4px 8px;
      border: 1px solid #cbd5e1;
      border-radius: 999px;
      background: #f8fafc;
      color: #334155;
      font-size: 11px;
    }

    .footer {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      color: #475569;
      font-size: 11px;
    }

    .signature {
      display: flex;
      justify-content: center;
      gap: 90px;
      margin-top: 42px;
      color: #111827;
    }

    .signature-item {
      min-width: 160px;
      text-align: center;
      border-top: 1px solid #111827;
      padding-top: 8px;
    }

    .no-print {
      margin-bottom: 14px;
      padding: 10px 12px;
      border: 1px solid #fde68a;
      background: #fffbeb;
      color: #92400e;
      border-radius: 8px;
      font-size: 13px;
      text-align: center;
    }

    @media print {
      body {
        padding: 0;
      }

      .no-print {
        display: none !important;
      }

      .header {
        break-inside: avoid;
      }

      table {
        page-break-inside: auto;
      }

      tr {
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

    <table>
      <thead>
        <tr>${headersHtml}</tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="footer">
      <div>
        <strong>جامعة الإمام عبدالرحمن بن فيصل</strong><br />
        المملكة العربية السعودية
      </div>
      <div>
        تمت الطباعة بتاريخ: ${escapeHtml(dateString)}<br />
        ${safeFooter}
      </div>
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
    const enabledColumns = columns.filter((col) => col.enabled);
    const regionOptions = getUniqueOptions(originalData, 'region');
    const cityOptions = getUniqueOptions(originalData, 'city');
    const districtOptions = getUniqueOptions(originalData, 'district');
    const usageOptions = getUniqueOptions(originalData, 'usageType');
    const sectionStats = getSectionStatistics(type);
    const distribution = getDistributionData(type);

    return (
      <Card key={type} className="shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
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
              className="hover:bg-blue-100"
            >
              {expandedSection === type ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        </CardHeader>

        {expandedSection === type && (
          <CardContent className="space-y-6 pt-6">
            <Tabs value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
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
                <Card className="bg-gray-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
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

                <Card className="bg-gray-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
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
                        <div className="flex items-center justify-between">
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
                        <div className="flex items-center justify-between">
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

                <Card className="bg-gray-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
                  <Button
                    onClick={() => exportToExcel(safeData, columns, printSettings.reportTitle || title)}
                    variant="outline"
                    className="w-full h-10 md:h-11 text-sm md:text-base"
                  >
                    <FileSpreadsheet className="h-4 w-4 ml-2 text-green-600" />
                    Excel
                  </Button>

                  <Button
                    onClick={() => exportToPDF(safeData, columns, printSettings.reportTitle || title, type, printSettings, filters)}
                    variant="outline"
                    className="w-full h-10 md:h-11 text-sm md:text-base"
                  >
                    <FileText className="h-4 w-4 ml-2 text-red-600" />
                    PDF
                  </Button>

                  <Button
                    onClick={() => {
                      handlePrint(
                        safeData,
                        columns,
                        printSettings.reportTitle || title,
                        {
                          total: safeData.length,
                          totalArea: safeData.reduce((sum: number, item: any) => sum + Number(item.area || 0), 0).toLocaleString(),
                        },
                        printSettings,
                        filters
                      );
                    }}
                    variant="default"
                    className="w-full h-10 md:h-11 text-sm md:text-base bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4 ml-2" />
                    معاينة وطباعة
                  </Button>
                </div>

                <div ref={printRefs[refKey]}>
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-blue-600 hover:bg-blue-600">
                          <TableHead className="text-center text-white">#</TableHead>

                          {enabledColumns.map((col) => (
                            <TableHead key={col.key} className="text-center text-white">
                              {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {safeData.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={enabledColumns.length + 1}
                              className="text-center py-8 text-gray-500"
                            >
                              لا توجد بيانات
                            </TableCell>
                          </TableRow>
                        ) : (
                          safeData.map((item, index) => (
                            <TableRow key={item.id || index} className="hover:bg-blue-50">
                              <TableCell className="text-center font-medium text-gray-600">
                                {index + 1}
                              </TableCell>

                              {enabledColumns.map((col) => (
                                <TableCell key={col.key} className="text-center">
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
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-lg md:text-xl">ملخص إحصائي</CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                      <div className="text-center p-4 bg-white rounded-lg shadow">
                        <div className="text-3xl font-bold text-blue-600">
                          {safeData.length}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          إجمالي السجلات
                        </div>
                      </div>

                      {sectionStats.totalArea > 0 && (
                        <div className="text-center p-4 bg-white rounded-lg shadow">
                          <div className="text-3xl font-bold text-green-600">
                            {Number(sectionStats.totalArea || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            إجمالي المساحة م²
                          </div>
                        </div>
                      )}

                      {sectionStats.totalRent > 0 && (
                        <div className="text-center p-4 bg-white rounded-lg shadow">
                          <div className="text-3xl font-bold text-amber-600">
                            {Number(sectionStats.totalRent || 0).toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            إجمالي الإيجار
                          </div>
                        </div>
                      )}

                      {type === 'deeds' && (
                        <>
                          <div className="text-center p-4 bg-white rounded-lg shadow">
                            <div className="text-3xl font-bold text-purple-600">
                              {sectionStats.plannedCount || 0}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              صكوك مخططة
                            </div>
                          </div>

                          <div className="text-center p-4 bg-white rounded-lg shadow">
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
                              className="flex justify-between items-center p-2 bg-gray-50 rounded"
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
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={distribution.data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">تمثيل دائري</CardTitle>
                      </CardHeader>

                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {t('reports.title') || 'التقارير'}
        </h1>

        <p className="text-muted-foreground text-lg">
          تقارير شاملة واحترافية لجميع أنواع الأراضي والمباني والصكوك مع خيارات متقدمة.
        </p>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Download className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />

            <div className="space-y-2">
              <p className="font-semibold text-blue-900 text-lg">
                ميزات التقارير الاحترافية:
              </p>

              <ul className="text-sm text-blue-800 space-y-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  <strong>تقارير مفصلة</strong>: عرض كامل البيانات مع اختيار الأعمدة.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  <strong>تقارير ملخصة</strong>: إحصائيات سريعة ومختصرة.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-600 rounded-full"></span>
                  <strong>تقارير إحصائية</strong>: تحليل وتوزيع البيانات.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                  <strong>رسوم بيانية</strong>: تمثيل مرئي للبيانات.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                  <strong>تصدير متعدد</strong>: PDF و Excel وطباعة مباشرة.
                </li>

                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
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
      </div>
    </div>
  );
};
