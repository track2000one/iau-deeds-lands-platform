import React from 'react';
import { ArrowRight, Check, FileText, MapPin, Save, Search, X } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import { findSitePreset } from '../../features/investments/sitePresets';
import type {
  InvestmentDeedOption,
  InvestmentSiteInput,
} from '../../features/investments/types';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
  deedId: string | null;
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
  deedId: null,
};

const coordinateOrNull = (value: string) => value.trim() ? Number(value) : null;

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
  }));
  const [selectedDeed, setSelectedDeed] = React.useState<InvestmentDeedOption | null>(null);
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
      setForm({
        code: site.code,
        name: site.name,
        description: site.description || '',
        region: site.region || '',
        city: site.city || '',
        district: site.district || '',
        latitude: site.latitude == null ? '' : String(site.latitude),
        longitude: site.longitude == null ? '' : String(site.longitude),
        deedId: site.deedId || null,
      });
      if (site.deed) setSelectedDeed(site.deed as InvestmentDeedOption);
    }).catch((reason) => {
      if (!cancelled) toast.error(reason instanceof Error ? reason.message : 'تعذر فتح الموقع');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
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
        if (!cancelled) setDeedResults(items);
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
    if (hasLat && (lat == null || lat < -90 || lat > 90 || long == null || long < -180 || long > 180)) {
      toast.error('الإحداثيات غير صحيحة: خط العرض -90 إلى 90، وخط الطول -180 إلى 180.');
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
      deedId: form.deedId,
    };

    try {
      setSaving(true);
      const saved = siteId
        ? await investmentsApi.updateSite(siteId, input)
        : await investmentsApi.createSite(input);
      toast.success(siteId ? 'تم تحديث الموقع الرئيسي.' : 'تم تسجيل الموقع الرئيسي.');
      navigate('/investments/sites', { replace: true });
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : 'تعذر حفظ الموقع');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-10 text-center text-muted-foreground">جارٍ تحميل بيانات الموقع...</p>;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate('/investments/sites')}>
          <ArrowRight className="me-2 h-4 w-4" /> المواقع الاستثمارية الرئيسية
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? 'تعديل موقع استثماري رئيسي' : 'تسجيل موقع استثماري رئيسي'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          اربط الموقع بأحد الصكوك المسجلة بالجامعة، ثم أضف المساحات التابعة له من شاشة المساحات الاستثمارية.
        </p>
      </div>

      {preset && !isEdit && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-sm leading-7 text-slate-800">
          <span className="font-semibold">بيانات مرجعية من بيان الأراضي الشاغرة:</span>{' '}
          {preset.name} — {preset.expectedAreas} مواقع داخلية. لا يجري اختيار الصك تلقائيًا؛ يجب التحقق منه في سجل الجامعة.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardHeader><CardTitle className="text-base">أولًا: تعريف الموقع الرئيسي</CardTitle></CardHeader>
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
              <p className="text-xs text-muted-foreground">رمز مميز وثابت يستخدم لإنشاء رموز المساحات مثل WEST-01.</p>
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
              <Input id="region" value={form.region} maxLength={120} onChange={(event) => setField('region', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">المدينة</Label>
              <Input id="city" value={form.city} maxLength={120} onChange={(event) => setField('city', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">الحي</Label>
              <Input id="district" value={form.district} maxLength={120} onChange={(event) => setField('district', event.target.value)} />
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
              <FileText className="h-5 w-5" /> ثانيًا: ربط الصك
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              ابحث برقم الصك أو وصف العقار، ثم اختر السجل المطابق. تظهر بيانات تعريفية محدودة للصك.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDeed && form.deedId && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div>
                  <Badge variant="outline"><Check className="me-1 h-3 w-3" /> صك محدد</Badge>
                  <p className="mt-2 font-semibold">رقم الصك: {selectedDeed.deedNumber}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedDeed.propertyDescription}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setField('deedId', null);
                    setSelectedDeed(null);
                  }}
                >
                  <X className="me-1 h-4 w-4" /> إلغاء الربط
                </Button>
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

            {loadingDeeds && <p className="text-xs text-muted-foreground">جارٍ البحث...</p>}
            {searchError && <p className="text-sm text-destructive">{searchError}</p>}
            {deedSearch.trim().length >= 2 && !loadingDeeds && !searchError && deedResults.length === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد صكوك مطابقة للبحث الحالي.</p>
            )}
            {deedResults.length > 0 && (
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border p-2">
                {deedResults.map((deed) => (
                  <button
                    key={deed.id}
                    type="button"
                    className={[
                      'flex w-full items-start justify-between gap-2 rounded-lg border p-3 text-right transition hover:bg-muted/60',
                      form.deedId === deed.id ? 'border-primary bg-primary/5' : 'border-transparent',
                    ].join(' ')}
                    onClick={() => {
                      setSelectedDeed(deed);
                      setField('deedId', deed.id);
                      setDeedSearch('');
                      setDeedResults([]);
                    }}
                  >
                    <span>
                      <span className="block font-semibold">{deed.deedNumber}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{deed.propertyDescription}</span>
                    </span>
                    {form.deedId === deed.id && <Check className="mt-1 h-5 w-5 text-primary" />}
                  </button>
                ))}
              </div>
            )}

            {!form.deedId && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950">
                يمكن حفظ الموقع دون صك مؤقتًا، لكن سيظهر بحالة «بانتظار الربط» حتى يُختار الصك الصحيح من سجلات الجامعة.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-5 w-5" /> ثالثًا: الإحداثية المرجعية للموقع</CardTitle>
            <p className="text-sm text-muted-foreground">اختيارية، ولا تمثل حدود الصك أو مساحته المساحية.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude — خط العرض</Label>
                <Input id="latitude" type="number" step="0.0000001" dir="ltr" value={form.latitude} onChange={(event) => setField('latitude', event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude — خط الطول</Label>
                <Input id="longitude" type="number" step="0.0000001" dir="ltr" value={form.longitude} onChange={(event) => setField('longitude', event.target.value)} />
              </div>
            </div>
            <Button type="button" variant="outline" onClick={() => setShowMap((value) => !value)}>
              <MapPin className="me-2 h-4 w-4" />{showMap ? 'إخفاء الخريطة' : 'تحديد الإحداثية من الخريطة'}
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
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/investments/sites')} disabled={saving}>إلغاء</Button>
          <Button type="submit" disabled={saving}>
            <Save className="me-2 h-4 w-4" />
            {saving ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'تسجيل الموقع'}
          </Button>
        </div>
      </form>
    </div>
  );
};
