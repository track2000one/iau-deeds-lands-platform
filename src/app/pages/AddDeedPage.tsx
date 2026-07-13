import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDeeds } from '../../context/DeedContext';
import { useForm } from 'react-hook-form';
import { DeedFormData } from '../../types/deed';
import {
  Save,
  X,
  MapPin,
  Upload,
  FileText,
  Image as ImageIcon,
  Map as MapIcon,
  PlusCircle
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

export const AddDeedPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addDeed } = useDeeds();
  const [showMap, setShowMap] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>();

  // File upload states
  const [deedImages, setDeedImages] = useState<File[]>([]);
  const [siteImages, setSiteImages] = useState<File[]>([]);
  const [planImages, setPlanImages] = useState<File[]>([]);
  const [otherImages, setOtherImages] = useState<File[]>([]);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<DeedFormData>({
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
      attachments: []
    }
  });

  const isPlanned = watch('isPlanned');

  const handleIsPlannedChange = React.useCallback((checked: boolean) => {
    setValue('isPlanned', checked);
  }, [setValue]);

  const handleToggleMap = React.useCallback(() => {
    setShowMap(prev => !prev);
  }, []);

  const handleSetRandomCoordinates = React.useCallback(() => {
    setCoordinates({
      latitude: 26.3927 + (Math.random() - 0.5) * 0.1,
      longitude: 50.0438 + (Math.random() - 0.5) * 0.1
    });
  }, []);

  const handleFileUpload = React.useCallback((
    event: React.ChangeEvent<HTMLInputElement>,
    type: 'deed' | 'site' | 'plan' | 'additional'
  ) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);

    switch (type) {
      case 'deed':
        setDeedImages(prev => [...prev, ...newFiles]);
        break;
      case 'site':
        setSiteImages(prev => [...prev, ...newFiles]);
        break;
      case 'plan':
        setPlanImages(prev => [...prev, ...newFiles]);
        break;
      case 'additional':
        setOtherImages(prev => [...prev, ...newFiles]);
        break;
    }

    // Reset input
    event.target.value = '';
  }, []);

  const removeImage = React.useCallback((type: 'deed' | 'site' | 'plan' | 'additional', index: number) => {
    switch (type) {
      case 'deed':
        setDeedImages(prev => prev.filter((_, i) => i !== index));
        break;
      case 'site':
        setSiteImages(prev => prev.filter((_, i) => i !== index));
        break;
      case 'plan':
        setPlanImages(prev => prev.filter((_, i) => i !== index));
        break;
      case 'additional':
        setOtherImages(prev => prev.filter((_, i) => i !== index));
        break;
    }
  }, []);

  const handleCancel = React.useCallback(() => {
    navigate('/deeds');
  }, [navigate]);

  const onSubmit = React.useCallback((data: DeedFormData) => {
    try {
      // Process images and create attachments
      const processFiles = async () => {
        const attachments: any[] = [];

        const processFileGroup = async (files: File[], type: string) => {
          for (const file of files) {
            const reader = new FileReader();
            await new Promise((resolve) => {
              reader.onload = (e) => {
                attachments.push({
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type,
                  attachmentType: type,
                  fileUrl: e.target?.result as string
                });
                resolve(null);
              };
              reader.readAsDataURL(file);
            });
          }
        };

        await processFileGroup(deedImages, 'deed');
        await processFileGroup(siteImages, 'site');
        await processFileGroup(planImages, 'plan');
        await processFileGroup(otherImages, 'additional');

        addDeed({
          ...data,
          coordinates,
          attachments
        });

        toast.success(t('deed.savedSuccessfully'));
        navigate('/deeds');
      };

      processFiles();
    } catch (error) {
      toast.error(t('errors.saveFailed'));
    }
  }, [addDeed, coordinates, navigate, t, deedImages, siteImages, planImages, otherImages]);

  const handleFormSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(onSubmit)(e);
  }, [handleSubmit, onSubmit]);

  const cities = ['الدمام', 'الخبر', 'الظهران', 'القطيف', 'الجبيل', 'الأحساء', 'حفر الباطن'];
  const usageTypes = ['سكني', 'تجاري', 'صناعي', 'استثماري', 'تعليمي', 'زراعي', 'حكومي'];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">{t('deed.addNew')}</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">قم بإدخال بيانات الصك الجديد</p>
        </div>
        <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto text-sm md:text-base">
          <X className="h-4 w-4 mr-2" />
          {t('app.cancel')}
        </Button>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4 md:space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileText className="h-4 w-4 md:h-5 md:w-5" />
              المعلومات الأساسية
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">بيانات الصك الأساسية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="deedNumber">
                  {t('deed.deedNumber')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deedNumber"
                  {...register('deedNumber', { required: t('validation.required') })}
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
                  {...register('deedDate', { required: t('validation.required') })}
                  className={errors.deedDate ? 'border-destructive' : ''}
                />
                {errors.deedDate && (
                  <p className="text-sm text-destructive">{errors.deedDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">
                  {t('deed.area')} ({t('deed.sqm')}) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="area"
                  type="number"
                  {...register('area', {
                    required: t('validation.required'),
                    min: { value: 1, message: t('validation.invalidNumber') }
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
                  {t('deed.propertyDescription')} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="propertyDescription"
                  {...register('propertyDescription', { required: t('validation.required') })}
                  placeholder="قطعة أرض في..."
                  rows={3}
                  className={errors.propertyDescription ? 'border-destructive' : ''}
                />
                {errors.propertyDescription && (
                  <p className="text-sm text-destructive">{errors.propertyDescription.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plot and Plan Information */}
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
                <Input
                  id="plotNumber"
                  {...register('plotNumber')}
                  placeholder="1234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="planNumber">{t('deed.planNumber')}</Label>
                <Input
                  id="planNumber"
                  {...register('planNumber')}
                  placeholder="5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isPlanned" className="flex items-center gap-2 cursor-pointer">
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

        {/* Location Information */}
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
                  {...register('region', { required: t('validation.required') })}
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
                  {...register('city', { required: t('validation.required') })}
                  className={errors.city ? 'border-destructive' : ''}
                >
                  <option value="">اختر المدينة</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
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
                  {...register('district', { required: t('validation.required') })}
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
                  {...register('usageType', { required: t('validation.required') })}
                  className={errors.usageType ? 'border-destructive' : ''}
                >
                  <option value="">اختر نوع الاستخدام</option>
                  {usageTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </NativeSelect>
                {errors.usageType && (
                  <p className="text-sm text-destructive">{errors.usageType.message}</p>
                )}
              </div>
            </div>

            {/* Coordinates */}
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <Label>{t('deed.coordinates')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleToggleMap}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {showMap ? 'إخفاء الخريطة' : t('deed.selectLocation')}
                </Button>
              </div>

              {coordinates && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('deed.latitude')}:</span>
                    <span className="font-mono ml-2">{coordinates.latitude.toFixed(6)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('deed.longitude')}:</span>
                    <span className="font-mono ml-2">{coordinates.longitude.toFixed(6)}</span>
                  </div>
                </div>
              )}

              {showMap && (
                <div className="mt-3 h-64 bg-muted rounded-md flex items-center justify-center border">
                  <div className="text-center text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>خريطة تفاعلية - اضغط لتحديد الموقع</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={handleSetRandomCoordinates}
                    >
                      تحديد موقع عشوائي (للتجربة)
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
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
                    <Badge variant="secondary" className="mr-1 md:mr-2 text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      {deedImages.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="site" className="text-xs md:text-sm py-2 md:py-2.5">
                  <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  صورة الموقع
                  {siteImages.length > 0 && (
                    <Badge variant="secondary" className="mr-1 md:mr-2 text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      {siteImages.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="plan" className="text-xs md:text-sm py-2 md:py-2.5">
                  <MapIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  صورة المخطط
                  {planImages.length > 0 && (
                    <Badge variant="secondary" className="mr-1 md:mr-2 text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      {planImages.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="other" className="text-xs md:text-sm py-2 md:py-2.5">
                  <ImageIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  صور أخرى
                  {otherImages.length > 0 && (
                    <Badge variant="secondary" className="mr-1 md:mr-2 text-xs h-5 w-5 rounded-full p-0 flex items-center justify-center">
                      {otherImages.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="deed" className="space-y-4 mt-4">
                <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="deed-upload"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'deed')}
                    className="hidden"
                  />
                  <label
                    htmlFor="deed-upload"
                    className="cursor-pointer flex flex-col items-center gap-2 md:gap-3"
                  >
                    <div className="p-3 md:p-4 rounded-full bg-primary/10">
                      <Upload className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-medium">انقر لرفع صورة الصك</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        أو اسحب الملفات هنا
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, PDF (حتى 10 ميجا)
                    </p>
                  </label>
                </div>

                {deedImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {deedImages.map((file, index) => (
                      <div key={index} className="relative group">
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
                          onClick={() => removeImage('deed', index)}
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <p className="text-xs truncate mt-1 px-1">{file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="site" className="space-y-4 mt-4">
                <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="site-upload"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'site')}
                    className="hidden"
                  />
                  <label
                    htmlFor="site-upload"
                    className="cursor-pointer flex flex-col items-center gap-2 md:gap-3"
                  >
                    <div className="p-3 md:p-4 rounded-full bg-secondary/10">
                      <MapPin className="h-6 w-6 md:h-8 md:w-8 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-medium">انقر لرفع صورة الموقع</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        صور جوية أو خرائط الموقع
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, PDF (حتى 10 ميجا)
                    </p>
                  </label>
                </div>

                {siteImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {siteImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg border-2 border-border overflow-hidden bg-muted">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 md:top-2 right-1 md:right-2 h-6 w-6 md:h-7 md:w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage('site', index)}
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <p className="text-xs truncate mt-1 px-1">{file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="plan" className="space-y-4 mt-4">
                <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="plan-upload"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'plan')}
                    className="hidden"
                  />
                  <label
                    htmlFor="plan-upload"
                    className="cursor-pointer flex flex-col items-center gap-2 md:gap-3"
                  >
                    <div className="p-3 md:p-4 rounded-full bg-accent/10">
                      <MapIcon className="h-6 w-6 md:h-8 md:w-8 text-accent" />
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-medium">انقر لرفع صورة المخطط</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        المخططات الهندسية والتقسيمات
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, PDF (حتى 10 ميجا)
                    </p>
                  </label>
                </div>

                {planImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {planImages.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg border-2 border-border overflow-hidden bg-muted">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 md:top-2 right-1 md:right-2 h-6 w-6 md:h-7 md:w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage('plan', index)}
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <p className="text-xs truncate mt-1 px-1">{file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="other" className="space-y-4 mt-4">
                <div className="border-2 border-dashed rounded-lg p-4 md:p-6 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    id="other-upload"
                    multiple
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, 'additional')}
                    className="hidden"
                  />
                  <label
                    htmlFor="other-upload"
                    className="cursor-pointer flex flex-col items-center gap-2 md:gap-3"
                  >
                    <div className="p-3 md:p-4 rounded-full bg-muted">
                      <ImageIcon className="h-6 w-6 md:h-8 md:w-8 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm md:text-base font-medium">انقر لرفع صور إضافية</p>
                      <p className="text-xs md:text-sm text-muted-foreground mt-1">
                        أي مستندات أو صور أخرى متعلقة بالصك
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, PDF (حتى 10 ميجا)
                    </p>
                  </label>
                </div>

                {otherImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {otherImages.map((file, index) => (
                      <div key={index} className="relative group">
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
                          onClick={() => removeImage('additional', index)}
                        >
                          <X className="h-3 w-3 md:h-4 md:w-4" />
                        </Button>
                        <p className="text-xs truncate mt-1 px-1">{file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Notes */}
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

        {/* Submit Buttons */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 md:gap-3 sm:justify-end">
          <Button type="button" variant="outline" onClick={handleCancel} className="w-full sm:w-auto text-sm md:text-base">
            <X className="h-4 w-4 mr-2" />
            {t('app.cancel')}
          </Button>
          <Button type="submit" className="bg-primary w-full sm:w-auto text-sm md:text-base">
            <Save className="h-4 w-4 mr-2" />
            {t('app.save')}
          </Button>
        </div>
      </form>
    </div>
  );
};
