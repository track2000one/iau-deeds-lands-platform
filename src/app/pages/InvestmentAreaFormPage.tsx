import React from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  Ruler,
  Save,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { investmentsApi } from '../../features/investments/api';
import type {
  GeometryAccuracy,
  InvestmentAreaInput,
  InvestmentAreaStatus,
  InvestmentReadiness,
  InvestmentSite,
} from '../../features/investments/types';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Textarea } from '../components/ui/textarea';

type FormState = {
  siteId: string;
  areaNumber: string;
  areaCode: string;
  name: string;
  description: string;
  approximateArea: string;
  surveyedArea: string;
  latitude: string;
  longitude: string;
  geometryAccuracy: GeometryAccuracy;
  occupancyStatus: InvestmentAreaStatus;
  investmentReadiness: InvestmentReadiness;
  currentUse: string;
  proposedUse: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  siteId: '',
  areaNumber: '',
  areaCode: '',
  name: '',
  description: '',
  approximateArea: '',
  surveyedArea: '',
  latitude: '',
  longitude: '',
  geometryAccuracy: 'APPROXIMATE',
  occupancyStatus: 'AVAILABLE',
  investmentReadiness: 'NOT_ASSESSED',
  currentUse: '',
  proposedUse: '',
  notes: '',
};

const stepItems = [
  { title: 'الموقع والصك', description: 'اختيار الموقع الرئيسي والتحقق من الصك المرتبط', icon: Building2 },
  { title: 'بيانات المساحة', description: 'المساحة والحالة والاستخدام', icon: Ruler },
  { title: 'الموقع الجغرافي', description: 'الإحداثيات ومستوى الدقة', icon: MapPin },
  { title: 'المراجعة والحفظ', description: 'مراجعة البيانات قبل اعتمادها', icon: ClipboardCheck },
];

const statusLabels: Record<InvestmentAreaStatus, string> = {
  AVAILABLE: 'متاحة',
  OCCUPIED: 'مشغولة',
  PARTIALLY_OCCUPIED: 'مستغلة جزئيًا',
  RESERVED: 'محجوزة',
  ALLOCATED: 'مخصصة',
  UNAVAILABLE: 'غير متاحة',
};

const readinessLabels: Record<InvestmentReadiness, string> = {
  NOT_ASSESSED: 'لم تُقيّم',
  UNDER_REVIEW: 'تحت الدراسة',
  READY: 'جاهزة للاستثمار',
  NOT_SUITABLE: 'غير مناسبة للاستثمار',
};

const accuracyLabels: Record<GeometryAccuracy, string> = {
  APPROXIMATE: 'تقريبي',
  FIELD_VERIFIED: 'تم التحقق ميدانيًا',
  SURVEYED: 'رفع مساحي',
  OFFICIAL: 'معتمد',
};

const optionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const InvestmentAreaFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { areaId } = useParams();
  const isEdit = Boolean(areaId);

  const [sites, setSites] = React.useState<InvestmentSite[]>([]);
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [areaCodeTouched, setAreaCodeTouched] = React.useState(false);

  const setField = <K extends keyof FormState,>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);

        const sitesResponse = await investmentsApi.getSites({ limit: 100 });
        if (cancelled) return;
        setSites(sitesResponse.items);

        if (isEdit && areaId) {
          const area = await investmentsApi.getArea(areaId);
          if (cancelled) return;

          setForm({
            siteId: area.siteId,
            areaNumber: String(area.areaNumber),
            areaCode: area.areaCode,
            name: area.name || '',
            description: area.description || '',
            approximateArea: area.approximateArea == null ? '' : String(area.approximateArea),
            surveyedArea: area.surveyedArea == null ? '' : String(area.surveyedArea),
            latitude: area.latitude == null ? '' : String(area.latitude),
            longitude: area.longitude == null ? '' : String(area.longitude),
            geometryAccuracy: area.geometryAccuracy,
            occupancyStatus: area.occupancyStatus,
            investmentReadiness: area.investmentReadiness,
            currentUse: area.currentUse || '',
            proposedUse: area.proposedUse || '',
            notes: area.notes || '',
          });
          setAreaCodeTouched(true);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'تعذر تحميل بيانات النموذج');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [areaId, isEdit]);

  const selectedSite = React.useMemo(
    () => sites.find((site) => site.id === form.siteId) || null,
    [form.siteId, sites]
  );

  React.useEffect(() => {
    if (isEdit || areaCodeTouched) return;

    const siteCode = selectedSite?.code?.trim();
    const areaNumber = Number(form.areaNumber);

    if (siteCode && Number.isInteger(areaNumber) && areaNumber > 0) {
      setField('areaCode', `${siteCode}-${String(areaNumber).padStart(2, '0')}`);
    }
  }, [areaCodeTouched, form.areaNumber, isEdit, selectedSite]);

  const coordinateValue = React.useMemo(() => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
    if (form.latitude.trim() === '' || form.longitude.trim() === '') return undefined;

    return { latitude, longitude };
  }, [form.latitude, form.longitude]);

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!form.siteId) {
        toast.error('اختر الموقع الرئيسي أولًا.');
        return false;
      }

      if (!selectedSite) {
        toast.error('الموقع الرئيسي المختار غير متاح.');
        return false;
      }
    }

    if (step === 1) {
      const areaNumber = Number(form.areaNumber);

      if (!Number.isInteger(areaNumber) || areaNumber <= 0) {
        toast.error('أدخل رقم موقع صحيحًا أكبر من صفر.');
        return false;
      }

      if (!form.areaCode.trim()) {
        toast.error('رمز المساحة مطلوب.');
        return false;
      }

      for (const [label, value] of [
        ['المساحة التقريبية', form.approximateArea],
        ['المساحة المساحية المعتمدة', form.surveyedArea],
      ] as const) {
        if (value.trim() && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
          toast.error(`${label} يجب أن تكون رقمًا أكبر من صفر.`);
          return false;
        }
      }
    }

    if (step === 2) {
      const hasLatitude = form.latitude.trim() !== '';
      const hasLongitude = form.longitude.trim() !== '';

      if (hasLatitude !== hasLongitude) {
        toast.error('أدخل خط العرض وخط الطول معًا، أو اتركهما فارغين.');
        return false;
      }

      if (hasLatitude && hasLongitude) {
        const latitude = Number(form.latitude);
        const longitude = Number(form.longitude);

        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
          toast.error('خط العرض يجب أن يكون بين -90 و90.');
          return false;
        }

        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
          toast.error('خط الطول يجب أن يكون بين -180 و180.');
          return false;
        }
      }
    }

    return true;
  };

  const goNext = () => {
    if (!validateStep(currentStep)) return;
    setCurrentStep((value) => Math.min(value + 1, stepItems.length - 1));
  };

  const goBack = () => {
    setCurrentStep((value) => Math.max(value - 1, 0));
  };

  const handleSave = async () => {
    if (![0, 1, 2].every(validateStep)) return;

    const payload: InvestmentAreaInput = {
      siteId: form.siteId,
      areaNumber: Number(form.areaNumber),
      areaCode: form.areaCode.trim().toUpperCase(),
      name: form.name.trim() || null,
      description: form.description.trim() || null,
      approximateArea: optionalNumber(form.approximateArea) ?? null,
      surveyedArea: optionalNumber(form.surveyedArea) ?? null,
      latitude: optionalNumber(form.latitude) ?? null,
      longitude: optionalNumber(form.longitude) ?? null,
      geometryAccuracy: form.geometryAccuracy,
      occupancyStatus: form.occupancyStatus,
      investmentReadiness: form.investmentReadiness,
      currentUse: form.currentUse.trim() || null,
      proposedUse: form.proposedUse.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      setSaving(true);

      const saved = isEdit && areaId
        ? await investmentsApi.updateArea(areaId, payload)
        : await investmentsApi.createArea(payload);

      toast.success(isEdit ? 'تم تحديث بيانات المساحة.' : 'تمت إضافة المساحة الاستثمارية.');
      navigate(`/investments/areas/${saved.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ بيانات المساحة');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">جارٍ تجهيز نموذج المساحة...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 px-0" onClick={() => navigate('/investments')}>
            <ArrowRight className="me-2 h-4 w-4" />
            المساحات والفرص الاستثمارية
          </Button>
          <h1 className="text-2xl font-bold">
            {isEdit ? 'تعديل المساحة الاستثمارية' : 'إضافة مساحة استثمارية'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أدخل البيانات على أربع مراحل، مع إبقاء المساحة التقريبية منفصلة عن المساحة المساحية المعتمدة.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {stepItems.map((step, index) => {
          const Icon = step.icon;
          const active = index === currentStep;
          const completed = index < currentStep;

          return (
            <button
              key={step.title}
              type="button"
              onClick={() => {
                if (index <= currentStep) setCurrentStep(index);
              }}
              className={[
                'rounded-2xl border p-4 text-right transition',
                active ? 'border-primary bg-primary/5 shadow-sm' : '',
                completed ? 'border-emerald-200 bg-emerald-50/60' : '',
                !active && !completed ? 'bg-card' : '',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <span className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                  completed ? 'border-emerald-500 bg-emerald-500 text-white' : '',
                  active ? 'border-primary bg-primary text-primary-foreground' : '',
                ].join(' ')}>
                  {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </span>
                <span>
                  <span className="block font-semibold">{step.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{step.description}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {sites.length === 0 && (
        <Card className="border-amber-300 bg-amber-50/70">
          <CardContent className="pt-6 text-sm leading-7 text-amber-950">
            لا توجد مواقع استثمارية رئيسية مسجلة حتى الآن. يجب إنشاء الموقع الرئيسي وربطه بالصك قبل إضافة المساحات التابعة له.
            <div className="mt-3">
              <Button type="button" variant="outline" onClick={() => navigate('/investments/sites/new')}>
                إضافة موقع رئيسي أولًا
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 0 && (
        <Card>
          <CardHeader><CardTitle>1. الموقع الرئيسي والصك</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="siteId">الموقع الرئيسي <span className="text-destructive">*</span></Label>
              <NativeSelect
                id="siteId"
                value={form.siteId}
                onChange={(event) => setField('siteId', event.target.value)}
              >
                <option value="">اختر الموقع الرئيسي</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name} ({site.code})
                  </option>
                ))}
              </NativeSelect>
            </div>

            {selectedSite && (
              <div className="grid gap-4 rounded-2xl border bg-muted/25 p-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">الموقع</p>
                  <p className="mt-1 font-semibold">{selectedSite.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">رقم الصك المرتبط</p>
                  <p className="mt-1 font-semibold">{selectedSite.deed?.deedNumber || 'غير مرتبط بصك'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">بيان العقار</p>
                  <p className="mt-1 font-semibold">{selectedSite.deed?.propertyDescription || '-'}</p>
                </div>
              </div>
            )}

            {selectedSite && !selectedSite.deedId && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                تنبيه: الموقع الرئيسي غير مرتبط بصك حتى الآن. يمكن إضافة المساحة، لكن يفضل استكمال ربط الموقع بالصك قبل اعتماد البيانات.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader><CardTitle>2. بيانات المساحة</CardTitle></CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="areaNumber">رقم الموقع <span className="text-destructive">*</span></Label>
              <Input
                id="areaNumber"
                type="number"
                min="1"
                step="1"
                value={form.areaNumber}
                onChange={(event) => setField('areaNumber', event.target.value)}
                placeholder="مثال: 3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="areaCode">رمز المساحة <span className="text-destructive">*</span></Label>
              <Input
                id="areaCode"
                value={form.areaCode}
                onChange={(event) => {
                  setAreaCodeTouched(true);
                  setField('areaCode', event.target.value.toUpperCase());
                }}
                placeholder="EAST-03"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">
                يتم اقتراح الرمز تلقائيًا من رمز الموقع الرئيسي ورقم الموقع، ويمكن تعديله.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">اسم المساحة</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setField('name', event.target.value)}
                placeholder="مثال: الموقع 03"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approximateArea">المساحة التقريبية (م²)</Label>
              <Input
                id="approximateArea"
                type="number"
                min="0"
                step="0.01"
                value={form.approximateArea}
                onChange={(event) => setField('approximateArea', event.target.value)}
                placeholder="48193.12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="surveyedArea">المساحة المساحية المعتمدة (م²)</Label>
              <Input
                id="surveyedArea"
                type="number"
                min="0"
                step="0.01"
                value={form.surveyedArea}
                onChange={(event) => setField('surveyedArea', event.target.value)}
                placeholder="تترك فارغة إذا لم يتوفر رفع مساحي معتمد"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="occupancyStatus">حالة المساحة</Label>
              <NativeSelect
                id="occupancyStatus"
                value={form.occupancyStatus}
                onChange={(event) => setField('occupancyStatus', event.target.value as InvestmentAreaStatus)}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="investmentReadiness">جاهزية الاستثمار</Label>
              <NativeSelect
                id="investmentReadiness"
                value={form.investmentReadiness}
                onChange={(event) => setField('investmentReadiness', event.target.value as InvestmentReadiness)}
              >
                {Object.entries(readinessLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentUse">الاستخدام الحالي</Label>
              <Input
                id="currentUse"
                value={form.currentUse}
                onChange={(event) => setField('currentUse', event.target.value)}
                placeholder="مثال: أرض غير مشغولة"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proposedUse">الاستخدام المقترح</Label>
              <Input
                id="proposedUse"
                value={form.proposedUse}
                onChange={(event) => setField('proposedUse', event.target.value)}
                placeholder="يحدد لاحقًا عند الدراسة"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">وصف المساحة</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => setField('description', event.target.value)}
                rows={3}
                placeholder="وصف مختصر للموقع أو أي معلومات تعريفية لازمة."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardHeader><CardTitle>3. الإحداثيات والموقع الجغرافي</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="latitude">خط العرض Latitude</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(event) => setField('latitude', event.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">خط الطول Longitude</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(event) => setField('longitude', event.target.value)}
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="geometryAccuracy">مستوى دقة البيانات</Label>
                <NativeSelect
                  id="geometryAccuracy"
                  value={form.geometryAccuracy}
                  onChange={(event) => setField('geometryAccuracy', event.target.value as GeometryAccuracy)}
                >
                  {Object.entries(accuracyLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <MapCoordinatePicker
              coordinates={coordinateValue}
              onChange={(coordinates) => {
                setField('latitude', String(coordinates.latitude));
                setField('longitude', String(coordinates.longitude));
              }}
            />

            <p className="rounded-xl border bg-muted/30 p-3 text-xs leading-6 text-muted-foreground">
              الإحداثية الحالية تمثل نقطة مرجعية للموقع. دعم رسم الحدود الجغرافية Polygon سيضاف في شاشة الخريطة الاستثمارية، ولا ينبغي اعتبار النقطة الحالية حدًا مساحيًا رسميًا.
            </p>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardHeader><CardTitle>4. مراجعة البيانات قبل الحفظ</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <ReviewItem label="الموقع الرئيسي" value={selectedSite?.name || '-'} />
              <ReviewItem label="الصك المرتبط" value={selectedSite?.deed?.deedNumber || 'غير مرتبط'} />
              <ReviewItem label="رمز المساحة" value={form.areaCode || '-'} />
              <ReviewItem label="رقم الموقع" value={form.areaNumber || '-'} />
              <ReviewItem
                label="المساحة التقريبية"
                value={form.approximateArea ? `${Number(form.approximateArea).toLocaleString('ar-SA')} م²` : 'غير مدخلة'}
              />
              <ReviewItem
                label="المساحة المساحية المعتمدة"
                value={form.surveyedArea ? `${Number(form.surveyedArea).toLocaleString('ar-SA')} م²` : 'غير متوفرة'}
              />
              <ReviewItem label="حالة المساحة" value={statusLabels[form.occupancyStatus]} />
              <ReviewItem label="جاهزية الاستثمار" value={readinessLabels[form.investmentReadiness]} />
              <ReviewItem label="دقة الموقع" value={accuracyLabels[form.geometryAccuracy]} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                {form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : 'لا توجد إحداثيات'}
              </Badge>
              <Badge variant="secondary">
                {form.geometryAccuracy === 'APPROXIMATE' ? 'البيانات الجغرافية تقريبية' : accuracyLabels[form.geometryAccuracy]}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات إدارية</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => setField('notes', event.target.value)}
                rows={4}
                placeholder="أي ملاحظات مرتبطة بالموقع أو مصدر البيانات."
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={goBack} disabled={saving}>
              <ChevronRight className="me-2 h-4 w-4" />
              السابق
            </Button>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="ghost" onClick={() => navigate('/investments')} disabled={saving}>
            إلغاء
          </Button>

          {currentStep < stepItems.length - 1 ? (
            <Button type="button" onClick={goNext}>
              التالي
              <ChevronLeft className="ms-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={saving || sites.length === 0}>
              <Save className="me-2 h-4 w-4" />
              {saving ? 'جارٍ الحفظ...' : isEdit ? 'حفظ التعديلات' : 'حفظ المساحة'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const ReviewItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-xl border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="mt-1 font-semibold">{value}</div>
  </div>
);
