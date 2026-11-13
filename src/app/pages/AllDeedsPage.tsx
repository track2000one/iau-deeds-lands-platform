import { updateInteractiveCardMotion, resetInteractiveCardMotion } from '../utils/interactiveCardMotion';
import React, { useEffect, useMemo, useState } from 'react';
import { useResultsMotion } from '../utils/useResultsMotion';
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
  FileImage,
  ListChecks,
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
  type DeedPdfCompression,
} from '../utils/deedBatchPdf';

const DEED_BATCH_SIZE = 24;

export const AllDeedsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { deeds, deleteDeed } = useDeeds();
  const { isAdmin, hasPermission } = usePermissions();
  const canPrint = isAdmin || hasPermission('deeds', 'canPrint');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPlanned, setFilterPlanned] = useState<'all' | 'planned' | 'unplanned'>('all');
  const [listSortBy, setListSortBy] = useState<'deedNumber' | 'city' | 'district' | 'area' | 'updatedAt'>('deedNumber');
  const [listSortDirection, setListSortDirection] = useState<'asc' | 'desc'>('asc');
  const [visibleDeedCount, setVisibleDeedCount] = useState(DEED_BATCH_SIZE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deedToDelete, setDeedToDelete] = useState<string | null>(null);
  const [pdfOptionsOpen, setPdfOptionsOpen] = useState(false);
  const [pdfScope, setPdfScope] = useState<'all' | 'filtered'>('all');
  const [pdfSort, setPdfSort] = useState<'deedNumber' | 'city' | 'district' | 'area' | 'updatedAt'>('deedNumber');
  const [pdfSortDirection, setPdfSortDirection] = useState<'asc' | 'desc'>('asc');
  const [pdfSearch, setPdfSearch] = useState('');
  const [pdfCity, setPdfCity] = useState('');
  const [pdfDistrict, setPdfDistrict] = useState('');
  const [pdfPlanned, setPdfPlanned] = useState<'all' | 'planned' | 'unplanned'>('all');
  const [pdfSelectionMode, setPdfSelectionMode] = useState<'all' | 'selected'>('all');
  const [pdfSelectedIds, setPdfSelectedIds] = useState<Set<string>>(new Set());
  const [pdfIncludePlans, setPdfIncludePlans] = useState(true);
  const [pdfIncludeLocations, setPdfIncludeLocations] = useState(true);
  const [pdfIncludeOther, setPdfIncludeOther] = useState(false);
  const [pdfIncludeCover, setPdfIncludeCover] = useState(true);
  const [pdfIncludeHeaders, setPdfIncludeHeaders] = useState(true);
  const [pdfIncludeIndex, setPdfIncludeIndex] = useState(true);
  const [pdfFileName, setPdfFileName] = useState('');
  const [pdfCompression, setPdfCompression] = useState<DeedPdfCompression>('email');
  const [pdfMaxFileSizeMb, setPdfMaxFileSizeMb] = useState(15);
  const [pdfOversizedAction, setPdfOversizedAction] = useState<'split' | 'block'>('split');
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
  const pdfBaseDeeds = pdfScope === 'all' ? deeds : filteredDeeds;
  const pdfCities = useMemo(() =>
    [...new Set(pdfBaseDeeds.map((deed) => deed.city).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'ar')),
    [pdfBaseDeeds],
  );
  const pdfDistricts = useMemo(() =>
    [...new Set(pdfBaseDeeds
      .filter((deed) => !pdfCity || deed.city === pdfCity)
      .map((deed) => deed.district).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'ar')),
    [pdfBaseDeeds, pdfCity],
  );
  const pdfEligibleDeeds = useMemo(() => {
    const term = pdfSearch.trim().toLocaleLowerCase('ar');
    return pdfBaseDeeds.filter((deed) => {
      if (pdfCity && deed.city !== pdfCity) return false;
      if (pdfDistrict && deed.district !== pdfDistrict) return false;
      if (pdfPlanned === 'planned' && !deed.isPlanned) return false;
      if (pdfPlanned === 'unplanned' && deed.isPlanned) return false;
      if (term && ![deed.deedNumber, deed.propertyDescription, deed.city,
        deed.district, deed.planNumber, deed.plotNumber]
        .some((value) => String(value || '').toLocaleLowerCase('ar').includes(term))) return false;
      return true;
    });
  }, [pdfBaseDeeds, pdfSearch, pdfCity, pdfDistrict, pdfPlanned]);
  const pdfChosenDeeds = useMemo(
    () => pdfSelectionMode === 'all'
      ? pdfEligibleDeeds
      : pdfEligibleDeeds.filter((deed) => pdfSelectedIds.has(deed.id)),
    [pdfEligibleDeeds, pdfSelectionMode, pdfSelectedIds],
  );
  const resetPdfFilters = () => {
    setPdfScope('all');
    setPdfSearch('');
    setPdfCity('');
    setPdfDistrict('');
    setPdfPlanned('all');
    setPdfSort('deedNumber');
    setPdfSortDirection('asc');
    setPdfSelectionMode('all');
    setPdfSelectedIds(new Set());
  };
  const clearPdfSelection = () => {
    setPdfSelectionMode('all');
    setPdfSelectedIds(new Set());
  };


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

  const sortPdfDeeds = React.useCallback((
    rows: typeof deeds,
    sortBy: 'deedNumber' | 'city' | 'district' | 'area' | 'updatedAt',
    direction: 'asc' | 'desc',
  ) => {
    const sign = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      let value = 0;
      if (sortBy === 'city' || sortBy === 'district') {
        value = String(a[sortBy] || '').localeCompare(String(b[sortBy] || ''), 'ar');
      } else if (sortBy === 'area') {
        value = (Number(a.area) || 0) - (Number(b.area) || 0);
      } else if (sortBy === 'updatedAt') {
        value = new Date(a.updatedAt || a.createdAt || 0).getTime() -
          new Date(b.updatedAt || b.createdAt || 0).getTime();
      } else {
        value = String(a.deedNumber || '').localeCompare(String(b.deedNumber || ''), 'ar', { numeric: true });
      }
      return sign * value || String(a.deedNumber || '').localeCompare(
        String(b.deedNumber || ''), 'ar', { numeric: true },
      );
    });
  }, []);

  // The on-screen sort is independent of PDF export settings and never mutates source deeds.
  const sortedDeeds = useMemo(
    () => sortPdfDeeds(filteredDeeds, listSortBy, listSortDirection),
    [filteredDeeds, listSortBy, listSortDirection, sortPdfDeeds],
  );
  // The user sees a manageable first batch; totals, filtering and PDF export remain complete.
  useEffect(() => {
    setVisibleDeedCount(DEED_BATCH_SIZE);
  }, [searchQuery, filterCity, filterPlanned, listSortBy, listSortDirection]);
  const visibleDeeds = useMemo(
    () => sortedDeeds.slice(0, visibleDeedCount),
    [sortedDeeds, visibleDeedCount],
  );
  const deedResultsMotionRef = useResultsMotion([
    searchQuery, filterCity, filterPlanned, listSortBy, listSortDirection, sortedDeeds,
  ]);

  const runBatchDeedsPdf = React.useCallback(async (config?: {
    scope?: 'all' | 'filtered';
    sort?: 'deedNumber' | 'city' | 'district' | 'area' | 'updatedAt';
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
    const rows = sortPdfDeeds(pdfChosenDeeds, sort, pdfSortDirection);

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
        includeIndex: pdfIncludeIndex,
        includePlanImages: pdfIncludePlans,
        includeLocationImages: pdfIncludeLocations,
        includeAdditionalDocuments: pdfIncludeOther,
        compression: pdfCompression,
        maxFileSizeMb: pdfMaxFileSizeMb,
        oversizedFileAction: pdfOversizedAction,
        fileName: fileName.trim() || undefined,
        scopeLabel: [
          scope === 'all' ? 'جميع الصكوك' : 'نتائج تصفية الصفحة',
          pdfCity ? 'المدينة: ' + pdfCity : '',
          pdfDistrict ? 'الحي: ' + pdfDistrict : '',
          pdfPlanned !== 'all' ? (pdfPlanned === 'planned' ? 'المخططة' : 'غير المخططة') : '',
          pdfSelectionMode === 'selected' ? 'صكوك محددة يدويًا' : '',
        ].filter(Boolean).join(' — '),
        signal: controller.signal,
        onProgress: setPdfProgress,
      });

      if (result.splitCount > 1) {
        toast.success(
          `تم تجهيز التقرير في ${result.splitCount} ملفات PDF مستقلة ضمن الحد المحدد، وتنزيلها داخل ملف ZIP واحد. فك ضغط ZIP وأرسل كل جزء على حدة.`,
          { duration: 12000 },
        );
        toast.info(
          `أحجام الأجزاء: ${result.parts?.map((part, index) => `جزء ${index + 1}: ${part.fileSizeMb.toFixed(1)} MB`).join(' — ') || ''}. لا ترسل ZIP كاملًا إن كان أكبر من حد البريد.`,
          { duration: 14000 },
        );
      } else {
        toast.success(
          `تم تنزيل ملف PDF بحجم ${result.fileSizeMb.toFixed(2)} ميجابايت، يضم ${result.documentCount.toLocaleString('ar-SA')} مرفقًا (${result.pageCount.toLocaleString('ar-SA')} صفحة) لـ ${result.deedCount.toLocaleString('ar-SA')} صك`,
        );
      }

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
    pdfSortDirection,
    pdfIncludeCover,
    pdfIncludeHeaders,
    pdfIncludeIndex,
    pdfIncludePlans,
    pdfIncludeLocations,
    pdfIncludeOther,
    pdfCompression,
    pdfMaxFileSizeMb,
    pdfOversizedAction,
    pdfCity,
    pdfDistrict,
    pdfPlanned,
    pdfSelectionMode,
    pdfFileName,
    pdfChosenDeeds,
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
              onClick={() => setPdfOptionsOpen(true)}
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
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-sky-100/80 pt-3">
            <label htmlFor="iau-deed-list-sort" className="text-sm font-semibold text-slate-700">ترتيب البطاقات:</label>
            <NativeSelect id="iau-deed-list-sort" value={listSortBy} onChange={(event) => setListSortBy(event.target.value as typeof listSortBy)} className="h-10 w-full sm:w-[200px]">
              <option value="deedNumber">رقم الصك</option>
              <option value="city">المدينة</option>
              <option value="district">الحي</option>
              <option value="area">المساحة</option>
              <option value="updatedAt">آخر تحديث</option>
            </NativeSelect>
            <NativeSelect aria-label="اتجاه ترتيب الصكوك" value={listSortDirection} onChange={(event) => setListSortDirection(event.target.value as typeof listSortDirection)} className="h-10 w-full sm:w-[160px]">
              <option value="asc">تصاعدي</option>
              <option value="desc">تنازلي</option>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">إجمالي الصكوك الظاهرة</p>
          <p className="mt-1 text-2xl font-black" aria-live="polite">{filteredDeeds.length.toLocaleString('ar-SA')}</p>
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

      <div ref={deedResultsMotionRef} className="iau-results-motion-surface">
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
          {visibleDeeds.map((deed) => (
            <article
              key={deed.id}
              className="platform-record-card iau-interactive-card iau-card--deed flex h-full flex-col p-4 sm:p-5"
              onPointerMove={updateInteractiveCardMotion}
              onPointerLeave={resetInteractiveCardMotion}
              onPointerCancel={resetInteractiveCardMotion}
            >
              <span className="iau-card-spotlight" aria-hidden="true" />
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

              <div className="platform-record-actions iau-record-actions mt-5">
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
                    className="platform-record-danger iau-record-action h-10"
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
      {visibleDeedCount < sortedDeeds.length && (
        <div className="mt-5 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-semibold text-slate-700" aria-live="polite">
            عرض {Math.min(visibleDeedCount, sortedDeeds.length).toLocaleString('ar-SA')} من {sortedDeeds.length.toLocaleString('ar-SA')} صك
          </p>
          <Button type="button" variant="outline" className="min-h-11 border-sky-300 bg-white font-bold" onClick={() => React.startTransition(() => setVisibleDeedCount((count) => count + DEED_BATCH_SIZE))}>
            عرض المزيد من الصكوك ({Math.min(DEED_BATCH_SIZE, sortedDeeds.length - visibleDeedCount).toLocaleString('ar-SA')})
          </Button>
        </div>
      )}
      </div>

      <Dialog
        open={pdfOptionsOpen}
        onOpenChange={(open) => {
          if (!pdfGenerating) setPdfOptionsOpen(open);
        }}
      >
        <DialogContent className="iau-animated-dialog max-h-[94dvh] overflow-y-auto sm:max-w-[1050px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileDown className="h-5 w-5 text-[#0b4a3f]" />
              إنشاء ملف PDF موحد لمستندات الصكوك
            </DialogTitle>
            <DialogDescription className="leading-6">
              اختر الصكوك حسب البحث والتصفية والفرز. يجمع الملف مستندات الصك الأصلية مع صور المخطط والموقع المحفوظة، وفق خياراتك، دون تعديل صفحات PDF الأصلية.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">نطاق الصكوك</label>
              <NativeSelect value={pdfScope} onChange={(event) => {
                  setPdfScope(event.target.value as 'all' | 'filtered');
                  clearPdfSelection();
                  setPdfCity(''); setPdfDistrict('');
                }} className="h-11 rounded-xl">
                <option value="all">جميع الصكوك ({deeds.length.toLocaleString('ar-SA')})</option>
                <option value="filtered">النتائج الظاهرة حاليًا ({filteredDeeds.length.toLocaleString('ar-SA')})</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">ترتيب الصكوك</label>
              <NativeSelect value={pdfSort} onChange={(event) => setPdfSort(event.target.value as typeof pdfSort)} className="h-11 rounded-xl">
                <option value="deedNumber">حسب رقم الصك</option>
                <option value="city">حسب المدينة</option>
                <option value="district">حسب الحي</option>
                <option value="area">حسب المساحة</option>
                <option value="updatedAt">حسب تاريخ آخر تحديث</option>
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">اتجاه الفرز</label>
              <NativeSelect value={pdfSortDirection}
                onChange={(event) => setPdfSortDirection(event.target.value as 'asc' | 'desc')}
                className="h-11 rounded-xl">
                <option value="asc">تصاعدي</option>
                <option value="desc">تنازلي</option>
              </NativeSelect>
            </div>
            <div className="flex items-end justify-between gap-2">
              <Button type="button" variant="outline"
                className="h-11 w-full gap-2 border-amber-400 bg-amber-50 font-bold text-amber-900 hover:bg-amber-100"
                onClick={resetPdfFilters}>
                <Settings2 className="h-4 w-4" /> إعادة ضبط الفلاتر
              </Button>
            </div>
            <section className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-black text-slate-900"><Filter className="h-4 w-4 text-sky-700" /> البحث والتصفية داخل تقرير الصكوك</h3>
                <Badge variant="secondary">{pdfEligibleDeeds.length} صك مطابق</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="relative md:col-span-2">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    className="h-11 bg-white pr-10"
                    value={pdfSearch}
                    aria-label="بحث في الصكوك المطلوب تجميعها"
                    placeholder="ابحث برقم الصك أو بيان العقار أو رقم المخطط أو القطعة"
                    onChange={(event) => {
                      setPdfSearch(event.target.value);
                      clearPdfSelection();
                    }}
                  />
                </div>
                <NativeSelect value={pdfCity} aria-label="تصفية المدينة"
                  onChange={(event) => {
                    setPdfCity(event.target.value);
                    setPdfDistrict('');
                    clearPdfSelection();
                  }} className="h-11 rounded-xl bg-white">
                  <option value="">جميع المدن</option>
                  {pdfCities.map((city) => <option key={city} value={city}>{city}</option>)}
                </NativeSelect>
                <NativeSelect value={pdfDistrict} aria-label="تصفية الحي"
                  onChange={(event) => {
                    setPdfDistrict(event.target.value);
                    clearPdfSelection();
                  }} className="h-11 rounded-xl bg-white">
                  <option value="">جميع الأحياء</option>
                  {pdfDistricts.map((district) => <option key={district} value={district}>{district}</option>)}
                </NativeSelect>
                <NativeSelect value={pdfPlanned} aria-label="حالة تخطيط الأرض"
                  onChange={(event) => {
                    setPdfPlanned(event.target.value as typeof pdfPlanned);
                    clearPdfSelection();
                  }} className="h-11 rounded-xl bg-white">
                  <option value="all">الأراضي المخططة وغير المخططة</option>
                  <option value="planned">المخططة فقط</option>
                  <option value="unplanned">غير المخططة فقط</option>
                </NativeSelect>
              </div>
              <div className="space-y-3 rounded-xl border bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <b className="text-sm text-slate-900">اختيار صكوك محددة للتجميع</b>
                    <p className="text-xs text-slate-600">يمكن تحديد 3 صكوك من أصل 11، أو أي عدد من النتائج المطابقة فقط.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant={pdfSelectionMode === 'all' ? 'default' : 'outline'}
                      onClick={clearPdfSelection}
                      className={pdfSelectionMode === 'all' ? 'bg-teal-700 font-bold text-white hover:bg-teal-800' : ''}>
                      جميع المطابق ({pdfEligibleDeeds.length})
                    </Button>
                    <Button type="button" size="sm" variant={pdfSelectionMode === 'selected' ? 'default' : 'outline'}
                      onClick={() => {
                        setPdfSelectionMode('selected');
                        setPdfSelectedIds(new Set());
                      }}
                      className={pdfSelectionMode === 'selected' ? 'bg-blue-700 font-bold text-white hover:bg-blue-800' : ''}>
                      <ListChecks className="ml-1 h-4 w-4" /> اختيار يدوي
                    </Button>
                  </div>
                </div>
                {pdfSelectionMode === 'selected' && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <Badge className="bg-blue-100 font-bold text-blue-900 hover:bg-blue-100">
                        المختار: {pdfChosenDeeds.length} من {pdfEligibleDeeds.length}
                      </Badge>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm"
                          className="border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100"
                          onClick={() => setPdfSelectedIds(new Set(pdfEligibleDeeds.map((deed) => deed.id)))}>
                          تحديد كل المطابق
                        </Button>
                        <Button type="button" variant="outline" size="sm"
                          className="border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100"
                          onClick={() => setPdfSelectedIds(new Set())}>
                          مسح التحديد
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto rounded-xl border bg-slate-50 p-2">
                      {pdfEligibleDeeds.length === 0 ? (
                        <p className="py-5 text-center text-sm text-slate-500">لا توجد صكوك مطابقة للفلاتر المختارة.</p>
                      ) : (
                        <div className="grid gap-2 md:grid-cols-2">
                          {pdfEligibleDeeds.map((deed) => (
                            <label key={deed.id}
                              className={pdfSelectedIds.has(deed.id)
                                ? 'flex cursor-pointer items-start gap-2 rounded-lg border border-blue-400 bg-blue-50 p-3 text-sm'
                                : 'flex cursor-pointer items-start gap-2 rounded-lg border bg-white p-3 text-sm hover:bg-sky-50'}>
                              <input
                                type="checkbox"
                                checked={pdfSelectedIds.has(deed.id)}
                                onChange={(event) => setPdfSelectedIds((previous) => {
                                  const next = new Set(previous);
                                  if (event.target.checked) next.add(deed.id);
                                  else next.delete(deed.id);
                                  return next;
                                })}
                                className="mt-1 h-4 w-4 shrink-0 accent-blue-700"
                                aria-label={`تضمين الصك ${deed.deedNumber}`}
                              />
                              <span className="min-w-0">
                                <b className="block text-slate-900">الصك رقم {deed.deedNumber}</b>
                                <span className="block break-words text-xs text-slate-600">
                                  {deed.propertyDescription || 'بيان العقار غير محدد'} · {deed.city || 'مدينة غير محددة'} · {deed.district || 'حي غير محدد'}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
            <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 md:col-span-2">
              <h3 className="flex items-center gap-2 font-black text-emerald-950">
                <FileImage className="h-5 w-5" /> أنواع المستندات والصور المراد تضمينها
              </h3>
              <p className="text-xs leading-5 text-emerald-900">
                تُدرج مستندات الصك الأصلية أولًا دائمًا عند توفرها؛ ويمكن إضافة صور المخطط والموقع المحفوظة للصك. لا تُنشأ صورة موقع افتراضية في حال عدم وجود مرفق محفوظ.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-semibold text-slate-800">
                  <input type="checkbox" checked readOnly className="h-4 w-4 accent-emerald-700" />
                  مستند الصك الأصلي (عند توفره)
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-semibold text-slate-800">
                  <input type="checkbox" checked={pdfIncludePlans} onChange={(event) => setPdfIncludePlans(event.target.checked)}
                    className="h-4 w-4 accent-emerald-700" />
                  صورة المخطط / المخطط المرفق
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-semibold text-slate-800">
                  <input type="checkbox" checked={pdfIncludeLocations} onChange={(event) => setPdfIncludeLocations(event.target.checked)}
                    className="h-4 w-4 accent-emerald-700" />
                  صورة الموقع المحفوظة
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-white p-3 text-sm font-semibold text-slate-800">
                  <input type="checkbox" checked={pdfIncludeOther} onChange={(event) => setPdfIncludeOther(event.target.checked)}
                    className="h-4 w-4 accent-emerald-700" />
                  المرفقات الإضافية (اختياري)
                </label>
              </div>
            </section>
            <section className="space-y-3 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 p-4 md:col-span-2">
              <h3 className="flex items-center gap-2 font-black text-indigo-950">
                <FileDown className="h-5 w-5" /> التحكم بحجم ملف PDF قبل التنزيل
              </h3>
              <p className="text-xs leading-6 text-indigo-900">
                يتم ضغط الصور وصفحات الغلاف والفهرس وفق الجودة المختارة. تبقى صفحات ملفات PDF الأصلية دون تعديل لحماية وضوح الصكوك.
                حجم الملف النهائي يعتمد أيضًا على المستندات الأصلية التي جرى دمجها.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="deed-pdf-compression" className="text-sm font-bold text-slate-800">مستوى الضغط والجودة</label>
                  <NativeSelect
                    id="deed-pdf-compression"
                    value={pdfCompression}
                    onChange={(event) => setPdfCompression(event.target.value as DeedPdfCompression)}
                    className="h-11 rounded-xl bg-white"
                  >
                    <option value="email">حجم صغير مناسب للإرسال بالبريد</option>
                    <option value="balanced">متوازن — جودة جيدة وحجم متوسط</option>
                    <option value="high">جودة عالية للطباعة والأرشفة</option>
                  </NativeSelect>
                </div>
                <div className="space-y-2">
                  <label htmlFor="deed-pdf-max-size" className="text-sm font-bold text-slate-800">أقصى حجم مسموح للتنزيل</label>
                  <NativeSelect
                    id="deed-pdf-max-size"
                    value={String(pdfMaxFileSizeMb)}
                    onChange={(event) => setPdfMaxFileSizeMb(Number(event.target.value))}
                    className="h-11 rounded-xl bg-white"
                  >
                    <option value="10">10 ميجابايت — للمرفقات الصغيرة</option>
                    <option value="15">15 ميجابايت — للبريد الإلكتروني</option>
                    <option value="20">20 ميجابايت</option>
                    <option value="25">25 ميجابايت</option>
                    <option value="0">بدون حد — تحميل مهما كان الحجم</option>
                  </NativeSelect>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-indigo-200 bg-white p-3">
                <label htmlFor="deed-pdf-oversize-action" className="text-sm font-bold text-slate-800">الإجراء عند تجاوز الحجم المحدد</label>
                <NativeSelect
                  id="deed-pdf-oversize-action"
                  value={pdfOversizedAction}
                  onChange={(event) => setPdfOversizedAction(event.target.value as 'split' | 'block')}
                  disabled={pdfMaxFileSizeMb === 0}
                  className="h-11 rounded-xl bg-white"
                >
                  <option value="split">تقسيم تلقائي إلى ملفات PDF أصغر (داخل ZIP واحد)</option>
                  <option value="block">إيقاف التنزيل وعرض حجم التقرير فقط</option>
                </NativeSelect>
                {pdfOversizedAction === 'split' && pdfMaxFileSizeMb > 0 && (
                  <p className="text-xs leading-6 text-indigo-900">
                    إذا تجاوز التقرير {pdfMaxFileSizeMb} ميجابايت، يحتفظ النظام بمستندات كل صك في جزء واحد قدر الإمكان، ويضع الأجزاء في ملف ZIP لسهولة التنزيل.
                    <strong> لفك الضغط ثم إرسال كل جزء PDF بمفرده:</strong> اضغط بزر الفأرة الأيمن على ZIP واختر «استخراج الكل».
                    ملف ZIP الكامل قد يتجاوز حد Outlook، لذا لا ترسله كاملًا إذا تجاوز الحد.
                  </p>
                )}
              </div>
              <p className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs leading-6 text-indigo-900">
                <strong>طريقة العمل:</strong> يُقاس حجم الملف الفعلي بعد تجهيزه وقبل تنزيله.
                {pdfMaxFileSizeMb > 0
                  ? pdfOversizedAction === 'split'
                    ? ` إذا تجاوز ${pdfMaxFileSizeMb} ميجابايت فسيُقسَّم إلى أجزاء PDF مستقلة لا يتجاوز أيٌّ منها الحد، مع الحفاظ على مستندات الصك مجمعة ما أمكن. إذا تجاوز صك منفرد الحد فستظهر رسالة دون إسقاط صفحاته.`
                    : ` إذا تجاوز ${pdfMaxFileSizeMb} ميجابايت فسيُمنع التنزيل وتظهر رسالة بالحجم الحقيقي واقتراح لتقليل العدد أو اختيار جودة أخف.`
                  : ' لن يمنع النظام تنزيل الملف مهما كان حجمه؛ يمكن مشاركة الملفات الكبيرة عبر OneDrive.'}
                حدود إرسال البريد تختلف حسب إعدادات جهة العمل. لا يمكن ضمان وصول الحجم المحدد بالضغط وحده إذا كانت ملفات PDF الأصلية كبيرة.
              </p>
            </section>

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
                checked={pdfIncludeIndex}
                onChange={(event) => setPdfIncludeIndex(event.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-bold text-slate-800">فهرس الصكوك وصفحاتها</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">فهرس مرتب للصكوك المختارة مع رقم الصفحة التي يبدأ عندها كل صك داخل الملف الموحد.</span>
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
            يتضمن التقرير {pdfChosenDeeds.length.toLocaleString('ar-SA')} صكًا مختارًا. ملفات PDF الأصلية تُدرج بصفحاتها كاملة، وتُضاف صور المخطط والموقع من المرفقات المحفوظة فقط. إذا تعذر تحميل مرفق فسيظهر تنبيه بعد إنشاء الملف دون تغيير بيانات الصك.
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
                  disabled={!pdfChosenDeeds.length}
                  className="bg-[#0b4a3f] font-bold text-white hover:bg-[#126152]"
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
        <AlertDialogContent className="iau-animated-dialog">
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
