import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDeeds } from '../../context/DeedContext';
import { usePermissions } from '../../context/PermissionsContext';
import { useForm } from 'react-hook-form';
import { DeedFormData } from '../../types/deed';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import {
  Save,
  X,
  MapPin,
  Upload,
  Loader2,
  FileText,
  Image as ImageIcon,
  Map as MapIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { NativeSelect } from '../components/ui/native-select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';

type Coordinates = {
  latitude: number;
  longitude: number;
};

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

type UploadResponse = {
  fileName: string;
  driveUrl: string;
  driveFileId: string;
  mimeType: string;
  attachment?: unknown;
};

type PendingAttachment = {
  title: string;
  driveUrl: string;
  driveFileId?: string;
  mimeType?: string;
  attachmentType: 'deed_image' | 'location_image' | 'plan_image' | 'other';
  fileName: string;
  fileSize: number;
  fileType: string;
};

export const AddDeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addDeed } = useDeeds();
  const { isAdmin } = usePermissions();

  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const [deedImages, setDeedImages] = useState<File[]>([]);
  const [siteImages, setSiteImages] = useState<File[]>([]);
  const [planImages, setPlanImages] = useState<File[]>([]);
  const [otherImages, setOtherImages] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<DeedFormData>({
    defaultValues: {
      deedNumber: '',
      deedDate: new Date().toISOString().split('T')[0],
      propertyDescription: '',
      plotNumber: '',
      planNumber: '',
      area: 0,
      location: '',
      region: '',
      city: '',
      district: '',
      usageType: '',
      notes: '',
      isPlanned: false,
      attachments: [],
    },
  });

  const isPlanned = watch('isPlanned');

  const cities = ['الدمام', 'الخبر', 'الظهران', 'القطيف', 'الجبيل', 'الأحساء', 'حفر الباطن'];
  const usageTypes = ['سكني', 'تجاري', 'صناعي', 'استثماري', 'تعليمي', 'زراعي', 'حكومي'];

  const handleIsPlannedChange = React.useCallback(
    (checked: boolean) => {
      setValue('isPlanned', checked);
    },
    [setValue]
  );

  const handleToggleMap = React.useCallback(() => {
    setShowMap((prev) => !prev);
  }, []);

  const handleCoordinatesChange = React.useCallback((selectedCoordinates: Coordinates) => {
    setCoordinates(selectedCoordinates);
  }, []);

  const handleFileUpload = React.useCallback(
    (
      event: React.ChangeEvent<HTMLInputElement>,
      type: 'deed' | 'site' | 'plan' | 'additional'
    ) => {
      const files = event.target.files;
      if (!files) return;

      const newFiles = Array.from(files);

      switch (type) {
        case 'deed':
          setDeedImages((prev) => [...prev, ...newFiles]);
          break;
        case 'site':
          setSiteImages((prev) => [...prev, ...newFiles]);
          break;
        case 'plan':
          setPlanImages((prev) => [...prev, ...newFiles]);
          break;
        case 'additional':
          setOtherImages((prev) => [...prev, ...newFiles]);
          break;
      }

      event.target.value = '';
    },
    []
  );

  const removeImage = React.useCallback(
    (type: 'deed' | 'site' | 'plan' | 'additional', index: number) => {
      switch (type) {
        case 'deed':
          setDeedImages((prev) => prev.filter((_, i) => i !== index));
          break;
        case 'site':
          setSiteImages((prev) => prev.filter((_, i) => i !== index));
          break;
        case 'plan':
          setPlanImages((prev) => prev.filter((_, i) => i !== index));
          break;
        case 'additional':
          setOtherImages((prev) => prev.filter((_, i) => i !== index));
          break;
      }
    },
    []
  );

  const mapAttachmentType = (type: 'deed' | 'site' | 'plan' | 'additional') => {
    switch (type) {
      case 'deed':
        return 'deed_image' as const;
      case 'site':
        return 'location_image' as const;
      case 'plan':
        return 'plan_image' as const;
      case 'additional':
      default:
        return 'other' as const;
    }
  };

  const uploadFileToGoogleDrive = async (
    file: File,
    type: 'deed' | 'site' | 'plan' | 'additional'
  ): Promise<PendingAttachment> => {
    if (!API_BASE_URL) {
      throw new Error('VITE_API_URL غير موجود. تأكد من ربط الواجهة بالـ Backend في Railway.');
    }

    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`حجم الملف ${file.name} أكبر من الحد المسموح ${maxSizeMB} ميجا`);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/uploads`, {
      method: 'POST',
      body: formData,
    });

    let body: UploadResponse | { message?: string };

    try {
      body = await response.json();
    } catch {
      body = {};
    }

    if (!response.ok) {
      throw new Error((body as { message?: string }).message || 'تعذر رفع الملف إلى Google Drive');
    }

    const uploaded = body as UploadResponse;

    if (!uploaded.driveUrl) {
      throw new Error('تم رفع الملف لكن لم يتم إرجاع رابط Google Drive');
    }

    return {
      title: file.name,
      driveUrl: uploaded.driveUrl,
      driveFileId: uploaded.driveFileId,
      mimeType: uploaded.mimeType || file.type,
      attachmentType: mapAttachmentType(type),
      fileName: uploaded.fileName || file.name,
      fileSize: file.size,
      fileType: uploaded.mimeType || file.type,
    };
  };

  const buildAttachments = async (): Promise<PendingAttachment[]> => {
    const attachments: PendingAttachment[] = [];

    for (const file of deedImages) {
      attachments.push(await uploadFileToGoogleDrive(file, 'deed'));
    }

    for (const file of siteImages) {
      attachments.push(await uploadFileToGoogleDrive(file, 'site'));
    }

    for (const file of planImages) {
      attachments.push(await uploadFileToGoogleDrive(file, 'plan'));
    }

    for (const file of otherImages) {
      attachments.push(await uploadFileToGoogleDrive(file, 'additional'));
    }

    return attachments;
  };

  const saveAttachmentsForDeed = async (deedId: string, attachments: PendingAttachment[]) => {
    if (!API_BASE_URL || attachments.length === 0) return;

    for (const attachment of attachments) {
      const response = await fetch(`${API_BASE_URL}/api/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType: 'deed',
          entityId: deedId,
          attachmentType: attachment.attachmentType,
          title: attachment.title || attachment.fileName,
          driveUrl: attachment.driveUrl,
          driveFileId: attachment.driveFileId || null,
          mimeType: attachment.mimeType || attachment.fileType || null,
        }),
      });

      let body: { message?: string } = {};

      try {
        body = await response.json();
      } catch {
        body = {};
      }

      if (!response.ok) {
        throw new Error(body.message || 'تم حفظ الصك لكن تعذر حفظ بيانات أحد المرفقات');
      }
    }
  };

  const handleCancel = React.useCallback(() => {
    navigate('/deeds');
  }, [navigate]);

  const onSubmit = React.useCallback(
    async (data: DeedFormData) => {
      try {
        setIsSaving(true);

        const attachments = await buildAttachments();

        const savedDeed = await Promise.resolve(
          addDeed({
            ...data,
            area: Number(data.area || 0),
            coordinates,
            attachments: [],
          })
        );

        if (savedDeed?.id) {
          await saveAttachmentsForDeed(savedDeed.id, attachments);
        }

        toast.success(t('deed.savedSuccessfully'));
        navigate('/deeds');
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : t('errors.saveFailed') || 'فشل في حفظ البيانات');
      } finally {
        setIsSaving(false);
      }
    },
    [
      addDeed,
      coordinates,
      navigate,
      t,
      deedImages,
      siteImages,
      planImages,
      otherImages,
    ]
  );


  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>غير مصرح</CardTitle>
            <CardDescription>
              ليس لديك صلاحية إضافة أو تعديل الصكوك. يمكنك فقط استعراض البيانات والبحث حسب الصلاحيات الممنوحة لك.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => navigate('/deeds')}>
              العودة إلى جميع الصكوك
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">{t('deed.addNew')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            قم بإدخال بيانات الصك الجديد
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="w-full sm:w-auto text-sm md:text-base"
        >
          <X className="h-4 w-4 mr-2" />
          {t('app.cancel')}
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileText className="h-4 w-4 md:h-5 md:w-5" />
              المعلومات الأساسية
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              بيانات الصك الأساسية
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="deedNumber">
                  {t('deed.deedNumber')} <span className="text-destructive">*</span>
                </Label>

                <Input
                  id="deedNumber"
                  {...register('deedNumber', {
                    required: t('validation.required'),
                  })}
                  placeholder="610000000"
                  className={errors.deedNumber ? 'border-destructive' : ''}
                />

                {errors.deedNumber && (
                  <p className="text-sm text-destructive">{errors.deedNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="deedDate">
                  {t('deed.deedDate')} <span className="text-destructive">*</span>
                </Label>

                <Input
                  id="deedDate"
                  type="date"
                  {...register('deedDate', {
                    required: t('validation.required'),
                  })}
                  className={errors.deedDate ? 'border-destructive' : ''}
                />

                {errors.deedDate && (
                  <p className="text-sm text-destructive">{errors.deedDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">
                  {t('deed.area')} ({t('deed.sqm')}){' '}
                  <span className="text-destructive">*</span>
                </Label>

                <Input
                  id="area"
                  type="number"
                  {...register('area', {
                    required: t('validation.required'),
                    valueAsNumber: true,
                    min: {
                      value: 1,
                      message: t('validation.invalidNumber'),
                    },
                  })}
                  placeholder="1000"
                  className={errors.area ? 'border-destructive' : ''}
                />

                {errors.area && (
                  <p className="text-sm text-destructive">{errors.area.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2 lg:col-span-3">
                <Label htmlFor="propertyDescription">
                  {t('deed.propertyDescription')}{' '}
                  <span className="text-destructive">*</span>
                </Label>

                <Textarea
                  id="propertyDescription"
                  {...register('propertyDescription', {
                    required: t('validation.required'),
                  })}
                  placeholder="قطعة أرض في..."
                  rows={3}
                  className={errors.propertyDescription ? 'border-destructive' : ''}
                />

                {errors.propertyDescription && (
                  <p className="text-sm text-destructive">
                    {errors.propertyDescription.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <MapIcon className="h-4 w-4 md:h-5 md:w-5" />
              معلومات القطعة والمخطط
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="plotNumber">{t('deed.plotNumber')}</Label>
                <Input id="plotNumber" {...register('plotNumber')} placeholder="1234" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="planNumber">{t('deed.planNumber')}</Label>
                <Input id="planNumber" {...register('planNumber')} placeholder="5678" />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="isPlanned"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Switch
                    id="isPlanned"
                    checked={isPlanned}
                    onCheckedChange={handleIsPlannedChange}
                  />
                  <span>{t('deed.isPlanned')}</span>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <MapPin className="h-4 w-4 md:h-5 md:w-5" />
              معلومات الموقع
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="region">
                  {t('deed.region')} <span className="text-destructive">*</span>
                </Label>

                <Input
                  id="region"
                  {...register('region', {
                    required: t('validation.required'),
                  })}
                  placeholder="المنطقة الشرقية"
                  className={errors.region ? 'border-destructive' : ''}
                />

                {errors.region && (
                  <p className="text-sm text-destructive">{errors.region.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">
                  {t('deed.city')} <span className="text-destructive">*</span>
                </Label>

                <NativeSelect
                  id="city"
                  {...register('city', {
                    required: t('validation.required'),
                  })}
                  className={errors.city ? 'border-destructive' : ''}
                >
                  <option value="">اختر المدينة</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </NativeSelect>

                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">
                  {t('deed.district')} <span className="text-destructive">*</span>
                </Label>

                <Input
                  id="district"
                  {...register('district', {
                    required: t('validation.required'),
                  })}
                  placeholder="الحي"
                  className={errors.district ? 'border-destructive' : ''}
                />

                {errors.district && (
                  <p className="text-sm text-destructive">{errors.district.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">{t('deed.location')}</Label>
                <Input
                  id="location"
                  {...register('location')}
                  placeholder="الموقع التفصيلي"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usageType">
                  {t('deed.usageType')} <span className="text-destructive">*</span>
                </Label>

                <NativeSelect
                  id="usageType"
                  {...register('usageType', {
                    required: t('validation.required'),
                  })}
                  className={errors.usageType ? 'border-destructive' : ''}
                >
                  <option value="">اختر نوع الاستخدام</option>
                  {usageTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </NativeSelect>

                {errors.usageType && (
                  <p className="text-sm text-destructive">{errors.usageType.message}</p>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <Label>{t('deed.coordinates')}</Label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleMap}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {showMap ? 'إخفاء الخريطة' : 'تحديد الموقع من الخريطة'}
                </Button>
              </div>

              {coordinates ? (
                <div className="mb-3 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <span className="text-muted-foreground">خط العرض:</span>
                    <span className="font-mono mr-2">
                      {coordinates.latitude.toFixed(6)}
                    </span>
                  </div>

                  <div className="rounded-lg border bg-background px-3 py-2">
                    <span className="text-muted-foreground">خط الطول:</span>
                    <span className="font-mono mr-2">
                      {coordinates.longitude.toFixed(6)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mb-3 text-sm text-muted-foreground">
                  لم يتم تحديد الإحداثيات بعد.
                </p>
              )}

              {showMap && (
                <MapCoordinatePicker
                  coordinates={coordinates}
                  onChange={handleCoordinatesChange}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Upload className="h-4 w-4 md:h-5 md:w-5" />
              المرفقات والصور
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              قم برفع الصور المطلوبة للصك (PNG, JPG, PDF)
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="deed" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                <TabsTrigger value="deed" className="text-xs md:text-sm py-2 md:py-2.5">
                  <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  صورة الصك
                  {deedImages.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="mr-1 md:mr-2 text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center"
                    >
                      {deedImages.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger value="site" className="text-xs md:text-sm py-2 md:py-2.5">
                  <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  صورة الموقع
                  {siteImages.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="mr-1 md:mr-2 text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center"
                    >
                      {siteImages.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger value="plan" className="text-xs md:text-sm py-2 md:py-2.5">
                  <MapIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  صورة المخطط
                  {planImages.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="mr-1 md:mr-2 text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center"
                    >
                      {planImages.length}
                    </Badge>
                  )}
                </TabsTrigger>

                <TabsTrigger value="other" className="text-xs md:text-sm py-2 md:py-2.5">
                  <ImageIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  صور أخرى
                  {otherImages.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="mr-1 md:mr-2 text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center"
                    >
                      {otherImages.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deed" className="space-y-4 mt-4">
                <AttachmentUploadBox
                  inputId="deed-upload"
                  title="انقر لرفع صورة الصك"
                  description="أو اسحب الملفات هنا"
                  icon={<Upload className="h-6 w-6 md:h-8 md:w-8 text-primary" />}
                  onChange={(event) => handleFileUpload(event, 'deed')}
                />

                <FilesPreview
                  files={deedImages}
                  onRemove={(index) => removeImage('deed', index)}
                />
              </TabsContent>

              <TabsContent value="site" className="space-y-4 mt-4">
                <AttachmentUploadBox
                  inputId="site-upload"
                  title="انقر لرفع صورة الموقع"
                  description="صور جوية أو خرائط الموقع"
                  icon={<MapPin className="h-6 w-6 md:h-8 md:w-8 text-secondary" />}
                  onChange={(event) => handleFileUpload(event, 'site')}
                />

                <FilesPreview
                  files={siteImages}
                  onRemove={(index) => removeImage('site', index)}
                />
              </TabsContent>

              <TabsContent value="plan" className="space-y-4 mt-4">
                <AttachmentUploadBox
                  inputId="plan-upload"
                  title="انقر لرفع صورة المخطط"
                  description="المخططات الهندسية والتقسيمات"
                  icon={<MapIcon className="h-6 w-6 md:h-8 md:w-8 text-accent" />}
                  onChange={(event) => handleFileUpload(event, 'plan')}
                />

                <FilesPreview
                  files={planImages}
                  onRemove={(index) => removeImage('plan', index)}
                />
              </TabsContent>

              <TabsContent value="other" className="space-y-4 mt-4">
                <AttachmentUploadBox
                  inputId="other-upload"
                  title="انقر لرفع صور إضافية"
                  description="أي مستندات أو صور أخرى متعلقة بالصك"
                  icon={
                    <ImageIcon className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                  }
                  onChange={(event) => handleFileUpload(event, 'additional')}
                />

                <FilesPreview
                  files={otherImages}
                  onRemove={(index) => removeImage('additional', index)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg">ملاحظات إضافية</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">{t('deed.notes')}</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="أي ملاحظات إضافية..."
                rows={4}
                className="text-sm md:text-base"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto text-sm md:text-base"
          >
            <X className="h-4 w-4 mr-2" />
            {t('app.cancel')}
          </Button>

          <Button
            type="submit"
            disabled={isSaving}
            className="bg-primary w-full sm:w-auto text-sm md:text-base"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'جاري الحفظ...' : t('app.save')}
          </Button>
        </div>
      </form>
    </div>
  );
};

const AttachmentUploadBox: React.FC<{
  inputId: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ inputId, title, description, icon, onChange }) => {
  return (
    <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center hover:border-primary transition-colors">
      <input
        type="file"
        id={inputId}
        multiple
        accept="image/*,.pdf"
        onChange={onChange}
        className="hidden"
      />

      <label htmlFor={inputId} className="cursor-pointer flex flex-col items-center gap-2 md:gap-3">
        <div className="p-3 md:p-4 rounded-full bg-primary/10">{icon}</div>

        <div>
          <p className="text-sm md:text-base font-medium">{title}</p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {description}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">PNG, JPG, PDF (حتى 10 ميجا)</p>
      </label>
    </div>
  );
};

const FilesPreview: React.FC<{
  files: File[];
  onRemove: (index: number) => void;
}> = ({ files, onRemove }) => {
  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {files.map((file, index) => (
        <div key={`${file.name}-${index}`} className="relative group">
          <div className="aspect-square rounded-lg border-2 border-border overflow-hidden bg-muted">
            {file.type.startsWith('image/') ? (
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileText className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground" />
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 md:top-2 right-1 md:right-2 h-6 w-6 md:h-7 md:w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onRemove(index)}
          >
            <X className="h-3 w-3 md:h-4 md:w-4" />
          </Button>

          <p className="text-xs truncate mt-1 px-1">{file.name}</p>
        </div>
      ))}
    </div>
  );
};