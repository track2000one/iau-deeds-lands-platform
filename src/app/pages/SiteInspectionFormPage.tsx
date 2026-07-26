import React from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Camera,
  Loader2,
  MapPin,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  InspectionAttachment,
  InspectionItem,
  SiteInspectionInput,
} from '../../types/siteInspection';
import {
  createSiteInspection,
  getSiteInspection,
  updateSiteInspection,
  uploadInspectionImage,
} from '../api/siteInspections';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
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

const emptyInput: SiteInspectionInput = {
  title: '',
  siteType: 'land',
  siteName: '',
  visitDate: new Date().toISOString().slice(0, 16),
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

  React.useEffect(() => {
    if (!inspectionId) return;

    getSiteInspection(inspectionId)
      .then((record) => {
        setForm({
          title: record.title,
          siteType: record.siteType,
          siteName: record.siteName,
          visitDate: record.visitDate.slice(0, 16),
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
          followUpDate: record.followUpDate?.slice(0, 10) || null,
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

  const selectImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setUploading(true);
      const uploaded: InspectionAttachment[] = [];

      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          throw new Error(`الملف ${file.name} ليس صورة`);
        }
        uploaded.push(await uploadInspectionImage(file));
      }

      setField('attachments', [...form.attachments, ...uploaded]);
      toast.success(`تم رفع ${uploaded.length} صورة`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر رفع الصور');
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
      const saved =
        isEdit && inspectionId
          ? await updateSiteInspection(inspectionId, form)
          : await createSiteInspection(form);

      toast.success(isEdit ? 'تم تحديث المعاينة' : 'تم حفظ المعاينة');
      navigate(`/site-inspections/${saved.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تعذر حفظ المعاينة');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center">جاري تحميل المعاينة...</div>;
  }

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-6">
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

      <Card>
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
          <Field label="تاريخ ووقت الزيارة *">
            <Input type="datetime-local" value={form.visitDate} onChange={(e) => setField('visitDate', e.target.value)} />
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

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />الإحداثيات</CardTitle></CardHeader>
        <CardContent>
          <MapCoordinatePicker
            coordinates={
              form.latitude != null && form.longitude != null
                ? { latitude: form.latitude, longitude: form.longitude }
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
        </CardContent>
      </Card>

      <Card>
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
          <Field label="تاريخ المتابعة">
            <Input type="date" value={form.followUpDate || ''} onChange={(e) => setField('followUpDate', e.target.value || null)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
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

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />صور الموقع</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center hover:bg-muted/30">
            {uploading ? <Loader2 className="mb-2 h-8 w-8 animate-spin" /> : <Camera className="mb-2 h-8 w-8 text-primary" />}
            <span className="font-semibold">{uploading ? 'جاري رفع الصور...' : 'التقاط صور أو اختيارها'}</span>
            <span className="mt-1 text-xs text-muted-foreground">يمكن اختيار عدة صور من كاميرا الهاتف أو المعرض</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={selectImages}
            />
          </label>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {form.attachments.map((attachment, index) => (
              <div key={`${attachment.driveUrl}-${index}`} className="relative overflow-hidden rounded-xl border">
                <img src={attachment.driveUrl} alt={attachment.title} className="aspect-square w-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute left-2 top-2"
                  onClick={() => removeAttachment(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <p className="truncate p-2 text-xs">{attachment.title}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-20 flex flex-col-reverse gap-2 border-t bg-background/95 p-3 backdrop-blur sm:flex-row sm:justify-end">
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

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    {children}
  </div>
);
