import React from 'react';
import * as XLSX from 'xlsx';
import { Eye, FileSpreadsheet, Printer, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { MosqueBuilding } from '../api/mosques';
import { appendExcelReportSheet, excelReportDateStamp, writeProfessionalExcel } from '../utils/excelReport';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';
import { ReportViewToggle } from './ReportViewToggle';

const coverageLabels: Record<string, string> = {
  unassessed: 'لم يتم التقييم',
  covered: 'مغطى بخدمة الصلاة',
  needs_prayer_room: 'يحتاج مصلى',
  under_feasibility_study: 'قيد دراسة إمكانية الإنشاء',
  not_feasible_alternative: 'تعذر الإنشاء / بديل معتمد',
  under_implementation: 'مصلى تحت التنفيذ',
};

const feasibilityLabels: Record<string, string> = {
  available: 'متاح إنشاء مصلى',
  unavailable: 'غير متاح إنشاء مصلى',
  under_study: 'قيد الدراسة',
};

type Presence = 'present' | 'absent' | 'unknown';
const presenceLabels: Record<Presence, string> = {
  present: 'موجود',
  absent: 'غير موجود — تم التحقق',
  unknown: 'لم يتم التحقق',
};

const prayerRoomPresence = (building: MosqueBuilding, gender: 'men' | 'women'): Presence => {
  const linked = Boolean(building.sites?.some((site) =>
    site.siteType === 'prayer_room' && site.prayerRoomGender === gender && site.status !== 'temporarily_closed'
  ));
  if (linked) return 'present';
  return building.coverageStatus === 'unassessed' ? 'unknown' : 'absent';
};

type ColumnKey =
  | 'buildingNumber'
  | 'name'
  | 'campus'
  | 'city'
  | 'district'
  | 'men'
  | 'women'
  | 'coverage'
  | 'feasibility'
  | 'expectedUsers'
  | 'linkedSites'
  | 'coordinates'
  | 'unavailableReason'
  | 'approvedAlternative'
  | 'notes';

type ColumnDef = {
  key: ColumnKey;
  label: string;
  value: (building: MosqueBuilding) => string | number;
};

const columns: ColumnDef[] = [
  { key: 'buildingNumber', label: 'رقم المبنى', value: (b) => b.buildingNumber || '-' },
  { key: 'name', label: 'اسم المبنى', value: (b) => b.name || '-' },
  { key: 'campus', label: 'الحرم / الموقع', value: (b) => b.campusLocation || '-' },
  { key: 'city', label: 'المدينة', value: (b) => b.city || '-' },
  { key: 'district', label: 'الحي', value: (b) => b.district || '-' },
  { key: 'men', label: 'مصلى الرجال', value: (b) => presenceLabels[prayerRoomPresence(b, 'men')] },
  { key: 'women', label: 'مصلى النساء', value: (b) => presenceLabels[prayerRoomPresence(b, 'women')] },
  { key: 'coverage', label: 'حالة التغطية', value: (b) => coverageLabels[b.coverageStatus] || b.coverageStatus },
  { key: 'feasibility', label: 'إمكانية إنشاء مصلى', value: (b) => feasibilityLabels[b.creationFeasibility] || b.creationFeasibility },
  { key: 'expectedUsers', label: 'المستفيدون المتوقعون', value: (b) => b.expectedUsers ?? '-' },
  { key: 'linkedSites', label: 'المواقع المرتبطة', value: (b) => b._count?.sites ?? b.sites?.length ?? 0 },
  { key: 'coordinates', label: 'الإحداثيات', value: (b) => b.latitude != null && b.longitude != null ? `${b.latitude}, ${b.longitude}` : '-' },
  { key: 'unavailableReason', label: 'سبب تعذر الإنشاء', value: (b) => b.unavailableReason || '-' },
  { key: 'approvedAlternative', label: 'البديل المعتمد', value: (b) => b.approvedAlternative || '-' },
  { key: 'notes', label: 'ملاحظات', value: (b) => b.notes || '-' },
];

const essentialColumns: ColumnKey[] = [
  'buildingNumber', 'name', 'campus', 'city', 'men', 'women', 'coverage', 'feasibility', 'expectedUsers',
];

const allColumnKeys = columns.map((column) => column.key);
const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[char] || char));

const normalizeArabicSearch = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase('ar');

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildings: MosqueBuilding[];
  canPrint: boolean;
};

type SortBy = 'buildingNumber' | 'name' | 'campus' | 'coverage';
type PresenceFilter = 'all' | Presence;
type CoordinatesFilter = 'all' | 'with' | 'without';
type PaperSize = 'A4' | 'A3';
type Orientation = 'landscape' | 'portrait';

type Filters = {
  search: string;
  campus: string;
  city: string;
  coverage: string;
  feasibility: string;
  men: PresenceFilter;
  women: PresenceFilter;
  coordinates: CoordinatesFilter;
  sortBy: SortBy;
  sortDirection: 'asc' | 'desc';
};

const defaultFilters: Filters = {
  search: '', campus: 'all', city: 'all', coverage: 'all', feasibility: 'all', men: 'all', women: 'all', coordinates: 'all', sortBy: 'buildingNumber', sortDirection: 'asc',
};

export const BuildingCoverageReportsDialog: React.FC<Props> = ({ open, onOpenChange, buildings, canPrint }) => {
  const [filters, setFilters] = React.useState<Filters>(defaultFilters);
  const [selectedColumns, setSelectedColumns] = React.useState<ColumnKey[]>(essentialColumns);
  const [title, setTitle] = React.useState('تقرير تغطية المباني بخدمة الصلاة');
  const [paperSize, setPaperSize] = React.useState<PaperSize>('A4');
  const [orientation, setOrientation] = React.useState<Orientation>('landscape');
  const [compact, setCompact] = React.useState(true);
  const [exporting, setExporting] = React.useState(false);

  const campuses = React.useMemo(() => Array.from(new Set(buildings.map((b) => b.campusLocation).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')), [buildings]);
  const cities = React.useMemo(() => Array.from(new Set(buildings.map((b) => b.city).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'ar')), [buildings]);

  const filteredBuildings = React.useMemo(() => {
    const query = normalizeArabicSearch(filters.search);
    const rows = buildings.filter((building) => {
      const men = prayerRoomPresence(building, 'men');
      const women = prayerRoomPresence(building, 'women');
      if (filters.campus !== 'all' && (building.campusLocation || '') !== filters.campus) return false;
      if (filters.city !== 'all' && (building.city || '') !== filters.city) return false;
      if (filters.coverage !== 'all' && building.coverageStatus !== filters.coverage) return false;
      if (filters.feasibility !== 'all' && building.creationFeasibility !== filters.feasibility) return false;
      if (filters.men !== 'all' && men !== filters.men) return false;
      if (filters.women !== 'all' && women !== filters.women) return false;
      if (filters.coordinates === 'with' && (building.latitude == null || building.longitude == null)) return false;
      if (filters.coordinates === 'without' && building.latitude != null && building.longitude != null) return false;
      if (query) {
        const haystack = normalizeArabicSearch([
          building.buildingNumber, building.name, building.campusLocation, building.city, building.district,
          coverageLabels[building.coverageStatus], feasibilityLabels[building.creationFeasibility], building.notes,
          building.unavailableReason, building.approvedAlternative,
        ].filter(Boolean).join(' '));
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const value = (building: MosqueBuilding) => {
      if (filters.sortBy === 'name') return building.name || '';
      if (filters.sortBy === 'campus') return building.campusLocation || '';
      if (filters.sortBy === 'coverage') return coverageLabels[building.coverageStatus] || building.coverageStatus;
      return building.buildingNumber || '';
    };
    rows.sort((a, b) => value(a).localeCompare(value(b), 'ar', { numeric: true, sensitivity: 'base' }) * (filters.sortDirection === 'asc' ? 1 : -1));
    return rows;
  }, [buildings, filters]);

  const selectedDefs = React.useMemo(() => columns.filter((column) => selectedColumns.includes(column.key)), [selectedColumns]);

  const metrics = React.useMemo(() => {
    const noPrayerRooms = filteredBuildings.filter((b) => prayerRoomPresence(b, 'men') === 'absent' && prayerRoomPresence(b, 'women') === 'absent').length;
    return {
      total: filteredBuildings.length,
      covered: filteredBuildings.filter((b) => b.coverageStatus === 'covered').length,
      noPrayerRooms,
      missingMen: filteredBuildings.filter((b) => prayerRoomPresence(b, 'men') === 'absent').length,
      missingWomen: filteredBuildings.filter((b) => prayerRoomPresence(b, 'women') === 'absent').length,
      needs: filteredBuildings.filter((b) => b.coverageStatus === 'needs_prayer_room').length,
    };
  }, [filteredBuildings]);

  const filterSummary = React.useMemo(() => {
    const parts: string[] = [];
    if (filters.search.trim()) parts.push(`بحث: ${filters.search.trim()}`);
    if (filters.campus !== 'all') parts.push(`الحرم: ${filters.campus}`);
    if (filters.city !== 'all') parts.push(`المدينة: ${filters.city}`);
    if (filters.coverage !== 'all') parts.push(`التغطية: ${coverageLabels[filters.coverage] || filters.coverage}`);
    if (filters.feasibility !== 'all') parts.push(`إمكانية الإنشاء: ${feasibilityLabels[filters.feasibility] || filters.feasibility}`);
    if (filters.men !== 'all') parts.push(`رجال: ${presenceLabels[filters.men]}`);
    if (filters.women !== 'all') parts.push(`نساء: ${presenceLabels[filters.women]}`);
    if (filters.coordinates !== 'all') parts.push(filters.coordinates === 'with' ? 'بإحداثيات' : 'بدون إحداثيات');
    return parts.length ? parts.join(' | ') : 'جميع المباني دون تصفية';
  }, [filters]);

  const applyPreset = (preset: 'all' | 'none' | 'men' | 'women' | 'needs' | 'covered' | 'unassessed') => {
    if (preset === 'all') return setFilters(defaultFilters);
    if (preset === 'none') return setFilters({ ...defaultFilters, men: 'absent', women: 'absent' });
    if (preset === 'men') return setFilters({ ...defaultFilters, men: 'absent' });
    if (preset === 'women') return setFilters({ ...defaultFilters, women: 'absent' });
    if (preset === 'needs') return setFilters({ ...defaultFilters, coverage: 'needs_prayer_room' });
    if (preset === 'covered') return setFilters({ ...defaultFilters, coverage: 'covered' });
    setFilters({ ...defaultFilters, coverage: 'unassessed' });
  };

  const toggleColumn = (key: ColumnKey) => {
    setSelectedColumns((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  };

  const buildRows = () => filteredBuildings.map((building, index) => {
    const row: Record<string, string | number> = { 'م': index + 1 };
    selectedDefs.forEach((column) => { row[column.label] = column.value(building); });
    return row;
  });

  const exportExcel = async () => {
    if (!filteredBuildings.length) return toast.info('لا توجد بيانات مطابقة للتقرير');
    if (!selectedDefs.length) return toast.info('اختر عمودًا واحدًا على الأقل');
    setExporting(true);
    try {
      const workbook = XLSX.utils.book_new();
      appendExcelReportSheet(workbook, 'تغطية المباني', buildRows());
      await writeProfessionalExcel(workbook, `building-prayer-coverage-${excelReportDateStamp()}.xlsx`, {
        title: title.trim() || 'تقرير تغطية المباني بخدمة الصلاة',
        subtitle: 'وحدة العناية بالمساجد والمصليات الجامعية',
        filters: filterSummary,
        orientation,
        metrics: [
          { label: 'النتائج', value: metrics.total, tone: 'blue' },
          { label: 'مغطاة', value: metrics.covered, tone: 'green' },
          { label: 'بدون أي مصلى', value: metrics.noPrayerRooms, tone: 'red' },
          { label: 'ينقصها رجال', value: metrics.missingMen, tone: 'amber' },
          { label: 'ينقصها نساء', value: metrics.missingWomen, tone: 'amber' },
          { label: 'تحتاج مصلى', value: metrics.needs, tone: 'amber' },
        ],
      });
      toast.success('تم تجهيز تقرير Excel الاحترافي');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تجهيز تقرير Excel');
    } finally {
      setExporting(false);
    }
  };

  const openPrintReport = (autoPrint: boolean) => {
    if (!canPrint) return toast.error('ليست لديك صلاحية الطباعة');
    if (!filteredBuildings.length) return toast.info('لا توجد بيانات مطابقة للتقرير');
    if (!selectedDefs.length) return toast.info('اختر عمودًا واحدًا على الأقل');
    const win = window.open('', '_blank', 'width=1500,height=950');
    if (!win) return toast.error('تعذر فتح نافذة التقرير. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.');
    const head = ['م', ...selectedDefs.map((column) => column.label)].map((label) => `<th>${escapeHtml(label)}</th>`).join('');
    const body = filteredBuildings.map((building, index) => `<tr><td>${index + 1}</td>${selectedDefs.map((column) => `<td>${escapeHtml(column.value(building))}</td>`).join('')}</tr>`).join('');
    const generatedAt = new Date().toLocaleString('ar-SA-u-ca-gregory');
    const fontSize = compact ? 7.4 : 9;
    const padding = compact ? '4px 3px' : '7px 5px';
    const script = autoPrint ? '<script>window.onload=()=>setTimeout(()=>window.print(),300)<\\/script>' : '';
    win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
      @page{size:${paperSize} ${orientation};margin:8mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:Tahoma,Arial,sans-serif;color:#172033;margin:0;direction:rtl}.header{border:1.5px solid #94a3b8;border-radius:14px;padding:14px;background:linear-gradient(110deg,#eff6ff,#fff,#ecfdf5)}.unit{font-size:9px;color:#0f766e;font-weight:800}.header h1{font-size:22px;margin:5px 0}.meta{font-size:9px;color:#64748b}.filters{font-size:9px;margin-top:8px;border-top:1px solid #dbeafe;padding-top:7px}.metrics{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:10px 0}.metric{border:1px solid #cbd5e1;border-radius:9px;padding:7px;text-align:center;background:#f8fafc}.metric span{display:block;color:#64748b;font-size:7px}.metric b{display:block;font-size:15px;margin-top:2px}.table-wrap{overflow:hidden;border-radius:9px;border:1px solid #cbd5e1}table{width:100%;border-collapse:collapse;table-layout:auto}th,td{border:1px solid #cbd5e1;padding:${padding};text-align:center;vertical-align:middle;line-height:1.45;word-break:break-word}th{background:#e0f2fe;font-weight:900;font-size:${Math.max(7.5, fontSize)}px}td{font-size:${fontSize}px}tbody tr:nth-child(even){background:#f8fafc}.footer{margin-top:10px;border-top:1px solid #e2e8f0;padding-top:6px;color:#64748b;font-size:8px;display:flex;justify-content:space-between}thead{display:table-header-group}tr{break-inside:avoid}@media print{.no-print{display:none!important}}
    </style></head><body><header class="header"><div class="unit">جامعة الإمام عبدالرحمن بن فيصل — وحدة العناية بالمساجد والمصليات الجامعية</div><h1>${escapeHtml(title.trim() || 'تقرير تغطية المباني بخدمة الصلاة')}</h1><div class="meta">تاريخ الاستخراج: ${escapeHtml(generatedAt)} — عدد النتائج: ${filteredBuildings.length}</div><div class="filters"><b>معايير التقرير:</b> ${escapeHtml(filterSummary)}</div></header><div class="metrics"><div class="metric"><span>النتائج</span><b>${metrics.total}</b></div><div class="metric"><span>مغطاة</span><b>${metrics.covered}</b></div><div class="metric"><span>بدون أي مصلى</span><b>${metrics.noPrayerRooms}</b></div><div class="metric"><span>ينقصها رجال</span><b>${metrics.missingMen}</b></div><div class="metric"><span>ينقصها نساء</span><b>${metrics.missingWomen}</b></div><div class="metric"><span>تحتاج مصلى</span><b>${metrics.needs}</b></div></div><div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><div class="footer"><span>منصة إدارة الأملاك والأراضي — تقرير تغطية المباني بخدمة الصلاة</span><span>${escapeHtml(generatedAt)}</span></div>${script}</body></html>`);
    win.document.close();
  };

  const reset = () => {
    setFilters(defaultFilters);
    setSelectedColumns(essentialColumns);
    setTitle('تقرير تغطية المباني بخدمة الصلاة');
    setPaperSize('A4');
    setOrientation('landscape');
    setCompact(true);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent id="building-coverage-reports-view" className="max-h-[94dvh] overflow-y-auto sm:max-w-[1180px]" dir="rtl">
      <DialogHeader className="text-right">
        <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-700" />تقارير تغطية المباني بخدمة الصلاة</DialogTitle>
        <DialogDescription>أنشئ تقريرًا مرنًا من المباني الظاهرة في ملف التغطية، ثم عاينه أو اطبعه/احفظه PDF أو صدّره إلى Excel احترافي.</DialogDescription>
      </DialogHeader>
          {/* IAU_REPORT_VIEW_TOGGLE_PLATFORM_V1 */}
          <div className="flex justify-end"><ReportViewToggle storageKey="iau-building-coverage-reports-view" scopeId="building-coverage-reports-view" /></div>

      <div className="space-y-5 py-2">
        <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-sky-950">تقارير جاهزة سريعة</p><p className="text-xs text-slate-600">يمكنك اختيار نموذج ثم تعديل أي فلتر أو عمود قبل التصدير.</p></div><Badge variant="outline" className="bg-white">{filteredBuildings.length} نتيجة</Badge></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('all')}>جميع المباني</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('none')}>بدون أي مصلى</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('men')}>لا يوجد مصلى رجال</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('women')}>لا يوجد مصلى نساء</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('needs')}>تحتاج مصلى</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('covered')}>مغطاة</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => applyPreset('unassessed')}>لم يتم تقييمها</Button>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2"><div><p className="font-black text-slate-800">التصفية والفرز</p><p className="text-xs text-slate-500">كل ما تختاره هنا ينعكس مباشرة على PDF والطباعة وExcel.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setFilters(defaultFilters)}><RotateCcw className="ml-1 h-3.5 w-3.5" />مسح الفلاتر</Button></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2"><Label className="mb-1.5 block">بحث</Label><Search className="absolute right-3 top-[37px] h-4 w-4 text-slate-400" /><Input className="pr-9" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="رقم المبنى، الاسم، الحرم، المدينة، الملاحظات..." /></div>
            <Field label="الحرم / الموقع"><NativeSelect value={filters.campus} onChange={(e) => setFilters({ ...filters, campus: e.target.value })}><option value="all">جميع المواقع</option>{campuses.map((item) => <option key={item} value={item}>{item}</option>)}</NativeSelect></Field>
            <Field label="المدينة"><NativeSelect value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}><option value="all">جميع المدن</option>{cities.map((item) => <option key={item} value={item}>{item}</option>)}</NativeSelect></Field>
            <Field label="حالة التغطية"><NativeSelect value={filters.coverage} onChange={(e) => setFilters({ ...filters, coverage: e.target.value })}><option value="all">جميع الحالات</option>{Object.entries(coverageLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
            <Field label="إمكانية الإنشاء"><NativeSelect value={filters.feasibility} onChange={(e) => setFilters({ ...filters, feasibility: e.target.value })}><option value="all">جميع الحالات</option>{Object.entries(feasibilityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
            <Field label="مصلى الرجال"><NativeSelect value={filters.men} onChange={(e) => setFilters({ ...filters, men: e.target.value as PresenceFilter })}><option value="all">الكل</option>{Object.entries(presenceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
            <Field label="مصلى النساء"><NativeSelect value={filters.women} onChange={(e) => setFilters({ ...filters, women: e.target.value as PresenceFilter })}><option value="all">الكل</option>{Object.entries(presenceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</NativeSelect></Field>
            <Field label="الإحداثيات"><NativeSelect value={filters.coordinates} onChange={(e) => setFilters({ ...filters, coordinates: e.target.value as CoordinatesFilter })}><option value="all">الكل</option><option value="with">بإحداثيات</option><option value="without">بدون إحداثيات</option></NativeSelect></Field>
            <Field label="الفرز حسب"><NativeSelect value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as SortBy })}><option value="buildingNumber">رقم المبنى</option><option value="name">اسم المبنى</option><option value="campus">الحرم / الموقع</option><option value="coverage">حالة التغطية</option></NativeSelect></Field>
            <Field label="اتجاه الفرز"><NativeSelect value={filters.sortDirection} onChange={(e) => setFilters({ ...filters, sortDirection: e.target.value as 'asc' | 'desc' })}><option value="asc">تصاعدي</option><option value="desc">تنازلي</option></NativeSelect></Field>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><p className="font-black text-slate-800">أعمدة التقرير</p><p className="text-xs text-slate-500">حدد المعلومات التي تريد ظهورها فقط.</p></div><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setSelectedColumns(essentialColumns)}>الأساسية</Button><Button type="button" size="sm" variant="outline" onClick={() => setSelectedColumns(allColumnKeys)}>تحديد الكل</Button></div></div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{columns.map((column) => <label key={column.key} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${selectedColumns.includes(column.key) ? 'border-sky-300 bg-sky-50' : 'bg-white'}`}><input type="checkbox" checked={selectedColumns.includes(column.key)} onChange={() => toggleColumn(column.key)} /><span>{column.label}</span></label>)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="mb-3 font-black text-slate-800">تنسيق PDF / الطباعة</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2"><Label className="mb-1.5 block">عنوان التقرير</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <Field label="حجم الورق"><NativeSelect value={paperSize} onChange={(e) => setPaperSize(e.target.value as PaperSize)}><option value="A4">A4</option><option value="A3">A3</option></NativeSelect></Field>
            <Field label="الاتجاه"><NativeSelect value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation)}><option value="landscape">عرضي</option><option value="portrait">طولي</option></NativeSelect></Field>
            <Field label="كثافة الجدول"><NativeSelect value={compact ? 'compact' : 'comfortable'} onChange={(e) => setCompact(e.target.value === 'compact')}><option value="compact">مضغوط — بيانات أكثر</option><option value="comfortable">مريح — خط أكبر</option></NativeSelect></Field>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Metric label="النتائج" value={metrics.total} />
          <Metric label="مغطاة" value={metrics.covered} />
          <Metric label="بدون أي مصلى" value={metrics.noPrayerRooms} />
          <Metric label="ينقصها رجال" value={metrics.missingMen} />
          <Metric label="ينقصها نساء" value={metrics.missingWomen} />
          <Metric label="تحتاج مصلى" value={metrics.needs} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600"><strong>المعايير الحالية:</strong> {filterSummary}<br /><strong>الأعمدة:</strong> {selectedDefs.length ? selectedDefs.map((column) => column.label).join('، ') : 'لم يتم اختيار أعمدة'}</div>
      </div>

      <DialogFooter className="flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={reset}><RotateCcw className="ml-2 h-4 w-4" />إعادة الضبط</Button>
        <div className="flex flex-wrap gap-2">
          {canPrint && <Button type="button" variant="outline" onClick={() => openPrintReport(false)}><Eye className="ml-2 h-4 w-4" />معاينة</Button>}
          {canPrint && <Button type="button" className="bg-sky-700 text-white hover:bg-sky-800" onClick={() => openPrintReport(true)}><Printer className="ml-2 h-4 w-4" />طباعة / PDF</Button>}
          <Button type="button" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={exporting} onClick={() => void exportExcel()}><FileSpreadsheet className="ml-2 h-4 w-4" />{exporting ? 'جاري تجهيز Excel...' : 'Excel احترافي'}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div><Label className="mb-1.5 block">{label}</Label>{children}</div>;
const Metric = ({ label, value }: { label: string; value: number }) => <div className="rounded-xl border bg-white px-3 py-3 text-center shadow-sm"><div className="text-[11px] text-slate-500">{label}</div><div className="mt-1 text-xl font-black text-slate-800">{value.toLocaleString('ar-SA')}</div></div>;
