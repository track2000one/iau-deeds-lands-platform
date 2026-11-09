import { withReportPreparer, reportPreparerName } from '../utils/reportAttribution';
import {
  buildCentralBuildingsPhotoAppendix,
  centralBuildingsPhotoPrintCss,
  MAX_PRINT_PHOTOS,
  photoSelectionForReport,
  type BuildingReportPhotoMode,
} from '../utils/centralBuildingsPhotoAppendix';
import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ArrowDown, ArrowDownUp, ArrowUp, BarChart3, ChevronLeft, ChevronRight, Download, Images, ListChecks, MapPin, Printer, Search, SlidersHorizontal, X } from 'lucide-react';
import { toast } from 'sonner';
import { getPendingBuildingImport } from './BuildingExcelImportManager';
import type { MosqueBuilding, MosqueBuildingDeedReference } from '../api/mosques';
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
  deeds: MosqueBuildingDeedReference[];
  usage: Map<string, UsageEntry>;
  usageLoading?: boolean;
};

type ColumnKey =
  | 'approval'
  | 'buildingNumber'
  | 'name'
  | 'createdBy'
  | 'deedStatus'
  | 'deedNumber'
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
  { key: 'createdBy', label: 'اسم المستخدم', width: 26 },
  { key: 'deedStatus', label: 'الارتباط بالصك', width: 20 },
  { key: 'deedNumber', label: 'رقم الصك', width: 24 },
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
const UNKNOWN_CREATOR = '__unknown_creator__';
const creatorName = (building: MosqueBuilding) =>
  String(building.createdByName || '').trim() ||
  (building.createdBy ? 'اسم المستخدم غير متاح' : 'غير محدد (سجل قديم)');
const isValidCoordinate = (value: unknown) =>
  value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value));
const hasCoordinates = (latitude: unknown, longitude: unknown) =>
  isValidCoordinate(latitude) && isValidCoordinate(longitude) &&
  Math.abs(Number(latitude)) <= 90 && Math.abs(Number(longitude)) <= 180 &&
  !(Number(latitude) === 0 && Number(longitude) === 0);

const readSelectedColumns = (): Set<ColumnKey> => {
  try {
    const currentSaved = JSON.parse(window.localStorage.getItem('iau-central-buildings-report-columns-v4') || 'null');
    if (Array.isArray(currentSaved)) {
      const valid = currentSaved.filter((key): key is ColumnKey => columns.some((column) => column.key === key));
      if (valid.length) return new Set(valid);
    }
    const previousV3 = JSON.parse(window.localStorage.getItem('iau-central-buildings-report-columns-v3') || 'null');
    if (Array.isArray(previousV3)) {
      const valid = previousV3.filter((key): key is ColumnKey => columns.some((column) => column.key === key));
      if (valid.length) return new Set([...valid, 'createdBy']);
    }
    const previousSaved = JSON.parse(window.localStorage.getItem('iau-central-buildings-report-columns-v2') || 'null');
    if (Array.isArray(previousSaved)) {
      const valid = previousSaved.filter((key): key is ColumnKey => columns.some((column) => column.key === key));
      if (valid.length) return new Set([...valid, 'deedStatus', 'deedNumber', 'createdBy']);
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

export const CentralBuildingsReports: React.FC<Props> = ({ buildings, deeds, usage, usageLoading = false }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [approval, setApproval] = useState<'all' | 'approved' | 'pending'>('all');
  const [campus, setCampus] = useState('all');
  const [city, setCity] = useState('all');
  const [district, setDistrict] = useState('all');
  const [creatorId, setCreatorId] = useState('all');
  const [buildingSelectionMode, setBuildingSelectionMode] = useState<'all' | 'custom'>('all');
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<string>>(new Set());
  const [buildingNameSearch, setBuildingNameSearch] = useState('');
  const [sort, setSort] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' }>({ key: 'buildingNumber', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [linkType, setLinkType] = useState<'all' | 'mosque' | 'assets' | 'accounting' | 'unlinked'>('all');
  const [coordinates, setCoordinates] = useState<'all' | 'complete' | 'missing'>('all');
  const [deedLink, setDeedLink] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(readSelectedColumns);
  const [photoMode, setPhotoMode] = useState<BuildingReportPhotoMode>('primary');
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem('iau-central-buildings-report-columns-v4', JSON.stringify([...selectedColumns]));
    } catch {
      // Column preferences remain usable in the current session.
    }
  }, [selectedColumns]);
  useEffect(() => {
    setPage(1);
  }, [search, approval, campus, city, district, creatorId, linkType, coordinates, deedLink, sort, buildingSelectionMode, selectedBuildingIds]);

  // A new site, neighborhood or other filter must never carry over hidden
  // building IDs from an earlier selection.
  useEffect(() => {
    setBuildingSelectionMode('all');
    setSelectedBuildingIds(new Set());
    setBuildingNameSearch('');
  }, [search, approval, campus, city, district, creatorId, linkType, coordinates, deedLink]);

  const deedById = useMemo(() => new Map(deeds.map((deed) => [String(deed.id), deed])), [deeds]);
  const getDeedNumber = (building: MosqueBuilding): string => {
    const inlineNumber = String(building.deed?.deedNumber || '').trim();
    if (inlineNumber) return inlineNumber;
    const id = building.deedId || building.deed?.id;
    return id ? String(deedById.get(String(id))?.deedNumber || '').trim() : '';
  };
  const isDeedLinked = (building: MosqueBuilding): boolean =>
    Boolean(building.deedId || building.deed?.id || getDeedNumber(building));

  const creatorOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; count: number }>();
    for (const building of buildings) {
      const id = building.createdBy || UNKNOWN_CREATOR;
      const entry = byId.get(id);
      if (entry) {
        entry.count += 1;
        if (building.createdByName && entry.name === 'اسم المستخدم غير متاح') {
          entry.name = building.createdByName.trim();
        }
      } else {
        byId.set(id, { id, name: creatorName(building), count: 1 });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'ar', { sensitivity: 'base' }));
  }, [buildings]);

  const campusOptions = useMemo(() => Array.from(new Set(buildings.map((item) => effectiveBuilding(item).campusLocation).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')), [buildings]);
  const cityOptions = useMemo(() => Array.from(new Set(buildings
    .map((item) => effectiveBuilding(item))
    .filter((item) => campus === 'all' || item.campusLocation === campus)
    .map((item) => item.city).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')), [buildings, campus]);
  const districtOptions = useMemo(() => Array.from(new Set(buildings
    .map((item) => effectiveBuilding(item))
    .filter((item) => (campus === 'all' || item.campusLocation === campus) && (city === 'all' || item.city === city))
    .map((item) => item.district).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')), [buildings, campus, city]);

  const eligibleBuildings = useMemo(() => {
    const needle = normalize(search);
    return buildings.filter((building) => {
      const data = effectiveBuilding(building);
      const itemUsage = usage.get(building.id);
      if (approval === 'approved' && data.pending) return false;
      if (approval === 'pending' && !data.pending) return false;
      if (campus !== 'all' && data.campusLocation !== campus) return false;
      if (city !== 'all' && data.city !== city) return false;
      if (district !== 'all' && data.district !== district) return false;
      if (creatorId !== 'all' && (building.createdBy || UNKNOWN_CREATOR) !== creatorId) return false;
      if (deedLink === 'linked' && !isDeedLinked(building)) return false;
      if (deedLink === 'unlinked' && isDeedLinked(building)) return false;
      const located = hasCoordinates(data.latitude, data.longitude);
      if (coordinates === 'complete' && !located) return false;
      if (coordinates === 'missing' && located) return false;
      if (linkType === 'mosque' && !itemUsage?.mosqueProfile) return false;
      if (linkType === 'assets' && !(itemUsage?.assets || 0)) return false;
      if (linkType === 'accounting' && !(itemUsage?.accounting || 0)) return false;
      if (linkType === 'unlinked' && (itemUsage?.mosqueProfile || (itemUsage?.assets || 0) > 0 || (itemUsage?.accounting || 0) > 0)) return false;
      if (needle && ![data.buildingNumber, data.name, data.campusLocation, data.city, data.district, getDeedNumber(building), creatorName(building)].some((value) => normalize(value).includes(needle))) return false;
      return true;
    });
  }, [approval, buildings, campus, city, district, creatorId, coordinates, deedLink, deedById, linkType, search, usage]);

  // Everything downstream (KPIs, table, photos, PDF and Excel) consumes this one
  // filtered collection; only the explicitly checked IDs survive custom selection.
  const filtered = useMemo(
    () => buildingSelectionMode === 'all'
      ? eligibleBuildings
      : eligibleBuildings.filter((building) => selectedBuildingIds.has(building.id)),
    [eligibleBuildings, buildingSelectionMode, selectedBuildingIds],
  );

  const selectedBuildingRows = useMemo(
    () => eligibleBuildings.filter((building) => selectedBuildingIds.has(building.id)),
    [eligibleBuildings, selectedBuildingIds],
  );
  const buildingOptions = useMemo(() => {
    const needle = normalize(buildingNameSearch);
    return [...eligibleBuildings].filter((building) => {
      const data = effectiveBuilding(building);
      return !needle || [data.name, data.buildingNumber, data.campusLocation, data.city, data.district]
        .some((value) => normalize(value).includes(needle));
    }).sort((left, right) => String(effectiveBuilding(left).name).localeCompare(
      String(effectiveBuilding(right).name), 'ar', { numeric: true, sensitivity: 'base' },
    ));
  }, [eligibleBuildings, buildingNameSearch]);

  const changeBuildingSelection = (buildingId: string, checked: boolean) => {
    setBuildingSelectionMode('custom');
    setSelectedBuildingIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(buildingId);
      else next.delete(buildingId);
      return next;
    });
  };

  const summary = useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter((item) => !effectiveBuilding(item).pending).length,
    pending: filtered.filter((item) => effectiveBuilding(item).pending).length,
    linkedDeeds: filtered.filter(isDeedLinked).length,
    unlinkedDeeds: filtered.filter((item) => !isDeedLinked(item)).length,
    coordinates: filtered.filter((item) => {
      const data = effectiveBuilding(item);
      return hasCoordinates(data.latitude, data.longitude);
    }).length,
  }), [filtered, deedById]);

  const activeColumns = columns.filter((column) => selectedColumns.has(column.key));
  const visibleColumns = activeColumns.length ? activeColumns : columns;

  const cellValue = (building: MosqueBuilding, key: ColumnKey) => {
    const data = effectiveBuilding(building);
    const itemUsage = usage.get(building.id);
    switch (key) {
      case 'approval': return data.pending ? 'معلق للمراجعة' : 'معتمد';
      case 'buildingNumber': return data.buildingNumber || '—';
      case 'name': return data.name || '—';
      case 'createdBy': return creatorName(building);
      case 'deedStatus': return isDeedLinked(building) ? 'مرتبط بصك' : 'غير مرتبط بصك';
      case 'deedNumber': return getDeedNumber(building) || (isDeedLinked(building) ? 'رقم الصك غير متوفر' : '—');
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
  }), [filtered, sort, usage, deedById]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const photoGroups = useMemo(() => photoSelectionForReport(sorted, photoMode), [sorted, photoMode]);
  const selectedPhotoCount = photoGroups.reduce((total, group) => total + group.photos.length, 0);

  const appliedFilters = [
    search.trim() ? 'بحث: ' + search.trim() : '',
    approval !== 'all' ? 'الاعتماد: ' + (approval === 'approved' ? 'معتمد' : 'معلق للمراجعة') : '',
    campus !== 'all' ? 'الموقع: ' + campus : '',
    city !== 'all' ? 'المدينة: ' + city : '',
    district !== 'all' ? 'الحي: ' + district : '',
    creatorId !== 'all' ? 'اسم المستخدم: ' + (creatorOptions.find((item) => item.id === creatorId)?.name || 'غير معروف') : '',
    buildingSelectionMode === 'custom'
      ? 'المباني المختارة (' + selectedBuildingRows.length + '): ' +
        (selectedBuildingRows.length
          ? selectedBuildingRows.slice(0, 12).map((building) => {
              const item = effectiveBuilding(building);
              return item.name + ' (' + item.buildingNumber + ')';
            }).join('، ') + (selectedBuildingRows.length > 12 ? '، وغيرها' : '')
          : 'لا توجد مبانٍ محددة')
      : '',
    coordinates !== 'all' ? 'الإحداثيات: ' + (coordinates === 'complete' ? 'مكتملة' : 'ناقصة') : '',
    deedLink !== 'all' ? 'الصك: ' + (deedLink === 'linked' ? 'مرتبط' : 'غير مرتبط') : '',
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

  const printReport = async () => {
    if (printing) return;
    if (selectedPhotoCount > MAX_PRINT_PHOTOS) {
      toast.error(`التقرير يتضمن ${selectedPhotoCount} صورة. الحد المسموح للطباعة هو ${MAX_PRINT_PHOTOS} صورة؛ اختر الصورة الرئيسية أو صفِّ المباني لتقليل العدد.`);
      return;
    }
    const chosen = visibleColumns;
    const popup = window.open('', '_blank', 'width=1400,height=900');
    if (!popup) {
      window.alert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير.');
      return;
    }

    setPrinting(true);
    popup.document.open();
    popup.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>تجهيز تقرير المباني</title><body style="font:16px Tahoma,Arial;padding:40px;color:#153950"><h2>جارٍ إعداد التقرير وتحميل صور المباني المحددة…</h2><p>ستظهر معاينة التقرير بعد الانتهاء من جلب الصور المصرح بها.</p></body></html>');
    popup.document.close();

    let objectUrls: string[] = [];
    try {
      const appendix = photoMode !== 'none' && selectedPhotoCount > 0
        ? await buildCentralBuildingsPhotoAppendix(photoGroups)
        : { html: '', urls: [] as string[], imageCount: 0, failedCount: 0 };
      objectUrls = appendix.urls;
      if (popup.closed) {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
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
      '.stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:12px 0 17px;break-inside:avoid}',
      '.stat{border:1px solid #ccdce4;border-radius:10px;padding:10px 13px;background:#f9fcfd}',
      '.stat span{display:block;font-size:11px;color:#526579}.stat strong{font-size:19px;color:#0f4d66}',
      'table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:11px;line-height:1.7}',
      'thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}',
      'th,td{border:1px solid #c9d6df;padding:8px 7px;text-align:right;vertical-align:top;overflow-wrap:anywhere}',
      'th{background:#dceef2;color:#153950;font-weight:800}tbody tr:nth-child(even){background:#f5fafb}',
      '.footer{margin-top:13px;border-top:1px solid #cbd5e1;padding-top:8px;font-size:10px;color:#64748b;display:flex;justify-content:space-between}',
      centralBuildingsPhotoPrintCss,
      '.empty-photo-note{padding:12px 14px;margin:17px 0;border:1px dashed #a9bac5;border-radius:8px;color:#465c70;background:#f8fafc;font-size:12px}',
      '.toolbar button:disabled{opacity:.5;cursor:not-allowed}',
      '@media print{.toolbar{display:none!important}body{margin:0}.head{background:#f4fbfc}}',
      '</style></head><body>',
      '<div class="toolbar"><span id="print-image-status">معاينة التقرير — راجع البيانات والصور قبل الطباعة</span><button id="iau-print-action" type="button" ' + (appendix.imageCount ? 'disabled ' : '') + 'onclick="window.print()">طباعة / حفظ PDF</button></div>',
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
      '<div class="stat"><span>مرتبطة بصك</span><strong>' + summary.linkedDeeds.toLocaleString('ar-SA') + '</strong></div>',
      '<div class="stat"><span>غير مرتبطة بصك</span><strong>' + summary.unlinkedDeeds.toLocaleString('ar-SA') + '</strong></div>',
      '</section>',
      '<table><thead><tr>' + chosen.map((column) => '<th>' + escapeHtml(column.label) + '</th>').join('') +
        '</tr></thead><tbody>' + tableRows + '</tbody></table>',
      appendix.html || (photoMode !== 'none' ? '<p class="empty-photo-note">لا توجد صور مرفقة بالمباني المطابقة لمعايير التقرير. تم الاكتفاء بالبيانات.</p>' : ''),
      '<footer class="footer"><span>منصة إدارة الصكوك والأراضي — السجل المركزي للمباني</span><span>أُعدّ بواسطة: ' +
        escapeHtml(reportPreparerName()) + ' | ' + escapeHtml(generatedAt) + '</span></footer>',
      '</body></html>',
    ].join('');
    popup.document.open();
    popup.document.write(withReportPreparer(html));
    popup.document.close();

    // The preview is ready only when protected images have finished decoding (or timed out).
    const imageElements = Array.from(popup.document.images);
    if (imageElements.length) {
      await Promise.race([
        Promise.all(imageElements.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          });
        })),
        new Promise<void>((resolve) => window.setTimeout(resolve, 15000)),
      ]);
    }

    if (popup.closed) {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      return;
    }

    // A secured image may arrive in a format the browser cannot render (e.g. HEIC).
    // Replace broken image elements with a visible note rather than printing blank boxes.
    let incompatibleImages = 0;
    for (const image of imageElements) {
      if (image.complete && image.naturalWidth === 0) {
        const fallback = popup.document.createElement('div');
        fallback.className = 'image-unavailable';
        fallback.textContent = 'تعذر عرض هذه الصورة بصيغتها الحالية في المتصفح؛ يرجى استخدام JPG أو PNG للطباعة.';
        image.replaceWith(fallback);
        incompatibleImages += 1;
      }
    }

    const status = popup.document.getElementById('print-image-status');
    const printable = popup.document.getElementById('iau-print-action') as HTMLButtonElement | null;
    if (status && appendix.imageCount) {
      status.textContent = `الملحق المصور: ${appendix.imageCount} صورة من ${photoGroups.length} مبنى` +
        (appendix.failedCount || incompatibleImages
          ? ` — صور تحتاج مراجعة: ${appendix.failedCount + incompatibleImages}`
          : ' — جاهز للطباعة');
    }
    if (printable) printable.disabled = false;
    let cleaned = false;
    let closePoll: number | undefined;
    let expiryTimer: number | undefined;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls = [];
      if (closePoll !== undefined) window.clearInterval(closePoll);
      if (expiryTimer !== undefined) window.clearTimeout(expiryTimer);
    };
    popup.addEventListener('afterprint', () => {
      cleanup();
      if (!popup.closed) popup.close();
    }, { once: true });
    closePoll = window.setInterval(() => {
      if (popup.closed) cleanup();
    }, 2000);
    expiryTimer = window.setTimeout(() => {
      cleanup();
      if (!popup.closed) popup.close();
    }, 20 * 60 * 1000);
    popup.focus();
    } catch (error) {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      if (!popup.closed) popup.close();
      toast.error(error instanceof Error ? error.message : 'تعذر تجهيز الصور في تقرير المباني');
    } finally {
      setPrinting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setApproval('all');
    setCampus('all');
    setCity('all');
    setDistrict('all');
    setCreatorId('all');
    setBuildingSelectionMode('all');
    setSelectedBuildingIds(new Set());
    setBuildingNameSearch('');
    setLinkType('all');
    setPage(1);
    setCoordinates('all');
    setDeedLink('all');
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
                <div className="space-y-1.5">
                  <Label className="text-sm font-bold">الارتباط بالصك</Label>
                  <NativeSelect value={deedLink} onChange={(e) => setDeedLink(e.target.value as typeof deedLink)}>
                    <option value="all">جميع المباني</option>
                    <option value="linked">مرتبط بصك</option>
                    <option value="unlinked">غير مرتبط بصك</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="central-buildings-report-creator" className="text-sm font-bold">اسم المستخدم</Label>
                  <NativeSelect
                    id="central-buildings-report-creator"
                    title="تصفية حسب مستخدم إضافة المبنى"
                    value={creatorId}
                    onChange={(e) => setCreatorId(e.target.value)}
                  >
                    <option value="all">جميع المستخدمين</option>
                    {creatorOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.count})
                      </option>
                    ))}
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
                  <Button type="button" variant="outline" className="h-10 gap-2 border-amber-400 bg-amber-50 font-bold text-amber-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500 hover:bg-amber-100 hover:text-amber-950 hover:shadow-md focus-visible:ring-amber-500 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/60" onClick={resetFilters}>
                    <SlidersHorizontal className="h-4 w-4" />إعادة ضبط الفلاتر
                  </Button>
                </div>
              </div>
              <section className="space-y-3 rounded-xl border border-primary/20 bg-background p-3" aria-label="تحديد المباني بالاسم">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-2 text-sm font-black">
                      <ListChecks className="h-4 w-4 text-primary" />
                      اختيار أسماء المباني للتقرير
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      يتوفر {eligibleBuildings.length} مبنى حسب فلاتر الموقع والحي. يمكنك اختيار 3 مبانٍ فقط من أصل 10، ويشملها الجدول والطباعة والصور وExcel.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={buildingSelectionMode === 'custom' ? 'default' : 'secondary'}>
                      {buildingSelectionMode === 'custom'
                        ? `مختار ${selectedBuildingRows.length} من ${eligibleBuildings.length}`
                        : `جميع المباني (${eligibleBuildings.length})`}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className={buildingSelectionMode === 'custom'
                        ? 'gap-2 border border-blue-600 bg-blue-100 font-bold text-blue-900 shadow-sm hover:bg-blue-200 hover:text-blue-950 focus-visible:ring-blue-500 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-100 dark:hover:bg-blue-900'
                        : 'gap-2 border border-blue-700 bg-blue-700 font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-lg focus-visible:ring-blue-500 dark:border-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600'}
                      onClick={() => {
                        setBuildingSelectionMode('custom');
                        setSelectedBuildingIds(new Set());
                        setBuildingNameSearch('');
                      }}
                    >
                      <ListChecks className="h-4 w-4" /> تحديد مبانٍ معينة
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={buildingSelectionMode === 'all'}
                      className="gap-2 border-teal-500 bg-teal-50 font-bold text-teal-800 shadow-sm transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-teal-100 enabled:hover:text-teal-950 enabled:hover:shadow-md focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 disabled:shadow-none dark:border-teal-600 dark:bg-teal-950/50 dark:text-teal-200 dark:enabled:hover:bg-teal-900/70 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
                      onClick={() => {
                        setBuildingSelectionMode('all');
                        setSelectedBuildingIds(new Set());
                        setBuildingNameSearch('');
                      }}
                    >
                      عرض جميع المباني
                    </Button>
                  </div>
                </div>

                {buildingSelectionMode === 'custom' && (
                  <div className="space-y-3 border-t pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="relative w-full max-w-md">
                        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={buildingNameSearch}
                          onChange={(event) => setBuildingNameSearch(event.target.value)}
                          placeholder="ابحث باسم المبنى أو رقمه لاختياره"
                          aria-label="البحث في أسماء المباني المتاحة للتحديد"
                          className="pr-9"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm"
                          className="border-blue-400 bg-blue-50 font-bold text-blue-900 hover:bg-blue-100 hover:text-blue-950 focus-visible:ring-blue-500 disabled:opacity-50 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/70"
                          disabled={!buildingOptions.length}
                          onClick={() => setSelectedBuildingIds((previous) => {
                            const next = new Set(previous);
                            buildingOptions.forEach((building) => next.add(building.id));
                            return next;
                          })}>
                          تحديد الكل {buildingNameSearch.trim() ? 'المطابق للبحث' : 'في الموقع'}
                        </Button>
                        <Button type="button" variant="outline" size="sm"
                          className="border-rose-400 bg-rose-50 font-bold text-rose-800 hover:bg-rose-100 hover:text-rose-950 focus-visible:ring-rose-500 disabled:opacity-50 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-900/70"
                          disabled={!selectedBuildingIds.size}
                          onClick={() => setSelectedBuildingIds(new Set())}>
                          مسح التحديد
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto rounded-lg border bg-background p-2">
                      {buildingOptions.length ? (
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {buildingOptions.map((building) => {
                            const data = effectiveBuilding(building);
                            return (
                              <label
                                key={building.id}
                                className={selectedBuildingIds.has(building.id)
                                  ? 'flex cursor-pointer items-start gap-2 rounded-lg border border-primary/50 bg-primary/5 p-3 text-sm'
                                  : 'flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm hover:bg-muted/50'}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedBuildingIds.has(building.id)}
                                  onChange={(event) => changeBuildingSelection(building.id, event.target.checked)}
                                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                                  aria-label={`تضمين ${data.name || data.buildingNumber} في التقرير`}
                                />
                                <span className="min-w-0">
                                  <strong className="block break-words">{data.name || 'بدون اسم'}</strong>
                                  <span className="text-xs text-muted-foreground">
                                    رقم المبنى: {data.buildingNumber || '—'} · {data.campusLocation || data.district || 'موقع غير محدد'}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="py-7 text-center text-sm text-muted-foreground">لا توجد مبانٍ مطابقة للبحث ضمن فلاتر الموقع الحالية.</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={selectedBuildingRows.length ? 'text-xs font-medium text-primary' : 'text-xs font-medium text-amber-700'}>
                        {selectedBuildingRows.length
                          ? `التقرير سيشمل ${selectedBuildingRows.length} مبنى فقط. اضغط على اسم آخر لإضافته أو إزالته.`
                          : 'لم تحدد أي مبنى بعد؛ اختر أسماء المباني المطلوب تضمينها في التقرير.'}
                      </p>
                      {selectedBuildingRows.length > 0 && selectedBuildingRows.length <= 8 && (
                        <div className="flex flex-wrap gap-1">
                          {selectedBuildingRows.map((building) => (
                            <button key={building.id} type="button"
                              onClick={() => changeBuildingSelection(building.id, false)}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2 py-1 text-xs text-foreground hover:bg-muted"
                              title="إزالة المبنى من التقرير">
                              {effectiveBuilding(building).name || effectiveBuilding(building).buildingNumber}
                              <X className="h-3 w-3" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {appliedFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  <span className="text-xs font-bold text-muted-foreground">الفلاتر النشطة:</span>
                  {appliedFilters.map((filter) => <Badge key={filter} variant="secondary" className="px-3 py-1 text-xs">{filter}</Badge>)}
                  <Button type="button" variant="outline" size="sm" className="border-amber-400 bg-amber-50 font-bold text-amber-900 hover:bg-amber-100 hover:text-amber-950 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/60" onClick={resetFilters}>مسح الكل</Button>
                </div>
              )}
            </section>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
              <button type="button" onClick={() => setDeedLink('linked')} className="rounded-2xl border bg-background p-4 text-right shadow-sm transition hover:border-emerald-500/60 hover:shadow-md">
                <span className="text-sm font-bold text-muted-foreground">مباني مرتبطة بصك</span>
                <strong className="mt-1 block text-3xl font-black text-emerald-700 dark:text-emerald-300">{summary.linkedDeeds.toLocaleString('ar-SA')}</strong>
              </button>
              <button type="button" onClick={() => setDeedLink('unlinked')} className="rounded-2xl border bg-background p-4 text-right shadow-sm transition hover:border-amber-500/60 hover:shadow-md">
                <span className="text-sm font-bold text-muted-foreground">مباني غير مرتبطة بصك</span>
                <strong className="mt-1 block text-3xl font-black text-amber-700 dark:text-amber-300">{summary.unlinkedDeeds.toLocaleString('ar-SA')}</strong>
              </button>
            </div>

            <section className="rounded-2xl border bg-background p-4" aria-label="الصور في تقرير المباني">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="flex items-center gap-2 text-base font-black"><Images className="h-5 w-5 text-primary" /> الصور المرفقة في التقرير</h3>
                  <p className="text-sm text-muted-foreground">تُدرج الصور داخل ملحق توثيق مصور بعد الجدول، بحسب المباني المطابقة للفرز والتصفية. تتضمن اسم المبنى ورقمه وتفاصيل الصورة.</p>
                  <p className="text-xs text-muted-foreground">هذه الخيارات خاصة بالطباعة وPDF فقط. لسلامة الأداء، الحد الأعلى {MAX_PRINT_PHOTOS} صورة في التقرير الواحد؛ يمكن تضييق الفلاتر عند تجاوزه.</p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <Badge variant="secondary">{selectedPhotoCount} صورة من {photoGroups.length} مبنى</Badge>
                  <NativeSelect
                    value={photoMode}
                    aria-label="تحديد الصور التي ستظهر في التقرير المطبوع"
                    onChange={(event) => setPhotoMode(event.target.value as BuildingReportPhotoMode)}
                    className="w-full min-w-56 sm:w-64"
                  >
                    <option value="none">طباعة البيانات بدون صور</option>
                    <option value="primary">الصورة الرئيسية لكل مبنى</option>
                    <option value="all">جميع صور المباني المرفقة</option>
                  </NativeSelect>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-background p-4" aria-label="تخصيص أعمدة التقرير">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-black">أعمدة التقرير</h3>
                  <p className="text-sm text-muted-foreground">اختر أعمدة المعاينة والتصدير والطباعة. تُحفظ اختياراتك تلقائياً على جهازك.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedColumns.size} عمود</Badge>
                  <Button type="button" variant="outline" size="sm" className="border-blue-400 bg-blue-50 font-bold text-blue-900 hover:bg-blue-100 hover:text-blue-950 dark:border-blue-600 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-900/70" onClick={() => setSelectedColumns(new Set(columns.map((item) => item.key)))}>تحديد الكل</Button>
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
                            {column.key === 'deedStatus' ? (
                              <span className={isDeedLinked(building) ? 'inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200' : 'inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200'}>
                                {String(cellValue(building, column.key))}
                              </span>
                            ) : column.key === 'deedNumber' ? (
                              <span dir="ltr" className="inline-block font-semibold tabular-nums">{String(cellValue(building, column.key))}</span>
                            ) : column.key === 'coordinates' ? (
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
            <Button type="button" onClick={exportExcel} disabled={!sorted.length} className="gap-2 border border-emerald-700 bg-emerald-700 font-bold text-white shadow-md transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-emerald-800 enabled:hover:shadow-lg focus-visible:ring-emerald-500 disabled:opacity-45 dark:border-emerald-600 dark:bg-emerald-700 dark:hover:bg-emerald-600"><Download className="h-4 w-4" />تصدير Excel</Button>
            <Button type="button" onClick={() => { void printReport(); }} disabled={!sorted.length || printing} className="gap-2 border border-indigo-700 bg-indigo-700 font-bold text-white shadow-md transition-all enabled:hover:-translate-y-0.5 enabled:hover:bg-indigo-800 enabled:hover:shadow-lg focus-visible:ring-indigo-500 disabled:opacity-45 dark:border-indigo-600 dark:bg-indigo-700 dark:hover:bg-indigo-600"><Printer className="h-4 w-4" />{printing ? 'جارٍ تجهيز الصور والتقرير...' : 'طباعة / PDF مع الصور'}</Button>
            <Button type="button" variant="outline" className="border-slate-300 bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 hover:text-slate-950 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700" onClick={() => setOpen(false)}>إغلاق</Button>
          </DialogFooter>
          <style>{'#central-buildings-reports-view.iau-report-cards-mode td, #central-buildings-reports-view.iau-report-cards-mode th {position:static!important;}'}</style>
        </DialogContent>
      </Dialog>
    </>
  );
};
