import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { BarChart3, Download, Printer, Search, SlidersHorizontal } from 'lucide-react';
import { getPendingBuildingImport, isPendingImportedBuilding } from './BuildingExcelImportManager';
import type { MosqueBuilding } from '../api/mosques';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';

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
  { key: 'approval', label: 'حالة الاعتماد', width: 18 },
  { key: 'buildingNumber', label: 'رقم المبنى', width: 18 },
  { key: 'name', label: 'اسم المبنى', width: 34 },
  { key: 'campusLocation', label: 'الحرم / الموقع الجامعي', width: 28 },
  { key: 'city', label: 'المدينة', width: 18 },
  { key: 'district', label: 'الحي', width: 20 },
  { key: 'coordinates', label: 'الإحداثيات', width: 26 },
  { key: 'mosque', label: 'العناية بالمساجد', width: 18 },
  { key: 'assets', label: 'الأصول المرتبطة', width: 16 },
  { key: 'accounting', label: 'السجلات المحاسبية', width: 18 },
];

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

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
  const [linkType, setLinkType] = useState<'all' | 'mosque' | 'assets' | 'accounting' | 'unlinked'>('all');
  const [coordinates, setCoordinates] = useState<'all' | 'complete' | 'missing'>('all');
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(new Set(columns.map((item) => item.key)));

  const campusOptions = useMemo(() => Array.from(new Set(buildings.map((item) => effectiveBuilding(item).campusLocation).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')), [buildings]);
  const cityOptions = useMemo(() => Array.from(new Set(buildings.map((item) => effectiveBuilding(item).city).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ar')), [buildings]);

  const filtered = useMemo(() => {
    const needle = normalize(search);
    return buildings.filter((building) => {
      const data = effectiveBuilding(building);
      const itemUsage = usage.get(building.id);
      if (approval === 'approved' && data.pending) return false;
      if (approval === 'pending' && !data.pending) return false;
      if (campus !== 'all' && data.campusLocation !== campus) return false;
      if (city !== 'all' && data.city !== city) return false;
      const hasCoordinates = Number.isFinite(Number(data.latitude)) && Number.isFinite(Number(data.longitude));
      if (coordinates === 'complete' && !hasCoordinates) return false;
      if (coordinates === 'missing' && hasCoordinates) return false;
      if (linkType === 'mosque' && !itemUsage?.mosqueProfile) return false;
      if (linkType === 'assets' && !(itemUsage?.assets || 0)) return false;
      if (linkType === 'accounting' && !(itemUsage?.accounting || 0)) return false;
      if (linkType === 'unlinked' && (itemUsage?.mosqueProfile || (itemUsage?.assets || 0) > 0 || (itemUsage?.accounting || 0) > 0)) return false;
      if (needle && ![data.buildingNumber, data.name, data.campusLocation, data.city, data.district].some((value) => normalize(value).includes(needle))) return false;
      return true;
    });
  }, [approval, buildings, campus, city, coordinates, linkType, search, usage]);

  const summary = useMemo(() => ({
    total: filtered.length,
    approved: filtered.filter((item) => !isPendingImportedBuilding(item)).length,
    pending: filtered.filter((item) => isPendingImportedBuilding(item)).length,
    coordinates: filtered.filter((item) => {
      const data = effectiveBuilding(item);
      return Number.isFinite(Number(data.latitude)) && Number.isFinite(Number(data.longitude));
    }).length,
  }), [filtered]);

  const activeColumns = columns.filter((column) => selectedColumns.has(column.key));

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
      case 'coordinates': return Number.isFinite(Number(data.latitude)) && Number.isFinite(Number(data.longitude)) ? `${data.latitude}, ${data.longitude}` : '—';
      case 'mosque': return itemUsage?.mosqueProfile ? Math.max(itemUsage.mosqueSites || 0, 1) : 0;
      case 'assets': return itemUsage?.assets || 0;
      case 'accounting': return itemUsage?.accounting || 0;
      default: return '';
    }
  };

  const exportExcel = () => {
    const chosen = activeColumns.length ? activeColumns : columns;
    const rows = filtered.map((building) => Object.fromEntries(chosen.map((column) => [column.label, cellValue(building, column.key)])));
    const worksheet = XLSX.utils.json_to_sheet(rows, { header: chosen.map((column) => column.label) });
    worksheet['!cols'] = chosen.map((column) => ({ wch: column.width }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'تقرير المباني');
    XLSX.writeFile(workbook, `تقرير-السجل-المركزي-للمباني-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const printReport = () => {
    const chosen = activeColumns.length ? activeColumns : columns;
    const popup = window.open('', '_blank', 'noopener,noreferrer,width=1400,height=900');
    if (!popup) return;
    const rows = filtered.map((building) => `<tr>${chosen.map((column) => `<td>${escapeHtml(cellValue(building, column.key))}</td>`).join('')}</tr>`).join('');
    popup.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>تقرير السجل المركزي للمباني</title><style>body{font-family:Arial,Tahoma,sans-serif;padding:24px;color:#172033}h1{font-size:22px;margin:0 0 8px}.meta{color:#667085;font-size:12px;margin-bottom:18px}.stats{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.stat{border:1px solid #d7dee8;border-radius:10px;padding:8px 12px;font-size:12px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #d8dee8;padding:7px;text-align:right}th{background:#eef5f7;font-weight:700}@media print{body{padding:0}.no-print{display:none}table{font-size:9px}}</style></head><body><div class="no-print" style="margin-bottom:12px"><button onclick="window.print()">طباعة / حفظ PDF</button></div><h1>تقرير السجل المركزي للمباني</h1><div class="meta">تاريخ التقرير: ${escapeHtml(new Date().toLocaleString('ar-SA'))}</div><div class="stats"><span class="stat">النتائج: ${summary.total}</span><span class="stat">المعتمد: ${summary.approved}</span><span class="stat">المعلق: ${summary.pending}</span><span class="stat">بإحداثيات: ${summary.coordinates}</span></div><table><thead><tr>${chosen.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></body></html>`);
    popup.document.close();
    popup.focus();
  };

  const resetFilters = () => {
    setSearch('');
    setApproval('all');
    setCampus('all');
    setCity('all');
    setLinkType('all');
    setCoordinates('all');
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <BarChart3 className="h-4 w-4" />
        التقارير
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-[96vw] overflow-y-auto sm:max-w-6xl" dir="rtl">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />تقارير السجل المركزي للمباني</DialogTitle>
            <DialogDescription>تقارير مرنة مع فلترة النتائج، اختيار الأعمدة، التصدير إلى Excel والطباعة أو الحفظ PDF.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 rounded-2xl border bg-muted/20 p-4 md:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-1.5 xl:col-span-2"><Label>بحث</Label><div className="relative"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" placeholder="رقم أو اسم المبنى..." /></div></div>
            <div className="space-y-1.5"><Label>حالة الاعتماد</Label><NativeSelect value={approval} onChange={(e) => setApproval(e.target.value as typeof approval)}><option value="all">الكل</option><option value="approved">معتمد</option><option value="pending">معلق للمراجعة</option></NativeSelect></div>
            <div className="space-y-1.5"><Label>الحرم / الموقع</Label><NativeSelect value={campus} onChange={(e) => setCampus(e.target.value)}><option value="all">كل المواقع</option>{campusOptions.map((value) => <option key={value} value={value}>{value}</option>)}</NativeSelect></div>
            <div className="space-y-1.5"><Label>المدينة</Label><NativeSelect value={city} onChange={(e) => setCity(e.target.value)}><option value="all">كل المدن</option>{cityOptions.map((value) => <option key={value} value={value}>{value}</option>)}</NativeSelect></div>
            <div className="space-y-1.5"><Label>الإحداثيات</Label><NativeSelect value={coordinates} onChange={(e) => setCoordinates(e.target.value as typeof coordinates)}><option value="all">الكل</option><option value="complete">مكتملة</option><option value="missing">ناقصة</option></NativeSelect></div>
            <div className="space-y-1.5 xl:col-span-2"><Label>الارتباط بالوحدات</Label><NativeSelect value={linkType} onChange={(e) => setLinkType(e.target.value as typeof linkType)}><option value="all">كل المباني</option><option value="mosque">العناية بالمساجد والمصليات</option><option value="assets">وحدة الأصول</option><option value="accounting">التحول المحاسبي</option><option value="unlinked">غير مرتبط بأي وحدة</option></NativeSelect></div>
            <div className="flex items-end xl:col-span-2"><Button type="button" variant="ghost" onClick={resetFilters}><SlidersHorizontal className="h-4 w-4" />إعادة ضبط الفلاتر</Button></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[['النتائج', summary.total], ['المباني المعتمدة', summary.approved], ['معلق للمراجعة', summary.pending], ['بإحداثيات مكتملة', summary.coordinates]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-background p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>)}
          </div>

          <div className="rounded-2xl border p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><div className="font-black">أعمدة التقرير</div><p className="text-xs text-muted-foreground">اختر المعلومات التي تريد إظهارها في Excel والطباعة.</p></div><Badge variant="secondary">{selectedColumns.size} عمود</Badge></div>
            <div className="flex flex-wrap gap-2">{columns.map((column) => <label key={column.key} className={`cursor-pointer rounded-xl border px-3 py-2 text-xs font-bold transition ${selectedColumns.has(column.key) ? 'border-primary/40 bg-primary/5 text-primary' : 'bg-background text-muted-foreground'}`}><input type="checkbox" className="ml-2 align-middle" checked={selectedColumns.has(column.key)} onChange={() => setSelectedColumns((current) => { const next = new Set(current); if (next.has(column.key)) next.delete(column.key); else next.add(column.key); return next; })} />{column.label}</label>)}</div>
          </div>

          <div className="overflow-hidden rounded-2xl border">
            <div className="flex items-center justify-between gap-2 border-b bg-muted/25 px-4 py-3"><div className="font-black">معاينة النتائج</div><div className="text-xs text-muted-foreground">{usageLoading ? 'مؤشرات الارتباط قيد التحميل...' : `عرض أول ${Math.min(filtered.length, 100)} من ${filtered.length}`}</div></div>
            <div className="max-h-[360px] overflow-auto"><table className="w-full min-w-[900px] text-xs"><thead className="sticky top-0 bg-background"><tr>{(activeColumns.length ? activeColumns : columns).map((column) => <th key={column.key} className="border-b px-3 py-2 text-right font-black">{column.label}</th>)}</tr></thead><tbody>{filtered.slice(0, 100).map((building) => <tr key={building.id} className="border-b last:border-b-0 hover:bg-muted/20">{(activeColumns.length ? activeColumns : columns).map((column) => <td key={column.key} className="px-3 py-2">{String(cellValue(building, column.key))}</td>)}</tr>)}</tbody></table></div>
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" onClick={exportExcel} disabled={!filtered.length}><Download className="h-4 w-4" />تصدير Excel</Button>
            <Button type="button" variant="outline" onClick={printReport} disabled={!filtered.length}><Printer className="h-4 w-4" />طباعة / PDF</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
