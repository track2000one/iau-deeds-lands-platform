import { withReportPreparer, reportPreparerName } from '../utils/reportAttribution';
import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowDown, ArrowDownUp, ArrowUp, BarChart3, ChevronLeft, ChevronRight, Download, MapPin, Printer, Search, SlidersHorizontal } from 'lucide-react';
import { getPendingBuildingImport } from './BuildingExcelImportManager';
import type { MosqueBuilding } from '../api/mosques';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { ReportViewToggle } from './ReportViewToggle';

type UsageEntry = {
  mosqueSites: number;
  mosqueProfile: boolean;
  assets: number;
  accounting: number;
};

type Props = {
  buildings: MosqueBuilding[];
  usage: Map<string, UsageEntry>;
  usageLoading?: boolean;
};

type ColumnKey =
  | 'approval'
  | 'buildingNumber'
  | 'name'
  | 'campusLocation'
  | 'city'
  | 'district'
  | 'coordinates'
  | 'mosque'
  | 'assets'
  | 'accounting';

const columns: Array<{ key: ColumnKey; label: string; width: number }> = [
  { key: 'buildingNumber', label: 'رقم المبنى', width: 18 },
  { key: 'name', label: 'اسم المبنى', width: 34 },
  { key: 'approval', label: 'حالة الاعتماد', width: 18 },
  { key: 'campusLocation', label: 'الحرم / الموقع الجامعي', width: 28 },
  { key: 'city', label: 'المدينة', width: 18 },
  { key: 'district', label: 'الحي', width: 20 },
  { key: 'coordinates', label: 'الإحداثيات', width: 26 },
  { key: 'mosque', label: 'العناية بالمساجد', width: 18 },
  { key: 'assets', label: 'الأصول المرتبطة', width: 16 },
  { key: 'accounting', label: 'السجلات المحاسبية', width: 18 },
];

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();
const isValidCoordinate = (value: unknown) =>
  value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value));
const hasCoordinates = (latitude: unknown, longitude: unknown) =>
  isValidCoordinate(latitude) && isValidCoordinate(longitude) &&
  Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180 &&
  !(Number(latitude) === 0 && Number(longitude) === 0);

const readSelectedColumns = (): Set<ColumnKey> => {
  try {
    const saved = JSON.parse(window.localStorage.getItem('iau-central-buildings-report-columns-v2') || 'null');
    if (Array.isArray(saved)) {
      const valid = saved.filter((key): key is ColumnKey =>
        columns.some((column) => column.key === key));
      if (valid.length) return new Set(valid);
    }
  } catch {
    // Private browsing and disabled storage: retain safe defaults.
  }
  return new Set(columns.map((column) => column.key));
};

const effectiveBuilding = (building: MosqueBuilding) => {
  const pending = getPendingBuildingImport(building);
  return {
    pending: Boolean(pending),
    buildingNumber: pending?.draft.buildingNumber || building.buildingNumber || '',
    name: pending?.draft.name || building.name || '',
    campusLocation: pending?.draft.campusLocation || building.campusLocation || '',
    city: pending?.draft.city || building.city || '',
    district: pending?.draft.district || building.district || '',
    latitude: pending?.draft.latitude !== '' && pending?.draft.latitude != null ? Number(pending.draft.latitude) : building.latitude,
    longitude: pending?.draft.longitude !== '' && pending?.draft.longitude != null ? Number(pending.draft.longitude) : building.longitude,
  };
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

export const CentralBuildingsReports: React.FC<Props> = ({ buildings, usage, usageLoading = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [approval, setApproval] = useState<'all' | 'approved' | 'pending'>('all');
  const [campus, setCampus] = useState('all');
  const [city, setCity] = useState('all');
  const [district, setDistrict] = useState('all');
  const [sort, setSort] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' }>({ key: 'buildingNumber', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [linkType, setLinkType] = useState<'all' | 'mosque' | 'assets' | 'accounting' | 'unlinked'>('all');
  const [coordinates, setCoordinates] = useState<'all' | 'complete' | 'missing'>('all');
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(readSelectedColumns);

  useEffect(() => {
    try {
      window.localStorage.setItem('iau-central-buildings-report-columns-v2', JSON.stringify([...selectedColumns]));
    } catch {
      // Column preferences remain usable in the current session.
    }
  }, [selectedColumns]);
  useEffect(() => {
    setPage(1);
  }, [search, approval, campus, city, district, linkType, coordinates, sort]);

  const campusOptions = useMemo(() => Array.from(new Set(buildings.map((item) => effectiveBuilding(item).campusLocation).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')), [buildings]);
  const cityOptions = useMemo(() => Array.from(new Set(buildings
    .map((item) => effectiveBuilding(item))
    .filter((item) => campus === 'all' || item.campusLocation === campus)
    .map((item) => item.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')), [buildings, campus]);
  const districtOptions = useMemo(() => Array.from(new Set(buildings
    .map((item) => effectiveBuilding(item))
    .filter((item) => (campus === 'all' || item.campusLocation === campus) && (city === 'all' || item.city === city))
    .map((item) => item.district).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')), [buildings, campus, city]);

  const filtered = useMemo(() => {
    const needle = normalize(search);
    return buildings.filter((building) => {
      const data = effectiveBuilding(building);
      const itemUsage = usage.get(building.id);
      if (approval === 'approved' && data.pending) return false;
      if (approval === 'pending' && !data.pending) return false;
      if (campus !== 'all' && data.campusLocation !== campus) return false;
      if (city !== 'all' && data.city !== city) return false;
      if (district !== 'all' && data.district !== district) return false;
      const located = hasCoordinates(data.latitude, data.longitude);
      if (coordinates === 'complete' && !located) return false;
      if (coordinates === 'missing' && located) return false;
      if (linkType === 'mosque' && !itemUsage?.mosqueProfile) return false;
      if (linkType === 'assets' && !(itemUsage?.assets || 0)) return false;
      if (linkType === 'accounting' && !(itemUsage?.accounting || 0)) return false;
      if (linkType === 'unlinked' && (itemUsage?.mosqueProfile || (itemUsage?.assets || 0) > 0 || (itemUsage?.accounting || 0) > 0)) return false;
      if (needle && ![data.buildingNumber, data.name, data.campusLocation, data.city, data.district, building.deed?.deedNumber].some((value) => normalize(value).includes(needle))) return false;
      return true;
    });
  }, [approval, buildings, campus, city, district, coordinates, linkType, search, usage]);

  const summary = useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter((item) => !effectiveBuilding(item).pending).length,
    pending: filtered.filter((item) => effectiveBuilding(item).pending).length,
    coordinates: filtered.filter((item) => {
      const data = effectiveBuilding(item);
      return hasCoordinates(data.latitude, data.longitude);
    }).length,
  }), [filtered]);

  const activeColumns = columns.filter((column) => selectedColumns.has(column.key));
  const visibleColumns = activeColumns.length ? activeColumns : columns;

  const cellValue = (building: MosqueBuilding, key: ColumnKey) => {
    const data = effectiveBuilding(building);
    const itemUsage = usage.get(building.id);
    switch (key) {
      case 'approval': return data.pending ? 'معلق للمراجعة' : 'معتمد';
      case 'buildingNumber': return data.buildingNumber || '—';
      case 'name': return data.name || '—';
      case 'campusLocation': return data.campusLocation || '—';
      case 'city': return data.city || '—';
      case 'district': return data.district || '—';
      case 'coordinates': return hasCoordinates(data.latitude, data.longitude) ? `${data.latitude}, ${data.longitude}` : '—';
      case 'mosque': return itemUsage?.mosqueProfile ? Math.max(itemUsage.mosqueSites || 0, 1) : 0;
      case 'assets': return itemUsage?.assets || 0;
      case 'accounting': return itemUsage?.accounting || 0;
      default: return '';
    }
  };

  const sorted = useMemo(() => [...filtered].sort((first, second) => {
    const left = cellValue(first, sort.key);
    const right = cellValue(second, sort.key);
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'ar', { numeric: true, sensitivity: 'base' });
    return sort.direction === 'asc' ? comparison : -comparison;
  }), [filtered, sort, usage]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const appliedFilters = [
    search.trim() ? 'بحث: ' + search.trim() : '',
    approval !== 'all' ? 'الاعتماد: ' + (approval === 'approved' ? 'معتمد' : 'معلق للمراجعة') : '',
    campus !== 'all' ? 'الموقع: ' + campus : '',
    city !== 'all' ? 'المدينة: ' + city : '',
    district !== 'all' ? 'الحي: ' + district : '',
    coordinates !== 'all' ? 'الإحداثيات: ' + (coordinates === 'complete' ? 'مكتملة' : 'ناقصة') : '',
    linkType !== 'all' ? 'الارتباط: ' + ({ mosque: 'العناية بالمساجد', assets: 'الأصول', accounting: 'السجلات المحاسبية', unlinked: 'غير مرتبطة' } as Record<string, string>)[linkType] : '',
  ].filter(Boolean);

  const toggleSort = (key: ColumnKey) => setSort((previous) => ({
    key,
    direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc',
  }));

  const buildingMapUrl = (building: MosqueBuilding): string | null => {
    const data = effectiveBuilding(building);
    if (!hasCoordinates(data.latitude, data.longitude)) return null;
    return 'https://www.google.com/maps?q=' + encodeURIComponent(String(data.latitude) + ',' + String(data.longitude));
  };

  const exportExcel = () => {
    const chosen = visibleColumns;
    const rows = sorted.map((building) => Object.fromEntries(chosen.map((column) => [column.label, cellValue(building, column.key)])));
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: chosen.map((column) => column.label) });
    worksheet['!cols'] = chosen.map((column) => ({ wch: column.width }));
    if (worksheet['!ref']) worksheet['!autofilter'] = { ref: worksheet['!ref'] };
    const workbook = XLSX.utils.book_new();
    const infoSheet = XLSX.utils.aoa_to_sheet([
      ['معلومات التقرير', 'القيمة'],
      ['أُعدّ بواسطة', reportPreparerName()],
      ['تاريخ الاستخراج', new Date().toLocaleString('ar-SA-u-ca-gregory')],
      ['عدد النتائج', sorted.length],
      ['ترتيب حسب', columns.find((item) => item.key === sort.key)?.label + (sort.direction === 'asc' ? ' (تصاعدي)' : ' (تنازلي)')],
      ['الفلاتر', appliedFilters.join(' | ') || 'جميع المباني'],
    ]);
    infoSheet['!cols'] = [{ wch: 28 }, { wch: 46 }];
    XLSX.utils.book_append_sheet(workbook, infoSheet, 'معلومات التقرير');
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير المباني');
    XLSX.writeFile(workbook, `تقرير-السجل-المركزي-للمباني-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const printReport = () => {
    const chosen = visibleColumns;
    const popup = window.open('', '_blank', 'width=1400,height=900');
    if (!popup) {
      window.alert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير.');
      return;
    }

    const reportTitle = coordinates === 'missing'
      ? 'تقرير المباني الناقصة إحداثيات'
      : approval === 'pending' ? 'تقرير المباني المعلقة للمراجعة' : 'تقرير السجل المركزي للمباني';
    const generatedAt = new Date().toLocaleString('ar-SA-u-ca-gregory');
    const tableRows = sorted.map((building) => '<tr>' +
      chosen.map((column) => '<td>' + escapeHtml(cellValue(building, column.key)) + '</td>').join('') +
      '</tr>').join('');
    const filterLabels = appliedFilters.map((label) => '<span class="filter">' + escapeHtml(label) + '</span>').join('');
    const html = [
      '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<title>' + escapeHtml(reportTitle) + '</title>',
      '<style>',
      '@page{size:' + (chosen.length > 6 ? 'A3 landscape' : 'A4 landscape') + ';margin:12mm;@bottom-left{content:"صفحة " counter(page) " من " counter(pages);font:10px Tahoma;color:#64748b}}',
      '*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
      'body{font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#152d43;background:#fff;margin:0;font-size:12px;line-height:1.6}',
      '.toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#e6f2f5;border:1px solid #c7dfe5;padding:12px 16px;margin-bottom:15px;border-radius:10px}',
      '.toolbar button{background:#095c78;border:0;border-radius:8px;color:#fff;font:700 13px Tahoma;padding:10px 18px;cursor:pointer}',
      '.head{border:2px solid #137b86;border-radius:12px;padding:15px 18px;background:#f4fbfc;break-inside:avoid}',
      '.brand{font-size:12px;color:#0f6275;font-weight:800;margin-bottom:5px}',
      'h1{font-size:22px;line-height:1.5;margin:0 0 7px;color:#11344a}',
      '.meta{display:flex;flex-wrap:wrap;gap:5px 22px;font-size:11px;color:#334155}',
      '.filters{margin:11px 0;display:flex;flex-wrap:wrap;gap:7px;align-items:center}',
      '.filter{background:#eff6f8;border:1px solid #d1e1e7;border-radius:7px;padding:5px 9px;font-size:11px}',
      '.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0 17px;break-inside:avoid}',
      '.stat{border:1px solid #ccdce4;border-radius:10px;padding:10px 13px;background:#f9fcfd}',
      '.stat span{display:block;font-size:11px;color:#526579}.stat strong{font-size:19px;color:#0f4d66}',
      'table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:11px;line-height:1.7}',
      'thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}',
      'th,td{border:1px solid #c9d6df;padding:8px 7px;text-align:right;vertical-align:top;overflow-wrap:anywhere}',
      'th{background:#dceef2;color:#153950;font-weight:800}tbody tr:nth-child(even){background:#f5fafb}',
      '.footer{margin-top:13px;border-top:1px solid #cbd5e1;padding-top:8px;font-size:10px;color:#64748b;display:flex;justify-content:space-between}',
      '@media print{.toolbar{display:none!important}body{margin:0}.head{background:#f4fbfc}}',
      '</style></head><body>',
      '<div class="toolbar"><span>معاينة التقرير — تأكد من البيانات والأعمدة قبل الطباعة</span><button type="button" onclick="window.print()">طباعة / حفظ PDF</button></div>',
      '<header class="head"><div class="brand">جامعة الإمام عبدالرحمن بن فيصل — إدارة أوقاف وأملاك الجامعة</div>',
      '<h1>' + escapeHtml(reportTitle) + '</h1>',
      '<div class="meta"><span>أُعدّ بواسطة: <strong>' + escapeHtml(reportPreparerName()) + '</strong></span>',
      '<span>تاريخ الاستخراج: <strong>' + escapeHtml(generatedAt) + '</strong></span>',
      '<span>ترتيب حسب: <strong>' + escapeHtml(columns.find((column) => column.key === sort.key)?.label || '') +
        (sort.direction === 'asc' ? ' (تصاعدي)' : ' (تنازلي)') + '</strong></span></div></header>',
      '<section class="filters"><strong>معايير التقرير:</strong>' + (filterLabels || '<span class="filter">جميع المباني</span>') + '</section>',
      '<section class="stats">',
      '<div class="stat"><span>النتائج</span><strong>' + summary.total.toLocaleString('ar-SA') + '</strong></div>',
      '<div class="stat"><span>المعتمد</span><strong>' + summary.approved.toLocaleString('ar-SA') + '</strong></div>',
      '<div class="stat"><span>معلق للمراجعة</span><strong>' + summary.pending.toLocaleString('ar-SA') + '</strong></div>',
      '<div class="stat"><span>بإحداثيات مكتملة</span><strong>' + summary.coordinates.toLocaleString('ar-SA') + '</strong></div>',
      '</section>',
      '<table><thead><tr>' + chosen.map((column) => '<th>' + escapeHtml(column.label) + '</th>').join('') +
        '</tr></thead><tbody>' + tableRows + '</tbody></table>',
      '<footer class="footer"><span>منصة إدارة الصكوك والأراضي — السجل المركزي للمباني</span><span>أُعدّ بواسطة: ' +
        escapeHtml(reportPreparerName()) + ' | ' + escapeHtml(generatedAt) + '</span></footer>',
      '</body></html>',
    ].join('');
    popup.document.open();
    popup.document.write(withReportPreparer(html));
    popup.document.close();
    popup.focus();
  };

  const resetFilters = () => {
    setSearch('');
    setApproval('all');
    setCampus('all');
    setCity('all');
    setDistrict('all');
    setLinkType('all');
    setPage(1);
    setCoordinates('all');
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <BarChart3 className="h-4 w-4" />
        التقارير
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          id="central-buildings-reports-view"
          className="flex h-[96vh] w-[98vw] max-w-[98vw] flex-col gap-3 overflow-hidden p-4 sm:max-w-[98vw] sm:p-6"
          dir="rtl"
        >
          <DialogHeader className="shrink-0 gap-2 pr-5 text-right sm:text-right">
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <BarChart3 className="h-6 w-6 text-primary" />
              تقارير السجل المركزي للمباني
            </DialogTitle>
            <DialogDescription className="text-sm">
              تقارير متقدمة مع فرز مباشر، فلاتر مترابطة، تخصيص الأعمدة، طباعة رسمية وتصدير Excel.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 pb-2">
            <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/60" aria-label="تصفية تقارير المباني">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                <div className="space-y-1.5 lg:col-span-2">
                  <Label className="text-sm font-bold">بحث شامل</Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="h-11 pr-10 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="رقم المبنى أو الاسم أو رقم الصك..." />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">حالة الاعتماد</Label>
                  <NativeSelect value={approval} onChange={(e) => setApproval(e.target.value as typeof approval)}>
                    <option value="all">الكل</option><option value="approved">معتمد</option><option value="pending">معلق للمراجعة</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">الحرم / الموقع</Label>
                  <NativeSelect value={campus} onChange={(e) => { setCampus(e.target.value); setCity('all'); setDistrict('all'); }}>
                    <option value="all">كل المواقع</option>{campusOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">المدينة</Label>
                  <NativeSelect value={city} onChange={(e) => { setCity(e.target.value); setDistrict('all'); }}>
                    <option value="all">كل المدن</option>{cityOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">الحي</Label>
                  <NativeSelect value={district} onChange={(e) => setDistrict(e.target.value)}>
                    <option value="all">كل الأحياء</option>{districtOptions.map((value) => <option key={value} value={value}>{value}</option>)}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">الإحداثيات</Label>
                  <NativeSelect value={coordinates} onChange={(e) => setCoordinates(e.target.value as typeof coordinates)}>
                    <option value="all">الكل</option><option value="complete">مكتملة</option><option value="missing">ناقصة</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1.5 lg:col-span-2">
                  <Label className="text-sm font-bold">الارتباط بالوحدات</Label>
                  <NativeSelect value={linkType} onChange={(e) => setLinkType(e.target.value as typeof linkType)}>
                    <option value="all">كل المباني</option>
                    <option value="mosque">العناية بالمساجد والمصليات</option>
                    <option value="assets">وحدة الأصول</option>
                    <option value="accounting">التحول المحاسبي</option>
                    <option value="unlinked">غير مرتبط بأي وحدة</option>
                  </NativeSelect>
                </div>
                <div className="flex items-end lg:col-span-2">
                  <Button type="button" variant="outline" className="h-10 gap-2" onClick={resetFilters}>
                    <SlidersHorizontal className="h-4 w-4" />إعادة ضبط الفلاتر
                  </Button>
                </div>
              </div>
              {appliedFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <span className="text-xs font-bold text-muted-foreground">الفلاتر النشطة:</span>
                  {appliedFilters.map((filter) => <Badge key={filter} variant="secondary" className="px-3 py-1 text-xs">{filter}</Badge>)}
                  <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>مسح الكل</Button>
                </div>
              )}
            </section>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button type="button" onClick={resetFilters} className="rounded-2xl border bg-background p-4 text-right shadow-sm transition hover:border-primary/50 hover:shadow-md">
                <span className="text-sm font-bold text-muted-foreground">إجمالي النتائج</span>
                <strong className="mt-1 block text-3xl font-black text-foreground">{summary.total.toLocaleString('ar-SA')}</strong>
              </button>
              <button type="button" onClick={() => setApproval('approved')} className="rounded-2xl border bg-background p-4 text-right shadow-sm transition hover:border-primary/50 hover:shadow-md">
                <span className="text-sm font-bold text-muted-foreground">المباني المعتمدة</span>
                <strong className="mt-1 block text-3xl font-black text-foreground">{summary.approved.toLocaleString('ar-SA')}</strong>
              </button>
              <button type="button" onClick={() => setApproval('pending')} className="rounded-2xl border bg-background p-4 text-right shadow-sm transition hover:border-primary/50 hover:shadow-md">
                <span className="text-sm font-bold text-muted-foreground">معلق للمراجعة</span>
                <strong className="mt-1 block text-3xl font-black text-foreground">{summary.pending.toLocaleString('ar-SA')}</strong>
              </button>
              <button type="button" onClick={() => setCoordinates('missing')} className="rounded-2xl border bg-background p-4 text-right shadow-sm transition hover:border-primary/50 hover:shadow-md">
                <span className="text-sm font-bold text-muted-foreground">مباني بلا إحداثيات</span>
                <strong className="mt-1 block text-3xl font-black text-foreground">{(summary.total - summary.coordinates).toLocaleString('ar-SA')}</strong>
              </button>
            </div>

            <section className="rounded-2xl border bg-background p-4" aria-label="تخصيص أعمدة التقرير">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black">أعمدة التقرير</h3>
                  <p className="text-sm text-muted-foreground">اختر أعمدة المعاينة والتصدير والطباعة. تُحفظ اختياراتك تلقائياً على جهازك.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedColumns.size} عمود</Badge>
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelectedColumns(new Set(columns.map((item) => item.key)))}>تحديد الكل</Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {columns.map((column) => <label key={column.key} className={selectedColumns.has(column.key) ? 'cursor-pointer rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-bold text-primary transition' : 'cursor-pointer rounded-xl border bg-background px-3 py-2 text-sm font-bold text-muted-foreground transition'}>
                  <input type="checkbox" className="ml-2 align-middle" checked={selectedColumns.has(column.key)} onChange={() => setSelectedColumns((current) => {
                    const next = new Set(current);
                    if (next.has(column.key)) { if (next.size > 1) next.delete(column.key); }
                    else next.add(column.key);
                    return next;
                  })} />{column.label}
                </label>)}
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border bg-background" aria-label="جدول نتائج المباني">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/25 px-4 py-3">
                <div>
                  <h3 className="text-base font-black">معاينة النتائج</h3>
                  <p className="text-sm text-muted-foreground">{usageLoading ? 'مؤشرات الارتباط قيد التحميل...' : 'انقر عنوان أي عمود للفرز، ثم تصفح النتائج كاملة.'}</p>
                </div>
                <ReportViewToggle key={visibleColumns.map((column) => column.key).join('-')} storageKey="iau-central-buildings-reports-view" scopeId="central-buildings-reports-view" />
              </div>
              <div className="max-h-[52vh] min-h-[180px] overflow-auto">
                <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-sm">
                  <thead className="sticky top-0 z-20 bg-background">
                    <tr>
                      {visibleColumns.map((column, index) => (
                        <th key={column.key} scope="col"
                          className={'border-b border-l bg-slate-100 px-3 py-3 text-right font-black text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white ' + (index < 2 ? 'sticky z-20' : '')}
                          style={index === 0 ? { right: 0, minWidth: 112 } : index === 1 ? { right: 112, minWidth: 220 } : { minWidth: Math.max(105, column.width * 5) }}
                          aria-sort={sort.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        >
                          <button type="button" className="inline-flex w-full items-center justify-between gap-2 text-right hover:text-primary" onClick={() => toggleSort(column.key)} title={'فرز حسب ' + column.label}>
                            <span>{column.label}</span>
                            {sort.key === column.key ? (sort.direction === 'asc' ? <ArrowUp className="h-4 w-4 shrink-0" /> : <ArrowDown className="h-4 w-4 shrink-0" />) : <ArrowDownUp className="h-3.5 w-3.5 shrink-0 opacity-50" />}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((building) => (
                      <tr key={building.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/60">
                        {visibleColumns.map((column, index) => (
                          <td key={column.key}
                            className={'border-b border-l px-3 py-3 align-middle text-slate-900 dark:border-slate-700 dark:text-slate-100 ' + (index < 2 ? 'sticky z-10 bg-white group-hover:bg-slate-50 dark:bg-slate-950 dark:group-hover:bg-slate-900' : '')}
                            style={index === 0 ? { right: 0, minWidth: 112 } : index === 1 ? { right: 112, minWidth: 220 } : undefined}
                          >
                            {column.key === 'coordinates' ? (
                              buildingMapUrl(building) ? (
                                <a href={buildingMapUrl(building) || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-bold text-primary underline-offset-2 hover:underline" title={String(cellValue(building, column.key))}>
                                  <MapPin className="h-4 w-4" />عرض الموقع
                                </a>
                              ) : <span className="text-muted-foreground">—</span>
                            ) : <span className={column.key === 'name' ? 'font-bold' : ''}>{String(cellValue(building, column.key))}</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {!pageRows.length && <tr><td colSpan={visibleColumns.length} className="px-4 py-12 text-center text-base font-medium text-muted-foreground">لا توجد مبانٍ تطابق الفلاتر المختارة.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/15 px-4 py-3 text-sm">
                <div className="font-bold">
                  {sorted.length ? ((currentPage - 1) * pageSize + 1).toLocaleString('ar-SA') : '0'} - {Math.min(currentPage * pageSize, sorted.length).toLocaleString('ar-SA')} من {sorted.length.toLocaleString('ar-SA')} مبنى
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-sm">عدد الصفوف</Label>
                  <NativeSelect value={String(pageSize)} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="w-24">
                    <option value="25">25</option><option value="50">50</option><option value="100">100</option>
                  </NativeSelect>
                  <Button type="button" variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="الصفحة السابقة">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="min-w-20 text-center font-bold">صفحة {currentPage.toLocaleString('ar-SA')} / {totalPages.toLocaleString('ar-SA')}</span>
                  <Button type="button" variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="الصفحة التالية">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </section>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t pt-3 sm:justify-start">
            <Button type="button" onClick={exportExcel} disabled={!sorted.length}><Download className="h-4 w-4" />تصدير Excel</Button>
            <Button type="button" variant="outline" onClick={printReport} disabled={!sorted.length}><Printer className="h-4 w-4" />طباعة / PDF</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إغلاق</Button>
          </DialogFooter>
          <style>{'#central-buildings-reports-view.iau-report-cards-mode td, #central-buildings-reports-view.iau-report-cards-mode th {position:static!important;}'}</style>
        </DialogContent>
      </Dialog>
    </>
  );
};
