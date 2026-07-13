import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

  const formatDate = (value: any) => {
    if (!value) return '-';

    try {
      return new Date(value).toLocaleDateString('ar-SA');
    } catch {
      return '-';
    }
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
      return formatDate(item[key]);
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

  const exportToPDF = (data: any[], columns: any[], title: string, filename: string) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const enabledColumns = columns.filter((col) => col.enabled);

      doc.setFontSize(18);
      doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

      doc.setFontSize(12);
      doc.text('Imam Abdulrahman Bin Faisal University', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

      doc.setFontSize(10);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

      const headers = ['#', ...enabledColumns.map((col) => col.label)];

      const tableData = data.map((item, index) => [
        index + 1,
        ...enabledColumns.map((col) => formatCellValue(item, col.key)),
      ]);

      autoTable(doc, {
        head: [headers],
        body: tableData,
        startY: 35,
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 2,
          halign: 'center',
        },
        headStyles: {
          fillColor: [56, 75, 112],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });

      const pageCount = (doc as any).internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(t('reports.exportSuccess') || 'تم التصدير بنجاح');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error(t('reports.exportError') || 'فشل في التصدير');
    }
  };

  const handlePrint = (
    ref: React.RefObject<HTMLDivElement>,
    title: string,
    stats?: { total: number; totalArea?: string }
  ) => {
    if (!ref.current) return;

    const printWindow = window.open('', '_blank');

    if (!printWindow) return;

    const currentDate = new Date();

    const dateString = currentDate.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const timeString = currentDate.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              direction: rtl;
              padding: 0;
              background: white;
              color: #1a1a1a;
              line-height: 1.6;
            }

            .report-header {
              background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
              color: white;
              padding: 30px;
              margin-bottom: 30px;
              border-bottom: 6px solid #fbbf24;
            }

            .university-name {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 8px;
              text-align: center;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }

            .university-subtitle {
              font-size: 16px;
              text-align: center;
              opacity: 0.95;
              margin-bottom: 20px;
            }

            .report-title {
              font-size: 22px;
              font-weight: bold;
              text-align: center;
              background: rgba(255, 255, 255, 0.15);
              padding: 12px;
              border-radius: 8px;
              margin-top: 15px;
            }

            .report-meta {
              display: flex;
              justify-content: space-between;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid rgba(255, 255, 255, 0.3);
              font-size: 14px;
            }

            .statistics-box {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 10px;
              padding: 20px;
              margin: 0 20px 25px 20px;
              display: flex;
              justify-content: space-around;
              gap: 20px;
            }

            .stat-item {
              text-align: center;
              flex: 1;
            }

            .stat-label {
              font-size: 13px;
              color: #64748b;
              margin-bottom: 5px;
            }

            .stat-value {
              font-size: 24px;
              font-weight: bold;
              color: #1e40af;
            }

            .print-content {
              padding: 0 20px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              background: white;
              margin-top: 20px;
            }

            thead {
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              color: white;
            }

            th {
              padding: 14px 10px;
              text-align: center;
              font-weight: 600;
              font-size: 13px;
              border: 1px solid #2563eb;
            }

            tbody tr:nth-child(even) {
              background-color: #f9fafb;
            }

            td {
              padding: 12px 10px;
              text-align: center;
              font-size: 13px;
              border: 1px solid #e5e7eb;
              color: #1f2937;
            }

            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;
              background: #dbeafe;
              color: #1e40af;
              border: 1px solid #93c5fd;
            }

            .report-footer {
              margin: 40px 20px 0 20px;
              padding-top: 20px;
              border-top: 3px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #6b7280;
            }

            .signature-line {
              margin-top: 60px;
              text-align: center;
            }

            .signature-box {
              display: inline-block;
              border-top: 2px solid #374151;
              padding-top: 10px;
              min-width: 200px;
              margin: 0 40px;
            }

            @media print {
              @page {
                size: A4 landscape;
                margin: 15mm 10mm;
              }

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              button {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="university-name">جامعة الإمام عبدالرحمن بن فيصل</div>
            <div class="university-subtitle">منصة إدارة الصكوك والأراضي</div>
            <div class="report-title">${title}</div>
            <div class="report-meta">
              <div>التاريخ: ${dateString}</div>
              <div>الوقت: ${timeString}</div>
            </div>
          </div>

          ${
            stats
              ? `
            <div class="statistics-box">
              <div class="stat-item">
                <div class="stat-label">إجمالي السجلات</div>
                <div class="stat-value">${stats.total}</div>
              </div>
              ${
                stats.totalArea
                  ? `
              <div class="stat-item">
                <div class="stat-label">إجمالي المساحة</div>
                <div class="stat-value">${stats.totalArea} م²</div>
              </div>
              `
                  : ''
              }
            </div>
            `
              : ''
          }

          <div class="print-content">
            ${ref.current.innerHTML}
          </div>

          <div class="report-footer">
            <div>
              <div><strong>جامعة الإمام عبدالرحمن بن فيصل</strong></div>
              <div>المملكة العربية السعودية</div>
            </div>
            <div style="text-align: left;">
              <div>تمت الطباعة بتاريخ: ${dateString}</div>
              <div>منصة إدارة الصكوك والأراضي</div>
            </div>
          </div>

          <div class="signature-line">
            <div class="signature-box">التوقيع</div>
            <div class="signature-box">الختم</div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
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
    const safeData = Array.isArray(data) ? data : [];
    const enabledColumns = columns.filter((col) => col.enabled);
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
                إجمالي: <strong>{safeData.length}</strong> سجل
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
                    onClick={() => exportToExcel(safeData, columns, title)}
                    variant="outline"
                    className="w-full h-10 md:h-11 text-sm md:text-base"
                  >
                    <FileSpreadsheet className="h-4 w-4 ml-2 text-green-600" />
                    Excel
                  </Button>

                  <Button
                    onClick={() => exportToPDF(safeData, columns, title, type)}
                    variant="outline"
                    className="w-full h-10 md:h-11 text-sm md:text-base"
                  >
                    <FileText className="h-4 w-4 ml-2 text-red-600" />
                    PDF
                  </Button>

                  <Button
                    onClick={() => {
                      handlePrint(printRefs[refKey], title, {
                        total: safeData.length,
                        totalArea: Number(sectionStats.totalArea || 0).toLocaleString(),
                      });
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