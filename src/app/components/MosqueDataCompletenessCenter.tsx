import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  Image as ImageIcon,
  MapPin,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Progress } from './ui/progress';
import {
  mosqueApi,
  type MosqueFieldVisit,
  type MosqueSite,
  type MosqueSiteMediaLibrary,
} from '../api/mosques';

type CompletenessState = 'complete' | 'review' | 'incomplete';

type CompletenessRow = {
  site: MosqueSite;
  score: number;
  state: CompletenessState;
  missing: string[];
  completedChecks: number;
  totalChecks: number;
  photoCount: number;
  documentCount: number;
  latestVisit: MosqueFieldVisit | null;
};

type MosqueDataCompletenessCenterProps = {
  sites: MosqueSite[];
  onOpenSite: (site: MosqueSite) => void;
  onGoToVisits: () => void;
};

const siteTypeLabel = (site: MosqueSite) => {
  if (site.siteType === 'jami') return 'جامع';
  if (site.siteType === 'mosque') return 'مسجد';
  if (site.prayerRoomGender === 'women') return 'مصلى نساء';
  if (site.prayerRoomGender === 'men') return 'مصلى رجال';
  return 'مصلى';
};

const womenPresence = (site: MosqueSite): 'present' | 'verified_absent' | 'unverified' => {
  if (!['mosque', 'jami'].includes(site.siteType)) return 'verified_absent';
  if (site.womenPrayerArea?.presenceStatus) return site.womenPrayerArea.presenceStatus;
  if (site.hasWomenPrayerArea) return 'present';
  return 'unverified';
};

const mediaCounts = (site: MosqueSite) => {
  if (!site.images) return { photos: 0, documents: 0 };
  if (Array.isArray(site.images)) return { photos: site.images.filter(Boolean).length, documents: 0 };
  const library = site.images as MosqueSiteMediaLibrary;
  return {
    photos: Array.isArray(library.photos) ? library.photos.length : 0,
    documents: Array.isArray(library.documents) ? library.documents.length : 0,
  };
};

const validNumber = (value: unknown) =>
  value !== null
  && value !== undefined
  && value !== ''
  && Number.isFinite(Number(value))
  && Number(value) > 0;

const formatDate = (value?: string | null) => {
  if (!value) return 'لا توجد زيارة';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير محدد';
  return date.toLocaleDateString('ar-SA-u-ca-gregory', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const stateLabel: Record<CompletenessState, string> = {
  complete: 'مكتمل',
  review: 'يحتاج استكمال',
  incomplete: 'ناقص',
};

const stateClass: Record<CompletenessState, string> = {
  complete: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  review: 'border-amber-200 bg-amber-50 text-amber-800',
  incomplete: 'border-rose-200 bg-rose-50 text-rose-800',
};

export const MosqueDataCompletenessCenter: React.FC<MosqueDataCompletenessCenterProps> = ({
  sites,
  onOpenSite,
  onGoToVisits,
}) => {
  const [visits, setVisits] = useState<MosqueFieldVisit[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsAvailable, setVisitsAvailable] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'all' | CompletenessState>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mosques' | 'prayer_rooms'>('all');

  const loadVisits = async () => {
    setVisitsLoading(true);
    try {
      const rows = await mosqueApi.fieldVisits();
      setVisits(rows || []);
      setVisitsAvailable(true);
    } catch {
      setVisits([]);
      setVisitsAvailable(false);
    } finally {
      setVisitsLoading(false);
    }
  };

  useEffect(() => {
    void loadVisits();
  }, []);

  const latestVisitBySite = useMemo(() => {
    const map = new Map<string, MosqueFieldVisit>();
    for (const visit of visits) {
      const current = map.get(visit.siteId);
      const visitTime = new Date(visit.visitDate || visit.updatedAt || visit.createdAt).getTime();
      const currentTime = current
        ? new Date(current.visitDate || current.updatedAt || current.createdAt).getTime()
        : -1;
      if (!current || visitTime > currentTime) map.set(visit.siteId, visit);
    }
    return map;
  }, [visits]);

  const rows = useMemo<CompletenessRow[]>(() => sites.map((site) => {
    const missing: string[] = [];
    const media = mediaCounts(site);
    const latestVisit = latestVisitBySite.get(site.id) || null;
    const checks: Array<{ label: string; ok: boolean }> = [];

    checks.push({ label: 'اسم الموقع', ok: Boolean(site.name?.trim()) });
    checks.push({
      label: site.siteType === 'prayer_room' ? 'تحديد نوع المصلى (رجال/نساء)' : 'تصنيف الموقع',
      ok: site.siteType === 'prayer_room' ? Boolean(site.prayerRoomGender) : Boolean(site.siteType),
    });

    const locationOk = site.spatialRelation === 'inside_building'
      ? Boolean(site.buildingId)
      : Boolean(site.campusLocation || site.city || site.district);

    checks.push({
      label: site.spatialRelation === 'inside_building' ? 'ربط المبنى' : 'بيانات الموقع',
      ok: locationOk,
    });
    checks.push({
      label: 'الإحداثيات',
      ok: Number.isFinite(Number(site.latitude)) && Number.isFinite(Number(site.longitude)),
    });
    checks.push({ label: 'المساحة', ok: validNumber(site.area) });
    checks.push({ label: 'السعة', ok: validNumber(site.capacity) });
    checks.push({
      label: 'المسؤول أو وسيلة التواصل',
      ok: Boolean(
        site.supervisorName
        || site.coordinatorName
        || site.imamName
        || site.muezzinName
        || site.khateebName
        || site.contactPhone
      ),
    });
    checks.push({ label: 'صورة واحدة على الأقل', ok: media.photos > 0 });
    checks.push({ label: 'مستند واحد على الأقل', ok: media.documents > 0 });

    if (['mosque', 'jami'].includes(site.siteType)) {
      const presence = womenPresence(site);
      checks.push({ label: 'التحقق من وجود مصلى النساء', ok: presence !== 'unverified' });
      if (presence === 'present') {
        checks.push({
          label: 'تفاصيل مصلى النساء',
          ok: Boolean(
            validNumber(site.womenPrayerArea?.capacity)
            || site.womenPrayerArea?.locationDescription
            || site.womenPrayerArea?.floor
          ),
        });
      }
    }

    if (visitsAvailable) {
      checks.push({ label: 'زيارة ميدانية مسجلة', ok: Boolean(latestVisit) });
    }

    for (const check of checks) {
      if (!check.ok) missing.push(check.label);
    }

    const completedChecks = checks.length - missing.length;
    const score = checks.length ? Math.round((completedChecks / checks.length) * 100) : 100;
    const state: CompletenessState = score >= 90 ? 'complete' : score >= 65 ? 'review' : 'incomplete';

    return {
      site,
      score,
      state,
      missing,
      completedChecks,
      totalChecks: checks.length,
      photoCount: media.photos,
      documentCount: media.documents,
      latestVisit,
    };
  }), [sites, latestVisitBySite, visitsAvailable]);

  const stats = useMemo(() => {
    const total = rows.length;
    const average = total
      ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / total)
      : 100;

    return {
      total,
      average,
      complete: rows.filter((row) => row.state === 'complete').length,
      needsWork: rows.filter((row) => row.state !== 'complete').length,
      missingCoordinates: rows.filter((row) => row.missing.includes('الإحداثيات')).length,
      missingDocuments: rows.filter((row) => row.missing.includes('مستند واحد على الأقل')).length,
      noVisit: visitsAvailable
        ? rows.filter((row) => row.missing.includes('زيارة ميدانية مسجلة')).length
        : 0,
    };
  }, [rows, visitsAvailable]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (stateFilter !== 'all' && row.state !== stateFilter) return false;
        if (typeFilter === 'mosques' && !['mosque', 'jami'].includes(row.site.siteType)) return false;
        if (typeFilter === 'prayer_rooms' && row.site.siteType !== 'prayer_room') return false;
        if (!q) return true;

        return [
          row.site.name,
          row.site.city,
          row.site.district,
          row.site.campusLocation,
          row.site.building?.name,
          row.site.building?.buildingNumber,
          siteTypeLabel(row.site),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => a.score - b.score || a.site.name.localeCompare(b.site.name, 'ar', { numeric: true }));
  }, [rows, search, stateFilter, typeFilter]);

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="overflow-hidden rounded-[26px] border border-[#ded3b8] bg-white shadow-[0_14px_34px_rgba(6,60,51,0.08)]">
        <CardHeader className="border-b border-[#e8ddc3] bg-[#fffdf8]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Badge
                variant="outline"
                className="mb-2 border-[#d6b46a]/60 bg-white text-[#8a6a1f]"
              >
                جودة البيانات
              </Badge>
              <CardTitle className="flex items-center gap-2 text-xl font-black text-[#0b4a3f] md:text-2xl">
                <CheckCircle2 className="h-5 w-5" />
                مركز اكتمال بيانات المساجد والمصليات
              </CardTitle>
              <CardDescription className="mt-1 max-w-4xl leading-6">
                شاشة مركزية تكشف السجلات غير المكتملة وتحدد البيانات الناقصة قبل اعتمادها في الزيارات والتقارير.
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-[#d9c9a5] bg-white text-[#0b4a3f]"
                onClick={loadVisits}
                disabled={visitsLoading}
              >
                <RefreshCw className={visitsLoading ? 'ml-2 h-4 w-4 animate-spin' : 'ml-2 h-4 w-4'} />
                تحديث الزيارات
              </Button>
              <Button
                className="border border-[#0b4a3f] bg-[#0b4a3f] text-white hover:bg-[#126152]"
                onClick={onGoToVisits}
              >
                <Clock3 className="ml-2 h-4 w-4" />
                الجولات والزيارات
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-4 sm:p-5">
          {!visitsAvailable && (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              تعذر تحميل سجل الزيارات حاليًا؛ تم حساب نسبة الاكتمال من بيانات السجل فقط دون احتساب الزيارة الميدانية.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Metric label="متوسط الاكتمال" value={stats.average} suffix="%" icon={CheckCircle2} />
            <Metric label="إجمالي السجلات" value={stats.total} icon={Building2} />
            <Metric label="مكتملة" value={stats.complete} icon={CheckCircle2} />
            <Metric label="تحتاج استكمال" value={stats.needsWork} icon={AlertTriangle} />
            <Metric label="بدون إحداثيات" value={stats.missingCoordinates} icon={MapPin} />
            <Metric
              label={visitsAvailable ? 'بدون زيارة' : 'بدون مستندات'}
              value={visitsAvailable ? stats.noVisit : stats.missingDocuments}
              icon={visitsAvailable ? Clock3 : FileText}
            />
          </div>

          <div className="rounded-2xl border border-[#e3d6b9] bg-[#fbf8f1] p-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_220px_auto]">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0b5a49]" />
                <Input
                  className="h-11 border-[#d9c9a5] bg-white pr-9"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم المسجد أو المصلى أو الموقع أو المبنى..."
                />
              </div>

              <NativeSelect
                className="h-11 bg-white"
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value as 'all' | CompletenessState)}
              >
                <option value="all">جميع حالات الاكتمال</option>
                <option value="incomplete">ناقص</option>
                <option value="review">يحتاج استكمال</option>
                <option value="complete">مكتمل</option>
              </NativeSelect>

              <NativeSelect
                className="h-11 bg-white"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as 'all' | 'mosques' | 'prayer_rooms')}
              >
                <option value="all">جميع المواقع</option>
                <option value="mosques">المساجد والجوامع</option>
                <option value="prayer_rooms">المصليات</option>
              </NativeSelect>

              <Badge
                variant="outline"
                className="h-11 justify-center border-[#d6b46a]/55 bg-white px-3 font-black text-[#0b4a3f]"
              >
                {filteredRows.length} سجل
              </Badge>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="hidden grid-cols-[minmax(210px,1.2fr)_140px_180px_minmax(270px,1.4fr)_155px_110px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-500 xl:grid">
              <span>الموقع</span>
              <span>التصنيف</span>
              <span>نسبة الاكتمال</span>
              <span>البيانات الناقصة</span>
              <span>آخر زيارة</span>
              <span>الإجراء</span>
            </div>

            {filteredRows.length === 0 ? (
              <div className="p-8 text-center text-sm font-bold text-slate-500">
                لا توجد سجلات مطابقة للتصفية الحالية.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <div
                    key={row.site.id}
                    className="grid gap-3 px-4 py-4 xl:grid-cols-[minmax(210px,1.2fr)_140px_180px_minmax(270px,1.4fr)_155px_110px] xl:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-800">{row.site.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {row.site.building?.name
                          || row.site.campusLocation
                          || row.site.district
                          || row.site.city
                          || 'الموقع غير مكتمل'}
                      </p>
                    </div>

                    <div>
                      <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                        {siteTypeLabel(row.site)}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className={stateClass[row.state]}>
                          {stateLabel[row.state]}
                        </Badge>
                        <span className="text-sm font-black text-[#0b4a3f]">{row.score}%</span>
                      </div>
                      <Progress value={row.score} className="h-2" />
                      <p className="text-[10px] font-bold text-slate-400">
                        {row.completedChecks} من {row.totalChecks} عناصر مكتملة
                      </p>
                    </div>

                    <div>
                      {row.missing.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          لا توجد نواقص رئيسية
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {row.missing.slice(0, 5).map((item) => (
                            <Badge
                              key={item}
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-[10px] text-amber-800"
                            >
                              {item}
                            </Badge>
                          ))}
                          {row.missing.length > 5 && (
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-slate-50 text-[10px] text-slate-600"
                            >
                              +{row.missing.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {row.photoCount} صورة
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {row.documentCount} مستند
                        </span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <p className="font-black text-slate-700">
                        {formatDate(row.latestVisit?.visitDate)}
                      </p>
                      {row.latestVisit && (
                        <p className="mt-1 text-[10px] font-bold text-slate-400">
                          {row.latestVisit.visitNumber}
                        </p>
                      )}
                    </div>

                    <div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-[#d9c9a5] bg-white text-[#0b4a3f]"
                        onClick={() => onOpenSite(row.site)}
                      >
                        فتح السجل
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3 text-xs leading-6 text-slate-600">
            <strong className="text-sky-900">منهجية الاحتساب:</strong>{' '}
            يعتمد المركز على البيانات الأساسية للموقع، الإحداثيات، المساحة والسعة، جهة الاتصال،
            الصور والمستندات، حالة مصلى النساء للمساجد والجوامع، وسجل الزيارة الميدانية عند توفره.
            لا تعتبر حالة «لم يتم التحقق» لمصلى النساء حالة مكتملة.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Metric = ({
  label,
  value,
  suffix,
  icon: Icon,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ElementType;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#e8f5f2] text-[#006b63]">
        <Icon className="h-4 w-4" />
      </span>
      <strong className="text-xl font-black text-[#0b4a3f]">
        {value}{suffix || ''}
      </strong>
    </div>
    <p className="mt-2 text-[11px] font-bold text-slate-500">{label}</p>
  </div>
);

export default MosqueDataCompletenessCenter;
