import React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Camera,
  Loader2,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { SmartDocumentExtraction } from '../components/SmartDocumentExtraction';
import type {
  InspectionAttachment,
  InspectionItem,
  SiteInspectionInput,
  SiteInspectionReferences,
} from '../../types/siteInspection';
import {
  createSiteInspection,
  getSiteInspection,
  getSiteInspectionReferences,
  updateSiteInspection,
  uploadInspectionImage,
} from '../api/siteInspections';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { AppDateField } from '../components/AppDateField';
import { normalizeFlexibleDateForInput } from '../../utils/dateUtils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { NativeSelect } from '../components/ui/native-select';
import { Textarea } from '../components/ui/textarea';

const categories = [
  'الحالة العامة',
  'النظافة',
  'الأسوار والبوابات',
  'التعديات',
  'المخلفات',
  'اللوحات التعريفية',
  'المداخل والطرق',
  'الإنارة',
  'السلامة',
  'المباني والمنشآت',
  'الخدمات والمرافق',
  'الاستخدام الحالي',
];

const emptyReferences: SiteInspectionReferences = { deeds: [], buildings: [] };

// Ignore Arabic diacritics and common alef variants while searching building references.
const normalizeBuildingSearch = (value: string) =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase('ar')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim();

const parseReferenceCoordinates = (value: unknown): { latitude: number; longitude: number } | null => {
  if (!value) return null;
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const latitude = Number(record.latitude ?? record.lat);
    const longitude = Number(record.longitude ?? record.lng ?? record.lon);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { latitude, longitude };
  }
  const raw = String(value).trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const fromJson = parseReferenceCoordinates(parsed);
    if (fromJson) return fromJson;
  } catch {}
  const numbers = raw.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (numbers.length >= 2 && Number.isFinite(numbers[0]) && Number.isFinite(numbers[1])) {
    return { latitude: numbers[0], longitude: numbers[1] };
  }
  return null;
};

const emptyInput: SiteInspectionInput = {
  title: '',
  siteType: 'land',
  siteName: '',
  deedId: null,
  buildingId: null,
  visitDate: new Date().toISOString().slice(0, 10),
  visitDateType: 'gregorian',
  visitPurpose: '',
  inspectorName: '',
  accompanyingEntity: '',
  region: 'المنطقة الشرقية',
  city: '',
  district: '',
  locationDescription: '',
  deedNumber: '',
  plotNumber: '',
  planNumber: '',
  latitude: null,
  longitude: null,
  locationAccuracy: null,
  mapUrl: '',
  overallStatus: 'good',
  priority: 'normal',
  observations: '',
  recommendedAction: '',
  referredEntity: '',
  followUpDate: null,
  followUpDateType: 'gregorian',
  workflowStatus: 'new',
  items: [],
  attachments: [],
};

export const SiteInspectionFormPage: React.FC = () => {
  const { inspectionId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(inspectionId);
  const [form, setForm] = React.useState<SiteInspectionInput>(emptyInput);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(isEdit);
  const [uploading, setUploading] = React.useState(false);
  const [showMap, setShowMap] = React.useState(true);
  const [visitTime, setVisitTime] = React.useState(new Date().toTimeString().slice(0, 5));
  const [references, setReferences] = React.useState<SiteInspectionReferences>(emptyReferences);
  const [referencesLoading, setReferencesLoading] = React.useState(true);
  const [referenceMode, setReferenceMode] = React.useState<'none' | 'deed' | 'building'>('none');
  const [buildingSearch, setBuildingSearch] = React.useState('');
  const [activeBuildingSuggestion, setActiveBuildingSuggestion] = React.useState(0);

  const matchingBuildings = React.useMemo(() => {
    const query = normalizeBuildingSearch(buildingSearch);
    if (!query) return references.buildings;
    return references.buildings.filter((building) =>
      [building.name, building.buildingNumber, building.campusLocation]
        .some((value) => normalizeBuildingSearch(value || '').includes(query))
    );
  }, [buildingSearch, references.buildings]);
  const visibleBuildingSuggestions = matchingBuildings.slice(0, 8);
  // Keep the linked building available in the select while another search is typed.
  const selectedBuilding = references.buildings.find((building) => building.id === form.buildingId);

  React.useEffect(() => {
    getSiteInspectionReferences()
      .then(setReferences)
      .catch((error) => toast.error(error instanceof Error ? error.message : 'تعذر تحميل الصكوك والمباني المرجعية'))
      .finally(() => setReferencesLoading(false));
  }, []);

  React.useEffect(() => {
    if (!inspectionId) return;

    getSiteInspection(inspectionId)
      .then((record) => {
        setVisitTime(record.visitDate?.slice(11, 16) || '09:00');
        setReferenceMode(record.deedId ? 'deed' : record.buildingId ? 'building' : 'none');
        setForm({
          title: record.title,
          siteType: record.siteType,
          siteName: record.siteName,
          deedId: record.deedId || null,
          buildingId: record.buildingId || null,
          visitDate: normalizeFlexibleDateForInput(record.visitDate, record.visitDateType || 'gregorian'),
          visitDateType: record.visitDateType || 'gregorian',
          visitPurpose: record.visitPurpose || '',
          inspectorName: record.inspectorName || '',
          accompanyingEntity: record.accompanyingEntity || '',
          region: record.region || '',
          city: record.city || '',
          district: record.district || '',
          locationDescription: record.locationDescription || '',
          deedNumber: record.deedNumber || '',
          plotNumber: record.plotNumber || '',
          planNumber: record.planNumber || '',
          latitude: record.latitude ?? null,
          longitude: record.longitude ?? null,
          locationAccuracy: record.locationAccuracy ?? null,
          mapUrl: record.mapUrl || '',
          overallStatus: record.overallStatus,
          priority: record.priority,
          observations: record.observations || '',
          recommendedAction: record.recommendedAction || '',
          referredEntity: record.referredEntity || '',
          followUpDate: record.followUpDate ? normalizeFlexibleDateForInput(record.followUpDate, record.followUpDateType || 'gregorian') : null,
          followUpDateType: record.followUpDateType || 'gregorian',
          workflowStatus: record.workflowStatus,
          items: record.items || [],
          attachments: record.attachments || [],
        });
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : 'تعذر تحميل المعاينة')
      )
      .finally(() => setLoading(false));
  }, [inspectionId]);

  const setField = <K extends keyof SiteInspectionInput>(
    key: K,
    value: SiteInspectionInput[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const changeReferenceMode = (mode: 'none' | 'deed' | 'building') => {
    setReferenceMode(mode);
    if (mode !== 'building') setBuildingSearch('');
    setForm((current) => ({
      ...current,
      deedId: mode === 'deed' ? current.deedId : null,
      buildingId: mode === 'building' ? current.buildingId : null,
    }));
  };

  const selectDeedReference = (deedId: string) => {
    const deed = references.deeds.find((item) => item.id === deedId);
    if (!deed) {
      setForm((current) => ({ ...current, deedId: null }));
      return;
    }
    const coordinates = parseReferenceCoordinates(deed.coordinates);
    setForm((current) => ({
      ...current,
      deedId: deed.id,
      buildingId: null,
      siteType: 'land',
      siteName: deed.propertyDescription || `صك رقم ${deed.deedNumber}`,
      deedNumber: deed.deedNumber || '',
      plotNumber: deed.plotNumber || '',
      planNumber: deed.planNumber || '',
      region: deed.region || current.region,
      city: deed.city || current.city,
      district: deed.district || current.district,
      locationDescription: deed.propertyDescription || current.locationDescription,
      latitude: coordinates?.latitude ?? current.latitude,
      longitude: coordinates?.longitude ?? current.longitude,
      mapUrl: coordinates
        ? `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`
        : current.mapUrl,
      title: current.title.trim() ? current.title : `معاينة ${deed.propertyDescription || `الصك ${deed.deedNumber}`}`,
    }));
  };

  const selectBuildingReference = (buildingId: string) => {
    setBuildingSearch('');
    const building = references.buildings.find((item) => item.id === buildingId);
    if (!building) {
      setForm((current) => ({ ...current, buildingId: null }));
      return;
    }
    setForm((current) => ({
      ...current,
      buildingId: building.id,
      deedId: null,
      siteType: 'building',
      siteName: building.name || `مبنى ${building.buildingNumber}`,
      deedNumber: '',
      plotNumber: '',
      planNumber: '',
      region: building.region || current.region,
      city: building.city || current.city,
      district: building.district || current.district,
      locationDescription: building.campusLocation
        ? [building.name || `مبنى ${building.buildingNumber}`, building.campusLocation].filter(Boolean).join(' — ')
        : current.locationDescription,
      latitude: building.latitude ?? current.latitude,
      longitude: building.longitude ?? current.longitude,
      mapUrl: building.latitude != null && building.longitude != null
        ? `https://www.google.com/maps?q=${building.latitude},${building.longitude}`
        : current.mapUrl,
      title: current.title.trim() ? current.title : `معاينة ${building.name || `المبنى ${building.buildingNumber}`}`,
    }));
  };

  const addItem = () => {
    setField('items', [
      ...form.items,
      { category: categories[0], status: 'good', note: '', priority: 'normal' },
    ]);
  };

  const updateItem = (index: number, patch: Partial<InspectionItem>) => {
    setField(
      'items',
      form.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setField('items', form.items.filter((_, itemIndex) => itemIndex !== index));
  };

  const uploadImagesForCategory = async (
    event: React.ChangeEvent<HTMLInputElement>,
    category: string
  ) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setUploading(true);
      const uploaded: InspectionAttachment[] = [];

      for (const file of files) {
        const supported =
          file.type.startsWith('image/') ||
          file.type === 'application/pdf';

        if (!supported) {
          throw new Error(
            `الملف ${file.name} غير مدعوم. المسموح: الصور وPDF`
          );
        }

        const image = await uploadInspectionImage(file);

        uploaded.push({
          ...image,
          title: file.name,
          notes: category,
        });
      }

      setField('attachments', [...form.attachments, ...uploaded]);
      toast.success(`تم رفع ${uploaded.length} صورة`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'تعذر رفع الصور'
      );
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setField(
      'attachments',
      form.attachments.filter((_, attachmentIndex) => attachmentIndex !== index)
    );
  };

  const save = async () => {
    if (!form.title.trim() || !form.siteName.trim() || !form.visitDate) {
      toast.error('أكمل عنوان المعاينة واسم الموقع وتاريخ الزيارة');
      return;
    }

    try {
      setSaving(true);
      const visitDateWithTime = form.visitDate
        ? `${form.visitDate}${form.visitDateType === 'hijri' ? ' ' : 'T'}${visitTime || '00:00'}`
        : form.visitDate;
      const payload = { ...form, visitDate: visitDateWithTime };
      const saved =
        isEdit && inspectionId
          ? await updateSiteInspection(inspectionId, payload)
          : await createSiteInspection(payload);

      toast.success(isEdit ? 'تم تحديث المعاينة' : 'تم حفظ المعاينة');
      navigate(`/site-inspections/${saved.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ المعاينة');
    } finally {
      setSaving(false);
    }
  };


  const applySmartExtraction = React.useCallback((fields: Record<string, unknown>) => {
    setForm((current) => {
      const next = { ...current } as any;
      const alwaysApply = new Set(['siteType', 'visitDate', 'visitDateType', 'followUpDate', 'followUpDateType', 'region']);
      const keys = ['title', 'siteType', 'siteName', 'visitDate', 'visitDateType', 'visitPurpose', 'inspectorName', 'accompanyingEntity', 'region', 'city', 'district', 'locationDescription', 'deedNumber', 'plotNumber', 'planNumber', 'latitude', 'longitude', 'observations', 'recommendedAction', 'referredEntity', 'followUpDate', 'followUpDateType'];
      keys.forEach((key) => {
        const value = fields[key];
        if (value === null || value === undefined || String(value).trim() === '') return;
        const existing = next[key];
        const empty = existing === null || existing === undefined || existing === '';
        if (empty || alwaysApply.has(key)) next[key] = value;
      });
      return next;
    });
  }, []);
  if (loading) {
    return <div className="p-10 text-center">جاري تحميل المعاينة...</div>;
  }

  return (
    <div className="mobile-full-width w-full min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {isEdit ? 'تعديل المعاينة الميدانية' : 'إضافة معاينة ميدانية'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أدخل بيانات الزيارة والملاحظات والصور من الهاتف أو الحاسب.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/site-inspections')}>
          <X className="ml-2 h-4 w-4" />
          إلغاء
        </Button>
      </div>

      <SmartDocumentExtraction module="site_inspection" onApply={applySmartExtraction} />

      <Card className="w-full min-w-0 overflow-hidden border-sky-200 bg-sky-50/30">
        <CardHeader>
          <CardTitle>الارتباط بالسجل المركزي</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="مرجع المعاينة">
            <NativeSelect
              value={referenceMode}
              onChange={(event) => changeReferenceMode(event.target.value as 'none' | 'deed' | 'building')}
              disabled={referencesLoading}
            >
              <option value="none">غير مرتبطة بسجل مركزي</option>
              <option value="deed">صك من سجل الصكوك</option>
              <option value="building">مبنى من السجل المركزي للمباني</option>
            </NativeSelect>
          </Field>

          {referenceMode === 'deed' && (
            <div className="md:col-span-2">
              <Field label="اختر الصك">
                <NativeSelect value={form.deedId || ''} onChange={(event) => selectDeedReference(event.target.value)}>
                  <option value="">اختر الصك...</option>
                  {references.deeds.map((deed) => (
                    <option key={deed.id} value={deed.id}>
                      {deed.deedNumber} — {deed.propertyDescription || 'بدون وصف'}{deed.city ? ` — ${deed.city}` : ''}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          )}

          {referenceMode === 'building' && (
            <div className="space-y-3 md:col-span-2">
              <Field label="بحث باسم المبنى">
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    dir="rtl"
                    value={buildingSearch}
                    onChange={(event) => {
                      setBuildingSearch(event.target.value);
                      setActiveBuildingSuggestion(0);
                    }}
                    onKeyDown={(event) => {
                      if (!buildingSearch.trim() || !visibleBuildingSuggestions.length) {
                        if (event.key === 'Escape') setBuildingSearch('');
                        return;
                      }
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        setActiveBuildingSuggestion((index) => Math.min(index + 1, visibleBuildingSuggestions.length - 1));
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        setActiveBuildingSuggestion((index) => Math.max(index - 1, 0));
                      } else if (event.key === 'Enter') {
                        event.preventDefault();
                        const building = visibleBuildingSuggestions[activeBuildingSuggestion];
                        if (building) selectBuildingReference(building.id);
                      } else if (event.key === 'Escape') {
                        event.preventDefault();
                        setBuildingSearch('');
                      }
                    }}
                    placeholder="اكتب اسم المبنى أو رقمه..."
                    aria-label="بحث باسم المبنى"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-controls="building-autocomplete-results"
                    aria-expanded={Boolean(buildingSearch.trim() && visibleBuildingSuggestions.length)}
                    aria-activedescendant={buildingSearch.trim() && visibleBuildingSuggestions[activeBuildingSuggestion]
                      ? `building-suggestion-${visibleBuildingSuggestions[activeBuildingSuggestion].id}`
                      : undefined}
                    className="pr-10 pl-10"
                    disabled={referencesLoading}
                  />
                  {buildingSearch && (
                    <button
                      type="button"
                      title="مسح البحث"
                      aria-label="مسح البحث"
                      onClick={() => setBuildingSearch('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {buildingSearch.trim() && !referencesLoading && (
                  <div
                    id="building-autocomplete-results"
                    role="listbox"
                    aria-label="أسماء المباني المطابقة"
                    className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-sky-200 bg-white p-1 shadow-md"
                  >
                    {visibleBuildingSuggestions.length ? (
                      <>
                        {visibleBuildingSuggestions.map((building, index) => (
                          <button
                            key={building.id}
                            id={`building-suggestion-${building.id}`}
                            type="button"
                            role="option"
                            aria-selected={activeBuildingSuggestion === index}
                            onMouseEnter={() => setActiveBuildingSuggestion(index)}
                            onClick={() => selectBuildingReference(building.id)}
                            className={`flex w-full flex-col gap-1 rounded-lg px-3 py-2 text-right transition-colors ${
                              activeBuildingSuggestion === index ? 'bg-sky-100 text-sky-950' : 'text-slate-800 hover:bg-sky-50'
                            }`}
                          >
                            <span className="text-sm font-semibold">{building.name || 'مبنى بدون اسم'}</span>
                            <span className="text-xs text-slate-600" dir="rtl">
                              رقم المبنى: {building.buildingNumber}
                              {building.campusLocation ? ` — ${building.campusLocation}` : ''}
                            </span>
                          </button>
                        ))}
                        {matchingBuildings.length > visibleBuildingSuggestions.length && (
                          <div className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                            تظهر أول {visibleBuildingSuggestions.length} نتائج من أصل {matchingBuildings.length}. أضف حروفًا لتضييق البحث.
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="px-3 py-3 text-sm text-slate-600">لا توجد مبانٍ مطابقة. جرّب اسمًا أو رقمًا آخر.</p>
                    )}
                  </div>
                )}
              </Field>
              <Field label="أو اختر المبنى من القائمة">
                <NativeSelect
                  value={form.buildingId || ''}
                  onChange={(event) => selectBuildingReference(event.target.value)}
                  disabled={referencesLoading}
                >
                  <option value="">{referencesLoading ? 'جارٍ تحميل المباني...' : 'اختر المبنى...'}</option>
                  {selectedBuilding && buildingSearch.trim() && !matchingBuildings.some((building) => building.id === selectedBuilding.id) && (
                    <option value={selectedBuilding.id}>
                      المبنى المرتبط حاليًا: {selectedBuilding.buildingNumber} — {selectedBuilding.name || 'مبنى بدون اسم'}
                    </option>
                  )}
                  {matchingBuildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.buildingNumber} — {building.name || 'مبنى بدون اسم'}{building.campusLocation ? ` — ${building.campusLocation}` : ''}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              {buildingSearch.trim() && (
                <p role="status" className="text-xs text-slate-600">
                  عدد المباني المطابقة: {matchingBuildings.length}
                </p>
              )}
            </div>
          )}

          <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs leading-6 text-slate-600">
            عند اختيار صك أو مبنى يتم ربط المعاينة بالسجل الأصلي بمعرف ثابت، وتعبئة بيانات الموقع الأساسية تلقائيًا. يمكن تعديل تفاصيل الزيارة بعد الربط دون تكرار تعريف الأصل.
          </div>
        </CardContent>
      </Card>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader><CardTitle>بيانات الزيارة والموقع</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="عنوان المعاينة *">
            <Input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="مثال: معاينة أرض الجبيل" />
          </Field>
          <Field label="نوع الموقع">
            <NativeSelect value={form.siteType} onChange={(e) => setField('siteType', e.target.value)}>
              <option value="land">أرض</option>
              <option value="building">مبنى</option>
              <option value="facility">مرفق</option>
              <option value="general_site">موقع عام</option>
              <option value="other">أخرى</option>
            </NativeSelect>
          </Field>
          <Field label="اسم الأرض أو الموقع *">
            <Input value={form.siteName} onChange={(e) => setField('siteName', e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <AppDateField
              id="inspection-visit-date"
              label="تاريخ الزيارة"
              required
              value={form.visitDate}
              dateType={form.visitDateType || 'gregorian'}
              onValueChange={(value) => setField('visitDate', value)}
              onDateTypeChange={(value) => setField('visitDateType', value)}
              helperText="اختر نوع التاريخ حسب محضر الزيارة أو المستند الرسمي."
            />
          </div>
          <Field label="وقت الزيارة">
            <Input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} />
          </Field>
          <Field label="القائم بالمعاينة">
            <Input value={form.inspectorName || ''} onChange={(e) => setField('inspectorName', e.target.value)} />
          </Field>
          <Field label="الجهة المرافقة">
            <Input value={form.accompanyingEntity || ''} onChange={(e) => setField('accompanyingEntity', e.target.value)} />
          </Field>
          <Field label="المنطقة">
            <Input value={form.region || ''} onChange={(e) => setField('region', e.target.value)} />
          </Field>
          <Field label="المدينة">
            <Input value={form.city || ''} onChange={(e) => setField('city', e.target.value)} />
          </Field>
          <Field label="الحي">
            <Input value={form.district || ''} onChange={(e) => setField('district', e.target.value)} />
          </Field>
          <Field label="رقم الصك">
            <Input value={form.deedNumber || ''} onChange={(e) => setField('deedNumber', e.target.value)} />
          </Field>
          <Field label="رقم القطعة">
            <Input value={form.plotNumber || ''} onChange={(e) => setField('plotNumber', e.target.value)} />
          </Field>
          <Field label="رقم المخطط">
            <Input value={form.planNumber || ''} onChange={(e) => setField('planNumber', e.target.value)} />
          </Field>
          <div className="md:col-span-2 lg:col-span-3">
            <Field label="سبب الزيارة">
              <Textarea value={form.visitPurpose || ''} onChange={(e) => setField('visitPurpose', e.target.value)} rows={3} />
            </Field>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <Field label="وصف الموقع">
              <Textarea value={form.locationDescription || ''} onChange={(e) => setField('locationDescription', e.target.value)} rows={3} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              الإحداثيات
            </CardTitle>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMap((current) => !current)}
              className="w-full sm:w-auto"
            >
              <MapPin className="ml-2 h-4 w-4" />
              {showMap ? 'إخفاء الخريطة' : 'تحديد الموقع من الخريطة'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {form.latitude != null && form.longitude != null ? (
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">خط العرض:</span>
                <span className="mr-2 font-mono">
                  {Number(form.latitude).toFixed(6)}
                </span>
              </div>

              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <span className="text-muted-foreground">خط الطول:</span>
                <span className="mr-2 font-mono">
                  {Number(form.longitude).toFixed(6)}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              لم يتم تحديد الإحداثيات بعد.
            </p>
          )}

          {showMap && (
            <MapCoordinatePicker
              coordinates={
                form.latitude != null && form.longitude != null
                  ? {
                      latitude: form.latitude,
                      longitude: form.longitude,
                    }
                  : undefined
              }
              onChange={(coordinates) =>
                setForm((current) => ({
                  ...current,
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                  mapUrl: `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`,
                }))
              }
            />
          )}
        </CardContent>
      </Card>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader><CardTitle>الحالة والملاحظات</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="الحالة العامة">
            <NativeSelect value={form.overallStatus} onChange={(e) => setField('overallStatus', e.target.value)}>
              <option value="excellent">ممتازة</option>
              <option value="good">جيدة</option>
              <option value="follow_up">تحتاج متابعة</option>
              <option value="maintenance">تحتاج صيانة</option>
              <option value="major_notes">ملاحظات جوهرية</option>
              <option value="emergency">حالة طارئة</option>
            </NativeSelect>
          </Field>
          <Field label="الأولوية">
            <NativeSelect value={form.priority} onChange={(e) => setField('priority', e.target.value)}>
              <option value="low">منخفضة</option>
              <option value="normal">عادية</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </NativeSelect>
          </Field>
          <Field label="حالة المعالجة">
            <NativeSelect value={form.workflowStatus} onChange={(e) => setField('workflowStatus', e.target.value)}>
              <option value="new">جديدة</option>
              <option value="under_review">قيد المراجعة</option>
              <option value="referred">تمت الإحالة</option>
              <option value="in_progress">جارٍ التنفيذ</option>
              <option value="resolved">تمت المعالجة</option>
              <option value="closed">مغلقة</option>
            </NativeSelect>
          </Field>
          <div className="md:col-span-3">
            <Field label="الملاحظات المرصودة">
              <Textarea value={form.observations || ''} onChange={(e) => setField('observations', e.target.value)} rows={5} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="الإجراء المقترح">
              <Textarea value={form.recommendedAction || ''} onChange={(e) => setField('recommendedAction', e.target.value)} rows={4} />
            </Field>
          </div>
          <Field label="الجهة المطلوب التنسيق معها">
            <Input value={form.referredEntity || ''} onChange={(e) => setField('referredEntity', e.target.value)} />
          </Field>
          <div className="md:col-span-2">
              <AppDateField
                id="inspection-followup-date"
                label="تاريخ المتابعة"
                value={form.followUpDate || ''}
                dateType={form.followUpDateType || 'gregorian'}
                onValueChange={(value) => setField('followUpDate', value || null)}
                onDateTypeChange={(value) => setField('followUpDateType', value)}
              />
            </div>
        </CardContent>
      </Card>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>عناصر المعاينة التفصيلية</CardTitle>
            <Button type="button" variant="outline" onClick={addItem}>
              <Plus className="ml-2 h-4 w-4" />
              إضافة ملاحظة
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.items.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              لا توجد عناصر تفصيلية. يمكن إضافة ملاحظة لكل جانب من جوانب الموقع.
            </p>
          ) : (
            form.items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border p-3 md:grid-cols-4">
                <NativeSelect value={item.category} onChange={(e) => updateItem(index, { category: e.target.value })}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </NativeSelect>
                <NativeSelect value={item.status} onChange={(e) => updateItem(index, { status: e.target.value })}>
                  <option value="good">جيد</option>
                  <option value="note">توجد ملاحظة</option>
                  <option value="bad">غير جيد</option>
                  <option value="urgent">عاجل</option>
                </NativeSelect>
                <NativeSelect value={item.priority} onChange={(e) => updateItem(index, { priority: e.target.value })}>
                  <option value="low">منخفضة</option>
                  <option value="normal">عادية</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </NativeSelect>
                <Button type="button" variant="destructive" onClick={() => removeItem(index)}>
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف
                </Button>
                <Textarea
                  value={item.note || ''}
                  onChange={(e) => updateItem(index, { note: e.target.value })}
                  placeholder="تفاصيل الملاحظة..."
                  className="md:col-span-4"
                  rows={3}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="w-full min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            صور الموقع
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            يمكن رفع عدة صور أو ملفات PDF في كل خانة. زر الكاميرا يلتقط
            صورة جديدة، وزر الملفات يسمح باختيار عدة ملفات دفعة واحدة.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ImageUploadSection
              title="صور عامة للموقع"
              description="صور شاملة توضح الموقع من عدة اتجاهات"
              category="general"
              uploading={uploading}
              attachments={form.attachments}
              onUpload={uploadImagesForCategory}
              onRemove={removeAttachment}
            />

            <ImageUploadSection
              title="صور الملاحظات والمخالفات"
              description="التعديات، المخلفات، التلفيات أو أي ملاحظة ميدانية"
              category="observations"
              uploading={uploading}
              attachments={form.attachments}
              onUpload={uploadImagesForCategory}
              onRemove={removeAttachment}
            />

            <ImageUploadSection
              title="صور الحدود والمداخل"
              description="الأسوار، البوابات، المداخل، اللوحات والطرق المحيطة"
              category="boundaries"
              uploading={uploading}
              attachments={form.attachments}
              onUpload={uploadImagesForCategory}
              onRemove={removeAttachment}
            />

            <ImageUploadSection
              title="صور إضافية"
              description="مخططات أو مستندات مصورة أو أي صور أخرى"
              category="other"
              uploading={uploading}
              attachments={form.attachments}
              onUpload={uploadImagesForCategory}
              onRemove={removeAttachment}
            />
          </div>

          <div className="rounded-xl border bg-muted/20 p-3 text-sm">
            إجمالي الملفات المرفوعة:
            <strong className="mr-1">{form.attachments.length}</strong>
          </div>
        </CardContent>
      </Card>

      <div className="mobile-sticky-actions sticky bottom-0 z-20 flex w-full flex-col-reverse gap-2 rounded-t-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => navigate('/site-inspections')} disabled={saving}>
          إلغاء
        </Button>
        <Button onClick={save} disabled={saving || uploading}>
          {saving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
          {saving ? 'جاري الحفظ...' : 'حفظ المعاينة'}
        </Button>
      </div>
    </div>
  );
};



const extractGoogleDriveFileId = (
  attachment: InspectionAttachment
): string | null => {
  if (attachment.driveFileId) return attachment.driveFileId;

  const url = attachment.driveUrl || '';
  const patterns = [
    /\/file\/d\/([^/]+)/,
    /[?&]id=([^&]+)/,
    /\/d\/([^/]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
};

const getAttachmentPreviewUrl = (
  attachment: InspectionAttachment
): string => {
  const fileId = extractGoogleDriveFileId(attachment);

  if (!fileId) return attachment.driveUrl;

  if (attachment.mimeType === 'application/pdf') {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }

  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
};

const isPdfAttachment = (
  attachment: InspectionAttachment
): boolean =>
  attachment.mimeType === 'application/pdf' ||
  attachment.title.toLowerCase().endsWith('.pdf');

type ImageUploadSectionProps = {
  title: string;
  description: string;
  category: string;
  uploading: boolean;
  attachments: InspectionAttachment[];
  onUpload: (
    event: React.ChangeEvent<HTMLInputElement>,
    category: string
  ) => Promise<void>;
  onRemove: (index: number) => void;
};

const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  title,
  description,
  category,
  uploading,
  attachments,
  onUpload,
  onRemove,
}) => {
  const categoryAttachments = attachments
    .map((attachment, originalIndex) => ({
      attachment,
      originalIndex,
    }))
    .filter(({ attachment }) => (attachment.notes || 'general') === category);

  const cameraInputId = `inspection-camera-${category}`;
  const galleryInputId = `inspection-gallery-${category}`;

  return (
    <div className="space-y-3 rounded-xl border p-3 sm:p-4">
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2">
        <label
          htmlFor={cameraInputId}
          className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-3 text-center transition hover:bg-muted/30"
        >
          {uploading ? (
            <Loader2 className="mb-2 h-6 w-6 animate-spin" />
          ) : (
            <Camera className="mb-2 h-6 w-6 text-primary" />
          )}
          <span className="text-sm font-semibold">التقاط صورة</span>
        </label>

        <label
          htmlFor={galleryInputId}
          className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-3 text-center transition hover:bg-muted/30"
        >
          {uploading ? (
            <Loader2 className="mb-2 h-6 w-6 animate-spin" />
          ) : (
            <Plus className="mb-2 h-6 w-6 text-primary" />
          )}
          <span className="text-sm font-semibold">اختيار عدة ملفات</span>
        </label>

        <input
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={uploading}
          onChange={(event) => onUpload(event, category)}
        />

        <input
          id={galleryInputId}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(event) => onUpload(event, category)}
        />
      </div>

      {categoryAttachments.length > 0 && (
        <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2 sm:grid-cols-3">
          {categoryAttachments.map(({ attachment, originalIndex }) => (
            <div
              key={`${attachment.driveUrl}-${originalIndex}`}
              className="relative overflow-hidden rounded-lg border"
            >
              {isPdfAttachment(attachment) ? (
                <iframe
                  src={getAttachmentPreviewUrl(attachment)}
                  title={attachment.title}
                  className="aspect-square w-full bg-white"
                />
              ) : (
                <img
                  src={getAttachmentPreviewUrl(attachment)}
                  alt={attachment.title}
                  className="aspect-square w-full bg-muted object-contain"
                  onError={(event) => {
                    event.currentTarget.src = attachment.driveUrl;
                  }}
                />
              )}

              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute left-1.5 top-1.5 h-9 w-9"
                onClick={() => onRemove(originalIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <button
                type="button"
                className="w-full truncate p-2 text-right text-xs hover:underline"
                onClick={() =>
                  window.open(attachment.driveUrl, '_blank')
                }
              >
                {attachment.title}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        عدد الملفات في هذه الخانة: {categoryAttachments.length}
      </p>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);
