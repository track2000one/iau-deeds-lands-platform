import React from 'react';
import {
  ArrowRight,
  Check,
  FileText,
  Link2,
  MapPin,
  Save,
  Search,
  X,
} from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import { findSitePreset } from '../../features/investments/sitePresets';
import type {
  GeometryAccuracy,
  InvestmentDeedOption,
  InvestmentSiteInput,
} from '../../features/investments/types';
import { getPolygonMetrics } from '../../features/investments/geometry';
import { InvestmentPolygonEditor } from '../components/InvestmentPolygonEditor';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Textarea } from '../components/ui/textarea';

type FormState = {
  code: string;
  name: string;
  description: string;
  region: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
  geoJson: InvestmentSiteInput['geoJson'];
  geometryAccuracy: GeometryAccuracy;
  deedIds: string[];
};

const EMPTY: FormState = {
  code: '',
  name: '',
  description: '',
  region: '',
  city: '',
  district: '',
  latitude: '',
  longitude: '',
  geoJson: null,
  geometryAccuracy: 'APPROXIMATE',
  deedIds: [],
};

const coordinateOrNull = (value: string) => value.trim() ? Number(value) : null;

const mergeDeeds = (
  primary: InvestmentDeedOption | null | undefined,
  linked: InvestmentDeedOption[]
) => {
  const result: InvestmentDeedOption[] = [];
  const seen = new Set<string>();

  for (const deed of [primary, ...linked]) {
    if (!deed || seen.has(deed.id)) continue;
    seen.add(deed.id);
    result.push(deed);
  }

  return result;
};

export const InvestmentSiteFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { siteId } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!siteId;
  const preset = findSitePreset(searchParams.get('preset') || '');

  const [form, setForm] = React.useState<FormState>(() => ({
    ...EMPTY,
    code: preset?.code || '',
    name: preset?.name || '',
    latitude: preset?.latitude == null ? '' : String(preset.latitude),
    longitude: preset?.longitude == null ? '' : String(preset.longitude),
  }));
  const [selectedDeeds, setSelectedDeeds] = React.useState<InvestmentDeedOption[]>([]);
  const [deedSearch, setDeedSearch] = React.useState('');
  const [deedResults, setDeedResults] = React.useState<InvestmentDeedOption[]>([]);
  const [loadingDeeds, setLoadingDeeds] = React.useState(false);
  const [searchError, setSearchError] = React.useState('');
  const [loading, setLoading] = React.useState(isEdit);
  const [saving, setSaving] = React.useState(false);
  const [showMap, setShowMap] = React.useState(false);

  const setField = <K extends keyof FormState,>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  React.useEffect(() => {
    if (!siteId) return;

    let cancelled = false;

    investmentsApi.getSite(siteId).then((site) => {
      if (cancelled) return;

      const linkedDeeds = (site.deedLinks || []).map((link) => link.deed);
      const allDeeds = mergeDeeds(
        site.deed ? site.deed as InvestmentDeedOption : null,
        linkedDeeds as InvestmentDeedOption[]
      );

      setSelectedDeeds(allDeeds);
      setForm({
        code: site.code,
        name: site.name,
        description: site.description || '',
        region: site.region || '',
        city: site.city || '',
        district: site.district || '',
        latitude: site.latitude == null ? '' : String(site.latitude),
        longitude: site.longitude == null ? '' : String(site.longitude),
        geoJson: site.geoJson || null,
        geometryAccuracy: site.geometryAccuracy || 'APPROXIMATE',
        deedIds: allDeeds.map((deed) => deed.id),
      });
    }).catch((reason) => {
      if (!cancelled) {
        toast.error(reason instanceof Error ? reason.message : 'تعذر فتح الموقع');
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [siteId]);

  React.useEffect(() => {
    if (deedSearch.trim().length < 2) {
      setDeedResults([]);
      setSearchError('');
      setLoadingDeeds(false);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      try {
        setLoadingDeeds(true);
        setSearchError('');

        const { items } = await investmentsApi.getDeedOptions(deedSearch.trim());

        if (!cancelled) {
          setDeedResults(items);
        }
      } catch (reason) {
        if (!cancelled) {
          setDeedResults([]);
          setSearchError(reason instanceof Error ? reason.message : 'تعذر البحث عن الصك');
        }
      } finally {
        if (!cancelled) setLoadingDeeds(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [deedSearch]);

  const coordinates = React.useMemo(() => {
    if (form.latitude.trim() === '' || form.longitude.trim() === '') return undefined;

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;

    return { latitude, longitude };
  }, [form.latitude, form.longitude]);

  const siteBoundaryMetrics = React.useMemo(
    () => getPolygonMetrics(form.geoJson),
    [form.geoJson]
  );

  const addDeed = (deed: InvestmentDeedOption) => {
    if (form.deedIds.includes(deed.id)) {
      toast.info('هذا الصك مرتبط بالموقع بالفعل.');
      return;
    }

    setSelectedDeeds((current) => [...current, deed]);
    setField('deedIds', [...form.deedIds, deed.id]);
    setDeedSearch('');
    setDeedResults([]);
  };

  const removeDeed = (deedId: string) => {
    setSelectedDeeds((current) => current.filter((deed) => deed.id !== deedId));
    setField('deedIds', form.deedIds.filter((id) => id !== deedId));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();

    if (!/^[A-Z0-9-]{2,30}$/.test(code)) {
      toast.error('رمز الموقع يجب أن يتكون من أحرف إنجليزية كبيرة وأرقام أو شرطات (2–30).');
      return;
    }

    if (name.length < 2 || name.length > 250) {
      toast.error('أدخل اسم موقع صحيحًا من حرفين على الأقل.');
      return;
    }

    const hasLat = form.latitude.trim() !== '';
    const hasLong = form.longitude.trim() !== '';
    const lat = coordinateOrNull(form.latitude);
    const long = coordinateOrNull(form.longitude);

    if (hasLat !== hasLong) {
      toast.error('أدخل خط العرض وخط الطول معًا، أو اتركهما فارغين.');
      return;
    }

    if (
      hasLat &&
      (lat == null || lat < -90 || lat > 90 || long == null || long < -180 || long > 180)
    ) {
      toast.error('الإحداثيات غير صحيحة: خط العرض -90 إلى 90، وخط الطول -180 إلى 180.');
      return;
    }

    if (form.geoJson && !siteBoundaryMetrics.isValid) {
      toast.error('حدود الموقع الرئيسي غير مكتملة. يجب أن يحتوي Polygon على ثلاث نقاط على الأقل.');
      return;
    }

    const input: InvestmentSiteInput = {
      code,
      name,
      description: form.description.trim() || null,
      region: form.region.trim() || null,
      city: form.city.trim() || null,
      district: form.district.trim() || null,
      latitude: lat,
      longitude: long,
      geoJson: form.geoJson ?? null,
      geometryAccuracy: form.geometryAccuracy,
      deedId: form.deedIds[0] || null,
      deedIds: form.deedIds,
    };

    try {
      setSaving(true);

      if (siteId) {
        await investmentsApi.updateSite(siteId, input);
      } else {
        await investmentsApi.createSite(input);
      }

      toast.success(siteId ? 'تم تحديث الموقع الرئيسي.' : 'تم تسجيل الموقع الرئيسي.');
      navigate('/investments/sites', { replace: true });
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'تعذر حفظ الموقع');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="p-10 text-center text-muted-foreground">
        جارٍ تحميل بيانات الموقع...
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          className="mb-2 px-0"
          onClick={() => navigate('/investments/sites')}
        >
          <ArrowRight className="me-2 h-4 w-4" />
          المواقع الاستثمارية الرئيسية
        </Button>

        <h1 className="text-2xl font-bold">
          {isEdit ? 'تعديل موقع استثماري رئيسي' : 'تسجيل موقع استثماري رئيسي'}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          يمكن ربط الموقع بصك واحد أو بعدة صكوك، ثم إضافة المساحات الاستثمارية التابعة له.
        </p>
      </div>

      {preset && !isEdit && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-sm leading-7 text-slate-800">
          <div className="font-semibold">بيانات مرجعية من بيان الأراضي الشاغرة</div>
          <div className="mt-1">
            {preset.name} — {preset.expectedAreas} مساحات داخلية.
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600">أرقام الصكوك المرجعية:</span>
            {preset.deedNumbers.map((deedNumber) => (
              <Button
                key={deedNumber}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setDeedSearch(deedNumber)}
              >
                <Search className="me-1 h-3.5 w-3.5" />
                {deedNumber}
              </Button>
            ))}
          </div>

          {preset.sourceCoordinate && (
            <div className="mt-2 text-xs text-slate-600" dir="ltr">
              Source coordinate: {preset.sourceCoordinate}
            </div>
          )}

          <p className="mt-2 text-xs text-slate-600">
            لا يتم ربط أي صك تلقائيًا؛ ابحث بالرقم المرجعي وتحقق من سجل الصك قبل اختياره.
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">أولًا: تعريف الموقع الرئيسي</CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="siteCode">رمز الموقع *</Label>
              <Input
                id="siteCode"
                required
                maxLength={30}
                value={form.code}
                onChange={(event) => setField('code', event.target.value.toUpperCase())}
                placeholder="WEST"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                رمز ثابت يستخدم لإنشاء رموز المساحات مثل WEST-01.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="siteName">اسم الموقع *</Label>
              <Input
                id="siteName"
                required
                maxLength={250}
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="الحرم الجامعي الغربي"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">المنطقة</Label>
              <Input
                id="region"
                value={form.region}
                maxLength={120}
                onChange={(event) => setField('region', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">المدينة</Label>
              <Input
                id="city"
                value={form.city}
                maxLength={120}
                onChange={(event) => setField('city', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">الحي</Label>
              <Input
                id="district"
                value={form.district}
                maxLength={120}
                onChange={(event) => setField('district', event.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">وصف الموقع</Label>
              <Textarea
                id="description"
                rows={3}
                maxLength={3000}
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                placeholder="بيان موجز عن طبيعة الموقع ومصدر البيانات."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Link2 className="h-5 w-5" />
              ثانيًا: ربط الصكوك
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              ابحث برقم الصك أو وصف العقار. يمكن ربط أكثر من صك بالموقع الواحد، ويعد أول صك في القائمة الصك الرئيسي.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            {selectedDeeds.length > 0 && (
              <div className="space-y-2">
                {selectedDeeds.map((deed, index) => (
                  <div
                    key={deed.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                          <Check className="me-1 h-3 w-3" />
                          صك مرتبط
                        </Badge>
                        {index === 0 && <Badge>الصك الرئيسي</Badge>}
                      </div>

                      <p className="mt-2 font-semibold">
                        رقم الصك: {deed.deedNumber}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {deed.propertyDescription}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeDeed(deed.id)}
                    >
                      <X className="me-1 h-4 w-4" />
                      إلغاء الربط
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="deedSearch">البحث عن صك</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="deedSearch"
                  className="pr-9"
                  value={deedSearch}
                  onChange={(event) => setDeedSearch(event.target.value)}
                  placeholder="أدخل رقم الصك أو جزءًا من وصف العقار..."
                />
              </div>
            </div>

            {loadingDeeds && (
              <p className="text-xs text-muted-foreground">جارٍ البحث...</p>
            )}

            {searchError && (
              <p className="text-sm text-destructive">{searchError}</p>
            )}

            {deedSearch.trim().length >= 2 &&
              !loadingDeeds &&
              !searchError &&
              deedResults.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  لا توجد صكوك مطابقة للبحث الحالي.
                </p>
              )}

            {deedResults.length > 0 && (
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border p-2">
                {deedResults.map((deed) => {
                  const linked = form.deedIds.includes(deed.id);

                  return (
                    <button
                      key={deed.id}
                      type="button"
                      disabled={linked}
                      className={[
                        'flex w-full items-start justify-between gap-2 rounded-lg border p-3 text-right transition',
                        linked
                          ? 'cursor-default border-emerald-200 bg-emerald-50/60'
                          : 'border-transparent hover:bg-muted/60',
                      ].join(' ')}
                      onClick={() => addDeed(deed)}
                    >
                      <span>
                        <span className="block font-semibold">{deed.deedNumber}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {deed.propertyDescription}
                        </span>
                      </span>

                      {linked ? (
                        <Check className="mt-1 h-5 w-5 text-emerald-600" />
                      ) : (
                        <FileText className="mt-1 h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {form.deedIds.length === 0 && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950">
                يمكن حفظ الموقع دون صك مؤقتًا، لكنه سيظهر بحالة «بانتظار الربط» حتى تتم مطابقة الصك أو الصكوك الصحيحة.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-5 w-5" />
              ثالثًا: الموقع الجغرافي وحدود الموقع الرئيسي
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              الإحداثية تمثل نقطة مرجعية، بينما Polygon يمثل النطاق الجغرافي للموقع الرئيسي المستخدم لاحقًا في تدقيق احتواء المساحات الاستثمارية.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude — خط العرض</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.0000001"
                  dir="ltr"
                  value={form.latitude}
                  onChange={(event) => setField('latitude', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude — خط الطول</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.0000001"
                  dir="ltr"
                  value={form.longitude}
                  onChange={(event) => setField('longitude', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="geometryAccuracy">دقة حدود الموقع</Label>
                <NativeSelect
                  id="geometryAccuracy"
                  value={form.geometryAccuracy}
                  onChange={(event) =>
                    setField(
                      'geometryAccuracy',
                      event.target.value as GeometryAccuracy
                    )
                  }
                >
                  <option value="APPROXIMATE">تقريبية</option>
                  <option value="FIELD_VERIFIED">متحقق منها ميدانيًا</option>
                  <option value="SURVEYED">رفع مساحي</option>
                  <option value="OFFICIAL">رسمية/معتمدة</option>
                </NativeSelect>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMap((value) => !value)}
            >
              <MapPin className="me-2 h-4 w-4" />
              {showMap ? 'إخفاء محدد النقطة' : 'تحديد نقطة مرجعية فقط'}
            </Button>

            {showMap && (
              <MapCoordinatePicker
                coordinates={coordinates}
                onChange={(value) => {
                  setField('latitude', String(value.latitude));
                  setField('longitude', String(value.longitude));
                }}
              />
            )}

            <InvestmentPolygonEditor
              geoJson={form.geoJson}
              referenceCoordinates={coordinates}
              fileBaseName={form.code || form.name || 'investment-site'}
              title="رسم حدود الموقع الرئيسي Polygon"
              helperText="ارسم أو استورد الحدود الخارجية للموقع الرئيسي. تستخدم هذه الحدود لتدقيق وقوع المساحات الاستثمارية التابعة داخله، ويمكن تعديل النقاط بالسحب قبل الحفظ."
              showAreaComparisons={false}
              onGeometryChange={(geoJson, metrics) => {
                setField('geoJson', geoJson);

                if (metrics.centroid) {
                  setField('latitude', String(metrics.centroid.latitude));
                  setField('longitude', String(metrics.centroid.longitude));
                }
              }}
            />

            {siteBoundaryMetrics.isValid && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm">
                <p className="font-semibold">
                  حدود الموقع جاهزة للحفظ — {siteBoundaryMetrics.vertexCount} نقاط
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  المساحة الهندسية المحسوبة من Polygon: {siteBoundaryMetrics.calculatedAreaSqm.toLocaleString('ar-SA', { maximumFractionDigits: 2 })} م². هذه القيمة مرجعية ولا تستبدل مساحة الصك.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/investments/sites')}
            disabled={saving}
          >
            إلغاء
          </Button>

          <Button type="submit" disabled={saving}>
            <Save className="me-2 h-4 w-4" />
            {saving ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'تسجيل الموقع'}
          </Button>
        </div>
      </form>
    </div>
  );
};
