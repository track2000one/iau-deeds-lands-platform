import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Save, X, MapPin, Upload, FileText, Image as ImageIcon, Map as MapIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { NativeSelect } from '../components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileUploadZone } from '../components/FileUploadZone';
import { MapCoordinatePicker } from '../components/MapCoordinatePicker';
import { toast } from 'sonner';
import type { AllocatedLand } from '../../types/models';

type AllocatedLandFormData = Omit<AllocatedLand, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

type Coordinates = {
  latitude: number;
  longitude: number;
};

const parseCoordinatesString = (value: string): Coordinates | undefined => {
  if (!value) return undefined;

  const parts = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((part) => !Number.isNaN(part));

  if (parts.length < 2) return undefined;

  return {
    latitude: parts[0],
    longitude: parts[1],
  };
};


export const AddAllocatedLandPage: React.FC = () => {
  const navigate = useNavigate();
  const { addAllocatedLand } = useData();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [coordinates, setCoordinates] = useState('');
  const selectedCoordinates = parseCoordinatesString(coordinates);

  const handleCoordinatesChange = React.useCallback((selected: Coordinates) => {
    setCoordinates(`${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}`);
  }, []);

  // File upload states
  const [contractFiles, setContractFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [siteFiles, setSiteFiles] = useState<File[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<AllocatedLandFormData>({
    defaultValues: {
      propertyDescription: '',
      plotNumber: '',
      planNumber: '',
      area: 0,
      usageType: 'residential',
      region: '',
      city: '',
      district: '',
      coordinates: '',
      googleEarthLink: '',
      notes: ''
    }
  });

  const onSubmit = (data: AllocatedLandFormData) => {
    if (!currentUser) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      addAllocatedLand({
        ...data,
        area: Number(data.area),
        coordinates: coordinates || undefined,
        googleEarthLink: coordinates
          ? `https://earth.google.com/web/search/${coordinates}`
          : undefined,
        createdBy: currentUser.uid
      });

      toast.success('تم إضافة الأرض المخصصة بنجاح');
      navigate('/lands/allocated');
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة الأرض');
      console.error(error);
    }
  };

  const cities = ['الدمام', 'الخبر', 'الظهران', 'القطيف', 'الجبيل', 'الأحساء', 'حفر الباطن'];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إضافة أرض مخصصة</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">تسجيل بيانات أرض جديدة تم تخصيصها</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lands/allocated')} className="w-full sm:w-auto">
          <X className="ml-2 h-4 w-4" />
          إلغاء
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">البيانات الأساسية</TabsTrigger>
            <TabsTrigger value="location">الموقع</TabsTrigger>
            <TabsTrigger value="notes">الملاحظات</TabsTrigger>
            <TabsTrigger value="attachments">{t('attachments.title')}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  بيانات الأرض الأساسية
                </CardTitle>
                <CardDescription>أدخل المعلومات الأساسية للأرض المخصصة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="propertyDescription">بيان العقار *</Label>
                    <Input
                      id="propertyDescription"
                      {...register('propertyDescription', { required: 'هذا الحقل مطلوب' })}
                      placeholder="أدخل بيان العقار"
                    />
                    {errors.propertyDescription && (
                      <p className="text-sm text-destructive">{errors.propertyDescription.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plotNumber">رقم القطعة *</Label>
                    <Input
                      id="plotNumber"
                      {...register('plotNumber', { required: 'هذا الحقل مطلوب' })}
                      placeholder="أدخل رقم القطعة"
                    />
                    {errors.plotNumber && (
                      <p className="text-sm text-destructive">{errors.plotNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="planNumber">رقم المخطط *</Label>
                    <Input
                      id="planNumber"
                      {...register('planNumber', { required: 'هذا الحقل مطلوب' })}
                      placeholder="أدخل رقم المخطط"
                    />
                    {errors.planNumber && (
                      <p className="text-sm text-destructive">{errors.planNumber.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">المساحة (م²) *</Label>
                    <Input
                      id="area"
                      type="number"
                      step="0.01"
                      {...register('area', {
                        required: 'هذا الحقل مطلوب',
                        min: { value: 0, message: 'المساحة يجب أن تكون أكبر من صفر' }
                      })}
                      placeholder="أدخل المساحة"
                    />
                    {errors.area && (
                      <p className="text-sm text-destructive">{errors.area.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usageType">نوع الاستخدام *</Label>
                    <NativeSelect
                      id="usageType"
                      {...register('usageType', { required: 'هذا الحقل مطلوب' })}
                    >
                      <option value="residential">سكني</option>
                      <option value="commercial">تجاري</option>
                      <option value="industrial">صناعي</option>
                      <option value="agricultural">زراعي</option>
                      <option value="educational">تعليمي</option>
                      <option value="governmental">حكومي</option>
                      <option value="mixed">مختلط</option>
                      <option value="other">أخرى</option>
                    </NativeSelect>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  الموقع الجغرافي
                </CardTitle>
                <CardDescription>حدد موقع الأرض الجغرافي</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">المنطقة *</Label>
                    <Input
                      id="region"
                      {...register('region', { required: 'هذا الحقل مطلوب' })}
                      placeholder="مثال: المنطقة الشرقية"
                    />
                    {errors.region && (
                      <p className="text-sm text-destructive">{errors.region.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">المدينة *</Label>
                    <NativeSelect
                      id="city"
                      {...register('city', { required: 'هذا الحقل مطلوب' })}
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
                    <Label htmlFor="district">الحي *</Label>
                    <Input
                      id="district"
                      {...register('district', { required: 'هذا الحقل مطلوب' })}
                      placeholder="مثال: الفيصلية"
                    />
                    {errors.district && (
                      <p className="text-sm text-destructive">{errors.district.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coordinates">
                    <MapIcon className="h-4 w-4 inline ml-1" />
                    الإحداثيات (Latitude, Longitude)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="coordinates"
                      value={coordinates}
                      onChange={(e) => setCoordinates(e.target.value)}
                      placeholder="مثال: 26.3927, 50.0438"
                    />
                    {coordinates && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => window.open(`https://earth.google.com/web/search/${coordinates}`, '_blank')}
                      >
                        <MapPin className="h-4 w-4 ml-2" />
                        فتح الخريطة
                      </Button>
                    )}
                  </div>
                    <div className="mt-3">
                      <MapCoordinatePicker
                        coordinates={selectedCoordinates}
                        onChange={handleCoordinatesChange}
                      />
                    </div>
                  <p className="text-sm text-muted-foreground">
                    أدخل الإحداثيات بصيغة: latitude, longitude
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>ملاحظات إضافية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="notes">الملاحظات</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="أدخل أي ملاحظات إضافية..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attachments" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <FileUploadZone
                label={t('attachments.contractImage')}
                onFilesChange={setContractFiles}
                maxFiles={10}
                maxSizeMB={10}
                accept="image/*,.pdf"
              />

              <FileUploadZone
                label={t('attachments.planImage')}
                onFilesChange={setPlanFiles}
                maxFiles={10}
                maxSizeMB={10}
                accept="image/*"
              />

              <FileUploadZone
                label={t('attachments.siteImages')}
                onFilesChange={setSiteFiles}
                maxFiles={10}
                maxSizeMB={10}
                accept="image/*"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/lands/allocated')}>
            إلغاء
          </Button>
          <Button type="submit">
            <Save className="ml-2 h-4 w-4" />
            حفظ الأرض المخصصة
          </Button>
        </div>
      </form>
    </div>
  );
};
