import React from 'react';
import {
  CalendarDays, FileText, Image as ImageIcon, ListChecks,
  Loader2, Printer, RotateCcw, Search, Users, X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  MosqueCompletionTaskAssignee, MosqueFieldTour, MosqueFieldVisit,
} from '../api/mosques';
import {
  MAX_TOURS_PER_PDF, MAX_TOUR_PDF_IMAGES, collectTourReportPhotos,
  prepareTourBatchPrint, type TourBatchImageMode, type TourBatchReportEntry,
} from '../utils/mosqueFieldTourBatchReport';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { NativeSelect } from './ui/native-select';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tours: MosqueFieldTour[];
  visits: MosqueFieldVisit[];
  users: MosqueCompletionTaskAssignee[];
};

type SortKey = 'date' | 'name' | 'status' | 'visits';
const statusLabels: Record<string, string> = {
  scheduled: 'مجدولة', in_progress: 'جارية', completed: 'مكتملة',
  postponed: 'مؤجلة', cancelled: 'ملغاة',
};
const localDate = (value: string) =>
  new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Riyadh' });
const normalizeName = (name: string) => name.trim().toLocaleLowerCase('ar');

export const MosqueFieldTourBatchReportsDialog: React.FC<Props> = ({
  open, onOpenChange, tours, visits, users,
}) => {
  const [title, setTitle] = React.useState('التقرير الشامل المصور للجولات الميدانية');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [userKey, setUserKey] = React.useState('');
  const [siteId, setSiteId] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [sortBy, setSortBy] = React.useState<SortKey>('date');
  const [direction, setDirection] = React.useState<'asc' | 'desc'>('desc');
  const [mode, setMode] = React.useState<'all' | 'selected'>('all');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [imageMode, setImageMode] = React.useState<TourBatchImageMode>('all');
  const [busy, setBusy] = React.useState(false);

  const byTour = React.useMemo(() => {
    const map = new Map<string, MosqueFieldVisit[]>();
    for (const visit of visits) {
      if (!visit.tourId) continue;
      const bucket = map.get(visit.tourId) || [];
      bucket.push(visit);
      map.set(visit.tourId, bucket);
    }
    for (const group of map.values()) {
      group.sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());
    }
    return map;
  }, [visits]);

  const namesById = React.useMemo(
    () => new Map(users.map((person) => [person.id, person.username])), [users]
  );

  const userOptions = React.useMemo(() => {
    const options = new Map<string, string>();
    for (const person of users) options.set('id:' + person.id, person.username);
    for (const tour of tours) {
      if (tour.createdBy && !options.has('id:' + tour.createdBy)) {
        options.set('id:' + tour.createdBy, 'مستخدم سابق — ' + tour.createdBy.slice(0, 8));
      }
    }
    for (const visit of visits) {
      if (visit.assignedToUserId && !options.has('id:' + visit.assignedToUserId)) {
        options.set('id:' + visit.assignedToUserId,
          visit.assignedToName || 'مستخدم سابق — ' + visit.assignedToUserId.slice(0, 8));
      } else if (!visit.assignedToUserId && visit.assignedToName) {
        options.set('name:' + normalizeName(visit.assignedToName), visit.assignedToName);
      }
    }
    return [...options.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ar'));
  }, [users, tours, visits]);

  const siteOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const visit of visits) map.set(visit.siteId, visit.site.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'ar'));
  }, [visits]);

  const allEntries = React.useMemo<TourBatchReportEntry[]>(() => tours.map((tour) => ({
    tour,
    creatorName: tour.createdByName || (tour.createdBy
      ? (namesById.get(tour.createdBy) || 'مستخدم سابق — ' + tour.createdBy.slice(0, 8))
      : 'غير مسجل'),
    visits: byTour.get(tour.id) || [],
  })).filter((entry) => entry.visits.length > 0), [tours, byTour, namesById]);

  const dateIsInvalid = Boolean(from && to && from > to);
  const filteredEntries = React.useMemo(() => {
    const needle = normalizeName(search);
    const selectedUser = userKey.startsWith('id:') ? userKey.slice(3) : '';
    const selectedName = userKey.startsWith('name:') ? userKey.slice(5) : '';
    const rows = allEntries.filter(({ tour, visits: tourVisits, creatorName }) => {
      // Cancelled tours remain retrievable for audit only when explicitly filtered.
      if (!status && tour.status === 'cancelled') return false;
      const date = localDate(tour.scheduledDate);
      if (from && date < from) return false;
      if (to && date > to) return false;
      if (status && tour.status !== status) return false;
      if (siteId && !tourVisits.some((visit) => visit.siteId === siteId)) return false;
      if (selectedUser && tour.createdBy !== selectedUser &&
        !tourVisits.some((visit) => visit.assignedToUserId === selectedUser)) return false;
      if (selectedName && !tourVisits.some((visit) =>
        normalizeName(visit.assignedToName || '') === selectedName)) return false;
      if (needle && ![tour.title, tour.tourNumber, tour.scope || '', creatorName,
        ...tourVisits.flatMap((visit) =>
          [visit.site.name, visit.visitNumber, visit.createdByName || '', visit.assignedToName || ''])]
        .some((value) => normalizeName(value).includes(needle))) return false;
      return true;
    });
    const sign = direction === 'asc' ? 1 : -1;
    return rows.sort((a, b) => {
      let compared = 0;
      if (sortBy === 'name') compared = a.tour.title.localeCompare(b.tour.title, 'ar');
      else if (sortBy === 'status') compared = (statusLabels[a.tour.status] || a.tour.status)
        .localeCompare(statusLabels[b.tour.status] || b.tour.status, 'ar');
      else if (sortBy === 'visits') compared = a.visits.length - b.visits.length;
      else compared = new Date(a.tour.scheduledDate).getTime() -
        new Date(b.tour.scheduledDate).getTime();
      return compared * sign || a.tour.tourNumber.localeCompare(b.tour.tourNumber, 'ar', { numeric: true });
    });
  }, [allEntries, search, status, userKey, siteId, from, to, sortBy, direction]);

  const selectedEntries = React.useMemo(() => (
    mode === 'all' ? filteredEntries : filteredEntries.filter((entry) => selectedIds.has(entry.tour.id))
  ), [mode, filteredEntries, selectedIds]);

  const imageCount = React.useMemo(
    () => collectTourReportPhotos(selectedEntries, imageMode).length,
    [selectedEntries, imageMode],
  );
  const visitCount = selectedEntries.reduce((total, item) => total + item.visits.length, 0);

  const reset = () => {
    setSearch(''); setStatus(''); setUserKey(''); setSiteId('');
    setFrom(''); setTo(''); setSortBy('date'); setDirection('desc');
    setMode('all'); setSelectedIds(new Set());
  };
  const setSelected = (id: string, checked: boolean) => {
    setMode('selected');
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const printSelected = async () => {
    if (busy) return;
    if (dateIsInvalid) return toast.error('تاريخ البداية يجب أن يسبق تاريخ النهاية.');
    if (!selectedEntries.length) return toast.error('اختر جولة واحدة على الأقل لطباعة التقرير.');
    if (selectedEntries.length > MAX_TOURS_PER_PDF) {
      return toast.error('التقرير يتجاوز ' + MAX_TOURS_PER_PDF +
        ' جولة؛ حدد نطاقًا زمنيًا أو مجموعة جولات أصغر للطباعة.');
    }
    if (imageCount > MAX_TOUR_PDF_IMAGES) {
      return toast.error('التقرير يحتوي ' + imageCount + ' صورة، والحد الأعلى ' +
        MAX_TOUR_PDF_IMAGES + ' صورة. اختر صورة لكل زيارة أو قلل الجولات المطلوبة.');
    }
    // Open on the click itself to avoid browser pop-up blockers.
    const popup = window.open('', '_blank', 'width=1300,height=850');
    if (!popup) return toast.error('يرجى السماح بفتح نافذة التقرير من المتصفح.');
    popup.opener = null;
    popup.document.open();
    popup.document.write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8">' +
      '<title>جاري تجهيز تقرير الجولات</title><body style="font:16px Tahoma;padding:40px">' +
      '<h2>جارٍ تحميل الزيارات والصور وإعداد التقرير الموحد...</h2>' +
      '<p>سيظهر زر الطباعة بعد اكتمال التجهيز.</p></body></html>');
    popup.document.close();

    const criteria = [
      'الجولات: ' + (mode === 'all' ? 'جميع الجولات المطابقة' : 'جولات محددة يدويًا'),
      search ? 'بحث: ' + search : '',
      siteId ? 'الموقع: ' + (siteOptions.find((x) => x[0] === siteId)?.[1] || 'موقع مختار') : '',
      status ? 'حالة الجولة: ' + statusLabels[status] : 'حالة الجولة: غير ملغاة',
      userKey ? 'اسم المستخدم (منشئ أو منفذ): ' +
        (userOptions.find((x) => x[0] === userKey)?.[1] || 'مستخدم مختار') : '',
      from ? 'من تاريخ: ' + from : '',
      to ? 'إلى تاريخ: ' + to : '',
      'الفرز: ' + ({ date: 'التاريخ', name: 'العنوان', status: 'الحالة', visits: 'عدد الزيارات' }[sortBy]) +
        (direction === 'asc' ? ' تصاعدي' : ' تنازلي'),
      'الصور: ' + (imageMode === 'all' ? 'جميع الصور' : imageMode === 'one_per_visit'
        ? 'صورة لكل زيارة' : 'بدون صور'),
    ].filter(Boolean);

    setBusy(true);
    try {
      await prepareTourBatchPrint({
        popup, title: title.trim() || 'التقرير الشامل المصور للجولات الميدانية',
        entries: selectedEntries, criteria, mode: imageMode,
      });
      if (!popup.closed) {
        toast.success('تم تجهيز تقرير واحد يضم ' + selectedEntries.length +
          ' جولة؛ يمكنك حفظه PDF من نافذة الطباعة.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر إعداد تقرير الجولات المصور.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}>
      <DialogContent
        dir="rtl"
        className="flex h-[min(94dvh,940px)] w-[calc(100vw-1rem)] max-w-[min(97vw,1120px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(97vw,1120px)]"
      >
        <DialogHeader className="shrink-0 border-b bg-background px-5 py-4 text-right sm:text-right">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Printer className="h-5 w-5 text-teal-700" />
            التقرير الشامل المصور للجولات الميدانية
          </DialogTitle>
          <DialogDescription className="text-right">
            تقرير PDF واحد؛ لكل جولة قسم مستقل، ويشمل الزيارات والمستخدمين ونتائج الفحص والصور حسب الاختيارات.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="field-tours-report-title">عنوان التقرير</Label>
            <Input
              id="field-tours-report-title"
              value={title}
              maxLength={180}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <section className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="flex items-center gap-2 text-sky-950">
                <Search className="h-4 w-4" /> تصفية الجولات وفرزها
              </b>
              <Button type="button" size="sm" variant="outline"
                className="border-amber-400 bg-amber-50 font-semibold text-amber-900 hover:bg-amber-100"
                onClick={reset}>
                <RotateCcw className="ml-1 h-4 w-4" /> إعادة ضبط
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative sm:col-span-2 lg:col-span-3">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث بعنوان الجولة أو رقمها أو المسجد أو اسم المستخدم"
                  aria-label="البحث في الجولات"
                  className="bg-white pr-9"
                />
              </div>
              <NativeSelect aria-label="تصفية حالة الجولة" value={status}
                onChange={(event) => setStatus(event.target.value)}>
                <option value="">جميع حالات الجولات</option>
                {Object.entries(statusLabels).map(([key, name]) =>
                  <option key={key} value={key}>{name}</option>)}
              </NativeSelect>
              <NativeSelect aria-label="تصفية الموقع" value={siteId}
                onChange={(event) => setSiteId(event.target.value)}>
                <option value="">جميع المواقع</option>
                {siteOptions.map(([id, name]) =>
                  <option key={id} value={id}>{name}</option>)}
              </NativeSelect>
              <NativeSelect aria-label="اسم المستخدم المنشئ أو المنفذ" value={userKey}
                onChange={(event) => setUserKey(event.target.value)}>
                <option value="">جميع المستخدمين</option>
                {userOptions.map(([key, name]) =>
                  <option key={key} value={key}>{name}</option>)}
              </NativeSelect>
              <div className="space-y-1">
                <Label htmlFor="field-tour-report-from">من تاريخ</Label>
                <Input type="date" id="field-tour-report-from" value={from}
                  onChange={(event) => setFrom(event.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="field-tour-report-to">إلى تاريخ</Label>
                <Input type="date" id="field-tour-report-to" value={to}
                  onChange={(event) => setTo(event.target.value)} className="bg-white" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="field-tour-report-sort">فرز حسب</Label>
                <NativeSelect id="field-tour-report-sort" value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortKey)}>
                  <option value="date">تاريخ الجولة</option>
                  <option value="name">عنوان الجولة</option>
                  <option value="status">حالة الجولة</option>
                  <option value="visits">عدد الزيارات</option>
                </NativeSelect>
              </div>
              <NativeSelect aria-label="اتجاه الفرز" value={direction}
                onChange={(event) => setDirection(event.target.value as 'asc' | 'desc')}>
                <option value="desc">تنازلي / الأحدث أولًا</option>
                <option value="asc">تصاعدي / الأقدم أولًا</option>
              </NativeSelect>
            </div>
            {dateIsInvalid && <p role="alert" className="font-semibold text-red-700">
              يرجى تصحيح الفترة الزمنية: تاريخ البداية بعد تاريخ النهاية.
            </p>}
            <p className="text-xs text-slate-600">
              فلتر اسم المستخدم يشمل منشئ الجولة أو المنفذ المسند إليه إحدى زياراتها؛
              ويظل التقرير شاملاً لجميع الزيارات المتاحة داخل الجولة المختارة.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <b className="flex items-center gap-2"><ListChecks className="h-4 w-4" />
                اختيار الجولات المراد طباعتها
              </b>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{filteredEntries.length} جولة مطابقة</Badge>
                <Button size="sm" variant={mode === 'all' ? 'default' : 'outline'}
                  type="button" onClick={() => { setMode('all'); setSelectedIds(new Set()); }}>
                  جميع الجولات المطابقة
                </Button>
                <Button size="sm" variant={mode === 'selected' ? 'default' : 'outline'}
                  type="button" onClick={() => {
                    setMode('selected');
                    setSelectedIds(new Set(filteredEntries.map((entry) => entry.tour.id)));
                  }}>
                  <Users className="ml-1 h-4 w-4" /> اختيار جولات معينة
                </Button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto rounded-lg border">
              {filteredEntries.length ? (
                <div className="grid gap-1 p-2 md:grid-cols-2">
                  {filteredEntries.map(({ tour, visits: tourVisits, creatorName }) =>
                    <label key={tour.id}
                      className="flex cursor-pointer items-start gap-2 rounded-lg border bg-background p-3 hover:bg-muted/60">
                      {mode === 'selected' &&
                        <input type="checkbox" checked={selectedIds.has(tour.id)}
                          onChange={(event) => setSelected(tour.id, event.target.checked)}
                          className="mt-1 h-4 w-4 accent-teal-700"
                          aria-label={'إدراج الجولة ' + tour.tourNumber} />}
                      <div className="min-w-0 flex-1">
                        <b className="break-words text-sm">{tour.title}</b>
                        <p className="text-xs text-muted-foreground">
                          {tour.tourNumber} — {tourVisits.length} زيارة —
                          {' '}{statusLabels[tour.status] || tour.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          منشئ الجولة: {creatorName}
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              ) : <p className="p-8 text-center text-sm text-muted-foreground">
                لا توجد جولات مطابقة. عدّل الفلاتر لإظهار النتائج.
              </p>}
            </div>
            {mode === 'selected' && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold">
                  المختار: {selectedEntries.length} من {filteredEntries.length} جولة
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" type="button"
                    onClick={() => setSelectedIds((previous) => {
                      const next = new Set(previous);
                      filteredEntries.forEach((entry) => next.add(entry.tour.id));
                      return next;
                    })}>تحديد الكل المطابق</Button>
                  <Button variant="outline" size="sm" type="button"
                    onClick={() => setSelectedIds(new Set())}>
                    <X className="ml-1 h-3.5 w-3.5" /> مسح التحديد
                  </Button>
                </div>
              </div>
            )}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 font-semibold">
                <ImageIcon className="h-4 w-4" /> صور الزيارات داخل تقرير كل جولة
              </h3>
              <p className="text-xs text-slate-600">
                PDF مطبوع من المتصفح. الملفات غير المصورة تُذكر بأسمائها، والصور المؤمنة تُحمّل قبل تفعيل زر الطباعة.
              </p>
            </div>
            <NativeSelect value={imageMode}
              aria-label="الصور التي ستدرج في التقرير"
              onChange={(event) => setImageMode(event.target.value as TourBatchImageMode)}
              className="w-full sm:w-64">
              <option value="all">كل صور الزيارات</option>
              <option value="one_per_visit">صورة واحدة لكل زيارة</option>
              <option value="none">التقرير بدون صور</option>
            </NativeSelect>
          </section>
        </div>

        <DialogFooter className="shrink-0 flex-wrap border-t bg-background px-5 py-3 sm:justify-start">
          <div className="ml-auto flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Badge>{selectedEntries.length} جولة</Badge>
            <Badge variant="secondary">{visitCount} زيارة</Badge>
            <Badge variant="secondary">{imageCount} صورة</Badge>
          </div>
          <Button type="button"
            className="gap-2 border border-teal-800 bg-teal-700 font-bold text-white hover:bg-teal-800"
            disabled={busy || dateIsInvalid || !selectedEntries.length ||
              selectedEntries.length > MAX_TOURS_PER_PDF || imageCount > MAX_TOUR_PDF_IMAGES}
            onClick={() => { void printSelected(); }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {busy ? 'جارٍ تجهيز الصور...' : 'طباعة / PDF شامل بضغطة واحدة'}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}
            disabled={busy}>إغلاق</Button>
          {(selectedEntries.length > MAX_TOURS_PER_PDF || imageCount > MAX_TOUR_PDF_IMAGES) &&
            <p className="w-full text-xs font-semibold text-amber-700">
              <FileText className="ml-1 inline h-3.5 w-3.5" />
              حد التقرير: {MAX_TOURS_PER_PDF} جولة و{MAX_TOUR_PDF_IMAGES} صورة.
              قلّل الفلاتر أو اختر صورة واحدة لكل زيارة، دون حذف أي مرفق.
            </p>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
