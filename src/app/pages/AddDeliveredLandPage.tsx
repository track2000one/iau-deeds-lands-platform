import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Save, X, MapPin, Upload, FileText, Image as ImageIcon, Map as MapIcon, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileUploadZone } from '../components/FileUploadZone';
import { toast } from 'sonner';
import type { DeliveredLand } from '../../types/models';

type DeliveredLandFormData = Omit<DeliveredLand, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export const AddDeliveredLandPage: React.FC = () => {
  const navigate = useNavigate();
  const { addDeliveredLand } = useData();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [coordinates, setCoordinates] = useState('');

  const [contractFiles, setContractFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [siteFiles, setSiteFiles] = useState<File[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<DeliveredLandFormData>({
    defaultValues: {
      recipientEntity: '',
      deliveryDate: new Date(),
      propertyDescription: '',
      plotNumber: '',
      planNumber: '',
      area: 0,
      location: '',
      coordinates: '',
      deliveryMinutesNumber: '',
      notes: ''
    }
  });

  const onSubmit = (data: DeliveredLandFormData) => {
    if (!currentUser) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      addDeliveredLand({
        ...data,
        area: Number(data.area),
        deliveryDate: new Date(data.deliveryDate),
        coordinates: coordinates || undefined,
        createdBy: currentUser.uid
      });

      toast.success('تم إضافة الأرض المسلمة بنجاح');
      navigate('/lands/delivered');
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة الأرض');
      console.error(error);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">إضافة أرض مسلمة</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">تسجيل بيانات أرض تم تسليمها لجهة معينة</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lands/delivered')} className="w-full sm:w-auto">
          <X className="ml-2 h-4 w-4" />
          إلغاء
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
        <Tabs defaultValue="delivery" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="delivery">بيانات التسليم</TabsTrigger>
            <TabsTrigger value="land">بيانات الأرض</TabsTrigger>
            <TabsTrigger value="notes">الملاحظات</TabsTrigger>
            <TabsTrigger value="attachments">{t('attachments.title')}</TabsTrigger>
          </TabsList>

          <TabsContent value="delivery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  معلومات عملية التسليم
                </CardTitle>
                <CardDescription>أدخل تفاصيل الجهة المستلمة وتاريخ التسليم</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientEntity">اسم الجهة المستلمة *</Label>
                    <Input
                      id="recipientEntity"
                      {...register('recipientEntity', { required: 'هذا الحقل مطلوب' })}
                      placeholder="أدخل اسم الجهة المستلمة"
                    />
                    {errors.recipientEntity && (
                      <p className="text-sm text-destructive">{errors.recipientEntity.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryDate">تاريخ الاستلام *</Label>
                    <Input
                      id="deliveryDate"
                      type="date"
                      {...register('deliveryDate', { required: 'هذا الحقل مطلوب' })}
                    />
                    {errors.deliveryDate && (
                      <p className="text-sm text-destructive">{errors.deliveryDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="deliveryMinutesNumber">رقم محضر التسليم</Label>
                    <Input
                      id="deliveryMinutesNumber"
                      {...register('deliveryMinutesNumber')}
                      placeholder="أدخل رقم محضر التسليم"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="land" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  بيانات الأرض
                </CardTitle>
                <CardDescription>أدخل المعلومات التفصيلية للأرض المسلمة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyDescription">بيان العقار *</Label>
                  <Textarea
                    id="propertyDescription"
                    {...register('propertyDescription', { required: 'هذا الحقل مطلوب' })}
                    placeholder="أدخل بيان العقار التفصيلي"
                    rows={3}
                  />
                  {errors.propertyDescription && (
                    <p className="text-sm text-destructive">{errors.propertyDescription.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plotNumber">رقم القطعة *</Label>
                    <Input
                      id="plotNumber"
                      {...register('plotNumber', { required: 'هذا الحقل مطلوب' })}
                      placeholder="أدخل رقم القطعة"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="planNumber">رقم المخطط *</Label>
                    <Input
                      id="planNumber"
                      {...register('planNumber', { required: 'هذا الحقل مطلوب' })}
                      placeholder="أدخل رقم المخطط"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">المساحة (م²) *</Label>
                    <Input
                      id="area"
                      type="number"
                      step="0.01"
                      {...register('area', { required: 'هذا الحقل مطلوب', min: 0 })}
                      placeholder="أدخل المساحة"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">الموقع *</Label>
                    <Input
                      id="location"
                      {...register('location', { required: 'هذا الحقل مطلوب' })}
                      placeholder="أدخل الموقع"
                    />
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
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="أدخل أي ملاحظات إضافية..."
                  rows={4}
                />
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
          <Button type="button" variant="outline" onClick={() => navigate('/lands/delivered')}>
            إلغاء
          </Button>
          <Button type="submit">
            <Save className="ml-2 h-4 w-4" />
            حفظ الأرض المسلمة
          </Button>
        </div>
      </form>
    </div>
  );
};
