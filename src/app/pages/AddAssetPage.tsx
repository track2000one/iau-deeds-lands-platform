import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Barcode,
  Building2,
  Camera,
  FileText,
  Image as ImageIcon,
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

export const AddAssetPage: React.FC = () => {
  const navigate = useNavigate();
  const [attachments, setAttachments] = useState<AssetAttachmentState>(EMPTY_ATTACHMENTS);

  const totalAttachments = useMemo(
    () => Object.values(attachments).reduce((total, files) => total + files.length, 0),
    [attachments]
  );

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

      return {
        ...current,
        [category]: merged,
      };
    });
  };

  const removeFile = (category: AssetAttachmentCategory, index: number) => {
    setAttachments((current) => ({
      ...current,
      [category]: current[category].filter((_, fileIndex) => fileIndex !== index),
    }));
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
            تسجيل البيانات الأساسية للأصل وموقعه وعهدته تمهيدًا لربطه بالباركود والجرد.
          </p>
        </div>

        <Button variant="outline" onClick={() => navigate('/assets/list')} className="h-11 rounded-2xl">
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة لسجل الأصول
        </Button>
      </section>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Barcode className="h-5 w-5 text-primary" />
            البيانات الأساسية
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>رقم الأصل الداخلي</Label>
            <Input placeholder="يُنشأ تلقائيًا مثل AST-2026-000001" disabled />
          </div>
          <div className="space-y-2">
            <Label>رقم الباركود / ملصق الأصل</Label>
            <Input placeholder="امسح الباركود أو أدخل الرقم يدويًا" />
          </div>
          <div className="space-y-2">
            <Label>اسم الأصل *</Label>
            <Input placeholder="مثال: جهاز حاسب مكتبي" />
          </div>
          <div className="space-y-2">
            <Label>التصنيف *</Label>
            <Select>
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
            <Label>الماركة</Label>
            <Input placeholder="مثال: Dell" />
          </div>
          <div className="space-y-2">
            <Label>الموديل</Label>
            <Input placeholder="الموديل" />
          </div>
          <div className="space-y-2 md:col-span-2 xl:col-span-3">
            <Label>الرقم التسلسلي</Label>
            <Input placeholder="Serial Number" />
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
            <Input placeholder="اسم الجهة" />
          </div>
          <div className="space-y-2">
            <Label>المبنى</Label>
            <div className="relative">
              <Building2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pr-9" placeholder="اسم أو رقم المبنى" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>الدور</Label>
            <Input placeholder="الدور" />
          </div>
          <div className="space-y-2">
            <Label>الغرفة / الموقع التفصيلي</Label>
            <Input placeholder="رقم الغرفة أو وصف الموقع" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>صاحب العهدة</Label>
            <div className="relative">
              <UserRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pr-9" placeholder="اسم الموظف أو الرقم الوظيفي" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-white/55 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-xl">
        <CardHeader className="border-b bg-white/40">
          <CardTitle className="text-lg">بيانات إضافية</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label>تاريخ الشراء</Label>
            <Input type="date" />
          </div>
          <div className="space-y-2">
            <Label>قيمة الشراء</Label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea rows={4} placeholder="أي معلومات إضافية عن الأصل..." />
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
                يمكن رفع أكثر من ملف في كل خانة، وسيتم ربطها بسجل الأصل عند تفعيل الحفظ الفعلي.
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
              <div
                key={section.key}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/60 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              >
                <div className="border-b bg-white/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background text-primary">
                      {section.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold">{section.title}</h3>
                      <p className="mt-1 text-xs leading-6 text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <label className="flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/[0.025] px-4 py-4 text-center transition hover:border-primary/60 hover:bg-primary/[0.045]">
                    <Upload className="mb-2 h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">اختيار ملفات</span>
                    <span className="mt-1 text-xs text-muted-foreground">
                      يمكنك اختيار عدة ملفات دفعة واحدة
                    </span>
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

                  {files.length > 0 ? (
                    <div className="space-y-2">
                      {files.map((file, index) => {
                        const isImage = file.type.startsWith('image/');

                        return (
                          <div
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className="flex items-center gap-3 rounded-xl border bg-background/80 px-3 py-2"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/70">
                              {isImage ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium" title={file.name}>
                                {file.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                              onClick={() => removeFile(section.key, index)}
                              title="حذف المرفق"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground">
                      لا توجد ملفات مضافة في هذه الخانة.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          واجهة التسجيل والمرفقات جاهزة. سيتم رفع الملفات وحفظ بيانات الأصل فعليًا عند ربط وحدة الأصول بالـBackend.
        </p>
        <Button disabled className="h-11 rounded-2xl px-6">
          <Save className="ml-2 h-4 w-4" />
          حفظ الأصل
        </Button>
      </div>
    </div>
  );
};
