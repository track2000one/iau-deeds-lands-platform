import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Barcode,
  Building2,
  Camera,
  FileText,
  MapPin,
  PackagePlus,
  Paperclip,
  Save,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AppDateField } from '../components/AppDateField';
import { createAsset, uploadAssetFile } from '../api/assets';
import type { AssetInput, AssetStatus } from '../../types/asset';

type AssetAttachmentCategory =
  | 'asset_images'
  | 'purchase_documents'
  | 'warranty_documents'
  | 'custody_documents'
  | 'other_documents';

type AssetAttachmentState = Record<AssetAttachmentCategory, File[]>;

const EMPTY_ATTACHMENTS: AssetAttachmentState = {
  asset_images: [],
  purchase_documents: [],
  warranty_documents: [],
  custody_documents: [],
  other_documents: [],
};

const ATTACHMENT_SECTIONS: Array<{
  key: AssetAttachmentCategory;
  title: string;
  description: string;
  accept: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'asset_images',
    title: 'صور الأصل',
    description: 'صور عامة للأصل، ملصق الباركود، الرقم التسلسلي أو حالته الحالية.',
    accept: 'image/*',
    icon: <Camera className="h-5 w-5" />,
  },
  {
    key: 'purchase_documents',
    title: 'الفاتورة ومستندات الشراء',
    description: 'الفاتورة، أمر الشراء، مستند التوريد أو أي مستند مالي مرتبط بالأصل.',
    accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx',
    icon: <FileText className="h-5 w-5" />,
  },
  {
    key: 'warranty_documents',
    title: 'الضمان والكتيبات الفنية',
    description: 'شهادة الضمان، كتيب التشغيل، المواصفات الفنية أو تقارير الفحص.',
    accept: 'image/*,.pdf,.doc,.docx',
    icon: <Paperclip className="h-5 w-5" />,
  },
  {
    key: 'custody_documents',
    title: 'مستندات العهدة والاستلام',
    description: 'محضر استلام، نموذج عهدة، نقل عهدة أو مستند تسليم واستلام.',
    accept: 'image/*,.pdf,.doc,.docx',
    icon: <UserRound className="h-5 w-5" />,
  },
  {
    key: 'other_documents',
    title: 'مرفقات أخرى',
    description: 'أي صور أو ملفات إضافية مرتبطة بالأصل ولا تندرج ضمن الأقسام السابقة.',
    accept: 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt',
    icon: <Upload className="h-5 w-5" />,
  },
];

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const emptyForm: AssetInput = {
  itemNumber: '',
  barcode: '',
  name: '',
  category: '',
  brand: '',
  model: '',
  serialNumber: '',
  status: 'available',
  department: '',
  building: '',
  floor: '',
  room: '',
  purchaseDate: '',
  purchaseDateType: 'gregorian',
  purchaseValue: null,
  notes: '',
  attachments: [],
};

export const AddAssetPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<AssetInput>(emptyForm);
  const [attachments, setAttachments] = useState<AssetAttachmentState>(EMPTY_ATTACHMENTS);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState('');

  const totalAttachments = useMemo(
    () => Object.values(attachments).reduce((total, files) => total + files.length, 0),
    [attachments]
  );

  const setField = <K extends keyof AssetInput>(key: K, value: AssetInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const addFiles = (category: AssetAttachmentCategory, files: FileList | null) => {
    if (!files?.length) return;

    setAttachments((current) => {
      const existing = current[category];
      const incoming = Array.from(files);
      const merged = [...existing];

      incoming.forEach((file) => {
        const duplicate = merged.some(
          (item) =>
            item.name === file.name &&
            item.size === file.size &&
            item.lastModified === file.lastModified
        );
        if (!duplicate) merged.push(file);
      });

      return { ...current, [category]: merged };
    });
  };

  const removeFile = (category: AssetAttachmentCategory, index: number) => {
    setAttachments((current) => ({
      ...current,
      [category]: current[category].filter((_, fileIndex) => fileIndex !== index),
    }));
  };

  const handleSubmit = async () => {
    setError('');

    if (!String(form.itemNumber || '').trim()) { setError('رقم الصنف مطلوب.'); return; }

    if (!String(form.name || '').trim()) {
      setError('اسم الأصل مطلوب.');
      return;
    }

    if (!String(form.category || '').trim()) {
      setError('تصنيف الأصل مطلوب.');
      return;
    }

    try {
      setIsSaving(true);

      const filesToUpload = ATTACHMENT_SECTIONS.flatMap((section) =>
        attachments[section.key].map((file) => ({
          file,
          category: section.key,
          categoryTitle: section.title,
        }))
      );

      const uploaded = [];
      for (let index = 0; index < filesToUpload.length; index += 1) {
        const item = filesToUpload[index];
        setUploadProgress(`رفع المرفق ${index + 1} من ${filesToUpload.length}: ${item.file.name}`);
        const uploadedFile = await uploadAssetFile(item.file, item.category);
        uploaded.push({
          ...uploadedFile,
          notes: item.category,
        });
      }

      setUploadProgress('حفظ بيانات الأصل...');

      const created = await createAsset({
        ...form,
        itemNumber: String(form.itemNumber || '').trim(),
        barcode: String(form.barcode || '').trim() || null,
        name: String(form.name || '').trim(),
        category: String(form.category || '').trim(),
        brand: String(form.brand || '').trim() || null,
        model: String(form.model || '').trim() || null,
        serialNumber: String(form.serialNumber || '').trim() || null,
        department: String(form.department || '').trim() || null,
        building: String(form.building || '').trim() || null,
        floor: String(form.floor || '').trim() || null,
        room: String(form.room || '').trim() || null,
        purchaseDate: form.purchaseDate || null,
        purchaseValue:
          form.purchaseValue === null || form.purchaseValue === undefined || form.purchaseValue === ('' as any)
            ? null
            : Number(form.purchaseValue),
        notes: String(form.notes || '').trim() || null,
        attachments: uploaded,
      });

      navigate('/assets/list', {
        replace: true,
        state: { createdAssetNumber: created.assetNumber },
      });
    } catch (submitError: any) {
      setError(submitError?.message || 'تعذر حفظ الأصل. حاول مرة أخرى.');
    } finally {
      setIsSaving(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 sm:space-y-6">
      <section className="flex flex-col gap-4 rounded-[28px] border border-white/55 bg-white/70 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <PackagePlus className="h-4 w-4" />
            وحدة الأصول
          </div>
          <h1 className="text-2xl font-black sm:text-3xl">إضافة أصل جديد</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            تسجيل الأصل وربطه بالموقع الإداري والمرفقات مباشرة بقاعدة البيانات.
          </p>
        </div>

        <Button variant="outline" onClick={() => navigate('/assets/list')} className="h-11 rounded-2xl">
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة لسجل الأصول
        </Button>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Barcode className="h-5 w-5 text-primary" />
            البيانات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>رقم الصنف *</Label>
            <Input value={form.itemNumber || ''} onChange={(e) => setField('itemNumber', e.target.value)} placeholder="أدخل رقم الصنف الفريد" />
          </div>
          <div className="space-y-2">
            <Label>رقم الباركود / ملصق الأصل</Label>
            <Input value={form.barcode || ''} onChange={(e) => setField('barcode', e.target.value)} placeholder="اتركه فارغًا ليُنشأ تلقائيًا من وحدة الأصول" />
            <p className="text-xs text-muted-foreground">سيُنشئ النظام رقم باركود فريدًا تلقائيًا عند الحفظ.</p>
          </div>
          <div className="space-y-2">
            <Label>اسم الأصل *</Label>
            <Input value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="مثال: جهاز حاسب مكتبي" />
          </div>
          <div className="space-y-2">
            <Label>التصنيف *</Label>
            <Select value={form.category} onValueChange={(value) => setField('category', value)}>
              <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="it">تقنية معلومات</SelectItem>
                <SelectItem value="furniture">أثاث</SelectItem>
                <SelectItem value="equipment">أجهزة ومعدات</SelectItem>
                <SelectItem value="vehicle">مركبات</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الحالة</Label>
            <Select value={form.status} onValueChange={(value) => setField('status', value as AssetStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="available">متاح</SelectItem>
                <SelectItem value="in_use">قيد الاستخدام</SelectItem>
                <SelectItem value="maintenance">تحت الصيانة</SelectItem>
                <SelectItem value="damaged">تالف</SelectItem>
                <SelectItem value="lost">مفقود / عجز</SelectItem>
                <SelectItem value="disposed">مستبعد</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>الماركة</Label>
            <Input value={form.brand || ''} onChange={(e) => setField('brand', e.target.value)} placeholder="مثال: Dell" />
          </div>
          <div className="space-y-2">
            <Label>الموديل</Label>
            <Input value={form.model || ''} onChange={(e) => setField('model', e.target.value)} placeholder="الموديل" />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-2">
            <Label>الرقم التسلسلي</Label>
            <Input value={form.serialNumber || ''} onChange={(e) => setField('serialNumber', e.target.value)} placeholder="Serial Number" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            الموقع والعهدة
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>الجهة / الإدارة</Label>
            <Input value={form.department || ''} onChange={(e) => setField('department', e.target.value)} placeholder="اسم الجهة" />
          </div>
          <div className="space-y-2">
            <Label>المبنى</Label>
            <div className="relative">
              <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={form.building || ''} onChange={(e) => setField('building', e.target.value)} className="pr-9" placeholder="اسم أو رقم المبنى" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>الدور</Label>
            <Input value={form.floor || ''} onChange={(e) => setField('floor', e.target.value)} placeholder="الدور" />
          </div>
          <div className="space-y-2">
            <Label>الغرفة / الموقع التفصيلي</Label>
            <Input value={form.room || ''} onChange={(e) => setField('room', e.target.value)} placeholder="رقم الغرفة أو وصف الموقع" />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="text-lg">بيانات إضافية</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <AppDateField
              id="asset-purchase-date"
              label="تاريخ الشراء"
              value={String(form.purchaseDate || '')}
              dateType={form.purchaseDateType || 'gregorian'}
              onValueChange={(value) => setField('purchaseDate', value)}
              onDateTypeChange={(value) => setField('purchaseDateType', value)}
            />
          </div>
          <div className="space-y-2">
            <Label>قيمة الشراء</Label>
            <Input type="number" min="0" step="0.01" value={form.purchaseValue ?? ''} onChange={(e) => setField('purchaseValue', e.target.value === '' ? null : Number(e.target.value))} placeholder="0.00" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} rows={4} placeholder="أي معلومات إضافية عن الأصل..." />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Paperclip className="h-5 w-5 text-primary" />
                المرفقات والوثائق
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                يمكن رفع عدة ملفات في كل خانة، وسيتم رفعها إلى Google Drive وربطها تلقائيًا بالأصل.
              </p>
            </div>
            <div className="w-fit rounded-full border bg-background/80 px-3 py-1 text-xs font-semibold">
              {totalAttachments} مرفق
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-4 p-5 sm:p-6 lg:grid-cols-2">
          {ATTACHMENT_SECTIONS.map((section) => {
            const files = attachments[section.key];
            return (
              <div key={section.key} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/60 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                <div className="border-b bg-white/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background text-primary">
                      {section.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold">{section.title}</h3>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">{section.description}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <label className="flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/[0.025] px-4 py-4 text-center transition hover:border-primary/60 hover:bg-primary/[0.045]">
                    <Upload className="mb-2 h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">اختيار ملفات</span>
                    <span className="mt-1 text-xs text-muted-foreground">يمكنك اختيار عدة ملفات دفعة واحدة</span>
                    <input
                      type="file"
                      multiple
                      accept={section.accept}
                      className="hidden"
                      onChange={(event) => {
                        addFiles(section.key, event.target.files);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="space-y-2">
                      {files.map((file, index) => (
                        <div key={`${file.name}-${file.lastModified}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border bg-background/80 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(section.key, index)} className="h-8 w-8 shrink-0">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">الحفظ مرتبط الآن بقاعدة البيانات.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {uploadProgress || 'سيُنشأ رقم الأصل تلقائيًا، وترفع المرفقات ثم تربط بالسجل.'}
          </p>
        </div>
        <Button disabled={isSaving} onClick={handleSubmit} className="h-11 rounded-2xl px-6">
          <Save className="ml-2 h-4 w-4" />
          {isSaving ? 'جارٍ الحفظ...' : 'حفظ الأصل'}
        </Button>
      </div>
    </div>
  );
};
