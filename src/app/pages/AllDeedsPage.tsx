import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDeeds } from '../../context/DeedContext';
import { usePermissions } from '../../context/PermissionsContext';
import {
  Building2,
  Edit,
  Eye,
  FileText,
  FileDown,
  Filter,
  Loader2,
  Map,
  MapPin,
  Ruler,
  Search,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { NativeSelect } from '../components/ui/native-select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  normalizeMapCoordinates,
  openGoogleMapsLocation,
  shouldOpenExternalMap,
} from '../utils/mapNavigation';
import {
  generateDeedImagesPdf,
  type DeedBatchPdfProgress,
} from '../utils/deedBatchPdf';

export const AllDeedsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { deeds, deleteDeed } = useDeeds();
  const { isAdmin, hasPermission } = usePermissions();
  const canPrint = isAdmin || hasPermission('deeds', 'canPrint');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPlanned, setFilterPlanned] = useState<'all' | 'planned' | 'unplanned'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deedToDelete, setDeedToDelete] = useState<string | null>(null);
  const [pdfOptionsOpen, setPdfOptionsOpen] = useState(false);
  const [pdfScope, setPdfScope] = useState<'all' | 'filtered'>('all');
  const [pdfSort, setPdfSort] = useState<'deedNumber' | 'city' | 'updatedAt'>('deedNumber');
  const [pdfIncludeCover, setPdfIncludeCover] = useState(true);
  const [pdfIncludeHeaders, setPdfIncludeHeaders] = useState(true);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<DeedBatchPdfProgress | null>(null);
  const pdfAbortRef = React.useRef<AbortController | null>(null);

  const filteredDeeds = useMemo(() => {
    let result = [...deeds];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((deed) =>
        [deed.deedNumber, deed.city, deed.district, deed.propertyDescription]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      );
    }

    if (filterCity) result = result.filter((deed) => deed.city === filterCity);
    if (filterPlanned === 'planned') result = result.filter((deed) => deed.isPlanned);
    if (filterPlanned === 'unplanned') result = result.filter((deed) => !deed.isPlanned);

    return result;
  }, [deeds, searchQuery, filterCity, filterPlanned]);

  const cities = useMemo(
    () => Array.from(new Set(deeds.map((deed) => deed.city).filter(Boolean))).sort(),
    [deeds]
  );

  const totalArea = useMemo(
    () => filteredDeeds.reduce((sum, deed) => sum + (Number(deed.area) || 0), 0),
    [filteredDeeds]
  );

  const handleDelete = (id: string) => {
    if (!isAdmin) {
      toast.error('ليس لديك صلاحية حذف الصكوك');
      return;
    }
    setDeedToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deedToDelete && isAdmin) {
      deleteDeed(deedToDelete);
      toast.success(t('deed.deletedSuccessfully'));
      setDeleteDialogOpen(false);
      setDeedToDelete(null);
    }
  };

  const handleMapOpen = React.useCallback((deed: any) => {
    const coordinates = normalizeMapCoordinates(deed?.coordinates);

    if (!coordinates) {
      toast.error('لا توجد إحداثيات صالحة لهذا الصك');
      return;
    }

    if (shouldOpenExternalMap()) {
      openGoogleMapsLocation(coordinates);
      return;
    }

    navigate(`/maps/${deed.id}`);
  }, [navigate]);

  const sortPdfDeeds = React.useCallback((rows: typeof deeds, sortBy: 'deedNumber' | 'city' | 'updatedAt') => {
    const sorted = [...rows];
    if (sortBy === 'city') {
      return sorted.sort((a, b) =>
        String(a.city || '').localeCompare(String(b.city || ''), 'ar')
        || String(a.deedNumber || '').localeCompare(String(b.deedNumber || ''), 'ar', { numeric: true })
      );
    }
    if (sortBy === 'updatedAt') {
      return sorted.sort((a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
    }
    return sorted.sort((a, b) =>
      String(a.deedNumber || '').localeCompare(String(b.deedNumber || ''), 'ar', { numeric: true })
    );
  }, []);

  const runBatchDeedsPdf = React.useCallback(async (config?: {
    scope?: 'all' | 'filtered';
    sort?: 'deedNumber' | 'city' | 'updatedAt';
    includeCover?: boolean;
    includeHeaders?: boolean;
    fileName?: string;
    closeOptionsOnSuccess?: boolean;
  }) => {
    if (!canPrint || pdfGenerating) return;

    const scope = config?.scope ?? pdfScope;
    const sort = config?.sort ?? pdfSort;
    const includeCover = config?.includeCover ?? pdfIncludeCover;
    const includeHeaders = config?.includeHeaders ?? pdfIncludeHeaders;
    const fileName = config?.fileName ?? pdfFileName;
    const source = scope === 'all' ? deeds : filteredDeeds;
    const rows = sortPdfDeeds(source, sort);

    if (!rows.length) {
      toast.info('لا توجد صكوك ضمن النطاق المحدد');
      return;
    }

    const controller = new AbortController();
    pdfAbortRef.current = controller;
    setPdfGenerating(true);
    setPdfProgress({
      phase: 'collecting',
      current: 0,
      total: rows.length,
      label: 'جاري تجهيز مستندات الصكوك...',
    });

    try {
      const result = await generateDeedImagesPdf(rows, {
        includeCover,
        includeHeaders,
        fileName: fileName.trim() || undefined,
        scopeLabel: scope === 'all' ? 'جميع الصكوك' : 'نتائج التصفية الحالية',
        signal: controller.signal,
        onProgress: setPdfProgress,
      });

      toast.success(
        `تم إنشاء ملف PDF واحد يحتوي على ${result.documentCount.toLocaleString('ar-SA')} مستند (${result.pageCount.toLocaleString('ar-SA')} صفحة) لـ ${result.deedCount.toLocaleString('ar-SA')} صك`
      );

      if (result.skippedDocuments || result.skippedDeeds) {
        toast.warning(
          `تم تجاوز ${result.skippedDocuments.toLocaleString('ar-SA')} مستند و${result.skippedDeeds.toLocaleString('ar-SA')} صك دون مستندات قابلة للتجميع`
        );
      }

      if (config?.closeOptionsOnSuccess !== false) setPdfOptionsOpen(false);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        toast.info('تم إلغاء إنشاء ملف PDF');
      } else {
        console.error('Batch deeds PDF error:', error);
        toast.error(error instanceof Error ? error.message : 'تعذر إنشاء ملف PDF للصكوك');
      }
    } finally {
      setPdfGenerating(false);
      setPdfProgress(null);
      pdfAbortRef.current = null;
    }
  }, [
    canPrint,
    pdfGenerating,
    pdfScope,
    pdfSort,
    pdfIncludeCover,
    pdfIncludeHeaders,
    pdfFileName,
    deeds,
    filteredDeeds,
    sortPdfDeeds,
  ]);

  const cancelBatchPdf = () => {
    pdfAbortRef.current?.abort();
  };

  return (
    <div className="mobile-full-width w-full min-w-0 space-y-5 rounded-2xl border border-sky-200/70 bg-gradient-to-br from-white via-sky-50/70 to-violet-50/50 p-3 shadow-[0_24px_80px_rgba(30,64,175,0.12)] backdrop-blur-xl sm:p-4 md:p-6">
      <section className="flex flex-col gap-4 rounded-[26px] border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur-xl sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <FileText className="h-4 w-4" />
            إدارة الصكوك
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 md:text-3xl">{t('nav.allDeeds')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">عرض الصكوك كبطاقات واضحة وسريعة للوصول إلى بيانات كل صك.</p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {canPrint && (
            <Button
              onClick={() => void runBatchDeedsPdf({
                scope: 'all',
                sort: 'deedNumber',
                includeCover: true,
                includeHeaders: true,
                closeOptionsOnSuccess: false,
              })}
              disabled={pdfGenerating || deeds.length === 0}
              className="h-11 w-full border border-[#0b4a3f] bg-[#0b4a3f] text-white shadow-[0_12px_30px_rgba(11,74,63,0.18)] hover:bg-[#126152] sm:w-auto"
            >
              {pdfGenerating ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <FileDown className="ml-2 h-4 w-4" />}
              {pdfGenerating ? 'جاري إنشاء PDF...' : 'تجميع مستندات الصكوك PDF'}
            </Button>
          )}

          {canPrint && (
            <Button
              variant="outline"
              onClick={() => setPdfOptionsOpen(true)}
              disabled={pdfGenerating}
              className="h-11 w-full border-sky-200 bg-white/90 sm:w-auto"
            >
              <Settings2 className="ml-2 h-4 w-4" />
              خيارات PDF
            </Button>
          )}

          {isAdmin && (
            <Button
              onClick={() => navigate('/deeds/new')}
              className="h-11 w-full bg-gradient-to-l from-sky-600 to-blue-700 text-white shadow-[0_12px_35px_rgba(37,99,235,0.22)] hover:from-sky-500 hover:to-blue-600 sm:w-auto"
            >
              <FileText className="ml-2 h-4 w-4" />
              {t('deed.addNew')}
            </Button>
          )}
        </div>
      </section>

      {pdfGenerating && pdfProgress && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <Loader2 className="h-4 w-4 animate-spin" />
              إنشاء ملف PDF موحد للصكوك
            </div>
            <p className="mt-1 truncate text-xs text-emerald-800">{pdfProgress.label}</p>
            <p className="mt-1 text-[11px] text-emerald-700">
              {pdfProgress.current.toLocaleString('ar-SA')} من {Math.max(pdfProgress.total, 1).toLocaleString('ar-SA')}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={cancelBatchPdf} className="border-emerald-300 bg-white">
            إلغاء
          </Button>
        </div>
      )}

      <Card className="overflow-hidden border-sky-200/70 bg-white/85 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <CardHeader className="border-b border-sky-100/80 bg-gradient-to-l from-sky-50/95 via-white to-violet-50/75 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            {t('app.filter')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
            <div className="relative lg:col-span-2">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث عن صك، مدينة، حي أو بيان العقار..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 rounded-xl pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 h-8 w-8 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <NativeSelect value={filterCity} onChange={(event) => setFilterCity(event.target.value)} className="h-11 rounded-xl">
              <option value="">جميع المدن</option>
              {cities.map((city) => <option key={city} value={city}>{city}</option>)}
            </NativeSelect>

            <NativeSelect
              value={filterPlanned}
              onChange={(event) => setFilterPlanned(event.target.value as 'all' | 'planned' | 'unplanned')}
              className="h-11 rounded-xl"
            >
              <option value="all">جميع الأراضي</option>
              <option value="planned">مخططة فقط</option>
              <option value="unplanned">غير مخططة فقط</option>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">إجمالي الصكوك الظاهرة</p>
          <p className="mt-1 text-2xl font-black">{filteredDeeds.length.toLocaleString('ar-SA')}</p>
        </div>
        <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">الأراضي المخططة</p>
          <p className="mt-1 text-2xl font-black">{filteredDeeds.filter((deed) => deed.isPlanned).length.toLocaleString('ar-SA')}</p>
        </div>
        <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">إجمالي المساحة</p>
          <p className="mt-1 text-2xl font-black">{totalArea.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م²</p>
        </div>
      </section>

      {filteredDeeds.length === 0 ? (
        <Card className="border-sky-200/70 bg-white/85 shadow-sm">
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-[28px] border bg-background/80 shadow-inner">
              <FileText className="h-10 w-10 text-primary/45" />
            </div>
            <h2 className="mt-5 text-xl font-black">لا توجد صكوك مطابقة</h2>
            <p className="mt-2 text-sm text-muted-foreground">غيّر كلمة البحث أو خيارات التصفية.</p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredDeeds.map((deed) => (
            <article
              key={deed.id}
              className="platform-record-card flex h-full flex-col p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">رقم الصك</p>
                  <h2 className="mt-1 truncate text-lg font-black text-slate-800">{deed.deedNumber}</h2>
                </div>
                <Badge
                  variant="outline"
                  className={deed.isPlanned
                    ? 'shrink-0 border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'shrink-0 border-red-300 bg-red-50 text-red-700'}
                >
                  {deed.isPlanned ? 'مخططة' : 'غير مخططة'}
                </Badge>
              </div>

              <div className="platform-record-metric mt-4 p-3">
                <p className="text-xs text-muted-foreground">بيان العقار</p>
                <p className="mt-1 min-h-[42px] text-sm font-semibold leading-6 text-slate-700">{deed.propertyDescription || '-'}</p>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Building2 className="h-3.5 w-3.5" />المدينة</dt>
                  <dd className="mt-1 font-semibold">{deed.city || '-'}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />الحي</dt>
                  <dd className="mt-1 font-semibold">{deed.district || '-'}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Ruler className="h-3.5 w-3.5" />المساحة</dt>
                  <dd className="mt-1 font-semibold">{Number(deed.area || 0).toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م²</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Map className="h-3.5 w-3.5" />الإحداثيات</dt>
                  <dd className="mt-1 font-semibold">{normalizeMapCoordinates(deed.coordinates) ? 'متوفرة' : 'غير متوفرة'}</dd>
                </div>
              </dl>

              <div className="platform-record-actions mt-5">
                <Button variant="outline" size="sm" className="h-10" onClick={() => navigate(`/deeds/${deed.id}`)}>
                  <Eye className="ml-1 h-4 w-4" />عرض
                </Button>

                {normalizeMapCoordinates(deed.coordinates) && (
                  <Button variant="outline" size="sm" className="h-10" onClick={() => handleMapOpen(deed)}>
                    <MapPin className="ml-1 h-4 w-4" />الخريطة
                  </Button>
                )}

                {isAdmin && (
                  <Button variant="outline" size="sm" className="h-10" onClick={() => navigate(`/deeds/${deed.id}`)}>
                    <Edit className="ml-1 h-4 w-4" />تعديل
                  </Button>
                )}

                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="platform-record-danger h-10"
                    onClick={() => handleDelete(deed.id)}
                  >
                    <Trash2 className="ml-1 h-4 w-4" />حذف
                  </Button>
                )}
              </div>
            </article>
          ))}
        </section>
      )}

      <Dialog
        open={pdfOptionsOpen}
        onOpenChange={(open) => {
          if (!pdfGenerating) setPdfOptionsOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileDown className="h-5 w-5 text-[#0b4a3f]" />
              إنشاء ملف PDF موحد لمستندات الصكوك
            </DialogTitle>
            <DialogDescription className="leading-6">
              يجمع النظام مستندات الصك في ملف واحد؛ ملفات PDF تُدمج بكامل صفحاتها الأصلية، والصور تُضاف في صفحات مستقلة دون قص.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">نطاق الصكوك</label>
              <NativeSelect value={pdfScope} onChange={(event) => setPdfScope(event.target.value as 'all' | 'filtered')} className="h-11 rounded-xl">
                <option value="all">جميع الصكوك ({deeds.length.toLocaleString('ar-SA')})</option>
                <option value="filtered">النتائج الظاهرة حاليًا ({filteredDeeds.length.toLocaleString('ar-SA')})</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">ترتيب الصكوك</label>
              <NativeSelect value={pdfSort} onChange={(event) => setPdfSort(event.target.value as 'deedNumber' | 'city' | 'updatedAt')} className="h-11 rounded-xl">
                <option value="deedNumber">حسب رقم الصك</option>
                <option value="city">حسب المدينة ثم رقم الصك</option>
                <option value="updatedAt">الأحدث تحديثًا أولًا</option>
              </NativeSelect>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-bold text-slate-700">اسم الملف — اختياري</label>
              <Input
                value={pdfFileName}
                onChange={(event) => setPdfFileName(event.target.value)}
                placeholder="مثال: ملف صكوك أملاك الجامعة 2026"
                className="h-11 rounded-xl"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
              <input
                type="checkbox"
                checked={pdfIncludeCover}
                onChange={(event) => setPdfIncludeCover(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">إضافة غلاف رسمي</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">يتضمن اسم الجامعة والإدارة وعدد الصكوك والمستندات وتاريخ إنشاء الملف.</span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
              <input
                type="checkbox"
                checked={pdfIncludeHeaders}
                onChange={(event) => setPdfIncludeHeaders(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">إضافة صفحة تعريف قبل كل صك</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">تتضمن رقم الصك وبيان العقار والمدينة والحي ورقم المخطط والقطعة قبل مستنداته.</span>
              </span>
            </label>


          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
            يتم إدراج مرفقات «صورة الصك» سواء كانت PDF أو صورًا. ولا يتم دمج الرفع المساحي أو صور الموقع أو المخططات أو العقود ضمن هذا التقرير.
          </div>

          <DialogFooter className="gap-2 sm:justify-start">
            {pdfGenerating ? (
              <>
                <Button variant="outline" onClick={cancelBatchPdf}>إلغاء العملية</Button>
                <Button disabled>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {pdfProgress ? `${pdfProgress.current.toLocaleString('ar-SA')} / ${Math.max(pdfProgress.total, 1).toLocaleString('ar-SA')}` : 'جاري التجهيز...'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => void runBatchDeedsPdf({ closeOptionsOnSuccess: true })}
                  className="bg-[#0b4a3f] text-white hover:bg-[#126152]"
                >
                  <FileDown className="ml-2 h-4 w-4" />
                  إنشاء ملف PDF
                </Button>
                <Button variant="outline" onClick={() => setPdfOptionsOpen(false)}>إلغاء</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deed.deleteDeed')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deed.confirmDelete')}
              <br />
              <span className="text-destructive">{t('deed.deleteWarning')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('app.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('app.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
