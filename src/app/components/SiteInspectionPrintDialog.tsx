import React from 'react';
import { Printer, Search, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { SiteInspection } from '../../types/siteInspection';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import {
  defaultInspectionPrintColumns,
  inspectionPrintColumns,
  openSiteInspectionTableReport,
  type InspectionPrintColumn,
} from '../utils/siteInspectionTabularPrint';

const workflows = [
  { value: 'new', label: 'جديدة' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'referred', label: 'تمت الإحالة' },
  { value: 'in_progress', label: 'جارٍ التنفيذ' },
  { value: 'resolved', label: 'تمت المعالجة' },
  { value: 'closed', label: 'مغلقة' },
];
const conditions = [
  { value: 'excellent', label: 'ممتازة' },
  { value: 'good', label: 'جيدة' },
  { value: 'follow_up', label: 'تحتاج متابعة' },
  { value: 'maintenance', label: 'تحتاج صيانة' },
  { value: 'major_notes', label: 'ملاحظات جوهرية' },
  { value: 'emergency', label: 'حالة طارئة' },
];

type Props = {
  records: SiteInspection[];
  target?: SiteInspection;
  initialSearch?: string;
  onClose: () => void;
};

const parseDate = (value: string): number => {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const SiteInspectionPrintDialog: React.FC<Props> = ({
  records, target, initialSearch = '', onClose,
}) => {
  const individual = Boolean(target);
  const [title, setTitle] = React.useState(
    target ? 'تقرير معاينة ' + target.inspectionNumber : 'التقرير الشامل للمعاينات الميدانية'
  );
  const [query, setQuery] = React.useState(target ? '' : initialSearch);
  const [workflow, setWorkflow] = React.useState('');
  const [condition, setCondition] = React.useState('');
  const [city, setCity] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [sortBy, setSortBy] = React.useState('visitDate');
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('desc');
  const [includePhotos, setIncludePhotos] = React.useState(Boolean(target));
  const [columns, setColumns] = React.useState<InspectionPrintColumn[]>(defaultInspectionPrintColumns);
  const [preparing, setPreparing] = React.useState(false);

  const cities = React.useMemo(() =>
    Array.from(new Set(records.map((record) => (record.city || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'ar')), [records]);

  const matches = React.useMemo(() => {
    if (target) return [target];
    const needle = query.trim().toLocaleLowerCase('ar');
    const fromTime = from ? parseDate(from + 'T00:00:00') : 0;
    const toTime = to ? parseDate(to + 'T23:59:59') : Number.MAX_SAFE_INTEGER;
    const filtered = records.filter((record) => {
      const textMatches = !needle || [
        record.inspectionNumber, record.title, record.siteName, record.city,
        record.district, record.deed?.deedNumber, record.building?.name,
        record.observations, record.inspectorName,
      ].some((value) => String(value || '').toLocaleLowerCase('ar').includes(needle));
      return textMatches
        && (!workflow || record.workflowStatus === workflow)
        && (!condition || record.overallStatus === condition)
        && (!city || record.city === city)
        && parseDate(record.visitDate) >= fromTime
        && parseDate(record.visitDate) <= toTime;
    });
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return filtered.sort((a, b) => {
      if (sortBy === 'visitDate') return (parseDate(a.visitDate) - parseDate(b.visitDate)) * multiplier;
      const first = String(a[sortBy as 'inspectionNumber' | 'siteName' | 'workflowStatus'] || '');
      const second = String(b[sortBy as 'inspectionNumber' | 'siteName' | 'workflowStatus'] || '');
      return first.localeCompare(second, 'ar', { numeric: true }) * multiplier;
    });
  }, [records, target, query, workflow, condition, city, from, to, sortBy, sortDirection]);

  const toggleColumn = (key: InspectionPrintColumn, checked: boolean) => {
    setColumns((current) => checked ? [...current, key] : current.filter((item) => item !== key));
  };

  const print = async () => {
    if (!matches.length) return toast.error('لا توجد معاينات مطابقة لمعايير التقرير');
    if (!columns.length) return toast.error('اختر عمودًا واحدًا على الأقل');
    setPreparing(true);
    try {
      const criteria = individual ? 'معاينة محددة: ' + target?.inspectionNumber : [
        query.trim() ? 'بحث: ' + query.trim() : '',
        workflow ? 'الحالة: ' + (workflows.find((item) => item.value === workflow)?.label || workflow) : '',
        condition ? 'الحالة العامة: ' + (conditions.find((item) => item.value === condition)?.label || condition) : '',
        city ? 'المدينة: ' + city : '',
        from ? 'من: ' + from : '',
        to ? 'إلى: ' + to : '',
        'الترتيب: ' + (sortBy === 'visitDate' ? 'تاريخ الزيارة' : sortBy === 'siteName' ? 'الموقع' : sortBy === 'workflowStatus' ? 'الحالة' : 'رقم المعاينة') +
          (sortDirection === 'asc' ? ' تصاعدي' : ' تنازلي'),
      ].filter(Boolean).join(' | ');

      const success = await openSiteInspectionTableReport(matches, {
        title: title.trim() || 'تقرير المعاينات الميدانية',
        columns, includePhotos, criteria,
      });
      if (!success) toast.error('تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر تجهيز تقرير الطباعة');
    } finally {
      setPreparing(false);
    }
  };

  const fieldLabel = 'mb-1 block text-xs font-bold text-slate-700';

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !preparing) onClose(); }}>
      <DialogContent dir="rtl" className="max-h-[92vh] w-[min(960px,calc(100vw-2rem))] max-w-[960px] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-lg font-black text-emerald-950">
            <Printer className="h-5 w-5" /> إعداد التقرير الجدولي
          </DialogTitle>
          <DialogDescription className="text-right">
            {individual ? 'تقرير المعاينة المحددة، مع إمكانية اختيار الأعمدة والصور.' :
              'تصفية وفرز المعاينات وتحديد الأعمدة، ثم طباعة التقرير أو حفظه بصيغة PDF.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label htmlFor="inspection-report-title" className={fieldLabel}>عنوان التقرير</label>
            <Input id="inspection-report-title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          {!individual && (
            <section className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-3">
              <h3 className="font-black text-sky-950">معايير البحث والتصفية</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <label htmlFor="inspection-report-query" className={fieldLabel}>بحث برقم المعاينة أو اسم الموقع</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input id="inspection-report-query" className="pr-10" value={query}
                      onChange={(event) => setQuery(event.target.value)} placeholder="اكتب كلمات البحث..." />
                  </div>
                </div>
                <div>
                  <label htmlFor="inspection-report-workflow" className={fieldLabel}>حالة المعاينة</label>
                  <NativeSelect id="inspection-report-workflow" value={workflow} onChange={(event) => setWorkflow(event.target.value)}>
                    <option value="">جميع الحالات</option>
                    {workflows.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <label htmlFor="inspection-report-condition" className={fieldLabel}>الحالة العامة للموقع</label>
                  <NativeSelect id="inspection-report-condition" value={condition} onChange={(event) => setCondition(event.target.value)}>
                    <option value="">جميع الحالات</option>
                    {conditions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <label htmlFor="inspection-report-city" className={fieldLabel}>المدينة</label>
                  <NativeSelect id="inspection-report-city" value={city} onChange={(event) => setCity(event.target.value)}>
                    <option value="">جميع المدن</option>
                    {cities.map((value) => <option key={value} value={value}>{value}</option>)}
                  </NativeSelect>
                </div>
                <div>
                  <label htmlFor="inspection-report-from" className={fieldLabel}>تاريخ الزيارة من</label>
                  <Input id="inspection-report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
                </div>
                <div>
                  <label htmlFor="inspection-report-to" className={fieldLabel}>تاريخ الزيارة إلى</label>
                  <Input id="inspection-report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
                </div>
                <div>
                  <label htmlFor="inspection-report-sort" className={fieldLabel}>الفرز حسب</label>
                  <NativeSelect id="inspection-report-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                    <option value="visitDate">تاريخ الزيارة</option>
                    <option value="inspectionNumber">رقم المعاينة</option>
                    <option value="siteName">اسم الموقع</option>
                    <option value="workflowStatus">حالة المعاينة</option>
                  </NativeSelect>
                </div>
                <div>
                  <label htmlFor="inspection-report-direction" className={fieldLabel}>اتجاه الفرز</label>
                  <NativeSelect id="inspection-report-direction" value={sortDirection}
                    onChange={(event) => setSortDirection(event.target.value as 'asc' | 'desc')}>
                    <option value="desc">تنازلي</option>
                    <option value="asc">تصاعدي</option>
                  </NativeSelect>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => {
                setQuery(''); setWorkflow(''); setCondition(''); setCity('');
                setFrom(''); setTo(''); setSortBy('visitDate'); setSortDirection('desc');
              }}>مسح التصفية</Button>
            </section>
          )}

          <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-black text-emerald-950">أعمدة الجدول</h3>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() =>
                  setColumns(inspectionPrintColumns.map((column) => column.key))}>تحديد الكل</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setColumns(defaultInspectionPrintColumns)}>
                  الافتراضي
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {inspectionPrintColumns.map((column) => (
                <label key={column.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 text-sm">
                  <Checkbox checked={columns.includes(column.key)}
                    onCheckedChange={(value) => toggleColumn(column.key, value === true)} />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </section>

          <label className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
            <Checkbox checked={includePhotos} onCheckedChange={(value) => setIncludePhotos(value === true)} />
            <ImageIcon className="h-5 w-5 text-amber-800" />
            <span className="font-bold text-amber-950">إدراج الصور في التقرير</span>
            <span className="text-xs text-slate-600">
              {includePhotos ? 'ستظهر الصور في جدول ملحق ضمن التقرير' : 'تقرير جدولي بدون صور'}
            </span>
          </label>
          <p className="text-xs leading-5 text-slate-600">
            عرض الصور يعتمد على إمكان تحميلها من ملفات المعاينات. إذا تعذر تحميل إحداها فستظهر ملاحظة في التقرير.
            يمكن اختيار «حفظ بصيغة PDF» من نافذة الطباعة.
          </p>
        </div>

        <DialogFooter className="flex-row-reverse items-center justify-between gap-3 border-t pt-4">
          <div className="text-sm font-black text-emerald-950">
            المعاينات المطابقة: <span className="text-lg">{matches.length}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={preparing}>إلغاء</Button>
            <Button onClick={() => { void print(); }} disabled={preparing || !matches.length || !columns.length}>
              <Printer className="ml-2 h-4 w-4" />
              {preparing ? 'جارٍ تجهيز التقرير...' : 'استعراض / طباعة التقرير'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
