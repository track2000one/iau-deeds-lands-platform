import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Save, X, MapPin, Upload, FileText, User, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileUploadZone } from '../components/FileUploadZone';
import { toast } from 'sonner';
import type { LeasedLandIn } from '../../types/models';

type FormData = Omit<LeasedLandIn, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;

export const AddLeasedLandInPage: React.FC = () => {
  const navigate = useNavigate();
  const { addLeasedLandIn } = useData();
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [coordinates, setCoordinates] = useState('');
  const [contractFiles, setContractFiles] = useState<File[]>([]);
  const [planFiles, setPlanFiles] = useState<File[]>([]);
  const [siteFiles, setSiteFiles] = useState<File[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    if (!currentUser) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    addLeasedLandIn({
      ...data,
      owner: {
        name: data.owner.name,
        commercialRegistration: data.owner.commercialRegistration,
        entityRepresentative: data.owner.entityRepresentative,
        identityNumber: data.owner.identityNumber,
        nationality: data.owner.nationality,
        mobileNumber: data.owner.mobileNumber,
      },
      area: Number(data.area),
      rentAmount: data.rentAmount ? Number(data.rentAmount) : undefined,
      coordinates: coordinates || undefined,
      createdBy: currentUser.uid
    });

    toast.success('تم إضافة الأرض المستأجرة بنجاح');
    navigate('/lands/leased-in');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إضافة أرض مستأجرة (للجامعة)</h1>
          <p className="text-muted-foreground">تسجيل عقد استئجار أرض من الغير</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/lands/leased-in')}>
          <X className="ml-2 h-4 w-4" />
          إلغاء
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="owner" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="owner">بيانات المالك</TabsTrigger>
            <TabsTrigger value="contract">بيانات العقد</TabsTrigger>
            <TabsTrigger value="land">بيانات الأرض</TabsTrigger>
            <TabsTrigger value="notes">ملاحظات</TabsTrigger>
            <TabsTrigger value="attachments">{t('attachments.title')}</TabsTrigger>
          </TabsList>

          <TabsContent value="owner">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  معلومات المالك
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم المالك *</Label>
                    <Input {...register('owner.name', { required: 'مطلوب' })} placeholder="اسم المالك" />
                    {errors.owner?.name && <p className="text-sm text-destructive">{errors.owner.name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>السجل التجاري</Label>
                    <Input {...register('owner.commercialRegistration')} placeholder="رقم السجل التجاري" />
                  </div>
                  <div className="space-y-2">
                    <Label>ممثل الجهة</Label>
                    <Input {...register('owner.entityRepresentative')} placeholder="اسم ممثل الجهة" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهوية</Label>
                    <Input {...register('owner.identityNumber')} placeholder="رقم الهوية الوطنية" />
                  </div>
                  <div className="space-y-2">
                    <Label>الجنسية</Label>
                    <Input {...register('owner.nationality')} placeholder="الجنسية" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الجوال</Label>
                    <Input {...register('owner.mobileNumber')} placeholder="05xxxxxxxx" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contract">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  معلومات العقد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>رقم العقد *</Label>
                    <Input {...register('contractNumber', { required: 'مطلوب' })} placeholder="رقم العقد" />
                  </div>
                  <div className="space-y-2">
                    <Label>مدة العقد *</Label>
                    <Input {...register('contractDuration', { required: 'مطلوب' })} placeholder="مثال: 3 سنوات" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      قيمة الإيجار (ريال)
                    </Label>
                    <Input type="number" {...register('rentAmount')} placeholder="قيمة الإيجار السنوية" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="land">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  بيانات الأرض
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>بيان العقار *</Label>
                    <Textarea {...register('propertyDescription', { required: 'مطلوب' })} rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>المساحة (م²) *</Label>
                    <Input type="number" step="0.01" {...register('area', { required: 'مطلوب' })} />
                  </div>
                  <div className="space-y-2">
                    <Label>الموقع *</Label>
                    <Input {...register('location', { required: 'مطلوب' })} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>الإحداثيات</Label>
                    <div className="flex gap-2">
                      <Input value={coordinates} onChange={(e) => setCoordinates(e.target.value)} placeholder="26.3927, 50.0438" />
                      {coordinates && (
                        <Button type="button" variant="outline" onClick={() => window.open(`https://earth.google.com/web/search/${coordinates}`, '_blank')}>
                          <MapPin className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader>
                <CardTitle>ملاحظات إضافية</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea {...register('notes')} rows={6} placeholder="أدخل أي ملاحظات..." />
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
          <Button type="button" variant="outline" onClick={() => navigate('/lands/leased-in')}>إلغاء</Button>
          <Button type="submit">
            <Save className="ml-2 h-4 w-4" />
            حفظ
          </Button>
        </div>
      </form>
    </div>
  );
};
